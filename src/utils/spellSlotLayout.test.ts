import { describe, expect, it } from 'vitest';
import { getSpellSlotLayout, SPELL_SLOT_MAX_SIZE, SPELL_SLOT_MIN_SIZE } from './spellSlotLayout';

describe('getSpellSlotLayout', () => {
  it('uses the largest slot size when there is plenty of room', () => {
    const layout = getSpellSlotLayout([4], 400, 400, 4, 4);
    expect(layout.slotSize).toBe(SPELL_SLOT_MAX_SIZE);
    expect(layout.columns).toEqual([4]);
  });

  it('shrinks slots so all rows fit the height', () => {
    const layout = getSpellSlotLayout([4, 3, 2], 300, 60, 4, 4);
    const rows = layout.columns.map((columns, index) => Math.ceil([4, 3, 2][index] / columns));
    const totalHeight = rows.reduce((sum, count) => sum + count * layout.slotSize + (count - 1) * 4, 0) + 2 * 4;
    expect(totalHeight).toBeLessThanOrEqual(60);
    expect(layout.slotSize).toBeLessThan(SPELL_SLOT_MAX_SIZE);
  });

  it('adds columns when the width is too narrow for one row', () => {
    const layout = getSpellSlotLayout([8], 120, 400, 4, 4);
    expect(layout.slotSize).toBe(SPELL_SLOT_MAX_SIZE);
    expect(layout.columns).toEqual([2]);
  });

  it('never goes below the minimum slot size', () => {
    const layout = getSpellSlotLayout([10, 10, 10, 10], 40, 10, 4, 4);
    expect(layout.slotSize).toBe(SPELL_SLOT_MIN_SIZE);
    expect(layout.columns.every((columns) => columns >= 1)).toBe(true);
  });
});
