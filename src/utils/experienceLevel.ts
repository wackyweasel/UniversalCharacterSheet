import { v4 as uuidv4 } from 'uuid';
import type { ExperienceLevel, WidgetData } from '../types';

export const DEFAULT_FIRST_LEVEL = 1;

export function normalizeXp(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

export function normalizeFirstLevel(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : DEFAULT_FIRST_LEVEL;
}

export interface ExperienceProgress {
  /** Position of the current level in the level list. */
  index: number;
  /** Level number shown to the player (list position plus the first level). */
  level: number;
  name?: string;
  xp: number;
  levelStartXp: number;
  /** XP needed for the next level, or null at the highest level. */
  nextXp: number | null;
  xpToNext: number;
  /** Share of the current level that is complete, from 0 to 1. */
  fraction: number;
  isMaxLevel: boolean;
}

/** The first level always starts at 0 XP. A level is reached only when every earlier level has been. */
export function getExperienceProgress(
  levels: ExperienceLevel[] | undefined,
  xpValue: unknown,
  firstLevel: unknown = DEFAULT_FIRST_LEVEL,
): ExperienceProgress | null {
  if (!levels || levels.length === 0) return null;
  const xp = normalizeXp(xpValue);
  let index = 0;
  while (index + 1 < levels.length && xp >= normalizeXp(levels[index + 1].xp)) index++;

  const isMaxLevel = index === levels.length - 1;
  const levelStartXp = index === 0 ? 0 : normalizeXp(levels[index].xp);
  const nextXp = isMaxLevel ? null : normalizeXp(levels[index + 1].xp);
  const span = nextXp === null ? 0 : nextXp - levelStartXp;
  return {
    index,
    level: normalizeFirstLevel(firstLevel) + index,
    name: levels[index].name?.trim() || undefined,
    xp,
    levelStartXp,
    nextXp,
    xpToNext: nextXp === null ? 0 : Math.max(0, nextXp - xp),
    fraction: nextXp === null || span <= 0 ? 1 : Math.max(0, Math.min(1, (xp - levelStartXp) / span)),
    isMaxLevel,
  };
}

/** Value of the formula-visible fields that are derived from the XP total. */
export function getExperienceDerivedValue(data: WidgetData, field: 'xpLevel' | 'xpToNext'): number | undefined {
  const progress = getExperienceProgress(data.xpLevels, data.currentValue, data.xpFirstLevel);
  if (!progress) return undefined;
  return field === 'xpLevel' ? progress.level : progress.xpToNext;
}

export type ExperienceChangeMode = 'add' | 'remove' | 'set';

export function applyExperienceChange(current: number, mode: ExperienceChangeMode, amount: number): number {
  const value = normalizeXp(amount);
  if (mode === 'set') return value;
  return normalizeXp(mode === 'add' ? current + value : current - value);
}

export function createExperienceLevels(thresholds: number[]): ExperienceLevel[] {
  return thresholds.map((xp, index) => ({ id: uuidv4(), xp: index === 0 ? 0 : xp }));
}

export function createLinearExperienceLevels(levelCount: number, xpPerLevel: number): ExperienceLevel[] {
  const count = Math.max(1, Math.min(100, Math.floor(levelCount)));
  const step = Math.max(1, Math.round(xpPerLevel));
  return createExperienceLevels(Array.from({ length: count }, (_, index) => index * step));
}

export const EXPERIENCE_PRESETS: { id: string; name: string; thresholds: number[]; firstLevel?: number }[] = [
  {
    id: 'dnd5e',
    name: 'D&D 5e',
    thresholds: [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000],
  },
  {
    id: 'dnd4e',
    name: 'D&D 4e',
    thresholds: [0, 1000, 2250, 3750, 5500, 7500, 10000, 13000, 16500, 20500, 26000, 32000, 39000, 47000, 57000, 69000, 83000, 99000, 119000, 143000, 175000, 210000, 255000, 310000, 375000, 450000, 550000, 675000, 825000, 1000000],
  },
  {
    id: 'dnd35',
    name: 'D&D 3.5e',
    thresholds: Array.from({ length: 20 }, (_, index) => (index * (index + 1) * 1000) / 2),
  },
  {
    id: 'pf1e',
    name: 'Pathfinder 1e (medium track)',
    thresholds: [0, 2000, 5000, 9000, 15000, 23000, 35000, 51000, 75000, 105000, 155000, 220000, 315000, 445000, 635000, 890000, 1300000, 1800000, 2550000, 3600000],
  },
  {
    id: 'pf2e',
    name: 'Pathfinder 2e (1,000 XP per level)',
    thresholds: Array.from({ length: 20 }, (_, index) => index * 1000),
  },
  {
    id: 'starfinder',
    name: 'Starfinder 1e',
    thresholds: [0, 1300, 3300, 6000, 10000, 15000, 23000, 34000, 50000, 71000, 105000, 145000, 210000, 295000, 425000, 600000, 850000, 1200000, 1700000, 2400000],
  },
  {
    id: 'dcc',
    name: 'Dungeon Crawl Classics (starts at level 0)',
    thresholds: [0, 10, 50, 110, 190, 290, 410, 550, 710, 890, 1090],
    firstLevel: 0,
  },
  {
    id: 'shadowdark',
    name: 'Shadowdark (cumulative XP)',
    thresholds: Array.from({ length: 10 }, (_, index) => (index * (index + 1) * 10) / 2),
  },
];

export function formatXp(value: number): string {
  return value.toLocaleString('en-US');
}
