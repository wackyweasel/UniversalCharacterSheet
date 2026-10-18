import { useState } from 'react';
import { Tooltip } from './Tooltip';
import { getResourceSymbol } from '../utils/resourceSymbols';

export const RESOURCE_STYLE_OPTIONS = [
  ['dots', '●', 'Dots'],
  ['boxes', '■', 'Boxes'],
  ['stars', '★', 'Stars'],
  ['diamonds', '◆', 'Diamonds'],
  ['crosses', '✖', 'Crosses'],
  ['checkmarks', '✔', 'Checkmarks'],
  ['hearts', '❤️', 'Hearts'],
  ['flames', '🔥', 'Flames'],
  ['skulls', '💀', 'Skulls'],
  ['shields', '🛡️', 'Shields'],
  ['swords', '⚔️', 'Swords'],
  ['lightning', '⚡', 'Lightning'],
  ['moons', '🌙', 'Moons'],
  ['suns', '☀️', 'Suns'],
  ['coins', '🪙', 'Coins'],
  ['gems', '💎', 'Gems'],
] as const;

const SYMBOL_GROUPS: { name: string; symbols: string[] }[] = [
  {
    name: 'Shapes',
    symbols: ['●', '■', '▲', '▼', '◆', '★', '☆', '✦', '✧', '❖', '✪', '⬢', '○', '□', '△', '◇', '◉', '◈', '✚', '✖', '✔', '✕', '♥', '♦', '♣', '♠', '♡', '♢', '☀', '☾'],
  },
  {
    name: 'Hearts and life',
    symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '🩸', '💧', '🍀', '🌿', '🍖', '🍞', '🍺', '🧠', '💪', '👁️', '🦴'],
  },
  {
    name: 'Magic and energy',
    symbols: ['⚡', '🔥', '❄️', '🌊', '🌪️', '🌙', '☀️', '⭐', '✨', '🔮', '🪄', '📜', '🧪', '🕯️', '💎', '🔋', '⚙️', '🔔'],
  },
  {
    name: 'Combat and loot',
    symbols: ['🛡️', '⚔️', '🗡️', '🏹', '🪓', '🔨', '🎯', '💀', '☠️', '🪙', '💰', '🔑', '👑', '🎲', '🧭', '⚓', '🐺', '🐉', '🕸️', '🎵'],
  },
];

// The original styles keep their own empty symbols; any other symbol is stored as itself.
const styleForSymbol = (symbol: string) => RESOURCE_STYLE_OPTIONS.find(([, optionSymbol]) => optionSymbol === symbol)?.[0] ?? symbol;

interface ResourceStylePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function ResourceStylePicker({ value, onChange }: ResourceStylePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedSymbol = getResourceSymbol(true, value);

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-theme-muted">SYMBOL</span>
        <Tooltip content="Choose a symbol">
          <button
            type="button"
            aria-expanded={isOpen}
            aria-haspopup="menu"
            aria-label={`Resource symbol: ${selectedSymbol}`}
            onClick={() => setIsOpen((current) => !current)}
            className="widget-control flex h-10 w-10 items-center justify-center p-0 text-base leading-none"
          >
            {selectedSymbol}
          </button>
        </Tooltip>
      </div>
      {isOpen && (
        <div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-theme border border-theme-border bg-theme-paper p-2" role="menu" aria-label="Resource symbol options">
            {SYMBOL_GROUPS.map((group) => (
              <div key={group.name}>
                <span className="mb-1 block text-[10px] font-bold uppercase text-theme-muted">{group.name}</span>
                <div className="grid grid-cols-8 gap-1">
                  {group.symbols.map((symbol) => (
                    <button
                      key={symbol}
                      type="button"
                      role="menuitem"
                      aria-label={`Use ${symbol}`}
                      aria-pressed={selectedSymbol === symbol}
                      onClick={() => {
                        onChange(styleForSymbol(symbol));
                        setIsOpen(false);
                      }}
                      className={`widget-control flex aspect-square min-w-0 items-center justify-center p-0 text-base leading-none ${selectedSymbol === symbol ? 'border-theme-accent bg-theme-accent/10' : ''}`}
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
