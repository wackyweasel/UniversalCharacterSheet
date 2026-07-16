import { Character } from '../types';
import DnD5ePreset from './DnD5e_preset.json';
import DCCLvl0Preset from './DCC_lvl0_preset.json';
import MothershipPreset from './Mothership_preset.json';
import ForbiddenLandsPreset from './Forbidden_Lands_preset.json';
import WorldOfDarknessPreset from './World_of_Darkness.json';
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

export interface PresetDefinition {
  id: string;
  name: string;
  accent: string;
  preset: CharacterPreset;
}

/**
 * Presentation metadata for built-in presets. Keep names stable because saved
 * data and tutorial code resolve presets through getPreset().
 */
export const PRESET_DEFINITIONS: PresetDefinition[] = [
  {
    id: 'dnd-5e',
    name: 'D&D 5e',
    accent: '#7f1d1d',
    preset: DnD5ePreset as CharacterPreset,
  },
  {
    id: 'dcc-level-0',
    name: 'Dungeon Crawl Classics',
    accent: '#92400e',
    preset: DCCLvl0Preset as CharacterPreset,
  },
  {
    id: 'mothership',
    name: 'Mothership',
    accent: '#0f766e',
    preset: MothershipPreset as CharacterPreset,
  },
  {
    id: 'forbidden-lands',
    name: 'Forbidden Lands',
    accent: '#3f6212',
    preset: ForbiddenLandsPreset as CharacterPreset,
  },
  {
    id: 'world-of-darkness',
    name: 'World of Darkness',
    accent: '#581c87',
    preset: WorldOfDarknessPreset as CharacterPreset,
  },
];

// Map of preset name to preset data
// Add your presets here!
export const CHARACTER_PRESETS: Record<string, CharacterPreset> = Object.fromEntries(
  PRESET_DEFINITIONS.map((definition) => [definition.name, definition.preset]),
);

// Get list of available preset names
export function getPresetNames(): string[] {
  return Object.keys(CHARACTER_PRESETS);
}

// Get a preset by name
export function getPreset(name: string): CharacterPreset | undefined {
  return CHARACTER_PRESETS[name];
}

export function getPresetDefinition(id: string): PresetDefinition | undefined {
  return PRESET_DEFINITIONS.find((definition) => definition.id === id);
}

// Tutorial preset (used internally by tutorial system, not shown in preset list)
export const TUTORIAL_PRESET = TutorialPreset as CharacterPreset;
