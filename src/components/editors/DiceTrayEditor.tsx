import React, { useState, useMemo } from 'react';
import { EditorProps } from './types';
import { useStore } from '../../store/useStore';
import { DiceGroup, CustomDie } from '../../types';

// Type guard to check if a die is a custom die
const isCustomDie = (die: number | CustomDie): die is CustomDie => {
  return typeof die === 'object' && 'faces' in die && Array.isArray(die.faces);
};

export function DiceTrayEditor({ widget, updateData }: EditorProps) {
  const { label, availableDice = [4, 6, 8, 10, 12, 20] } = widget.data;
  const [newDiceFaces, setNewDiceFaces] = useState('');
  const [customFacesModal, setCustomFacesModal] = useState<{ open: boolean; faces: string[]; diceName: string; editIndex: number | null }>({ 
    open: false, 
    faces: [], 
    diceName: '',
    editIndex: null 
  });
  const [newFaceValue, setNewFaceValue] = useState('');
  
  const COMMON_DICE = [4, 6, 8, 10, 12, 20, 100];

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

  const toggleDice = (faces: number) => {
    const current = (availableDice as (number | CustomDie)[]);
    const standardDice = current.filter(d => !isCustomDie(d)) as number[];
    const customDiceInList = current.filter(d => isCustomDie(d)) as CustomDie[];
    
    if (standardDice.includes(faces)) {
      // Remove the dice type
      const newStandard = standardDice.filter(d => d !== faces);
      updateData({ availableDice: [...newStandard.sort((a, b) => a - b), ...customDiceInList] });
    } else {
      // Add the dice type and sort
      const newStandard = [...standardDice, faces].sort((a, b) => a - b);
      updateData({ availableDice: [...newStandard, ...customDiceInList] });
    }
  };

  const addCustomNumericDice = (e: React.FormEvent) => {
    e.preventDefault();
    const faces = parseInt(newDiceFaces);
    const current = (availableDice as (number | CustomDie)[]);
    const standardDice = current.filter(d => !isCustomDie(d)) as number[];
    
    if (faces && faces > 0 && !standardDice.includes(faces)) {
      const customDiceInList = current.filter(d => isCustomDie(d)) as CustomDie[];
      const newStandard = [...standardDice, faces].sort((a, b) => a - b);
      updateData({ availableDice: [...newStandard, ...customDiceInList] });
      setNewDiceFaces('');
    }
  };

  const removeDice = (index: number) => {
    const current = [...(availableDice as (number | CustomDie)[])];
    current.splice(index, 1);
    updateData({ availableDice: current });
  };

  const openCustomFacesModal = (editIndex: number | null = null) => {
    if (editIndex !== null) {
      const die = (availableDice as (number | CustomDie)[])[editIndex];
      if (isCustomDie(die)) {
        setCustomFacesModal({ open: true, faces: [...die.faces], diceName: die.name, editIndex });
      }
    } else {
      setCustomFacesModal({ open: true, faces: [], diceName: '', editIndex: null });
    }
    setNewFaceValue('');
  };

  const closeCustomFacesModal = () => {
    setCustomFacesModal({ open: false, faces: [], diceName: '', editIndex: null });
    setNewFaceValue('');
  };

  const saveCustomDie = () => {
    if (customFacesModal.faces.length === 0 || !customFacesModal.diceName.trim()) {
      return; // Need at least name and faces
    }
    
    const newCustomDie: CustomDie = {
      name: customFacesModal.diceName.trim(),
      faces: customFacesModal.faces
    };
    
    const current = [...(availableDice as (number | CustomDie)[])];
    
    if (customFacesModal.editIndex !== null) {
      // Replace existing custom die
      current[customFacesModal.editIndex] = newCustomDie;
    } else {
      // Add new custom die
      current.push(newCustomDie);
    }
    
    updateData({ availableDice: current });
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

  // Separate standard and custom dice for display
  const standardDiceInList = (availableDice as (number | CustomDie)[])
    .map((d, i) => ({ die: d, index: i }))
    .filter(({ die }) => !isCustomDie(die)) as { die: number; index: number }[];
  const customDiceInList = (availableDice as (number | CustomDie)[])
    .map((d, i) => ({ die: d, index: i }))
    .filter(({ die }) => isCustomDie(die)) as { die: CustomDie; index: number }[];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <div className="relative">
          <input
            className="w-full px-3 py-2 pr-8 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            value={label || ''}
            onChange={(e) => updateData({ label: e.target.value })}
            placeholder="Dice Tray"
          />
          {label && (
            <button
              type="button"
              onClick={() => updateData({ label: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-ink transition-colors"
              title="Clear label"
            >
              ×
            </button>
          )}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Quick Add Common Dice</label>
        <div className="flex flex-wrap gap-2">
          {COMMON_DICE.map((faces) => (
            <button
              key={faces}
              onClick={() => toggleDice(faces)}
              className={`px-3 py-2 border border-theme-border rounded-button text-sm font-bold transition-all ${
                standardDiceInList.some(({ die }) => die === faces)
                  ? 'bg-theme-accent text-theme-paper'
                  : 'bg-theme-paper text-theme-ink hover:bg-theme-muted hover:text-theme-paper'
              }`}
            >
              d{faces}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Add Custom Numeric Dice</label>
        <form onSubmit={addCustomNumericDice} className="flex gap-2">
          <div className="flex items-center gap-1">
            <span className="text-theme-ink">d</span>
            <input
              type="number"
              min="1"
              value={newDiceFaces}
              onChange={(e) => setNewDiceFaces(e.target.value)}
              placeholder="faces"
              className="w-20 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1 bg-theme-accent text-theme-paper rounded-button text-sm hover:opacity-90"
          >
            Add
          </button>
        </form>
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Custom Faces Dice</label>
        <button
          onClick={() => openCustomFacesModal()}
          className="px-3 py-2 border border-theme-border rounded-button text-sm font-bold bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-all"
        >
          + Add Custom Faces Die
        </button>
        {customDiceInList.length > 0 && (
          <div className="mt-2 space-y-2">
            {customDiceInList.map(({ die, index }) => (
              <div
                key={`custom-${die.name}-${index}`}
                className="flex items-start gap-2 p-2 bg-theme-border/20 rounded-button"
              >
                <div className="flex-1">
                  <div className="font-bold text-sm text-theme-ink">{die.name}</div>
                  <div className="text-xs text-theme-muted flex flex-wrap gap-1 mt-1">
                    {die.faces.map((face, i) => (
                      <span key={i} className="bg-theme-border/30 px-1 rounded">{face}</span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => openCustomFacesModal(index)}
                  className="text-theme-accent hover:opacity-80 text-xs px-2 py-1"
                >
                  Edit
                </button>
                <button
                  onClick={() => removeDice(index)}
                  className="text-red-500 hover:text-red-700 px-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Current Standard Dice</label>
        {standardDiceInList.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {standardDiceInList.map(({ die, index }) => (
              <div
                key={`standard-${die}`}
                className="flex items-center gap-1 px-2 py-1 bg-theme-accent text-theme-paper rounded-button text-sm"
              >
                <span>d{die}</span>
                <button
                  onClick={() => removeDice(index)}
                  className="hover:text-red-300 ml-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-theme-muted">No standard dice selected</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showIndividualResults"
          checked={widget.data.showIndividualResults || false}
          onChange={(e) => updateData({ showIndividualResults: e.target.checked })}
          className="w-4 h-4 border border-theme-border rounded bg-theme-paper text-theme-accent focus:ring-theme-accent"
        />
        <label htmlFor="showIndividualResults" className="text-sm font-medium text-theme-ink">
          Show individual dice results (don't sum)
        </label>
      </div>

      {/* Custom Faces Modal */}
      {customFacesModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeCustomFacesModal}>
          <div 
            className="bg-theme-paper border-2 border-theme-border rounded-lg p-4 w-96 max-h-[80vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-theme-ink mb-4">
              {customFacesModal.editIndex !== null ? 'Edit Custom Die' : 'Create Custom Die'}
            </h3>
            
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
              <label className="block text-sm font-medium text-theme-ink mb-1">Dice Name (required)</label>
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
              <span className="font-medium">Tip:</span> Use <code className="bg-theme-border/30 px-1 rounded">,</code> to put multiple values on one face (e.g., <code className="bg-theme-border/30 px-1 rounded">💀,poison</code>)
            </p>
            
            {/* Add new face */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newFaceValue}
                onChange={(e) => setNewFaceValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomFace())}
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
                onClick={saveCustomDie}
                disabled={!customFacesModal.diceName.trim() || customFacesModal.faces.length === 0}
                className={`px-4 py-2 rounded-button text-sm ${
                  !customFacesModal.diceName.trim() || customFacesModal.faces.length === 0
                    ? 'bg-theme-muted text-theme-paper cursor-not-allowed'
                    : 'bg-theme-accent text-theme-paper hover:opacity-90'
                }`}
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

