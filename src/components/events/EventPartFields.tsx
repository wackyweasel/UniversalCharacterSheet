import { useEffect, useMemo, useRef } from 'react';
import type { Character, CharacterEventParams, Widget } from '../../types';
import { createEffect, createTrigger, getEffectDefsFor, getEventSourceWidgets, getTriggerDefsFor } from '../../events/drafts';
import { getPartDef, getTargetChoices, isGlobalPartKind, type EventPart, type EventRole } from '../../events/editorDraft';
import { findWidget } from '../../events/helpers';
import { fillParams, findTargetOption, getEventIcon, getTriggerDef, getVisibleParams, resolveOptions } from '../../events/registry';
import {
  ANY_TARGET,
  type EffectDef,
  type EventOption,
  type EventParamSpec,
  type SpecContext,
  type TargetSpec,
  type TriggerDef,
} from '../../events/types';
import { getWidgetTitle } from '../../utils/characterVariables';
import { IconPickerField } from './IconPickerField';

/** A field that data chips can add an `@event_…` reference to. */
export interface DataTarget {
  element: HTMLInputElement | HTMLTextAreaElement;
  /** Text fields need `{…}` around a reference; formula fields take it as is. */
  mode: 'text' | 'formula';
  label: string;
  setValue: (value: string) => void;
}

export type RegisterDataTarget = (target: DataTarget) => void;

const GENERAL_SOURCE = 'general';
/** Effects that belong to no widget are listed in the source dropdown itself, as `general:<kind>`. */
const GENERAL_EFFECT_PREFIX = 'general:';
/** Source choice for an event that nothing sets off by itself; it stores the manual trigger. */
const NO_TRIGGER_SOURCE = 'none';
const MANUAL_TRIGGER_KIND = 'manual';

export const fieldClass = 'h-9 w-full min-w-0 rounded-button border bg-theme-paper px-2.5 text-sm font-body text-theme-ink placeholder:text-theme-muted disabled:opacity-60';

/** Choices for a part's source: its widget, else "general" for label and other widget-free kinds. */
function getSourceValue(role: EventRole, part: EventPart): string {
  if (part.widgetId) return part.widgetId;
  if (role === 'trigger' && part.kind === MANUAL_TRIGGER_KIND) return NO_TRIGGER_SOURCE;
  if (!part.kind || !isGlobalPartKind(role, part.kind)) return '';
  return role === 'effect' ? `${GENERAL_EFFECT_PREFIX}${part.kind}` : GENERAL_SOURCE;
}

function getDefsFor(role: EventRole, part: EventPart, widget: Widget | undefined): (TriggerDef | EffectDef)[] {
  if (part.widgetId && !widget) return [];
  return role === 'trigger' ? getTriggerDefsFor(widget) : getEffectDefsFor(widget);
}

function buildPart(role: EventRole, character: Character, def: TriggerDef | EffectDef, widget: Widget | undefined, id?: string): EventPart {
  return role === 'trigger'
    ? createTrigger(character, def as TriggerDef, widget)
    : createEffect(character, def as EffectDef, widget, id);
}

export function Field({ label, help, wide, children }: { label: string; help?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block min-w-0 ${wide ? 'event-inspector__wide' : ''}`}>
      <span className="mb-1 block text-xs font-bold text-theme-ink">{label}</span>
      {children}
      {help && <span className="mt-1 block text-[11px] leading-snug text-theme-muted">{help}</span>}
    </label>
  );
}

export function ProblemList({ problems }: { problems: string[] | undefined }) {
  if (!problems?.length) return null;
  return (
    <ul className="mt-3 space-y-0.5 rounded-button border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-600">
      {problems.map((problem) => <li key={problem}>⚠ {problem}</li>)}
    </ul>
  );
}

function SourceSelect({ character, role, value, onChange }: { character: Character; role: EventRole; value: string; onChange: (value: string) => void }) {
  const groups = useMemo(() => getEventSourceWidgets(character, role, value), [character, role, value]);
  const titleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    groups.forEach((group) => group.widgets.forEach((widget) => {
      const title = getWidgetTitle(widget);
      counts.set(title, (counts.get(title) ?? 0) + 1);
    }));
    return counts;
  }, [groups]);
  const missing = value !== '' && value !== GENERAL_SOURCE && value !== NO_TRIGGER_SOURCE && !value.startsWith(GENERAL_EFFECT_PREFIX) && !findWidget(character, value);
  const seen = new Map<string, number>();

  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass}>
      {value === '' && <option value="" disabled>Choose…</option>}
      {missing && <option value={value}>⚠ Deleted widget</option>}
      <optgroup label="General">
        {role === 'trigger' && <option value={NO_TRIGGER_SOURCE}>No trigger (run by hand or by another event)</option>}
        {role === 'trigger'
          ? <option value={GENERAL_SOURCE}>⚡ Labels</option>
          : getEffectDefsFor(undefined).map((def) => (
            <option key={def.kind} value={`${GENERAL_EFFECT_PREFIX}${def.kind}`}>{`${getEventIcon(def.kind, undefined)} ${def.label}`}</option>
          ))}
      </optgroup>
      {groups.map((group) => (
        <optgroup key={group.sheetId} label={character.sheets.length > 1 ? group.sheetName : 'Widgets'}>
          {group.widgets.map((widget) => {
            const title = getWidgetTitle(widget);
            const index = (seen.get(title) ?? 0) + 1;
            seen.set(title, index);
            const suffix = (titleCounts.get(title) ?? 0) > 1 ? ` (${index})` : '';
            return <option key={widget.id} value={widget.id}>{`${getEventIcon('', widget)} ${title}${suffix}`}</option>;
          })}
        </optgroup>
      ))}
    </select>
  );
}

function TargetSelect({ spec, ctx, value, onChange }: { spec: TargetSpec; ctx: SpecContext; value: string | undefined; onChange: (value: string) => void }) {
  const choices = getTargetChoices(spec, ctx);
  if (choices.length === 0) {
    return (
      <select disabled className={fieldClass}>
        <option>{spec.empty ?? 'Nothing to choose yet'}</option>
      </select>
    );
  }
  const selected = value === undefined
    ? choices[0].value
    : spec.any && value === ANY_TARGET ? ANY_TARGET : findTargetOption(spec, ctx, value)?.value;
  return (
    <select value={selected ?? value} onChange={(event) => onChange(event.target.value)} className={fieldClass}>
      {selected === undefined && value !== undefined && <option value={value}>⚠ {spec.missing ?? `${value} (missing)`}</option>}
      {choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
    </select>
  );
}

function ParamField({ spec, ctx, value, onChange, onDataTarget }: {
  spec: EventParamSpec;
  ctx: SpecContext;
  value: string;
  onChange: (value: string) => void;
  onDataTarget?: RegisterDataTarget;
}) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  if (spec.type === 'select') {
    const options = resolveOptions(spec.options, ctx);
    const known = options.some((option) => option.value === value);
    return (
      <Field label={spec.label} help={spec.help}>
        <select value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass}>
          {!known && <option value={value}>{value ? `⚠ ${value}` : 'Choose…'}</option>}
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </Field>
    );
  }
  if (spec.type === 'icon') {
    return <IconPickerField label={spec.label} help={spec.help} value={value} onChange={onChange} />;
  }
  const mono = spec.type !== 'text';
  const inputProps = {
    value,
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
    onFocus: onDataTarget && ((event: { currentTarget: HTMLInputElement | HTMLTextAreaElement }) => onDataTarget({
      element: event.currentTarget,
      mode: spec.type === 'text' ? 'text' as const : 'formula' as const,
      label: spec.label,
      setValue: (next: string) => onChangeRef.current(next),
    })),
    'data-event-data-target': onDataTarget ? 'true' : undefined,
    placeholder: spec.placeholder,
    autoComplete: 'off',
    spellCheck: !mono,
    className: `${fieldClass} ${mono ? 'font-mono' : ''}`,
  };
  return (
    <Field label={spec.label} help={spec.help} wide={spec.type === 'text'}>
      {spec.multiline ? <textarea rows={4} {...inputProps} className={`${inputProps.className} resize-y`} /> : <input type="text" {...inputProps} />}
    </Field>
  );
}

interface PartFieldsProps {
  character: Character;
  role: EventRole;
  part: EventPart;
  onChange: (part: EventPart) => void;
  /** Lets data chips add to this part's fields; trigger settings never get it. */
  onDataTarget?: RegisterDataTarget;
}

/** Widget, kind, target and params of a trigger or effect. */
export function PartFields({ character, role, part, onChange, onDataTarget }: PartFieldsProps) {
  const widget = findWidget(character, part.widgetId);
  const ctx: SpecContext = { character, widget };
  const source = getSourceValue(role, part);
  const defs = getDefsFor(role, part, widget);
  const def = getPartDef(role, part.kind);
  const params = fillParams(def?.params, part.params);
  const kindChoices: EventOption[] = defs
    .filter((item) => role !== 'trigger' || item.kind !== MANUAL_TRIGGER_KIND)
    .map((item) => ({ value: item.kind, label: item.label }));
  if (part.kind && source !== NO_TRIGGER_SOURCE && !kindChoices.some((choice) => choice.value === part.kind)) {
    kindChoices.unshift({ value: part.kind, label: `⚠ ${def?.label ?? part.kind}` });
  }

  const switchTo = (nextDef: TriggerDef | EffectDef, nextWidget: Widget | undefined) => {
    const next = buildPart(role, character, nextDef, nextWidget, part.id);
    // Keep settings that both kinds share, such as a threshold.
    const shared = Object.fromEntries((nextDef.params ?? []).filter((spec) => part.params?.[spec.key] !== undefined).map((spec) => [spec.key, part.params![spec.key]]));
    const keepTarget = nextDef.target && part.target !== undefined && getTargetChoices(nextDef.target, { character, widget: nextWidget }).some((choice) => choice.value === part.target);
    onChange({
      ...next,
      ...(keepTarget ? { target: part.target } : {}),
      ...(next.params ? { params: { ...next.params, ...shared } } : {}),
    });
  };

  const changeSource = (value: string) => {
    if (value === NO_TRIGGER_SOURCE) {
      const manual = getTriggerDef(MANUAL_TRIGGER_KIND);
      if (manual) onChange(buildPart(role, character, manual, undefined, part.id));
      return;
    }
    if (value.startsWith(GENERAL_EFFECT_PREFIX)) {
      const general = getEffectDefsFor(undefined).find((item) => item.kind === value.slice(GENERAL_EFFECT_PREFIX.length));
      if (general) switchTo(general, undefined);
      return;
    }
    const nextWidget = value === GENERAL_SOURCE ? undefined : findWidget(character, value);
    if (value !== GENERAL_SOURCE && !nextWidget) return;
    const first = (role === 'trigger' ? getTriggerDefsFor(nextWidget).filter((item) => item.kind !== MANUAL_TRIGGER_KIND) : getEffectDefsFor(nextWidget))[0];
    if (first) onChange(buildPart(role, character, first, nextWidget, part.id));
  };

  const changeKind = (kind: string) => {
    const nextDef = defs.find((item) => item.kind === kind);
    if (nextDef) switchTo(nextDef, widget);
  };

  const changeParam = (key: string, value: string) => onChange({ ...part, params: { ...params, [key]: value } as CharacterEventParams });
  const isEffect = role === 'effect';
  // A general effect is already picked in the first dropdown, so there is nothing more to choose.
  const picksKind = source !== '' && source !== NO_TRIGGER_SOURCE && !source.startsWith(GENERAL_EFFECT_PREFIX);

  return (
    <div className="event-inspector__fields">
      <Field label={isEffect ? 'Effect or widget' : 'Widget'}>
        <SourceSelect character={character} role={role} value={source} onChange={changeSource} />
      </Field>
      {picksKind && (
        <Field label={role === 'trigger' ? 'What happens' : 'What to do'}>
          <select value={part.kind} onChange={(event) => changeKind(event.target.value)} className={fieldClass} disabled={kindChoices.length === 0}>
            {kindChoices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
          </select>
        </Field>
      )}
      {source === NO_TRIGGER_SOURCE && (
        <p className="event-inspector__wide text-[11px] leading-snug text-theme-muted">
          Nothing sets this event off by itself. Run it with the Run button, or add a "Run another event" effect to another event.
        </p>
      )}
      {def?.target && (
        <Field label={def.target.label}>
          <TargetSelect spec={def.target} ctx={ctx} value={part.target} onChange={(target) => onChange({ ...part, target })} />
        </Field>
      )}
      {def && getVisibleParams(def.params, params, { ...ctx, target: part.target }).map((spec) => (
        <ParamField
          key={spec.key}
          spec={spec}
          ctx={{ ...ctx, target: part.target }}
          value={params[spec.key] ?? ''}
          onChange={(value) => changeParam(spec.key, value)}
          onDataTarget={onDataTarget}
        />
      ))}
    </div>
  );
}
