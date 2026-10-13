import { useEffect, useState } from 'react';

const inputClass = 'h-10 w-full min-w-0 px-2 text-sm border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent';

// Keeps partial input such as an empty field local and only commits whole numbers within the bounds.
export function IntegerInput({
  id,
  value,
  min,
  max,
  onCommit,
  ariaLabel,
}: {
  id?: string;
  value: number;
  min?: number;
  max?: number;
  onCommit: (value: number) => void;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  return (
    <input
      id={id}
      type="number"
      inputMode="numeric"
      step="1"
      min={min}
      max={max}
      aria-label={ariaLabel}
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value);
        const next = Number(event.target.value);
        if (event.target.value.trim() !== '' && Number.isInteger(next) && (min === undefined || next >= min) && (max === undefined || next <= max)) onCommit(next);
      }}
      onBlur={() => setDraft(String(value))}
      className={`${inputClass} text-center`}
    />
  );
}
