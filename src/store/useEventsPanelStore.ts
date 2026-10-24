import { create } from 'zustand';
import type { EventTelemetrySource } from '../events/telemetry';
import type { CharacterEvent } from '../types';
import { useTimelineStore } from './useTimelineStore';
import { useVariablesPanelStore } from './useVariablesPanelStore';

export interface EventEditorRequest {
  /** Event to edit; absent when creating one. */
  eventId?: string;
  /** Starting point for a new event, such as a trigger on a given widget. */
  draft?: Partial<CharacterEvent>;
  /** Where the editor was opened, for telemetry. Defaults to the Events panel. */
  source?: EventTelemetrySource;
}

interface EventsPanelState {
  isOpen: boolean;
  /** Event to scroll to and highlight the next time the panel lists it. */
  focusEventId: string | null;
  editor: EventEditorRequest | null;
  /** Changes each time the editor opens, so a new request starts a fresh draft. */
  editorKey: number;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  /** Opens the panel on an event. */
  showEvent: (eventId: string) => void;
  clearFocus: () => void;
  openEditor: (request?: EventEditorRequest) => void;
  closeEditor: () => void;
}

// The events panel shares the side of the screen with the timeline and labels panels, so only one is open at a time.
export const useEventsPanelStore = create<EventsPanelState>((set, get) => ({
  isOpen: false,
  focusEventId: null,
  editor: null,
  editorKey: 0,
  setOpen: (open) => {
    if (open) {
      useTimelineStore.getState().setOpen(false);
      useVariablesPanelStore.getState().setOpen(false);
    }
    set(open ? { isOpen: true } : { isOpen: false, focusEventId: null });
  },
  toggleOpen: () => get().setOpen(!get().isOpen),
  showEvent: (eventId) => {
    get().setOpen(true);
    set({ focusEventId: eventId });
  },
  clearFocus: () => set({ focusEventId: null }),
  openEditor: (request = {}) => set({ editor: request, editorKey: get().editorKey + 1 }),
  closeEditor: () => set({ editor: null }),
}));

useTimelineStore.subscribe((state, previous) => {
  if (state.isOpen && !previous.isOpen && useEventsPanelStore.getState().isOpen) {
    useEventsPanelStore.setState({ isOpen: false, focusEventId: null });
  }
});

useVariablesPanelStore.subscribe((state, previous) => {
  if (state.isOpen && !previous.isOpen && useEventsPanelStore.getState().isOpen) {
    useEventsPanelStore.setState({ isOpen: false, focusEventId: null });
  }
});
