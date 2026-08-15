import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeftIcon, ShuffleIcon, XIcon } from '../icons';

interface Props {
  deckName: string;
  cardCount: number;
  sourceDeckCount: number;
  onGather: (shuffle: boolean, setFaceDown: boolean) => void;
  onClose: () => void;
}

export default function CardDeckGatherDialog({
  deckName,
  cardCount,
  sourceDeckCount,
  onGather,
  onClose,
}: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [setFaceDown, setSetFaceDown] = useState(true);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus({ preventScroll: true });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [onClose]);

  return createPortal(
    <div
      data-touch-camera-ignore="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-3 animate-fade-in"
      onClick={onClose}
      onMouseDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-deck-gather-title"
        className="card-deck-gather-dialog animate-modal-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-theme-border px-3 py-2">
          <h2 id="card-deck-gather-title" className="font-heading text-base font-bold text-theme-ink">Gather {deckName}</h2>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close gather dialog" className="widget-control h-7 w-7">
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-3 p-3 text-sm text-theme-ink">
          {cardCount > 0 ? (
            <p>
              {cardCount} card{cardCount === 1 ? '' : 's'} created in this deck will return from {sourceDeckCount} temporary deck{sourceDeckCount === 1 ? '' : 's'}.
            </p>
          ) : <p>All cards created in this deck are already here.</p>}
          <p className="text-xs leading-5 text-theme-muted">
            Cards visiting this deck from elsewhere will stay here. Choose whether returning cards resume their original creation order or the completed home deck is shuffled.
          </p>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-theme-ink">
            <input
              type="checkbox"
              checked={setFaceDown}
              onChange={(event) => setSetFaceDown(event.target.checked)}
              className="h-4 w-4 accent-theme-accent"
            />
            Set all cards face down
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-theme-border p-3">
          <button type="button" onClick={() => onGather(false, setFaceDown)} className="widget-control flex min-h-10 items-center justify-center gap-2 px-3 text-xs font-semibold">
            <ArrowLeftIcon className="h-4 w-4" />
            Original order
          </button>
          <button type="button" onClick={() => onGather(true, setFaceDown)} className="widget-control flex min-h-10 items-center justify-center gap-2 bg-theme-accent px-3 text-xs font-semibold text-theme-paper">
            <ShuffleIcon className="h-4 w-4" />
            Gather &amp; shuffle
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}