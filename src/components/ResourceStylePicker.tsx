import { useState } from 'react';
import { Tooltip } from './Tooltip';

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

interface ResourceStylePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function ResourceStylePicker({ value, onChange }: ResourceStylePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedStyle = RESOURCE_STYLE_OPTIONS.find(([style]) => style === value) ?? RESOURCE_STYLE_OPTIONS[0];

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-theme-muted">Symbol</span>
      <div className="relative flex-shrink-0">
        <Tooltip content={`Resource style: ${selectedStyle[2]}`}>
          <button
            type="button"
            aria-expanded={isOpen}
            aria-haspopup="menu"
            aria-label={`Resource style: ${selectedStyle[2]}`}
            onClick={() => setIsOpen((current) => !current)}
            className="widget-control flex h-8 w-8 items-center justify-center p-0 text-base leading-none"
          >
            {selectedStyle[1]}
          </button>
        </Tooltip>
        {isOpen && (
          <div className="absolute left-0 top-full z-30 mt-1 grid w-72 grid-cols-8 gap-1 rounded-theme border border-theme-border bg-theme-paper p-1 shadow-theme" role="menu" aria-label="Resource style options">
            {RESOURCE_STYLE_OPTIONS.map(([style, symbol, name]) => (
              <button
                key={style}
                type="button"
                role="menuitem"
                title={name}
                aria-label={name}
                aria-pressed={value === style}
                onClick={() => {
                  onChange(style);
                  setIsOpen(false);
                }}
                className={`widget-control flex aspect-square min-w-0 items-center justify-center p-0 text-base leading-none ${value === style ? 'border-theme-accent bg-theme-accent/10' : ''}`}
              >
                {symbol}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
