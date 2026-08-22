import { Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { Tooltip } from '../Tooltip';
import { WidgetEmptyState } from './WidgetPrimitives';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
}

interface SpellLevel {
  level: number;
  max: number;
  used: number;
}

export default function SpellSlotWidget({ widget, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const mode = useStore((state) => state.mode);
  const isPrintMode = mode === 'print';
  const { label, spellLevels = [{ level: 1, max: 4, used: 0 }], fillColor, spellSlotShape = 'circle', spellSlotSize = 20, spellSlotHorizontalSpacing = 4, spellSlotVerticalSpacing = 4, showResetButton = true } = widget.data;
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
  const labelHeight = 16;
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
      {label && (
        <div className="widget-header flex-shrink-0">
          <div className="widget-header-title min-w-0 flex-1 truncate">{label}</div>
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
    </div>
  );
}






