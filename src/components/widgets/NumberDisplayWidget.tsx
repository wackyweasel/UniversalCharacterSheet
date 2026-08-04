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

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
  showFieldControls?: boolean;
}

export default function NumberDisplayWidget({ widget, mode, width, height, showFieldControls = true }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const characters = useStore((state) => state.characters);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const isPrintMode = mode === 'print';
  const controlsVisible = showFieldControls && widget.data.showFieldControls !== false && !isPrintMode;
  const { label, displayNumbers = [], displayLayout = 'horizontal', printSettings, showDisplayNumberMax = false } = widget.data;
  const hideValues = isPrintMode && (printSettings?.hideValues ?? false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [rangeIssue, setRangeIssue] = useState<string | null>(null);
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

  const getRangeIssueMessage = (item: DisplayNumber) => {
    if (item.minValue !== undefined && item.maxValue !== undefined) {
      return `Value must be between ${item.minValue} and ${item.maxValue}.`;
    }
    if (item.minValue !== undefined) return `Value must be at least ${item.minValue}.`;
    return `Value must be at most ${item.maxValue}.`;
  };

  const handleValueClick = (index: number, currentValue: number) => {
    const item = (displayNumbers as DisplayNumber[])[index];
    if (item.valueFormula) return;
    setRangeIssue(null);
    setEditingIndex(index);
    setEditValue(String(currentValue));
  };

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const nextValue = event.target.value;
    const parsedValue = parseInt(nextValue, 10);
    const item = (displayNumbers as DisplayNumber[])[index];
    setEditValue(nextValue);
    setRangeIssue(!isNaN(parsedValue) && parsedValue !== constrainItemValue(parsedValue, item) ? getRangeIssueMessage(item) : null);
  };

  const handleValueBlur = (index: number) => {
    const newValue = parseInt(editValue, 10);
    if (!isNaN(newValue)) {
      const updated = [...displayNumbers] as DisplayNumber[];
      const oldVal = updated[index].value;
      const constrainedValue = constrainItemValue(newValue, updated[index]);
      updated[index] = { ...updated[index], value: constrainedValue };
      updateWidgetData(widget.id, { displayNumbers: updated });
      if (oldVal !== constrainedValue) {
        addTimelineEvent(label || 'Number Display', 'NUMBER_DISPLAY', `${updated[index].label}: ${oldVal} → ${constrainedValue}`, '🔢');
        if (updated[index].label === 'Strength' && isCurrentTutorialStep('automation-change-strength')) {
          advanceTutorial();
        }
      }
    }
    setEditingIndex(null);
    setEditValue('');
    setRangeIssue(null);
  };

  const handleValueKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      handleValueBlur(index);
    } else if (e.key === 'Escape') {
      setEditingIndex(null);
      setEditValue('');
      setRangeIssue(null);
    }
  };

  const addField = () => {
    const fieldName = fieldNameDraft.trim();
    if (!fieldName || hasInvalidBounds) return;
    const newItem: DisplayNumber = {
      label: fieldName,
      value: 0,
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
    setEditingIndex(null);
    setEditValue('');
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

  const isHorizontal = displayLayout === 'horizontal';
  const itemCount = displayNumbers.length || 1;
  
  // Font sizes based on available space
  const minDimension = Math.min(width / (isHorizontal ? itemCount : 1), height / (isHorizontal ? 1 : itemCount));
  const numberFontSize = Math.max(10, Math.min(20, minDimension * 0.25));
  const labelFontSize = Math.max(7, Math.min(10, minDimension * 0.12));

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
          const displayedValue = showDisplayNumberMax && item.maxValue !== undefined ? `${item.value}/${item.maxValue}` : item.value;

          return (
          <div 
            key={idx} 
            className={`flex flex-col items-center justify-center border-2 border-theme-border rounded-button bg-theme-paper/50 overflow-hidden ${isHorizontal ? 'flex-1 max-w-[70px]' : 'flex-1 max-h-[55px]'}`}
            style={{ 
              minWidth: isHorizontal ? '30px' : undefined,
              minHeight: !isHorizontal ? '30px' : undefined,
            }}
          >
            {/* Value - editable on click */}
            {editingIndex === idx ? (
              <div className="relative w-full">
                <input
                  data-tutorial={item.label === 'Strength' ? 'automation-strength-value' : undefined}
                  type="text"
                  inputMode="numeric"
                  value={editValue}
                  onChange={(event) => handleValueChange(event, idx)}
                  onBlur={() => handleValueBlur(idx)}
                  onKeyDown={(e) => handleValueKeyDown(e, idx)}
                  onMouseDown={(e) => e.stopPropagation()}
                  autoFocus
                  aria-invalid={rangeIssue ? true : undefined}
                  className={`w-full border-none bg-transparent text-center font-bold text-theme-ink outline-none ${rangeIssue ? 'pr-4 text-red-500' : ''}`}
                  style={{ fontSize: `${numberFontSize}px` }}
                />
                {rangeIssue && (
                  <Tooltip content={rangeIssue}>
                    <span role="img" aria-label={rangeIssue} className="absolute right-1 top-1/2 -translate-y-1/2 text-xs font-bold leading-none text-red-500">!</span>
                  </Tooltip>
                )}
              </div>
            ) : (
              <span 
                data-tutorial={item.label === 'Strength' ? 'automation-strength-value' : undefined}
                className={`font-bold text-theme-ink transition-colors leading-none font-body ${item.valueFormula ? 'cursor-default' : 'cursor-pointer hover:text-theme-accent'}`}
                style={{ fontSize: `${numberFontSize}px`, ...(hideValues ? { visibility: 'hidden' } : {}) }}
                data-print-hide={hideValues ? 'true' : undefined}
                onClick={() => handleValueClick(idx, item.value)}
                onMouseDown={(e) => e.stopPropagation()}
                role={item.valueFormula ? undefined : 'button'}
                tabIndex={item.valueFormula ? undefined : 0}
                aria-label={item.valueFormula ? undefined : `Set ${item.label || 'value'}, currently ${item.value}`}
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
            )}
            
            {/* Label */}
            <span 
              className="text-theme-muted font-body truncate w-full text-center px-1 leading-tight"
              style={{ fontSize: `${labelFontSize}px` }}
            >
              {mode === 'play' && item.tooltip ? (
                <Tooltip content={item.tooltip}><span>{item.label}</span></Tooltip>
              ) : item.label}
            </span>
          </div>
          );
        })}
        
        {displayNumbers.length === 0 && (
          <WidgetEmptyState title="No stats configured" hint={controlsVisible ? 'Use + to add a displayed number.' : undefined} compact />
        )}
      </div>

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






