import { create } from 'zustand';
import { useStore } from './useStore';
import { useTelemetryStore } from './useTelemetryStore';

export interface TimelineEvent {
  id: string;
  timestamp: number;
  widgetLabel: string;
  widgetType: string;
  description: string;
  icon: string;
}

/** Per-character timeline data */
interface CharacterTimeline {
  events: TimelineEvent[];
  nextId: number;
}

interface TimelineState {
  /** Events keyed by character ID */
  eventsByCharacter: Record<string, CharacterTimeline>;
  isOpen: boolean;
  orderNewestFirst: boolean;
  showFormulas: boolean;
  
  addEvent: (characterId: string, event: Omit<TimelineEvent, 'id' | 'timestamp'>) => void;
  removeEvent: (characterId: string, eventId: string) => void;
  restoreEvents: (characterId: string, events: TimelineEvent[]) => void;
  clearEvents: (characterId: string) => void;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  toggleOrder: () => void;
  toggleShowFormulas: () => void;
}

const STORAGE_KEY = 'ucs:timeline';

// Load persisted state from localStorage
function loadPersistedState(): { eventsByCharacter: Record<string, CharacterTimeline>; orderNewestFirst: boolean; showFormulas: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { eventsByCharacter: {}, orderNewestFirst: false, showFormulas: true };
    const data = JSON.parse(raw);

    // Migrate from old single-list format
    if (Array.isArray(data.events)) {
      return { eventsByCharacter: {}, orderNewestFirst: data.orderNewestFirst ?? false, showFormulas: data.showFormulas ?? true };
    }

    return {
      eventsByCharacter: data.eventsByCharacter && typeof data.eventsByCharacter === 'object'
        ? data.eventsByCharacter
        : {},
      orderNewestFirst: data.orderNewestFirst ?? false,
      showFormulas: data.showFormulas ?? true,
    };
  } catch {
    return { eventsByCharacter: {}, orderNewestFirst: false, showFormulas: true };
  }
}

const persisted = loadPersistedState();

function recordTimelineEvent(eventName: string, metadata?: Record<string, string | number | boolean | null | undefined>) {
  const storeState = useStore.getState();
  const characterId = storeState.activeCharacterId;
  if (characterId && storeState.transientCharacterIds.includes(characterId)) return;

  const character = characterId ? storeState.characters.find(c => c.id === characterId) : undefined;
  useTelemetryStore.getState().recordEvent({
    eventName,
    category: 'timeline',
    characterId: characterId ?? null,
    sheetId: character?.activeSheetId ?? null,
    mode: storeState.mode,
    source: 'timeline_sidebar',
    metadata,
  });
}

export const useTimelineStore = create<TimelineState>((set) => ({
  eventsByCharacter: persisted.eventsByCharacter,
  isOpen: false,
  orderNewestFirst: persisted.orderNewestFirst,
  showFormulas: persisted.showFormulas,
  
  addEvent: (characterId, event) => set((state) => {
    const charTimeline = state.eventsByCharacter[characterId] ?? { events: [], nextId: 1 };
    const newEvent: TimelineEvent = {
      ...event,
      id: String(charTimeline.nextId),
      timestamp: Date.now(),
    };
    return {
      eventsByCharacter: {
        ...state.eventsByCharacter,
        [characterId]: {
          events: [...charTimeline.events, newEvent].slice(-200),
          nextId: charTimeline.nextId + 1,
        },
      },
    };
  }),

  removeEvent: (characterId, eventId) => set((state) => {
    const charTimeline = state.eventsByCharacter[characterId];
    if (!charTimeline) return state;

    recordTimelineEvent('timeline_event_deleted', { eventId });

    return {
      eventsByCharacter: {
        ...state.eventsByCharacter,
        [characterId]: {
          ...charTimeline,
          events: charTimeline.events.filter((event) => event.id !== eventId),
        },
      },
    };
  }),

  restoreEvents: (characterId, events) => set((state) => {
    if (events.length === 0) return state;

    const charTimeline = state.eventsByCharacter[characterId] ?? { events: [], nextId: 1 };
    const existingIds = new Set(charTimeline.events.map((event) => event.id));
    const eventsToRestore = events.filter((event) => !existingIds.has(event.id));
    if (eventsToRestore.length === 0) return state;

    const restoredEvents = [...charTimeline.events, ...eventsToRestore]
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-200);
    const nextId = restoredEvents.reduce((highestId, event) => {
      const numericId = Number(event.id);
      return Number.isFinite(numericId) ? Math.max(highestId, numericId + 1) : highestId;
    }, charTimeline.nextId);

    recordTimelineEvent('timeline_events_restored', { eventCount: eventsToRestore.length });

    return {
      eventsByCharacter: {
        ...state.eventsByCharacter,
        [characterId]: {
          events: restoredEvents,
          nextId,
        },
      },
    };
  }),
  
  clearEvents: (characterId) => set((state) => {
    const eventCount = state.eventsByCharacter[characterId]?.events.length ?? 0;
    if (eventCount > 0) {
      recordTimelineEvent('timeline_cleared', { eventCount });
    }

    return {
      eventsByCharacter: {
        ...state.eventsByCharacter,
        [characterId]: { events: [], nextId: state.eventsByCharacter[characterId]?.nextId ?? 1 },
      },
    };
  }),
  
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  
  setOpen: (open) => set({ isOpen: open }),
  
  toggleOrder: () => set((state) => {
    recordTimelineEvent('timeline_order_changed', { newestFirst: !state.orderNewestFirst });
    return { orderNewestFirst: !state.orderNewestFirst };
  }),
  toggleShowFormulas: () => set((state) => {
    recordTimelineEvent('timeline_formula_visibility_changed', { showFormulas: !state.showFormulas });
    return { showFormulas: !state.showFormulas };
  }),
}));

// Persist timeline to localStorage on changes (debounced)
{
  let saveTimeout: number | null = null;
  useTimelineStore.subscribe((state) => {
    if (saveTimeout) window.clearTimeout(saveTimeout);
    saveTimeout = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          eventsByCharacter: state.eventsByCharacter,
          orderNewestFirst: state.orderNewestFirst,
          showFormulas: state.showFormulas,
        }));
      } catch (e) {
        console.error('Failed to persist timeline', e);
        if (e instanceof DOMException && (e as DOMException).name === 'QuotaExceededError') {
          import('./useStorageWarningStore').then(m => m.useStorageWarningStore.getState().reportSaveFailure());
        }
      }
    }, 300);
  });
}

/** Helper hook to get the current character's events */
export function useCurrentCharacterEvents(): TimelineEvent[] {
  const activeCharacterId = useStore((s) => s.activeCharacterId);
  return useTimelineStore((s) => {
    if (!activeCharacterId) return [];
    return s.eventsByCharacter[activeCharacterId]?.events ?? [];
  });
}

// Helper to add timeline events from anywhere (auto-detects active character)
export function addTimelineEvent(
  widgetLabel: string,
  widgetType: string,
  description: string,
  icon: string
) {
  const characterId = useStore.getState().activeCharacterId;
  if (!characterId) return;
  useTimelineStore.getState().addEvent(characterId, { widgetLabel, widgetType, description, icon });
}
