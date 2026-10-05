import { snapWidgetCoordinate } from './widgetGeometry';

export interface SnapRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface WidgetMoveSnapOptions {
  /** Rects of the moving widgets at the drag origin. */
  moving: SnapRect[];
  /** Rects of every widget that is not moving. */
  others: SnapRect[];
  /** Origin of the dragged widget, used to keep grid-snapped axes on the grid. */
  anchor: { x: number; y: number };
  deltaX: number;
  deltaY: number;
  /** Maximum edge distance, in canvas units, that still snaps. */
  threshold: number;
  /** Minimum shared length before two side-by-side edges snap together. */
  minOverlap: number;
  /** Snap axes without a nearby edge to the widget grid. */
  grid: boolean;
}

const overlapLength = (startA: number, endA: number, startB: number, endB: number) =>
  Math.min(endA, endB) - Math.max(startA, startB);

const offsetRect = (rect: SnapRect, dx: number, dy: number): SnapRect => ({
  left: rect.left + dx,
  top: rect.top + dy,
  right: rect.right + dx,
  bottom: rect.bottom + dy,
});

/** Returns the smallest per-axis offset that makes a moving edge meet a nearby widget edge. */
export function findEdgeSnap(
  moving: SnapRect[],
  others: SnapRect[],
  threshold: number,
  minOverlap: number,
): { x: number | null; y: number | null } {
  let x: number | null = null;
  let y: number | null = null;
  const closer = (current: number | null, offset: number) =>
    Math.abs(offset) <= threshold && (current === null || Math.abs(offset) < Math.abs(current)) ? offset : current;

  for (const rect of moving) {
    for (const other of others) {
      const verticalOverlap = overlapLength(rect.top, rect.bottom, other.top, other.bottom);
      const horizontalOverlap = overlapLength(rect.left, rect.right, other.left, other.right);

      if (verticalOverlap >= minOverlap) {
        x = closer(x, other.right - rect.left);
        x = closer(x, other.left - rect.right);
      }
      if (horizontalOverlap >= minOverlap) {
        y = closer(y, other.bottom - rect.top);
        y = closer(y, other.top - rect.bottom);
      }

      // Line up the sides of stacked widgets so attached columns and rows stay flush.
      const stackedVertically = horizontalOverlap > 0 && (
        Math.abs(other.bottom - rect.top) <= threshold || Math.abs(other.top - rect.bottom) <= threshold
      );
      if (stackedVertically) {
        x = closer(x, other.left - rect.left);
        x = closer(x, other.right - rect.right);
      }
      const stackedHorizontally = verticalOverlap > 0 && (
        Math.abs(other.right - rect.left) <= threshold || Math.abs(other.left - rect.right) <= threshold
      );
      if (stackedHorizontally) {
        y = closer(y, other.top - rect.top);
        y = closer(y, other.bottom - rect.bottom);
      }
    }
  }

  return { x, y };
}

/** Applies magnetic edge snapping to a drag delta, then optionally the widget grid. */
export function snapWidgetMove({
  moving,
  others,
  anchor,
  deltaX,
  deltaY,
  threshold,
  minOverlap,
  grid,
}: WidgetMoveSnapOptions): { x: number; y: number } {
  const shifted = moving.map((rect) => offsetRect(rect, deltaX, deltaY));
  const edge = findEdgeSnap(shifted, others, threshold, minOverlap);
  const x = deltaX + (edge.x ?? 0);
  const y = deltaY + (edge.y ?? 0);
  if (!grid) return { x, y };
  return {
    x: snapWidgetCoordinate(anchor.x + x) - anchor.x,
    y: snapWidgetCoordinate(anchor.y + y) - anchor.y,
  };
}
