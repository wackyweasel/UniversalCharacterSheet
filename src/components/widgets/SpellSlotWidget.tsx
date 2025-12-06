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

export default function SpellSlotWidget({ widget, mode, width, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, spellLevels = [{ level: 1, max: 4, used: 0 }] } = widget.data;

  // Responsive sizing
  const isCompact = width < 180 || height < 120;
  const isLarge = width >= 350 && height >= 250;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const levelLabelClass = isCompact ? 'w-6 text-[10px]' : isLarge ? 'w-12 text-sm' : 'w-8 text-xs';
  const slotSize = isCompact ? 'w-4 h-4' : isLarge ? 'w-7 h-7' : 'w-5 h-5';
  const inputClass = isCompact ? 'w-6 text-[10px]' : isLarge ? 'w-10 text-sm' : 'w-8 text-xs';
  const buttonClass = isCompact ? 'text-[10px] px-1 py-0.5' : isLarge ? 'text-sm px-3 py-1.5' : 'text-xs px-2 py-1';
  const gapClass = isCompact ? 'gap-1' : 'gap-2';

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateWidgetData(widget.id, { label: e.target.value });
  };

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

  const addLevel = () => {
    const existingLevels = (spellLevels as SpellLevel[]).map(l => l.level);
    const nextLevel = Math.min(9, Math.max(...existingLevels, 0) + 1);
    if (nextLevel <= 9 && !existingLevels.includes(nextLevel)) {
      updateWidgetData(widget.id, { 
        spellLevels: [...spellLevels, { level: nextLevel, max: 2, used: 0 }]
      });
    }
  };

  const removeLevel = (levelIdx: number) => {
    const updated = [...spellLevels];
    updated.splice(levelIdx, 1);
    updateWidgetData(widget.id, { spellLevels: updated });
  };

  const updateLevelMax = (levelIdx: number, max: number) => {
    const updated = [...spellLevels] as SpellLevel[];
    const newMax = Math.max(1, Math.min(10, max));
    updated[levelIdx] = { 
      ...updated[levelIdx], 
      max: newMax,
      used: Math.min(updated[levelIdx].used, newMax)
    };
    updateWidgetData(widget.id, { spellLevels: updated });
  };

  const updateLevelNumber = (levelIdx: number, level: number) => {
    const updated = [...spellLevels] as SpellLevel[];
    updated[levelIdx] = { ...updated[levelIdx], level: Math.max(1, Math.min(9, level)) };
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
      <input
        className={`font-bold bg-transparent border-b border-transparent hover:border-theme-border/50 focus:border-theme-border focus:outline-none ${labelClass} flex-shrink-0 text-theme-ink font-heading`}
        value={label}
        onChange={handleLabelChange}
        placeholder="Spell Slots"
        disabled={mode === 'play'}
        onMouseDown={(e) => e.stopPropagation()}
      />

      {/* Spell Levels */}
      <div className={`flex flex-col ${gapClass} flex-1 overflow-y-auto min-h-0`}>
        {(spellLevels as SpellLevel[]).map((levelData, levelIdx) => (
          <div key={levelIdx} className={`flex items-center ${gapClass} group`}>
            {/* Level Label */}
            {mode === 'edit' ? (
              <input
                type="number"
                value={levelData.level}
                onChange={(e) => updateLevelNumber(levelIdx, parseInt(e.target.value) || 1)}
                className={`${levelLabelClass} font-bold border border-theme-border/50 text-center focus:border-theme-border focus:outline-none bg-theme-paper text-theme-ink rounded-theme`}
                min={1}
                max={9}
                onMouseDown={(e) => e.stopPropagation()}
              />
            ) : (
              <span className={`${levelLabelClass} font-bold text-center text-theme-ink`}>{ordinalSuffix(levelData.level)}</span>
            )}

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

            {/* Max Editor (edit mode) */}
            {mode === 'edit' && (
              <>
                <input
                  type="number"
                  value={levelData.max}
                  onChange={(e) => updateLevelMax(levelIdx, parseInt(e.target.value) || 1)}
                  className={`${inputClass} border border-theme-border/50 text-center focus:border-theme-border focus:outline-none bg-theme-paper text-theme-ink rounded-theme`}
                  min={1}
                  max={10}
                  onMouseDown={(e) => e.stopPropagation()}
                />
                <button
                  onClick={() => removeLevel(levelIdx)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 ${isCompact ? 'text-xs' : 'text-sm'}`}
                >
                  ×
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className={`flex items-center justify-between ${gapClass} border-t border-theme-border/50 pt-2`}>
        {mode === 'edit' && (spellLevels as SpellLevel[]).length < 9 && (
          <button
            onClick={addLevel}
            onMouseDown={(e) => e.stopPropagation()}
            className={`${buttonClass} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors text-theme-ink rounded-theme`}
          >
            + Level
          </button>
        )}
        <button
          onClick={resetAll}
          onMouseDown={(e) => e.stopPropagation()}
          className={`${buttonClass} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors ml-auto text-theme-ink rounded-theme`}
        >
          Reset All
        </button>
      </div>
    </div>
  );
}
