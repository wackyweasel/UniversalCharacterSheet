import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Widget, CheckboxItem } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { Tooltip } from '../Tooltip';
import { WidgetEmptyState } from './WidgetPrimitives';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
  showFieldControls?: boolean;
  interactive?: boolean;
}

function AddChecklistItemModal({ onConfirm, onCancel }: { onConfirm: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('');

  const submit = () => {
    const trimmedName = name.trim();
    if (trimmedName) onConfirm(trimmedName);
  };

  return (
    <div
      data-touch-camera-ignore="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4"
      onClick={onCancel}
      onMouseDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="checklist-add-item-title"
        className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
        }}
      >
        <h3 id="checklist-add-item-title" className="font-heading text-base font-bold">Add checklist item</h3>
        <label htmlFor="checklist-item-name" className="mt-3 block text-sm font-medium">Name</label>
        <input
          id="checklist-item-name"
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 h-10 w-full rounded-button border border-theme-border bg-theme-paper px-3 text-theme-ink focus:border-theme-accent focus:outline-none"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="widget-control px-3 py-1.5 text-sm">Cancel</button>
          <button type="submit" disabled={!name.trim()} className="widget-control widget-control--primary px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40">Add item</button>
        </div>
      </form>
    </div>
  );
}

function RemoveChecklistItemsModal({ items, onConfirm, onCancel }: { items: CheckboxItem[]; onConfirm: (indexes: Set<number>) => void; onCancel: () => void }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggleSelection = (index: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div
      data-touch-camera-ignore="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4"
      onClick={onCancel}
      onMouseDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checklist-remove-items-title"
        className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
        }}
      >
        <h3 id="checklist-remove-items-title" className="font-heading text-base font-bold">Remove checklist items</h3>
        <p className="mt-2 text-sm text-theme-muted">Select one or more items to remove.</p>
        <div className="mt-3 max-h-64 space-y-1 overflow-y-auto overscroll-contain pr-1">
          {items.map((item, index) => (
            <label key={index} className="flex cursor-pointer items-center gap-3 rounded-button border border-theme-border px-3 py-2 text-sm transition-colors hover:bg-theme-accent hover:text-theme-paper">
              <input
                type="checkbox"
                checked={selected.has(index)}
                onChange={() => toggleSelection(index)}
                className="h-4 w-4 flex-shrink-0 accent-theme-accent"
              />
              <span className={`min-w-0 flex-1 truncate ${item.checked ? 'line-through opacity-70' : ''}`}>{item.name}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" autoFocus onClick={onCancel} className="widget-control px-3 py-1.5 text-sm">Cancel</button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            disabled={selected.size === 0}
            className="min-h-8 rounded-button border border-red-700 bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Remove{selected.size > 0 ? ` (${selected.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckboxWidget({ widget, height, mode, showFieldControls = true, interactive = true }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, checkboxItems = [], checklistSettings } = widget.data;
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const controlsVisible = showFieldControls && widget.data.showFieldControls !== false && interactive && mode !== 'print';
  const itemsInteractive = interactive && mode !== 'print';
  const strikethrough = checklistSettings?.strikethrough !== false; // Default to true

  // Fixed small sizing
  const labelClass = 'text-xs';
  const itemClass = 'text-xs';
  const checkboxClass = 'w-4 h-4';
  const checkClass = 'text-xs';
  const gapClass = 'gap-1';
  
  // Calculate items area height
  const labelHeight = controlsVisible ? 18 : label ? 16 : 0;
  const gapSize = 4;
  const padding = 0;
  const itemsHeight = Math.max(30, height - labelHeight - gapSize - padding * 2);

  const toggleItem = (index: number) => {
    if (!itemsInteractive) return;
    const updated = [...checkboxItems] as CheckboxItem[];
    const newChecked = !updated[index].checked;
    updated[index] = { ...updated[index], checked: newChecked };
    updateWidgetData(widget.id, { checkboxItems: updated });
    addTimelineEvent(label || 'Checklist', 'CHECKBOX', `${updated[index].name}: ${newChecked ? 'checked' : 'unchecked'}`, newChecked ? '☑️' : '⬜');
  };

  const addItem = (name: string) => {
    updateWidgetData(widget.id, { checkboxItems: [...checkboxItems, { name, checked: false }] });
    setShowAddDialog(false);
    addTimelineEvent(label || 'Checklist', 'CHECKBOX', `Added: ${name}`, '➕');
  };

  const removeItems = (indexes: Set<number>) => {
    const removedNames = (checkboxItems as CheckboxItem[]).filter((_, index) => indexes.has(index)).map((item) => item.name);
    updateWidgetData(widget.id, { checkboxItems: checkboxItems.filter((_: CheckboxItem, index: number) => !indexes.has(index)) });
    setShowRemoveDialog(false);
    addTimelineEvent(label || 'Checklist', 'CHECKBOX', `Removed: ${removedNames.join(', ')}`, '➖');
  };

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
            <div className="checklist-widget__controls widget-structure-controls ml-auto flex flex-shrink-0 items-center gap-1">
              <Tooltip content={checkboxItems.length > 0 ? 'Choose checklist items to remove' : 'No items to remove'}>
                <button
                  type="button"
                  onClick={() => setShowRemoveDialog(true)}
                  onMouseDown={(event) => event.stopPropagation()}
                  disabled={checkboxItems.length === 0}
                  aria-label="Choose checklist items to remove"
                  className="widget-control widget-control--subtle h-6 w-6 text-sm font-bold"
                >
                  −
                </button>
              </Tooltip>
              <Tooltip content="Add checklist item">
                <button
                  type="button"
                  onClick={() => setShowAddDialog(true)}
                  onMouseDown={(event) => event.stopPropagation()}
                  aria-label="Add checklist item"
                  className="widget-control widget-control--subtle h-6 w-6 text-sm font-bold"
                >
                  +
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      )}
      
      {/* Checkbox Items */}
      <div 
        className={`flex flex-col gap-0.5 overflow-y-auto flex-1`}
        style={{ maxHeight: `${itemsHeight}px` }}
        onWheel={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight > el.clientHeight) {
            e.stopPropagation();
          }
        }}
      >
        {(checkboxItems as CheckboxItem[]).map((item, idx) => (
          <button
            type="button"
            key={idx} 
            className={`w-full flex items-center text-left ${gapClass} ${itemsInteractive ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={() => toggleItem(idx)}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={!itemsInteractive}
            aria-pressed={item.checked}
            aria-label={`${item.name}: ${item.checked ? 'checked' : 'not checked'}`}
          >
            <div
              className={`${checkboxClass} border border-theme-border flex items-center justify-center transition-colors flex-shrink-0 rounded-button ${
                item.checked ? 'bg-theme-accent text-theme-paper' : 'bg-theme-paper hover:opacity-80'
              }`}
            >
              {item.checked && <span className={checkClass}>✓</span>}
            </div>
            <span className={`flex-1 ${itemClass} font-body text-theme-ink ${item.checked && strikethrough ? 'line-through text-theme-muted' : ''}`}>
              {mode === 'play' && item.tooltip ? (
                <Tooltip content={item.tooltip}>
                  <span>{item.name}</span>
                </Tooltip>
              ) : item.name}
            </span>
          </button>
        ))}
        {checkboxItems.length === 0 && (
          <WidgetEmptyState
            title="Nothing on the checklist"
          />
        )}
      </div>

      {showAddDialog && createPortal(
        <AddChecklistItemModal onConfirm={addItem} onCancel={() => setShowAddDialog(false)} />,
        document.body
      )}
      {showRemoveDialog && createPortal(
        <RemoveChecklistItemsModal items={checkboxItems as CheckboxItem[]} onConfirm={removeItems} onCancel={() => setShowRemoveDialog(false)} />,
        document.body
      )}
    </div>
  );
}






