import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Character, TableCell, WidgetData } from '../types';
import { cloneCharacterForWorkspace, cloneWidgetData } from '../utils/characterClone';
import { formatTableCells, mergeTableCells, transformTableAxis, unmergeTableCells, validateTableMerges } from '../utils/tableCells';
import { createWorkspaceDocument, parseWorkspaceDocument } from '../workspaces/workspaceDocument';
import { useStore } from './useStore';
import { useUndoStore } from './useUndoStore';

vi.hoisted(() => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
  vi.stubGlobal('window', { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({}));
});

const selection = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
const initialData = (): WidgetData => ({
  label: 'Inventory',
  columns: ['Name', 'Notes', 'Weight'],
  rows: [
    { cells: [{ value: 'Épée', format: { bold: true } }, '雪\n🧙', '1'] },
    { cells: ['Rope', '', '2'] },
  ],
  tableColumnSettings: [{ width: 120, format: { textColor: '#123456' } }, { width: 180 }, {}],
  tableRowSettings: [{ format: { italic: true } }, {}],
});
const makeCharacter = (data = initialData()): Character => ({
  id: 'table-character',
  name: 'Table Character',
  activeSheetId: 'table-sheet',
  sheets: [{ id: 'table-sheet', name: 'Main', widgets: [{ id: 'table-widget', type: 'TABLE', x: 0, y: 0, data }] }],
});
const currentCharacter = () => useStore.getState().characters[0];
const currentData = () => currentCharacter().sheets[0].widgets[0].data;

describe('merged table store actions and persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
    vi.stubGlobal('window', { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({}));
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    useUndoStore.getState().clearAllHistory();
    useUndoStore.getState().setIsUndoRedoing(false);
    useStore.getState()._replaceWorkspaceState({
      characters: [makeCharacter()], activeCharacterId: 'table-character', mode: 'edit',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function nextAction() {
    vi.mocked(Date.now).mockReturnValue(Date.now() + 1000);
  }

  function expectUndoRedo(before: WidgetData, after: WidgetData) {
    expect(useStore.getState().canUndo()).toBe(true);
    useStore.getState().undo();
    expect(currentData()).toEqual(before);
    expect(useStore.getState().canRedo()).toBe(true);
    useStore.getState().redo();
    expect(currentData()).toEqual(after);
  }

  it('merges content, geometry and formats atomically with complete undo and redo', () => {
    const before = structuredClone(currentData());
    useStore.getState().updateWidgetData('table-widget', mergeTableCells(currentData(), selection));
    const after = structuredClone(currentData());
    expect(after.tableMergedCells).toEqual([{ row: 0, col: 0, rowSpan: 1, colSpan: 2 }]);
    expect(after.rows![0].cells[0]).toEqual({
      value: 'Épée\n雪\n🧙', format: { bold: true, italic: true, textColor: '#123456' },
    });
    expect(useUndoStore.getState().past).toHaveLength(1);
    expectUndoRedo(before, after);
  });

  it('undoes and redoes bulk formatting and unmerge as separate complete operations', () => {
    useStore.getState().updateWidgetData('table-widget', mergeTableCells(currentData(), selection));
    nextAction();
    const beforeFormat = structuredClone(currentData());
    useStore.getState().updateWidgetData('table-widget', {
      rows: formatTableCells(currentData(), [{ row: 0, col: 1 }, { row: 1, col: 0 }], { bold: false, bgOpacity: 0 }),
    });
    const formatted = structuredClone(currentData());
    expect((formatted.rows![0].cells[1] as TableCell).format).toMatchObject({ bold: false, bgOpacity: 0 });
    expect(useUndoStore.getState().past).toHaveLength(2);
    expectUndoRedo(beforeFormat, formatted);

    nextAction();
    useStore.getState().updateWidgetData('table-widget', unmergeTableCells(currentData(), { row: 0, col: 1 }));
    const unmerged = structuredClone(currentData());
    expect(unmerged.tableMergedCells).toEqual([]);
    expect((unmerged.rows![0].cells[0] as TableCell).value).toBe('Épée\n雪\n🧙');
    expect((unmerged.rows![0].cells[1] as TableCell).value).toBe('');
    expect(useUndoStore.getState().past).toHaveLength(3);
    expectUndoRedo(formatted, unmerged);
  });

  it('undoes whole-merge deletion together with the matching row settings', () => {
    useStore.getState().updateWidgetData('table-widget', mergeTableCells(currentData(), selection));
    nextAction();
    const before = structuredClone(currentData());
    const result = transformTableAxis(currentData(), 'row', [1]);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(result.removesMergedCells).toBe(true);
    useStore.getState().updateWidgetData('table-widget', result.data);
    const after = structuredClone(currentData());
    expect(after.rows).toEqual([before.rows![1]]);
    expect(after.tableMergedCells).toEqual([]);
    expectUndoRedo(before, after);
  });

  it('round-trips merged characters, templates and presets through workspace JSON and restores them', () => {
    useStore.getState().updateWidgetData('table-widget', mergeTableCells(currentData(), selection));
    const character = structuredClone(currentCharacter());
    const data = character.sheets[0].widgets[0].data;
    const document = createWorkspaceDocument({
      workspaceId: 'workspace-table', name: 'Tables', characters: [character],
      activeCharacterId: character.id, mode: 'edit',
      templates: [{ id: 'template-table', name: 'Table', createdAt: 1, type: 'TABLE', data }],
      userPresets: [{ id: 'preset-table', name: 'Table character', createdAt: 1,
        preset: { name: character.name, sheets: character.sheets, activeSheetId: character.activeSheetId } }],
    });
    const restored = parseWorkspaceDocument(JSON.parse(JSON.stringify(document)));
    expect(restored).toEqual(document);
    expect(restored.characters[0].sheets[0].widgets[0].data).not.toBe(data);
    useStore.getState()._replaceWorkspaceState(restored);
    expect(currentData()).toEqual(data);
    expect(validateTableMerges(currentData()).error).toBeUndefined();
  });

  it('clones merged widget data and characters with independent nested cells, formats and metadata', () => {
    useStore.getState().updateWidgetData('table-widget', mergeTableCells(currentData(), selection));
    const original = structuredClone(currentData());
    const clonedData = cloneWidgetData('TABLE', currentData(), 'new-widget');
    expect(clonedData).toEqual(original);
    clonedData.tableMergedCells![0].colSpan = 3;
    (clonedData.rows![0].cells[0] as TableCell).value = 'changed';
    (clonedData.rows![0].cells[0] as TableCell).format!.bold = false;
    clonedData.tableColumnSettings![0].width = 999;
    expect(currentData()).toEqual(original);

    const clonedCharacter = cloneCharacterForWorkspace(currentCharacter());
    expect(clonedCharacter.id).not.toBe(currentCharacter().id);
    expect(clonedCharacter.sheets[0].id).not.toBe(currentCharacter().sheets[0].id);
    expect(clonedCharacter.activeSheetId).toBe(clonedCharacter.sheets[0].id);
    const clonedWidget = clonedCharacter.sheets[0].widgets[0];
    expect(clonedWidget.id).not.toBe('table-widget');
    expect(clonedWidget.data).toEqual(original);
    clonedWidget.data.tableMergedCells![0].row = 1;
    expect(currentData()).toEqual(original);
  });

  it('clones merged widgets through the store without aliasing source data', () => {
    useStore.getState().updateWidgetData('table-widget', mergeTableCells(currentData(), selection));
    nextAction();
    const source = structuredClone(currentData());
    useStore.getState().cloneWidget('table-widget');
    const widgets = currentCharacter().sheets[0].widgets;
    expect(widgets).toHaveLength(2);
    const clone = widgets.find(widget => widget.id !== 'table-widget')!;
    expect(clone.data).toEqual(source);
    expect(clone.data.tableMergedCells).not.toBe(widgets[0].data.tableMergedCells);
    expect(clone.data.rows![0].cells[0]).not.toBe(widgets[0].data.rows![0].cells[0]);
    nextAction();
    useStore.getState().updateWidgetData(clone.id, unmergeTableCells(clone.data, { row: 0, col: 0 }));
    expect(currentData()).toEqual(source);
    expect(currentCharacter().sheets[0].widgets.find(widget => widget.id === clone.id)!.data.tableMergedCells).toEqual([]);
  });
});
