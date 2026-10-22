// Auto-stack packing: a slicing floorplan of soft blocks optimised by simulated annealing.
// Each block offers minimal (width, height) shapes; the layout tree combines them side by side
// or stacked, and the final slots are stretched so neighbours share edges with uniform gaps.

export interface AutoStackShape {
  w: number;
  h: number;
}

export interface AutoStackItem {
  id: string;
  // Minimal sizes without overflow. Wider slots reuse the height of the widest shape that fits.
  shapes: AutoStackShape[];
  // Relative share of spare width/height this item absorbs; 0 keeps its natural size when possible.
  growX: number;
  growY: number;
  // Preferred place in the whole layout per axis: 0 = start (left/top), 0.5 = middle, 1 = end. Undefined = no preference.
  anchorX?: number;
  anchorY?: number;
}

export interface AutoStackOptions {
  gap: number;
  grid: number;
  // Preferred width / height of the whole layout.
  targetAspect: number;
  aspectWeight?: number;
  // Penalty for each anchored item that ends up away from its preferred place (0 = ignore anchors).
  positionWeight?: number;
  // Penalty for reordering items away from their input order (0 = ignore order).
  orderWeight?: number;
  timeBudgetMs?: number;
  maxMoves?: number;
  seed?: number;
  now?: () => number;
}

export interface AutoStackRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AutoStackResult {
  rects: AutoStackRect[];
  width: number;
  height: number;
  expression: number[];
}

// Curves are flat [w0, h0, w1, h1, ...] lists with widths ascending and heights strictly descending.
type Curve = number[];

const SIDE_BY_SIDE = -1;
const STACKED = -2;
const SEARCH_CURVE_LIMIT = 24;
const MAX_ANNEALING_RUNS = 32;

export function normalizeShapes(shapes: AutoStackShape[]): Curve {
  const sorted = shapes
    .filter((shape) => Number.isFinite(shape.w) && Number.isFinite(shape.h) && shape.w > 0 && shape.h > 0)
    .sort((a, b) => a.w - b.w || a.h - b.h);
  const curve: Curve = [];
  for (const shape of sorted) {
    if (curve.length === 0 || shape.h < curve[curve.length - 1]) curve.push(shape.w, shape.h);
  }
  return curve;
}

function pruneCurve(curve: Curve, limit: number): Curve {
  const count = curve.length / 2;
  if (count <= limit) return curve;
  const pruned: Curve = [];
  for (let k = 0; k < limit; k++) {
    const index = Math.round((k * (count - 1)) / (limit - 1)) * 2;
    pruned.push(curve[index], curve[index + 1]);
  }
  return pruned;
}

function combineSideBySide(a: Curve, b: Curve, gap: number, limit: number): Curve {
  const out: Curve = [];
  let i = 0;
  let j = 0;
  for (;;) {
    const ha = a[i + 1];
    const hb = b[j + 1];
    out.push(a[i] + gap + b[j], ha > hb ? ha : hb);
    if (ha > hb) {
      i += 2;
      if (i >= a.length) break;
    } else if (hb > ha) {
      j += 2;
      if (j >= b.length) break;
    } else {
      if (i + 2 >= a.length || j + 2 >= b.length) break;
      i += 2;
      j += 2;
    }
  }
  return pruneCurve(out, limit);
}

function combineStacked(a: Curve, b: Curve, gap: number, limit: number): Curve {
  const reversed: Curve = [];
  let i = a.length - 2;
  let j = b.length - 2;
  for (;;) {
    const wa = a[i];
    const wb = b[j];
    reversed.push(wa > wb ? wa : wb, a[i + 1] + gap + b[j + 1]);
    if (wa > wb) {
      i -= 2;
      if (i < 0) break;
    } else if (wb > wa) {
      j -= 2;
      if (j < 0) break;
    } else {
      if (i === 0 || j === 0) break;
      i -= 2;
      j -= 2;
    }
  }
  const out: Curve = [];
  for (let k = reversed.length - 2; k >= 0; k -= 2) out.push(reversed[k], reversed[k + 1]);
  return pruneCurve(out, limit);
}

// Smallest height among shapes no wider than `width`.
function minHeightAt(curve: Curve, width: number): number {
  let height = Infinity;
  for (let k = 0; k < curve.length && curve[k] <= width; k += 2) height = curve[k + 1];
  return height;
}

// Narrowest shape no taller than `height`.
function minWidthAt(curve: Curve, height: number): number {
  for (let k = 0; k < curve.length; k += 2) {
    if (curve[k + 1] <= height) return curve[k];
  }
  return Infinity;
}

function evaluateCurve(expression: number[], leaves: Curve[], gap: number, limit: number): Curve {
  const stack: Curve[] = [];
  for (const token of expression) {
    if (token >= 0) {
      stack.push(leaves[token]);
      continue;
    }
    const right = stack.pop()!;
    const left = stack.pop()!;
    stack.push(token === SIDE_BY_SIDE
      ? combineSideBySide(left, right, gap, limit)
      : combineStacked(left, right, gap, limit));
  }
  return stack[0];
}

function shapeCost(w: number, h: number, targetAspect: number, aspectWeight: number) {
  const skew = Math.log(w / h / targetAspect);
  return w * h * (1 + aspectWeight * skew * skew);
}

function bestRootPoint(curve: Curve, targetAspect: number, aspectWeight: number) {
  let best = { w: curve[0], h: curve[1], cost: Infinity };
  for (let k = 0; k < curve.length; k += 2) {
    const cost = shapeCost(curve[k], curve[k + 1], targetAspect, aspectWeight);
    if (cost < best.cost) best = { w: curve[k], h: curve[k + 1], cost };
  }
  return best;
}

function isValidExpression(expression: number[]) {
  let operands = 0;
  for (let k = 0; k < expression.length; k++) {
    const token = expression[k];
    if (token >= 0) {
      operands += 1;
    } else {
      if (k - operands + 1 >= operands) return false;
      if (k > 0 && expression[k - 1] === token) return false;
    }
  }
  return true;
}

// Columns of items in input order, each column stacked, columns placed side by side.
function initialExpression(curves: Curve[], gap: number, targetAspect: number): number[] {
  const count = curves.length;
  let area = 0;
  let width = 0;
  for (const curve of curves) {
    const mid = Math.floor(curve.length / 4) * 2;
    area += (curve[mid] + gap) * (curve[mid + 1] + gap);
    width += curve[mid] + gap;
  }
  const targetWidth = Math.sqrt(area * targetAspect);
  const columns = Math.max(1, Math.min(count, Math.round(targetWidth / (width / count))));
  const perColumn = Math.ceil(count / columns);
  const expression: number[] = [];
  let built = 0;
  for (let start = 0; start < count; start += perColumn) {
    const end = Math.min(count, start + perColumn);
    for (let index = start; index < end; index++) {
      expression.push(index);
      if (index > start) expression.push(STACKED);
    }
    built += 1;
    if (built > 1) expression.push(SIDE_BY_SIDE);
  }
  return expression;
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Wong-Liu moves on a normalized Polish expression; returns false when no valid move was made.
function perturb(expression: number[], random: () => number): boolean {
  const kind = random();
  if (kind < 0.4) {
    const operandPositions: number[] = [];
    expression.forEach((token, index) => {
      if (token >= 0) operandPositions.push(index);
    });
    if (operandPositions.length < 2) return false;
    const k = Math.floor(random() * (operandPositions.length - 1));
    const p = operandPositions[k];
    const q = operandPositions[k + 1];
    [expression[p], expression[q]] = [expression[q], expression[p]];
    return true;
  }
  if (kind < 0.7) {
    const operatorPositions: number[] = [];
    expression.forEach((token, index) => {
      if (token < 0) operatorPositions.push(index);
    });
    if (operatorPositions.length === 0) return false;
    let start = operatorPositions[Math.floor(random() * operatorPositions.length)];
    while (start > 0 && expression[start - 1] < 0) start -= 1;
    for (let index = start; index < expression.length && expression[index] < 0; index++) {
      expression[index] = expression[index] === SIDE_BY_SIDE ? STACKED : SIDE_BY_SIDE;
    }
    return true;
  }
  for (let attempt = 0; attempt < 8; attempt++) {
    const index = Math.floor(random() * (expression.length - 1));
    if ((expression[index] >= 0) === (expression[index + 1] >= 0)) continue;
    [expression[index], expression[index + 1]] = [expression[index + 1], expression[index]];
    if (isValidExpression(expression)) return true;
    [expression[index], expression[index + 1]] = [expression[index + 1], expression[index]];
  }
  return false;
}

interface LayoutNode {
  item: number;
  curve: Curve;
  growX: number;
  growY: number;
  left?: LayoutNode;
  right?: LayoutNode;
  operator?: number;
}

function buildTree(expression: number[], items: AutoStackItem[], leaves: Curve[], gap: number, limit = Infinity): LayoutNode {
  const stack: LayoutNode[] = [];
  for (const token of expression) {
    if (token >= 0) {
      stack.push({ item: token, curve: leaves[token], growX: items[token].growX, growY: items[token].growY });
      continue;
    }
    const right = stack.pop()!;
    const left = stack.pop()!;
    const sideBySide = token === SIDE_BY_SIDE;
    stack.push({
      item: -1,
      operator: token,
      left,
      right,
      curve: sideBySide
        ? combineSideBySide(left.curve, right.curve, gap, limit)
        : combineStacked(left.curve, right.curve, gap, limit),
      growX: sideBySide ? left.growX + right.growX : Math.max(left.growX, right.growX),
      growY: sideBySide ? Math.max(left.growY, right.growY) : left.growY + right.growY,
    });
  }
  return stack[0];
}

// How far (0 to 1) a slot is from the place an item wants along one axis.
function axisMiss(anchor: number, start: number, size: number, total: number) {
  if (total <= 0) return 0;
  if (anchor <= 0) return start / total;
  if (anchor >= 1) return (total - start - size) / total;
  return (Math.abs(start + size / 2 - total / 2) / total) * 2;
}

function splitSpare(spare: number, growA: number, growB: number, sizeA: number, sizeB: number, grid: number) {
  const weightA = growA + growB > 0 ? growA : sizeA;
  const weightB = growA + growB > 0 ? growB : sizeB;
  const share = Math.round((spare * weightA) / (weightA + weightB) / grid) * grid;
  return Math.max(0, Math.min(spare, share));
}

function assignSlots(
  node: LayoutNode,
  x: number,
  y: number,
  w: number,
  h: number,
  gap: number,
  grid: number,
  items: AutoStackItem[],
  rects: AutoStackRect[],
) {
  if (!node.left || !node.right) {
    rects.push({ id: items[node.item].id, x, y, w, h });
    return;
  }
  const { left, right } = node;
  if (node.operator === SIDE_BY_SIDE) {
    const leftWidth = minWidthAt(left.curve, h);
    const rightWidth = minWidthAt(right.curve, h);
    const spare = Math.max(0, w - gap - leftWidth - rightWidth);
    const leftShare = splitSpare(spare, left.growX, right.growX, leftWidth, rightWidth, grid);
    const finalLeftWidth = leftWidth + leftShare;
    assignSlots(left, x, y, finalLeftWidth, h, gap, grid, items, rects);
    assignSlots(right, x + finalLeftWidth + gap, y, w - gap - finalLeftWidth, h, gap, grid, items, rects);
    return;
  }
  const topHeight = minHeightAt(left.curve, w);
  const bottomHeight = minHeightAt(right.curve, w);
  const spare = Math.max(0, h - gap - topHeight - bottomHeight);
  const topShare = splitSpare(spare, left.growY, right.growY, topHeight, bottomHeight, grid);
  const finalTopHeight = topHeight + topShare;
  assignSlots(left, x, y, w, finalTopHeight, gap, grid, items, rects);
  assignSlots(right, x, y + finalTopHeight + gap, w, h - gap - finalTopHeight, gap, grid, items, rects);
}

export function computeAutoStackLayout(items: AutoStackItem[], options: AutoStackOptions): AutoStackResult {
  const {
    gap,
    grid,
    targetAspect,
    aspectWeight = 1,
    positionWeight = 1.2,
    orderWeight = 0.05,
    timeBudgetMs = 400,
    maxMoves = Infinity,
    seed = 1,
    now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  } = options;
  if (items.length === 0) return { rects: [], width: 0, height: 0, expression: [] };

  const leaves = items.map((item) => {
    const curve = normalizeShapes(item.shapes);
    if (curve.length === 0) throw new Error(`Auto stack item ${item.id} has no valid shape`);
    return curve;
  });
  const random = mulberry32(seed);
  let contentArea = 0;
  for (const curve of leaves) {
    let smallest = Infinity;
    for (let k = 0; k < curve.length; k += 2) smallest = Math.min(smallest, curve[k] * curve[k + 1]);
    contentArea += smallest;
  }

  const orderPenalty = (expression: number[]) => {
    if (orderWeight === 0) return 0;
    let displacement = 0;
    let position = 0;
    for (const token of expression) {
      if (token < 0) continue;
      displacement += Math.abs(token - position);
      position += 1;
    }
    return (orderWeight * displacement) / Math.max(1, items.length * items.length / 2);
  };
  const hasAnchors = positionWeight > 0 && items.some((item) => item.anchorX !== undefined || item.anchorY !== undefined);
  const itemById = new Map(items.map((item) => [item.id, item]));
  const positionPenalty = (rects: AutoStackRect[], width: number, height: number) => {
    let miss = 0;
    for (const rect of rects) {
      const item = itemById.get(rect.id)!;
      if (item.anchorX !== undefined) miss += axisMiss(item.anchorX, rect.x, rect.w, width);
      if (item.anchorY !== undefined) miss += axisMiss(item.anchorY, rect.y, rect.h, height);
    }
    return positionWeight * miss;
  };
  const cost = (expression: number[]) => {
    if (!hasAnchors) {
      const curve = evaluateCurve(expression, leaves, gap, SEARCH_CURVE_LIMIT);
      return bestRootPoint(curve, targetAspect, aspectWeight).cost / contentArea + orderPenalty(expression);
    }
    const root = buildTree(expression, items, leaves, gap, SEARCH_CURVE_LIMIT);
    const point = bestRootPoint(root.curve, targetAspect, aspectWeight);
    const rects: AutoStackRect[] = [];
    assignSlots(root, 0, 0, point.w, point.h, gap, grid, items, rects);
    return point.cost / contentArea + orderPenalty(expression) + positionPenalty(rects, point.w, point.h);
  };

  let current = initialExpression(leaves, gap, targetAspect);
  let currentCost = cost(current);
  let best = current.slice();
  let bestCost = currentCost;

  if (items.length > 1) {
    const start = now();
    let uphill = 0;
    let uphillCount = 0;
    const probe = current.slice();
    let probeCost = currentCost;
    const sampleMoves = 60;
    for (let k = 0; k < sampleMoves; k++) {
      if (!perturb(probe, random)) continue;
      const next = cost(probe);
      if (next > probeCost) {
        uphill += next - probeCost;
        uphillCount += 1;
      }
      probeCost = next;
    }
    const initialTemperature = uphillCount > 0 ? (uphill / uphillCount) / -Math.log(0.85) : 0.1;
    // Size each cooling schedule (~65 steps of 0.9) to a quarter of the time budget.
    const elapsed = Math.max(0.001, now() - start);
    const affordableMoves = Math.min(maxMoves, (sampleMoves * timeBudgetMs) / elapsed);
    const movesPerTemperature = Math.max(20, Math.min(items.length * 400, Math.floor(affordableMoves / 260)));
    let moves = 0;
    let outOfTime = false;
    // Repeated annealing runs, each reheating from the best layout found so far.
    for (let run = 0; run < MAX_ANNEALING_RUNS && !outOfTime && moves < maxMoves; run++) {
      if (run > 0) {
        current = best.slice();
        currentCost = bestCost;
      }
      let temperature = initialTemperature * (run === 0 ? 1 : 0.3);
      while (!outOfTime && temperature > initialTemperature * 1e-3 && moves < maxMoves) {
        let accepted = 0;
        for (let k = 0; k < movesPerTemperature && moves < maxMoves; k++) {
          moves += 1;
          const candidate = current.slice();
          if (!perturb(candidate, random)) continue;
          const candidateCost = cost(candidate);
          const delta = candidateCost - currentCost;
          if (delta <= 0 || random() < Math.exp(-delta / temperature)) {
            current = candidate;
            currentCost = candidateCost;
            accepted += 1;
            if (currentCost < bestCost - 1e-9) {
              best = current.slice();
              bestCost = currentCost;
            }
          }
          if ((moves & 63) === 0 && now() - start > timeBudgetMs) {
            outOfTime = true;
            break;
          }
        }
        if (accepted === 0 && temperature < initialTemperature * 0.05) break;
        temperature *= 0.9;
      }
    }
  }

  const root = buildTree(best, items, leaves, gap);
  const point = bestRootPoint(root.curve, targetAspect, aspectWeight);
  const rects: AutoStackRect[] = [];
  assignSlots(root, 0, 0, point.w, point.h, gap, grid, items, rects);
  return { rects, width: point.w, height: point.h, expression: best };
}
