import { useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { CalendarNote, CalendarStep, CalendarUnit, CalendarViewId, WidgetData } from '../../types';
import { useStore } from '../../store/useStore';
import { FormulaEditorDialog } from '../FormulaEditorDialog';
import { Tooltip } from '../Tooltip';
import { VariableLabelControl } from '../VariableLabelControl';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from '../icons';
import { TimePartsInputs } from '../widgets/CalendarWidget';
import { CollapsibleSection } from './CollapsibleSection';
import { IntegerInput } from './IntegerInput';
import type { EditorProps } from './types';
import {
  CALENDAR_PRESETS,
  CALENDAR_VIEWS,
  GREGORIAN_MONTHS,
  type CalendarEngine,
  createCalendarEngine,
  createCalendarUnit,
  formatCalendarDate,
  formatCalendarDateTime,
  formatCalendarPattern,
  getAdvanceUnits,
  getAvailableViews,
  getCalendarEngine,
  getCalendarLabelFields,
  getCalendarTime,
  getDefaultDateFormat,
  getDefaultRound,
  getDefaultTimeFormat,
  getViewUnavailableReason,
  isValidUnitKey,
  normalizeCalendarUnits,
} from '../../utils/calendar';

const inputClass = 'h-10 w-full min-w-0 px-2 text-sm border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent';
const smallInputClass = 'h-9 w-full min-w-0 px-2 text-sm border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent';
const MAX_NAMED_INSTANCES = 100;

/** Moves a time to a new unit structure, keeping each unit's position (so "Day 12 of Month 3" stays put). */
function remapTime(from: CalendarEngine, to: CalendarEngine, time: number): number {
  const oldParts = from.decompose(time);
  const parts = to.units.map((unit) => {
    const index = from.units.findIndex((item) => item.key === unit.key);
    return index >= 0 ? oldParts[index] + from.units[index].startAt - unit.startAt : 0;
  });
  const oldTop = from.units[from.units.length - 1];
  const oldTopLevel = to.units.findIndex((unit) => unit.key === oldTop.key);
  if (oldTopLevel >= 0 && oldTopLevel < to.units.length - 1) {
    // The old largest unit now sits inside a larger one: carry its count upward.
    const value = parts[oldTopLevel];
    parts[oldTopLevel] = 0;
    return to.add(to.compose(parts), oldTop.key, value);
  }
  return to.compose(parts);
}

function remapCalendar(data: WidgetData, changes: Partial<WidgetData>): Partial<WidgetData> {
  const before = createCalendarEngine(data);
  const nextData = { ...data, ...changes };
  const after = createCalendarEngine(nextData);
  const remapNote = (note: CalendarNote) => ({ ...note, time: remapTime(before, after, note.time) });
  return {
    ...changes,
    calendarTime: remapTime(before, after, getCalendarTime(data)),
    calendarNotes: (data.calendarNotes ?? []).map(remapNote),
  };
}

function Checkbox({ checked, onChange, children, disabled }: { checked: boolean; onChange: (checked: boolean) => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <label className={`flex cursor-pointer items-start gap-2 ${disabled ? 'opacity-50' : ''}`}>
      <input type="checkbox" disabled={disabled} checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 flex-none accent-theme-accent" />
      <span className="text-sm text-theme-ink">{children}</span>
    </label>
  );
}

function UnitInstances({ unit, parent, canVaryLength, onChange }: {
  unit: CalendarUnit;
  parent: CalendarUnit;
  canVaryLength: boolean;
  onChange: (changes: Partial<CalendarUnit>) => void;
}) {
  const total = Math.min(parent.count, MAX_NAMED_INSTANCES);
  const setName = (index: number, value: string) => {
    const names = Array.from({ length: total }, (_, item) => unit.names?.[item] ?? '');
    names[index] = value;
    onChange({ names: names.some((name) => name.trim()) ? names : undefined });
  };
  const setLength = (index: number, value: number) => {
    const lengths = Array.from({ length: total }, (_, item) => unit.lengths?.[item] ?? unit.count);
    lengths[index] = value;
    onChange({ lengths: lengths.some((length) => length !== unit.count) ? lengths : undefined });
  };
  return (
    <div className="mt-2 space-y-1 rounded-button border border-theme-border/60 p-2">
      <p className="text-xs text-theme-muted">
        One row per {unit.name.toLowerCase() || 'unit'} in a {parent.name.toLowerCase() || 'parent unit'}{parent.count > MAX_NAMED_INSTANCES ? ` (first ${MAX_NAMED_INSTANCES})` : ''}.
      </p>
      {Array.from({ length: total }, (_, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="w-8 flex-none text-right text-xs tabular-nums text-theme-muted">{index + (unit.startAt ?? 0)}</span>
          <input
            aria-label={`Name of ${unit.name} ${index + (unit.startAt ?? 0)}`}
            className={smallInputClass}
            placeholder={`${unit.name} ${index + (unit.startAt ?? 0)}`}
            value={unit.names?.[index] ?? ''}
            onChange={(event) => setName(index, event.target.value)}
          />
          {canVaryLength && (
            <div className="w-20 flex-none">
              <IntegerInput value={unit.lengths?.[index] ?? unit.count} min={1} ariaLabel={`Length of ${unit.name} ${index + (unit.startAt ?? 0)}`} onCommit={(value) => setLength(index, value)} />
            </div>
          )}
        </div>
      ))}
      {canVaryLength && <p className="text-[11px] text-theme-muted">The number on the right is how many of the smaller unit it lasts.</p>}
    </div>
  );
}

function UnitsEditor({ data, updateData }: { data: WidgetData; updateData: (changes: Partial<WidgetData>) => void }) {
  const units = normalizeCalendarUnits(data.calendarUnits);
  const [expanded, setExpanded] = useState<string | null>(null);
  const dayIndex = units.findIndex((unit) => unit.role === 'day');
  const commit = (next: CalendarUnit[], structural: boolean) => {
    updateData(structural ? remapCalendar(data, { calendarUnits: next }) : { calendarUnits: next });
  };
  const updateUnit = (id: string, changes: Partial<CalendarUnit>) => {
    const structural = 'count' in changes || 'lengths' in changes;
    commit(units.map((unit) => {
      if (unit.id !== id) {
        // Only one unit can hold each role.
        return changes.role && unit.role === changes.role ? { ...unit, role: undefined } : unit;
      }
      return { ...unit, ...changes };
    }), structural);
  };
  const moveUnit = (index: number, direction: -1 | 1) => {
    const next = [...units];
    const [unit] = next.splice(index, 1);
    next.splice(index + direction, 0, unit);
    commit(next, true);
  };

  return (
    <div className="space-y-2">
      {units.map((unit, index) => {
        const previous = units[index - 1];
        const parent = units[index + 1];
        const isExpanded = expanded === unit.id;
        return (
          <div key={unit.id} className="rounded-button border border-theme-border p-2">
            <div className="flex flex-wrap items-center gap-2">
              <input aria-label="Unit name" className={`${smallInputClass} flex-1 basis-24`} value={unit.name} placeholder="Name" onChange={(event) => updateUnit(unit.id, { name: event.target.value })} />
              <input aria-label="Plural name" className={`${smallInputClass} flex-1 basis-24`} value={unit.plural ?? ''} placeholder={`${unit.name || 'Unit'}s`} onChange={(event) => updateUnit(unit.id, { plural: event.target.value || undefined })} />
              <div className="flex flex-none gap-1">
                <Tooltip content="Smaller">
                  <button type="button" aria-label={`Move ${unit.name} down`} className="widget-control h-9 w-9" disabled={index === 0} onClick={() => moveUnit(index, -1)}><ArrowUpIcon className="h-3.5 w-3.5" /></button>
                </Tooltip>
                <Tooltip content="Larger">
                  <button type="button" aria-label={`Move ${unit.name} up`} className="widget-control h-9 w-9" disabled={index === units.length - 1} onClick={() => moveUnit(index, 1)}><ArrowDownIcon className="h-3.5 w-3.5" /></button>
                </Tooltip>
                <Tooltip content="Delete unit">
                  <button type="button" aria-label={`Delete ${unit.name}`} className="widget-control h-9 w-9 text-red-500" disabled={units.length <= 1} onClick={() => commit(units.filter((item) => item.id !== unit.id), true)}><TrashIcon className="h-3.5 w-3.5" /></button>
                </Tooltip>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-theme-ink">
              {previous ? (
                <>
                  <span>1 {unit.name || 'unit'} =</span>
                  <div className="w-20"><IntegerInput value={unit.count} min={1} ariaLabel={`${previous.name} per ${unit.name}`} onCommit={(count) => updateUnit(unit.id, { count })} /></div>
                  <span>{(previous.plural || `${previous.name}s`).toLowerCase()}</span>
                </>
              ) : (
                <span className="text-theme-muted">Smallest unit</span>
              )}
              <span className="ml-auto text-xs text-theme-muted">First is</span>
              <div className="w-16"><IntegerInput value={unit.startAt ?? 0} ariaLabel={`Number of the first ${unit.name}`} onCommit={(startAt) => updateUnit(unit.id, { startAt })} /></div>
              <div className="w-24 flex-none">
                <select aria-label={`Role of ${unit.name}`} className={smallInputClass} value={unit.role ?? ''} onChange={(event) => updateUnit(unit.id, { role: (event.target.value || undefined) as CalendarUnit['role'] })}>
                  <option value="">No role</option>
                  <option value="day">Day</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </div>
            </div>
            {parent && (
              <button type="button" className="mt-2 text-xs font-semibold text-theme-accent hover:underline" aria-expanded={isExpanded} onClick={() => setExpanded(isExpanded ? null : unit.id)}>
                {isExpanded ? 'Hide' : 'Edit'} names{index > dayIndex && dayIndex >= 0 ? ' and lengths' : ''}{unit.names ? ' (named)' : ''}
              </button>
            )}
            {parent && isExpanded && (
              <UnitInstances unit={unit} parent={parent} canVaryLength={index > 0 && index > dayIndex} onChange={(changes) => updateUnit(unit.id, changes)} />
            )}
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="widget-control gap-1.5 px-3 py-2 text-sm" onClick={() => commit([createCalendarUnit('Unit', 1), ...units.map((unit, index) => (index === 0 ? { ...unit, count: 2 } : unit))], true)}>
          <PlusIcon className="h-3.5 w-3.5" /> Smaller unit
        </button>
        <button type="button" className="widget-control gap-1.5 px-3 py-2 text-sm" onClick={() => commit([...units, createCalendarUnit('Unit', 10)], true)}>
          <PlusIcon className="h-3.5 w-3.5" /> Larger unit
        </button>
      </div>
      <p className="text-xs text-theme-muted">
        Roles tell the views which unit is the day, the month and the year. Lengths can vary for units above the day (e.g. months of 30 and 31 days).
      </p>
    </div>
  );
}

function StepRow({ step, engine, onChange, onDelete }: { step: CalendarStep; engine: CalendarEngine; onChange: (changes: Partial<CalendarStep>) => void; onDelete: () => void }) {
  const [showFormula, setShowFormula] = useState(false);
  const characters = useStore((state) => state.characters);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const character = useMemo(() => characters.find((item) => item.id === activeCharacterId), [characters, activeCharacterId]);
  const units = getAdvanceUnits(engine);
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 flex-none">
        {step.amountFormula ? (
          <div className="flex h-10 items-center justify-center rounded-button border border-theme-border px-1 text-xs italic text-theme-muted" title={step.amountFormula}>formula</div>
        ) : (
          <input
            aria-label="Amount"
            type="number"
            min="0"
            step="any"
            className={`${inputClass} text-center`}
            value={step.amount}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (Number.isFinite(value) && value >= 0) onChange({ amount: value });
            }}
          />
        )}
      </div>
      <select aria-label="Unit" className={`${inputClass} flex-1`} value={isValidUnitKey(engine, step.unit) ? step.unit : ''} onChange={(event) => onChange({ unit: event.target.value })}>
        {!isValidUnitKey(engine, step.unit) && <option value="">Choose a unit</option>}
        {units.map((unit) => <option key={unit.key} value={unit.key}>{unit.label}</option>)}
      </select>
      <Tooltip content={step.amountFormula ? `Formula: ${step.amountFormula}` : 'Use a formula for the amount'}>
        <button
          type="button"
          aria-pressed={!!step.amountFormula}
          aria-label={step.amountFormula ? 'Edit amount formula' : 'Set amount formula'}
          onClick={() => setShowFormula(true)}
          className={`flex h-10 w-10 flex-none items-center justify-center rounded-button border text-xs font-bold ${step.amountFormula ? 'border-theme-accent bg-theme-accent text-theme-paper' : 'border-theme-border text-theme-muted hover:border-theme-accent hover:text-theme-ink'}`}
        >
          <span className="italic">fx</span>
        </button>
      </Tooltip>
      <Tooltip content="Delete step">
        <button type="button" aria-label="Delete step" className="widget-control h-10 w-10 flex-none text-red-500" onClick={onDelete}><TrashIcon className="h-4 w-4" /></button>
      </Tooltip>
      {showFormula && (
        <FormulaEditorDialog
          formula={step.amountFormula}
          character={character}
          resultType="number"
          onApply={(formula) => {
            onChange({ amountFormula: formula || undefined });
            setShowFormula(false);
          }}
          onClear={step.amountFormula ? () => {
            onChange({ amountFormula: undefined });
            setShowFormula(false);
          } : undefined}
          onCancel={() => setShowFormula(false)}
        />
      )}
    </div>
  );
}

export function CalendarEditor({ widget, updateData }: EditorProps) {
  const data = widget.data;
  const engine = getCalendarEngine(data);
  const time = getCalendarTime(data);
  const isCustom = data.calendarMode === 'custom';
  const available = getAvailableViews(engine);
  const enabledViews = data.calendarViews ?? CALENDAR_VIEWS.map((view) => view.id);
  const steps = data.calendarSteps ?? [];
  const labels = data.calendarLabels ?? {};
  const notes = [...(data.calendarNotes ?? [])].sort((a, b) => a.time - b.time);
  const round = getDefaultRound(engine);
  const roundUnit = isValidUnitKey(engine, data.calendarRoundUnit) ? data.calendarRoundUnit! : round.unit;
  const advanceUnits = getAdvanceUnits(engine);
  const [weekdayDraft, setWeekdayDraft] = useState<string | null>(null);

  const toggleView = (view: CalendarViewId, enabled: boolean) => {
    const next = CALENDAR_VIEWS.map((item) => item.id).filter((id) => (id === view ? enabled : enabledViews.includes(id)));
    updateData({ calendarViews: next });
  };

  const setLabel = (key: string, label: string | undefined) => {
    const next = { ...labels };
    if (label) next[key] = label;
    else delete next[key];
    updateData({ calendarLabels: next });
  };

  const updateStep = (id: string, changes: Partial<CalendarStep>) => {
    updateData({ calendarSteps: steps.map((step) => (step.id === id ? { ...step, ...changes } : step)) });
  };

  const applyPreset = (presetId: string) => {
    const preset = CALENDAR_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    const changes = preset.create();
    const before = createCalendarEngine(data);
    const after = createCalendarEngine({ ...data, ...changes });
    updateData({
      ...changes,
      calendarLabels: {},
      calendarNotes: (data.calendarNotes ?? []).map((note) => ({ ...note, time: remapTime(before, after, note.time) })),
    });
  };

  const labelFields = getCalendarLabelFields(data);
  const dateFormatHelp = engine.units.map((unit) => `{${unit.token}}`).join(' ');

  return (
    <div className="widget-editor widget-editor--calendar space-y-4">
      <CollapsibleSection title="Current time">
        <p className="mb-2 text-sm font-semibold text-theme-ink">{formatCalendarDateTime(engine, data, time)}</p>
        <TimePartsInputs
          engine={engine}
          parts={engine.decompose(time)}
          idPrefix={`calendar-editor-time-${widget.id}`}
          onChange={(parts) => updateData({ calendarTime: engine.compose(parts) })}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Calendar">
        <div className="space-y-3">
          <div>
            <label htmlFor={`calendar-preset-${widget.id}`} className="mb-1 block text-sm font-medium text-theme-ink">Load a preset</label>
            <select id={`calendar-preset-${widget.id}`} className={inputClass} value="" onChange={(event) => applyPreset(event.target.value)}>
              <option value="">Replace the calendar with…</option>
              {CALENDAR_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.name} — {preset.description}</option>)}
            </select>
          </div>
          <div role="radiogroup" aria-label="Time units" className="grid grid-cols-2 gap-1">
            <button
              type="button"
              role="radio"
              aria-checked={!isCustom}
              className={`widget-control px-2 py-2 text-sm ${!isCustom ? 'widget-control--primary' : ''}`}
              onClick={() => isCustom && applyPreset('gregorian')}
            >
              Real time units
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={isCustom}
              className={`widget-control px-2 py-2 text-sm ${isCustom ? 'widget-control--primary' : ''}`}
              onClick={() => {
                if (isCustom) return;
                const changes = CALENDAR_PRESETS.find((preset) => preset.id === 'elapsed')!.create();
                // Start from the real calendar's units so switching keeps the same moment.
                const units: CalendarUnit[] = [
                  { id: 'second', name: 'Second', count: 1 },
                  { id: 'minute', name: 'Minute', count: 60 },
                  { id: 'hour', name: 'Hour', count: 60 },
                  { id: 'day', name: 'Day', count: 24, startAt: 1, role: 'day' },
                  { id: 'month', name: 'Month', count: 30, startAt: 1, role: 'month', names: [...GREGORIAN_MONTHS] },
                  { id: 'year', name: 'Year', count: 12, startAt: 0, role: 'year' },
                ];
                updateData(remapCalendar(data, {
                  ...changes,
                  calendarUnits: units,
                  calendarWeekdays: engine.weekdays,
                  calendarSteps: data.calendarSteps,
                  calendarLabels: {},
                }));
              }}
            >
              Custom units
            </button>
          </div>
          {!isCustom ? (
            <div>
              <label htmlFor={`calendar-week-start-${widget.id}`} className="mb-1 block text-sm font-medium text-theme-ink">Weeks start on</label>
              <select id={`calendar-week-start-${widget.id}`} className={inputClass} value={data.calendarWeekStart === 1 ? 1 : 0} onChange={(event) => updateData({ calendarWeekStart: Number(event.target.value) })}>
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
              </select>
              <p className="mt-1 text-xs text-theme-muted">Seconds, minutes, hours, days, weeks, months (28–31 days) and years, with leap years.</p>
            </div>
          ) : (
            <>
              <UnitsEditor data={data} updateData={updateData} />
              <div className="space-y-2 border-t border-theme-border pt-3">
                <label htmlFor={`calendar-weekdays-${widget.id}`} className="block text-sm font-medium text-theme-ink">Days of the week</label>
                <textarea
                  id={`calendar-weekdays-${widget.id}`}
                  rows={3}
                  className="w-full rounded-button border border-theme-border bg-theme-paper px-2 py-1 text-sm text-theme-ink focus:border-theme-accent focus:outline-none"
                  placeholder="One name per line (leave empty for no weeks)"
                  value={weekdayDraft ?? (data.calendarWeekdays ?? []).join('\n')}
                  onChange={(event) => setWeekdayDraft(event.target.value)}
                  onBlur={() => {
                    if (weekdayDraft === null) return;
                    updateData({ calendarWeekdays: weekdayDraft.split('\n').map((line) => line.trim()).filter(Boolean) });
                    setWeekdayDraft(null);
                  }}
                />
                {(data.calendarWeekdays?.length ?? 0) > 1 && (
                  <>
                    <div className="flex items-center gap-2">
                      <label htmlFor={`calendar-week-name-${widget.id}`} className="w-28 flex-none text-sm text-theme-ink">Name of a week</label>
                      <input id={`calendar-week-name-${widget.id}`} className={smallInputClass} value={data.calendarWeekName ?? ''} placeholder="Week" onChange={(event) => updateData({ calendarWeekName: event.target.value || undefined })} />
                    </div>
                    <Checkbox checked={!!data.calendarWeekResetsEachMonth} onChange={(checked) => updateData({ calendarWeekResetsEachMonth: checked })}>
                      Every month starts on the first day of the week
                    </Checkbox>
                    {!data.calendarWeekResetsEachMonth && (
                      <div className="flex items-center gap-2">
                        <label htmlFor={`calendar-week-offset-${widget.id}`} className="w-28 flex-none text-sm text-theme-ink">Very first day</label>
                        <select id={`calendar-week-offset-${widget.id}`} className={smallInputClass} value={data.calendarWeekOffset ?? 0} onChange={(event) => updateData({ calendarWeekOffset: Number(event.target.value) })}>
                          {(data.calendarWeekdays ?? []).map((name, index) => <option key={`${name}-${index}`} value={index}>{name}</option>)}
                        </select>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Views">
        <div className="space-y-2">
          {CALENDAR_VIEWS.map((view) => {
            const reason = getViewUnavailableReason(engine, view.id);
            return (
              <Checkbox key={view.id} checked={enabledViews.includes(view.id) && !reason} disabled={!!reason} onChange={(checked) => toggleView(view.id, checked)}>
                <span className="font-medium">{view.label}</span>
                <span className="block text-xs text-theme-muted">{reason ?? view.description}</span>
              </Checkbox>
            );
          })}
          <div className="pt-1">
            <label htmlFor={`calendar-default-view-${widget.id}`} className="mb-1 block text-sm font-medium text-theme-ink">Open on</label>
            <select id={`calendar-default-view-${widget.id}`} className={inputClass} value={data.calendarDefaultView ?? ''} onChange={(event) => updateData({ calendarDefaultView: (event.target.value || undefined) as CalendarViewId | undefined })}>
              <option value="">First enabled view</option>
              {CALENDAR_VIEWS.filter((view) => available.includes(view.id) && enabledViews.includes(view.id)).map((view) => <option key={view.id} value={view.id}>{view.label}</option>)}
            </select>
          </div>
          <p className="text-xs text-theme-muted">On the widget, click a month, a week number or a day to jump to its view.</p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Display">
        <div className="space-y-3">
          <div>
            <label htmlFor={`calendar-date-format-${widget.id}`} className="mb-1 block text-sm font-medium text-theme-ink">Date format</label>
            <input id={`calendar-date-format-${widget.id}`} className={inputClass} value={data.calendarDateFormat ?? ''} placeholder={getDefaultDateFormat(engine)} onChange={(event) => updateData({ calendarDateFormat: event.target.value || undefined })} />
            <p className="mt-1 text-xs text-theme-muted">Preview: <span className="text-theme-ink">{formatCalendarDate(engine, data, time)}</span></p>
          </div>
          {engine.dayLevel !== 0 && (
            <div>
              <label htmlFor={`calendar-time-format-${widget.id}`} className="mb-1 block text-sm font-medium text-theme-ink">Time format</label>
              <input id={`calendar-time-format-${widget.id}`} className={inputClass} value={data.calendarTimeFormat ?? ''} placeholder={getDefaultTimeFormat(engine) || 'No time of day'} onChange={(event) => updateData({ calendarTimeFormat: event.target.value || undefined })} />
              <p className="mt-1 text-xs text-theme-muted">Preview: <span className="text-theme-ink">{data.calendarTimeFormat ? formatCalendarPattern(engine, time, data.calendarTimeFormat) : formatCalendarDateTime(engine, data, time).split(' · ')[1] ?? '—'}</span></p>
            </div>
          )}
          <p className="text-xs leading-5 text-theme-muted">
            Placeholders: {dateFormatHelp}{engine.weekdays.length ? ' {weekday}' : ''}. Add <code>:2</code> to pad with zeros, <code>:name</code> or <code>:short</code> for names, <code>:ord</code> for 1st, 2nd…
          </p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Time steps" count={steps.length}>
        <div className="space-y-2">
          {steps.map((step) => (
            <StepRow
              key={step.id}
              step={step}
              engine={engine}
              onChange={(changes) => updateStep(step.id, changes)}
              onDelete={() => updateData({ calendarSteps: steps.filter((item) => item.id !== step.id) })}
            />
          ))}
          <button
            type="button"
            className="widget-control widget-control--primary gap-2 px-3 py-2 text-sm"
            onClick={() => updateData({ calendarSteps: [...steps, { id: uuidv4(), amount: 1, unit: advanceUnits[Math.max(0, engine.dayLevel)]?.key ?? advanceUnits[0].key }] })}
          >
            <PlusIcon className="h-4 w-4" /> Add step
          </button>
          <Checkbox checked={data.calendarShowRewind !== false} onChange={(checked) => updateData({ calendarShowRewind: checked })}>
            Allow rewinding time
          </Checkbox>
          <p className="text-xs text-theme-muted">Quick steps appear in the widget's Change time dialog. Amounts can come from formulas, e.g. travel time.</p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Automation">
        <div className="space-y-3">
          <div className="space-y-2">
            <Checkbox checked={!!data.calendarAdvanceOnRound} onChange={(checked) => updateData({ calendarAdvanceOnRound: checked })}>
              Advance when an Initiative Tracker starts a new round
            </Checkbox>
            {data.calendarAdvanceOnRound && (
              <div className="ml-6 flex items-center gap-2 border-l-2 border-theme-accent pl-3">
                <span className="text-sm text-theme-ink">By</span>
                <div className="w-20 flex-none">
                  <input
                    aria-label="Amount per round"
                    type="number"
                    min="0"
                    step="any"
                    className={`${inputClass} text-center`}
                    value={data.calendarRoundAmount ?? round.amount}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (Number.isFinite(value) && value > 0) updateData({ calendarRoundAmount: value });
                    }}
                  />
                </div>
                <select aria-label="Unit per round" className={`${inputClass} min-w-0 flex-1`} value={roundUnit} onChange={(event) => updateData({ calendarRoundUnit: event.target.value })}>
                  {advanceUnits.map((unit) => <option key={unit.key} value={unit.key}>{unit.label}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Checkbox
              checked={!!data.calendarSyncEffects}
              disabled={!engine.secondsPerUnit && !isCustom}
              onChange={(checked) => updateData({ calendarSyncEffects: checked })}
            >
              Also pass time in Temporary Effects widgets
            </Checkbox>
            {data.calendarSyncEffects && (
              <div className="ml-6 space-y-2 border-l-2 border-theme-accent pl-3">
                {isCustom && (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-theme-ink">
                    <span>1 {engine.units[0].name.toLowerCase()} lasts</span>
                    <div className="w-24 flex-none">
                      <input
                        aria-label="Seconds per smallest unit"
                        type="number"
                        min="0"
                        step="any"
                        className={`${inputClass} text-center`}
                        value={data.calendarSecondsPerUnit ?? ''}
                        placeholder="?"
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          updateData({ calendarSecondsPerUnit: event.target.value.trim() !== '' && Number.isFinite(value) && value > 0 ? value : undefined });
                        }}
                      />
                    </div>
                    <span>seconds</span>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 text-sm text-theme-ink">
                  <span>A round lasts</span>
                  <div className="w-20"><IntegerInput value={data.calendarRoundSeconds ?? 6} min={1} ariaLabel="Seconds per round" onCommit={(value) => updateData({ calendarRoundSeconds: value })} /></div>
                  <span>seconds (for round-based effects)</span>
                </div>
                {isCustom && !engine.secondsPerUnit && <p className="text-xs text-red-500">Set how long the smallest unit lasts to pass time in effects.</p>}
                <p className="text-xs text-theme-muted">Only moving forward passes time in effects. Effects on every sheet of this character are updated.</p>
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Notes" count={notes.length}>
        {notes.length === 0 ? (
          <p className="text-sm text-theme-muted">Add notes from the widget's Day view (+ button).</p>
        ) : (
          <div className="space-y-1">
            {notes.map((note) => (
              <div key={note.id} className="flex items-center gap-2">
                <span className="calendar-note-dot flex-none" style={note.color ? { backgroundColor: note.color } : undefined} />
                <input
                  aria-label="Note title"
                  className={smallInputClass}
                  value={note.title}
                  onChange={(event) => updateData({ calendarNotes: (data.calendarNotes ?? []).map((item) => (item.id === note.id ? { ...item, title: event.target.value } : item)) })}
                />
                <span className="w-40 flex-none truncate text-xs text-theme-muted" title={formatCalendarDateTime(engine, data, note.time)}>{formatCalendarDate(engine, data, note.time)}</span>
                <Tooltip content="Delete note">
                  <button type="button" aria-label={`Delete ${note.title}`} className="widget-control h-9 w-9 flex-none text-red-500" onClick={() => updateData({ calendarNotes: (data.calendarNotes ?? []).filter((item) => item.id !== note.id) })}>
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Variable labels">
        <p className="mb-2 text-xs text-theme-muted">Give a value a label to use it in formulas and text, e.g. <code>{'{@day}'}</code> or <code>IF(@hour &gt;= 20, "Night", "Day")</code>.</p>
        <div className="space-y-1">
          {labelFields.map((field) => (
            <div key={field.key} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm text-theme-ink">{field.label}</span>
              <span className="max-w-[45%] truncate text-xs tabular-nums text-theme-muted" title={String(field.value)}>{String(field.value)}</span>
              <VariableLabelControl valueLabel={labels[field.key]} onValueLabelChange={(label) => setLabel(field.key, label)} />
              {labels[field.key] && <code className="w-24 flex-none truncate text-xs text-theme-accent">@{labels[field.key]}</code>}
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}
