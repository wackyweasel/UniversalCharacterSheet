import { useState } from 'react';
import { TagIcon, XIcon } from './icons';
import { Tooltip } from './Tooltip';

interface VariableLabelControlProps {
  valueLabel?: string;
  onValueLabelChange: (label: string | undefined) => void;
}

export function VariableLabelControl({ valueLabel, onValueLabelChange }: VariableLabelControlProps) {
  const [showInput, setShowInput] = useState(false);
  const [labelDraft, setLabelDraft] = useState(valueLabel || '');
  const hasLabel = Boolean(valueLabel?.trim());
  const hasValidDraft = labelDraft.trim().length > 0;

  const openInput = () => {
    setLabelDraft(valueLabel || '');
    setShowInput(true);
  };

  const cancelInput = () => {
    setLabelDraft(valueLabel || '');
    setShowInput(false);
  };

  const confirmLabel = () => {
    const normalizedLabel = labelDraft.trim().replace(/\s+/g, '_');
    onValueLabelChange(normalizedLabel || undefined);
    setShowInput(false);
  };

  const clearLabel = () => {
    setLabelDraft('');
    onValueLabelChange(undefined);
    setShowInput(false);
  };

  return (
    <div className="relative flex-shrink-0">
      <Tooltip content={valueLabel ? `Label: @${valueLabel}` : 'Set variable label'}>
        <button
          type="button"
          onClick={openInput}
          aria-label={valueLabel ? `Edit label ${valueLabel}` : 'Set variable label'}
          aria-pressed={hasLabel}
          className={`flex h-8 w-8 items-center justify-center rounded-button border text-xs transition-colors ${
            showInput
              ? 'border-theme-accent bg-theme-accent/30 text-theme-accent ring-1 ring-theme-accent'
              : hasLabel
                ? 'border-theme-accent bg-theme-accent text-theme-paper shadow-theme'
                : 'border-theme-border text-theme-muted hover:border-theme-accent hover:text-theme-ink'
          }`}
        >
          <TagIcon className="h-3.5 w-3.5" />
        </button>
      </Tooltip>

      {showInput && (
        <div className="absolute right-0 z-30 mt-1.5 w-[min(18rem,calc(100vw-2rem))] rounded-button border border-theme-accent/50 bg-theme-paper p-2 shadow-theme">
          <div className="mb-1.5 flex items-center gap-1 text-xs font-medium text-theme-ink">
            <TagIcon className="h-3 w-3 shrink-0 text-theme-accent" />
            Variable Label
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-theme-muted">@</span>
            <input
              type="text"
              value={labelDraft}
              onChange={(event) => setLabelDraft(event.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  confirmLabel();
                }
                if (event.key === 'Escape') cancelInput();
              }}
              placeholder="e.g. armor, equipped"
              className="min-w-0 flex-1 rounded-button border border-theme-border bg-theme-paper px-2 py-1 font-body text-xs text-theme-ink focus:border-theme-accent focus:outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={confirmLabel}
              disabled={!hasValidDraft}
              className="h-8 rounded-button bg-theme-accent px-2 py-1 text-xs text-theme-paper hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Set
            </button>
            <button
              type="button"
              onClick={cancelInput}
              aria-label="Cancel label editing"
              className="flex h-8 w-8 items-center justify-center rounded-button border border-theme-border text-theme-muted hover:border-theme-accent hover:text-theme-ink"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
            {valueLabel && (
              <button
                type="button"
                onClick={clearLabel}
                aria-label="Clear label"
                className="h-8 w-8 rounded-button border border-red-300 text-xs text-red-500 hover:bg-red-50"
              >
                ×
              </button>
            )}
          </div>
          <p className="mt-1 text-[10px] text-theme-muted">
            Use <span className="font-mono">@{labelDraft || 'name'}</span> in formulas.
          </p>
        </div>
      )}
    </div>
  );
}