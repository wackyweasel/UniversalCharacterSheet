import {
  type DiceExpressionTerm,
  formatDiceExpression,
} from './diceExpression';
import { evaluateFormula, evaluateFormulaValue, hasUnresolvedRefs } from './formulaEngine';
import { maskFormulaStringLiterals, type FormulaLabels } from './formulaSyntax';

export type InlineDiceSegment =
  | { type: 'text'; value: string }
  | { type: 'formula'; source: string; expression: string }
  | { type: 'dice'; source: string; expression: string }
  | { type: 'button'; source: string; name: string };

export type ResolvedInlineDiceExpression =
  | {
      valid: true;
      sourceExpression: string;
      resolvedExpression: string;
      terms: DiceExpressionTerm[];
    }
  | {
      valid: false;
      sourceExpression: string;
      reason: string;
    };

interface ExpressionSegment {
  sign: 1 | -1;
  body: string;
}

// A dice quantity is digits, an `@label`, or a `{formula}`; a count before `d` can't be a bare label.
const DICE_QUANTITY = String.raw`(?:\d+|@[a-zA-Z_][a-zA-Z0-9_]*|\{[^{}]*\})`;
const DICE_COUNT = String.raw`(?:\d+|\{[^{}]*\})`;
const DICE_CANDIDATE_PATTERN = new RegExp(String.raw`(?:\b\d+|\{[^{}]*\}|\b)d${DICE_QUANTITY}`, 'i');
const DICE_KEEP_SLOT = String.raw`(?:\{[^{}]*\}|@[a-zA-Z_][a-zA-Z0-9_]*)`;
const EXACT_DICE_PATTERN = new RegExp(String.raw`^(${DICE_COUNT})?\s*d\s*(${DICE_QUANTITY})(?:\s*(?:([kd])([hl])\s*(${DICE_QUANTITY})?|(${DICE_KEEP_SLOT})))?$`, 'i');
const KEEP_TEXT_PATTERN = /^([kd])([hl])(\d*)$/i;
// `{[Name]}` is an event button; formulas can't contain brackets, so it can't clash with them.
const BUTTON_PATTERN = /^\[([^[\]{}]+)\]$/;

/** A button name with its spacing tidied, so `{[ Second  Wind ]}` and `{[Second Wind]}` are the same button. */
export const normalizeInlineButtonName = (name: string) => name.replace(/\s+/g, ' ').trim();

const resolveDiceQuantity = (raw: string | undefined, labels: FormulaLabels): { value: number; reason?: undefined } | { value?: undefined; reason: string } => {
  if (raw === undefined) return { value: 1 };
  if (/^\d+$/.test(raw)) return { value: Number(raw) };
  const formula = raw.startsWith('{') ? raw.slice(1, -1) : raw;
  if (hasUnresolvedRefs(formula, labels)) return { reason: 'Expression contains an unknown label' };
  const value = evaluateFormula(formula, labels);
  if (value === null) return { reason: 'Invalid dice formula' };
  return { value };
};

/** Index of the `}` matching the `{` at `open`, or -1. */
const findClosingBrace = (text: string, open: number): number => {
  let depth = 0;
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === '{') depth += 1;
    else if (text[index] === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
};

const hasDiceCandidate = (expression: string) => DICE_CANDIDATE_PATTERN.test(maskFormulaStringLiterals(expression) ?? expression);

const appendText = (segments: InlineDiceSegment[], value: string) => {
  if (!value) return;
  const previous = segments[segments.length - 1];
  if (previous?.type === 'text') {
    previous.value += value;
  } else {
    segments.push({ type: 'text', value });
  }
};

export const tokenizeInlineDiceText = (text: string): InlineDiceSegment[] => {
  const segments: InlineDiceSegment[] = [];
  let textStart = 0;
  let index = 0;

  while (index < text.length) {
    if (text[index] !== '{') {
      index += 1;
      continue;
    }

    appendText(segments, text.slice(textStart, index));

    if (text[index + 1] === '{') {
      const innerEnd = findClosingBrace(text, index + 1);
      if (innerEnd === -1) {
        appendText(segments, text.slice(index));
        return segments;
      }
      if (text[innerEnd + 1] === '}') {
        appendText(segments, `{${text.slice(index + 2, innerEnd)}}`);
        index = innerEnd + 2;
        textStart = index;
        continue;
      }
    }

    const tokenEnd = findClosingBrace(text, index);
    if (tokenEnd === -1) {
      appendText(segments, text.slice(index));
      return segments;
    }

    const source = text.slice(index, tokenEnd + 1);
    const expression = text.slice(index + 1, tokenEnd).trim();
    const buttonName = normalizeInlineButtonName(BUTTON_PATTERN.exec(expression)?.[1] ?? '');
    if (!expression) {
      appendText(segments, source);
    } else if (buttonName) {
      segments.push({ type: 'button', source, name: buttonName });
    } else if (hasDiceCandidate(expression)) {
      segments.push({ type: 'dice', source, expression });
    } else {
      segments.push({ type: 'formula', source, expression });
    }

    index = tokenEnd + 1;
    textStart = index;
  }

  appendText(segments, text.slice(textStart));
  return segments;
};

const splitTopLevelTerms = (expression: string): ExpressionSegment[] | null => {
  const segments: ExpressionSegment[] = [];
  let depth = 0;
  let segmentStart = 0;
  let pendingSign: 1 | -1 = 1;

  const pushSegment = (end: number) => {
    let body = expression.slice(segmentStart, end).trim();
    if (!body) return false;

    if (body[0] === '+' || body[0] === '-') {
      pendingSign = body[0] === '-' ? -1 : 1;
      body = body.slice(1).trim();
    }
    if (!body) return false;

    segments.push({ sign: pendingSign, body });
    return true;
  };

  for (let index = 0; index < expression.length; index += 1) {
    const char = expression[index];
    if (char === '(' || char === '{') depth += 1;
    if (char === ')' || char === '}') {
      depth -= 1;
      if (depth < 0) return null;
    }

    if (depth === 0 && index > segmentStart && (char === '+' || char === '-')) {
      if (!pushSegment(index)) return null;
      pendingSign = char === '-' ? -1 : 1;
      segmentStart = index + 1;
    }
  }

  if (depth !== 0 || !pushSegment(expression.length)) return null;
  return segments;
};

export const resolveInlineDiceExpression = (
  sourceExpression: string,
  labels: FormulaLabels,
): ResolvedInlineDiceExpression => {
  const expression = sourceExpression.trim();
  if (!hasDiceCandidate(expression)) {
    if (hasUnresolvedRefs(expression, labels)) {
      return { valid: false, sourceExpression, reason: 'Expression contains an unknown label' };
    }

    const value = evaluateFormulaValue(expression, labels);
    if (value === null) {
      return { valid: false, sourceExpression, reason: 'Invalid formula' };
    }
    if (typeof value === 'string') {
      return { valid: true, sourceExpression, resolvedExpression: value, terms: [] };
    }

    const sign = value < 0 ? -1 : 1;
    return {
      valid: true,
      sourceExpression,
      resolvedExpression: String(value),
      terms: [{ type: 'modifier', sign, value: Math.abs(value) }],
    };
  }

  const expressionSegments = splitTopLevelTerms(expression);
  if (!expressionSegments) {
    return { valid: false, sourceExpression, reason: 'Invalid dice expression' };
  }

  const terms: DiceExpressionTerm[] = [];
  const modifierSegments: ExpressionSegment[] = [];

  for (const segment of expressionSegments) {
    const diceMatch = segment.body.match(EXACT_DICE_PATTERN);
    if (diceMatch) {
      const quantities = [diceMatch[1], diceMatch[2], diceMatch[5]].map((raw) => resolveDiceQuantity(raw, labels));
      const failure = quantities.find((quantity) => quantity.reason !== undefined);
      if (failure?.reason) return { valid: false, sourceExpression, reason: failure.reason };
      const [count, faces, keepCount] = quantities.map((quantity) => quantity.value ?? 1);
      if (!Number.isSafeInteger(count) || !Number.isSafeInteger(faces) || count < 1 || faces < 1) {
        return { valid: false, sourceExpression, reason: 'Dice count and faces must be positive integers' };
      }
      let keepSpec = diceMatch[3] ? { action: diceMatch[3], mode: diceMatch[4], count: keepCount } : undefined;
      if (!keepSpec && diceMatch[6]) {
        // A label or formula in the keep slot supplies text such as `kl` or `kh2`.
        const slotFormula = diceMatch[6].startsWith('{') ? diceMatch[6].slice(1, -1) : diceMatch[6];
        if (hasUnresolvedRefs(slotFormula, labels)) {
          return { valid: false, sourceExpression, reason: 'Expression contains an unknown label' };
        }
        const slotValue = evaluateFormulaValue(slotFormula, labels);
        const slotText = slotValue === null ? null : String(slotValue).trim();
        if (slotText === null) return { valid: false, sourceExpression, reason: 'Invalid keep formula' };
        if (slotText !== '') {
          const slotMatch = typeof slotValue === 'string' ? slotText.match(KEEP_TEXT_PATTERN) : null;
          if (!slotMatch) {
            return { valid: false, sourceExpression, reason: 'Keep modifier must resolve to kh, kl, dh or dl, optionally followed by a count' };
          }
          keepSpec = { action: slotMatch[1], mode: slotMatch[2], count: slotMatch[3] ? Number(slotMatch[3]) : 1 };
        }
      }
      if (keepSpec && (!Number.isSafeInteger(keepSpec.count) || keepSpec.count < 1)) {
        return { valid: false, sourceExpression, reason: 'Kept or dropped dice count must be a positive integer' };
      }
      terms.push({
        type: 'dice',
        sign: segment.sign,
        count,
        faces,
        ...(keepSpec ? { keep: { action: keepSpec.action.toLowerCase() === 'k' ? 'keep' as const : 'drop' as const, mode: keepSpec.mode.toLowerCase() === 'h' ? 'high' as const : 'low' as const, count: keepSpec.count } } : {}),
      });
      continue;
    }

    if (DICE_CANDIDATE_PATTERN.test(segment.body)) {
      return { valid: false, sourceExpression, reason: 'Dice can only be added or subtracted' };
    }
    modifierSegments.push(segment);
  }

  if (!terms.some((term) => term.type === 'dice')) {
    return { valid: false, sourceExpression, reason: 'Expression must contain at least one die' };
  }

  if (modifierSegments.length > 0) {
    const modifierFormula = modifierSegments
      .map((segment) => `${segment.sign === -1 ? '-' : '+'}(${segment.body})`)
      .join('');
    if (hasUnresolvedRefs(modifierFormula, labels)) {
      return { valid: false, sourceExpression, reason: 'Expression contains an unknown label' };
    }

    const modifier = evaluateFormula(modifierFormula, labels);
    if (modifier === null) {
      return { valid: false, sourceExpression, reason: 'Invalid modifier formula' };
    }
    if (modifier !== 0) {
      terms.push({ type: 'modifier', sign: modifier < 0 ? -1 : 1, value: Math.abs(modifier) });
    }
  }

  return {
    valid: true,
    sourceExpression,
    resolvedExpression: formatDiceExpression(terms),
    terms,
  };
};

/** Resolves a standalone dice expression field; one pair of wrapping braces is optional. */
export const resolveDiceExpressionField = (
  input: string,
  labels: FormulaLabels,
): { terms: DiceExpressionTerm[]; reason?: undefined } | { terms?: undefined; reason: string } => {
  const trimmed = input.trim();
  const unwrapped = trimmed.startsWith('{') && findClosingBrace(trimmed, 0) === trimmed.length - 1
    ? trimmed.slice(1, -1)
    : trimmed;
  const resolution = resolveInlineDiceExpression(unwrapped, labels);
  if (!resolution.valid) return { reason: resolution.reason };
  if (resolution.terms.length === 0) return { reason: 'Not a dice expression' };
  return { terms: resolution.terms };
};

/** Replaces valid formula tokens with their values; dice, button and invalid tokens stay as source text. */
export const resolveInlineFormulasToText = (text: string, labels: FormulaLabels): string => {
  if (!text.includes('{')) return text;
  return tokenizeInlineDiceText(text).map((segment) => {
    if (segment.type === 'text') return segment.value;
    if (segment.type === 'dice' || segment.type === 'button') return segment.source;
    const resolution = resolveInlineDiceExpression(segment.expression, labels);
    return resolution.valid ? resolution.resolvedExpression : segment.source;
  }).join('');
};