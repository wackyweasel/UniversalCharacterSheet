import { useState, useRef } from 'react';
import { Widget, ToggleItem } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { Tooltip } from '../Tooltip';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
}

export default function ConditionWidget({ widget, mode }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, toggleItems = [] } = widget.data;

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newName, setNewName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Fixed small sizing
  const labelClass = 'text-xs';
  const toggleClass = 'px-1.5 py-0.5 text-[10px]';
  const gapClass = 'gap-1';

  const toggleItem = (index: number) => {
    const updated = [...toggleItems];
    const newActive = !updated[index].active;
    updated[index] = { ...updated[index], active: newActive };
    updateWidgetData(widget.id, { toggleItems: updated });
    addTimelineEvent(label || 'Conditions', 'TOGGLE_GROUP', `${updated[index].name}: ${newActive ? 'activated' : 'removed'}`, newActive ? '⚠️' : '✅');
  };

  // Drag-and-drop reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
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

  // Inline add
  const commitAdd = () => {
    const name = newName.trim();
    if (name && !(toggleItems as ToggleItem[]).some((i) => i.name.toLowerCase() === name.toLowerCase())) {
      updateWidgetData(widget.id, { toggleItems: [...toggleItems, { name, active: false }] });
    }
    setNewName('');
    setShowAddInput(false);
  };

  const handleAddKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commitAdd(); }
    if (e.key === 'Escape') { setNewName(''); setShowAddInput(false); }
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {/* Header */}
      {label && (
        <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {label}
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
        {(toggleItems as ToggleItem[]).map((item, idx) => {
          const isDragging = draggedIndex === idx;
          const btn = (
            <button
              key={idx}
              draggable={mode !== 'print'}
              onClick={() => toggleItem(idx)}
              onMouseDown={(e) => e.stopPropagation()}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              className={`${toggleClass} border border-theme-border transition-all rounded-button font-body cursor-grab active:cursor-grabbing select-none ${
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
        {insertionIndex === (toggleItems as ToggleItem[]).length && draggedIndex !== null && (
          <span className="inline-flex items-center">
            <span className="inline-block w-0.5 h-4 bg-theme-accent rounded-full mx-0.5 flex-shrink-0" />
          </span>
        )}

        {toggleItems.length === 0 && !showAddInput && (
          <div className={`${toggleClass} text-theme-muted italic`}>No conditions</div>
        )}

        {/* Inline Add Input */}
        {showAddInput && mode !== 'print' && (
          <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleAddKeyDown}
              onBlur={commitAdd}
              placeholder="Condition…"
              className="px-1.5 py-0.5 text-[10px] border border-theme-accent rounded-button bg-theme-paper text-theme-ink focus:outline-none w-24"
            />
          </div>
        )}

        {/* Add "+" button */}
        {mode !== 'print' && !showAddInput && (
          <Tooltip content="Add condition">
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => { setShowAddInput(true); setTimeout(() => inputRef.current?.focus(), 0); }}
              className={`${toggleClass} border border-dashed border-theme-border rounded-button text-theme-muted hover:text-theme-accent hover:border-theme-accent transition-colors`}
            >
              +
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}






