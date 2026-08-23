import { EditorProps } from './types';
import { Tooltip } from '../Tooltip';

export function ToggleEditor({ widget, updateData }: EditorProps) {
  const {
    label,
    toggleColor,
    inlineLabel = false,
    fieldLabels = {},
  } = widget.data;

  const setStateLabel = (value: string) => {
    const nextLabels = { ...fieldLabels };
    if (value.trim()) nextLabels.state = value.trim();
    else delete nextLabels.state;
    updateData({ fieldLabels: nextLabels });
  };

  return (
    <div className="widget-editor widget-editor--toggle space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-theme-ink">Widget Label</label>
        <div className="relative">
          <input
            className="w-full rounded-button border border-theme-border bg-theme-paper px-3 py-2 pr-8 text-theme-ink focus:border-theme-accent focus:outline-none"
            value={label || ''}
            onChange={(event) => updateData({ label: event.target.value })}
            placeholder="Switch"
          />
          {label && (
            <Tooltip content="Clear label">
              <button
                type="button"
                onClick={() => updateData({ label: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted transition-colors hover:text-theme-ink"
              >
                ×
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      <section className="widget-editor__section" aria-labelledby="toggle-logic-title">
        <div className="widget-editor__section-heading">
          <h3 id="toggle-logic-title" className="widget-editor__section-title">Logic &amp; color</h3>
        </div>
        <label className="mb-1 block text-sm font-medium text-theme-ink" htmlFor={`toggle-state-label-${widget.id}`}>
          Formula label
        </label>
        <input
          id={`toggle-state-label-${widget.id}`}
          value={fieldLabels.state || ''}
          onChange={(event) => setStateLabel(event.target.value)}
          placeholder="e.g. torchLit"
          className="w-full rounded-button border border-theme-border bg-theme-paper px-3 py-2 text-theme-ink focus:border-theme-accent focus:outline-none"
        />
        <p className="widget-editor__hint mt-2 text-xs text-theme-muted">Use this label in formulas: 1 when on, 0 when off.</p>

        <div className="mt-3">
          <label htmlFor={`toggle-color-${widget.id}`} className="mb-1 block text-sm font-medium text-theme-ink">
            On color
          </label>
          <div className="flex items-center gap-2">
            <div
              className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-button border border-theme-border bg-theme-accent"
              style={toggleColor ? { backgroundColor: toggleColor } : undefined}
            >
              <input
                id={`toggle-color-${widget.id}`}
                type="color"
                value={toggleColor || '#2563eb'}
                onChange={(event) => updateData({ toggleColor: event.target.value })}
                className="absolute -inset-1 h-12 w-12 cursor-pointer opacity-0"
              />
            </div>
            {toggleColor ? (
              <>
                <span className="flex-1 text-sm text-theme-ink">{toggleColor.toUpperCase()}</span>
                <button type="button" onClick={() => updateData({ toggleColor: undefined })} className="widget-control px-3 py-2 text-sm">
                  Use theme color
                </button>
              </>
            ) : (
              <span className="text-sm text-theme-muted">Theme color</span>
            )}
          </div>
        </div>
      </section>

      <div className="rounded-theme border border-theme-border p-3">
        <h4 className="mb-3 font-medium text-theme-ink">Display Options</h4>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={inlineLabel}
            onChange={(event) => updateData({ inlineLabel: event.target.checked })}
            className="h-4 w-4 accent-theme-accent"
          />
          <span className="text-sm text-theme-ink">Show label inline with switch</span>
        </label>
      </div>
    </div>
  );
}