import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { CardTableBackDesign, CardTableBackPattern, CardTableCard } from '../../types';
import { getCardTableBackDesign, getCardTableCards, getCardTableDiscardedCards, normalizeCardTableOrigins } from '../../utils/cardTable';
import { limitCardSymbols, MAX_CARD_SYMBOLS, splitCardSymbols } from '../../utils/cardSymbols';
import { useStore } from '../../store/useStore';
import { ChevronDownIcon, ChevronUpIcon, LayoutGridIcon, PlusIcon, TrashIcon } from '../icons';
import { Tooltip } from '../Tooltip';
import CardDeckBulkAddDialog, { type BulkCardDraft } from './CardDeckBulkAddDialog';
import CardDeckBulkDeleteDialog from './CardDeckBulkDeleteDialog';
import type { EditorProps } from './types';

const inputClass = 'w-full rounded-button border border-theme-border bg-theme-paper px-2 py-1.5 text-sm text-theme-ink focus:border-theme-accent focus:outline-none';

const CARD_SYMBOLS = [
  '✦', '✧', '✶', '☀', '☾', '☽', '☄', '⟡',
  '✥', '✤', '☯', '☸', '♆', '⚚', '⚕', '⚜',
  '♠', '♥', '♦', '♣', '●', '▲', '■', '◆',
  '⚔', '🛡', '🏹', '🗝', '👁', '⚓', '☠', '🐉',
  '♜', '♞', '♛', '🌿', '🌙', '🔥', '💧', '🌍',
] as const;

interface SymbolInputProps {
  value: string;
  onChange: (value: string) => void;
  pickerOpen: boolean;
  onTogglePicker: () => void;
  onClosePicker: () => void;
  inputLabel: string;
  pickerLabel: string;
}

function SymbolInput({
  value,
  onChange,
  pickerOpen,
  onTogglePicker,
  onClosePicker,
  inputLabel,
  pickerLabel,
}: SymbolInputProps) {
  return (
    <div className="relative mt-1 flex h-9 gap-1">
      <input
        value={value}
        onChange={(event) => onChange(limitCardSymbols(event.target.value))}
        placeholder="✦"
        aria-label={inputLabel}
        title={`${splitCardSymbols(value).length}/${MAX_CARD_SYMBOLS} symbols`}
        className={`${inputClass} h-9 min-w-0 flex-1 text-center text-lg`}
      />
      <Tooltip content="Choose a symbol">
        <button
          type="button"
          onClick={onTogglePicker}
          aria-expanded={pickerOpen}
          aria-label={pickerLabel}
          className="widget-control h-9 w-9 flex-none p-0"
        >
          <LayoutGridIcon className="h-4 w-4" />
        </button>
      </Tooltip>
      {pickerOpen && (
        <div className="absolute right-0 top-full z-30 mt-1 grid w-48 grid-cols-6 gap-1 rounded-button border border-theme-border bg-theme-paper p-1 shadow-theme" role="menu" aria-label="Symbol picker">
          {CARD_SYMBOLS.map((symbol) => (
            <button
              key={symbol}
              type="button"
              role="menuitem"
              onClick={() => {
                onChange(symbol);
                onClosePicker();
              }}
              aria-label={`Use ${symbol}`}
              className="widget-control flex aspect-square items-center justify-center p-0 text-base"
            >
              {symbol}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CardTableEditor({ widget, updateData }: EditorProps) {
  const { label } = widget.data;
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const activeSheetWidgets = useStore((state) => {
    const character = state.characters.find((entry) => entry.id === state.activeCharacterId);
    return character?.sheets.find((sheet) => sheet.id === character.activeSheetId)?.widgets ?? [];
  });
  const localCards = getCardTableCards(widget.data);
  const discardedCards = getCardTableDiscardedCards(widget.data);
  const backDesign = getCardTableBackDesign(widget.data);
  const ownedCardEntries = activeSheetWidgets
    .filter((candidate) => candidate.type === 'DECK_OF_CARDS')
    .flatMap((candidate) => getCardTableCards(candidate.data).map((card) => ({ card, hostWidgetId: candidate.id })))
    .filter(({ card, hostWidgetId }) => card.originWidgetId === widget.id || (!card.originWidgetId && hostWidgetId === widget.id));
  const cards = [...ownedCardEntries]
    .sort((left, right) => (left.card.originOrder ?? Number.MAX_SAFE_INTEGER) - (right.card.originOrder ?? Number.MAX_SAFE_INTEGER))
    .map((entry) => entry.card);
  const [symbolPickerCardId, setSymbolPickerCardId] = useState<string | null>(null);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const setLocalCards = (nextCards: CardTableCard[]) => updateData({
    cardTableCards: normalizeCardTableOrigins(nextCards, widget.id, backDesign),
  });

  const updateBackDesign = (update: Partial<CardTableBackDesign>) => {
    const nextDesign = { ...backDesign, ...update };
    const updateOwnedCardBack = (card: CardTableCard, index: number) => {
      const isLocallyOwned = !card.originWidgetId || card.originWidgetId === widget.id;
      return isLocallyOwned
        ? {
            ...card,
            originWidgetId: card.originWidgetId ?? widget.id,
            originOrder: card.originOrder ?? index,
            originBackColor: nextDesign.color,
            originBackTextColor: nextDesign.textColor,
            originBackSymbol: nextDesign.symbol,
            originBackText: nextDesign.text,
            originBackPattern: nextDesign.pattern,
          }
        : card;
    };
    updateData({
      cardTableBackColor: nextDesign.color,
      cardTableBackTextColor: nextDesign.textColor,
      cardTableBackSymbol: nextDesign.symbol,
      cardTableBackText: nextDesign.text,
      cardTableBackPattern: nextDesign.pattern,
      cardTableCards: localCards.map(updateOwnedCardBack),
      cardTableDiscardedCards: discardedCards.map(updateOwnedCardBack),
    });
  };

  const updateCard = (cardId: string, update: Partial<CardTableCard>) => {
    const entry = ownedCardEntries.find((candidate) => candidate.card.id === cardId);
    const hostWidget = activeSheetWidgets.find((candidate) => candidate.id === entry?.hostWidgetId);
    if (!entry || !hostWidget || hostWidget.type !== 'DECK_OF_CARDS') return;
    const nextCards = getCardTableCards(hostWidget.data).map((card) => (
      card.id === cardId ? { ...card, ...update } : card
    ));
    if (hostWidget.id === widget.id) setLocalCards(nextCards);
    else updateWidgetData(hostWidget.id, { cardTableCards: nextCards });
  };

  const appendCards = (drafts: BulkCardDraft[]) => {
    const originOrderStart = Date.now();
    setLocalCards([
      ...localCards,
      ...drafts.map((draft, index) => ({
        id: uuidv4(),
        ...draft,
        faceUp: false,
        originWidgetId: widget.id,
        originOrder: originOrderStart + index,
        originBackColor: backDesign.color,
        originBackTextColor: backDesign.textColor,
        originBackSymbol: backDesign.symbol,
        originBackText: backDesign.text,
        originBackPattern: backDesign.pattern,
      })),
    ]);
  };

  const moveCard = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    const entry = ownedCardEntries.find((candidate) => candidate.card.id === cards[index]?.id);
    const target = ownedCardEntries.find((candidate) => candidate.card.id === cards[targetIndex]?.id);
    if (targetIndex < 0 || targetIndex >= cards.length || entry?.hostWidgetId !== widget.id || target?.hostWidgetId !== widget.id) return;
    const localIndex = localCards.findIndex((card) => card.id === entry.card.id);
    const localTargetIndex = localCards.findIndex((card) => card.id === target.card.id);
    if (localIndex < 0 || localTargetIndex < 0) return;
    const nextCards = [...localCards];
    const [card] = nextCards.splice(localIndex, 1);
    nextCards.splice(localTargetIndex, 0, card);
    setLocalCards(nextCards);
  };

  const removeCards = (cardIds: Set<string>) => {
    const hostWidgetIds = new Set(
      ownedCardEntries.filter((entry) => cardIds.has(entry.card.id)).map((entry) => entry.hostWidgetId),
    );
    hostWidgetIds.forEach((hostWidgetId) => {
      const hostWidget = activeSheetWidgets.find((candidate) => candidate.id === hostWidgetId);
      if (!hostWidget || hostWidget.type !== 'DECK_OF_CARDS') return;
      const nextCards = getCardTableCards(hostWidget.data).filter((card) => !cardIds.has(card.id));
      if (nextCards.length === getCardTableCards(hostWidget.data).length) return;
      if (hostWidget.id === widget.id) setLocalCards(nextCards);
      else updateWidgetData(hostWidget.id, { cardTableCards: nextCards });
    });
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

      <section aria-labelledby="card-deck-display-heading">
        <h4 id="card-deck-display-heading" className="text-xs font-semibold text-theme-ink">Deck controls</h4>
        <div className="mt-2 space-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-theme-ink">
            <input
              type="checkbox"
              checked={widget.data.cardTableShowDiscard ?? true}
              onChange={(event) => updateData({ cardTableShowDiscard: event.target.checked })}
              className="h-4 w-4 flex-none accent-theme-accent"
            />
            Show discard pile
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-theme-ink">
            <input
              type="checkbox"
              checked={widget.data.cardTableShowGrabAll ?? true}
              onChange={(event) => updateData({ cardTableShowGrabAll: event.target.checked })}
              className="h-4 w-4 flex-none accent-theme-accent"
            />
            Show grab-all button
          </label>
        </div>
      </section>

      <section className="rounded-button border border-theme-border bg-theme-accent/5 p-3" aria-labelledby="card-deck-back-heading">
        <div>
          <h4 id="card-deck-back-heading" className="text-sm font-semibold text-theme-ink">Card back</h4>
          <p className="mt-0.5 text-[11px] font-normal leading-4 text-theme-muted">
            Cards created here keep this deck identity when moved.
          </p>
        </div>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
            <label className="block text-xs font-medium text-theme-ink">
              Color
              <div className="mt-1 flex h-9 items-center gap-2 rounded-button border border-theme-border bg-theme-paper px-2">
                <input
                  type="color"
                  value={backDesign.color || '#374151'}
                  onChange={(event) => updateBackDesign({ color: event.target.value })}
                  aria-label="Card back color"
                  className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
                />
                <span className="text-xs text-theme-muted">{backDesign.color || 'Theme color'}</span>
              </div>
            </label>
            <button
              type="button"
              disabled={!backDesign.color}
              onClick={() => updateBackDesign({ color: undefined })}
              className="widget-control h-9 px-2 text-xs disabled:opacity-40"
            >
              Use theme color
            </button>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
            <label className="block text-xs font-medium text-theme-ink">
              Text color
              <div className="mt-1 flex h-9 items-center gap-2 rounded-button border border-theme-border bg-theme-paper px-2">
                <input
                  type="color"
                  value={backDesign.textColor || '#f8f4e8'}
                  onChange={(event) => updateBackDesign({ textColor: event.target.value })}
                  aria-label="Card back text color"
                  className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
                />
                <span className="text-xs text-theme-muted">{backDesign.textColor || 'Theme color'}</span>
              </div>
            </label>
            <button
              type="button"
              disabled={!backDesign.textColor}
              onClick={() => updateBackDesign({ textColor: undefined })}
              className="widget-control h-9 px-2 text-xs disabled:opacity-40"
            >
              Use theme color
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-theme-ink">
              Pattern
              <select
                value={backDesign.pattern}
                onChange={(event) => updateBackDesign({ pattern: event.target.value as CardTableBackPattern })}
                className={`${inputClass} mt-1 h-9`}
              >
                <option value="none">None</option>
                <option value="crosshatch">Crosshatch</option>
                <option value="diamonds">Diamonds</option>
                <option value="stripes">Stripes</option>
                <option value="dots">Dots</option>
              </select>
            </label>
            <label className="text-xs font-medium text-theme-ink">
              Symbol(s) <span className="font-normal text-theme-muted">Optional</span>
              <SymbolInput
                value={backDesign.symbol || ''}
                onChange={(symbol) => updateBackDesign({ symbol: symbol || undefined })}
                pickerOpen={symbolPickerCardId === 'back'}
                onTogglePicker={() => setSymbolPickerCardId((openCardId) => openCardId === 'back' ? null : 'back')}
                onClosePicker={() => setSymbolPickerCardId(null)}
                inputLabel={`Back symbols, maximum ${MAX_CARD_SYMBOLS} symbols`}
                pickerLabel="Choose a symbol for the card back"
              />
            </label>
          </div>
          <label className="block text-xs font-medium text-theme-ink">
            Text <span className="font-normal text-theme-muted">Optional</span>
            <input
              value={backDesign.text || ''}
              onChange={(event) => updateBackDesign({ text: event.target.value.slice(0, 80) || undefined })}
              placeholder="The Night Deck"
              maxLength={80}
              className={`${inputClass} mt-1`}
            />
          </label>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-semibold text-theme-ink">Cards</h4>
          </div>
          <div className="flex flex-nowrap justify-end gap-1.5">
            <button
              type="button"
              onClick={() => appendCards([{ title: '', symbol: '✦', body: '' }])}
              className="widget-control flex items-center gap-1 px-2 py-1 text-[11px]"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Add card
            </button>
            <button
              type="button"
              onClick={() => setBulkAddOpen(true)}
              className="widget-control flex items-center gap-1 px-2 py-1 text-[11px]"
            >
              <LayoutGridIcon className="h-3.5 w-3.5" />
              Add in bulk
            </button>
            <button
              type="button"
              disabled={cards.length === 0}
              onClick={() => setBulkDeleteOpen(true)}
              className="widget-control flex items-center gap-1 px-2 py-1 text-[11px] text-red-500 disabled:opacity-40"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Delete in bulk
            </button>
          </div>
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
                  {index === 0 && ownedCardEntries.find((entry) => entry.card.id === card.id)?.hostWidgetId === widget.id ? 'Top card' : `Card ${index + 1}`}
                </span>
                <Tooltip content="Move toward top">
                  <button
                    type="button"
                    disabled={index === 0 || ownedCardEntries.find((entry) => entry.card.id === card.id)?.hostWidgetId !== widget.id || ownedCardEntries.find((entry) => entry.card.id === cards[index - 1]?.id)?.hostWidgetId !== widget.id}
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
                    disabled={index === cards.length - 1 || ownedCardEntries.find((entry) => entry.card.id === card.id)?.hostWidgetId !== widget.id || ownedCardEntries.find((entry) => entry.card.id === cards[index + 1]?.id)?.hostWidgetId !== widget.id}
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
                    onClick={() => removeCards(new Set([card.id]))}
                    className="widget-control h-7 w-7 text-red-500"
                    aria-label={`Remove ${card.title || 'card'}`}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_128px] gap-2">
                <label className="text-[11px] font-medium text-theme-muted">
                  <input
                    value={card.title}
                    onChange={(event) => updateCard(card.id, { title: event.target.value })}
                    placeholder="Enter the name of the card"
                    aria-label={`Title for ${card.title || 'card'}`}
                    className={`${inputClass} mt-1 h-9`}
                  />
                </label>
                <label className="text-[11px] font-medium text-theme-muted">
                  <SymbolInput
                    value={card.symbol}
                    onChange={(symbol) => updateCard(card.id, { symbol })}
                    pickerOpen={symbolPickerCardId === card.id}
                    onTogglePicker={() => setSymbolPickerCardId((openCardId) => openCardId === card.id ? null : card.id)}
                    onClosePicker={() => setSymbolPickerCardId(null)}
                    inputLabel={`Symbol for ${card.title || 'card'}, maximum ${MAX_CARD_SYMBOLS} symbols`}
                    pickerLabel={`Choose a symbol for ${card.title || 'card'}`}
                  />
                </label>
              </div>
              <label className="mt-2 block text-[11px] font-medium text-theme-muted">
                <textarea
                  value={card.body}
                  onChange={(event) => updateCard(card.id, { body: event.target.value })}
                  placeholder="Multiline rules or story text"
                  aria-label={`Card text for ${card.title || 'card'}`}
                  rows={2}
                  className={`${inputClass} mt-0.5 resize-y`}
                />
              </label>
            </div>
          ))}
        </div>
      </section>

      {bulkAddOpen && (
        <CardDeckBulkAddDialog
          onClose={() => setBulkAddOpen(false)}
          onAdd={(drafts) => {
            appendCards(drafts);
            setBulkAddOpen(false);
          }}
        />
      )}

      {bulkDeleteOpen && (
        <CardDeckBulkDeleteDialog
          cards={cards}
          onClose={() => setBulkDeleteOpen(false)}
          onDelete={(cardIds) => {
            removeCards(cardIds);
            setBulkDeleteOpen(false);
          }}
        />
      )}
    </div>
  );
}