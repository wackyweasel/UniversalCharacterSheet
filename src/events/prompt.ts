/** Ways an event's dialog can ask the player something while it runs; `none` is just a message with an OK button. */
export type PromptKind = 'none' | 'yesno' | 'buttons' | 'radio' | 'dropdown' | 'checkboxes' | 'slider' | 'number' | 'text';

/** Kinds that offer a list of options to pick from. */
export const OPTION_PROMPT_KINDS: readonly PromptKind[] = ['buttons', 'radio', 'dropdown', 'checkboxes'];

export interface PromptOption {
  label: string;
  /** What the option counts as when a formula reads the answer; its position by default. */
  value: number;
}

export interface EventPrompt {
  kind: PromptKind;
  title: string;
  /** Emoji or a few characters shown before the title. */
  icon: string;
  /** Longer text under the title; line breaks are kept. */
  description: string;
  /** The event that asks, shown above the question. */
  eventTitle: string;
  options: PromptOption[];
  /** Range of a slider or number; null when unbounded. */
  min: number | null;
  max: number | null;
  step: number;
  /** Starting number for a slider or number. */
  initial: number;
  /** Starting text for a text answer, or the label of the option that starts selected. */
  initialText: string;
  cancellable: boolean;
}

export interface EventAnswer {
  /** The player closed the dialog without answering; the event stops there. */
  cancelled: boolean;
  value: number;
  text: string;
}

/** Thrown by the engine when an effect needs an answer it hasn't been given yet, so the run can be repeated with it. */
export class PromptNeeded extends Error {
  readonly prompt: EventPrompt;

  constructor(prompt: EventPrompt) {
    super('The player has to answer a question');
    this.prompt = prompt;
  }
}

export const MAX_PROMPT_OPTIONS = 40;

/** Reads "Easy, Normal = 2, Hard = 3": comma separated labels, each with an optional `= number`. */
export function parseOptions(source: string | undefined): PromptOption[] {
  return (source ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, MAX_PROMPT_OPTIONS)
    .map((part, index) => {
      const split = part.lastIndexOf('=');
      if (split > 0) {
        const label = part.slice(0, split).trim();
        const raw = part.slice(split + 1).trim();
        const value = Number(raw);
        if (label && raw !== '' && Number.isFinite(value)) return { label, value };
      }
      return { label: part, value: index + 1 };
    });
}

/** The answer for what the player picked or typed; `picked` is every chosen option, in order. */
export function answerFromPicks(kind: PromptKind, picked: PromptOption[]): EventAnswer {
  if (kind === 'checkboxes') return { cancelled: false, value: picked.length, text: picked.map((option) => option.label).join(', ') || 'Nothing' };
  const [first] = picked;
  return { cancelled: false, value: first?.value ?? 0, text: first?.label ?? '' };
}

export const CANCELLED_ANSWER: EventAnswer = { cancelled: true, value: 0, text: '' };
