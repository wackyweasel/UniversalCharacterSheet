import { describe, expect, it } from 'vitest';
import type { Widget } from '../types';
import { DEFAULT_AUTO_STACK_SETTINGS, type AutoStackSettings } from './autoStackSettings';
import {
  configureBlock,
  createAutoStackPlan,
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
