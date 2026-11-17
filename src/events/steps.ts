import { v4 as uuidv4 } from 'uuid';
import type { CharacterEvent, CharacterEventEffect, CharacterEventStep } from '../types';

/** Events saved before steps existed: one condition and one list of effects. */
export type StoredCharacterEvent = Omit<CharacterEvent, 'steps'> & {
  steps?: CharacterEventStep[];
  condition?: string;
  effects?: CharacterEventEffect[];
};

const withIds = (effects: CharacterEventEffect[]) => effects.map((effect) => (effect.id ? effect : { ...effect, id: uuidv4() }));

const isComplete = (step: CharacterEventStep): boolean => !!step.id
  && Array.isArray(step.effects)
  && [...step.effects, ...(step.otherwise ?? [])].every((effect) => effect.id)
  && [...(step.steps ?? []), ...(step.otherwiseSteps ?? [])].every(isComplete);

const withStepIds = (step: CharacterEventStep): CharacterEventStep => ({
  ...step,
  id: step.id || uuidv4(),
  effects: withIds(step.effects ?? []),
  ...(step.otherwise?.length ? { otherwise: withIds(step.otherwise) } : {}),
  ...(step.steps?.length ? { steps: step.steps.map(withStepIds) } : {}),
  ...(step.otherwiseSteps?.length ? { otherwiseSteps: step.otherwiseSteps.map(withStepIds) } : {}),
});

/** Returns the event in its current shape: legacy events become one step, and steps and effects get ids. */
export function normalizeEvent(event: StoredCharacterEvent | CharacterEvent): CharacterEvent {
  const stored = event as StoredCharacterEvent;
  if (Array.isArray(stored.steps) && !('condition' in stored) && !('effects' in stored) && stored.steps.every(isComplete)) return event as CharacterEvent;

  const { condition, effects, steps, ...rest } = stored;
  const source: CharacterEventStep[] = Array.isArray(steps)
    ? steps
    : [{ id: '', ...(condition?.trim() ? { condition } : {}), effects: effects ?? [] }];
  return { ...rest, steps: source.map(withStepIds) };
}

export function normalizeEvents(events: StoredCharacterEvent[] | undefined): CharacterEvent[] | undefined {
  if (!events) return events;
  const normalized = events.map(normalizeEvent);
  return normalized.every((event, index) => event === events[index]) ? (events as CharacterEvent[]) : normalized;
}

export function createStep(effects: CharacterEventEffect[] = [], condition?: string): CharacterEventStep {
  return { id: uuidv4(), ...(condition !== undefined ? { condition } : {}), effects };
}

/** A step's effects at every depth, in the order they're laid out: its own, those of the steps nested after them, then its "otherwise" side the same way. */
export function getStepEffects(step: CharacterEventStep): CharacterEventEffect[] {
  return [
    ...step.effects,
    ...(step.steps ?? []).flatMap(getStepEffects),
    ...(step.otherwise ?? []),
    ...(step.otherwiseSteps ?? []).flatMap(getStepEffects),
  ];
}

/** Every effect of the event, nested ones included, in the order they're laid out. */
export function getEventEffects(event: Pick<CharacterEvent, 'steps'>): CharacterEventEffect[] {
  return event.steps.flatMap(getStepEffects);
}

/** The steps at every depth, each one followed by the steps nested in it. */
export function getAllSteps(steps: CharacterEventStep[]): CharacterEventStep[] {
  return steps.flatMap((step) => [step, ...getAllSteps(step.steps ?? []), ...getAllSteps(step.otherwiseSteps ?? [])]);
}

/** Rebuilds the steps at every depth: `change` gets each step once the steps nested in it are rebuilt. Steps that don't change are kept as they are. */
export function mapSteps(steps: CharacterEventStep[], change: (step: CharacterEventStep) => CharacterEventStep): CharacterEventStep[] {
  let changed = false;
  const next = steps.map((step) => {
    const nested = step.steps && mapSteps(step.steps, change);
    const otherwiseSteps = step.otherwiseSteps && mapSteps(step.otherwiseSteps, change);
    const rebuilt = nested === step.steps && otherwiseSteps === step.otherwiseSteps
      ? step
      : { ...step, ...(nested ? { steps: nested } : {}), ...(otherwiseSteps ? { otherwiseSteps } : {}) };
    const result = change(rebuilt);
    if (result !== step) changed = true;
    return result;
  });
  return changed ? next : steps;
}

/** Applies `change` to every effect of the event, keeping unchanged ones as they are. */
export function mapEventEffects<T extends Pick<CharacterEvent, 'steps'>>(event: T, change: (effect: CharacterEventEffect) => CharacterEventEffect): T {
  const apply = (effects: CharacterEventEffect[]) => {
    const next = effects.map(change);
    return next.some((effect, index) => effect !== effects[index]) ? next : effects;
  };
  const steps = mapSteps(event.steps, (step) => {
    const effects = apply(step.effects);
    const otherwise = step.otherwise ? apply(step.otherwise) : undefined;
    return effects === step.effects && otherwise === step.otherwise ? step : { ...step, effects, ...(otherwise ? { otherwise } : {}) };
  });
  return steps === event.steps ? event : { ...event, steps };
}

export type EventSection = 'condition' | 'effects' | 'otherwise';

/** A condition or an effect of an event, with where it sits. */
export interface EventPart {
  step: CharacterEventStep;
  /** The step's number among all the steps of the event, nested ones included, from 1 in the order they're laid out. */
  stepNumber: number;
  /** Where the step is in the event, such as `['steps', 1, 'otherwiseSteps', 0]`. */
  stepPath: (string | number)[];
  section: EventSection;
  /** Position of the effect in the step's `effects` or `otherwise`. */
  index: number;
  /** Missing for a condition. */
  effect?: CharacterEventEffect;
  /** The effects that come before it, whose named results it can read: an "otherwise" side never sees the other side of its condition. */
  before: CharacterEventEffect[];
}

/** The parts of an event in the order they're laid out: for each step its condition (listed even when the step has none), then both of its sides. */
export function getEventParts(event: Pick<CharacterEvent, 'steps'>): EventPart[] {
  const parts: EventPart[] = [];
  let count = 0;
  const walk = (steps: CharacterEventStep[], path: (string | number)[], before: CharacterEventEffect[]) => {
    let seen = before;
    steps.forEach((step, stepIndex) => {
      const stepPath = [...path, stepIndex];
      count += 1;
      const base = { step, stepNumber: count, stepPath };
      parts.push({ ...base, section: 'condition', index: 0, before: seen });
      const side = (section: 'effects' | 'otherwise', effects: CharacterEventEffect[], nested: CharacterEventStep[] | undefined) => {
        effects.forEach((effect, index) => parts.push({ ...base, section, index, effect, before: [...seen, ...effects.slice(0, index)] }));
        if (nested?.length) walk(nested, [...stepPath, section === 'effects' ? 'steps' : 'otherwiseSteps'], [...seen, ...effects]);
      };
      side('effects', step.effects, step.steps);
      side('otherwise', step.otherwise ?? [], step.otherwiseSteps);
      seen = [...seen, ...getStepEffects(step)];
    });
  };
  walk(event.steps, ['steps'], []);
  return parts;
}
