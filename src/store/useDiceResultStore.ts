import { create } from 'zustand';
import type { DiceResultEntry } from '../utils/diceResult';

let lastClick: { x: number; y: number } | null = null;

// The dialog anchors its corner to the click that started the roll; keyboard activation has no position.
if (typeof document !== 'undefined') {
  document.addEventListener('click', (event) => {
    if ((event.target as Element | null)?.closest?.('.dice-result-dialog')) return;
    lastClick = event.detail === 0 ? null : { x: event.clientX, y: event.clientY };
  }, true);
}

export const getLastClickPoint = () => lastClick;

interface DiceResultState {
  entry: DiceResultEntry | null;
  show: (entry: DiceResultEntry) => void;
  /** Closes the dialog, or only when it belongs to `widgetId`. */
  close: (widgetId?: string) => void;
}

export const useDiceResultStore = create<DiceResultState>((set) => ({
  entry: null,
  show: (entry) => set({ entry }),
  close: (widgetId) => set((state) => (
    widgetId === undefined || state.entry?.widgetId === widgetId ? { entry: null } : state
  )),
}));

export const showDiceResult = (entry: DiceResultEntry) => useDiceResultStore.getState().show(entry);
export const closeDiceResult = (widgetId?: string) => useDiceResultStore.getState().close(widgetId);
