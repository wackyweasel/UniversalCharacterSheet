import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { Tooltip } from '../Tooltip';
import { AddMultipleToggle, SelectionActions } from './StructureDialogControls';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
  showFieldControls?: boolean;
}

export default function ListWidget({ widget, mode, height, showFieldControls = true }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, items = [], itemCount = 5 } = widget.data;
  const isPrintMode = mode === 'print';
  const controlsVisible = showFieldControls && widget.data.showFieldControls !== false && !isPrintMode;
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [addMultiple, setAddMultiple] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // Fixed small sizing
  const inputClass = 'text-xs py-0.5';
  const gapClass = 'gap-1';
  
  // Calculate list area height
  const labelHeight = controlsVisible ? 18 : label ? 16 : 0;
  const gapSize = 4;
  const padding = 0;
  const listHeight = Math.max(40, height - labelHeight - gapSize - padding * 2);

  // Ensure items array matches itemCount
  const normalizedItems = Array.from({ length: itemCount }, (_, i) => items[i] || '');

  // Track previous values for timeline on blur
  const prevListValues = useRef<Record<number, string>>({});

  const handleFocus = (index: number) => {
    prevListValues.current[index] = normalizedItems[index];
  };

  const handleBlur = (index: number) => {
    const prev = prevListValues.current[index];
    const current = normalizedItems[index];
    if (prev !== undefined && prev !== current) {
      if (!prev && current) {
        addTimelineEvent(label || 'List', 'LIST', `Added: "${current}"`, '\u270f\ufe0f');
      } else if (prev && current) {
        addTimelineEvent(label || 'List', 'LIST', `Changed: "${prev}" \u2192 "${current}"`, '\ud83d\udcdd');
      }
    }
    delete prevListValues.current[index];
  };

  const updateItem = (index: number, value: string) => {
    const newItems = [...normalizedItems];
    newItems[index] = value;
    updateWidgetData(widget.id, { items: newItems });
  };

  const clearItem = (index: number) => {
    const oldValue = normalizedItems[index];
    const newItems = [...normalizedItems];
    newItems[index] = '';
    updateWidgetData(widget.id, { items: newItems });
    if (oldValue) {
      addTimelineEvent(label || 'List', 'LIST', `Cleared: "${oldValue}"`, '📝');
    }
  };

  const addItems = () => {
    updateWidgetData(widget.id, {
      items: [...normalizedItems, ''],
      itemCount: itemCount + 1,
    });
    if (!addMultiple) setShowAddDialog(false);
  };

  const openAddDialog = () => {
    setAddMultiple(false);
    setShowAddDialog(true);
  };

  const removeSelectedItems = () => {
    if (selectedItems.size === 0) return;
    const updated = normalizedItems.filter((_, index) => !selectedItems.has(index));
    prevListValues.current = {};
    updateWidgetData(widget.id, {
      items: updated,
      itemCount: updated.length,
    });
    setSelectedItems(new Set());
    setShowRemoveDialog(false);
  };

  const closeRemoveDialog = () => {
    setSelectedItems(new Set());
    setShowRemoveDialog(false);
  };

  const toggleItemSelection = (index: number) => {
    setSelectedItems((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  useEffect(() => {
    if (!showRemoveDialog) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRemoveDialog();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showRemoveDialog]);

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
            <div className="list-widget__controls widget-structure-controls ml-auto flex flex-shrink-0 items-center gap-1">
              <Tooltip content={normalizedItems.length > 0 ? 'Choose items to remove' : 'No items to remove'}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItems(new Set());
                    setShowRemoveDialog(true);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={normalizedItems.length === 0}
                  aria-label="Choose list items to remove"
                  className="widget-control widget-control--subtle h-6 w-6 text-sm font-bold"
                >
                  −
                </button>
              </Tooltip>
              <Tooltip content="Add empty item">
                <button
                  type="button"
                  onClick={openAddDialog}
                  onMouseDown={(e) => e.stopPropagation()}
                  aria-label="Add empty list item"
                  className="widget-control widget-control--subtle h-6 w-6 text-sm font-bold"
                >
                  +
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      )}
      <div 
        className="space-y-1 overflow-y-auto flex-1"
        style={{ maxHeight: `${listHeight}px` }}
        onWheel={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight > el.clientHeight) {
            e.stopPropagation();
          }
        }}
      >
        {normalizedItems.map((item: string, idx: number) => (
          <div key={idx} className="flex items-center gap-1 group">
            <span className="text-theme-ink">•</span>
            <input
              className={`flex-1 border-b border-theme-border focus:border-theme-accent focus:outline-none ${inputClass} min-w-0 bg-transparent text-theme-ink font-body`}
              value={item}
              onChange={(e) => updateItem(idx, e.target.value)}
              onFocus={() => handleFocus(idx)}
              onBlur={() => handleBlur(idx)}
              placeholder={mode === 'print' ? '' : '...'}
              onMouseDown={(e) => e.stopPropagation()}
              aria-label={`${label || 'List'} item ${idx + 1}`}
            />
            <Tooltip content="Clear this item">
              <button 
                onClick={() => clearItem(idx)}
                className={`text-theme-muted hover:text-red-500 px-1 flex-shrink-0 transition-opacity ${item ? 'opacity-50 group-hover:opacity-100 focus:opacity-100' : 'opacity-0 pointer-events-none'}`}
                onMouseDown={(e) => e.stopPropagation()}
                aria-label={`Clear ${label || 'list'} item ${idx + 1}`}
              >
                ×
              </button>
            </Tooltip>
          </div>
        ))}
      </div>

      {showAddDialog && createPortal(
        <div
          data-touch-camera-ignore="true"
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4"
          onClick={() => setShowAddDialog(false)}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby={`list-add-dialog-title-${widget.id}`}
            className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
            onSubmit={(event) => {
              event.preventDefault();
              addItems();
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={`list-add-dialog-title-${widget.id}`} className="font-heading text-base font-bold">Add list item</h3>
            <AddMultipleToggle checked={addMultiple} onChange={setAddMultiple} />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddDialog(false)} className="widget-control px-3 py-1.5 text-sm">Cancel</button>
              <button type="submit" className="widget-control widget-control--primary px-3 py-1.5 text-sm">Add item</button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {showRemoveDialog && createPortal(
        <div
          data-touch-camera-ignore="true"
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4"
          onClick={closeRemoveDialog}
          onMouseDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`list-remove-dialog-title-${widget.id}`}
            className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={`list-remove-dialog-title-${widget.id}`} className="font-heading text-base font-bold">
              Remove list items
            </h3>
            <p className="mt-3 text-sm text-theme-muted">Select one or more items to remove.</p>
            <SelectionActions
              onCheckAll={() => setSelectedItems(new Set(normalizedItems.map((_, index) => index)))}
              onUncheckAll={() => setSelectedItems(new Set())}
            />
            <div className="mt-2 max-h-64 space-y-1 overflow-y-auto overscroll-contain pr-1">
              {normalizedItems.map((item, index) => (
                <label
                  key={index}
                  className="flex cursor-pointer items-center gap-3 rounded-button border border-theme-border px-3 py-2 text-sm transition-colors hover:bg-theme-accent hover:text-theme-paper"
                >
                  <input
                    type="checkbox"
                    checked={selectedItems.has(index)}
                    onChange={() => toggleItemSelection(index)}
                    className="h-4 w-4 flex-shrink-0 accent-theme-accent"
                  />
                  <span className="min-w-0 flex-1 truncate">{item || `Empty item ${index + 1}`}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" autoFocus onClick={closeRemoveDialog} className="widget-control px-3 py-1.5 text-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={removeSelectedItems}
                disabled={selectedItems.size === 0}
                className="min-h-8 rounded-button border border-red-700 bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remove{selectedItems.size > 0 ? ` (${selectedItems.size})` : ''}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}






