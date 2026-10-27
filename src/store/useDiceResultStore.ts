import { create } from 'zustand';
import type { DiceResultEntry } from '../utils/diceResult';

let lastClick: { x: number; y: number } | null = null;
let lastPointer: { x: number; y: number; time: number } | null = null;

// The dialog anchors its corner to the click that started the roll; keyboard activation has no position.
if (typeof document !== 'undefined') {
  document.addEventListener('click', (event) => {
    if ((event.target as Element | null)?.closest?.('.dice-result-dialog')) return;
    lastClick = event.detail === 0 ? null : { x: event.clientX, y: event.clientY };
  }, true);
  document.addEventListener('pointerdown', (event) => {
    if ((event.target as Element | null)?.closest?.('.dice-result-dialog')) return;
    lastPointer = { x: event.clientX, y: event.clientY, time: performance.now() };
  }, true);
}

export const getLastClickPoint = () => lastClick;

/** Where the pointer last went down, if that was just now; rolls made by events use it to open next to what the player pressed. */
export function getRecentPointerPoint(maxAgeMs = 1500): { x: number; y: number } | undefined {
  return lastPointer && performance.now() - lastPointer.time <= maxAgeMs ? { x: lastPointer.x, y: lastPointer.y } : undefined;
}

interface DiceResultState {
  entry: DiceResultEntry | null;
  /** Results waiting for the current dialog to close, e.g. rolls made by events. */
  queue: DiceResultEntry[];
  show: (entry: DiceResultEntry) => void;
  /** Shows the entry now when nothing is open, otherwise after the open dialogs close. */
  enqueue: (entry: DiceResultEntry) => void;
  /** Closes the dialog, or only when it belongs to `widgetId`; without `widgetId` it also drops the queue. */
  close: (widgetId?: string) => void;
}

export const useDiceResultStore = create<DiceResultState>((set) => ({
  entry: null,
  queue: [],
  // A widget's own result takes the spot, but a pending event roll goes back in line instead of being lost.
  show: (entry) => set((state) => ({
    entry,
    queue: state.entry?.centered && state.entry.widgetId !== entry.widgetId ? [state.entry, ...state.queue] : state.queue,
  })),
  enqueue: (entry) => set((state) => (state.entry ? { queue: [...state.queue, entry] } : { entry })),
  close: (widgetId) => set((state) => {
    if (widgetId === undefined) return { entry: null, queue: [] };
    if (state.entry?.widgetId !== widgetId) return state;
    const [next = null, ...queue] = state.queue;
    return { entry: next, queue };
  }),
}));

export const showDiceResult = (entry: DiceResultEntry) => useDiceResultStore.getState().show(entry);
export const enqueueDiceResult = (entry: DiceResultEntry) => useDiceResultStore.getState().enqueue(entry);
export const closeDiceResult = (widgetId?: string) => useDiceResultStore.getState().close(widgetId);
