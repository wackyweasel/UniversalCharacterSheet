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

  it('returns text resolutions without dice terms', () => {
    expect(resolveInlineDiceExpression('@name', labels)).toMatchObject({ valid: true, resolvedExpression: 'Aria', terms: [] });
  });
});
