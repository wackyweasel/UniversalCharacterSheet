import type { Character, CalendarNote, TimedEffect, Widget, WidgetData } from '../types';
import { useStore } from '../store/useStore';
import { addTimelineEvent } from '../store/useTimelineStore';
import {
  clampCalendarTime,
  formatAmount,
  formatCalendarDate,
  formatCalendarDateTime,
  getCalendarEngine,
  getCalendarTime,
  getElapsedSeconds,
  getReachedNotes,
  isValidUnitKey,
  getDefaultRound,
  passTimeInEffects,
} from './calendar';

export type CalendarChangeKind = 'advance' | 'rewind' | 'set' | 'round';

interface CalendarChangeOptions {
  kind: CalendarChangeKind;
  /** e.g. "8 hours"; shown in the timeline for advances and rewinds. */
  amountText?: string;
  /** Skip passing time in Temporary Effects widgets (already done by the caller). */
  skipEffects?: boolean;
  extraData?: Partial<WidgetData>;
}

const ICONS: Record<CalendarChangeKind, string> = {
  advance: '⏩',
  rewind: '⏪',
  set: '🗓️',
  round: '⚔️',
};

function getActiveCharacter(): Character | undefined {
  const state = useStore.getState();
  return state.characters.find((character) => character.id === state.activeCharacterId);
}

function findWidget(character: Character, widgetId: string): Widget | undefined {
  for (const sheet of character.sheets) {
    const widget = sheet.widgets.find((item) => item.id === widgetId);
    if (widget) return widget;
  }
  return undefined;
}

function describeChange(kind: CalendarChangeKind, amountText: string | undefined, target: string): string {
  switch (kind) {
    case 'advance': return `Advanced ${amountText ?? 'time'} → ${target}`;
    case 'rewind': return `Rewound ${amountText ?? 'time'} → ${target}`;
    case 'round': return `New round: +${amountText ?? 'time'} → ${target}`;
    default: return `Set to ${target}`;
  }
}

/** Moves a calendar to `nextTime`, passing time in Temporary Effects and recording the change on the timeline. */
export function changeCalendarTime(widgetId: string, nextTime: number, options: CalendarChangeOptions): boolean {
  const character = getActiveCharacter();
  const widget = character && findWidget(character, widgetId);
  if (!character || !widget || widget.type !== 'CALENDAR') return false;

  const data = widget.data;
  const engine = getCalendarEngine(data);
  const from = getCalendarTime(data);
  const to = clampCalendarTime(data, nextTime);
  if (to === from && !options.extraData) return false;

  const updates: { id: string; data: Partial<WidgetData> }[] = [{ id: widgetId, data: { ...options.extraData, calendarTime: to } }];
  const effectEvents: { label: string; description: string }[] = [];

  const elapsedSeconds = getElapsedSeconds(engine, from, to);
  if (data.calendarSyncEffects && !options.skipEffects && elapsedSeconds !== undefined && elapsedSeconds > 0) {
    const roundSeconds = data.calendarRoundSeconds && data.calendarRoundSeconds > 0 ? data.calendarRoundSeconds : 6;
    for (const sheet of character.sheets) {
      for (const tracker of sheet.widgets) {
        if (tracker.type !== 'TIME_TRACKER' || !tracker.data.timedEffects?.length) continue;
        const roundMode = tracker.data.roundMode === true;
        const result = passTimeInEffects(tracker.data.timedEffects as TimedEffect[], elapsedSeconds, roundMode, roundSeconds);
        if (result.amount <= 0) continue;
        updates.push({ id: tracker.id, data: { timedEffects: result.effects } });
        const passed = roundMode
          ? `${result.amount} ${result.amount === 1 ? 'round' : 'rounds'}`
          : `${result.amount} ${result.amount === 1 ? 'second' : 'seconds'}`;
        effectEvents.push({
          label: tracker.data.label || 'Effects',
          description: `Passed ${passed} with ${data.label || 'the calendar'}${result.expired.length ? ` — expired: ${result.expired.join(', ')}` : ''}`,
        });
      }
    }
  }

  useStore.getState().updateWidgetsData(updates, 'Change time');

  const label = data.label || 'Calendar';
  if (to !== from) {
    addTimelineEvent(label, 'CALENDAR', describeChange(options.kind, options.amountText, formatCalendarDateTime(engine, data, to)), ICONS[options.kind]);
  }
  for (const event of effectEvents) addTimelineEvent(event.label, 'TIME_TRACKER', event.description, '⏱️');
  for (const note of getReachedNotes(data.calendarNotes, from, to)) {
    addTimelineEvent(label, 'CALENDAR', `Reached: ${note.title} (${formatCalendarDate(engine, data, note.time)})`, '📅');
  }
  return true;
}

export function shiftCalendarTime(widgetId: string, amount: number, unitKey: string, kind: 'advance' | 'rewind' | 'round' = amount < 0 ? 'rewind' : 'advance'): boolean {
  const character = getActiveCharacter();
  const widget = character && findWidget(character, widgetId);
  if (!widget || widget.type !== 'CALENDAR' || !Number.isFinite(amount) || amount === 0) return false;
  const engine = getCalendarEngine(widget.data);
  const time = getCalendarTime(widget.data);
  return changeCalendarTime(widgetId, engine.add(time, unitKey, amount), {
    kind,
    amountText: formatAmount(engine, Math.abs(amount), unitKey),
  });
}

/** Called by Initiative Trackers when the turn order wraps around to a new round. */
export function advanceCalendarsForNewRound(options: { effectsAlreadyAdvanced?: boolean } = {}) {
  const character = getActiveCharacter();
  if (!character) return;
  for (const sheet of character.sheets) {
    for (const widget of sheet.widgets) {
      if (widget.type !== 'CALENDAR' || !widget.data.calendarAdvanceOnRound) continue;
      const engine = getCalendarEngine(widget.data);
      const fallback = getDefaultRound(engine);
      const unit = isValidUnitKey(engine, widget.data.calendarRoundUnit) ? widget.data.calendarRoundUnit! : fallback.unit;
      const amount = typeof widget.data.calendarRoundAmount === 'number' && widget.data.calendarRoundAmount > 0 ? widget.data.calendarRoundAmount : fallback.amount;
      const time = getCalendarTime(widget.data);
      changeCalendarTime(widget.id, engine.add(time, unit, amount), {
        kind: 'round',
        amountText: formatAmount(engine, amount, unit),
        skipEffects: options.effectsAlreadyAdvanced,
      });
    }
  }
}

export function saveCalendarNote(widgetId: string, note: CalendarNote) {
  const character = getActiveCharacter();
  const widget = character && findWidget(character, widgetId);
  if (!widget) return;
  const notes = widget.data.calendarNotes ?? [];
  const exists = notes.some((item) => item.id === note.id);
  useStore.getState().updateWidgetsData([{
    id: widgetId,
    data: { calendarNotes: exists ? notes.map((item) => (item.id === note.id ? note : item)) : [...notes, note] },
  }], exists ? 'Edit note' : 'Add note');
  const engine = getCalendarEngine(widget.data);
  addTimelineEvent(widget.data.label || 'Calendar', 'CALENDAR', `${exists ? 'Note edited' : 'Note added'}: ${note.title} (${formatCalendarDate(engine, widget.data, note.time)})`, '📝');
}

export function deleteCalendarNote(widgetId: string, noteId: string) {
  const character = getActiveCharacter();
  const widget = character && findWidget(character, widgetId);
  const note = widget?.data.calendarNotes?.find((item) => item.id === noteId);
  if (!widget || !note) return;
  useStore.getState().updateWidgetsData([{
    id: widgetId,
    data: { calendarNotes: (widget.data.calendarNotes ?? []).filter((item) => item.id !== noteId) },
  }], 'Delete note');
  addTimelineEvent(widget.data.label || 'Calendar', 'CALENDAR', `Note removed: ${note.title}`, '❌');
}
