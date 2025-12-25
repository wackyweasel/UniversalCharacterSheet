import { Character } from '../types';
import DnD5ePreset from './DnD5e_preset.json';
import DCCLvl0Preset from './DCC_lvl0_preset.json';
import MothershipPreset from './Mothership_preset.json';
import ForbiddenLandsPreset from './Forbidden_Lands_preset.json';
import TutorialPreset from './Tutorial.json';

/**
 * Character Presets
 * 
 * Add your preset JSON data here. Each preset should be a partial Character object
 * containing the sheets with widgets pre-configured.
 * 
 * The preset should include:
 * - name: A default name for the character (will be appended with a number)
 * - theme: (optional) The theme ID to use
 * - sheets: Array of sheets with widgets
 * 
 * Example preset structure:
 * {
 *   name: "D&D 5e Character",
 *   theme: "medieval",
 *   sheets: [{
 *     id: "sheet1",
 *     name: "Main",
 *     widgets: [
 *       { id: "w1", type: "NUMBER", x: 100, y: 100, data: { label: "Strength", value: 10 } },
 *       // ... more widgets
 *     ]
 *   }],
 *   activeSheetId: "sheet1"
 * }
 */

// Type for preset data (same as Character but IDs will be regenerated)
export type CharacterPreset = Omit<Character, 'id'>;

// Map of preset name to preset data
// Add your presets here!
export const CHARACTER_PRESETS: Record<string, CharacterPreset> = {
  'D&D 5e': DnD5ePreset as CharacterPreset,
  'Dungeon Crawl Classics - Level 0': DCCLvl0Preset as CharacterPreset,
  'Mothership': MothershipPreset as CharacterPreset,
  'Forbidden Lands': ForbiddenLandsPreset as CharacterPreset,
};

// Get list of available preset names
export function getPresetNames(): string[] {
  return Object.keys(CHARACTER_PRESETS);
}

// Get a preset by name
export function getPreset(name: string): CharacterPreset | undefined {
  return CHARACTER_PRESETS[name];
}

// Tutorial preset (used internally by tutorial system, not shown in preset list)
export const TUTORIAL_PRESET = TutorialPreset as CharacterPreset;
