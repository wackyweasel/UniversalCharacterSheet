import { describe, expect, it } from 'vitest';
import { advanceClock, getClockDragValue, getClockSegments, getClockValue, getClockSeparatorPath } from './progressClock';

describe('progress clocks', () => {
  it('draws one full-radius separator per boundary, without doubled shared edges', () => {
    for (const segments of [2, 3, 4, 5, 6, 8, 12, 101]) {
      const path = getClockSeparatorPath(segments)!;
      const lines = [...path.matchAll(/M 50 50 L ([\d.-]+) ([\d.-]+)/g)];
      expect(lines).toHaveLength(segments);
      for (const line of lines) {
        expect(Math.hypot(Number(line[1]) - 50, Number(line[2]) - 50)).toBeCloseTo(50, 5);
      }
      expect(new Set(lines.map((line) => line[0])).size).toBe(segments);
      expect(lines[0][0]).toBe('M 50 50 L 50.000000 0.000000');
    }
  });

  it('omits single-segment boundaries and bounds rendering for fully overlapping separators', () => {
    expect(getClockSeparatorPath(1)).toBe('');
    expect(getClockSeparatorPath(376)).not.toBeNull();
    expect(getClockSeparatorPath(377)).toBeNull();
    expect(getClockSeparatorPath(10000)).toBeNull();
    expect(getClockSeparatorPath(Number.MAX_SAFE_INTEGER)).toBeNull();
  });

  it('accepts arbitrary positive whole segment counts, including one', () => {
    for (const segments of [1, 2, 5, 7, 12, 101, 10000]) {
      expect(getClockSegments(segments)).toBe(segments);
    }
  });

  it('normalizes invalid counts and clamps values after reducing segments', () => {
    for (const segments of [0, -5, NaN, Infinity]) expect(getClockSegments(segments)).toBe(1);
    expect(getClockSegments(7.9)).toBe(7);
    expect(getClockValue(8, 3)).toBe(3);
    expect(getClockValue(-1, 3)).toBe(0);
    expect(getClockValue(NaN, 3)).toBe(0);
  });

  it('cycles through every state including empty and full', () => {
    let value = 0;
    const values = Array.from({ length: 5 }, () => {
      value = advanceClock(value, 1, 4);
      return value;
    });
    expect(values).toEqual([1, 2, 3, 4, 0]);
    expect(advanceClock(0, 1, 1)).toBe(1);
    expect(advanceClock(1, 1, 1)).toBe(0);
  });

  it('wraps in both directions, including multi-cycle drags', () => {
    expect(advanceClock(0, -1, 6)).toBe(6);
    expect(advanceClock(6, 1, 6)).toBe(0);
    expect(advanceClock(3, 16, 6)).toBe(5);
    expect(advanceClock(3, -16, 6)).toBe(1);
  });

  it('increases right/up and decreases left/down on the dominant axis', () => {
    expect(getClockDragValue(2, 8, 30, 3, 120)).toBe(4);
    expect(getClockDragValue(2, 8, 3, -30, 120)).toBe(4);
    expect(getClockDragValue(2, 8, -30, 3, 120)).toBe(0);
    expect(getClockDragValue(2, 8, 3, 30, 120)).toBe(0);
    expect(getClockDragValue(2, 8, 2, 2, 120)).toBe(2);
  });
});