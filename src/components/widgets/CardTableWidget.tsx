import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { CardTableCard, CardTableRestorePosition, Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { getCardOriginBackDesign, getCardTableBackDesign, getCardTableCards, getCardTableContentLayout, getCardTableDiscardedCards } from '../../utils/cardTable';
import {
  getCardDeckRegistrations,
  registerCardDeck,
  startCardDeckDrag,
  startCardDeckGatherAnimation,
  startCardDeckShuffleAnimation,
} from '../card-table/cardDeckRegistry';
import CardDeckGatherDialog from '../card-table/CardDeckGatherDialog';
import CardDeckInspectDialog from '../card-table/CardDeckInspectDialog';
import CardDeckDiscardDialog from '../card-table/CardDeckDiscardDialog';
import { ArrowLeftIcon, EyeIcon, HandIcon, LayersIcon, ShuffleIcon } from '../icons';
import { Tooltip } from '../Tooltip';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
  interactive?: boolean;
  render3D?: boolean;
  showControls?: boolean;
  previewOnly?: boolean;
}

export default function CardTableWidget({ widget, mode, interactive = true, render3D = true, showControls, previewOnly = false }: Props) {
  const toggleCardTableCard = useStore((state) => state.toggleCardTableCard);
  const setCardTableCardsFaceUp = useStore((state) => state.setCardTableCardsFaceUp);
  const moveCardTableCard = useStore((state) => state.moveCardTableCard);
  const moveAllCardTableCards = useStore((state) => state.moveAllCardTableCards);
  const discardCardTableCard = useStore((state) => state.discardCardTableCard);
  const discardAllCardTableCards = useStore((state) => state.discardAllCardTableCards);
  const restoreCardTableCards = useStore((state) => state.restoreCardTableCards);
  const gatherCardTableCards = useStore((state) => state.gatherCardTableCards);
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const characters = useStore((state) => state.characters);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const discardRef = useRef<HTMLButtonElement>(null);
  const [inspectOpen, setInspectOpen] = useState(false);
  const [gatherOpen, setGatherOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const { label } = widget.data;
  const cards = getCardTableCards(widget.data);
  const discardedCards = getCardTableDiscardedCards(widget.data);
  const showDiscardPile = widget.data.cardTableShowDiscard ?? true;
  const showGrabAll = widget.data.cardTableShowGrabAll ?? true;
  const backDesign = getCardTableBackDesign(widget.data);
  const topCard = cards[0];
  const topCardContentLayout = topCard ? getCardTableContentLayout(topCard) : 'empty';
  const topCardBackDesign = topCard?.originWidgetId === widget.id || !topCard?.originWidgetId
    ? backDesign
    : topCard ? getCardOriginBackDesign(topCard) : backDesign;
  const canInteract = interactive && mode !== 'print';
  const controlsVisible = mode !== 'print' && (showControls ?? (render3D && canInteract));
  const closeInspector = useCallback(() => setInspectOpen(false), []);
  const closeGather = useCallback(() => setGatherOpen(false), []);
  const closeDiscard = useCallback(() => setDiscardOpen(false), []);
  const activeCharacter = characters.find((character) => character.id === activeCharacterId);
  const activeSheet = activeCharacter?.sheets.find((sheet) => sheet.id === activeCharacter.activeSheetId);
  const returningCards = (activeSheet?.widgets ?? []).flatMap((candidate) => {
    if (candidate.type !== 'CARD_TABLE') return [];
    const activeCards = candidate.id === widget.id
      ? []
      : getCardTableCards(candidate.data).filter((card) => card.originWidgetId === widget.id);
    const ownedDiscardedCards = getCardTableDiscardedCards(candidate.data)
      .filter((card) => card.originWidgetId === widget.id);
    return [...activeCards, ...ownedDiscardedCards]
      .map((card) => ({ card, sourceWidgetId: candidate.id }));
  });
  const discardedOwnedCount = (activeSheet?.widgets ?? []).reduce((count, candidate) => (
    candidate.type === 'CARD_TABLE'
      ? count + getCardTableDiscardedCards(candidate.data).filter((card) => card.originWidgetId === widget.id).length
      : count
  ), 0);
  const awaySourceDeckCount = new Set(returningCards.filter((entry) => entry.sourceWidgetId !== widget.id).map((entry) => entry.sourceWidgetId)).size;

  const updateCards = (nextCards: typeof cards) => {
    updateWidgetData(widget.id, { cardTableCards: nextCards });
  };

  const flipInspectedCard = (cardId: string) => {
    const card = cards.find((entry) => entry.id === cardId);
    toggleCardTableCard(widget.id, cardId);
    if (card) addTimelineEvent(label || 'Card Deck', 'CARD_TABLE', `${card.faceUp ? 'Hid' : 'Revealed'} “${card.title || 'Untitled card'}”`, '🂠');
  };

  const setAllCardsFaceUp = (faceUp: boolean) => {
    if (!cards.some((card) => card.faceUp !== faceUp)) return;
    setCardTableCardsFaceUp(widget.id, faceUp);
    addTimelineEvent(label || 'Card Deck', 'CARD_TABLE', faceUp ? 'Revealed all cards' : 'Hid all cards', '🂠');
  };

  const shuffleCards = () => {
    if (cards.length < 2) return;
    startCardDeckShuffleAnimation(widget.id);
    const shuffled = cards.map((card) => ({ ...card }));
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    if (shuffled.every((card, index) => card.id === cards[index].id)) {
      shuffled.push(shuffled.shift()!);
    }
    updateCards(shuffled);
    addTimelineEvent(label || 'Card Deck', 'CARD_TABLE', `Shuffled ${cards.length} cards`, '🂠');
  };

  const gatherCards = (shuffle: boolean, setFaceDown: boolean) => {
    const animationEntries = returningCards.map(({ card, sourceWidgetId }) => ({
      card: { ...card } as CardTableCard,
      sourceWidgetId,
      backDesign,
    }));
    startCardDeckGatherAnimation(widget.id, animationEntries);
    if (shuffle) startCardDeckShuffleAnimation(widget.id);
    gatherCardTableCards(widget.id, shuffle, setFaceDown);
    setGatherOpen(false);
    addTimelineEvent(
      label || 'Card Deck',
      'CARD_TABLE',
      returningCards.length > 0
        ? `Gathered ${returningCards.length} card${returningCards.length === 1 ? '' : 's'}${shuffle ? ' and shuffled' : ' in original order'}${setFaceDown ? ' face down' : ''}`
        : `${shuffle ? 'Shuffled deck' : 'Restored original deck order'}${setFaceDown ? ' and set cards face down' : ''}`,
      '🂠',
    );
  };

  useLayoutEffect(() => {
    const element = surfaceRef.current;
    if (!element || !render3D || mode === 'print') return;
    return registerCardDeck({
      widgetId: widget.id,
      element,
      discardElement: showDiscardPile ? discardRef.current : null,
      label: label || 'Card Deck',
      cards,
      backDesign,
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
      onDiscard: (cardId, targetWidgetId) => {
        const card = cards.find((entry) => entry.id === cardId);
        const target = getCardDeckRegistrations().find((entry) => entry.widgetId === targetWidgetId);
        discardCardTableCard({ sourceWidgetId: widget.id, targetWidgetId, cardId });
        if (card) addTimelineEvent(label || 'Card Deck', 'CARD_TABLE', `Discarded “${card.title || 'Untitled card'}”${targetWidgetId === widget.id ? '' : ` into ${target?.label || 'another deck'}`}`, '🂠');
      },
      onMoveAll: (targetWidgetId) => {
        const target = getCardDeckRegistrations().find((entry) => entry.widgetId === targetWidgetId);
        moveAllCardTableCards({ sourceWidgetId: widget.id, targetWidgetId });
        addTimelineEvent(label || 'Card Deck', 'CARD_TABLE', `Moved all ${cards.length} cards to ${target?.label || 'another deck'}`, '🂠');
      },
      onDiscardAll: (targetWidgetId) => {
        const target = getCardDeckRegistrations().find((entry) => entry.widgetId === targetWidgetId);
        discardAllCardTableCards({ sourceWidgetId: widget.id, targetWidgetId });
        addTimelineEvent(label || 'Card Deck', 'CARD_TABLE', `Discarded all ${cards.length} cards${targetWidgetId === widget.id ? '' : ` into ${target?.label || 'another deck'}`}`, '🂠');
      },
    });
  }, [backDesign, canInteract, cards, discardAllCardTableCards, discardCardTableCard, label, mode, moveAllCardTableCards, moveCardTableCard, render3D, showDiscardPile, toggleCardTableCard, widget.id]);

  return (
    <div className="card-table-widget flex h-full w-full flex-col gap-1.5">
      {label && (
        <div className="widget-header flex-shrink-0">
          <div className="widget-header-title min-w-0 flex-1 truncate">{label}</div>
          <span className="card-deck-count">{cards.length}</span>
        </div>
      )}
      <div className={`card-deck-play-area${controlsVisible && showDiscardPile ? '' : ' card-deck-play-area--single'}`}>
        <div
          ref={surfaceRef}
          className={`card-deck-surface${topCard ? '' : ' card-deck-surface--empty'}${render3D ? '' : ' card-deck-surface--fallback-only'}`}
          data-card-deck-widget-id={widget.id}
        >
          <div
            className={`card-deck-fallback${topCard?.faceUp ? ` card-deck-fallback--face-up card-deck-fallback--${topCardContentLayout}` : ` card-deck-back--${topCardBackDesign.pattern}`}`}
            style={!topCard?.faceUp && topCardBackDesign.color ? { backgroundColor: topCardBackDesign.color } : undefined}
            aria-hidden="true"
          >
            {topCard?.faceUp ? (
              <>
                {topCard.title.trim() && <span className="card-deck-fallback__title">{topCard.title}</span>}
                {topCard.symbol.trim() && <span className="card-deck-fallback__symbol">{topCard.symbol}</span>}
                {topCard.body.trim() && <span className="card-deck-fallback__body">{topCard.body}</span>}
              </>
            ) : (
              <>
                {topCardBackDesign.text && <span className="card-deck-fallback__back-text">{topCardBackDesign.text}</span>}
                {topCardBackDesign.symbol ? <span className="card-deck-fallback__back-symbol">{topCardBackDesign.symbol}</span> : <LayersIcon className="h-7 w-7" />}
              </>
            )}
          </div>
          {topCard && canInteract && render3D && (
            <button
              type="button"
              className="card-deck-hit-target"
              aria-label={topCard.faceUp ? `Top card: ${topCard.title || 'Untitled card'}` : 'Top card, face down'}
              onPointerDown={(event) => startCardDeckDrag(widget.id, event.nativeEvent, event.currentTarget)}
            />
          )}
          {controlsVisible && showGrabAll && (
            <Tooltip content={canInteract ? `Drag all ${cards.length} cards` : 'Switch to Play to move the whole deck'}>
              <button
                type="button"
                disabled={!canInteract || cards.length === 0}
                className="card-deck-grab-all widget-control"
                aria-label={`Grab all ${cards.length} cards from ${label || 'Card Deck'}`}
                onPointerDown={(event) => startCardDeckDrag(widget.id, event.nativeEvent, event.currentTarget, true)}
              >
                <HandIcon className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
        </div>
        {controlsVisible && showDiscardPile && (
          <button
            ref={discardRef}
            type="button"
            disabled={previewOnly}
            onClick={() => setDiscardOpen(true)}
            className="card-deck-discard"
            aria-label={`Consult discard pile, ${discardedCards.length} card${discardedCards.length === 1 ? '' : 's'}`}
          >
            <LayersIcon className="h-4 w-4" />
            <span className="card-deck-discard__count">{discardedCards.length}</span>
            <span className="card-deck-discard__label">Discard</span>
          </button>
        )}
      </div>
      {controlsVisible && (
        <div className="card-deck-actions">
          <Tooltip content={cards.length < 2 ? 'Add at least two cards to shuffle' : 'Shuffle deck'}>
            <button type="button" onClick={shuffleCards} disabled={previewOnly || cards.length < 2} aria-label="Shuffle deck" className="widget-control card-deck-action">
              <ShuffleIcon className="h-3.5 w-3.5" />
              <span>Shuffle</span>
            </button>
          </Tooltip>
          <Tooltip content="Inspect and reorder cards">
            <button type="button" disabled={previewOnly} onClick={() => setInspectOpen(true)} aria-label="Inspect and reorder cards" className="widget-control card-deck-action">
              <EyeIcon className="h-3.5 w-3.5" />
              <span>Inspect</span>
            </button>
          </Tooltip>
          <Tooltip content={returningCards.length === 0 ? 'Reset deck order or shuffle cards' : `Gather ${returningCards.length} card${returningCards.length === 1 ? '' : 's'}, including discards`}>
            <button
              type="button"
              disabled={previewOnly}
              onClick={() => setGatherOpen(true)}
              aria-label="Gather cards"
              className="widget-control card-deck-action"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              <span>Gather</span>
            </button>
          </Tooltip>
        </div>
      )}
      {inspectOpen && (
        <CardDeckInspectDialog
          deckName={label || 'Card Deck'}
          cards={cards}
          onFlipCard={flipInspectedCard}
          onSetAllFaceUp={() => setAllCardsFaceUp(true)}
          onSetAllFaceDown={() => setAllCardsFaceUp(false)}
          onReorder={(nextCards) => {
            updateCards(nextCards);
            addTimelineEvent(label || 'Card Deck', 'CARD_TABLE', 'Reordered deck', '🂠');
          }}
          onClose={closeInspector}
        />
      )}
      {gatherOpen && (
        <CardDeckGatherDialog
          deckName={label || 'Card Deck'}
          cardCount={returningCards.length}
          discardedCount={discardedOwnedCount}
          sourceDeckCount={awaySourceDeckCount}
          onGather={gatherCards}
          onClose={closeGather}
        />
      )}
      {discardOpen && (
        <CardDeckDiscardDialog
          deckName={label || 'Card Deck'}
          cards={discardedCards}
          onRestore={(cardIds, position: CardTableRestorePosition) => {
            restoreCardTableCards(widget.id, cardIds, position);
            const destination = position === 'random' ? 'randomly in the deck' : `to the ${position}`;
            addTimelineEvent(label || 'Card Deck', 'CARD_TABLE', `Returned ${cardIds.length} discarded card${cardIds.length === 1 ? '' : 's'} ${destination}`, '🂠');
          }}
          onClose={closeDiscard}
        />
      )}
    </div>
  );
}