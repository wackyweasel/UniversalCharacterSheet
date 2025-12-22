import { EditorProps } from './types';

export function ProgressBarEditor({ widget, updateData }: EditorProps) {
  const { 
    label, 
    maxValue = 100, 
    currentValue = 0,
    showPercentage = true,
    showValues = true
  } = widget.data;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <input
          className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={label || ''}
          onChange={(e) => updateData({ label: e.target.value })}
          placeholder="Progress"
        />
      </div>
      
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-theme-ink mb-1">Current Value</label>
          <input
            type="number"
            className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            value={currentValue}
            onChange={(e) => {
              const val = e.target.value === '' ? '' : parseInt(e.target.value) || 0;
              updateData({ currentValue: val });
            }}
            onBlur={(e) => {
              const val = parseInt(e.target.value) || 0;
              updateData({ currentValue: Math.max(0, Math.min(maxValue, val)) });
            }}
            min={0}
          />
        </div>
        <div className="flex-1">
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

      <div className="border border-theme-border rounded-button p-3">
        <h4 className="font-medium text-theme-ink mb-3">Display Options</h4>
        
        <label className="flex items-center gap-2 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={showValues}
            onChange={(e) => updateData({ showValues: e.target.checked })}
            className="w-4 h-4 accent-theme-accent"
          />
          <span className="text-sm text-theme-ink">Show Values (e.g., 50 / 100)</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showPercentage}
            onChange={(e) => updateData({ showPercentage: e.target.checked })}
            className="w-4 h-4 accent-theme-accent"
          />
          <span className="text-sm text-theme-ink">Show Percentage</span>
        </label>
      </div>
    </div>
  );
}

