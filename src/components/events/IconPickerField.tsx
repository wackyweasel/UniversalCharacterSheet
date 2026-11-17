import { useState } from 'react';
import { fieldClass } from './EventPartFields';

const ICON_GROUPS: { label: string; icons: string[] }[] = [
  { label: 'Alerts', icons: ['⚠️', '❗', '❓', '‼️', '⁉️', '🚨', '🔔', '📢', '💡', 'ℹ️', '✅', '❌', '⛔', '🚫', '🛑', '⭐', '✨', '🔥', '⚡', '💥'] },
  { label: 'Fantasy', icons: ['⚔️', '🗡️', '🛡️', '🏹', '🪄', '🔮', '📜', '📖', '🧪', '⚗️', '💎', '👑', '🏰', '🐉', '🦄', '🧙', '🧝', '🧛', '🧟', '👻', '💀', '☠️', '👹', '👺', '🕯️', '🗝️', '🔒', '💰', '🪙', '🎲'] },
  { label: 'Nature', icons: ['🌲', '🌳', '🌿', '🍀', '🌙', '☀️', '🌤️', '☁️', '🌧️', '⛈️', '❄️', '🌪️', '🌊', '🌋', '⛰️', '🏔️', '🏜️', '🏕️', '🔥', '💧'] },
  { label: 'Creatures', icons: ['🐺', '🐻', '🦅', '🦇', '🕷️', '🐍', '🦂', '🐀', '🐗', '🦌', '🐴', '🐈', '🐕', '🦉', '🐙', '🦈', '🐲', '🪲', '🪱', '🐸'] },
  { label: 'Body & feelings', icons: ['❤️', '💔', '🧠', '👁️', '💪', '🦶', '✋', '👍', '👎', '🙏', '😀', '😎', '😱', '😈', '😴', '🤔', '😡', '😢', '🤕', '🤢'] },
  { label: 'Things', icons: ['🍖', '🍺', '🍞', '🍎', '🏠', '⛺', '🚪', '🪜', '🧭', '🗺️', '⏳', '⌛', '🕐', '🎒', '🧰', '🔧', '⚙️', '🔨', '⛏️', '🪓', '🎻', '🎭', '🎯', '🏆', '🎁', '🚀', '🚗', '⛵', '📦', '📌'] },
  { label: 'Symbols', icons: ['♠️', '♥️', '♦️', '♣️', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '➕', '➖', '➡️', '⬆️', '⬇️', '🔄', '♾️', '☯️'] },
];

interface IconPickerFieldProps {
  label: string;
  help?: string;
  value: string;
  onChange: (value: string) => void;
}

/** Picks an emoji from a grid; the box also takes any other character typed or pasted. */
export function IconPickerField({ label, help, value, onChange }: IconPickerFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="block min-w-0 event-inspector__wide">
      <span className="mb-1 block text-xs font-bold text-theme-ink">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          aria-label={value ? `Icon ${value}, change` : 'Choose an icon'}
          onClick={() => setOpen((current) => !current)}
          className={`${fieldClass} flex !w-16 shrink-0 items-center justify-center gap-1 text-lg`}
        >
          <span>{value || '＋'}</span>
          <span className="text-[10px] text-theme-muted">{open ? '▲' : '▼'}</span>
        </button>
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Or type one"
          autoComplete="off"
          className={fieldClass}
        />
        {value && (
          <button type="button" onClick={() => onChange('')} className="h-9 shrink-0 rounded-button border px-2.5 text-xs font-bold text-theme-muted hover:text-theme-ink">
            Clear
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 max-h-56 space-y-2 overflow-y-auto rounded-button border bg-theme-paper p-2">
          {ICON_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-theme-muted">{group.label}</div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-1">
                {group.icons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    title={icon}
                    onClick={() => {
                      onChange(icon);
                      setOpen(false);
                    }}
                    className={`h-9 rounded-button text-xl hover:bg-theme-accent ${icon === value ? 'bg-theme-accent' : ''}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {help && <span className="mt-1 block text-[11px] leading-snug text-theme-muted">{help}</span>}
    </div>
  );
}
