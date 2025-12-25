import React, { useState } from 'react';
import { FormItem } from '../../types';
import { EditorProps } from './types';
import { useTutorialStore, TUTORIAL_STEPS } from '../../store/useTutorialStore';

export function FormEditor({ widget, updateData }: EditorProps) {
  const { label, formItems = [] } = widget.data;
  const [newItemName, setNewItemName] = useState('');
  const tutorialStep = useTutorialStore((state) => state.tutorialStep);
  const advanceTutorial = useTutorialStore((state) => state.advanceTutorial);

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      updateData({ formItems: [...formItems, { name: newItemName.trim(), value: '' }] });
      setNewItemName('');
      // Advance tutorial if on step 20 (form-click-add)
      if (tutorialStep === 20 && TUTORIAL_STEPS[20]?.id === 'form-click-add') {
        advanceTutorial();
      }
    }
  };

  const removeItem = (index: number) => {
    const updated = [...formItems];
    updated.splice(index, 1);
    updateData({ formItems: updated });
  };

  const updateItemName = (index: number, name: string) => {
    const updated = [...formItems] as FormItem[];
    updated[index] = { ...updated[index], name };
    updateData({ formItems: updated });
  };

  const updateItemValue = (index: number, value: string) => {
    const updated = [...formItems] as FormItem[];
    updated[index] = { ...updated[index], value };
    updateData({ formItems: updated });
  };

  const labelWidth = widget.data.labelWidth ?? 33;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <div className="relative">
          <input
            data-tutorial="widget-label-input"
            className={`w-full px-3 py-2 pr-8 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent ${tutorialStep === 18 ? 'outline outline-4 outline-blue-500 outline-offset-2' : ''}`}
            value={label || ''}
            onChange={(e) => updateData({ label: e.target.value })}
            placeholder="Form Fields"
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
        <label className="block text-sm font-medium text-theme-ink mb-1">
          Label Width: {labelWidth}%
        </label>
        <input
          type="range"
          min="10"
          max="70"
          value={labelWidth}
          onChange={(e) => updateData({ labelWidth: parseInt(e.target.value) })}
          className="w-full accent-theme-accent"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Items</label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {(formItems as FormItem[]).map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                className="flex-1 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm"
                value={item.name}
                onChange={(e) => updateItemName(idx, e.target.value)}
                placeholder="Name"
              />
              <input
                type="text"
                className="flex-1 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm"
                value={item.value}
                onChange={(e) => updateItemValue(idx, e.target.value)}
                placeholder="Value"
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
            data-tutorial="form-field-input"
            type="text"
            value={newItemName}
            onChange={(e) => {
              setNewItemName(e.target.value);
              // Advance tutorial if on step 19 and user started typing
              if (tutorialStep === 19 && e.target.value.length > 0 && TUTORIAL_STEPS[19]?.id === 'form-type-field') {
                advanceTutorial();
              }
            }}
            placeholder="Add new field..."
            className={`flex-1 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm ${tutorialStep === 19 ? 'outline outline-4 outline-blue-500 outline-offset-2' : ''}`}
          />
          <button
            data-tutorial="form-add-button"
            type="submit"
            className={`px-3 py-1 bg-theme-accent text-theme-paper rounded-button text-sm hover:opacity-90 ${tutorialStep === 20 ? 'outline outline-4 outline-blue-500 outline-offset-2' : ''}`}
          >
            Add
          </button>
        </form>
      </div>
    </div>
  );
}

