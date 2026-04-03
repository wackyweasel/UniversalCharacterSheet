import React, { useState } from 'react';
import { StepDiceItem } from '../../types';
import { EditorProps } from './types';
import { TooltipEditButton } from './TooltipEditButton';

const DEFAULT_DICE_CHAIN = [4, 6, 8, 10, 12, 20];

export function StepDiceEditor({ widget, updateData }: EditorProps) {
  const { label, stepDiceItems = [], stepDiceChain } = widget.data;
  const diceChain = stepDiceChain && stepDiceChain.length > 0 ? stepDiceChain : DEFAULT_DICE_CHAIN;
  const [newItemName, setNewItemName] = useState('');
  const [newDieFaces, setNewDieFaces] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);

  const addItem = (name: string) => {
    if (name.trim()) {
      updateData({
        stepDiceItems: [...stepDiceItems, { name: name.trim(), currentStep: 0 }]
      });
    }
    setNewItemName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addItem(newItemName);
  };

  const removeItem = (index: number) => {
    const updated = [...stepDiceItems];
    updated.splice(index, 1);
    updateData({ stepDiceItems: updated });
  };

  const updateItemName = (index: number, name: string) => {
    const updated = [...stepDiceItems] as StepDiceItem[];
    updated[index] = { ...updated[index], name };
    updateData({ stepDiceItems: updated });
  };

  const updateItemStep = (index: number, currentStep: number) => {
    const updated = [...stepDiceItems] as StepDiceItem[];
    updated[index] = { ...updated[index], currentStep };
    updateData({ stepDiceItems: updated });
  };

  const updateItemTooltip = (index: number, tooltip: string | undefined) => {
    const updated = [...stepDiceItems] as StepDiceItem[];
    updated[index] = { ...updated[index], tooltip };
    updateData({ stepDiceItems: updated });
  };

  const insertDie = (faces: number) => {
    // Find sorted insertion index
    let insertIdx = diceChain.length;
    for (let i = 0; i < diceChain.length; i++) {
      if (faces <= diceChain[i]) { insertIdx = i; break; }
    }
    const newChain = [...diceChain.slice(0, insertIdx), faces, ...diceChain.slice(insertIdx)];
    // Shift item currentStep values for items at or after the insertion point
    const adjustedItems = stepDiceItems.map((item: StepDiceItem) => ({
      ...item,
      currentStep: item.currentStep >= insertIdx ? item.currentStep + 1 : item.currentStep,
    }));
    updateData({ stepDiceChain: newChain, stepDiceItems: adjustedItems });
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
    const updated = [...stepDiceItems] as StepDiceItem[];
    const [moved] = updated.splice(fromIndex, 1);
    const adjustedDrop = fromIndex < toIndex ? toIndex - 1 : toIndex;
    updated.splice(adjustedDrop, 0, moved);
    updateData({ stepDiceItems: updated });
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setInsertionIndex(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <input
          className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={label || ''}
          onChange={(e) => updateData({ label: e.target.value })}
          placeholder="Step Dice"
        />
      </div>

      {/* Dice chain editor */}
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Dice Chain</label>
        <div className="flex flex-wrap items-center gap-1 mb-2">
          {diceChain.map((d: number, idx: number) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-theme-muted text-xs">→</span>}
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs border border-theme-border rounded-button bg-theme-paper text-theme-ink">
                d{d}
                <button
                  onClick={() => {
                    const updated = diceChain.filter((_: number, i: number) => i !== idx);
                    // Clamp trait steps that are now out of range
                    const clampedItems = stepDiceItems.map((item: StepDiceItem) => ({
                      ...item,
                      currentStep: Math.min(item.currentStep, Math.max(0, updated.length - 1))
                    }));
                    updateData({ stepDiceChain: updated.length > 0 ? updated : undefined, stepDiceItems: clampedItems });
                  }}
                  className="text-theme-muted hover:text-red-500 transition-colors text-[10px] leading-none"
                >
                  ✕
                </button>
              </span>
            </React.Fragment>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-theme-muted">d</span>
          <input
            type="number"
            min={2}
            className="w-16 px-2 py-1 text-sm border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            value={newDieFaces}
            onChange={(e) => setNewDieFaces(e.target.value)}
            placeholder="#"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const faces = parseInt(newDieFaces);
                if (faces >= 2) {
                  insertDie(faces);
                  setNewDieFaces('');
                }
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              const faces = parseInt(newDieFaces);
              if (faces >= 2) {
                insertDie(faces);
                setNewDieFaces('');
              }
            }}
            disabled={!newDieFaces || parseInt(newDieFaces) < 2}
            className="px-2 py-1 bg-theme-accent text-white rounded-button hover:bg-theme-accentHover disabled:opacity-50 transition-colors text-xs"
          >
            Add Step
          </button>
          {stepDiceChain && (
            <button
              type="button"
              onClick={() => {
                const clampedItems = stepDiceItems.map((item: StepDiceItem) => ({
                  ...item,
                  currentStep: Math.min(item.currentStep, DEFAULT_DICE_CHAIN.length - 1)
                }));
                updateData({ stepDiceChain: undefined, stepDiceItems: clampedItems });
              }}
              className="px-2 py-1 text-xs text-theme-muted hover:text-theme-ink border border-theme-border rounded-button transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Existing items */}
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">
          Items ({stepDiceItems.length})
        </label>
        <div className="space-y-1">
          {stepDiceItems.map((item: StepDiceItem, i: number) => (
            <React.Fragment key={i}>
              {insertionIndex === i && draggedIndex !== null && draggedIndex !== i && draggedIndex !== i - 1 && (
                <div className="h-0.5 bg-theme-accent rounded-full mx-2" />
              )}
              <div
                className={`flex items-center gap-2 p-2 border border-theme-border rounded-button bg-theme-paper ${
                  draggedIndex === i ? 'opacity-50' : ''
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              >
                {/* Drag handle */}
                <span className="cursor-grab text-theme-muted text-xs select-none">⠿</span>

                {/* Item name */}
                <input
                  className="flex-1 min-w-0 px-2 py-1 text-sm border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
                  value={item.name}
                  onChange={(e) => updateItemName(i, e.target.value)}
                  placeholder="Item name"
                />

                {/* Starting die selector */}
                <select
                  className="px-1 py-1 text-sm border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
                  value={item.currentStep}
                  onChange={(e) => updateItemStep(i, parseInt(e.target.value))}
                >
                  {diceChain.map((d: number, idx: number) => (
                    <option key={idx} value={idx}>d{d}</option>
                  ))}
                </select>

                {/* Tooltip button */}
                <TooltipEditButton
                  tooltip={item.tooltip}
                  onSave={(text) => updateItemTooltip(i, text || undefined)}
                  itemName={item.name}
                />

                {/* Remove button */}
                <button
                  onClick={() => removeItem(i)}
                  className="w-6 h-6 flex items-center justify-center text-theme-muted hover:text-red-500 transition-colors flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            </React.Fragment>
          ))}
          {insertionIndex === stepDiceItems.length && draggedIndex !== null && draggedIndex !== stepDiceItems.length - 1 && (
            <div className="h-0.5 bg-theme-accent rounded-full mx-2" />
          )}
        </div>
      </div>

      {/* Add new item */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="flex-1 px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder="Add item..."
        />
        <button
          type="submit"
          disabled={!newItemName.trim()}
          className="px-3 py-2 bg-theme-accent text-white rounded-button hover:bg-theme-accentHover disabled:opacity-50 transition-colors text-sm"
        >
          Add
        </button>
      </form>
    </div>
  );
}
