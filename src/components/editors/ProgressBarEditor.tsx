import { EditorProps } from './types';
import { LabeledNumberField } from './LabeledNumberField';
import { Tooltip } from '../Tooltip';

export function ProgressBarEditor({ widget, updateData }: EditorProps) {
  const { 
    label, 
    maxValue = 100, 
    minValue = 0,
    currentValue = 0,
    showPercentage = false,
    showValues = true,
    verticalBar = false,
    inlineLabel = false,
    allowOutOfRange = false,
    showIncrementButtons = false,
    fillColor,
    fieldLabels = {},
    fieldFormulas = {}
  } = widget.data;

  const clampCurrentValue = (value: number, minimum = minValue, maximum = maxValue) => Math.max(minimum, Math.min(maximum, value));

  const setFieldLabel = (field: string, labelName: string | undefined) => {
    const updated = { ...fieldLabels };
    if (labelName) updated[field] = labelName;
    else delete updated[field];
    updateData({ fieldLabels: updated });
  };

  const setFieldFormula = (field: string, formula: string | undefined) => {
    const updated = { ...fieldFormulas };
    if (formula) updated[field] = formula;
    else delete updated[field];
    updateData({ fieldFormulas: updated });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <div className="relative">
          <input
            className="w-full px-3 py-2 pr-8 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            value={label || ''}
            onChange={(e) => updateData({ label: e.target.value })}
            placeholder="Progress"
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
      
      <div className="space-y-2">
        <div>
          <LabeledNumberField
            displayLabel="Current Value"
            value={typeof currentValue === 'number' ? currentValue : 0}
            onChange={(v) => updateData({ currentValue: allowOutOfRange ? v : clampCurrentValue(v) })}
            fieldLabel={fieldLabels['currentValue']}
            onFieldLabelChange={(l) => setFieldLabel('currentValue', l)}
            formula={fieldFormulas['currentValue']}
            onFormulaChange={(f) => setFieldFormula('currentValue', f)}
            min={allowOutOfRange ? undefined : minValue}
            max={allowOutOfRange ? undefined : maxValue}
          />
        </div>
        <div>
          <LabeledNumberField
            displayLabel="Minimum Value"
            value={typeof minValue === 'number' ? minValue : 0}
            onChange={(v) => {
              const nextMin = Math.min(maxValue, v);
              updateData({
                minValue: nextMin,
                ...(allowOutOfRange ? {} : { currentValue: clampCurrentValue(currentValue, nextMin) })
              });
            }}
            fieldLabel={fieldLabels['minValue']}
            onFieldLabelChange={(l) => setFieldLabel('minValue', l)}
            formula={fieldFormulas['minValue']}
            onFormulaChange={(f) => setFieldFormula('minValue', f)}
            max={maxValue}
          />
        </div>
        <div>
          <LabeledNumberField
            displayLabel="Maximum Value"
            value={typeof maxValue === 'number' ? maxValue : 100}
            onChange={(v) => {
              const nextMax = Math.max(minValue, v);
              updateData({
                maxValue: nextMax,
                ...(allowOutOfRange ? {} : { currentValue: clampCurrentValue(currentValue, minValue, nextMax) })
              });
            }}
            fieldLabel={fieldLabels['maxValue']}
            onFieldLabelChange={(l) => setFieldLabel('maxValue', l)}
            formula={fieldFormulas['maxValue']}
            onFormulaChange={(f) => setFieldFormula('maxValue', f)}
            min={minValue}
          />
        </div>
      </div>

      <div>
        <label htmlFor={`progress-fill-color-${widget.id}`} className="block text-sm font-medium text-theme-ink mb-1">
          Filled Bar Color
        </label>
        <div className="flex items-center gap-2">
          <div
            className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-button border border-theme-border bg-theme-accent"
            style={fillColor ? { backgroundColor: fillColor } : undefined}
          >
            <input
              id={`progress-fill-color-${widget.id}`}
              type="color"
              value={fillColor || '#2563eb'}
              onChange={(e) => updateData({ fillColor: e.target.value })}
              className="absolute -inset-1 h-12 w-12 cursor-pointer opacity-0"
            />
          </div>
          {fillColor ? (
            <>
              <span className="flex-1 text-sm text-theme-ink">{fillColor.toUpperCase()}</span>
              <button
                type="button"
                onClick={() => updateData({ fillColor: undefined })}
                className="widget-control px-3 py-2 text-sm"
              >
                Use theme color
              </button>
            </>
          ) : (
            <span className="text-sm text-theme-muted">Theme color</span>
          )}
        </div>
      </div>

      {showIncrementButtons && (
        <>
          <LabeledNumberField
            displayLabel="Button Increment"
            value={typeof widget.data.increment === 'number' ? widget.data.increment : 1}
            onChange={(v) => updateData({ increment: Math.max(1, v) })}
            fieldLabel={fieldLabels['increment']}
            onFieldLabelChange={(l) => setFieldLabel('increment', l)}
            formula={fieldFormulas['increment']}
            onFormulaChange={(f) => setFieldFormula('increment', f)}
            min={1}
          />
          <p className="text-xs text-theme-muted -mt-3">Amount changed by +/− buttons and arrow keys</p>
        </>
      )}

      <div className="border border-theme-border rounded-theme p-3">
        <h4 className="font-medium text-theme-ink mb-3">Display Options</h4>

        <label className="flex items-center gap-2 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={showIncrementButtons}
            onChange={(e) => updateData({ showIncrementButtons: e.target.checked })}
            className="w-4 h-4 accent-theme-accent"
          />
          <span className="text-sm text-theme-ink">Show +/− buttons</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={verticalBar}
            onChange={(e) => {
              const enabled = e.target.checked;
              updateData({ verticalBar: enabled, ...(enabled ? { inlineLabel: false } : {}) });
            }}
            className="w-4 h-4 accent-theme-accent"
          />
          <span className="text-sm text-theme-ink">Vertical progress bar</span>
        </label>

        {!verticalBar && (
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={inlineLabel}
              onChange={(e) => updateData({ inlineLabel: e.target.checked })}
              className="w-4 h-4 accent-theme-accent"
            />
            <span className="text-sm text-theme-ink">Show label inline with bar</span>
          </label>
        )}

        <label className="flex items-center gap-2 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={allowOutOfRange}
            onChange={(e) => {
              const enabled = e.target.checked;
              updateData({
                allowOutOfRange: enabled,
                ...(enabled ? {} : { currentValue: clampCurrentValue(currentValue) })
              });
            }}
            className="w-4 h-4 accent-theme-accent"
          />
          <span className="text-sm text-theme-ink">Allow values outside minimum to maximum</span>
        </label>
        
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

