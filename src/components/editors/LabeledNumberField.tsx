import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { evaluateFormula, collectLabels, getAvailableLabels, detectCircularReference } from '../../utils/formulaEngine';

interface LabeledNumberFieldProps {
  /** Current numeric value */
  value: number;
  /** Callback when value changes (manual edit or +/- buttons) */
  onChange: (value: number) => void;
  /** The variable label assigned to this field (e.g. "str") */
  fieldLabel?: string;
  /** Callback to set/clear the variable label */
  onFieldLabelChange: (label: string | undefined) => void;
  /** The formula string (e.g. "@str * 2") */
  formula?: string;
  /** Callback to set/clear the formula */
  onFormulaChange: (formula: string | undefined) => void;
  /** Display label shown above the field */
  displayLabel?: string;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** Step for +/- buttons */
  step?: number;
  /** Placeholder text */
  placeholder?: string;
  /** Additional class names */
  className?: string;
  /** Whether to show compact (inline) style */
  compact?: boolean;
}

export function LabeledNumberField({
  value,
  onChange,
  fieldLabel,
  onFieldLabelChange,
  formula,
  onFormulaChange,
  displayLabel,
  min,
  max,
  step = 1,
  placeholder,
  className = '',
  compact = false,
}: LabeledNumberFieldProps) {
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [showFormulaInput, setShowFormulaInput] = useState(false);
  const [labelDraft, setLabelDraft] = useState(fieldLabel || '');
  const [formulaDraft, setFormulaDraft] = useState(formula || '');

  // Get all available labels from the character
  const characters = useStore(state => state.characters);
  const activeCharacterId = useStore(state => state.activeCharacterId);

  const activeChar = useMemo(
    () => characters.find(c => c.id === activeCharacterId),
    [characters, activeCharacterId]
  );

  const availableLabels = useMemo(
    () => activeChar ? getAvailableLabels(activeChar) : [],
    [activeChar]
  );

  // Check for self-referencing formula
  const isSelfReferencing = useMemo(() => {
    if (!formulaDraft || !fieldLabel) return false;
    const refs = formulaDraft.match(/@([a-zA-Z_][a-zA-Z0-9_]*)/g);
    if (!refs) return false;
    return refs.some(r => r.slice(1) === fieldLabel);
  }, [formulaDraft, fieldLabel]);

  // Check for circular references
  const circularPath = useMemo(() => {
    if (!formulaDraft || !fieldLabel || !activeChar || isSelfReferencing) return null;
    return detectCircularReference(fieldLabel, formulaDraft, activeChar);
  }, [formulaDraft, fieldLabel, activeChar, isSelfReferencing]);

  const isCircular = isSelfReferencing || circularPath !== null;

  // Preview formula evaluation
  const formulaPreview = useMemo(() => {
    if (!formulaDraft || !activeChar) return null;
    if (isCircular) return null;
    const labels = collectLabels(activeChar);
    return evaluateFormula(formulaDraft, labels);
  }, [formulaDraft, activeChar, isCircular]);

  const hasFormula = !!formula;

  const handleIncrement = () => {
    if (hasFormula) return;
    const newVal = value + step;
    onChange(max !== undefined ? Math.min(max, newVal) : newVal);
  };

  const handleDecrement = () => {
    if (hasFormula) return;
    const newVal = value - step;
    onChange(min !== undefined ? Math.max(min, newVal) : newVal);
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (hasFormula) return;
    const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
    onChange(val);
  };

  const handleValueBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (hasFormula) return;
    let val = parseInt(e.target.value) || 0;
    if (min !== undefined) val = Math.max(min, val);
    if (max !== undefined) val = Math.min(max, val);
    onChange(val);
  };

  const confirmLabel = () => {
    const trimmed = labelDraft.trim().replace(/\s+/g, '_');
    onFieldLabelChange(trimmed || undefined);
    setShowLabelInput(false);
  };

  const clearLabel = () => {
    setLabelDraft('');
    onFieldLabelChange(undefined);
    setShowLabelInput(false);
  };

  const confirmFormula = () => {
    if (isCircular) return;
    const trimmed = formulaDraft.trim();
    onFormulaChange(trimmed || undefined);
    setShowFormulaInput(false);
  };

  const clearFormula = () => {
    setFormulaDraft('');
    onFormulaChange(undefined);
    setShowFormulaInput(false);
  };

  const openLabelInput = () => {
    setLabelDraft(fieldLabel || '');
    setShowLabelInput(true);
    setShowFormulaInput(false);
  };

  const openFormulaInput = () => {
    setFormulaDraft(formula || '');
    setShowFormulaInput(true);
    setShowLabelInput(false);
  };

  return (
    <div className={`${className}`}>
      {displayLabel && (
        <label className="block text-sm font-medium text-theme-ink mb-1">{displayLabel}</label>
      )}

      {/* Main row: [-] [value] [+] [label] [fx] */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={hasFormula}
          className={`w-7 h-7 flex items-center justify-center border border-theme-border rounded-button text-sm font-bold transition-colors ${
            hasFormula
              ? 'opacity-40 cursor-not-allowed text-theme-muted'
              : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
          }`}
        >
          −
        </button>

        <input
          type="number"
          value={value}
          onChange={handleValueChange}
          onBlur={handleValueBlur}
          readOnly={hasFormula}
          min={min}
          max={max}
          placeholder={placeholder}
          className={`px-2 py-1 border border-theme-border rounded-button text-theme-ink text-sm text-center focus:outline-none focus:border-theme-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
            compact ? 'w-[6rem]' : 'flex-1 min-w-[60px]'
          } ${
            hasFormula
              ? 'bg-theme-accent/10 cursor-default'
              : 'bg-theme-paper'
          } ${compact ? 'h-7' : ''}`}
        />

        <button
          type="button"
          onClick={handleIncrement}
          disabled={hasFormula}
          className={`w-7 h-7 flex items-center justify-center border border-theme-border rounded-button text-sm font-bold transition-colors ${
            hasFormula
              ? 'opacity-40 cursor-not-allowed text-theme-muted'
              : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
          }`}
        >
          +
        </button>

        {/* Label button */}
        <button
          type="button"
          onClick={openLabelInput}
          title={fieldLabel ? `Label: @${fieldLabel}` : 'Set variable label'}
          className={`w-7 h-7 flex items-center justify-center border rounded-button text-xs transition-colors ${
            fieldLabel
              ? 'border-theme-accent bg-theme-accent/20 text-theme-accent'
              : 'border-theme-border text-theme-muted hover:text-theme-ink hover:border-theme-accent'
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
        </button>

        {/* Formula button */}
        <button
          type="button"
          onClick={openFormulaInput}
          title={formula ? `Formula: ${formula}` : 'Set formula'}
          className={`w-7 h-7 flex items-center justify-center border rounded-button text-xs font-bold transition-colors ${
            formula
              ? 'border-theme-accent bg-theme-accent/20 text-theme-accent'
              : 'border-theme-border text-theme-muted hover:text-theme-ink hover:border-theme-accent'
          }`}
        >
          <span className="italic" style={{ fontSize: '11px' }}>fx</span>
        </button>
      </div>

      {/* Active label/formula tags (compact inline display) — hidden in compact mode */}
      {!compact && (fieldLabel || formula) && !showLabelInput && !showFormulaInput && (
        <div className="flex flex-wrap items-center gap-1 mt-1">
          {fieldLabel && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-theme-accent/15 text-theme-accent border border-theme-accent/30">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
              @{fieldLabel}
            </span>
          )}
          {formula && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-theme-accent/15 text-theme-accent border border-theme-accent/30">
              <span className="italic font-bold" style={{ fontSize: '9px' }}>fx</span>
              {formula}
              <span className="text-theme-muted ml-0.5">= {value}</span>
            </span>
          )}
        </div>
      )}

      {/* Label input popover */}
      {showLabelInput && (
        <div className="mt-1.5 p-2 border border-theme-accent/50 rounded-button bg-theme-paper shadow-sm">
          <div className="flex items-center gap-1 mb-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-theme-accent shrink-0">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            <span className="text-xs font-medium text-theme-ink">Variable Label</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-theme-muted">@</span>
            <input
              type="text"
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmLabel();
                if (e.key === 'Escape') setShowLabelInput(false);
              }}
              placeholder="e.g. str, max_hp"
              className="flex-1 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-xs focus:outline-none focus:border-theme-accent"
              autoFocus
            />
            <button
              type="button"
              onClick={confirmLabel}
              className="px-2 py-1 bg-theme-accent text-theme-paper rounded-button text-xs hover:opacity-90"
            >
              Set
            </button>
            {fieldLabel && (
              <button
                type="button"
                onClick={clearLabel}
                className="px-2 py-1 border border-red-300 text-red-500 rounded-button text-xs hover:bg-red-50"
              >
                ×
              </button>
            )}
          </div>
          <p className="text-[10px] text-theme-muted mt-1">
            Others can reference this as <span className="font-mono">@{labelDraft || 'name'}</span> in formulas
          </p>
        </div>
      )}

      {/* Formula input popover */}
      {showFormulaInput && (
        <div className="mt-1.5 p-2 border border-theme-accent/50 rounded-button bg-theme-paper shadow-sm">
          <div className="flex items-center gap-1 mb-1.5">
            <span className="italic font-bold text-theme-accent text-xs">fx</span>
            <span className="text-xs font-medium text-theme-ink">Formula</span>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={formulaDraft}
              onChange={(e) => setFormulaDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmFormula();
                if (e.key === 'Escape') setShowFormulaInput(false);
              }}
              placeholder="e.g. @str * 2 + 5"
              className="flex-1 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-xs font-mono focus:outline-none focus:border-theme-accent"
              autoFocus
            />
            <button
              type="button"
              onClick={confirmFormula}
              disabled={isCircular}
              className={`px-2 py-1 bg-theme-accent text-theme-paper rounded-button text-xs hover:opacity-90 ${
                isCircular ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              Set
            </button>
            {formula && (
              <button
                type="button"
                onClick={clearFormula}
                className="px-2 py-1 border border-red-300 text-red-500 rounded-button text-xs hover:bg-red-50"
              >
                ×
              </button>
            )}
          </div>

          {/* Self-reference warning */}
          {isSelfReferencing && (
            <p className="text-[10px] text-red-500 mt-1">
              A formula cannot reference its own label (@{fieldLabel})
            </p>
          )}

          {/* Circular reference warning */}
          {!isSelfReferencing && circularPath && (
            <p className="text-[10px] text-red-500 mt-1">
              Circular reference detected: {circularPath.map(l => `@${l}`).join(' → ')}
            </p>
          )}

          {/* Formula preview */}
          {formulaDraft && !isCircular && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-[10px] text-theme-muted">Result:</span>
              <span className={`text-xs font-bold ${formulaPreview !== null ? 'text-theme-accent' : 'text-red-500'}`}>
                {formulaPreview !== null ? formulaPreview : 'Invalid'}
              </span>
            </div>
          )}

          {/* Available labels */}
          {availableLabels.length > 0 && (
            <div className="mt-1.5">
              <p className="text-[10px] text-theme-muted mb-1">Available labels (click to insert):</p>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                {availableLabels.filter(l => l.label !== fieldLabel).map((l, i) => (
                  <button
                    key={`${l.label}-${i}`}
                    type="button"
                    onClick={() => setFormulaDraft(prev => prev + `@${l.label}`)}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-theme-accent/10 text-theme-accent border border-theme-accent/20 hover:bg-theme-accent/25 transition-colors cursor-pointer"
                    title={`${l.widgetLabel} (${l.sheetName}) = ${l.value}`}
                  >
                    @{l.label}
                    <span className="text-theme-muted ml-0.5">={l.value}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] text-theme-muted mt-1">
            Use @label to reference values. Supports +, −, *, /, parentheses, floor(), ceil(), round()
          </p>
        </div>
      )}
    </div>
  );
}
