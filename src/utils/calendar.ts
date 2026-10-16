import { v4 as uuidv4 } from 'uuid';
import type { CalendarNote, CalendarStep, CalendarUnit, CalendarViewId, TimedEffect, WidgetData } from '../types';
import type { FormulaValue } from './formulaSyntax';

export interface EngineUnit {
  key: string;
  name: string;
  plural: string;
  /** Name used in display formats, e.g. {hour:2}. */
  token: string;
  startAt: number;
  names?: string[];
}

export interface CalendarEngine {
  kind: 'gregorian' | 'custom';
  /** Smallest first. */
  units: EngineUnit[];
  dayLevel: number;
  monthLevel: number;
  yearLevel: number;
  /** Day names in column order; empty without weeks. */
  weekdays: string[];
  weekName: string;
  /** Index of each unit inside the next one up (0-based); the largest unit is absolute. */
  decompose(time: number): number[];
  /** Inverse of decompose; out-of-range parts are clamped. */
  compose(parts: number[]): number;
  /** How many of the next smaller unit the one at `level` (identified by `parts`) contains. */
  childCount(level: number, parts: number[]): number;
  add(time: number, unitKey: string, amount: number): number;
  startOf(time: number, level: number): number;
  /** Column of the day starting at `dayStart` in its week, or -1 without weeks. */
  weekdayOf(dayStart: number): number;
  /** Typical length of one unit, in the smallest unit. */
  approxSize(level: number): number;
  /** Seconds in the smallest unit, when known. */
  secondsPerUnit?: number;
}

export const WEEK_KEY = 'week';
const MAX_COUNT = 100000;
const DAY_SECONDS = 86400;

export const CALENDAR_VIEWS: { id: CalendarViewId; label: string; description: string }[] = [
  { id: 'clock', label: 'Now', description: 'Large current date and time with the time of day.' },
  { id: 'year', label: 'Year', description: 'Every month of the year at a glance.' },
  { id: 'month', label: 'Month', description: 'Classic calendar grid of the days in a month.' },
  { id: 'week', label: 'Week', description: 'The days of one week side by side.' },
  { id: 'day', label: 'Day', description: 'The parts of a day (hours, watches…) with notes.' },
];

export const GREGORIAN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const GREGORIAN_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const GREGORIAN_UNITS: EngineUnit[] = [
  { key: 'second', name: 'Second', plural: 'Seconds', token: 'second', startAt: 0 },
  { key: 'minute', name: 'Minute', plural: 'Minutes', token: 'minute', startAt: 0 },
  { key: 'hour', name: 'Hour', plural: 'Hours', token: 'hour', startAt: 0 },
  { key: 'day', name: 'Day', plural: 'Days', token: 'day', startAt: 1 },
  { key: 'month', name: 'Month', plural: 'Months', token: 'month', startAt: 1, names: GREGORIAN_MONTHS },
  { key: 'year', name: 'Year', plural: 'Years', token: 'year', startAt: 0 },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function toInteger(value: unknown, fallback = 0): number {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function utcSeconds(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);
  date.setUTCHours(hour, minute, second, 0);
  return Math.floor(date.getTime() / 1000);
}

function daysInGregorianMonth(year: number, month: number): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month + 1, 0);
  return date.getUTCDate();
}

function createGregorianEngine(weekStart: number): CalendarEngine {
  const firstDay = weekStart === 1 ? 1 : 0;
  const weekdays = [...GREGORIAN_WEEKDAYS.slice(firstDay), ...GREGORIAN_WEEKDAYS.slice(0, firstDay)];

  const decompose = (time: number) => {
    const date = new Date(Math.round(time) * 1000);
    return [date.getUTCSeconds(), date.getUTCMinutes(), date.getUTCHours(), date.getUTCDate() - 1, date.getUTCMonth(), date.getUTCFullYear()];
  };

  const compose = (parts: number[]) => {
    const year = Math.trunc(parts[5] ?? 1970);
    const month = clamp(Math.trunc(parts[4] ?? 0), 0, 11);
    const day = clamp(Math.trunc(parts[3] ?? 0), 0, daysInGregorianMonth(year, month) - 1);
    return utcSeconds(year, month, day + 1, clamp(Math.trunc(parts[2] ?? 0), 0, 23), clamp(Math.trunc(parts[1] ?? 0), 0, 59), clamp(Math.trunc(parts[0] ?? 0), 0, 59));
  };

  const linear: Record<string, number> = { second: 1, minute: 60, hour: 3600, day: DAY_SECONDS, [WEEK_KEY]: DAY_SECONDS * 7 };
  const approx = [1, 60, 3600, DAY_SECONDS, DAY_SECONDS * 30.436875, DAY_SECONDS * 365.2425];

  return {
    kind: 'gregorian',
    units: GREGORIAN_UNITS,
    dayLevel: 3,
    monthLevel: 4,
    yearLevel: 5,
    weekdays,
    weekName: 'Week',
    decompose,
    compose,
    childCount: (level, parts) => [1, 60, 60, 24, daysInGregorianMonth(parts[5], parts[4]), 12][level] ?? 1,
    add: (time, unitKey, amount) => {
      if (!Number.isFinite(amount) || amount === 0) return time;
      if (linear[unitKey] !== undefined) return Math.round(time + amount * linear[unitKey]);
      const parts = decompose(time);
      if (unitKey === 'month') {
        const total = parts[5] * 12 + parts[4] + Math.trunc(amount);
        parts[5] = Math.floor(total / 12);
        parts[4] = total - parts[5] * 12;
      } else if (unitKey === 'year') {
        parts[5] += Math.trunc(amount);
      } else {
        return time;
      }
      return compose(parts);
    },
    startOf: (time, level) => {
      const parts = decompose(time);
      for (let index = 0; index < level; index += 1) parts[index] = 0;
      return compose(parts);
    },
    weekdayOf: (dayStart) => mod(new Date(Math.round(dayStart) * 1000).getUTCDay() - firstDay, 7),
    approxSize: (level) => approx[level] ?? 1,
    secondsPerUnit: 1,
  };
}

export function getUnitToken(name: string, fallback: string): string {
  const token = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return token || fallback;
}

export function normalizeCalendarUnits(units: CalendarUnit[] | undefined): CalendarUnit[] {
  const valid = (units ?? []).filter((unit) => unit && typeof unit.id === 'string');
  if (valid.length === 0) return [{ id: 'unit', name: 'Turn', count: 1 }];
  return valid.map((unit, index) => ({
    ...unit,
    count: index === 0 ? 1 : clamp(toInteger(unit.count, 1), 1, MAX_COUNT),
  }));
}

function createCustomEngine(data: WidgetData): CalendarEngine {
  const units = normalizeCalendarUnits(data.calendarUnits);
  const top = units.length - 1;
  const counts = units.map((unit) => unit.count);
  const usedTokens = new Set<string>(['weekday']);
  const engineUnits: EngineUnit[] = units.map((unit, index) => {
    let token = getUnitToken(unit.name, `unit${index + 1}`);
    while (usedTokens.has(token)) token = `${token}${index + 1}`;
    usedTokens.add(token);
    const name = unit.name.trim() || `Unit ${index + 1}`;
    return {
      key: unit.id,
      name,
      plural: unit.plural?.trim() || `${name}s`,
      token,
      startAt: toInteger(unit.startAt, 0),
      names: unit.names?.some((entry) => entry?.trim()) ? unit.names : undefined,
    };
  });
  const findRole = (role: CalendarUnit['role']) => units.findIndex((unit) => unit.role === role);
  const dayLevel = findRole('day');
  const monthLevel = findRole('month');
  const yearLevel = findRole('year');

  const hasLengths = units.map((unit, level) => (
    level > 0 && level < top && !!unit.lengths?.some((length, index) => index < MAX_COUNT && toInteger(length, counts[level]) !== counts[level] && toInteger(length, 0) > 0)
  ));
  const childCountAt = (level: number, index: number): number => {
    if (level <= 0) return 1;
    if (!hasLengths[level]) return counts[level];
    const length = toInteger(units[level].lengths?.[index], 0);
    return length > 0 ? clamp(length, 1, MAX_COUNT) : counts[level];
  };

  const sizeCache: Map<number, number>[] = units.map(() => new Map());
  const size = (level: number, index: number): number => {
    if (level <= 0) return 1;
    const key = hasLengths[level] ? index : 0;
    const cached = sizeCache[level].get(key);
    if (cached !== undefined) return cached;
    const children = childCountAt(level, index);
    let total = 0;
    if (!hasLengths[level - 1]) {
      total = children * size(level - 1, 0);
    } else {
      for (let child = 0; child < children; child += 1) total += size(level - 1, child);
    }
    sizeCache[level].set(key, total);
    return total;
  };
  const offset = (level: number, index: number): number => {
    if (!hasLengths[level]) return index * size(level, 0);
    let total = 0;
    for (let item = 0; item < index; item += 1) total += size(level, item);
    return total;
  };

  const decompose = (time: number) => {
    const parts = new Array<number>(units.length).fill(0);
    const topSize = size(top, 0);
    parts[top] = Math.floor(Math.round(time) / topSize);
    let rest = Math.round(time) - parts[top] * topSize;
    for (let level = top - 1; level >= 0; level -= 1) {
      const siblings = childCountAt(level + 1, parts[level + 1]);
      let index = 0;
      if (!hasLengths[level]) {
        const unitSize = size(level, 0);
        index = Math.min(siblings - 1, Math.floor(rest / unitSize));
        rest -= index * unitSize;
      } else {
        while (index < siblings - 1 && rest >= size(level, index)) {
          rest -= size(level, index);
          index += 1;
        }
      }
      parts[level] = index;
    }
    return parts;
  };

  const compose = (parts: number[]) => {
    const clamped = [...parts];
    clamped[top] = Math.trunc(parts[top] ?? 0);
    let time = clamped[top] * size(top, 0);
    for (let level = top - 1; level >= 0; level -= 1) {
      const siblings = childCountAt(level + 1, clamped[level + 1]);
      clamped[level] = clamp(Math.trunc(parts[level] ?? 0), 0, siblings - 1);
      time += offset(level, clamped[level]);
    }
    return time;
  };

  // Carries overflowing parts into larger units, e.g. month 13 becomes month 1 of the next year.
  const normalizeParts = (parts: number[], from: number) => {
    for (let level = from; level < top; level += 1) {
      const parent = level + 1;
      if (!hasLengths[parent]) {
        const carry = Math.floor(parts[level] / counts[parent]);
        parts[level] -= carry * counts[parent];
        parts[parent] += carry;
        continue;
      }
      let guard = 0;
      while (parts[level] < 0 && guard++ < MAX_COUNT) {
        parts[parent] -= 1;
        parts[level] += childCountAt(parent, parts[parent]);
      }
      while (parts[level] >= childCountAt(parent, parts[parent]) && guard++ < MAX_COUNT) {
        parts[level] -= childCountAt(parent, parts[parent]);
        parts[parent] += 1;
      }
    }
  };

  const weekdays = (data.calendarWeekdays ?? []).map((name, index) => name?.trim() || `Day ${index + 1}`);
  const hasWeeks = weekdays.length > 1 && dayLevel >= 0;
  const daySize = dayLevel >= 0 ? size(dayLevel, 0) : 1;

  const startOf = (time: number, level: number) => {
    const parts = decompose(time);
    for (let index = 0; index < level; index += 1) parts[index] = 0;
    return compose(parts);
  };

  return {
    kind: 'custom',
    units: engineUnits,
    dayLevel,
    monthLevel,
    yearLevel,
    weekdays: hasWeeks ? weekdays : [],
    weekName: data.calendarWeekName?.trim() || 'Week',
    decompose,
    compose,
    childCount: (level, parts) => childCountAt(level, parts[level]),
    add: (time, unitKey, amount) => {
      if (!Number.isFinite(amount) || amount === 0) return time;
      if (unitKey === WEEK_KEY) return hasWeeks ? Math.round(time + amount * weekdays.length * daySize) : time;
      const level = units.findIndex((unit) => unit.id === unitKey);
      if (level < 0) return time;
      if (!hasLengths[level]) return Math.round(time + amount * size(level, 0));
      const parts = decompose(time);
      parts[level] += Math.trunc(amount);
      normalizeParts(parts, level);
      return compose(parts);
    },
    startOf,
    weekdayOf: (dayStart) => {
      if (!hasWeeks) return -1;
      if (data.calendarWeekResetsEachMonth && monthLevel > dayLevel) {
        return mod(Math.floor((dayStart - startOf(dayStart, monthLevel)) / daySize), weekdays.length);
      }
      return mod(Math.floor(dayStart / daySize) + toInteger(data.calendarWeekOffset, 0), weekdays.length);
    },
    approxSize: (level) => {
      if (level <= 0) return 1;
      if (!hasLengths[level]) return size(level, 0);
      const siblings = counts[level + 1] ?? 1;
      let total = 0;
      for (let index = 0; index < siblings; index += 1) total += size(level, index);
      return total / siblings;
    },
    secondsPerUnit: typeof data.calendarSecondsPerUnit === 'number' && data.calendarSecondsPerUnit > 0 ? data.calendarSecondsPerUnit : undefined,
  };
}

const engineCache = new WeakMap<object, CalendarEngine>();

export function createCalendarEngine(data: WidgetData): CalendarEngine {
  if (data.calendarMode !== 'custom') return createGregorianEngine(data.calendarWeekStart === 1 ? 1 : 0);
  return createCustomEngine(data);
}

/** Engine cached per widget data object (data objects are replaced on every change). */
export function getCalendarEngine(data: WidgetData): CalendarEngine {
  const cached = engineCache.get(data);
  if (cached) return cached;
  const engine = createCalendarEngine(data);
  engineCache.set(data, engine);
  return engine;
}

// JavaScript dates cover about ±270,000 years around 1970.
const GREGORIAN_LIMIT = 8e12;

export function clampCalendarTime(data: WidgetData, time: number): number {
  const rounded = Number.isFinite(time) ? Math.round(time) : 0;
  return data.calendarMode === 'custom' ? clamp(rounded, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER) : clamp(rounded, -GREGORIAN_LIMIT, GREGORIAN_LIMIT);
}

export function getCalendarTime(data: WidgetData): number {
  return clampCalendarTime(data, toInteger(data.calendarTime, 0));
}

export function getLevelOfKey(engine: CalendarEngine, unitKey: string): number {
  return engine.units.findIndex((unit) => unit.key === unitKey);
}

export interface PeriodRange {
  start: number;
  end: number;
}

export function getPeriod(engine: CalendarEngine, time: number, level: number): PeriodRange {
  const start = engine.startOf(time, level);
  const end = engine.add(start, engine.units[level].key, 1);
  return { start, end: end > start ? end : start + 1 };
}

/** Starts of the consecutive units of `level` in [start, end). */
export function listStarts(engine: CalendarEngine, range: PeriodRange, level: number, max = 500): number[] {
  const starts: number[] = [];
  let current = engine.startOf(range.start, level);
  const key = engine.units[level].key;
  while (current < range.end && starts.length < max) {
    starts.push(current);
    const next = engine.add(current, key, 1);
    if (next <= current) break;
    current = next;
  }
  return starts;
}

export function getUnitNumber(engine: CalendarEngine, parts: number[], level: number): number {
  return parts[level] + engine.units[level].startAt;
}

export function getUnitName(engine: CalendarEngine, parts: number[], level: number): string {
  const unit = engine.units[level];
  const name = unit.names?.[parts[level]]?.trim();
  return name || `${unit.name} ${getUnitNumber(engine, parts, level)}`;
}

export function getWeekdayName(engine: CalendarEngine, time: number): string {
  if (engine.dayLevel < 0 || engine.weekdays.length === 0) return '';
  return engine.weekdays[engine.weekdayOf(engine.startOf(time, engine.dayLevel))] ?? '';
}

/** 1-based number of the week containing the day: within the month when weeks restart monthly, otherwise within the year. */
export function getWeekNumber(engine: CalendarEngine, data: WidgetData, dayStart: number): number {
  const length = engine.weekdays.length;
  if (length === 0 || engine.dayLevel < 0) return 0;
  const daySize = Math.max(1, engine.approxSize(engine.dayLevel));
  const containerLevel = engine.kind === 'custom' && data.calendarWeekResetsEachMonth && engine.monthLevel > engine.dayLevel
    ? engine.monthLevel
    : engine.yearLevel;
  if (containerLevel < 0) return Math.floor(Math.floor(dayStart / daySize) / length) + 1;
  const containerStart = engine.startOf(dayStart, containerLevel);
  const dayIndex = Math.round((dayStart - containerStart) / daySize);
  return Math.floor((dayIndex + engine.weekdayOf(containerStart)) / length) + 1;
}

/** Days of the week containing `dayStart`; weeks that restart every month stop at the end of the month. */
export function getWeekDays(engine: CalendarEngine, data: WidgetData, dayStart: number): number[] {
  if (engine.dayLevel < 0) return [];
  const dayKey = engine.units[engine.dayLevel].key;
  const column = engine.weekdayOf(dayStart);
  if (column < 0) return [dayStart];
  const first = engine.add(dayStart, dayKey, -column);
  const resets = engine.kind === 'custom' && data.calendarWeekResetsEachMonth && engine.monthLevel > engine.dayLevel;
  const monthStart = resets ? engine.startOf(dayStart, engine.monthLevel) : 0;
  const days: number[] = [];
  for (let index = 0; index < engine.weekdays.length; index += 1) {
    const day = engine.add(first, dayKey, index);
    if (resets && engine.startOf(day, engine.monthLevel) !== monthStart) break;
    days.push(day);
  }
  return days;
}

export function getAvailableViews(engine: CalendarEngine): CalendarViewId[] {
  const views: CalendarViewId[] = ['clock'];
  if (engine.yearLevel >= 0 && engine.monthLevel >= 0 && engine.yearLevel > engine.monthLevel) views.push('year');
  if (engine.monthLevel >= 0 && engine.dayLevel >= 0 && engine.monthLevel > engine.dayLevel) views.push('month');
  if (engine.dayLevel >= 0 && engine.weekdays.length > 1) views.push('week');
  if (engine.dayLevel > 0) views.push('day');
  return views;
}

export function getEnabledViews(data: WidgetData, engine: CalendarEngine): CalendarViewId[] {
  const available = getAvailableViews(engine);
  const requested = data.calendarViews ?? CALENDAR_VIEWS.map((view) => view.id);
  const enabled = requested.filter((view) => available.includes(view));
  return enabled.length > 0 ? enabled : ['clock'];
}

export function getViewUnavailableReason(engine: CalendarEngine, view: CalendarViewId): string | null {
  if (getAvailableViews(engine).includes(view)) return null;
  switch (view) {
    case 'year': return 'Needs units marked as Month and Year.';
    case 'month': return 'Needs units marked as Day and Month.';
    case 'week': return 'Needs a Day unit and at least two days of the week.';
    case 'day': return 'Needs a Day unit with a smaller unit below it.';
    default: return null;
  }
}

function padNumber(value: number, digits: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}${String(Math.abs(value)).padStart(digits, '0')}`;
}

function ordinal(value: number): string {
  const tens = Math.abs(value) % 100;
  const ones = Math.abs(value) % 10;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ones === 1 ? 'st' : ones === 2 ? 'nd' : ones === 3 ? 'rd' : 'th';
  return `${value}${suffix}`;
}

/**
 * Formats a time with {token} placeholders: {day}, {day:2} (zero-padded), {day:ord} (1st),
 * {month:name}, {month:short}, {weekday}, {weekday:short}, {weekday:num}.
 */
export function formatCalendarPattern(engine: CalendarEngine, time: number, pattern: string): string {
  const parts = engine.decompose(time);
  return pattern.replace(/\{([a-zA-Z0-9_]+)(?::([a-zA-Z0-9]+))?\}/g, (match, rawToken: string, modifier?: string) => {
    const token = rawToken.toLowerCase();
    const option = modifier?.toLowerCase();
    if (token === 'weekday') {
      if (engine.weekdays.length === 0 || engine.dayLevel < 0) return '';
      const column = engine.weekdayOf(engine.startOf(time, engine.dayLevel));
      if (option === 'num') return String(column + 1);
      const name = engine.weekdays[column] ?? '';
      return option === 'short' ? name.slice(0, 3) : name;
    }
    const level = engine.units.findIndex((unit) => unit.token === token);
    if (level < 0) return match;
    const value = getUnitNumber(engine, parts, level);
    if (option === 'name' || option === 'short') {
      const name = engine.units[level].names?.[parts[level]]?.trim();
      if (!name) return String(value);
      return option === 'short' ? name.slice(0, 3) : name;
    }
    if (option === 'ord') return ordinal(value);
    if (option && /^\d$/.test(option)) return padNumber(value, Number(option));
    return String(value);
  });
}

export function getDefaultDateFormat(engine: CalendarEngine): string {
  if (engine.kind === 'gregorian') return '{weekday}, {month:name} {day}, {year}';
  const from = engine.dayLevel >= 0 ? engine.dayLevel : 0;
  const pieces: string[] = [];
  for (let level = engine.units.length - 1; level >= from; level -= 1) {
    const unit = engine.units[level];
    pieces.unshift(unit.names ? `{${unit.token}:name}` : `${unit.name} {${unit.token}}`);
  }
  // "Day 3 of Thawmoon" reads better than "Day 3, Thawmoon".
  let text = pieces.length > 1 && !engine.units[from].names && engine.units[from + 1]?.names
    ? `{${engine.units[from].token}:ord} of ${pieces[1]}${pieces.length > 2 ? `, ${pieces.slice(2).join(', ')}` : ''}`
    : pieces.join(', ');
  if (engine.weekdays.length > 0) text = `{weekday}, ${text}`;
  return text;
}

export function getDefaultTimeFormat(engine: CalendarEngine, time?: number): string {
  if (engine.kind === 'gregorian') {
    const seconds = time === undefined ? 0 : engine.decompose(time)[0];
    return seconds ? '{hour:2}:{minute:2}:{second:2}' : '{hour:2}:{minute:2}';
  }
  if (engine.dayLevel <= 0) return '';
  let units = engine.units.slice(0, engine.dayLevel).reverse();
  if (units.every((unit) => !unit.names)) {
    // Like a real clock, the smallest of three or more units (seconds) only shows when it is not zero.
    if (units.length >= 3 && time !== undefined && engine.decompose(time)[0] === 0) units = units.slice(0, -1);
    return units.map((unit) => `{${unit.token}:2}`).join(':');
  }
  return units.map((unit) => (unit.names ? `{${unit.token}:name}` : `${unit.name} {${unit.token}}`)).join(' · ');
}

export function formatCalendarDate(engine: CalendarEngine, data: WidgetData, time: number): string {
  const format = data.calendarDateFormat?.trim() || getDefaultDateFormat(engine);
  return formatCalendarPattern(engine, time, format);
}

export function formatCalendarClock(engine: CalendarEngine, data: WidgetData, time: number): string {
  const format = data.calendarTimeFormat?.trim() || getDefaultTimeFormat(engine, time);
  return format ? formatCalendarPattern(engine, time, format) : '';
}

export function formatCalendarDateTime(engine: CalendarEngine, data: WidgetData, time: number): string {
  const clock = formatCalendarClock(engine, data, time);
  const date = formatCalendarDate(engine, data, time);
  return clock ? `${date} · ${clock}` : date;
}

export function getUnitLabel(engine: CalendarEngine, unitKey: string, amount: number): string {
  const singular = Math.abs(amount) === 1;
  if (unitKey === WEEK_KEY) {
    const name = engine.weekName;
    return singular ? name.toLowerCase() : `${name.toLowerCase()}s`;
  }
  const unit = engine.units.find((item) => item.key === unitKey);
  if (!unit) return unitKey;
  return (singular ? unit.name : unit.plural).toLowerCase();
}

export function formatAmount(engine: CalendarEngine, amount: number, unitKey: string): string {
  const rounded = Math.round(amount * 1000) / 1000;
  return `${rounded} ${getUnitLabel(engine, unitKey, rounded)}`;
}

/** Short step label, e.g. "8 h", "1 day". */
export function formatStepLabel(engine: CalendarEngine, amount: number, unitKey: string): string {
  const shortNames: Record<string, string> = { second: 's', minute: 'min', hour: 'h' };
  const rounded = Math.round(amount * 1000) / 1000;
  const unit = engine.units.find((item) => item.key === unitKey);
  const short = unit ? shortNames[unit.name.trim().toLowerCase()] : undefined;
  if (short) return `${rounded} ${short}`;
  return formatAmount(engine, rounded, unitKey);
}

/** Units that time can be advanced by, smallest first, with the week when there is one. */
export function getAdvanceUnits(engine: CalendarEngine): { key: string; label: string }[] {
  const options = engine.units.map((unit) => ({ key: unit.key, label: unit.plural }));
  if (engine.weekdays.length > 0 && engine.dayLevel >= 0) {
    options.splice(engine.dayLevel + 1, 0, { key: WEEK_KEY, label: `${engine.weekName}s` });
  }
  return options;
}

export function isValidUnitKey(engine: CalendarEngine, unitKey: string | undefined): boolean {
  return !!unitKey && getAdvanceUnits(engine).some((unit) => unit.key === unitKey);
}

/** Readable length of time between two moments, e.g. "3 days" or "2 hours". */
export function formatDuration(engine: CalendarEngine, from: number, to: number): string {
  const difference = Math.abs(to - from);
  if (difference === 0) return 'now';
  for (let level = engine.units.length - 1; level >= 0; level -= 1) {
    const unitSize = engine.approxSize(level);
    if (difference >= unitSize) {
      const count = Math.floor(difference / unitSize);
      return formatAmount(engine, count, engine.units[level].key);
    }
  }
  return formatAmount(engine, difference, engine.units[0].key);
}

/** Position within the current day, from 0 to 1, or null without a Day unit. */
export function getDayFraction(engine: CalendarEngine, time: number): number | null {
  if (engine.dayLevel < 0) return null;
  const { start, end } = getPeriod(engine, time, engine.dayLevel);
  return clamp((time - start) / (end - start), 0, 1);
}

// ----- Variable labels -----

export interface CalendarLabelField {
  key: string;
  label: string;
  value: FormulaValue;
}

export function getCalendarLabelFields(data: WidgetData): CalendarLabelField[] {
  const engine = getCalendarEngine(data);
  const time = getCalendarTime(data);
  const parts = engine.decompose(time);
  const fields: CalendarLabelField[] = [
    { key: 'date', label: 'Date (text)', value: formatCalendarDate(engine, data, time) },
  ];
  const clock = formatCalendarClock(engine, data, time);
  if (clock) fields.push({ key: 'clock', label: 'Time of day (text)', value: clock });
  for (let level = engine.units.length - 1; level >= 0; level -= 1) {
    const unit = engine.units[level];
    fields.push({ key: `unit:${unit.key}`, label: unit.name, value: getUnitNumber(engine, parts, level) });
    if (unit.names) fields.push({ key: `name:${unit.key}`, label: `${unit.name} name`, value: getUnitName(engine, parts, level) });
  }
  if (engine.weekdays.length > 0 && engine.dayLevel >= 0) {
    const column = engine.weekdayOf(engine.startOf(time, engine.dayLevel));
    fields.push({ key: 'weekday', label: 'Day of the week (number)', value: column + 1 });
    fields.push({ key: 'weekdayName', label: 'Day of the week (name)', value: engine.weekdays[column] ?? '' });
  }
  if (engine.dayLevel >= 0) {
    const daySize = Math.max(1, engine.approxSize(engine.dayLevel));
    fields.push({ key: 'days', label: 'Days elapsed', value: Math.floor(time / daySize) });
  }
  fields.push({ key: 'time', label: `Total time (${engine.units[0].plural.toLowerCase()})`, value: time });
  return fields;
}

/** Label name -> value for every labelled calendar value. */
export function getCalendarLabelValues(data: WidgetData): Record<string, FormulaValue> {
  const labels = data.calendarLabels;
  if (!labels || Object.values(labels).every((label) => !label)) return {};
  const values: Record<string, FormulaValue> = {};
  for (const field of getCalendarLabelFields(data)) {
    const label = labels[field.key];
    if (label) values[label] = field.value;
  }
  return values;
}

// ----- Notes -----

export function getNotesInRange(notes: CalendarNote[] | undefined, range: PeriodRange): CalendarNote[] {
  return (notes ?? [])
    .filter((note) => note.time >= range.start && note.time < range.end)
    .sort((a, b) => a.time - b.time);
}

/** Notes whose moment is reached when time moves forward from `from` to `to`. */
export function getReachedNotes(notes: CalendarNote[] | undefined, from: number, to: number): CalendarNote[] {
  if (to <= from) return [];
  return (notes ?? []).filter((note) => note.time > from && note.time <= to).sort((a, b) => a.time - b.time);
}

export function getNextNote(notes: CalendarNote[] | undefined, time: number): CalendarNote | undefined {
  return (notes ?? []).filter((note) => note.time > time).sort((a, b) => a.time - b.time)[0];
}

// ----- Temporary effects -----

export function getElapsedSeconds(engine: CalendarEngine, from: number, to: number): number | undefined {
  if (!engine.secondsPerUnit) return undefined;
  return (to - from) * engine.secondsPerUnit;
}

/** Passes time in a Temporary Effects list; round-based lists count whole rounds. */
export function passTimeInEffects(
  effects: TimedEffect[],
  seconds: number,
  roundMode: boolean,
  roundSeconds: number,
): { effects: TimedEffect[]; expired: string[]; amount: number } {
  const amount = roundMode ? Math.floor(seconds / Math.max(1, roundSeconds)) : Math.floor(seconds);
  if (amount <= 0) return { effects, expired: [], amount: 0 };
  const expired: string[] = [];
  const updated = effects.map((effect) => {
    const remainingSeconds = Math.max(0, effect.remainingSeconds - amount);
    if (remainingSeconds <= 0 && effect.remainingSeconds > 0) expired.push(effect.name);
    return { ...effect, remainingSeconds };
  });
  return { effects: updated, expired, amount };
}

// ----- Defaults & presets -----

function createSteps(steps: [number, string][]): CalendarStep[] {
  return steps.map(([amount, unit]) => ({ id: uuidv4(), amount, unit }));
}

export function getDefaultRound(engine: CalendarEngine): { amount: number; unit: string } {
  if (engine.kind === 'gregorian') return { amount: 6, unit: 'second' };
  const secondUnit = engine.secondsPerUnit === 1 ? engine.units[0] : undefined;
  return secondUnit ? { amount: 6, unit: secondUnit.key } : { amount: 1, unit: engine.units[0].key };
}

export interface CalendarPreset {
  id: string;
  name: string;
  description: string;
  create: (now?: Date) => Partial<WidgetData>;
}

function startOfTodayAt8(now: Date): number {
  return utcSeconds(now.getFullYear(), now.getMonth(), now.getDate(), 8);
}

const FANTASY_MONTHS = ['Deepfrost', 'Thawmoon', 'Seedtide', 'Rainmoon', 'Blossom', 'Highsun', 'Goldmoon', 'Harvest', 'Leaffall', 'Mistmoon', 'Darkening', 'Longnight', 'Yearsend', "Year's Day"];

function customPreset(data: Partial<WidgetData>, startParts: number[]): Partial<WidgetData> {
  const base: Partial<WidgetData> = {
    calendarMode: 'custom',
    calendarWeekdays: [],
    calendarWeekName: undefined,
    calendarWeekResetsEachMonth: false,
    calendarWeekOffset: 0,
    calendarDateFormat: undefined,
    calendarTimeFormat: undefined,
    ...data,
  };
  const engine = createCalendarEngine(base as WidgetData);
  const round = getDefaultRound(engine);
  return {
    calendarRoundAmount: round.amount,
    calendarRoundUnit: round.unit,
    ...base,
    calendarTime: engine.compose(startParts),
  };
}

export const CALENDAR_PRESETS: CalendarPreset[] = [
  {
    id: 'gregorian',
    name: 'Real-world calendar',
    description: 'Seconds to years with real months, leap years and weekdays.',
    create: (now = new Date()) => ({
      calendarMode: 'gregorian',
      calendarTime: startOfTodayAt8(now),
      calendarDateFormat: undefined,
      calendarTimeFormat: undefined,
      calendarWeekStart: 0,
      calendarSteps: createSteps([[1, 'minute'], [10, 'minute'], [1, 'hour'], [8, 'hour'], [1, 'day'], [1, WEEK_KEY]]),
      calendarRoundAmount: 6,
      calendarRoundUnit: 'second',
    }),
  },
  {
    id: 'elapsed',
    name: 'Elapsed time',
    description: 'Day 1, Day 2… with hours, minutes and seconds. No months.',
    create: () => customPreset({
      calendarUnits: [
        { id: 'second', name: 'Second', count: 1 },
        { id: 'minute', name: 'Minute', count: 60 },
        { id: 'hour', name: 'Hour', count: 60 },
        { id: 'day', name: 'Day', count: 24, startAt: 1, role: 'day' },
      ],
      calendarSecondsPerUnit: 1,
      calendarSteps: createSteps([[1, 'minute'], [10, 'minute'], [1, 'hour'], [8, 'hour'], [1, 'day']]),
    }, [0, 0, 8, 0]),
  },
  {
    id: 'quarter-days',
    name: 'Quarter days',
    description: 'Four quarters make a day, ten-day weeks, 30-day months, 12 months.',
    create: () => customPreset({
      calendarUnits: [
        { id: 'quarter', name: 'Quarter', count: 1, startAt: 1, names: ['Morning', 'Afternoon', 'Evening', 'Night'] },
        { id: 'day', name: 'Day', count: 4, startAt: 1, role: 'day' },
        { id: 'month', name: 'Month', count: 30, startAt: 1, role: 'month' },
        { id: 'year', name: 'Year', count: 12, startAt: 1, role: 'year' },
      ],
      calendarWeekdays: ['Oneday', 'Twoday', 'Threeday', 'Fourday', 'Fiveday', 'Sixday', 'Sevenday', 'Eightday', 'Nineday', 'Tenday'],
      calendarWeekName: 'Tenday',
      calendarWeekResetsEachMonth: true,
      calendarSecondsPerUnit: 21600,
      calendarSteps: createSteps([[1, 'quarter'], [1, 'day'], [1, WEEK_KEY], [1, 'month']]),
    }, [0, 0, 0, 0]),
  },
  {
    id: 'fantasy',
    name: 'Fantasy calendar',
    description: '13 months of 28 days plus a festival day, with a 7-day week.',
    create: () => customPreset({
      calendarUnits: [
        { id: 'second', name: 'Second', count: 1 },
        { id: 'minute', name: 'Minute', count: 60 },
        { id: 'hour', name: 'Hour', count: 60 },
        { id: 'day', name: 'Day', count: 24, startAt: 1, role: 'day' },
        { id: 'month', name: 'Month', count: 28, startAt: 1, role: 'month', names: FANTASY_MONTHS, lengths: [...FANTASY_MONTHS.slice(0, -1).map(() => 28), 1] },
        { id: 'year', name: 'Year', count: FANTASY_MONTHS.length, startAt: 1, role: 'year' },
      ],
      calendarWeekdays: ['Moonday', 'Tideday', 'Windday', 'Thunderday', 'Fireday', 'Starday', 'Sunday'],
      calendarSecondsPerUnit: 1,
      calendarSteps: createSteps([[10, 'minute'], [1, 'hour'], [8, 'hour'], [1, 'day'], [1, WEEK_KEY]]),
    }, [0, 0, 8, 0, 0, 999]),
  },
];

export function createDefaultCalendarData(now = new Date()): Partial<WidgetData> {
  return {
    ...CALENDAR_PRESETS[0].create(now),
    calendarViews: ['clock', 'year', 'month', 'week', 'day'],
    calendarDefaultView: 'month',
    calendarShowRewind: true,
    calendarAdvanceOnRound: false,
    calendarSyncEffects: false,
    calendarRoundSeconds: 6,
    calendarNotes: [],
  };
}

export function createCalendarUnit(name = 'Unit', count = 1): CalendarUnit {
  return { id: uuidv4(), name, count };
}
