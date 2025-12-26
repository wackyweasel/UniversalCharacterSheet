export type WidgetType = 
  | 'NUMBER' 
  | 'NUMBER_DISPLAY'
  | 'LIST' 
  | 'TEXT' 
  | 'CHECKBOX'
  | 'HEALTH_BAR'
  | 'DICE_ROLLER'
  | 'DICE_TRAY'
  | 'SPELL_SLOT'
  | 'IMAGE'
  | 'POOL'
  | 'TOGGLE_GROUP'
  | 'TABLE'
  | 'TIME_TRACKER'
  | 'FORM'
  | 'REST_BUTTON'
  | 'PROGRESS_BAR'
  | 'MAP_SKETCHER'
  | 'ROLL_TABLE';

export interface ToggleItem {
  name: string;
  active: boolean;
}

export interface RollTableItem {
  text: string;
  weight: number;
}

export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  bgColor?: string;
  bgOpacity?: number;
  hAlign?: 'left' | 'center' | 'right';
  vAlign?: 'top' | 'middle' | 'bottom';
}

export interface TableCell {
  value: string;
  format?: CellFormat;
}

export interface TableRow {
  cells: (string | TableCell)[];  // Support both legacy string and new TableCell format
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

export interface DisplayNumber {
  label: string;
  value: number;
}

export interface FormItem {
  name: string;
  value: string;
}

export interface DiceGroup {
  count: number;
  faces: number;
  customFaces?: string[]; // Custom faces for the dice (numbers, emojis, strings, etc.)
  customDiceName?: string; // Optional name for custom dice
}

export interface CustomDie {
  name: string;
  faces: string[]; // Custom faces (numbers, emojis, strings, etc.)
}

export interface PoolResource {
  name: string;
  max: number;
  current: number;
  style: string;
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
  // Health Bar & Progress Bar
  currentValue?: number;
  maxValue?: number;
  increment?: number;
  // Progress Bar
  showPercentage?: boolean;
  showValues?: boolean;
  // Dice Roller
  diceCount?: number;
  diceType?: number;
  modifier?: number;
  diceGroups?: DiceGroup[];
  // Dice Tray
  availableDice?: (number | CustomDie)[];  // Support both standard (number) and custom dice
  // Spell Slot
  spellLevels?: SpellLevel[];
  // Number
  numberItems?: NumberItem[];
  // Number Display
  displayNumbers?: DisplayNumber[];
  displayLayout?: 'horizontal' | 'vertical';
  // Form
  formItems?: FormItem[];
  labelWidth?: number;
  // Image
  imageUrl?: string;
  // Pool
  maxPool?: number;
  currentPool?: number;
  poolStyle?: string;
  showPoolCount?: boolean;
  poolResources?: PoolResource[];
  inlineLabels?: boolean;
  // Toggle Group
  toggleItems?: ToggleItem[];
  // Table
  columns?: string[];
  rows?: TableRow[];
  // Time Tracker
  timedEffects?: TimedEffect[];
  roundMode?: boolean;
  effectSuggestions?: string[];
  // Rest Button
  buttonText?: string;
  healToFull?: boolean;
  healRandomDice?: DiceGroup[];
  healFlatAmount?: number;
  clearConditions?: boolean;
  resetSpellSlots?: boolean;
  passTime?: boolean;
  passTimeAmount?: number;
  passTimeUnit?: string;
  // Map Sketcher
  mapShapes?: unknown[];
  strokeColor?: string;
  strokeWidth?: number;
  gridEnabled?: boolean;
  gridSize?: number;
  corridorWidth?: number;
  // Roll Table
  rollTableItems?: RollTableItem[];
  showRollTableItems?: boolean;
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

export interface Sheet {
  id: string;
  name: string;
  widgets: Widget[];
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
  sheets: Sheet[];
  activeSheetId: string;
  // Legacy: widgets array for migration (will be moved to sheets)
  widgets?: Widget[];
}
