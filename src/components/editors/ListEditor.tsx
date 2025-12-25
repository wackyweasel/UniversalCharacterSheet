import { EditorProps } from './types';

export function ListEditor({ widget, updateData }: EditorProps) {
  const { label, itemCount = 5 } = widget.data;

  return (
    <div className="space-y-4">
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
            <button
              type="button"
              onClick={() => updateData({ label: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-ink transition-colors"
              title="Clear label"
            >
              ×
            </button>
          )}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Number of Item Slots</label>
        <input
          type="number"
          min="1"
          max="50"
          className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={itemCount}
          onChange={(e) => updateData({ itemCount: e.target.value === '' ? '' : parseInt(e.target.value) || '' })}
          onBlur={(e) => updateData({ itemCount: Math.max(1, Math.min(50, parseInt(e.target.value) || 1)) })}
        />
        <p className="text-xs text-theme-muted mt-1">Items can be filled in during play mode</p>
      </div>
    </div>
  );
}

