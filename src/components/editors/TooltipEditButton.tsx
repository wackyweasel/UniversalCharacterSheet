import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Tooltip } from '../Tooltip';

interface TooltipEditButtonProps {
  tooltip: string | undefined;
  onSave: (tooltip: string | undefined) => void;
  itemName: string;
  radius?: 'button' | 'theme';
  buttonClassName?: string;
}

export function TooltipEditButton({ tooltip, onSave, itemName, radius = 'button', buttonClassName }: TooltipEditButtonProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const radiusClass = radius === 'theme' ? 'rounded-theme' : 'rounded-button';

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
          className={`${buttonClassName ?? 'w-7 h-7'} flex items-center justify-center border rounded-button text-xs transition-colors ${
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
          className="widget-edit-modal__backdrop fixed inset-0 z-50 flex items-center justify-center p-3"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tooltip-edit-dialog-title"
            className="widget-edit-modal__aux-dialog w-full max-w-sm overflow-hidden animate-modal-in"
          >
            <div className="widget-edit-modal__header flex items-center justify-between border-b border-theme-border">
              <div className="widget-edit-modal__title-group">
                <span className="widget-edit-modal__eyebrow">Field guidance</span>
                <h2 id="tooltip-edit-dialog-title" className="widget-edit-modal__title font-bold text-theme-ink font-heading">
                  Tooltip for <span>{itemName}</span>
                </h2>
              </div>
            </div>
            <div className="flex flex-col gap-3 p-4">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') cancel(); }}
                placeholder="Enter tooltip text shown on hover in play mode (not visible on touch devices)..."
                rows={3}
                className={`w-full px-3 py-2 border border-theme-border ${radiusClass} bg-theme-paper text-theme-ink text-sm focus:outline-none focus:border-theme-accent resize-none`}
              />
            </div>
            <div className="widget-edit-modal__footer flex gap-2 justify-end border-t border-theme-border">
              <button type="button" onClick={cancel} className="widget-control px-3 py-2 text-xs font-semibold">
                Cancel
              </button>
              <button type="button" onClick={save} className="widget-control bg-theme-accent px-3 py-2 text-xs font-semibold text-theme-paper hover:opacity-90">
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
