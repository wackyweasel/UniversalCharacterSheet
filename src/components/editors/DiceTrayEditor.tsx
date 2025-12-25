import React, { useState } from 'react';
import { EditorProps } from './types';

export function DiceTrayEditor({ widget, updateData }: EditorProps) {
  const { label, availableDice = [4, 6, 8, 10, 12, 20] } = widget.data;
  const [newDiceFaces, setNewDiceFaces] = useState('');
  
  const COMMON_DICE = [4, 6, 8, 10, 12, 20, 100];

  const toggleDice = (faces: number) => {
    const current = availableDice as number[];
    if (current.includes(faces)) {
      // Remove the dice type
      updateData({ availableDice: current.filter(d => d !== faces) });
    } else {
      // Add the dice type and sort
      updateData({ availableDice: [...current, faces].sort((a, b) => a - b) });
    }
  };

  const addCustomDice = (e: React.FormEvent) => {
    e.preventDefault();
    const faces = parseInt(newDiceFaces);
    if (faces && faces > 0 && !(availableDice as number[]).includes(faces)) {
      updateData({ availableDice: [...(availableDice as number[]), faces].sort((a, b) => a - b) });
      setNewDiceFaces('');
    }
  };

  const removeDice = (faces: number) => {
    updateData({ availableDice: (availableDice as number[]).filter(d => d !== faces) });
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
            placeholder="Dice Tray"
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
        <label className="block text-sm font-medium text-theme-ink mb-2">Quick Add Common Dice</label>
        <div className="flex flex-wrap gap-2">
          {COMMON_DICE.map((faces) => (
            <button
              key={faces}
              onClick={() => toggleDice(faces)}
              className={`px-3 py-2 border border-theme-border rounded-button text-sm font-bold transition-all ${
                (availableDice as number[]).includes(faces)
                  ? 'bg-theme-accent text-theme-paper'
                  : 'bg-theme-paper text-theme-ink hover:bg-theme-muted hover:text-theme-paper'
              }`}
            >
              d{faces}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Add Custom Dice</label>
        <form onSubmit={addCustomDice} className="flex gap-2">
          <div className="flex items-center gap-1">
            <span className="text-theme-ink">d</span>
            <input
              type="number"
              min="1"
              value={newDiceFaces}
              onChange={(e) => setNewDiceFaces(e.target.value)}
              placeholder="faces"
              className="w-20 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1 bg-theme-accent text-theme-paper rounded-button text-sm hover:opacity-90"
          >
            Add
          </button>
        </form>
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Current Dice Types</label>
        {(availableDice as number[]).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {(availableDice as number[]).map((faces) => (
              <div
                key={faces}
                className="flex items-center gap-1 px-2 py-1 bg-theme-accent text-theme-paper rounded-button text-sm"
              >
                <span>d{faces}</span>
                <button
                  onClick={() => removeDice(faces)}
                  className="hover:text-red-300 ml-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-theme-muted">No dice types selected</p>
        )}
      </div>
    </div>
  );
}

