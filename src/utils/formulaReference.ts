export type FormulaReferenceCategory = 'Operators' | 'Conditions' | 'Math' | 'Tables';

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
  'Conditions',
  'Math',
  'Tables',
];

export const FORMULA_REFERENCE: FormulaReferenceEntry[] = [
  {
    id: 'labels',
    category: 'Operators',
    label: 'Label reference',
    signature: '@label',
    description: 'Uses the current numeric value of a labelled field. Choose a label in the Labels panel to insert it at the cursor.',
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
    description: 'Compares two values inside an IF condition. Use = for equal and <> for not equal.',
    examples: [
      { formula: 'IF(@hp <= 0, 0, @hp)', explanation: 'Returns 0 when HP is zero or lower.' },
      { formula: 'IF(@state <> 1, 0, 5)', explanation: 'Returns 5 only when State equals 1.' },
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