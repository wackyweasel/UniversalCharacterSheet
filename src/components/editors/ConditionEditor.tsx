import React, { useState } from 'react';
import { ToggleItem } from '../../types';
import { EditorProps } from './types';
import { TooltipEditButton } from './TooltipEditButton';
import { Tooltip } from '../Tooltip';

export function ConditionEditor({ widget, updateData }: EditorProps) {
  const { label, toggleItems = [] } = widget.data;
  const [newItemName, setNewItemName] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);

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

  // Drag-and-drop handlers
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
    const mid = rect.top + rect.height / 2;
    setInsertionIndex(e.clientY < mid ? index : index + 1);
  };

  const handleDragLeave = (e: React.DragEvent) => {
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
    updateData({ toggleItems: updated });
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setInsertionIndex(null);
  };

  const existingNames = toggleItems.map((item: ToggleItem) => item.name.toLowerCase());
  const availableSuggestions = SUGGESTIONS.filter(s => !existingNames.includes(s.toLowerCase()));

  return (
    <div className="space-y-4">
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
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Conditions</label>
        <div className="flex flex-col max-h-48 overflow-y-auto">
          {(toggleItems as ToggleItem[]).map((item, idx) => (
            <React.Fragment key={idx}>
              {insertionIndex === idx && draggedIndex !== null && (
                <div className="h-0.5 w-full bg-theme-accent rounded-full my-0.5 flex-shrink-0" />
              )}
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-1 px-2 py-1 bg-theme-background rounded-button text-sm cursor-grab active:cursor-grabbing transition-all ${
                  draggedIndex === idx ? 'opacity-40' : ''
                }`}
              >
                <span className="text-theme-muted mr-1 select-none">⠿</span>
                <span className="text-theme-ink flex-1">{item.name}</span>
                <TooltipEditButton
                  tooltip={item.tooltip}
                  itemName={item.name}
                  onSave={(t) => {
                    const updated = [...toggleItems] as ToggleItem[];
                    updated[idx] = { ...updated[idx], tooltip: t };
                    updateData({ toggleItems: updated });
                  }}
                />
                <button
                  onClick={() => removeItem(idx)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            </React.Fragment>
          ))}
          {insertionIndex === (toggleItems as ToggleItem[]).length && draggedIndex !== null && (
            <div className="h-0.5 w-full bg-theme-accent rounded-full my-0.5 flex-shrink-0" />
          )}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
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
          <div className="mt-2">
            <span className="text-xs text-theme-muted">Quick add:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {availableSuggestions.slice(0, 8).map((suggestion) => (
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
      </div>
    </div>
  );
}

