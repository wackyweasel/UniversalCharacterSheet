import { beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('rolls each die on the 3D table before the run uses the next one', async () => {
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
