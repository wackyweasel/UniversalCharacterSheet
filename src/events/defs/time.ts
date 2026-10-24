import type { Character, TimedEffect, Widget, WidgetData } from '../../types';
import {
  clampCalendarTime,
  formatAmount,
  formatCalendarDate,
  formatCalendarDateTime,
  getAdvanceUnits,
  getCalendarEngine,
  getCalendarTime,
  getElapsedSeconds,
  getLevelOfKey,
  getReachedNotes,
  isValidUnitKey,
  passTimeInEffects,
  type CalendarEngine,
} from '../../utils/calendar';
import { applyRest, planRestFromButton } from '../../utils/rest';
import { forEachWidget, formatNumber, patchWidgetData, plural, TIME_UNIT_OPTIONS, timeToSeconds } from '../helpers';
import type { EffectDef, EventOption, EventParamSpec, SpecContext, TriggerData, TriggerDef } from '../types';

const NAME_FILTER = (label: string, placeholder: string): EventParamSpec => ({
  key: 'name',
  label,
  type: 'text',
  default: '',
  placeholder,
  help: 'Leave blank to match any.',
});

const sameName = (a: string | undefined, b: string | undefined) => (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();
const matchesFilter = (name: string | undefined, filter: string | undefined) => !filter?.trim() || sameName(name, filter);

// ----- Timer -----

const DEFAULT_TIMER_DURATION = 60000;

const isTimerFinished = (data: WidgetData | undefined) => (
  !!data && data.timerCountDown === true && (data.timerElapsed ?? 0) >= (data.timerDuration ?? DEFAULT_TIMER_DURATION)
);

export const timerStartedTrigger: TriggerDef = {
  kind: 'timer.started',
  label: 'The timer starts',
  mode: 'state',
  detect: ({ prev, next }) => (prev && next && !prev.data.timerRunning && next.data.timerRunning ? { text: 'Timer started' } : null),
  describe: (d) => `${d.widget} starts`,
};

export const timerStoppedTrigger: TriggerDef = {
  kind: 'timer.stopped',
  label: 'The timer is paused or reset',
  mode: 'state',
  outputs: [{ key: 'seconds', label: 'Seconds on the timer when it stopped', type: 'number' }],
  detect: ({ prev, next }) => {
    if (!prev || !next || !prev.data.timerRunning || next.data.timerRunning) return null;
    if (isTimerFinished(next.data) && !isTimerFinished(prev.data)) return null;
    const reset = (next.data.timerElapsed ?? 0) === 0;
    const elapsed = reset
      ? (prev.data.timerElapsed ?? 0) + (prev.data.timerStartedAt ? Date.now() - prev.data.timerStartedAt : 0)
      : next.data.timerElapsed ?? 0;
    return { data: { seconds: Math.round(elapsed / 1000) }, text: reset ? 'Timer reset' : 'Timer paused' };
  },
  describe: (d) => `${d.widget} is paused or reset`,
};

export const timerFinishedTrigger: TriggerDef = {
  kind: 'timer.finished',
  label: 'The countdown finishes',
  mode: 'state',
  detect: ({ prev, next }) => (prev && next && isTimerFinished(next.data) && !isTimerFinished(prev.data) ? { text: 'Countdown finished' } : null),
  describe: (d) => `${d.widget} countdown finishes`,
};

export const timerStartEffect: EffectDef = {
  kind: 'timer.start',
  label: 'Start the timer',
  apply: (ctx) => {
    const data = ctx.widget?.type === 'TIMER' ? ctx.widget.data : null;
    if (!data) return null;
    if (data.timerRunning) return { text: 'The timer is already running' };
    if (isTimerFinished(data)) return { text: 'The countdown has already finished' };
    return { data: { timerRunning: true, timerStartedAt: Date.now() }, text: 'Timer started' };
  },
  describe: (d) => `Start ${d.widget}`,
};

export const timerPauseEffect: EffectDef = {
  kind: 'timer.pause',
  label: 'Pause the timer',
  apply: (ctx) => {
    const data = ctx.widget?.type === 'TIMER' ? ctx.widget.data : null;
    if (!data) return null;
    if (!data.timerRunning) return { text: 'The timer isn\'t running' };
    const elapsed = (data.timerElapsed ?? 0) + (data.timerStartedAt ? Date.now() - data.timerStartedAt : 0);
    return { data: { timerRunning: false, timerElapsed: elapsed, timerStartedAt: 0 }, text: 'Timer paused' };
  },
  describe: (d) => `Pause ${d.widget}`,
};

export const timerResetEffect: EffectDef = {
  kind: 'timer.reset',
  label: 'Reset the timer',
  apply: (ctx) => {
    if (ctx.widget?.type !== 'TIMER') return null;
    return { data: { timerRunning: false, timerElapsed: 0, timerStartedAt: 0 }, text: 'Timer reset' };
  },
  describe: (d) => `Reset ${d.widget}`,
};

// ----- Initiative -----

export const initiativeRoundTrigger: TriggerDef = {
  kind: 'initiative.round',
  label: 'A new round starts',
  mode: 'action',
  match: ({ action }) => (action.kind === 'round' ? { text: action.text ?? 'New round' } : null),
  describe: (d) => `A new round starts in ${d.widget}`,
};

export const initiativeTurnTrigger: TriggerDef = {
  kind: 'initiative.turn',
  label: 'A turn starts',
  mode: 'action',
  params: [NAME_FILTER('Whose turn', 'Anyone')],
  outputs: [
    { key: 'name', label: 'Whose turn it is', type: 'text' },
    { key: 'initiative', label: 'Their initiative result', type: 'number' },
  ],
  match: ({ action, params }) => {
    if (action.kind !== 'turn' || !matchesFilter(action.text, params.name)) return null;
    return {
      data: { name: action.text ?? '', ...(action.total !== undefined ? { initiative: action.total } : {}) },
      text: `${action.text || 'Someone'}'s turn`,
    };
  },
  describe: (d) => `${d.params.name?.trim() ? `${d.params.name.trim()}'s` : 'Anyone\'s'} turn starts in ${d.widget}`,
};

// ----- Rest -----

export const restTakenTrigger: TriggerDef = {
  kind: 'rest.taken',
  label: 'A rest is taken',
  mode: 'action',
  match: ({ action }) => (action.kind === 'rest' ? { text: action.text || 'Rested' } : null),
  describe: (d) => `${d.widget} is used`,
};

export const restTakeEffect: EffectDef = {
  kind: 'rest.take',
  label: 'Take this rest',
  apply: (ctx) => {
    const widget = ctx.widget;
    if (!widget || widget.type !== 'REST_BUTTON') return null;
    const { options, summary } = planRestFromButton(widget.data);
    if (summary.length === 0) return { text: 'This rest has nothing configured' };
    const text = summary.join(' • ');
    return {
      character: applyRest(ctx.character, options),
      text,
      actions: [{ widgetId: widget.id, kind: 'rest', text }],
    };
  },
  describe: (d) => `Take ${d.widget}`,
};

// ----- Temporary effects -----

const effectsOf = (widget: Widget | undefined): TimedEffect[] => (widget?.type === 'TIME_TRACKER' ? widget.data.timedEffects ?? [] : []);

function formatEffectDuration(amount: number, roundMode: boolean): string {
  return roundMode ? plural(amount, 'round') : plural(amount, 'second');
}

export const effectAddedTrigger: TriggerDef = {
  kind: 'effects.added',
  label: 'An effect is added',
  mode: 'state',
  params: [NAME_FILTER('Effect', 'Any effect')],
  outputs: [
    { key: 'effect', label: 'Effect added', type: 'text' },
    { key: 'duration', label: 'Its duration, in rounds or seconds like the list', type: 'number' },
  ],
  detect: ({ prev, next, params }) => {
    if (!prev) return null;
    const before = effectsOf(prev);
    const counts = new Map<string, number>();
    for (const effect of before) counts.set(effect.name.toLowerCase(), (counts.get(effect.name.toLowerCase()) ?? 0) + 1);
    for (const effect of effectsOf(next)) {
      const key = effect.name.toLowerCase();
      const left = counts.get(key) ?? 0;
      if (left > 0) {
        counts.set(key, left - 1);
        continue;
      }
      if (matchesFilter(effect.name, params.name)) {
        return { data: { effect: effect.name, duration: effect.remainingSeconds }, text: `Added ${effect.name}` };
      }
    }
    return null;
  },
  describe: (d) => `${d.params.name?.trim() || 'An effect'} is added to ${d.widget}`,
};

export const effectExpiredTrigger: TriggerDef = {
  kind: 'effects.expired',
  label: 'An effect expires',
  mode: 'state',
  params: [NAME_FILTER('Effect', 'Any effect')],
  outputs: [{ key: 'effect', label: 'Effect that expired', type: 'text' }],
  detect: ({ prev, next, params }) => {
    const before = effectsOf(prev);
    const used = new Set<number>();
    for (const effect of effectsOf(next)) {
      if (effect.remainingSeconds > 0) continue;
      const index = before.findIndex((item, itemIndex) => !used.has(itemIndex) && item.name === effect.name && item.remainingSeconds > 0);
      if (index < 0) continue;
      used.add(index);
      if (matchesFilter(effect.name, params.name)) return { data: { effect: effect.name }, text: `${effect.name} expired` };
    }
    return null;
  },
  describe: (d) => `${d.params.name?.trim() || 'An effect'} expires in ${d.widget}`,
};

const DURATION_PARAMS: EventParamSpec[] = [
  { key: 'amount', label: 'Duration', type: 'amount', default: '1', placeholder: '1, @level or 1d4', help: 'Lists that count rounds use this as rounds and ignore the unit.' },
  { key: 'unit', label: 'Unit', type: 'select', options: TIME_UNIT_OPTIONS, default: 'minutes' },
];

const unitLabel = (unit: string | undefined) => TIME_UNIT_OPTIONS.find((option) => option.value === unit)?.label ?? 'minutes';

export const effectAddEffect: EffectDef = {
  kind: 'effects.add',
  label: 'Add an effect',
  params: [
    { key: 'name', label: 'Effect', type: 'text', default: '', placeholder: 'Blessed', help: 'An effect with the same name is restarted instead.' },
    ...DURATION_PARAMS,
  ],
  apply: (ctx) => {
    const widget = ctx.widget;
    if (!widget || widget.type !== 'TIME_TRACKER') return null;
    const name = ctx.text('name').trim();
    if (!name) return { text: 'No effect name' };
    const amount = ctx.amount('amount');
    if (!amount || amount.value <= 0) return { text: `${name}: the duration isn't valid` };
    const roundMode = widget.data.roundMode === true;
    const duration = Math.max(1, Math.round(roundMode ? amount.value : timeToSeconds(amount.value, ctx.params.unit)));
    const effects = effectsOf(widget);
    const index = effects.findIndex((effect) => sameName(effect.name, name));
    const entry: TimedEffect = { name: index >= 0 ? effects[index].name : name, remainingSeconds: duration, initialSeconds: duration };
    const next = index >= 0 ? effects.map((effect, effectIndex) => (effectIndex === index ? entry : effect)) : [...effects, entry];
    return {
      data: { timedEffects: next },
      text: `${index >= 0 ? 'Restarted' : 'Added'} ${entry.name} (${formatEffectDuration(duration, roundMode)})`,
    };
  },
  describe: (d) => `Add ${d.params.name || '?'} to ${d.widget} for ${d.params.amount || '1'} ${unitLabel(d.params.unit)}`,
};

export const effectRemoveEffect: EffectDef = {
  kind: 'effects.remove',
  label: 'Remove an effect',
  params: [{ key: 'name', label: 'Effect', type: 'text', default: '', placeholder: 'Blessed' }],
  apply: (ctx) => {
    const widget = ctx.widget;
    if (!widget || widget.type !== 'TIME_TRACKER') return null;
    const name = ctx.text('name').trim();
    const effects = effectsOf(widget);
    const next = effects.filter((effect) => !sameName(effect.name, name));
    if (!name || next.length === effects.length) return { text: `No ${name || 'effect'} to remove` };
    return { data: { timedEffects: next }, text: `Removed ${name}` };
  },
  describe: (d) => `Remove ${d.params.name || '?'} from ${d.widget}`,
};

export const effectPassEffect: EffectDef = {
  kind: 'effects.pass',
  label: 'Pass time',
  params: DURATION_PARAMS,
  apply: (ctx) => {
    const widget = ctx.widget;
    if (!widget || widget.type !== 'TIME_TRACKER') return null;
    const amount = ctx.amount('amount');
    if (!amount || amount.value <= 0) return { text: 'The duration isn\'t valid' };
    const roundMode = widget.data.roundMode === true;
    const units = roundMode ? amount.value : timeToSeconds(amount.value, ctx.params.unit);
    const result = passTimeInEffects(effectsOf(widget), units, false, 1);
    if (result.amount <= 0) return { text: 'No time passed' };
    const passed = roundMode ? plural(result.amount, 'round') : `${formatNumber(amount.value)} ${unitLabel(ctx.params.unit)}`;
    return {
      data: { timedEffects: result.effects },
      text: `Passed ${passed}${result.expired.length ? ` — expired: ${result.expired.join(', ')}` : ''}`,
    };
  },
  describe: (d) => `Pass ${d.params.amount || '1'} ${unitLabel(d.params.unit)} in ${d.widget}`,
};

// ----- Calendar -----

function calendarData(widget: Widget | undefined): WidgetData | null {
  return widget?.type === 'CALENDAR' ? widget.data : null;
}

function calendarUnitOptions(ctx: SpecContext, includeWeek: boolean): EventOption[] {
  const data = calendarData(ctx.widget);
  if (!data) return [];
  const engine = getCalendarEngine(data);
  if (includeWeek) return getAdvanceUnits(engine).map((unit) => ({ value: unit.key, label: unit.label.toLowerCase() }));
  return engine.units.slice(1).map((unit) => ({ value: unit.key, label: unit.name.toLowerCase() }));
}

/** How many `level` periods (such as days) begin after `from`, up to and including `to`. */
function countPeriodStarts(engine: CalendarEngine, from: number, to: number, level: number): number {
  const last = engine.startOf(to, level);
  const estimate = Math.round((last - engine.startOf(from, level)) / Math.max(1, engine.approxSize(level)));
  if (estimate > 1000) return estimate;
  let count = 0;
  for (let start = last; start > from && count <= 1000; start = engine.startOf(start - 1, level)) count += 1;
  return count;
}

export const calendarAdvancedTrigger: TriggerDef = {
  kind: 'calendar.advanced',
  label: 'Time moves forward',
  mode: 'state',
  outputs: [
    { key: 'minutes', label: 'Minutes that passed', type: 'number' },
    { key: 'hours', label: 'Hours that passed', type: 'number' },
    { key: 'days', label: 'Days that passed', type: 'number' },
    { key: 'date', label: 'New date and time', type: 'text' },
  ],
  detect: ({ prev, next }) => {
    const before = calendarData(prev);
    const after = calendarData(next);
    if (!before || !after) return null;
    const from = getCalendarTime(before);
    const to = getCalendarTime(after);
    if (to <= from) return null;
    const engine = getCalendarEngine(after);
    const date = formatCalendarDateTime(engine, after, to);
    const data: TriggerData = { date };
    const seconds = getElapsedSeconds(engine, from, to);
    if (seconds !== undefined) {
      data.minutes = seconds / 60;
      data.hours = seconds / 3600;
    }
    if (engine.dayLevel >= 0) data.days = (to - from) / Math.max(1, engine.approxSize(engine.dayLevel));
    return { data, text: `Time moved forward to ${date}` };
  },
  describe: (d) => `Time moves forward in ${d.widget}`,
};

export const calendarNewPeriodTrigger: TriggerDef = {
  kind: 'calendar.newPeriod',
  label: 'A new day (or other unit) starts',
  mode: 'state',
  params: [{ key: 'unit', label: 'Unit', type: 'select', options: (ctx) => calendarUnitOptions(ctx, false), default: 'day' }],
  outputs: [
    { key: 'date', label: 'New date', type: 'text' },
    { key: 'count', label: 'How many started, when time skips ahead', type: 'number' },
  ],
  detect: ({ prev, next, params }) => {
    const before = calendarData(prev);
    const after = calendarData(next);
    if (!before || !after) return null;
    const engine = getCalendarEngine(after);
    const level = getLevelOfKey(engine, params.unit || '') >= 0 ? getLevelOfKey(engine, params.unit || '') : engine.dayLevel;
    if (level < 0) return null;
    const from = getCalendarTime(before);
    const to = getCalendarTime(after);
    if (to <= from || engine.startOf(from, level) === engine.startOf(to, level)) return null;
    const unitName = engine.units[level].name.toLowerCase();
    return {
      data: { date: formatCalendarDate(engine, after, to), count: countPeriodStarts(engine, from, to, level) },
      text: `A new ${unitName} began: ${formatCalendarDateTime(engine, after, to)}`,
    };
  },
  describe: (d) => `A new ${d.params.unit || 'day'} starts in ${d.widget}`,
};

export const calendarNoteTrigger: TriggerDef = {
  kind: 'calendar.note',
  label: 'A note\'s moment is reached',
  mode: 'state',
  params: [NAME_FILTER('Note', 'Any note')],
  outputs: [
    { key: 'note', label: 'Note title', type: 'text' },
    { key: 'date', label: 'Its date', type: 'text' },
  ],
  detect: ({ prev, next, params }) => {
    const before = calendarData(prev);
    const after = calendarData(next);
    if (!before || !after) return null;
    const note = getReachedNotes(after.calendarNotes, getCalendarTime(before), getCalendarTime(after))
      .find((item) => matchesFilter(item.title, params.name));
    if (!note) return null;
    const date = formatCalendarDate(getCalendarEngine(after), after, note.time);
    return { data: { note: note.title, date }, text: `Reached: ${note.title} (${date})` };
  },
  describe: (d) => `${d.params.name?.trim() ? `"${d.params.name.trim()}"` : 'A note'} is reached in ${d.widget}`,
};

export const calendarShiftEffect: EffectDef = {
  kind: 'calendar.shift',
  label: 'Advance or rewind time',
  params: [
    { key: 'amount', label: 'Amount', type: 'amount', default: '1', placeholder: '8, -1 or 1d4', help: 'Use a negative amount to rewind.' },
    { key: 'unit', label: 'Unit', type: 'select', options: (ctx) => calendarUnitOptions(ctx, true), default: 'hour' },
  ],
  apply: (ctx) => {
    const widget = ctx.widget;
    const data = calendarData(widget);
    if (!widget || !data) return null;
    const engine = getCalendarEngine(data);
    const amount = ctx.amount('amount');
    if (!amount || amount.value === 0) return { text: 'The amount isn\'t valid' };
    const unit = isValidUnitKey(engine, ctx.params.unit)
      ? ctx.params.unit
      : engine.units[Math.max(0, engine.dayLevel - 1)]?.key ?? engine.units[0].key;
    const from = getCalendarTime(data);
    const to = clampCalendarTime(data, engine.add(from, unit, amount.value));
    if (to === from) return { text: 'Time didn\'t change' };

    let character: Character = patchWidgetData(ctx.character, widget.id, { calendarTime: to });
    const notes: string[] = [];
    const elapsed = getElapsedSeconds(engine, from, to);
    if (data.calendarSyncEffects && elapsed !== undefined && elapsed > 0) {
      const roundSeconds = data.calendarRoundSeconds && data.calendarRoundSeconds > 0 ? data.calendarRoundSeconds : 6;
      const updates: { id: string; effects: TimedEffect[]; expired: string[] }[] = [];
      forEachWidget(ctx.character, (tracker) => {
        if (tracker.type !== 'TIME_TRACKER' || !tracker.data.timedEffects?.length) return;
        const result = passTimeInEffects(tracker.data.timedEffects, elapsed, tracker.data.roundMode === true, roundSeconds);
        if (result.amount > 0) updates.push({ id: tracker.id, effects: result.effects, expired: result.expired });
      });
      for (const update of updates) {
        character = patchWidgetData(character, update.id, { timedEffects: update.effects });
        notes.push(...update.expired.map((name) => `${name} expired`));
      }
    }
    notes.push(...getReachedNotes(data.calendarNotes, from, to).map((note) => `reached ${note.title}`));
    const verb = to > from ? 'Advanced' : 'Rewound';
    return {
      character,
      text: `${verb} ${formatAmount(engine, Math.abs(amount.value), unit)}${amount.roll ? ` (${amount.text})` : ''} → ${formatCalendarDateTime(engine, data, to)}${notes.length ? ` — ${notes.join(', ')}` : ''}`,
    };
  },
  describe: (d) => `${d.params.amount?.trim().startsWith('-') ? 'Rewind' : 'Advance'} ${d.widget} by ${d.params.amount?.replace(/^-/, '') || '1'} ${d.params.unit || 'hour'}(s)`,
};

export const TIMER_TRIGGERS = [timerStartedTrigger, timerStoppedTrigger, timerFinishedTrigger];
export const TIMER_EFFECTS = [timerStartEffect, timerPauseEffect, timerResetEffect];
export const INITIATIVE_TRIGGERS = [initiativeRoundTrigger, initiativeTurnTrigger];
export const REST_TRIGGERS = [restTakenTrigger];
export const REST_EFFECTS = [restTakeEffect];
export const TIME_TRACKER_TRIGGERS = [effectAddedTrigger, effectExpiredTrigger];
export const TIME_TRACKER_EFFECTS = [effectAddEffect, effectRemoveEffect, effectPassEffect];
export const CALENDAR_TRIGGERS = [calendarAdvancedTrigger, calendarNewPeriodTrigger, calendarNoteTrigger];
export const CALENDAR_EFFECTS = [calendarShiftEffect];
