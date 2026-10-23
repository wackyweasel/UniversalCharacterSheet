import { describe, expect, it } from 'vitest';
import type { Widget } from '../types';
import { DEFAULT_AUTO_STACK_SETTINGS, type AutoStackSettings } from './autoStackSettings';
import {
  configureBlock,
  createAutoStackPlan,
  packPlacements,
  placeBlocks,
  placementsToLayouts,
  type MeasuredBlock,
} from './autoStackPlan';

const widget = (id: string, extra: Partial<Widget> = {}) => ({ id, type: 'TEXT', x: 0, y: 0, w: 200, h: 100, ...extra }) as Widget;

function block(id: string, overrides: Partial<MeasuredBlock> = {}): MeasuredBlock {
  const w = overrides.w ?? 200;
  const h = overrides.h ?? 100;
  return {
    id,
    members: [{ widget: widget(id, { w, h }), dx: 0, dy: 0, w, h }],
    x: 0,
    y: 0,
    w,
    h,
    group: false,
    resizable: true,
    keepAspect: false,
    measured: true,
    flowing: true,
    min: { width: 100, height: 50 },
    fillShapes: [],
    measuredShapes: [{ w: 100, h: 200 }, { w: 200, h: 100 }, { w: 400, h: 50 }],
    ...overrides,
  };
}

const settings = (overrides: Partial<AutoStackSettings> = {}): AutoStackSettings => ({ ...DEFAULT_AUTO_STACK_SETTINGS, ...overrides });
const search = { timeBudgetMs: Infinity, maxMoves: 3000 };

describe('configureBlock', () => {
  it('uses the measured shapes and stretches by default', () => {
    const plan = configureBlock(block('a'));
    expect(plan.shapes).toEqual([{ w: 100, h: 200 }, { w: 200, h: 100 }, { w: 400, h: 50 }]);
    expect(plan.stretch).toBe(true);
    expect(plan.checkOverflow).toBe(true);
    expect(plan.growX).toBe(1);
  });

  it('only moves a widget that keeps its size', () => {
    const plan = configureBlock(block('a'), { fixedSize: true });
    expect(plan.resizable).toBe(false);
    expect(plan.shapes).toEqual([{ w: 200, h: 100 }]);
    expect(plan.growX).toBe(0);
    expect(plan.checkOverflow).toBe(false);
  });

  it('never resizes groups or widgets that cannot be resized', () => {
    expect(configureBlock(block('g', { group: true, resizable: false })).shapes).toEqual([{ w: 200, h: 100 }]);
  });

  it('adds smaller shapes, never below the floor, when a scrollbar is allowed', () => {
    const plan = configureBlock(block('a'), { allowScroll: true, maxShrink: 0.5 });
    const smallest = Math.min(...plan.shapes.map((shape) => shape.w * shape.h));
    expect(smallest).toBeLessThan(100 * 200);
    for (const shape of plan.shapes) {
      expect(shape.w).toBeGreaterThanOrEqual(30);
      expect(shape.h).toBeGreaterThanOrEqual(30);
    }
    expect(plan.checkOverflow).toBe(false);
  });

  it('keeps the natural size inside its slot when white space is allowed', () => {
    const plan = configureBlock(block('a'), { allowWhitespace: true });
    expect(plan.stretch).toBe(false);
    expect(plan.growX).toBe(0);
    expect(plan.growY).toBe(0);
  });

  it('turns a position into an anchor', () => {
    const plan = configureBlock(block('a'), { position: 'bottom-right' });
    expect(plan.anchorX).toBe(1);
    expect(plan.anchorY).toBe(1);
    const center = configureBlock(block('a'), { position: 'center' });
    expect(center.anchorX).toBe(0.5);
    expect(center.anchorY).toBe(0.5);
  });
});

describe('placeBlocks', () => {
  it('aligns a block with white space by its anchor inside the slot', () => {
    const blocks = [
      configureBlock(block('a', { measuredShapes: [{ w: 100, h: 100 }] }), { allowWhitespace: true, position: 'bottom-right' }),
    ];
    const [placement] = placeBlocks(blocks, { rects: [{ id: 'a', x: 0, y: 0, w: 300, h: 200 }], width: 300, height: 200, expression: [0] });
    expect(placement).toMatchObject({ x: 200, y: 100, w: 100, h: 100 });
  });

  it('stretches a regular block over its slot', () => {
    const blocks = [configureBlock(block('a'))];
    const [placement] = placeBlocks(blocks, { rects: [{ id: 'a', x: 20, y: 10, w: 300, h: 200 }], width: 320, height: 210, expression: [0] });
    expect(placement).toMatchObject({ x: 20, y: 10, w: 300, h: 200, resized: true });
  });

  it('keeps group members rigid and offset', () => {
    const members = [
      { widget: widget('m1'), dx: 0, dy: 0, w: 100, h: 100 },
      { widget: widget('m2'), dx: 100, dy: 0, w: 100, h: 100 },
    ];
    const grouped = configureBlock(block('group:1', { group: true, resizable: false, members, w: 200, h: 100 }));
    const placements = placeBlocks([grouped], { rects: [{ id: 'group:1', x: 40, y: 20, w: 200, h: 100 }], width: 240, height: 120, expression: [0] });
    expect(placements.map((placement) => [placement.id, placement.x, placement.y, placement.resized])).toEqual([
      ['m1', 40, 20, false],
      ['m2', 140, 20, false],
    ]);
    expect(placementsToLayouts(placements, { x: -50, y: 10 })).toEqual([
      { id: 'm1', x: -10, y: 30 },
      { id: 'm2', x: 90, y: 30 },
    ]);
  });
});

describe('packPlacements', () => {
  const rigid = (id: string, w: number, h: number, options = {}) =>
    configureBlock(block(id, { w, h, measuredShapes: [{ w, h }] }), { fixedSize: true, ...options });
  const overlaps = (a: { x: number; y: number; w: number; h: number }, b: typeof a, gap: number) =>
    a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;

  const place = (blocks: ReturnType<typeof rigid>[], rects: Array<{ id: string; x: number; y: number; w: number; h: number }>) =>
    placeBlocks(blocks, { rects, width: 1000, height: 1000, expression: [0] });

  it('slides rigid widgets into the holes of their slots', () => {
    const blocks = [rigid('a', 100, 100), rigid('b', 100, 100)];
    const placements = place(blocks, [
      { id: 'a', x: 0, y: 0, w: 100, h: 100 },
      { id: 'b', x: 300, y: 200, w: 300, h: 300 },
    ]);
    const packed = packPlacements(blocks, placements, 10);
    expect(packed.placements.find((p) => p.id === 'b')).toMatchObject({ x: 0, y: 110 });
    expect(packed).toMatchObject({ width: 100, height: 210 });
  });

  it('never overlaps and keeps the gap', () => {
    const blocks = [rigid('a', 100, 100), rigid('b', 200, 50), rigid('c', 100, 150), rigid('d', 50, 50)];
    const placements = place(blocks, [
      { id: 'a', x: 0, y: 0, w: 300, h: 300 },
      { id: 'b', x: 400, y: 0, w: 300, h: 100 },
      { id: 'c', x: 0, y: 400, w: 200, h: 200 },
      { id: 'd', x: 500, y: 300, w: 200, h: 200 },
    ]);
    const packed = packPlacements(blocks, placements, 20).placements;
    for (const a of packed) {
      for (const b of packed) {
        if (a !== b) expect(overlaps(a, b, 20)).toBe(false);
      }
      expect(a.x % 10).toBe(0);
      expect(a.y % 10).toBe(0);
    }
  });

  it('keeps group members together', () => {
    const members = [
      { widget: widget('m1'), dx: 0, dy: 0, w: 100, h: 100 },
      { widget: widget('m2'), dx: 100, dy: 0, w: 100, h: 100 },
    ];
    const blocks = [configureBlock(block('group:1', { group: true, resizable: false, members, w: 200, h: 100 }))];
    const placements = place(blocks, [{ id: 'group:1', x: 300, y: 200, w: 200, h: 100 }]);
    const packed = packPlacements(blocks, placements, 10).placements;
    expect(packed.map((p) => [p.id, p.x, p.y])).toEqual([['m1', 0, 0], ['m2', 100, 0]]);
  });

  it('keeps a bottom right widget in the corner', () => {
    const blocks = [rigid('a', 100, 100), rigid('b', 100, 100, { position: 'bottom-right' })];
    const placements = place(blocks, [
      { id: 'a', x: 0, y: 0, w: 100, h: 100 },
      { id: 'b', x: 400, y: 400, w: 100, h: 100 },
    ]);
    const packed = packPlacements(blocks, placements, 10);
    const b = packed.placements.find((p) => p.id === 'b')!;
    expect(b.x + b.w).toBe(packed.width);
    expect(b.y + b.h).toBe(packed.height);
    expect(packed.width).toBeLessThanOrEqual(210);
  });

  it('lets stretching widgets grow into the space that frees up', () => {
    const blocks = [rigid('a', 100, 300), configureBlock(block('b', { measuredShapes: [{ w: 100, h: 100 }] }))];
    const placements = place(blocks, [
      { id: 'a', x: 0, y: 0, w: 100, h: 300 },
      { id: 'b', x: 200, y: 0, w: 100, h: 100 },
    ]);
    const packed = packPlacements(blocks, placements, 10);
    const b = packed.placements.find((p) => p.id === 'b')!;
    expect(b.x).toBe(110);
    expect(b.h).toBe(300);
  });

  it('leaves a fully stretched layout unchanged', () => {
    const blocks = [configureBlock(block('a')), configureBlock(block('b'))];
    const placements = place(blocks, [
      { id: 'a', x: 0, y: 0, w: 200, h: 100 },
      { id: 'b', x: 210, y: 0, w: 200, h: 100 },
    ]);
    expect(packPlacements(blocks, placements, 10)).toMatchObject({ placements, width: 410, height: 100 });
  });
});

describe('createAutoStackPlan', () => {
  const blocks = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => block(id));

  it('is deterministic', () => {
    const first = createAutoStackPlan(blocks, settings({ gap: 0 }), 1.5, {}, search);
    const second = createAutoStackPlan(blocks, settings({ gap: 0 }), 1.5, {}, search);
    expect(second.result.rects).toEqual(first.result.rects);
  });

  it('honours the gap, including none', () => {
    const touching = createAutoStackPlan(blocks, settings({ gap: 0 }), 1.5, {}, search);
    const spaced = createAutoStackPlan(blocks, settings({ gap: 30 }), 1.5, {}, search);
    const rects = (plan: typeof touching) => plan.result.rects;
    const hasTouchingPair = rects(touching).some((a, i) => rects(touching).some((b, j) => j !== i && a.x + a.w === b.x));
    expect(hasTouchingPair).toBe(true);
    for (const a of rects(spaced)) {
      for (const b of rects(spaced)) {
        if (a === b) continue;
        const gapX = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
        const gapY = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
        expect(Math.max(gapX, gapY)).toBeGreaterThanOrEqual(30);
      }
    }
  });

  it('follows the preferred aspect ratio', () => {
    const wide = createAutoStackPlan(blocks, settings({ gap: 10, aspect: 'wide' }), 1, {}, search).result;
    const tall = createAutoStackPlan(blocks, settings({ gap: 10, aspect: 'tall' }), 1, {}, search).result;
    expect(wide.width / wide.height).toBeGreaterThan(tall.width / tall.height);
  });

  it('lets the priorities trade aspect match against packing', () => {
    const skew = (aspect: number) => {
      const { result } = createAutoStackPlan(blocks, settings({ gap: 10, aspect: 'tall', priorities: { aspect, compactness: 50, position: 50, order: 50, size: 0 } }), 1, {}, search);
      return Math.abs(Math.log(result.width / result.height / (9 / 16)));
    };
    expect(skew(100)).toBeLessThanOrEqual(skew(0));
  });

  it('keeps widgets nearer their current size when asked to', () => {
    const sized = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => block(id, { w: 200, h: 100, measuredShapes: [{ w: 100, h: 200 }, { w: 200, h: 100 }, { w: 400, h: 50 }, { w: 100, h: 100 }] }));
    const drift = (size: number) => {
      const { result } = createAutoStackPlan(sized, settings({ gap: 10, aspect: 'tall', priorities: { aspect: 50, compactness: 50, position: 50, order: 50, size } }), 1, {}, search);
      return result.rects.reduce((sum, rect) => sum + Math.abs(Math.log(rect.w / 200)) + Math.abs(Math.log(rect.h / 100)), 0);
    };
    expect(drift(100)).toBeLessThanOrEqual(drift(0));
  });

  it('pulls widgets that want a corner towards it', () => {
    const many = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].map((id) => block(id, { measuredShapes: [{ w: 200, h: 100 }] }));
    const corner = (position: 'top-left' | 'bottom-right') => {
      const plan = createAutoStackPlan(many, settings({ gap: 10, aspect: 'square' }), 1, { i: { position } }, search);
      const rect = plan.result.rects.find((candidate) => candidate.id === 'i')!;
      return { rect, result: plan.result };
    };
    const topLeft = corner('top-left');
    const bottomRight = corner('bottom-right');
    expect(topLeft.rect.x + topLeft.rect.y).toBeLessThan(bottomRight.rect.x + bottomRight.rect.y);
    expect(bottomRight.rect.x + bottomRight.rect.w).toBe(bottomRight.result.width);
    expect(bottomRight.rect.y + bottomRight.rect.h).toBe(bottomRight.result.height);
  });
});
