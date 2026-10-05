import { describe, expect, it } from 'vitest';
import type { TableMerge, WidgetData } from '../types';
import {
  commonTableFormat, effectiveTableFormat, formatTableCells, getTableCellOwner,
  isCoveredTableCell, logicalTableCells, mergeCoordinates, mergeTableCells,
  selectedTableFootprint, selectedTableRectangle, tableCellObject, tableCellValue,
  tableMergeBlockedReason, tableRangeSelection, transformTableAxis, unmergeTableCells,
  validateTableMerges,
} from './tableCells';

const at = (row: number, col: number) => ({ row, col });
const rectangle = (row: number, col: number, rowSpan: number, colSpan: number): TableMerge =>
  ({ row, col, rowSpan, colSpan });
const table = (rowCount = 4, colCount = 4): WidgetData => ({
  columns: Array.from({ length: colCount }, (_, col) => `Column ${col}`),
  rows: Array.from({ length: rowCount }, (_, row) => ({
    cells: Array.from({ length: colCount }, (_, col) => `${row}:${col}`),
  })),
});

describe('table selection geometry', () => {
  const merges = [rectangle(0, 0, 2, 2)];

  it('maps covered coordinates to one sorted logical owner and deduplicates ordinary cells', () => {
    expect(getTableCellOwner(merges, 1, 1)).toEqual(at(0, 0));
    expect(isCoveredTableCell(merges, 0, 0)).toBe(false);
    expect(isCoveredTableCell(merges, 1, 0)).toBe(true);
    expect(isCoveredTableCell(undefined, 1, 0)).toBe(false);
    expect(logicalTableCells([at(2, 3), at(1, 1), at(0, 0), at(2, 3), at(0, 2)], merges))
      .toEqual([at(0, 0), at(0, 2), at(2, 3)]);
    expect(selectedTableFootprint([at(1, 1), at(0, 1)], merges))
      .toEqual([at(0, 0), at(0, 1), at(1, 0), at(1, 1)]);
  });

  it('expands a range repeatedly when an earlier merge becomes intersected later', () => {
    const chained = [rectangle(1, 2, 2, 1), rectangle(0, 0, 2, 2)];
    const selected = tableRangeSelection(at(0, 1), at(0, 2), chained);
    expect(selected).toEqual([at(0, 0), at(0, 2), at(1, 2), at(2, 0), at(2, 1)]);
    expect(selectedTableRectangle(selected, chained)).toEqual(rectangle(0, 0, 3, 3));
    expect(tableRangeSelection(at(0, 2), at(0, 1), chained)).toEqual(selected);
  });

  it('selects a merged cell as one owner even when both endpoints are covered', () => {
    expect(tableRangeSelection(at(1, 1), at(1, 0), merges)).toEqual([at(0, 0)]);
    expect(selectedTableRectangle([at(0, 0), at(1, 1)], merges)).toBeNull();
  });

  it('accepts horizontal, vertical and rectangular logical selections with duplicates', () => {
    expect(selectedTableRectangle([at(0, 2), at(0, 1), at(0, 1)], []))
      .toEqual(rectangle(0, 1, 1, 2));
    expect(selectedTableRectangle([at(2, 0), at(1, 0)], []))
      .toEqual(rectangle(1, 0, 2, 1));
    expect(selectedTableRectangle([at(1, 1), at(0, 2), at(1, 2)], merges))
      .toEqual(rectangle(0, 0, 2, 3));
  });

  it('rejects empty, single, diagonal, L-shaped and holed selections', () => {
    for (const cells of [
      [], [at(0, 0)], [at(0, 0), at(0, 0)], [at(0, 0), at(1, 1)],
      [at(0, 0), at(0, 1), at(1, 0)],
      mergeCoordinates(rectangle(0, 0, 3, 3)).filter(cell => cell.row !== 1 || cell.col !== 1),
    ]) expect(selectedTableRectangle(cells, [])).toBeNull();
    expect(selectedTableRectangle([at(1, 1), at(0, 2)], merges)).toBeNull();
  });
});

describe('table formatting', () => {
  it('normalizes legacy and missing cells without dropping explicit properties', () => {
    expect(tableCellValue(undefined)).toBe('');
    expect(tableCellObject(undefined)).toEqual({ value: '' });
    expect(tableCellObject('Ω')).toEqual({ value: 'Ω' });
    const cell = { value: '0', label: 'score', formula: '2 + 2', format: { bold: false } };
    expect(tableCellObject(cell)).toEqual(cell);
    expect(tableCellObject(cell)).not.toBe(cell);
  });

  it('uses cell over row over column defaults, retaining false and zero', () => {
    const data: WidgetData = {
      ...table(1, 2),
      tableColumnSettings: [{ format: { bold: true, italic: true, bgOpacity: 80 } }],
      tableRowSettings: [{ format: { bold: false, textColor: '#123456' } }],
      rows: [{ cells: [{ value: 'A', format: { italic: false, bgOpacity: 0 } }, 'B'] }],
    };
    expect(effectiveTableFormat(data, at(0, 0))).toEqual({
      bold: false, italic: false, bgOpacity: 0, textColor: '#123456',
    });
    expect(commonTableFormat(data, [at(0, 0), at(0, 1)]))
      .toEqual({ bold: false, textColor: '#123456' });
    expect(commonTableFormat(data, [])).toEqual({});
    expect(commonTableFormat(data, [at(0, 0)])).toEqual(effectiveTableFormat(data, at(0, 0)));
    expect(commonTableFormat({ rows: [{ cells: [{ value: '', format: { bold: false } }, ''] }] },
      [at(0, 0), at(0, 1)])).toEqual({});
  });

  it('formats the entire merged footprint and preserves other properties without mutating inputs', () => {
    const data: WidgetData = {
      ...table(2, 3),
      rows: [{ cells: [
        { value: 'A', label: 'anchor', formula: '1', format: { bold: true, italic: true } },
        { value: '', format: { textColor: '#abcdef' } }, 'outside',
      ] }, { cells: ['legacy', 'also outside', 'untouched'] }],
      tableMergedCells: [rectangle(0, 0, 1, 2)],
    };
    const original = structuredClone(data);
    const rows = formatTableCells(data, [at(0, 1), at(0, 0), at(1, 0)], { bold: false, italic: undefined });
    expect(rows[0].cells[0]).toEqual({
      value: 'A', label: 'anchor', formula: '1', format: { bold: false },
    });
    expect(rows[0].cells[1]).toEqual({ value: '', format: { textColor: '#abcdef', bold: false } });
    expect(rows[1].cells[0]).toEqual({ value: 'legacy', format: { bold: false } });
    expect(rows[0].cells[2]).toBe(data.rows![0].cells[2]);
    expect(rows[1].cells.slice(1)).toEqual(data.rows![1].cells.slice(1));
    expect(data).toEqual(original);
    expect(formatTableCells(data, [], { bold: true })).toEqual(data.rows);
  });

  it('reports uniform on/off format states and omits mixed values independent of selection order', () => {
    const data: WidgetData = { rows: [{ cells: [
      { value: 'A', format: { bold: true, italic: false, bgOpacity: 0, hAlign: 'left' } },
      { value: 'B', format: { bold: true, italic: false, bgOpacity: 0, hAlign: 'right' } },
    ] }] };
    for (const cells of [[at(0, 0), at(0, 1)], [at(0, 1), at(0, 0)]])
      expect(commonTableFormat(data, cells)).toEqual({ bold: true, italic: false, bgOpacity: 0 });
  });

  it('bulk formats a nonrectangular selection without filling its holes', () => {
    const data = table(2, 2);
    const rows = formatTableCells(data, [at(0, 0), at(1, 1), at(0, 0)], { underline: true });
    expect(rows).toEqual([
      { cells: [{ value: '0:0', format: { underline: true } }, '0:1'] },
      { cells: ['1:0', { value: '1:1', format: { underline: true } }] },
    ]);
  });
});

describe('table merge and unmerge', () => {
  it('concatenates nonempty owners in row-major order without trimming unicode, whitespace or newlines', () => {
    const data: WidgetData = {
      ...table(2, 3),
      rows: [{ cells: ['Ω\nfirst', '', '  '] }, { cells: ['雪🧙', 'last\n', 'outside'] }],
      tableRowSettings: [{ format: { bold: true } }],
      tableColumnSettings: [{ format: { textColor: '#123456' } }],
    };
    const original = structuredClone(data);
    const patch = mergeTableCells(data, [at(1, 1), at(0, 2), at(0, 0), at(1, 0), at(0, 1), at(1, 2)]);
    expect(patch.tableMergedCells).toEqual([rectangle(0, 0, 2, 3)]);
    expect(tableCellValue(patch.rows![0].cells[0])).toBe('Ω\nfirst\n  \n雪🧙\nlast\n\noutside');
    for (const cell of patch.rows!.flatMap(row => row.cells).slice(1))
      expect(cell).toEqual({ value: '', format: { bold: true, textColor: '#123456' } });
    expect(data).toEqual(original);
  });

  it('merges empty strings without adding separators', () => {
    expect(mergeTableCells({ columns: ['A', 'B'], rows: [{ cells: ['', ''] }] },
      [at(0, 0), at(0, 1)]).rows).toEqual([{ cells: [{ value: '', format: {} }, { value: '', format: {} }] }]);
  });

  it('combines existing merges only once and leaves unrelated merges and cells intact', () => {
    const data: WidgetData = {
      ...table(3, 3), tableMergedCells: [rectangle(0, 0, 1, 2), rectangle(2, 0, 1, 2)],
      rows: [{ cells: ['first\nsecond', '', 'third'] }, { cells: ['A', 'B', 'C'] },
        { cells: ['unrelated', '', 'outside'] }],
    };
    const patch = mergeTableCells(data, [at(0, 1), at(0, 2), at(0, 0)]);
    expect(tableCellValue(patch.rows![0].cells[0])).toBe('first\nsecond\nthird');
    expect(patch.tableMergedCells).toEqual([rectangle(2, 0, 1, 2), rectangle(0, 0, 1, 3)]);
    expect(patch.rows![2]).toEqual(data.rows![2]);
  });

  it.each(['label', 'formula'] as const)('blocks explicit and inherited %s anywhere in a selection', property => {
    const cells = mergeCoordinates(rectangle(0, 0, 2, 2));
    const value = property === 'label' ? 'score' : '1 + 1';
    const explicit = table(2, 2);
    explicit.rows![1].cells[1] = { value: 'D', [property]: value };
    const row = { ...table(2, 2), tableRowSettings: [{}, { [property]: value }] };
    const column = { ...table(2, 2), tableColumnSettings: [{}, { [property]: value }] };
    for (const data of [explicit, row, column]) {
      expect(tableMergeBlockedReason(data, cells)).toMatch(/labels and formulas/);
      expect(() => mergeTableCells(data, cells)).toThrow(/labels and formulas/);
    }
    explicit.tableMergedCells = [rectangle(1, 0, 1, 2)];
    expect(tableMergeBlockedReason(explicit, [at(0, 0), at(0, 1), at(1, 0)]))
      .toMatch(/labels and formulas/);
  });

  it('ignores automation outside the selection and rejects invalid selection coordinates', () => {
    const data = { ...table(), tableRowSettings: [{}, {}, { label: 'outside' }] };
    expect(tableMergeBlockedReason(data, [at(0, 0), at(0, 1)])).toBeUndefined();
    for (const cell of [at(-1, 0), at(0, 4), at(4, 0), at(0.5, 0), at(NaN, 0)])
      expect(tableMergeBlockedReason(data, [at(0, 0), cell])).toMatch(/outside/);
    expect(() => mergeTableCells(data, [at(0, 0), at(1, 1)])).toThrow(/rectangle/);
  });

  it('unmerges from a covered cell, preserving the current anchor text, automation and effective format', () => {
    const initial = table(2, 3);
    const data = { ...initial, ...mergeTableCells(initial, [at(0, 0), at(0, 1)]) };
    data.rows![0].cells[0] = { value: 'edited\nΩ', label: 'score', formula: '2', format: { bold: true } };
    data.tableRowSettings = [{ format: { textColor: '#123456' } }];
    const original = structuredClone(data);
    const patch = unmergeTableCells(data, at(0, 1));
    expect(patch.tableMergedCells).toEqual([]);
    expect(patch.rows![0].cells.slice(0, 2)).toEqual([
      { value: 'edited\nΩ', label: 'score', formula: '2', format: { bold: true, textColor: '#123456' } },
      { value: '', format: { bold: true, textColor: '#123456' } },
    ]);
    expect(patch.rows![0].cells[2]).toBe(initial.rows![0].cells[2]);
    expect(data).toEqual(original);
    expect(() => unmergeTableCells(data, at(1, 2))).toThrow(/merged cell/);
  });

  it('unmerges a vertical rectangle without removing unrelated merges', () => {
    const initial = table(3, 3);
    const merged = { ...initial, ...mergeTableCells(initial, mergeCoordinates(rectangle(0, 0, 3, 1))) };
    merged.tableMergedCells!.push(rectangle(0, 1, 1, 2));
    const patch = unmergeTableCells(merged, at(2, 0));
    expect(patch.tableMergedCells).toEqual([rectangle(0, 1, 1, 2)]);
    expect(patch.rows!.map(row => tableCellValue(row.cells[0]))).toEqual(['0:0\n1:0\n2:0', '', '']);
  });
});

describe('merge metadata validation', () => {
  it('supports legacy tables without metadata and default columns', () => {
    expect(validateTableMerges({})).toEqual({ merges: [] });
    expect(validateTableMerges({ rows: [{ cells: ['A', 'B', 'C'] }],
      tableMergedCells: [rectangle(0, 1, 1, 2)] })).toEqual({ merges: [rectangle(0, 1, 1, 2)] });
  });

  it.each([
    null, {}, 'bad', rectangle(-1, 0, 1, 2), rectangle(0, -1, 1, 2),
    rectangle(0, 0, 0, 2), rectangle(0, 0, 1, 1), rectangle(0, 0, 1.5, 2),
    rectangle(0, 0, 2, Infinity), rectangle(NaN, 0, 1, 2), rectangle(3, 0, 2, 1),
    rectangle(0, 3, 1, 2),
  ])('rejects malformed merge %j without changing original cell data', invalid => {
    const data = { ...table(), tableMergedCells: [invalid] } as unknown as WidgetData;
    const original = structuredClone(data);
    expect(validateTableMerges(data)).toEqual({ merges: [], error: expect.stringMatching(/Invalid/) });
    expect(() => mergeTableCells(data, [at(0, 0), at(0, 1)])).toThrow(/Invalid/);
    expect(transformTableAxis(data, 'row', [0, 1, 2, 3]).ok).toBe(false);
    expect(data).toEqual(original);
  });

  it('rejects non-array and overlapping metadata rather than applying only valid entries', () => {
    expect(validateTableMerges({ ...table(), tableMergedCells: {} } as WidgetData).error).toMatch(/Invalid/);
    const merges = [rectangle(0, 0, 2, 2), rectangle(1, 1, 1, 2)];
    expect(validateTableMerges({ ...table(), tableMergedCells: merges }))
      .toEqual({ merges: [], error: expect.stringMatching(/Overlapping/) });
    expect(validateTableMerges({ ...table(), tableMergedCells: [merges[0], rectangle(0, 2, 2, 2)] }).error)
      .toBeUndefined();
  });
});

describe.each(['row', 'column'] as const)('%s transformations', axis => {
  const along = (start: number, span: number) =>
    axis === 'row' ? rectangle(start, 0, span, 2) : rectangle(0, start, 2, span);
  const dataFor = (merge = along(1, 2)): WidgetData => ({
    ...table(5, 5), tableMergedCells: [merge],
    tableRowSettings: Array.from({ length: 5 }, (_, i) => ({ label: `row${i}` })),
    tableColumnSettings: Array.from({ length: 5 }, (_, i) => ({ label: `column${i}`, width: 100 + i })),
  });

  it.each([
    { name: 'identity', order: [0, 1, 2, 3, 4], start: 1 },
    { name: 'move outside before merge', order: [4, 0, 1, 2, 3], start: 2 },
    { name: 'move outside past merge', order: [1, 2, 3, 0, 4], start: 0 },
    { name: 'move entire merge intact', order: [0, 3, 4, 1, 2], start: 3 },
    { name: 'delete before merge', order: [1, 2, 3, 4], start: 0 },
    { name: 'delete after merge', order: [0, 1, 2, 4], start: 1 },
  ])('preserves geometry, cells and matching settings: $name', ({ order, start }) => {
    const data = dataFor();
    const original = structuredClone(data);
    const result = transformTableAxis(data, axis, order);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(result.removesMergedCells).toBe(false);
    expect(result.data.tableMergedCells).toEqual([along(start, 2)]);
    if (axis === 'row') {
      expect(result.data.rows).toEqual(order.map(i => data.rows![i]));
      expect(result.data.tableRowSettings).toEqual(order.map(i => data.tableRowSettings![i]));
    } else {
      expect(result.data.columns).toEqual(order.map(i => data.columns![i]));
      expect(result.data.rows).toEqual(data.rows!.map(row => ({ cells: order.map(i => row.cells[i]) })));
      expect(result.data.tableColumnSettings).toEqual(order.map(i => data.tableColumnSettings![i]));
    }
    expect(validateTableMerges({ ...data, ...result.data }).error).toBeUndefined();
    expect(data).toEqual(original);
  });

  it.each([
    { name: 'deleting anchor only', order: [0, 2, 3, 4] },
    { name: 'deleting covered member only', order: [0, 1, 3, 4] },
    { name: 'moving an outside member through merge', order: [1, 0, 2, 3, 4] },
    { name: 'splitting merge', order: [0, 1, 3, 2, 4] },
    { name: 'reversing merge', order: [0, 2, 1, 3, 4] },
    { name: 'reversing entire table', order: [4, 3, 2, 1, 0] },
  ])('rejects $name atomically', ({ order }) => {
    const data = dataFor();
    const original = structuredClone(data);
    expect(transformTableAxis(data, axis, order))
      .toEqual({ ok: false, reason: expect.stringMatching(/Unmerge/) });
    expect(data).toEqual(original);
  });

  it.each([{ order: [0, 3, 4] }, { order: [] }])('allows deleting an entire merge and flags destructive removal: $order', ({ order }) => {
    const result = transformTableAxis(dataFor(), axis, order);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(result.removesMergedCells).toBe(true);
    expect(result.data.tableMergedCells).toEqual([]);
  });

  it('moves perpendicular single-axis merges and allows deleting them whole', () => {
    const merge = along(1, 1);
    const data = dataFor(merge);
    const moved = transformTableAxis(data, axis, [0, 2, 3, 4, 1]);
    expect(moved).toMatchObject({ ok: true, removesMergedCells: false,
      data: { tableMergedCells: [along(4, 1)] } });
    expect(transformTableAxis(data, axis, [0, 2, 3, 4])).toMatchObject({
      ok: true, removesMergedCells: true, data: { tableMergedCells: [] },
    });
  });

  it('moves an aligned horizontal or vertical merge as an intact block', () => {
    const merge = axis === 'row' ? rectangle(1, 0, 2, 1) : rectangle(0, 1, 1, 2);
    const expected = axis === 'row' ? rectangle(3, 0, 2, 1) : rectangle(0, 3, 1, 2);
    expect(transformTableAxis(dataFor(merge), axis, [0, 3, 4, 1, 2])).toMatchObject({
      ok: true, removesMergedCells: false, data: { tableMergedCells: [expected] },
    });
  });

  it('deletes one complete merge while retaining and repositioning another', () => {
    const data = { ...dataFor(), tableMergedCells: [along(0, 2), along(3, 2)] };
    expect(transformTableAxis(data, axis, [2, 3, 4])).toMatchObject({
      ok: true, removesMergedCells: true, data: { tableMergedCells: [along(1, 2)] },
    });
  });

  it.each([
    { order: [0, 0] }, { order: [-1] }, { order: [5] }, { order: [0.5] }, { order: [NaN] },
  ])('rejects invalid permutations $order', ({ order }) => {
    expect(transformTableAxis(dataFor(), axis, order))
      .toEqual({ ok: false, reason: expect.stringMatching(/Invalid table/) });
  });

  it('handles legacy cells and absent settings with no merges', () => {
    const result = transformTableAxis(table(2, 2), axis, [1, 0]);
    expect(result).toMatchObject({ ok: true, removesMergedCells: false, data: { tableMergedCells: [] } });
    if (!result.ok) throw new Error(result.reason);
    expect(axis === 'row' ? result.data.tableRowSettings : result.data.tableColumnSettings).toEqual([{}, {}]);
  });
});
