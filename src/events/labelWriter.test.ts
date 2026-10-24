import { describe, expect, it } from 'vitest';
import type { Character, Widget } from '../types';
import { collectLabels } from '../utils/formulaEngine';
import { isLabelWritable, writeLabelValue } from './labelWriter';

const stats: Widget = {
  id: 'w-stats',
  type: 'NUMBER_DISPLAY',
  x: 0,
  y: 0,
  data: {
    displayNumbers: [
      { label: 'Strength', value: 14, valueLabel: 'str' },
      { label: 'Bonus', value: 2, valueLabel: 'str_mod', valueFormula: 'floor((@str - 10) / 2)' },
    ],
  },
};

const health: Widget = {
  id: 'w-hp',
  type: 'HEALTH_BAR',
  x: 0,
  y: 0,
  data: { currentValue: 10, maxValue: 20, fieldLabels: { currentValue: 'hp', maxValue: 'max_hp' }, fieldFormulas: { maxValue: '@str + 6' } },
};

const hero: Character = {
  id: 'c1',
  name: 'Hero',
  activeSheetId: 's1',
  sheets: [{ id: 's1', name: 'Main', widgets: [stats, health] }],
  variables: [{ id: 'v1', label: 'title', value: 'Sir' }, { id: 'v2', label: 'level', value: 3, formula: '1 + 2' }],
};

describe('writeLabelValue', () => {
  it('writes widget items, widget fields and variables', () => {
    expect(collectLabels(writeLabelValue(hero, 'str', 18)!).str).toBe(18);
    expect(collectLabels(writeLabelValue(hero, 'hp', '7')!).hp).toBe(7);
    expect(writeLabelValue(hero, 'title', 'Dame')!.variables?.[0].value).toBe('Dame');
  });

  it('refuses labels computed by formulas, missing labels and bad numbers', () => {
    expect(writeLabelValue(hero, 'str_mod', 5)).toBeNull();
    expect(writeLabelValue(hero, 'max_hp', 30)).toBeNull();
    expect(writeLabelValue(hero, 'level', 4)).toBeNull();
    expect(writeLabelValue(hero, 'nope', 1)).toBeNull();
    expect(writeLabelValue(hero, 'str', 'strong')).toBeNull();
    expect(isLabelWritable(hero, 'str')).toBe(true);
    expect(isLabelWritable(hero, 'str_mod')).toBe(false);
  });
});
