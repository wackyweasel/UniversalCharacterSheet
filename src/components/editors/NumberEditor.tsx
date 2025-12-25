import React, { useState } from 'react';
import { NumberItem } from '../../types';
import { EditorProps } from './types';

export function NumberEditor({ widget, updateData }: EditorProps) {
  const { label, numberItems = [] } = widget.data;
  const [newItemName, setNewItemName] = useState('');

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      updateData({ numberItems: [...numberItems, { name: newItemName.trim(), value: 0 }] });
      setNewItemName('');
    }
  };

  const removeItem = (index: number) => {
    const updated = [...numberItems];
    updated.splice(index, 1);
    updateData({ numberItems: updated });
  };

  const updateItemName = (index: number, name: string) => {
    const updated = [...numberItems] as NumberItem[];
    updated[index] = { ...updated[index], name };
    updateData({ numberItems: updated });
  };

  const updateItemValue = (index: number, value: number) => {
    const updated = [...numberItems] as NumberItem[];
    updated[index] = { ...updated[index], value };
    updateData({ numberItems: updated });
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
            placeholder="Trackers"
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
        <label className="block text-sm font-medium text-theme-ink mb-2">Items</label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {(numberItems as NumberItem[]).map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                className="flex-1 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm"
                value={item.name}
                onChange={(e) => updateItemName(idx, e.target.value)}
                placeholder="Name"
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

