import { create } from 'zustand';
import { useEventsPanelStore } from './useEventsPanelStore';
import { useTimelineStore } from './useTimelineStore';
import { useVariablesPanelStore } from './useVariablesPanelStore';

interface CompendiumPanelState {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
}

// The compendium panel shares the side of the screen with the timeline, labels and events panels, so only one is open at a time.
export const useCompendiumPanelStore = create<CompendiumPanelState>((set, get) => ({
  isOpen: false,
  setOpen: (open) => {
    if (open) {
      useTimelineStore.getState().setOpen(false);
      useVariablesPanelStore.getState().setOpen(false);
      useEventsPanelStore.getState().setOpen(false);
    }
    set({ isOpen: open });
  },
  toggleOpen: () => get().setOpen(!get().isOpen),
}));

for (const store of [useTimelineStore, useVariablesPanelStore, useEventsPanelStore]) {
  store.subscribe((state, previous) => {
    if (state.isOpen && !previous.isOpen && useCompendiumPanelStore.getState().isOpen) {
      useCompendiumPanelStore.setState({ isOpen: false });
    }
  });
}
