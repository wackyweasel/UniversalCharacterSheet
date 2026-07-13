import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Widget, DisplayNumber } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { collectLabels, isFormulaBroken } from '../../utils/formulaEngine';
import { Tooltip } from '../Tooltip';
import { TUTORIAL_STEPS, useTutorialStore } from '../../store/useTutorialStore';
import { WidgetEmptyState } from './WidgetPrimitives';

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
  const controlsVisible = showFieldControls && !isPrintMode;
  const { label, displayNumbers = [], displayLayout = 'horizontal', printSettings } = widget.data;
  const hideValues = isPrintMode && (printSettings?.hideValues ?? false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [fieldDialog, setFieldDialog] = useState<'add' | 'remove' | null>(null);
  const [fieldNameDraft, setFieldNameDraft] = useState('');
  const [selectedFields, setSelectedFields] = useState<Set<number>>(new Set());
  const tutorialStep = useTutorialStore((state) => state.tutorialStep);
  const advanceTutorial = useTutorialStore((state) => state.advanceTutorial);
  const isCurrentTutorialStep = (id: string) => tutorialStep !== null && TUTORIAL_STEPS[tutorialStep]?.id === id;

  const labels = useMemo(() => {
    const char = characters.find(c => c.id === activeCharacterId);
    return char ? collectLabels(char) : {};
  }, [characters, activeCharacterId]);

  const handleValueClick = (index: number, currentValue: number) => {
    const item = (displayNumbers as DisplayNumber[])[index];
    if (item.valueFormula) return;
    setEditingIndex(index);
    setEditValue(String(currentValue));
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  const handleValueBlur = (index: number) => {
    const newValue = parseInt(editValue, 10);
    if (!isNaN(newValue)) {
      const updated = [...displayNumbers] as DisplayNumber[];
      const oldVal = updated[index].value;
      updated[index] = { ...updated[index], value: newValue };
      updateWidgetData(widget.id, { displayNumbers: updated });
      if (oldVal !== newValue) {
        addTimelineEvent(label || 'Number Display', 'NUMBER_DISPLAY', `${updated[index].label}: ${oldVal} → ${newValue}`, '🔢');
        if (updated[index].label === 'Strength' && isCurrentTutorialStep('automation-change-strength')) {
          advanceTutorial();
        }
      }
    }
    setEditingIndex(null);
    setEditValue('');
  };

  const handleValueKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      handleValueBlur(index);
    } else if (e.key === 'Escape') {
      setEditingIndex(null);
      setEditValue('');
    }
  };

  const addField = () => {
    const fieldName = fieldNameDraft.trim();
    if (!fieldName) return;
    updateWidgetData(widget.id, {
      displayNumbers: [...displayNumbers, { label: fieldName, value: 0 }],
    });
    setFieldNameDraft('');
    setFieldDialog(null);
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
    <div className="w-full h-full flex flex-col overflow-hidden">
      {(label || controlsVisible) && (
        <div className="flex min-h-6 flex-shrink-0 items-center gap-2 px-1 pr-4">
          {label && (
            <div
              className="min-w-0 flex-1 truncate font-bold text-theme-ink font-heading"
              style={{ fontSize: '11px', lineHeight: '16px' }}
            >
              {label}
            </div>
          )}
          {controlsVisible && (
            <div className="ml-auto flex flex-shrink-0 items-center gap-1">
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
        {(displayNumbers as DisplayNumber[]).map((item, idx) => (
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
              <input
                data-tutorial={item.label === 'Strength' ? 'automation-strength-value' : undefined}
                type="text"
                inputMode="numeric"
                value={editValue}
                onChange={handleValueChange}
                onBlur={() => handleValueBlur(idx)}
                onKeyDown={(e) => handleValueKeyDown(e, idx)}
                onMouseDown={(e) => e.stopPropagation()}
                autoFocus
                className="text-center font-bold text-theme-ink bg-transparent border-none outline-none w-full"
                style={{ fontSize: `${numberFontSize}px` }}
              />
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
                {item.value}
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
        ))}
        
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
                <label htmlFor={`number-display-field-name-${widget.id}`} className="block text-sm font-medium">
                  Label
                </label>
                <input
                  id={`number-display-field-name-${widget.id}`}
                  autoFocus
                  type="text"
                  value={fieldNameDraft}
                  onChange={(event) => setFieldNameDraft(event.target.value)}
                  placeholder="e.g. Luck"
                  className="mt-1 w-full rounded-button border border-theme-border bg-theme-paper px-3 py-2 text-sm text-theme-ink focus:border-theme-accent focus:outline-none"
                />
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={closeFieldDialog} className="widget-control px-3 py-1.5 text-sm">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!fieldNameDraft.trim()}
                    className="widget-control widget-control--primary px-3 py-1.5 text-sm"
                  >
                    Add displayed number
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-3">
                <p className="text-sm text-theme-muted">Select one or more displayed numbers to remove.</p>
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






