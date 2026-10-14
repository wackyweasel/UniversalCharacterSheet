import { describe, expect, it } from 'vitest';
import { resolveInlineDiceExpression, resolveInlineFormulasToText, tokenizeInlineDiceText } from './inlineDice';

describe('inline formulas', () => {
  const labels = { name: 'Aria', str: 3 };

  it('does not treat dice-like text inside string literals as dice', () => {
    expect(tokenizeInlineDiceText('{"2d6 damage"}')).toEqual([
      { type: 'formula', source: '{"2d6 damage"}', expression: '"2d6 damage"' },
    ]);
  });

  it('resolves text and numeric formulas', () => {
    expect(resolveInlineFormulasToText('{@name} the Bold, str {@str + 5}', labels)).toBe('Aria the Bold, str 8');
    expect(resolveInlineFormulasToText('{@name + "!"}', labels)).toBe('Aria!');
  });

  it('leaves dice, invalid and unknown tokens as source text', () => {
    expect(resolveInlineFormulasToText('{1d6} {@missing} {1 +}', labels)).toBe('{1d6} {@missing} {1 +}');
  });

  it('resolves labels and formulas in dice count, faces and keep count', () => {
    const diceLabels = { str: 3, faces: 8, level: 4 };
    expect(tokenizeInlineDiceText('{1d20 + @str + 2d@faces}')[0]).toMatchObject({ type: 'dice' });
    expect(resolveInlineDiceExpression('1d20 + @str + 2d@faces', diceLabels)).toMatchObject({ valid: true, resolvedExpression: '1d20 + 2d8 + 3' });
    expect(resolveInlineDiceExpression('{@level}d6kh{@level - 2}', diceLabels)).toMatchObject({ valid: true, resolvedExpression: '4d6kh2' });
    expect(resolveInlineDiceExpression('3d6kh@str', diceLabels)).toMatchObject({ valid: true, resolvedExpression: '3d6kh3' });
    expect(resolveInlineDiceExpression('1d20 + {@str}d@faces kh2', diceLabels)).toMatchObject({ valid: true, resolvedExpression: '1d20 + 3d8kh2' });
    expect(resolveInlineDiceExpression('2d@missing', diceLabels)).toMatchObject({ valid: false });
    expect(resolveInlineDiceExpression('1d{@str - 3}', diceLabels)).toMatchObject({ valid: false });
    expect(resolveInlineDiceExpression('2d6 * 2', diceLabels)).toMatchObject({ valid: false });
  });

  it('tokenizes nested braces while keeping the {{escape}}', () => {
    expect(tokenizeInlineDiceText('x {2d{@faces}} y')).toEqual([
      { type: 'text', value: 'x ' },
      { type: 'dice', source: '{2d{@faces}}', expression: '2d{@faces}' },
      { type: 'text', value: ' y' },
    ]);
    expect(tokenizeInlineDiceText('{{@level}d6}')).toEqual([
      { type: 'dice', source: '{{@level}d6}', expression: '{@level}d6' },
    ]);
    expect(tokenizeInlineDiceText('{{2d6}}')).toEqual([{ type: 'text', value: '{2d6}' }]);
  });

  it('takes the keep modifier from a text label or formula', () => {
    const keepLabels = { amount: 3, faces: 12, keep: 'kl', mod: 2, keep2: 'dh2', none: '', num: 4 };
    expect(resolveInlineDiceExpression('{@amount}d{@faces}{@keep} + @mod', keepLabels)).toMatchObject({ valid: true, resolvedExpression: '3d12kl + 2' });
    expect(resolveInlineDiceExpression('4d6 @keep2', keepLabels)).toMatchObject({ valid: true, resolvedExpression: '4d6dh2' });
    expect(resolveInlineDiceExpression('4d6{@none}', keepLabels)).toMatchObject({ valid: true, resolvedExpression: '4d6' });
    expect(resolveInlineDiceExpression('4d6{@num}', keepLabels)).toMatchObject({ valid: false });
    expect(resolveInlineDiceExpression('4d6{@missing}', keepLabels)).toMatchObject({ valid: false });
  });

  it('returns text resolutions without dice terms', () => {
    expect(resolveInlineDiceExpression('@name', labels)).toMatchObject({ valid: true, resolvedExpression: 'Aria', terms: [] });
  });
});
