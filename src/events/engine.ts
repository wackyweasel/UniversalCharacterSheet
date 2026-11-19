import type { Character, CharacterEvent, CharacterEventEffect, CharacterEventStep } from '../types';
import { getWidgetTitle } from '../utils/characterVariables';
import { DieValueNeeded } from '../utils/diceExpression';
import { collectLabels, evaluateFormulaValue, resolveCharacterFormulas, type FormulaChange } from '../utils/formulaEngine';
import type { FormulaLabels } from '../utils/formulaSyntax';
import { END_EVENT_KIND } from './constants';
import { GLOBAL_LOAD_SLOT } from './defs/numeric';
import { evaluateAmount, evaluateCondition, findWidget, formatNumber, patchWidgetData } from './helpers';
import { fillParams, getEffectDef, getEventIcon, getEventTitle, getResultLabels, getTriggerDef, getTriggerLabels, isGlobalEffectKind, isGlobalTriggerKind } from './registry';
import { containsTarget, END_JUMP, getEffectSection, getStepEffects, isValidJump, normalizeEvent } from './steps';
import { PromptNeeded, type EventAnswer } from './prompt';
import type { EffectContext, EffectOutcome, EventDiceDisplay, TriggerMatch, WidgetAction } from './types';
import { prepareItemArrivals, reconcileItemEffects } from '../utils/itemEffects';

/** Longest chain of events firing one another before the engine stops. */
export const MAX_CHAIN_DEPTH = 15;

/** How many jumps one run of an event follows, so that a loop of jumps ends. */
export const MAX_JUMPS = 100;

// Effects whose whole point is their timeline text, so they never count as skipped.
const REPORT_ONLY_EFFECTS = new Set(['log.message', 'dialog.show', END_EVENT_KIND]);

export interface EventEffectResult {
  effectId: string;
  icon: string;
  text: string;
  /** The effect couldn't run or had nothing to do. */
  skipped?: boolean;
  /** The effect couldn't run, as opposed to having nothing to change. */
  failed?: boolean;
  /** The effect only ends the event, so the timeline doesn't mention it. */
  quiet?: boolean;
  /** The text is a message that gets its own timeline entry. */
  entry?: boolean;
  /** Index of the first-level step the effect belongs to, whatever its depth inside it. */
  step?: number;
  /** The effect is on the side of its condition that runs when it is false. */
  otherwise?: boolean;
}

export interface EventFiring {
  eventId: string;
  title: string;
  /** What triggered the event. */
  trigger: string;
  effects: EventEffectResult[];
  /** A condition was false, at any depth, so the event took its "otherwise" side. */
  conditionFailed?: boolean;
  /** Indexes of the first-level steps whose condition was false. */
  failedSteps?: number[];
  manual?: boolean;
  /** 0 for events fired by the original change, 1+ for events fired by other events. */
  depth: number;
}

export interface EventRolls extends EventDiceDisplay {
  eventId: string;
}

export interface EventRunInput {
  before: Character;
  after: Character;
  actions?: WidgetAction[];
  /** Runs this event's effects whatever its trigger, as the Run button does. */
  manualEventId?: string;
  /** What the player answered so far, in the order the questions come up; a question without an answer stops the run with PromptNeeded. */
  answers?: readonly EventAnswer[];
}

export interface EventRunResult {
  character: Character;
  firings: EventFiring[];
  rolls: EventRolls[];
  formulaChanges: FormulaChange[];
  /** The chain was cut at MAX_CHAIN_DEPTH. */
  truncated: boolean;
}

/** Replaces `{formula}` pieces of a text with their values; dice inside braces are rolled. */
export function interpolateText(text: string, labels: FormulaLabels): string {
  return text.replace(/\{([^{}]+)\}/g, (whole, formula: string) => {
    const value = evaluateFormulaValue(formula.trim(), labels);
    if (value !== null) return typeof value === 'number' ? formatNumber(value) : value;
    const amount = evaluateAmount(formula, labels);
    return amount ? formatNumber(amount.value) : whole;
  });
}

/** The sheet's labels plus the trigger's data and earlier effects' results as `event_…` labels, which win over sheet labels of the same name. */
function withEventLabels(labels: FormulaLabels, event: CharacterEvent, match: TriggerMatch, results: FormulaLabels): FormulaLabels {
  return { ...labels, ...getTriggerLabels(event.trigger.kind, match.data), ...results };
}

function cleanResolved(character: Character, changes: FormulaChange[]): Character {
  const resolved = resolveCharacterFormulas(character);
  if (!resolved) return character;
  const { _formulaChanges, ...clean } = resolved as Character & { _formulaChanges?: FormulaChange[] };
  if (_formulaChanges) changes.push(..._formulaChanges);
  return clean as Character;
}

interface Match {
  event: CharacterEvent;
  match: TriggerMatch;
  manual?: boolean;
}

function findMatches(
  prev: Character,
  current: Character,
  actions: WidgetAction[],
  fired: Set<string>,
  manualEventId: string | undefined,
): Match[] {
  const matches: Match[] = [];
  let prevLabels: FormulaLabels | undefined;
  let nextLabels: FormulaLabels | undefined;
  const getPrevLabels = () => (prevLabels ??= collectLabels(prev));
  const getNextLabels = () => (nextLabels ??= collectLabels(current));

  for (const event of current.events ?? []) {
    if (fired.has(event.id)) continue;
    if (manualEventId) {
      if (event.id === manualEventId) matches.push({ event, match: { text: 'Run by hand' }, manual: true });
      continue;
    }
    if (!event.enabled) continue;
    const trigger = event.trigger;
    const def = getTriggerDef(trigger.kind);
    if (!def) continue;
    const params = fillParams(def.params, trigger.params);
    let match: TriggerMatch | null = null;

    if (def.mode === 'state' && def.detect && prev !== current) {
      const global = isGlobalTriggerKind(trigger.kind);
      const prevWidget = findWidget(prev, trigger.widgetId);
      const nextWidget = findWidget(current, trigger.widgetId);
      // The global weight sums other widgets' items, so the watched widget itself may be untouched.
      const watchesGlobal = trigger.target === GLOBAL_LOAD_SLOT && !!prevWidget && !!nextWidget;
      if (!global && (!prevWidget || !nextWidget || (prevWidget === nextWidget && !watchesGlobal))) continue;
      match = def.detect({
        trigger,
        params,
        prev: prevWidget,
        next: nextWidget,
        prevCharacter: prev,
        nextCharacter: current,
        prevLabels: getPrevLabels,
        nextLabels: getNextLabels,
      });
    } else if (def.mode === 'action' && def.match) {
      for (const action of actions) {
        if (action.widgetId !== trigger.widgetId) continue;
        match = def.match({
          trigger,
          params,
          action,
          widget: findWidget(current, action.widgetId),
          character: current,
          labels: getNextLabels,
        });
        if (match) break;
      }
    }

    if (match) matches.push({ event, match });
  }
  return matches;
}

// Names the widget an effect changed, unless its text already does (e.g. "Bloodied turns on").
function withPrefix(prefix: string, text: string): string {
  const title = prefix.slice(0, -2);
  return !prefix || (title && text.includes(title)) ? text : `${prefix}${text}`;
}

function runEffect(
  character: Character,
  effect: CharacterEventEffect,
  labels: FormulaLabels,
  ask: EffectContext['ask'],
): { outcome: EffectOutcome | null; icon: string; prefix: string; error?: string } {
  const def = getEffectDef(effect.kind);
  const widget = findWidget(character, effect.widgetId);
  const icon = getEventIcon(effect.kind, widget);
  const prefix = widget ? `${getWidgetTitle(widget)}: ` : '';
  if (!def) return { outcome: null, icon, prefix, error: 'Unknown effect' };
  if (!isGlobalEffectKind(effect.kind) && !widget) return { outcome: null, icon, prefix, error: `${def.label}: its widget was deleted` };

  const params = fillParams(def.params, effect.params);
  const ctx: EffectContext = {
    effect,
    params,
    character,
    widget,
    labels,
    amount: (key) => evaluateAmount(params[key], labels),
    text: (key) => interpolateText(params[key] ?? '', labels),
    ask,
  };
  try {
    const outcome = def.apply(ctx);
    return outcome ? { outcome, icon, prefix } : { outcome: null, icon, prefix, error: `${def.label}: nothing to do` };
  } catch (error) {
    if (error instanceof DieValueNeeded || error instanceof PromptNeeded) throw error;
    console.error('Event effect failed', effect, error);
    return { outcome: null, icon, prefix, error: `${def.label}: failed` };
  }
}

/**
 * Runs the events triggered by a change from `before` to `after` and by widget `actions`,
 * then the events their effects trigger, and so on. Each event fires at most once per run.
 */
export function runEvents(input: EventRunInput): EventRunResult {
  let prev = input.before;
  let current = input.after;
  let actions = input.actions ?? [];
  let manualEventId = input.manualEventId;
  const fired = new Set<string>();
  const firings: EventFiring[] = [];
  const rolls: EventRolls[] = [];
  const formulaChanges: FormulaChange[] = [];
  let nextActions: WidgetAction[] = [];
  let truncated = false;
  const answers = input.answers ?? [];
  let answered = 0;
  // Why an event can't be run by another one, or null when it can.
  const runBlocker = (eventId: string, depth: number): string | null => {
    const target = current.events?.find((item) => item.id === eventId);
    if (!target) return 'the event was deleted';
    const title = `"${getEventTitle(current, target)}"`;
    if (!target.enabled) return `${title} is turned off`;
    if (fired.has(target.id)) return `${title} already ran`;
    if (depth + 1 >= MAX_CHAIN_DEPTH) {
      truncated = true;
      return `${title} would make the chain too long`;
    }
    return null;
  };

  const fire = (event: CharacterEvent, match: TriggerMatch, depth: number, manual?: boolean) => {
    fired.add(event.id);
    const title = getEventTitle(current, event);
    const firing: EventFiring = { eventId: event.id, title, trigger: match.text, effects: [], manual, depth };
    firings.push(firing);

    // Named results of the effects that ran so far, read by later conditions and effects.
    const results: FormulaLabels = {};

    const ask: EffectContext['ask'] = (prompt) => {
      const answer = answers[answered];
      if (!answer) throw new PromptNeeded({ ...prompt, eventTitle: title });
      answered += 1;
      return answer;
    };

    /** Runs the effects in order and tells whether one of them ended the event. */
    const runEffects = (effects: CharacterEventEffect[], step: number, otherwise: boolean): boolean => {
      for (const effect of effects) {
        const labels = withEventLabels(collectLabels(current), event, match, results);
        const { outcome, icon, prefix, error } = runEffect(current, effect, labels, ask);
        Object.assign(results, getResultLabels(effect, outcome?.result));
        const where = { step, ...(otherwise ? { otherwise } : {}) };
        if (!outcome) {
          firing.effects.push({ effectId: effect.id, icon, text: `${prefix}${error}`, skipped: true, failed: true, ...where });
          continue;
        }

        let next = outcome.character ?? current;
        if (outcome.data && effect.widgetId) next = patchWidgetData(next, effect.widgetId, outcome.data);
        if (next !== current) next = cleanResolved(reconcileItemEffects(current, prepareItemArrivals(current, next)), formulaChanges);
        const changed = next !== current;
        current = next;

        if (effect.params?.showResult !== 'hide') for (const roll of outcome.rolls ?? []) rolls.push({ ...roll, eventId: event.id });
        if (outcome.actions) nextActions.push(...outcome.actions);

        const blocker = outcome.runEventId ? runBlocker(outcome.runEventId, depth) : null;
        firing.effects.push({
          effectId: effect.id,
          icon,
          text: blocker ? `Can't run: ${blocker}` : withPrefix(prefix, outcome.text),
          skipped: blocker !== null || (!changed && !outcome.rolls?.length && !outcome.actions?.length && !outcome.runEventId && !REPORT_ONLY_EFFECTS.has(effect.kind)),
          ...(outcome.entry && !blocker ? { entry: true } : {}),
          ...(blocker ? { failed: true } : {}),
          ...(effect.kind === END_EVENT_KIND ? { quiet: true } : {}),
          ...where,
        });
        const linked = outcome.runEventId && !blocker ? current.events?.find((item) => item.id === outcome.runEventId) : undefined;
        if (linked) fire(linked, { text: `Run by "${title}"` }, depth + 1);
        if (outcome.stop) return true;
      }
      return false;
    };

    /** The step or effect a jump leads to, while the runs of steps it isn't in wind down. */
    let pending: string | null = null;
    let jumps = 0;
    const root = normalizeEvent(event).steps;

    /**
     * Runs the steps in order and tells whether one of them ended the event. `outer` is the index of the first-level
     * step they are nested in. With `landing`, it starts at the step or effect that id names, or at the step that holds it, instead of the first.
     */
    const runSteps = (steps: CharacterEventStep[], outer?: number, landing?: string): boolean => {
      const start = landing;
      let index = start ? steps.findIndex((item) => containsTarget([item], start)) : 0;
      while (index >= 0 && index < steps.length) {
        const step = steps[index];
        const top = outer ?? index;
        // The step holds the place that was jumped to: its condition isn't asked again, only the side that holds it carries on.
        const into = landing && step.id !== landing ? landing : undefined;
        landing = undefined;
        let jump: string | undefined;
        const section = into ? getEffectSection(step, into) : undefined;
        if (into && section) {
          // An effect of the step: its list carries on from there, then the steps nested after it.
          const list = (section === 'effects' ? step.effects : step.otherwise) ?? [];
          const nested = (section === 'effects' ? step.steps : step.otherwiseSteps) ?? [];
          if (runEffects(list.slice(list.findIndex((effect) => effect.id === into)), top, section === 'otherwise') || runSteps(nested, top)) return true;
          if (section === 'otherwise' && step.stopIfFalse && !pending) return true;
          jump = section === 'effects' ? step.jump : step.otherwiseJump;
        } else if (into) {
          const inYes = containsTarget(step.steps ?? [], into);
          if (runSteps((inYes ? step.steps : step.otherwiseSteps) ?? [], top, into)) return true;
          if (!inYes && step.stopIfFalse && !pending) return true;
          jump = inYes ? step.jump : step.otherwiseJump;
        } else {
          const passed = evaluateCondition(step.condition, withEventLabels(collectLabels(current), event, match, results));
          // Results of the sides that don't run still read as 0 or empty text, so later steps can use them.
          if (outer === undefined) for (const effect of getStepEffects(step)) Object.assign(results, getResultLabels(effect));
          if (passed) {
            if (runEffects(step.effects, top, false) || runSteps(step.steps ?? [], top)) return true;
            jump = step.jump;
          } else {
            firing.conditionFailed = true;
            if (outer === undefined) firing.failedSteps = [...(firing.failedSteps ?? []), index];
            if (runEffects(step.otherwise ?? [], top, true) || runSteps(step.otherwiseSteps ?? [], top)) return true;
            if (step.stopIfFalse && !pending) return true;
            jump = step.otherwiseJump;
          }
        }
        if (!pending && isValidJump(root, step.id, jump)) pending = jump;
        if (!pending) {
          index += 1;
          continue;
        }
        if (pending === END_JUMP) return true;
        // A jump can loop back, so a cap keeps an event that never leaves its loop from running forever.
        if (jumps >= MAX_JUMPS) return true;
        const target: string = pending;
        const at = steps.findIndex((item) => containsTarget([item], target));
        // The place is in a run this one is nested in, or in another branch: they stop so that it is found from there.
        if (at < 0) return false;
        if (outer === undefined && at > index) for (const skipped of steps.slice(index + 1, at)) for (const effect of getStepEffects(skipped)) Object.assign(results, getResultLabels(effect));
        landing = target;
        pending = null;
        jumps += 1;
        index = at;
      }
      return false;
    };
    runSteps(root);
  };

  for (let depth = 0; ; depth += 1) {
    const matches = findMatches(prev, current, actions, fired, manualEventId);
    manualEventId = undefined;
    if (matches.length === 0) break;
    if (depth >= MAX_CHAIN_DEPTH) {
      truncated = true;
      break;
    }

    const stepStart = current;
    nextActions = [];
    for (const { event, match, manual } of matches) {
      // An earlier event of this step may have run it already.
      if (fired.has(event.id)) continue;
      fire(event, match, depth, manual);
    }

    prev = stepStart;
    actions = nextActions;
  }

  return { character: current, firings, rolls, formulaChanges, truncated };
}
