import { describe, expect, it } from 'vitest';
import type { Character, DicePoolComponent, Widget, WidgetData } from '../types';
import { buildDependencyGraph, collectLabels, getAvailableLabels, resolveCharacterFormulas } from './formulaEngine';
import {
  describePoolGroups,
  evaluatePoolRoll,
  getDicePoolDerivedValue,
  getPoolGroups,
  getPoolSize,
  getRollPlan,
  MAX_POOL_DICE,
  normalizePoolBonus,
  normalizePoolFaces,
  normalizePoolTarget,
} from './dicePool';

const part = (id: string, dice: number, overrides: Partial<DicePoolComponent> = {}): DicePoolComponent => ({
  id, name: id, dice, active: true, ...overrides,
});

const tiers = [
  { id: 'a', min: 6, label: 'Full success' },
  { id: 'b', min: 4, label: 'Partial success' },
  { id: 'c', min: 1, label: 'Failure' },
];

describe('dice pool composition', () => {
  it('normalizes sizes, bonuses and targets', () => {
    expect(normalizePoolFaces(1)).toBe(2);
    expect(normalizePoolFaces(undefined, 6)).toBe(6);
    expect(normalizePoolFaces(6.4)).toBe(6);
    expect(normalizePoolFaces(500)).toBe(100);
    expect(normalizePoolBonus(99)).toBe(20);
    expect(normalizePoolBonus(-3.2)).toBe(-3);
    expect(normalizePoolTarget(0)).toBe(1);
    expect(normalizePoolTarget(undefined)).toBe(8);
  });

  it('only includes active traits with dice', () => {
    const data: WidgetData = { dicePoolComponents: [part('str', 3), part('brawl', 2, { active: false }), part('none', 0)] };
    expect(getPoolGroups(data)).toEqual([{ name: 'str', count: 3, faces: 10 }]);
    expect(getPoolSize(data)).toBe(3);
  });

  it('uses each trait die size and falls back to the pool die size', () => {
    const data: WidgetData = { dicePoolFaces: 6, dicePoolComponents: [part('base', 2), part('skill', 1, { faces: 8 })] };
    expect(getPoolGroups(data).map((group) => group.faces)).toEqual([6, 8]);
    expect(describePoolGroups(getPoolGroups(data))).toBe('base 2 + skill 1 (3 dice)');
    expect(describePoolGroups(getPoolGroups({ dicePoolFaces: 6, dicePoolComponents: [part('base', 2)] }))).toBe('base 2 (2d6)');
  });

  it('adds positive extra dice as their own group and removes negative ones from the end', () => {
    const base: WidgetData = { dicePoolComponents: [part('a', 3), part('b', 2)] };
    expect(getPoolGroups({ ...base, dicePoolBonus: 2 }).pop()).toEqual({ name: 'Bonus', count: 2, faces: 10 });
    expect(getPoolGroups({ ...base, dicePoolBonus: -3 })).toEqual([{ name: 'a', count: 2, faces: 10 }]);
    expect(getPoolSize({ ...base, dicePoolBonus: -9 })).toBe(0);
  });

  it('caps the pool size', () => {
    expect(getPoolSize({ dicePoolComponents: [part('a', 40), part('b', 40)] })).toBe(MAX_POOL_DICE);
  });

  it('rolls two dice and keeps the lowest for an empty highest-die pool when asked', () => {
    expect(getRollPlan({ dicePoolRule: 'highest', dicePoolEmptyRoll: true, dicePoolComponents: [] })).toEqual({
      groups: [{ name: 'No dice', count: 2, faces: 10 }],
      keepLowest: true,
    });
    expect(getRollPlan({ dicePoolRule: 'successes', dicePoolEmptyRoll: true, dicePoolComponents: [] }).groups).toEqual([]);
  });
});

describe('dice pool outcomes', () => {
  const groups = [{ name: 'a', count: 3, faces: 10 }, { name: 'b', count: 2, faces: 10 }];

  it('counts successes against the target', () => {
    const outcome = evaluatePoolRoll({ dicePoolRule: 'successes', dicePoolTarget: 8 }, groups, [[8, 3, 10], [1, 9]]);
    expect(outcome).toMatchObject({ kind: 'success', successes: 3, summary: '3 successes' });
    expect(outcome.dice.map((die) => die.state)).toEqual(['hit', 'miss', 'hit', 'miss', 'hit']);
    expect(outcome.dice[3].group).toBe('b');
  });

  it('uses the singular for one success and reports a plain failure', () => {
    expect(evaluatePoolRoll({ dicePoolTarget: 8 }, groups, [[8, 2, 3], [4, 5]]).summary).toBe('1 success');
    expect(evaluatePoolRoll({ dicePoolTarget: 8 }, groups, [[7, 2, 3], [4, 1]])).toMatchObject({ kind: 'failure', summary: 'Failure', successes: 0 });
  });

  it('lets 1s cancel successes and reports a botch', () => {
    const cancelled = evaluatePoolRoll({ dicePoolTarget: 8, dicePoolOnesCancel: true }, groups, [[9, 9, 9], [1, 1]]);
    expect(cancelled).toMatchObject({ kind: 'success', successes: 1 });
    expect(cancelled.dice.filter((die) => die.state === 'cancel')).toHaveLength(2);
    expect(evaluatePoolRoll({ dicePoolTarget: 8, dicePoolOnesCancel: true }, groups, [[2, 3, 4], [1, 5]])).toMatchObject({ kind: 'botch', summary: 'Botch' });
    expect(evaluatePoolRoll({ dicePoolTarget: 8, dicePoolOnesCancel: true }, groups, [[9, 1, 1], [1, 1]])).toMatchObject({ kind: 'failure', successes: 0 });
  });

  it('picks the outcome tier of the highest die', () => {
    const rule = { dicePoolRule: 'highest' as const, dicePoolTiers: tiers };
    const six: [number[]] = [[2, 6, 3]];
    expect(evaluatePoolRoll(rule, [{ name: 'a', count: 3, faces: 6 }], six)).toMatchObject({ kind: 'success', summary: 'Full success' });
    expect(evaluatePoolRoll(rule, [{ name: 'a', count: 3, faces: 6 }], [[2, 5, 3]])).toMatchObject({ kind: 'partial', summary: 'Partial success' });
    expect(evaluatePoolRoll(rule, [{ name: 'a', count: 3, faces: 6 }], [[2, 1, 3]])).toMatchObject({ kind: 'failure', summary: 'Failure' });
  });

  it('marks a critical when two dice reach the top tier', () => {
    const rule = { dicePoolRule: 'highest' as const, dicePoolTiers: tiers, dicePoolCritical: true };
    const outcome = evaluatePoolRoll(rule, [{ name: 'a', count: 3, faces: 6 }], [[6, 6, 2]]);
    expect(outcome).toMatchObject({ kind: 'critical', summary: 'Full success (critical)' });
    expect(evaluatePoolRoll({ ...rule, dicePoolCritical: false }, [{ name: 'a', count: 3, faces: 6 }], [[6, 6, 2]]).kind).toBe('success');
  });

  it('keeps the lowest die when asked and marks the rest as dropped', () => {
    const outcome = evaluatePoolRoll({ dicePoolRule: 'highest', dicePoolTiers: tiers }, [{ name: 'No dice', count: 2, faces: 6 }], [[6, 3]], true);
    expect(outcome).toMatchObject({ kind: 'failure', summary: 'Failure' });
    expect(outcome.dice.map((die) => die.state)).toEqual(['dropped', 'best']);
  });
});

function characterWith(...widgets: Widget[]): Character {
  return { id: 'character', name: 'Test', activeSheetId: 'sheet', sheets: [{ id: 'sheet', name: 'Main', widgets }] };
}

const stat: Widget = { id: 'stat', type: 'NUMBER', x: 0, y: 0, data: { numberItems: [{ name: 'Strength', value: 4, valueLabel: 'strength' }] } };

function poolWidget(data: WidgetData): Widget {
  return { id: 'pool', type: 'DICE_POOL', x: 0, y: 0, data: { label: 'Pool', dicePoolComponents: [part('str', 3, { diceLabel: 'str_dice' })], ...data } };
}

describe('dice pool formulas', () => {
  it('exposes trait dice, the target and the pool size as labels', () => {
    const character = characterWith(poolWidget({ dicePoolTarget: 7, fieldLabels: { dicePoolTarget: 'target', dicePoolSize: 'pool_size' } }));
    expect(collectLabels(character)).toMatchObject({ str_dice: 3, target: 7, pool_size: 3 });
    expect(getAvailableLabels(character)).toEqual(expect.arrayContaining([{ label: 'str_dice', value: 3, widgetLabel: 'Pool', sheetName: 'Main' }]));
    expect(getDicePoolDerivedValue({}, 'dicePoolSize')).toBeUndefined();
  });

  it('resolves trait dice and target formulas to whole, bounded values', () => {
    const character = characterWith(stat, poolWidget({
      fieldFormulas: { dicePoolTarget: '@strength * 2 + 0.4' },
      dicePoolComponents: [part('str', 0, { diceFormula: '@strength + 1' }), part('neg', 2, { diceFormula: '0 - 5' })],
    }));
    const resolved = resolveCharacterFormulas(character)!;
    const data = resolved.sheets[0].widgets[1].data;
    expect(data.dicePoolComponents!.map((component) => component.dice)).toEqual([5, 0]);
    expect(data.dicePoolTarget).toBe(8);
    expect(resolveCharacterFormulas(resolved)).toBeNull();
  });

  it('registers trait formulas and the derived size in the dependency graph', () => {
    const character = characterWith(stat, poolWidget({
      fieldLabels: { dicePoolSize: 'pool_size' },
      dicePoolComponents: [part('str', 0, { diceLabel: 'str_dice', diceFormula: '@strength' })],
    }));
    expect(buildDependencyGraph(character)).toMatchObject({ str_dice: ['strength'], pool_size: ['str_dice'] });
  });
});
