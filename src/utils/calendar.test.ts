import { describe, expect, it } from 'vitest';
import type { WidgetData } from '../types';
import {
  CALENDAR_PRESETS,
  WEEK_KEY,
  createCalendarEngine,
  formatCalendarDate,
  formatCalendarDateTime,
  formatCalendarPattern,
  getAvailableViews,
  getCalendarLabelValues,
  getDayFraction,
  getPeriod,
  getReachedNotes,
  getWeekDays,
  getWeekNumber,
  listStarts,
  passTimeInEffects,
} from './calendar';

function preset(id: string): WidgetData {
  return CALENDAR_PRESETS.find((item) => item.id === id)!.create(new Date(2026, 0, 31)) as WidgetData;
}

const utc = (year: number, month: number, day: number, hour = 0, minute = 0, second = 0) => Date.UTC(year, month, day, hour, minute, second) / 1000;

describe('Gregorian calendar', () => {
  const data: WidgetData = { calendarMode: 'gregorian' };
  const engine = createCalendarEngine(data);

  it('round-trips dates through parts', () => {
    const time = utc(2024, 1, 29, 13, 45, 12);
    const parts = engine.decompose(time);
    expect(parts).toEqual([12, 45, 13, 28, 1, 2024]);
    expect(engine.compose(parts)).toBe(time);
  });

  it('adds months and years like a calendar, keeping the day inside the month', () => {
    expect(engine.add(utc(2023, 0, 31, 8), 'month', 1)).toBe(utc(2023, 1, 28, 8));
    expect(engine.add(utc(2024, 0, 31, 8), 'month', 1)).toBe(utc(2024, 1, 29, 8));
    expect(engine.add(utc(2024, 1, 29), 'year', 1)).toBe(utc(2025, 1, 28));
    expect(engine.add(utc(2024, 0, 15), 'month', -13)).toBe(utc(2022, 11, 15));
    expect(engine.add(utc(2024, 0, 1), WEEK_KEY, 2)).toBe(utc(2024, 0, 15));
  });

  it('finds weekdays for Sunday and Monday starts', () => {
    expect(engine.weekdays[engine.weekdayOf(utc(1970, 0, 1))]).toBe('Thursday');
    const monday = createCalendarEngine({ calendarMode: 'gregorian', calendarWeekStart: 1 });
    expect(monday.weekdays[0]).toBe('Monday');
    expect(monday.weekdayOf(utc(2026, 9, 12))).toBe(0);
  });

  it('formats dates and times', () => {
    const time = utc(2026, 9, 16, 18, 5);
    expect(formatCalendarDateTime(engine, data, time)).toBe('Friday, October 16, 2026 · 18:05');
    expect(formatCalendarPattern(engine, time, '{day:ord} of {month:short}, {weekday:short} {second:2}')).toBe('16th of Oct, Fri 00');
  });

  it('lists the days of a month and a week', () => {
    const february = getPeriod(engine, utc(2024, 1, 10), engine.monthLevel);
    expect(listStarts(engine, february, engine.dayLevel)).toHaveLength(29);
    const week = getWeekDays(engine, data, utc(2026, 9, 16));
    expect(week.map((day) => engine.decompose(day)[3] + 1)).toEqual([11, 12, 13, 14, 15, 16, 17]);
  });

  it('supports dates before 1970', () => {
    const time = utc(1492, 9, 12, 6);
    expect(engine.decompose(time)).toEqual([0, 0, 6, 11, 9, 1492]);
  });
});

describe('custom units', () => {
  it('carries quarter days into days and restarts weeks every month', () => {
    const data = preset('quarter-days');
    const engine = createCalendarEngine(data);
    expect(engine.units.map((unit) => unit.key)).toEqual(['quarter', 'day', 'month', 'year']);
    expect(formatCalendarDateTime(engine, data, data.calendarTime!)).toBe('Oneday, Day 1, Month 1, Year 1 · Morning');

    const later = engine.add(data.calendarTime!, 'quarter', 5);
    expect(engine.decompose(later)).toEqual([1, 1, 0, 0]);
    expect(formatCalendarDateTime(engine, data, later)).toBe('Twoday, Day 2, Month 1, Year 1 · Afternoon');

    const secondMonth = engine.add(data.calendarTime!, 'month', 1);
    expect(engine.weekdayOf(secondMonth)).toBe(0);
    expect(getWeekNumber(engine, data, engine.add(secondMonth, 'day', 25))).toBe(3);
    expect(getAvailableViews(engine)).toEqual(['clock', 'year', 'month', 'week', 'day']);
  });

  it('handles months of different lengths', () => {
    const data = preset('fantasy');
    const engine = createCalendarEngine(data);
    const year = getPeriod(engine, data.calendarTime!, engine.yearLevel);
    expect(listStarts(engine, year, engine.dayLevel, 1000)).toHaveLength(13 * 28 + 1);
    expect(listStarts(engine, year, engine.monthLevel)).toHaveLength(14);

    const lateYearsend = engine.compose([0, 0, 12, 19, 12, 999]);
    const festival = engine.add(lateYearsend, 'month', 1);
    expect(engine.decompose(festival)).toEqual([0, 0, 12, 0, 13, 999]);
    expect(formatCalendarDate(engine, data, festival)).toContain("1st of Year's Day, Year 1000");
    expect(engine.decompose(engine.add(festival, 'month', 1))).toEqual([0, 0, 12, 0, 0, 1000]);
    expect(engine.decompose(engine.add(festival, 'month', -14))).toEqual([0, 0, 12, 0, 13, 998]);
  });

  it('decomposes times before the first year', () => {
    const data = preset('elapsed');
    const engine = createCalendarEngine(data);
    expect(engine.decompose(-1)).toEqual([59, 59, 23, -1]);
    expect(getDayFraction(engine, 6 * 3600)).toBe(0.25);
  });

  it('exposes labelled values for formulas', () => {
    const data: WidgetData = {
      ...preset('fantasy'),
      calendarLabels: { 'unit:day': 'day', 'name:month': 'month_name', weekdayName: 'weekday', date: 'date', 'unit:year': 'year' },
    };
    expect(getCalendarLabelValues(data)).toEqual({
      day: 1,
      month_name: 'Deepfrost',
      weekday: expect.any(String),
      date: expect.stringContaining('Deepfrost, Year 1000'),
      year: 1000,
    });
  });
});

describe('notes and temporary effects', () => {
  it('finds notes reached while moving forward', () => {
    const notes = [{ id: 'a', time: 10, title: 'A' }, { id: 'b', time: 20, title: 'B' }];
    expect(getReachedNotes(notes, 5, 10).map((note) => note.id)).toEqual(['a']);
    expect(getReachedNotes(notes, 10, 30).map((note) => note.id)).toEqual(['b']);
    expect(getReachedNotes(notes, 30, 0)).toEqual([]);
  });

  it('passes seconds or whole rounds', () => {
    const effects = [{ name: 'Bless', remainingSeconds: 60 }, { name: 'Haste', remainingSeconds: 12 }];
    expect(passTimeInEffects(effects, 12, false, 6)).toMatchObject({ expired: ['Haste'], amount: 12 });
    expect(passTimeInEffects(effects, 13, true, 6).effects.map((effect) => effect.remainingSeconds)).toEqual([58, 10]);
    expect(passTimeInEffects(effects, 5, true, 6).amount).toBe(0);
  });
});
