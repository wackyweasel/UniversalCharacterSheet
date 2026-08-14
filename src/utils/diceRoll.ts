import {
  type DiceExpressionRollResult,
  type DiceExpressionTerm,
  formatDiceExpression,
} from './diceExpression';
import {
  isPhysicalDieSupported,
  rollPhysicalDice,
  type PhysicalDieRequest,
} from '../components/DicePhysicsOverlay';

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