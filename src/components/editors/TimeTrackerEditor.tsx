import { EditorProps } from './types';

export function TimeTrackerEditor({ widget, updateData }: EditorProps) {
  const { label, roundMode = false } = widget.data;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <div className="relative">
          <input
            className="w-full px-3 py-2 pr-8 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            value={label || ''}
            onChange={(e) => updateData({ label: e.target.value })}
            placeholder="Temporary Effects"
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
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={roundMode}
            onChange={(e) => updateData({ roundMode: e.target.checked })}
            className="w-4 h-4 accent-theme-accent"
          />
          <span className="text-sm font-medium text-theme-ink">Round Mode</span>
        </label>
        <p className="text-xs text-theme-muted mt-1 ml-6">
          In round mode, time is tracked in rounds instead of real-world time units.
        </p>
      </div>
      
      <div className="text-sm text-theme-muted">
        <p>Use this widget to track timed effects in your game.</p>
        <ul className="list-disc ml-4 mt-2 space-y-1">
          <li>Add effects with their remaining duration</li>
          <li>{roundMode ? 'Use "Pass Round" to advance all timers by 1 round' : 'Use the "Pass Time" controls to advance all timers at once'}</li>
          <li>Expired effects will be highlighted</li>
        </ul>
      </div>
    </div>
  );
}

