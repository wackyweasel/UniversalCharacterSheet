import React, { useState, useRef } from 'react';
import { FormItem } from '../../types';
import { usePointerReorder } from '../../hooks';
import { EditorProps } from './types';
import { useTutorialStore, TUTORIAL_STEPS } from '../../store/useTutorialStore';
import { TooltipEditButton } from './TooltipEditButton';
import { Tooltip } from '../Tooltip';
import { GripVerticalIcon, TrashIcon } from '../icons';

export function FormEditor({ widget, updateData }: EditorProps) {
  const { label, formItems = [] } = widget.data;
  const [newItemName, setNewItemName] = useState('');
  const tutorialStep = useTutorialStore((state) => state.tutorialStep);
  const advanceTutorial = useTutorialStore((state) => state.advanceTutorial);
  const formItemsList = formItems as FormItem[];
  const formItemIdsRef = useRef(new WeakMap<FormItem, string>());
  const nextFormItemIdRef = useRef(0);
  const getFormItemId = (item: FormItem) => {
    const existingId = formItemIdsRef.current.get(item);
    if (existingId) return existingId;
    const id = `form-item-${nextFormItemIdRef.current++}`;
    formItemIdsRef.current.set(item, id);
    return id;
  };
  const reorderableItems = formItemsList.map((item) => ({ id: getFormItemId(item), item }));
  const { setRowRef, startDrag, handleReorderKey } = usePointerReorder({
    items: reorderableItems,
    onReorder: (items) => updateData({ formItems: items.map(({ item }) => item) }),
  });

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

  const updateItem = (index: number, item: FormItem) => {
    const currentItem = formItemsList[index];
    const itemId = formItemIdsRef.current.get(currentItem);
    if (itemId) formItemIdsRef.current.set(item, itemId);

    const updated = [...formItemsList];
    updated[index] = item;
    updateData({ formItems: updated });
  };

  const removeItem = (index: number) => {
    const updated = [...formItems];
    updated.splice(index, 1);
    updateData({ formItems: updated });
  };

  const updateItemName = (index: number, name: string) => {
    updateItem(index, { ...formItemsList[index], name });
  };

  const updateItemValue = (index: number, value: string) => {
    updateItem(index, { ...formItemsList[index], value });
  };

  const labelWidth = widget.data.labelWidth ?? 33;
  const itemSpacing = widget.data.itemSpacing ?? 2;

  return (
    <div className="widget-editor widget-editor--form space-y-4">
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

      <section className="widget-editor__section" aria-labelledby="form-layout-title">
        <div className="widget-editor__section-heading">
          <h3 id="form-layout-title" className="widget-editor__section-title">Field layout</h3>
        </div>
        <div className="space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="form-label-width" className="text-xs font-bold uppercase text-theme-muted">
                Label width
              </label>
              <span className="widget-editor__section-count">{labelWidth}%</span>
            </div>
            <input
              id="form-label-width"
              type="range"
              min="10"
              max="70"
              value={labelWidth}
              onChange={(e) => updateData({ labelWidth: parseInt(e.target.value, 10) })}
              className="w-full accent-theme-accent"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="form-item-spacing" className="text-xs font-bold uppercase text-theme-muted">
                Vertical spacing
              </label>
              <span className="widget-editor__section-count">{itemSpacing}px</span>
            </div>
            <input
              id="form-item-spacing"
              type="range"
              min="0"
              max="16"
              value={itemSpacing}
              onChange={(e) => updateData({ itemSpacing: parseInt(e.target.value, 10) })}
              className="w-full accent-theme-accent"
            />
          </div>
        </div>
      </section>
      
      <section className="widget-editor__section" aria-labelledby="form-items-title">
        <div className="widget-editor__section-heading">
          <h3 id="form-items-title" className="widget-editor__section-title">Items</h3>
          <span className="widget-editor__section-count">{formItems.length}</span>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {reorderableItems.map(({ id, item }, idx) => (
            <div 
              key={id}
              ref={(element) => setRowRef(id, element)}
              className="pointer-sort-row relative flex items-center gap-2 rounded px-1 transition-colors"
            >
              {/* Drag Handle - works with both touch and mouse */}
              <Tooltip content="Drag to reorder">
                <button
                  type="button"
                  className="flex h-8 w-7 flex-shrink-0 cursor-grab items-center justify-center rounded-button px-1 text-theme-muted select-none touch-none hover:text-theme-ink active:cursor-grabbing disabled:cursor-default disabled:opacity-40"
                  onPointerDown={(event) => startDrag(id, event)}
                  onKeyDown={(event) => handleReorderKey(id, event)}
                  disabled={formItemsList.length < 2}
                  aria-label={`Reorder ${item.name || `field ${idx + 1}`}`}
                  title="Drag to reorder. Arrow keys also work."
                >
                  <GripVerticalIcon className="h-4 w-4" />
                </button>
              </Tooltip>
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
              <TooltipEditButton
                tooltip={item.tooltip}
                itemName={item.name}
                buttonClassName="h-10 w-10"
                onSave={(t) => updateItem(idx, { ...formItemsList[idx], tooltip: t })}
              />
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-button border border-theme-border text-red-500 transition-colors hover:border-red-500 hover:text-red-700"
                aria-label={`Delete ${item.name || `field ${idx + 1}`}`}
                title="Delete field"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={addItem} className="widget-editor__add-row flex gap-2 mt-2">
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
      </section>
    </div>
  );
}

