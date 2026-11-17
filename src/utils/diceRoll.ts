import {
  DieValueNeeded,
  type DiceExpressionRollResult,
  type DiceExpressionTerm,
  formatDiceExpression,
  resolveDiceRolls,
  rollRandomDie,
  withDieRoller,
} from './diceExpression';
import { flattenExpressionDice } from './diceResult';
import {
  isPhysicalDieSupported,
  rollPhysicalDice,
  type PhysicalDieRequest,
} from '../components/DicePhysicsOverlay';
import { trackGoatCounterEvent } from './goatCounter';
import { useDiceSettingsStore } from '../store/useDiceSettingsStore';

/** The physical dice that show one die of `faces`; a d100 takes two (units and tens). */
const physicalRequestsForDie = (faces: number): PhysicalDieRequest[] | null => {
  if (faces === 100) return [{ faces: 10 }, { faces: 100, notation: 'd100' as const }];
  return isPhysicalDieSupported(faces) ? [{ faces }] : null;
};

/** The die value that the physical dice from `physicalRequestsForDie` landed on. */
const valueFromPhysicalDice = (faces: number, values: number[]): number => (
  faces === 100 ? ((values[1] % 100) + (values[0] % 10)) || 100 : values[0]
);

const getPhysicalDiceRequests = (terms: DiceExpressionTerm[]): PhysicalDieRequest[] => (
  terms.flatMap((term) => {
    if (term.type !== 'dice') return [];
    return Array.from({ length: term.count }, () => physicalRequestsForDie(term.faces) ?? []).flat();
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

/** Runs `run` with `Math.random` repeating the numbers an earlier attempt got, so a replay makes the same random choices. */
const withReplayedRandom = <T>(numbers: number[], run: () => T): T => {
  const original = Math.random;
  let next = 0;
  Math.random = () => {
    if (next < numbers.length) return numbers[next++];
    const value = original();
    numbers.push(value);
    next += 1;
    return value;
  };
  try {
    return run();
  } finally {
    Math.random = original;
  }
};

/**
 * Rolls each expression's dice together on the 3D table, then replays the synchronous event run
 * with those values. Later expressions wait for earlier results, preserving dependent steps.
 * Dice the table can't show fall back to random results.
 *
 * `onInterrupt` handles any other error that stops the run (such as a question for the player):
 * it returns true to replay the run, which repeats every die and random choice made so far.
 */
export const rollEventDice = async <T>(
  run: () => T,
  onInterrupt?: (error: unknown) => Promise<boolean>,
): Promise<T> => {
  const threeD = useDiceSettingsStore.getState().threeDDiceEnabled;
  if (!threeD && !onInterrupt) return run();

  const values: number[] = [];
  const randoms: number[] = [];
  const attempt = () => (onInterrupt ? withReplayedRandom(randoms, run) : run());
  for (;;) {
    let next = 0;
    try {
      if (!threeD) return attempt();
      return withDieRoller((faces, diceFaces) => {
        if (next < values.length) return values[next++];
        throw new DieValueNeeded(faces, diceFaces);
      }, attempt);
    } catch (error) {
      if (!(error instanceof DieValueNeeded)) {
        if (onInterrupt && await onInterrupt(error)) continue;
        throw error;
      }
      const dice = error.diceFaces.flatMap((faces) => physicalRequestsForDie(faces) ?? []);
      const physicalValues = dice.length > 0 ? await rollPhysicalDice(dice) : null;
      let physicalIndex = 0;
      for (const faces of error.diceFaces) {
        const count = physicalRequestsForDie(faces)?.length ?? 0;
        const rolled = physicalValues?.slice(physicalIndex, physicalIndex + count);
        physicalIndex += count;
        values.push(count > 0 && rolled && rolled.length === count
          ? valueFromPhysicalDice(faces, rolled)
          : rollRandomDie(faces));
      }
    }
  }
};
