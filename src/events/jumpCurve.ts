import type { GraphDirection, GraphNode } from './graph';

export interface Point {
  x: number;
  y: number;
}

type Curve = [Point, Point, Point, Point];

/** How far, at most, a jump curve swings out to the side of the line it leaves or enters: enough to clear a node's width, or more. */
const SWINGS = [210, 300];
const SAMPLES = 40;
/** Room a jump curve keeps from the nodes it goes past. */
const CLEARANCE = 10;
/** What a curve that bends away from the straight way costs, so it only does so when that avoids a node. */
const SWING_COST = 400;
const SIDE_ENTRY_COST = 60;

export interface JumpCurveInput {
  direction: GraphDirection;
  nodes: GraphNode[];
  sourceId: string;
  targetId: string;
  /** The jump leaves a condition's "no" exit, which is on the side of the node and not at the end of the flow. */
  aside: boolean;
  from: Point;
  /** Where React Flow ends the link: the top, or the start side, of the target. */
  to: Point;
}

const bezier = ([p0, p1, p2, p3]: Curve, t: number): Point => {
  const u = 1 - t;
  const mix = (name: 'x' | 'y') => u * u * u * p0[name] + 3 * u * u * t * p1[name] + 3 * u * t * t * p2[name] + t * t * t * p3[name];
  return { x: mix('x'), y: mix('y') };
};

/**
 * A jump is a curve from its side to its target, wherever that is, so it reads as different from the tidy flow
 * and never needs room made for it. Several curves are tried, leaving the side's exit and entering the target
 * from before it or from either side, and the one that goes through the fewest nodes, and is the shortest of those, is drawn.
 */
export function jumpCurve({ direction, nodes, sourceId, targetId, aside, from, to }: JumpCurveInput): { path: string; middle: Point; curve: Curve } {
  const down = direction === 'down';
  // Everything is worked out along the flow (main) and across it (cross), then turned into x and y.
  const at = (main: number, cross: number): Point => ({ x: down ? cross : main, y: down ? main : cross });
  const [sm, sc, tm, tc] = down ? [from.y, from.x, to.y, to.x] : [from.x, from.y, to.x, to.y];
  const rectOf = (node: GraphNode) => {
    const [m0, c0, mSize, cSize] = down ? [node.y, node.x, node.height, node.width] : [node.x, node.y, node.width, node.height];
    return { m0, m1: m0 + mSize, c0, c1: c0 + cSize, own: node.id === sourceId || node.id === targetId };
  };
  const rects = nodes.map(rectOf);
  const target = nodes.find((node) => node.id === targetId);
  const box = target ? rectOf(target) : { m0: tm, m1: tm, c0: tc, c1: tc };
  const middleMain = (box.m0 + box.m1) / 2;

  const distance = Math.hypot(tm - sm, tc - sc);
  const reaches = [Math.max(40, Math.min(200, distance / 2)), Math.max(30, Math.min(100, distance / 4))];
  const start = at(sm, sc);
  const candidates: { curve: Curve; bias: number }[] = [];
  for (const reach of reaches) {
    const starts = [
      { point: aside ? at(sm, sc + reach) : at(sm + reach, sc), bias: 0 },
      ...SWINGS.flatMap((swing) => [swing, -swing]).map((swing) => ({ point: aside ? at(sm + swing, sc + reach) : at(sm + reach, sc + swing), bias: SWING_COST })),
    ];
    const ends = [
      {
        end: at(tm, tc),
        controls: [
          { point: at(tm - reach, tc), bias: 0 },
          ...SWINGS.flatMap((swing) => [swing, -swing]).map((swing) => ({ point: at(tm - reach, tc + swing), bias: SWING_COST })),
        ],
      },
      { end: at(middleMain, box.c0), controls: [{ point: at(middleMain, box.c0 - reach), bias: SIDE_ENTRY_COST }] },
      { end: at(middleMain, box.c1), controls: [{ point: at(middleMain, box.c1 + reach), bias: SIDE_ENTRY_COST }] },
    ];
    for (const first of starts) {
      for (const { end, controls } of ends) {
        for (const second of controls) candidates.push({ curve: [start, first.point, second.point, end], bias: first.bias + second.bias });
      }
    }
  }

  const cost = (curve: Curve, bias: number) => {
    let length = 0;
    let hits = 0;
    let previous = curve[0];
    for (let i = 1; i <= SAMPLES; i++) {
      const point = bezier(curve, i / SAMPLES);
      length += Math.hypot(point.x - previous.x, point.y - previous.y);
      previous = point;
      const [main, cross] = down ? [point.y, point.x] : [point.x, point.y];
      // A curve starts and ends at the border of its own nodes, so those are only checked inside.
      const inside = rects.some((rect) => {
        const pad = rect.own ? -4 : CLEARANCE;
        return main > rect.m0 - pad && main < rect.m1 + pad && cross > rect.c0 - pad && cross < rect.c1 + pad;
      });
      if (inside) hits++;
    }
    return hits * 10000 + length + bias;
  };

  let best = candidates[0].curve;
  let bestCost = Infinity;
  for (const { curve, bias } of candidates) {
    const value = cost(curve, bias);
    if (value < bestCost) {
      best = curve;
      bestCost = value;
    }
  }
  const [p0, p1, p2, p3] = best;
  return { path: `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`, middle: bezier(best, 0.5), curve: best };
}

/** The points a curve passes through, for checking where it goes. */
export function sampleCurve(curve: Curve, count = SAMPLES): Point[] {
  return Array.from({ length: count + 1 }, (_, index) => bezier(curve, index / count));
}
