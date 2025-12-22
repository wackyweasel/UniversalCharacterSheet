import { EditorProps } from './types';

export function RestButtonEditor({ widget, updateData }: EditorProps) {
  const { 
    buttonText = 'Rest',
    healToFull = false,
    healRandomDice = [],
    healFlatAmount = 0,
    clearConditions = false,
    resetSpellSlots = false,
    passTime = false,
    passTimeAmount = 0,
    passTimeUnit = 'hours'
  } = widget.data;

  const updateDiceGroup = (index: number, field: 'count' | 'faces', value: number | string) => {
    const newGroups = [...healRandomDice];
    newGroups[index] = { ...newGroups[index], [field]: value };
    updateData({ healRandomDice: newGroups });
  };

  const addDiceGroup = () => {
    updateData({ healRandomDice: [...healRandomDice, { count: 1, faces: 8 }] });
  };

  const removeDiceGroup = (index: number) => {
    const newGroups = healRandomDice.filter((_: any, i: number) => i !== index);
    updateData({ healRandomDice: newGroups });
  };

  // When healToFull is enabled, clear the random dice and flat amount
  const handleHealToFullChange = (checked: boolean) => {
    if (checked) {
      updateData({ healToFull: true, healRandomDice: [], healFlatAmount: 0 });
    } else {
      updateData({ healToFull: false });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Button Text</label>
        <input
          className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={buttonText}
          onChange={(e) => updateData({ buttonText: e.target.value })}
          placeholder="Rest"
        />
      </div>

      <div className="border border-theme-border rounded-button p-3">
        <h4 className="font-medium text-theme-ink mb-3">Healing Options</h4>
        
        <label className="flex items-center gap-2 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={healToFull}
            onChange={(e) => handleHealToFullChange(e.target.checked)}
            className="w-4 h-4 accent-theme-accent"
          />
          <span className="text-sm text-theme-ink">Heal to Full</span>
        </label>

        {!healToFull && (
          <>
            <div className="mb-3">
              <label className="block text-sm font-medium text-theme-ink mb-2">Random Heal Dice</label>
              <div className="space-y-2">
                {healRandomDice.map((group: { count: number; faces: number }, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={group.count}
                      onChange={(e) => updateDiceGroup(index, 'count', e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                      onBlur={(e) => updateDiceGroup(index, 'count', Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm text-center"
                    />
                    <span className="text-theme-ink">d</span>
                    <input
                      type="number"
                      min="1"
                      value={group.faces}
                      onChange={(e) => updateDiceGroup(index, 'faces', e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                      onBlur={(e) => updateDiceGroup(index, 'faces', Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm text-center"
                    />
                    <button
                      onClick={() => removeDiceGroup(index)}
                      className="text-red-500 hover:text-red-700 px-2"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addDiceGroup}
                className="mt-2 px-3 py-1 border border-theme-border rounded-button text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper"
              >
                + Add Dice
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-ink mb-1">Flat Heal Amount</label>
              <input
                type="number"
                min="0"
                className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
                value={healFlatAmount ?? 0}
                onChange={(e) => updateData({ healFlatAmount: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-theme-muted mt-1">Added to dice result if dice are configured</p>
            </div>
          </>
        )}
      </div>

      <div className="border border-theme-border rounded-button p-3">
        <h4 className="font-medium text-theme-ink mb-3">Other Actions</h4>
        
        <label className="flex items-center gap-2 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={clearConditions}
            onChange={(e) => updateData({ clearConditions: e.target.checked })}
            className="w-4 h-4 accent-theme-accent"
          />
          <span className="text-sm text-theme-ink">Clear All Conditions</span>
        </label>
        <p className="text-xs text-theme-muted ml-6 mb-3">Turns off all active conditions in Condition widgets</p>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={resetSpellSlots}
            onChange={(e) => updateData({ resetSpellSlots: e.target.checked })}
            className="w-4 h-4 accent-theme-accent"
          />
          <span className="text-sm text-theme-ink">Reset Spell Slots</span>
        </label>
        <p className="text-xs text-theme-muted ml-6 mb-3">Restores all used spell slots in Spell Slot widgets</p>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={passTime}
            onChange={(e) => updateData({ passTime: e.target.checked, passTimeAmount: 0, passTimeUnit: 'hours' })}
            className="w-4 h-4 accent-theme-accent"
          />
          <span className="text-sm text-theme-ink">Pass Time</span>
        </label>
        <p className="text-xs text-theme-muted ml-6 mb-2">Advances time for all Time Tracker widgets</p>
        
        {passTime && (
          <div className="ml-6 mt-2">
            <label className="block text-xs text-theme-muted mb-1">Flat Time Amount (leave 0 to prompt when clicked)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                className="w-20 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm text-center"
                value={passTimeAmount ?? 0}
                onChange={(e) => updateData({ passTimeAmount: parseInt(e.target.value) || 0 })}
              />
              <select
                className="flex-1 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm"
                value={passTimeUnit}
                onChange={(e) => updateData({ passTimeUnit: e.target.value })}
              >
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

