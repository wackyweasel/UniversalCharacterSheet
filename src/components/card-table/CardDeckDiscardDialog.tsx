import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { CardTableCard, CardTableRestorePosition } from '../../types';
import { ArrowDownIcon, ArrowUpIcon, LayersIcon, ShuffleIcon, XIcon } from '../icons';

interface Props {
  deckName: string;
  cards: CardTableCard[];
  onRestore: (cardIds: string[], position: CardTableRestorePosition) => void;
  onClose: () => void;
}

const getCardLabel = (card: CardTableCard) => (
  card.title.trim() || card.body.trim().split(/\r?\n/, 1)[0] || (card.symbol.trim() ? 'Symbol card' : 'Untitled card')
);

export default function CardDeckDiscardDialog({ deckName, cards, onRestore, onClose }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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
        aria-labelledby="card-deck-discard-title"
        className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-theme border border-theme-border bg-theme-paper shadow-theme animate-modal-in"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-theme-border px-4 py-3">
          <div className="min-w-0">
            <h2 id="card-deck-discard-title" className="truncate font-heading text-base font-bold text-theme-ink">{deckName} discard</h2>
            <p className="mt-0.5 text-xs text-theme-muted">{cards.length} discarded card{cards.length === 1 ? '' : 's'}</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close discard pile" className="widget-control h-8 w-8 flex-none">
            <XIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-button border border-dashed border-theme-border px-4 py-10 text-center text-theme-muted">
              <LayersIcon className="h-7 w-7" />
              <p className="text-xs">The discard pile is empty.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-button border border-theme-border bg-theme-paper">
              {cards.map((card, index) => (
                <div key={card.id} className="flex items-center gap-3 border-b border-theme-border px-3 py-2.5 last:border-b-0">
                  <span className="flex h-9 w-9 flex-none items-center justify-center overflow-hidden text-xl text-theme-ink">{card.symbol || '·'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-xs font-semibold text-theme-ink">{card.title.trim() || (card.body.trim() ? 'Text card' : getCardLabel(card))}</p>
                    {card.body.trim() && <p className="mt-1 whitespace-pre-wrap break-words text-[10px] leading-4 text-theme-muted">{card.body}</p>}
                    <p className="mt-0.5 text-[10px] text-theme-muted">{index === 0 ? 'Most recently discarded' : `Discard position ${index + 1}`}</p>
                  </div>
                  <div className="flex flex-none gap-1">
                    <button
                      type="button"
                      onClick={() => onRestore([card.id], 'top')}
                      aria-label={`Return ${getCardLabel(card)} to top of deck`}
                      className="widget-control flex h-8 w-8 items-center justify-center p-0"
                      title="Return to top"
                    >
                      <ArrowUpIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRestore([card.id], 'bottom')}
                      aria-label={`Return ${getCardLabel(card)} to bottom of deck`}
                      className="widget-control flex h-8 w-8 items-center justify-center p-0"
                      title="Return to bottom"
                    >
                      <ArrowDownIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRestore([card.id], 'random')}
                      aria-label={`Return ${getCardLabel(card)} randomly in deck`}
                      className="widget-control flex h-8 w-8 items-center justify-center p-0"
                      title="Return randomly"
                    >
                      <ShuffleIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="border-t border-theme-border px-4 py-3">
          <p className="mb-2 text-[11px] font-semibold text-theme-muted">Return all discarded cards</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={cards.length === 0}
              onClick={() => onRestore(cards.map((card) => card.id), 'top')}
              className="widget-control flex min-h-9 items-center justify-center gap-1.5 px-2 text-xs font-semibold disabled:opacity-40"
            >
              <ArrowUpIcon className="h-4 w-4" />
              To top
            </button>
            <button
              type="button"
              disabled={cards.length === 0}
              onClick={() => onRestore(cards.map((card) => card.id), 'bottom')}
              className="widget-control flex min-h-9 items-center justify-center gap-1.5 px-2 text-xs font-semibold disabled:opacity-40"
            >
              <ArrowDownIcon className="h-4 w-4" />
              To bottom
            </button>
            <button
              type="button"
              disabled={cards.length === 0}
              onClick={() => onRestore(cards.map((card) => card.id), 'random')}
              className="widget-control flex min-h-9 items-center justify-center gap-1.5 bg-theme-accent px-2 text-xs font-semibold text-theme-paper disabled:opacity-40"
            >
              <ShuffleIcon className="h-4 w-4" />
              Random
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
