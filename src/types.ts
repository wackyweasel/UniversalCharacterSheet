import type { DiceStep } from './utils/diceExpression';
import type { CustomTheme } from './store/useCustomThemeStore';

export type WidgetType = 
  | 'NUMBER' 
  | 'NUMBER_DISPLAY'
  | 'LABEL'
  | 'LIST' 
  | 'TEXT' 
  | 'CHECKBOX'
  | 'HEALTH_BAR'
  | 'DICE_ROLLER'
  | 'DICE_TRAY'
  | 'SPELL_SLOT'
  | 'IMAGE'
  | 'POOL'
  | 'TOGGLE'
  | 'TOGGLE_GROUP'
  | 'TABLE'
  | 'TIME_TRACKER'
  | 'FORM'
  | 'MIXED_FIELDS'
  | 'REST_BUTTON'
  | 'PROGRESS_BAR'
  | 'PROGRESS_CLOCK'
  | 'MAP_SKETCHER'
  | 'ROLL_TABLE'
  | 'GRID_MAP'
  | 'INITIATIVE_TRACKER'
  | 'INVENTORY'
  | 'DECK'
  | 'DECK_OF_CARDS'
  | 'TIMER'
  | 'STEP_DICE'
  | 'WALLET'
  | 'THRESHOLD_TRACK'
  | 'XP_LEVEL'
  | 'SKILL_TREE'
  | 'DICE_POOL'
  | 'CALENDAR';

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
  description?: string;
  weightLabel?: string;
  weightFormula?: string;
}

export interface DeckCard {
  name: string;
  amount: number;
}

export interface DeckState {
  remaining: string[];
  discarded: string[];
}

export type CardTableBackPattern = 'none' | 'crosshatch' | 'diamonds' | 'stripes' | 'dots';

export interface CardTableBackDesign {
  color?: string;
  textColor?: string;
  symbol?: string;
  text?: string;
  pattern: CardTableBackPattern;
}

export interface CardTableCard {
  id: string;
  title: string;
  symbol: string;
  body: string;
  amount?: number;
  cardGroupId?: string;
  faceUp: boolean;
  originWidgetId?: string;
  originOrder?: number;
  originBackColor?: string;
  originBackTextColor?: string;
  originBackSymbol?: string;
  originBackText?: string;
  originBackPattern?: CardTableBackPattern;
}

export type CardTableRestorePosition = 'top' | 'bottom' | 'random';

export interface CardTableSpot {
  id: string;
  name: string;
  cards: CardTableCard[];
}

export type InventoryFieldType = 'text' | 'number' | 'checkbox' | 'textarea';

export type InventoryFieldValue = string | number | boolean;

export interface InventoryFieldTemplate {
  id: string;
  name: string;
  type: InventoryFieldType;
  defaultValue: InventoryFieldValue;
  reserved?: 'weight';
}

export interface InventoryItemField {
  id: string;
  name: string;
  type: InventoryFieldType;
  value: InventoryFieldValue;
  valueLabel?: string;
  valueFormula?: string;
  reserved?: 'weight';
  templateId?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity?: number;
  /** Rich text (HTML), shown collapsed on the item card. */
  description?: string;
  fields: InventoryItemField[];
}

export interface InventoryEncumbranceSettings {
  enabled: boolean;
  unit: string;
  localCapacity?: number;
  includeInGlobalLoad: boolean;
  showGlobalCounter: boolean;
  globalCapacity?: number;
}

export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  bgColor?: string;
  bgOpacity?: number;
  textColor?: string;
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

export interface TableMerge {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}

export interface TableColumnSettings {
  format?: CellFormat;
  label?: string;
  formula?: string;
  width?: number;
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
  verticalAlignment?: 'top' | 'center';
}

export interface SpellLevel {
  level: number;
  max: number;
  used: number;
}

export interface NumberItem {
  name: string;
  value: number;
  showPositiveSign?: boolean;
  valueLabel?: string;
  valueFormula?: string;
  minValue?: number;
  minValueLabel?: string;
  minValueFormula?: string;
  maxValue?: number;
  maxValueLabel?: string;
  maxValueFormula?: string;
  tooltip?: string;
}

export interface ModifierRange {
  min: number;
  max: number;
  modifier: number;
}

export interface DisplayNumber {
  label: string;
  value: number;
  showPositiveSign?: boolean;
  valueLabel?: string;
  valueFormula?: string;
  minValue?: number;
  minValueLabel?: string;
  minValueFormula?: string;
  maxValue?: number;
  maxValueLabel?: string;
  maxValueFormula?: string;
  secondaryValue?: number;
  secondaryValueLabel?: string;
  secondaryValueFormula?: string;
  tooltip?: string;
}

export interface FormItem {
  name: string;
  value: string;
  valueLabel?: string;
  valueFormula?: string;
  tooltip?: string;
}

export type MixedFieldType = 'text' | 'number' | 'progress' | 'resource' | 'step-dice' | 'menu' | 'switch';

interface MixedFieldBase {
  name: string;
  tooltip?: string;
}

export type MixedField = MixedFieldBase & (
  | { type: 'text'; value: string; valueLabel?: string; valueFormula?: string }
  | { type: 'number'; value: number; showPositiveSign?: boolean; valueLabel?: string; valueFormula?: string; minValue?: number; minValueLabel?: string; minValueFormula?: string; maxValue?: number; maxValueLabel?: string; maxValueFormula?: string; showIncrementButtons?: boolean }
  | { type: 'progress'; current: number; currentLabel?: string; currentFormula?: string; min?: number; minLabel?: string; minFormula?: string; max: number; maxLabel?: string; maxFormula?: string; showPercentage?: boolean; showValues?: boolean; fillColor?: string }
  | { type: 'resource'; current: number; currentLabel?: string; currentFormula?: string; max: number; maxLabel?: string; maxFormula?: string; style: string; showCount?: boolean }
  | { type: 'step-dice'; currentStep: number; diceChain?: DiceStep[] }
  | { type: 'menu'; value: string; options: string[]; valueLabel?: string }
  | { type: 'switch'; value: boolean; valueLabel?: string; valueFormula?: string; toggleColor?: string }
);

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
  diceExpression?: string; // Dice expression (e.g. 2d20kh); takes precedence over diceFaces
  flatBonus: number;   // Flat bonus to add to the roll
  flatBonusLabel?: string;
  flatBonusFormula?: string;
}export interface InitiativeEncounterEntry {
  id: string;          // Unique ID for drag/drop ordering
  name: string;
  diceFaces: number;
  diceExpression?: string;
  flatBonus: number;
  rollResult?: number; // The result of the initiative roll (including bonus)
  isTemporary?: boolean; // True if added on-the-fly (not from pool)
}

export interface ProgressClockItem {
  id: string;
  name: string;
  segments: number;
  value: number;
  segmentsLabel?: string;
  segmentsFormula?: string;
  valueLabel?: string;
  valueFormula?: string;
  fillColor?: string;
}

export interface TrackThreshold {
  id: string;
  name: string;
  /** Track value at which this zone becomes active. */
  value: number;
  valueLabel?: string;
  valueFormula?: string;
  /** Number exposed while this zone is active (e.g. -1 for a wound penalty). */
  modifier?: number;
  color?: string;
}

export interface ExperienceLevel {
  id: string;
  /** Optional title shown with the level (e.g. "Apprentice"). */
  name?: string;
  /** Total XP needed to reach this level. */
  xp: number;
  xpLabel?: string;
  xpFormula?: string;
}

export interface SkillTreeNode {
  id: string;
  name: string;
  description?: string;
  /** Points spent while the skill is unlocked. */
  cost: number;
  /** Ids of the skills that must be unlocked first. */
  requires: string[];
  unlocked: boolean;
  /** Variable label that is 1 while the skill is unlocked and 0 otherwise. */
  unlockedLabel?: string;
}

export interface DicePoolComponent {
  id: string;
  name: string;
  /** Number of dice this trait adds while it is in the pool. */
  dice: number;
  diceLabel?: string;
  diceFormula?: string;
  /** Die size for this trait; the pool's die size is used when empty. */
  faces?: number;
  /** Whether the trait is currently part of the pool. */
  active: boolean;
}

export interface DicePoolTier {
  id: string;
  /** Lowest die result that reaches this tier. */
  min: number;
  label: string;
}

export type CalendarViewId = 'clock' | 'year' | 'month' | 'week' | 'day';

export interface CalendarUnit {
  id: string;
  name: string;
  plural?: string;
  /** How many of the previous (smaller) unit make one of this; ignored for the first unit. */
  count: number;
  /** Number shown for the first one (usually 0 for hours, 1 for days). */
  startAt?: number;
  /** Optional name for each one inside the next unit up (e.g. month names). */
  names?: string[];
  /** Optional length of each one inside the next unit up, overriding `count` (e.g. days per month). */
  lengths?: number[];
  role?: 'day' | 'month' | 'year';
}

export interface CalendarStep {
  id: string;
  amount: number;
  amountFormula?: string;
  /** Unit key: a custom unit id, a Gregorian unit name, or "week". */
  unit: string;
}

export interface CalendarNote {
  id: string;
  /** Time the note happens at, in the calendar's smallest unit. */
  time: number;
  title: string;
  color?: string;
}

export interface WidgetData {
  label?: string;
  value?: number;
  hideWidgetHeader?: boolean;
  hideWidgetEditButton?: boolean;
  showFieldControls?: boolean;
  showNumberItemMax?: boolean;
  showMaxControl?: boolean;
  items?: string[];
  itemCount?: number;
  wrapText?: boolean;
  text?: string;
  richText?: string;
  // Label
  labelAlignment?: 'left' | 'center' | 'right';
  labelTextColor?: string;
  // Checkbox
  checked?: boolean;
  checkboxItems?: CheckboxItem[];
  checklistSettings?: ChecklistSettings;
  // Health Bar & Progress Bar
  currentValue?: number;
  temporaryValue?: number;
  enableTemporaryHp?: boolean;
  minValue?: number;
  maxValue?: number;
  verticalBar?: boolean;
  increment?: number;
  showIncrementButtons?: boolean;
  fillColor?: string;
  // Progress Bar
  showPercentage?: boolean;
  showValues?: boolean;
  inlineLabel?: boolean;
  allowOutOfRange?: boolean;
  clockItems?: ProgressClockItem[];
  clockLayout?: 'horizontal' | 'vertical';
  clockSize?: number;
  clockShowValues?: boolean;
  clockLabelPosition?: 'above' | 'below';
  clockCounterClockwise?: boolean;
  clockStartAngle?: number;
  // Dice Roller
  diceCount?: number;
  diceType?: number;
  modifier?: number;
  diceGroups?: DiceGroup[];
  diceUseExpression?: boolean;
  diceExpression?: string;
  /** Dice widgets: show roll results in a floating dialog over the widget instead of below the controls. */
  diceResultOverlay?: boolean;
  // Dice Tray
  diceButtonScale?: number;
  availableDice?: (number | CustomDie)[];  // Support both standard (number) and custom dice
  // Spell Slot
  spellLevels?: SpellLevel[];
  spellSlotShape?: 'circle' | 'square' | 'diamond';
  spellSlotSize?: number;
  spellSlotHorizontalSpacing?: number;
  spellSlotVerticalSpacing?: number;
  showResetButton?: boolean;
  // Number
  numberItems?: NumberItem[];
  // Number Display
  displayNumbers?: DisplayNumber[];
  displayLayout?: 'horizontal' | 'vertical' | 'auto';
  numberBoxFixedAspectRatio?: boolean;
  numberBoxScale?: number;
  showDisplayNumberMax?: boolean;
  showDisplayNumberLabels?: boolean;
  showSecondaryDisplayNumbers?: boolean;
  secondaryDisplayAutoCompute?: boolean;
  secondaryDisplayModifierRanges?: ModifierRange[];
  // Form, Mixed Fields, Number, Pool, List & Step Dice
  itemColumns?: number;
  // Form, Mixed Fields, Number & Step Dice: wrap long item names instead of truncating
  wrapItemNames?: boolean;
  // Form
  formItems?: FormItem[];
  // Form & Mixed Fields
  labelWidth?: number;
  itemSpacing?: number;
  // Mixed Fields
  mixedFields?: MixedField[];
  mixedFieldsAlignment?: 'left' | 'center' | 'right';
  // Image
  imageUrl?: string;
  imageShape?: 'rectangle' | 'oval' | 'circle';
  imageBorderStyle?: 'none' | 'line' | 'double-line' | 'inset' | 'halo';
  imageFrameThickness?: number;
  imageFrameColor?: string;
  imageEffect?: 'none' | 'grayscale' | 'sepia' | 'vivid' | 'moody';
  hideImageTitle?: boolean;
  imageTitleAlignment?: 'left' | 'center' | 'right';
  imageTitlePosition?: 'above' | 'below';
  imageCropTop?: number;
  imageCropRight?: number;
  imageCropBottom?: number;
  imageCropLeft?: number;
  // Legacy crop settings used to initialize edge crops for existing widgets.
  imageCropX?: number;
  imageCropY?: number;
  imageZoom?: number;
  // Pool
  maxPool?: number;
  currentPool?: number;
  poolStyle?: string;
  showPoolCount?: boolean;
  poolResources?: PoolResource[];
  inlineLabels?: boolean;
  poolTooltip?: string;
  // Toggle
  toggleState?: boolean;
  toggleColor?: string;
  // Toggle Group
  toggleItems?: ToggleItem[];
  // Table
  columns?: string[];
  rows?: TableRow[];
  tableMergedCells?: TableMerge[];
  tableColumnSettings?: TableColumnSettings[];
  tableRowSettings?: TableRowSettings[];
  hideTableHeader?: boolean;
  tableCornerRadius?: boolean;
  showTableEditButton?: boolean;
  showCardCount?: boolean; // Defaults to true for existing card decks.
  hideCardCount?: boolean; // Legacy-compatible inverse accepted when loading saved decks.
  // Time Tracker
  timedEffects?: TimedEffect[];
  roundMode?: boolean;
  effectSuggestions?: string[];
  // Rest Button
  buttonText?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  healToFull?: boolean;
  healRandomDice?: DiceGroup[];
  healDiceExpression?: string;
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
  rollTableAnimate?: boolean;
  rollTableResultCount?: number;
  rollTableAllowRepeats?: boolean;
  // Deck of Cards
  deckCards?: DeckCard[];
  deckState?: DeckState | null;
  showDeckCards?: boolean;
  // Experimental 3D Card Table
  cardTableCards?: CardTableCard[];
  cardTableDiscardedCards?: CardTableCard[];
  cardTableBackColor?: string;
  cardTableBackTextColor?: string;
  cardTableBackSymbol?: string;
  cardTableBackText?: string;
  cardTableBackPattern?: CardTableBackPattern;
  cardTableShowDiscard?: boolean;
  cardTableShowGrabAll?: boolean;
  // Legacy experimental multi-spot data, read as a migration fallback.
  cardTableSpots?: CardTableSpot[];
  // Initiative Tracker
  initiativePool?: InitiativeParticipant[];        // Regular pool of names available to add
  initiativeEncounter?: InitiativeEncounterEntry[]; // Current encounter participants
  initiativeParticipantCardHeight?: number;        // Height of encounter participant cards in pixels
  initiativeShowRollButton?: boolean;               // Whether to show the Roll Initiative button
  initiativeShowTimer?: boolean;                    // Whether to show the active turn timer
  initiativeCurrentIndex?: number;                  // Index of the currently highlighted participant
  initiativeAdvanceTimeTrackers?: boolean;          // Whether to advance Time Tracker widgets on new round
  initiativeAdvanceByRound?: boolean;               // Advance by 1 round (for round-mode Time Trackers)
  initiativeAdvanceTimeAmount?: number;             // Amount of time to advance
  initiativeAdvanceTimeUnit?: string;               // Unit of time (seconds, minutes, hours, etc.)
  // Inventory
  inventoryItems?: InventoryItem[];
  inventoryDefaultFields?: InventoryFieldTemplate[];
  inventoryEncumbrance?: InventoryEncumbranceSettings;
  // Timer
  timerElapsed?: number;       // Elapsed time in milliseconds
  timerRunning?: boolean;      // Whether the timer is currently running
  timerStartedAt?: number;     // Timestamp when timer was last started (for calculating elapsed while running)
  timerCountDown?: boolean;    // If true, count down from timerDuration
  timerDuration?: number;      // Duration in milliseconds (for countdown mode)
  // Step Dice
  stepDiceItems?: StepDiceItem[];  // Array of step dice traits
  stepDiceChain?: DiceStep[];      // Custom dice chain (default: [1d4,1d6,1d8,1d10,1d12,1d20])
  // Wallet
  walletCurrencies?: WalletCurrency[]; // Ordered from smallest to largest
  walletShowTotal?: boolean;
  walletTotalCurrency?: number;        // Index of the currency used for the total (default: largest)
  // Threshold Track (also uses currentValue, minValue, maxValue, increment, showIncrementButtons and fillColor)
  trackThresholds?: TrackThreshold[];
  trackStyle?: 'steps' | 'bar';
  trackThresholdMode?: 'rising' | 'falling'; // Whether zones start at or above, or at or below, their threshold
  trackShowZoneNames?: boolean;
  // XP & Level (currentValue holds the total XP; also uses fillColor)
  xpLevels?: ExperienceLevel[];
  xpFirstLevel?: number;
  xpShowLevelName?: boolean;
  // Skill Tree (currentValue holds the total points to spend; also uses fillColor)
  skillNodes?: SkillTreeNode[];
  skillTreeUsePoints?: boolean;
  skillTreeOrientation?: 'horizontal' | 'vertical' | 'bottom-up';
  // Dice Pool
  dicePoolComponents?: DicePoolComponent[];
  dicePoolFaces?: number;
  dicePoolRule?: 'successes' | 'highest';
  dicePoolTarget?: number;          // Successes rule: lowest die result that counts
  dicePoolOnesCancel?: boolean;     // Successes rule: each 1 removes a success, and a roll of only failures with a 1 is a botch
  dicePoolTiers?: DicePoolTier[];   // Highest rule: outcomes by the best die
  dicePoolCritical?: boolean;       // Highest rule: two or more dice in the top tier
  dicePoolEmptyRoll?: boolean;      // Highest rule: an empty pool rolls two dice and keeps the lowest
  dicePoolBonus?: number;           // Extra (or removed) dice for this roll
  dicePoolShowBonus?: boolean;
  dicePoolShowTarget?: boolean;
  dicePoolClearAfterRoll?: boolean;
  dicePoolButtonText?: string;
  // Calendar & clock
  calendarMode?: 'gregorian' | 'custom';
  calendarTime?: number;                 // Current time, in the smallest unit (Gregorian: seconds since 1970-01-01 UTC)
  calendarUnits?: CalendarUnit[];        // Custom units, smallest first
  calendarWeekdays?: string[];           // Custom week: one name per day of the week (empty = no weeks)
  calendarWeekName?: string;             // Custom name of a week (e.g. "Tenday")
  calendarWeekResetsEachMonth?: boolean; // Custom: every month starts on the first day of the week
  calendarWeekOffset?: number;           // Custom: day of the week of the very first day
  calendarWeekStart?: number;            // Gregorian: 0 = weeks start on Sunday, 1 = Monday
  calendarViews?: CalendarViewId[];      // Enabled views, in display order
  calendarDefaultView?: CalendarViewId;
  calendarDateFormat?: string;
  calendarTimeFormat?: string;
  calendarSteps?: CalendarStep[];        // Quick advance / rewind amounts
  calendarShowRewind?: boolean;
  calendarAdvanceOnRound?: boolean;      // Advance when an Initiative Tracker starts a new round
  calendarRoundAmount?: number;
  calendarRoundUnit?: string;
  calendarSyncEffects?: boolean;         // Also pass time in Temporary Effects widgets
  calendarSecondsPerUnit?: number;       // Custom: how many seconds the smallest unit lasts, for Temporary Effects
  calendarRoundSeconds?: number;         // Length of a round, in seconds, for round-based Temporary Effects
  calendarNotes?: CalendarNote[];
  calendarLabels?: Record<string, string>; // Calendar value key -> variable label
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

export interface WalletCurrency {
  name: string;
  amount: number;
  rate: number; // How many of the previous (smaller) currency make one of this; ignored for the first
}

export interface Widget {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  listColumn?: number; // Persisted column membership for the multi-column list layout
  w?: number; // width
  h?: number; // height
  zIndex?: number;
  groupId?: string; // ID of the group this widget belongs to (for snap+attach)
  attachedTo?: string[]; // IDs of widgets this widget is directly attached to (graph edges)
  locked?: boolean; // If true, widget cannot be interacted with in play mode
  data: WidgetData;
}

export interface Sheet {
  id: string;
  name: string;
  widgets: Widget[];
  cardTableUnhostedCards?: CardTableCard[];
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
  customTheme?: CustomTheme;
  sheets: Sheet[];
  activeSheetId: string;
  // Legacy: widgets array for migration (will be moved to sheets)
  widgets?: Widget[];
}
