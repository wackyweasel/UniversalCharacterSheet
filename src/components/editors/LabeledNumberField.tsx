import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { TUTORIAL_STEPS, useTutorialStore } from '../../store/useTutorialStore';
import { Tooltip } from '../Tooltip';
import { FormulaEditorDialog } from '../FormulaEditorDialog';
import { XIcon } from '../icons';
import { formatNumberWithSign, hasExplicitPositiveSign } from '../../utils/numberFormatting';

interface LabeledNumberFieldProps {
  /** Current numeric value */
  value?: number;
  /** Callback when value changes (manual edit or +/- buttons) */
  onChange: (value: number, hasExplicitPositiveSign?: boolean) => void;
  /** Callback when an optional field is cleared */
  onClear?: () => void;
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
  /** Allow the input to remain blank while a replacement number is being typed */
  allowEmpty?: boolean;
  /** Additional class names */
  className?: string;
  /** Whether to show compact (inline) style */
  compact?: boolean;
  /** Height preset for the numeric input and inline action buttons */
  controlHeight?: 'compact' | 'input';
  /** Hide the +/- buttons while keeping label/formula controls */
  hideStepperButtons?: boolean;
  /** Lock the numeric value while retaining its label control */
  readOnlyValue?: boolean;
  /** Preserve an explicitly typed + prefix for this value */
  preservePositiveSign?: boolean;
  /** Whether this value currently has an explicitly typed + prefix */
  showPositiveSign?: boolean;
  /** Callback to toggle the explicit + prefix */
  onPositiveSignChange?: (showPositiveSign: boolean) => void;
  /** Hide formula editing for values controlled by another input */
  hideFormulaButton?: boolean;
  radius?: 'button' | 'theme';
  /** Optional prefix for tutorial targets exposed by this field's tag/formula controls */
  tutorialTargetPrefix?: string;
  /** When provided, the controls are passed to this render function so the parent
   *  can place drag-handle, name input, delete button etc. on the SAME row.
   *  Popovers are rendered below that row automatically. */
  renderRow?: (props: { controls: React.ReactNode }) => React.ReactNode;
}

export function LabeledNumberField({
  value,
  onChange,
  onClear,
  fieldLabel,
  onFieldLabelChange,
  formula,
  onFormulaChange,
  displayLabel,
  min,
  max,
  step = 1,
  placeholder,
  allowEmpty = false,
  className = '',
  compact = false,
  controlHeight = 'compact',
  hideStepperButtons = false,
  readOnlyValue = false,
  preservePositiveSign = false,
  showPositiveSign = false,
  onPositiveSignChange,
  hideFormulaButton = false,
  radius = 'button',
  tutorialTargetPrefix,
  renderRow,
}: LabeledNumberFieldProps) {
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [showFormulaInput, setShowFormulaInput] = useState(false);
  const [labelDraft, setLabelDraft] = useState(fieldLabel || '');
  const [valueDraft, setValueDraft] = useState(() => (
    value === undefined ? '' : formatNumberWithSign(value, preservePositiveSign && showPositiveSign)
  ));
  const editingValueRef = useRef(false);
  const controlHeightClass = controlHeight === 'input' ? 'h-10' : 'h-7';
  const controlWidthClass = controlHeight === 'input' ? 'w-10' : 'w-7';

  useEffect(() => {
    if ((!allowEmpty && !preservePositiveSign) || !editingValueRef.current) {
      setValueDraft(value === undefined ? '' : formatNumberWithSign(value, preservePositiveSign && showPositiveSign));
    }
  }, [allowEmpty, preservePositiveSign, showPositiveSign, value]);
  const tutorialStep = useTutorialStore((state) => state.tutorialStep);
  const advanceTutorial = useTutorialStore((state) => state.advanceTutorial);
  const isCurrentTutorialStep = (id: string) => tutorialStep !== null && TUTORIAL_STEPS[tutorialStep]?.id === id;

  // Get all available labels from the character
  const characters = useStore(state => state.characters);
  const activeCharacterId = useStore(state => state.activeCharacterId);

  const activeChar = useMemo(
    () => characters.find(c => c.id === activeCharacterId),
    [characters, activeCharacterId]
  );

  const hasLabel = Boolean(fieldLabel?.trim());
  const hasFormula = Boolean(formula?.trim());
  const hasValidLabelDraft = labelDraft.trim().replace(/\s+/g, '_').length > 0;
  const shouldHighlightStrengthTagButton = tutorialTargetPrefix === 'automation-strength' && isCurrentTutorialStep('automation-strength-tag-button');
  const shouldHighlightStrengthTagConfirm = tutorialTargetPrefix === 'automation-strength' && isCurrentTutorialStep('automation-set-strength-tag') && hasValidLabelDraft;
  const shouldHighlightDiceFormulaButton = tutorialTargetPrefix === 'automation-dice-modifier' && isCurrentTutorialStep('automation-dice-formula-button');
  const shouldHighlightDiceFormulaConfirm = tutorialTargetPrefix === 'automation-dice-modifier' && isCurrentTutorialStep('automation-type-dice-formula');
  const radiusClass = radius === 'theme' ? 'rounded-theme' : 'rounded-button';

  const handleIncrement = () => {
    if (hasFormula || readOnlyValue) return;
    const newVal = (value ?? 0) + step;
    onChange(max !== undefined ? Math.min(max, newVal) : newVal);
  };

  const handleDecrement = () => {
    if (hasFormula || readOnlyValue) return;
    const newVal = (value ?? 0) - step;
    onChange(min !== undefined ? Math.max(min, newVal) : newVal);
  };

  const notifyValueChange = (nextValue: number, rawValue?: string) => {
    if (preservePositiveSign && rawValue !== undefined) {
      onChange(nextValue, hasExplicitPositiveSign(rawValue));
      return;
    }
    onChange(nextValue);
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (hasFormula || readOnlyValue) return;
    const rawValue = e.target.value;
    if (allowEmpty || preservePositiveSign) {
      setValueDraft(rawValue);
      if (rawValue === '') {
        onClear?.();
        if (!onClear) notifyValueChange(0, preservePositiveSign ? rawValue : undefined);
        return;
      }
      const parsedValue = parseFloat(rawValue);
      if (Number.isFinite(parsedValue)) {
        notifyValueChange(parsedValue, rawValue);
      }
      return;
    }
    if (rawValue === '' && onClear) {
      onClear();
      return;
    }
    const val = rawValue === '' ? 0 : parseFloat(rawValue) || 0;
    notifyValueChange(val, rawValue);
  };

  const handleValueFocus = () => {
    if (!allowEmpty && !preservePositiveSign) return;
    editingValueRef.current = true;
    setValueDraft(value === undefined ? '' : formatNumberWithSign(value, preservePositiveSign && showPositiveSign));
  };

  const handleValueBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (hasFormula || readOnlyValue) return;
    const rawValue = allowEmpty || preservePositiveSign ? valueDraft : e.target.value;
    editingValueRef.current = false;
    if (rawValue === '' && onClear) {
      if (allowEmpty) setValueDraft('');
      return;
    }
    let val = parseFloat(rawValue) || 0;
    if (min !== undefined) val = Math.max(min, val);
    if (max !== undefined) val = Math.min(max, val);
    const nextShowPositiveSign = preservePositiveSign ? hasExplicitPositiveSign(rawValue) : undefined;
    notifyValueChange(val, preservePositiveSign ? rawValue : undefined);
    if (allowEmpty || preservePositiveSign) {
      setValueDraft(formatNumberWithSign(val, nextShowPositiveSign === true));
    }
  };

  const confirmLabel = () => {
    const trimmed = labelDraft.trim().replace(/\s+/g, '_');
    onFieldLabelChange(trimmed || undefined);
    setShowLabelInput(false);
    if (tutorialTargetPrefix === 'automation-strength' && isCurrentTutorialStep('automation-set-strength-tag') && hasValidLabelDraft) {
      advanceTutorial();
    }
  };

  const clearLabel = () => {
    setLabelDraft('');
    onFieldLabelChange(undefined);
    setShowLabelInput(false);
  };

  const cancelLabelEditing = () => {
    setLabelDraft(fieldLabel || '');
    setShowLabelInput(false);
  };

  const confirmFormula = (nextFormula: string) => {
    onFormulaChange(nextFormula);
    setShowFormulaInput(false);
    if (tutorialTargetPrefix === 'automation-dice-modifier' && isCurrentTutorialStep('automation-type-dice-formula')) {
      advanceTutorial();
    }
  };

  const clearFormula = () => {
    onFormulaChange(undefined);
    setShowFormulaInput(false);
  };

  const openLabelInput = () => {
    setLabelDraft(fieldLabel || '');
    setShowLabelInput(true);
    setShowFormulaInput(false);
    if (tutorialTargetPrefix === 'automation-strength' && isCurrentTutorialStep('automation-strength-tag-button')) {
      advanceTutorial();
    }
  };

  const openFormulaInput = () => {
    setShowFormulaInput(true);
    setShowLabelInput(false);
    if (tutorialTargetPrefix === 'automation-dice-modifier' && isCurrentTutorialStep('automation-dice-formula-button')) {
      advanceTutorial();
    }
  };

  /* ---- build the inline controls (buttons + number input) ---- */
  const controls = (
    <div className="flex items-center gap-1 flex-shrink-0">
      {!hideStepperButtons && (
        <button
          type="button"
          onClick={handleDecrement}
          disabled={hasFormula}
          className={`${controlWidthClass} ${controlHeightClass} flex items-center justify-center border border-theme-border rounded-button text-sm font-bold transition-colors ${
            hasFormula
              ? 'opacity-40 cursor-not-allowed text-theme-muted'
              : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
          }`}
        >
          −
        </button>
      )}

        <input
          type={preservePositiveSign ? 'text' : 'number'}
          inputMode={preservePositiveSign ? 'decimal' : undefined}
          value={allowEmpty || preservePositiveSign ? valueDraft : value ?? ''}
          onChange={handleValueChange}
          onFocus={handleValueFocus}
          onBlur={handleValueBlur}
          readOnly={hasFormula || readOnlyValue}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          className={`px-2 py-1 border border-theme-border ${radiusClass} font-body text-theme-ink text-sm text-center focus:outline-none focus:border-theme-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
            compact ? (hideStepperButtons ? 'w-14' : 'w-[6rem]') : 'flex-1 min-w-[60px]'
          } ${
            hasFormula || readOnlyValue
              ? 'bg-theme-accent/10 cursor-default'
              : 'bg-theme-paper'
          } ${controlHeightClass}`}
        />

      {!hideStepperButtons && (
        <button
          type="button"
          onClick={handleIncrement}
          disabled={hasFormula}
          className={`${controlWidthClass} ${controlHeightClass} flex items-center justify-center border border-theme-border rounded-button text-sm font-bold transition-colors ${
            hasFormula
              ? 'opacity-40 cursor-not-allowed text-theme-muted'
              : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
          }`}
        >
          +
        </button>
      )}

        {/* Label button */}
        <Tooltip content={fieldLabel ? `Label: @${fieldLabel}` : 'Set variable label'}>
          <button
            data-tutorial={tutorialTargetPrefix ? `${tutorialTargetPrefix}-tag-button` : undefined}
            type="button"
            onClick={openLabelInput}
            aria-pressed={hasLabel}
            className={`${controlWidthClass} ${controlHeightClass} flex items-center justify-center border rounded-button text-xs transition-colors ${
              showLabelInput
                ? 'border-theme-accent bg-theme-accent/30 text-theme-accent ring-1 ring-theme-accent'
                : hasLabel
                  ? 'border-theme-accent bg-theme-accent text-theme-paper shadow-theme'
                  : 'border-theme-border text-theme-muted hover:text-theme-ink hover:border-theme-accent'
                } ${shouldHighlightStrengthTagButton ? 'ring-4 ring-blue-500 ring-offset-1 bg-blue-500 text-white border-blue-500' : ''}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
          </button>
        </Tooltip>

        {!hideFormulaButton && (
        <Tooltip content={formula ? `Formula: ${formula}` : 'Set formula'}>
          <button
            data-tutorial={tutorialTargetPrefix ? `${tutorialTargetPrefix}-fx-button` : undefined}
            type="button"
            onClick={openFormulaInput}
            aria-pressed={hasFormula}
            className={`${controlWidthClass} ${controlHeightClass} flex items-center justify-center border rounded-button text-xs font-bold transition-colors ${
              showFormulaInput
                ? 'border-theme-accent bg-theme-accent/30 text-theme-accent ring-1 ring-theme-accent'
                : hasFormula
                  ? 'border-theme-accent bg-theme-accent text-theme-paper shadow-theme'
                  : 'border-theme-border text-theme-muted hover:text-theme-ink hover:border-theme-accent'
                } ${shouldHighlightDiceFormulaButton ? 'ring-4 ring-blue-500 ring-offset-1 bg-blue-500 text-white border-blue-500' : ''}`}
          >
            <span className="italic" style={{ fontSize: '11px' }}>fx</span>
          </button>
        </Tooltip>
        )}

        {preservePositiveSign && onPositiveSignChange && (
          <Tooltip content={showPositiveSign ? 'Hide positive sign' : 'Show positive sign'}>
            <button
              type="button"
              onClick={() => onPositiveSignChange(!showPositiveSign)}
              aria-label={showPositiveSign ? 'Hide positive sign' : 'Show positive sign'}
              aria-pressed={showPositiveSign}
              className={`${controlWidthClass} ${controlHeightClass} flex items-center justify-center border rounded-button text-xs font-bold transition-colors ${
                showPositiveSign
                  ? 'border-theme-accent bg-theme-accent text-theme-paper shadow-theme'
                  : 'border-theme-border text-theme-muted hover:text-theme-ink hover:border-theme-accent'
              }`}
            >
              +
            </button>
          </Tooltip>
        )}
    </div>
  );

  /* ---- build the popover / tag content ---- */
  const popovers = (
    <>

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
        <div className={`mt-1.5 p-2 border border-theme-accent/50 ${radiusClass} bg-theme-paper shadow-sm`}>
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
              data-tutorial={tutorialTargetPrefix ? `${tutorialTargetPrefix}-${hasValidLabelDraft ? 'tag-input' : 'tag-target'}` : undefined}
              type="text"
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmLabel();
                if (e.key === 'Escape') setShowLabelInput(false);
              }}
              placeholder="e.g. str, max_hp"
              className={`flex-1 px-2 py-1 border border-theme-border ${radiusClass} bg-theme-paper font-body text-theme-ink text-xs focus:outline-none focus:border-theme-accent`}
              autoFocus
            />
            <button
              data-tutorial={tutorialTargetPrefix ? `${tutorialTargetPrefix}-${hasValidLabelDraft ? 'tag-target' : 'tag-confirm'}` : undefined}
              type="button"
              onClick={confirmLabel}
              className={`${controlHeightClass} px-2 py-1 bg-theme-accent text-theme-paper rounded-button text-xs hover:opacity-90 ${shouldHighlightStrengthTagConfirm ? 'ring-4 ring-blue-500 ring-offset-1 font-bold' : ''}`}
            >
              Set
            </button>
            <button
              type="button"
              onClick={cancelLabelEditing}
              aria-label="Cancel label editing"
              title="Cancel label editing"
              className={`${controlWidthClass} ${controlHeightClass} flex items-center justify-center border border-theme-border rounded-button text-theme-muted hover:border-theme-accent hover:text-theme-ink`}
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
            {fieldLabel && (
              <button
                type="button"
                onClick={clearLabel}
                aria-label="Clear label"
                title="Clear label"
                className={`${controlWidthClass} ${controlHeightClass} border border-red-300 text-red-500 rounded-button text-xs hover:bg-red-50`}
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

      {/* Formula editor */}
      {showFormulaInput && (
        <FormulaEditorDialog
          formula={formula}
          character={activeChar}
          sourceLabels={fieldLabel ? [fieldLabel] : []}
          tutorialTargetPrefix={tutorialTargetPrefix}
          highlightApply={shouldHighlightDiceFormulaConfirm}
          onApply={confirmFormula}
          onClear={formula ? clearFormula : undefined}
          onCancel={() => setShowFormulaInput(false)}
        />
      )}
    </>
  );

  /* ---- render ---- */
  if (renderRow) {
    // Editor mode: parent supplies the full row layout; popovers go below.
    return (
      <div className={className}>
        {renderRow({ controls })}
        {popovers}
      </div>
    );
  }

  // Default (standalone) rendering
  return (
    <div className={className}>
      {displayLabel && (
        <label className="block text-sm font-medium text-theme-ink mb-1">{displayLabel}</label>
      )}
      {controls}
      {popovers}
    </div>
  );
}
