export type WidgetType = 
  | 'NUMBER' 
  | 'LIST' 
  | 'TEXT' 
  | 'CHECKBOX'
  | 'HEALTH_BAR'
  | 'DICE_ROLLER'
  | 'SPELL_SLOT'
  | 'SKILL'
  | 'IMAGE'
  | 'POOL'
  | 'TOGGLE_GROUP'
  | 'TABLE';

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

export interface SkillItem {
  name: string;
  value: number;
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
  // Skill
  skillItems?: SkillItem[];
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
}

export interface Widget {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  w?: number; // width
  h?: number; // height
  data: WidgetData;
}

export type ThemeId = 
  | 'default'
  | 'pen-and-paper'
  | 'medieval'
  | 'scifi'
  | 'pirate'
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
