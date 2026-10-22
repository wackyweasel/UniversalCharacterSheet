import type { Widget, WidgetAutoStackOptions, WidgetType } from '../types';
import {
  computeAutoStackLayout,
  type AutoStackItem,
  type AutoStackRect,
  type AutoStackResult,
  type AutoStackShape,
} from './autoStackLayout';
import {
  AUTO_STACK_DEFAULT_SHRINK,
  getPositionAnchor,
  normalizeWidgetAutoStack,
  resolveAutoStackWeights,
  resolveTargetAspect,
  type AutoStackSettings,
} from './autoStackSettings';
import { WIDGET_GRID_SIZE } from './widgetGeometry';

const GRID = WIDGET_GRID_SIZE;

// Content that fills whatever box it gets; scaled proportionally instead of measured.
export const FILL_TYPES = new Set<WidgetType>(['IMAGE', 'MAP_SKETCHER', 'GRID_MAP', 'DECK_OF_CARDS', 'PROGRESS_CLOCK']);
// Content that reflows and benefits from extra height.
export const FLOWING_TYPES = new Set<WidgetType>(['TEXT', 'LIST', 'INVENTORY', 'TABLE', 'ROLL_TABLE', 'INITIATIVE_TRACKER', 'TIME_TRACKER', 'SKILL_TREE']);
// Narrower flowing content wraps into hard-to-read columns.
export const MIN_FLOWING_WIDTH = 160;
// Scrolling widgets never shrink below this, so they stay usable.
const MIN_SCROLL_SIZE = 3 * GRID;
const SHRINK_STEPS = [0.25, 0.5, 0.75, 1];
// Search effort: fixed so the preview and the applied layout agree.
const SEARCH_MOVES = 6000;
const SEARCH_TIME_BUDGET_MS = 1500;

export const snapUp = (value: number) => Math.ceil(value / GRID - 1e-6) * GRID;
const snapDown = (value: number) => Math.floor(value / GRID + 1e-6) * GRID;

export interface AutoStackMember {
  widget: Widget;
  dx: number;
  dy: number;
  w: number;
  h: number;
}

// A widget (or a group of attached widgets) as measured on the canvas, independent of any option.
export interface MeasuredBlock {
  id: string;
  members: AutoStackMember[];
  x: number;
  y: number;
  w: number;
  h: number;
  group: boolean;
  // The layout may set the size of a single unlocked widget.
  resizable: boolean;
  // Scaled proportionally instead of measured.
  keepAspect: boolean;
  // Minimal shapes were measured from the rendered content.
  measured: boolean;
  flowing: boolean;
  min: { width: number; height: number };
  fillShapes: AutoStackShape[];
  measuredShapes: AutoStackShape[];
}

export interface PlanBlock {
  base: MeasuredBlock;
  options: WidgetAutoStackOptions;
  resizable: boolean;
  // Fills its whole slot; otherwise keeps a natural size inside it.
  stretch: boolean;
  // Rendered at its slot size to check for overflow after the layout.
  checkOverflow: boolean;
  shapes: AutoStackShape[];
  growX: number;
  growY: number;
  anchorX?: number;
  anchorY?: number;
}

export interface AutoStackPlacement {
  id: string;
  blockId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  resized: boolean;
}

export interface AutoStackPlan {
  blocks: PlanBlock[];
  result: AutoStackResult;
  targetAspect: number;
}

export interface AutoStackSearch {
  timeBudgetMs?: number;
  maxMoves?: number;
}

export type BlockOptions = Record<string, WidgetAutoStackOptions | undefined>;

// Options a block starts with: those of its first member that has any.
export function initialBlockOptions(block: MeasuredBlock): WidgetAutoStackOptions {
  for (const member of block.members) {
    const options = normalizeWidgetAutoStack(member.widget.autoStack);
    if (options) return options;
  }
  return {};
}

function shrinkShapes(shapes: AutoStackShape[], minWidth: number, minHeight: number, maxShrink: number, uniform: boolean) {
  const out = [...shapes];
  for (const shape of shapes) {
    for (const step of SHRINK_STEPS) {
      const factor = 1 - maxShrink * step;
      const w = Math.min(shape.w, Math.max(minWidth, snapUp(shape.w * factor)));
      const h = Math.min(shape.h, Math.max(minHeight, snapUp(shape.h * factor)));
      if (uniform) {
        out.push({ w, h });
      } else {
        out.push({ w: shape.w, h }, { w, h: shape.h }, { w, h });
      }
    }
  }
  return out;
}

export function configureBlock(base: MeasuredBlock, rawOptions?: WidgetAutoStackOptions): PlanBlock {
  const options = normalizeWidgetAutoStack(rawOptions) ?? {};
  const anchor = getPositionAnchor(options.position);
  const placement = { anchorX: anchor?.x, anchorY: anchor?.y };
  const natural = { w: base.w, h: base.h };
  const fixed = !base.resizable || options.fixedSize === true;
  if (fixed) {
    return {
      base, options, resizable: false, stretch: false, checkOverflow: false,
      shapes: [natural], growX: 0, growY: 0, ...placement,
    };
  }

  const shrink = options.allowScroll ? options.maxShrink ?? AUTO_STACK_DEFAULT_SHRINK : 0;
  const minHeight = Math.max(snapUp(base.min.height), MIN_SCROLL_SIZE);
  const minWidth = Math.max(snapUp(base.flowing ? Math.max(base.min.width, MIN_FLOWING_WIDTH) : base.min.width), MIN_SCROLL_SIZE);
  const spareGrowth = options.allowWhitespace ? 0 : 1;

  if (base.keepAspect) {
    const shapes = base.fillShapes.length > 0 ? base.fillShapes : [natural];
    return {
      base, options, resizable: true, stretch: false, checkOverflow: false,
      shapes: shrink > 0 ? shrinkShapes(shapes, base.min.width, base.min.height, shrink, true) : shapes,
      growX: 0, growY: 0, ...placement,
    };
  }

  const measuredShapes = base.measured && base.measuredShapes.length > 0 ? base.measuredShapes : [natural];
  return {
    base, options, resizable: true,
    stretch: !options.allowWhitespace,
    checkOverflow: base.measured && !options.allowScroll && !options.allowWhitespace,
    shapes: shrink > 0 ? shrinkShapes(measuredShapes, minWidth, minHeight, shrink, false) : measuredShapes,
    growX: spareGrowth,
    growY: spareGrowth * (base.flowing ? 1 : 0.25),
    ...placement,
  };
}

export function layoutPlanBlocks(
  blocks: PlanBlock[],
  settings: AutoStackSettings,
  targetAspect: number,
  search: AutoStackSearch = {},
): AutoStackResult {
  const items: AutoStackItem[] = blocks.map((block) => ({
    id: block.base.id,
    shapes: block.shapes,
    growX: block.growX,
    growY: block.growY,
    anchorX: block.anchorX,
    anchorY: block.anchorY,
    currentW: block.resizable && block.stretch ? block.base.w : undefined,
    currentH: block.resizable && block.stretch ? block.base.h : undefined,
  }));
  return computeAutoStackLayout(items, {
    gap: settings.gap,
    grid: GRID,
    targetAspect,
    ...resolveAutoStackWeights(settings),
    timeBudgetMs: search.timeBudgetMs ?? SEARCH_TIME_BUDGET_MS,
    maxMoves: search.maxMoves ?? SEARCH_MOVES,
  });
}

export function createAutoStackPlan(
  blocks: MeasuredBlock[],
  settings: AutoStackSettings,
  screenAspect: number,
  options: BlockOptions,
  search?: AutoStackSearch,
): AutoStackPlan {
  const planBlocks = blocks.map((block) => configureBlock(block, options[block.id]));
  const targetAspect = resolveTargetAspect(settings, screenAspect);
  return { blocks: planBlocks, targetAspect, result: layoutPlanBlocks(planBlocks, settings, targetAspect, search) };
}

function fitShape(shapes: AutoStackShape[], rect: AutoStackRect) {
  let best: AutoStackShape | undefined;
  for (const shape of shapes) {
    if (shape.w > rect.w || shape.h > rect.h) continue;
    if (!best || shape.w * shape.h >= best.w * best.h) best = shape;
  }
  return best ?? shapes[0];
}

// Final box of every widget, relative to the top-left of the layout.
export function placeBlocks(blocks: PlanBlock[], result: AutoStackResult): AutoStackPlacement[] {
  const rects = new Map(result.rects.map((rect) => [rect.id, rect]));
  const placements: AutoStackPlacement[] = [];
  for (const block of blocks) {
    const rect = rects.get(block.base.id);
    if (!rect) continue;
    const size = !block.resizable
      ? { w: block.base.w, h: block.base.h }
      : block.stretch ? { w: rect.w, h: rect.h } : fitShape(block.shapes, rect);
    // Spare room around a block that does not fill its slot goes where the widget wants to be.
    const x = rect.x + snapDown(Math.max(0, rect.w - size.w) * (block.anchorX ?? 0));
    const y = rect.y + snapDown(Math.max(0, rect.h - size.h) * (block.anchorY ?? 0));
    if (block.resizable) {
      placements.push({ id: block.base.members[0].widget.id, blockId: block.base.id, x, y, w: size.w, h: size.h, resized: true });
      continue;
    }
    for (const member of block.base.members) {
      placements.push({ id: member.widget.id, blockId: block.base.id, x: x + member.dx, y: y + member.dy, w: member.w, h: member.h, resized: false });
    }
  }
  return placements;
}

interface PackUnit {
  blockId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  anchorX?: number;
  anchorY?: number;
  grows: boolean;
}

type Axis = { pos: 'x' | 'y'; size: 'w' | 'h'; cross: 'x' | 'y'; crossSize: 'w' | 'h' };
const AXIS_X: Axis = { pos: 'x', size: 'w', cross: 'y', crossSize: 'h' };
const AXIS_Y: Axis = { pos: 'y', size: 'h', cross: 'x', crossSize: 'w' };

// Two boxes are closer than `gap` on the cross axis, so they block each other along the main axis.
const sharesLane = (a: PackUnit, b: PackUnit, axis: Axis, gap: number) =>
  a[axis.cross] < b[axis.cross] + b[axis.crossSize] + gap && b[axis.cross] < a[axis.cross] + a[axis.crossSize] + gap;

function slideToStart(units: PackUnit[], movable: (unit: PackUnit) => boolean, axis: Axis, gap: number) {
  const ordered = [...units].sort((a, b) => a[axis.pos] - b[axis.pos]);
  for (const unit of ordered) {
    if (!movable(unit)) continue;
    let target = 0;
    for (const other of units) {
      if (other === unit || other[axis.pos] >= unit[axis.pos] || !sharesLane(unit, other, axis, gap)) continue;
      target = Math.max(target, other[axis.pos] + other[axis.size] + gap);
    }
    unit[axis.pos] = Math.min(unit[axis.pos], target);
  }
}

function slideToEnd(units: PackUnit[], movable: (unit: PackUnit) => boolean, axis: Axis, gap: number, limit: number) {
  const ordered = [...units].sort((a, b) => b[axis.pos] + b[axis.size] - (a[axis.pos] + a[axis.size]));
  for (const unit of ordered) {
    if (!movable(unit)) continue;
    let target = limit - unit[axis.size];
    for (const other of units) {
      if (other === unit || other[axis.pos] <= unit[axis.pos] || !sharesLane(unit, other, axis, gap)) continue;
      target = Math.min(target, other[axis.pos] - gap - unit[axis.size]);
    }
    unit[axis.pos] = Math.max(unit[axis.pos], target);
  }
}

function growIntoSpace(units: PackUnit[], axis: Axis, gap: number, limit: number) {
  for (const unit of units) {
    if (!unit.grows) continue;
    let end = limit;
    for (const other of units) {
      if (other === unit || other[axis.pos] < unit[axis.pos] + unit[axis.size] || !sharesLane(unit, other, axis, gap)) continue;
      end = Math.min(end, other[axis.pos] - gap);
    }
    unit[axis.size] = Math.max(unit[axis.size], snapDown(end - unit[axis.pos]));
  }
}

const extents = (units: PackUnit[]) => ({
  width: Math.max(0, ...units.map((unit) => unit.x + unit.w)),
  height: Math.max(0, ...units.map((unit) => unit.y + unit.h)),
});

// The layout tree leaves holes around widgets that do not fill their slot. Slide such widgets towards
// the side they prefer (top left by default), then let stretchable ones grow into the room that frees up.
export function packPlacements(blocks: PlanBlock[], placements: AutoStackPlacement[], gap: number) {
  const byBlock = new Map<string, AutoStackPlacement[]>();
  for (const placement of placements) byBlock.set(placement.blockId, [...(byBlock.get(placement.blockId) ?? []), placement]);

  const units: PackUnit[] = [];
  for (const block of blocks) {
    const members = byBlock.get(block.base.id);
    if (!members) continue;
    const x = Math.min(...members.map((member) => member.x));
    const y = Math.min(...members.map((member) => member.y));
    units.push({
      blockId: block.base.id,
      x,
      y,
      w: Math.max(...members.map((member) => member.x + member.w)) - x,
      h: Math.max(...members.map((member) => member.y + member.h)) - y,
      anchorX: block.anchorX,
      anchorY: block.anchorY,
      grows: block.resizable && block.stretch,
    });
  }
  if (units.length === 0) return { placements, width: 0, height: 0 };

  const original = new Map(units.map((unit) => [unit.blockId, { x: unit.x, y: unit.y, w: unit.w, h: unit.h }]));
  const towardsStart = (anchor: number | undefined) => anchor !== 0.5;
  const towardsEnd = (anchor: number | undefined) => anchor === 1;

  // Compact everything first, then push widgets pinned to the far side out to the new edge.
  slideToStart(units, (unit) => towardsStart(unit.anchorX), AXIS_X, gap);
  slideToStart(units, (unit) => towardsStart(unit.anchorY), AXIS_Y, gap);
  let { width, height } = extents(units);
  slideToEnd(units, (unit) => towardsEnd(unit.anchorX), AXIS_X, gap, width);
  slideToEnd(units, (unit) => towardsEnd(unit.anchorY), AXIS_Y, gap, height);
  ({ width, height } = extents(units));
  growIntoSpace(units, AXIS_X, gap, width);
  growIntoSpace(units, AXIS_Y, gap, height);

  const minX = Math.min(...units.map((unit) => unit.x));
  const minY = Math.min(...units.map((unit) => unit.y));
  const moved = new Map(units.map((unit) => [unit.blockId, unit]));
  const packed = placements.map((placement) => {
    const unit = moved.get(placement.blockId);
    const before = original.get(placement.blockId);
    if (!unit || !before) return placement;
    const next = { ...placement, x: placement.x + unit.x - before.x - minX, y: placement.y + unit.y - before.y - minY };
    if (placement.resized) {
      next.w = unit.w;
      next.h = unit.h;
    }
    return next;
  });
  return { placements: packed, width: width - minX, height: height - minY };
}

// Placements of a finished layout, packed tightly, with the size of the whole stack.
export function finalizePlacements(blocks: PlanBlock[], result: AutoStackResult, gap: number) {
  return packPlacements(blocks, placeBlocks(blocks, result), gap);
}

export function placementsToLayouts(placements: AutoStackPlacement[], origin: { x: number; y: number }) {
  return placements.map((placement) => ({
    id: placement.id,
    x: origin.x + placement.x,
    y: origin.y + placement.y,
    ...(placement.resized ? { w: placement.w, h: placement.h } : {}),
  }));
}
