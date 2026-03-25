import { EditorProps } from './types';

export function TimerEditor({ widget, updateData }: EditorProps) {
  const {
    label,
    timerCountDown = false,
    timerDuration = 60000,
  } = widget.data;

  const durationSeconds = Math.floor(timerDuration / 1000);
  const durationMinutes = Math.floor(durationSeconds / 60);
  const durationRemainderSeconds = durationSeconds % 60;

  const setDuration = (minutes: number, seconds: number) => {
    const ms = (minutes * 60 + seconds) * 1000;
    updateData({ timerDuration: Math.max(1000, ms) });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <input
          className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={label || ''}
          onChange={(e) => updateData({ label: e.target.value })}
          placeholder="Timer"
        />
      </div>

      <div className="border border-theme-border rounded-button p-3">
        <label className="flex items-center gap-2 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={timerCountDown}
            onChange={(e) => updateData({ timerCountDown: e.target.checked })}
            className="w-4 h-4 accent-theme-accent"
          />
          <span className="text-sm text-theme-ink">Countdown mode</span>
        </label>

        {timerCountDown && (
          <div>
            <label className="block text-sm font-medium text-theme-ink mb-1">Duration</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                className="w-16 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-center focus:outline-none focus:border-theme-accent"
                value={durationMinutes}
                onChange={(e) =>
                  setDuration(Math.max(0, parseInt(e.target.value) || 0), durationRemainderSeconds)
                }
              />
              <span className="text-sm text-theme-muted">min</span>
              <input
                type="number"
                min={0}
                max={59}
                className="w-16 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-center focus:outline-none focus:border-theme-accent"
                value={durationRemainderSeconds}
                onChange={(e) =>
                  setDuration(durationMinutes, Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))
                }
              />
              <span className="text-sm text-theme-muted">sec</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
