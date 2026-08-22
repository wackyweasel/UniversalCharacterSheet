import { useState } from 'react';
import { EditorProps } from './types';
import { Tooltip } from '../Tooltip';
import { TrashIcon } from '../icons';

export function TimeTrackerEditor({ widget, updateData }: EditorProps) {
  const { label, roundMode = false, effectSuggestions = [] } = widget.data;
  const [newSuggestion, setNewSuggestion] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const addSuggestion = () => {
    if (newSuggestion.trim() && !effectSuggestions.includes(newSuggestion.trim())) {
      updateData({ effectSuggestions: [...effectSuggestions, newSuggestion.trim()] });
      setNewSuggestion('');
    }
  };

  const removeSuggestion = (index: number) => {
    const updated = [...effectSuggestions];
    updated.splice(index, 1);
    updateData({ effectSuggestions: updated });
  };

  return (
    <div className="widget-editor widget-editor--time-tracker space-y-4">
      <div className="widget-editor__hint text-xs text-theme-muted" style={{ marginBottom: '-0.5rem', marginTop: '0.5rem' }}>
        <div className="flex items-center justify-between gap-3">
          <p>Use this widget to track timed effects in your game.</p>
          <button
            type="button"
            aria-expanded={showHelp}
            aria-controls={`time-tracker-help-${widget.id}`}
            onClick={() => setShowHelp((expanded) => !expanded)}
            className="widget-control flex-none px-2 py-1 text-[11px] font-semibold"
          >
            {showHelp ? 'less' : 'more'}
          </button>
        </div>
        {showHelp && (
          <ul id={`time-tracker-help-${widget.id}`} className="ml-4 mt-2 list-disc space-y-1">
            <li>Add effects with their remaining duration</li>
            <li>{roundMode ? 'Use "Pass Round" to advance all timers by 1 round' : 'Use the "Pass Time" controls to advance all timers at once'}</li>
            <li>Expired effects will be highlighted</li>
            <li>Time can also be tracked from the Initiative Tracker and Rest button</li>
          </ul>
        )}
      </div>

      <section className="widget-editor__section">
        <label className="block text-xs font-semibold text-theme-ink">
          Widget label
        <div className="relative">
          <input
            className="w-full px-3 py-2 pr-8 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            value={label || ''}
            onChange={(e) => updateData({ label: e.target.value })}
            placeholder="Temporary Effects"
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
        </label>
      </section>

      <section className="widget-editor__option-group" aria-labelledby={`time-mode-heading-${widget.id}`}>
        <h3 id={`time-mode-heading-${widget.id}`} className="widget-editor__section-title">Time mode</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="Time mode options">
          <button
            type="button"
            aria-pressed={!roundMode}
            onClick={() => updateData({ roundMode: false })}
            className={`flex min-h-20 w-full flex-col items-start justify-center rounded-button border p-3 text-left transition-colors ${
              !roundMode
                ? 'border-theme-accent bg-theme-accent text-theme-paper shadow-sm'
                : 'border-theme-border bg-theme-paper text-theme-ink hover:border-theme-accent hover:bg-theme-accent/10'
            }`}
          >
            <span className="text-sm font-semibold">Real time mode</span>
            <span className={`mt-1 text-[11px] leading-4 ${!roundMode ? 'text-theme-paper/75' : 'text-theme-muted'}`}>
              Track durations in seconds, minutes, and hours.
            </span>
          </button>
          <button
            type="button"
            aria-pressed={roundMode}
            onClick={() => updateData({ roundMode: true })}
            className={`flex min-h-20 w-full flex-col items-start justify-center rounded-button border p-3 text-left transition-colors ${
              roundMode
                ? 'border-theme-accent bg-theme-accent text-theme-paper shadow-sm'
                : 'border-theme-border bg-theme-paper text-theme-ink hover:border-theme-accent hover:bg-theme-accent/10'
            }`}
          >
            <span className="text-sm font-semibold">Round mode</span>
            <span className={`mt-1 text-[11px] leading-4 ${roundMode ? 'text-theme-paper/75' : 'text-theme-muted'}`}>
              Track durations by rounds instead of real-world time.
            </span>
          </button>
        </div>
      </section>

      <section className="widget-editor__section" aria-labelledby={`time-tracker-suggestions-heading-${widget.id}`}>
        <div className="widget-editor__section-heading">
          <div>
            <h3 id={`time-tracker-suggestions-heading-${widget.id}`} className="widget-editor__section-title">Effect suggestions</h3>
            <p className="mt-0.5 text-[11px] leading-4 text-theme-muted">
              Add common effects that will appear as suggestions when adding new effects.
            </p>
          </div>
          <span className="widget-editor__section-count">{effectSuggestions.length}</span>
        </div>
        <div className="widget-editor__add-row flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-button border border-theme-border bg-theme-paper px-3 py-2 text-theme-ink focus:border-theme-accent focus:outline-none"
            value={newSuggestion}
            onChange={(e) => setNewSuggestion(e.target.value)}
            placeholder="e.g., Bless, Haste, Shield..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSuggestion();
              }
            }}
          />
          <button
            type="button"
            onClick={addSuggestion}
            className="widget-control widget-control--primary px-3 py-2 text-xs"
          >
            Add
          </button>
        </div>
        {effectSuggestions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {effectSuggestions.map((suggestion, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 rounded-button border border-theme-border bg-theme-border/30 px-2 py-1 text-sm text-theme-ink"
              >
                {suggestion}
                <Tooltip content="Delete suggestion">
                  <button
                    type="button"
                    onClick={() => removeSuggestion(index)}
                    aria-label={`Delete ${suggestion} suggestion`}
                    title="Delete suggestion"
                    className="flex h-5 w-5 items-center justify-center rounded-button text-theme-muted transition-colors hover:text-red-500"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
              </span>
            ))}
          </div>
        )}
      </section>
      
    </div>
  );
}

