import { EditorProps } from './types';
import { Tooltip } from '../Tooltip';
import { CollapsibleSection } from './CollapsibleSection';

export function ListEditor({ widget, updateData }: EditorProps) {
  const { label, itemCount = 5, wrapText = true } = widget.data;

  return (
    <div className="widget-editor widget-editor--list space-y-4">
      <CollapsibleSection title="General">
        <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <div className="relative">
          <input
            className="w-full px-3 py-2 pr-8 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            value={label || ''}
            onChange={(e) => updateData({ label: e.target.value })}
            placeholder="List Title"
          />
          {label && (
            <Tooltip content="Clear label">
              <button
                type="button"
                onClick={() => updateData({ label: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-ink transition-colors"
              >
                ×
              </button>
            </Tooltip>
          )}
        </div>
        </div>
      
      </CollapsibleSection>

      <CollapsibleSection>
        <div className="widget-editor__section-heading">
          <h3 id="list-behavior-title" className="widget-editor__section-title">List behavior</h3>
          <span className="widget-editor__section-count">{itemCount || 0}</span>
        </div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Number of item slots</label>
        <input
          type="number"
          min="1"
          max="50"
          className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={itemCount}
          onChange={(e) => updateData({ itemCount: e.target.value === '' ? '' : parseInt(e.target.value) || '' })}
          onBlur={(e) => updateData({ itemCount: Math.max(1, Math.min(50, parseInt(e.target.value) || 1)) })}
        />
        <p className="widget-editor__hint text-xs text-theme-muted mt-2">Items can be filled in during play mode</p>

        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-medium text-theme-ink">
          <input
            type="checkbox"
            checked={wrapText}
            onChange={(e) => updateData({ wrapText: e.target.checked })}
            className="h-4 w-4 accent-theme-accent"
          />
          Wrap text
        </label>
      </CollapsibleSection>
    </div>
  );
}

