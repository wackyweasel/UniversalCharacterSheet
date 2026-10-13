import type { TrackThreshold, WidgetData } from '../types';

export type TrackStyle = 'steps' | 'bar';
export type TrackThresholdMode = 'rising' | 'falling';

export const DEFAULT_TRACK_MAX = 10;
/** Tracks longer than this are drawn as a continuous bar, even when the cell style is chosen. */
export const MAX_TRACK_STEPS = 30;

function toInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback;
}

export function getTrackBounds(data: Pick<WidgetData, 'minValue' | 'maxValue'>): { min: number; max: number } {
  const min = toInteger(data.minValue, 0);
  const max = Math.max(min + 1, toInteger(data.maxValue, DEFAULT_TRACK_MAX));
  return { min, max };
}

export function clampTrackValue(value: unknown, min: number, max: number): number {
  return Math.min(max, Math.max(min, toInteger(value, min)));
}

export function getTrackValue(data: Pick<WidgetData, 'minValue' | 'maxValue' | 'currentValue'>): number {
  const { min, max } = getTrackBounds(data);
  return clampTrackValue(data.currentValue, min, max);
}

export function getTrackStyle(data: Pick<WidgetData, 'trackStyle' | 'minValue' | 'maxValue'>): TrackStyle {
  const { min, max } = getTrackBounds(data);
  return data.trackStyle === 'bar' || max - min > MAX_TRACK_STEPS ? 'bar' : 'steps';
}

function isReached(threshold: number, value: number, mode: TrackThresholdMode): boolean {
  return mode === 'falling' ? value <= threshold : value >= threshold;
}

/** Orders thresholds from the mildest to the most severe zone. */
export function sortTrackThresholds(thresholds: TrackThreshold[] | undefined, mode: TrackThresholdMode = 'rising'): TrackThreshold[] {
  return (thresholds ?? [])
    .filter((threshold) => Number.isFinite(threshold.value))
    .map((threshold, index) => ({ threshold, index }))
    .sort((a, b) => (mode === 'falling' ? b.threshold.value - a.threshold.value : a.threshold.value - b.threshold.value) || a.index - b.index)
    .map(({ threshold }) => threshold);
}

export interface TrackZone {
  /** Number of thresholds reached (0 when the value is still before the first zone). */
  level: number;
  threshold?: TrackThreshold;
}

export function getTrackZone(thresholds: TrackThreshold[] | undefined, value: number, mode: TrackThresholdMode = 'rising'): TrackZone {
  const sorted = sortTrackThresholds(thresholds, mode);
  let level = 0;
  while (level < sorted.length && isReached(sorted[level].value, value, mode)) level++;
  return { level, threshold: level > 0 ? sorted[level - 1] : undefined };
}

export function getTrackModifier(zone: TrackZone): number {
  const modifier = zone.threshold?.modifier;
  return typeof modifier === 'number' && Number.isFinite(modifier) ? modifier : 0;
}

export interface TrackSegment extends TrackZone {
  /** Start and end measured in whole track steps from the minimum. */
  start: number;
  end: number;
}

/** Splits the track into consecutive stretches that share the same zone. Step `n` covers the value `min + n + 1`. */
export function getTrackSegments(
  thresholds: TrackThreshold[] | undefined,
  min: number,
  max: number,
  mode: TrackThresholdMode = 'rising',
): TrackSegment[] {
  const range = max - min;
  const sorted = sortTrackThresholds(thresholds, mode);
  const breaks = new Set<number>([0, range]);
  for (const threshold of sorted) {
    const point = mode === 'falling' ? threshold.value - min : threshold.value - min - 1;
    if (point > 0 && point < range) breaks.add(point);
  }
  const points = [...breaks].sort((a, b) => a - b);
  return points.slice(0, -1).map((start, index) => ({
    start,
    end: points[index + 1],
    ...getTrackZone(sorted, min + start + 1, mode),
  }));
}

/** Value of the formula-visible fields that are derived from the active zone. */
export function getTrackDerivedValue(data: WidgetData, field: 'trackZone' | 'trackModifier'): number | undefined {
  if (!data.trackThresholds) return undefined;
  const zone = getTrackZone(data.trackThresholds, getTrackValue(data), data.trackThresholdMode ?? 'rising');
  return field === 'trackZone' ? zone.level : getTrackModifier(zone);
}

export function formatTrackModifier(modifier: number): string {
  return modifier > 0 ? `+${modifier}` : String(modifier);
}
