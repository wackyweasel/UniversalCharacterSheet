// Geometry shared by the canvas layers that draw attached widgets as one piece.

export const EDGE_TOLERANCE = 10; // pixels tolerance for edge detection

export interface WidgetRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  attachedTo?: string[];
}

export interface CornerRounding {
  topLeft: boolean;
  topRight: boolean;
  bottomLeft: boolean;
  bottomRight: boolean;
}

export interface PlainRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Calculate which corners should have rounding removed based on attachments
export function calculateCornerRounding(
  widget: WidgetRect,
  allWidgets: WidgetRect[]
): CornerRounding {
  const corners: CornerRounding = { topLeft: true, topRight: true, bottomLeft: true, bottomRight: true };

  if (!widget.attachedTo || widget.attachedTo.length === 0) {
    return corners;
  }

  const currentBounds = {
    left: widget.x,
    right: widget.x + widget.width,
    top: widget.y,
    bottom: widget.y + widget.height,
  };

  for (const attachedId of widget.attachedTo) {
    const attachedWidget = allWidgets.find(w => w.id === attachedId);
    if (!attachedWidget) continue;

    const attachedBounds = {
      left: attachedWidget.x,
      right: attachedWidget.x + attachedWidget.width,
      top: attachedWidget.y,
      bottom: attachedWidget.y + attachedWidget.height,
    };

    // Check if attached widget is on the left side
    if (Math.abs(attachedBounds.right - currentBounds.left) <= EDGE_TOLERANCE) {
      if (attachedBounds.top <= currentBounds.top + EDGE_TOLERANCE &&
          attachedBounds.bottom >= currentBounds.top - EDGE_TOLERANCE) {
        corners.topLeft = false;
      }
      if (attachedBounds.top <= currentBounds.bottom + EDGE_TOLERANCE &&
          attachedBounds.bottom >= currentBounds.bottom - EDGE_TOLERANCE) {
        corners.bottomLeft = false;
      }
    }

    // Check if attached widget is on the right side
    if (Math.abs(attachedBounds.left - currentBounds.right) <= EDGE_TOLERANCE) {
      if (attachedBounds.top <= currentBounds.top + EDGE_TOLERANCE &&
          attachedBounds.bottom >= currentBounds.top - EDGE_TOLERANCE) {
        corners.topRight = false;
      }
      if (attachedBounds.top <= currentBounds.bottom + EDGE_TOLERANCE &&
          attachedBounds.bottom >= currentBounds.bottom - EDGE_TOLERANCE) {
        corners.bottomRight = false;
      }
    }

    // Check if attached widget is on the top side
    if (Math.abs(attachedBounds.bottom - currentBounds.top) <= EDGE_TOLERANCE) {
      if (attachedBounds.left <= currentBounds.left + EDGE_TOLERANCE &&
          attachedBounds.right >= currentBounds.left - EDGE_TOLERANCE) {
        corners.topLeft = false;
      }
      if (attachedBounds.left <= currentBounds.right + EDGE_TOLERANCE &&
          attachedBounds.right >= currentBounds.right - EDGE_TOLERANCE) {
        corners.topRight = false;
      }
    }

    // Check if attached widget is on the bottom side
    if (Math.abs(attachedBounds.top - currentBounds.bottom) <= EDGE_TOLERANCE) {
      if (attachedBounds.left <= currentBounds.left + EDGE_TOLERANCE &&
          attachedBounds.right >= currentBounds.left - EDGE_TOLERANCE) {
        corners.bottomLeft = false;
      }
      if (attachedBounds.left <= currentBounds.right + EDGE_TOLERANCE &&
          attachedBounds.right >= currentBounds.right - EDGE_TOLERANCE) {
        corners.bottomRight = false;
      }
    }
  }

  return corners;
}

// Connected components of the attachment graph; each one is drawn as a single shape.
export function groupAttachedRects(rects: WidgetRect[]): WidgetRect[][] {
  const byId = new Map(rects.map(rect => [rect.id, rect]));
  const seen = new Set<string>();
  const groups: WidgetRect[][] = [];
  for (const rect of rects) {
    if (seen.has(rect.id)) continue;
    const group: WidgetRect[] = [];
    const pending = [rect];
    seen.add(rect.id);
    while (pending.length > 0) {
      const current = pending.pop()!;
      group.push(current);
      const neighborIds = [
        ...(current.attachedTo ?? []),
        ...rects.filter(other => other.attachedTo?.includes(current.id)).map(other => other.id),
      ];
      for (const id of neighborIds) {
        const neighbor = byId.get(id);
        if (neighbor && !seen.has(neighbor.id)) {
          seen.add(neighbor.id);
          pending.push(neighbor);
        }
      }
    }
    groups.push(group);
  }
  return groups;
}

// Strips centred on every edge that two attached rects share. They fill the gap between near-touching
// rects and overlap both by `overlap`, so anti-aliased edges never reveal what is painted underneath.
export function getSharedEdgeBridges(group: WidgetRect[], overlap: number): PlainRect[] {
  const bridges: PlainRect[] = [];
  for (const a of group) {
    for (const bId of a.attachedTo ?? []) {
      const b = group.find(candidate => candidate.id === bId);
      // Each pair is handled once, from the rect with the smaller id.
      if (!b || a.id > b.id) continue;
      const top = Math.max(a.y, b.y);
      const bottom = Math.min(a.y + a.height, b.y + b.height);
      const left = Math.max(a.x, b.x);
      const right = Math.min(a.x + a.width, b.x + b.width);
      const inset = Math.min(overlap, a.width / 3, a.height / 3, b.width / 3, b.height / 3);
      const [leftRect, rightRect] = a.x <= b.x ? [a, b] : [b, a];
      const [upperRect, lowerRect] = a.y <= b.y ? [a, b] : [b, a];
      if (bottom > top && Math.abs(rightRect.x - (leftRect.x + leftRect.width)) <= EDGE_TOLERANCE) {
        const from = Math.min(rightRect.x, leftRect.x + leftRect.width) - inset;
        const to = Math.max(rightRect.x, leftRect.x + leftRect.width) + inset;
        bridges.push({ x: from, y: top, width: to - from, height: bottom - top });
      } else if (right > left && Math.abs(lowerRect.y - (upperRect.y + upperRect.height)) <= EDGE_TOLERANCE) {
        const from = Math.min(lowerRect.y, upperRect.y + upperRect.height) - inset;
        const to = Math.max(lowerRect.y, upperRect.y + upperRect.height) + inset;
        bridges.push({ x: left, y: from, width: right - left, height: to - from });
      }
    }
  }
  return bridges;
}

function roundedRectPath(rect: PlainRect, corners: CornerRounding | undefined, radius: number): string {
  const { x, y, width, height } = rect;
  const limit = Math.min(width, height) / 2;
  const r = Math.max(0, Math.min(radius, limit));
  const tl = corners?.topLeft ? r : 0;
  const tr = corners?.topRight ? r : 0;
  const br = corners?.bottomRight ? r : 0;
  const bl = corners?.bottomLeft ? r : 0;
  const arc = (size: number, dx: number, dy: number) => (size ? `A${size} ${size} 0 0 1 ${dx} ${dy}` : '');
  return [
    `M${x + tl} ${y}`,
    `H${x + width - tr}`, arc(tr, x + width, y + tr),
    `V${y + height - br}`, arc(br, x + width - br, y + height),
    `H${x + bl}`, arc(bl, x, y + height - bl),
    `V${y + tl}`, arc(tl, x + tl, y),
    'Z',
  ].filter(Boolean).join(' ');
}

// One SVG path covering every rect of a group, relative to `origin`. Filling it as a single shape keeps the
// seams between abutting rects exact, which separately anti-aliased rects cannot do.
export function buildGroupShapePath(
  members: { rect: PlainRect; corners: CornerRounding }[],
  bridges: PlainRect[],
  origin: PlainRect,
  radius: number,
): string {
  const relative = (rect: PlainRect): PlainRect => ({ ...rect, x: rect.x - origin.x, y: rect.y - origin.y });
  return [
    ...members.map(({ rect, corners }) => roundedRectPath(relative(rect), corners, radius)),
    ...bridges.map((bridge) => roundedRectPath(relative(bridge), undefined, 0)),
  ].join(' ');
}
