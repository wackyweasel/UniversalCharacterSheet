import { EditorProps } from './types';
import { CollapsibleSection } from './CollapsibleSection';
import { TextFormulaControls } from './TextFormulaControls';

export function ToggleEditor({ widget, updateData }: EditorProps) {
  const {
    toggleColor,
    inlineLabel = false,
    fieldLabels = {},
    fieldFormulas = {},
  } = widget.data;

  const setStateLabel = (value: string | undefined) => {
    const nextLabels = { ...fieldLabels };
    if (value?.trim()) nextLabels.state = value.trim();
    else delete nextLabels.state;
    updateData({ fieldLabels: nextLabels });
  };

  const setStateFormula = (formula: string | undefined) => {
    const nextFormulas = { ...fieldFormulas };
    if (formula) nextFormulas.state = formula;
    else delete nextFormulas.state;
    updateData({ fieldFormulas: nextFormulas });
  };

  return (
    <div className="widget-editor widget-editor--toggle space-y-4">

      <CollapsibleSection>
        <div className="widget-editor__section-heading">
          <h3 id="toggle-logic-title" className="widget-editor__section-title">Logic &amp; color</h3>
        </div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-theme-ink">Formula label &amp; formula</span>
          <div className="flex items-center gap-2">
            <TextFormulaControls
              valueLabel={fieldLabels.state}
              formula={fieldFormulas.state}
              onValueLabelChange={setStateLabel}
              onFormulaChange={setStateFormula}
              resultType="number"
            />
          </div>
        </div>
        <p className="widget-editor__hint mt-2 text-xs text-theme-muted">Use the label in formulas: 1 when on, 0 when off. With a formula, the switch is on unless the result is 0.</p>

        <div className="mt-3">
          <label htmlFor={`toggle-color-${widget.id}`} className="mb-1 block text-sm font-medium text-theme-ink">
            On color
          </label>
          <div className="flex items-center gap-2">
            <div
              className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-button border border-theme-border bg-theme-accent"
              style={toggleColor ? { backgroundColor: toggleColor } : undefined}
            >
              <input
                id={`toggle-color-${widget.id}`}
                type="color"
                value={toggleColor || '#2563eb'}
                onChange={(event) => updateData({ toggleColor: event.target.value })}
                className="absolute -inset-1 h-12 w-12 cursor-pointer opacity-0"
              />
            </div>
            {toggleColor ? (
              <>
                <span className="flex-1 text-sm text-theme-ink">{toggleColor.toUpperCase()}</span>
                <button type="button" onClick={() => updateData({ toggleColor: undefined })} className="widget-control px-3 py-2 text-sm">
                  Use theme color
                </button>
              </>
            ) : (
              <span className="text-sm text-theme-muted">Theme color</span>
            )}
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Display options">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={inlineLabel}
            onChange={(event) => updateData({ inlineLabel: event.target.checked })}
            className="h-4 w-4 accent-theme-accent"
          />
          <span className="text-sm text-theme-ink">Show label inline with switch</span>
        </label>
      </CollapsibleSection>
    </div>
  );
}