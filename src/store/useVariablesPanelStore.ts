import { create } from 'zustand';
import { useTimelineStore } from './useTimelineStore';

interface VariablesPanelState {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
}

// The variables panel and the timeline share the same side of the screen, so only one is open at a time.
export const useVariablesPanelStore = create<VariablesPanelState>((set, get) => ({
  isOpen: false,
  setOpen: (open) => {
    if (open) useTimelineStore.getState().setOpen(false);
    set({ isOpen: open });
  },
  toggleOpen: () => get().setOpen(!get().isOpen),
}));

useTimelineStore.subscribe((state, previous) => {
  if (state.isOpen && !previous.isOpen && useVariablesPanelStore.getState().isOpen) {
    useVariablesPanelStore.setState({ isOpen: false });
  }
});
