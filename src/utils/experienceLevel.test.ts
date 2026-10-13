import { describe, expect, it } from 'vitest';
import type { ExperienceLevel } from '../types';
import {
  EXPERIENCE_PRESETS,
  applyExperienceChange,
  createExperienceLevels,
  createLinearExperienceLevels,
  getExperienceProgress,
  normalizeXp,
} from './experienceLevel';

const levels: ExperienceLevel[] = [
  { id: 'a', xp: 0, name: 'Novice' },
  { id: 'b', xp: 300 },
  { id: 'c', xp: 900, name: 'Adept' },
];

describe('experience levels', () => {
  it('normalizes XP to a whole, non-negative number', () => {
    expect(normalizeXp(12.6)).toBe(13);
    expect(normalizeXp(-4)).toBe(0);
    expect(normalizeXp(Number.NaN)).toBe(0);
    expect(normalizeXp(undefined)).toBe(0);
  });

  it('has no progress without levels', () => {
    expect(getExperienceProgress([], 100)).toBeNull();
    expect(getExperienceProgress(undefined, 100)).toBeNull();
  });

  it('reports the level, title and progress toward the next level', () => {
    expect(getExperienceProgress(levels, 0)).toMatchObject({ level: 1, name: 'Novice', nextXp: 300, xpToNext: 300, fraction: 0, isMaxLevel: false });
    expect(getExperienceProgress(levels, 150)).toMatchObject({ level: 1, xpToNext: 150, fraction: 0.5 });
    expect(getExperienceProgress(levels, 300)).toMatchObject({ level: 2, name: undefined, levelStartXp: 300, nextXp: 900, fraction: 0 });
    expect(getExperienceProgress(levels, 600)).toMatchObject({ level: 2, xpToNext: 300, fraction: 0.5 });
  });

  it('stops at the highest level', () => {
    expect(getExperienceProgress(levels, 5000)).toMatchObject({ level: 3, name: 'Adept', nextXp: null, xpToNext: 0, fraction: 1, isMaxLevel: true });
  });

  it('supports a first level other than 1', () => {
    expect(getExperienceProgress(levels, 300, 0)?.level).toBe(1);
    expect(getExperienceProgress(levels, 0, 0)?.level).toBe(0);
  });

  it('treats the first level as starting at 0 XP and requires earlier levels to be reached first', () => {
    expect(getExperienceProgress([{ id: 'a', xp: 50 }, { id: 'b', xp: 100 }], 10)).toMatchObject({ level: 1, levelStartXp: 0 });
    const unordered: ExperienceLevel[] = [{ id: 'a', xp: 0 }, { id: 'b', xp: 500 }, { id: 'c', xp: 200 }];
    expect(getExperienceProgress(unordered, 300)?.level).toBe(1);
    expect(getExperienceProgress(unordered, 500)?.level).toBe(3);
  });

  it('adds, removes and sets XP without going below zero', () => {
    expect(applyExperienceChange(100, 'add', 50)).toBe(150);
    expect(applyExperienceChange(100, 'remove', 30)).toBe(70);
    expect(applyExperienceChange(100, 'remove', 500)).toBe(0);
    expect(applyExperienceChange(100, 'set', 40)).toBe(40);
  });

  it('builds level tables from thresholds', () => {
    const created = createExperienceLevels([10, 300, 900]);
    expect(created.map((level) => level.xp)).toEqual([0, 300, 900]);
    expect(new Set(created.map((level) => level.id)).size).toBe(3);
    expect(createLinearExperienceLevels(4, 250).map((level) => level.xp)).toEqual([0, 250, 500, 750]);
    expect(createLinearExperienceLevels(0, 0)).toHaveLength(1);
  });

  it('ships ordered presets that start at 0 XP', () => {
    for (const preset of EXPERIENCE_PRESETS) {
      expect(preset.thresholds[0]).toBe(0);
      expect([...preset.thresholds].sort((a, b) => a - b)).toEqual(preset.thresholds);
    }
  });
});
