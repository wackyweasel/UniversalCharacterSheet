export type DiceStep = number | string;

export type DiceExpressionTerm =
  | {
      type: 'dice';
      sign: 1 | -1;
      count: number;
      faces: number;
    }
  | {
      type: 'modifier';
      sign: 1 | -1;
      value: number;
    };

export interface DiceExpressionRollTerm {
  term: DiceExpressionTerm;
  rolls?: number[];
  signedTotal: number;
}

export interface DiceExpressionRollResult {
  expression: string;
  total: number;
  terms: DiceExpressionRollTerm[];
}

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

      terms.push({ type: 'dice', sign, count, faces });
      index = facesNumber.end;
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
    const body = term.type === 'dice' ? `${term.count}d${term.faces}` : String(term.value);
    return `${prefix}${body}`;
  }).join('');
};

export const normalizeDiceExpression = (input: string): string | null => {
  const terms = parseDiceExpression(input);
  return terms ? formatDiceExpression(terms) : null;
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
    const signedTotal = term.sign * rolls.reduce((sum, roll) => sum + roll, 0);
    total += signedTotal;
    return { term, rolls, signedTotal };
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

    return `${prefix}[${rollTerm.rolls?.join(', ') || ''}]`;
  });

  return `${result.expression} = ${result.total} (${parts.join('')})`;
};