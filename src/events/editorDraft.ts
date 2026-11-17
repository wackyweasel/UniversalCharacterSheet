import type { EventEditorRequest } from '../store/useEventsPanelStore';
import type { Character, CharacterEvent, CharacterEventEffect, CharacterEventStep, CharacterEventTrigger } from '../types';
import { evaluateFormulaValue, hasUnresolvedRefs } from '../utils/formulaEngine';
import type { FormulaLabels } from '../utils/formulaSyntax';
import { eventLabel, findEventLabelRefs, resultLabel } from './constants';
import { createEventDraft } from './drafts';
import { addNodeId, conditionNodeId, effectNodeId, hasCondition, hasStepsAfter, tidySteps, TRIGGER_NODE_ID } from './graph';
import { findWidget } from './helpers';
import {
  fillParams,
  getEffectDef,
  getEffectOutputs,
  getEffectProblem,
  getEventLabelsAt,
  getResultNameProblems,
  getTriggerDef,
  getTriggerOutputs,
  getTriggerProblem,
  getVisibleParams,
  isGlobalEffectKind,
  isGlobalTriggerKind,
} from './registry';
import { getEventEffects, getEventParts, mapSteps, normalizeEvent } from './steps';
import { ANY_TARGET, type EffectDef, type EventOption, type SpecContext, type TargetSpec, type TriggerDef } from './types';

export type EventRole = 'trigger' | 'effect';
export type EventPart = CharacterEventTrigger & { id?: string };

/** An event while it is being edited. */
export interface EventDraft {
  name: string;
  enabled: boolean;
  trigger: CharacterEventTrigger;
  /** A step has a condition node when `condition` is set, even to a blank formula. */
  steps: CharacterEventStep[];
}

export interface DraftProblems {
  trigger: string[];
  /** By step id: problems of its condition. */
  conditions: Record<string, string[]>;
  /** By effect id. */
  effects: Record<string, string[]>;
  /** By step id: problems of the step as a whole, such as having no effects. */
  steps: Record<string, string[]>;
  count: number;
}

export function isGlobalPartKind(role: EventRole, kind: string): boolean {
  return role === 'trigger' ? isGlobalTriggerKind(kind) : isGlobalEffectKind(kind);
}

export function getPartDef(role: EventRole, kind: string): TriggerDef | EffectDef | undefined {
  return role === 'trigger' ? getTriggerDef(kind) : getEffectDef(kind);
}

export function getTargetChoices(spec: TargetSpec, ctx: SpecContext): EventOption[] {
  return [...(spec.any ? [{ value: ANY_TARGET, label: spec.any }] : []), ...spec.options(ctx)];
}

/** Stored steps as the graph edits them: a blank condition only stays when it has an "otherwise" side to hold. */
function toDraftSteps(steps: CharacterEventStep[]): CharacterEventStep[] {
  return tidySteps(mapSteps(steps, (step) => {
    const { condition, otherwise, otherwiseSteps, stopIfFalse, ...rest } = step;
    const formula = condition?.trim() ? condition : '';
    if (!formula && !otherwise?.length && !otherwiseSteps?.length) return rest;
    return {
      ...rest,
      condition: formula,
      ...(otherwise?.length ? { otherwise } : {}),
      ...(otherwiseSteps?.length ? { otherwiseSteps } : {}),
      ...(stopIfFalse ? { stopIfFalse } : {}),
    };
  }));
}

export function initDraft(character: Character, request: EventEditorRequest): EventDraft | null {
  if (request.eventId) {
    const stored = character.events?.find((item) => item.id === request.eventId);
    if (!stored) return null;
    const event = normalizeEvent(stored);
    return { name: event.name ?? '', enabled: event.enabled, trigger: event.trigger, steps: toDraftSteps(event.steps) };
  }
  const base = createEventDraft(character);
  const start = request.draft ? normalizeEvent({ id: '', enabled: true, trigger: { kind: '' }, ...request.draft }) : null;
  return {
    name: start?.name ?? '',
    enabled: start?.enabled ?? true,
    trigger: request.draft?.trigger ?? base.trigger,
    steps: toDraftSteps(start && getEventEffects(start).length > 0 ? start.steps : base.steps),
  };
}

/** Explains `@event_…` references that won't resolve where they're used. */
function eventRefProblem(role: EventRole | 'condition', field: string, text: string, labels: FormulaLabels): string | null {
  const refs = findEventLabelRefs(text).filter((ref) => !(ref in labels));
  if (!refs.length) return null;
  const list = refs.map((ref) => `@${ref}`).join(', ');
  return role === 'trigger'
    ? `${field} can't use ${list}; trigger data is only for the condition and effects`
    : `${field} uses ${list}, which isn't available at this point`;
}

function paramProblems(role: EventRole, character: Character, part: EventPart, labels: FormulaLabels): string[] {
  const def = getPartDef(role, part.kind);
  if (!def) return [];
  const params = fillParams(def.params, part.params);
  return getVisibleParams(def.params, params, { character, widget: findWidget(character, part.widgetId), target: part.target })
    .filter((spec) => spec.type !== 'select')
    .flatMap((spec) => {
      const value = params[spec.key] ?? '';
      const problem = eventRefProblem(role, spec.label, value, labels);
      if (problem) return [problem];
      return hasUnresolvedRefs(value, labels) ? [`${spec.label} uses a label that doesn't exist`] : [];
    });
}

/** Trigger settings are read before the trigger has data, so only conditions and effects see `event_…` labels, and only those available before them. */
export function getDraftProblems(character: Character, draft: EventDraft, baseLabels: FormulaLabels): DraftProblems {
  const trigger = draft.trigger.kind
    ? [getTriggerProblem(character, draft.trigger), ...paramProblems('trigger', character, draft.trigger, baseLabels)].filter((problem): problem is string => !!problem)
    : ['Choose what triggers this event'];

  const conditions: Record<string, string[]> = {};
  const effects: Record<string, string[]> = {};
  const steps: Record<string, string[]> = {};

  for (const part of getEventParts(draft)) {
    const { step, effect } = part;
    const labels = { ...baseLabels, ...getEventLabelsAt(draft, part) };
    if (effect) {
      const problems = effect.kind
        ? [getEffectProblem(character, effect), ...paramProblems('effect', character, effect, labels), ...getResultNameProblems(draft, effect)].filter((problem): problem is string => !!problem)
        : ['Choose what this effect does'];
      if (problems.length) effects[effect.id] = problems;
      continue;
    }
    if (hasCondition(step)) {
      const formula = step.condition?.trim();
      const eventProblem = formula ? eventRefProblem('condition', 'The condition', formula, labels) : null;
      if (!formula) conditions[step.id] = ['Write the condition, or remove it'];
      else if (eventProblem) conditions[step.id] = [eventProblem];
      else if (hasUnresolvedRefs(formula, labels)) conditions[step.id] = ["The condition uses a label that doesn't exist"];
      else if (evaluateFormulaValue(`(${formula}) ? 1 : 0`, labels) === null) conditions[step.id] = ["The condition can't be worked out; check the formula"];
    }
    // A condition may have nothing on its sides; only a run of plain steps with no effect at all (an empty event) is a problem.
    if (!hasCondition(step) && step.effects.length === 0 && !step.steps?.length) steps[step.id] = ['Add at least one effect'];
  }

  const count = [trigger, ...Object.values(conditions), ...Object.values(effects), ...Object.values(steps)].reduce((sum, list) => sum + list.length, 0);
  return { trigger, conditions, effects, steps, count };
}

/** The problems of each graph node that has some, in the order the event is laid out. */
export function getNodeProblems(draft: EventDraft, problems: DraftProblems): Map<string, string[]> {
  const byNode = new Map<string, string[]>();
  const add = (nodeId: string, list: string[] | undefined) => {
    if (list?.length) byNode.set(nodeId, list);
  };
  add(TRIGGER_NODE_ID, problems.trigger);
  for (const { step, effect } of getEventParts(draft)) {
    if (effect) {
      add(effectNodeId(effect.id), problems.effects[effect.id]);
      continue;
    }
    add(conditionNodeId(step.id), problems.conditions[step.id]);
    add(addNodeId(step.id), problems.steps[step.id]);
  }
  return byNode;
}

/** Fills in values a saved event needs, such as a target left on its first choice. */
function normalizePart<T extends EventPart>(role: EventRole, character: Character, part: T): T {
  const def = getPartDef(role, part.kind);
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

export function toEventPayload(character: Character, draft: EventDraft): Omit<CharacterEvent, 'id'> {
  const name = draft.name.trim();
  const normalizeEffects = (effects: CharacterEventEffect[]) => effects.map((effect) => {
    const { resultName, ...rest } = normalizePart('effect', character, effect);
    const name = resultName?.trim();
    return name && getEffectDef(effect.kind)?.outputs?.length ? { ...rest, resultName: name } : rest;
  });
  const toStored = (step: CharacterEventStep): CharacterEventStep => {
    const condition = step.condition?.trim();
    return {
      id: step.id,
      ...(condition ? { condition } : {}),
      effects: normalizeEffects(step.effects),
      ...(step.steps?.length ? { steps: step.steps.map(toStored) } : {}),
      // The "otherwise" side is kept without a condition too, so a draft saved before its condition is written doesn't lose it.
      ...(step.otherwise?.length ? { otherwise: normalizeEffects(step.otherwise) } : {}),
      ...(step.otherwiseSteps?.length ? { otherwiseSteps: step.otherwiseSteps.map(toStored) } : {}),
      // Only kept while something follows, which is when the editor shows the setting.
      ...(condition && step.stopIfFalse && hasStepsAfter(draft.steps, step.id) ? { stopIfFalse: true } : {}),
    };
  };
  return {
    ...(name ? { name } : {}),
    enabled: draft.enabled,
    trigger: normalizePart('trigger', character, draft.trigger),
    steps: draft.steps.map(toStored),
  };
}

export interface EventDataGroup {
  title: string;
  /** `@event_…` reference and description of each value. */
  items: { ref: string; label: string }[];
}

/** The data a condition (found by its step) or an effect can read where it sits, by where it comes from; the same reach as `getEventLabelsAt`. */
export function getAvailableData(draft: Pick<EventDraft, 'trigger' | 'steps'>, at: { stepId: string } | { effectId: string }): EventDataGroup[] {
  const groups: EventDataGroup[] = [];
  const triggerOutputs = getTriggerOutputs(draft.trigger.kind);
  if (triggerOutputs.length) {
    groups.push({ title: 'From the trigger', items: triggerOutputs.map((output) => ({ ref: `@${eventLabel(output.key)}`, label: output.label })) });
  }
  const part = getEventParts(draft).find((item) => ('effectId' in at ? item.effect?.id === at.effectId : !item.effect && item.step.id === at.stepId));
  for (const effect of part?.before ?? []) {
    const name = effect.resultName?.trim();
    const outputs = getEffectOutputs(effect.kind);
    if (!name || !outputs.length) continue;
    groups.push({ title: `From the result "${name}"`, items: outputs.map((output) => ({ ref: `@${resultLabel(name, output.key)}`, label: output.label })) });
  }
  return groups;
}
