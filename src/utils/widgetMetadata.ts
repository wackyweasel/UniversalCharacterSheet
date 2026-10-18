import type { WidgetType } from '../types';

export type WidgetCategory = 'Character Info' | 'Ressources and Status' | 'Organization' | 'Randomize' | 'Time Management' | 'Mapping' | 'Legacy';

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
  { type: 'XP_LEVEL', label: 'XP & level', category: 'Character Info', keywords: 'experience points level up advancement progression milestone' },
  { type: 'SKILL_TREE', label: 'Skill tree', category: 'Character Info', keywords: 'talents perks abilities upgrades advancement prerequisites unlock points progression' },
  { type: 'REST_BUTTON', label: 'Rest button', category: 'Ressources and Status', keywords: 'reset recover refresh' },
  { type: 'HEALTH_BAR', label: 'Health bar', category: 'Ressources and Status', keywords: 'hp wounds damage' },
  { type: 'POOL', label: 'Resource pool', category: 'Ressources and Status', keywords: 'tokens points mana' },
  { type: 'WALLET', label: 'Wallet', category: 'Ressources and Status', keywords: 'money coins currency gold silver copper cp sp gp purse funds' },
  { type: 'THRESHOLD_TRACK', label: 'Threshold track', category: 'Ressources and Status', keywords: 'doom stress sanity corruption wounds damage zones levels penalty notches track' },
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
  { type: 'DICE_POOL', label: 'Dice pool', category: 'Randomize', keywords: 'successes world of darkness shadowrun year zero blades in the dark d10 d6 hits botch traits attribute skill' },
  { type: 'ROLL_TABLE', label: 'Roll table', category: 'Randomize', keywords: 'random result generator' },
  { type: 'DECK', label: 'Legacy Deck of Cards', category: 'Legacy', keywords: 'draw shuffle cards' },
  { type: 'DECK_OF_CARDS', label: 'Deck of Cards', category: 'Randomize', keywords: 'cards deck tabletop flip drag discard' },
  { type: 'INITIATIVE_TRACKER', label: 'Initiative tracker', category: 'Time Management', keywords: 'combat turn order' },
  { type: 'CALENDAR', label: 'Calendar & clock', category: 'Time Management', keywords: 'date time day night hour week month year season world clock campaign travel downtime advance rewind' },
  { type: 'TIMER', label: 'Timer', category: 'Time Management', keywords: 'countdown time' },
  { type: 'TIME_TRACKER', label: 'Temporary effects', category: 'Time Management', keywords: 'duration rounds conditions' },
  { type: 'GRID_MAP', label: 'Grid map', category: 'Mapping', keywords: 'battle vtt tokens walls tactical' },
  { type: 'MAP_SKETCHER', label: 'Map sketcher', category: 'Mapping', keywords: 'draw map diagram' },
];

export const WIDGET_CATEGORIES: WidgetCategory[] = ['Character Info', 'Ressources and Status', 'Organization', 'Randomize', 'Time Management', 'Mapping', 'Legacy'];

const WIDGET_LABELS = Object.fromEntries(
  WIDGET_OPTIONS.map(({ type, label }) => [type, label]),
) as Record<WidgetType, string>;

export function getWidgetTypeLabel(type: WidgetType): string {
  return WIDGET_LABELS[type] || type;
}