import type { DiceStep } from './utils/diceExpression';

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
  | 'ROLL_TABLE'
  | 'GRID_MAP'
  | 'INITIATIVE_TRACKER'
  | 'DECK'
  | 'TIMER'
  | 'STEP_DICE';

export interface GridMapPoint {
  column: number;
  row: number;
}

export type GridMapTokenSize = 'tiny' | 'medium' | 'large' | 'huge' | 'gargantuan';

export interface GridMapToken extends GridMapPoint {
  id: string;
  name: string;
  color: string;
  size?: GridMapTokenSize;
}

export interface GridMapWall {
  id: string;
  start: GridMapPoint;
  end: GridMapPoint;
}

export interface ToggleItem {
  name: string;
  active: boolean;
  tooltip?: string;
}

export interface RollTableItem {
  text: string;
  weight: number;
}

export interface DeckCard {
  name: string;
  amount: number;
}

export interface DeckState {
  remaining: string[];
  discarded: string[];
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
  label?: string;
  formula?: string;
}

export interface TableRow {
  cells: (string | TableCell)[];  // Support both legacy string and new TableCell format
}

export interface TableColumnSettings {
  format?: CellFormat;
  label?: string;
  formula?: string;
}

export interface TableRowSettings {
  format?: CellFormat;
  label?: string;
  formula?: string;
}

export interface CheckboxItem {
  name: string;
  checked: boolean;
  tooltip?: string;
}

export interface ChecklistSettings {
  strikethrough?: boolean;
}

export interface SpellLevel {
  level: number;
  max: number;
  used: number;
}

export interface NumberItem {
  name: string;
  value: number;
  valueLabel?: string;
  valueFormula?: string;
  tooltip?: string;
}

export interface DisplayNumber {
  label: string;
  value: number;
  valueLabel?: string;
  valueFormula?: string;
  tooltip?: string;
}

export interface FormItem {
  name: string;
  value: string;
  tooltip?: string;
}

export interface DiceGroup {
  count: number;
  faces: number;
  customFaces?: string[]; // Custom faces for the dice (numbers, emojis, strings, etc.)
  customDiceName?: string; // Optional name for custom dice
  countLabel?: string;
  countFormula?: string;
  explodes?: boolean;
  explodeOn?: string[];
  explodeAgain?: boolean;
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
  maxLabel?: string;
  maxFormula?: string;
  currentLabel?: string;
  currentFormula?: string;
  tooltip?: string;
}

// Configures how a Rest Button restores a specific resource pool target.
export interface PoolRestoreTarget {
  widgetId: string;
  resourceIndex: number; // -1 for a legacy single-pool widget; otherwise index in poolResources
  mode: 'full' | 'flat';
  amount?: number;         // used when mode === 'flat'
  amountFormula?: string;  // optional formula evaluated at rest time (overrides amount when set)
}

export interface InitiativeParticipant {
  name: string;
  diceFaces: number;   // Number of faces on the initiative die (e.g., 20 for d20)
  flatBonus: number;   // Flat bonus to add to the roll
  flatBonusLabel?: string;
  flatBonusFormula?: string;
}export interface InitiativeEncounterEntry {
  id: string;          // Unique ID for drag/drop ordering
  name: string;
  diceFaces: number;
  flatBonus: number;
  rollResult?: number; // The result of the initiative roll (including bonus)
  isTemporary?: boolean; // True if added on-the-fly (not from pool)
}

export interface WidgetData {
  label?: string;
  value?: number;
  showFieldControls?: boolean;
  showMaxControl?: boolean;
  items?: string[];
  itemCount?: number;
  text?: string;
  richText?: string;
  // Checkbox
  checked?: boolean;
  checkboxItems?: CheckboxItem[];
  checklistSettings?: ChecklistSettings;
  // Health Bar & Progress Bar
  currentValue?: number;
  maxValue?: number;
  increment?: number;
  // Progress Bar
  showPercentage?: boolean;
  showValues?: boolean;
  allowOutOfRange?: boolean;
  // Dice Roller
  diceCount?: number;
  diceType?: number;
  modifier?: number;
  diceGroups?: DiceGroup[];
  showRollDetails?: boolean;
  showRollDetailsButton?: boolean;
  // Dice Tray
  showTrayRollDetails?: boolean;
  showTrayRollDetailsButton?: boolean;
  // Legacy setting used to initialize details for existing saved widgets.
  showIndividualResults?: boolean;
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
  poolTooltip?: string;
  // Toggle Group
  toggleItems?: ToggleItem[];
  // Table
  columns?: string[];
  rows?: TableRow[];
  tableColumnSettings?: TableColumnSettings[];
  tableRowSettings?: TableRowSettings[];
  showTableEditButton?: boolean;
  // Time Tracker
  timedEffects?: TimedEffect[];
  roundMode?: boolean;
  effectSuggestions?: string[];
  // Rest Button
  buttonText?: string;
  healToFull?: boolean;
  healRandomDice?: DiceGroup[];
  healFlatAmount?: number;
  poolRestores?: PoolRestoreTarget[];
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
  // Grid Map
  gridMapTokens?: GridMapToken[];
  gridMapWalls?: GridMapWall[];
  gridMapGridType?: 'square' | 'hex';
  gridMapGridSize?: number;
  gridMapGridColor?: string;
  gridMapWallColor?: string;
  gridMapWallWidth?: number;
  gridMapDefaultTokenColor?: string;
  gridMapCellDistance?: number;
  gridMapDistanceUnit?: string;
  // Roll Table
  rollTableItems?: RollTableItem[];
  showRollTableItems?: boolean;
  // Deck of Cards
  deckCards?: DeckCard[];
  deckState?: DeckState | null;
  showDeckCards?: boolean;
  // Initiative Tracker
  initiativePool?: InitiativeParticipant[];        // Regular pool of names available to add
  initiativeEncounter?: InitiativeEncounterEntry[]; // Current encounter participants
  initiativeShowRollButton?: boolean;               // Whether to show the Roll Initiative button
  initiativeCurrentIndex?: number;                  // Index of the currently highlighted participant
  initiativeAdvanceTimeTrackers?: boolean;          // Whether to advance Time Tracker widgets on new round
  initiativeAdvanceByRound?: boolean;               // Advance by 1 round (for round-mode Time Trackers)
  initiativeAdvanceTimeAmount?: number;             // Amount of time to advance
  initiativeAdvanceTimeUnit?: string;               // Unit of time (seconds, minutes, hours, etc.)
  // Timer
  timerElapsed?: number;       // Elapsed time in milliseconds
  timerRunning?: boolean;      // Whether the timer is currently running
  timerStartedAt?: number;     // Timestamp when timer was last started (for calculating elapsed while running)
  timerCountDown?: boolean;    // If true, count down from timerDuration
  timerDuration?: number;      // Duration in milliseconds (for countdown mode)
  // Step Dice
  stepDiceItems?: StepDiceItem[];  // Array of step dice traits
  stepDiceChain?: DiceStep[];      // Custom dice chain (default: [1d4,1d6,1d8,1d10,1d12,1d20])
  // Print Settings (per-widget print customization)
  printSettings?: {
    hideValues?: boolean; // For Number Tracker: hide the number values
  };
  // Labels & Formulas (for linking values across widgets)
  fieldLabels?: Record<string, string>;    // Maps field name to variable label name
  fieldFormulas?: Record<string, string>;  // Maps field name to formula string
}

export interface TimedEffect {
  name: string;
  remainingSeconds: number;
  initialSeconds?: number;
}

export interface StepDiceItem {
  name: string;
  currentStep: number;  // Index into the dice chain
  tooltip?: string;
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
  locked?: boolean; // If true, widget cannot be interacted with in play mode
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
