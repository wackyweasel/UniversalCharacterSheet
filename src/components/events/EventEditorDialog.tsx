import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../../store/useStore';
import { useEventsPanelStore, type EventEditorRequest } from '../../store/useEventsPanelStore';
import { getTutorialStepIndex, TUTORIAL_STEPS, useTutorialStore } from '../../store/useTutorialStore';
import type { Character, CharacterEvent, CharacterEventEffect, CharacterEventParams, CharacterEventTrigger, Widget } from '../../types';
import { eventLabel, findEventLabelRefs } from '../../events/constants';
import { createBlankEffect, createEffect, createEventDraft, createTrigger, getEffectDefsFor, getEventSourceWidgets, getTriggerDefsFor } from '../../events/drafts';
import { findWidget } from '../../events/helpers';
import {
  describeEffect,
  describeTrigger,
  fillParams,
  findTargetOption,
  getEffectDef,
  getEffectProblem,
  getEventIcon,
  getTriggerDef,
  getTriggerLabels,
  getTriggerOutputs,
  getTriggerProblem,
  getVisibleParams,
  isGlobalEffectKind,
  isGlobalTriggerKind,
  resolveOptions,
} from '../../events/registry';
import {
  ANY_TARGET,
  type EffectDef,
  type EventOption,
  type EventParamSpec,
  type SpecContext,
  type TargetSpec,
  type TriggerDef,
  type TriggerOutput,
} from '../../events/types';
import { getWidgetTitle } from '../../utils/characterVariables';
import { collectLabels, evaluateFormulaValue, hasUnresolvedRefs } from '../../utils/formulaEngine';
import type { FormulaLabels } from '../../utils/formulaSyntax';
import { ArrowDownIcon, ArrowUpIcon, BoltIcon, PlusIcon, TrashIcon, XIcon } from '../icons';

type Role = 'trigger' | 'effect';
type Part = CharacterEventTrigger & { id?: string };

interface Draft {
  name: string;
  enabled: boolean;
  trigger: CharacterEventTrigger;
  /** null while the event has no "only if" step. */
  condition: string | null;
  effects: CharacterEventEffect[];
}

interface DraftProblems {
  trigger: string[];
  condition: string[];
  effects: Record<string, string[]>;
  general: string[];
  count: number;
}

/** A field that trigger data chips can add an `@event_…` reference to. */
interface DataTarget {
  element: HTMLInputElement;
  /** Text fields need `{…}` around a reference; formula fields take it as is. */
  mode: 'text' | 'formula';
  label: string;
  setValue: (value: string) => void;
}

type RegisterDataTarget = (target: DataTarget) => void;

const GENERAL_SOURCE = 'general';
const fieldClass = 'h-9 w-full min-w-0 rounded-button border bg-theme-paper px-2.5 text-sm font-body text-theme-ink placeholder:text-theme-muted disabled:opacity-60';
const smallIconButtonClass = 'widget-control h-8 w-8 flex-none text-theme-muted';
const tutorialTargetClass = 'outline outline-4 outline-blue-500 outline-offset-2';

const findDiceRoller = (character: Character, label: string) => character.sheets
  .flatMap((sheet) => sheet.widgets)
  .find((widget) => widget.type === 'DICE_ROLLER' && String(widget.data?.label || '').toLowerCase() === label);

/** Events tutorial: fills in the part of the Hit event that the step explains, unless the reader already chose one. */
function applyTutorialLesson(character: Character, stepId: string, draft: Draft): Draft {
  if (stepId === 'events-editor-trigger') {
    const attack = findDiceRoller(character, 'attack');
    const def = getTriggerDef('dice.rolled');
    if (!attack || !def) return draft;
    return {
      ...draft,
      name: draft.name.trim() ? draft.name : 'Hit',
      trigger: draft.trigger.kind ? draft.trigger : createTrigger(character, def, attack),
    };
  }
  if (stepId === 'events-editor-condition') {
    return draft.condition?.trim() ? draft : { ...draft, condition: '@event_total >= 12' };
  }
  if (stepId === 'events-editor-effects') {
    const damage = findDiceRoller(character, 'damage');
    const roll = getEffectDef('roller.roll');
    const log = getEffectDef('log.message');
    if (!damage || !roll || !log || draft.effects.some((effect) => effect.kind)) return draft;
    return {
      ...draft,
      effects: [
        createEffect(character, roll, damage),
        { ...createEffect(character, log), params: { message: 'Hit with a {@event_total}!' } },
      ],
    };
  }
  return draft;
}

function isGlobalKind(role: Role, kind: string): boolean {
  return role === 'trigger' ? isGlobalTriggerKind(kind) : isGlobalEffectKind(kind);
}

function getDef(role: Role, kind: string): TriggerDef | EffectDef | undefined {
  return role === 'trigger' ? getTriggerDef(kind) : getEffectDef(kind);
}

/** Choices for a part's source: its widget, else "general" for label and other widget-free kinds. */
function getSourceValue(role: Role, part: Part): string {
  if (part.widgetId) return part.widgetId;
  return part.kind && isGlobalKind(role, part.kind) ? GENERAL_SOURCE : '';
}

function getDefsFor(role: Role, part: Part, widget: Widget | undefined): (TriggerDef | EffectDef)[] {
  if (part.widgetId && !widget) return [];
  return role === 'trigger' ? getTriggerDefsFor(widget) : getEffectDefsFor(widget);
}

function buildPart(role: Role, character: Character, def: TriggerDef | EffectDef, widget: Widget | undefined, id?: string): Part {
  return role === 'trigger'
    ? createTrigger(character, def as TriggerDef, widget)
    : createEffect(character, def as EffectDef, widget, id);
}

function getTargetChoices(spec: TargetSpec, ctx: SpecContext): EventOption[] {
  return [...(spec.any ? [{ value: ANY_TARGET, label: spec.any }] : []), ...spec.options(ctx)];
}

function initDraft(character: Character, request: EventEditorRequest): Draft | null {
  if (request.eventId) {
    const event = character.events?.find((item) => item.id === request.eventId);
    if (!event) return null;
    return {
      name: event.name ?? '',
      enabled: event.enabled,
      trigger: event.trigger,
      condition: event.condition?.trim() ? event.condition : null,
      effects: event.effects,
    };
  }
  const base = createEventDraft(character);
  const start = request.draft ?? {};
  return {
    name: start.name ?? '',
    enabled: start.enabled ?? true,
    trigger: start.trigger ?? base.trigger,
    condition: start.condition?.trim() ? start.condition : null,
    effects: start.effects?.length ? start.effects.map((effect) => (effect.id ? effect : { ...effect, id: uuidv4() })) : base.effects,
  };
}

/** Explains `@event_…` references that won't resolve where they're used. */
function eventRefProblem(role: Role | 'condition', field: string, text: string, labels: FormulaLabels): string | null {
  const refs = findEventLabelRefs(text).filter((ref) => !(ref in labels));
  if (!refs.length) return null;
  const list = refs.map((ref) => `@${ref}`).join(', ');
  return role === 'trigger'
    ? `${field} can't use ${list}; trigger data is only for the condition and effects`
    : `${field} uses ${list}, which this trigger doesn't provide`;
}

function paramProblems(role: Role, part: Part, labels: FormulaLabels): string[] {
  const def = getDef(role, part.kind);
  if (!def) return [];
  const params = fillParams(def.params, part.params);
  return getVisibleParams(def.params, params)
    .filter((spec) => spec.type !== 'select')
    .flatMap((spec) => {
      const value = params[spec.key] ?? '';
      const problem = eventRefProblem(role, spec.label, value, labels);
      if (problem) return [problem];
      return hasUnresolvedRefs(value, labels) ? [`${spec.label} uses a label that doesn't exist`] : [];
    });
}

/** Trigger settings are read before the trigger has data, so only the condition and effects see `eventLabels`. */
function getDraftProblems(character: Character, draft: Draft, baseLabels: FormulaLabels, eventLabels: FormulaLabels): DraftProblems {
  const labels = { ...baseLabels, ...eventLabels };
  const trigger = draft.trigger.kind
    ? [getTriggerProblem(character, draft.trigger), ...paramProblems('trigger', draft.trigger, baseLabels)].filter((problem): problem is string => !!problem)
    : ['Choose what triggers this event'];

  const condition: string[] = [];
  const formula = draft.condition?.trim();
  if (formula) {
    const eventProblem = eventRefProblem('condition', 'The condition', formula, labels);
    if (eventProblem) condition.push(eventProblem);
    else if (hasUnresolvedRefs(formula, labels)) condition.push("The condition uses a label that doesn't exist");
    else if (evaluateFormulaValue(`(${formula}) ? 1 : 0`, labels) === null) condition.push("The condition can't be worked out; check the formula");
  }

  const effects: Record<string, string[]> = {};
  for (const effect of draft.effects) {
    const problems = effect.kind
      ? [getEffectProblem(character, effect), ...paramProblems('effect', effect, labels)].filter((problem): problem is string => !!problem)
      : ['Choose what this effect does'];
    if (problems.length) effects[effect.id] = problems;
  }

  const general = draft.effects.length === 0 ? ['Add at least one effect'] : [];
  const count = trigger.length + condition.length + general.length + Object.values(effects).reduce((sum, list) => sum + list.length, 0);
  return { trigger, condition, effects, general, count };
}

/** Fills in values a saved event needs, such as a target left on its first choice. */
function normalizePart<T extends Part>(role: Role, character: Character, part: T): T {
  const def = getDef(role, part.kind);
  if (!def) return part;
  const next = { ...part };
  if (def.target && next.target === undefined) {
    const first = getTargetChoices(def.target, { character, widget: findWidget(character, part.widgetId) })[0];
    if (first) next.target = first.value;
  }
  if (def.params?.length) next.params = fillParams(def.params, part.params);
  else delete next.params;
  return next;
}

function toPayload(character: Character, draft: Draft): Omit<CharacterEvent, 'id'> {
  const name = draft.name.trim();
  const condition = draft.condition?.trim();
  return {
    ...(name ? { name } : {}),
    enabled: draft.enabled,
    trigger: normalizePart('trigger', character, draft.trigger),
    ...(condition ? { condition } : {}),
    effects: draft.effects.map((effect) => normalizePart('effect', character, effect)),
  };
}

function Field({ label, help, wide, children }: { label: string; help?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block min-w-0 ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1 block text-xs font-bold text-theme-ink">{label}</span>
      {children}
      {help && <span className="mt-1 block text-[11px] leading-snug text-theme-muted">{help}</span>}
    </label>
  );
}

function ProblemList({ problems }: { problems: string[] | undefined }) {
  if (!problems?.length) return null;
  return (
    <ul className="event-editor__problem mt-3 space-y-0.5 rounded-button border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-600">
      {problems.map((problem) => <li key={problem}>⚠ {problem}</li>)}
    </ul>
  );
}

function SourceSelect({ character, role, value, onChange }: { character: Character; role: Role; value: string; onChange: (value: string) => void }) {
  const groups = useMemo(() => getEventSourceWidgets(character, role), [character, role]);
  const titleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    groups.forEach((group) => group.widgets.forEach((widget) => {
      const title = getWidgetTitle(widget);
      counts.set(title, (counts.get(title) ?? 0) + 1);
    }));
    return counts;
  }, [groups]);
  const missing = value !== '' && value !== GENERAL_SOURCE && !findWidget(character, value);
  const seen = new Map<string, number>();

  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass}>
      {value === '' && <option value="" disabled>Choose…</option>}
      {missing && <option value={value}>⚠ Deleted widget</option>}
      <optgroup label="General">
        <option value={GENERAL_SOURCE}>{role === 'trigger' ? '⚡ Labels or the Run button' : '⚡ Labels, dice, the timeline or other events'}</option>
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
        <option>Nothing to choose yet</option>
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
  const mono = spec.type !== 'text';
  return (
    <Field label={spec.label} help={spec.help} wide={spec.type === 'text'}>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onDataTarget && ((event) => onDataTarget({
          element: event.currentTarget,
          mode: spec.type === 'text' ? 'text' : 'formula',
          label: spec.label,
          setValue: (next) => onChangeRef.current(next),
        }))}
        data-event-data-target={onDataTarget ? 'true' : undefined}
        placeholder={spec.placeholder}
        autoComplete="off"
        spellCheck={!mono}
        className={`${fieldClass} ${mono ? 'font-mono' : ''}`}
      />
    </Field>
  );
}

interface PartFieldsProps {
  character: Character;
  role: Role;
  part: Part;
  onChange: (part: Part) => void;
  /** Lets trigger data chips add to this part's fields; trigger settings never get it. */
  onDataTarget?: RegisterDataTarget;
}

/** Widget, kind, target and params of a trigger or effect. */
function PartFields({ character, role, part, onChange, onDataTarget }: PartFieldsProps) {
  const widget = findWidget(character, part.widgetId);
  const ctx: SpecContext = { character, widget };
  const source = getSourceValue(role, part);
  const defs = getDefsFor(role, part, widget);
  const def = getDef(role, part.kind);
  const params = fillParams(def?.params, part.params);
  const kindChoices: EventOption[] = defs.map((item) => ({ value: item.kind, label: item.label }));
  if (part.kind && !kindChoices.some((choice) => choice.value === part.kind)) {
    kindChoices.unshift({ value: part.kind, label: `⚠ ${def?.label ?? part.kind}` });
  }

  const changeSource = (value: string) => {
    const nextWidget = value === GENERAL_SOURCE ? undefined : findWidget(character, value);
    if (value !== GENERAL_SOURCE && !nextWidget) return;
    const first = (role === 'trigger' ? getTriggerDefsFor(nextWidget) : getEffectDefsFor(nextWidget))[0];
    if (first) onChange(buildPart(role, character, first, nextWidget, part.id));
  };

  const changeKind = (kind: string) => {
    const nextDef = defs.find((item) => item.kind === kind);
    if (!nextDef) return;
    const next = buildPart(role, character, nextDef, widget, part.id);
    // Keep settings that both kinds share, such as a threshold.
    const shared = Object.fromEntries((nextDef.params ?? []).filter((spec) => part.params?.[spec.key] !== undefined).map((spec) => [spec.key, part.params![spec.key]]));
    const keepTarget = nextDef.target && part.target !== undefined && getTargetChoices(nextDef.target, ctx).some((choice) => choice.value === part.target);
    onChange({
      ...next,
      ...(keepTarget ? { target: part.target } : {}),
      ...(next.params ? { params: { ...next.params, ...shared } } : {}),
    });
  };

  const changeParam = (key: string, value: string) => onChange({ ...part, params: { ...params, [key]: value } as CharacterEventParams });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Widget">
        <SourceSelect character={character} role={role} value={source} onChange={changeSource} />
      </Field>
      {source !== '' && (
        <Field label={role === 'trigger' ? 'What happens' : 'What to do'}>
          <select value={part.kind} onChange={(event) => changeKind(event.target.value)} className={fieldClass} disabled={kindChoices.length === 0}>
            {kindChoices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
          </select>
        </Field>
      )}
      {def?.target && (
        <Field label={def.target.label}>
          <TargetSelect spec={def.target} ctx={ctx} value={part.target} onChange={(target) => onChange({ ...part, target })} />
        </Field>
      )}
      {def && getVisibleParams(def.params, params).map((spec) => (
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

/** Adds `ref` at the field's caret; text fields get `{…}` around it unless the caret is already inside braces. */
function insertDataRef(target: DataTarget, ref: string): number {
  const { element, mode } = target;
  const value = element.value;
  const start = element.selectionStart ?? value.length;
  const before = value.slice(0, start);
  const after = value.slice(element.selectionEnd ?? start);
  let text = mode === 'text' && before.lastIndexOf('{') <= before.lastIndexOf('}') ? `{${ref}}` : ref;
  if (/[\w)}]$/.test(before)) text = ` ${text}`;
  target.setValue(before + text + after);
  return before.length + text.length;
}

function TriggerData({ outputs, status, onPick }: { outputs: TriggerOutput[]; status: string; onPick: (key: string) => void }) {
  if (!outputs.length) return null;
  return (
    <div className="mt-3 border-t border-dashed border-theme-border pt-2.5" role="group" aria-labelledby="event-editor-data-title" data-tutorial="event-editor-data">
      <p id="event-editor-data-title" className="text-xs font-bold text-theme-ink">Passes along</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {outputs.map((output) => {
          const ref = `@${eventLabel(output.key)}`;
          return (
            <button
              key={output.key}
              type="button"
              data-event-data-chip="true"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onPick(output.key)}
              title={`Add ${ref} to the condition or effect field you're editing`}
              className="event-editor__chip"
            >
              <code>{ref}</code>
              <span>{output.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-theme-muted" aria-live="polite">
        {status || 'Use these in the condition or an effect. Click one to add it where you were typing.'}
      </p>
    </div>
  );
}

function Sentence({ icon, text }: { icon: string; text: string }) {
  return (
    <p className="mt-3 flex items-start gap-2 border-t border-dashed border-theme-border pt-2.5 text-sm text-theme-ink">
      <span className="event-flow__icon" aria-hidden="true">{icon}</span>
      <span className="min-w-0 flex-1 break-words">{text}</span>
    </p>
  );
}

function StepHeader({ pill, pillLabel, title, children }: { pill: 'when' | 'if' | 'then'; pillLabel: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className={`event-flow__pill event-flow__pill--${pill} w-14 flex-none`}>{pillLabel}</span>
      <h3 className="min-w-0 flex-1 text-sm font-bold text-theme-ink">{title}</h3>
      {children}
    </div>
  );
}

interface EventEditorDialogProps {
  character: Character;
  request: EventEditorRequest;
}

function EventEditorDialog({ character, request }: EventEditorDialogProps) {
  const closeEditor = useEventsPanelStore((state) => state.closeEditor);
  const addEvent = useStore((state) => state.addCharacterEvent);
  const updateEvent = useStore((state) => state.updateCharacterEvent);
  const [draft, setDraft] = useState<Draft | null>(() => initDraft(character, request));
  const [attempted, setAttempted] = useState(false);
  const initialCharacterId = useRef(character.id);
  const nameRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const isEditing = !!request.eventId;
  const eventExists = !request.eventId || !!character.events?.some((event) => event.id === request.eventId);
  const tutorialStepId = useTutorialStore((state) => (state.tutorialStep !== null ? TUTORIAL_STEPS[state.tutorialStep]?.id : undefined));
  const inTutorialLesson = !isEditing && (tutorialStepId === 'events-new' || !!tutorialStepId?.startsWith('events-editor-'));

  // A layout effect, so the lesson's fields exist before the tutorial bubble scrolls to them.
  useLayoutEffect(() => {
    if (isEditing || !tutorialStepId) return;
    setDraft((current) => (current ? applyTutorialLesson(character, tutorialStepId, current) : current));
    // Only when the step changes, so the reader's own edits stay.
  }, [tutorialStepId]);

  useEffect(() => {
    if (!draft || character.id !== initialCharacterId.current || !eventExists) closeEditor();
  }, [character.id, closeEditor, draft, eventExists]);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    nameRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      closeEditor();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [closeEditor]);

  const baseLabels = useMemo(() => collectLabels(character), [character]);
  const triggerKind = draft?.trigger.kind;
  const eventLabels = useMemo(() => getTriggerLabels(triggerKind), [triggerKind]);
  const problems = useMemo(() => (draft ? getDraftProblems(character, draft, baseLabels, eventLabels) : null), [baseLabels, character, draft, eventLabels]);
  const dataTarget = useRef<DataTarget | null>(null);
  const [dataStatus, setDataStatus] = useState({ text: '', id: 0 });

  useEffect(() => {
    if (!dataStatus.text) return;
    const timer = window.setTimeout(() => setDataStatus((current) => (current.id === dataStatus.id ? { ...current, text: '' } : current)), 3000);
    return () => window.clearTimeout(timer);
  }, [dataStatus]);

  if (!draft || !problems) return null;

  const showProblems = attempted || isEditing;
  const update = (patch: Partial<Draft>) => setDraft((current) => (current ? { ...current, ...patch } : current));
  const updateEffect = (index: number, effect: CharacterEventEffect) => update({ effects: draft.effects.map((item, i) => (i === index ? effect : item)) });
  const moveEffect = (index: number, offset: number) => {
    const effects = [...draft.effects];
    const [moved] = effects.splice(index, 1);
    effects.splice(index + offset, 0, moved);
    update({ effects });
  };
  const triggerWidget = findWidget(character, draft.trigger.widgetId);
  const triggerOutputs = getTriggerOutputs(draft.trigger.kind);
  const showStatus = (text: string) => setDataStatus((current) => ({ text, id: current.id + 1 }));
  const registerDataTarget: RegisterDataTarget = (target) => {
    dataTarget.current = target;
  };

  const pickData = (key: string) => {
    const ref = `@${eventLabel(key)}`;
    const target = dataTarget.current;
    if (!target?.element.isConnected) {
      dataTarget.current = null;
      if (!navigator.clipboard) {
        showStatus(`Type ${ref} in the condition or an effect field.`);
        return;
      }
      navigator.clipboard.writeText(ref).then(
        () => showStatus(`Copied ${ref}. Paste it into the condition or an effect field.`),
        () => showStatus(`Type ${ref} in the condition or an effect field.`),
      );
      return;
    }
    const caret = insertDataRef(target, ref);
    showStatus(`Added ${ref} to ${target.label}.`);
    window.requestAnimationFrame(() => {
      target.element.focus({ preventScroll: true });
      target.element.setSelectionRange(caret, caret);
      target.element.scrollIntoView({ block: 'nearest' });
    });
  };

  // Focusing anything other than a data target or a chip means chips no longer add to the last field.
  const handleBodyFocus = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element) || !event.target.closest('[data-event-data-target], [data-event-data-chip]')) dataTarget.current = null;
  };

  const save = () => {
    setAttempted(true);
    if (problems.count > 0) {
      window.requestAnimationFrame(() => bodyRef.current?.querySelector('.event-editor__problem')?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
      return;
    }
    const payload = toPayload(character, draft);
    const telemetrySource = inTutorialLesson ? 'tutorial' : request.source ?? 'events_panel';
    let eventId: string | null = request.eventId ?? null;
    if (request.eventId) updateEvent(request.eventId, payload, telemetrySource);
    else eventId = addEvent(payload, telemetrySource);
    // Move the Events tutorial past the editor before closing it, or the tutorial would send the reader back to "New event".
    if (!isEditing && tutorialStepId?.startsWith('events-editor-')) {
      useTutorialStore.getState().setTutorialStep(getTutorialStepIndex('events-editor-save') + 1);
    }
    closeEditor();
    if (eventId && useEventsPanelStore.getState().isOpen) useEventsPanelStore.setState({ focusEventId: eventId });
  };

  return createPortal(
    <div
      data-event-editor-dialog="true"
      data-touch-camera-ignore="true"
      className={`fixed inset-0 z-[11000] flex items-center justify-center bg-black/55 p-2 sm:p-4 animate-fade-in ${inTutorialLesson ? 'sm:justify-start sm:pl-6' : ''}`}
      onMouseDown={(event) => event.stopPropagation()}
      onMouseUp={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-editor-title"
        data-tutorial="event-editor"
        className={`widget-edit-modal__aux-dialog flex max-h-[min(92vh,56rem)] w-full ${inTutorialLesson ? 'max-w-xl' : 'max-w-3xl'} flex-col overflow-hidden animate-modal-in`}
      >
        <header className="widget-edit-modal__header flex flex-none items-center justify-between gap-3 border-b border-theme-border">
          <div className="flex min-w-0 items-center gap-2.5">
            <BoltIcon className="h-5 w-5 flex-none text-theme-accent" aria-hidden="true" />
            <h2 id="event-editor-title" className="widget-edit-modal__title font-heading text-lg font-bold text-theme-ink">
              {isEditing ? 'Edit event' : 'New event'}
            </h2>
          </div>
          <button type="button" onClick={closeEditor} aria-label="Close event editor" className="widget-control h-8 w-8 flex-none">
            <XIcon className="h-4 w-4" />
          </button>
        </header>

        <div ref={bodyRef} onFocus={handleBodyFocus} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
          <Field label="Name">
            <input
              ref={nameRef}
              type="text"
              value={draft.name}
              onChange={(event) => update({ name: event.target.value })}
              placeholder="Optional, such as Bloodied"
              autoComplete="off"
              className={fieldClass}
            />
          </Field>

          <section className="event-editor__step p-3 sm:p-4" aria-label="Trigger" data-tutorial="event-editor-trigger">
            <StepHeader pill="when" pillLabel="When" title="Something happens on the sheet" />
            <PartFields character={character} role="trigger" part={draft.trigger} onChange={(trigger) => update({ trigger })} />
            {draft.trigger.kind && <Sentence icon={getEventIcon(draft.trigger.kind, triggerWidget)} text={describeTrigger(character, draft.trigger)} />}
            <TriggerData outputs={triggerOutputs} status={dataStatus.text} onPick={pickData} />
            {showProblems && <ProblemList problems={problems.trigger} />}
          </section>

          {draft.condition === null ? (
            <button type="button" onClick={() => update({ condition: '' })} data-tutorial="event-editor-condition" className="event-editor__add flex h-9 w-full items-center justify-center gap-1.5 text-xs">
              <PlusIcon className="h-3.5 w-3.5" /> Add a condition (only if…)
            </button>
          ) : (
            <section className="event-editor__step p-3 sm:p-4" aria-label="Condition" data-tutorial="event-editor-condition">
              <StepHeader pill="if" pillLabel="Only if" title="This is true when it happens">
                <button type="button" onClick={() => update({ condition: null })} aria-label="Remove the condition" title="Remove the condition" className={smallIconButtonClass}>
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </StepHeader>
              <Field
                label="Condition"
                help={triggerOutputs.length
                  ? `A formula, such as @hp < @max_hp / 2. The trigger's data works here too, such as @${eventLabel(triggerOutputs[0].key)}.`
                  : 'A formula, such as @hp < @max_hp / 2 or @level >= 5.'}
              >
                <input
                  type="text"
                  value={draft.condition}
                  onChange={(event) => update({ condition: event.target.value })}
                  onFocus={(event) => registerDataTarget({ element: event.currentTarget, mode: 'formula', label: 'the condition', setValue: (condition) => update({ condition }) })}
                  data-event-data-target="true"
                  placeholder="@hp < @max_hp / 2"
                  autoComplete="off"
                  spellCheck={false}
                  autoFocus={draft.condition === ''}
                  className={`${fieldClass} font-mono`}
                />
              </Field>
              {(showProblems || draft.condition.trim() !== '') && <ProblemList problems={problems.condition} />}
            </section>
          )}

          <section className="event-editor__step p-3 sm:p-4" aria-label="Effects" data-tutorial="event-editor-effects">
            <StepHeader pill="then" pillLabel="Then" title={draft.effects.length > 1 ? 'Do these, in order' : 'Do this'} />
            <div className="space-y-3">
              {draft.effects.map((effect, index) => (
                <div key={effect.id} className="rounded-button border border-theme-border bg-theme-paper p-3">
                  <div className="mb-2.5 flex items-center gap-2">
                    <span className="event-flow__pill event-flow__pill--then h-6 w-6 flex-none text-[11px]" aria-hidden="true">{index + 1}</span>
                    <span className="min-w-0 flex-1 text-xs font-bold uppercase tracking-wide text-theme-muted">Effect {index + 1}</span>
                    <button type="button" onClick={() => moveEffect(index, -1)} disabled={index === 0} aria-label={`Move effect ${index + 1} up`} title="Move up" className={smallIconButtonClass}>
                      <ArrowUpIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveEffect(index, 1)}
                      disabled={index === draft.effects.length - 1}
                      aria-label={`Move effect ${index + 1} down`}
                      title="Move down"
                      className={smallIconButtonClass}
                    >
                      <ArrowDownIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => update({ effects: draft.effects.filter((item) => item.id !== effect.id) })}
                      aria-label={`Remove effect ${index + 1}`}
                      title="Remove"
                      className={`${smallIconButtonClass} hover:!border-red-500 hover:!bg-red-500`}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <PartFields
                    character={character}
                    role="effect"
                    part={effect}
                    onChange={(part) => updateEffect(index, { ...part, id: effect.id })}
                    onDataTarget={triggerOutputs.length ? registerDataTarget : undefined}
                  />
                  {effect.kind && <Sentence icon={getEventIcon(effect.kind, findWidget(character, effect.widgetId))} text={describeEffect(character, effect)} />}
                  {showProblems && <ProblemList problems={problems.effects[effect.id]} />}
                </div>
              ))}
              <button
                type="button"
                onClick={() => update({ effects: [...draft.effects, createBlankEffect()] })}
                className="event-editor__add flex h-9 w-full items-center justify-center gap-1.5 text-xs"
              >
                <PlusIcon className="h-3.5 w-3.5" /> Add effect
              </button>
            </div>
            {showProblems && <ProblemList problems={problems.general} />}
          </section>
        </div>

        <footer className="widget-edit-modal__footer flex flex-none flex-wrap items-center justify-between gap-2 border-t border-theme-border">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-theme-ink">
            <button
              type="button"
              role="switch"
              aria-checked={draft.enabled}
              aria-label="Event is on"
              onClick={() => update({ enabled: !draft.enabled })}
              className="event-switch"
            />
            <span>{draft.enabled ? 'On' : 'Off'}</span>
          </label>
          <div className="flex min-w-0 items-center gap-2">
            {attempted && problems.count > 0 && (
              <span className="hidden text-xs text-amber-600 sm:inline" role="status">
                Fix {problems.count === 1 ? 'the problem' : `${problems.count} problems`} to save
              </span>
            )}
            <button type="button" onClick={closeEditor} className="widget-control px-4 py-2 text-xs font-bold">Cancel</button>
            <button
              type="button"
              onClick={save}
              data-tutorial="event-editor-save"
              className={`widget-control widget-control--primary px-4 py-2 text-xs font-bold ${!isEditing && tutorialStepId === 'events-editor-save' ? tutorialTargetClass : ''}`}
            >
              {isEditing ? 'Save' : 'Create event'}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

/** Shows the event editor whenever one is requested. */
export function EventEditorHost() {
  const editor = useEventsPanelStore((state) => state.editor);
  const editorKey = useEventsPanelStore((state) => state.editorKey);
  const character = useStore((state) => state.characters.find((item) => item.id === state.activeCharacterId) ?? null);
  if (!editor || !character) return null;
  return <EventEditorDialog key={editorKey} character={character} request={editor} />;
}
