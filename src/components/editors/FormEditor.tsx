import React, { useState, useRef } from 'react';
import { FormItem } from '../../types';
import { EditorProps } from './types';
import { useTutorialStore, TUTORIAL_STEPS } from '../../store/useTutorialStore';

export function FormEditor({ widget, updateData }: EditorProps) {
  const { label, formItems = [] } = widget.data;
  const [newItemName, setNewItemName] = useState('');
  const tutorialStep = useTutorialStore((state) => state.tutorialStep);
  const advanceTutorial = useTutorialStore((state) => state.advanceTutorial);
  
  // Drag state for reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef<number>(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Drag handlers for reordering (works with both mouse and touch via pointer events)
  const handleDragStart = (index: number, clientY: number) => {
    setDraggedIndex(index);
    setIsDragging(true);
    dragStartY.current = clientY;
  };

  const handleDragMove = (clientY: number) => {
    if (draggedIndex === null || !containerRef.current) return;
    
    // Find which item we're over based on Y position
    let newOverIndex: number | null = null;
    itemRefs.current.forEach((ref, idx) => {
      if (ref && idx !== draggedIndex) {
        const rect = ref.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (clientY < midY && (newOverIndex === null || idx < newOverIndex)) {
          newOverIndex = idx;
        } else if (clientY >= midY && clientY < rect.bottom) {
          newOverIndex = idx + 1;
        }
      }
    });
    
    // If below all items
    if (newOverIndex === null && clientY > 0) {
      const lastRef = itemRefs.current[itemRefs.current.length - 1];
      if (lastRef) {
        const rect = lastRef.getBoundingClientRect();
        if (clientY > rect.bottom) {
          newOverIndex = formItems.length;
        }
      }
    }
    
    setDragOverIndex(newOverIndex);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const updated = [...formItems] as FormItem[];
      const [draggedItem] = updated.splice(draggedIndex, 1);
      const adjustedIndex = dragOverIndex > draggedIndex ? dragOverIndex - 1 : dragOverIndex;
      updated.splice(adjustedIndex, 0, draggedItem);
      updateData({ formItems: updated });
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsDragging(false);
  };

  // Pointer event handlers for unified mouse/touch support
  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleDragStart(index, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      handleDragMove(e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      handleDragEnd();
    }
  };

  // Also support native HTML5 drag for desktop browsers
  const handleNativeDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleNativeDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleNativeDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleNativeDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const fromIndex = draggedIndex ?? parseInt(e.dataTransfer.getData('text/plain'), 10);
    
    if (isNaN(fromIndex) || fromIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...formItems] as FormItem[];
    const [draggedItem] = updated.splice(fromIndex, 1);
    const adjustedDropIndex = fromIndex < dropIndex ? dropIndex - 1 : dropIndex;
    updated.splice(adjustedDropIndex, 0, draggedItem);
    updateData({ formItems: updated });
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleNativeDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
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
        <div ref={containerRef} className="space-y-2 max-h-48 overflow-y-auto">
          {(formItems as FormItem[]).map((item, idx) => (
            <div 
              key={idx} 
              ref={(el) => { itemRefs.current[idx] = el; }}
              className={`flex items-center gap-2 rounded px-1 transition-colors ${
                dragOverIndex === idx ? 'border-t-2 border-theme-accent' : ''
              } ${draggedIndex === idx ? 'opacity-50 bg-theme-accent/10' : ''}`}
              onDragOver={(e) => handleNativeDragOver(e, idx)}
              onDragLeave={handleNativeDragLeave}
              onDrop={(e) => handleNativeDrop(e, idx)}
            >
              {/* Drag Handle - works with both touch and mouse */}
              <div 
                className="cursor-grab active:cursor-grabbing text-theme-muted hover:text-theme-ink px-1 select-none touch-none"
                title="Drag to reorder"
                draggable
                onDragStart={(e) => handleNativeDragStart(e, idx)}
                onDragEnd={handleNativeDragEnd}
                onPointerDown={(e) => handlePointerDown(e, idx)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                ⋮⋮
              </div>
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

