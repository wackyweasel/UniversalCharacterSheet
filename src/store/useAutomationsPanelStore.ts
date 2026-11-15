import { create } from 'zustand';
import { useTimelineStore } from './useTimelineStore';

export type AutomationsTab = 'labels' | 'formulas' | 'events' | 'effects';

interface AutomationsPanelState {
  isOpen: boolean;
  tab: AutomationsTab;
  focusVariableId: string | null;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  openTab: (tab: AutomationsTab) => void;
  showVariable: (variableId: string) => void;
  clearVariableFocus: () => void;
}

export const useAutomationsPanelStore = create<AutomationsPanelState>((set, get) => ({
  isOpen: false,
  tab: 'labels',
  focusVariableId: null,
  setOpen: (open) => {
    if (open) useTimelineStore.getState().setOpen(false);
    set(open ? { isOpen: true } : { isOpen: false, focusVariableId: null });
  },
  toggleOpen: () => get().setOpen(!get().isOpen),
  openTab: (tab) => {
    get().setOpen(true);
    set({ tab, ...(tab !== 'labels' ? { focusVariableId: null } : {}) });
  },
  showVariable: (variableId) => {
    get().openTab('labels');
    set({ focusVariableId: variableId });
  },
  clearVariableFocus: () => set({ focusVariableId: null }),
}));

useTimelineStore.subscribe((state, previous) => {
  if (state.isOpen && !previous.isOpen) useAutomationsPanelStore.getState().setOpen(false);
});
