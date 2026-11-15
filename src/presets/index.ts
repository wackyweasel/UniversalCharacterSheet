import { Character, TableCell } from '../types';
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

export const AUTOMATION_TUTORIAL_PRESET: CharacterPreset = {
  name: 'Automations Tutorial',
  theme: 'default',
  activeSheetId: 'automation-sheet',
  sheets: [{
    id: 'automation-sheet', name: 'Main', widgets: [
      { id: 'automation-stats', type: 'NUMBER_DISPLAY', x: 40, y: 40, w: 240, h: 180, data: {
        label: 'Stats', displayNumbers: [{ id: 'automation-strength', label: 'Strength', value: 10, valueLabel: 'str' }],
      } },
      { id: 'automation-gear', type: 'INVENTORY', x: 320, y: 40, w: 340, h: 220, data: {
        label: 'Gear', inventoryItems: [{
          id: 'automation-ring', name: 'Ring of Strength', fields: [], active: false,
          effects: [{ id: 'automation-bonus', amount: 2, target: {
            kind: 'widget', widgetId: 'automation-stats', collection: 'displayNumbers', entryId: 'automation-strength', field: 'value',
          } }],
        }],
      } },
      { id: 'automation-defense', type: 'NUMBER', x: 40, y: 280, w: 240, h: 180, data: {
        label: 'Defense', numberItems: [{ id: 'automation-defense-value', name: 'Defense', value: 11, valueLabel: 'defense', valueFormula: '@str + 1' }],
      } },
    ],
  }],
  variables: [{ id: 'automation-proficiency', label: 'proficiency', value: 2 }],
  events: [{
    id: 'automation-message', name: 'Practice message', enabled: true, trigger: { kind: 'manual' },
    steps: [{ id: 'automation-message-step', effects: [{ id: 'automation-log', kind: 'log.message', params: { message: 'Current Strength: {@str}.' } }] }],
  }],
};

// Formulas tutorial: a labeled source, a live weighted table, and inline formulas.
export const COMPENDIUM_TUTORIAL_PRESET: CharacterPreset = {
  name: 'Tutorial Character',
  theme: 'classic',
  activeSheetId: 'compendium-sheet',
  compendium: [],
  sheets: [{
    id: 'compendium-sheet', name: 'Main', widgets: [
      { id: 'compendium-stats', type: 'NUMBER_DISPLAY', x: 40, y: 40, w: 240, h: 180, data: {
        label: 'Stats', displayNumbers: [{ id: 'compendium-strength', label: 'Strength', value: 10 }],
      } },
      { id: 'compendium-equipment', type: 'INVENTORY_SLOTS', x: 320, y: 40, w: 280, h: 220, data: {
        label: 'Equipment', inventoryItems: [], autoActivateItems: false,
        inventorySlots: [{ id: 'compendium-ring-slot', name: 'Ring', x: 0, y: 0, w: 100, h: 100 }],
      } },
    ],
  }],
};

export const ADVANCED_TUTORIAL_PRESET: CharacterPreset = {
    name: 'Formulas Tutorial', theme: 'default', activeSheetId: 'formulas-sheet',
    variables: [{ id: 'formulas-level', label: 'level', value: 3 }],
    sheets: [{
      id: 'formulas-sheet', name: 'Main', widgets: [
        { id: 'formulas-stats', type: 'NUMBER_DISPLAY', x: 40, y: 40, w: 240, h: 180, data: {
          label: 'Stats', displayNumbers: [{ id: 'formulas-strength', label: 'Strength', value: 10, valueLabel: 'str' }],
        } },
        { id: 'formulas-attack', type: 'DICE_ROLLER', x: 320, y: 40, w: 340, h: 220, data: {
          label: 'Attack', diceGroups: [{ count: 1, faces: 20 }], modifier: 0,
        } },
        { id: 'formulas-cargo', type: 'TABLE', x: 40, y: 300, w: 360, h: 260, data: {
          label: 'Cargo', columns: ['Qty', 'Weight', 'Load'],
          tableColumnSettings: [{ label: 'qty' }, { label: 'weight' }, { label: 'load' }],
          rows: [
            { cells: ['2', '3', { value: '6', formula: '@qty1 * @weight1' }] },
            { cells: ['1', '4', { value: '4', formula: '@qty2 * @weight2' }] },
            { cells: ['3', '0.5', { value: '1.5', formula: '@qty3 * @weight3' }] },
          ],
        } },
        { id: 'formulas-total', type: 'NUMBER', x: 440, y: 300, w: 240, h: 180, data: {
          label: 'Total Load', numberItems: [{ id: 'formulas-total-value', name: 'Total load', value: 11.5, valueLabel: 'total_load', valueFormula: 'SUM(@load)' }],
        } },
        { id: 'formulas-notes', type: 'TEXT', x: 40, y: 600, w: 640, h: 220, data: {
          label: 'Notes', text: 'Strength plus ten: {@str + 10}\nCargo load: {SUM(@qty * @weight)}\nStatus: {"Level " + @level}\nSword attack: {1d20 + floor((@str - 10) / 2)}\nLiteral braces: {{not a formula}}',
        } },
      ],
    }],
};

// Starter sheet for the Events tutorial: Bloodied and Steady again react to Health, Second Wind runs by hand,
// a Rage event button spends a Rage flame, and the Fireball spell is a {[Fireball]} button waiting for its event.
export const EVENTS_TUTORIAL_PRESET: CharacterPreset = (() => {
  const preset = JSON.parse(JSON.stringify(TutorialPreset)) as CharacterPreset;
  const widgets = (preset.sheets ?? []).flatMap((sheet) => sheet.widgets ?? []);
  const health = widgets.find((widget) => widget.type === 'HEALTH_BAR');
  const conditions = widgets.find((widget) => widget.type === 'TOGGLE_GROUP' && widget.data.label === 'Conditions');
  const restButton = widgets.find((widget) => widget.type === 'REST_BUTTON');
  const pool = widgets.find((widget) => widget.type === 'POOL');
  const rage = pool?.data.poolResources?.find((resource) => resource.style === 'flames');
  const fireball = widgets
    .find((widget) => widget.type === 'TABLE' && widget.data.label === 'Spells')
    ?.data.rows?.flatMap((row) => row.cells)
    .find((cell): cell is TableCell => typeof cell === 'object' && cell.value === 'Fireball');
  if (!health || !conditions || !restButton || !pool || !rage || !fireball) return preset;

  // The Event button takes the Long Rest button's place, so the layout stays the same.
  restButton.type = 'EVENT_BUTTON';
  restButton.data = { label: 'Rage', value: 0, items: [], text: '', buttonText: 'Rage' };
  rage.name = 'Rage';
  fireball.value = '{[Fireball]}';

  preset.events = [
    {
      id: 'tutorial-event-bloodied',
      name: 'Bloodied',
      enabled: true,
      trigger: { kind: 'value.crosses', widgetId: health.id, target: 'current', params: { compare: 'below', threshold: '50%' } },
      steps: [{
        id: 'tutorial-step-bloodied',
        effects: [
          { id: 'tutorial-effect-frightened-on', kind: 'condition.set', widgetId: conditions.id, target: 'Frightened', params: { state: 'on' } },
          { id: 'tutorial-effect-bloodied-log', kind: 'log.message', params: { message: 'Bloodied! Only {@event_value} HP left.' } },
        ],
      }],
    },
    {
      id: 'tutorial-event-steady',
      name: 'Steady again',
      enabled: true,
      trigger: { kind: 'value.crosses', widgetId: health.id, target: 'current', params: { compare: 'atOrAbove', threshold: '50%' } },
      steps: [{
        id: 'tutorial-step-steady',
        effects: [
          { id: 'tutorial-effect-frightened-off', kind: 'condition.set', widgetId: conditions.id, target: 'Frightened', params: { state: 'off' } },
        ],
      }],
    },
    {
      id: 'tutorial-event-second-wind',
      name: 'Second Wind',
      enabled: true,
      trigger: { kind: 'manual' },
      steps: [{
        id: 'tutorial-step-second-wind',
        effects: [
          // Heals at least 5, so from below half it always climbs back to half and chains into Steady again.
          { id: 'tutorial-effect-second-wind', kind: 'health.heal', widgetId: health.id, params: { amount: '1d10+4', overflow: 'lost' } },
        ],
      }],
    },
    {
      id: 'tutorial-event-rage',
      name: 'Rage',
      enabled: true,
      trigger: { kind: 'button.pressed', widgetId: restButton.id },
      steps: [{
        id: 'tutorial-step-rage',
        effects: [
          { id: 'tutorial-effect-rage-spend', kind: 'value.subtract', widgetId: pool.id, target: 'Rage', params: { amount: '1', clamp: 'yes' } },
        ],
      }],
    },
  ];
  return preset;
})();
