import {
  type DiceExpressionTerm,
  formatDiceExpression,
} from './diceExpression';
import { evaluateFormula, hasUnresolvedRefs } from './formulaEngine';

export type InlineDiceSegment =
  | { type: 'text'; value: string }
  | { type: 'dice'; source: string; expression: string };

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

const DICE_CANDIDATE_PATTERN = /\b\d*d\d+\b/i;
const EXACT_DICE_PATTERN = /^(\d*)d(\d+)$/i;

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
      const escapedEnd = text.indexOf('}}', index + 2);
      if (escapedEnd === -1) {
        appendText(segments, text.slice(index));
        return segments;
      }
      appendText(segments, `{${text.slice(index + 2, escapedEnd)}}`);
      index = escapedEnd + 2;
      textStart = index;
      continue;
    }

    const tokenEnd = text.indexOf('}', index + 1);
    if (tokenEnd === -1) {
      appendText(segments, text.slice(index));
      return segments;
    }

    const source = text.slice(index, tokenEnd + 1);
    const expression = text.slice(index + 1, tokenEnd).trim();
    if (DICE_CANDIDATE_PATTERN.test(expression)) {
      segments.push({ type: 'dice', source, expression });
    } else {
      appendText(segments, source);
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
    if (char === '(') depth += 1;
    if (char === ')') {
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
  labels: Record<string, number>,
): ResolvedInlineDiceExpression => {
  const expression = sourceExpression.trim();
  const expressionSegments = splitTopLevelTerms(expression);
  if (!expressionSegments) {
    return { valid: false, sourceExpression, reason: 'Invalid dice expression' };
  }

  const terms: DiceExpressionTerm[] = [];
  const modifierSegments: ExpressionSegment[] = [];

  for (const segment of expressionSegments) {
    const compactBody = segment.body.replace(/\s+/g, '');
    const diceMatch = compactBody.match(EXACT_DICE_PATTERN);
    if (diceMatch) {
      const count = diceMatch[1] ? Number(diceMatch[1]) : 1;
      const faces = Number(diceMatch[2]);
      if (!Number.isSafeInteger(count) || !Number.isSafeInteger(faces) || count < 1 || faces < 1) {
        return { valid: false, sourceExpression, reason: 'Dice count and faces must be positive integers' };
      }
      terms.push({ type: 'dice', sign: segment.sign, count, faces });
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