import { describe, expect, it } from 'vitest';
import { applyHealthDamage, applyHealthHealing } from './healthBar';

describe('health bar values', () => {
  it('absorbs damage with temporary hit points first', () => {
    expect(applyHealthDamage(10, 5, 3)).toEqual({
      currentValue: 10,
      temporaryValue: 2,
    });
  });

  it('passes damage through to regular health after temporary hit points are depleted', () => {
    expect(applyHealthDamage(10, 2, 5)).toEqual({
      currentValue: 7,
      temporaryValue: 0,
    });
  });

  it('does not allow either pool to become negative', () => {
    expect(applyHealthDamage(4, 0, 20)).toEqual({
      currentValue: 0,
      temporaryValue: 0,
    });
  });

  it('does not move healing overflow to temporary HP by default', () => {
    expect(applyHealthHealing(8, 2, 10, 5)).toEqual({
      currentValue: 10,
      temporaryValue: 2,
    });
  });

  it('moves only healing overflow to temporary HP when enabled', () => {
    expect(applyHealthHealing(8, 2, 10, 5, true)).toEqual({
      currentValue: 10,
      temporaryValue: 5,
    });
  });
});
