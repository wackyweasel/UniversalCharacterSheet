import {
  type DiceExpressionRollResult,
  type DiceExpressionTerm,
  formatDiceExpression,
  resolveDiceRolls,
} from './diceExpression';
import { flattenExpressionDice } from './diceResult';
import {
  isPhysicalDieSupported,
  rollPhysicalDice,
  type PhysicalDieRequest,
} from '../components/DicePhysicsOverlay';
import { trackGoatCounterEvent } from './goatCounter';

const getPhysicalDiceRequests = (terms: DiceExpressionTerm[]): PhysicalDieRequest[] => (
  terms.flatMap((term) => {
    if (term.type !== 'dice') return [];

    if (term.faces === 100) {
      return Array.from({ length: term.count }, () => [
        { faces: 10 },
        { faces: 100, notation: 'd100' as const },
      ]).flat();
    }

    return isPhysicalDieSupported(term.faces)
      ? Array.from({ length: term.count }, () => ({ faces: term.faces }))
      : [];
  })
);

export const rollDiceTerms = async (terms: DiceExpressionTerm[]): Promise<DiceExpressionRollResult> => {
  const physicalDice = getPhysicalDiceRequests(terms);
  const physicalValues = physicalDice.length > 0
    ? await rollPhysicalDice(physicalDice)
    : await new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 300));
  let physicalValueIndex = 0;
  let total = 0;

  const rollTerms = terms.map((term) => {
    if (term.type === 'modifier') {
      const signedTotal = term.sign * term.value;
      total += signedTotal;
      return { term, signedTotal };
    }

    const usesPhysicalDice = term.faces === 100 || isPhysicalDieSupported(term.faces);
    const rolls = Array.from({ length: term.count }, () => {
      let physicalValue: number | undefined;

      if (term.faces === 100) {
        const units = physicalValues?.[physicalValueIndex];
        const tens = physicalValues?.[physicalValueIndex + 1];
        if (units !== undefined && tens !== undefined) {
          physicalValue = (tens % 100) + (units % 10) || 100;
        }
        physicalValueIndex += 2;
      } else if (usesPhysicalDice) {
        physicalValue = physicalValues?.[physicalValueIndex];
        physicalValueIndex += 1;
      }

      return physicalValue ?? Math.floor(Math.random() * term.faces) + 1;
    });
    const rollTerm = resolveDiceRolls(term, rolls);
    total += rollTerm.signedTotal;
    return rollTerm;
  });

  if (terms.some((term) => term.type === 'dice')) {
    trackGoatCounterEvent('roll-dice');
  }

  return {
    expression: formatDiceExpression(terms),
    total,
    terms: rollTerms,
  };
};

/** Rerolls the dice at these `flattenExpressionDice` positions and re-applies keep/drop. */
export const rerollExpressionDice = async (
  result: DiceExpressionRollResult,
  indices: number[],
): Promise<DiceExpressionRollResult> => {
  const flat = flattenExpressionDice(result);
  const positionsByTerm = new Map<number, number[]>();
  indices.forEach((index) => {
    const position = flat[index];
    if (!position) return;
    positionsByTerm.set(position.termIndex, [...(positionsByTerm.get(position.termIndex) ?? []), position.rollIndex]);
  });
  const targets = [...positionsByTerm.entries()];
  if (targets.length === 0) return result;

  const rolled = await rollDiceTerms(targets.map(([termIndex, positions]) => {
    const term = result.terms[termIndex].term as Extract<DiceExpressionTerm, { type: 'dice' }>;
    return { type: 'dice', sign: 1, count: positions.length, faces: term.faces } as const;
  }));

  const terms = result.terms.map((rollTerm, termIndex) => {
    const positions = positionsByTerm.get(termIndex);
    if (!positions || rollTerm.term.type !== 'dice') return rollTerm;
    const targetIndex = targets.findIndex(([target]) => target === termIndex);
    const values = rolled.terms[targetIndex]?.rolls ?? [];
    const rolls = [...(rollTerm.rolls ?? [])];
    positions.forEach((position, k) => {
      if (values[k] !== undefined) rolls[position] = values[k];
    });
    return resolveDiceRolls(rollTerm.term, rolls);
  });

  return { ...result, total: terms.reduce((sum, rollTerm) => sum + rollTerm.signedTotal, 0), terms };
};