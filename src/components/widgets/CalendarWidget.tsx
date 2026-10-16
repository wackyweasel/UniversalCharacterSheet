import { useEffect, useState, type ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { CalendarNote, CalendarStep, CalendarViewId, Widget, WidgetData } from '../../types';
import { InlineFormulaText } from '../InlineFormulaText';
import { Tooltip } from '../Tooltip';
import { ClockIcon, PlusIcon, TrashIcon } from '../icons';
import { useFormulaLabels } from '../../hooks/useFormulaLabels';
import { evaluateFormula } from '../../utils/formulaEngine';
import {
  CALENDAR_VIEWS,
  type CalendarEngine,
  type PeriodRange,
  formatAmount,
  formatCalendarClock,
  formatCalendarDate,
  formatCalendarDateTime,
  formatDuration,
  formatStepLabel,
  getAdvanceUnits,
  getCalendarEngine,
  getCalendarTime,
  getDayFraction,
  getEnabledViews,
  getNextNote,
  getNotesInRange,
  getPeriod,
  getUnitName,
  getUnitNumber,
  getWeekDays,
  getWeekNumber,
  getWeekdayName,
  isValidUnitKey,
  listStarts,
} from '../../utils/calendar';
import { changeCalendarTime, deleteCalendarNote, saveCalendarNote } from '../../utils/calendarActions';
import { WidgetDialogShell } from './WidgetPrimitives';

interface Props {
  widget: Widget;
  mode: 'play' | 'print';
  width: number;
  height: number;
  interactive?: boolean;
}

const NOTE_COLORS = ['', '#dc2626', '#d97706', '#16a34a', '#2563eb', '#9333ea'];
const INPUT_CLASS = 'h-9 w-full min-w-0 rounded-button border border-theme-border bg-theme-paper px-2 text-sm text-theme-ink focus:border-theme-accent focus:outline-none';

function shortName(name: string, length: number): string {
  return name.length <= length ? name : name.slice(0, length);
}

function noteStyle(note: CalendarNote) {
  return note.color ? { backgroundColor: note.color, borderColor: note.color } : undefined;
}

interface ViewContext {
  engine: CalendarEngine;
  data: WidgetData;
  now: number;
  focus: number;
  notes: CalendarNote[];
  canNavigate: boolean;
  setFocus: (time: number) => void;
  openView: (view: CalendarViewId, time: number) => boolean;
}

function PeriodNav({ title, subtitle, onPrevious, onNext, canNavigate, previousLabel, nextLabel, actions }: {
  title: ReactNode;
  subtitle?: ReactNode;
  onPrevious: () => void;
  onNext: () => void;
  canNavigate: boolean;
  previousLabel: string;
  nextLabel: string;
  actions?: ReactNode;
}) {
  return (
    <div className="calendar-widget__nav">
      {canNavigate && <button type="button" className="calendar-widget__nav-button" aria-label={previousLabel} onClick={onPrevious}>‹</button>}
      <div className="calendar-widget__nav-title">
        <span className="truncate">{title}</span>
        {subtitle && <span className="calendar-widget__nav-subtitle truncate">{subtitle}</span>}
      </div>
      {actions}
      {canNavigate && <button type="button" className="calendar-widget__nav-button" aria-label={nextLabel} onClick={onNext}>›</button>}
    </div>
  );
}

// ----- Clock ("Now") view -----

function ClockView({ engine, data, now, notes }: ViewContext) {
  const clock = formatCalendarClock(engine, data, now);
  const date = formatCalendarDate(engine, data, now);
  const fraction = getDayFraction(engine, now);
  const nextNote = getNextNote(notes, now);
  const subLevel = engine.dayLevel - 1;
  const parts = engine.decompose(now);
  const partName = subLevel >= 0 && engine.units[subLevel].names ? getUnitName(engine, parts, subLevel) : null;
  // The sun rises at the left of the arc at a quarter of the day and sets at three quarters.
  const isDay = fraction !== null && fraction >= 0.25 && fraction < 0.75;
  const arcAngle = fraction === null ? 0 : Math.PI * (isDay ? (fraction - 0.25) * 2 : ((fraction + 0.25) % 1) * 2);
  const markerX = 50 - 40 * Math.cos(arcAngle);
  const markerY = 46 - 36 * Math.sin(arcAngle);

  return (
    <div className="calendar-clock">
      {fraction !== null && (
        <svg className="calendar-clock__arc" viewBox="0 0 100 52" aria-hidden="true">
          <path d="M 10 46 A 40 36 0 0 1 90 46" className="calendar-clock__arc-track" />
          <line x1="4" y1="46" x2="96" y2="46" className="calendar-clock__horizon" />
          <circle cx={markerX} cy={markerY} r={isDay ? 6 : 5} className={isDay ? 'calendar-clock__sun' : 'calendar-clock__moon'} />
        </svg>
      )}
      {clock && <div className="calendar-clock__time">{clock}</div>}
      <div className="calendar-clock__date">{date}</div>
      {partName && clock !== partName && <div className="calendar-clock__part">{partName}</div>}
      {fraction !== null && (
        <div className="calendar-clock__progress" role="progressbar" aria-label="Time of day" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fraction * 100)}>
          <div className="calendar-clock__progress-fill" style={{ width: `${fraction * 100}%` }} />
        </div>
      )}
      {nextNote && (
        <div className="calendar-clock__next">
          <span className="calendar-note-dot" style={noteStyle(nextNote)} />
          <span className="truncate">Next: <strong>{nextNote.title}</strong> in {formatDuration(engine, now, nextNote.time)}</span>
        </div>
      )}
    </div>
  );
}

// ----- Year view -----

function YearView(context: ViewContext) {
  const { engine, now, focus, notes, canNavigate, setFocus, openView } = context;
  const yearKey = engine.units[engine.yearLevel].key;
  const year = getPeriod(engine, focus, engine.yearLevel);
  const months = listStarts(engine, year, engine.monthLevel, 200);
  const nowMonth = engine.startOf(now, engine.monthLevel);
  const nowDay = engine.startOf(now, engine.dayLevel);
  const columns = engine.weekdays.length || 7;
  const yearParts = engine.decompose(year.start);

  return (
    <div className="calendar-view">
      <PeriodNav
        title={`${engine.units[engine.yearLevel].name} ${getUnitNumber(engine, yearParts, engine.yearLevel)}`}
        canNavigate={canNavigate}
        previousLabel="Previous year"
        nextLabel="Next year"
        onPrevious={() => setFocus(engine.add(focus, yearKey, -1))}
        onNext={() => setFocus(engine.add(focus, yearKey, 1))}
      />
      <div className="calendar-year">
        {months.map((monthStart) => {
          const range = getPeriod(engine, monthStart, engine.monthLevel);
          const days = listStarts(engine, range, engine.dayLevel, 200);
          const lead = engine.weekdays.length ? Math.max(0, engine.weekdayOf(days[0])) : 0;
          const monthNotes = getNotesInRange(notes, range);
          const isCurrent = monthStart === nowMonth;
          return (
            <button
              key={monthStart}
              type="button"
              className={`calendar-year__month ${isCurrent ? 'calendar-year__month--current' : ''}`}
              onClick={() => (canNavigate ? openView('month', monthStart) : undefined)}
              disabled={!canNavigate}
              aria-label={`${getUnitName(engine, engine.decompose(monthStart), engine.monthLevel)}${monthNotes.length ? `, ${monthNotes.length} notes` : ''}`}
            >
              <span className="calendar-year__month-name">
                <span className="truncate">{getUnitName(engine, engine.decompose(monthStart), engine.monthLevel)}</span>
                {monthNotes.length > 0 && <span className="calendar-note-dot" style={noteStyle(monthNotes[0])} />}
              </span>
              <span className="calendar-year__days" style={{ gridTemplateColumns: `repeat(${Math.min(columns, Math.max(1, days.length))}, minmax(0, 1fr))` }}>
                {Array.from({ length: Math.min(lead, columns - 1) }, (_, index) => <span key={`lead-${index}`} />)}
                {days.map((day) => {
                  const hasNote = getNotesInRange(monthNotes, { start: day, end: engine.add(day, engine.units[engine.dayLevel].key, 1) }).length > 0;
                  return (
                    <span
                      key={day}
                      className={`calendar-year__day ${day === nowDay ? 'calendar-year__day--today' : ''} ${hasNote ? 'calendar-year__day--note' : ''}`}
                    />
                  );
                })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ----- Month view -----

function MonthView(context: ViewContext) {
  const { engine, data, now, focus, notes, canNavigate, setFocus, openView } = context;
  const monthKey = engine.units[engine.monthLevel].key;
  const dayKey = engine.units[engine.dayLevel].key;
  const month = getPeriod(engine, focus, engine.monthLevel);
  const days = listStarts(engine, month, engine.dayLevel, 400);
  const hasWeeks = engine.weekdays.length > 0;
  const columns = hasWeeks ? engine.weekdays.length : 7;
  const nowDay = engine.startOf(now, engine.dayLevel);
  const focusDay = engine.startOf(focus, engine.dayLevel);
  const monthParts = engine.decompose(month.start);
  const titleParts: string[] = [getUnitName(engine, monthParts, engine.monthLevel)];
  if (engine.yearLevel > engine.monthLevel) titleParts.push(String(getUnitNumber(engine, monthParts, engine.yearLevel)));

  const cells: (number | null)[] = [];
  if (hasWeeks && days.length) for (let index = 0; index < engine.weekdayOf(days[0]); index += 1) cells.push(null);
  cells.push(...days);
  while (cells.length % columns !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let index = 0; index < cells.length; index += columns) rows.push(cells.slice(index, index + columns));
  const nameLength = columns > 7 ? 2 : 3;

  return (
    <div className="calendar-view">
      <PeriodNav
        title={titleParts.join(' ')}
        canNavigate={canNavigate}
        previousLabel={`Previous ${engine.units[engine.monthLevel].name.toLowerCase()}`}
        nextLabel={`Next ${engine.units[engine.monthLevel].name.toLowerCase()}`}
        onPrevious={() => setFocus(engine.add(month.start, monthKey, -1))}
        onNext={() => setFocus(engine.add(month.start, monthKey, 1))}
      />
      <div className="calendar-month" style={{ gridTemplateColumns: `${hasWeeks ? 'auto ' : ''}repeat(${columns}, minmax(0, 1fr))` }}>
        {hasWeeks && <span className="calendar-month__corner" />}
        {hasWeeks && engine.weekdays.map((name) => (
          <span key={name} className="calendar-month__weekday" title={name}>{shortName(name, nameLength)}</span>
        ))}
        {rows.map((row, rowIndex) => {
          const firstDay = row.find((day): day is number => day !== null);
          return [
            hasWeeks && (
              firstDay !== undefined ? (
                <button
                  key={`week-${rowIndex}`}
                  type="button"
                  className="calendar-month__week"
                  disabled={!canNavigate}
                  title={`${engine.weekName} ${getWeekNumber(engine, data, firstDay)}`}
                  aria-label={`Open ${engine.weekName.toLowerCase()} ${getWeekNumber(engine, data, firstDay)}`}
                  onClick={() => openView('week', firstDay)}
                >
                  {getWeekNumber(engine, data, firstDay)}
                </button>
              ) : <span key={`week-${rowIndex}`} />
            ),
            ...row.map((day, columnIndex) => {
              if (day === null) return <span key={`blank-${rowIndex}-${columnIndex}`} className="calendar-month__blank" />;
              const dayNotes = getNotesInRange(notes, { start: day, end: engine.add(day, dayKey, 1) });
              const parts = engine.decompose(day);
              const isToday = day === nowDay;
              const isPast = day < nowDay;
              return (
                <button
                  key={day}
                  type="button"
                  disabled={!canNavigate}
                  onClick={() => openView('day', day)}
                  className={[
                    'calendar-month__day',
                    isToday ? 'calendar-month__day--today' : '',
                    isPast ? 'calendar-month__day--past' : '',
                    day === focusDay && !isToday ? 'calendar-month__day--focus' : '',
                  ].join(' ')}
                  aria-label={`${formatCalendarDate(engine, data, day)}${dayNotes.length ? `, ${dayNotes.map((note) => note.title).join(', ')}` : ''}`}
                  title={dayNotes.map((note) => note.title).join('\n') || undefined}
                >
                  <span className="calendar-month__day-number">{getUnitNumber(engine, parts, engine.dayLevel)}</span>
                  {dayNotes.length > 0 && (
                    <span className="calendar-month__notes">
                      {dayNotes.slice(0, 3).map((note) => <span key={note.id} className="calendar-note-dot" style={noteStyle(note)} />)}
                    </span>
                  )}
                </button>
              );
            }),
          ];
        })}
      </div>
    </div>
  );
}

// ----- Week view -----

function WeekView(context: ViewContext) {
  const { engine, data, now, focus, notes, canNavigate, setFocus, openView } = context;
  const dayKey = engine.units[engine.dayLevel].key;
  const focusDay = engine.startOf(focus, engine.dayLevel);
  const days = getWeekDays(engine, data, focusDay);
  const nowDay = engine.startOf(now, engine.dayLevel);
  const first = days[0] ?? focusDay;
  const monthParts = engine.decompose(first);
  const subtitle = engine.monthLevel > engine.dayLevel
    ? `${getUnitName(engine, monthParts, engine.monthLevel)}${engine.yearLevel > engine.monthLevel ? ` ${getUnitNumber(engine, monthParts, engine.yearLevel)}` : ''}`
    : undefined;
  const clock = formatCalendarClock(engine, data, now);

  return (
    <div className="calendar-view">
      <PeriodNav
        title={`${engine.weekName} ${getWeekNumber(engine, data, first)}`}
        subtitle={subtitle}
        canNavigate={canNavigate}
        previousLabel={`Previous ${engine.weekName.toLowerCase()}`}
        nextLabel={`Next ${engine.weekName.toLowerCase()}`}
        onPrevious={() => setFocus(engine.add(first, dayKey, -1))}
        onNext={() => setFocus(engine.add(days[days.length - 1] ?? first, dayKey, 1))}
      />
      <div className="calendar-week" style={{ gridTemplateColumns: `repeat(${Math.max(1, days.length)}, minmax(0, 1fr))` }}>
        {days.map((day) => {
          const dayNotes = getNotesInRange(notes, { start: day, end: engine.add(day, dayKey, 1) });
          const parts = engine.decompose(day);
          const isToday = day === nowDay;
          const fraction = isToday ? getDayFraction(engine, now) : null;
          return (
            <button
              key={day}
              type="button"
              disabled={!canNavigate}
              className={`calendar-week__day ${isToday ? 'calendar-week__day--today' : ''} ${day < nowDay ? 'calendar-week__day--past' : ''}`}
              onClick={() => openView('day', day)}
              aria-label={formatCalendarDate(engine, data, day)}
            >
              <span className="calendar-week__weekday">{shortName(getWeekdayName(engine, day), 3)}</span>
              <span className="calendar-week__number">{getUnitNumber(engine, parts, engine.dayLevel)}</span>
              <span className="calendar-week__notes">
                {dayNotes.map((note) => (
                  <span key={note.id} className="calendar-note-chip" style={noteStyle(note)} title={note.title}>{note.title}</span>
                ))}
              </span>
              {fraction !== null && (
                <span className="calendar-week__now" style={{ top: `${fraction * 100}%` }} title={clock}>
                  {clock && <span className="calendar-week__now-label">{clock}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ----- Day view -----

function getSlots(engine: CalendarEngine, day: PeriodRange): { start: number; end: number }[] {
  const level = engine.dayLevel - 1;
  const starts = listStarts(engine, day, level, 2000);
  const group = Math.max(1, Math.ceil(starts.length / 24));
  const slots: { start: number; end: number }[] = [];
  for (let index = 0; index < starts.length; index += group) {
    slots.push({ start: starts[index], end: starts[index + group] ?? day.end });
  }
  return slots;
}

function getSlotLabel(engine: CalendarEngine, start: number): string {
  const level = engine.dayLevel - 1;
  const unit = engine.units[level];
  const parts = engine.decompose(start);
  if (unit.names) return getUnitName(engine, parts, level);
  const lower = engine.units.slice(0, level);
  if (lower.every((item) => !item.names)) {
    const pad = (value: number) => String(value).padStart(2, '0');
    // Like a clock: "08:00" for hours over minutes.
    return level > 0 ? `${pad(getUnitNumber(engine, parts, level))}:${pad(getUnitNumber(engine, parts, level - 1))}` : pad(getUnitNumber(engine, parts, level));
  }
  return `${unit.name} ${getUnitNumber(engine, parts, level)}`;
}

function DayView(context: ViewContext & { onSetTime: (time: number) => void; onEditNote: (note: CalendarNote | null, time: number) => void; canEdit: boolean }) {
  const { engine, data, now, focus, notes, canNavigate, setFocus, onSetTime, onEditNote, canEdit } = context;
  const dayKey = engine.units[engine.dayLevel].key;
  const day = getPeriod(engine, focus, engine.dayLevel);
  const slots = getSlots(engine, day);
  const dayNotes = getNotesInRange(notes, day);

  return (
    <div className="calendar-view">
      <PeriodNav
        title={formatCalendarDate(engine, data, day.start)}
        canNavigate={canNavigate}
        previousLabel={`Previous ${engine.units[engine.dayLevel].name.toLowerCase()}`}
        nextLabel={`Next ${engine.units[engine.dayLevel].name.toLowerCase()}`}
        onPrevious={() => setFocus(engine.add(day.start, dayKey, -1))}
        onNext={() => setFocus(engine.add(day.start, dayKey, 1))}
        actions={canEdit ? (
          <Tooltip content="Add a note on this day">
            <button
              type="button"
              className="calendar-widget__nav-button"
              aria-label="Add note"
              onClick={() => onEditNote(null, now >= day.start && now < day.end ? now : day.start)}
            >
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        ) : undefined}
      />
      <div className="calendar-day">
        {slots.map((slot) => {
          const isCurrent = now >= slot.start && now < slot.end;
          const isPast = now >= slot.end;
          const slotNotes = getNotesInRange(dayNotes, slot);
          const fraction = isCurrent ? (now - slot.start) / (slot.end - slot.start) : 0;
          return (
            <div key={slot.start} className={`calendar-day__slot ${isCurrent ? 'calendar-day__slot--current' : ''} ${isPast ? 'calendar-day__slot--past' : ''}`}>
              {isCurrent && <span className="calendar-day__slot-progress" style={{ width: `${fraction * 100}%` }} />}
              <span className="calendar-day__slot-label">{getSlotLabel(engine, slot.start)}</span>
              <span className="calendar-day__slot-notes">
                {slotNotes.map((note) => (
                  canEdit ? (
                    <button key={note.id} type="button" className="calendar-note-chip" style={noteStyle(note)} onClick={() => onEditNote(note, note.time)} title={`Edit “${note.title}”`}>
                      {note.title}
                    </button>
                  ) : (
                    <span key={note.id} className="calendar-note-chip" style={noteStyle(note)}>{note.title}</span>
                  )
                ))}
              </span>
              {canEdit && !isCurrent && (
                <Tooltip content="Move the current time here">
                  <button type="button" className="calendar-day__slot-action" aria-label={`Set time to ${getSlotLabel(engine, slot.start)}`} onClick={() => onSetTime(slot.start)}>
                    Go
                  </button>
                </Tooltip>
              )}
              {isCurrent && <span className="calendar-day__slot-now">Now</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----- Dialogs -----

/** Inputs for every unit, largest first: number fields, or menus for named units. */
export function TimePartsInputs({ engine, parts, onChange, idPrefix }: { engine: CalendarEngine; parts: number[]; onChange: (parts: number[]) => void; idPrefix: string }) {
  const levels = engine.units.map((_, index) => index).reverse();
  const setPart = (level: number, value: number) => {
    const next = [...parts];
    next[level] = value;
    // Keep smaller parts inside the new range, e.g. day 31 when switching to a 30-day month.
    onChange(engine.decompose(engine.compose(next)));
  };
  return (
    <div className="calendar-parts">
      {levels.map((level) => {
        const unit = engine.units[level];
        const id = `${idPrefix}-${unit.key}`;
        const isTop = level === engine.units.length - 1;
        const count = isTop ? 0 : engine.childCount(level + 1, parts);
        return (
          <label key={unit.key} htmlFor={id} className="calendar-parts__field">
            <span className="calendar-parts__label">{unit.name}</span>
            {unit.names && !isTop ? (
              <select id={id} className={INPUT_CLASS} value={parts[level]} onChange={(event) => setPart(level, Number(event.target.value))}>
                {Array.from({ length: count }, (_, index) => (
                  <option key={index} value={index}>{unit.names?.[index]?.trim() || `${unit.name} ${index + unit.startAt}`}</option>
                ))}
              </select>
            ) : (
              <input
                id={id}
                type="number"
                inputMode="numeric"
                className={`${INPUT_CLASS} text-center`}
                value={parts[level] + unit.startAt}
                min={isTop ? undefined : unit.startAt}
                max={isTop ? undefined : unit.startAt + count - 1}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (event.target.value.trim() === '' || !Number.isFinite(value)) return;
                  setPart(level, Math.trunc(value) - unit.startAt);
                }}
              />
            )}
          </label>
        );
      })}
    </div>
  );
}

type ChangeTab = 'advance' | 'rewind' | 'set';

export interface ResolvedStep {
  id: string;
  amount: number;
  unit: string;
  formula?: string;
}

function ChangeTimeDialog({ widgetId, engine, data, now, steps, allowRewind, onClose }: {
  widgetId: string;
  engine: CalendarEngine;
  data: WidgetData;
  now: number;
  steps: ResolvedStep[];
  allowRewind: boolean;
  onClose: () => void;
}) {
  const units = getAdvanceUnits(engine);
  const [tab, setTab] = useState<ChangeTab>('advance');
  const [amount, setAmount] = useState('1');
  const [unit, setUnit] = useState(units.find((item) => item.key === 'hour')?.key ?? units[Math.min(units.length - 1, Math.max(0, engine.dayLevel - 1))]?.key ?? units[0].key);
  const [parts, setParts] = useState(() => engine.decompose(now));
  const [previewTarget, setPreviewTarget] = useState<number | null>(null);
  const direction = tab === 'rewind' ? -1 : 1;
  const parsed = Number(amount);
  const validAmount = amount.trim() !== '' && Number.isFinite(parsed) && parsed > 0;
  const customTarget = validAmount ? engine.add(now, unit, parsed * direction) : now;
  const formTarget = tab === 'set' ? engine.compose(parts) : customTarget;
  const shownTarget = previewTarget ?? formTarget;
  const canApply = formTarget !== now;
  const nextNote = tab === 'advance' ? getNextNote(data.calendarNotes, now) : undefined;
  const tabs: { id: ChangeTab; label: string }[] = [
    { id: 'advance', label: 'Advance' },
    ...(allowRewind ? [{ id: 'rewind' as const, label: 'Rewind' }] : []),
    { id: 'set', label: 'Set date' },
  ];

  const applyShift = (shiftAmount: number, shiftUnit: string) => {
    changeCalendarTime(widgetId, engine.add(now, shiftUnit, shiftAmount * direction), {
      kind: direction < 0 ? 'rewind' : 'advance',
      amountText: formatAmount(engine, shiftAmount, shiftUnit),
    });
    onClose();
  };

  const applyForm = () => {
    if (!canApply) return;
    if (tab === 'set') {
      changeCalendarTime(widgetId, formTarget, { kind: 'set' });
      onClose();
    } else {
      applyShift(parsed, unit);
    }
  };

  const previewProps = (target: number) => ({
    onMouseEnter: () => setPreviewTarget(target),
    onMouseLeave: () => setPreviewTarget(null),
    onFocus: () => setPreviewTarget(target),
    onBlur: () => setPreviewTarget(null),
  });

  const clock = formatCalendarClock(engine, data, now);

  return (
    <WidgetDialogShell titleId={`calendar-change-${widgetId}`} title="Change time" onCancel={onClose} onSubmit={applyForm}>
      <div className="calendar-change__now">
        {clock && <span className="calendar-change__now-clock">{clock}</span>}
        <span className="calendar-change__now-date">{formatCalendarDate(engine, data, now)}</span>
      </div>

      <div role="tablist" aria-label="Change type" className="calendar-widget__tabs mt-3">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => {
              setTab(item.id);
              setPreviewTarget(null);
            }}
            className={`calendar-widget__tab calendar-change__tab ${tab === item.id ? 'calendar-widget__tab--active' : ''}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'set' ? (
        <div className="mt-3">
          <TimePartsInputs engine={engine} parts={parts} onChange={setParts} idPrefix={`calendar-set-${widgetId}`} />
        </div>
      ) : (
        <>
          {steps.length > 0 && (
            <div className="mt-3">
              <div className="calendar-change__label">Quick</div>
              <div className="calendar-change__steps">
                {steps.map((step) => {
                  const target = engine.add(now, step.unit, step.amount * direction);
                  return (
                    <button
                      key={step.id}
                      type="button"
                      className="calendar-change__step"
                      disabled={!step.amount}
                      title={step.formula ? `Formula: ${step.formula}` : undefined}
                      aria-label={`${direction < 0 ? 'Rewind' : 'Advance'} ${formatAmount(engine, step.amount, step.unit)}`}
                      onClick={() => applyShift(step.amount, step.unit)}
                      {...previewProps(target)}
                    >
                      {direction < 0 ? '−' : '+'}{formatStepLabel(engine, step.amount, step.unit)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {nextNote && (
            <button
              type="button"
              className="calendar-change__note"
              onClick={() => {
                changeCalendarTime(widgetId, nextNote.time, { kind: 'advance', amountText: formatDuration(engine, now, nextNote.time) });
                onClose();
              }}
              {...previewProps(nextNote.time)}
            >
              <span className="calendar-note-dot" style={noteStyle(nextNote)} />
              <span className="min-w-0 flex-1 truncate">Skip to <strong>{nextNote.title}</strong></span>
              <span className="flex-none text-theme-muted">in {formatDuration(engine, now, nextNote.time)}</span>
            </button>
          )}
          <div className="mt-3">
            <label htmlFor={`calendar-change-amount-${widgetId}`} className="calendar-change__label">Custom</label>
            <div className="flex gap-2">
              <div className="w-20 flex-none">
                <input
                  id={`calendar-change-amount-${widgetId}`}
                  autoFocus
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  onFocus={(event) => event.currentTarget.select()}
                  className={`${INPUT_CLASS} h-10 text-center text-lg font-bold`}
                />
              </div>
              <select aria-label="Unit" value={unit} onChange={(event) => setUnit(event.target.value)} className={`${INPUT_CLASS} h-10 min-w-0 flex-1`}>
                {units.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
            </div>
          </div>
        </>
      )}

      <div className="calendar-change__preview" aria-live="polite">
        {shownTarget !== now ? (
          <>
            <span className="calendar-change__preview-arrow">→</span>
            <span className="min-w-0">
              <span className="block font-semibold text-theme-ink">{formatCalendarDateTime(engine, data, shownTarget)}</span>
              <span className="block text-xs text-theme-muted">{shownTarget > now ? 'in' : ''} {formatDuration(engine, now, shownTarget)}{shownTarget < now ? ' earlier' : ''}</span>
            </span>
          </>
        ) : (
          <span className="text-theme-muted">Pick a quick step or enter an amount.</span>
        )}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="widget-control px-3 py-1.5 text-sm">Cancel</button>
        <button type="submit" disabled={!canApply} className="widget-control widget-control--primary px-3 py-1.5 text-sm">
          {tab === 'set' ? 'Set date' : tab === 'rewind' ? 'Rewind' : 'Advance'}
        </button>
      </div>
    </WidgetDialogShell>
  );
}

function NoteDialog({ widgetId, engine, note, time, onClose }: {
  widgetId: string;
  engine: CalendarEngine;
  note: CalendarNote | null;
  time: number;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [color, setColor] = useState(note?.color ?? '');
  const [parts, setParts] = useState(() => engine.decompose(time));
  const canSave = title.trim().length > 0;

  return (
    <WidgetDialogShell
      titleId={`calendar-note-${widgetId}`}
      title={note ? 'Edit note' : 'New note'}
      onCancel={onClose}
      onSubmit={() => {
        if (!canSave) return;
        saveCalendarNote(widgetId, { id: note?.id ?? uuidv4(), title: title.trim(), time: engine.compose(parts), ...(color ? { color } : {}) });
        onClose();
      }}
    >
      <label htmlFor={`calendar-note-title-${widgetId}`} className="mt-3 block text-sm font-medium">Title</label>
      <input
        id={`calendar-note-title-${widgetId}`}
        autoFocus
        value={title}
        placeholder="Festival, deadline, meeting…"
        onChange={(event) => setTitle(event.target.value)}
        className={`mt-1 ${INPUT_CLASS} h-10`}
      />
      <div className="mt-3 text-sm font-medium">When</div>
      <div className="mt-1">
        <TimePartsInputs engine={engine} parts={parts} onChange={setParts} idPrefix={`calendar-note-${widgetId}`} />
      </div>
      <div className="mt-3 text-sm font-medium">Color</div>
      <div role="radiogroup" aria-label="Note color" className="mt-1 flex gap-1.5">
        {NOTE_COLORS.map((item) => (
          <button
            key={item || 'theme'}
            type="button"
            role="radio"
            aria-checked={color === item}
            aria-label={item || 'Theme color'}
            onClick={() => setColor(item)}
            className={`calendar-note-swatch ${color === item ? 'calendar-note-swatch--selected' : ''}`}
            style={item ? { backgroundColor: item } : undefined}
          />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        {note && (
          <button
            type="button"
            className="widget-control mr-auto gap-1 px-3 py-1.5 text-sm text-red-500"
            onClick={() => {
              deleteCalendarNote(widgetId, note.id);
              onClose();
            }}
          >
            <TrashIcon className="h-3.5 w-3.5" /> Delete
          </button>
        )}
        <button type="button" onClick={onClose} className="widget-control px-3 py-1.5 text-sm">Cancel</button>
        <button type="submit" disabled={!canSave} className="widget-control widget-control--primary px-3 py-1.5 text-sm">Save</button>
      </div>
    </WidgetDialogShell>
  );
}

// ----- Widget -----

function getStepAmount(step: CalendarStep, labels: Record<string, string | number>): number {
  if (!step.amountFormula) return step.amount;
  const computed = evaluateFormula(step.amountFormula, labels);
  return computed !== null && Number.isFinite(computed) ? computed : step.amount;
}

export default function CalendarWidget({ widget, mode, interactive = true }: Props) {
  const data = widget.data;
  const engine = getCalendarEngine(data);
  const now = getCalendarTime(data);
  const views = getEnabledViews(data, engine);
  const defaultView = data.calendarDefaultView && views.includes(data.calendarDefaultView) ? data.calendarDefaultView : views[0];
  const [view, setView] = useState<CalendarViewId>(defaultView);
  const [browse, setBrowse] = useState<number | null>(null);
  const [dialog, setDialog] = useState<{ type: 'change' } | { type: 'note'; note: CalendarNote | null; time: number } | null>(null);
  const steps = (data.calendarSteps ?? []).filter((step) => isValidUnitKey(engine, step.unit));
  const labels = useFormulaLabels(steps.some((step) => step.amountFormula));
  const resolvedSteps: ResolvedStep[] = steps.map((step) => ({ id: step.id, amount: getStepAmount(step, labels), unit: step.unit, formula: step.amountFormula }));
  const canEdit = interactive && mode === 'play';
  const canNavigate = interactive && mode === 'play';
  const showRewind = data.calendarShowRewind !== false;
  const activeView = views.includes(view) ? view : defaultView;
  const focus = browse ?? now;
  const notes = data.calendarNotes ?? [];

  useEffect(() => {
    if (!views.includes(view)) setView(defaultView);
  }, [defaultView, view, views]);

  // A browsed moment means nothing once the units change (e.g. after loading a preset).
  const structureKey = JSON.stringify([data.calendarMode, data.calendarUnits, data.calendarWeekdays, data.calendarWeekResetsEachMonth]);
  useEffect(() => {
    setBrowse(null);
  }, [structureKey]);

  const openView = (target: CalendarViewId, time: number): boolean => {
    const fallback: Record<CalendarViewId, CalendarViewId[]> = {
      day: ['day', 'week', 'month'],
      week: ['week', 'day', 'month'],
      month: ['month', 'week', 'day'],
      year: ['year', 'month'],
      clock: ['clock'],
    };
    const next = fallback[target].find((item) => views.includes(item));
    setBrowse(time);
    if (!next) return false;
    setView(next);
    return true;
  };

  const viewPeriodLevel = activeView === 'year' ? engine.yearLevel : activeView === 'month' ? engine.monthLevel : engine.dayLevel;
  const isBrowsingAway = browse !== null && viewPeriodLevel >= 0 && (activeView === 'week'
    ? !getWeekDays(engine, data, engine.startOf(focus, engine.dayLevel)).includes(engine.startOf(now, engine.dayLevel))
    : engine.startOf(focus, viewPeriodLevel) !== engine.startOf(now, viewPeriodLevel));

  const context: ViewContext = {
    engine,
    data,
    now,
    focus,
    notes,
    canNavigate,
    setFocus: setBrowse,
    openView,
  };

  let content: ReactNode;
  switch (activeView) {
    case 'year': content = <YearView {...context} />; break;
    case 'month': content = <MonthView {...context} />; break;
    case 'week': content = <WeekView {...context} />; break;
    case 'day': content = (
      <DayView
        {...context}
        canEdit={canEdit}
        onSetTime={(time) => changeCalendarTime(widget.id, time, { kind: 'set' })}
        onEditNote={(note, time) => setDialog({ type: 'note', note, time })}
      />
    ); break;
    default: content = <ClockView {...context} />;
  }

  const clock = formatCalendarClock(engine, data, now);

  return (
    <div
      className="calendar-widget flex h-full w-full min-w-0 flex-col gap-1.5 font-body"
      onMouseDown={(event) => {
        if ((event.target as Element).closest('button, input, select')) event.stopPropagation();
      }}
    >
      {data.label && (
        <div className="widget-header flex-shrink-0">
          <div className="widget-header-title min-w-0 flex-1 truncate"><InlineFormulaText text={data.label} /></div>
        </div>
      )}

      {views.length > 1 && (
        <div role="tablist" aria-label="Calendar view" className="calendar-widget__tabs flex-shrink-0">
          {views.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={activeView === item}
              disabled={!canNavigate && activeView !== item}
              className={`calendar-widget__tab ${activeView === item ? 'calendar-widget__tab--active' : ''}`}
              onClick={() => setView(item)}
            >
              {CALENDAR_VIEWS.find((entry) => entry.id === item)?.label ?? item}
            </button>
          ))}
        </div>
      )}

      {activeView !== 'clock' && (
        <div className="calendar-widget__now">
          <span className="calendar-widget__now-dot" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate" title={formatCalendarDateTime(engine, data, now)}>
            <strong>{formatCalendarDate(engine, data, now)}</strong>
            {clock && <span className="calendar-widget__now-clock"> · {clock}</span>}
          </span>
          {isBrowsingAway && canNavigate && (
            <button type="button" className="calendar-widget__today" onClick={() => setBrowse(null)}>Today</button>
          )}
        </div>
      )}

      <div
        className="calendar-widget__body min-h-0 flex-1"
        onWheel={(event) => {
          const element = event.currentTarget;
          if (element.scrollHeight > element.clientHeight) event.stopPropagation();
        }}
      >
        {content}
      </div>

      {canEdit && (
        <button
          type="button"
          className="calendar-widget__change widget-control flex-shrink-0"
          onClick={() => setDialog({ type: 'change' })}
        >
          <ClockIcon className="h-3.5 w-3.5" />
          Change time
        </button>
      )}

      {dialog?.type === 'change' && (
        <ChangeTimeDialog
          widgetId={widget.id}
          engine={engine}
          data={data}
          now={now}
          steps={resolvedSteps}
          allowRewind={showRewind}
          onClose={() => {
            setDialog(null);
            setBrowse(null);
          }}
        />
      )}
      {dialog?.type === 'note' && (
        <NoteDialog widgetId={widget.id} engine={engine} note={dialog.note} time={dialog.time} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}
