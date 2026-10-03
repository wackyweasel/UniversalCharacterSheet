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
