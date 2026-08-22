import React, { useRef, useState } from 'react';
import { StepDiceItem } from '../../types';
import { DiceStep, formatDiceStep, normalizeDiceExpression } from '../../utils/diceExpression';
import { usePointerReorder } from '../../hooks';
import { EditorProps } from './types';
import { TooltipEditButton } from './TooltipEditButton';
import { Tooltip } from '../Tooltip';
import { GripVerticalIcon, TrashIcon } from '../icons';

const DEFAULT_DICE_CHAIN: DiceStep[] = ['1d4', '1d6', '1d8', '1d10', '1d12', '1d20'];

export function StepDiceEditor({ widget, updateData }: EditorProps) {
  const { label, stepDiceItems = [], stepDiceChain } = widget.data;
  const diceChain = stepDiceChain && stepDiceChain.length > 0 ? stepDiceChain : DEFAULT_DICE_CHAIN;
  const [newItemName, setNewItemName] = useState('');
  const [newDiceExpression, setNewDiceExpression] = useState('');
  const normalizedNewDiceExpression = normalizeDiceExpression(newDiceExpression);
  const stepDiceItemsList = stepDiceItems as StepDiceItem[];
  const stepDiceItemIdsRef = useRef(new WeakMap<StepDiceItem, string>());
  const nextStepDiceItemIdRef = useRef(0);
  const getStepDiceItemId = (item: StepDiceItem) => {
    const existingId = stepDiceItemIdsRef.current.get(item);
    if (existingId) return existingId;
    const id = `step-dice-item-${nextStepDiceItemIdRef.current++}`;
    stepDiceItemIdsRef.current.set(item, id);
    return id;
  };
  const reorderableItems = stepDiceItemsList.map((item) => ({ id: getStepDiceItemId(item), item }));
  const { setRowRef, startDrag, handleReorderKey } = usePointerReorder({
    items: reorderableItems,
    onReorder: (items) => updateData({ stepDiceItems: items.map(({ item }) => item) }),
  });

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
    const updated = [...stepDiceItemsList];
    updated.splice(index, 1);
    updateData({ stepDiceItems: updated });
  };

  const updateItemName = (index: number, name: string) => {
    const updatedItem = { ...stepDiceItemsList[index], name };
    const itemId = stepDiceItemIdsRef.current.get(stepDiceItemsList[index]);
    if (itemId) stepDiceItemIdsRef.current.set(updatedItem, itemId);
    const updated = [...stepDiceItemsList];
    updated[index] = updatedItem;
    updateData({ stepDiceItems: updated });
  };

  const updateItemStep = (index: number, currentStep: number) => {
    const updatedItem = { ...stepDiceItemsList[index], currentStep };
    const itemId = stepDiceItemIdsRef.current.get(stepDiceItemsList[index]);
    if (itemId) stepDiceItemIdsRef.current.set(updatedItem, itemId);
    const updated = [...stepDiceItemsList];
    updated[index] = updatedItem;
    updateData({ stepDiceItems: updated });
  };

  const updateItemTooltip = (index: number, tooltip: string | undefined) => {
    const updatedItem = { ...stepDiceItemsList[index], tooltip };
    const itemId = stepDiceItemIdsRef.current.get(stepDiceItemsList[index]);
    if (itemId) stepDiceItemIdsRef.current.set(updatedItem, itemId);
    const updated = [...stepDiceItemsList];
    updated[index] = updatedItem;
    updateData({ stepDiceItems: updated });
  };

  const addDiceStep = () => {
    if (!normalizedNewDiceExpression) return;

    updateData({ stepDiceChain: [...diceChain, normalizedNewDiceExpression] });
    setNewDiceExpression('');
  };

  return (
    <div className="widget-editor widget-editor--step-dice space-y-4">
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
      <section className="widget-editor__section" aria-labelledby={`dice-chain-title-${widget.id}`}>
        <div className="widget-editor__section-heading">
          <h3 id={`dice-chain-title-${widget.id}`} className="widget-editor__section-title">Dice chain</h3>
          <span className="widget-editor__section-count">{diceChain.length}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1 mb-2">
          {diceChain.map((step: DiceStep, idx: number) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-theme-muted text-xs">→</span>}
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs border border-theme-border rounded-button bg-theme-paper text-theme-ink">
                {formatDiceStep(step)}
                <button
                  onClick={() => {
                    const updated = diceChain.filter((_: DiceStep, i: number) => i !== idx);
                    // Clamp trait steps that are now out of range
                    const clampedItems = stepDiceItemsList.map((item: StepDiceItem) => ({
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
        <div className="widget-editor__add-row flex items-center gap-2">
          <input
            className="h-10 w-40 px-2 text-sm border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            value={newDiceExpression}
            onChange={(e) => setNewDiceExpression(e.target.value)}
            placeholder="2d6 or 1d12 + 1d20 - 2"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addDiceStep();
              }
            }}
          />
          <button
            type="button"
            onClick={addDiceStep}
            disabled={!normalizedNewDiceExpression}
            className="h-10 px-3 bg-theme-accent text-white rounded-button hover:bg-theme-accentHover disabled:opacity-50 transition-colors text-xs"
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
              className="h-10 px-3 text-xs text-theme-muted hover:text-theme-ink border border-theme-border rounded-button transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </section>

      {/* Existing items */}
      <section className="widget-editor__section" aria-labelledby={`step-items-title-${widget.id}`}>
        <div className="widget-editor__section-heading">
          <h3 id={`step-items-title-${widget.id}`} className="widget-editor__section-title">Items</h3>
          <span className="widget-editor__section-count">{stepDiceItems.length}</span>
        </div>
        <div className="space-y-1">
          {reorderableItems.map(({ id, item }, i) => (
              <div
                key={id}
                ref={(element) => setRowRef(id, element)}
                className="pointer-sort-row flex items-center gap-2 rounded-button border border-theme-border bg-theme-accent/5 p-1 text-sm"
              >
                {/* Drag handle */}
                <Tooltip content="Drag to reorder">
                  <button
                    type="button"
                    className="flex h-10 w-10 flex-shrink-0 cursor-grab items-center justify-center rounded-button px-1 text-theme-muted select-none touch-none hover:text-theme-ink active:cursor-grabbing disabled:cursor-default disabled:opacity-40"
                    onPointerDown={(event) => startDrag(id, event)}
                    onKeyDown={(event) => handleReorderKey(id, event)}
                    disabled={reorderableItems.length < 2}
                    aria-label={`Reorder ${item.name || `item ${i + 1}`}`}
                    title="Drag to reorder. Arrow keys also work."
                  >
                    <GripVerticalIcon className="h-4 w-4" />
                  </button>
                </Tooltip>

                {/* Item name */}
                <input
                  className="flex-1 min-w-0 h-10 px-2 text-sm border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
                  value={item.name}
                  onChange={(e) => updateItemName(i, e.target.value)}
                  placeholder="Item name"
                />

                {/* Starting die selector */}
                <select
                  className="h-10 px-1 text-sm border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
                  value={item.currentStep}
                  onChange={(e) => updateItemStep(i, parseInt(e.target.value))}
                >
                  {diceChain.map((step: DiceStep, idx: number) => (
                    <option key={idx} value={idx}>{formatDiceStep(step)}</option>
                  ))}
                </select>

                {/* Tooltip button */}
                <TooltipEditButton
                  tooltip={item.tooltip}
                  onSave={(text) => updateItemTooltip(i, text || undefined)}
                  itemName={item.name}
                  buttonClassName="h-10 w-10"
                />

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-button border border-theme-border text-red-500 transition-colors hover:border-red-500 hover:text-red-700"
                  aria-label={`Delete ${item.name || `item ${i + 1}`}`}
                  title="Delete item"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="widget-editor__add-row flex gap-2">
          <input
            className="h-10 flex-1 px-3 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Add item..."
          />
          <button
            type="submit"
            disabled={!newItemName.trim()}
            className="h-10 px-3 bg-theme-accent text-white rounded-button hover:bg-theme-accentHover disabled:opacity-50 transition-colors text-sm"
          >
            Add
          </button>
        </form>
      </section>
    </div>
  );
}
