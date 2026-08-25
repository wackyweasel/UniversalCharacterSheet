import React, { useState, useRef } from 'react';
import { CheckboxItem } from '../../types';
import { usePointerReorder } from '../../hooks';
import { EditorProps } from './types';
import { TooltipEditButton } from './TooltipEditButton';
import { Tooltip } from '../Tooltip';
import { GripVerticalIcon, TrashIcon } from '../icons';
import { CollapsibleSection } from './CollapsibleSection';

export function CheckboxEditor({ widget, updateData }: EditorProps) {
  const { label, checkboxItems = [], checklistSettings } = widget.data;
  const [newItemName, setNewItemName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const checkboxItemsList = checkboxItems as CheckboxItem[];
  const checkboxItemIdsRef = useRef(new WeakMap<CheckboxItem, string>());
  const nextCheckboxItemIdRef = useRef(0);
  const getCheckboxItemId = (item: CheckboxItem) => {
    const existingId = checkboxItemIdsRef.current.get(item);
    if (existingId) return existingId;
    const id = `checkbox-item-${nextCheckboxItemIdRef.current++}`;
    checkboxItemIdsRef.current.set(item, id);
    return id;
  };
  const reorderableItems = checkboxItemsList.map((item) => ({ id: getCheckboxItemId(item), item }));
  const { setRowRef, startDrag, handleReorderKey } = usePointerReorder({
    items: reorderableItems,
    onReorder: (items) => updateData({ checkboxItems: items.map(({ item }) => item) }),
  });
  const strikethrough = checklistSettings?.strikethrough !== false; // Default to true

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      updateData({ checkboxItems: [...checkboxItems, { name: newItemName.trim(), checked: false }] });
      setNewItemName('');
    }
  };

  const removeItem = (index: number) => {
    const updated = [...checkboxItemsList];
    updated.splice(index, 1);
    updateData({ checkboxItems: updated });
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditingValue(checkboxItemsList[index].name);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const saveEdit = () => {
    if (editingIndex !== null && editingValue.trim()) {
      const currentItem = checkboxItemsList[editingIndex];
      const updatedItem = { ...currentItem, name: editingValue.trim() };
      const itemId = checkboxItemIdsRef.current.get(currentItem);
      if (itemId) checkboxItemIdsRef.current.set(updatedItem, itemId);
      const updated = [...checkboxItemsList];
      updated[editingIndex] = updatedItem;
      updateData({ checkboxItems: updated });
    }
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      setEditingIndex(null);
      setEditingValue('');
    }
  };

  return (
    <div className="widget-editor widget-editor--checkbox space-y-4">
      <CollapsibleSection title="General">
        <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <div className="relative">
          <input
            className="w-full px-3 py-2 pr-8 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            value={label || ''}
            onChange={(e) => updateData({ label: e.target.value })}
            placeholder="Checklist Title"
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
      
      </CollapsibleSection>

      <CollapsibleSection>
        <div className="widget-editor__section-heading">
          <h3 id={`checkbox-style-title-${widget.id}`} className="widget-editor__section-title">Style</h3>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-theme-ink">
          <input
            type="checkbox"
            checked={strikethrough}
            onChange={(e) => updateData({ checklistSettings: { ...checklistSettings, strikethrough: e.target.checked } })}
            className="rounded"
          />
          Strike through checked items
        </label>
      </CollapsibleSection>
      
      <CollapsibleSection>
        <div className="widget-editor__section-heading">
          <h3 id="checkbox-items-title" className="widget-editor__section-title">Checkbox Items</h3>
          <span className="widget-editor__section-count">{checkboxItems.length}</span>
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {reorderableItems.map(({ id, item }, idx) => (
            <div
              key={id}
              ref={(element) => setRowRef(id, element)}
              className="pointer-sort-row flex items-center gap-2 rounded-button border border-theme-border bg-theme-accent/5 p-1 text-sm transition-colors"
            >
              <Tooltip content="Drag to reorder">
                <button
                  type="button"
                  className="flex h-10 w-10 flex-shrink-0 cursor-grab items-center justify-center rounded-button px-1 text-theme-muted select-none touch-none hover:text-theme-ink active:cursor-grabbing disabled:cursor-default disabled:opacity-40"
                  onPointerDown={(event) => startDrag(id, event)}
                  onKeyDown={(event) => handleReorderKey(id, event)}
                  disabled={checkboxItemsList.length < 2}
                  aria-label={`Reorder ${item.name || `item ${idx + 1}`}`}
                  title="Drag to reorder. Arrow keys also work."
                >
                  <GripVerticalIcon className="h-4 w-4" />
                </button>
              </Tooltip>
              {editingIndex === idx ? (
                <input
                  ref={editInputRef}
                  type="text"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={handleEditKeyDown}
                  className="flex-1 px-2 py-0.5 border border-theme-accent rounded bg-theme-paper text-theme-ink text-sm"
                />
              ) : (
                <Tooltip content="Click to edit">
                  <span 
                    className="flex-1 text-theme-ink cursor-pointer hover:text-theme-accent"
                    onClick={() => startEditing(idx)}
                  >
                    {item.name}
                  </span>
                </Tooltip>
              )}
              <TooltipEditButton
                tooltip={item.tooltip}
                itemName={item.name}
                buttonClassName="h-10 w-10"
                onSave={(t) => {
                  const updatedItem = { ...checkboxItemsList[idx], tooltip: t };
                  checkboxItemIdsRef.current.set(updatedItem, id);
                  const updated = [...checkboxItemsList];
                  updated[idx] = updatedItem;
                  updateData({ checkboxItems: updated });
                }}
              />
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-button border border-theme-border text-red-500 transition-colors hover:border-red-500 hover:text-red-700"
                aria-label={`Delete ${item.name || `item ${idx + 1}`}`}
                title="Delete item"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={addItem} className="widget-editor__add-row flex gap-2 mt-2">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Add new item..."
            className="flex-1 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-theme-accent text-theme-paper rounded-button text-sm hover:opacity-90"
          >
            Add
          </button>
        </form>
      </CollapsibleSection>
    </div>
  );
}

