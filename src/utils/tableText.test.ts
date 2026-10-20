import { describe, expect, it } from 'vitest';
import {
  detectTableDelimiter,
  fitRowToColumns,
  isNoopTableWordMove,
  moveTableWords,
  parseTableText,
  parseTableTextByColumns,
  parseTableTextRows,
  reshapeTableRows,
  TableColumnSpec,
} from './tableText';

const fumbleText = [
  'Roll type Fumble effect',
  'Hero attack or',
  'weapon parry',
  'The weapon loses 1',
  'Durability.',
  'Hero shield parry The shield loses 1 Durability',
  'and the parry fails.',
  'Hero dodge or',
  'shove The hero falls prone.',
  'Armed enemy',
  'attack',
  'The enemy drops its',
  'weapon.',
  'Unarmed enemy',
  'attack The enemy falls prone.',
].join('\n');

const fumbleTable = [
  ['Roll type', 'Fumble effect'],
  ['Hero attack or weapon parry', 'The weapon loses 1 Durability.'],
  ['Hero shield parry', 'The shield loses 1 Durability and the parry fails.'],
  ['Hero dodge or shove', 'The hero falls prone.'],
  ['Armed enemy attack', 'The enemy drops its weapon.'],
  ['Unarmed enemy attack', 'The enemy falls prone.'],
];

describe('capital-letter detection', () => {
  it('auto-detects cells and rows from capitals in wrapped text', () => {
    expect(detectTableDelimiter(fumbleText)).toBe('capitals');
    expect(parseTableText(fumbleText)).toEqual(fumbleTable);
  });

  it('keeps splitting on spaces when every line has the same number of words', () => {
    expect(detectTableDelimiter('Item name Weight\nLong sword 3\nShort bow 2')).toBe('space');
  });

  it('does not use capitals for title-case headers', () => {
    expect(detectTableDelimiter('Name Qty\nRope 1\nTorch 3 lit\nOil flask 2')).toBe('space');
  });
});

describe('reshapeTableRows', () => {
  it('keeps the detected size when nothing is overridden', () => {
    const { rows, delimiter } = parseTableTextRows('A\tB\nC');
    expect(reshapeTableRows(rows, delimiter, true, {})).toEqual([['A', 'B'], ['C', '']]);
  });

  it('joins wrapped lines and splits cells to the requested size', () => {
    const { rows, delimiter } = parseTableTextRows(fumbleText);
    expect(reshapeTableRows(rows, delimiter, true, { columns: 2, bodyRows: 5 })).toEqual(fumbleTable);
  });

  it('joins wrapped cells column by column for separated text', () => {
    const { rows, delimiter } = parseTableTextRows('Name\tEffect\nLong\tFirst part\nsword\tsecond part', 'tab');
    expect(reshapeTableRows(rows, delimiter, true, { bodyRows: 1 })).toEqual([
      ['Name', 'Effect'],
      ['Long sword', 'First part second part'],
    ]);
  });

  it('adds blank rows and columns when asked for more', () => {
    const { rows, delimiter } = parseTableTextRows('A\tB');
    expect(reshapeTableRows(rows, delimiter, false, { columns: 3, bodyRows: 2 })).toEqual([['A', 'B', ''], ['', '', '']]);
  });
});

describe('fitRowToColumns', () => {
  it('joins words that continue a cell and keeps numbers apart', () => {
    expect(fitRowToColumns(['Long', 'sword', '1d8', 'Two-handed'], 3)).toEqual(['Long sword', '1d8', 'Two-handed']);
  });

  it('pads short rows', () => {
    expect(fitRowToColumns(['A'], 3)).toEqual(['A', '', '']);
  });
});

describe('parseTableTextByColumns with a size', () => {
  it('joins wrapped lines and splits adjacent text columns at likely breaks', () => {
    const columns: TableColumnSpec[] = [
      { name: 'Roll type', type: 'text', keywords: '' },
      { name: 'Fumble effect', type: 'text', keywords: '' },
    ];
    expect(parseTableTextByColumns(fumbleText, columns, true, 5).rows).toEqual(fumbleTable.slice(1));
  });
});

const armourColumns: TableColumnSpec[] = [
  { name: 'Armour', type: 'text', keywords: '' },
  { name: 'Def', type: 'number', keywords: '' },
  { name: 'Enc', type: 'number', keywords: '' },
  { name: 'Covers', type: 'text', keywords: '' },
  { name: 'Special', type: 'keywords', keywords: 'Stackable, Clunky' },
  { name: 'Cost', type: 'unit', keywords: '' },
  { name: 'Availability', type: 'number', keywords: '' },
];

describe('parseTableText', () => {
  it('splits tab-separated text and drops blank lines', () => {
    expect(parseTableText('A\tB\n\nC\tD')).toEqual([['A', 'B'], ['C', 'D']]);
  });

  it('keeps quoted commas inside one cell', () => {
    expect(parseTableText('a,"b, c",d', 'comma')).toEqual([['a', 'b, c', 'd']]);
  });
});

describe('parseTableTextByColumns', () => {
  const text = [
    'Armour Def Enc Covers Special Cost Availability',
    'Tier 1:',
    'Padded Cap 2 1 Head 30 c 4',
    'Padded Jacket 2/1 5 Arms, Torso Stackable 120 c 4',
    'Cloak 1/1 1 Torso (only back) Stackable 50 c 4',
    'Helmet 5 5 Head Clunky, Stackable 300 c 3',
  ].join('\n');

  it('keeps multi-word cells together and leaves empty cells empty', () => {
    const { rows } = parseTableTextByColumns(text, armourColumns, true);
    expect(rows[1]).toEqual(['Padded Cap', '2', '1', 'Head', '', '30 c', '4']);
    expect(rows[2]).toEqual(['Padded Jacket', '2/1', '5', 'Arms, Torso', 'Stackable', '120 c', '4']);
    expect(rows[3]).toEqual(['Cloak', '1/1', '1', 'Torso (only back)', 'Stackable', '50 c', '4']);
    expect(rows[4]).toEqual(['Helmet', '5', '5', 'Head', 'Clunky, Stackable', '300 c', '3']);
  });

  it('keeps lines that do not fit whole in the first cell', () => {
    const { rows, unmatched } = parseTableTextByColumns(text, armourColumns, true);
    expect(unmatched).toEqual([0]);
    expect(rows[0]).toEqual(['Tier 1:', '', '', '', '', '', '']);
  });
});

describe('moveTableWords', () => {
  const grid = [['Padded', 'Cap 2', ''], ['Leather Armor', 'Light 3', 'Stackable']];

  it('moves a single word into an empty cell', () => {
    expect(moveTableWords(grid, { row: 0, col: 1, start: 1, end: 1 }, { row: 0, col: 2, index: 0 })[0])
      .toEqual(['Padded', 'Cap', '2']);
  });

  it('moves a whole cell to the end of another cell', () => {
    expect(moveTableWords(grid, { row: 0, col: 1, start: 0, end: 1 }, { row: 0, col: 0, index: 1 })[0])
      .toEqual(['Padded Cap 2', '', '']);
  });

  it('moves several words into the middle of a cell in another row', () => {
    const result = moveTableWords(grid, { row: 0, col: 0, start: 0, end: 0 }, { row: 1, col: 0, index: 1 });
    expect(result).toEqual([['', 'Cap 2', ''], ['Leather Padded Armor', 'Light 3', 'Stackable']]);
    expect(grid[0][0]).toBe('Padded');
  });

  it('reorders a run of words within the same cell', () => {
    const cell = [['a b c d e']];
    expect(moveTableWords(cell, { row: 0, col: 0, start: 1, end: 2 }, { row: 0, col: 0, index: 5 })).toEqual([['a d e b c']]);
    expect(moveTableWords(cell, { row: 0, col: 0, start: 3, end: 4 }, { row: 0, col: 0, index: 0 })).toEqual([['d e a b c']]);
  });

  it('ignores drops next to the moved words', () => {
    const cell = [['a b c']];
    expect(isNoopTableWordMove({ row: 0, col: 0, start: 1, end: 1 }, { row: 0, col: 0, index: 2 })).toBe(true);
    expect(moveTableWords(cell, { row: 0, col: 0, start: 1, end: 1 }, { row: 0, col: 0, index: 1 })).toBe(cell);
  });
});
