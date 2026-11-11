import { create } from 'zustand';
import { useEventsPanelStore } from './useEventsPanelStore';
import { useTimelineStore } from './useTimelineStore';
import { useVariablesPanelStore } from './useVariablesPanelStore';

export interface CompendiumAddedFeedback {
  key: number;
  sectionId: string;
  message: string;
}

interface CompendiumPanelState {
  isOpen: boolean;
  lastAddedFeedback: CompendiumAddedFeedback | null;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  notifyEntryAdded: (sectionId: string, message: string) => void;
  clearAddedFeedback: () => void;
}

// The compendium panel shares the side of the screen with the timeline, labels and events panels, so only one is open at a time.
export const useCompendiumPanelStore = create<CompendiumPanelState>((set, get) => ({
  isOpen: false,
  lastAddedFeedback: null,
  setOpen: (open) => {
    if (open) {
      useTimelineStore.getState().setOpen(false);
      useVariablesPanelStore.getState().setOpen(false);
      useEventsPanelStore.getState().setOpen(false);
    }
    set({ isOpen: open, ...(open ? {} : { lastAddedFeedback: null }) });
  },
  toggleOpen: () => get().setOpen(!get().isOpen),
  notifyEntryAdded: (sectionId, message) => set((state) => ({
    lastAddedFeedback: {
      key: (state.lastAddedFeedback?.key ?? 0) + 1,
      sectionId,
      message,
    },
  })),
  clearAddedFeedback: () => set({ lastAddedFeedback: null }),
}));

for (const store of [useTimelineStore, useVariablesPanelStore, useEventsPanelStore]) {
  store.subscribe((state, previous) => {
    if (state.isOpen && !previous.isOpen && useCompendiumPanelStore.getState().isOpen) {
      useCompendiumPanelStore.setState({ isOpen: false, lastAddedFeedback: null });
    }
  });
}
