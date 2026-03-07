import { EditorProps } from './types';
import { LabeledNumberField } from './LabeledNumberField';
import { Tooltip } from '../Tooltip';

export function HealthBarEditor({ widget, updateData }: EditorProps) {
  const { label, maxValue = 10, currentValue = 0, fieldLabels = {}, fieldFormulas = {} } = widget.data;

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
            placeholder="Health"
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
      
      <LabeledNumberField
        displayLabel="Current Value"
        value={typeof currentValue === 'number' ? currentValue : 0}
        onChange={(v) => updateData({ currentValue: v })}
        fieldLabel={fieldLabels['currentValue']}
        onFieldLabelChange={(l) => setFieldLabel('currentValue', l)}
        formula={fieldFormulas['currentValue']}
        onFormulaChange={(f) => setFieldFormula('currentValue', f)}
        min={0}
      />

      <LabeledNumberField
        displayLabel="Maximum Value"
        value={typeof maxValue === 'number' ? maxValue : 10}
        onChange={(v) => updateData({ maxValue: Math.max(1, v) })}
        fieldLabel={fieldLabels['maxValue']}
        onFieldLabelChange={(l) => setFieldLabel('maxValue', l)}
        formula={fieldFormulas['maxValue']}
        onFormulaChange={(f) => setFieldFormula('maxValue', f)}
        min={1}
      />

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
      <p className="text-xs text-theme-muted -mt-3">Amount changed by +/− buttons</p>
    </div>
  );
}

