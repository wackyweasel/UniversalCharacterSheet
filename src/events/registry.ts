import type { Character, CharacterEvent, CharacterEventEffect, CharacterEventParams, CharacterEventTrigger, Widget, WidgetType } from '../types';
import { getWidgetTitle } from '../utils/characterVariables';
import { collectLabels } from '../utils/formulaEngine';
import type { FormulaLabels } from '../utils/formulaSyntax';
import { eventLabel, findEventLabelRefs, resultLabel, RUN_EVENT_KIND } from './constants';
import { EVENT_BUTTON_TRIGGERS } from './defs/button';
import {
  CARD_EFFECTS,
  CARD_TRIGGERS,
  DECK_EFFECTS,
  DECK_TRIGGERS,
  DICE_POOL_EFFECTS,
  DICE_POOL_TRIGGERS,
  DICE_ROLLED_TRIGGER,
  ROLL_TABLE_EFFECTS,
  ROLL_TABLE_TRIGGERS,
  ROLLER_EFFECTS,
  STEP_DICE_EFFECTS,
  STEP_DICE_ROLLED_TRIGGER,
  TRAY_EFFECTS,
} from './defs/dice';
import { GLOBAL_EFFECTS, GLOBAL_TRIGGERS } from './defs/generic';
import { HEALTH_EFFECTS, HEALTH_TRIGGERS, SPELL_EFFECTS, SPELL_TRIGGERS } from './defs/health';
import {
  HEADING_EFFECTS,
  INVENTORY_EFFECTS,
  INVENTORY_TRIGGERS,
  LIST_EFFECTS,
  NOTES_EFFECTS,
  WALLET_EFFECTS,
  WALLET_TRIGGERS,
} from './defs/items';
import { MIXED_FIELD_DEFS } from './defs/mixed';
import { NUMERIC_EFFECTS, NUMERIC_TRIGGERS, TRACK_TRIGGERS, XP_TRIGGERS } from './defs/numeric';
import { TEXT_BUTTON_TRIGGERS } from './defs/textButton';
import {
  CALENDAR_EFFECTS,
  CALENDAR_TRIGGERS,
  INITIATIVE_TRIGGERS,
  REST_EFFECTS,
  REST_TRIGGERS,
  TIME_TRACKER_EFFECTS,
  TIME_TRACKER_TRIGGERS,
  TIMER_EFFECTS,
  TIMER_TRIGGERS,
} from './defs/time';
import { CHECKLIST_DEFS, CONDITION_DEFS, DICE_POOL_TRAIT_DEFS, MIXED_SWITCH_DEFS, SKILL_DEFS, SWITCH_DEFS } from './defs/toggles';
import { findWidget, isAnyTarget } from './helpers';
import { getEventEffects } from './steps';
import type { EffectDef, EventOption, EventParamSpec, SpecContext, TargetSpec, TriggerData, TriggerDef, TriggerOutput, WidgetEventDefs } from './types';

const NUMERIC: WidgetEventDefs = { triggers: NUMERIC_TRIGGERS, effects: NUMERIC_EFFECTS };
const NONE: WidgetEventDefs = { triggers: [], effects: [] };
// For widgets that show their text with `{[Name]}` buttons.
const TEXT_BUTTONS: Partial<WidgetEventDefs> = { triggers: TEXT_BUTTON_TRIGGERS };

function combine(...parts: Partial<WidgetEventDefs>[]): WidgetEventDefs {
  return {
    triggers: parts.flatMap((part) => part.triggers ?? []),
    effects: parts.flatMap((part) => part.effects ?? []),
  };
}

const WIDGET_DEFS: Record<WidgetType, WidgetEventDefs> = {
  NUMBER: NUMERIC,
  NUMBER_DISPLAY: NUMERIC,
  PROGRESS_BAR: NUMERIC,
  PROGRESS_CLOCK: NUMERIC,
  THRESHOLD_TRACK: combine(NUMERIC, { triggers: TRACK_TRIGGERS }),
  XP_LEVEL: combine(NUMERIC, { triggers: XP_TRIGGERS }),
  POOL: NUMERIC,
  HEALTH_BAR: combine({ triggers: HEALTH_TRIGGERS, effects: HEALTH_EFFECTS }, NUMERIC),
  SPELL_SLOT: combine({ triggers: SPELL_TRIGGERS, effects: SPELL_EFFECTS }, NUMERIC),
  TOGGLE: SWITCH_DEFS,
  TOGGLE_GROUP: CONDITION_DEFS,
  CHECKBOX: CHECKLIST_DEFS,
  MIXED_FIELDS: combine(NUMERIC, MIXED_SWITCH_DEFS, MIXED_FIELD_DEFS, TEXT_BUTTONS),
  SKILL_TREE: combine(SKILL_DEFS, NUMERIC),
  INVENTORY: combine({ triggers: INVENTORY_TRIGGERS, effects: INVENTORY_EFFECTS }, NUMERIC, TEXT_BUTTONS),
  WALLET: combine({ triggers: WALLET_TRIGGERS, effects: WALLET_EFFECTS }, NUMERIC),
  LIST: combine(TEXT_BUTTONS, { effects: LIST_EFFECTS }),
  TEXT: combine(TEXT_BUTTONS, { effects: NOTES_EFFECTS }),
  LABEL: { triggers: [], effects: HEADING_EFFECTS },
  DICE_ROLLER: { triggers: [DICE_ROLLED_TRIGGER], effects: ROLLER_EFFECTS },
  DICE_TRAY: { triggers: [DICE_ROLLED_TRIGGER], effects: TRAY_EFFECTS },
  STEP_DICE: combine({ triggers: [STEP_DICE_ROLLED_TRIGGER], effects: STEP_DICE_EFFECTS }, NUMERIC),
  DICE_POOL: combine({ triggers: DICE_POOL_TRIGGERS, effects: DICE_POOL_EFFECTS }, DICE_POOL_TRAIT_DEFS, NUMERIC),
  ROLL_TABLE: { triggers: ROLL_TABLE_TRIGGERS, effects: ROLL_TABLE_EFFECTS },
  DECK: { triggers: DECK_TRIGGERS, effects: DECK_EFFECTS },
  DECK_OF_CARDS: { triggers: CARD_TRIGGERS, effects: CARD_EFFECTS },
  TIMER: { triggers: TIMER_TRIGGERS, effects: TIMER_EFFECTS },
  INITIATIVE_TRACKER: { triggers: INITIATIVE_TRIGGERS, effects: [] },
  REST_BUTTON: { triggers: REST_TRIGGERS, effects: REST_EFFECTS },
  EVENT_BUTTON: { triggers: EVENT_BUTTON_TRIGGERS, effects: [] },
  TIME_TRACKER: { triggers: TIME_TRACKER_TRIGGERS, effects: TIME_TRACKER_EFFECTS },
  CALENDAR: { triggers: CALENDAR_TRIGGERS, effects: CALENDAR_EFFECTS },
  // Their values are reachable through labels.
  TABLE: combine(TEXT_BUTTONS),
  FORM: combine(TEXT_BUTTONS),
  IMAGE: NONE,
  MAP_SKETCHER: NONE,
  GRID_MAP: NONE,
};

export const WIDGET_EVENT_ICONS: Record<WidgetType, string> = {
  NUMBER: '🔢',
  NUMBER_DISPLAY: '🧮',
  LABEL: '🏷️',
  LIST: '📋',
  TEXT: '📝',
  CHECKBOX: '☑️',
  HEALTH_BAR: '❤️',
  DICE_ROLLER: '🎲',
  DICE_TRAY: '🎲',
  SPELL_SLOT: '✨',
  IMAGE: '🖼️',
  POOL: '💧',
  TOGGLE: '🔘',
  TOGGLE_GROUP: '🩹',
  TABLE: '📊',
  TIME_TRACKER: '⏳',
  FORM: '📄',
  MIXED_FIELDS: '🧩',
  REST_BUTTON: '🛏️',
  EVENT_BUTTON: '⚡',
  PROGRESS_BAR: '📶',
  PROGRESS_CLOCK: '🕒',
  MAP_SKETCHER: '🗺️',
  ROLL_TABLE: '📜',
  GRID_MAP: '🗺️',
  INITIATIVE_TRACKER: '⚔️',
  INVENTORY: '🎒',
  DECK: '🃏',
  DECK_OF_CARDS: '🃏',
  TIMER: '⏱️',
  STEP_DICE: '🪜',
  WALLET: '💰',
  THRESHOLD_TRACK: '🌡️',
  XP_LEVEL: '⭐',
  SKILL_TREE: '🌳',
  DICE_POOL: '🎲',
  CALENDAR: '📅',
};

const GLOBAL_ICONS: Record<string, string> = {
  'label.changed': '🏷️',
  'label.crosses': '🏷️',
  manual: '👆',
  'label.set': '🏷️',
  'label.add': '🏷️',
  'dice.roll': '🎲',
  'log.message': '📝',
  [RUN_EVENT_KIND]: '⚡',
};

const MISSING_EVENT = 'a deleted event';

// Lives here rather than in defs/generic because it names events by their titles.
const RUN_EVENT_EFFECT: EffectDef = {
  kind: RUN_EVENT_KIND,
  label: 'Run another event',
  target: {
    label: 'Event',
    options: ({ character }) => (character.events ?? []).map((event) => ({ value: event.id, label: getEventTitle(character, event) })),
    missing: MISSING_EVENT,
  },
  apply: ({ effect, character }) => {
    if (!effect.target) return null;
    const event = character.events?.find((item) => item.id === effect.target);
    return { text: `Run "${event ? getEventTitle(character, event) : MISSING_EVENT}"`, runEventId: effect.target };
  },
  describe: ({ target }) => (target === MISSING_EVENT ? `Run ${target}` : `Run "${target}"`),
};

const ALL_GLOBAL_EFFECTS: EffectDef[] = [...GLOBAL_EFFECTS, RUN_EVENT_EFFECT];

const TRIGGERS_BY_KIND = new Map<string, TriggerDef>();
const EFFECTS_BY_KIND = new Map<string, EffectDef>();
const GLOBAL_TRIGGER_KINDS = new Set(GLOBAL_TRIGGERS.map((def) => def.kind));
const GLOBAL_EFFECT_KINDS = new Set(ALL_GLOBAL_EFFECTS.map((def) => def.kind));

for (const defs of [...Object.values(WIDGET_DEFS), { triggers: GLOBAL_TRIGGERS, effects: ALL_GLOBAL_EFFECTS }]) {
  for (const def of defs.triggers) {
    const existing = TRIGGERS_BY_KIND.get(def.kind);
    if (existing && existing !== def) console.warn(`Duplicate event trigger kind: ${def.kind}`);
    TRIGGERS_BY_KIND.set(def.kind, def);
  }
  for (const def of defs.effects) {
    const existing = EFFECTS_BY_KIND.get(def.kind);
    if (existing && existing !== def) console.warn(`Duplicate event effect kind: ${def.kind}`);
    EFFECTS_BY_KIND.set(def.kind, def);
  }
}

export const GLOBAL_TRIGGER_DEFS: TriggerDef[] = GLOBAL_TRIGGERS;
export const GLOBAL_EFFECT_DEFS: EffectDef[] = ALL_GLOBAL_EFFECTS;

export function getWidgetEventDefs(type: WidgetType): WidgetEventDefs {
  return WIDGET_DEFS[type] ?? NONE;
}

export function getAllTriggerDefs(): TriggerDef[] {
  return [...TRIGGERS_BY_KIND.values()];
}

export function getAllEffectDefs(): EffectDef[] {
  return [...EFFECTS_BY_KIND.values()];
}

export function getTriggerDef(kind: string | undefined): TriggerDef | undefined {
  return kind ? TRIGGERS_BY_KIND.get(kind) : undefined;
}

export function getEffectDef(kind: string | undefined): EffectDef | undefined {
  return kind ? EFFECTS_BY_KIND.get(kind) : undefined;
}

export const isGlobalTriggerKind = (kind: string) => GLOBAL_TRIGGER_KINDS.has(kind);
export const isGlobalEffectKind = (kind: string) => GLOBAL_EFFECT_KINDS.has(kind);

export function getEventIcon(kind: string, widget: Widget | undefined): string {
  if (widget) return WIDGET_EVENT_ICONS[widget.type] ?? '🧩';
  return GLOBAL_ICONS[kind] ?? '⚡';
}

// ----- Trigger data -----

export function getTriggerOutputs(kind: string | undefined): TriggerOutput[] {
  return getTriggerDef(kind)?.outputs ?? [];
}

/** The `event_…` labels a trigger gives its event; outputs missing from `data` read as 0 or empty text. */
export function getTriggerLabels(kind: string | undefined, data?: TriggerData): FormulaLabels {
  const labels: FormulaLabels = {};
  for (const output of getTriggerOutputs(kind)) {
    labels[eventLabel(output.key)] = data?.[output.key] ?? (output.type === 'number' ? 0 : '');
  }
  return labels;
}

/** `event_…` labels that won't resolve: ones the trigger doesn't provide, or any used in the trigger's own settings
 *  (those are read before the trigger has data). Labels the sheet itself defines are fine. */
export function getUnknownEventLabels(character: Character, event: Pick<CharacterEvent, 'trigger' | 'steps'>): string[] {
  const unknown = new Set(Object.values(event.trigger.params ?? {}).flatMap(findEventLabelRefs));
  const check = (source: string | undefined, provided: FormulaLabels) => {
    for (const ref of findEventLabelRefs(source)) {
      if (!(ref in provided)) unknown.add(ref);
    }
  };
  event.steps.forEach((step, stepIndex) => {
    check(step.condition, getEventLabelsAt(event, stepIndex, 'condition'));
    step.effects.forEach((effect, index) => {
      const provided = getEventLabelsAt(event, stepIndex, 'effects', index);
      Object.values(effect.params ?? {}).forEach((value) => check(value, provided));
    });
    (step.otherwise ?? []).forEach((effect, index) => {
      const provided = getEventLabelsAt(event, stepIndex, 'otherwise', index);
      Object.values(effect.params ?? {}).forEach((value) => check(value, provided));
    });
  });
  if (unknown.size === 0) return [];
  const labels = collectLabels(character);
  return Array.from(unknown).filter((ref) => !(ref in labels));
}

export function getEffectOutputs(kind: string | undefined): TriggerOutput[] {
  return getEffectDef(kind)?.outputs ?? [];
}

/** The `event_<name>_…` labels a named effect result gives later steps; outputs missing from `data` read as 0 or empty text. */
export function getResultLabels(effect: Pick<CharacterEventEffect, 'kind' | 'resultName'>, data?: TriggerData): FormulaLabels {
  const name = effect.resultName?.trim();
  const labels: FormulaLabels = {};
  if (!name) return labels;
  for (const output of getEffectOutputs(effect.kind)) {
    labels[resultLabel(name, output.key)] = data?.[output.key] ?? (output.type === 'number' ? 0 : '');
  }
  return labels;
}

export type EventSection = 'condition' | 'effects' | 'otherwise';

/** The `event_…` labels available at a point of an event: the trigger's data and the named results of effects that run before it.
 *  An `otherwise` branch only follows the condition, so it never sees its own step's effects. */
export function getEventLabelsAt(
  event: Pick<CharacterEvent, 'trigger' | 'steps'>,
  stepIndex: number,
  section: EventSection,
  effectIndex = 0,
): FormulaLabels {
  const labels = getTriggerLabels(event.trigger.kind);
  const add = (effects: CharacterEventEffect[]) => effects.forEach((effect) => Object.assign(labels, getResultLabels(effect)));
  event.steps.slice(0, stepIndex).forEach((step) => add([...step.effects, ...(step.otherwise ?? [])]));
  const step = event.steps[stepIndex];
  if (step && section === 'effects') add(step.effects.slice(0, effectIndex));
  if (step && section === 'otherwise') add((step.otherwise ?? []).slice(0, effectIndex));
  return labels;
}

/** Result names that can't be read as labels, or that another effect of the event already uses. */
export function getResultNameProblems(event: Pick<CharacterEvent, 'steps'>, effect: CharacterEventEffect): string[] {
  const name = effect.resultName?.trim();
  if (!name || getEffectOutputs(effect.kind).length === 0) return [];
  const problems: string[] = [];
  if (!/^[a-zA-Z0-9_]+$/.test(name)) problems.push('The result name can only use letters, numbers and underscores');
  if (getEventEffects(event).some((other) => other.id !== effect.id && other.resultName?.trim() === name && getEffectOutputs(other.kind).length > 0)) {
    problems.push(`Another effect already uses the result name "${name}"`);
  }
  return problems;
}

// ----- Params -----

export function resolveOptions(options: EventParamSpec['options'], ctx: SpecContext): EventOption[] {
  if (!options) return [];
  return typeof options === 'function' ? options(ctx) : options;
}

/** Params with defaults filled in for anything left unset. */
export function fillParams(specs: EventParamSpec[] | undefined, params: CharacterEventParams | undefined): CharacterEventParams {
  const filled: CharacterEventParams = { ...(params ?? {}) };
  for (const spec of specs ?? []) {
    if (filled[spec.key] === undefined && spec.default !== undefined) filled[spec.key] = spec.default;
  }
  return filled;
}

export function getVisibleParams(specs: EventParamSpec[] | undefined, params: CharacterEventParams): EventParamSpec[] {
  return (specs ?? []).filter((spec) => !spec.visible || spec.visible(params));
}

// ----- Targets -----

export function findTargetOption(spec: TargetSpec, ctx: SpecContext, target: string | undefined): EventOption | undefined {
  if (!target) return undefined;
  const options = spec.options(ctx);
  const lower = target.toLowerCase();
  return options.find((option) => option.value === target) ?? options.find((option) => option.value.toLowerCase() === lower);
}

/** Name shown for a target, with a "(missing)" mark when the item no longer exists. */
export function describeTarget(spec: TargetSpec | undefined, ctx: SpecContext, target: string | undefined): string {
  if (!spec) return '';
  if (spec.any && isAnyTarget(target)) return spec.any;
  if (!target) return spec.options(ctx)[0]?.label ?? '';
  return findTargetOption(spec, ctx, target)?.label ?? spec.missing ?? `${target} (missing)`;
}

function targetProblem(spec: TargetSpec | undefined, ctx: SpecContext, target: string | undefined): string | null {
  if (!spec) return null;
  if (spec.any && isAnyTarget(target)) return null;
  if (!target) return spec.options(ctx).length ? null : `${spec.label}: nothing to choose`;
  if (findTargetOption(spec, ctx, target)) return null;
  return spec.missing ? `${spec.label} no longer exists` : `${spec.label} "${target}" no longer exists`;
}

// ----- Descriptions -----

function widgetName(widget: Widget | undefined, widgetId: string | undefined): string {
  if (widget) return getWidgetTitle(widget);
  return widgetId ? 'a deleted widget' : '';
}

export function describeTrigger(character: Character, trigger: CharacterEventTrigger): string {
  const def = getTriggerDef(trigger.kind);
  if (!def) return trigger.kind ? 'Unknown trigger' : 'No trigger chosen yet';
  const widget = findWidget(character, trigger.widgetId);
  const ctx: SpecContext = { character, widget };
  return def.describe({
    params: fillParams(def.params, trigger.params),
    target: describeTarget(def.target, ctx, trigger.target),
    widget: widgetName(widget, trigger.widgetId),
  });
}

export function describeEffect(character: Character, effect: CharacterEventEffect): string {
  const def = getEffectDef(effect.kind);
  if (!def) return effect.kind ? 'Unknown effect' : 'No effect chosen yet';
  const widget = findWidget(character, effect.widgetId);
  const ctx: SpecContext = { character, widget };
  return def.describe({
    params: fillParams(def.params, effect.params),
    target: describeTarget(def.target, ctx, effect.target),
    widget: widgetName(widget, effect.widgetId),
  });
}

function sourceProblem(
  character: Character,
  kind: string,
  widgetId: string | undefined,
  target: string | undefined,
  def: TriggerDef | EffectDef | undefined,
  isGlobal: boolean,
  pick: (defs: WidgetEventDefs) => (TriggerDef | EffectDef)[],
): string | null {
  if (!def) return kind ? `Unknown kind "${kind}"` : 'Not chosen yet';
  const widget = findWidget(character, widgetId);
  if (!isGlobal) {
    if (!widget) return 'Its widget was deleted';
    if (!pick(getWidgetEventDefs(widget.type)).includes(def)) return 'Its widget no longer supports this';
  }
  return targetProblem(def.target, { character, widget }, target);
}

export function getTriggerProblem(character: Character, trigger: CharacterEventTrigger): string | null {
  return sourceProblem(character, trigger.kind, trigger.widgetId, trigger.target, getTriggerDef(trigger.kind), isGlobalTriggerKind(trigger.kind), (defs) => defs.triggers);
}

export function getEffectProblem(character: Character, effect: CharacterEventEffect): string | null {
  return sourceProblem(character, effect.kind, effect.widgetId, effect.target, getEffectDef(effect.kind), isGlobalEffectKind(effect.kind), (defs) => defs.effects);
}

/** Problems that keep an event from working fully, such as deleted widgets or items. */
export function getEventProblems(character: Character, event: CharacterEvent): string[] {
  const problems: string[] = [];
  const triggerProblem = getTriggerProblem(character, event.trigger);
  if (triggerProblem) problems.push(`Trigger: ${triggerProblem}`);
  if (getEventEffects(event).length === 0) problems.push('No effects');
  const check = (label: string, effect: CharacterEventEffect) => {
    const problem = getEffectProblem(character, effect);
    if (problem) problems.push(`${label}: ${problem}`);
    getResultNameProblems(event, effect).forEach((nameProblem) => problems.push(`${label}: ${nameProblem}`));
  };
  event.steps.forEach((step, stepIndex) => {
    const prefix = event.steps.length > 1 ? `Step ${stepIndex + 1}, ` : '';
    step.effects.forEach((effect, index) => check(`${prefix}${prefix ? 'effect' : 'Effect'} ${index + 1}`, effect));
    (step.otherwise ?? []).forEach((effect, index) => check(`${prefix}${prefix ? 'otherwise' : 'Otherwise'} ${index + 1}`, effect));
    if (step.otherwise?.length && !step.condition?.trim()) problems.push(`${prefix}${prefix ? 'otherwise' : 'Otherwise'} effects never run without a condition`);
  });
  const unknown = getUnknownEventLabels(character, event);
  if (unknown.length) problems.push(`Uses ${unknown.map((ref) => `@${ref}`).join(', ')}, which isn't available where it's used`);
  return problems;
}

/** Name to show for an event: its own name, else its trigger sentence. */
export function getEventTitle(character: Character, event: CharacterEvent): string {
  if (!event.name?.trim() && !event.trigger.kind) return 'Unfinished event';
  if (!event.name?.trim() && event.trigger.kind === 'manual') return 'Event without a trigger';
  return event.name?.trim() || `When ${describeTrigger(character, event.trigger)}`;
}

export function widgetSupportsEvents(type: WidgetType): boolean {
  const defs = getWidgetEventDefs(type);
  return defs.triggers.length > 0 || defs.effects.length > 0;
}
