import React, { useEffect, useState, useRef } from 'react';
import { NumberItem } from '../../types';
import { usePointerReorder } from '../../hooks';
import { EditorProps } from './types';
import { LabeledNumberField } from './LabeledNumberField';
import { TooltipEditButton } from './TooltipEditButton';
import { Tooltip } from '../Tooltip';
import { GripVerticalIcon, MinusIcon, PlusIcon, TrashIcon } from '../icons';
import { CollapsibleSection } from './CollapsibleSection';

export function NumberEditor({ widget, updateData }: EditorProps) {
  const { label, numberItems = [] } = widget.data;
  const [newItemName, setNewItemName] = useState('');
  const [boundEditorIndex, setBoundEditorIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const numberItemIdsRef = useRef(new WeakMap<NumberItem, string>());
  const nextNumberItemIdRef = useRef(0);
  const numberItemsList = numberItems as NumberItem[];
  const getNumberItemId = (item: NumberItem) => {
    const existingId = numberItemIdsRef.current.get(item);
    if (existingId) return existingId;
    const id = `number-item-${nextNumberItemIdRef.current++}`;
    numberItemIdsRef.current.set(item, id);
    return id;
  };
  const reorderableItems = numberItemsList.map((item) => ({ id: getNumberItemId(item), item }));
  const { setRowRef, startDrag, handleReorderKey } = usePointerReorder({
    items: reorderableItems,
    onReorder: (items) => updateData({ numberItems: items.map(({ item }) => item) }),
  });

  useEffect(() => {
    if (boundEditorIndex === null || !containerRef.current) return;
    const frame = requestAnimationFrame(() => {
      containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, [boundEditorIndex]);

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
    setBoundEditorIndex(null);
  };

  const updateItemName = (index: number, name: string) => {
    updateItem(index, { name });
  };

  const updateItemValue = (index: number, value: number) => {
    updateItem(index, { value });
  };

  const updateItem = (index: number, changes: Partial<NumberItem>) => {
    const currentItem = numberItemsList[index];
    const updatedItem = { ...currentItem, ...changes };
    const itemId = numberItemIdsRef.current.get(currentItem);
    if (itemId) numberItemIdsRef.current.set(updatedItem, itemId);
    const updated = [...numberItemsList];
    updated[index] = updatedItem;
    updateData({ numberItems: updated });
  };

  const setBounds = (index: number) => {
    setBoundEditorIndex(index);
  };

  const clearBound = (index: number, bound: 'min' | 'max') => {
    const item = numberItemsList[index];
    if (bound === 'min') {
      const { minValue, minValueLabel, minValueFormula, ...withoutMinimum } = item;
      const itemId = numberItemIdsRef.current.get(item);
      if (itemId) numberItemIdsRef.current.set(withoutMinimum, itemId);
      const updated = [...numberItemsList];
      updated[index] = withoutMinimum;
      updateData({ numberItems: updated });
    } else {
      const { maxValue, maxValueLabel, maxValueFormula, ...withoutMaximum } = item;
      const itemId = numberItemIdsRef.current.get(item);
      if (itemId) numberItemIdsRef.current.set(withoutMaximum, itemId);
      const updated = [...numberItemsList];
      updated[index] = withoutMaximum;
      updateData({ numberItems: updated });
    }
  };

  const removeBounds = (index: number) => {
    const item = numberItemsList[index];
    const { minValue, minValueLabel, minValueFormula, maxValue, maxValueLabel, maxValueFormula, ...withoutBounds } = item;
    const itemId = numberItemIdsRef.current.get(item);
    if (itemId) numberItemIdsRef.current.set(withoutBounds, itemId);
    const updated = [...numberItemsList];
    updated[index] = withoutBounds;
    updateData({ numberItems: updated });
    setBoundEditorIndex(null);
  };

  return (
    <div className="widget-editor widget-editor--number space-y-4">
      <CollapsibleSection title="General">
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

      </CollapsibleSection>

      <CollapsibleSection>
        <div className="widget-editor__section-heading">
          <h3 id="number-display-options-title" className="widget-editor__section-title">Display options</h3>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={widget.data.showNumberItemMax ?? false}
            onChange={(event) => updateData({ showNumberItemMax: event.target.checked })}
            className="w-4 h-4 accent-theme-accent"
          />
          <span className="text-sm text-theme-ink">Show maximums in tracker (e.g. 5/10)</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={widget.data.showIncrementButtons ?? true}
            onChange={(event) => updateData({ showIncrementButtons: event.target.checked })}
            className="w-4 h-4 accent-theme-accent"
          />
          <span className="text-sm text-theme-ink">Show +/− buttons</span>
        </label>
      </CollapsibleSection>
      
      <CollapsibleSection>
        <div className="widget-editor__section-heading">
          <h3 id="number-items-title" className="widget-editor__section-title">Items</h3>
          <span className="widget-editor__section-count">{numberItems.length}</span>
        </div>
        <div ref={containerRef} className="max-h-72 space-y-2 overflow-y-auto">
          {reorderableItems.map(({ id, item }, idx) => {
            const boundsVisible = item.minValue !== undefined || item.maxValue !== undefined || boundEditorIndex === idx;

            return (
            <div 
              key={id}
              ref={(element) => setRowRef(id, element)}
              className="pointer-sort-row relative rounded-button border border-theme-border bg-theme-accent/5 p-2 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Tooltip content="Drag to reorder">
                  <button
                    type="button"
                    className="flex h-10 w-10 flex-shrink-0 cursor-grab items-center justify-center rounded-button text-theme-muted select-none touch-none hover:text-theme-ink active:cursor-grabbing disabled:cursor-default disabled:opacity-40"
                    onPointerDown={(event) => startDrag(id, event)}
                    onKeyDown={(event) => handleReorderKey(id, event)}
                    disabled={numberItemsList.length < 2}
                    aria-label={`Reorder ${item.name || `item ${idx + 1}`}`}
                    title="Drag to reorder. Arrow keys also work."
                  >
                    <GripVerticalIcon className="h-4 w-4" />
                  </button>
                </Tooltip>
                <input
                  className="flex-1 min-w-0 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm"
                  value={item.name}
                  onChange={(e) => updateItemName(idx, e.target.value)}
                  placeholder="Name"
                />
                <TooltipEditButton
                  tooltip={item.tooltip}
                  itemName={item.name}
                  buttonClassName="h-10 w-10"
                  onSave={(tooltip) => updateItem(idx, { tooltip })}
                />
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-button border border-theme-border text-red-500 transition-colors hover:border-red-500 hover:text-red-700"
                  aria-label={`Delete ${item.name || `item ${idx + 1}`}`}
                  title="Delete item"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="widget-editor__number-value-row mt-2 flex items-center gap-2">
                <span className="w-12 flex-shrink-0 text-xs text-theme-muted">Value</span>
                  <LabeledNumberField
                  value={item.value}
                  onChange={(value) => updateItemValue(idx, value)}
                    onClear={() => updateItemValue(idx, item.minValue ?? 0)}
                  fieldLabel={item.valueLabel}
                  onFieldLabelChange={(valueLabel) => updateItem(idx, { valueLabel })}
                  formula={item.valueFormula}
                  onFormulaChange={(valueFormula) => updateItem(idx, { valueFormula })}
                  min={item.minValue}
                  max={item.maxValue}
                  compact
                    controlHeight="input"
                    allowEmpty
                  hideStepperButtons
                />
                {!boundsVisible ? (
                  <Tooltip content="Show min/max">
                    <button
                      type="button"
                      onClick={() => setBounds(idx)}
                      aria-label="Show min/max"
                      className="widget-control h-10 min-h-0 flex-shrink-0 gap-1 bg-theme-paper px-2 py-1 text-xs"
                    >
                      <PlusIcon className="h-3 w-3" />
                      Show min/max
                    </button>
                  </Tooltip>
                ) : (
                  <Tooltip content="Hide min/max">
                    <button
                      type="button"
                      onClick={() => removeBounds(idx)}
                      aria-label="Hide min/max"
                      className="widget-control h-10 min-h-0 flex-shrink-0 gap-1 bg-theme-paper px-2 py-1 text-xs text-red-500 hover:border-red-500 hover:text-red-700"
                    >
                      <MinusIcon className="h-3 w-3" />
                      Hide min/max
                    </button>
                  </Tooltip>
                )}
              </div>

              {boundsVisible && (
                <div className="mt-2 space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="w-12 flex-shrink-0 text-xs text-theme-muted">Minimum</span>
                    <LabeledNumberField
                      value={item.minValue}
                      onChange={(minValue) => updateItem(idx, { minValue })}
                      onClear={() => clearBound(idx, 'min')}
                      fieldLabel={item.minValueLabel}
                      onFieldLabelChange={(minValueLabel) => updateItem(idx, { minValueLabel })}
                      formula={item.minValueFormula}
                      onFormulaChange={(minValueFormula) => updateItem(idx, { minValueFormula })}
                      max={item.maxValue}
                      compact
                      controlHeight="input"
                      hideStepperButtons
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-12 flex-shrink-0 text-xs text-theme-muted">Maximum</span>
                    <LabeledNumberField
                      value={item.maxValue}
                      onChange={(maxValue) => updateItem(idx, { maxValue })}
                      onClear={() => clearBound(idx, 'max')}
                      fieldLabel={item.maxValueLabel}
                      onFieldLabelChange={(maxValueLabel) => updateItem(idx, { maxValueLabel })}
                      formula={item.maxValueFormula}
                      onFormulaChange={(maxValueFormula) => updateItem(idx, { maxValueFormula })}
                      min={item.minValue}
                      compact
                      controlHeight="input"
                      hideStepperButtons
                    />
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>
        <form onSubmit={addItem} className="widget-editor__add-row flex gap-2 mt-2">
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
      </CollapsibleSection>
    </div>
  );
}

