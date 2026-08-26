import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Widget, NumberItem } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { collectLabels, isFormulaBroken } from '../../utils/formulaEngine';
import { Tooltip } from '../Tooltip';
import { WidgetEmptyState } from './WidgetPrimitives';
import { AddMultipleToggle, SelectionActions } from './StructureDialogControls';

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
}

const parseOptionalNumber = (value: string) => {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

export default function NumberWidget({ widget, mode, height, showFieldControls = true }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const characters = useStore((state) => state.characters);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const isPrintMode = mode === 'print';
  const { label, numberItems = [], printSettings, showNumberItemMax = false, showIncrementButtons = true } = widget.data;
  const hideValues = isPrintMode && (printSettings?.hideValues ?? false);
  const controlsVisible = showFieldControls && widget.data.showFieldControls !== false && !isPrintMode;
  const [numberDialog, setNumberDialog] = useState<NumberEditDialog | null>(null);
  const [fieldDialog, setFieldDialog] = useState<'add' | 'remove' | null>(null);
  const [fieldNameDraft, setFieldNameDraft] = useState('');
  const [minimumDraft, setMinimumDraft] = useState('');
  const [maximumDraft, setMaximumDraft] = useState('');
  const [addMultiple, setAddMultiple] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<number>>(new Set());

  const minimumDraftValue = minimumDraft.trim() === '' ? undefined : Number(minimumDraft);
  const maximumDraftValue = maximumDraft.trim() === '' ? undefined : Number(maximumDraft);
  const hasInvalidBounds = Number.isNaN(minimumDraftValue) || Number.isNaN(maximumDraftValue)
    || (minimumDraftValue !== undefined && maximumDraftValue !== undefined && minimumDraftValue > maximumDraftValue);

  const labels = useMemo(() => {
    const char = characters.find(c => c.id === activeCharacterId);
    return char ? collectLabels(char) : {};
  }, [characters, activeCharacterId]);

  // Fixed small sizing
  const itemClass = 'text-xs';
  const buttonSize = 'w-5 h-5 text-xs';
  const valueClass = `text-sm ${showNumberItemMax ? 'min-w-[4.5rem]' : 'min-w-8'} px-1`;
  const gapClass = 'gap-1';
  
  // Calculate items area height
  const labelHeight = controlsVisible ? 18 : label ? 16 : 0;
  const gapSize = 4;
  const padding = 0;
  const itemsHeight = Math.max(30, height - labelHeight - gapSize - padding * 2);

  const constrainItemValue = (value: number, item: NumberItem) => {
    const { minValue, maxValue } = item;
    if (minValue !== undefined && maxValue !== undefined && minValue > maxValue) return value;
    if (minValue !== undefined) value = Math.max(minValue, value);
    if (maxValue !== undefined) value = Math.min(maxValue, value);
    return value;
  };

  const getRangeIssueMessage = (minimum?: number, maximum?: number) => {
    if (minimum !== undefined && maximum !== undefined) return `Value must be between ${minimum} and ${maximum}.`;
    if (minimum !== undefined) return `Value must be at least ${minimum}.`;
    return `Value must be at most ${maximum}.`;
  };

  const numberDialogItem = numberDialog ? (numberItems as NumberItem[])[numberDialog.index] : undefined;
  const numberDialogMinimum = numberDialog ? parseOptionalNumber(numberDialog.minimum) : undefined;
  const numberDialogMaximum = numberDialog ? parseOptionalNumber(numberDialog.maximum) : undefined;
  const numberDialogCurrent = numberDialog ? Number(numberDialog.current) : undefined;
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
  const numberDialogRangeIssue = numberDialog && numberDialogCurrent !== undefined && Number.isFinite(numberDialogCurrent)
    && !numberDialogHasInvalidBounds
    && ((numberDialogMinimum !== undefined && numberDialogCurrent < numberDialogMinimum)
      || (numberDialogMaximum !== undefined && numberDialogCurrent > numberDialogMaximum))
    ? getRangeIssueMessage(numberDialogMinimum, numberDialogMaximum)
    : null;

  const adjustItemValue = (index: number, delta: number) => {
    const item = (numberItems as NumberItem[])[index];
    if (item.valueFormula) return;
    const updated = [...numberItems] as NumberItem[];
    const oldVal = updated[index].value;
    const newValue = constrainItemValue(oldVal + delta, updated[index]);
    if (newValue === oldVal) return;
    updated[index] = { ...updated[index], value: newValue };
    updateWidgetData(widget.id, { numberItems: updated });
    addTimelineEvent(label || 'Number Tracker', 'NUMBER', `${updated[index].name}: ${oldVal} → ${newValue}`, '🔢');
  };

  const handleValueClick = (index: number, currentValue: number) => {
    const item = (numberItems as NumberItem[])[index];
    if (isPrintMode || item.valueFormula) return;
    setNumberDialog({
      index,
      current: String(currentValue),
      minimum: item.minValue === undefined ? '' : String(item.minValue),
      maximum: item.maxValue === undefined ? '' : String(item.maxValue),
    });
  };

  const closeNumberDialog = () => {
    setNumberDialog(null);
  };

  const saveNumberDialog = () => {
    if (!numberDialog || !numberDialogItem || numberDialogHasInvalidBounds || numberDialogHasInvalidCurrent) return;

    const currentValue = numberDialogCurrent as number;
    const updatedItemWithBounds: NumberItem = {
      ...numberDialogItem,
      minValue: numberDialogMinimum,
      maxValue: numberDialogMaximum,
    };
    const constrainedValue = constrainItemValue(currentValue, updatedItemWithBounds);
    const updatedItem = { ...updatedItemWithBounds, value: constrainedValue };
    const updated = [...numberItems] as NumberItem[];
    updated[numberDialog.index] = updatedItem;
    updateWidgetData(widget.id, { numberItems: updated });
    if (numberDialogItem.value !== constrainedValue) {
      addTimelineEvent(label || 'Number Tracker', 'NUMBER', `${updatedItem.name}: ${numberDialogItem.value} → ${constrainedValue}`, '🔢');
    }
    closeNumberDialog();
  };

  const addField = () => {
    const fieldName = fieldNameDraft.trim();
    if (!fieldName) return;
    if (hasInvalidBounds) return;
    const newItem: NumberItem = {
      name: fieldName,
      value: 0,
      ...(minimumDraftValue !== undefined ? { minValue: minimumDraftValue } : {}),
      ...(maximumDraftValue !== undefined ? { maxValue: maximumDraftValue } : {}),
    };
    newItem.value = constrainItemValue(newItem.value, newItem);
    updateWidgetData(widget.id, {
      numberItems: [...numberItems, newItem],
    });
    setFieldNameDraft('');
    if (!addMultiple) setFieldDialog(null);
  };

  const removeSelectedFields = () => {
    if (selectedFields.size === 0) return;
    const updated = (numberItems as NumberItem[]).filter((_, index) => !selectedFields.has(index));
    setNumberDialog(null);
    updateWidgetData(widget.id, { numberItems: updated });
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

  // Flexible width for the value controls section
  const controlsSectionWidth = '';

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {(label || controlsVisible) && (
        <div className={`widget-structure-header flex min-h-6 flex-shrink-0 items-center gap-2 ${controlsVisible ? 'pr-4' : ''}`}>
          {label && (
            <div className="widget-structure-title min-w-0 flex-1 truncate">
              {label}
            </div>
          )}
          {controlsVisible && (
            <div className="number-widget__controls widget-structure-controls ml-auto flex flex-shrink-0 items-center gap-1">
              <Tooltip content={numberItems.length > 0 ? 'Choose trackers to remove' : 'No trackers to remove'}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFields(new Set());
                    setFieldDialog('remove');
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={numberItems.length === 0}
                  aria-label="Choose trackers to remove"
                  className="widget-control widget-control--subtle h-6 w-6 text-sm font-bold"
                >
                  −
                </button>
              </Tooltip>
              <Tooltip content="Add tracker">
                <button
                  type="button"
                  onClick={() => {
                    setFieldNameDraft('');
                    setMinimumDraft('');
                    setMaximumDraft('');
                    setAddMultiple(false);
                    setFieldDialog('add');
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  aria-label="Add tracker"
                  className="widget-control widget-control--subtle h-6 w-6 text-sm font-bold"
                >
                  +
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      )}

      {/* Number Items */}
      <div 
        className={`flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden flex-1 ${showIncrementButtons ? 'pr-4' : ''}`}
        style={{ maxHeight: `${itemsHeight}px` }}
        onWheel={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight > el.clientHeight) {
            e.stopPropagation();
          }
        }}
      >
        {(numberItems as NumberItem[]).map((item, idx) => {
          const atMinimum = item.minValue !== undefined && item.value <= item.minValue;
          const atMaximum = item.maxValue !== undefined && item.value >= item.maxValue;
          const displayedValue = showNumberItemMax && item.maxValue !== undefined ? `${item.value}/${item.maxValue}` : item.value;

          return (
          <div key={idx} className="relative">
            <div className={`flex items-center ${gapClass}`}>
              {/* Item Name */}
              <span className={`flex-1 ${itemClass} text-theme-ink font-body truncate`}>
                {mode === 'play' && item.tooltip ? (
                  <Tooltip content={item.tooltip}><span>{item.name}</span></Tooltip>
                ) : item.name}
              </span>

              {/* Value Controls - fixed width container for alignment */}
              <div className={`flex items-center justify-center gap-0.5 flex-shrink-0 ${controlsSectionWidth}`}>
              {showIncrementButtons && (
                <Tooltip content="Decrease value">
                  <button
                    onClick={() => adjustItemValue(idx, -1)}
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={!!item.valueFormula || atMinimum}
                    aria-label={`Decrease ${item.name || 'value'}`}
                    className={`${buttonSize} widget-control min-h-0 flex-shrink-0 ${isPrintMode ? 'opacity-0' : ''} ${item.valueFormula || atMinimum ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    -
                  </button>
                </Tooltip>
              )}
              <span 
                className={`${valueClass} text-center font-bold text-theme-ink flex-shrink-0 rounded-button font-body whitespace-nowrap ${item.valueFormula ? 'cursor-default' : 'cursor-pointer hover:bg-theme-accent/20'}`}
                style={hideValues ? { visibility: 'hidden' } : undefined}
                data-print-hide={hideValues ? 'true' : undefined}
                onClick={() => handleValueClick(idx, item.value)}
                onMouseDown={(e) => e.stopPropagation()}
                role={item.valueFormula ? undefined : 'button'}
                tabIndex={item.valueFormula ? undefined : 0}
                aria-label={item.valueFormula ? undefined : `Edit ${item.name || 'value'}, currently ${item.value}`}
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
              {showIncrementButtons && (
                <Tooltip content="Increase value">
                  <button
                    onClick={() => adjustItemValue(idx, 1)}
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={!!item.valueFormula || atMaximum}
                    aria-label={`Increase ${item.name || 'value'}`}
                    className={`${buttonSize} widget-control min-h-0 flex-shrink-0 ${isPrintMode ? 'opacity-0' : ''} ${item.valueFormula || atMaximum ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    +
                  </button>
                </Tooltip>
              )}
              </div>
            </div>
          </div>
          );
        })}
        {numberItems.length === 0 && (
          <WidgetEmptyState title="No trackers yet" hint={controlsVisible ? 'Use + to add a tracker.' : undefined} compact />
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
            aria-labelledby={`number-edit-dialog-title-${widget.id}`}
            className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id={`number-edit-dialog-title-${widget.id}`} className="font-heading text-base font-bold">
              Edit {numberDialogItem.name || 'number'}
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
                  type="number"
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

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={closeNumberDialog} className="widget-control px-3 py-1.5 text-sm">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={numberDialogHasInvalidBounds || numberDialogHasInvalidCurrent}
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
          onMouseDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`number-field-dialog-title-${widget.id}`}
            className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={`number-field-dialog-title-${widget.id}`} className="font-heading text-base font-bold">
              {fieldDialog === 'add' ? 'Add tracker' : 'Remove trackers'}
            </h3>

            {fieldDialog === 'add' ? (
              <form
                className="mt-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  addField();
                }}
              >
                <label htmlFor={`number-field-name-${widget.id}`} className="block text-sm font-medium">Tracker name</label>
                <input
                  id={`number-field-name-${widget.id}`}
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
                    Add tracker
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-3">
                <p className="text-sm text-theme-muted">Select one or more trackers to remove.</p>
                <SelectionActions
                  onCheckAll={() => setSelectedFields(new Set(numberItems.map((_, index) => index)))}
                  onUncheckAll={() => setSelectedFields(new Set())}
                />
                <div className="mt-2 max-h-64 space-y-1 overflow-y-auto overscroll-contain pr-1">
                  {(numberItems as NumberItem[]).map((item, index) => (
                    <label
                      key={`${item.name}-${index}`}
                      className="flex cursor-pointer items-center gap-3 rounded-button border border-theme-border px-3 py-2 text-sm transition-colors hover:bg-theme-accent hover:text-theme-paper"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFields.has(index)}
                        onChange={() => toggleFieldSelection(index)}
                        className="h-4 w-4 flex-shrink-0 accent-theme-accent"
                      />
                      <span className="min-w-0 flex-1 truncate">{item.name || `Tracker ${index + 1}`}</span>
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






