import { useState, useMemo } from 'react';
import { DiceGroup, CustomDie } from '../../types';
import { EditorProps } from './types';
import { useStore } from '../../store/useStore';
import { LabeledNumberField } from './LabeledNumberField';
import { Tooltip } from '../Tooltip';

// Type guard to check if a die is a custom die
const isCustomDie = (die: number | CustomDie): die is CustomDie => {
  return typeof die === 'object' && 'faces' in die && Array.isArray(die.faces);
};

const isNumericFace = (face: string) => face.trim() !== '' && !Number.isNaN(Number(face));

const getFaceOptions = (group: DiceGroup): string[] => {
  if (group.customFaces && group.customFaces.length > 0) {
    return Array.from(new Set(group.customFaces.map(face => String(face))));
  }

  const faceCount = Math.max(1, Math.floor(Number(group.faces) || 1));
  return Array.from({ length: faceCount }, (_, i) => String(i + 1));
};

const getDefaultExplodeOn = (group: DiceGroup): string[] => {
  const options = getFaceOptions(group);
  if (options.length === 0 || !options.every(isNumericFace)) return [];

  const maxFace = Math.max(...options.map(face => Number(face)));
  return options.filter(face => Number(face) === maxFace);
};

const getSelectedExplodeFaces = (group: DiceGroup): string[] => {
  const options = getFaceOptions(group);
  const selected = Array.isArray(group.explodeOn)
    ? group.explodeOn
    : getDefaultExplodeOn(group);

  return selected.map(face => String(face)).filter(face => options.includes(face));
};

const normalizeExplodingSettings = (group: DiceGroup, preferDefaultWhenEmpty = false): DiceGroup => {
  if (!group.explodes) return group;

  const selected = getSelectedExplodeFaces(group);
  const explodeOn = selected.length > 0 || !preferDefaultWhenEmpty
    ? selected
    : getDefaultExplodeOn(group);

  return {
    ...group,
    explodeOn,
    explodeAgain: group.explodeAgain ?? true,
  };
};

const describeExplodeFaces = (group: DiceGroup): string => {
  const selected = getSelectedExplodeFaces(group);
  if (selected.length === 0) return 'Select faces';
  if (selected.length <= 3) return selected.join(', ');
  return `${selected.length} faces`;
};

export function DiceRollerEditor({ widget, updateData }: EditorProps) {
  const { label, diceGroups = [{ count: 1, faces: 20 }], modifier = 0, fieldLabels = {}, fieldFormulas = {} } = widget.data;
  const [customFacesModal, setCustomFacesModal] = useState<{ open: boolean; groupIndex: number; faces: string[]; diceName: string }>({ open: false, groupIndex: -1, faces: [], diceName: '' });
  const [newFaceValue, setNewFaceValue] = useState('');

  const setFieldLabel = (field: string, labelName: string | undefined) => {
    const updated = { ...fieldLabels };
    if (labelName) updated[field] = labelName;
    else delete updated[field];
    updateData({ fieldLabels: updated });
  };

  const setFieldFormula = (field: string, formula: string | undefined) => {
    const updated = { ...fieldFormulas };
    if (formula) updated[field] = formula;
    else delete updated[field];
    updateData({ fieldFormulas: updated });
  };

  // Get all custom dice from the current character (from both DICE_ROLLER and DICE_TRAY widgets)
  const characters = useStore(state => state.characters);
  const activeCharacterId = useStore(state => state.activeCharacterId);
  
  const existingCustomDice = useMemo(() => {
    const activeChar = characters.find(c => c.id === activeCharacterId);
    if (!activeChar) return [];
    
    const customDice: { name: string; faces: string[] }[] = [];
    
    // Search all sheets for dice roller and dice tray widgets with custom dice
    for (const sheet of activeChar.sheets) {
      for (const w of sheet.widgets) {
        // Check DICE_ROLLER widgets
        if (w.type === 'DICE_ROLLER' && w.data.diceGroups) {
          for (const group of w.data.diceGroups as DiceGroup[]) {
            if (group.customFaces && group.customFaces.length > 0 && group.customDiceName) {
              // Avoid duplicates by name
              if (!customDice.some(d => d.name === group.customDiceName)) {
                customDice.push({
                  name: group.customDiceName,
                  faces: group.customFaces
                });
              }
            }
          }
        }
        // Check DICE_TRAY widgets
        if (w.type === 'DICE_TRAY' && w.data.availableDice) {
          for (const die of w.data.availableDice as (number | CustomDie)[]) {
            if (isCustomDie(die) && die.name) {
              // Avoid duplicates by name
              if (!customDice.some(d => d.name === die.name)) {
                customDice.push({
                  name: die.name,
                  faces: die.faces
                });
              }
            }
          }
        }
      }
    }
    
    return customDice;
  }, [characters, activeCharacterId]);

  const loadExistingDice = (diceName: string) => {
    const dice = existingCustomDice.find(d => d.name === diceName);
    if (dice) {
      setCustomFacesModal(prev => ({
        ...prev,
        diceName: dice.name,
        faces: [...dice.faces]
      }));
    }
  };

  const updateDiceGroup = (index: number, field: 'count' | 'faces' | 'customFaces' | 'customDiceName' | 'explodes' | 'explodeOn' | 'explodeAgain', value: number | string | string[] | boolean) => {
    const newGroups = [...diceGroups];
    let updatedGroup = { ...newGroups[index], [field]: value } as DiceGroup;

    if (field === 'explodes' && value === true) {
      updatedGroup = normalizeExplodingSettings(updatedGroup, true);
    } else if (updatedGroup.explodes && (field === 'faces' || field === 'customFaces')) {
      updatedGroup = normalizeExplodingSettings(updatedGroup, true);
    }

    newGroups[index] = updatedGroup;
    updateData({ diceGroups: newGroups });
  };

  const toggleExplodeFace = (index: number, face: string) => {
    const group = diceGroups[index];
    const selected = getSelectedExplodeFaces(group);
    const nextSelected = selected.includes(face)
      ? selected.filter(selectedFace => selectedFace !== face)
      : [...selected, face];

    updateDiceGroup(index, 'explodeOn', nextSelected);
  };

  const updateDiceGroupAutomation = (index: number, updates: Pick<Partial<DiceGroup>, 'countLabel' | 'countFormula'>) => {
    const newGroups = [...diceGroups];
    newGroups[index] = { ...newGroups[index], ...updates };
    updateData({ diceGroups: newGroups });
  };

  const openCustomFacesModal = (index: number) => {
    const currentFaces = diceGroups[index].customFaces || [];
    const currentName = diceGroups[index].customDiceName || '';
    setCustomFacesModal({ open: true, groupIndex: index, faces: [...currentFaces], diceName: currentName });
    setNewFaceValue('');
  };

  const closeCustomFacesModal = () => {
    setCustomFacesModal({ open: false, groupIndex: -1, faces: [], diceName: '' });
    setNewFaceValue('');
  };

  const saveCustomFaces = () => {
    if (customFacesModal.groupIndex >= 0) {
      const newGroups = [...diceGroups];
      if (customFacesModal.faces.length > 0) {
        newGroups[customFacesModal.groupIndex] = normalizeExplodingSettings({ 
          ...newGroups[customFacesModal.groupIndex], 
          customFaces: customFacesModal.faces,
          customDiceName: customFacesModal.diceName.trim() || undefined,
          faces: customFacesModal.faces.length // Update faces count to match custom faces
        }, true);
      } else {
        // Remove customFaces if empty
        const { customFaces, customDiceName, ...rest } = newGroups[customFacesModal.groupIndex];
        newGroups[customFacesModal.groupIndex] = normalizeExplodingSettings(rest as DiceGroup, true);
      }
      updateData({ diceGroups: newGroups });
    }
    closeCustomFacesModal();
  };

  const addCustomFace = () => {
    if (newFaceValue.trim()) {
      setCustomFacesModal(prev => ({ ...prev, faces: [...prev.faces, newFaceValue.trim()] }));
      setNewFaceValue('');
    }
  };

  const removeCustomFace = (faceIndex: number) => {
    setCustomFacesModal(prev => ({ ...prev, faces: prev.faces.filter((_, i) => i !== faceIndex) }));
  };

  const clearCustomFaces = (index: number) => {
    const newGroups = [...diceGroups];
    const { customFaces, customDiceName, ...rest } = newGroups[index];
    newGroups[index] = normalizeExplodingSettings({ ...rest, faces: 6 } as DiceGroup, true); // Reset to d6
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
        <div className="relative">
          <input
            className="w-full px-3 py-2 pr-8 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            value={label || ''}
            onChange={(e) => updateData({ label: e.target.value })}
            placeholder="Roll Name"
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
        <label className="block text-sm font-medium text-theme-ink mb-2">Dice Groups</label>
        <div className="space-y-2">
          {diceGroups.map((group: DiceGroup, index: number) => (
            <div key={index} className="flex flex-col gap-1">
              <LabeledNumberField
                value={group.count}
                onChange={(v) => updateDiceGroup(index, 'count', Math.max(1, v))}
                fieldLabel={group.countLabel}
                onFieldLabelChange={(l) => updateDiceGroupAutomation(index, { countLabel: l })}
                formula={group.countFormula}
                onFormulaChange={(f) => updateDiceGroupAutomation(index, { countFormula: f })}
                min={1}
                compact
                hideStepperButtons
                renderRow={({ controls }) => (
                  <div className="flex items-center gap-2 flex-wrap">
                    {controls}
                    <span className="text-theme-ink">d</span>
                    <input
                      type="number"
                      min="1"
                      value={group.faces}
                      onChange={(e) => updateDiceGroup(index, 'faces', e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                      onBlur={(e) => updateDiceGroup(index, 'faces', Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      disabled={!!group.customFaces?.length}
                      title={group.customFaces?.length ? 'Faces set by custom faces' : ''}
                    />
                    <Tooltip content="Set custom faces">
                      <button
                        onClick={() => openCustomFacesModal(index)}
                        className={`px-2 py-1 border border-theme-border rounded-button text-xs hover:bg-theme-accent hover:text-theme-paper ${
                          group.customFaces?.length ? 'bg-theme-accent text-theme-paper' : 'bg-theme-paper text-theme-ink'
                        }`}
                      >
                        Custom Faces
                      </button>
                    </Tooltip>
                    {group.customFaces?.length ? (
                      <Tooltip content="Clear custom faces">
                        <button
                          onClick={() => clearCustomFaces(index)}
                          className="text-orange-500 hover:text-orange-700 px-1 text-xs"
                        >
                          ✕
                        </button>
                      </Tooltip>
                    ) : null}
                      <label className="inline-flex h-7 items-center gap-1 px-2 border border-theme-border rounded-button text-xs text-theme-ink hover:border-theme-accent cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!group.explodes}
                          onChange={(e) => updateDiceGroup(index, 'explodes', e.target.checked)}
                          className="w-3 h-3 border border-theme-border rounded bg-theme-paper text-theme-accent focus:ring-theme-accent"
                        />
                        <span>Explode</span>
                      </label>
                    {diceGroups.length > 1 && (
                      <button
                        onClick={() => removeDiceGroup(index)}
                        className="text-red-500 hover:text-red-700 px-2"
                      >
                        ×
                      </button>
                    )}
                  </div>
                )}
              />
              {group.customFaces?.length ? (
                <div className="text-xs text-theme-muted ml-2 flex flex-wrap gap-1">
                  {group.customDiceName && <span className="font-medium text-theme-ink">{group.customDiceName}:</span>}
                  <span className="italic">Faces:</span>
                  {group.customFaces.map((face, i) => (
                    <span key={i} className="bg-theme-border/30 px-1 rounded">{face}</span>
                  ))}
                </div>
              ) : null}
              {group.explodes ? (
                <div className="ml-2 flex flex-wrap items-start gap-2 text-xs">
                  <details className="relative">
                    <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink hover:border-theme-accent">
                      Triggers: {describeExplodeFaces(group)}
                    </summary>
                    <div className="mt-1 w-44 max-h-36 overflow-y-auto border border-theme-border rounded-button bg-theme-paper p-1 shadow-sm">
                      {getFaceOptions(group).map(face => (
                        <label
                          key={face}
                          className="flex items-center gap-2 px-2 py-1 rounded text-theme-ink hover:bg-theme-border/30 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={getSelectedExplodeFaces(group).includes(face)}
                            onChange={() => toggleExplodeFace(index, face)}
                            className="w-3 h-3 border border-theme-border rounded bg-theme-paper text-theme-accent focus:ring-theme-accent"
                          />
                          <span className="truncate">{face}</span>
                        </label>
                      ))}
                    </div>
                  </details>
                  <label className="inline-flex items-center gap-1 px-2 py-1 border border-theme-border rounded-button text-theme-ink hover:border-theme-accent cursor-pointer">
                    <input
                      type="checkbox"
                      checked={group.explodeAgain ?? true}
                      onChange={(e) => updateDiceGroup(index, 'explodeAgain', e.target.checked)}
                      className="w-3 h-3 border border-theme-border rounded bg-theme-paper text-theme-accent focus:ring-theme-accent"
                    />
                    <span>Chain explosions</span>
                  </label>
                </div>
              ) : null}
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
        <LabeledNumberField
          displayLabel="Modifier"
          value={modifier}
          onChange={(v) => updateData({ modifier: v })}
          tutorialTargetPrefix="automation-dice-modifier"
          fieldLabel={fieldLabels['modifier']}
          onFieldLabelChange={(l) => setFieldLabel('modifier', l)}
          formula={fieldFormulas['modifier']}
          onFormulaChange={(f) => setFieldFormula('modifier', f)}
        />
      </div>

      {/* Custom Faces Modal */}
      {customFacesModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeCustomFacesModal}>
          <div 
            className="bg-theme-paper border-2 border-theme-border rounded-lg p-4 w-96 max-h-[80vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-theme-ink mb-4">Custom Dice Faces</h3>
            
            {/* Copy from existing custom dice */}
            {existingCustomDice.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-theme-ink mb-1">Copy from existing dice</label>
                <select
                  className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      loadExistingDice(e.target.value);
                    }
                  }}
                >
                  <option value="">Select a custom dice to copy...</option>
                  {existingCustomDice.map((dice) => (
                    <option key={dice.name} value={dice.name}>
                      {dice.name} ({dice.faces.length} faces)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Dice Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-theme-ink mb-1">Dice Name (optional)</label>
              <input
                type="text"
                value={customFacesModal.diceName}
                onChange={(e) => setCustomFacesModal(prev => ({ ...prev, diceName: e.target.value }))}
                placeholder="e.g., Fate Die, Doom Die, Attack Die"
                className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm"
              />
            </div>

            <p className="text-sm text-theme-muted mb-4">
              Add any values for dice faces: numbers, emojis, symbols, or text.<br/>
              <span className="font-medium">Tip:</span> Use <code className="bg-theme-border/30 px-1 rounded">,</code> to put multiple values on one face (e.g., <code className="bg-theme-border/30 px-1 rounded">💀,poison</code> or <code className="bg-theme-border/30 px-1 rounded">2,⚔️</code>)
            </p>
            
            {/* Add new face */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newFaceValue}
                onChange={(e) => setNewFaceValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomFace()}
                placeholder="e.g., 💀, poison, 5, or 💀,poison"
                className="flex-1 px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm"
              />
              <button
                onClick={addCustomFace}
                className="px-3 py-2 bg-theme-accent text-theme-paper rounded-button text-sm hover:opacity-90"
              >
                Add
              </button>
            </div>

            {/* Current faces */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-theme-ink mb-2">
                Current Faces ({customFacesModal.faces.length})
              </label>
              {customFacesModal.faces.length === 0 ? (
                <p className="text-sm text-theme-muted italic">No custom faces added yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {customFacesModal.faces.map((face, i) => (
                    <div 
                      key={i} 
                      className="flex items-center gap-1 bg-theme-border/30 px-2 py-1 rounded-button group"
                    >
                      <span className="text-theme-ink">{face}</span>
                      <button
                        onClick={() => removeCustomFace(i)}
                        className="text-red-500 hover:text-red-700 text-xs opacity-60 group-hover:opacity-100"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick add common values */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-theme-ink mb-2">Quick Add (click to append to input)</label>
              <div className="flex flex-wrap gap-1">
                {['💀', '⚔️', '🛡️', '✨', '🔥', '❄️', '⚡', 'miss', 'hit', 'crit', 'poison', 'bleed', 'stun', '1', '2', '3'].map((val) => (
                  <button
                    key={val}
                    onClick={() => setNewFaceValue(prev => prev ? `${prev},${val}` : val)}
                    className="px-2 py-1 border border-theme-border rounded-button text-xs hover:bg-theme-accent hover:text-theme-paper"
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-theme-border">
              <button
                onClick={closeCustomFacesModal}
                className="px-4 py-2 border border-theme-border rounded-button text-sm text-theme-ink hover:bg-theme-muted hover:text-theme-paper"
              >
                Cancel
              </button>
              <button
                onClick={saveCustomFaces}
                className="px-4 py-2 bg-theme-accent text-theme-paper rounded-button text-sm hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

