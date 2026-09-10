import { describe, expect, it } from 'vitest';
import type { Character } from '../types';
import { buildSheetSearchIndex, searchSheetIndex } from './sheetSearch';

function characterWithTable(): Character {
  return {
    id: 'character', name: 'Test', activeSheetId: 'sheet',
    sheets: [{ id: 'sheet', name: 'Main', widgets: [{
      id: 'table', type: 'TABLE', x: 0, y: 0,
      data: {
        label: 'Equipment', columns: ['Name', 'Description', 'Weight'],
        rows: [
          { cells: [{ value: 'Merged shield', label: 'armor' }, { value: 'Covered sword', label: 'hidden_label' }, 'Visible rope'] },
          { cells: ['Covered potion', { value: 'Covered staff', label: 'hidden_second' }, { value: 'Visible lantern', label: 'light' }] },
        ],
        tableMergedCells: [{ row: 0, col: 0, rowSpan: 2, colSpan: 2 }],
      },
    }] }],
  };
}

describe('merged table search', () => {
  it('indexes anchor and unmerged cells at their physical coordinates, retaining headers', () => {
    const index = buildSheetSearchIndex(characterWithTable());
    expect(searchSheetIndex(index, 'merged shield', 'sheet')).toMatchObject([
      { widgetId: 'table', match: { context: 'Cell 1, 1', text: 'Merged shield' } },
    ]);
    expect(searchSheetIndex(index, 'armor', 'sheet')[0].match).toEqual({ context: 'Cell label', text: 'armor' });
    expect(searchSheetIndex(index, 'rope', 'sheet')[0].match).toEqual({ context: 'Cell 1, 3', text: 'Visible rope' });
    expect(searchSheetIndex(index, 'lantern', 'sheet')[0].match).toEqual({ context: 'Cell 2, 3', text: 'Visible lantern' });
    expect(searchSheetIndex(index, 'description', 'sheet')[0].match).toEqual({ context: 'Column', text: 'Description' });
    expect(searchSheetIndex(index, 'light', 'sheet')[0].match).toEqual({ context: 'Cell label', text: 'light' });
  });

  it('excludes covered string values, structured values, and explicit labels', () => {
    const index = buildSheetSearchIndex(characterWithTable());
    for (const query of ['covered', 'sword', 'potion', 'staff', 'hidden_label', 'hidden_second']) {
      expect(searchSheetIndex(index, query, 'sheet')).toEqual([]);
    }
  });

  it('indexes every cell in legacy tables without merges', () => {
    const character = characterWithTable();
    delete character.sheets[0].widgets[0].data.tableMergedCells;
    const index = buildSheetSearchIndex(character);
    expect(searchSheetIndex(index, 'potion', 'sheet')[0].match).toEqual({ context: 'Cell 2, 1', text: 'Covered potion' });
    expect(searchSheetIndex(index, 'hidden_label', 'sheet')[0].match).toEqual({ context: 'Cell label', text: 'hidden_label' });
  });

  it('indexes all original cells when merge geometry is out of bounds or overlapping', () => {
    const character = characterWithTable();
    const data = character.sheets[0].widgets[0].data;
    delete data.tableMergedCells;
    const baseline = buildSheetSearchIndex(character);
    for (const merges of [
      [{ row: 0, col: 0, rowSpan: 3, colSpan: 2 }],
      [{ row: 0, col: 0, rowSpan: 2, colSpan: 4 }],
      [{ row: 0, col: 0, rowSpan: 2, colSpan: 2 }, { row: 1, col: 1, rowSpan: 1, colSpan: 2 }],
    ]) {
      data.tableMergedCells = merges;
      expect(buildSheetSearchIndex(character)).toEqual(baseline);
    }
  });
});
