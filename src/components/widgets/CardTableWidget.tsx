import { useLayoutEffect, useRef } from 'react';
import type { Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { getCardTableCards } from '../../utils/cardTable';
import {
  getCardDeckRegistrations,
  registerCardDeck,
  startCardDeckDrag,
} from '../card-table/cardDeckRegistry';
import { LayersIcon } from '../icons';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
  interactive?: boolean;
  render3D?: boolean;
}

export default function CardTableWidget({ widget, mode, interactive = true, render3D = true }: Props) {
  const toggleCardTableCard = useStore((state) => state.toggleCardTableCard);
  const moveCardTableCard = useStore((state) => state.moveCardTableCard);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const { label } = widget.data;
  const cards = getCardTableCards(widget.data);
  const topCard = cards[0];
  const canInteract = interactive && mode !== 'print';

  useLayoutEffect(() => {
    const element = surfaceRef.current;
    if (!element || !render3D || mode === 'print') return;
    return registerCardDeck({
      widgetId: widget.id,
      element,
      label: label || 'Card Deck',
      cards,
      interactive: canInteract,
      onFlip: (cardId) => {
        const card = cards.find((entry) => entry.id === cardId);
        toggleCardTableCard(widget.id, cardId);
        if (card) addTimelineEvent(label || 'Card Deck', 'CARD_TABLE', `${card.faceUp ? 'Hid' : 'Revealed'} “${card.title || 'Untitled card'}”`, '🂠');
      },
      onMove: (cardId, targetWidgetId) => {
        const card = cards.find((entry) => entry.id === cardId);
        const target = getCardDeckRegistrations().find((entry) => entry.widgetId === targetWidgetId);
        moveCardTableCard({ sourceWidgetId: widget.id, targetWidgetId, cardId });
        if (card) addTimelineEvent(label || 'Card Deck', 'CARD_TABLE', `Moved “${card.title || 'Untitled card'}” to ${target?.label || 'another deck'}`, '🂠');
      },
    });
  }, [canInteract, cards, label, mode, moveCardTableCard, render3D, toggleCardTableCard, widget.id]);

  return (
    <div className="card-table-widget flex h-full w-full flex-col gap-1.5">
      {label && (
        <div className="widget-header flex-shrink-0">
          <div className="widget-header-title min-w-0 flex-1 truncate">{label}</div>
          <span className="card-deck-count">{cards.length}</span>
        </div>
      )}
      <div
        ref={surfaceRef}
        className={`card-deck-surface${topCard ? '' : ' card-deck-surface--empty'}${render3D ? '' : ' card-deck-surface--fallback-only'}`}
        data-card-deck-widget-id={widget.id}
      >
        <div className={`card-deck-fallback${topCard?.faceUp ? ' card-deck-fallback--face-up' : ''}`} aria-hidden="true">
          {topCard?.faceUp ? (
            <>
              <span className="card-deck-fallback__symbol">{topCard.symbol || ' '}</span>
              <span className="card-deck-fallback__title">{topCard.title || 'Untitled card'}</span>
            </>
          ) : (
            <LayersIcon className="h-7 w-7" />
          )}
        </div>
        {!topCard && <span className="card-deck-empty-label">Empty deck</span>}
        {topCard && canInteract && render3D && (
          <button
            type="button"
            className="card-deck-hit-target"
            aria-label={topCard.faceUp ? `Top card: ${topCard.title || 'Untitled card'}` : 'Top card, face down'}
            onPointerDown={(event) => startCardDeckDrag(widget.id, event.nativeEvent, event.currentTarget)}
          />
        )}
      </div>
    </div>
  );
}