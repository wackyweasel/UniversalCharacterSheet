import { create } from 'zustand';
import { useStore } from './useStore';

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
  
  addEvent: (characterId: string, event: Omit<TimelineEvent, 'id' | 'timestamp'>) => void;
  clearEvents: (characterId: string) => void;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  toggleOrder: () => void;
}

const STORAGE_KEY = 'ucs:timeline';

// Load persisted state from localStorage
function loadPersistedState(): { eventsByCharacter: Record<string, CharacterTimeline>; orderNewestFirst: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { eventsByCharacter: {}, orderNewestFirst: false };
    const data = JSON.parse(raw);

    // Migrate from old single-list format
    if (Array.isArray(data.events)) {
      return { eventsByCharacter: {}, orderNewestFirst: data.orderNewestFirst ?? false };
    }

    return {
      eventsByCharacter: data.eventsByCharacter && typeof data.eventsByCharacter === 'object'
        ? data.eventsByCharacter
        : {},
      orderNewestFirst: data.orderNewestFirst ?? false,
    };
  } catch {
    return { eventsByCharacter: {}, orderNewestFirst: false };
  }
}

const persisted = loadPersistedState();

export const useTimelineStore = create<TimelineState>((set) => ({
  eventsByCharacter: persisted.eventsByCharacter,
  isOpen: false,
  orderNewestFirst: persisted.orderNewestFirst,
  
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
  
  clearEvents: (characterId) => set((state) => ({
    eventsByCharacter: {
      ...state.eventsByCharacter,
      [characterId]: { events: [], nextId: state.eventsByCharacter[characterId]?.nextId ?? 1 },
    },
  })),
  
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  
  setOpen: (open) => set({ isOpen: open }),
  
  toggleOrder: () => set((state) => ({ orderNewestFirst: !state.orderNewestFirst })),
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
