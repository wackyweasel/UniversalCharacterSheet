import { create } from 'zustand';
import type { EventTelemetrySource } from '../events/telemetry';
import type { CharacterEvent } from '../types';
import { useAutomationsPanelStore } from './useAutomationsPanelStore';

export interface EventEditorRequest {
  /** Event to edit; absent when creating one. */
  eventId?: string;
  /** Starting point for a new event, such as a trigger on a given widget. */
  draft?: Partial<CharacterEvent>;
  /** Where the editor was opened, for telemetry. Defaults to the Events panel. */
  source?: EventTelemetrySource;
}

interface EventsPanelState {
  /** Event to scroll to and highlight the next time the panel lists it. */
  focusEventId: string | null;
  editor: EventEditorRequest | null;
  /** Changes each time the editor opens, so a new request starts a fresh draft. */
  editorKey: number;
  /** Opens the panel on an event. */
  showEvent: (eventId: string) => void;
  clearFocus: () => void;
  openEditor: (request?: EventEditorRequest) => void;
  closeEditor: () => void;
}

export const useEventsPanelStore = create<EventsPanelState>((set, get) => ({
  focusEventId: null,
  editor: null,
  editorKey: 0,
  showEvent: (eventId) => {
    useAutomationsPanelStore.getState().openTab('events');
    set({ focusEventId: eventId });
  },
  clearFocus: () => set({ focusEventId: null }),
  openEditor: (request = {}) => set({ editor: request, editorKey: get().editorKey + 1 }),
  closeEditor: () => set({ editor: null }),
}));

useAutomationsPanelStore.subscribe((state) => {
  if (!state.isOpen || state.tab !== 'events') {
    useEventsPanelStore.getState().clearFocus();
  }
});
