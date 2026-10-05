import { describe, expect, it } from 'vitest';
import type { Character } from '../types';
import { buildSheetSearchIndex, searchSheetIndex } from './sheetSearch';

describe('progress clock search', () => {
  it('indexes individual clock labels and skips unnamed clocks', () => {
    const character: Character = {
      id: 'character', name: 'Test', activeSheetId: 'sheet',
      sheets: [{ id: 'sheet', name: 'Main', widgets: [{
        id: 'clocks', type: 'PROGRESS_CLOCK', x: 0, y: 0,
        data: { label: 'Downtime', clockItems: [
          { id: 'named', name: 'Repair the ship', segments: 7, value: 2 },
          { id: 'unnamed', name: '', segments: 1, value: 0 },
        ] },
      }] }],
    };
    const index = buildSheetSearchIndex(character);
    expect(searchSheetIndex(index, 'repair ship', 'sheet')).toMatchObject([
      { widgetId: 'clocks', match: { context: 'Clock', text: 'Repair the ship' } },
    ]);
    expect(index[0].segments.every((segment) => segment.text.length > 0)).toBe(true);
  });
});