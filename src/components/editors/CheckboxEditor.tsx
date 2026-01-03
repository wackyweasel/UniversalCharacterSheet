import React, { useState, useRef } from 'react';
import { CheckboxItem } from '../../types';
import { EditorProps } from './types';

export function CheckboxEditor({ widget, updateData }: EditorProps) {
  const { label, checkboxItems = [], checklistSettings } = widget.data;
  const [newItemName, setNewItemName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const strikethrough = checklistSettings?.strikethrough !== false; // Default to true

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      updateData({ checkboxItems: [...checkboxItems, { name: newItemName.trim(), checked: false }] });
      setNewItemName('');
    }
  };

  const removeItem = (index: number) => {
    const updated = [...checkboxItems];
    updated.splice(index, 1);
    updateData({ checkboxItems: updated });
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditingValue((checkboxItems as CheckboxItem[])[index].name);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const saveEdit = () => {
    if (editingIndex !== null && editingValue.trim()) {
      const updated = [...checkboxItems] as CheckboxItem[];
      updated[editingIndex] = { ...updated[editingIndex], name: editingValue.trim() };
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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    // Set a drag image (helps with visibility)
    if (e.currentTarget.parentElement) {
      e.dataTransfer.setDragImage(e.currentTarget.parentElement, 0, 0);
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const fromIndex = draggedIndex ?? parseInt(e.dataTransfer.getData('text/plain'), 10);
    
    if (isNaN(fromIndex) || fromIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...checkboxItems] as CheckboxItem[];
    const [draggedItem] = updated.splice(fromIndex, 1);
    // Adjust drop index if we removed an item before it
    const adjustedDropIndex = fromIndex < dropIndex ? dropIndex - 1 : dropIndex;
    updated.splice(adjustedDropIndex, 0, draggedItem);
    updateData({ checkboxItems: updated });
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-4">
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
            <button
              type="button"
              onClick={() => updateData({ label: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-ink transition-colors"
              title="Clear label"
            >
              ×
            </button>
          )}
        </div>
      </div>
      
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-theme-ink mb-2">
          <input
            type="checkbox"
            checked={strikethrough}
            onChange={(e) => updateData({ checklistSettings: { ...checklistSettings, strikethrough: e.target.checked } })}
            className="rounded"
          />
          Strike through checked items
        </label>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Checkbox Items</label>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {(checkboxItems as CheckboxItem[]).map((item, idx) => (
            <div 
              key={idx} 
              className={`flex items-center gap-2 text-sm rounded px-1 transition-colors ${
                dragOverIndex === idx ? 'border-t-2 border-theme-accent' : ''
              } ${draggedIndex === idx ? 'opacity-50' : ''}`}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={(e) => handleDragLeave(e)}
              onDrop={(e) => handleDrop(e, idx)}
            >
              <div 
                className="cursor-grab active:cursor-grabbing text-theme-muted hover:text-theme-ink px-1 select-none"
                title="Drag to reorder"
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragEnd={handleDragEnd}
              >
                ⋮⋮
              </div>
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
                <span 
                  className="flex-1 text-theme-ink cursor-pointer hover:text-theme-accent"
                  onClick={() => startEditing(idx)}
                  title="Click to edit"
                >
                  {item.name}
                </span>
              )}
              <button
                onClick={() => removeItem(idx)}
                className="text-red-500 hover:text-red-700 px-2"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={addItem} className="flex gap-2 mt-2">
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
      </div>
    </div>
  );
}

