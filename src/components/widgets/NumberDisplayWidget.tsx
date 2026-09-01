import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Widget, DisplayNumber } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { collectLabels, isFormulaBroken } from '../../utils/formulaEngine';
import { Tooltip } from '../Tooltip';
import { TUTORIAL_STEPS, useTutorialStore } from '../../store/useTutorialStore';
import { WidgetEmptyState } from './WidgetPrimitives';
import { AddMultipleToggle, SelectionActions } from './StructureDialogControls';
import { DEFAULT_MODIFIER_RANGES, formatSignedNumber, getModifierForValue } from '../../utils/modifierRanges';
import { formatNumberWithSign, hasExplicitPositiveSign } from '../../utils/numberFormatting';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
  showFieldControls?: boolean;
}

interface NumberEditDialog {
  index: number;
  current: string;
  minimum: string;
  maximum: string;
  secondary: string;
}

const parseOptionalNumber = (value: string) => {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

export default function NumberDisplayWidget({ widget, mode, width, height, showFieldControls = true }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const characters = useStore((state) => state.characters);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const isPrintMode = mode === 'print';
  const controlsVisible = showFieldControls && widget.data.showFieldControls !== false && !isPrintMode;
  const {
    label,
    displayNumbers = [],
    displayLayout = 'horizontal',
    numberBoxScale: numberBoxScaleSetting = 100,
    printSettings,
    showDisplayNumberMax = false,
    showDisplayNumberLabels = true,
    showSecondaryDisplayNumbers = false,
    secondaryDisplayAutoCompute = false,
    secondaryDisplayModifierRanges = DEFAULT_MODIFIER_RANGES,
  } = widget.data;
  const hideValues = isPrintMode && (printSettings?.hideValues ?? false);
  const [numberDialog, setNumberDialog] = useState<NumberEditDialog | null>(null);
  const [fieldDialog, setFieldDialog] = useState<'add' | 'remove' | null>(null);
  const [fieldNameDraft, setFieldNameDraft] = useState('');
  const [minimumDraft, setMinimumDraft] = useState('');
  const [maximumDraft, setMaximumDraft] = useState('');
  const [addMultiple, setAddMultiple] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<number>>(new Set());
  const tutorialStep = useTutorialStore((state) => state.tutorialStep);
  const advanceTutorial = useTutorialStore((state) => state.advanceTutorial);
  const isCurrentTutorialStep = (id: string) => tutorialStep !== null && TUTORIAL_STEPS[tutorialStep]?.id === id;

  const minimumDraftValue = minimumDraft.trim() === '' ? undefined : Number(minimumDraft);
  const maximumDraftValue = maximumDraft.trim() === '' ? undefined : Number(maximumDraft);
  const hasInvalidBounds = Number.isNaN(minimumDraftValue) || Number.isNaN(maximumDraftValue)
    || (minimumDraftValue !== undefined && maximumDraftValue !== undefined && minimumDraftValue > maximumDraftValue);

  const getRangeIssueMessage = (minimum?: number, maximum?: number) => {
    if (minimum !== undefined && maximum !== undefined) {
      return `Value must be between ${minimum} and ${maximum}.`;
    }
    if (minimum !== undefined) return `Value must be at least ${minimum}.`;
    return `Value must be at most ${maximum}.`;
  };

  const numberDialogItem = numberDialog ? (displayNumbers as DisplayNumber[])[numberDialog.index] : undefined;
  const numberDialogMinimum = numberDialog ? parseOptionalNumber(numberDialog.minimum) : undefined;
  const numberDialogMaximum = numberDialog ? parseOptionalNumber(numberDialog.maximum) : undefined;
  const numberDialogCurrent = numberDialog ? Number(numberDialog.current) : undefined;
  const numberDialogShowsManualSecondary = Boolean(
    numberDialogItem && showSecondaryDisplayNumbers && !secondaryDisplayAutoCompute && !numberDialogItem.secondaryValueFormula
  );
  const numberDialogSecondary = numberDialog ? Number(numberDialog.secondary) : undefined;
  const numberDialogHasInvalidBounds = Boolean(
    numberDialog && (
      Number.isNaN(numberDialogMinimum)
      || Number.isNaN(numberDialogMaximum)
      || (numberDialogMinimum !== undefined && numberDialogMaximum !== undefined && numberDialogMinimum > numberDialogMaximum)
    )
  );
  const numberDialogHasInvalidCurrent = Boolean(
    numberDialog && (numberDialog.current.trim() === '' || !Number.isFinite(numberDialogCurrent))
  );
  const numberDialogHasInvalidSecondary = numberDialogShowsManualSecondary && Boolean(
    numberDialog?.secondary.trim() === '' || !Number.isFinite(numberDialogSecondary)
  );
  const numberDialogRangeIssue = numberDialog && numberDialogCurrent !== undefined && Number.isFinite(numberDialogCurrent)
    && !numberDialogHasInvalidBounds
    && ((numberDialogMinimum !== undefined && numberDialogCurrent < numberDialogMinimum)
      || (numberDialogMaximum !== undefined && numberDialogCurrent > numberDialogMaximum))
    ? getRangeIssueMessage(numberDialogMinimum, numberDialogMaximum)
    : null;

  const labels = useMemo(() => {
    const char = characters.find(c => c.id === activeCharacterId);
    return char ? collectLabels(char) : {};
  }, [characters, activeCharacterId]);

  const constrainItemValue = (value: number, item: DisplayNumber) => {
    const { minValue, maxValue } = item;
    if (minValue !== undefined && maxValue !== undefined && minValue > maxValue) return value;
    if (minValue !== undefined) value = Math.max(minValue, value);
    if (maxValue !== undefined) value = Math.min(maxValue, value);
    return value;
  };

  const handleValueClick = (index: number, currentValue: number) => {
    const item = (displayNumbers as DisplayNumber[])[index];
    if (item.valueFormula) return;
    setNumberDialog({
      index,
      current: formatNumberWithSign(currentValue, item.showPositiveSign),
      minimum: item.minValue === undefined ? '' : String(item.minValue),
      maximum: item.maxValue === undefined ? '' : String(item.maxValue),
      secondary: String(item.secondaryValue ?? 0),
    });
  };

  const closeNumberDialog = () => {
    setNumberDialog(null);
  };

  const saveNumberDialog = () => {
    if (!numberDialog || !numberDialogItem || numberDialogHasInvalidBounds || numberDialogHasInvalidCurrent || numberDialogHasInvalidSecondary) return;

    const currentValue = numberDialogCurrent as number;
    const updatedItemWithBounds: DisplayNumber = {
      ...numberDialogItem,
      minValue: numberDialogMinimum,
      maxValue: numberDialogMaximum,
    };
    const constrainedValue = constrainItemValue(currentValue, updatedItemWithBounds);
    const modifier = secondaryDisplayAutoCompute
      ? getModifierForValue(constrainedValue, secondaryDisplayModifierRanges) ?? 0
      : undefined;
    const updatedItem: DisplayNumber = {
      ...updatedItemWithBounds,
      value: constrainedValue,
      showPositiveSign: hasExplicitPositiveSign(numberDialog.current),
      ...(modifier !== undefined ? { secondaryValue: modifier } : {}),
      ...(numberDialogShowsManualSecondary ? { secondaryValue: numberDialogSecondary } : {}),
    };
    const updated = [...displayNumbers] as DisplayNumber[];
    updated[numberDialog.index] = updatedItem;
    updateWidgetData(widget.id, { displayNumbers: updated });

    if (numberDialogItem.value !== constrainedValue) {
      addTimelineEvent(label || 'Number Display', 'NUMBER_DISPLAY', `${updatedItem.label}: ${numberDialogItem.value} → ${constrainedValue}`, '🔢');
      if (updatedItem.label === 'Strength' && isCurrentTutorialStep('automation-change-strength')) {
        advanceTutorial();
      }
    }
    if (numberDialogShowsManualSecondary && numberDialogItem.secondaryValue !== numberDialogSecondary) {
      addTimelineEvent(label || 'Number Display', 'NUMBER_DISPLAY', `${updatedItem.label} secondary: ${numberDialogItem.secondaryValue ?? 0} → ${numberDialogSecondary}`, '🔢');
    }
    closeNumberDialog();
  };

  const addField = () => {
    const fieldName = fieldNameDraft.trim();
    if (!fieldName || hasInvalidBounds) return;
    const newItem: DisplayNumber = {
      label: fieldName,
      value: 0,
      ...(showSecondaryDisplayNumbers ? { secondaryValue: 0 } : {}),
      ...(minimumDraftValue !== undefined ? { minValue: minimumDraftValue } : {}),
      ...(maximumDraftValue !== undefined ? { maxValue: maximumDraftValue } : {}),
    };
    newItem.value = constrainItemValue(newItem.value, newItem);
    updateWidgetData(widget.id, {
      displayNumbers: [...displayNumbers, newItem],
    });
    setFieldNameDraft('');
    if (!addMultiple) setFieldDialog(null);
  };

  const removeSelectedFields = () => {
    if (selectedFields.size === 0) return;
    const updated = (displayNumbers as DisplayNumber[]).filter((_, index) => !selectedFields.has(index));
    setNumberDialog(null);
    updateWidgetData(widget.id, { displayNumbers: updated });
    setSelectedFields(new Set());
    setFieldDialog(null);
  };

  const closeFieldDialog = () => {
    setFieldDialog(null);
    setFieldNameDraft('');
    setMinimumDraft('');
    setMaximumDraft('');
    setAddMultiple(false);
    setSelectedFields(new Set());
  };

  const toggleFieldSelection = (index: number) => {
    setSelectedFields((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  useEffect(() => {
    if (!fieldDialog) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeFieldDialog();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [fieldDialog]);

  useEffect(() => {
    if (!numberDialog) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeNumberDialog();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [numberDialog]);

  const isHorizontal = displayLayout === 'horizontal';
  const numberBoxScale = Math.min(100, Math.max(50, numberBoxScaleSetting)) / 100;
  const itemCount = displayNumbers.length || 1;
  
  // Font sizes based on available space
  const minDimension = Math.min(width / (isHorizontal ? itemCount : 1), height / (isHorizontal ? 1 : itemCount));
  const numberFontSize = Math.max(10, Math.min(20, minDimension * 0.25));
  const labelFontSize = Math.max(7, Math.min(10, minDimension * 0.12));
  const secondaryFontSize = Math.max(9, Math.min(15, minDimension * 0.18));

  return (
    <div className="flex h-full w-full flex-col gap-1 overflow-hidden">
      {(label || controlsVisible) && (
        <div className="widget-structure-header flex min-h-6 flex-shrink-0 items-center gap-2 pr-4">
          {label && (
            <div className="widget-structure-title min-w-0 flex-1 truncate">
              {label}
            </div>
          )}
          {controlsVisible && (
            <div className="number-display-widget__controls widget-structure-controls ml-auto flex flex-shrink-0 items-center gap-1">
              <Tooltip content={displayNumbers.length > 0 ? 'Choose displayed numbers to remove' : 'No displayed numbers to remove'}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFields(new Set());
                    setFieldDialog('remove');
                  }}
                  onMouseDown={(event) => event.stopPropagation()}
                  disabled={displayNumbers.length === 0}
                  aria-label="Choose displayed numbers to remove"
                  className="widget-control widget-control--subtle h-6 w-6 text-sm font-bold"
                >
                  −
                </button>
              </Tooltip>
              <Tooltip content="Add displayed number">
                <button
                  type="button"
                  onClick={() => {
                    setFieldNameDraft('');
                    setMinimumDraft('');
                    setMaximumDraft('');
                    setAddMultiple(false);
                    setFieldDialog('add');
                  }}
                  onMouseDown={(event) => event.stopPropagation()}
                  aria-label="Add displayed number"
                  className="widget-control widget-control--subtle h-6 w-6 text-sm font-bold"
                >
                  +
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      )}

      {/* Number Items Container - uses flex to distribute space */}
      <div 
        className={`flex-1 flex ${isHorizontal ? 'flex-row' : 'flex-col'} items-stretch justify-center gap-1 p-1 min-h-0 min-w-0 overflow-hidden`}
      >
        {(displayNumbers as DisplayNumber[]).map((item, idx) => {
          const formattedValue = formatNumberWithSign(item.value, item.showPositiveSign);
          const displayedValue = showDisplayNumberMax && item.maxValue !== undefined ? `${formattedValue}/${item.maxValue}` : formattedValue;

          return (
          <div 
            key={idx} 
            className={`relative flex flex-col items-center justify-center border border-theme-border rounded-theme bg-theme-paper overflow-visible ${isHorizontal ? 'flex-1' : 'flex-1'}`}
            style={{ 
              minWidth: isHorizontal ? `${30 * numberBoxScale}px` : undefined,
              maxWidth: isHorizontal ? `${70 * numberBoxScale}px` : undefined,
              minHeight: !isHorizontal ? `${30 * numberBoxScale}px` : undefined,
              maxHeight: !isHorizontal ? `${55 * numberBoxScale}px` : undefined,
              width: !isHorizontal ? `${100 * numberBoxScale}%` : undefined,
              height: isHorizontal ? `${100 * numberBoxScale}%` : undefined,
              padding: `${0.25 * numberBoxScale}rem`,
            }}
          >
            <span 
              data-tutorial={item.label === 'Strength' ? 'automation-strength-value' : undefined}
              className={`font-bold text-theme-ink transition-colors leading-none font-body ${showSecondaryDisplayNumbers ? '-translate-y-2' : ''} ${item.valueFormula ? 'cursor-default' : 'cursor-pointer hover:text-theme-accent'}`}
              style={{ fontSize: `${numberFontSize}px`, ...(hideValues ? { visibility: 'hidden' } : {}) }}
              data-print-hide={hideValues ? 'true' : undefined}
              onClick={() => handleValueClick(idx, item.value)}
              onMouseDown={(e) => e.stopPropagation()}
              role={item.valueFormula ? undefined : 'button'}
              tabIndex={item.valueFormula ? undefined : 0}
              aria-label={item.valueFormula ? undefined : `Edit ${item.label || 'value'}, currently ${displayedValue}`}
              onKeyDown={(e) => {
                if (!item.valueFormula && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleValueClick(idx, item.value);
                }
              }}
            >
              {displayedValue}
              {item.valueFormula && isFormulaBroken(item.valueFormula, labels) && (
                <span className="text-red-500 ml-0.5 text-[9px]" title={`Broken formula: ${item.valueFormula}`}>⚠</span>
              )}
            </span>
            
            {showDisplayNumberLabels && (
              <span 
                className={`w-full truncate px-1 text-center font-body leading-tight text-theme-muted ${showSecondaryDisplayNumbers ? '-translate-y-2' : ''}`}
                style={{ fontSize: `${labelFontSize}px` }}
              >
                {mode === 'play' && item.tooltip ? (
                  <Tooltip content={item.tooltip}><span>{item.label}</span></Tooltip>
                ) : item.label}
              </span>
            )}

            {showSecondaryDisplayNumbers && (
              secondaryDisplayAutoCompute || item.secondaryValueFormula || isPrintMode ? (
                <span
                  className="absolute -bottom-1 -right-1 z-[1] flex min-h-6 min-w-7 items-center justify-center rounded-theme border border-theme-border bg-theme-paper px-1.5 font-body font-bold leading-[0] text-theme-ink"
                  style={{ fontSize: `${secondaryFontSize}px`, ...(hideValues ? { visibility: 'hidden' } : {}) }}
                  data-print-hide={hideValues ? 'true' : undefined}
                  aria-label={`${item.label || 'Number'} secondary value ${item.secondaryValue ?? 0}`}
                >
                  {formatSignedNumber(item.secondaryValue ?? 0)}
                  {item.secondaryValueFormula && !secondaryDisplayAutoCompute && isFormulaBroken(item.secondaryValueFormula, labels) && (
                    <span className="ml-0.5 text-[8px] text-red-500" title={`Broken formula: ${item.secondaryValueFormula}`}>⚠</span>
                  )}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleValueClick(idx, item.value)}
                  onMouseDown={(event) => event.stopPropagation()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleValueClick(idx, item.value);
                    }
                  }}
                  aria-label={`Edit ${item.label || 'number'} values, currently ${item.value} and ${item.secondaryValue ?? 0}`}
                  className="absolute -bottom-1 -right-1 z-[1] flex min-h-6 min-w-7 items-center justify-center rounded-theme border border-theme-border bg-theme-paper px-1.5 font-body font-bold leading-[0] text-theme-ink transition-shadow hover:ring-1 hover:ring-theme-ink focus:outline-none focus:ring-1 focus:ring-theme-ink"
                  style={{ fontSize: `${secondaryFontSize}px`, ...(hideValues ? { visibility: 'hidden' } : {}) }}
                  data-print-hide={hideValues ? 'true' : undefined}
                >
                  {formatSignedNumber(item.secondaryValue ?? 0)}
                </button>
              )
            )}
          </div>
          );
        })}
        
        {displayNumbers.length === 0 && (
          <WidgetEmptyState title="No stats configured" hint={controlsVisible ? 'Use + to add a displayed number.' : undefined} compact />
        )}
      </div>

      {numberDialog && numberDialogItem && createPortal(
        <div
          data-touch-camera-ignore="true"
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4"
          onClick={closeNumberDialog}
          onMouseDown={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`number-display-edit-dialog-title-${widget.id}`}
            className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id={`number-display-edit-dialog-title-${widget.id}`} className="font-heading text-base font-bold">
              Edit {numberDialogItem.label || 'number'}
            </h3>
            <form
              className="mt-3 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                saveNumberDialog();
              }}
            >
              <label className="block text-sm font-medium">
                <span className="mb-1 block">Current value</span>
                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  step="1"
                  value={numberDialog.current}
                  onChange={(event) => setNumberDialog((current) => current ? { ...current, current: event.target.value } : current)}
                  className={`w-full rounded-button border bg-theme-paper px-3 py-2 text-sm text-theme-ink focus:outline-none ${numberDialogHasInvalidCurrent ? 'border-red-500 focus:border-red-500' : 'border-theme-border focus:border-theme-accent'}`}
                  aria-label="Current value"
                  aria-invalid={numberDialogHasInvalidCurrent || Boolean(numberDialogRangeIssue) ? true : undefined}
                />
              </label>

              <div className="border-t border-theme-border pt-3">
                <p className="text-sm font-medium">Bounds <span className="font-normal text-theme-muted">(optional)</span></p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="text-sm">
                    <span className="mb-1 block">Minimum{numberDialogItem.minValueFormula && <span className="ml-1 text-xs font-normal text-theme-muted">(computed)</span>}</span>
                    <input
                      type="number"
                      step="any"
                      value={numberDialog.minimum}
                      onChange={(event) => setNumberDialog((current) => current ? { ...current, minimum: event.target.value } : current)}
                      disabled={Boolean(numberDialogItem.minValueFormula)}
                      placeholder="No minimum"
                      className="w-full rounded-button border border-theme-border bg-theme-paper px-2 py-1 text-sm text-theme-ink focus:border-theme-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Minimum value"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block">Maximum{numberDialogItem.maxValueFormula && <span className="ml-1 text-xs font-normal text-theme-muted">(computed)</span>}</span>
                    <input
                      type="number"
                      step="any"
                      value={numberDialog.maximum}
                      onChange={(event) => setNumberDialog((current) => current ? { ...current, maximum: event.target.value } : current)}
                      disabled={Boolean(numberDialogItem.maxValueFormula)}
                      placeholder="No maximum"
                      className="w-full rounded-button border border-theme-border bg-theme-paper px-2 py-1 text-sm text-theme-ink focus:border-theme-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Maximum value"
                    />
                  </label>
                </div>
                {numberDialogHasInvalidBounds && (
                  <p className="mt-2 text-xs text-red-500">Minimum must not exceed maximum.</p>
                )}
                {numberDialogRangeIssue && !numberDialogHasInvalidBounds && (
                  <p className="mt-2 text-xs text-theme-muted">{numberDialogRangeIssue} The value will be clamped when saved.</p>
                )}
              </div>

              {numberDialogShowsManualSecondary && (
                <label className="block border-t border-theme-border pt-3 text-sm font-medium">
                  <span className="mb-1 block">Secondary value</span>
                  <input
                    type="number"
                    step="any"
                    value={numberDialog.secondary}
                    onChange={(event) => setNumberDialog((current) => current ? { ...current, secondary: event.target.value } : current)}
                    className={`w-full rounded-button border bg-theme-paper px-3 py-2 text-sm text-theme-ink focus:outline-none ${numberDialogHasInvalidSecondary ? 'border-red-500 focus:border-red-500' : 'border-theme-border focus:border-theme-accent'}`}
                    aria-label="Secondary value"
                    aria-invalid={numberDialogHasInvalidSecondary ? true : undefined}
                  />
                </label>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={closeNumberDialog} className="widget-control px-3 py-1.5 text-sm">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={numberDialogHasInvalidBounds || numberDialogHasInvalidCurrent || numberDialogHasInvalidSecondary}
                  className="widget-control widget-control--primary px-3 py-1.5 text-sm"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {fieldDialog && createPortal(
        <div
          data-touch-camera-ignore="true"
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4"
          onClick={closeFieldDialog}
          onMouseDown={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`number-display-field-dialog-title-${widget.id}`}
            className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id={`number-display-field-dialog-title-${widget.id}`} className="font-heading text-base font-bold">
              {fieldDialog === 'add' ? 'Add displayed number' : 'Remove displayed numbers'}
            </h3>

            {fieldDialog === 'add' ? (
              <form
                className="mt-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  addField();
                }}
              >
                <label htmlFor={`number-display-field-name-${widget.id}`} className="block text-sm font-medium">Label</label>
                <input
                  id={`number-display-field-name-${widget.id}`}
                  autoFocus
                  type="text"
                  value={fieldNameDraft}
                  onChange={(event) => setFieldNameDraft(event.target.value)}
                  placeholder="e.g. Luck"
                  className="mt-1 w-full rounded-button border border-theme-border bg-theme-paper px-3 py-2 text-sm text-theme-ink focus:border-theme-accent focus:outline-none"
                />
                <div className="mt-3 border-t border-theme-border pt-3">
                  <p className="text-sm font-medium">Starting bounds <span className="font-normal text-theme-muted">(optional)</span></p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-sm">
                      <span className="mb-1 block">Minimum</span>
                      <input
                        type="number"
                        value={minimumDraft}
                        onChange={(event) => setMinimumDraft(event.target.value)}
                        placeholder="No minimum"
                        className="w-full rounded-button border border-theme-border bg-theme-paper px-2 py-1 text-sm text-theme-ink focus:border-theme-accent focus:outline-none"
                        aria-label="Minimum value"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block">Maximum</span>
                      <input
                        type="number"
                        value={maximumDraft}
                        onChange={(event) => setMaximumDraft(event.target.value)}
                        placeholder="No maximum"
                        className="w-full rounded-button border border-theme-border bg-theme-paper px-2 py-1 text-sm text-theme-ink focus:border-theme-accent focus:outline-none"
                        aria-label="Maximum value"
                      />
                    </label>
                  </div>
                  {hasInvalidBounds && (
                    <p className="mt-2 text-xs text-red-500">Minimum cannot exceed maximum.</p>
                  )}
                </div>
                <AddMultipleToggle checked={addMultiple} onChange={setAddMultiple} />
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={closeFieldDialog} className="widget-control px-3 py-1.5 text-sm">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!fieldNameDraft.trim() || hasInvalidBounds}
                    className="widget-control widget-control--primary px-3 py-1.5 text-sm"
                  >
                    Add displayed number
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-3">
                <p className="text-sm text-theme-muted">Select one or more displayed numbers to remove.</p>
                <SelectionActions
                  onCheckAll={() => setSelectedFields(new Set(displayNumbers.map((_, index) => index)))}
                  onUncheckAll={() => setSelectedFields(new Set())}
                />
                <div className="mt-2 max-h-64 space-y-1 overflow-y-auto overscroll-contain pr-1">
                  {(displayNumbers as DisplayNumber[]).map((item, index) => (
                    <label
                      key={`${item.label}-${index}`}
                      className="flex cursor-pointer items-center gap-3 rounded-button border border-theme-border px-3 py-2 text-sm transition-colors hover:bg-theme-accent hover:text-theme-paper"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFields.has(index)}
                        onChange={() => toggleFieldSelection(index)}
                        className="h-4 w-4 flex-shrink-0 accent-theme-accent"
                      />
                      <span className="min-w-0 flex-1 truncate">{item.label || `Displayed number ${index + 1}`}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" autoFocus onClick={closeFieldDialog} className="widget-control px-3 py-1.5 text-sm">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={removeSelectedFields}
                    disabled={selectedFields.size === 0}
                    className="min-h-8 rounded-button border border-red-700 bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remove{selectedFields.size > 0 ? ` (${selectedFields.size})` : ''}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}





