export type FormulaValue = number | string;
export type FormulaLabels = Record<string, FormulaValue>;

export interface FormulaStringLiteral {
  start: number;
  end: number;
  value: string;
}

export function scanFormulaStringLiterals(source: string): { literals: FormulaStringLiteral[]; valid: boolean } {
  const literals: FormulaStringLiteral[] = [];

  for (let index = 0; index < source.length; index += 1) {
    if (source[index] !== '"') continue;

    const start = index;
    let end = index + 1;
    let escaped = false;
    for (; end < source.length; end += 1) {
      const char = source[end];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') break;
    }

    if (end >= source.length || escaped) return { literals, valid: false };

    const raw = source.slice(start, end + 1);
    try {
      const value = JSON.parse(raw) as unknown;
      if (typeof value !== 'string') return { literals, valid: false };
      literals.push({ start, end: end + 1, value });
    } catch {
      return { literals, valid: false };
    }
    index = end;
  }

  return { literals, valid: true };
}

export function mapOutsideFormulaStrings(source: string, mapper: (segment: string) => string): string | null {
  const scan = scanFormulaStringLiterals(source);
  if (!scan.valid) return null;

  let result = '';
  let cursor = 0;
  for (const literal of scan.literals) {
    result += mapper(source.slice(cursor, literal.start));
    result += source.slice(literal.start, literal.end);
    cursor = literal.end;
  }
  return result + mapper(source.slice(cursor));
}

export function maskFormulaStringLiterals(source: string): string | null {
  const scan = scanFormulaStringLiterals(source);
  if (!scan.valid) return null;

  let result = '';
  let cursor = 0;
  for (const literal of scan.literals) {
    result += source.slice(cursor, literal.start);
    result += ' '.repeat(literal.end - literal.start);
    cursor = literal.end;
  }
  return result + source.slice(cursor);
}

export function normalizeFormulaStringLiterals(source: string): string | null {
  const scan = scanFormulaStringLiterals(source);
  if (!scan.valid) return null;

  let result = '';
  let cursor = 0;
  for (const literal of scan.literals) {
    result += source.slice(cursor, literal.start);
    result += JSON.stringify(literal.value);
    cursor = literal.end;
  }
  return result + source.slice(cursor);
}

export function extractFormulaLabelReferences(source: string): string[] | null {
  const outsideStrings = mapOutsideFormulaStrings(source, (segment) => segment);
  if (outsideStrings === null) return null;
  const matches = outsideStrings.match(/@([a-zA-Z_][a-zA-Z0-9_]*)/g);
  return matches ? matches.map((match) => match.slice(1)) : [];
}

export function parseFormulaStringLiteral(source: string): string | null {
  const scan = scanFormulaStringLiterals(source.trim());
  if (!scan.valid || scan.literals.length !== 1) return null;
  const literal = scan.literals[0];
  return literal.start === 0 && literal.end === source.trim().length ? literal.value : null;
}

export function hasFormulaStringLiteral(source: string): boolean {
  const scan = scanFormulaStringLiterals(source);
  return scan.valid && scan.literals.length > 0;
}
