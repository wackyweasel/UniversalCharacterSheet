export const MAX_ITEM_COLUMNS = 6;

export function normalizeItemColumns(value: unknown): number {
  const columns = Math.floor(Number(value));
  return Number.isFinite(columns) ? Math.max(1, Math.min(MAX_ITEM_COLUMNS, columns)) : 1;
}

// Splits items into contiguous columns whose sizes differ by at most one, with longer columns first.
export function distributeIntoColumns<T>(items: T[], columns: number): T[][] {
  const count = normalizeItemColumns(columns);
  const base = Math.floor(items.length / count);
  const extra = items.length % count;
  let start = 0;
  return Array.from({ length: count }, (_, index) => {
    const size = base + (index < extra ? 1 : 0);
    const column = items.slice(start, start + size);
    start += size;
    return column;
  });
}

// Splits items into contiguous columns minimizing the tallest column, then evening out the rest; ties favor earlier columns.
export function distributeIntoColumnsByHeight<T>(items: T[], heights: number[], columns: number, rowGap = 0): T[][] {
  const count = normalizeItemColumns(columns);
  if (heights.length !== items.length) return distributeIntoColumns(items, count);

  const used = Math.min(count, items.length);
  const prefix = [0];
  heights.forEach((height, index) => prefix.push(prefix[index] + Math.max(0, height) + rowGap));

  type Score = { max: number; squares: number; start: number };
  const better = (a: Score, b: Score) => a.max < b.max || (a.max === b.max && a.squares < b.squares);
  // best[k][i]: best split of the first i items into k non-empty columns.
  const best: Score[][] = Array.from({ length: used + 1 }, () => []);
  for (let i = 1; i <= items.length; i += 1) best[1][i] = { max: prefix[i], squares: prefix[i] ** 2, start: 0 };
  for (let k = 2; k <= used; k += 1) {
    for (let i = k; i <= items.length; i += 1) {
      for (let start = i - 1; start >= k - 1; start -= 1) {
        const previous = best[k - 1][start];
        const height = prefix[i] - prefix[start];
        const candidate = { max: Math.max(previous.max, height), squares: previous.squares + height ** 2, start };
        if (!best[k][i] || better(candidate, best[k][i])) best[k][i] = candidate;
      }
    }
  }

  const result: T[][] = Array.from({ length: count }, () => []);
  let end = items.length;
  for (let k = used; k >= 1; k -= 1) {
    const { start } = best[k][end];
    result[k - 1] = items.slice(start, end);
    end = start;
  }
  return result;
}
