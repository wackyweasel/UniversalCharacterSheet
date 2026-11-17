import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { answerFromPicks, CANCELLED_ANSWER, type EventAnswer, type EventPrompt, type PromptOption } from '../../events/prompt';
import { useEventPromptStore } from '../../store/useEventPromptStore';
import { CheckIcon, XIcon } from '../icons';

const inputClass = 'w-full rounded-theme border border-theme-border bg-theme-paper px-2 py-1.5 text-sm text-theme-ink focus:border-theme-accent focus:outline-none';
const choiceClass = 'flex w-full items-center gap-2 rounded-theme border border-theme-border bg-theme-paper px-3 py-2 text-left text-sm text-theme-ink';

const clamp = (value: number, min: number | null, max: number | null) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, value));

function PromptDialog({ prompt, onAnswer }: { prompt: EventPrompt; onAnswer: (answer: EventAnswer) => void }) {
  const { kind, options } = prompt;
  const startLabels = prompt.initialText.split(',').map((label) => label.trim()).filter(Boolean);
  const [picked, setPicked] = useState<string[]>(() => (
    kind === 'checkboxes' ? startLabels.filter((label) => options.some((option) => option.label === label)) : [options.find((option) => option.label === prompt.initialText)?.label ?? options[0]?.label ?? '']
  ));
  const [number, setNumber] = useState(String(prompt.initial));
  const [text, setText] = useState(prompt.initialText);
  const firstFocusRef = useRef<HTMLElement | null>(null);
  const { cancellable } = prompt;

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    firstFocusRef.current?.focus({ preventScroll: true });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (cancellable) onAnswer(CANCELLED_ANSWER);
      else if (kind === 'none') onAnswer({ cancelled: false, value: 0, text: '' });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [cancellable, kind, onAnswer]);

  const parsedNumber = number.trim() === '' ? NaN : Number(number);
  const numberValid = Number.isFinite(parsedNumber);
  const pickedOptions = options.filter((option) => picked.includes(option.label));
  const immediate = kind === 'yesno' || kind === 'buttons';
  const canConfirm = kind === 'number' ? numberValid
    : kind === 'radio' || kind === 'dropdown' ? pickedOptions.length > 0
      : true;

  const confirm = (event?: FormEvent) => {
    event?.preventDefault();
    if (!canConfirm) return;
    if (kind === 'none') {
      onAnswer({ cancelled: false, value: 0, text: '' });
    } else if (kind === 'slider' || kind === 'number') {
      const value = clamp(kind === 'slider' ? Number(number) : parsedNumber, prompt.min, prompt.max);
      onAnswer({ cancelled: false, value, text: String(value) });
    } else if (kind === 'text') {
      const answer = text.trim();
      onAnswer({ cancelled: false, value: Number(answer) || 0, text: answer });
    } else {
      onAnswer(answerFromPicks(kind, pickedOptions));
    }
  };

  const pick = (option: PromptOption) => onAnswer(answerFromPicks(kind, [option]));
  const toggle = (label: string) => setPicked((current) => (current.includes(label) ? current.filter((item) => item !== label) : [...current, label]));
  const focusFirst = (element: HTMLElement | null) => {
    if (element && !firstFocusRef.current) firstFocusRef.current = element;
  };

  return createPortal(
    <div
      data-touch-camera-ignore="true"
      className="widget-edit-modal__backdrop fixed inset-0 z-[10001] flex items-center justify-center p-3 animate-fade-in"
      onMouseDown={(event) => event.stopPropagation()}
      onMouseUp={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-prompt-title"
        className="widget-edit-modal__aux-dialog w-full max-w-sm overflow-hidden animate-modal-in"
        onSubmit={confirm}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="widget-edit-modal__header flex items-center justify-between gap-3 border-b border-theme-border">
          <div className="flex min-w-0 items-center gap-3">
            {prompt.icon && <span aria-hidden="true" className="flex-none text-2xl leading-none">{prompt.icon}</span>}
            <div className="min-w-0">
              <span className="widget-edit-modal__eyebrow">{prompt.eventTitle}</span>
              <h2 id="event-prompt-title" className="widget-edit-modal__title font-heading font-bold text-theme-ink break-words">{prompt.title || 'Event'}</h2>
            </div>
          </div>
          {cancellable && (
            <button type="button" onClick={() => onAnswer(CANCELLED_ANSWER)} aria-label="Cancel" className="widget-control h-8 w-8 flex-none">
              <XIcon className="h-4 w-4" />
            </button>
          )}
        </header>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto p-4">
          {prompt.description && <p className="whitespace-pre-wrap break-words text-sm text-theme-ink">{prompt.description}</p>}
          <div className="space-y-2 empty:hidden">
          {immediate && options.map((option, index) => (
            <button
              key={`${option.label}-${index}`}
              ref={index === 0 ? focusFirst : undefined}
              type="button"
              onClick={() => pick(option)}
              className="widget-control w-full px-3 py-2 text-sm font-semibold"
            >
              {option.label}
            </button>
          ))}

          {kind === 'radio' && options.map((option, index) => (
            <label key={`${option.label}-${index}`} className={`${choiceClass} cursor-pointer`}>
              <input
                ref={index === 0 ? focusFirst : undefined}
                type="radio"
                name="event-prompt"
                checked={picked[0] === option.label}
                onChange={() => setPicked([option.label])}
              />
              {option.label}
            </label>
          ))}

          {kind === 'checkboxes' && options.map((option, index) => (
            <label key={`${option.label}-${index}`} className={`${choiceClass} cursor-pointer`}>
              <input
                ref={index === 0 ? focusFirst : undefined}
                type="checkbox"
                checked={picked.includes(option.label)}
                onChange={() => toggle(option.label)}
              />
              {option.label}
            </label>
          ))}

          {kind === 'dropdown' && (
            <select ref={focusFirst} value={picked[0]} onChange={(event) => setPicked([event.target.value])} className={inputClass}>
              {options.map((option, index) => <option key={`${option.label}-${index}`} value={option.label}>{option.label}</option>)}
            </select>
          )}

          {kind === 'slider' && (
            <div>
              <div className="mb-1 text-center text-lg font-bold text-theme-ink">{number}</div>
              <input
                ref={focusFirst}
                type="range"
                min={prompt.min ?? 0}
                max={prompt.max ?? 10}
                step={prompt.step}
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                className="w-full"
              />
              <div className="flex justify-between text-[11px] text-theme-muted">
                <span>{prompt.min}</span>
                <span>{prompt.max}</span>
              </div>
            </div>
          )}

          {kind === 'number' && (
            <div>
              <input
                ref={focusFirst}
                type="number"
                inputMode="decimal"
                min={prompt.min ?? undefined}
                max={prompt.max ?? undefined}
                step={prompt.step}
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                onBlur={() => numberValid && setNumber(String(clamp(parsedNumber, prompt.min, prompt.max)))}
                className={inputClass}
              />
              {(prompt.min !== null || prompt.max !== null) && (
                <p className="mt-1 text-[11px] text-theme-muted">
                  {prompt.min !== null && prompt.max !== null ? `${prompt.min} to ${prompt.max}` : prompt.min !== null ? `At least ${prompt.min}` : `At most ${prompt.max}`}
                </p>
              )}
            </div>
          )}

          {kind === 'text' && (
            <input ref={focusFirst} type="text" value={text} onChange={(event) => setText(event.target.value)} className={inputClass} />
          )}
          </div>
        </div>

        {!immediate && (
          <footer className="widget-edit-modal__footer flex justify-end gap-2 border-t border-theme-border">
            {cancellable && (
              <button type="button" onClick={() => onAnswer(CANCELLED_ANSWER)} className="widget-control px-3 py-2 text-xs font-semibold">Cancel</button>
            )}
            <button ref={kind === 'none' ? focusFirst : undefined} type="submit" disabled={!canConfirm} className="widget-control flex items-center gap-1.5 bg-theme-accent px-3 py-2 text-xs font-semibold text-theme-paper disabled:opacity-40">
              <CheckIcon className="h-4 w-4" />
              {kind === 'none' ? 'OK' : 'Confirm'}
            </button>
          </footer>
        )}
      </form>
    </div>,
    document.body,
  );
}

/** Shows the questions events ask the player, one at a time. */
export default function EventPromptHost() {
  const current = useEventPromptStore((state) => state.current);
  const answer = useEventPromptStore((state) => state.answer);
  if (!current) return null;
  return <PromptDialog key={current.id} prompt={current.prompt} onAnswer={answer} />;
}
