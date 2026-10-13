import { useCallback, useRef, useState } from 'react';
import type { Widget, WidgetType } from '../types';
import { useStore } from '../store/useStore';
import { clearWidgetProbeSizes, setWidgetProbeSizes, type WidgetProbeSize } from '../components/widgetSizeProbe';
import { computeAutoStackLayout, type AutoStackItem, type AutoStackResult, type AutoStackShape } from '../utils/autoStackLayout';
import { getMinWidgetDimensions, snapWidgetCoordinate, WIDGET_GRID_SIZE } from '../utils/widgetGeometry';

interface UseAutoStackOptions {
  widgets: Widget[];
}

const GAP = 10;
const GRID = WIDGET_GRID_SIZE;
const ROW_THRESHOLD = 50;
const CANDIDATE_WIDTHS = [100, 120, 140, 160, 180, 200, 230, 260, 300, 340, 390, 450, 520, 600];
const MAX_PROBE_WIDTH = 900;
// Narrower flowing content wraps into hard-to-read columns.
const MIN_FLOWING_WIDTH = 160;
// Fill widgets may only grow, so repeated auto stacks do not shrink them.
const FILL_SCALES = [1, 1.1, 1.25];
const MAX_GROW_PASSES = 4;
const MAX_FIX_ROUNDS = 3;
// Content that fills whatever box it gets; scaled proportionally instead of measured.
const FILL_TYPES = new Set<WidgetType>(['IMAGE', 'MAP_SKETCHER', 'GRID_MAP', 'DECK_OF_CARDS', 'PROGRESS_CLOCK']);
// Content that reflows and benefits from extra height.
const FLOWING_TYPES = new Set<WidgetType>(['TEXT', 'LIST', 'INVENTORY', 'TABLE', 'ROLL_TABLE', 'INITIATIVE_TRACKER', 'TIME_TRACKER', 'SKILL_TREE']);

interface Block {
  id: string;
  members: { widget: Widget; dx: number; dy: number }[];
  x: number;
  y: number;
  w: number;
  h: number;
  // Single widget whose size the layout may set.
  resizable: boolean;
  measured: boolean;
  // Takes the largest of its shapes that fits the slot instead of stretching to it.
  keepAspect: boolean;
  shapes: AutoStackShape[];
  growX: number;
  growY: number;
}

interface Probe {
  block: Block;
  widths: number[];
  index: number;
  minHeight: number;
  height: number;
  previousHeight: number;
  previousOverflow: number;
  previousOverflowX: number;
  passes: number;
  heights: number[];
  overflowingShapes: (AutoStackShape & { overflow: number })[];
}

const snapUp = (value: number) => Math.ceil(value / GRID - 1e-6) * GRID;

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

async function settle() {
  await nextFrame();
  await nextFrame();
}

const findWidgetNode = (id: string) => document.querySelector<HTMLElement>(`.canvas-widget[data-widget-id="${CSS.escape(id)}"]`);

// Largest clipped, scrolled, ellipsised or spilled-text overflow inside a widget, in unscaled CSS pixels.
function measureOverflow(node: HTMLElement) {
  let x = 0;
  let y = 0;
  const elements = [node, ...Array.from(node.querySelectorAll<HTMLElement>('*'))];
  for (const element of elements) {
    const dy = element.scrollHeight - element.clientHeight;
    const dx = element.scrollWidth - element.clientWidth;
    if (dy <= 1 && dx <= 1) continue;
    const style = getComputedStyle(element);
    if (dy > 1 && style.overflowY !== 'visible') y = Math.max(y, dy);
    if (dx > 1 && (style.overflowX !== 'visible' || hasOwnText(element))) x = Math.max(x, dx);
  }
  return { x, y };
}

const hasOwnText = (element: HTMLElement) => Array.from(element.childNodes).some((child) => (
  child.nodeType === Node.TEXT_NODE && !!child.textContent?.trim()
));

function readRenderedSize(widget: Widget) {
  const node = findWidgetNode(widget.id);
  return {
    w: snapUp(node?.offsetWidth || widget.w || 200),
    h: snapUp(node?.offsetHeight || widget.h || 120),
  };
}

function buildBlocks(widgets: Widget[]): Block[] {
  const blocks: Block[] = [];
  const groups = new Map<string, Widget[]>();
  for (const widget of widgets) {
    if (widget.groupId) {
      groups.set(widget.groupId, [...(groups.get(widget.groupId) ?? []), widget]);
      continue;
    }
    const size = readRenderedSize(widget);
    const resizable = !widget.locked;
    const keepAspect = resizable && FILL_TYPES.has(widget.type);
    const measured = resizable && !keepAspect;
    const flowing = FLOWING_TYPES.has(widget.type);
    const min = getMinWidgetDimensions(widget.type);
    const fillShapes = FILL_SCALES
      .map((scale) => ({ w: snapUp(size.w * scale), h: snapUp(size.h * scale) }))
      .filter((shape) => shape.w >= min.width && shape.h >= min.height);
    blocks.push({
      id: widget.id,
      members: [{ widget, dx: 0, dy: 0 }],
      x: widget.x,
      y: widget.y,
      ...size,
      resizable,
      measured,
      keepAspect,
      shapes: measured ? [] : keepAspect && fillShapes.length > 0 ? fillShapes : [size],
      growX: measured ? 1 : 0,
      growY: !measured ? 0 : flowing ? 1 : 0.25,
    });
  }
  for (const [groupId, members] of groups) {
    const boxes = members.map((widget) => ({ widget, ...readRenderedSize(widget) }));
    const minX = Math.min(...boxes.map((box) => box.widget.x));
    const minY = Math.min(...boxes.map((box) => box.widget.y));
    const w = snapUp(Math.max(...boxes.map((box) => box.widget.x + box.w)) - minX);
    const h = snapUp(Math.max(...boxes.map((box) => box.widget.y + box.h)) - minY);
    blocks.push({
      id: `group:${groupId}`,
      members: members.map((widget) => ({ widget, dx: widget.x - minX, dy: widget.y - minY })),
      x: minX,
      y: minY,
      w,
      h,
      resizable: false,
      measured: false,
      keepAspect: false,
      shapes: [{ w, h }],
      growX: 0,
      growY: 0,
    });
  }
  // Reading order: rows top to bottom, then left to right.
  return blocks.sort((a, b) => (
    Math.floor(a.y / ROW_THRESHOLD) - Math.floor(b.y / ROW_THRESHOLD) || a.x - b.x
  ));
}

function createProbe(block: Block): Probe {
  const widget = block.members[0].widget;
  const min = getMinWidgetDimensions(widget.type);
  const minWidth = snapUp(FLOWING_TYPES.has(widget.type) ? Math.max(min.width, MIN_FLOWING_WIDTH) : min.width);
  const minHeight = snapUp(min.height);
  const widths = Array.from(new Set([...CANDIDATE_WIDTHS, block.w]))
    .filter((width) => width >= minWidth)
    .sort((a, b) => a - b);
  return {
    block,
    widths: widths.length > 0 ? widths : [minWidth],
    index: 0,
    minHeight,
    height: minHeight,
    previousHeight: minHeight,
    previousOverflow: Infinity,
    previousOverflowX: Infinity,
    passes: 0,
    heights: [],
    overflowingShapes: [],
  };
}

// Applies one measurement to a probe; returns false once the probe is done.
function stepProbe(probe: Probe): boolean {
  const node = findWidgetNode(probe.block.id);
  if (!node) return false;
  const overflow = measureOverflow(node);
  if (overflow.y > 1 && probe.passes < MAX_GROW_PASSES && overflow.y < probe.previousOverflow) {
    probe.previousOverflow = overflow.y;
    probe.previousHeight = probe.height;
    probe.height = snapUp(probe.height + overflow.y);
    probe.passes += 1;
    return true;
  }
  // Overflow that does not shrink when the widget grows is intrinsic; drop the useless growth.
  let height = probe.height;
  if (overflow.y > 1) height = overflow.y >= probe.previousOverflow ? probe.previousHeight : snapUp(probe.height + overflow.y);
  const width = probe.widths[probe.index];
  probe.index += 1;
  // Horizontal overflow that a wider probe did not reduce is intrinsic (e.g. fixed-size cells).
  const clipped = overflow.x > 1 && overflow.x < probe.previousOverflowX;
  probe.previousOverflowX = overflow.x;
  if (clipped) {
    probe.overflowingShapes.push({ w: width, h: height, overflow: overflow.x });
    // Skip widths that are still too narrow for the clipped content.
    const needed = width + overflow.x;
    while (probe.index < probe.widths.length && probe.widths[probe.index] < needed) probe.index += 1;
    if (probe.index >= probe.widths.length && needed <= MAX_PROBE_WIDTH) probe.widths.push(snapUp(needed));
  } else {
    probe.block.shapes.push({ w: width, h: height });
    probe.heights.push(height);
    const { heights } = probe;
    const plateau = heights.length >= 3 && heights[heights.length - 1] === heights[heights.length - 3];
    if (height <= probe.minHeight || plateau) return false;
  }
  if (probe.index >= probe.widths.length) return false;
  probe.height = probe.minHeight;
  probe.previousHeight = probe.minHeight;
  probe.previousOverflow = Infinity;
  probe.passes = 0;
  return true;
}

async function measureShapes(blocks: Block[]) {
  const probes = blocks.filter((block) => block.measured).map(createProbe);
  const sizes = new Map<string, WidgetProbeSize>();
  let active = probes;
  while (active.length > 0) {
    for (const probe of active) {
      const w = probe.widths[probe.index];
      const previous = sizes.get(probe.block.id);
      if (!previous || previous.w !== w || previous.h !== probe.height) sizes.set(probe.block.id, { w, h: probe.height });
    }
    setWidgetProbeSizes(new Map(sizes));
    // One frame is enough while probing; fixOverflow re-checks the final sizes after two.
    await nextFrame();
    active = active.filter(stepProbe);
  }
  for (const probe of probes) {
    const { block } = probe;
    if (block.shapes.length === 0 && probe.overflowingShapes.length > 0) {
      // Overflow that no width removes is intrinsic; keep the least overflowing shapes.
      const least = Math.min(...probe.overflowingShapes.map((shape) => shape.overflow));
      block.shapes = probe.overflowingShapes
        .filter((shape) => shape.overflow <= least + 1)
        .map(({ w, h }) => ({ w, h }));
    }
    if (block.shapes.length === 0) {
      block.measured = false;
      block.shapes = [{ w: block.w, h: block.h }];
    }
  }
}

function getTargetAspect() {
  const surface = document.querySelector<HTMLElement>('.canvas-touch-surface');
  const width = surface?.clientWidth || window.innerWidth;
  const height = surface?.clientHeight || window.innerHeight;
  return Math.min(3, Math.max(0.5, width / Math.max(1, height)));
}

function layoutBlocks(blocks: Block[], targetAspect: number) {
  const items: AutoStackItem[] = blocks.map((block) => ({
    id: block.id,
    shapes: block.shapes,
    growX: block.growX,
    growY: block.growY,
  }));
  return computeAutoStackLayout(items, { gap: GAP, grid: GRID, targetAspect });
}

// Renders measured widgets in their final slots and raises shapes that still overflow.
async function fixOverflow(blocks: Block[], result: AutoStackResult) {
  const rects = new Map(result.rects.map((rect) => [rect.id, rect]));
  const sizes = new Map<string, WidgetProbeSize>();
  for (const block of blocks) {
    const rect = rects.get(block.id);
    if (rect && block.measured) sizes.set(block.id, { w: rect.w, h: rect.h });
  }
  setWidgetProbeSizes(sizes);
  await settle();
  let changed = false;
  for (const block of blocks) {
    const rect = rects.get(block.id);
    const node = block.measured && rect ? findWidgetNode(block.id) : null;
    if (!rect || !node) continue;
    const overflow = measureOverflow(node).y;
    if (overflow <= 1) continue;
    const needed = snapUp(rect.h + overflow);
    block.shapes = block.shapes.map((shape) => (shape.w <= rect.w && shape.h < needed ? { w: shape.w, h: needed } : shape));
    changed = true;
  }
  return changed;
}

export function useAutoStack({ widgets }: UseAutoStackOptions) {
  const applyWidgetLayouts = useStore((state) => state.applyWidgetLayouts);
  const [isAutoStacking, setIsAutoStacking] = useState(false);
  const runningRef = useRef(false);

  const handleAutoStack = useCallback(async () => {
    if (widgets.length === 0 || runningRef.current) return;
    runningRef.current = true;
    setIsAutoStacking(true);
    try {
      const originX = snapWidgetCoordinate(Math.min(...widgets.map((widget) => widget.x)));
      const originY = snapWidgetCoordinate(Math.min(...widgets.map((widget) => widget.y)));
      const blocks = buildBlocks(widgets);
      await measureShapes(blocks);
      const targetAspect = getTargetAspect();
      let result = layoutBlocks(blocks, targetAspect);
      for (let round = 0; round < MAX_FIX_ROUNDS && await fixOverflow(blocks, result); round++) {
        result = layoutBlocks(blocks, targetAspect);
      }

      const rects = new Map(result.rects.map((rect) => [rect.id, rect]));
      const layouts = blocks.flatMap((block) => {
        const rect = rects.get(block.id);
        if (!rect) return [];
        if (block.resizable) {
          const size = block.keepAspect
            ? block.shapes.filter((shape) => shape.w <= rect.w && shape.h <= rect.h).pop() ?? block.shapes[0]
            : rect;
          return [{ id: block.id, x: originX + rect.x, y: originY + rect.y, w: size.w, h: size.h }];
        }
        return block.members.map(({ widget, dx, dy }) => ({ id: widget.id, x: originX + rect.x + dx, y: originY + rect.y + dy }));
      });
      applyWidgetLayouts(layouts, 'Auto stack');
    } finally {
      clearWidgetProbeSizes();
      runningRef.current = false;
      setIsAutoStacking(false);
    }
  }, [widgets, applyWidgetLayouts]);

  return { handleAutoStack, isAutoStacking };
}
