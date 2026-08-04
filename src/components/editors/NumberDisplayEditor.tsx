import React, { useEffect, useState, useRef } from 'react';
import { DisplayNumber } from '../../types';
import { EditorProps } from './types';
import { LabeledNumberField } from './LabeledNumberField';
import { TooltipEditButton } from './TooltipEditButton';
import { Tooltip } from '../Tooltip';

export function NumberDisplayEditor({ widget, updateData }: EditorProps) {
  const { label, displayNumbers = [], displayLayout = 'horizontal' } = widget.data;
  const [newItemLabel, setNewItemLabel] = useState('');
  const [boundEditorIndex, setBoundEditorIndex] = useState<number | null>(null);
  
  // Drag state for reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef<number>(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (boundEditorIndex === null || !containerRef.current) return;
    const frame = requestAnimationFrame(() => {
      containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, [boundEditorIndex]);

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
    setBoundEditorIndex(null);
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

  const updateItem = (index: number, changes: Partial<DisplayNumber>) => {
    const updated = [...displayNumbers] as DisplayNumber[];
    updated[index] = { ...updated[index], ...changes };
    updateData({ displayNumbers: updated });
  };

  const setBounds = (index: number) => {
    setBoundEditorIndex(index);
  };

  const clearBound = (index: number, bound: 'min' | 'max') => {
    const updated = [...displayNumbers] as DisplayNumber[];
    const item = updated[index];
    if (bound === 'min') {
      const { minValue, minValueLabel, minValueFormula, ...withoutMinimum } = item;
      updated[index] = withoutMinimum;
    } else {
      const { maxValue, maxValueLabel, maxValueFormula, ...withoutMaximum } = item;
      updated[index] = withoutMaximum;
    }
    updateData({ displayNumbers: updated });
  };

  const removeBounds = (index: number) => {
    const updated = [...displayNumbers] as DisplayNumber[];
    const { minValue, minValueLabel, minValueFormula, maxValue, maxValueLabel, maxValueFormula, ...withoutBounds } = updated[index];
    updated[index] = withoutBounds;
    updateData({ displayNumbers: updated });
    setBoundEditorIndex(null);
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
          newOverIndex = displayNumbers.length;
        }
      }
    }
    
    setDragOverIndex(newOverIndex);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const updated = [...displayNumbers] as DisplayNumber[];
      const [draggedItem] = updated.splice(draggedIndex, 1);
      const adjustedIndex = dragOverIndex > draggedIndex ? dragOverIndex - 1 : dragOverIndex;
      updated.splice(adjustedIndex, 0, draggedItem);
      updateData({ displayNumbers: updated });
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

    const updated = [...displayNumbers] as DisplayNumber[];
    const [draggedItem] = updated.splice(fromIndex, 1);
    const adjustedDropIndex = fromIndex < dropIndex ? dropIndex - 1 : dropIndex;
    updated.splice(adjustedDropIndex, 0, draggedItem);
    updateData({ displayNumbers: updated });
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleNativeDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
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
            placeholder="Stats"
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

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={widget.data.showDisplayNumberMax ?? false}
          onChange={(event) => updateData({ showDisplayNumberMax: event.target.checked })}
          className="w-4 h-4 accent-theme-accent"
        />
        <span className="text-sm text-theme-ink">Show maximums in display (e.g. 5/10)</span>
      </label>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Numbers</label>
        <div ref={containerRef} className="max-h-72 space-y-2 overflow-y-auto">
          {(displayNumbers as DisplayNumber[]).map((item, idx) => {
            const boundsVisible = item.minValue !== undefined || item.maxValue !== undefined || boundEditorIndex === idx;

            return (
            <div 
              key={idx} 
              ref={(el) => { itemRefs.current[idx] = el; }}
              className={`rounded-button border border-theme-border bg-theme-accent/5 p-2 transition-colors ${
                dragOverIndex === idx ? 'border-t-2 border-theme-accent' : ''
              } ${draggedIndex === idx ? 'opacity-50 bg-theme-accent/10' : ''}`}
              onDragOver={(e) => handleNativeDragOver(e, idx)}
              onDragLeave={handleNativeDragLeave}
              onDrop={(e) => handleNativeDrop(e, idx)}
            >
              <div className="flex items-center gap-2">
                <Tooltip content="Drag to reorder">
                  <div 
                    className="cursor-grab active:cursor-grabbing text-theme-muted hover:text-theme-ink px-1 select-none touch-none"
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
                </Tooltip>
                <input
                  className="flex-1 min-w-0 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm"
                  value={item.label}
                  onChange={(e) => updateItemLabel(idx, e.target.value)}
                  placeholder="Label"
                />
                <TooltipEditButton
                  tooltip={item.tooltip}
                  itemName={item.label}
                  onSave={(tooltip) => updateItem(idx, { tooltip })}
                />
                <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700 px-2 flex-shrink-0">×</button>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <span className="w-12 flex-shrink-0 text-xs text-theme-muted">Current</span>
                <LabeledNumberField
                  value={item.value}
                  onChange={(value) => updateItemValue(idx, value)}
                  tutorialTargetPrefix={item.label?.toLowerCase() === 'strength' || idx === 0 ? 'automation-strength' : undefined}
                  fieldLabel={item.valueLabel}
                  onFieldLabelChange={(valueLabel) => updateItem(idx, { valueLabel })}
                  formula={item.valueFormula}
                  onFormulaChange={(valueFormula) => updateItem(idx, { valueFormula })}
                  min={item.minValue}
                  max={item.maxValue}
                  compact
                  hideStepperButtons
                />
                {!boundsVisible ? (
                  <button type="button" onClick={() => setBounds(idx)} className="ml-auto text-xs text-theme-accent hover:underline">
                    Set min or max values
                  </button>
                ) : (
                  <button type="button" onClick={() => removeBounds(idx)} className="ml-auto text-xs text-red-500 hover:text-red-700">
                    Remove min and max values
                  </button>
                )}
              </div>

              {boundsVisible && (
                <div className="mt-2 space-y-2 border-t border-theme-border pt-2">
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
                      onFieldLabelChange={(maxValueLabel) => updateItem(idx, { maxValueLabel})}
                      formula={item.maxValueFormula}
                      onFormulaChange={(maxValueFormula) => updateItem(idx, { maxValueFormula })}
                      min={item.minValue}
                      compact
                      hideStepperButtons
                    />
                  </div>
                </div>
              )}
            </div>
            );
          })}
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

