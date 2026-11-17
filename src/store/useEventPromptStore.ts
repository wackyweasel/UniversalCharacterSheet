import { create } from 'zustand';
import { CANCELLED_ANSWER, type EventAnswer, type EventPrompt } from '../events/prompt';

interface PendingPrompt {
  id: number;
  prompt: EventPrompt;
  resolve: (answer: EventAnswer) => void;
}

interface EventPromptState {
  /** The question on screen; the others wait their turn. */
  current: PendingPrompt | null;
  queue: PendingPrompt[];
  answer: (answer: EventAnswer) => void;
  /** Cancels the open question and the waiting ones, e.g. when the character is closed. */
  cancelAll: () => void;
}

let serial = 0;

export const useEventPromptStore = create<EventPromptState>((set, get) => ({
  current: null,
  queue: [],
  answer: (answer) => {
    const { current, queue } = get();
    if (!current) return;
    const [next = null, ...rest] = queue;
    set({ current: next, queue: rest });
    current.resolve(answer);
  },
  cancelAll: () => {
    const { current, queue } = get();
    set({ current: null, queue: [] });
    [current, ...queue].forEach((pending) => pending?.resolve(CANCELLED_ANSWER));
  },
}));

/** Opens a dialog with the question; resolves with what the player answered. */
export function askPlayer(prompt: EventPrompt): Promise<EventAnswer> {
  return new Promise((resolve) => {
    serial += 1;
    const pending: PendingPrompt = { id: serial, prompt, resolve };
    useEventPromptStore.setState((state) => (state.current ? { queue: [...state.queue, pending] } : { current: pending }));
  });
}
