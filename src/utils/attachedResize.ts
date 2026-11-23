import { EDGE_TOLERANCE } from './groupChrome';
import { WIDGET_GRID_SIZE } from './widgetGeometry';

export type ResizeDirection = -1 | 0 | 1;
export type WidgetSide = 'left' | 'right' | 'top' | 'bottom';
export interface WidgetBox { x: number; y: number; width: number; height: number }

export interface ResizeWidget {
  id: string;
  box: WidgetBox;
  min: { width: number; height: number };
  attachedTo: string[];
  locked?: boolean;
}

export interface PlannedLayout {
  id: string;
  box: WidgetBox;
  // Which sizes changed, so widgets that size themselves keep doing so on the other axis.
  resizedX: boolean;
  resizedY: boolean;
}

export interface AttachedResizePlan {
  layouts: PlannedLayout[];
  detach: [string, string][];
}

// The side of `box` that `other` touches, or null when they do not share an edge.
export function getTouchingSide(box: WidgetBox, other: WidgetBox): WidgetSide | null {
  const overlapsX = Math.min(box.x + box.width, other.x + other.width) > Math.max(box.x, other.x);
  const overlapsY = Math.min(box.y + box.height, other.y + other.height) > Math.max(box.y, other.y);
  if (overlapsY && Math.abs(other.x + other.width - box.x) <= EDGE_TOLERANCE) return 'left';
  if (overlapsY && Math.abs(other.x - (box.x + box.width)) <= EDGE_TOLERANCE) return 'right';
  if (overlapsX && Math.abs(other.y + other.height - box.y) <= EDGE_TOLERANCE) return 'top';
  if (overlapsX && Math.abs(other.y - (box.y + box.height)) <= EDGE_TOLERANCE) return 'bottom';
  return null;
}

const snap = (value: number) => Math.round(value / WIDGET_GRID_SIZE) * WIDGET_GRID_SIZE;
const snapDown = (value: number) => Math.floor(value / WIDGET_GRID_SIZE) * WIDGET_GRID_SIZE;

interface AxisNeighbor { start: number; size: number; min: number }

// Moves one edge of the target. `dir` -1 moves the start edge, 1 moves the end edge.
// `neighbors` share that edge; they cannot shrink below their minimum.
function resizeAxis(start: number, size: number, min: number, dir: -1 | 1, delta: number, neighbors: AxisNeighbor[]) {
  const end = start + size;
  let maxSize = Infinity;
  for (const neighbor of neighbors) {
    // A neighbour already below its minimum may not shrink further but is never forced to grow.
    const neighborMin = Math.min(neighbor.min, neighbor.size);
    maxSize = Math.min(maxSize, dir === 1
      ? neighbor.start + neighbor.size - neighborMin - start
      : end - (neighbor.start + neighborMin));
  }
  const next = Math.max(
    Math.min(min, size),
    Math.min(snap(Math.max(min, size + dir * delta)), snapDown(maxSize)),
  );
  const edge = dir === 1 ? start + next : end - next;
  return { size: next, start: dir === 1 ? start : edge, edge };
}

/**
 * Resizes a widget by dragging one of its edges or corners. Attached widgets that share a dragged edge
 * have their touching edge follow it, so the two stay attached. Locked neighbours are detached instead.
 * Attachments that no longer share an edge afterwards are reported in `detach`.
 */
export function planAttachedResize(
  target: ResizeWidget,
  dirX: ResizeDirection,
  dirY: ResizeDirection,
  deltaX: number,
  deltaY: number,
  others: ResizeWidget[],
): AttachedResizePlan {
  const touching = others
    .filter((other) => target.attachedTo.includes(other.id))
    .map((other) => ({ other, side: getTouchingSide(target.box, other.box) }));
  const onSide = (side: WidgetSide) => touching.filter((entry) => entry.side === side).map((entry) => entry.other);
  const followers = (side: WidgetSide) => onSide(side).filter((other) => !other.locked);

  const box = { ...target.box };
  const boxes = new Map<string, PlannedLayout>();
  const follow = (other: ResizeWidget, patch: Partial<WidgetBox>, axis: 'x' | 'y') => {
    const planned = boxes.get(other.id) ?? { id: other.id, box: { ...other.box }, resizedX: false, resizedY: false };
    planned.box = { ...planned.box, ...patch };
    if (axis === 'x') planned.resizedX = true;
    else planned.resizedY = true;
    boxes.set(other.id, planned);
  };
  const lockedMoved = new Set<string>();

  if (dirX !== 0) {
    const sideName: WidgetSide = dirX === 1 ? 'right' : 'left';
    const sharing = followers(sideName);
    const result = resizeAxis(
      target.box.x, target.box.width, target.min.width, dirX, deltaX,
      sharing.map((other) => ({ start: other.box.x, size: other.box.width, min: other.min.width })),
    );
    box.x = result.start;
    box.width = result.size;
    for (const other of sharing) {
      if (dirX === 1) follow(other, { x: result.edge, width: other.box.x + other.box.width - result.edge }, 'x');
      else follow(other, { width: result.edge - other.box.x }, 'x');
    }
    if (result.size !== target.box.width) onSide(sideName).filter((other) => other.locked).forEach((other) => lockedMoved.add(other.id));
  }

  if (dirY !== 0) {
    const sideName: WidgetSide = dirY === 1 ? 'bottom' : 'top';
    const sharing = followers(sideName);
    const result = resizeAxis(
      target.box.y, target.box.height, target.min.height, dirY, deltaY,
      sharing.map((other) => ({ start: other.box.y, size: other.box.height, min: other.min.height })),
    );
    box.y = result.start;
    box.height = result.size;
    for (const other of sharing) {
      if (dirY === 1) follow(other, { y: result.edge, height: other.box.y + other.box.height - result.edge }, 'y');
      else follow(other, { height: result.edge - other.box.y }, 'y');
    }
    if (result.size !== target.box.height) onSide(sideName).filter((other) => other.locked).forEach((other) => lockedMoved.add(other.id));
  }

  const layouts: PlannedLayout[] = [
    { id: target.id, box, resizedX: dirX !== 0, resizedY: dirY !== 0 },
    ...boxes.values(),
  ];

  const finalBoxes = new Map<string, WidgetBox>([[target.id, box]]);
  for (const layout of layouts) finalBoxes.set(layout.id, layout.box);
  const byId = new Map([target, ...others].map((widget) => [widget.id, widget]));
  const detach: [string, string][] = [];
  const seen = new Set<string>();
  const addDetach = (a: string, b: string) => {
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    detach.push([a, b]);
  };
  for (const id of lockedMoved) addDetach(target.id, id);
  for (const layout of layouts) {
    const widget = byId.get(layout.id);
    for (const otherId of widget?.attachedTo ?? []) {
      const other = byId.get(otherId);
      if (!other) continue;
      if (!getTouchingSide(layout.box, finalBoxes.get(otherId) ?? other.box)) addDetach(layout.id, otherId);
    }
  }
  return { layouts, detach };
}
