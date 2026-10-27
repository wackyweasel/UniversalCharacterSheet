import { v4 as uuidv4 } from 'uuid';
import type { CharacterEvent, CharacterEventEffect, CharacterEventStep } from '../types';

/** Events saved before steps existed: one condition and one list of effects. */
export type StoredCharacterEvent = Omit<CharacterEvent, 'steps'> & {
  steps?: CharacterEventStep[];
  condition?: string;
  effects?: CharacterEventEffect[];
};

const isComplete = (step: CharacterEventStep) => !!step.id && Array.isArray(step.effects) && step.effects.every((effect) => effect.id) && (step.otherwise ?? []).every((effect) => effect.id);

const withIds = (effects: CharacterEventEffect[]) => effects.map((effect) => (effect.id ? effect : { ...effect, id: uuidv4() }));

/** Returns the event in its current shape: legacy events become one step, and steps and effects get ids. */
export function normalizeEvent(event: StoredCharacterEvent | CharacterEvent): CharacterEvent {
  const stored = event as StoredCharacterEvent;
  if (Array.isArray(stored.steps) && !('condition' in stored) && !('effects' in stored) && stored.steps.every(isComplete)) return event as CharacterEvent;

  const { condition, effects, steps, ...rest } = stored;
  const source: CharacterEventStep[] = Array.isArray(steps)
    ? steps
    : [{ id: '', ...(condition?.trim() ? { condition } : {}), effects: effects ?? [] }];
  return {
    ...rest,
    steps: source.map((step) => ({
      ...step,
      id: step.id || uuidv4(),
      effects: withIds(step.effects ?? []),
      ...(step.otherwise?.length ? { otherwise: withIds(step.otherwise) } : {}),
    })),
  };
}

export function normalizeEvents(events: StoredCharacterEvent[] | undefined): CharacterEvent[] | undefined {
  if (!events) return events;
  const normalized = events.map(normalizeEvent);
  return normalized.every((event, index) => event === events[index]) ? (events as CharacterEvent[]) : normalized;
}

export function createStep(effects: CharacterEventEffect[] = [], condition?: string): CharacterEventStep {
  return { id: uuidv4(), ...(condition !== undefined ? { condition } : {}), effects };
}

/** Every effect of the event, with each step's effects before its "otherwise" ones. */
export function getEventEffects(event: Pick<CharacterEvent, 'steps'>): CharacterEventEffect[] {
  return event.steps.flatMap((step) => [...step.effects, ...(step.otherwise ?? [])]);
}

/** Applies `change` to every effect of the event, keeping unchanged ones as they are. */
export function mapEventEffects<T extends Pick<CharacterEvent, 'steps'>>(event: T, change: (effect: CharacterEventEffect) => CharacterEventEffect): T {
  let changed = false;
  const apply = (effects: CharacterEventEffect[]) => {
    const next = effects.map(change);
    if (next.some((effect, index) => effect !== effects[index])) {
      changed = true;
      return next;
    }
    return effects;
  };
  const steps = event.steps.map((step) => {
    const effects = apply(step.effects);
    const otherwise = step.otherwise ? apply(step.otherwise) : undefined;
    return effects === step.effects && otherwise === step.otherwise ? step : { ...step, effects, ...(otherwise ? { otherwise } : {}) };
  });
  return changed ? { ...event, steps } : event;
}
