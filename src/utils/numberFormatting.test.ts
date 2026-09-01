import { describe, expect, it } from 'vitest';
import { formatNumberWithSign, hasExplicitPositiveSign } from './numberFormatting';

describe('number formatting', () => {
  it('detects an explicitly typed positive sign', () => {
    expect(hasExplicitPositiveSign('+3')).toBe(true);
    expect(hasExplicitPositiveSign('  +3')).toBe(true);
    expect(hasExplicitPositiveSign('3')).toBe(false);
    expect(hasExplicitPositiveSign('-3')).toBe(false);
  });

  it('formats non-negative values with the persisted positive sign', () => {
    expect(formatNumberWithSign(3, true)).toBe('+3');
    expect(formatNumberWithSign(0, true)).toBe('+0');
    expect(formatNumberWithSign(-3, true)).toBe('-3');
    expect(formatNumberWithSign(3)).toBe('3');
  });
});
