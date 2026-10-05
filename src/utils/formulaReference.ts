export type FormulaReferenceCategory = 'Operators' | 'Text' | 'Conditions' | 'Math' | 'Tables';

export interface FormulaReferenceEntry {
  id: string;
  category: FormulaReferenceCategory;
  label: string;
  signature: string;
  description: string;
  examples: Array<{ formula: string; explanation: string }>;
}

export const FORMULA_REFERENCE_CATEGORIES: FormulaReferenceCategory[] = [
  'Operators',
  'Text',
  'Conditions',
  'Math',
  'Tables',
];

export const FORMULA_REFERENCE: FormulaReferenceEntry[] = [
  {
    id: 'text-values',
    category: 'Text',
    label: 'Text values',
    signature: '"text"  @textLabel',
    description: 'Text in double quotes is a text value. Labels on Form values, Mixed Fields text, Inventory text attributes, Table cells and Menus hold text unless the whole value is a number. Text results can only be used by text fields, and {formula} tokens in any name, title or text.',
    examples: [
      { formula: '"Level " + @level', explanation: 'Joins text and a number into "Level 3".' },
      { formula: 'IF(@hp <= 0, "Down", "Standing")', explanation: 'Chooses between two text results.' },
    ],
  },
  {
    id: 'text-join',
    category: 'Text',
    label: 'Joining text',
    signature: 'a + b',
    description: 'When either side of + is text, the values are joined instead of added. Use round() to control decimals. Text cells are ignored (as 0) by SUM.',
    examples: [
      { formula: '@first + " " + @last', explanation: 'Joins two text labels with a space.' },
      { formula: '@name + " (" + round(@hp / @max_hp * 100) + "%)"', explanation: 'Builds a status line.' },
    ],
  },
  {
    id: 'labels',
    category: 'Operators',
    label: 'Label reference',
    signature: '@label',
    description: 'Uses the current value of a labelled field. Menu labels contain the selected option text and can be compared in IF or SWITCH.',
    examples: [
      { formula: '@strength + 2', explanation: 'Adds 2 to the current Strength value.' },
      { formula: '@current_hp / @max_hp * 100', explanation: 'Converts remaining health to a percentage.' },
    ],
  },
  {
    id: 'arithmetic',
    category: 'Operators',
    label: 'Arithmetic',
    signature: '+  -  *  /',
    description: 'Adds, subtracts, multiplies, or divides numbers. Multiplication and division are evaluated before addition and subtraction.',
    examples: [
      { formula: '@level * 2 + 5', explanation: 'Doubles Level, then adds 5.' },
      { formula: '@total / 2', explanation: 'Divides Total by 2.' },
    ],
  },
  {
    id: 'parentheses',
    category: 'Operators',
    label: 'Parentheses',
    signature: '(expression)',
    description: 'Groups part of a formula so it is calculated first. Parentheses can be nested.',
    examples: [
      { formula: '(@strength + @agility) * 2', explanation: 'Adds the two attributes before multiplying.' },
      { formula: '(@current + 1) / (@maximum + 1)', explanation: 'Groups both sides of the division.' },
    ],
  },
  {
    id: 'comparisons',
    category: 'Conditions',
    label: 'Comparisons',
    signature: '=  <>  <  >  <=  >=',
    description: 'Compares two values inside an IF condition. Use = for equal and <> for not equal. Menu text comparisons are exact and use double quotes.',
    examples: [
      { formula: 'IF(@hp <= 0, 0, @hp)', explanation: 'Returns 0 when HP is zero or lower.' },
      { formula: 'IF(@state <> 1, 0, 5)', explanation: 'Returns 5 only when State equals 1.' },
      { formula: 'IF(@stance = "Defensive", 2, 0)', explanation: 'Returns 2 when the labelled menu is set to Defensive.' },
    ],
  },
  {
    id: 'if',
    category: 'Conditions',
    label: 'IF',
    signature: 'IF(condition, whenTrue, whenFalse)',
    description: 'Chooses between two numeric results based on a comparison. Each result can contain another formula or function.',
    examples: [
      { formula: 'IF(@hp <= 0, 0, @hp)', explanation: 'Prevents a displayed HP value from going below 0.' },
      { formula: 'IF(@level >= 5, @strength + 2, @strength)', explanation: 'Adds a bonus from level 5 onward.' },
      { formula: 'IF(@stance = "", 0, 1)', explanation: 'Checks whether a labelled menu has no selection.' },
    ],
  },
  {
    id: 'switch',
    category: 'Conditions',
    label: 'SWITCH',
    signature: 'SWITCH(value, case, result, ..., default)',
    description: 'Matches a value against one or more cases and returns the corresponding result. The final default is optional, but a default makes unmatched values predictable.',
    examples: [
      { formula: 'SWITCH(@rank, 1, 2, 2, 4, 3, 6, 0)', explanation: 'Maps ranks 1, 2, and 3 to different bonuses, otherwise 0.' },
      { formula: 'SWITCH(@roll, 1..5, 0, 6..10, 1, 2)', explanation: 'Uses inclusive ranges and returns 2 outside them.' },
      { formula: 'SWITCH(@stance, "Defensive", 2, "Aggressive", -1, 0)', explanation: 'Maps exact menu selections to different numeric results.' },
    ],
  },
  {
    id: 'ranges',
    category: 'Conditions',
    label: 'Inclusive range',
    signature: 'low..high',
    description: 'Matches every number between two bounds, including both endpoints. Ranges are supported as SWITCH cases.',
    examples: [
      { formula: 'SWITCH(@roll, 1..5, 0, 6..10, 1, 2)', explanation: 'Returns 0 for rolls 1 through 5 and 1 for rolls 6 through 10.' },
      { formula: 'SWITCH(@score, 10..6, 1, 0)', explanation: 'Range bounds may be written in either order.' },
    ],
  },
  {
    id: 'rounding',
    category: 'Math',
    label: 'Rounding',
    signature: 'floor(x)  ceil(x)  round(x)',
    description: 'Rounds down, rounds up, or rounds to the nearest whole number.',
    examples: [
      { formula: 'floor(@level / 2)', explanation: 'Rounds half the level down.' },
      { formula: 'ceil(@weight / 10)', explanation: 'Rounds partial groups of 10 up.' },
      { formula: 'round(@average)', explanation: 'Rounds Average to the nearest whole number.' },
    ],
  },
  {
    id: 'min-max',
    category: 'Math',
    label: 'Minimum and maximum',
    signature: 'min(a, b, ...)  max(a, b, ...)',
    description: 'Returns the smallest or largest supplied value. These are useful for clamping a result to a limit.',
    examples: [
      { formula: 'max(0, @hp)', explanation: 'Never returns less than 0.' },
      { formula: 'min(@current, @maximum)', explanation: 'Never returns more than Maximum.' },
    ],
  },
  {
    id: 'absolute',
    category: 'Math',
    label: 'Absolute value',
    signature: 'abs(x)',
    description: 'Returns the distance from zero, changing a negative number to positive.',
    examples: [
      { formula: 'abs(@target - @current)', explanation: 'Measures the difference without a negative result.' },
    ],
  },
  {
    id: 'threshold',
    category: 'Tables',
    label: 'THRESHOLD',
    signature: 'THRESHOLD(value, @columnLabel, start?)',
    description: 'Counts how many generated values in a labelled table column the first value has reached. The optional starting value defaults to 0.',
    examples: [
      { formula: 'THRESHOLD(@xp, @xp_threshold, 1)', explanation: 'Starts at 1, then counts reached XP thresholds.' },
    ],
  },
  {
    id: 'value',
    category: 'Tables',
    label: 'VALUE',
    signature: 'VALUE(@columnLabel, index, fallback?)',
    description: 'Reads one generated value from a labelled table column by its 1-based row index. The optional fallback is used when no row matches.',
    examples: [
      { formula: 'VALUE(@xp_threshold, 3, 0)', explanation: 'Reads row 3 from the XP threshold column, or 0 if it is unavailable.' },
      { formula: 'VALUE(@bonus, THRESHOLD(@xp, @xp_threshold), 0)', explanation: 'Uses a calculated threshold as the row index.' },
    ],
  },
  {
    id: 'sum-column',
    category: 'Tables',
    label: 'SUM column',
    signature: 'SUM(@columnLabel)',
    description: 'Adds every generated numeric value in a labelled table column. An empty column sum returns 0.',
    examples: [
      { formula: 'SUM(@treasure)', explanation: 'Adds every row in the Treasure column.' },
    ],
  },
  {
    id: 'sum-rows',
    category: 'Tables',
    label: 'SUM row expression',
    signature: 'SUM(expression with @columns)',
    description: 'Evaluates an expression for each matching table row, then adds the row results together.',
    examples: [
      { formula: 'SUM(@qty * @weight)', explanation: 'Multiplies Quantity by Weight on each row, then totals the products.' },
      { formula: 'SUM(@price * @qty) / 100', explanation: 'Totals price times quantity, then converts the result.' },
    ],
  },
];