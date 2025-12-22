import { EditorProps } from './types';

export function HealthBarEditor({ widget, updateData }: EditorProps) {
  const { label, maxValue = 10 } = widget.data;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <input
          className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={label || ''}
          onChange={(e) => updateData({ label: e.target.value })}
          placeholder="Health"
        />
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
    </div>
  );
}

