import { describe, expect, it } from 'vitest';
import { findEdgeSnap, snapWidgetMove, type SnapRect } from './widgetSnap';

const rect = (left: number, top: number, width: number, height: number): SnapRect => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
});

describe('widget edge snapping', () => {
  it('pulls a widget against the side of an overlapping neighbor', () => {
    const neighbor = rect(0, 0, 100, 100);
    expect(findEdgeSnap([rect(106, 20, 50, 50)], [neighbor], 12, 20)).toEqual({ x: -6, y: null });
    expect(findEdgeSnap([rect(-58, 20, 50, 50)], [neighbor], 12, 20)).toEqual({ x: 8, y: null });
  });

  it('ignores neighbors that do not share enough edge length', () => {
    expect(findEdgeSnap([rect(105, 90, 50, 50)], [rect(0, 0, 100, 100)], 12, 20)).toEqual({ x: null, y: null });
  });

  it('ignores edges outside the threshold', () => {
    expect(findEdgeSnap([rect(120, 0, 50, 50)], [rect(0, 0, 100, 100)], 12, 20)).toEqual({ x: null, y: null });
  });

  it('snaps under a neighbor and lines up its left side', () => {
    expect(findEdgeSnap([rect(4, 107, 80, 40)], [rect(0, 0, 100, 100)], 12, 20)).toEqual({ x: -4, y: -7 });
  });

  it('chooses the closest edge across every moving rect', () => {
    const moving = [rect(110, 0, 40, 40), rect(110, 40, 40, 40)];
    const others = [rect(0, 0, 100, 40), rect(0, 40, 105, 40)];
    expect(findEdgeSnap(moving, others, 12, 20).x).toBe(-5);
  });
});

describe('snapWidgetMove', () => {
  const moving = [rect(200, 200, 50, 50)];
  const others = [rect(0, 200, 100, 100)];

  it('combines edge snapping with free movement while dragging', () => {
    expect(snapWidgetMove({
      moving,
      others,
      anchor: { x: 200, y: 200 },
      deltaX: -95,
      deltaY: 13,
      threshold: 12,
      minOverlap: 20,
      grid: false,
    })).toEqual({ x: -100, y: 13 });
  });

  it('snaps axes without a nearby edge to the grid on drop', () => {
    expect(snapWidgetMove({
      moving,
      others,
      anchor: { x: 200, y: 200 },
      deltaX: -95,
      deltaY: 13,
      threshold: 12,
      minOverlap: 20,
      grid: true,
    })).toEqual({ x: -100, y: 10 });
  });
});
