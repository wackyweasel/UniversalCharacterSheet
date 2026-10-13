import { describe, expect, it } from 'vitest';
import { computeAutoStackLayout, normalizeShapes, type AutoStackItem, type AutoStackRect } from './autoStackLayout';

const options = { gap: 10, grid: 10, targetAspect: 1, timeBudgetMs: Infinity, maxMoves: 4000, seed: 7, now: () => 0 };

const rigid = (id: string, w: number, h: number): AutoStackItem => ({ id, shapes: [{ w, h }], growX: 0, growY: 0 });

// Text-like block: height shrinks as width grows, area roughly constant.
const text = (id: string, area: number): AutoStackItem => ({
  id,
  shapes: [100, 150, 200, 250, 300, 400].map((w) => ({ w, h: Math.ceil(area / w / 10) * 10 })),
  growX: 1,
  growY: 1,
});

function overlaps(a: AutoStackRect, b: AutoStackRect) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function expectValidLayout(items: AutoStackItem[], result: ReturnType<typeof computeAutoStackLayout>) {
  expect(result.rects).toHaveLength(items.length);
  for (const rect of result.rects) {
    expect(rect.x % 10).toBe(0);
    expect(rect.y % 10).toBe(0);
    expect(rect.x + rect.w).toBeLessThanOrEqual(result.width);
    expect(rect.y + rect.h).toBeLessThanOrEqual(result.height);
    const item = items.find((candidate) => candidate.id === rect.id)!;
    // The slot fits at least one of the item's shapes.
    expect(item.shapes.some((shape) => shape.w <= rect.w && shape.h <= rect.h)).toBe(true);
  }
  for (let i = 0; i < result.rects.length; i++) {
    for (let j = i + 1; j < result.rects.length; j++) {
      expect(overlaps(result.rects[i], result.rects[j])).toBe(false);
    }
  }
}

describe('auto stack layout', () => {
  it('keeps only Pareto-optimal shapes', () => {
    expect(normalizeShapes([{ w: 200, h: 100 }, { w: 100, h: 200 }, { w: 150, h: 200 }, { w: 300, h: 100 }])).toEqual([100, 200, 200, 100]);
  });

  it('packs equal squares into a gapless grid', () => {
    const items = ['a', 'b', 'c', 'd'].map((id) => rigid(id, 100, 100));
    const result = computeAutoStackLayout(items, options);
    expectValidLayout(items, result);
    expect(result.width).toBe(210);
    expect(result.height).toBe(210);
  });

  it('stretches shorter neighbours so side-by-side slots share their height', () => {
    const items = [
      { id: 'tall', shapes: [{ w: 100, h: 200 }], growX: 1, growY: 1 },
      { id: 'short', shapes: [{ w: 100, h: 120 }], growX: 1, growY: 1 },
    ];
    const result = computeAutoStackLayout(items, { ...options, targetAspect: 1.05 });
    expectValidLayout(items, result);
    const [first, second] = result.rects;
    expect(first.h).toBe(second.h);
    expect(result.width).toBe(210);
  });

  it('gives spare height to growable items before rigid ones', () => {
    const items = [
      { id: 'image', shapes: [{ w: 200, h: 200 }], growX: 0, growY: 0 },
      { id: 'counter', shapes: [{ w: 100, h: 60 }], growX: 1, growY: 0.1 },
      { id: 'notes', shapes: [{ w: 100, h: 80 }], growX: 1, growY: 1 },
    ];
    const result = computeAutoStackLayout(items, { ...options, targetAspect: 1.5, orderWeight: 0 });
    expectValidLayout(items, result);
    const counter = result.rects.find((rect) => rect.id === 'counter')!;
    const notes = result.rects.find((rect) => rect.id === 'notes')!;
    expect(result.height).toBe(200);
    expect(counter.h + notes.h + 10).toBe(200);
    expect(notes.h - 80).toBeGreaterThan(counter.h - 60);
  });

  it('packs mixed soft blocks densely and deterministically', () => {
    const items = [
      text('t1', 30000),
      text('t2', 52000),
      rigid('img', 180, 200),
      text('t3', 18000),
      text('t4', 40000),
      rigid('dice', 120, 130),
      text('t5', 24000),
      text('t6', 60000),
    ];
    const first = computeAutoStackLayout(items, { ...options, targetAspect: 1.4 });
    const second = computeAutoStackLayout(items, { ...options, targetAspect: 1.4 });
    expectValidLayout(items, first);
    expect(second.rects).toEqual(first.rects);
    const contentArea = items.reduce((sum, item) => sum + Math.min(...item.shapes.map((shape) => shape.w * shape.h)), 0);
    expect(contentArea / (first.width * first.height)).toBeGreaterThan(0.8);
  });
});
