import type { Widget, WidgetType } from '../types';

export const WIDGET_GRID_SIZE = 10;

// Minimum dimensions per widget type
const MIN_WIDGET_DIMENSIONS: Record<WidgetType, { width: number; height: number }> = {
  'NUMBER': { width: 60, height: 30 },
  'NUMBER_DISPLAY': { width: 50, height: 40 },
  'LABEL': { width: 50, height: 20 },
  'LIST': { width: 60, height: 40 },
  'TEXT': { width: 50, height: 30 },
  'CHECKBOX': { width: 60, height: 30 },
  'HEALTH_BAR': { width: 80, height: 40 },
  'DICE_ROLLER': { width: 80, height: 60 },
  'DICE_TRAY': { width: 70, height: 60 },
  'SPELL_SLOT': { width: 80, height: 40 },
  'IMAGE': { width: 40, height: 40 },
  'POOL': { width: 60, height: 40 },
  'TOGGLE': { width: 60, height: 30 },
  'TOGGLE_GROUP': { width: 60, height: 30 },
  'TABLE': { width: 80, height: 40 },
  'TIME_TRACKER': { width: 90, height: 70 },
  'FORM': { width: 80, height: 30 },
  'MIXED_FIELDS': { width: 140, height: 30 },
  'REST_BUTTON': { width: 60, height: 40 },
  'PROGRESS_BAR': { width: 50, height: 20 },
  'PROGRESS_CLOCK': { width: 80, height: 80 },
  'MAP_SKETCHER': { width: 100, height: 100 },
  'GRID_MAP': { width: 260, height: 240 },
  'ROLL_TABLE': { width: 70, height: 30 },
  'INITIATIVE_TRACKER': { width: 90, height: 60 },
  'INVENTORY': { width: 150, height: 80 },
  'DECK': { width: 70, height: 40 },
  'DECK_OF_CARDS': { width: 100, height: 120 },
  'TIMER': { width: 80, height: 60 },
  'STEP_DICE': { width: 70, height: 40 },
  'WALLET': { width: 120, height: 60 },
  'THRESHOLD_TRACK': { width: 120, height: 56 },
  'XP_LEVEL': { width: 140, height: 60 },
  'SKILL_TREE': { width: 120, height: 80 },
  'DICE_POOL': { width: 130, height: 70 },
  'CALENDAR': { width: 180, height: 140 },
};

export function getMinWidgetDimensions(type: WidgetType): { width: number; height: number } {
  return MIN_WIDGET_DIMENSIONS[type] || { width: 120, height: 60 };
}

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
