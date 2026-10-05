import { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { FormulaEditorDialog } from '../FormulaEditorDialog';
import { Tooltip } from '../Tooltip';
import { VariableLabelControl } from '../VariableLabelControl';

interface TextFormulaControlsProps {
  valueLabel?: string;
  formula?: string;
  onValueLabelChange: (label: string | undefined) => void;
  onFormulaChange: (formula: string | undefined) => void;
  sizeClassName?: string;
}

/** Variable label and text-result formula buttons for editable text values. */
export function TextFormulaControls({ valueLabel, formula, onValueLabelChange, onFormulaChange, sizeClassName = 'h-8 w-8' }: TextFormulaControlsProps) {
  const [showFormula, setShowFormula] = useState(false);
  const characters = useStore((state) => state.characters);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const character = useMemo(
    () => characters.find((item) => item.id === activeCharacterId),
    [characters, activeCharacterId],
  );
  const hasFormula = Boolean(formula?.trim());

  return (
    <>
      <VariableLabelControl valueLabel={valueLabel} onValueLabelChange={onValueLabelChange} sizeClassName={sizeClassName} />
      <Tooltip content={formula ? `Formula: ${formula}` : 'Set formula'}>
        <button
          type="button"
          onClick={() => setShowFormula(true)}
          aria-label={formula ? 'Edit formula' : 'Set formula'}
          aria-pressed={hasFormula}
          className={`flex ${sizeClassName} flex-shrink-0 items-center justify-center rounded-button border text-xs font-bold transition-colors ${
            hasFormula
              ? 'border-theme-accent bg-theme-accent text-theme-paper shadow-theme'
              : 'border-theme-border text-theme-muted hover:border-theme-accent hover:text-theme-ink'
          }`}
        >
          <span className="italic" style={{ fontSize: '11px' }}>fx</span>
        </button>
      </Tooltip>
      {showFormula && (
        <FormulaEditorDialog
          formula={formula}
          character={character}
          sourceLabels={valueLabel ? [valueLabel] : []}
          resultType="text"
          onApply={(next) => {
            onFormulaChange(next);
            setShowFormula(false);
          }}
          onClear={formula ? () => {
            onFormulaChange(undefined);
            setShowFormula(false);
          } : undefined}
          onCancel={() => setShowFormula(false)}
        />
      )}
    </>
  );
}
