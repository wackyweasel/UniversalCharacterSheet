import { describe, expect, it } from 'vitest';
import { placeTableToolbar, type TableBounds } from './tableToolbar';

const bounds = (left: number, top: number, width: number, height: number): TableBounds =>
  ({ left, right: left + width, top, bottom: top + height, width, height });
const preferred = { x: 100, y: 100 };
const gap = 8;

function overlap(rects: TableBounds[], point: { x: number; y: number }, width: number, height: number) {
  return rects.reduce((area, rect) => area +
    Math.max(0, Math.min(point.x + width, rect.right + gap) - Math.max(point.x, rect.left - gap)) *
    Math.max(0, Math.min(point.y + height, rect.bottom + gap) - Math.max(point.y, rect.top - gap)), 0);
}

function expectInside(point: { x: number; y: number }, width: number, height: number,
  viewportWidth: number, viewportHeight: number) {
  expect(point.x).toBeGreaterThanOrEqual(gap);
  expect(point.y).toBeGreaterThanOrEqual(gap);
  expect(point.x + width).toBeLessThanOrEqual(viewportWidth - gap);
  expect(point.y + height).toBeLessThanOrEqual(viewportHeight - gap);
}

describe('placeTableToolbar', () => {
  it.each([
    { name: 'top-left corner', rect: bounds(8, 8, 90, 50) },
    { name: 'top-right corner', rect: bounds(222, 8, 90, 50) },
    { name: 'bottom-left corner', rect: bounds(8, 182, 90, 50) },
    { name: 'bottom-right corner', rect: bounds(222, 182, 90, 50) },
    { name: 'full-width selection', rect: bounds(8, 90, 304, 50) },
    { name: 'full-height selection', rect: bounds(130, 8, 60, 224) },
    { name: 'partially offscreen selection', rect: bounds(-30, -20, 120, 70) },
  ])('avoids selection and stays in the viewport near the $name', ({ rect }) => {
    const point = placeTableToolbar([rect], 100, 60, 320, 240, preferred);
    expectInside(point, 100, 60, 320, 240);
    expect(overlap([rect], point, 100, 60)).toBe(0);
  });

  it('uses a disconnected selection gap instead of treating the overall bounding box as occupied', () => {
    const rects = [bounds(8, 8, 32, 144), bounds(136, 8, 112, 144)];
    const point = placeTableToolbar(rects, 80, 60, 256, 160, preferred);
    expectInside(point, 80, 60, 256, 160);
    expect(overlap(rects, point, 80, 60)).toBe(0);
    expect(point.x).toBe(48);
  });

  it('finds an internal gap between disconnected rows when outside placement cannot fit', () => {
    const rects = [bounds(8, 8, 224, 32), bounds(8, 136, 224, 112)];
    const point = placeTableToolbar(rects, 100, 80, 240, 256, preferred);
    expectInside(point, 100, 80, 240, 256);
    expect(overlap(rects, point, 100, 80)).toBe(0);
    expect(point.y).toBe(48);
  });

  it.each([
    { name: 'one large selection', rects: [bounds(40, 24, 80, 72)], width: 110, height: 86 },
    { name: 'disconnected selection', rects: [bounds(8, 8, 56, 36), bounds(90, 56, 60, 56)], width: 100, height: 80 },
    { name: 'toolbar filling available viewport', rects: [bounds(40, 24, 80, 72)], width: 144, height: 104 },
  ])('minimizes unavoidable overlap for oversized toolbar: $name', ({ rects, width, height }) => {
    const point = placeTableToolbar(rects, width, height, 160, 120, preferred);
    expectInside(point, width, height, 160, 120);
    let minimum = Infinity;
    for (let x = gap; x <= 160 - width - gap; x++)
      for (let y = gap; y <= 120 - height - gap; y++)
        minimum = Math.min(minimum, overlap(rects, { x, y }, width, height));
    expect(minimum).toBeGreaterThan(0);
    expect(overlap(rects, point, width, height)).toBe(minimum);
  });

  it.each([
    { preferred: { x: 40, y: 50 }, expected: { x: 40, y: 50 } },
    { preferred: { x: -100, y: -50 }, expected: { x: 8, y: 8 } },
    { preferred: { x: 1000, y: 1000 }, expected: { x: 212, y: 172 } },
    { preferred: { x: -100, y: 1000 }, expected: { x: 8, y: 172 } },
  ])('clamps the preferred position when nothing is selected: $preferred', ({ preferred, expected }) => {
    expect(placeTableToolbar([], 100, 60, 320, 240, preferred)).toEqual(expected);
  });

  it('anchors at the margin rather than returning negative positions for a toolbar larger than the viewport', () => {
    const point = placeTableToolbar([bounds(10, 10, 40, 20)], 400, 300, 160, 120, { x: -100, y: -100 });
    expect(point).toEqual({ x: 8, y: 8 });
    expect(placeTableToolbar([], 400, 300, 160, 120, preferred)).toEqual(point);
  });

  it('coalesces adjacent cells without mutating the input rectangles or changing placement', () => {
    const rects = [
      bounds(120, 90, 40, 30), bounds(80, 60, 40, 30),
      bounds(80, 90, 40, 30), bounds(120, 60, 40, 30),
    ];
    const original = structuredClone(rects);
    const point = placeTableToolbar(rects, 100, 40, 320, 240, preferred);
    expect(point).toEqual(placeTableToolbar([bounds(80, 60, 80, 60)], 100, 40, 320, 240, preferred));
    expect(overlap(rects, point, 100, 40)).toBe(0);
    expect(rects).toEqual(original);
  });
});
