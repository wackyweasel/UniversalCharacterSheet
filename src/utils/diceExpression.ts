export type DiceStep = number | string;

export type DiceKeep = { action: 'keep' | 'drop'; mode: 'high' | 'low'; count: number };

export type DiceExpressionTerm =
  | {
      type: 'dice';
      sign: 1 | -1;
      count: number;
      faces: number;
      keep?: DiceKeep;
    }
  | {
      type: 'modifier';
      sign: 1 | -1;
      value: number;
    };

export interface DiceExpressionRollTerm {
  term: DiceExpressionTerm;
  rolls?: number[];
  /** Indexes into `rolls` that were discarded by a keep/drop modifier. */
  droppedIndexes?: number[];
  signedTotal: number;
}

export interface DiceExpressionRollResult {
  expression: string;
  total: number;
  terms: DiceExpressionRollTerm[];
}

/** Builds a dice term's roll outcome, dropping rolls that a keep modifier discards. */
export const resolveDiceRolls = (term: Extract<DiceExpressionTerm, { type: 'dice' }>, rolls: number[]): DiceExpressionRollTerm => {
  const droppedIndexes: number[] = [];
  if (term.keep) {
    const { action, mode, count } = term.keep;
    const order = rolls
      .map((value, index) => ({ value, index }))
      .sort((a, b) => (mode === 'high' ? b.value - a.value : a.value - b.value) || a.index - b.index);
    const discarded = action === 'keep' ? order.slice(count) : order.slice(0, count);
    droppedIndexes.push(...discarded.map((entry) => entry.index).sort((a, b) => a - b));
  }
  const dropped = new Set(droppedIndexes);
  const kept = rolls.reduce((sum, roll, index) => (dropped.has(index) ? sum : sum + roll), 0);
  return {
    term,
    rolls,
    ...(droppedIndexes.length > 0 ? { droppedIndexes } : {}),
    signedTotal: term.sign * kept,
  };
};

export const formatDiceTermBody = (term: Extract<DiceExpressionTerm, { type: 'dice' }>): string => {
  const keep = term.keep ? `${term.keep.action === 'keep' ? 'k' : 'd'}${term.keep.mode === 'high' ? 'h' : 'l'}${term.keep.count > 1 ? term.keep.count : ''}` : '';
  return `${term.count}d${term.faces}${keep}`;
};

/** Formats rolls as `[4, ~2~]`, marking dropped rolls with tildes. */
export const formatDiceRolls = (rollTerm: DiceExpressionRollTerm): string => {
  const dropped = new Set(rollTerm.droppedIndexes ?? []);
  return `[${(rollTerm.rolls ?? []).map((roll, index) => (dropped.has(index) ? `~${roll}~` : String(roll))).join(', ')}]`;
};

const readUnsignedInteger = (input: string, start: number) => {
  let end = start;
  while (end < input.length && /\d/.test(input[end])) end += 1;

  return {
    value: input.slice(start, end),
    end,
  };
};

export const parseDiceExpression = (input: string): DiceExpressionTerm[] | null => {
  const expression = input.trim();
  if (!expression) return null;

  const terms: DiceExpressionTerm[] = [];
  let index = 0;

  while (index < expression.length) {
    while (index < expression.length && /\s/.test(expression[index])) index += 1;
    if (index >= expression.length) break;

    let sign: 1 | -1 = 1;
    const signChar = expression[index];
    if (signChar === '+' || signChar === '-') {
      sign = signChar === '-' ? -1 : 1;
      index += 1;
      while (index < expression.length && /\s/.test(expression[index])) index += 1;
    } else if (terms.length > 0) {
      return null;
    }

    const firstNumber = readUnsignedInteger(expression, index);
    let countText = firstNumber.value;
    index = firstNumber.end;

    if (expression[index]?.toLowerCase() === 'd') {
      index += 1;
      const facesNumber = readUnsignedInteger(expression, index);
      if (!facesNumber.value) return null;

      const count = countText ? Number(countText) : 1;
      const faces = Number(facesNumber.value);
      if (!Number.isSafeInteger(count) || !Number.isSafeInteger(faces) || count < 1 || faces < 1) {
        return null;
      }

      let keep: DiceKeep | undefined;
      let keepEnd = facesNumber.end;
      const actionChar = expression[keepEnd]?.toLowerCase();
      if (actionChar === 'k' || actionChar === 'd') {
        const modeChar = expression[keepEnd + 1]?.toLowerCase();
        if (modeChar !== 'h' && modeChar !== 'l') return null;
        const keepNumber = readUnsignedInteger(expression, keepEnd + 2);
        const keepCount = keepNumber.value ? Number(keepNumber.value) : 1;
        if (!Number.isSafeInteger(keepCount) || keepCount < 1) return null;
        keep = { action: actionChar === 'k' ? 'keep' : 'drop', mode: modeChar === 'h' ? 'high' : 'low', count: keepCount };
        keepEnd = keepNumber.end;
      }

      terms.push({ type: 'dice', sign, count, faces, ...(keep ? { keep } : {}) });
      index = keepEnd;
    } else {
      if (!countText) return null;

      const value = Number(countText);
      if (!Number.isSafeInteger(value) || value < 0) return null;

      terms.push({ type: 'modifier', sign, value });
    }

    while (index < expression.length && /\s/.test(expression[index])) index += 1;
    if (index < expression.length && expression[index] !== '+' && expression[index] !== '-') return null;
  }

  return terms.length > 0 ? terms : null;
};

export const formatDiceExpression = (terms: DiceExpressionTerm[]): string => {
  return terms.map((term, index) => {
    const prefix = index === 0
      ? term.sign === -1 ? '-' : ''
      : term.sign === -1 ? ' - ' : ' + ';
    const body = term.type === 'dice' ? formatDiceTermBody(term) : String(term.value);
    return `${prefix}${body}`;
  }).join('');
};

export const normalizeDiceExpression = (input: string): string | null => {
  const terms = parseDiceExpression(input);
  return terms ? formatDiceExpression(terms) : null;
};

/** Initiative dice: the expression if set, otherwise the legacy single die. */
export const getInitiativeDiceExpression = (entry: { diceFaces: number; diceExpression?: string }): string => (
  entry.diceExpression?.trim() ? entry.diceExpression : `1d${Math.max(1, entry.diceFaces || 20)}`
);

/** Rest button heal dice: the expression if set, otherwise legacy dice groups converted to one. */
export const getHealDiceExpression = (data: {
  healDiceExpression?: string;
  healRandomDice?: Array<{ count: number; faces: number }>;
}): string => {
  if (data.healDiceExpression !== undefined) return data.healDiceExpression;
  return (data.healRandomDice ?? []).map((group) => `${group.count}d${group.faces}`).join(' + ');
};

export const formatDiceStep = (step: DiceStep): string => {
  if (typeof step === 'number') return `1d${step}`;

  return normalizeDiceExpression(step) || step;
};

export const parseDiceStep = (step: DiceStep): DiceExpressionTerm[] | null => {
  return parseDiceExpression(formatDiceStep(step));
};

export const rollDiceExpression = (expression: string): DiceExpressionRollResult | null => {
  const terms = parseDiceExpression(expression);
  if (!terms) return null;

  let total = 0;
  const rollTerms = terms.map((term): DiceExpressionRollTerm => {
    if (term.type === 'modifier') {
      const signedTotal = term.sign * term.value;
      total += signedTotal;
      return { term, signedTotal };
    }

    const rolls = Array.from({ length: term.count }, () => Math.floor(Math.random() * term.faces) + 1);
    const rollTerm = resolveDiceRolls(term, rolls);
    total += rollTerm.signedTotal;
    return rollTerm;
  });

  return {
    expression: formatDiceExpression(terms),
    total,
    terms: rollTerms,
  };
};

export const formatDiceRollDetail = (result: DiceExpressionRollResult): string => {
  const parts = result.terms.map((rollTerm, index) => {
    const sign = rollTerm.term.sign === -1 ? '-' : '+';
    const prefix = index === 0 ? (sign === '-' ? '-' : '') : ` ${sign} `;

    if (rollTerm.term.type === 'modifier') {
      return `${prefix}${rollTerm.term.value}`;
    }

    return `${prefix}${formatDiceRolls(rollTerm)}`;
  });

  return `${result.expression} = ${result.total} (${parts.join('')})`;
};