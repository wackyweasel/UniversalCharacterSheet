import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { limitCardSymbols, MAX_CARD_SYMBOLS } from '../../utils/cardSymbols';
import { LayoutGridIcon, PlusIcon, XIcon } from '../icons';

export interface BulkCardDraft {
  title: string;
  symbol: string;
  body: string;
}

interface Props {
  onAdd: (cards: BulkCardDraft[]) => void;
  onClose: () => void;
}

type GeneratorMode = 'sequence' | 'playing' | 'tarot' | 'list';

const MAX_BULK_CARDS = 200;
const inputClass = 'w-full rounded-button border border-theme-border bg-theme-paper px-2 py-1.5 text-sm text-theme-ink focus:border-theme-accent focus:outline-none';
const choiceClass = 'rounded-button border border-theme-border px-2 py-2 text-left text-xs transition-colors';
const COMMON_SYMBOLS = ['✦', '●', '▲', '■', '◆', '♠', '♥', '♦', '♣', '⚔'] as const;

const PLAYING_SUITS = [
  { id: 'spades', name: 'Spades', symbol: '♠' },
  { id: 'hearts', name: 'Hearts', symbol: '♥' },
  { id: 'diamonds', name: 'Diamonds', symbol: '♦' },
  { id: 'clubs', name: 'Clubs', symbol: '♣' },
] as const;

const PLAYING_RANKS = [
  { short: 'A', name: 'Ace' },
  ...Array.from({ length: 9 }, (_, index) => ({ short: String(index + 2), name: String(index + 2) })),
  { short: 'J', name: 'Jack' },
  { short: 'Q', name: 'Queen' },
  { short: 'K', name: 'King' },
];

const MAJOR_ARCANA = [
  ['0', 'The Fool'], ['I', 'The Magician'], ['II', 'The High Priestess'], ['III', 'The Empress'],
  ['IV', 'The Emperor'], ['V', 'The Hierophant'], ['VI', 'The Lovers'], ['VII', 'The Chariot'],
  ['VIII', 'Strength'], ['IX', 'The Hermit'], ['X', 'Wheel of Fortune'], ['XI', 'Justice'],
  ['XII', 'The Hanged Man'], ['XIII', 'Death'], ['XIV', 'Temperance'], ['XV', 'The Devil'],
  ['XVI', 'The Tower'], ['XVII', 'The Star'], ['XVIII', 'The Moon'], ['XIX', 'The Sun'],
  ['XX', 'Judgement'], ['XXI', 'The World'],
] as const;

const TAROT_SUITS = [
  { name: 'Wands', symbol: '♣' },
  { name: 'Cups', symbol: '♥' },
  { name: 'Swords', symbol: '⚔' },
  { name: 'Pentacles', symbol: '✦' },
] as const;

const TAROT_RANKS = ['Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Page', 'Knight', 'Queen', 'King'] as const;

function appendSymbol(title: string, symbol: string, includeSymbol: boolean) {
  return includeSymbol && symbol ? `${title} ${symbol}` : title;
}

function parseInteger(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatSequenceNumber(value: number, padding: number) {
  const absolute = Math.abs(value).toString().padStart(padding, '0');
  return value < 0 ? `-${absolute}` : absolute;
}

export default function CardDeckBulkAddDialog({ onAdd, onClose }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<GeneratorMode>('sequence');

  const [sequenceStart, setSequenceStart] = useState('1');
  const [sequenceEnd, setSequenceEnd] = useState('10');
  const [sequencePrefix, setSequencePrefix] = useState('');
  const [sequenceSuffix, setSequenceSuffix] = useState('');
  const [sequencePadding, setSequencePadding] = useState(0);
  const [sequenceSymbol, setSequenceSymbol] = useState('✦');
  const [repeatSequenceSymbol, setRepeatSequenceSymbol] = useState(false);
  const [includeSequenceSymbol, setIncludeSequenceSymbol] = useState(false);
  const [sequenceBody, setSequenceBody] = useState('');

  const [selectedSuits, setSelectedSuits] = useState(() => new Set(PLAYING_SUITS.map((suit) => suit.id)));
  const [playingTitleStyle, setPlayingTitleStyle] = useState<'long' | 'compact'>('long');
  const [includePlayingSymbol, setIncludePlayingSymbol] = useState(false);
  const [jokerCount, setJokerCount] = useState(0);

  const [tarotScope, setTarotScope] = useState<'major' | 'full'>('major');
  const [includeTarotNumber, setIncludeTarotNumber] = useState(true);
  const [includeTarotSymbol, setIncludeTarotSymbol] = useState(false);

  const [listText, setListText] = useState('');
  const [listSymbol, setListSymbol] = useState('✦');
  const [includeListSymbol, setIncludeListSymbol] = useState(false);

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

  const generateSequence = (): BulkCardDraft[] => {
    const start = parseInteger(sequenceStart, 1);
    const end = parseInteger(sequenceEnd, start);
    const direction = end >= start ? 1 : -1;
    const count = Math.min(Math.abs(end - start) + 1, MAX_BULK_CARDS);
    return Array.from({ length: count }, (_, index) => {
      const number = start + index * direction;
      const symbolCount = repeatSequenceSymbol ? Math.min(Math.abs(number), MAX_CARD_SYMBOLS) : 1;
      const symbol = limitCardSymbols(sequenceSymbol.repeat(symbolCount));
      const baseTitle = `${sequencePrefix}${formatSequenceNumber(number, sequencePadding)}${sequenceSuffix}`;
      return {
        title: appendSymbol(baseTitle, symbol, includeSequenceSymbol),
        symbol,
        body: sequenceBody,
      };
    });
  };

  const generatePlayingCards = (): BulkCardDraft[] => {
    const cards = PLAYING_SUITS
      .filter((suit) => selectedSuits.has(suit.id))
      .flatMap((suit) => PLAYING_RANKS.map((rank) => {
        const baseTitle = playingTitleStyle === 'long'
          ? `${rank.name} of ${suit.name}`
          : `${rank.short} ${suit.name}`;
        return {
          title: appendSymbol(baseTitle, suit.symbol, includePlayingSymbol),
          symbol: suit.symbol,
          body: '',
        };
      }));
    const jokers = Array.from({ length: jokerCount }, (_, index) => {
      const symbol = index % 2 === 0 ? '★' : '☆';
      return {
        title: appendSymbol(jokerCount === 1 ? 'Joker' : `Joker ${index + 1}`, symbol, includePlayingSymbol),
        symbol,
        body: '',
      };
    });
    return [...cards, ...jokers];
  };

  const generateTarotCards = (): BulkCardDraft[] => {
    const majorCards = MAJOR_ARCANA.map(([number, name]) => {
      const baseTitle = includeTarotNumber ? `${number} · ${name}` : name;
      return {
        title: appendSymbol(baseTitle, '✦', includeTarotSymbol),
        symbol: '✦',
        body: '',
      };
    });
    if (tarotScope === 'major') return majorCards;
    const minorCards = TAROT_SUITS.flatMap((suit) => TAROT_RANKS.map((rank) => ({
      title: appendSymbol(`${rank} of ${suit.name}`, suit.symbol, includeTarotSymbol),
      symbol: suit.symbol,
      body: '',
    })));
    return [...majorCards, ...minorCards];
  };

  const generateListCards = (): BulkCardDraft[] => listText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_BULK_CARDS)
    .map((line) => {
      const [rawTitle, rawSymbol, ...bodyParts] = line.split('|').map((part) => part.trim());
      const symbol = limitCardSymbols(rawSymbol || listSymbol);
      return {
        title: appendSymbol(rawTitle, symbol, includeListSymbol),
        symbol,
        body: bodyParts.join(' | '),
      };
    });

  const generatedCards = mode === 'sequence'
    ? generateSequence()
    : mode === 'playing'
      ? generatePlayingCards()
      : mode === 'tarot'
        ? generateTarotCards()
        : generateListCards();

  const modes: Array<{ id: GeneratorMode; label: string; description: string }> = [
    { id: 'sequence', label: 'Sequence', description: 'Numbers, prefixes, repeated symbols' },
    { id: 'playing', label: 'Playing cards', description: 'Ranks, suits, and jokers' },
    { id: 'tarot', label: 'Tarot', description: 'Major Arcana or all 78 cards' },
    { id: 'list', label: 'From a list', description: 'Paste custom names and details' },
  ];

  const renderSymbolField = (value: string, onChange: (value: string) => void, label: string) => (
    <div>
      <label className="block text-xs font-medium text-theme-ink">
        {label}
        <input
          value={value}
          onChange={(event) => onChange(limitCardSymbols(event.target.value))}
          aria-label={label}
          className={`${inputClass} mt-1 text-center text-lg`}
        />
      </label>
      <div className="mt-1 flex flex-wrap gap-1" aria-label="Common symbols">
        {COMMON_SYMBOLS.map((symbol) => (
          <button
            key={symbol}
            type="button"
            onClick={() => onChange(symbol)}
            aria-label={`Use ${symbol}`}
            className="widget-control h-7 w-7 p-0 text-sm"
          >
            {symbol}
          </button>
        ))}
      </div>
    </div>
  );

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
        aria-labelledby="bulk-card-dialog-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-theme border border-theme-border bg-theme-paper shadow-theme animate-modal-in"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-theme-border px-4 py-3">
          <div>
            <h2 id="bulk-card-dialog-title" className="font-heading text-lg font-bold text-theme-ink">Add cards in bulk</h2>
            <p className="mt-0.5 text-xs text-theme-muted">Choose a recipe, review the result, then add it to the bottom of this deck.</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close bulk card dialog" className="widget-control h-8 w-8 flex-none">
            <XIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Card generator">
            {modes.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={mode === option.id}
                onClick={() => setMode(option.id)}
                className={`${choiceClass} ${mode === option.id ? 'border-theme-accent bg-theme-accent text-theme-paper' : 'bg-theme-background text-theme-ink hover:border-theme-accent'}`}
              >
                <span className="block font-semibold">{option.label}</span>
                <span className={`mt-0.5 block text-[10px] leading-3.5 ${mode === option.id ? 'text-theme-paper/80' : 'text-theme-muted'}`}>{option.description}</span>
              </button>
            ))}
          </div>

          <section className="mt-4 rounded-button border border-theme-border bg-theme-background p-3" aria-label={`${modes.find((option) => option.id === mode)?.label} options`}>
            {mode === 'sequence' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <label className="text-xs font-medium text-theme-ink">
                    From
                    <input type="number" value={sequenceStart} onChange={(event) => setSequenceStart(event.target.value)} className={`${inputClass} mt-1`} />
                  </label>
                  <label className="text-xs font-medium text-theme-ink">
                    To
                    <input type="number" value={sequenceEnd} onChange={(event) => setSequenceEnd(event.target.value)} className={`${inputClass} mt-1`} />
                  </label>
                  <label className="text-xs font-medium text-theme-ink">
                    Before number
                    <input value={sequencePrefix} onChange={(event) => setSequencePrefix(event.target.value)} placeholder="A" className={`${inputClass} mt-1`} />
                  </label>
                  <label className="text-xs font-medium text-theme-ink">
                    After number
                    <input value={sequenceSuffix} onChange={(event) => setSequenceSuffix(event.target.value)} placeholder=" optional" className={`${inputClass} mt-1`} />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
                  <label className="text-xs font-medium text-theme-ink">
                    Number padding
                    <select value={sequencePadding} onChange={(event) => setSequencePadding(Number(event.target.value))} className={`${inputClass} mt-1`}>
                      <option value={0}>None (A1)</option>
                      <option value={2}>2 digits (A01)</option>
                      <option value={3}>3 digits (A001)</option>
                      <option value={4}>4 digits (A0001)</option>
                    </select>
                  </label>
                  {renderSymbolField(sequenceSymbol, setSequenceSymbol, 'Card symbol')}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-theme-ink">
                    <input type="checkbox" checked={repeatSequenceSymbol} onChange={(event) => setRepeatSequenceSymbol(event.target.checked)} className="h-4 w-4 accent-theme-accent" />
                    Repeat the symbol to match each number
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-theme-ink">
                    <input type="checkbox" checked={includeSequenceSymbol} onChange={(event) => setIncludeSequenceSymbol(event.target.checked)} className="h-4 w-4 accent-theme-accent" />
                    Also include symbol(s) in the card title
                  </label>
                </div>
                <label className="block text-xs font-medium text-theme-ink">
                  Shared card text <span className="font-normal text-theme-muted">Optional</span>
                  <textarea value={sequenceBody} onChange={(event) => setSequenceBody(event.target.value)} rows={2} className={`${inputClass} mt-1 resize-y`} />
                </label>
              </div>
            )}

            {mode === 'playing' && (
              <div className="space-y-4">
                <fieldset>
                  <legend className="text-xs font-semibold text-theme-ink">Suits</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {PLAYING_SUITS.map((suit) => (
                      <label key={suit.id} className="flex cursor-pointer items-center gap-2 rounded-button border border-theme-border bg-theme-paper px-2 py-2 text-xs text-theme-ink">
                        <input
                          type="checkbox"
                          checked={selectedSuits.has(suit.id)}
                          onChange={(event) => setSelectedSuits((current) => {
                            const next = new Set(current);
                            if (event.target.checked) next.add(suit.id); else next.delete(suit.id);
                            return next;
                          })}
                          className="h-4 w-4 accent-theme-accent"
                        />
                        <span className={suit.id === 'hearts' || suit.id === 'diamonds' ? 'text-red-600' : ''}>{suit.symbol}</span>
                        {suit.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-medium text-theme-ink">
                    Card titles
                    <select value={playingTitleStyle} onChange={(event) => setPlayingTitleStyle(event.target.value as 'long' | 'compact')} className={`${inputClass} mt-1`}>
                      <option value="long">Full names (Jack of Hearts)</option>
                      <option value="compact">Compact names (J Hearts)</option>
                    </select>
                  </label>
                  <label className="text-xs font-medium text-theme-ink">
                    Jokers
                    <select value={jokerCount} onChange={(event) => setJokerCount(Number(event.target.value))} className={`${inputClass} mt-1`}>
                      <option value={0}>No jokers</option>
                      <option value={1}>1 joker</option>
                      <option value={2}>2 jokers</option>
                    </select>
                  </label>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-theme-ink">
                  <input type="checkbox" checked={includePlayingSymbol} onChange={(event) => setIncludePlayingSymbol(event.target.checked)} className="h-4 w-4 accent-theme-accent" />
                  Also include the suit symbol in each card title
                </label>
              </div>
            )}

            {mode === 'tarot' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" aria-pressed={tarotScope === 'major'} onClick={() => setTarotScope('major')} className={`${choiceClass} ${tarotScope === 'major' ? 'border-theme-accent bg-theme-accent/10 text-theme-ink' : 'bg-theme-paper text-theme-ink'}`}>
                    <span className="block font-semibold">Major Arcana</span>
                    <span className="mt-0.5 block text-[10px] text-theme-muted">22 named cards</span>
                  </button>
                  <button type="button" aria-pressed={tarotScope === 'full'} onClick={() => setTarotScope('full')} className={`${choiceClass} ${tarotScope === 'full' ? 'border-theme-accent bg-theme-accent/10 text-theme-ink' : 'bg-theme-paper text-theme-ink'}`}>
                    <span className="block font-semibold">Full tarot deck</span>
                    <span className="mt-0.5 block text-[10px] text-theme-muted">22 Major + 56 Minor Arcana</span>
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-theme-ink">
                    <input type="checkbox" checked={includeTarotNumber} onChange={(event) => setIncludeTarotNumber(event.target.checked)} className="h-4 w-4 accent-theme-accent" />
                    Include Major Arcana numerals
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-theme-ink">
                    <input type="checkbox" checked={includeTarotSymbol} onChange={(event) => setIncludeTarotSymbol(event.target.checked)} className="h-4 w-4 accent-theme-accent" />
                    Also include symbols in card titles
                  </label>
                </div>
                <p className="text-xs leading-5 text-theme-muted">Minor Arcana use Wands, Cups, Swords, and Pentacles with Ace through King.</p>
              </div>
            )}

            {mode === 'list' && (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-theme-ink">
                  Cards, one per line
                  <textarea
                    value={listText}
                    onChange={(event) => setListText(event.target.value)}
                    placeholder={'The Wanderer\nFlame Ward | 🔥 | Resist the next fire attack\nHidden Door | 🗝'}
                    rows={7}
                    autoFocus
                    className={`${inputClass} mt-1 resize-y font-mono text-xs`}
                  />
                </label>
                <p className="text-[11px] leading-4 text-theme-muted">Use <strong>Title | symbol | card text</strong> when a card needs its own details. Missing symbols use the default below.</p>
                {renderSymbolField(listSymbol, setListSymbol, 'Default symbol')}
                <label className="flex cursor-pointer items-center gap-2 text-xs text-theme-ink">
                  <input type="checkbox" checked={includeListSymbol} onChange={(event) => setIncludeListSymbol(event.target.checked)} className="h-4 w-4 accent-theme-accent" />
                  Also include each symbol in its card title
                </label>
              </div>
            )}
          </section>

          <section className="mt-4" aria-labelledby="bulk-card-preview-heading">
            <div className="flex items-center justify-between gap-2">
              <h3 id="bulk-card-preview-heading" className="text-xs font-semibold text-theme-ink">Preview</h3>
              <span className="text-[11px] text-theme-muted">{generatedCards.length} card{generatedCards.length === 1 ? '' : 's'}</span>
            </div>
            <div className="mt-2 max-h-72 overflow-y-auto rounded-button border border-theme-border bg-theme-paper">
              {generatedCards.length === 0 ? (
                <p className="px-3 py-5 text-center text-xs text-theme-muted">Choose at least one card.</p>
              ) : generatedCards.map((card, index) => (
                <div key={`${card.title}-${index}`} className="flex items-center gap-3 border-b border-theme-border px-3 py-2 last:border-b-0">
                  <span className="flex h-7 w-7 flex-none items-center justify-center text-base text-theme-ink">{card.symbol || '·'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-theme-ink">{card.title || 'Untitled card'}</p>
                    {card.body && <p className="truncate text-[10px] text-theme-muted">{card.body}</p>}
                  </div>
                </div>
              ))}
            </div>
            {mode === 'sequence' && Math.abs(parseInteger(sequenceEnd, 1) - parseInteger(sequenceStart, 1)) + 1 > MAX_BULK_CARDS && (
              <p className="mt-2 text-[11px] font-medium text-red-600">Bulk actions are limited to {MAX_BULK_CARDS} cards. This sequence will stop at that limit.</p>
            )}
            {mode === 'list' && listText.split(/\r?\n/).filter((line) => line.trim()).length > MAX_BULK_CARDS && (
              <p className="mt-2 text-[11px] font-medium text-red-600">Only the first {MAX_BULK_CARDS} non-empty lines will be added.</p>
            )}
          </section>

        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-theme-border px-4 py-3">
          <span className="hidden items-center gap-1.5 text-xs text-theme-muted sm:flex">
            <LayoutGridIcon className="h-4 w-4" />
            Cards are added in preview order
          </span>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="widget-control px-3 py-2 text-xs font-semibold">Cancel</button>
            <button
              type="button"
              disabled={generatedCards.length === 0}
              onClick={() => onAdd(generatedCards)}
              className="widget-control flex items-center gap-1.5 bg-theme-accent px-3 py-2 text-xs font-semibold text-theme-paper disabled:opacity-40"
            >
              <PlusIcon className="h-4 w-4" />
              Add {generatedCards.length} card{generatedCards.length === 1 ? '' : 's'}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}