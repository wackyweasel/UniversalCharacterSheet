import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

interface SpellLevel {
  level: number;
  max: number;
  used: number;
}

export default function SpellSlotWidget({ widget, width }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, spellLevels = [{ level: 1, max: 4, used: 0 }] } = widget.data;

  // Responsive sizing
  const isCompact = width < 180;
  const isLarge = width >= 350;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const levelLabelClass = isCompact ? 'w-6 text-[10px]' : isLarge ? 'w-12 text-sm' : 'w-8 text-xs';
  const slotSize = isCompact ? 'w-4 h-4' : isLarge ? 'w-7 h-7' : 'w-5 h-5';
  const buttonClass = isCompact ? 'text-[10px] px-1 py-0.5' : isLarge ? 'text-sm px-3 py-1.5' : 'text-xs px-2 py-1';
  const gapClass = isCompact ? 'gap-1' : 'gap-2';

  const toggleSlot = (levelIdx: number, slotIdx: number) => {
    const updated = [...spellLevels] as SpellLevel[];
    const levelData = updated[levelIdx];
    if (slotIdx < levelData.used) {
      updated[levelIdx] = { ...levelData, used: slotIdx };
    } else {
      updated[levelIdx] = { ...levelData, used: slotIdx + 1 };
    }
    updateWidgetData(widget.id, { spellLevels: updated });
  };

  const resetAll = () => {
    const updated = (spellLevels as SpellLevel[]).map(l => ({ ...l, used: 0 }));
    updateWidgetData(widget.id, { spellLevels: updated });
  };

  const ordinalSuffix = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full`}>
      <div className={`font-bold ${labelClass} text-theme-ink font-heading`}>
        {label || 'Spell Slots'}
      </div>

      {/* Spell Levels */}
      <div className={`flex flex-col ${gapClass}`}>
        {(spellLevels as SpellLevel[]).map((levelData, levelIdx) => (
          <div key={levelIdx} className={`flex items-center ${gapClass}`}>
            {/* Level Label */}
            <span className={`${levelLabelClass} font-bold text-center text-theme-ink`}>{ordinalSuffix(levelData.level)}</span>

            {/* Slot Circles */}
            <div className="flex gap-1 flex-1 flex-wrap">
              {Array.from({ length: levelData.max }).map((_, slotIdx) => (
                <button
                  key={slotIdx}
                  onClick={() => toggleSlot(levelIdx, slotIdx)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`${slotSize} rounded-full border-[length:var(--border-width)] border-theme-border transition-all ${
                    slotIdx < levelData.used 
                      ? 'bg-theme-accent' 
                      : 'bg-theme-paper hover:opacity-80'
                  }`}
                  title={slotIdx < levelData.used ? 'Click to restore' : 'Click to use'}
                />
              ))}
            </div>
          </div>
        ))}
        {spellLevels.length === 0 && (
          <div className={`${levelLabelClass} text-theme-muted italic`}>No spell levels configured</div>
        )}
      </div>

      {/* Controls */}
      <div className={`flex items-center justify-end ${gapClass} border-t border-theme-border/50 pt-2`}>
        <button
          onClick={resetAll}
          onMouseDown={(e) => e.stopPropagation()}
          className={`${buttonClass} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors text-theme-ink rounded-theme`}
        >
          Reset All
        </button>
      </div>
    </div>
  );
}
