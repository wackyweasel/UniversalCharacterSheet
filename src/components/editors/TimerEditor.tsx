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
    <div className="widget-editor widget-editor--timer space-y-4">
      <section className="widget-editor__section">
        <label className="block text-xs font-semibold text-theme-ink">
          Widget label
          <input
            className="mt-1 w-full rounded-button border border-theme-border bg-theme-paper px-3 py-2 text-theme-ink focus:border-theme-accent focus:outline-none"
            value={label || ''}
            onChange={(e) => updateData({ label: e.target.value })}
            placeholder="Timer"
          />
        </label>
      </section>

      <section className="widget-editor__option-group" aria-labelledby={`timer-mode-heading-${widget.id}`}>
        <h3 id={`timer-mode-heading-${widget.id}`} className="widget-editor__section-title">Timer mode</h3>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={timerCountDown}
            onChange={(e) => updateData({ timerCountDown: e.target.checked })}
            className="mt-0.5 h-4 w-4 flex-none accent-theme-accent"
          />
          <span className="text-xs text-theme-ink">Countdown mode</span>
        </label>

        {timerCountDown && (
          <div className="border-t border-theme-border pt-3">
            <label className="block text-xs font-medium text-theme-ink">Starting duration</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                aria-label="Minutes"
                className="h-8 w-16 rounded-button border border-theme-border bg-theme-paper px-2 py-1 text-center text-theme-ink focus:border-theme-accent focus:outline-none"
                value={durationMinutes}
                onChange={(e) =>
                  setDuration(Math.max(0, parseInt(e.target.value) || 0), durationRemainderSeconds)
                }
              />
              <span className="text-xs text-theme-muted">min</span>
              <input
                type="number"
                min={0}
                max={59}
                aria-label="Seconds"
                className="h-8 w-16 rounded-button border border-theme-border bg-theme-paper px-2 py-1 text-center text-theme-ink focus:border-theme-accent focus:outline-none"
                value={durationRemainderSeconds}
                onChange={(e) =>
                  setDuration(durationMinutes, Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))
                }
              />
              <span className="text-xs text-theme-muted">sec</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
