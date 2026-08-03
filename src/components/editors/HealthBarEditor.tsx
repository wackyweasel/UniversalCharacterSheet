import { EditorProps } from './types';
import { LabeledNumberField } from './LabeledNumberField';
import { Tooltip } from '../Tooltip';

export function HealthBarEditor({ widget, updateData }: EditorProps) {
  const { label, maxValue = 10, currentValue = 0, showIncrementButtons = true, fillColor, fieldLabels = {}, fieldFormulas = {} } = widget.data;

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

      <div>
        <label htmlFor={`health-fill-color-${widget.id}`} className="block text-sm font-medium text-theme-ink mb-1">
          Filled Bar Color
        </label>
        <div className="flex items-center gap-2">
          <div
            className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-button border border-theme-border bg-theme-accent"
            style={fillColor ? { backgroundColor: fillColor } : undefined}
          >
            <input
              id={`health-fill-color-${widget.id}`}
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

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={showIncrementButtons}
          onChange={(e) => updateData({ showIncrementButtons: e.target.checked })}
          className="w-4 h-4 accent-theme-accent"
        />
        <span className="text-sm text-theme-ink">Show +/− buttons</span>
      </label>

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
          <p className="text-xs text-theme-muted -mt-3">Amount changed by +/− buttons</p>
        </>
      )}
    </div>
  );
}

