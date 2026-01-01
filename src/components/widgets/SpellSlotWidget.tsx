import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

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
  const { label, spellLevels = [{ level: 1, max: 4, used: 0 }] } = widget.data;

  // Fixed small sizing
  const labelClass = 'text-xs';
  const levelLabelClass = 'w-6 text-[10px]';
  const slotSize = 'w-4 h-4';
  const buttonClass = 'text-[10px] px-1 py-0.5';
  const gapClass = 'gap-1';
  
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
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {label && (
        <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {label}
        </div>
      )}

      {/* Spell Levels */}
      <div 
        className={`flex flex-col ${gapClass} overflow-y-auto flex-1`}
        style={{ maxHeight: `${levelsHeight}px` }}
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
      <div className={`flex items-center justify-end ${gapClass} border-t border-theme-border/50 pt-2 flex-shrink-0 ${isPrintMode ? 'opacity-0' : ''}`}>
        <button
          onClick={resetAll}
          onMouseDown={(e) => e.stopPropagation()}
          className={`${buttonClass} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors text-theme-ink rounded-button`}
        >
          Reset All
        </button>
      </div>
    </div>
  );
}






