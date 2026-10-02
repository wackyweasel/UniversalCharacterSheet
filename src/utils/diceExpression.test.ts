import { describe, expect, it } from 'vitest';
import { formatDiceExpression, parseDiceExpression, resolveDiceRolls } from './diceExpression';
import { resolveInlineDiceExpression } from './inlineDice';

describe('keep highest / lowest', () => {
  it('parses and formats kh and kl', () => {
    const terms = parseDiceExpression('2d8kh + 3');
    expect(terms?.[0]).toMatchObject({ type: 'dice', count: 2, faces: 8, keep: { action: 'keep', mode: 'high', count: 1 } });
    expect(formatDiceExpression(parseDiceExpression('2D20KL')!)).toBe('2d20kl');
    expect(formatDiceExpression(parseDiceExpression('4d6kh3 - 1')!)).toBe('4d6kh3 - 1');
    expect(formatDiceExpression(parseDiceExpression('4d6dl + 2d8DH2')!)).toBe('4d6dl + 2d8dh2');
  });

  it('rejects malformed keep modifiers', () => {
    expect(parseDiceExpression('2d8k')).toBeNull();
    expect(parseDiceExpression('2d8kx')).toBeNull();
    expect(parseDiceExpression('2d8kh0')).toBeNull();
  });

  it('drops the discarded rolls from the total', () => {
    const high = resolveDiceRolls({ type: 'dice', sign: 1, count: 3, faces: 6, keep: { action: 'keep', mode: 'high', count: 1 } }, [2, 5, 3]);
    expect(high.signedTotal).toBe(5);
    expect(high.droppedIndexes).toEqual([0, 2]);
    const low = resolveDiceRolls({ type: 'dice', sign: -1, count: 2, faces: 20, keep: { action: 'keep', mode: 'low', count: 1 } }, [12, 7]);
    expect(low.signedTotal).toBe(-7);
    const dropLowest = resolveDiceRolls({ type: 'dice', sign: 1, count: 4, faces: 6, keep: { action: 'drop', mode: 'low', count: 1 } }, [3, 6, 1, 4]);
    expect(dropLowest.signedTotal).toBe(13);
    expect(dropLowest.droppedIndexes).toEqual([2]);
    const dropHighest = resolveDiceRolls({ type: 'dice', sign: 1, count: 3, faces: 6, keep: { action: 'drop', mode: 'high', count: 1 } }, [3, 6, 1]);
    expect(dropHighest.signedTotal).toBe(4);
  });

  it('works in inline tokens', () => {
    const resolution = resolveInlineDiceExpression('2d8kh + @str', { str: 3 });
    expect(resolution).toMatchObject({ valid: true, resolvedExpression: '2d8kh + 3' });
    expect(resolveInlineDiceExpression('3d6kh', {})).toMatchObject({ valid: true, resolvedExpression: '3d6kh' });
    expect(resolveInlineDiceExpression('4d6dl', {})).toMatchObject({ valid: true, resolvedExpression: '4d6dl' });
  });
});
