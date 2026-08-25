import { useRef } from 'react';
import { SpellLevel } from '../../types';
import { usePointerReorder } from '../../hooks';
import { EditorProps } from './types';
import { Tooltip } from '../Tooltip';
import { GripVerticalIcon, TrashIcon } from '../icons';
import { CollapsibleSection } from './CollapsibleSection';

export function SpellSlotEditor({ widget, updateData }: EditorProps) {
  const { label, spellLevels = [{ level: 1, max: 4, used: 0 }], fillColor, spellSlotShape = 'circle', spellSlotSize = 20, spellSlotHorizontalSpacing = 4, spellSlotVerticalSpacing = 4, showResetButton = true } = widget.data;
  const normalizedSpellSlotSize = Math.max(12, Math.min(40, spellSlotSize));
  const normalizedHorizontalSpacing = Math.max(0, Math.min(16, spellSlotHorizontalSpacing));
  const normalizedVerticalSpacing = Math.max(0, Math.min(16, spellSlotVerticalSpacing));
  const spellLevelsList = spellLevels as SpellLevel[];
  const spellLevelIdsRef = useRef(new WeakMap<SpellLevel, string>());
  const nextSpellLevelIdRef = useRef(0);
  const getSpellLevelId = (levelData: SpellLevel) => {
    const existingId = spellLevelIdsRef.current.get(levelData);
    if (existingId) return existingId;
    const id = `spell-level-${nextSpellLevelIdRef.current++}`;
    spellLevelIdsRef.current.set(levelData, id);
    return id;
  };
  const reorderableItems = spellLevelsList.map((item) => ({ id: getSpellLevelId(item), item }));
  const { setRowRef, startDrag, handleReorderKey } = usePointerReorder({
    items: reorderableItems,
    onReorder: (items) => updateData({ spellLevels: items.map(({ item }) => item) }),
  });

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
    const updated = [...spellLevelsList];
    updated.splice(levelIdx, 1);
    updateData({ spellLevels: updated });
  };

  const updateLevelMax = (levelIdx: number, max: number | string) => {
    const currentLevel = spellLevelsList[levelIdx];
    const updated = [...spellLevelsList];
    if (typeof max === 'string') {
      updated[levelIdx] = { ...currentLevel, max: max as unknown as number };
    } else {
      const newMax = Math.max(1, Math.min(10, max));
      updated[levelIdx] = { 
        ...currentLevel, 
        max: newMax,
        used: Math.min(currentLevel.used, newMax)
      };
    }
    const itemId = spellLevelIdsRef.current.get(currentLevel);
    if (itemId) spellLevelIdsRef.current.set(updated[levelIdx], itemId);
    updateData({ spellLevels: updated });
  };

  const updateLevelNumber = (levelIdx: number, level: number | string) => {
    const currentLevel = spellLevelsList[levelIdx];
    const updated = [...spellLevelsList];
    if (typeof level === 'string') {
      updated[levelIdx] = { ...currentLevel, level: level as unknown as number };
    } else {
      updated[levelIdx] = { ...currentLevel, level: Math.max(1, Math.min(9, level)) };
    }
    const itemId = spellLevelIdsRef.current.get(currentLevel);
    if (itemId) spellLevelIdsRef.current.set(updated[levelIdx], itemId);
    updateData({ spellLevels: updated });
  };

  return (
    <div className="widget-editor widget-editor--spell-slots space-y-4">
      <CollapsibleSection title="General">
        <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <div className="relative">
          <input
            className="w-full px-3 py-2 pr-8 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            value={label || ''}
            onChange={(e) => updateData({ label: e.target.value })}
            placeholder="Spell Slots"
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
          <h3 id={`spell-levels-title-${widget.id}`} className="widget-editor__section-title">Spell levels</h3>
          <span className="widget-editor__section-count">{spellLevels.length}</span>
        </div>
        <div className="max-h-48 space-y-2 overflow-y-auto">
          {reorderableItems.map(({ id, item: levelData }, levelIdx) => (
            <div
              key={id}
              ref={(element) => setRowRef(id, element)}
              className="widget-editor__spell-level-row pointer-sort-row relative flex items-center gap-2 rounded-button border border-theme-border bg-theme-accent/5 p-2 transition-colors"
            >
              <Tooltip content="Drag to reorder">
                <button
                  type="button"
                  className="widget-editor__spell-level-reorder flex h-10 w-10 flex-shrink-0 cursor-grab items-center justify-center rounded-button px-1 text-theme-muted select-none touch-none hover:text-theme-ink active:cursor-grabbing disabled:cursor-default disabled:opacity-40"
                  onPointerDown={(event) => startDrag(id, event)}
                  onKeyDown={(event) => handleReorderKey(id, event)}
                  disabled={spellLevelsList.length < 2}
                  aria-label={`Reorder spell level ${levelData.level}`}
                  title="Drag to reorder. Arrow keys also work."
                >
                  <GripVerticalIcon className="h-4 w-4" />
                </button>
              </Tooltip>
              <div className="widget-editor__spell-level-control widget-editor__spell-level-control--level">
                <span className="text-xs font-bold uppercase text-theme-muted">Level</span>
                <input
                  type="number"
                  value={levelData.level}
                  onChange={(e) => updateLevelNumber(levelIdx, e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                  onBlur={(e) => updateLevelNumber(levelIdx, Math.max(1, Math.min(9, parseInt(e.target.value) || 1)))}
                  className="h-10 w-20 flex-shrink-0 rounded-button border border-theme-border bg-theme-paper px-2 py-1 text-center text-sm text-theme-ink [appearance:textfield] focus:border-theme-accent focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  min={1}
                  max={9}
                />
              </div>
              <div className="widget-editor__spell-level-control widget-editor__spell-level-control--max">
                <span className="text-xs font-bold uppercase text-theme-muted">Max Slots</span>
                <input
                  type="number"
                  value={levelData.max}
                  onChange={(e) => updateLevelMax(levelIdx, e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                  onBlur={(e) => updateLevelMax(levelIdx, Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  className="h-10 w-20 flex-shrink-0 rounded-button border border-theme-border bg-theme-paper px-2 py-1 text-center text-sm text-theme-ink [appearance:textfield] focus:border-theme-accent focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  min={1}
                  max={10}
                />
              </div>
              <button
                type="button"
                onClick={() => removeLevel(levelIdx)}
                className="widget-editor__spell-level-delete ml-auto flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-button border border-theme-border text-red-500 transition-colors hover:border-red-500 hover:text-red-700"
                aria-label={`Delete spell level ${levelData.level}`}
                title="Delete spell level"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        {(spellLevels as SpellLevel[]).length < 9 && (
          <div className="widget-editor__add-row">
            <button
              onClick={addLevel}
              className="rounded-button border border-theme-border px-3 py-1 text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper"
            >
              + Add Level
            </button>
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection>
        <div className="widget-editor__section-heading">
          <h3 id={`spell-style-title-${widget.id}`} className="widget-editor__section-title">Style</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor={`spell-fill-color-${widget.id}`} className="mb-2 block text-xs font-bold uppercase text-theme-muted">
              Filled slot color
            </label>
            <div className="flex items-center gap-2">
              <div
                className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-button border border-theme-border bg-theme-accent"
                style={fillColor ? { backgroundColor: fillColor } : undefined}
              >
                <input
                  id={`spell-fill-color-${widget.id}`}
                  type="color"
                  value={fillColor || '#2563eb'}
                  onChange={(e) => updateData({ fillColor: e.target.value })}
                  className="absolute -inset-1 h-12 w-12 cursor-pointer opacity-0"
                />
              </div>
              {fillColor ? (
                <>
                  <span className="flex-1 text-sm text-theme-ink">{fillColor.toUpperCase()}</span>
                  <button
                    type="button"
                    onClick={() => updateData({ fillColor: undefined })}
                    className="widget-control px-3 py-2 text-sm"
                  >
                    Use theme color
                  </button>
                </>
              ) : (
                <span className="text-sm text-theme-muted">Theme color</span>
              )}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-xs font-bold uppercase text-theme-muted">Slot shape</span>
            <div className="grid grid-cols-3 overflow-hidden rounded-button border border-theme-border" role="group" aria-label="Slot shape">
              {([
                ['circle', 'Circle'],
                ['square', 'Square'],
                ['diamond', 'Diamond'],
              ] as const).map(([value, optionLabel]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={spellSlotShape === value}
                  onClick={() => updateData({ spellSlotShape: value })}
                  className={`flex min-h-12 flex-col items-center justify-center gap-1 border-r border-theme-border px-1 text-xs last:border-r-0 ${
                    spellSlotShape === value
                      ? 'bg-theme-accent text-theme-paper'
                      : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
                  }`}
                >
                  <span
                    className={`h-5 w-5 border border-current ${
                      value === 'circle' ? 'rounded-full' : value === 'square' ? 'rounded-button' : 'rotate-45 rounded-sm'
                    }`}
                    aria-hidden="true"
                  />
                  {optionLabel}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor={`spell-slot-size-${widget.id}`} className="text-xs font-bold uppercase text-theme-muted">
                Slot size
              </label>
              <span className="widget-editor__section-count">{normalizedSpellSlotSize}px</span>
            </div>
            <input
              id={`spell-slot-size-${widget.id}`}
              type="range"
              min="12"
              max="40"
              step="1"
              value={normalizedSpellSlotSize}
              onChange={(e) => updateData({ spellSlotSize: parseInt(e.target.value, 10) })}
              className="w-full accent-theme-accent"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor={`spell-slot-horizontal-spacing-${widget.id}`} className="text-xs font-bold uppercase text-theme-muted">
                Horizontal spacing
              </label>
              <span className="widget-editor__section-count">{normalizedHorizontalSpacing}px</span>
            </div>
            <input
              id={`spell-slot-horizontal-spacing-${widget.id}`}
              type="range"
              min="0"
              max="16"
              step="1"
              value={normalizedHorizontalSpacing}
              onChange={(e) => updateData({ spellSlotHorizontalSpacing: parseInt(e.target.value, 10) })}
              className="w-full accent-theme-accent"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor={`spell-slot-vertical-spacing-${widget.id}`} className="text-xs font-bold uppercase text-theme-muted">
                Vertical spacing
              </label>
              <span className="widget-editor__section-count">{normalizedVerticalSpacing}px</span>
            </div>
            <input
              id={`spell-slot-vertical-spacing-${widget.id}`}
              type="range"
              min="0"
              max="16"
              step="1"
              value={normalizedVerticalSpacing}
              onChange={(e) => updateData({ spellSlotVerticalSpacing: parseInt(e.target.value, 10) })}
              className="w-full accent-theme-accent"
            />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection>
        <div className="widget-editor__section-heading">
          <h3 id={`spell-interaction-title-${widget.id}`} className="widget-editor__section-title">Interaction</h3>
        </div>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={showResetButton}
            onChange={(e) => updateData({ showResetButton: e.target.checked })}
            className="h-4 w-4 accent-theme-accent"
          />
          <span className="text-sm text-theme-ink">Show Reset All button</span>
        </label>
      </CollapsibleSection>
    </div>
  );
}

