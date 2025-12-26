import { EditorProps } from './types';

export function HealthBarEditor({ widget, updateData }: EditorProps) {
  const { label, maxValue = 10 } = widget.data;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <div className="relative">
          <input
            className="w-full px-3 py-2 pr-8 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            value={label || ''}
            onChange={(e) => updateData({ label: e.target.value })}
            placeholder="Health"
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
        <label className="block text-sm font-medium text-theme-ink mb-1">Maximum Value</label>
        <input
          type="number"
          className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={maxValue}
          onChange={(e) => {
            updateData({ maxValue: e.target.value === '' ? '' : parseInt(e.target.value) || '' });
          }}
          onBlur={(e) => {
            const val = parseInt(e.target.value) || 1;
            updateData({ maxValue: Math.max(1, val) });
          }}
          min={1}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Button Increment</label>
        <input
          type="number"
          className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={widget.data.increment ?? 1}
          onChange={(e) => {
            updateData({ increment: e.target.value === '' ? '' : parseInt(e.target.value) || '' });
          }}
          onBlur={(e) => {
            const val = parseInt(e.target.value) || 1;
            updateData({ increment: Math.max(1, val) });
          }}
          min={1}
        />
        <p className="text-xs text-theme-muted mt-1">Amount changed by +/− buttons</p>
      </div>
    </div>
  );
}

