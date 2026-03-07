import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Tooltip } from '../Tooltip';

interface TooltipEditButtonProps {
  tooltip: string | undefined;
  onSave: (tooltip: string | undefined) => void;
  itemName: string;
}

export function TooltipEditButton({ tooltip, onSave, itemName }: TooltipEditButtonProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const openDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValue(tooltip || '');
    setOpen(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const save = () => {
    onSave(value.trim() || undefined);
    setOpen(false);
  };

  const cancel = () => setOpen(false);

  return (
    <>
      <Tooltip content={tooltip ? 'Edit tooltip' : 'Add tooltip'}>
        <button
          type="button"
          onClick={openDialog}
          className={`w-7 h-7 flex items-center justify-center border rounded-button text-xs transition-colors ${
            tooltip
              ? 'border-theme-accent bg-theme-accent/20 text-theme-accent'
              : 'border-theme-border text-theme-muted hover:text-theme-ink hover:border-theme-accent'
          }`}
        >
          ⓘ
        </button>
      </Tooltip>
      {open && ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            className="p-4 w-80 flex flex-col gap-3"
            style={{
              background: 'var(--color-paper)',
              border: 'var(--border-width, 1px) solid var(--color-border)',
              borderRadius: 'var(--button-radius)',
              boxShadow: 'var(--shadow-style)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <div className="text-sm font-medium text-theme-ink">
              Tooltip for <span className="font-bold">{itemName}</span>
            </div>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') cancel(); }}
              placeholder="Enter tooltip text shown on hover in play mode..."
              rows={3}
              className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm focus:outline-none focus:border-theme-accent resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={cancel}
                className="px-3 py-1 text-sm border border-theme-border rounded-button text-theme-ink hover:bg-theme-border transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="px-3 py-1 text-sm bg-theme-accent text-theme-paper rounded-button hover:opacity-90 transition-opacity"
              >
                Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
