import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Widget, WidgetType, ToggleItem, CheckboxItem, SpellLevel, NumberItem, DiceGroup, FormItem } from '../types';
import { useStore } from '../store/useStore';

interface Props {
  widget: Widget;
  onClose: () => void;
}

interface EditorProps {
  widget: Widget;
  updateData: (data: any) => void;
  updateWidth?: (width: number) => void;
}

// Individual widget editors
function NumberEditor({ widget, updateData }: EditorProps) {
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
        <input
          className="w-full px-3 py-2 border border-theme-border rounded-theme bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={label || ''}
          onChange={(e) => updateData({ label: e.target.value })}
          placeholder="Trackers"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Items</label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {(numberItems as NumberItem[]).map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                className="flex-1 px-2 py-1 border border-theme-border rounded-theme bg-theme-paper text-theme-ink text-sm"
                value={item.name}
                onChange={(e) => updateItemName(idx, e.target.value)}
                placeholder="Name"
              />
              <input
                type="number"
                className="w-20 px-2 py-1 border border-theme-border rounded-theme bg-theme-paper text-theme-ink text-sm text-center"
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
            className="flex-1 px-2 py-1 border border-theme-border rounded-theme bg-theme-paper text-theme-ink text-sm"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-theme-accent text-theme-paper rounded-theme text-sm hover:opacity-90"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  );
}

function FormEditor({ widget, updateData }: EditorProps) {
  const { label, formItems = [] } = widget.data;
  const [newItemName, setNewItemName] = useState('');

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      updateData({ formItems: [...formItems, { name: newItemName.trim(), value: '' }] });
      setNewItemName('');
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

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <input
          className="w-full px-3 py-2 border border-theme-border rounded-theme bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={label || ''}
          onChange={(e) => updateData({ label: e.target.value })}
          placeholder="Form Fields"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Items</label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {(formItems as FormItem[]).map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                className="flex-1 px-2 py-1 border border-theme-border rounded-theme bg-theme-paper text-theme-ink text-sm"
                value={item.name}
                onChange={(e) => updateItemName(idx, e.target.value)}
                placeholder="Name"
              />
              <input
                type="text"
                className="flex-1 px-2 py-1 border border-theme-border rounded-theme bg-theme-paper text-theme-ink text-sm"
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
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Add new field..."
            className="flex-1 px-2 py-1 border border-theme-border rounded-theme bg-theme-paper text-theme-ink text-sm"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-theme-accent text-theme-paper rounded-theme text-sm hover:opacity-90"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  );
}

function ListEditor({ widget, updateData }: EditorProps) {
  const { label, itemCount = 5 } = widget.data;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <input
          className="w-full px-3 py-2 border border-theme-border rounded-theme bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={label || ''}
          onChange={(e) => updateData({ label: e.target.value })}
          placeholder="List Title"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Number of Item Slots</label>
        <input
          type="number"
          min="1"
          max="50"
          className="w-full px-3 py-2 border border-theme-border rounded-theme bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={itemCount}
          onChange={(e) => updateData({ itemCount: e.target.value === '' ? '' : parseInt(e.target.value) || '' })}
          onBlur={(e) => updateData({ itemCount: Math.max(1, Math.min(50, parseInt(e.target.value) || 1)) })}
        />
        <p className="text-xs text-theme-muted mt-1">Items can be filled in during play mode</p>
      </div>
    </div>
  );
}

function TextEditor({ widget, updateData }: EditorProps) {
  const { label } = widget.data;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <input
          className="w-full px-3 py-2 border border-theme-border rounded-theme bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={label || ''}
          onChange={(e) => updateData({ label: e.target.value })}
          placeholder="Title"
        />
      </div>
      <p className="text-xs text-theme-muted">
        Use the resize handle on the widget in edit mode to adjust the size.
      </p>
    </div>
  );
}

function CheckboxEditor({ widget, updateData }: EditorProps) {
  const { label, checkboxItems = [] } = widget.data;
  const [newItemName, setNewItemName] = useState('');

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
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <input
          className="w-full px-3 py-2 border border-theme-border rounded-theme bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={label || ''}
          onChange={(e) => updateData({ label: e.target.value })}
          placeholder="Checklist Title"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Checkbox Items</label>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {(checkboxItems as CheckboxItem[]).map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <span className="flex-1 text-theme-ink">{item.name}</span>
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
            className="flex-1 px-2 py-1 border border-theme-border rounded-theme bg-theme-paper text-theme-ink text-sm"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-theme-accent text-theme-paper rounded-theme text-sm hover:opacity-90"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  );
}

function HealthBarEditor({ widget, updateData }: EditorProps) {
  const { label, maxValue = 10 } = widget.data;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <input
          className="w-full px-3 py-2 border border-theme-border rounded-theme bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={label || ''}
          onChange={(e) => updateData({ label: e.target.value })}
          placeholder="Health"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Maximum Value</label>
        <input
          type="number"
          className="w-full px-3 py-2 border border-theme-border rounded-theme bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={maxValue}
          onChange={(e) => {
            updateData({ maxValue: e.target.value === '' ? '' : parseInt(e.target.value) || '' });
          }}
          onBlur={(e) => {
            const val = parseInt(e.target.value) || 1;
            updateData({ maxValue: Math.max(1, val) });
          }}
          min={1}
        />
      </div>
    </div>
  );
}

function DiceRollerEditor({ widget, updateData }: EditorProps) {
  const { label, diceGroups = [{ count: 1, faces: 20 }], modifier = 0 } = widget.data;

  const updateDiceGroup = (index: number, field: 'count' | 'faces', value: number | string) => {
    const newGroups = [...diceGroups];
    newGroups[index] = { ...newGroups[index], [field]: value };
    updateData({ diceGroups: newGroups });
  };

  const addDiceGroup = () => {
    updateData({ diceGroups: [...diceGroups, { count: 1, faces: 6 }] });
  };

  const removeDiceGroup = (index: number) => {
    if (diceGroups.length > 1) {
      const newGroups = diceGroups.filter((_: DiceGroup, i: number) => i !== index);
      updateData({ diceGroups: newGroups });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <input
          className="w-full px-3 py-2 border border-theme-border rounded-theme bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={label || ''}
          onChange={(e) => updateData({ label: e.target.value })}
          placeholder="Roll Name"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Dice Groups</label>
        <div className="space-y-2">
          {diceGroups.map((group: DiceGroup, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={group.count}
                onChange={(e) => updateDiceGroup(index, 'count', e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                onBlur={(e) => updateDiceGroup(index, 'count', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-1 border border-theme-border rounded-theme bg-theme-paper text-theme-ink text-sm text-center"
              />
              <span className="text-theme-ink">d</span>
              <input
                type="number"
                min="1"
                value={group.faces}
                onChange={(e) => updateDiceGroup(index, 'faces', e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                onBlur={(e) => updateDiceGroup(index, 'faces', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-1 border border-theme-border rounded-theme bg-theme-paper text-theme-ink text-sm text-center"
              />
              {diceGroups.length > 1 && (
                <button
                  onClick={() => removeDiceGroup(index)}
                  className="text-red-500 hover:text-red-700 px-2"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addDiceGroup}
          className="mt-2 px-3 py-1 border border-theme-border rounded-theme text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper"
        >
          + Add Dice
        </button>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Modifier</label>
        <input
          type="number"
          className="w-full px-3 py-2 border border-theme-border rounded-theme bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={modifier}
          onChange={(e) => updateData({ modifier: parseInt(e.target.value) || 0 })}
        />
      </div>
    </div>
  );
}

function DiceTrayEditor({ widget, updateData }: EditorProps) {
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
        <input
          className="w-full px-3 py-2 border border-theme-border rounded-theme bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={label || ''}
          onChange={(e) => updateData({ label: e.target.value })}
          placeholder="Dice Tray"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Quick Add Common Dice</label>
        <div className="flex flex-wrap gap-2">
          {COMMON_DICE.map((faces) => (
            <button
              key={faces}
              onClick={() => toggleDice(faces)}
              className={`px-3 py-2 border border-theme-border rounded-theme text-sm font-bold transition-all ${
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
              className="w-20 px-2 py-1 border border-theme-border rounded-theme bg-theme-paper text-theme-ink text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1 bg-theme-accent text-theme-paper rounded-theme text-sm hover:opacity-90"
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
                className="flex items-center gap-1 px-2 py-1 bg-theme-accent text-theme-paper rounded-theme text-sm"
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

function SpellSlotEditor({ widget, updateData }: EditorProps) {
  const { label, spellLevels = [{ level: 1, max: 4, used: 0 }] } = widget.data;

  const addLevel = () => {
    const existingLevels = (spellLevels as SpellLevel[]).map(l => l.level);
    const nextLevel = Math.min(9, Math.max(...existingLevels, 0) + 1);
    if (nextLevel <= 9 && !existingLevels.includes(nextLevel)) {
      updateData({ 
        spellLevels: [...spellLevels, { level: nextLevel, max: 2, used: 0 }]
      });
    }
  };

  const removeLevel = (levelIdx: number) => {
    const updated = [...spellLevels];
    updated.splice(levelIdx, 1);
    updateData({ spellLevels: updated });
  };

  const updateLevelMax = (levelIdx: number, max: number | string) => {
    const updated = [...spellLevels] as SpellLevel[];
    if (typeof max === 'string') {
      updated[levelIdx] = { ...updated[levelIdx], max: max as unknown as number };
    } else {
      const newMax = Math.max(1, Math.min(10, max));
      updated[levelIdx] = { 
        ...updated[levelIdx], 
        max: newMax,
        used: Math.min(updated[levelIdx].used, newMax)
      };
    }
    updateData({ spellLevels: updated });
  };

  const updateLevelNumber = (levelIdx: number, level: number | string) => {
    const updated = [...spellLevels] as SpellLevel[];
    if (typeof level === 'string') {
      updated[levelIdx] = { ...updated[levelIdx], level: level as unknown as number };
    } else {
      updated[levelIdx] = { ...updated[levelIdx], level: Math.max(1, Math.min(9, level)) };
    }
    updateData({ spellLevels: updated });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <input
          className="w-full px-3 py-2 border border-theme-border rounded-theme bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={label || ''}
          onChange={(e) => updateData({ label: e.target.value })}
          placeholder="Spell Slots"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Spell Levels</label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {(spellLevels as SpellLevel[]).map((levelData, levelIdx) => (
            <div key={levelIdx} className="flex items-center gap-2">
              <span className="text-theme-ink text-sm">Level</span>
              <input
                type="number"
                value={levelData.level}
                onChange={(e) => updateLevelNumber(levelIdx, e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                onBlur={(e) => updateLevelNumber(levelIdx, Math.max(1, Math.min(9, parseInt(e.target.value) || 1)))}
                className="w-12 px-2 py-1 border border-theme-border rounded-theme bg-theme-paper text-theme-ink text-sm text-center"
                min={1}
                max={9}
              />
              <span className="text-theme-ink text-sm">Max Slots</span>
              <input
                type="number"
                value={levelData.max}
                onChange={(e) => updateLevelMax(levelIdx, e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                onBlur={(e) => updateLevelMax(levelIdx, Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                className="w-12 px-2 py-1 border border-theme-border rounded-theme bg-theme-paper text-theme-ink text-sm text-center"
                min={1}
                max={10}
              />
              <button
                onClick={() => removeLevel(levelIdx)}
                className="text-red-500 hover:text-red-700 px-2"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {(spellLevels as SpellLevel[]).length < 9 && (
          <button
            onClick={addLevel}
            className="mt-2 px-3 py-1 border border-theme-border rounded-theme text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper"
          >
            + Add Level
          </button>
        )}
      </div>
    </div>
  );
}

function ImageEditor({ widget, updateData }: EditorProps) {
  const { label, imageUrl = '' } = widget.data;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        updateData({ imageUrl: dataUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    updateData({ imageUrl: '' });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <input
          className="w-full px-3 py-2 border border-theme-border rounded-theme bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={label || ''}
          onChange={(e) => updateData({ label: e.target.value })}
          placeholder="Portrait"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Image</label>
        <div className="flex gap-2">
          <label className="flex-1 px-3 py-2 bg-theme-accent text-theme-paper rounded-theme text-sm hover:opacity-90 cursor-pointer text-center">
            Upload Image
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          {imageUrl && (
            <button
              onClick={clearImage}
              className="px-3 py-2 border border-theme-border rounded-theme text-sm text-theme-ink hover:bg-red-500 hover:text-white hover:border-red-500"
            >
              Clear
            </button>
          )}
        </div>
        {imageUrl && (
          <div className="mt-2 border border-theme-border rounded-theme overflow-hidden">
            <img src={imageUrl} alt="Preview" className="w-full h-32 object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}

function PoolEditor({ widget, updateData }: EditorProps) {
  const { label, maxPool = 5, poolStyle = 'dots' } = widget.data;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <input
          className="w-full px-3 py-2 border border-theme-border rounded-theme bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={label || ''}
          onChange={(e) => updateData({ label: e.target.value })}
          placeholder="Resource Pool"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Maximum Pool</label>
        <input
          type="number"
          className="w-full px-3 py-2 border border-theme-border rounded-theme bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={maxPool}
          onChange={(e) => {
            updateData({ maxPool: e.target.value === '' ? '' : parseInt(e.target.value) || '' });
          }}
          onBlur={(e) => {
            const val = Math.max(1, Math.min(1000, parseInt(e.target.value) || 1));
            updateData({ maxPool: val });
          }}
          min={1}
          max={1000}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Style</label>
        <select
          value={poolStyle}
          onChange={(e) => updateData({ poolStyle: e.target.value })}
          className="w-full px-3 py-2 border border-theme-border rounded-theme bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
        >
          <option value="dots">Dots</option>
          <option value="boxes">Boxes</option>
          <option value="hearts">Hearts</option>
        </select>
      </div>
    </div>
  );
}

function ConditionEditor({ widget, updateData }: EditorProps) {
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

function TimeTrackerEditor({ widget, updateData }: EditorProps) {
  const { label, roundMode = false } = widget.data;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <input
          className="w-full px-3 py-2 border border-theme-border rounded-theme bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={label || ''}
          onChange={(e) => updateData({ label: e.target.value })}
          placeholder="Time Tracker"
        />
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={roundMode}
            onChange={(e) => updateData({ roundMode: e.target.checked })}
            className="w-4 h-4 accent-theme-accent"
          />
          <span className="text-sm font-medium text-theme-ink">Round Mode</span>
        </label>
        <p className="text-xs text-theme-muted mt-1 ml-6">
          In round mode, time is tracked in rounds instead of real-world time units.
        </p>
      </div>
      
      <div className="text-sm text-theme-muted">
        <p>Use this widget to track timed effects in your game.</p>
        <ul className="list-disc ml-4 mt-2 space-y-1">
          <li>Add effects with their remaining duration</li>
          <li>{roundMode ? 'Use "Pass Round" to advance all timers by 1 round' : 'Use the "Pass Time" controls to advance all timers at once'}</li>
          <li>Expired effects will be highlighted</li>
        </ul>
      </div>
    </div>
  );
}

function TableEditor({ widget, updateData }: EditorProps) {
  const { label, columns = ['Item', 'Qty', 'Weight'], rows = [] } = widget.data;

  const handleColumnChange = (index: number, value: string) => {
    const newColumns = [...columns];
    newColumns[index] = value;
    updateData({ columns: newColumns });
  };

  const addColumn = () => {
    updateData({ columns: [...columns, 'New'] });
  };

  const removeColumn = (index: number) => {
    if (columns.length <= 1) return;
    const newColumns = [...columns];
    newColumns.splice(index, 1);
    updateData({ columns: newColumns });
  };

  const addRow = () => {
    const newRow = { cells: columns.map(() => '') };
    updateData({ rows: [...rows, newRow] });
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    const newRows = [...rows];
    newRows.splice(index, 1);
    updateData({ rows: newRows });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <input
          className="w-full px-3 py-2 border border-theme-border rounded-theme bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={label || ''}
          onChange={(e) => updateData({ label: e.target.value })}
          placeholder="Inventory"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Columns</label>
        <div className="space-y-2">
          {columns.map((col: string, idx: number) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                className="flex-1 px-2 py-1 border border-theme-border rounded-theme bg-theme-paper text-theme-ink text-sm"
                value={col}
                onChange={(e) => handleColumnChange(idx, e.target.value)}
                placeholder="Column name"
              />
              {columns.length > 1 && (
                <button
                  onClick={() => removeColumn(idx)}
                  className="text-red-500 hover:text-red-700 px-2"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addColumn}
          className="mt-2 px-3 py-1 border border-theme-border rounded-theme text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper"
        >
          + Add Column
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Rows ({rows.length})</label>
        <div className="flex gap-2">
          <button
            onClick={addRow}
            className="px-3 py-1 border border-theme-border rounded-theme text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper"
          >
            + Add Row
          </button>
          {rows.length > 1 && (
            <button
              onClick={() => removeRow(rows.length - 1)}
              className="px-3 py-1 border border-theme-border rounded-theme text-sm text-red-500 hover:bg-red-500 hover:text-white"
            >
              - Remove Row
            </button>
          )}
        </div>
        <p className="text-xs text-theme-muted mt-1">Row contents can be edited in play mode</p>
      </div>
    </div>
  );
}

// Widget preview components (play mode view)
import NumberWidget from './widgets/NumberWidget';
import ListWidget from './widgets/ListWidget';
import TextWidget from './widgets/TextWidget';
import CheckboxWidget from './widgets/CheckboxWidget';
import HealthBarWidget from './widgets/HealthBarWidget';
import DiceRollerWidget from './widgets/DiceRollerWidget';
import DiceTrayWidget from './widgets/DiceTrayWidget';
import SpellSlotWidget from './widgets/SpellSlotWidget';
import ImageWidget from './widgets/ImageWidget';
import PoolWidget from './widgets/PoolWidget';
import ConditionWidget from './widgets/ConditionWidget';
import TableWidget from './widgets/TableWidget';
import TimeTrackerWidget from './widgets/TimeTrackerWidget';
import FormWidget from './widgets/FormWidget';

function getWidgetTitle(type: WidgetType): string {
  const titles: Record<WidgetType, string> = {
    'NUMBER': 'Number Tracker',
    'LIST': 'List',
    'TEXT': 'Text',
    'CHECKBOX': 'Checkbox',
    'HEALTH_BAR': 'Health Bar',
    'DICE_ROLLER': 'Dice Roller',
    'DICE_TRAY': 'Dice Tray',
    'SPELL_SLOT': 'Spell Slots',
    'IMAGE': 'Image',
    'POOL': 'Resource Pool',
    'TOGGLE_GROUP': 'Conditions',
    'TABLE': 'Table',
    'TIME_TRACKER': 'Time Tracker',
    'FORM': 'Form',
  };
  return titles[type] || 'Widget';
}

export default function WidgetEditModal({ widget, onClose }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const updateWidgetSize = useStore((state) => state.updateWidgetSize);
  const [localData, setLocalData] = useState({ ...widget.data });
  const [localWidth, setLocalWidth] = useState(widget.w || 200);

  const handleUpdateData = (data: any) => {
    const newData = { ...localData, ...data };
    setLocalData(newData);
    updateWidgetData(widget.id, data);
  };

  const handleUpdateWidth = (width: number) => {
    setLocalWidth(width);
    updateWidgetSize(widget.id, width, widget.h || 0);
  };

  // Create a preview widget with the current data and width
  const previewWidget = { ...widget, data: localData, w: localWidth };

  const renderEditor = () => {
    const editorProps = { widget: previewWidget, updateData: handleUpdateData, updateWidth: handleUpdateWidth };
    
    switch (widget.type) {
      case 'NUMBER': return <NumberEditor {...editorProps} />;
      case 'LIST': return <ListEditor {...editorProps} />;
      case 'TEXT': return <TextEditor {...editorProps} />;
      case 'CHECKBOX': return <CheckboxEditor {...editorProps} />;
      case 'HEALTH_BAR': return <HealthBarEditor {...editorProps} />;
      case 'DICE_ROLLER': return <DiceRollerEditor {...editorProps} />;
      case 'DICE_TRAY': return <DiceTrayEditor {...editorProps} />;
      case 'SPELL_SLOT': return <SpellSlotEditor {...editorProps} />;
      case 'IMAGE': return <ImageEditor {...editorProps} />;
      case 'POOL': return <PoolEditor {...editorProps} />;
      case 'TOGGLE_GROUP': return <ConditionEditor {...editorProps} />;
      case 'TABLE': return <TableEditor {...editorProps} />;
      case 'TIME_TRACKER': return <TimeTrackerEditor {...editorProps} />;
      case 'FORM': return <FormEditor {...editorProps} />;
      default: return null;
    }
  };

  const renderPreview = () => {
    // Use fixed preview dimensions
    const props = { widget: previewWidget, mode: 'play' as const, width: 200, height: 200 };
    
    switch (widget.type) {
      case 'NUMBER': return <NumberWidget {...props} />;
      case 'LIST': return <ListWidget {...props} />;
      case 'TEXT': return <TextWidget {...props} />;
      case 'CHECKBOX': return <CheckboxWidget {...props} />;
      case 'HEALTH_BAR': return <HealthBarWidget {...props} />;
      case 'DICE_ROLLER': return <DiceRollerWidget {...props} />;
      case 'DICE_TRAY': return <DiceTrayWidget {...props} />;
      case 'SPELL_SLOT': return <SpellSlotWidget {...props} />;
      case 'IMAGE': return <ImageWidget {...props} />;
      case 'POOL': return <PoolWidget {...props} />;
      case 'TOGGLE_GROUP': return <ConditionWidget {...props} />;
      case 'TABLE': return <TableWidget {...props} />;
      case 'TIME_TRACKER': return <TimeTrackerWidget {...props} />;
      case 'FORM': return <FormWidget {...props} />;
      default: return null;
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div className="bg-theme-paper border-[length:var(--border-width)] border-theme-border rounded-none sm:rounded-theme shadow-theme sm:max-w-2xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-theme-border">
          <h2 className="text-lg font-bold text-theme-ink font-heading">
            Edit {getWidgetTitle(widget.type)}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-theme-muted hover:text-theme-ink hover:bg-theme-background rounded-theme transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Editor Section */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-theme-muted mb-3">Settings</h3>
              {renderEditor()}
            </div>

            {/* Preview Section */}
            <div className="lg:w-72 flex-shrink-0">
              <h3 className="text-sm font-medium text-theme-muted mb-3">Preview</h3>
              <div 
                className="bg-theme-paper border-[length:var(--border-width)] border-theme-border rounded-theme p-2 sm:p-4 shadow-theme"
                style={{ width: '200px' }}
              >
                {renderPreview()}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-theme-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-theme-accent text-theme-paper rounded-theme hover:opacity-90 font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
