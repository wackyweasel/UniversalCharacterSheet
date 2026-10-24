import type { Character } from '../types';
import { useStore } from '../store/useStore';
import { useTimelineStore } from '../store/useTimelineStore';
import { getCoveringSnapshotId, useUndoStore } from '../store/useUndoStore';
import { enqueueDiceResult } from '../store/useDiceResultStore';
import { expressionRollToView } from '../utils/diceResult';
import { MAX_CHAIN_DEPTH, runEvents, type EventFiring, type EventRolls, type EventRunResult } from './engine';
import { areEventsSuppressed } from './suppress';
import type { WidgetAction } from './types';
import { EVENT_TIMELINE_ICON, EVENT_TIMELINE_TYPE } from './constants';

export { EVENT_TIMELINE_ICON, EVENT_TIMELINE_TYPE };

type StoreSnapshot = ReturnType<typeof useStore.getState>;

interface PendingBatch {
  characterId: string;
  before: Character;
  undoId?: string;
  actions: WidgetAction[];
}

let unsubscribe: (() => void) | null = null;
let lastCharacterId: string | null = null;
let lastCharacter: Character | undefined;
let pending: PendingBatch | null = null;
let flushScheduled = false;
let applying = false;
let rollSerial = 0;
const firingListeners = new Set<(firings: EventFiring[]) => void>();

const getActiveCharacter = (state: StoreSnapshot) => (
  state.characters.find((character) => character.id === state.activeCharacterId)
);

/** Events only react to play: not while a widget is being edited, in print mode, or during undo, redo and loads. */
function isBlocked(state: StoreSnapshot): boolean {
  return areEventsSuppressed()
    || useUndoStore.getState().isUndoRedoing
    || state.mode === 'print'
    || state.editingWidgetId !== null;
}

function hasEvents(character: Character | undefined): boolean {
  return !!character?.events?.some((event) => event.enabled);
}

function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  // Batches the changes of one interaction, so e.g. an action and the state change it causes fire together.
  queueMicrotask(flush);
}

function observe(state: StoreSnapshot, prevState: StoreSnapshot) {
  const character = getActiveCharacter(state);
  if (applying) {
    lastCharacter = character;
    return;
  }
  if (state.activeCharacterId !== lastCharacterId || isBlocked(state) || prevState.editingWidgetId !== null) {
    lastCharacterId = state.activeCharacterId;
    lastCharacter = character;
    pending = null;
    return;
  }
  if (!character || character === lastCharacter) return;
  if (!hasEvents(character)) {
    lastCharacter = character;
    pending = null;
    return;
  }

  if (!pending) {
    pending = {
      characterId: character.id,
      before: lastCharacter ?? character,
      // Captured now: the covering snapshot is only known during the tick of the change.
      undoId: getCoveringSnapshotId(character.id),
      actions: [],
    };
  } else if (!pending.undoId) {
    pending.undoId = getCoveringSnapshotId(character.id);
  }
  lastCharacter = character;
  scheduleFlush();
}

function flush() {
  flushScheduled = false;
  const batch = pending;
  pending = null;
  if (!batch) return;

  const state = useStore.getState();
  if (state.activeCharacterId !== batch.characterId || isBlocked(state)) return;
  const after = getActiveCharacter(state);
  if (!after || !hasEvents(after)) return;

  const result = runEvents({ before: batch.before, after, actions: batch.actions });
  applyResult(batch.characterId, after, result, batch.undoId);
}

export function describeFiring(firing: EventFiring): string {
  const effects = firing.conditionFailed
    ? 'condition not met'
    : firing.effects.length === 0
      ? 'no effects'
      : firing.effects.map((effect) => (effect.skipped ? `${effect.text} (no change)` : effect.text)).join(' • ');
  return `${firing.depth > 0 ? '↳ ' : ''}${firing.trigger} → ${effects}`;
}

function showRoll(roll: EventRolls) {
  const view = roll.view ?? (roll.result ? expressionRollToView(roll.result, roll.title, roll.subtitle) : null);
  if (!view) return;
  rollSerial += 1;
  enqueueDiceResult({ widgetId: `event-roll:${rollSerial}`, view, centered: true });
}

function applyResult(characterId: string, after: Character, result: EventRunResult, undoId: string | undefined) {
  if (result.firings.length === 0) return;

  const changed = result.character !== after;
  if (changed && !undoId) {
    useUndoStore.getState().takeSnapshot(characterId, after, `Event: ${result.firings[0].title}`);
    undoId = getCoveringSnapshotId(characterId);
  }
  if (changed) {
    applying = true;
    try {
      useStore.setState((state) => ({
        characters: state.characters.map((character) => (character.id === characterId ? result.character : character)),
      }));
    } finally {
      applying = false;
    }
  }

  const timeline = useTimelineStore.getState();
  for (const firing of result.firings) {
    timeline.addEvent(characterId, {
      widgetLabel: firing.title,
      widgetType: EVENT_TIMELINE_TYPE,
      description: describeFiring(firing),
      icon: EVENT_TIMELINE_ICON,
      undoId,
      characterEventId: firing.eventId,
    });
  }
  for (const change of result.formulaChanges) {
    timeline.addEvent(characterId, {
      widgetLabel: change.widgetLabel,
      widgetType: 'FORMULA',
      description: `${change.fieldName}: ${change.oldValue} → ${change.newValue}`,
      icon: 'fx',
      undoId,
    });
  }
  if (result.truncated) {
    timeline.addEvent(characterId, {
      widgetLabel: 'Events',
      widgetType: EVENT_TIMELINE_TYPE,
      description: `Stopped a chain of events after ${MAX_CHAIN_DEPTH} steps, so they can't loop forever`,
      icon: '⚠️',
      undoId,
    });
  }
  result.rolls.forEach(showRoll);
  firingListeners.forEach((listener) => listener(result.firings));
}

/** Calls the listener with the events fired by each batch; returns an unsubscribe function. */
export function subscribeEventFirings(listener: (firings: EventFiring[]) => void): () => void {
  firingListeners.add(listener);
  return () => {
    firingListeners.delete(listener);
  };
}

/** Reports something a widget did that isn't a change of its data, such as a roll, so action triggers can fire. */
export function emitWidgetAction(action: WidgetAction): void {
  if (!unsubscribe || applying) return;
  const state = useStore.getState();
  const character = getActiveCharacter(state);
  if (!character || isBlocked(state) || !hasEvents(character)) return;

  if (!pending) {
    pending = {
      characterId: character.id,
      before: lastCharacterId === character.id && lastCharacter ? lastCharacter : character,
      undoId: getCoveringSnapshotId(character.id),
      actions: [],
    };
  }
  pending.actions.push(action);
  scheduleFlush();
}

/** Runs an event's effects right away, whatever its trigger and even when it's turned off. */
export function runEventNow(eventId: string): EventRunResult | null {
  if (pending) flush();
  const state = useStore.getState();
  const character = getActiveCharacter(state);
  if (!character || !character.events?.some((event) => event.id === eventId)) return null;

  const result = runEvents({ before: character, after: character, manualEventId: eventId });
  applyResult(character.id, character, result, undefined);
  return result;
}

export function initEventRuntime(): () => void {
  if (unsubscribe) return unsubscribe;
  const state = useStore.getState();
  lastCharacterId = state.activeCharacterId;
  lastCharacter = getActiveCharacter(state);
  const stop = useStore.subscribe(observe);
  unsubscribe = () => {
    stop();
    unsubscribe = null;
    pending = null;
  };
  return unsubscribe;
}
