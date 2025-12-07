export type WidgetType = 
  | 'NUMBER' 
  | 'LIST' 
  | 'TEXT' 
  | 'CHECKBOX'
  | 'HEALTH_BAR'
  | 'DICE_ROLLER'
  | 'SPELL_SLOT'
  | 'IMAGE'
  | 'POOL'
  | 'TOGGLE_GROUP'
  | 'TABLE'
  | 'TIME_TRACKER';

export interface ToggleItem {
  name: string;
  active: boolean;
}

export interface TableRow {
  cells: string[];
}

export interface CheckboxItem {
  name: string;
  checked: boolean;
}

export interface SpellLevel {
  level: number;
  max: number;
  used: number;
}

export interface NumberItem {
  name: string;
  value: number;
}

export interface DiceGroup {
  count: number;
  faces: number;
}

export interface WidgetData {
  label?: string;
  value?: number;
  items?: string[];
  itemCount?: number;
  text?: string;
  // Checkbox
  checked?: boolean;
  checkboxItems?: CheckboxItem[];
  // Health Bar
  currentValue?: number;
  maxValue?: number;
  // Dice Roller
  diceCount?: number;
  diceType?: number;
  modifier?: number;
  diceGroups?: DiceGroup[];
  // Spell Slot
  spellLevels?: SpellLevel[];
  // Number
  numberItems?: NumberItem[];
  // Image
  imageUrl?: string;
  // Pool
  maxPool?: number;
  currentPool?: number;
  poolStyle?: string;
  // Toggle Group
  toggleItems?: ToggleItem[];
  // Table
  columns?: string[];
  rows?: TableRow[];
  // Time Tracker
  timedEffects?: TimedEffect[];
}

export interface TimedEffect {
  name: string;
  remainingSeconds: number;
}

export interface Widget {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  w?: number; // width
  h?: number; // height
  groupId?: string; // ID of the group this widget belongs to (for snap+attach)
  attachedTo?: string[]; // IDs of widgets this widget is directly attached to (graph edges)
  data: WidgetData;
}

export type ThemeId = 
  | 'default'
  | 'pen-and-paper'
  | 'medieval'
  | 'scifi'
  | 'classic-dark'
  | 'modern-dark'
  | 'high-magic'
  | 'necrotic'
  | 'modern'
  | 'steampunk'
  | 'cyberpunk'
  | 'nature';

export interface Character {
  id: string;
  name: string;
  theme?: ThemeId | string; // Can be a built-in ThemeId or a custom theme ID
  widgets: Widget[];
}
