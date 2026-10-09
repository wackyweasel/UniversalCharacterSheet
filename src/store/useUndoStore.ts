import { create } from 'zustand';
import { Character } from '../types';
import type { TimelineEvent } from './useTimelineStore';

// Maximum number of undo states to keep in history
const MAX_HISTORY_SIZE = 50;

// Debounce time in ms - changes within this window are merged
const DEBOUNCE_MS = 300;

// Prefix keeps ids from a previous session (persisted on timeline events) from colliding.
const SESSION_PREFIX = Date.now().toString(36);
let snapshotCounter = 0;

let coveringSnapshot: { characterId: string; id: string } | null = null;

function markCoveringSnapshot(characterId: string, id: string) {
  coveringSnapshot = { characterId, id };
  queueMicrotask(() => {
    if (coveringSnapshot?.id === id) coveringSnapshot = null;
  });
}

/** Id of the undo snapshot covering the change being made in the current tick, if any. */
export function getCoveringSnapshotId(characterId: string): string | undefined {
  return coveringSnapshot?.characterId === characterId ? coveringSnapshot.id : undefined;
}

export interface UndoState {
  id: string;
  // The character ID this state applies to
  characterId: string;
  // Snapshot of character state (just the character object)
  character: Character;
  // Description of the action for debugging/UI
  actionDescription: string;
  // Timestamp for debouncing
  timestamp: number;
  // Timeline events removed by the undo that created this redo state
  removedTimelineEvents?: TimelineEvent[];
}

interface UndoStoreState {
  // Past states for undo (newest at end)
  past: UndoState[];
  // Future states for redo (newest at end)
  future: UndoState[];
  
  // Track if we're currently doing an undo/redo to prevent recursive snapshots
  isUndoRedoing: boolean;
  
  // Actions
  /**
   * Take a snapshot before making a change.
   * Call this BEFORE modifying the store state.
   */
  takeSnapshot: (characterId: string, character: Character, actionDescription: string) => void;
  
  /**
   * Undo the last action for the given character.
   * Returns the character state to restore, or null if nothing to undo.
   * `removeTimelineEvents` receives the undone snapshot id and returns the timeline events it removed.
   */
  undo: (
    currentCharacterId: string,
    currentCharacter: Character,
    removeTimelineEvents?: (snapshotId: string) => TimelineEvent[],
  ) => Character | null;
  
  /**
   * Redo the last undone action for the given character.
   * Returns the character state to restore, or null if nothing to redo.
   * `restoreTimelineEvents` receives the events removed by the matching undo and the new undo snapshot id.
   */
  redo: (
    currentCharacterId: string,
    currentCharacter: Character,
    restoreTimelineEvents?: (events: TimelineEvent[], snapshotId: string) => void,
  ) => Character | null;
  
  /**
   * Check if undo is available for the given character.
   */
  canUndo: (characterId: string) => boolean;
  
  /**
   * Check if redo is available for the given character.
   */
  canRedo: (characterId: string) => boolean;
  
  /**
   * Clear all history for a character (e.g., when deleting a character).
   */
  clearHistory: (characterId: string) => void;
  
  /**
   * Clear all history.
   */
  clearAllHistory: () => void;
  
  /**
   * Set the undo/redo flag to prevent recursive snapshots.
   */
  setIsUndoRedoing: (value: boolean) => void;
}

export const useUndoStore = create<UndoStoreState>((set, get) => ({
  past: [],
  future: [],
  isUndoRedoing: false,
  
  takeSnapshot: (characterId, character, actionDescription) => {
    const state = get();
    
    // Don't take snapshots during undo/redo operations
    if (state.isUndoRedoing) return;
    
    const now = Date.now();
    const lastState = state.past.filter(s => s.characterId === characterId).pop();
    
    // Check for debounce - if same character and within debounce window, don't create new snapshot
    // But we still want to keep the original snapshot so the user can undo to before the batch
    if (lastState && (now - lastState.timestamp) < DEBOUNCE_MS) {
      // Same action within debounce window - don't create a new snapshot
      // This allows rapid changes (like slider dragging) to be treated as one action
      markCoveringSnapshot(characterId, lastState.id);
      return;
    }
    
    // Create a deep clone of the character to snapshot
    const snapshot: UndoState = {
      id: `${SESSION_PREFIX}-${++snapshotCounter}`,
      characterId,
      character: JSON.parse(JSON.stringify(character)),
      actionDescription,
      timestamp: now,
    };
    markCoveringSnapshot(characterId, snapshot.id);
    
    set((state) => {
      // Add to past, trim if needed
      const newPast = [...state.past, snapshot];
      if (newPast.length > MAX_HISTORY_SIZE) {
        newPast.shift();
      }
      
      return {
        past: newPast,
        // Clear future when a new action is taken
        future: state.future.filter(s => s.characterId !== characterId),
      };
    });
  },
  
  undo: (currentCharacterId, currentCharacter, removeTimelineEvents) => {
    const state = get();
    
    // Find the last state for this character in past
    const pastForCharacter = state.past.filter(s => s.characterId === currentCharacterId);
    if (pastForCharacter.length === 0) return null;
    
    // Get the state to restore
    const stateToRestore = pastForCharacter[pastForCharacter.length - 1];
    
    // Save current state to future for redo
    const futureState: UndoState = {
      id: `${SESSION_PREFIX}-${++snapshotCounter}`,
      characterId: currentCharacterId,
      character: JSON.parse(JSON.stringify(currentCharacter)),
      actionDescription: 'redo point',
      timestamp: Date.now(),
      removedTimelineEvents: removeTimelineEvents?.(stateToRestore.id),
    };
    
    set((state) => ({
      // Remove the state we're restoring from past
      past: state.past.filter((s, i, arr) => {
        // Remove the last occurrence for this character
        const isLastForCharacter = 
          s.characterId === currentCharacterId &&
          arr.slice(i + 1).filter(x => x.characterId === currentCharacterId).length === 0;
        return !isLastForCharacter;
      }),
      // Add current state to future
      future: [...state.future, futureState],
    }));
    
    return stateToRestore.character;
  },
  
  redo: (currentCharacterId, currentCharacter, restoreTimelineEvents) => {
    const state = get();
    
    // Find the last state for this character in future
    const futureForCharacter = state.future.filter(s => s.characterId === currentCharacterId);
    if (futureForCharacter.length === 0) return null;
    
    // Get the state to restore
    const stateToRestore = futureForCharacter[futureForCharacter.length - 1];
    
    // Save current state to past for undo
    const pastState: UndoState = {
      id: `${SESSION_PREFIX}-${++snapshotCounter}`,
      characterId: currentCharacterId,
      character: JSON.parse(JSON.stringify(currentCharacter)),
      actionDescription: 'undo point',
      timestamp: Date.now(),
    };

    if (stateToRestore.removedTimelineEvents?.length) {
      restoreTimelineEvents?.(stateToRestore.removedTimelineEvents, pastState.id);
    }
    
    set((state) => ({
      // Add current state to past
      past: [...state.past, pastState],
      // Remove the state we're restoring from future
      future: state.future.filter((s, i, arr) => {
        // Remove the last occurrence for this character
        const isLastForCharacter = 
          s.characterId === currentCharacterId &&
          arr.slice(i + 1).filter(x => x.characterId === currentCharacterId).length === 0;
        return !isLastForCharacter;
      }),
    }));
    
    return stateToRestore.character;
  },
  
  canUndo: (characterId) => {
    const state = get();
    return state.past.some(s => s.characterId === characterId);
  },
  
  canRedo: (characterId) => {
    const state = get();
    return state.future.some(s => s.characterId === characterId);
  },
  
  clearHistory: (characterId) => {
    set((state) => ({
      past: state.past.filter(s => s.characterId !== characterId),
      future: state.future.filter(s => s.characterId !== characterId),
    }));
  },
  
  clearAllHistory: () => {
    set({ past: [], future: [] });
  },
  
  setIsUndoRedoing: (value) => {
    set({ isUndoRedoing: value });
  },
}));
