import { describe, expect, it } from 'vitest';
import { moveTableCellWords, parseTableText, parseTableTextByColumns, TableColumnSpec } from './tableText';

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

describe('moveTableCellWords', () => {
  const grid = [['Padded', 'Cap 2', '']];

  it('moves a single word right, ahead of the target words', () => {
    expect(moveTableCellWords(grid, 0, 1, 2, 1)).toEqual([['Padded', 'Cap', '2']]);
  });

  it('moves a whole cell left, after the target words', () => {
    expect(moveTableCellWords(grid, 0, 1, 0, null)).toEqual([['Padded Cap 2', '', '']]);
  });
});
