export type TableTextDelimiter = 'auto' | 'tab' | 'comma' | 'semicolon' | 'pipe' | 'spaces' | 'space';

export const TABLE_TEXT_DELIMITERS: { value: TableTextDelimiter; label: string }[] = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'tab', label: 'Tab' },
  { value: 'comma', label: 'Comma' },
  { value: 'semicolon', label: 'Semicolon' },
  { value: 'pipe', label: 'Pipe ( | )' },
  { value: 'spaces', label: '2+ spaces' },
  { value: 'space', label: 'Any whitespace' },
];

const CHAR_SEPARATORS = { tab: '\t', comma: ',', semicolon: ';' } as const;

// Splits on a single-character separator, honoring double-quoted fields (including embedded newlines).
function splitQuoted(text: string, separator: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += char;
    } else if (char === '"' && field.trim() === '') {
      quoted = true;
      field = '';
    } else if (char === separator) {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += char;
  }
  row.push(field);
  rows.push(row);
  return rows;
}

function splitLines(text: string, delimiter: 'pipe' | 'spaces' | 'space'): string[][] {
  return text.split('\n').map(line => {
    const trimmed = line.trim();
    if (delimiter === 'pipe') return trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|');
    return trimmed.split(delimiter === 'spaces' ? /\s{2,}|\t/ : /\s+/);
  });
}

export function detectTableDelimiter(text: string): Exclude<TableTextDelimiter, 'auto'> {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter(line => line.trim());
  const mostLines = (test: (line: string) => boolean) => lines.length > 0 && lines.filter(test).length >= lines.length / 2;
  if (lines.some(line => line.includes('\t'))) return 'tab';
  if (mostLines(line => line.includes('|'))) return 'pipe';
  if (mostLines(line => /\S\s{2,}\S/.test(line))) return 'spaces';
  if (mostLines(line => line.includes(';'))) return 'semicolon';
  if (mostLines(line => line.includes(','))) return 'comma';
  return 'space';
}

const isSeparatorRow = (row: string[]) => row.length > 0 && row.every(cell => /^:?-{2,}:?$/.test(cell));

// Returns a rectangular grid of trimmed cells; blank rows and markdown separator rows are dropped.
export function parseTableText(text: string, delimiter: TableTextDelimiter = 'auto'): string[][] {
  const source = text.replace(/\r\n?/g, '\n');
  const resolved = delimiter === 'auto' ? detectTableDelimiter(source) : delimiter;
  const raw = resolved === 'tab' || resolved === 'comma' || resolved === 'semicolon'
    ? splitQuoted(source, CHAR_SEPARATORS[resolved])
    : splitLines(source, resolved);
  const rows = raw
    .map(row => row.map(cell => cell.replace(/\s+/g, ' ').trim()))
    .filter(row => row.some(Boolean) && !isSeparatorRow(row));
  const width = Math.max(0, ...rows.map(row => row.length));
  return rows.map(row => [...row, ...Array<string>(width - row.length).fill('')]);
}

export type TableColumnType = 'text' | 'number' | 'unit' | 'keywords';

export interface TableColumnSpec {
  name: string;
  type: TableColumnType;
  keywords: string;
}

export const TABLE_COLUMN_TYPES: { value: TableColumnType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number (2, 2/1, 1d8)' },
  { value: 'unit', label: 'Number + unit (30 c)' },
  { value: 'keywords', label: 'Keywords' },
];

const NUMBER_PATTERN = String.raw`(?:[+-]?\d*d?\d+(?:[./]\d+)*|[-–—])`;
const UNIT_PATTERN = String.raw`${NUMBER_PATTERN}(?:\s[a-z]{1,3}\.?)?`;
// Lines this long are skipped to avoid pathological regex backtracking.
const MAX_MATCHED_LINE_LENGTH = 300;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function columnPattern(spec: TableColumnSpec, index: number): { source: string; optional: boolean } {
  if (spec.type === 'number') return { source: NUMBER_PATTERN, optional: false };
  if (spec.type === 'unit') return { source: UNIT_PATTERN, optional: false };
  if (spec.type === 'keywords') {
    const phrases = spec.keywords.split(',').map(keyword => keyword.trim()).filter(Boolean)
      .sort((a, b) => b.length - a.length)
      .map(keyword => escapeRegExp(keyword).replace(/\s+/g, String.raw`\s+`));
    if (phrases.length > 0) {
      const any = phrases.join('|');
      return { source: String.raw`(?:${any})(?:,?\s+(?:${any}))*`, optional: true };
    }
  }
  return { source: '.+?', optional: index > 0 };
}

export function columnSpecsFromFirstLine(text: string, useHeader: boolean): TableColumnSpec[] {
  const firstLine = text.split('\n').map(line => line.trim()).find(Boolean);
  if (!firstLine) return [];
  return firstLine.split(/\s+/).map((word, index) => ({
    name: useHeader ? word : `Column ${index + 1}`,
    type: 'text',
    keywords: '',
  }));
}

// Matches each line against the column types: numbers anchor the cells and text columns take the words in between.
// Lines that do not fit are kept whole in the first cell and reported in `unmatched`.
export function parseTableTextByColumns(
  text: string,
  columns: TableColumnSpec[],
  skipFirstLine: boolean,
): { rows: string[][]; unmatched: number[] } {
  if (columns.length === 0) return { rows: [], unmatched: [] };
  const pattern = columns.map((spec, index) => {
    const { source, optional } = columnPattern(spec, index);
    if (index === 0) return `(${source})`;
    return optional ? String.raw`(?:\s+(${source}))?` : String.raw`\s+(${source})`;
  }).join('');
  const matcher = new RegExp(String.raw`^\s*${pattern}\s*$`, 'i');
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const rows: string[][] = [];
  const unmatched: number[] = [];
  lines.slice(skipFirstLine ? 1 : 0).forEach((line, index) => {
    const match = line.length <= MAX_MATCHED_LINE_LENGTH ? matcher.exec(line) : null;
    if (match) {
      rows.push(columns.map((_, column) => (match[column + 1] ?? '').trim()));
    } else {
      unmatched.push(index);
      rows.push([line, ...Array<string>(columns.length - 1).fill('')]);
    }
  });
  return { rows, unmatched };
}

const cellWords = (cell: string) => cell.split(' ').filter(Boolean);

// Moves one word (or the whole cell when `wordIndex` is null) to another cell in the same row.
export function moveTableCellWords(grid: string[][], row: number, fromCol: number, toCol: number, wordIndex: number | null): string[][] {
  const source = cellWords(grid[row][fromCol]);
  const moved = wordIndex === null ? source : source.slice(wordIndex, wordIndex + 1);
  if (moved.length === 0 || fromCol === toCol) return grid;
  const remaining = wordIndex === null ? [] : source.filter((_, index) => index !== wordIndex);
  const target = cellWords(grid[row][toCol]);
  // Words keep their reading order: moving right puts them before the target's words.
  const combined = toCol > fromCol ? [...moved, ...target] : [...target, ...moved];
  return grid.map((cells, index) => {
    if (index !== row) return cells;
    const next = [...cells];
    next[fromCol] = remaining.join(' ');
    next[toCol] = combined.join(' ');
    return next;
  });
}
