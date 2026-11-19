import { describe, expect, it } from 'vitest';
import type { GraphNode } from './graph';
import { jumpCurve, sampleCurve, type Point } from './jumpCurve';

const node = (id: string, x: number, y: number, width = 260, height = 76): GraphNode => ({ id, kind: 'effect', x, y, width, height });

const goesThrough = (points: Point[], nodes: GraphNode[]) =>
  nodes.some((n) => points.some((p) => p.x > n.x && p.x < n.x + n.width && p.y > n.y && p.y < n.y + n.height));

describe('jumpCurve', () => {
  it('goes around nodes in the way, whichever way it runs', () => {
    // A column of nodes; the jump leaves the first and lands on the last, with the rest in between.
    const column = [node('a', 0, 0), node('b', 0, 124), node('c', 0, 248), node('d', 0, 372)];
    const others = column.filter((n) => n.id !== 'a' && n.id !== 'd');
    const forward = jumpCurve({ direction: 'down', nodes: column, sourceId: 'a', targetId: 'd', aside: false, from: { x: 130, y: 76 }, to: { x: 130, y: 372 } });
    expect(goesThrough(sampleCurve(forward.curve), others)).toBe(false);

    const backward = jumpCurve({ direction: 'down', nodes: column, sourceId: 'd', targetId: 'a', aside: false, from: { x: 130, y: 448 }, to: { x: 130, y: 0 } });
    expect(goesThrough(sampleCurve(backward.curve), others)).toBe(false);
  });

  it('leaves a "no" exit sideways and lands beside a target in the next column without crossing it', () => {
    const nodes = [node('cond', 0, 300), node('before', 320, 100), node('target', 320, 224), node('after', 320, 348)];
    const result = jumpCurve({ direction: 'down', nodes, sourceId: 'cond', targetId: 'target', aside: true, from: { x: 260, y: 338 }, to: { x: 450, y: 224 } });
    const points = sampleCurve(result.curve);
    expect(points[1].x).toBeGreaterThan(points[0].x);
    expect(goesThrough(points, [nodes[1], nodes[3]])).toBe(false);
    expect(goesThrough(points.slice(1, -1), [nodes[2]])).toBe(false);
  });

  it('does the same when the flow runs left to right', () => {
    const column = [node('a', 0, 0, 120, 76), node('b', 160, 0, 120, 76), node('c', 320, 0, 120, 76), node('d', 480, 0, 120, 76)];
    const result = jumpCurve({ direction: 'right', nodes: column, sourceId: 'a', targetId: 'd', aside: false, from: { x: 120, y: 38 }, to: { x: 480, y: 38 } });
    expect(goesThrough(sampleCurve(result.curve), [column[1], column[2]])).toBe(false);
  });
});
