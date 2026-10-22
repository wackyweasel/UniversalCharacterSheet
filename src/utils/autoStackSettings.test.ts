import { describe, expect, it } from 'vitest';
import {
  AUTO_STACK_MAX_GAP,
  DEFAULT_AUTO_STACK_SETTINGS,
  findTouchingPairs,
  normalizeAutoStackSettings,
  normalizeWidgetAutoStack,
  resolveTargetAspect,
} from './autoStackSettings';

describe('normalizeAutoStackSettings', () => {
  it('falls back to defaults for garbage', () => {
    expect(normalizeAutoStackSettings(null)).toEqual(DEFAULT_AUTO_STACK_SETTINGS);
    expect(normalizeAutoStackSettings({ aspect: 'nope', strictness: 3, gap: 'x' })).toEqual(DEFAULT_AUTO_STACK_SETTINGS);
  });

  it('allows no gap and snaps the gap to the grid within limits', () => {
    expect(normalizeAutoStackSettings({ gap: 0 }).gap).toBe(0);
    expect(normalizeAutoStackSettings({ gap: 14 }).gap).toBe(10);
    expect(normalizeAutoStackSettings({ gap: 999 }).gap).toBe(AUTO_STACK_MAX_GAP);
    expect(normalizeAutoStackSettings({ gap: -20 }).gap).toBe(0);
  });

  it('keeps valid choices', () => {
    expect(normalizeAutoStackSettings({ aspect: 'a4-landscape', strictness: 'strict', autoAttach: true })).toMatchObject({
      aspect: 'a4-landscape',
      strictness: 'strict',
      autoAttach: true,
    });
  });
});

describe('resolveTargetAspect', () => {
  const base = DEFAULT_AUTO_STACK_SETTINGS;
  it('uses the screen aspect for the screen preset', () => {
    expect(resolveTargetAspect({ ...base, aspect: 'screen' }, 1.6)).toBe(1.6);
  });
  it('uses the preset ratio', () => {
    expect(resolveTargetAspect({ ...base, aspect: 'wide' }, 1)).toBeCloseTo(16 / 9);
    expect(resolveTargetAspect({ ...base, aspect: 'square' }, 2)).toBe(1);
  });
  it('uses the custom ratio', () => {
    expect(resolveTargetAspect({ ...base, aspect: 'custom', customWidth: 3, customHeight: 2 }, 1)).toBe(1.5);
  });
});

describe('normalizeWidgetAutoStack', () => {
  it('drops default values', () => {
    expect(normalizeWidgetAutoStack(undefined)).toBeUndefined();
    expect(normalizeWidgetAutoStack({ fixedSize: false, allowScroll: false })).toBeUndefined();
  });

  it('keeps meaningful options and validates them', () => {
    expect(normalizeWidgetAutoStack({ fixedSize: true, position: 'top-left', allowWhitespace: true })).toEqual({
      fixedSize: true,
      position: 'top-left',
      allowWhitespace: true,
    });
    expect(normalizeWidgetAutoStack({ position: 'somewhere' as never })).toBeUndefined();
    expect(normalizeWidgetAutoStack({ allowScroll: true, maxShrink: 5 })?.maxShrink).toBe(0.8);
    expect(normalizeWidgetAutoStack({ allowScroll: true })).toEqual({ allowScroll: true });
  });
});

describe('findTouchingPairs', () => {
  const box = (id: string, x: number, y: number, w: number, h: number) => ({ id, x, y, w, h });

  it('finds widgets sharing an edge', () => {
    const pairs = findTouchingPairs([box('a', 0, 0, 100, 100), box('b', 100, 0, 100, 100), box('c', 0, 100, 200, 50)]);
    expect(pairs).toHaveLength(3);
    expect(pairs).toEqual(expect.arrayContaining([['a', 'b'], ['a', 'c'], ['b', 'c']]));
  });

  it('ignores gaps, corners and tiny overlaps', () => {
    expect(findTouchingPairs([box('a', 0, 0, 100, 100), box('b', 110, 0, 100, 100)])).toEqual([]);
    expect(findTouchingPairs([box('a', 0, 0, 100, 100), box('b', 100, 100, 100, 100)])).toEqual([]);
    expect(findTouchingPairs([box('a', 0, 0, 100, 100), box('b', 100, 90, 100, 100)])).toEqual([]);
  });
});
