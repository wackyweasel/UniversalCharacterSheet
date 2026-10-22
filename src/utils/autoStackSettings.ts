import type { AutoStackPosition, WidgetAutoStackOptions } from '../types';
import { WIDGET_GRID_SIZE } from './widgetGeometry';

export type AutoStackAspectId = 'screen' | 'wide' | 'landscape' | 'square' | 'portrait' | 'tall' | 'a4-portrait' | 'a4-landscape' | 'custom';
export type AutoStackStrictness = 'flexible' | 'balanced' | 'strict';

export interface AutoStackSettings {
  aspect: AutoStackAspectId;
  customWidth: number;
  customHeight: number;
  strictness: AutoStackStrictness;
  // Space between widgets in pixels; a multiple of the widget grid.
  gap: number;
  // Attach widgets that end up touching each other.
  autoAttach: boolean;
}

export const AUTO_STACK_MAX_GAP = 60;
export const AUTO_STACK_MIN_SHRINK = 0.1;
export const AUTO_STACK_MAX_SHRINK = 0.8;
export const AUTO_STACK_DEFAULT_SHRINK = 0.4;

export const DEFAULT_AUTO_STACK_SETTINGS: AutoStackSettings = {
  aspect: 'screen',
  customWidth: 3,
  customHeight: 2,
  strictness: 'balanced',
  gap: WIDGET_GRID_SIZE,
  autoAttach: false,
};

export const AUTO_STACK_ASPECTS: { id: AutoStackAspectId; label: string; ratio?: number }[] = [
  { id: 'screen', label: 'Screen' },
  { id: 'wide', label: '16:9', ratio: 16 / 9 },
  { id: 'landscape', label: '4:3', ratio: 4 / 3 },
  { id: 'square', label: '1:1', ratio: 1 },
  { id: 'portrait', label: '3:4', ratio: 3 / 4 },
  { id: 'tall', label: '9:16', ratio: 9 / 16 },
  { id: 'a4-portrait', label: 'A4 portrait', ratio: 210 / 297 },
  { id: 'a4-landscape', label: 'A4 landscape', ratio: 297 / 210 },
  { id: 'custom', label: 'Custom' },
];

export const AUTO_STACK_STRICTNESS_WEIGHTS: Record<AutoStackStrictness, number> = {
  flexible: 0.25,
  balanced: 1,
  strict: 4,
};

export const AUTO_STACK_POSITIONS: { id: AutoStackPosition; label: string; x: number; y: number }[] = [
  { id: 'top-left', label: 'Top left', x: 0, y: 0 },
  { id: 'top', label: 'Top', x: 0.5, y: 0 },
  { id: 'top-right', label: 'Top right', x: 1, y: 0 },
  { id: 'left', label: 'Left', x: 0, y: 0.5 },
  { id: 'center', label: 'Center', x: 0.5, y: 0.5 },
  { id: 'right', label: 'Right', x: 1, y: 0.5 },
  { id: 'bottom-left', label: 'Bottom left', x: 0, y: 1 },
  { id: 'bottom', label: 'Bottom', x: 0.5, y: 1 },
  { id: 'bottom-right', label: 'Bottom right', x: 1, y: 1 },
];

export const getPositionAnchor = (position: AutoStackPosition | undefined) => (
  position ? AUTO_STACK_POSITIONS.find((candidate) => candidate.id === position) : undefined
);

const SETTINGS_STORAGE_KEY = 'ucs:autoStackSettings';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function normalizeAutoStackSettings(raw: unknown): AutoStackSettings {
  const defaults = DEFAULT_AUTO_STACK_SETTINGS;
  if (!isRecord(raw)) return { ...defaults };
  const aspect = AUTO_STACK_ASPECTS.some((candidate) => candidate.id === raw.aspect)
    ? raw.aspect as AutoStackAspectId
    : defaults.aspect;
  const strictness = raw.strictness === 'flexible' || raw.strictness === 'balanced' || raw.strictness === 'strict'
    ? raw.strictness
    : defaults.strictness;
  const dimension = (value: unknown, fallback: number) => (
    typeof value === 'number' && Number.isFinite(value) ? clamp(value, 0.1, 100) : fallback
  );
  const gap = typeof raw.gap === 'number' && Number.isFinite(raw.gap)
    ? clamp(Math.round(raw.gap / WIDGET_GRID_SIZE) * WIDGET_GRID_SIZE, 0, AUTO_STACK_MAX_GAP)
    : defaults.gap;
  return {
    aspect,
    customWidth: dimension(raw.customWidth, defaults.customWidth),
    customHeight: dimension(raw.customHeight, defaults.customHeight),
    strictness,
    gap,
    autoAttach: raw.autoAttach === true,
  };
}

export function loadAutoStackSettings(): AutoStackSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return normalizeAutoStackSettings(stored ? JSON.parse(stored) : null);
  } catch {
    return { ...DEFAULT_AUTO_STACK_SETTINGS };
  }
}

export function saveAutoStackSettings(settings: AutoStackSettings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable; the choices simply are not remembered.
  }
}

// Width / height the layout should aim for. `screenAspect` is used by the "Screen" preset.
export function resolveTargetAspect(settings: AutoStackSettings, screenAspect: number): number {
  if (settings.aspect === 'screen') return clamp(screenAspect, 0.5, 3);
  if (settings.aspect === 'custom') return clamp(settings.customWidth / settings.customHeight, 0.2, 5);
  return AUTO_STACK_ASPECTS.find((candidate) => candidate.id === settings.aspect)?.ratio ?? 1;
}

// Drops options that equal the defaults; returns undefined when nothing is customised.
export function normalizeWidgetAutoStack(options: WidgetAutoStackOptions | undefined): WidgetAutoStackOptions | undefined {
  if (!options) return undefined;
  const normalized: WidgetAutoStackOptions = {};
  if (options.fixedSize) normalized.fixedSize = true;
  if (getPositionAnchor(options.position)) normalized.position = options.position;
  if (options.allowScroll) {
    normalized.allowScroll = true;
    const shrink = typeof options.maxShrink === 'number' && Number.isFinite(options.maxShrink)
      ? clamp(options.maxShrink, AUTO_STACK_MIN_SHRINK, AUTO_STACK_MAX_SHRINK)
      : AUTO_STACK_DEFAULT_SHRINK;
    if (Math.abs(shrink - AUTO_STACK_DEFAULT_SHRINK) > 1e-6) normalized.maxShrink = shrink;
  }
  if (options.allowWhitespace) normalized.allowWhitespace = true;
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export interface AutoStackBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// Pairs of boxes that share part of an edge (within `tolerance`) for at least `minOverlap`.
export function findTouchingPairs(boxes: AutoStackBox[], tolerance = 0, minOverlap = 2 * WIDGET_GRID_SIZE): [string, string][] {
  const pairs: [string, string][] = [];
  const overlap = (startA: number, endA: number, startB: number, endB: number) => Math.min(endA, endB) - Math.max(startA, startB);
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const sideBySide = Math.abs(a.x + a.w - b.x) <= tolerance || Math.abs(b.x + b.w - a.x) <= tolerance;
      const stacked = Math.abs(a.y + a.h - b.y) <= tolerance || Math.abs(b.y + b.h - a.y) <= tolerance;
      const touchesVertically = sideBySide && overlap(a.y, a.y + a.h, b.y, b.y + b.h) >= minOverlap;
      const touchesHorizontally = stacked && overlap(a.x, a.x + a.w, b.x, b.x + b.w) >= minOverlap;
      if (touchesVertically || touchesHorizontally) pairs.push([a.id, b.id]);
    }
  }
  return pairs;
}
