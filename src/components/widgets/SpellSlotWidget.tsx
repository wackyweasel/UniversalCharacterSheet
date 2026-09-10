import { useState } from 'react';
import { createPortal } from 'react-dom';
import { SpellLevel, Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { Tooltip } from '../Tooltip';
import { MinusIcon, PlusIcon, TrashIcon, XIcon } from '../icons';
import { WidgetEmptyState } from './WidgetPrimitives';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
}

function SpellSlotManagerModal({
  spellLevels,
  onChange,
  onClose,
}: {
  spellLevels: SpellLevel[];
  onChange: (spellLevels: SpellLevel[]) => void;
  onClose: () => void;
}) {
  const ordinalSuffix = (n: number) => {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const value = n % 100;
    return n + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
  };

  const addLevel = () => {
    const existingLevels = new Set(spellLevels.map((spellLevel) => spellLevel.level));
    const nextLevel = Array.from({ length: 9 }, (_, index) => index + 1).find((level) => !existingLevels.has(level));
    if (nextLevel === undefined) return;
    onChange([...spellLevels, { level: nextLevel, max: 2, used: 0 }]);
  };

  const updateSlotCount = (levelIndex: number, change: number) => {
    const currentLevel = spellLevels[levelIndex];
    if (!currentLevel) return;
    const max = Math.max(1, Math.min(10, currentLevel.max + change));
    if (max === currentLevel.max) return;
    const updatedLevels = [...spellLevels];
    updatedLevels[levelIndex] = { ...currentLevel, max, used: Math.min(currentLevel.used, max) };
    onChange(updatedLevels);
  };

  const removeLevel = (levelIndex: number) => {
    onChange(spellLevels.filter((_, index) => index !== levelIndex));
  };

  return (
    <div
      data-touch-camera-ignore="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4"
      onClick={onClose}
      onMouseDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="spell-slot-manager-title"
        className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 id="spell-slot-manager-title" className="font-heading text-base font-bold">Manage spell slots</h3>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="widget-control widget-control--subtle flex h-7 w-7 items-center justify-center"
            aria-label="Close spell slot manager"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto overscroll-contain pr-1">
          {spellLevels.map((spellLevel, levelIndex) => (
            <div key={`${spellLevel.level}-${levelIndex}`} className="flex items-center gap-2 rounded-button border border-theme-border bg-theme-accent/5 p-2">
              <span className="min-w-16 flex-1 text-sm font-bold">{ordinalSuffix(spellLevel.level)} level</span>
              <div className="flex items-center gap-1" aria-label={`${ordinalSuffix(spellLevel.level)} level slot count`}>
                <button
                  type="button"
                  onClick={() => updateSlotCount(levelIndex, -1)}
                  disabled={spellLevel.max <= 1}
                  className="widget-control widget-control--subtle flex h-7 w-7 items-center justify-center disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label={`Remove a slot from ${ordinalSuffix(spellLevel.level)}`}
                >
                  <MinusIcon className="h-3 w-3" />
                </button>
                <span className="w-14 text-center text-xs tabular-nums">{spellLevel.max} {spellLevel.max === 1 ? 'slot' : 'slots'}</span>
                <button
                  type="button"
                  onClick={() => updateSlotCount(levelIndex, 1)}
                  disabled={spellLevel.max >= 10}
                  className="widget-control widget-control--subtle flex h-7 w-7 items-center justify-center disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label={`Add a slot to ${ordinalSuffix(spellLevel.level)}`}
                >
                  <PlusIcon className="h-3 w-3" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeLevel(levelIndex)}
                className="widget-control widget-control--subtle flex h-7 w-7 items-center justify-center text-red-500 hover:text-red-700"
                aria-label={`Remove ${ordinalSuffix(spellLevel.level)} level`}
              >
                <TrashIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
          {spellLevels.length === 0 && (
            <p className="rounded-button border border-dashed border-theme-border px-3 py-4 text-center text-sm text-theme-muted">No spell levels configured.</p>
          )}
        </div>
        <div className="mt-4 flex justify-between gap-2">
          <button
            type="button"
            onClick={addLevel}
            disabled={spellLevels.length >= 9}
            className="widget-control widget-control--primary flex items-center gap-1 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            <PlusIcon className="h-3 w-3" />
            Add level
          </button>
          <button type="button" onClick={onClose} className="widget-control px-3 py-1.5 text-sm">Done</button>
        </div>
      </div>
    </div>
  );
}

export default function SpellSlotWidget({ widget, mode, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const isPrintMode = mode === 'print';
  const [showManager, setShowManager] = useState(false);
  const { label, spellLevels = [{ level: 1, max: 4, used: 0 }], fillColor, spellSlotShape = 'circle', spellSlotSize = 20, spellSlotHorizontalSpacing = 4, spellSlotVerticalSpacing = 4, showResetButton = true } = widget.data;
  const showFieldControls = widget.data.showFieldControls !== false && !isPrintMode;
  const normalizedSpellSlotSize = Math.max(12, Math.min(40, spellSlotSize));
  const normalizedHorizontalSpacing = Math.max(0, Math.min(16, spellSlotHorizontalSpacing));
  const normalizedVerticalSpacing = Math.max(0, Math.min(16, spellSlotVerticalSpacing));

  // Fixed small sizing
  const levelLabelClass = 'w-6 text-[10px]';
  const buttonClass = 'text-[10px] px-1 py-0.5';
  const gapClass = 'gap-1';
  const slotShapeClass = spellSlotShape === 'square'
    ? 'rounded-button'
    : 'rounded-full';
  
  // Calculate spell levels area height
  const hasHeader = Boolean(label || showFieldControls);
  const labelHeight = hasHeader ? 16 : 0;
  const controlsHeight = 28;
  const gapSize = 4;
  const padding = 0;
  const levelsHeight = Math.max(30, height - labelHeight - controlsHeight - gapSize * 3 - padding * 2);

  const toggleSlot = (levelIdx: number, slotIdx: number) => {
    const updated = [...spellLevels] as SpellLevel[];
    const levelData = updated[levelIdx];
    if (slotIdx < levelData.used) {
      updated[levelIdx] = { ...levelData, used: slotIdx };
      addTimelineEvent(label || 'Spell Slots', 'SPELL_SLOT', `${ordinalSuffix(levelData.level)} level: restored slot (${slotIdx} / ${levelData.max} used)`, '✨');
    } else {
      updated[levelIdx] = { ...levelData, used: slotIdx + 1 };
      addTimelineEvent(label || 'Spell Slots', 'SPELL_SLOT', `${ordinalSuffix(levelData.level)} level: used slot (${slotIdx + 1} / ${levelData.max} used)`, '🔮');
    }
    updateWidgetData(widget.id, { spellLevels: updated });
  };

  const resetAll = () => {
    const updated = (spellLevels as SpellLevel[]).map(l => ({ ...l, used: 0 }));
    updateWidgetData(widget.id, { spellLevels: updated });
    addTimelineEvent(label || 'Spell Slots', 'SPELL_SLOT', 'All spell slots reset', '✨');
  };

  const ordinalSuffix = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {hasHeader && (
        <div className={`widget-header flex-shrink-0 ${showFieldControls ? 'pr-4' : ''}`}>
          <div className="widget-header-title min-w-0 flex-1 truncate">{label}</div>
          {showFieldControls && (
            <div className="spell-slot-widget__controls widget-structure-controls ml-auto flex flex-shrink-0 items-center gap-1">
              <Tooltip content="Manage spell slot levels and slots">
                <button
                  type="button"
                  onClick={() => setShowManager(true)}
                  onMouseDown={(event) => event.stopPropagation()}
                  aria-label="Manage spell slot levels and slots"
                  className="widget-control widget-control--subtle flex h-6 w-6 items-center justify-center text-sm font-bold"
                >
                  <PlusIcon className="h-3 w-3" />
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      )}

      {/* Spell Levels */}
      <div 
        className="flex flex-1 flex-col overflow-y-auto"
        style={{ maxHeight: `${levelsHeight}px`, rowGap: `${normalizedVerticalSpacing}px` }}
        onWheel={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight > el.clientHeight) {
            e.stopPropagation();
          }
        }}
      >
        {(spellLevels as SpellLevel[]).map((levelData, levelIdx) => (
          <div key={levelIdx} className={`flex items-center ${gapClass}`}>
            {/* Level Label */}
            <span className={`${levelLabelClass} font-bold text-center text-theme-ink font-body`}>{ordinalSuffix(levelData.level)}</span>

            {/* Slots */}
            <div className="flex flex-1 flex-wrap" style={{ gap: `${normalizedHorizontalSpacing}px` }}>
              {Array.from({ length: levelData.max }).map((_, slotIdx) => (
                <Tooltip key={slotIdx} content={slotIdx < levelData.used ? 'Click to restore' : 'Click to use'}>
                  {spellSlotShape === 'diamond' ? (
                    <button
                      onClick={() => toggleSlot(levelIdx, slotIdx)}
                      onMouseDown={(e) => e.stopPropagation()}
                      aria-label={`${ordinalSuffix(levelData.level)} level slot ${slotIdx + 1}: ${slotIdx < levelData.used ? 'used' : 'available'}`}
                      aria-pressed={slotIdx < levelData.used}
                      className="flex items-center justify-center border-0 bg-transparent p-0 transition-all hover:opacity-80 focus-visible:scale-110"
                      style={{ width: `${normalizedSpellSlotSize}px`, height: `${normalizedSpellSlotSize}px` }}
                    >
                      <span
                        className={`rotate-45 rounded-sm border border-theme-border ${slotIdx < levelData.used ? 'bg-theme-accent' : 'bg-theme-paper'}`}
                        style={{
                          width: `${Math.max(8, Math.round(normalizedSpellSlotSize * 0.7))}px`,
                          height: `${Math.max(8, Math.round(normalizedSpellSlotSize * 0.7))}px`,
                          ...(slotIdx < levelData.used && fillColor ? { backgroundColor: fillColor } : {}),
                        }}
                        aria-hidden="true"
                      />
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleSlot(levelIdx, slotIdx)}
                      onMouseDown={(e) => e.stopPropagation()}
                      aria-label={`${ordinalSuffix(levelData.level)} level slot ${slotIdx + 1}: ${slotIdx < levelData.used ? 'used' : 'available'}`}
                      aria-pressed={slotIdx < levelData.used}
                      className={`${slotShapeClass} border border-theme-border transition-all focus-visible:scale-110 ${
                        slotIdx < levelData.used 
                          ? 'bg-theme-accent' 
                          : 'bg-theme-paper hover:opacity-80'
                      }`}
                      style={{
                        width: `${normalizedSpellSlotSize}px`,
                        height: `${normalizedSpellSlotSize}px`,
                        ...(slotIdx < levelData.used && fillColor ? { backgroundColor: fillColor } : {}),
                      }}
                    />
                  )}
                </Tooltip>
              ))}
            </div>
          </div>
        ))}
        {spellLevels.length === 0 && (
          <WidgetEmptyState title="No spell levels configured" hint="Add slot levels in Build." compact />
        )}
      </div>

      {/* Controls */}
      {showResetButton && (
        <div className={`flex items-center justify-end ${gapClass} pt-1 flex-shrink-0 ${isPrintMode ? 'opacity-0' : ''}`}>
          <Tooltip content="Reset all spell slots to unused">
            <button
              onClick={resetAll}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={(spellLevels as SpellLevel[]).every((level) => level.used === 0)}
              className={`${buttonClass} widget-control widget-control--subtle disabled:opacity-35`}
            >
              Reset All
            </button>
          </Tooltip>
        </div>
      )}

      {showManager && createPortal(
        <SpellSlotManagerModal
          spellLevels={spellLevels as SpellLevel[]}
          onChange={(updatedSpellLevels) => updateWidgetData(widget.id, { spellLevels: updatedSpellLevels })}
          onClose={() => setShowManager(false)}
        />,
        document.body
      )}
    </div>
  );
}


