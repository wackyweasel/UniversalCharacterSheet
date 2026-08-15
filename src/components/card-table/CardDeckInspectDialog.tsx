import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CardTableCard } from '../../types';
import { usePointerReorder } from '../../hooks';
import { ArrowDownIcon, ArrowUpIcon, GripVerticalIcon, XIcon } from '../icons';

interface Props {
  deckName: string;
  cards: CardTableCard[];
  onReorder: (cards: CardTableCard[]) => void;
  onFlipCard: (cardId: string) => void;
  onSetAllFaceUp: () => void;
  onSetAllFaceDown: () => void;
  onClose: () => void;
}

export default function CardDeckInspectDialog({
  deckName,
  cards,
  onReorder,
  onFlipCard,
  onSetAllFaceUp,
  onSetAllFaceDown,
  onClose,
}: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [selectedCardId, setSelectedCardId] = useState(cards[0]?.id ?? null);
  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? cards[0] ?? null;
  const { setRowRef, startDrag, handleReorderKey } = usePointerReorder({ items: cards, onReorder });

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
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-2 animate-fade-in"
      onClick={onClose}
      onMouseDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-deck-inspect-title"
        className="card-deck-inspect-dialog animate-modal-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="card-deck-inspect-dialog__header">
          <div className="min-w-0">
            <h2 id="card-deck-inspect-title" className="truncate font-heading text-base font-bold text-theme-ink">{deckName}</h2>
            <span className="text-[11px] text-theme-muted">{cards.length} card{cards.length === 1 ? '' : 's'}</span>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close deck inspector" className="widget-control h-7 w-7">
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="card-deck-inspect-dialog__content">
          <div className="card-deck-inspect-list">
            <div className="card-deck-inspect-list__rows overflow-y-auto overscroll-contain">
              {cards.length === 0 && <div className="p-4 text-center text-xs text-theme-muted">No cards</div>}
              {cards.map((card, index) => (
                <div
                  key={card.id}
                  ref={(element) => setRowRef(card.id, element)}
                  className={`card-deck-inspect-row pointer-sort-row${selectedCard?.id === card.id ? ' card-deck-inspect-row--selected' : ''}`}
                >
                  <button
                    type="button"
                    onPointerDown={(event) => startDrag(card.id, event)}
                    onKeyDown={(event) => handleReorderKey(card.id, event)}
                    disabled={cards.length < 2}
                    className="card-deck-inspect-row__grip touch-none"
                    aria-label={`Reorder ${card.title || 'Untitled card'}`}
                    title="Drag to reorder. Arrow keys also work."
                  >
                    <GripVerticalIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCardId(card.id)}
                    className="card-deck-inspect-row__name"
                    aria-pressed={selectedCard?.id === card.id}
                  >
                    <span className="card-deck-inspect-row__position">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{card.title || 'Untitled card'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onFlipCard(card.id)}
                    className="widget-control card-deck-inspect-row__flip"
                    aria-label={`${card.faceUp ? 'Turn face down' : 'Turn face up'}: ${card.title || 'Untitled card'}`}
                  >
                    {card.faceUp ? <ArrowUpIcon className="h-3.5 w-3.5" /> : <ArrowDownIcon className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ))}
            </div>
            <div className="card-deck-inspect-list__bulk-actions">
              <button type="button" onClick={onSetAllFaceUp} className="widget-control">
                <ArrowUpIcon className="h-3.5 w-3.5" />
                Set all cards face up
              </button>
              <button type="button" onClick={onSetAllFaceDown} className="widget-control">
                <ArrowDownIcon className="h-3.5 w-3.5" />
                Set all cards face down
              </button>
            </div>
          </div>

          <div className="card-deck-inspect-preview-wrap">
            {selectedCard && (
              <>
                <div className="card-deck-inspect-preview">
                  <div className="card-deck-inspect-preview__title">
                    <span>{selectedCard.title || 'Untitled card'}</span>
                    <button
                      type="button"
                      onClick={() => onFlipCard(selectedCard.id)}
                      className="widget-control card-deck-inspect-preview__flip"
                      aria-label={selectedCard.faceUp ? 'Turn card face down' : 'Turn card face up'}
                    >
                      {selectedCard.faceUp ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="card-deck-inspect-preview__symbol">{selectedCard.symbol || ' '}</div>
                  <div className="card-deck-inspect-preview__divider" />
                  <div className="card-deck-inspect-preview__body">{selectedCard.body}</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}