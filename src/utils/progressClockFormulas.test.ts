import { describe, expect, it } from 'vitest';
import type { Character, ProgressClockItem } from '../types';
import { buildDependencyGraph, collectLabels, getAvailableLabels, resolveCharacterFormulas, resolveProgressClockFormulas } from './formulaEngine';

const clock: ProgressClockItem = { id: 'clock', name: 'Escape', segments: 6, value: 2, segmentsLabel: 'escape_size', valueLabel: 'escape_filled' };

function characterWithClock(item: ProgressClockItem): Character {
  return {
    id: 'character', name: 'Test', activeSheetId: 'sheet',
    sheets: [{ id: 'sheet', name: 'Main', widgets: [
      { id: 'clocks', type: 'PROGRESS_CLOCK', x: 0, y: 0, data: { label: 'Clocks', clockItems: [item] } },
      { id: 'source', type: 'NUMBER', x: 0, y: 0, data: { numberItems: [{ name: 'Effort', value: 4, valueLabel: 'effort' }] } },
      { id: 'output', type: 'NUMBER', x: 0, y: 0, data: { numberItems: [{ name: 'Remaining', value: 0, valueFormula: '@escape_size - @escape_filled' }] } },
    ] }],
  };
}

describe('progress clock formulas', () => {
  it('exposes both labels to other widgets and the variable picker', () => {
    const character = characterWithClock(clock);
    expect(collectLabels(character)).toMatchObject({ escape_size: 6, escape_filled: 2 });
    expect(getAvailableLabels(character)).toEqual(expect.arrayContaining([
      { label: 'escape_size', value: 6, widgetLabel: 'Clocks', sheetName: 'Main' },
      { label: 'escape_filled', value: 2, widgetLabel: 'Clocks', sheetName: 'Main' },
    ]));
  });

  it('resolves both formulas and propagates results to a dependent widget', () => {
    const character = characterWithClock({ ...clock, segmentsFormula: '@effort * 2', valueFormula: '@effort + 1' });
    const resolved = resolveCharacterFormulas(character)!;
    expect(resolved.sheets[0].widgets[0].data.clockItems![0]).toMatchObject({ segments: 8, value: 5 });
    expect(resolved.sheets[0].widgets[2].data.numberItems![0].value).toBe(3);
    expect(resolveCharacterFormulas(resolved)).toBeNull();
    expect(character.sheets[0].widgets[0].data.clockItems![0].segments).toBe(6);
  });

  it('keeps computed counts integral and bounded, including one-segment clocks', () => {
    expect(resolveProgressClockFormulas({ ...clock, segmentsFormula: '0', valueFormula: '50' }, {})).toMatchObject({ segments: 1, value: 1 });
    expect(resolveProgressClockFormulas({ ...clock, segmentsFormula: '7.9', valueFormula: '3.8' }, {})).toMatchObject({ segments: 7, value: 3 });
    expect(resolveProgressClockFormulas({ ...clock, valueFormula: '-3' }, {})).toMatchObject({ value: 0 });
    expect(resolveProgressClockFormulas({ ...clock, segmentsFormula: '1' }, {})).toMatchObject({ segments: 1, value: 1 });
  });

  it('preserves the last valid values when formulas are broken', () => {
    expect(resolveProgressClockFormulas({ ...clock, segmentsFormula: '@missing', valueFormula: '1 / 0' }, {})).toMatchObject({ segments: 6, value: 2 });
    expect(resolveProgressClockFormulas(clock, {})).toBe(clock);
  });

  it('registers both formulas in the circular-reference dependency graph', () => {
    const character = characterWithClock({ ...clock, segmentsFormula: '@effort * 2', valueFormula: '@escape_size - 1' });
    expect(buildDependencyGraph(character)).toMatchObject({ escape_size: ['effort'], escape_filled: ['escape_size'] });
  });
});