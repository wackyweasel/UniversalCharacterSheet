import { DiceGroup } from '../../types';
import { EditorProps } from './types';

export function DiceRollerEditor({ widget, updateData }: EditorProps) {
  const { label, diceGroups = [{ count: 1, faces: 20 }], modifier = 0 } = widget.data;

  const updateDiceGroup = (index: number, field: 'count' | 'faces', value: number | string) => {
    const newGroups = [...diceGroups];
    newGroups[index] = { ...newGroups[index], [field]: value };
    updateData({ diceGroups: newGroups });
  };

  const addDiceGroup = () => {
    updateData({ diceGroups: [...diceGroups, { count: 1, faces: 6 }] });
  };

  const removeDiceGroup = (index: number) => {
    if (diceGroups.length > 1) {
      const newGroups = diceGroups.filter((_: DiceGroup, i: number) => i !== index);
      updateData({ diceGroups: newGroups });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <input
          className="w-full px-3 py-2 border border-theme-border rounded-theme bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={label || ''}
          onChange={(e) => updateData({ label: e.target.value })}
          placeholder="Roll Name"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Dice Groups</label>
        <div className="space-y-2">
          {diceGroups.map((group: DiceGroup, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={group.count}
                onChange={(e) => updateDiceGroup(index, 'count', e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                onBlur={(e) => updateDiceGroup(index, 'count', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-1 border border-theme-border rounded-theme bg-theme-paper text-theme-ink text-sm text-center"
              />
              <span className="text-theme-ink">d</span>
              <input
                type="number"
                min="1"
                value={group.faces}
                onChange={(e) => updateDiceGroup(index, 'faces', e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                onBlur={(e) => updateDiceGroup(index, 'faces', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-1 border border-theme-border rounded-theme bg-theme-paper text-theme-ink text-sm text-center"
              />
              {diceGroups.length > 1 && (
                <button
                  onClick={() => removeDiceGroup(index)}
                  className="text-red-500 hover:text-red-700 px-2"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addDiceGroup}
          className="mt-2 px-3 py-1 border border-theme-border rounded-theme text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper"
        >
          + Add Dice
        </button>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Modifier</label>
        <input
          type="number"
          className="w-full px-3 py-2 border border-theme-border rounded-theme bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={modifier}
          onChange={(e) => updateData({ modifier: parseInt(e.target.value) || 0 })}
        />
      </div>
    </div>
  );
}
