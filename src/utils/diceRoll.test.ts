import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rollDiceExpression } from './diceExpression';
import { rollEventDice } from './diceRoll';
import { rollPhysicalDice } from '../components/DicePhysicsOverlay';
import { useDiceSettingsStore } from '../store/useDiceSettingsStore';

vi.mock('../components/DicePhysicsOverlay', () => ({
  isPhysicalDieSupported: (faces: number) => [2, 4, 6, 8, 10, 12, 20].includes(faces),
  rollPhysicalDice: vi.fn(),
}));

describe('rollEventDice', () => {
  beforeEach(() => {
    vi.mocked(rollPhysicalDice).mockReset();
    useDiceSettingsStore.setState({ threeDDiceEnabled: true });
  });
  afterEach(() => vi.restoreAllMocks());

  it('rolls every die in one expression together on the 3D table', async () => {
    vi.mocked(rollPhysicalDice).mockResolvedValue([6, 1, 5, 2, 4, 3, 6, 1]);

    const roll = await rollEventDice(() => rollDiceExpression('8d6'));

    expect(vi.mocked(rollPhysicalDice).mock.calls).toEqual([
      [Array.from({ length: 8 }, () => ({ faces: 6 }))],
    ]);
    expect(roll?.total).toBe(28);
    expect(roll?.terms[0].rolls).toEqual([6, 1, 5, 2, 4, 3, 6, 1]);
  });

  it('batches mixed terms while preserving keep/drop, percentile and unsupported dice values', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    vi.mocked(rollPhysicalDice).mockResolvedValue([2, 5, 10, 0, 7]);

    const roll = await rollEventDice(() => rollDiceExpression('2d6kh + 1d3 + 1d100 + 1d8'));

    expect(vi.mocked(rollPhysicalDice).mock.calls).toEqual([
      [[{ faces: 6 }, { faces: 6 }, { faces: 10 }, { faces: 100, notation: 'd100' }, { faces: 8 }]],
    ]);
    expect(roll?.terms.map((term) => term.rolls)).toEqual([[2, 5], [2], [100], [7]]);
    expect(roll?.terms[0].droppedIndexes).toEqual([0]);
    expect(roll?.total).toBe(114);
  });

  it('waits for one expression before evaluating the next dependent roll', async () => {
    vi.mocked(rollPhysicalDice).mockResolvedValueOnce([6]).mockResolvedValueOnce([15]);

    const total = await rollEventDice(() => {
      const first = rollDiceExpression('1d6')?.total ?? 0;
      const second = rollDiceExpression(first === 6 ? '1d20' : '1d4')?.total ?? 0;
      return first + second;
    });

    expect(rollPhysicalDice).toHaveBeenCalledTimes(2);
    expect(vi.mocked(rollPhysicalDice).mock.calls).toEqual([[[{ faces: 6 }]], [[{ faces: 20 }]]]);
    expect(total).toBe(21);
  });

  it('keeps random results when the 3D table gives no values', async () => {
    vi.mocked(rollPhysicalDice).mockResolvedValueOnce(null);

    const total = await rollEventDice(() => rollDiceExpression('1d20')?.total ?? 0);

    expect(total).toBeGreaterThanOrEqual(1);
    expect(total).toBeLessThanOrEqual(20);
  });

  it('skips the 3D table when it is turned off', async () => {
    useDiceSettingsStore.setState({ threeDDiceEnabled: false });

    await rollEventDice(() => rollDiceExpression('1d6'));

    expect(rollPhysicalDice).not.toHaveBeenCalled();
  });
});
