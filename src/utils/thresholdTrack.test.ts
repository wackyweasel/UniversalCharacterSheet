import { describe, expect, it } from 'vitest';
import type { TrackThreshold } from '../types';
import {
  clampTrackValue,
  formatTrackModifier,
  getTrackBounds,
  getTrackModifier,
  getTrackSegments,
  getTrackStyle,
  getTrackZone,
  sortTrackThresholds,
} from './thresholdTrack';

const zone = (name: string, value: number, modifier?: number): TrackThreshold => ({ id: name, name, value, modifier });
const zones = [zone('Strained', 6, -1), zone('Uneasy', 3), zone('Critical', 9, -2)];

describe('threshold track', () => {
  it('keeps the bounds whole and at least one step apart', () => {
    expect(getTrackBounds({})).toEqual({ min: 0, max: 10 });
    expect(getTrackBounds({ minValue: 4.4, maxValue: 4 })).toEqual({ min: 4, max: 5 });
    expect(getTrackBounds({ minValue: -3, maxValue: 3 })).toEqual({ min: -3, max: 3 });
  });

  it('rounds and clamps values', () => {
    expect(clampTrackValue(4.6, 0, 10)).toBe(5);
    expect(clampTrackValue(99, 0, 10)).toBe(10);
    expect(clampTrackValue(-5, 0, 10)).toBe(0);
    expect(clampTrackValue(undefined, 2, 10)).toBe(2);
  });

  it('uses bars for tracks that are too long for cells', () => {
    expect(getTrackStyle({ maxValue: 10 })).toBe('steps');
    expect(getTrackStyle({ maxValue: 10, trackStyle: 'bar' })).toBe('bar');
    expect(getTrackStyle({ minValue: 0, maxValue: 100 })).toBe('bar');
  });

  it('orders thresholds from the mildest zone to the most severe', () => {
    expect(sortTrackThresholds(zones).map((item) => item.name)).toEqual(['Uneasy', 'Strained', 'Critical']);
    expect(sortTrackThresholds(zones, 'falling').map((item) => item.name)).toEqual(['Critical', 'Strained', 'Uneasy']);
  });

  it('finds the active zone when the value rises to a threshold', () => {
    expect(getTrackZone(zones, 2)).toEqual({ level: 0, threshold: undefined });
    expect(getTrackZone(zones, 3).threshold?.name).toBe('Uneasy');
    expect(getTrackZone(zones, 8).threshold?.name).toBe('Strained');
    expect(getTrackZone(zones, 10)).toMatchObject({ level: 3 });
    expect(getTrackModifier(getTrackZone(zones, 6))).toBe(-1);
    expect(getTrackModifier(getTrackZone(zones, 1))).toBe(0);
  });

  it('finds the active zone when the value drops to a threshold', () => {
    const sanity = [zone('Shaken', 7), zone('Broken', 3, -2)];
    expect(getTrackZone(sanity, 10, 'falling').level).toBe(0);
    expect(getTrackZone(sanity, 7, 'falling').threshold?.name).toBe('Shaken');
    expect(getTrackZone(sanity, 3, 'falling').threshold?.name).toBe('Broken');
    expect(getTrackZone(sanity, 0, 'falling').level).toBe(2);
  });

  it('ignores thresholds without a usable value', () => {
    expect(getTrackZone([zone('Broken', Number.NaN)], 5).level).toBe(0);
  });

  it('splits a rising track into zones that start on the threshold step', () => {
    const segments = getTrackSegments(zones, 0, 10);
    expect(segments.map((segment) => [segment.threshold?.name, segment.start, segment.end])).toEqual([
      [undefined, 0, 2],
      ['Uneasy', 2, 5],
      ['Strained', 5, 8],
      ['Critical', 8, 10],
    ]);
    // The cell for the value 3 (index 2) belongs to the zone that starts at 3.
    expect(getTrackZone(zones, 0 + 2 + 1).threshold?.name).toBe('Uneasy');
  });

  it('splits a falling track into zones that end on the threshold step', () => {
    const sanity = [zone('Shaken', 7), zone('Broken', 3, -2)];
    const segments = getTrackSegments(sanity, 0, 10, 'falling');
    expect(segments.map((segment) => [segment.threshold?.name, segment.start, segment.end])).toEqual([
      ['Broken', 0, 3],
      ['Shaken', 3, 7],
      [undefined, 7, 10],
    ]);
  });

  it('covers the whole track even without zones or when thresholds are out of range', () => {
    expect(getTrackSegments([], 0, 10)).toEqual([{ level: 0, threshold: undefined, start: 0, end: 10 }]);
    const outside = getTrackSegments([zone('Far', 50)], 0, 10);
    expect(outside).toHaveLength(1);
    expect(outside[0]).toMatchObject({ start: 0, end: 10, level: 0 });
  });

  it('formats modifiers with an explicit sign', () => {
    expect(formatTrackModifier(2)).toBe('+2');
    expect(formatTrackModifier(-1)).toBe('-1');
  });
});
