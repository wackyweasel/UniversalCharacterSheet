export type TableTextDelimiter = 'auto' | 'tab' | 'comma' | 'semicolon' | 'pipe' | 'spaces' | 'space' | 'capitals';

export const TABLE_TEXT_DELIMITERS: { value: TableTextDelimiter; label: string }[] = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'tab', label: 'Tab' },
  { value: 'comma', label: 'Comma' },
  { value: 'semicolon', label: 'Semicolon' },
  { value: 'pipe', label: 'Pipe ( | )' },
  { value: 'spaces', label: '2+ spaces' },
  { value: 'space', label: 'Any whitespace' },
  { value: 'capitals', label: 'Capital letters (wrapped text)' },
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
  if (looksLikeWrappedText(text)) return 'capitals';
  return 'space';
}

const isSeparatorRow = (row: string[]) => row.length > 0 && row.every(cell => /^:?-{2,}:?$/.test(cell));

// Returns the rows as split (not padded to the same width); blank rows and markdown separator rows are dropped.
// `columns` only applies to capital-letter splitting, where the rows depend on how many cells each one has.
export function parseTableTextRows(
  text: string,
  delimiter: TableTextDelimiter = 'auto',
  columns?: number,
): { rows: string[][]; delimiter: Exclude<TableTextDelimiter, 'auto'> } {
  const source = text.replace(/\r\n?/g, '\n');
  const resolved = delimiter === 'auto' ? detectTableDelimiter(source) : delimiter;
  if (resolved === 'capitals') return { rows: splitByCapitals(source, columns), delimiter: resolved };
  const raw = resolved === 'tab' || resolved === 'comma' || resolved === 'semicolon'
    ? splitQuoted(source, CHAR_SEPARATORS[resolved])
    : splitLines(source, resolved);
  const rows = raw
    .map(row => row.map(cell => cell.replace(/\s+/g, ' ').trim()))
    .filter(row => row.some(Boolean) && !isSeparatorRow(row));
  return { rows, delimiter: resolved };
}

const padRow = (row: string[], width: number) => [...row, ...Array<string>(Math.max(0, width - row.length)).fill('')];

// Returns a rectangular grid of trimmed cells; blank rows and markdown separator rows are dropped.
export function parseTableText(text: string, delimiter: TableTextDelimiter = 'auto'): string[][] {
  const { rows } = parseTableTextRows(text, delimiter);
  const width = Math.max(0, ...rows.map(row => row.length));
  return rows.map(row => padRow(row, width));
}

const CONNECTOR_WORDS = new Set([
  'a', 'an', 'and', 'or', 'nor', 'but', 'the', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'from', 'with', 'its', 'their',
  'his', 'her', 'your', 'per', 'into', 'onto', 'than', 'as', 'if', 'is', 'are', 'be',
]);
const lastWord = (value: string) => value.trim().split(' ').pop() ?? '';
const firstChar = (value: string) => value.trim().charAt(0);
const isLower = (char: string) => char !== '' && char !== char.toUpperCase() && char === char.toLowerCase();
const isUpper = (char: string) => char !== '' && char !== char.toLowerCase() && char === char.toUpperCase();
const endsAsContinuation = (value: string) =>
  /[,(\-–—/&+]$/.test(value.trim()) || CONNECTOR_WORDS.has(lastWord(value).toLowerCase());
const endsSentence = (value: string) => /[.!?:]$/.test(value.trim());

// A capitalised word starts a new cell when it follows a lowercase word or the end of a sentence.
const startsCell = (previous: string, word: string) =>
  isUpper(firstChar(word)) && (isLower(firstChar(previous)) || endsSentence(previous));

function capitalCells(words: string[]): string[] {
  const cells: string[] = [];
  words.forEach((word, index) => {
    if (index === 0 || startsCell(words[index - 1], word)) cells.push(word);
    else cells[cells.length - 1] += ` ${word}`;
  });
  return cells;
}

// For text whose cells wrap over several lines (e.g. copied from a PDF). The first line sets the number of
// columns; after that, capitals start new cells, and a row ends once it is full and a new line starts a cell.
export function splitByCapitals(text: string, columns?: number): string[][] {
  const lines = tableTextLines(text);
  if (lines.length === 0) return [];
  const firstWords = lines[0].split(' ');
  const header = columns ? fitRowToColumns(firstWords, columns) : capitalCells(firstWords);
  const rows = [header];
  let current: string[] | null = null;
  let previous = firstWords[firstWords.length - 1];
  for (const line of lines.slice(1)) {
    const words = line.split(' ');
    for (let index = 0; index < words.length; index++) {
      const word = words[index];
      if (!current || (current.length >= header.length && index === 0 && startsCell(previous, word))) {
        current = [word];
        rows.push(current);
      } else if (current.length < header.length && startsCell(previous, word)) {
        current.push(word);
      } else {
        current[current.length - 1] += ` ${word}`;
      }
      previous = word;
    }
  }
  return rows;
}

// Picks capital-letter splitting when splitting on spaces would give ragged rows and the capitals give full ones.
function looksLikeWrappedText(text: string): boolean {
  const lines = tableTextLines(text);
  if (lines.length < 3) return false;
  const wordCounts = lines.map(line => line.split(' ').length);
  if (wordCounts.filter(count => count !== wordCounts[0]).length < lines.length / 4) return false;
  const rows = splitByCapitals(text);
  const width = rows[0].length;
  if (width < 2) return false;
  return rows.filter(row => row.length === width).length >= rows.length * 0.8;
}

// How likely `next` is a wrapped continuation of `previous` rather than a new row.
function continuationScore(previous: string, next: string): number {
  let score = 0;
  if (isLower(firstChar(next))) score += 3;
  if (endsAsContinuation(previous)) score += 2;
  if (/[.!?]$/.test(previous.trim())) score -= 2;
  if (isUpper(firstChar(next)) || /^\d/.test(next.trim())) score -= 1;
  return score;
}

// Groups consecutive lines into `count` rows by joining the lines that most look like wrapped continuations.
export function groupWrappedLines(lines: string[], count: number): number[][] {
  const target = Math.max(1, Math.min(count, lines.length));
  const boundaries = lines.slice(1).map((line, index) => ({ index, score: continuationScore(lines[index], line) }));
  const joined = new Set(
    [...boundaries].sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, lines.length - target)
      .map(boundary => boundary.index),
  );
  const groups: number[][] = [];
  lines.forEach((_, index) => {
    if (index > 0 && joined.has(index - 1)) groups[groups.length - 1].push(index);
    else groups.push([index]);
  });
  return groups;
}

// How likely a new cell starts between `previous` and `next`.
function cellBreakScore(previous: string, next: string): number {
  let score = 0;
  if (isLower(firstChar(next))) score -= 2;
  if (endsAsContinuation(previous)) score -= 2;
  if (isUpper(firstChar(next))) score += 1;
  if (startsCell(previous, next)) score += 1;
  if (/^[+-]?\d/.test(next.trim())) score += 1;
  return score;
}

// Fits a row to exactly `count` cells: short rows get blank cells, and long rows are joined at the
// boundaries that least look like the start of a new cell (e.g. before a lowercase word).
export function fitRowToColumns(cells: string[], count: number): string[] {
  if (count <= 0) return [];
  const filled = cells.length > count ? cells.filter(Boolean) : cells;
  if (filled.length <= count) return padRow(filled, count);
  const breaks = new Set(
    filled.slice(1).map((cell, index) => ({ index, score: cellBreakScore(filled[index], cell) }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, count - 1)
      .map(boundary => boundary.index),
  );
  const result: string[] = [filled[0]];
  filled.slice(1).forEach((cell, index) => {
    if (breaks.has(index)) result.push(cell);
    else result[result.length - 1] += ` ${cell}`;
  });
  return result;
}

export interface TableShape {
  columns?: number;
  bodyRows?: number;
}

// Applies a row/column count to rows as parsed by `parseTableTextRows`. With fewer body rows than parsed,
// wrapped lines are joined: word by word for whitespace-split text, cell by cell otherwise.
export function reshapeTableRows(
  rows: string[][],
  delimiter: Exclude<TableTextDelimiter, 'auto'>,
  hasHeader: boolean,
  shape: TableShape,
): string[][] {
  const header = hasHeader ? rows.slice(0, 1) : [];
  let body = hasHeader ? rows.slice(1) : rows;
  const bodyRows = shape.bodyRows ?? body.length;
  if (bodyRows < body.length && body.length > 0) {
    const groups = groupWrappedLines(body.map(row => row.filter(Boolean).join(' ')), bodyRows);
    body = groups.map(group => {
      const parts = group.map(index => body[index]);
      if (delimiter === 'space') return parts.flat().filter(Boolean);
      const width = Math.max(...parts.map(part => part.length));
      return Array.from({ length: width }, (_, column) => parts.map(part => part[column] ?? '').filter(Boolean).join(' '));
    });
  } else if (bodyRows > body.length) {
    body = [...body, ...Array.from({ length: bodyRows - body.length }, () => [] as string[])];
  }
  const all = [...header, ...body];
  const columns = shape.columns ?? Math.max(0, ...rows.map(row => row.length));
  return all.map(row => fitRowToColumns(row, columns));
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

// Changes the number of column specs, keeping existing types; header names are re-read from the first line.
export function resizeColumnSpecs(specs: TableColumnSpec[], count: number, text: string, useHeader: boolean): TableColumnSpec[] {
  const firstLine = tableTextLines(text)[0] ?? '';
  const names = fitRowToColumns(firstLine.split(' ').filter(Boolean), count);
  return Array.from({ length: count }, (_, index) => ({
    type: specs[index]?.type ?? 'text',
    keywords: specs[index]?.keywords ?? '',
    name: useHeader && names[index] ? names[index] : `Column ${index + 1}`,
  }));
}

export function tableTextLines(text: string): string[] {
  return text.replace(/\r\n?/g, '\n').split('\n').map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

// Adjacent text columns cannot be told apart by the pattern, so their words are re-split at likely cell breaks.
function splitAdjacentTextColumns(cells: string[], columns: TableColumnSpec[]): string[] {
  const result = [...cells];
  let start = 0;
  while (start < columns.length) {
    let end = start;
    while (columns[start].type === 'text' && end + 1 < columns.length && columns[end + 1].type === 'text') end++;
    if (end > start) {
      const words = result.slice(start, end + 1).join(' ').split(' ').filter(Boolean);
      result.splice(start, end - start + 1, ...fitRowToColumns(words, end - start + 1));
    }
    start = end + 1;
  }
  return result;
}

// Matches each line against the column types: numbers anchor the cells and text columns take the words in between.
// Lines that do not fit are kept whole in the first cell and reported in `unmatched`.
// When `bodyRows` is lower than the number of lines, wrapped lines are joined first.
export function parseTableTextByColumns(
  text: string,
  columns: TableColumnSpec[],
  skipFirstLine: boolean,
  bodyRows?: number,
): { rows: string[][]; unmatched: number[] } {
  if (columns.length === 0) return { rows: [], unmatched: [] };
  const pattern = columns.map((spec, index) => {
    const { source, optional } = columnPattern(spec, index);
    if (index === 0) return `(${source})`;
    return optional ? String.raw`(?:\s+(${source}))?` : String.raw`\s+(${source})`;
  }).join('');
  const matcher = new RegExp(String.raw`^\s*${pattern}\s*$`, 'i');
  const allLines = tableTextLines(text).slice(skipFirstLine ? 1 : 0);
  const lines = bodyRows !== undefined && bodyRows < allLines.length && allLines.length > 0
    ? groupWrappedLines(allLines, bodyRows).map(group => group.map(index => allLines[index]).join(' '))
    : allLines;
  const rows: string[][] = [];
  const unmatched: number[] = [];
  lines.forEach((line, index) => {
    const match = line.length <= MAX_MATCHED_LINE_LENGTH ? matcher.exec(line) : null;
    if (match) {
      rows.push(splitAdjacentTextColumns(columns.map((_, column) => (match[column + 1] ?? '').trim()), columns));
    } else {
      unmatched.push(index);
      rows.push([line, ...Array<string>(columns.length - 1).fill('')]);
    }
  });
  while (bodyRows !== undefined && rows.length < bodyRows) rows.push(Array<string>(columns.length).fill(''));
  return { rows, unmatched };
}

const cellWords = (cell: string) => cell.split(' ').filter(Boolean);

/** A run of consecutive words (inclusive indexes) inside one cell. */
export interface TableWordRange { row: number; col: number; start: number; end: number }
/** An insertion point in a cell: `index` is the word position before which words are inserted. */
export interface TableWordSlot { row: number; col: number; index: number }

export const tableCellWords = cellWords;

// Dropping a range inside or right next to itself leaves the cell unchanged.
export const isNoopTableWordMove = (range: TableWordRange, slot: TableWordSlot) =>
  range.row === slot.row && range.col === slot.col && slot.index >= range.start && slot.index <= range.end + 1;

// Moves a run of words to any word position of any cell, including elsewhere in the same cell.
export function moveTableWords(grid: string[][], range: TableWordRange, slot: TableWordSlot): string[][] {
  const source = cellWords(grid[range.row]?.[range.col] ?? '');
  const start = Math.max(0, range.start);
  const end = Math.min(source.length - 1, range.end);
  const targetRow = grid[slot.row];
  if (end < start || !targetRow || slot.col < 0 || slot.col >= targetRow.length) return grid;
  if (isNoopTableWordMove({ ...range, start, end }, slot)) return grid;

  const moved = source.slice(start, end + 1);
  const remaining = [...source.slice(0, start), ...source.slice(end + 1)];
  const sameCell = range.row === slot.row && range.col === slot.col;
  const target = sameCell ? [...remaining] : cellWords(targetRow[slot.col]);
  let index = Math.min(Math.max(0, slot.index), sameCell ? source.length : target.length);
  if (sameCell && index > end) index -= moved.length;
  target.splice(index, 0, ...moved);

  const next = grid.map((cells, rowIndex) => rowIndex === range.row || rowIndex === slot.row ? [...cells] : cells);
  next[range.row][range.col] = remaining.join(' ');
  next[slot.row][slot.col] = target.join(' ');
  return next;
}
