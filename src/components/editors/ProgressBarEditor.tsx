import { EditorProps } from './types';
import { LabeledNumberField } from './LabeledNumberField';
import { Tooltip } from '../Tooltip';

export function ProgressBarEditor({ widget, updateData }: EditorProps) {
  const { 
    label, 
    maxValue = 100, 
    currentValue = 0,
    showPercentage = false,
    showValues = true,
    allowOutOfRange = false,
    fieldLabels = {},
    fieldFormulas = {}
  } = widget.data;

  const clampCurrentValue = (value: number, maximum = maxValue) => Math.max(0, Math.min(maximum, value));

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
            min={allowOutOfRange ? undefined : 0}
            max={allowOutOfRange ? undefined : maxValue}
          />
        </div>
        <div>
          <LabeledNumberField
            displayLabel="Maximum Value"
            value={typeof maxValue === 'number' ? maxValue : 100}
            onChange={(v) => {
              const nextMax = Math.max(1, v);
              updateData({
                maxValue: nextMax,
                ...(allowOutOfRange ? {} : { currentValue: clampCurrentValue(currentValue, nextMax) })
              });
            }}
            fieldLabel={fieldLabels['maxValue']}
            onFieldLabelChange={(l) => setFieldLabel('maxValue', l)}
            formula={fieldFormulas['maxValue']}
            onFormulaChange={(f) => setFieldFormula('maxValue', f)}
            min={1}
          />
        </div>
      </div>

      <div className="border border-theme-border rounded-button p-3">
        <h4 className="font-medium text-theme-ink mb-3">Display Options</h4>

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
          <span className="text-sm text-theme-ink">Allow values outside 0 to max</span>
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

