import React, { useEffect, useState, useRef } from 'react';
import { DisplayNumber, ModifierRange } from '../../types';
import { EditorProps } from './types';
import { LabeledNumberField } from './LabeledNumberField';
import { TooltipEditButton } from './TooltipEditButton';
import { Tooltip } from '../Tooltip';
import { Plus, Trash2 } from 'lucide-react';
import { DEFAULT_MODIFIER_RANGES, formatSignedNumber, getModifierForValue, getModifierRangeIssue } from '../../utils/modifierRanges';

export function NumberDisplayEditor({ widget, updateData }: EditorProps) {
  const { label, displayNumbers = [], displayLayout = 'horizontal' } = widget.data;
  const showSecondaryNumbers = widget.data.showSecondaryDisplayNumbers ?? false;
  const automaticModifiers = widget.data.secondaryDisplayAutoCompute ?? false;
  const modifierRanges = widget.data.secondaryDisplayModifierRanges ?? DEFAULT_MODIFIER_RANGES;
  const modifierRangeIssue = getModifierRangeIssue(modifierRanges);
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
    const item = updated[index];
    const modifier = automaticModifiers
      ? getModifierForValue(value, modifierRanges) ?? 0
      : undefined;
    updated[index] = {
      ...item,
      value,
      ...(modifier !== undefined ? { secondaryValue: modifier } : {}),
    };
    updateData({ displayNumbers: updated });
  };

  const updateItem = (index: number, changes: Partial<DisplayNumber>) => {
    const updated = [...displayNumbers] as DisplayNumber[];
    updated[index] = { ...updated[index], ...changes };
    updateData({ displayNumbers: updated });
  };

  const toggleSecondaryNumbers = (enabled: boolean) => {
    updateData({
      showSecondaryDisplayNumbers: enabled,
      displayNumbers: enabled
        ? (displayNumbers as DisplayNumber[]).map(item => ({ ...item, secondaryValue: item.secondaryValue ?? 0 }))
        : displayNumbers,
    });
  };

  const applyModifierRanges = (items: DisplayNumber[], ranges: ModifierRange[]) => items.map(item => {
    const modifier = getModifierForValue(item.value, ranges) ?? 0;
    return { ...item, secondaryValue: modifier };
  });

  const toggleAutomaticModifiers = (enabled: boolean) => {
    const ranges = modifierRanges.map(range => ({ ...range }));
    updateData({
      secondaryDisplayAutoCompute: enabled,
      secondaryDisplayModifierRanges: ranges,
      ...(enabled ? { displayNumbers: applyModifierRanges(displayNumbers as DisplayNumber[], ranges) } : {}),
    });
  };

  const updateModifierRange = (rangeIndex: number, changes: Partial<ModifierRange>) => {
    const ranges = [...modifierRanges];
    ranges[rangeIndex] = { ...ranges[rangeIndex], ...changes };
    updateData({
      secondaryDisplayModifierRanges: ranges,
      displayNumbers: applyModifierRanges(displayNumbers as DisplayNumber[], ranges),
    });
  };

  const addModifierRange = () => {
    const ranges = [...modifierRanges];
    const lastMaximum = ranges.reduce((maximum, range) => Math.max(maximum, range.max), -1);
    const nextRange = { min: lastMaximum + 1, max: lastMaximum + 5, modifier: 0 };
    updateData({ secondaryDisplayModifierRanges: [...ranges, nextRange] });
  };

  const removeModifierRange = (rangeIndex: number) => {
    const ranges = modifierRanges.filter((_, index) => index !== rangeIndex);
    updateData({
      secondaryDisplayModifierRanges: ranges,
      displayNumbers: applyModifierRanges(displayNumbers as DisplayNumber[], ranges),
    });
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
            className="w-full px-3 py-2 pr-8 border border-theme-border rounded-theme bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
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

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={widget.data.showDisplayNumberLabels ?? true}
          onChange={(event) => updateData({ showDisplayNumberLabels: event.target.checked })}
          className="w-4 h-4 accent-theme-accent"
        />
        <span className="text-sm text-theme-ink">Show names under numbers</span>
      </label>

      <label className="flex items-start gap-2 cursor-pointer rounded-theme border border-theme-border bg-theme-accent/5 p-3">
        <input
          type="checkbox"
          checked={showSecondaryNumbers}
          onChange={(event) => toggleSecondaryNumbers(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-theme-accent"
        />
        <span>
          <span className="block text-sm font-medium text-theme-ink">Show secondary numbers</span>
          <span className="block text-xs text-theme-muted">Adds a compact value box to the bottom-right corner of each number.</span>
        </span>
      </label>

      {showSecondaryNumbers && (
        <div className="rounded-theme border border-theme-border bg-theme-accent/5 p-3">
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={automaticModifiers}
              onChange={(event) => toggleAutomaticModifiers(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-theme-accent"
            />
            <span>
              <span className="block text-sm font-medium text-theme-ink">Automatic modifiers</span>
              <span className="block text-xs text-theme-muted">Use one score table for every secondary number in this widget.</span>
            </span>
          </label>

          {automaticModifiers && (
            <div className="mt-3 rounded-theme border border-theme-border bg-theme-paper p-2">
              <div className="mb-1.5 grid grid-cols-[1fr_1fr_1fr_28px] gap-1 text-[10px] font-medium uppercase text-theme-muted">
                <span>Score from</span>
                <span>Through</span>
                <span>Modifier</span>
                <span className="sr-only">Actions</span>
              </div>
              <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
                {modifierRanges.map((range, rangeIndex) => (
                  <div key={rangeIndex} className="grid grid-cols-[1fr_1fr_1fr_28px] items-center gap-1">
                    <input
                      type="number"
                      value={range.min}
                      onChange={(event) => updateModifierRange(rangeIndex, { min: Number(event.target.value) })}
                      aria-label={`Range ${rangeIndex + 1} minimum`}
                      className="min-w-0 rounded-theme border border-theme-border bg-theme-paper px-1.5 py-1 text-center text-xs text-theme-ink"
                    />
                    <input
                      type="number"
                      value={range.max}
                      onChange={(event) => updateModifierRange(rangeIndex, { max: Number(event.target.value) })}
                      aria-label={`Range ${rangeIndex + 1} maximum`}
                      className="min-w-0 rounded-theme border border-theme-border bg-theme-paper px-1.5 py-1 text-center text-xs text-theme-ink"
                    />
                    <input
                      type="number"
                      value={range.modifier}
                      onChange={(event) => updateModifierRange(rangeIndex, { modifier: Number(event.target.value) })}
                      aria-label={`Range ${rangeIndex + 1} modifier`}
                      className="min-w-0 rounded-theme border border-theme-border bg-theme-paper px-1.5 py-1 text-center text-xs font-semibold text-theme-ink"
                    />
                    <Tooltip content="Remove range">
                      <button
                        type="button"
                        onClick={() => removeModifierRange(rangeIndex)}
                        aria-label={`Remove range ${rangeIndex + 1}`}
                        className="flex h-7 w-7 items-center justify-center rounded-button text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={addModifierRange}
                  className="inline-flex items-center gap-1 text-xs font-medium text-theme-accent hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add range
                </button>
                <span className="text-xs text-theme-muted">Scores 1–30</span>
              </div>
              {modifierRangeIssue && <p className="mt-1.5 text-xs text-red-500">{modifierRangeIssue}</p>}
            </div>
          )}
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Numbers</label>
        <div ref={containerRef} className="max-h-72 space-y-2 overflow-x-hidden overflow-y-auto">
          {(displayNumbers as DisplayNumber[]).map((item, idx) => {
            const boundsVisible = item.minValue !== undefined || item.maxValue !== undefined || boundEditorIndex === idx;

            return (
            <div 
              key={idx} 
              ref={(el) => { itemRefs.current[idx] = el; }}
              className={`rounded-theme border border-theme-border bg-theme-accent/5 p-2 transition-colors ${
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
                  className="flex-1 min-w-0 px-2 py-1 border border-theme-border rounded-theme bg-theme-paper text-theme-ink text-sm"
                  value={item.label}
                  onChange={(e) => updateItemLabel(idx, e.target.value)}
                  placeholder="Label"
                />
                <TooltipEditButton
                  tooltip={item.tooltip}
                  itemName={item.label}
                  onSave={(tooltip) => updateItem(idx, { tooltip })}
                  radius="theme"
                />
                <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700 px-2 flex-shrink-0">×</button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
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
                  radius="theme"
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
                      radius="theme"
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
                      radius="theme"
                    />
                  </div>
                </div>
              )}

              {showSecondaryNumbers && (
                <div className="mt-2 border-t border-theme-border pt-2">
                  <div className="flex items-center gap-2">
                    <span className="w-12 flex-shrink-0 text-xs font-medium text-theme-muted">Small box</span>
                    <LabeledNumberField
                      value={item.secondaryValue ?? 0}
                      onChange={(secondaryValue) => updateItem(idx, { secondaryValue })}
                      fieldLabel={item.secondaryValueLabel}
                      onFieldLabelChange={(secondaryValueLabel) => updateItem(idx, { secondaryValueLabel })}
                      formula={automaticModifiers ? undefined : item.secondaryValueFormula}
                      onFormulaChange={(secondaryValueFormula) => updateItem(idx, { secondaryValueFormula })}
                      compact
                      hideStepperButtons
                      readOnlyValue={automaticModifiers}
                      hideFormulaButton={automaticModifiers}
                      radius="theme"
                    />
                    {automaticModifiers && (
                      <span className="ml-auto text-xs text-theme-muted">
                        {item.value} gives <strong className="text-theme-ink">{formatSignedNumber(item.secondaryValue ?? 0)}</strong>
                      </span>
                    )}
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
            className="flex-1 px-2 py-1 border border-theme-border rounded-theme bg-theme-paper text-theme-ink text-sm"
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

