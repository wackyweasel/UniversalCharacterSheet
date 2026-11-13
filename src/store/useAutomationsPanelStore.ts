import { create } from 'zustand';
import { useTimelineStore } from './useTimelineStore';

export type AutomationsTab = 'labels' | 'formulas' | 'events' | 'effects';

interface AutomationsPanelState {
  isOpen: boolean;
  tab: AutomationsTab;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  openTab: (tab: AutomationsTab) => void;
}

export const useAutomationsPanelStore = create<AutomationsPanelState>((set, get) => ({
  isOpen: false,
  tab: 'labels',
  setOpen: (open) => {
    if (open) useTimelineStore.getState().setOpen(false);
    set({ isOpen: open });
  },
  toggleOpen: () => get().setOpen(!get().isOpen),
  openTab: (tab) => {
    get().setOpen(true);
    set({ tab });
  },
}));

useTimelineStore.subscribe((state, previous) => {
  if (state.isOpen && !previous.isOpen) useAutomationsPanelStore.getState().setOpen(false);
});
