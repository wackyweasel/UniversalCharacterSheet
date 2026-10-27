import {
  formatDiceTermBody,
  type DiceExpressionRollResult,
} from './diceExpression';

export type DiceResultDieState = 'plain' | 'hit' | 'best' | 'cancel' | 'dropped';
export type DiceResultKind = 'critical' | 'success' | 'partial' | 'failure' | 'botch' | 'neutral';

export interface DiceResultDie {
  value: string;
  title: string;
  /** Number of faces of the die; picks the chip shape. */
  faces?: number;
  state: DiceResultDieState;
  /** Adds a gap before the die to separate pool groups. */
  groupStart?: boolean;
  /** Reroll number that produced the die; changes replay its pop animation. */
  version?: number;
}

export interface DiceResultView {
  title: string;
  subtitle?: string;
  /** What was rolled (e.g. a die track name), shown above inline results. */
  source?: string;
  dice: DiceResultDie[];
  /** Flat bonuses and penalties that are part of the total but cannot be rerolled. */
  modifiers?: string[];
  summary?: string;
  kind?: DiceResultKind;
  note?: { text: string; tone: 'good' | 'bad' };
  error?: string;
}

export interface DiceResultOutput {
  view: DiceResultView;
  /** Rerolls the dice at these positions; absent when the result cannot be rerolled. */
  reroll?: (indices: number[]) => Promise<void>;
}

export interface DiceResultEntry extends DiceResultOutput {
  widgetId: string;
  /** Shown in the middle of the screen instead of next to a widget, e.g. rolls made by events. */
  centered?: boolean;
  /** For centered results: the screen point to open next to, when the player's own press started the roll. */
  point?: { x: number; y: number };
}

const formatSigned = (sign: 1 | -1, value: number) => `${sign === -1 ? '−' : '+'}${value}`;

export type DiceShape = 'circle' | 'triangle' | 'square' | 'diamond' | 'pentagon' | 'hexagon' | 'heptagon' | 'decagon';

// Faces without an entry (3, 6, 9, 11, 13+) stay square; d100 is a percentile die, so it is round.
const DICE_SHAPES: Record<number, DiceShape> = {
  2: 'circle',
  4: 'triangle',
  5: 'pentagon',
  7: 'heptagon',
  8: 'hexagon',
  10: 'diamond',
  12: 'decagon',
  20: 'hexagon',
  100: 'circle',
};

export const getDiceShape = (faces?: number): DiceShape => (faces === undefined ? 'square' : DICE_SHAPES[faces] ?? 'square');

/** Dice of an expression roll, in term order; chip index N is `flattenExpressionDice(result)[N]`. */
export const flattenExpressionDice = (result: DiceExpressionRollResult) => (
  result.terms.flatMap((rollTerm, termIndex) => (
    (rollTerm.rolls ?? []).map((_, rollIndex) => ({ termIndex, rollIndex }))
  ))
);

export const expressionRollToView = (
  result: DiceExpressionRollResult,
  title: string,
  subtitle?: string,
  versions: number[] = [],
): DiceResultView => {
  const dice: DiceResultDie[] = [];
  const modifiers: string[] = [];

  result.terms.forEach((rollTerm) => {
    if (rollTerm.term.type === 'modifier') {
      modifiers.push(formatSigned(rollTerm.term.sign, rollTerm.term.value));
      return;
    }

    const dropped = new Set(rollTerm.droppedIndexes ?? []);
    const { faces } = rollTerm.term;
    const body = `${rollTerm.term.sign === -1 ? '−' : ''}${formatDiceTermBody(rollTerm.term)}`;
    (rollTerm.rolls ?? []).forEach((roll, rollIndex) => {
      dice.push({
        value: String(roll),
        title: body,
        faces,
        state: dropped.has(rollIndex) ? 'dropped' : 'plain',
        groupStart: rollIndex === 0 && dice.length > 0,
        version: versions[dice.length] ?? 0,
      });
    });
  });

  return {
    title,
    subtitle: subtitle ?? result.expression,
    dice,
    modifiers,
    summary: String(result.total),
    kind: 'neutral',
  };
};
