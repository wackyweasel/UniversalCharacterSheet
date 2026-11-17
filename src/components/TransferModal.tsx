import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from './icons';

export function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** The window the export and import dialogs of the compendium and events share. */
export function ModalShell({ title, titleId, onClose, children }: { title: string; titleId: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      data-touch-camera-ignore="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-3 animate-fade-in"
      onClick={onClose}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-theme border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink shadow-theme animate-modal-in"
      >
        <div className="flex items-center justify-between border-b border-theme-border px-4 py-2.5">
          <h2 id={titleId} className="font-heading text-base font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="widget-control h-7 w-7">
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-3 overflow-y-auto p-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
