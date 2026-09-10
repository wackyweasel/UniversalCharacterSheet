import type { CellFormat, TableCell, TableMerge, TableRow, WidgetData } from '../types';

export interface TableCoordinate { row: number; col: number }
export const tableCellKey = ({ row, col }: TableCoordinate): string => `${row}:${col}`;
export const tableCellValue = (cell: string | TableCell | undefined): string =>
  typeof cell === 'string' ? cell : cell?.value ?? '';
export const tableCellObject = (cell: string | TableCell | undefined): TableCell =>
  typeof cell === 'string' ? { value: cell } : { ...cell, value: cell?.value ?? '' };

export function getTableCellOwner(merges: TableMerge[], row: number, col: number): TableCoordinate {
  const merge = merges.find(m => row >= m.row && row < m.row + m.rowSpan && col >= m.col && col < m.col + m.colSpan);
  return merge ? { row: merge.row, col: merge.col } : { row, col };
}

export function isCoveredTableCell(merges: TableMerge[] | undefined, row: number, col: number): boolean {
  const owner = getTableCellOwner(merges ?? [], row, col);
  return owner.row !== row || owner.col !== col;
}

export function validateTableMerges(data: WidgetData): { merges: TableMerge[]; error?: string } {
  const merges = data.tableMergedCells ?? [];
  const rowCount = data.rows?.length ?? 0;
  const colCount = (data.columns ?? ['Item', 'Qty', 'Weight']).length;
  const occupied = new Set<string>();
  if (!Array.isArray(merges)) return { merges: [], error: 'Invalid merged cells. Displaying the original table cells.' };
  for (const m of merges) {
    if (!m || ![m.row, m.col, m.rowSpan, m.colSpan].every(Number.isInteger) ||
      m.row < 0 || m.col < 0 || m.rowSpan < 1 || m.colSpan < 1 ||
      m.rowSpan * m.colSpan < 2 || m.row + m.rowSpan > rowCount || m.col + m.colSpan > colCount) {
      return { merges: [], error: 'Invalid merged cells. Displaying the original table cells.' };
    }
    for (const cell of mergeCoordinates(m)) {
      const key = tableCellKey(cell);
      if (occupied.has(key)) return { merges: [], error: 'Overlapping merged cells. Displaying the original table cells.' };
      occupied.add(key);
    }
  }
  return { merges };
}

export function mergeCoordinates(merge: TableMerge): TableCoordinate[] {
  return Array.from({ length: merge.rowSpan }, (_, r) =>
    Array.from({ length: merge.colSpan }, (_, c) => ({ row: merge.row + r, col: merge.col + c }))).flat();
}

export function logicalTableCells(cells: TableCoordinate[], merges: TableMerge[]): TableCoordinate[] {
  return Array.from(new Map(cells.map(cell => {
    const owner = getTableCellOwner(merges, cell.row, cell.col);
    return [tableCellKey(owner), owner];
  })).values()).sort((a, b) => a.row - b.row || a.col - b.col);
}

export function selectedTableFootprint(cells: TableCoordinate[], merges: TableMerge[]): TableCoordinate[] {
  return logicalTableCells(cells, merges).flatMap(cell => {
    const merge = merges.find(m => m.row === cell.row && m.col === cell.col);
    return merge ? mergeCoordinates(merge) : [cell];
  });
}

export function tableRangeSelection(start: TableCoordinate, end: TableCoordinate, merges: TableMerge[]): TableCoordinate[] {
  let top = Math.min(start.row, end.row), bottom = Math.max(start.row, end.row);
  let left = Math.min(start.col, end.col), right = Math.max(start.col, end.col);
  let expanded: boolean;
  do {
    expanded = false;
    for (const m of merges) {
      if (m.row > bottom || m.row + m.rowSpan - 1 < top || m.col > right || m.col + m.colSpan - 1 < left) continue;
      const next = [Math.min(top, m.row), Math.max(bottom, m.row + m.rowSpan - 1),
        Math.min(left, m.col), Math.max(right, m.col + m.colSpan - 1)];
      if (next[0] !== top || next[1] !== bottom || next[2] !== left || next[3] !== right) expanded = true;
      [top, bottom, left, right] = next;
    }
  } while (expanded);
  return logicalTableCells(mergeCoordinates({ row: top, col: left, rowSpan: bottom - top + 1, colSpan: right - left + 1 }), merges);
}

export function selectedTableRectangle(cells: TableCoordinate[], merges: TableMerge[]): TableMerge | null {
  if (logicalTableCells(cells, merges).length < 2) return null;
  const footprint = selectedTableFootprint(cells, merges);
  const row = Math.min(...footprint.map(c => c.row)), col = Math.min(...footprint.map(c => c.col));
  const rowSpan = Math.max(...footprint.map(c => c.row)) - row + 1;
  const colSpan = Math.max(...footprint.map(c => c.col)) - col + 1;
  return rowSpan * colSpan === footprint.length ? { row, col, rowSpan, colSpan } : null;
}

export function effectiveTableFormat(data: WidgetData, { row, col }: TableCoordinate): CellFormat {
  return { ...data.tableColumnSettings?.[col]?.format, ...data.tableRowSettings?.[row]?.format,
    ...tableCellObject(data.rows?.[row]?.cells[col]).format };
}

export function commonTableFormat(data: WidgetData, cells: TableCoordinate[]): CellFormat {
  if (!cells.length) return {};
  const formats = cells.map(cell => effectiveTableFormat(data, cell));
  return Object.fromEntries(Object.entries(formats[0]).filter(([key, value]) =>
    formats.every(format => format[key as keyof CellFormat] === value)));
}

export function mixedTableFormatFields(data: WidgetData, cells: TableCoordinate[]): (keyof CellFormat)[] {
  const formats = cells.map(cell => effectiveTableFormat(data, cell));
  const keys: (keyof CellFormat)[] = ['bold', 'italic', 'underline', 'strikethrough', 'bgColor', 'bgOpacity', 'textColor', 'hAlign', 'vAlign'];
  return keys.filter(key => formats.some(format => format[key] !== formats[0]?.[key]));
}

export function formatTableCells(data: WidgetData, cells: TableCoordinate[], update: Partial<CellFormat>): TableRow[] {
  const keys = new Set(selectedTableFootprint(cells, validateTableMerges(data).merges).map(tableCellKey));
  return (data.rows ?? []).map((row, r) => ({ ...row, cells: row.cells.map((cell, c) => {
    if (!keys.has(tableCellKey({ row: r, col: c }))) return cell;
    const current = tableCellObject(cell);
    const format = { ...current.format, ...update };
    return { ...current, format: Object.fromEntries(Object.entries(format).filter(([, v]) => v !== undefined)) };
  }) }));
}

export function tableMergeBlockedReason(data: WidgetData, cells: TableCoordinate[]): string | undefined {
  const validation = validateTableMerges(data);
  if (validation.error) return validation.error;
  const rowCount = data.rows?.length ?? 0;
  const colCount = (data.columns ?? ['Item', 'Qty', 'Weight']).length;
  if (cells.some(cell => !Number.isInteger(cell.row) || !Number.isInteger(cell.col) ||
    cell.row < 0 || cell.col < 0 || cell.row >= rowCount || cell.col >= colCount))
    return 'The selected cells are outside this table.';
  if (!selectedTableRectangle(cells, validation.merges)) return 'Select a complete rectangle of cells to merge.';
  for (const { row, col } of selectedTableFootprint(cells, validation.merges)) {
    const cell = tableCellObject(data.rows?.[row]?.cells[col]);
    if (cell.label || cell.formula || data.tableRowSettings?.[row]?.label || data.tableRowSettings?.[row]?.formula ||
      data.tableColumnSettings?.[col]?.label || data.tableColumnSettings?.[col]?.formula) {
      return 'Remove cell, row, or column labels and formulas before merging these cells.';
    }
  }
}

export function mergeTableCells(data: WidgetData, cells: TableCoordinate[]): Partial<WidgetData> {
  const reason = tableMergeBlockedReason(data, cells);
  if (reason) throw new Error(reason);
  const merges = validateTableMerges(data).merges;
  const rectangle = selectedTableRectangle(cells, merges);
  if (!rectangle) throw new Error('Select a complete rectangle of cells to merge.');
  const owners = logicalTableCells(cells, merges);
  const value = owners.map(cell => tableCellValue(data.rows?.[cell.row]?.cells[cell.col])).filter(v => v !== '').join('\n');
  const format = effectiveTableFormat(data, rectangle);
  const keys = new Set(mergeCoordinates(rectangle).map(tableCellKey));
  return {
    rows: (data.rows ?? []).map((row, r) => ({ ...row, cells: row.cells.map((cell, c) =>
      keys.has(tableCellKey({ row: r, col: c }))
        ? { value: r === rectangle.row && c === rectangle.col ? value : '', format: { ...format } }
        : cell) })),
    tableMergedCells: [...merges.filter(m => !keys.has(tableCellKey(m))), rectangle],
  };
}

export function unmergeTableCells(data: WidgetData, cell: TableCoordinate): Partial<WidgetData> {
  const merges = validateTableMerges(data).merges;
  const owner = getTableCellOwner(merges, cell.row, cell.col);
  const merge = merges.find(m => m.row === owner.row && m.col === owner.col);
  if (!merge) throw new Error('Select a merged cell to unmerge.');
  return { tableMergedCells: merges.filter(m => m !== merge),
    rows: formatTableCells(data, [owner], effectiveTableFormat(data, owner)) };
}

export type TableAxisResult =
  | { ok: true; data: Partial<WidgetData>; removesMergedCells: boolean }
  | { ok: false; reason: string };

// A permutation (or subset for deletion) preserves both merge membership and order.
export function transformTableAxis(data: WidgetData, axis: 'row' | 'column', order: number[]): TableAxisResult {
  const validation = validateTableMerges(data);
  if (validation.error) return { ok: false, reason: validation.error };
  const rows = data.rows ?? [], columns = data.columns ?? ['Item', 'Qty', 'Weight'];
  const count = axis === 'row' ? rows.length : columns.length;
  if (new Set(order).size !== order.length || order.some(i => !Number.isInteger(i) || i < 0 || i >= count))
    return { ok: false, reason: 'Invalid table row or column order.' };
  const merges: TableMerge[] = [];
  let removesMergedCells = false;
  for (const merge of validation.merges) {
    const start = axis === 'row' ? merge.row : merge.col;
    const span = axis === 'row' ? merge.rowSpan : merge.colSpan;
    const indices = Array.from({ length: span }, (_, i) => order.indexOf(start + i));
    if (indices.every(i => i === -1)) { removesMergedCells = true; continue; }
    if (indices.some(i => i === -1) || indices.some((v, i) => v !== indices[0] + i))
      return { ok: false, reason: `Unmerge these cells before deleting or moving this ${axis}.` };
    merges.push({ ...merge, ...(axis === 'row' ? { row: indices[0] } : { col: indices[0] }) });
  }
  return { ok: true, removesMergedCells, data: axis === 'row'
    ? { rows: order.map(i => rows[i]), tableRowSettings: order.map(i => data.tableRowSettings?.[i] ?? {}), tableMergedCells: merges }
    : { columns: order.map(i => columns[i]), rows: rows.map(row => ({ ...row, cells: order.map(i => row.cells[i] ?? '') })),
      tableColumnSettings: order.map(i => data.tableColumnSettings?.[i] ?? {}), tableMergedCells: merges } };
}
