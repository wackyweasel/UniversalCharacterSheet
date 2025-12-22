import React, { useState } from 'react';
import { DisplayNumber } from '../../types';
import { EditorProps } from './types';

export function NumberDisplayEditor({ widget, updateData }: EditorProps) {
  const { label, displayNumbers = [], displayLayout = 'horizontal' } = widget.data;
  const [newItemLabel, setNewItemLabel] = useState('');

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemLabel.trim()) {
      updateData({ displayNumbers: [...displayNumbers, { label: newItemLabel.trim(), value: 0 }] });
      setNewItemLabel('');
    }
  };

  const removeItem = (index: number) => {
    const updated = [...displayNumbers];
    updated.splice(index, 1);
    updateData({ displayNumbers: updated });
  };

  const updateItemLabel = (index: number, label: string) => {
    const updated = [...displayNumbers] as DisplayNumber[];
    updated[index] = { ...updated[index], label };
    updateData({ displayNumbers: updated });
  };

  const updateItemValue = (index: number, value: number) => {
    const updated = [...displayNumbers] as DisplayNumber[];
    updated[index] = { ...updated[index], value };
    updateData({ displayNumbers: updated });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <input
          className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={label || ''}
          onChange={(e) => updateData({ label: e.target.value })}
          placeholder="Stats"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Layout</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="displayLayout"
              value="horizontal"
              checked={displayLayout === 'horizontal'}
              onChange={(e) => updateData({ displayLayout: e.target.value })}
              className="w-4 h-4 text-theme-accent border-theme-border focus:ring-theme-accent"
            />
            <span className="text-sm text-theme-ink">Horizontal</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="displayLayout"
              value="vertical"
              checked={displayLayout === 'vertical'}
              onChange={(e) => updateData({ displayLayout: e.target.value })}
              className="w-4 h-4 text-theme-accent border-theme-border focus:ring-theme-accent"
            />
            <span className="text-sm text-theme-ink">Vertical</span>
          </label>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Numbers</label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {(displayNumbers as DisplayNumber[]).map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                className="flex-1 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm"
                value={item.label}
                onChange={(e) => updateItemLabel(idx, e.target.value)}
                placeholder="Label"
              />
              <input
                type="number"
                className="w-20 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm text-center"
                value={item.value}
                onChange={(e) => updateItemValue(idx, parseInt(e.target.value) || 0)}
              />
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
            value={newItemLabel}
            onChange={(e) => setNewItemLabel(e.target.value)}
            placeholder="Add new number..."
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

