import { describe, expect, it } from 'vitest';
import type { Character, Widget } from '../types';
import { buildDependencyGraph, collectLabels, getAvailableLabels, resolveCharacterFormulas } from './formulaEngine';

function characterWith(...widgets: Widget[]): Character {
  return {
    id: 'character', name: 'Test', activeSheetId: 'sheet',
    sheets: [{ id: 'sheet', name: 'Main', widgets }],
  };
}

const source: Widget = { id: 'source', type: 'NUMBER', x: 0, y: 0, data: { numberItems: [{ name: 'Grit', value: 4, valueLabel: 'grit' }] } };

function track(data: Widget['data']): Widget {
  return {
    id: 'track', type: 'THRESHOLD_TRACK', x: 0, y: 0,
    data: {
      label: 'Wounds', currentValue: 5, minValue: 0, maxValue: 10,
      trackThresholds: [
        { id: 'a', name: 'Hurt', value: 3 },
        { id: 'b', name: 'Crippled', value: 7, modifier: -2 },
      ],
      ...data,
    },
  };
}

function xp(data: Widget['data']): Widget {
  return {
    id: 'xp', type: 'XP_LEVEL', x: 0, y: 0,
    data: {
      label: 'Experience', currentValue: 450,
      xpLevels: [{ id: 'a', xp: 0 }, { id: 'b', xp: 300 }, { id: 'c', xp: 900 }],
      ...data,
    },
  };
}

describe('threshold track formulas', () => {
  it('exposes the value, zone number, zone modifier and threshold labels', () => {
    const character = characterWith(track({
      fieldLabels: { currentValue: 'wounds', trackZone: 'wound_zone', trackModifier: 'wound_penalty' },
      trackThresholds: [
        { id: 'a', name: 'Hurt', value: 3, valueLabel: 'hurt_at' },
        { id: 'b', name: 'Crippled', value: 7, modifier: -2 },
      ],
    }));
    expect(collectLabels(character)).toMatchObject({ wounds: 5, wound_zone: 1, wound_penalty: 0, hurt_at: 3 });
    expect(getAvailableLabels(character)).toEqual(expect.arrayContaining([
      { label: 'wound_zone', value: 1, widgetLabel: 'Wounds', sheetName: 'Main' },
      { label: 'hurt_at', value: 3, widgetLabel: 'Wounds', sheetName: 'Main' },
    ]));
    const critical = characterWith(track({ currentValue: 8, fieldLabels: { trackZone: 'zone', trackModifier: 'penalty' } }));
    expect(collectLabels(critical)).toMatchObject({ zone: 2, penalty: -2 });
  });

  it('uses the reverse direction for tracks that count down', () => {
    const character = characterWith(track({ currentValue: 2, trackThresholdMode: 'falling', fieldLabels: { trackZone: 'zone' } }));
    expect(collectLabels(character)).toMatchObject({ zone: 2 });
  });

  it('resolves value and threshold formulas and keeps the value inside the bounds', () => {
    const character = characterWith(source, track({
      fieldFormulas: { currentValue: '@grit * 5', maxValue: '@grit + 6' },
      trackThresholds: [{ id: 'a', name: 'Hurt', value: 3, valueFormula: '@grit / 2 + 0.6' }],
    }));
    const resolved = resolveCharacterFormulas(character)!;
    const data = resolved.sheets[0].widgets[1].data;
    expect(data).toMatchObject({ maxValue: 10, currentValue: 10 });
    expect(data.trackThresholds![0].value).toBe(3);
    expect(resolveCharacterFormulas(resolved)).toBeNull();
  });

  it('clamps an out-of-range stored value', () => {
    const resolved = resolveCharacterFormulas(characterWith(track({ currentValue: 40 })))!;
    expect(resolved.sheets[0].widgets[0].data.currentValue).toBe(10);
  });

  it('registers threshold and derived labels in the dependency graph', () => {
    const character = characterWith(source, track({
      fieldLabels: { currentValue: 'wounds', trackZone: 'wound_zone' },
      fieldFormulas: { currentValue: '@grit' },
      trackThresholds: [{ id: 'a', name: 'Hurt', value: 3, valueLabel: 'hurt_at', valueFormula: '@grit - 1' }],
    }));
    expect(buildDependencyGraph(character)).toMatchObject({
      wounds: ['grit'],
      hurt_at: ['grit'],
      wound_zone: expect.arrayContaining(['wounds', 'hurt_at']),
    });
  });
});

describe('xp and level formulas', () => {
  it('exposes the xp, level, xp to next level and requirement labels', () => {
    const character = characterWith(xp({
      fieldLabels: { currentValue: 'xp', xpLevel: 'level', xpToNext: 'xp_needed' },
      xpLevels: [{ id: 'a', xp: 0 }, { id: 'b', xp: 300, xpLabel: 'level_two_at' }, { id: 'c', xp: 900 }],
    }));
    expect(collectLabels(character)).toMatchObject({ xp: 450, level: 2, xp_needed: 450, level_two_at: 300 });
    expect(getAvailableLabels(character)).toEqual(expect.arrayContaining([
      { label: 'level', value: 2, widgetLabel: 'Experience', sheetName: 'Main' },
    ]));
  });

  it('uses the number of the first level', () => {
    const character = characterWith(xp({ xpFirstLevel: 0, fieldLabels: { xpLevel: 'level' } }));
    expect(collectLabels(character)).toMatchObject({ level: 1 });
  });

  it('resolves formulas for xp and level requirements, and keeps xp whole and non-negative', () => {
    const character = characterWith(source, xp({
      fieldFormulas: { currentValue: '@grit * 100 - 500' },
      xpLevels: [{ id: 'a', xp: 0 }, { id: 'b', xp: 300, xpFormula: '@grit * 25.4' }],
    }));
    const resolved = resolveCharacterFormulas(character)!;
    const data = resolved.sheets[0].widgets[1].data;
    expect(data.currentValue).toBe(0);
    expect(data.xpLevels![1].xp).toBe(102);
    expect(resolveCharacterFormulas(resolved)).toBeNull();
  });

  it('lets other widgets use the level', () => {
    const character = characterWith(
      xp({ fieldLabels: { xpLevel: 'level' } }),
      { id: 'bonus', type: 'NUMBER', x: 0, y: 0, data: { numberItems: [{ name: 'Proficiency', value: 0, valueFormula: '2 + floor((@level - 1) / 4)' }] } },
    );
    const resolved = resolveCharacterFormulas(character)!;
    expect(resolved.sheets[0].widgets[1].data.numberItems![0].value).toBe(2);
  });

  it('registers requirement and derived labels in the dependency graph', () => {
    const character = characterWith(source, xp({
      fieldLabels: { currentValue: 'xp', xpLevel: 'level' },
      fieldFormulas: { currentValue: '@grit' },
      xpLevels: [{ id: 'a', xp: 0 }, { id: 'b', xp: 300, xpLabel: 'second', xpFormula: '@grit * 10' }],
    }));
    expect(buildDependencyGraph(character)).toMatchObject({
      xp: ['grit'],
      second: ['grit'],
      level: expect.arrayContaining(['xp', 'second']),
    });
  });
});
