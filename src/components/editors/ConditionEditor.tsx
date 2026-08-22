import React, { useRef, useState } from 'react';
import { ToggleItem } from '../../types';
import { usePointerReorder } from '../../hooks';
import { EditorProps } from './types';
import { TooltipEditButton } from './TooltipEditButton';
import { Tooltip } from '../Tooltip';
import { GripVerticalIcon, TrashIcon } from '../icons';

export function ConditionEditor({ widget, updateData }: EditorProps) {
  const { label, toggleItems = [] } = widget.data;
  const [newItemName, setNewItemName] = useState('');
  const toggleItemsList = toggleItems as ToggleItem[];
  const toggleItemIdsRef = useRef(new WeakMap<ToggleItem, string>());
  const nextToggleItemIdRef = useRef(0);
  const getToggleItemId = (item: ToggleItem) => {
    const existingId = toggleItemIdsRef.current.get(item);
    if (existingId) return existingId;
    const id = `condition-item-${nextToggleItemIdRef.current++}`;
    toggleItemIdsRef.current.set(item, id);
    return id;
  };
  const reorderableItems = toggleItemsList.map((item) => ({ id: getToggleItemId(item), item }));
  const { setRowRef, startDrag, handleReorderKey } = usePointerReorder({
    items: reorderableItems,
    onReorder: (items) => updateData({ toggleItems: items.map(({ item }) => item) }),
  });

  const SUGGESTIONS = [
    'Blinded', 'Charmed', 'Frightened', 'Poisoned', 'Stunned', 
    'Prone', 'Invisible', 'Paralyzed', 'Unconscious', 'Exhausted',
    'Afraid', 'Angry', 'Confused', 'Wounded', 'Dazed'
  ];

  const addItem = (name: string) => {
    if (name.trim() && !toggleItems.some((item: ToggleItem) => item.name.toLowerCase() === name.trim().toLowerCase())) {
      updateData({ 
        toggleItems: [...toggleItems, { name: name.trim(), active: false }]
      });
    }
    setNewItemName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addItem(newItemName);
  };

  const removeItem = (index: number) => {
    const updated = [...toggleItems];
    updated.splice(index, 1);
    updateData({ toggleItems: updated });
  };

  const existingNames = toggleItemsList.map((item) => item.name.toLowerCase());
  const availableSuggestions = SUGGESTIONS.filter(s => !existingNames.includes(s.toLowerCase()));

  return (
    <div className="widget-editor widget-editor--conditions space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <div className="relative">
          <input
            className="w-full px-3 py-2 pr-8 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            value={label || ''}
            onChange={(e) => updateData({ label: e.target.value })}
            placeholder="Conditions"
          />
          {label && (
            <Tooltip content="Clear label">
              <button
                type="button"
                onClick={() => updateData({ label: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-ink transition-colors"
              >
                ×
              </button>
            </Tooltip>
          )}
        </div>
      </div>
      
      <section className="widget-editor__section" aria-labelledby={`conditions-title-${widget.id}`}>
        <div className="widget-editor__section-heading">
          <h3 id={`conditions-title-${widget.id}`} className="widget-editor__section-title">Conditions</h3>
          <span className="widget-editor__section-count">{toggleItems.length}</span>
        </div>
        <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
          {reorderableItems.map(({ id, item }, idx) => (
              <div
                key={id}
                ref={(element) => setRowRef(id, element)}
                className="pointer-sort-row flex items-center gap-1 rounded-button border border-theme-border bg-theme-paper px-2 py-1 text-sm transition-colors"
              >
                <Tooltip content="Drag to reorder">
                  <button
                    type="button"
                    className="flex h-10 w-10 flex-shrink-0 cursor-grab items-center justify-center rounded-button px-1 text-theme-muted select-none touch-none hover:text-theme-ink active:cursor-grabbing disabled:cursor-default disabled:opacity-40"
                    onPointerDown={(event) => startDrag(id, event)}
                    onKeyDown={(event) => handleReorderKey(id, event)}
                    disabled={toggleItemsList.length < 2}
                    aria-label={`Reorder ${item.name || `condition ${idx + 1}`}`}
                    title="Drag to reorder. Arrow keys also work."
                  >
                    <GripVerticalIcon className="h-4 w-4" />
                  </button>
                </Tooltip>
                <span className="text-theme-ink flex-1">{item.name}</span>
                <TooltipEditButton
                  tooltip={item.tooltip}
                  itemName={item.name}
                  buttonClassName="h-10 w-10"
                  onSave={(t) => {
                    const updatedItem = { ...toggleItemsList[idx], tooltip: t };
                    toggleItemIdsRef.current.set(updatedItem, id);
                    const updated = [...toggleItemsList];
                    updated[idx] = updatedItem;
                    updateData({ toggleItems: updated });
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-button border border-theme-border text-red-500 transition-colors hover:border-red-500 hover:text-red-700"
                  aria-label={`Delete ${item.name || `condition ${idx + 1}`}`}
                  title="Delete condition"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="widget-editor__add-row flex gap-2">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Add condition..."
            className="flex-1 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-theme-accent text-theme-paper rounded-button text-sm hover:opacity-90"
          >
            Add
          </button>
        </form>
        {availableSuggestions.length > 0 && (
          <div className="mt-3">
            <span className="text-xs font-medium text-theme-muted">Quick add common conditions</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {availableSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => addItem(suggestion)}
                  className="px-2 py-0.5 text-xs border border-theme-border rounded-button text-theme-ink hover:bg-theme-accent hover:text-theme-paper"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

