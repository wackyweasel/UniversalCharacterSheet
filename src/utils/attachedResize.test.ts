import { describe, expect, it } from 'vitest';
import { planAttachedResize, type ResizeWidget } from './attachedResize';

const widget = (id: string, x: number, y: number, width: number, height: number, attachedTo: string[] = [], extra: Partial<ResizeWidget> = {}): ResizeWidget => ({
  id, box: { x, y, width, height }, min: { width: 50, height: 30 }, attachedTo, ...extra,
});

const boxOf = (plan: ReturnType<typeof planAttachedResize>, id: string) => plan.layouts.find((layout) => layout.id === id)?.box;

describe('planAttachedResize', () => {
  it('moves the shared edge of both widgets when dragging a right edge', () => {
    const a = widget('a', 0, 0, 200, 100, ['b']);
    const b = widget('b', 200, 0, 200, 100, ['a']);
    const plan = planAttachedResize(a, 1, 0, 60, 0, [b]);
    expect(boxOf(plan, 'a')).toEqual({ x: 0, y: 0, width: 260, height: 100 });
    expect(boxOf(plan, 'b')).toEqual({ x: 260, y: 0, width: 140, height: 100 });
    expect(plan.detach).toEqual([]);
  });

  it('moves the shared edge of both widgets when dragging a left edge', () => {
    const a = widget('a', 0, 0, 200, 100, ['b']);
    const b = widget('b', 200, 0, 200, 100, ['a']);
    const plan = planAttachedResize(b, -1, 0, -40, 0, [a]);
    expect(boxOf(plan, 'b')).toEqual({ x: 160, y: 0, width: 240, height: 100 });
    expect(boxOf(plan, 'a')).toEqual({ x: 0, y: 0, width: 160, height: 100 });
    expect(plan.detach).toEqual([]);
  });

  it('moves the shared edge vertically', () => {
    const a = widget('a', 0, 0, 200, 100, ['b']);
    const b = widget('b', 0, 100, 200, 100, ['a']);
    const plan = planAttachedResize(a, 0, 1, 0, -30, [b]);
    expect(boxOf(plan, 'a')?.height).toBe(70);
    expect(boxOf(plan, 'b')).toEqual({ x: 0, y: 70, width: 200, height: 130 });
    expect(plan.layouts.find((layout) => layout.id === 'b')).toMatchObject({ resizedX: false, resizedY: true });
  });

  it('stops growing when the neighbour reaches its minimum size', () => {
    const a = widget('a', 0, 0, 200, 100, ['b']);
    const b = widget('b', 200, 0, 100, 100, ['a']);
    const plan = planAttachedResize(a, 1, 0, 500, 0, [b]);
    expect(boxOf(plan, 'a')?.width).toBe(250);
    expect(boxOf(plan, 'b')).toEqual({ x: 250, y: 0, width: 50, height: 100 });
  });

  it('leaves neighbours on other edges alone while they still touch', () => {
    const a = widget('a', 0, 0, 200, 100, ['b', 'c']);
    const b = widget('b', 200, 0, 200, 100, ['a']);
    const c = widget('c', 0, 100, 200, 100, ['a']);
    const plan = planAttachedResize(a, 1, 0, 30, 0, [b, c]);
    expect(plan.layouts.map((layout) => layout.id)).toEqual(['a', 'b']);
    expect(plan.detach).toEqual([]);
  });

  it('detaches neighbours that no longer share an edge', () => {
    const a = widget('a', 0, 0, 200, 100, ['b']);
    const b = widget('b', 200, 100, 200, 100, ['a']);
    const plan = planAttachedResize(a, 1, 0, -150, 0, [b]);
    expect(plan.detach).toEqual([['a', 'b']]);
  });

  it('detaches a neighbour of a resized widget that it stops touching', () => {
    const a = widget('a', 0, 0, 200, 100, ['b']);
    const b = widget('b', 200, 0, 200, 100, ['a', 'c']);
    const c = widget('c', 200, 100, 100, 100, ['b']);
    const plan = planAttachedResize(a, 1, 0, 190, 0, [b, c]);
    expect(boxOf(plan, 'b')).toEqual({ x: 350, y: 0, width: 50, height: 100 });
    expect(plan.detach).toEqual([['b', 'c']]);
  });

  it('detaches a locked neighbour instead of moving it', () => {
    const a = widget('a', 0, 0, 200, 100, ['b']);
    const b = widget('b', 200, 0, 200, 100, ['a'], { locked: true });
    const plan = planAttachedResize(a, 1, 0, 50, 0, [b]);
    expect(plan.layouts.map((layout) => layout.id)).toEqual(['a']);
    expect(plan.detach).toEqual([['a', 'b']]);
  });

  it('resizes a lone widget like before', () => {
    const a = widget('a', 20, 20, 200, 100);
    const plan = planAttachedResize(a, -1, -1, -30, -20, []);
    expect(plan.layouts).toHaveLength(1);
    expect(boxOf(plan, 'a')).toEqual({ x: -10, y: 0, width: 230, height: 120 });
    expect(plan.detach).toEqual([]);
  });
});
