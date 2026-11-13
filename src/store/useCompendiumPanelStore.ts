import { create } from 'zustand';
import { useAutomationsPanelStore } from './useAutomationsPanelStore';
import { useTimelineStore } from './useTimelineStore';

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

// These panels share the same side of the screen, so only one is open at a time.
export const useCompendiumPanelStore = create<CompendiumPanelState>((set, get) => ({
  isOpen: false,
  lastAddedFeedback: null,
  setOpen: (open) => {
    if (open) {
      useTimelineStore.getState().setOpen(false);
      useAutomationsPanelStore.getState().setOpen(false);
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

for (const store of [useTimelineStore, useAutomationsPanelStore]) {
  store.subscribe((state, previous) => {
    if (state.isOpen && !previous.isOpen && useCompendiumPanelStore.getState().isOpen) {
      useCompendiumPanelStore.setState({ isOpen: false, lastAddedFeedback: null });
    }
  });
}
