import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Widget, ToggleItem } from '../../types';
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

function AddConditionModal({ items, onConfirm, onCancel }: { items: ToggleItem[]; onConfirm: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const trimmedName = name.trim();
  const duplicate = items.some((item) => item.name.toLowerCase() === trimmedName.toLowerCase());

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
        aria-labelledby="condition-add-title"
        className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
        onSubmit={(event) => {
          event.preventDefault();
          if (trimmedName && !duplicate) onConfirm(trimmedName);
        }}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
        }}
      >
        <h3 id="condition-add-title" className="font-heading text-base font-bold">Add condition</h3>
        <label htmlFor="condition-name" className="mt-3 block text-sm font-medium">Name</label>
        <input
          id="condition-name"
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={duplicate || undefined}
          className="mt-1 h-10 w-full rounded-button border border-theme-border bg-theme-paper px-3 text-theme-ink focus:border-theme-accent focus:outline-none"
        />
        {duplicate && <p className="mt-1 text-xs text-red-600">That condition already exists.</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="widget-control px-3 py-1.5 text-sm">Cancel</button>
          <button type="submit" disabled={!trimmedName || duplicate} className="widget-control widget-control--primary px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40">Add condition</button>
        </div>
      </form>
    </div>
  );
}

function RemoveConditionsModal({ items, onConfirm, onCancel }: { items: ToggleItem[]; onConfirm: (indexes: Set<number>) => void; onCancel: () => void }) {
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
        aria-labelledby="condition-remove-title"
        className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
        }}
      >
        <h3 id="condition-remove-title" className="font-heading text-base font-bold">Remove conditions</h3>
        <p className="mt-2 text-sm text-theme-muted">Select one or more conditions to remove.</p>
        <div className="mt-3 max-h-64 space-y-1 overflow-y-auto overscroll-contain pr-1">
          {items.map((item, index) => (
            <label key={index} className="flex cursor-pointer items-center gap-3 rounded-button border border-theme-border px-3 py-2 text-sm transition-colors hover:bg-theme-accent hover:text-theme-paper">
              <input
                type="checkbox"
                checked={selected.has(index)}
                onChange={() => toggleSelection(index)}
                className="h-4 w-4 flex-shrink-0 accent-theme-accent"
              />
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              {item.active && <span className="flex-shrink-0 text-xs font-semibold">Active</span>}
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

export default function ConditionWidget({ widget, mode, showFieldControls = true, interactive = true }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, toggleItems = [] } = widget.data;
  const items = toggleItems as ToggleItem[];
  const controlsVisible = showFieldControls && widget.data.showFieldControls !== false && interactive && mode !== 'print';
  const itemsInteractive = interactive && mode !== 'print';

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  // Fixed small sizing
  const labelClass = 'text-xs';
  const toggleClass = 'px-1.5 py-0.5 text-[10px]';
  const gapClass = 'gap-1';

  const toggleItem = (index: number) => {
    if (!itemsInteractive) return;
    const updated = [...toggleItems];
    const newActive = !updated[index].active;
    updated[index] = { ...updated[index], active: newActive };
    updateWidgetData(widget.id, { toggleItems: updated });
    addTimelineEvent(label || 'Conditions', 'TOGGLE_GROUP', `${updated[index].name}: ${newActive ? 'activated' : 'removed'}`, newActive ? '⚠️' : '✅');
  };

  // Drag-and-drop reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!itemsInteractive) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!itemsInteractive) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex === null) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mid = rect.left + rect.width / 2;
    setInsertionIndex(e.clientX < mid ? index : index + 1);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear when leaving the whole container, not a child
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setInsertionIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!itemsInteractive) return;
    e.preventDefault();
    e.stopPropagation();
    const fromIndex = draggedIndex ?? parseInt(e.dataTransfer.getData('text/plain'), 10);
    const toIndex = insertionIndex;
    setDraggedIndex(null);
    setInsertionIndex(null);
    if (toIndex === null || isNaN(fromIndex)) return;
    if (toIndex === fromIndex || toIndex === fromIndex + 1) return;
    const updated = [...toggleItems] as ToggleItem[];
    const [moved] = updated.splice(fromIndex, 1);
    const adjustedDrop = fromIndex < toIndex ? toIndex - 1 : toIndex;
    updated.splice(adjustedDrop, 0, moved);
    updateWidgetData(widget.id, { toggleItems: updated });
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setInsertionIndex(null);
  };

  const addCondition = (name: string) => {
    updateWidgetData(widget.id, { toggleItems: [...toggleItems, { name, active: false }] });
    setShowAddDialog(false);
    addTimelineEvent(label || 'Conditions', 'TOGGLE_GROUP', `Added: ${name}`, '➕');
  };

  const removeConditions = (indexes: Set<number>) => {
    const removedNames = items.filter((_, index) => indexes.has(index)).map((item) => item.name);
    updateWidgetData(widget.id, { toggleItems: items.filter((_, index) => !indexes.has(index)) });
    setShowRemoveDialog(false);
    addTimelineEvent(label || 'Conditions', 'TOGGLE_GROUP', `Removed: ${removedNames.join(', ')}`, '➖');
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {/* Header */}
      {(label || controlsVisible) && (
        <div className={`widget-structure-header flex min-h-6 flex-shrink-0 items-center gap-2 ${controlsVisible ? 'pr-4' : ''}`}>
          {label && (
            <div className={`min-w-0 flex-1 truncate font-bold ${labelClass} text-theme-ink font-heading`}>
              {label}
            </div>
          )}
          {controlsVisible && (
            <div className="condition-widget__controls widget-structure-controls ml-auto flex flex-shrink-0 items-center gap-1">
              <Tooltip content={items.length > 0 ? 'Choose conditions to remove' : 'No conditions to remove'}>
                <button
                  type="button"
                  onClick={() => setShowRemoveDialog(true)}
                  onMouseDown={(event) => event.stopPropagation()}
                  disabled={items.length === 0}
                  aria-label="Choose conditions to remove"
                  className="widget-control widget-control--subtle h-6 w-6 text-sm font-bold"
                >
                  −
                </button>
              </Tooltip>
              <Tooltip content="Add condition">
                <button
                  type="button"
                  onClick={() => setShowAddDialog(true)}
                  onMouseDown={(event) => event.stopPropagation()}
                  aria-label="Add condition"
                  className="widget-control widget-control--subtle h-6 w-6 text-sm font-bold"
                >
                  +
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      )}

      {/* Toggle Items */}
      <div
        className={`flex flex-wrap ${gapClass} overflow-y-auto flex-1 content-start`}
        onWheel={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight > el.clientHeight) e.stopPropagation();
        }}
      >
        {items.map((item, idx) => {
          const isDragging = draggedIndex === idx;
          const btn = (
            <button
              key={idx}
              draggable={itemsInteractive}
              disabled={!itemsInteractive}
              onClick={() => toggleItem(idx)}
              onMouseDown={(e) => e.stopPropagation()}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              aria-pressed={item.active}
              aria-label={`${item.name}: ${item.active ? 'active' : 'inactive'}`}
              className={`${toggleClass} border border-theme-border transition-all rounded-button font-body select-none ${itemsInteractive ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'} ${
                isDragging ? 'opacity-40' : ''
              } ${
                item.active
                  ? 'bg-theme-accent text-theme-paper'
                  : 'bg-theme-paper text-theme-ink hover:opacity-80'
              }`}
            >
              {item.name}
            </button>
          );
          const wrapped = mode === 'play' && item.tooltip ? (
            <Tooltip key={idx} content={item.tooltip}>{btn}</Tooltip>
          ) : btn;
          return (
            <span key={idx} className="inline-flex items-center">
              {insertionIndex === idx && draggedIndex !== null && (
                <span className="inline-block w-0.5 h-4 bg-theme-accent rounded-full mx-0.5 flex-shrink-0" />
              )}
              {wrapped}
            </span>
          );
        })}
        {/* Line after the last item */}
        {insertionIndex === items.length && draggedIndex !== null && (
          <span className="inline-flex items-center">
            <span className="inline-block w-0.5 h-4 bg-theme-accent rounded-full mx-0.5 flex-shrink-0" />
          </span>
        )}

        {items.length === 0 && (
          <WidgetEmptyState
            title="No active conditions"
          />
        )}
      </div>

      {showAddDialog && createPortal(
        <AddConditionModal items={items} onConfirm={addCondition} onCancel={() => setShowAddDialog(false)} />,
        document.body
      )}
      {showRemoveDialog && createPortal(
        <RemoveConditionsModal items={items} onConfirm={removeConditions} onCancel={() => setShowRemoveDialog(false)} />,
        document.body
      )}
    </div>
  );
}






