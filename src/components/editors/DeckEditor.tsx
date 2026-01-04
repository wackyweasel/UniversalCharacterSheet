import { EditorProps } from './types';

interface DeckCard {
  name: string;
  amount: number;
}

export function DeckEditor({ widget, updateData }: EditorProps) {
  const { label, deckCards = [{ name: '', amount: 1 }] } = widget.data;

  const updateCard = (index: number, field: 'name' | 'amount', value: string | number) => {
    const newCards = [...deckCards];
    if (field === 'name') {
      newCards[index] = { ...newCards[index], name: value as string };
    } else {
      const numValue = Math.max(0, Number(value) || 0);
      newCards[index] = { ...newCards[index], amount: numValue };
    }
    updateData({ deckCards: newCards, deckState: null }); // Reset state when cards change
  };

  const addCard = () => {
    const newCards = [...deckCards, { name: '', amount: 1 }];
    updateData({ deckCards: newCards, deckState: null });
  };

  const removeCard = (index: number) => {
    if (deckCards.length <= 1) return;
    const newCards = deckCards.filter((_: DeckCard, i: number) => i !== index);
    updateData({ deckCards: newCards, deckState: null });
  };

  const getTotalCards = () => {
    return deckCards.reduce((sum: number, card: DeckCard) => sum + (card.name.trim() ? card.amount : 0), 0);
  };

  const getPercentage = (amount: number, name: string) => {
    if (!name.trim()) return 0;
    const total = getTotalCards();
    if (total === 0) return 0;
    return Math.round((amount / total) * 100);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <div className="relative">
          <input
            className="w-full px-3 py-2 pr-8 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            value={label || ''}
            onChange={(e) => updateData({ label: e.target.value })}
            placeholder="Deck Name"
          />
          {label && (
            <button
              type="button"
              onClick={() => updateData({ label: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-ink transition-colors"
              title="Clear label"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Deck Cards</label>
        <p className="text-xs text-theme-muted mb-2">
          Add cards with amounts. When you draw, a card is removed from the deck and added to the discard pile.
        </p>
        
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {deckCards.map((card: DeckCard, idx: number) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-theme-background rounded-button">
              <span className="text-xs text-theme-muted w-6">{idx + 1}.</span>
              <input
                className="flex-1 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm focus:outline-none focus:border-theme-accent"
                value={card.name}
                onChange={(e) => updateCard(idx, 'name', e.target.value)}
                placeholder="Card name..."
              />
              <div className="flex items-center gap-1">
                <label className="text-xs text-theme-muted">×</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="w-16 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm text-center focus:outline-none focus:border-theme-accent"
                  value={card.amount}
                  onChange={(e) => updateCard(idx, 'amount', e.target.value)}
                />
              </div>
              <span className="text-xs text-theme-muted w-10 text-right">
                {getPercentage(card.amount, card.name)}%
              </span>
              <button
                onClick={() => removeCard(idx)}
                disabled={deckCards.length <= 1}
                className="text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed px-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addCard}
          className="mt-2 w-full px-3 py-2 text-sm border border-dashed border-theme-border rounded-button text-theme-muted hover:text-theme-ink hover:border-theme-accent transition-colors"
        >
          + Add Card
        </button>
      </div>

      {getTotalCards() > 0 && (
        <div className="text-xs text-theme-ink bg-theme-accent/10 p-2 rounded-button">
          <strong>Total cards in deck:</strong> {getTotalCards()}
        </div>
      )}
    </div>
  );
}
