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

/** What a side's jump holds to go to the end of the event. */
export const END_JUMP = 'end';

/** The effects on the two lists of the step, not those of the steps nested in it. */
export const getOwnEffects = (step: CharacterEventStep): CharacterEventEffect[] => [...step.effects, ...(step.otherwise ?? [])];

/** The places a side of the step can jump to: any step or effect of the event, in any branch, before or after it. */
export function getJumpTargetIds(steps: CharacterEventStep[], stepId: string): string[] {
  const all = getAllSteps(steps);
  if (!all.some((step) => step.id === stepId)) return [];
  return [...all.map((step) => step.id), ...all.flatMap(getOwnEffects).map((effect) => effect.id)];
}

/** Whether a side's jump leads somewhere: to the end, or to a step or effect of the event. */
export function isValidJump(steps: CharacterEventStep[], stepId: string, target: string | undefined): target is string {
  return !!target && (target === END_JUMP || getJumpTargetIds(steps, stepId).includes(target));
}

/** The list of the step an effect is in. */
export function getEffectSection(step: CharacterEventStep, effectId: string): 'effects' | 'otherwise' | undefined {
  if (step.effects.some((effect) => effect.id === effectId)) return 'effects';
  return step.otherwise?.some((effect) => effect.id === effectId) ? 'otherwise' : undefined;
}

/** Whether a step or an effect is in the run, at any depth. */
export function containsTarget(steps: CharacterEventStep[], id: string): boolean {
  return steps.some((step) => step.id === id || !!getEffectSection(step, id) || containsTarget(step.steps ?? [], id) || containsTarget(step.otherwiseSteps ?? [], id));
}

/** The step with its jumps pointed at the new ids of the steps and effects they lead to; a jump to one that isn't in `ids` is dropped. */
export function withRemappedJumps(step: CharacterEventStep, ids: Map<string, string>): CharacterEventStep {
  const { jump, otherwiseJump, ...rest } = step;
  const remap = (target: string | undefined) => (target === END_JUMP ? target : target ? ids.get(target) : undefined);
  const yes = remap(jump);
  const no = remap(otherwiseJump);
  return { ...rest, ...(yes ? { jump: yes } : {}), ...(no ? { otherwiseJump: no } : {}) };
}

/**
 * Copies the steps with a fresh id on every step and effect, and their jumps pointed at the copies. Ids are given by what they
 * stand for and not by the id they had, so steps that share an id, or have none, still come out with ids of their own.
 * `copyEffect` builds each copied effect, and must keep the `id` it is given.
 */
export function copyStepsWithFreshIds(
  steps: CharacterEventStep[],
  copyEffect: (effect: CharacterEventEffect, id: string) => CharacterEventEffect = (effect, id) => ({ ...effect, id }),
): CharacterEventStep[] {
  const fresh = new Map<object, string>();
  const byOldId = new Map<string, string>();
  for (const step of getAllSteps(steps)) {
    for (const item of [step, ...getOwnEffects(step)]) {
      const id = uuidv4();
      fresh.set(item, id);
      if (item.id && !byOldId.has(item.id)) byOldId.set(item.id, id);
    }
  }
  const copyEffects = (effects: CharacterEventEffect[]) => effects.map((effect) => copyEffect(effect, fresh.get(effect)!));
  const copy = (step: CharacterEventStep): CharacterEventStep => ({
    ...withRemappedJumps(step, byOldId),
    id: fresh.get(step)!,
    effects: copyEffects(step.effects),
    ...(step.otherwise ? { otherwise: copyEffects(step.otherwise) } : {}),
    ...(step.steps ? { steps: step.steps.map(copy) } : {}),
    ...(step.otherwiseSteps ? { otherwiseSteps: step.otherwiseSteps.map(copy) } : {}),
  });
  return steps.map(copy);
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
