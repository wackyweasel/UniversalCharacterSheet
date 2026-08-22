import { useState } from 'react';
import { EditorProps } from './types';
import { Tooltip } from '../Tooltip';

export function TimeTrackerEditor({ widget, updateData }: EditorProps) {
  const { label, roundMode = false, effectSuggestions = [] } = widget.data;
  const [newSuggestion, setNewSuggestion] = useState('');

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

      <fieldset className="widget-editor__option-group">
        <legend className="widget-editor__section-title">Time mode</legend>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={roundMode}
            onChange={(e) => updateData({ roundMode: e.target.checked })}
            className="mt-0.5 h-4 w-4 flex-none accent-theme-accent"
          />
          <span className="text-xs font-medium text-theme-ink">Round mode</span>
        </label>
        <p className="widget-editor__hint ml-6 text-[11px] leading-4 text-theme-muted">
          In round mode, time is tracked in rounds instead of real-world time units.
        </p>
      </fieldset>

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
          <div className="flex flex-wrap gap-1">
            {effectSuggestions.map((suggestion, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-theme-border/30 text-theme-ink rounded-button text-sm"
              >
                {suggestion}
                <button
                  type="button"
                  onClick={() => removeSuggestion(index)}
                  className="text-theme-muted hover:text-red-500 transition-colors ml-1"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </section>
      
      <div className="widget-editor__hint text-xs text-theme-muted">
        <p>Use this widget to track timed effects in your game.</p>
        <ul className="ml-4 mt-2 list-disc space-y-1">
          <li>Add effects with their remaining duration</li>
          <li>{roundMode ? 'Use "Pass Round" to advance all timers by 1 round' : 'Use the "Pass Time" controls to advance all timers at once'}</li>
          <li>Expired effects will be highlighted</li>
        </ul>
      </div>
    </div>
  );
}

