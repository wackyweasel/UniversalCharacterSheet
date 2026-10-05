import { createPortal } from 'react-dom';

interface Props {
  id: string;
  itemType: string;
  value: string;
  onChange: (name: string) => void;
  onSave: (name: string) => void;
  onCancel: () => void;
}

export function RenameItemDialog({ id, itemType, value, onChange, onSave, onCancel }: Props) {
  const title = `Rename ${itemType}`;
  const inputId = `rename-item-${id}`;

  return createPortal(
    <div
      data-touch-camera-ignore="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${inputId}-title`}
        className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          }
        }}
        onSubmit={(event) => {
          event.preventDefault();
          const name = value.trim();
          if (name) onSave(name);
        }}
      >
        <h3 id={`${inputId}-title`} className="font-heading text-base font-bold">{title}</h3>
        <label htmlFor={inputId} className="mt-3 block text-sm font-medium">{itemType} name</label>
        <input
          id={inputId}
          autoFocus
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1 w-full rounded-button border border-theme-border bg-theme-paper px-3 py-2 text-sm text-theme-ink focus:border-theme-accent focus:outline-none"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="widget-control px-3 py-1.5 text-sm">Cancel</button>
          <button type="submit" disabled={!value.trim()} className="widget-control widget-control--primary px-3 py-1.5 text-sm">
            Save
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
