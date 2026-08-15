import { v4 as uuidv4 } from 'uuid';
import type { CardTableCard } from '../../types';
import { getCardTableCards } from '../../utils/cardTable';
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, TrashIcon } from '../icons';
import { Tooltip } from '../Tooltip';
import type { EditorProps } from './types';

const inputClass = 'w-full rounded-button border border-theme-border bg-theme-paper px-2 py-1.5 text-sm text-theme-ink focus:border-theme-accent focus:outline-none';

export function CardTableEditor({ widget, updateData }: EditorProps) {
  const { label } = widget.data;
  const cards = getCardTableCards(widget.data);

  const setCards = (nextCards: CardTableCard[]) => updateData({ cardTableCards: nextCards });

  const updateCard = (cardId: string, update: Partial<CardTableCard>) => {
    setCards(cards.map((card) => card.id === cardId ? { ...card, ...update } : card));
  };

  const moveCard = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= cards.length) return;
    const nextCards = [...cards];
    const [card] = nextCards.splice(index, 1);
    nextCards.splice(targetIndex, 0, card);
    setCards(nextCards);
  };

  return (
    <div className="space-y-4">
      <label className="block text-xs font-medium text-theme-ink">
        Deck name
        <input
          value={label || ''}
          onChange={(event) => updateData({ label: event.target.value })}
          placeholder="Draw Deck"
          className={`${inputClass} mt-1`}
        />
      </label>

      <section>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-semibold text-theme-ink">Cards</h4>
            <p className="mt-0.5 text-[11px] leading-4 text-theme-muted">The first card is the top of this deck.</p>
          </div>
          <button
            type="button"
            onClick={() => setCards([
              ...cards,
              { id: uuidv4(), title: 'New card', symbol: '✦', body: '', faceUp: false },
            ])}
            className="widget-control flex items-center gap-1 px-2 py-1 text-[11px]"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add card
          </button>
        </div>

        <div className="mt-2 space-y-2">
          {cards.length === 0 && (
            <div className="rounded-button border border-dashed border-theme-border px-3 py-5 text-center text-xs text-theme-muted">
              This deck is empty.
            </div>
          )}
          {cards.map((card, index) => (
            <div key={card.id} className="rounded-button border border-theme-border bg-theme-background p-2">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-theme-ink">
                  {index === 0 ? 'Top card' : `Card ${index + 1}`}
                </span>
                <Tooltip content="Move toward top">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveCard(index, -1)}
                    className="widget-control h-7 w-7 disabled:opacity-30"
                    aria-label={`Move ${card.title || 'card'} toward top`}
                  >
                    <ChevronUpIcon className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
                <Tooltip content="Move toward bottom">
                  <button
                    type="button"
                    disabled={index === cards.length - 1}
                    onClick={() => moveCard(index, 1)}
                    className="widget-control h-7 w-7 disabled:opacity-30"
                    aria-label={`Move ${card.title || 'card'} toward bottom`}
                  >
                    <ChevronDownIcon className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
                <Tooltip content="Remove card">
                  <button
                    type="button"
                    onClick={() => setCards(cards.filter((entry) => entry.id !== card.id))}
                    className="widget-control h-7 w-7 text-red-500"
                    aria-label={`Remove ${card.title || 'card'}`}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_90px] gap-2">
                <label className="text-[11px] font-medium text-theme-muted">
                  Title
                  <input
                    value={card.title}
                    onChange={(event) => updateCard(card.id, { title: event.target.value })}
                    placeholder="The Wanderer"
                    className={`${inputClass} mt-0.5`}
                  />
                </label>
                <label className="text-[11px] font-medium text-theme-muted">
                  Symbol
                  <input
                    value={card.symbol}
                    onChange={(event) => updateCard(card.id, { symbol: event.target.value })}
                    placeholder="✦"
                    className={`${inputClass} mt-0.5 text-center text-lg`}
                  />
                </label>
              </div>
              <label className="mt-2 block text-[11px] font-medium text-theme-muted">
                Card text
                <textarea
                  value={card.body}
                  onChange={(event) => updateCard(card.id, { body: event.target.value })}
                  placeholder="Multiline rules or story text"
                  rows={3}
                  className={`${inputClass} mt-0.5 resize-y`}
                />
              </label>
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-theme-ink">
                <input
                  type="checkbox"
                  checked={card.faceUp}
                  onChange={(event) => updateCard(card.id, { faceUp: event.target.checked })}
                  className="h-4 w-4 accent-theme-accent"
                />
                Face up
              </label>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}