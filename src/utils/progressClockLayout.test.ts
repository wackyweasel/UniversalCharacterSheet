import { describe, expect, it } from 'vitest';
import { getProgressClockGrid } from './progressClockLayout';

const clocks = (count: number, extra: object = {}) => ({
  clockItems: Array.from({ length: count }, (_, index) => ({ id: String(index), name: '', segments: 6, value: 0 })),
  ...extra,
});

describe('progress clock dynamic grid', () => {
  it('stacks vertical clocks in a single column', () => {
    expect(getProgressClockGrid({ ...clocks(4), clockLayout: 'vertical' }, 300, 600)).toMatchObject({ columns: 1, rows: 4 });
  });

  it('keeps horizontal clocks in a single row', () => {
    expect(getProgressClockGrid({ ...clocks(4), clockLayout: 'horizontal' }, 120, 600)).toMatchObject({ columns: 4, rows: 1 });
  });

  it('lets auto arrangement wrap clocks into more columns when the widget is wide', () => {
    expect(getProgressClockGrid({ ...clocks(4), clockLayout: 'auto' }, 600, 150).columns).toBeGreaterThan(1);
    expect(getProgressClockGrid({ ...clocks(4), clockLayout: 'auto' }, 120, 600).columns).toBe(1);
  });

  it('defaults to auto arrangement when no layout is set', () => {
    expect(getProgressClockGrid(clocks(4), 600, 150)).toEqual(getProgressClockGrid({ ...clocks(4), clockLayout: 'auto' }, 600, 150));
  });

  it('reserves height for labels and values', () => {
    const plain = getProgressClockGrid({ ...clocks(1), clockLayout: 'auto' }, 200, 200).style;
    const labelled = getProgressClockGrid({ clockItems: [{ id: '0', name: 'Alarm', segments: 6, value: 0 }], clockLayout: 'auto', clockShowValues: true }, 200, 200).style;
    expect(labelled['--clock-size' as keyof typeof labelled]).not.toBe(plain['--clock-size' as keyof typeof plain]);
  });
});
