import { describe, expect, it } from 'vitest';
import type { Character, WidgetData } from '../types';
import {
  buildDependencyGraph,
  collectLabels,
  detectCircularReference,
  evaluateFormula,
  getAvailableLabels,
  resolveCharacterFormulas,
  type FormulaChange,
} from './formulaEngine';

function characterWithTable(data: WidgetData, sourceLabels: Record<string, number> = {}): Character {
  return {
    id: 'character', name: 'Test', activeSheetId: 'sheet',
    sheets: [{ id: 'sheet', name: 'Main', widgets: [
      { id: 'table', type: 'TABLE', x: 0, y: 0, data: { label: 'Stats', ...data } },
      { id: 'source', type: 'NUMBER', x: 0, y: 0, data: {
        numberItems: Object.entries(sourceLabels).map(([valueLabel, value]) => ({ name: valueLabel, value, valueLabel })),
      } },
    ] }],
  };
}

function mergedData(): WidgetData {
  return {
    columns: ['A', 'B', 'C'],
    rows: [
      { cells: [{ value: '1', label: 'anchor', formula: '@source' }, { value: '90', label: 'hidden', formula: '@source + 90' }, '3'] },
      { cells: ['80', { value: '70', label: 'also_hidden' }, '6'] },
      { cells: ['7', '8', '9'] },
    ],
    tableMergedCells: [{ row: 0, col: 0, rowSpan: 2, colSpan: 2 }],
    tableColumnSettings: [{ label: 'a', formula: '@source + 10' }, { label: 'b', formula: '@source + 20' }, { label: 'c' }],
    tableRowSettings: [{ label: 'first', formula: '@source + 1' }, { label: 'second', formula: '@source + 2' }, { label: 'third' }],
  };
}

describe('merged table formulas', () => {
  it('collects only visible explicit and generated labels, preserving physical indexes', () => {
    const data = mergedData();
    const character = characterWithTable(data);
    const expected = {
      anchor: 1, a1: 1, first1: 1, c1: 3, first3: 3,
      c2: 6, second3: 6, a3: 7, third1: 7, b3: 8, third2: 8, c3: 9, third3: 9,
    };
    expect(collectLabels(character)).toEqual(expected);
    expect(getAvailableLabels(character)).toEqual(Object.entries(expected).map(([label, value]) => ({
      label, value, widgetLabel: 'Stats', sheetName: 'Main',
    })));
    expect(evaluateFormula('SUM(@a)', collectLabels(character))).toBe(8);
    expect(evaluateFormula('SUM(@first)', collectLabels(character))).toBe(4);
    expect(evaluateFormula('VALUE(@a, 2, -1)', collectLabels(character))).toBe(-1);
  });

  it.each([
    ['cell', '@source + 3', '@source + 2', '@source + 1', '7'],
    ['row', undefined, '@source + 2', '@source + 1', '6'],
    ['column', undefined, undefined, '@source + 1', '5'],
  ])('uses the anchor %s formula without applying automation to covered coordinates', (_name, cellFormula, rowFormula, columnFormula, expected) => {
    const character = characterWithTable({
      rows: [
        { cells: [{ value: '0', label: 'anchor', formula: cellFormula }, { value: '', formula: '@source + 90' }] },
        { cells: ['', ''] },
      ],
      tableMergedCells: [{ row: 0, col: 0, rowSpan: 2, colSpan: 2 }],
      tableRowSettings: [{ formula: rowFormula }, { formula: '@source + 20' }],
      tableColumnSettings: [{ formula: columnFormula }, { formula: '@source + 30' }],
    }, { source: 4 });

    const resolved = resolveCharacterFormulas(character)!;
    const rows = resolved.sheets[0].widgets[0].data.rows!;
    expect(rows[0].cells[0]).toMatchObject({ value: expected });
    expect(rows[0].cells[1]).toBe(character.sheets[0].widgets[0].data.rows![0].cells[1]);
    expect(rows[1]).toBe(character.sheets[0].widgets[0].data.rows![1]);
    expect((resolved as Character & { _formulaChanges: FormulaChange[] })._formulaChanges).toEqual([{
      widgetLabel: 'Stats', fieldName: 'cell[0,0]', oldValue: 0, newValue: Number(expected),
      formula: cellFormula || rowFormula || columnFormula, sheetName: 'Main',
    }]);
    expect(resolveCharacterFormulas(resolved)).toBeNull();
    expect(character.sheets[0].widgets[0].data.rows![0].cells[0]).toMatchObject({ value: '0' });
  });

  it('omits covered formula nodes and covered members of generated-label dependency groups', () => {
    const character = characterWithTable(mergedData(), { source: 4 });
    character.sheets[0].widgets.push({
      id: 'total', type: 'NUMBER', x: 0, y: 0,
      data: { numberItems: [{ name: 'Total', value: 0, valueLabel: 'total', valueFormula: 'SUM(@a) + SUM(@first)' }] },
    });
    expect(buildDependencyGraph(character)).toEqual({
      anchor: ['source'], first1: ['source'], a1: ['source'], first3: ['source'], c1: ['source'],
      second3: ['source'], c2: ['source'], third1: ['source'], a3: ['source'], third2: ['source'], b3: ['source'],
      total: ['a1', 'a3', 'first1', 'first3'],
    });
    expect(detectCircularReference('source', '@hidden', character)).toBeNull();
    expect(detectCircularReference('source', '@anchor', character)).toEqual(['source', 'anchor', 'source']);
    const resolved = resolveCharacterFormulas(character)!;
    expect(resolved.sheets[0].widgets[2].data.numberItems![0].value).toBe(27);
    expect((resolved as Character & { _formulaChanges: FormulaChange[] })._formulaChanges
      .filter(change => change.widgetLabel === 'Stats').map(change => change.fieldName))
      .toEqual(['cell[0,0]', 'cell[0,2]', 'cell[2,0]', 'cell[2,1]']);
  });

  it.each(['row', 'column'] as const)('does not treat covered labels as %s automation self-references', (direction) => {
    for (const [formula, sourceLabels] of [
      ['@hidden + 1', { hidden: 4 }],
      ['@own2 + 1', { own2: 4 }],
      ['@other1 + 1', { other1: 4 }],
      ['SUM(@other) + 1', { other1: 4 }],
    ] as [string, Record<string, number>][]) {
      const data: WidgetData = direction === 'row' ? {
        rows: [{ cells: ['0', { value: '', label: 'hidden' }] }],
        tableMergedCells: [{ row: 0, col: 0, rowSpan: 1, colSpan: 2 }],
        tableRowSettings: [{ label: 'own', formula }],
        tableColumnSettings: [{}, { label: 'other' }],
      } : {
        rows: [{ cells: ['0'] }, { cells: [{ value: '', label: 'hidden' }] }],
        tableMergedCells: [{ row: 0, col: 0, rowSpan: 2, colSpan: 1 }],
        tableColumnSettings: [{ label: 'own', formula }],
        tableRowSettings: [{}, { label: 'other' }],
      };
      const resolved = resolveCharacterFormulas(characterWithTable(data, sourceLabels))!;
      expect(resolved.sheets[0].widgets[0].data.rows![0].cells[0]).toEqual({ value: '5' });
      expect((resolved as Character & { _formulaChanges: FormulaChange[] })._formulaChanges)
        .toMatchObject([{ fieldName: 'cell[0,0]', newValue: 5, formula }]);
    }
  });

  it.each(['row', 'column'] as const)('still rejects %s automation referencing its visible anchor label', (direction) => {
    const data: WidgetData = {
      rows: [{ cells: [{ value: '2', label: 'anchor' }, ''] }, { cells: ['', ''] }],
      tableMergedCells: [{ row: 0, col: 0, rowSpan: 2, colSpan: 2 }],
      ...(direction === 'row'
        ? { tableRowSettings: [{ formula: '@anchor + 1' }] }
        : { tableColumnSettings: [{ formula: '@anchor + 1' }] }),
    };
    expect(resolveCharacterFormulas(characterWithTable(data))).toBeNull();
  });

  it('preserves ordinary table behavior when no merge metadata exists', () => {
    const data = mergedData();
    delete data.tableMergedCells;
    const character = characterWithTable(data, { source: 4 });
    expect(collectLabels(character)).toMatchObject({ hidden: 90, also_hidden: 70, a2: 80, b1: 90, b2: 70 });
    expect(buildDependencyGraph(character)).toMatchObject({ hidden: ['source'], a2: ['source'], b1: ['source'], b2: ['source'] });
    const resolved = resolveCharacterFormulas(character)!;
    expect(resolved.sheets[0].widgets[0].data.rows![1].cells).toEqual([
      { value: '6' }, { value: '6', label: 'also_hidden' }, '6',
    ]);
  });

  it.each([
    { name: 'row overflow', merges: [{ row: 0, col: 0, rowSpan: 4, colSpan: 2 }] },
    { name: 'column overflow', merges: [{ row: 0, col: 0, rowSpan: 2, colSpan: 4 }] },
    { name: 'fractional span', merges: [{ row: 0, col: 0, rowSpan: 1.5, colSpan: 2 }] },
    { name: 'overlap', merges: [{ row: 0, col: 0, rowSpan: 2, colSpan: 2 }, { row: 1, col: 1, rowSpan: 2, colSpan: 2 }] },
    { name: 'non-array metadata', merges: 'invalid' },
  ])('ignores $name without hiding labels or suppressing automation', ({ merges }) => {
    const tableMergedCells = merges as WidgetData['tableMergedCells'];
    const baselineData = mergedData();
    delete baselineData.tableMergedCells;
    const baseline = characterWithTable(baselineData, { source: 4 });
    const invalid = characterWithTable({ ...baselineData, tableMergedCells }, { source: 4 });
    expect(collectLabels(invalid)).toEqual(collectLabels(baseline));
    expect(getAvailableLabels(invalid)).toEqual(getAvailableLabels(baseline));
    expect(buildDependencyGraph(invalid)).toEqual(buildDependencyGraph(baseline));
    const resolved = resolveCharacterFormulas(invalid)!;
    const expected = resolveCharacterFormulas(baseline)!;
    expect(resolved.sheets[0].widgets[0].data.rows).toEqual(expected.sheets[0].widgets[0].data.rows);
    expect((resolved as Character & { _formulaChanges: FormulaChange[] })._formulaChanges)
      .toEqual((expected as Character & { _formulaChanges: FormulaChange[] })._formulaChanges);
  });
});
