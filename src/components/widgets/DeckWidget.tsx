import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
}

interface PileModalProps {
  title: string;
  cards: string[];
  onClose: () => void;
  showCounts?: boolean;
  onReturnCard?: (index: number) => void;
}

function PileModal({ title, cards, onClose, showCounts = false, onReturnCard }: PileModalProps) {
  // Count occurrences of each card
  const cardCounts: Record<string, number> = {};
  cards.forEach(card => {
    cardCounts[card] = (cardCounts[card] || 0) + 1;
  });

  const uniqueCards = Object.entries(cardCounts).sort((a, b) => a[0].localeCompare(b[0]));

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div 
        className="bg-theme-paper border-2 border-theme-border rounded-button p-4 max-w-sm w-full max-h-[60vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-theme-ink font-heading">{title}</h3>
          <button
            onClick={onClose}
            className="text-theme-muted hover:text-theme-ink transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>
        
        {cards.length === 0 ? (
          <p className="text-theme-muted text-sm italic">No cards</p>
        ) : (
          <div className="overflow-y-auto flex-1 space-y-1">
            {showCounts ? (
              // Show unique cards with counts (for draw pile)
              uniqueCards.map(([card, count], idx) => (
                <div key={idx} className="flex justify-between items-center text-sm text-theme-ink py-0.5 border-b border-theme-border/30">
                  <span>{card}</span>
                  <span className="text-theme-muted">×{count}</span>
                </div>
              ))
            ) : (
              // Show all cards in order (for discard pile) with return button
              cards.map((card, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm text-theme-ink py-0.5 border-b border-theme-border/30">
                  <span>{idx + 1}. {card}</span>
                  {onReturnCard && (
                    <button
                      onClick={() => onReturnCard(idx)}
                      className="text-xs px-1.5 py-0.5 text-theme-muted hover:text-theme-ink hover:bg-theme-accent/20 rounded transition-colors"
                      title="Return to draw pile"
                    >
                      ↩
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
        
        <div className="mt-3 text-xs text-theme-muted text-center">
          Total: {cards.length} card{cards.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function DeckWidget({ widget, mode }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { 
    label, 
    deckCards = [{ name: '', amount: 1 }], 
    deckState = null, // Runtime state: { remaining: [...], discarded: [...] }
  } = widget.data;
  
  const [drawnCard, setDrawnCard] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showDrawPile, setShowDrawPile] = useState(false);
  const [showDiscardPile, setShowDiscardPile] = useState(false);

  // Fixed small sizing
  const labelClass = 'text-xs';
  const buttonClass = 'py-1 px-2 text-xs';
  const gapClass = 'gap-1';

  // Ensure cards array has at least one item
  const normalizedCards = deckCards.length > 0 
    ? deckCards 
    : [{ name: '', amount: 1 }];

  // Initialize or get current deck state
  const initializeDeckState = () => {
    const remaining: string[] = [];
    normalizedCards.forEach(card => {
      if (card.name.trim() && card.amount > 0) {
        for (let i = 0; i < card.amount; i++) {
          remaining.push(card.name);
        }
      }
    });
    return { remaining, discarded: [] as string[] };
  };

  const getCurrentState = () => {
    if (!deckState) {
      return initializeDeckState();
    }
    return deckState;
  };

  const drawCard = () => {
    const state = getCurrentState();
    
    if (state.remaining.length === 0) {
      setDrawnCard('Deck is empty!');
      return;
    }

    setIsDrawing(true);
    
    setTimeout(() => {
      // Pick a random card from remaining
      const randomIndex = Math.floor(Math.random() * state.remaining.length);
      const card = state.remaining[randomIndex];
      
      // Remove from remaining, add to discarded
      const newRemaining = [...state.remaining];
      newRemaining.splice(randomIndex, 1);
      const newDiscarded = [...state.discarded, card];
      
      updateWidgetData(widget.id, { 
        deckState: { remaining: newRemaining, discarded: newDiscarded }
      });
      
      setDrawnCard(card);
      setIsDrawing(false);
    }, 300);
  };

  const resetDeck = () => {
    updateWidgetData(widget.id, { deckState: null });
    setDrawnCard(null);
  };

  const returnCardToDrawPile = (discardIndex: number) => {
    const state = getCurrentState();
    const card = state.discarded[discardIndex];
    
    // Remove from discarded, add back to remaining
    const newDiscarded = [...state.discarded];
    newDiscarded.splice(discardIndex, 1);
    const newRemaining = [...state.remaining, card];
    
    updateWidgetData(widget.id, { 
      deckState: { remaining: newRemaining, discarded: newDiscarded }
    });
  };

  const getTotalRemaining = () => {
    return getCurrentState().remaining.length;
  };

  const getTotalCards = () => {
    return normalizedCards.reduce((sum, card) => sum + (card.name.trim() ? card.amount : 0), 0);
  };

  const currentState = getCurrentState();

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {label && (
        <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {label}
        </div>
      )}
      
      {/* Draw Button and Reset */}
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={drawCard}
          onMouseDown={(e) => e.stopPropagation()}
          className={`flex-1 ${buttonClass} border-[length:var(--border-width)] border-theme-border font-bold transition-all rounded-button font-body ${
            isDrawing 
              ? 'bg-theme-muted animate-pulse text-theme-paper' 
              : getTotalRemaining() === 0
                ? 'bg-theme-muted/50 text-theme-muted cursor-not-allowed'
                : 'bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
          }`}
          disabled={isDrawing || getTotalRemaining() === 0}
        >
          Draw ({getTotalRemaining()}/{getTotalCards()})
        </button>
        {mode === 'play' && currentState.discarded.length > 0 && (
          <button
            onClick={resetDeck}
            onMouseDown={(e) => e.stopPropagation()}
            className={`${buttonClass} border-[length:var(--border-width)] border-theme-border font-bold transition-all rounded-button bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper font-body`}
            title="Reset deck"
          >
            ↺
          </button>
        )}
      </div>

      {/* Result Display */}
      {drawnCard && (
        <div className="text-center bg-theme-accent/10 border border-theme-accent/30 rounded-button py-1 px-2 flex-shrink-0">
          <span className="font-bold text-sm text-theme-ink font-heading">{drawnCard}</span>
        </div>
      )}

      {/* Draw Pile and Discard Pile Buttons */}
      <div className="flex gap-1 flex-shrink-0 mt-auto">
        <button
          onClick={() => setShowDrawPile(true)}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex-1 py-0.5 px-1 text-[10px] border border-theme-border/50 rounded-button text-theme-muted hover:text-theme-ink hover:border-theme-border transition-colors bg-theme-paper/50 font-body"
        >
          Draw Pile ({getTotalRemaining()})
        </button>
        <button
          onClick={() => setShowDiscardPile(true)}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex-1 py-0.5 px-1 text-[10px] border border-theme-border/50 rounded-button text-theme-muted hover:text-theme-ink hover:border-theme-border transition-colors bg-theme-paper/50 font-body"
        >
          Discard ({currentState.discarded.length})
        </button>
      </div>

      {/* Draw Pile Modal */}
      {showDrawPile && (
        <PileModal
          title="Draw Pile"
          cards={currentState.remaining}
          onClose={() => setShowDrawPile(false)}
          showCounts={true}
        />
      )}

      {/* Discard Pile Modal */}
      {showDiscardPile && (
        <PileModal
          title="Discard Pile"
          cards={currentState.discarded}
          onClose={() => setShowDiscardPile(false)}
          showCounts={false}
          onReturnCard={returnCardToDrawPile}
        />
      )}
    </div>
  );
}
