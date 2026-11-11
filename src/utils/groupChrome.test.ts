import { describe, expect, it } from 'vitest';
import {
  buildGroupShapePath,
  getSharedEdgeBridges,
  groupAttachedRects,
  type CornerRounding,
  type WidgetRect,
} from './groupChrome';

const widget = (id: string, x: number, y: number, width: number, height: number, attachedTo: string[] = []): WidgetRect => ({
  id, x, y, width, height, attachedTo,
});

describe('groupAttachedRects', () => {
  it('collects widgets connected through attachments and ignores unattached ones', () => {
    const groups = groupAttachedRects([
      widget('a', 0, 0, 100, 50, ['b']),
      widget('b', 100, 0, 100, 50, ['a', 'c']),
      widget('c', 100, 50, 100, 50, ['b']),
      widget('d', 500, 500, 100, 50, ['e']),
      widget('e', 600, 500, 100, 50, ['d']),
    ]);
    expect(groups.map((group) => group.map((rect) => rect.id).sort())).toEqual([['a', 'b', 'c'], ['d', 'e']]);
  });
});

describe('getSharedEdgeBridges', () => {
  it('spans a shared vertical edge and reaches into both neighbours', () => {
    const bridges = getSharedEdgeBridges([
      widget('a', 0, 0, 100, 50, ['b']),
      widget('b', 100, 20, 100, 50, ['a']),
    ], 2);
    expect(bridges).toEqual([{ x: 98, y: 20, width: 4, height: 30 }]);
  });

  it('fills a small gap between attached widgets', () => {
    const bridges = getSharedEdgeBridges([
      widget('a', 0, 0, 100, 50, ['b']),
      widget('b', 0, 54, 100, 50, ['a']),
    ], 1);
    expect(bridges).toEqual([{ x: 0, y: 49, width: 100, height: 6 }]);
  });
});

describe('buildGroupShapePath', () => {
  const none: CornerRounding = { topLeft: false, topRight: false, bottomLeft: false, bottomRight: false };

  it('draws every rect as a subpath of one shape, relative to the origin', () => {
    const path = buildGroupShapePath(
      [
        { rect: { x: 10, y: 10, width: 20, height: 10 }, corners: none },
        { rect: { x: 30, y: 10, width: 20, height: 10 }, corners: none },
      ],
      [],
      { x: 10, y: 10, width: 40, height: 10 },
      4,
    );
    expect(path).toBe('M0 0 H20 V10 H0 V0 Z M20 0 H40 V10 H20 V0 Z');
  });

  it('rounds only the exposed corners and never beyond half the rect', () => {
    const path = buildGroupShapePath(
      [{ rect: { x: 0, y: 0, width: 100, height: 10 }, corners: { ...none, topLeft: true } }],
      [],
      { x: 0, y: 0, width: 100, height: 10 },
      40,
    );
    expect(path).toBe('M5 0 H100 V10 H0 V5 A5 5 0 0 1 5 0 Z');
  });
});
