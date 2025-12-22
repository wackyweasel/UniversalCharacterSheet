import { SpellLevel } from '../../types';
import { EditorProps } from './types';

export function SpellSlotEditor({ widget, updateData }: EditorProps) {
  const { label, spellLevels = [{ level: 1, max: 4, used: 0 }] } = widget.data;

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
    const updated = [...spellLevels];
    updated.splice(levelIdx, 1);
    updateData({ spellLevels: updated });
  };

  const updateLevelMax = (levelIdx: number, max: number | string) => {
    const updated = [...spellLevels] as SpellLevel[];
    if (typeof max === 'string') {
      updated[levelIdx] = { ...updated[levelIdx], max: max as unknown as number };
    } else {
      const newMax = Math.max(1, Math.min(10, max));
      updated[levelIdx] = { 
        ...updated[levelIdx], 
        max: newMax,
        used: Math.min(updated[levelIdx].used, newMax)
      };
    }
    updateData({ spellLevels: updated });
  };

  const updateLevelNumber = (levelIdx: number, level: number | string) => {
    const updated = [...spellLevels] as SpellLevel[];
    if (typeof level === 'string') {
      updated[levelIdx] = { ...updated[levelIdx], level: level as unknown as number };
    } else {
      updated[levelIdx] = { ...updated[levelIdx], level: Math.max(1, Math.min(9, level)) };
    }
    updateData({ spellLevels: updated });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <input
          className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={label || ''}
          onChange={(e) => updateData({ label: e.target.value })}
          placeholder="Spell Slots"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Spell Levels</label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {(spellLevels as SpellLevel[]).map((levelData, levelIdx) => (
            <div key={levelIdx} className="flex items-center gap-2">
              <span className="text-theme-ink text-sm">Level</span>
              <input
                type="number"
                value={levelData.level}
                onChange={(e) => updateLevelNumber(levelIdx, e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                onBlur={(e) => updateLevelNumber(levelIdx, Math.max(1, Math.min(9, parseInt(e.target.value) || 1)))}
                className="w-12 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm text-center"
                min={1}
                max={9}
              />
              <span className="text-theme-ink text-sm">Max Slots</span>
              <input
                type="number"
                value={levelData.max}
                onChange={(e) => updateLevelMax(levelIdx, e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                onBlur={(e) => updateLevelMax(levelIdx, Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                className="w-12 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm text-center"
                min={1}
                max={10}
              />
              <button
                onClick={() => removeLevel(levelIdx)}
                className="text-red-500 hover:text-red-700 px-2"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {(spellLevels as SpellLevel[]).length < 9 && (
          <button
            onClick={addLevel}
            className="mt-2 px-3 py-1 border border-theme-border rounded-button text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper"
          >
            + Add Level
          </button>
        )}
      </div>
    </div>
  );
}

