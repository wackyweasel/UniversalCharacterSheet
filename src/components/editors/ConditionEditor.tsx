import React, { useState } from 'react';
import { ToggleItem } from '../../types';
import { EditorProps } from './types';

export function ConditionEditor({ widget, updateData }: EditorProps) {
  const { label, toggleItems = [] } = widget.data;
  const [newItemName, setNewItemName] = useState('');

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

  const existingNames = toggleItems.map((item: ToggleItem) => item.name.toLowerCase());
  const availableSuggestions = SUGGESTIONS.filter(s => !existingNames.includes(s.toLowerCase()));

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <input
          className="w-full px-3 py-2 border border-theme-border rounded-theme bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={label || ''}
          onChange={(e) => updateData({ label: e.target.value })}
          placeholder="Conditions"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Conditions</label>
        <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
          {(toggleItems as ToggleItem[]).map((item, idx) => (
            <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-theme-background rounded-theme text-sm">
              <span className="text-theme-ink">{item.name}</span>
              <button
                onClick={() => removeItem(idx)}
                className="text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Add condition..."
            className="flex-1 px-2 py-1 border border-theme-border rounded-theme bg-theme-paper text-theme-ink text-sm"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-theme-accent text-theme-paper rounded-theme text-sm hover:opacity-90"
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
                  className="px-2 py-0.5 text-xs border border-theme-border rounded-theme text-theme-ink hover:bg-theme-accent hover:text-theme-paper"
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
