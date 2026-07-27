import type { WidgetType } from '../types';

export type WidgetCategory = 'Essentials' | 'Track & manage' | 'Roll & resolve' | 'Reference & utilities';

export interface WidgetOption {
  type: WidgetType;
  label: string;
  category: WidgetCategory;
  keywords?: string;
}

export const WIDGET_OPTIONS: WidgetOption[] = [
  { type: 'FORM', label: 'Fields & stats', category: 'Essentials', keywords: 'form attributes scores details' },
  { type: 'TEXT', label: 'Notes', category: 'Essentials', keywords: 'text biography description' },
  { type: 'NUMBER', label: 'Number tracker', category: 'Essentials', keywords: 'counter value resource' },
  { type: 'LIST', label: 'List', category: 'Essentials', keywords: 'abilities equipment simple entries' },
  { type: 'IMAGE', label: 'Image', category: 'Essentials', keywords: 'portrait picture artwork' },
  { type: 'HEALTH_BAR', label: 'Health bar', category: 'Track & manage', keywords: 'hp wounds damage' },
  { type: 'POOL', label: 'Resource pool', category: 'Track & manage', keywords: 'tokens points mana' },
  { type: 'PROGRESS_BAR', label: 'Progress bar', category: 'Track & manage', keywords: 'clock advancement track' },
  { type: 'CHECKBOX', label: 'Checklist', category: 'Track & manage', keywords: 'check marks tasks' },
  { type: 'TOGGLE_GROUP', label: 'Conditions', category: 'Track & manage', keywords: 'status toggle effects' },
  { type: 'SPELL_SLOT', label: 'Spell slots', category: 'Track & manage', keywords: 'magic casting' },
  { type: 'TIME_TRACKER', label: 'Temporary effects', category: 'Track & manage', keywords: 'duration rounds conditions' },
  { type: 'TIMER', label: 'Timer', category: 'Track & manage', keywords: 'countdown time' },
  { type: 'REST_BUTTON', label: 'Rest button', category: 'Track & manage', keywords: 'reset recover refresh' },
  { type: 'INVENTORY', label: 'Inventory', category: 'Track & manage', keywords: 'items equipment backpack hands horse encumbrance weight' },
  { type: 'DICE_ROLLER', label: 'Dice roller', category: 'Roll & resolve', keywords: 'roll formula check' },
  { type: 'DICE_TRAY', label: 'Dice tray', category: 'Roll & resolve', keywords: 'roll dice' },
  { type: 'STEP_DICE', label: 'Step dice', category: 'Roll & resolve', keywords: 'die rating savage' },
  { type: 'ROLL_TABLE', label: 'Roll table', category: 'Roll & resolve', keywords: 'random result generator' },
  { type: 'DECK', label: 'Deck of cards', category: 'Roll & resolve', keywords: 'draw shuffle cards' },
  { type: 'INITIATIVE_TRACKER', label: 'Initiative tracker', category: 'Roll & resolve', keywords: 'combat turn order' },
  { type: 'NUMBER_DISPLAY', label: 'Number display', category: 'Reference & utilities', keywords: 'formula calculated total' },
  { type: 'TABLE', label: 'Table', category: 'Reference & utilities', keywords: 'grid reference data' },
  { type: 'MAP_SKETCHER', label: 'Map sketcher', category: 'Reference & utilities', keywords: 'draw map diagram' },
  { type: 'GRID_MAP', label: 'Grid map', category: 'Reference & utilities', keywords: 'battle vtt tokens walls tactical' },
];

export const WIDGET_CATEGORIES: WidgetCategory[] = ['Essentials', 'Track & manage', 'Roll & resolve', 'Reference & utilities'];

const WIDGET_LABELS = Object.fromEntries(
  WIDGET_OPTIONS.map(({ type, label }) => [type, label]),
) as Record<WidgetType, string>;

export function getWidgetTypeLabel(type: WidgetType): string {
  return WIDGET_LABELS[type] || type;
}