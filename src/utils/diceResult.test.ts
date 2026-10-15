import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseDiceExpression, resolveDiceRolls, type DiceExpressionRollResult, type DiceExpressionTerm } from './diceExpression';
import { expressionRollToView, flattenExpressionDice, getDiceShape } from './diceResult';

vi.mock('../components/DicePhysicsOverlay', () => ({
  isPhysicalDieSupported: () => false,
  rollPhysicalDice: async () => [],
}));

const buildResult = (expression: string, rolls: number[][]): DiceExpressionRollResult => {
  const terms = parseDiceExpression(expression) as DiceExpressionTerm[];
  let diceIndex = 0;
  const rollTerms = terms.map((term) => {
    if (term.type === 'modifier') return { term, signedTotal: term.sign * term.value };
    return resolveDiceRolls(term, rolls[diceIndex++]);
  });
  return { expression, total: rollTerms.reduce((sum, rollTerm) => sum + rollTerm.signedTotal, 0), terms: rollTerms };
};

describe('expressionRollToView', () => {
  it('lists dice per term, marks dropped dice and collects modifiers', () => {
    const view = expressionRollToView(buildResult('2d20kh + 1d6 - 2', [[5, 17], [3]]), 'Attack');

    expect(view.dice.map((die) => die.value)).toEqual(['5', '17', '3']);
    expect(view.dice.map((die) => die.state)).toEqual(['dropped', 'plain', 'plain']);
    expect(view.dice.map((die) => die.groupStart)).toEqual([false, false, true]);
    expect(view.modifiers).toEqual(['−2']);
    expect(view.summary).toBe('18');
  });

  it('keeps chip order aligned with flattenExpressionDice', () => {
    const result = buildResult('2d6 + 3 + 1d8', [[1, 2], [7]]);

    expect(flattenExpressionDice(result)).toEqual([
      { termIndex: 0, rollIndex: 0 },
      { termIndex: 0, rollIndex: 1 },
      { termIndex: 2, rollIndex: 0 },
    ]);
  });
});

describe('getDiceShape', () => {
  it('maps face counts to shapes and defaults to square', () => {
    expect([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20, 21, 100].map(getDiceShape)).toEqual([
      'circle', 'square', 'triangle', 'pentagon', 'square', 'heptagon', 'hexagon', 'square',
      'diamond', 'square', 'decagon', 'square', 'hexagon', 'square', 'circle',
    ]);
    expect(getDiceShape(undefined)).toBe('square');
  });

  it('carries the face count onto expression dice', () => {
    const view = expressionRollToView(buildResult('1d20 + 1d6', [[12], [3]]), 'Attack');

    expect(view.dice.map((die) => die.faces)).toEqual([20, 6]);
  });
});

describe('rerollExpressionDice', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { setTimeout: (callback: () => void) => setTimeout(callback, 0) });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('rerolls only the selected dice and re-applies keep/drop', async () => {
    const { rerollExpressionDice } = await import('./diceRoll');
    const result = buildResult('2d20kh', [[5, 17]]);
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const next = await rerollExpressionDice(result, [1]);

    expect(next.terms[0].rolls).toEqual([5, 20]);
    expect(next.total).toBe(20);
    expect(next.terms[0].droppedIndexes).toEqual([0]);
  });

  it('returns the same result when nothing valid is selected', async () => {
    const { rerollExpressionDice } = await import('./diceRoll');
    const result = buildResult('1d6', [[4]]);

    expect(await rerollExpressionDice(result, [9])).toBe(result);
  });
});
