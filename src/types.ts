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

export interface Character {
  id: string;
  name: string;
  widgets: Widget[];
}
