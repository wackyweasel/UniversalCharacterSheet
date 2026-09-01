import type { Widget } from '../types';

export const WIDGET_GRID_SIZE = 10;

export function snapWidgetCoordinate(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value / WIDGET_GRID_SIZE) * WIDGET_GRID_SIZE;
}

export function snapWidgetDimension(value: number | undefined, fallback?: number): number | undefined {
  const candidate = typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : fallback;
  if (candidate === undefined || !Number.isFinite(candidate) || candidate <= 0) return undefined;
  return Math.max(WIDGET_GRID_SIZE, snapWidgetCoordinate(candidate));
}

export function normalizeWidgetGeometry(widget: Widget): Widget {
  return {
    ...widget,
    x: snapWidgetCoordinate(widget.x),
    y: snapWidgetCoordinate(widget.y),
    ...(widget.w === undefined ? {} : { w: snapWidgetDimension(widget.w) }),
    ...(widget.h === undefined ? {} : { h: snapWidgetDimension(widget.h) }),
  };
}
