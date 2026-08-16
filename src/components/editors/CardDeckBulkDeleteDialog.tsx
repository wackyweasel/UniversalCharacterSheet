import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CardTableCard } from '../../types';
import { TrashIcon, XIcon } from '../icons';

interface Props {
  cards: CardTableCard[];
  onDelete: (cardIds: Set<string>) => void;
  onClose: () => void;
}

export default function CardDeckBulkDeleteDialog({ cards, onDelete, onClose }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(() => new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus({ preventScroll: true });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [onClose]);

  const selectedCount = selectedCardIds.size;
  const allSelected = cards.length > 0 && selectedCount === cards.length;

  const toggleCard = (cardId: string) => {
    setSelectedCardIds((current) => {
      const next = new Set(current);
      if (next.has(cardId)) next.delete(cardId); else next.add(cardId);
      return next;
    });
    setConfirmingDelete(false);
  };

  return createPortal(
    <div
      data-touch-camera-ignore="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-3 animate-fade-in"
      onClick={onClose}
      onMouseDown={(event) => event.stopPropagation()}
      onMouseUp={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-delete-cards-title"
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-theme border border-theme-border bg-theme-paper shadow-theme animate-modal-in"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-theme-border px-4 py-3">
          <div>
            <h2 id="bulk-delete-cards-title" className="font-heading text-lg font-bold text-theme-ink">Delete cards in bulk</h2>
            <p className="mt-0.5 text-xs text-theme-muted">Choose the cards to remove from this deck.</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close bulk delete dialog" className="widget-control h-8 w-8 flex-none">
            <XIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="flex items-center justify-between gap-3 border-b border-theme-border bg-theme-background px-4 py-2">
          <span className="text-xs font-semibold text-theme-ink">{selectedCount} of {cards.length} selected</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedCardIds(new Set(cards.map((card) => card.id)));
                setConfirmingDelete(false);
              }}
              disabled={allSelected}
              className="widget-control px-2 py-1 text-xs disabled:opacity-40"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedCardIds(new Set());
                setConfirmingDelete(false);
              }}
              disabled={selectedCount === 0}
              className="widget-control px-2 py-1 text-xs disabled:opacity-40"
            >
              Select none
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3" aria-label="Cards to delete">
          <div className="overflow-hidden rounded-button border border-theme-border bg-theme-paper">
            {cards.map((card, index) => {
              const selected = selectedCardIds.has(card.id);
              return (
                <label
                  key={card.id}
                  className={`flex cursor-pointer items-center gap-3 border-b border-theme-border px-3 py-2 last:border-b-0 ${selected ? 'bg-theme-accent/10' : 'hover:bg-theme-background'}`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleCard(card.id)}
                    aria-label={`Select ${card.title || `card ${index + 1}`} for deletion`}
                    className="h-4 w-4 flex-none accent-theme-accent"
                  />
                  <span className="flex h-7 w-7 flex-none items-center justify-center text-base text-theme-ink">{card.symbol || '·'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-theme-ink">{card.title || 'Untitled card'}</span>
                    {card.body && <span className="block truncate text-[10px] text-theme-muted">{card.body}</span>}
                  </span>
                  <span className="text-[10px] text-theme-muted">{index === 0 ? 'Top' : `#${index + 1}`}</span>
                </label>
              );
            })}
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-theme-border px-4 py-3">
          {confirmingDelete ? (
            <p className="text-xs font-semibold text-red-600">Delete {selectedCount} selected card{selectedCount === 1 ? '' : 's'}? This can be undone.</p>
          ) : <span className="text-xs text-theme-muted">Deletion can be undone from the sheet toolbar.</span>}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="widget-control px-3 py-2 text-xs font-semibold">Cancel</button>
            {confirmingDelete ? (
              <button
                type="button"
                onClick={() => onDelete(selectedCardIds)}
                className="flex items-center gap-1.5 rounded-button bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                <TrashIcon className="h-4 w-4" />
                Delete {selectedCount} card{selectedCount === 1 ? '' : 's'}
              </button>
            ) : (
              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={() => setConfirmingDelete(true)}
                className="widget-control flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-500 disabled:opacity-40"
              >
                <TrashIcon className="h-4 w-4" />
                Delete selected
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}