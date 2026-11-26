import { describe, expect, it } from 'vitest';
import { compressToBudget, dataUrlBytes } from './gridMapTokens';

function webp(bytes: number): string {
  return `data:image/webp;base64,${'A'.repeat(Math.ceil((bytes * 4) / 3))}`;
}

describe('compressToBudget', () => {
  it('keeps the best quality when it already fits', () => {
    const calls: Array<[number, number]> = [];
    const result = compressToBudget((scale, quality) => {
      calls.push([scale, quality]);
      return webp(100);
    }, 1000);

    expect(dataUrlBytes(result)).toBeLessThanOrEqual(1000);
    expect(calls).toEqual([[1, 0.88]]);
  });

  it('lowers quality before resolution', () => {
    const result = compressToBudget((_scale, quality) => webp(quality >= 0.88 ? 2000 : 500), 1000);

    expect(dataUrlBytes(result)).toBeLessThanOrEqual(1000);
  });

  it('lowers resolution when quality alone is not enough', () => {
    const scales: number[] = [];
    const result = compressToBudget((scale) => {
      scales.push(scale);
      return webp(scale < 0.7 ? 500 : 5000);
    }, 1000);

    expect(dataUrlBytes(result)).toBeLessThanOrEqual(1000);
    expect(Math.min(...scales)).toBeLessThan(0.7);
  });

  it('returns the smallest result instead of failing when nothing fits', () => {
    const result = compressToBudget((scale) => webp(Math.round(10_000 * scale)), 10);

    expect(dataUrlBytes(result)).toBeLessThan(10_000);
    expect(dataUrlBytes(result)).toBeGreaterThan(10);
  });

  it('does not retry qualities for formats that ignore quality', () => {
    let calls = 0;
    compressToBudget(() => {
      calls += 1;
      return `data:image/png;base64,${'A'.repeat(4000)}`;
    }, 100);

    expect(calls).toBe(6);
  });
});
