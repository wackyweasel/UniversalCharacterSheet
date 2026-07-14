import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Widget, NumberItem } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { collectLabels, isFormulaBroken } from '../../utils/formulaEngine';
import { Tooltip } from '../Tooltip';
import { WidgetEmptyState } from './WidgetPrimitives';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
  showFieldControls?: boolean;
}

export default function NumberWidget({ widget, mode, height, showFieldControls = true }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const characters = useStore((state) => state.characters);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const isPrintMode = mode === 'print';
  const { label, numberItems = [], printSettings } = widget.data;
  const hideValues = isPrintMode && (printSettings?.hideValues ?? false);
  const controlsVisible = showFieldControls && widget.data.showFieldControls !== false && !isPrintMode;
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [fieldDialog, setFieldDialog] = useState<'add' | 'remove' | null>(null);
  const [fieldNameDraft, setFieldNameDraft] = useState('');
  const [selectedFields, setSelectedFields] = useState<Set<number>>(new Set());

  const labels = useMemo(() => {
    const char = characters.find(c => c.id === activeCharacterId);
    return char ? collectLabels(char) : {};
  }, [characters, activeCharacterId]);

  // Fixed small sizing
  const labelClass = 'text-xs';
  const itemClass = 'text-xs';
  const buttonSize = 'w-5 h-5 text-xs';
  const valueClass = 'text-sm min-w-8 px-1';
  const gapClass = 'gap-1';
  
  // Calculate items area height
  const labelHeight = controlsVisible ? 18 : label ? 16 : 0;
  const gapSize = 4;
  const padding = 0;
  const itemsHeight = Math.max(30, height - labelHeight - gapSize - padding * 2);

  const adjustItemValue = (index: number, delta: number) => {
    const item = (numberItems as NumberItem[])[index];
    if (item.valueFormula) return;
    const updated = [...numberItems] as NumberItem[];
    const oldVal = updated[index].value;
    updated[index] = { ...updated[index], value: oldVal + delta };
    updateWidgetData(widget.id, { numberItems: updated });
    addTimelineEvent(label || 'Number Tracker', 'NUMBER', `${updated[index].name}: ${oldVal} → ${oldVal + delta}`, '🔢');
  };

  const handleValueClick = (index: number, currentValue: number) => {
    const item = (numberItems as NumberItem[])[index];
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
      const updated = [...numberItems] as NumberItem[];
      const oldVal = updated[index].value;
      updated[index] = { ...updated[index], value: newValue };
      updateWidgetData(widget.id, { numberItems: updated });
      if (oldVal !== newValue) {
        addTimelineEvent(label || 'Number Tracker', 'NUMBER', `${updated[index].name}: ${oldVal} → ${newValue}`, '🔢');
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
      numberItems: [...numberItems, { name: fieldName, value: 0 }],
    });
    setFieldNameDraft('');
    setFieldDialog(null);
  };

  const removeSelectedFields = () => {
    if (selectedFields.size === 0) return;
    const updated = (numberItems as NumberItem[]).filter((_, index) => !selectedFields.has(index));
    setEditingIndex(null);
    setEditValue('');
    updateWidgetData(widget.id, { numberItems: updated });
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

  // Flexible width for the value controls section
  const controlsSectionWidth = '';

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {(label || controlsVisible) && (
        <div className={`widget-structure-header flex min-h-6 flex-shrink-0 items-center gap-2 ${controlsVisible ? 'pr-4' : ''}`}>
          {label && (
            <div className={`min-w-0 flex-1 truncate font-bold ${labelClass} text-theme-ink font-heading`}>
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
        className={`flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden flex-1 pr-4`}
        style={{ maxHeight: `${itemsHeight}px` }}
        onWheel={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight > el.clientHeight) {
            e.stopPropagation();
          }
        }}
      >
        {(numberItems as NumberItem[]).map((item, idx) => (
          <div key={idx} className={`flex items-center ${gapClass}`}>
            {/* Item Name */}
            <span className={`flex-1 ${itemClass} text-theme-ink font-body truncate`}>
              {mode === 'play' && item.tooltip ? (
                <Tooltip content={item.tooltip}><span>{item.name}</span></Tooltip>
              ) : item.name}
            </span>

            {/* Value Controls - fixed width container for alignment */}
            <div className={`flex items-center justify-center gap-0.5 flex-shrink-0 ${controlsSectionWidth}`}>
              <Tooltip content="Decrease value">
                <button
                  onClick={() => adjustItemValue(idx, -1)}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={!!item.valueFormula}
                  aria-label={`Decrease ${item.name || 'value'}`}
                  className={`${buttonSize} widget-control min-h-0 flex-shrink-0 ${isPrintMode ? 'opacity-0' : ''} ${item.valueFormula ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  -
                </button>
              </Tooltip>
              {editingIndex === idx ? (
                <input
                  type="text"
                  inputMode="numeric"
                  value={editValue}
                  onChange={handleValueChange}
                  onBlur={() => handleValueBlur(idx)}
                  onKeyDown={(e) => handleValueKeyDown(e, idx)}
                  onMouseDown={(e) => e.stopPropagation()}
                  autoFocus
                  className={`${valueClass} text-center font-bold text-theme-ink bg-theme-paper border border-theme-border rounded-button flex-shrink-0 outline-none focus:border-theme-accent`}
                />
              ) : (
                <span 
                  className={`${valueClass} text-center font-bold text-theme-ink flex-shrink-0 rounded-button font-body whitespace-nowrap ${item.valueFormula ? 'cursor-default' : 'cursor-pointer hover:bg-theme-accent/20'}`}
                  style={hideValues ? { visibility: 'hidden' } : undefined}
                  data-print-hide={hideValues ? 'true' : undefined}
                  onClick={() => handleValueClick(idx, item.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  role={item.valueFormula ? undefined : 'button'}
                  tabIndex={item.valueFormula ? undefined : 0}
                  aria-label={item.valueFormula ? undefined : `Set ${item.name || 'value'}, currently ${item.value}`}
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
              <Tooltip content="Increase value">
                <button
                  onClick={() => adjustItemValue(idx, 1)}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={!!item.valueFormula}
                  aria-label={`Increase ${item.name || 'value'}`}
                  className={`${buttonSize} widget-control min-h-0 flex-shrink-0 ${isPrintMode ? 'opacity-0' : ''} ${item.valueFormula ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  +
                </button>
              </Tooltip>
            </div>
          </div>
        ))}
        {numberItems.length === 0 && (
          <WidgetEmptyState title="No trackers yet" hint={controlsVisible ? 'Use + to add a tracker.' : undefined} compact />
        )}
      </div>

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
                <label htmlFor={`number-field-name-${widget.id}`} className="block text-sm font-medium">
                  Tracker name
                </label>
                <input
                  id={`number-field-name-${widget.id}`}
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
                    Add tracker
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-3">
                <p className="text-sm text-theme-muted">Select one or more trackers to remove.</p>
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






