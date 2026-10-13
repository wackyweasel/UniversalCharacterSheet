import { v4 as uuidv4 } from 'uuid';
import type { DicePoolTier, WidgetData } from '../types';

export const MAX_POOL_DICE = 50;
export const MAX_POOL_BONUS = 20;
export const DEFAULT_POOL_FACES = 10;
export const DEFAULT_POOL_TARGET = 8;
export const MIN_POOL_FACES = 2;
export const MAX_POOL_FACES = 100;

export type DicePoolRule = 'successes' | 'highest';

export function normalizeDiceCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(MAX_POOL_DICE, Math.max(0, Math.round(value))) : 0;
}

export function normalizePoolFaces(value: unknown, fallback = DEFAULT_POOL_FACES): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(MAX_POOL_FACES, Math.max(MIN_POOL_FACES, Math.round(value)))
    : fallback;
}

export function normalizePoolBonus(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(MAX_POOL_BONUS, Math.max(-MAX_POOL_BONUS, Math.round(value)))
    : 0;
}

export function normalizePoolTarget(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(1, Math.round(value)) : DEFAULT_POOL_TARGET;
}

export function createDefaultPoolTiers(): DicePoolTier[] {
  return [
    { id: uuidv4(), min: 6, label: 'Full success' },
    { id: uuidv4(), min: 4, label: 'Partial success' },
    { id: uuidv4(), min: 1, label: 'Failure' },
  ];
}

export interface PoolGroup {
  name: string;
  count: number;
  faces: number;
}

type PoolData = Pick<WidgetData, 'dicePoolComponents' | 'dicePoolFaces' | 'dicePoolBonus' | 'dicePoolRule' | 'dicePoolEmptyRoll'>;

/** The dice that make up the pool right now: active traits, then the bonus dice (or dice removed from the end). */
export function getPoolGroups(data: PoolData): PoolGroup[] {
  const faces = normalizePoolFaces(data.dicePoolFaces);
  let groups: PoolGroup[] = (data.dicePoolComponents ?? [])
    .filter((component) => component.active)
    .map((component) => ({
      name: component.name?.trim() || 'Dice',
      count: normalizeDiceCount(component.dice),
      faces: normalizePoolFaces(component.faces, faces),
    }));

  const bonus = normalizePoolBonus(data.dicePoolBonus);
  if (bonus > 0) {
    groups.push({ name: 'Bonus', count: bonus, faces });
  } else if (bonus < 0) {
    let remaining = -bonus;
    groups = [...groups].reverse().map((group) => {
      const removed = Math.min(group.count, remaining);
      remaining -= removed;
      return { ...group, count: group.count - removed };
    }).reverse();
  }

  let room = MAX_POOL_DICE;
  return groups
    .filter((group) => group.count > 0)
    .map((group) => {
      const count = Math.min(group.count, room);
      room -= count;
      return { ...group, count };
    })
    .filter((group) => group.count > 0);
}

export function getPoolSize(data: PoolData): number {
  return getPoolGroups(data).reduce((sum, group) => sum + group.count, 0);
}

/** What will actually be rolled; an empty pool can fall back to two dice where the highest-die rule asks for it. */
export function getRollPlan(data: PoolData): { groups: PoolGroup[]; keepLowest: boolean } {
  const groups = getPoolGroups(data);
  if (groups.length === 0 && data.dicePoolRule === 'highest' && data.dicePoolEmptyRoll) {
    return { groups: [{ name: 'No dice', count: 2, faces: normalizePoolFaces(data.dicePoolFaces) }], keepLowest: true };
  }
  return { groups, keepLowest: false };
}

export function describePoolGroups(groups: PoolGroup[]): string {
  const total = groups.reduce((sum, group) => sum + group.count, 0);
  const faces = [...new Set(groups.map((group) => group.faces))];
  const size = faces.length === 1 ? `${total}d${faces[0]}` : `${total} dice`;
  return `${groups.map((group) => `${group.name} ${group.count}`).join(' + ')} (${size})`;
}

export type PoolDieState = 'hit' | 'miss' | 'cancel' | 'best' | 'dropped';
export type PoolOutcomeKind = 'critical' | 'success' | 'partial' | 'failure' | 'botch';

export interface PoolDie {
  value: number;
  faces: number;
  group: string;
  state: PoolDieState;
}

export interface PoolOutcome {
  dice: PoolDie[];
  kind: PoolOutcomeKind;
  summary: string;
  successes?: number;
}

export function evaluatePoolRoll(
  data: Pick<WidgetData, 'dicePoolRule' | 'dicePoolTarget' | 'dicePoolOnesCancel' | 'dicePoolTiers' | 'dicePoolCritical'>,
  groups: PoolGroup[],
  rolls: number[][],
  keepLowest = false,
): PoolOutcome {
  const flat = groups.flatMap((group, groupIndex) => (rolls[groupIndex] ?? []).map((value) => ({ value, faces: group.faces, group: group.name })));

  if (data.dicePoolRule === 'highest') {
    const tiers = [...(data.dicePoolTiers ?? [])].sort((a, b) => b.min - a.min);
    const values = flat.map((die) => die.value);
    const best = values.length === 0 ? 0 : keepLowest ? Math.min(...values) : Math.max(...values);
    const dice = flat.map((die): PoolDie => ({
      ...die,
      state: die.value === best ? 'best' : keepLowest ? 'dropped' : 'miss',
    }));
    const tierIndex = tiers.findIndex((tier) => best >= tier.min);
    const tier = tierIndex >= 0 ? tiers[tierIndex] : undefined;
    const topCount = tiers.length > 0 ? values.filter((value) => value >= tiers[0].min).length : 0;
    if (!keepLowest && data.dicePoolCritical && tierIndex === 0 && topCount >= 2) {
      return { dice, kind: 'critical', summary: `${tier?.label || 'Success'} (critical)` };
    }
    const kind: PoolOutcomeKind = !tier || tierIndex === tiers.length - 1 ? 'failure' : tierIndex === 0 ? 'success' : 'partial';
    return { dice, kind, summary: tier?.label || 'No result' };
  }

  const target = normalizePoolTarget(data.dicePoolTarget);
  const cancels = data.dicePoolOnesCancel === true;
  const dice = flat.map((die): PoolDie => ({
    ...die,
    state: die.value >= target ? 'hit' : cancels && die.value === 1 ? 'cancel' : 'miss',
  }));
  const hits = dice.filter((die) => die.state === 'hit').length;
  const ones = cancels ? flat.filter((die) => die.value === 1).length : 0;
  const successes = Math.max(0, hits - ones);
  if (cancels && hits === 0 && ones > 0) return { dice, kind: 'botch', summary: 'Botch', successes: 0 };
  if (successes === 0) return { dice, kind: 'failure', summary: 'Failure', successes };
  return { dice, kind: 'success', summary: `${successes} ${successes === 1 ? 'success' : 'successes'}`, successes };
}

export function formatPoolDice(outcome: PoolOutcome): string {
  return `[${outcome.dice.map((die) => die.value).join(', ')}]`;
}

/** Value of the formula-visible field that is derived from the pool. */
export function getDicePoolDerivedValue(data: WidgetData, field: 'dicePoolSize'): number | undefined {
  if (!data.dicePoolComponents || field !== 'dicePoolSize') return undefined;
  return getPoolSize(data);
}
