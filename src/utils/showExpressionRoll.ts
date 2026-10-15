import type { DiceExpressionRollResult } from './diceExpression';
import { expressionRollToView, type DiceResultOutput } from './diceResult';
import { rerollExpressionDice } from './diceRoll';

interface ShowExpressionRollOptions {
  show: (output: DiceResultOutput) => void;
  title: string;
  subtitle?: string;
  source?: string;
  result: DiceExpressionRollResult;
  /** Flat widget modifier added to the total but not part of the expression. */
  modifier?: number;
  /** Called after dice are rerolled, e.g. to log it. */
  onReroll?: (next: DiceExpressionRollResult, count: number) => void;
  versions?: number[];
  rerollCount?: number;
}

/** Shows an expression roll through `show` with multi-select reroll. */
export const showExpressionRoll = (options: ShowExpressionRollOptions) => {
  const { show, title, subtitle, source, result, modifier = 0, onReroll, versions = [], rerollCount = 0 } = options;
  const view = expressionRollToView(result, title, subtitle, versions);
  view.source = source;
  if (modifier !== 0) {
    view.modifiers = [...(view.modifiers ?? []), `${modifier < 0 ? '−' : '+'}${Math.abs(modifier)}`];
    view.summary = String(result.total + modifier);
  }

  show({
    view,
    reroll: async (indices) => {
      const next = await rerollExpressionDice(result, indices);
      const nextCount = rerollCount + 1;
      const nextVersions = view.dice.map((_, index) => (indices.includes(index) ? nextCount : versions[index] ?? 0));
      onReroll?.(next, indices.length);
      showExpressionRoll({ ...options, result: next, versions: nextVersions, rerollCount: nextCount });
    },
  });
};
