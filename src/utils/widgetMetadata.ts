import type { WidgetType } from '../types';

export type WidgetCategory = 'Character Info' | 'Ressources and Status' | 'Organization' | 'Randomize' | 'Time Management' | 'Mapping';

export interface WidgetOption {
  type: WidgetType;
  label: string;
  category: WidgetCategory;
  keywords?: string;
}

export const WIDGET_OPTIONS: WidgetOption[] = [
  { type: 'IMAGE', label: 'Image', category: 'Character Info', keywords: 'portrait picture artwork' },
  { type: 'FORM', label: 'Fields & stats', category: 'Character Info', keywords: 'form attributes scores details' },
  { type: 'MIXED_FIELDS', label: 'Mixed fields', category: 'Character Info', keywords: 'form text number progress resource dice menu dropdown combined' },
  { type: 'NUMBER', label: 'Number tracker', category: 'Character Info', keywords: 'counter value resource' },
  { type: 'NUMBER_DISPLAY', label: 'Number display', category: 'Character Info', keywords: 'formula calculated total' },
  { type: 'PROGRESS_BAR', label: 'Progress bar', category: 'Character Info', keywords: 'clock advancement track' },
  { type: 'PROGRESS_CLOCK', label: 'Progress clocks', category: 'Character Info', keywords: 'blades in the dark pie chart segments countdown danger project track' },
  { type: 'REST_BUTTON', label: 'Rest button', category: 'Ressources and Status', keywords: 'reset recover refresh' },
  { type: 'HEALTH_BAR', label: 'Health bar', category: 'Ressources and Status', keywords: 'hp wounds damage' },
  { type: 'POOL', label: 'Resource pool', category: 'Ressources and Status', keywords: 'tokens points mana' },
  { type: 'TOGGLE_GROUP', label: 'Conditions', category: 'Ressources and Status', keywords: 'status toggle effects' },
  { type: 'SPELL_SLOT', label: 'Spell slots', category: 'Ressources and Status', keywords: 'magic casting' },
  { type: 'CHECKBOX', label: 'Checklist', category: 'Ressources and Status', keywords: 'check marks tasks' },
  { type: 'TOGGLE', label: 'Switch', category: 'Ressources and Status', keywords: 'toggle on off boolean state flag' },
  { type: 'TABLE', label: 'Table', category: 'Organization', keywords: 'grid reference data' },
  { type: 'INVENTORY', label: 'Inventory', category: 'Organization', keywords: 'items equipment backpack hands horse encumbrance weight' },
  { type: 'LIST', label: 'List', category: 'Organization', keywords: 'abilities equipment simple entries' },
  { type: 'TEXT', label: 'Notes', category: 'Organization', keywords: 'text biography description' },
  { type: 'LABEL', label: 'Label', category: 'Organization', keywords: 'header heading title section' },
  { type: 'DICE_ROLLER', label: 'Dice roller', category: 'Randomize', keywords: 'roll formula check' },
  { type: 'DICE_TRAY', label: 'Dice tray', category: 'Randomize', keywords: 'roll dice' },
  { type: 'STEP_DICE', label: 'Step dice', category: 'Randomize', keywords: 'die rating savage' },
  { type: 'ROLL_TABLE', label: 'Roll table', category: 'Randomize', keywords: 'random result generator' },
  { type: 'DECK', label: 'Legacy Deck of Cards', category: 'Randomize', keywords: 'draw shuffle cards' },
  { type: 'DECK_OF_CARDS', label: 'Deck of Cards', category: 'Randomize', keywords: 'cards deck tabletop flip drag discard' },
  { type: 'INITIATIVE_TRACKER', label: 'Initiative tracker', category: 'Time Management', keywords: 'combat turn order' },
  { type: 'TIMER', label: 'Timer', category: 'Time Management', keywords: 'countdown time' },
  { type: 'TIME_TRACKER', label: 'Temporary effects', category: 'Time Management', keywords: 'duration rounds conditions' },
  { type: 'GRID_MAP', label: 'Grid map', category: 'Mapping', keywords: 'battle vtt tokens walls tactical' },
  { type: 'MAP_SKETCHER', label: 'Map sketcher', category: 'Mapping', keywords: 'draw map diagram' },
];

export const WIDGET_CATEGORIES: WidgetCategory[] = ['Character Info', 'Ressources and Status', 'Organization', 'Randomize', 'Time Management', 'Mapping'];

const WIDGET_LABELS = Object.fromEntries(
  WIDGET_OPTIONS.map(({ type, label }) => [type, label]),
) as Record<WidgetType, string>;

export function getWidgetTypeLabel(type: WidgetType): string {
  return WIDGET_LABELS[type] || type;
}