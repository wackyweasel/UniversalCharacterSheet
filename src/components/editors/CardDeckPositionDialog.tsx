import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, XIcon } from '../icons';

interface Props {
  cardLabel: string;
  currentPosition: number;
  deckSize: number;
  onMove: (position: number) => void;
  onClose: () => void;
}

const inputClass = 'w-full rounded-button border border-theme-border bg-theme-paper px-2 py-1.5 text-sm text-theme-ink focus:border-theme-accent focus:outline-none';

export default function CardDeckPositionDialog({ cardLabel, currentPosition, deckSize, onMove, onClose }: Props) {
  const [positionDraft, setPositionDraft] = useState(String(currentPosition));
  const positionInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    positionInputRef.current?.focus({ preventScroll: true });
    positionInputRef.current?.select();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [onClose]);

  const parsedPosition = Number(positionDraft);
  const positionIsValid = Number.isInteger(parsedPosition) && parsedPosition >= 1 && parsedPosition <= deckSize;

  return createPortal(
    <div
      data-touch-camera-ignore="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-3 animate-fade-in"
      onClick={onClose}
      onMouseDown={(event) => event.stopPropagation()}
      onMouseUp={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-deck-position-dialog-title"
        className="w-full max-w-sm overflow-hidden rounded-theme border border-theme-border bg-theme-paper shadow-theme animate-modal-in"
        onSubmit={(event) => {
          event.preventDefault();
          if (!positionIsValid) return;
          onMove(parsedPosition);
          onClose();
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-theme-border px-4 py-3">
          <div className="min-w-0">
            <h2 id="card-deck-position-dialog-title" className="font-heading text-base font-bold text-theme-ink">Move card</h2>
            <p className="mt-0.5 truncate text-xs text-theme-muted">{cardLabel} · position {currentPosition} of {deckSize}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close move card dialog" className="widget-control h-8 w-8 flex-none">
            <XIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="p-4">
          <label className="block text-xs font-medium text-theme-ink">
            Position
            <input
              ref={positionInputRef}
              type="number"
              min={1}
              max={deckSize}
              step={1}
              inputMode="numeric"
              value={positionDraft}
              onChange={(event) => setPositionDraft(event.target.value)}
              className={`${inputClass} mt-1`}
              aria-describedby="card-deck-position-hint"
            />
          </label>
          <p id="card-deck-position-hint" className="mt-1 text-[11px] text-theme-muted">1 = top · {deckSize} = bottom</p>
          {!positionIsValid && positionDraft !== '' && (
            <p className="mt-2 text-[11px] font-medium text-red-600">Enter a whole number from 1 to {deckSize}.</p>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-theme-border px-4 py-3">
          <button type="button" onClick={onClose} className="widget-control px-3 py-2 text-xs font-semibold">Cancel</button>
          <button type="submit" disabled={!positionIsValid} className="widget-control flex items-center gap-1.5 bg-theme-accent px-3 py-2 text-xs font-semibold text-theme-paper disabled:opacity-40">
            <CheckIcon className="h-4 w-4" />
            Move
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}