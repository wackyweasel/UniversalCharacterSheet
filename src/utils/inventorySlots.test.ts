import { describe, expect, it } from 'vitest';
import type { InventoryItem, InventorySlot } from '../types';
import {
  applyInventorySlotPreset,
  INVENTORY_SLOT_PRESETS,
  MIN_SLOT_SIZE,
} from './inventorySlots';

const overlaps = (a: Omit<InventorySlot, 'id'>, b: Omit<InventorySlot, 'id'>) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const item = (id: string, slotId?: string): InventoryItem => ({ id, name: id, slotId } as InventoryItem);
const slot = (id: string, name: string): InventorySlot => ({ id, name, x: 0, y: 0, w: 10, h: 10 });

describe('inventory slot presets', () => {
  it('offers five presets ordered from simple to complex', () => {
    expect(INVENTORY_SLOT_PRESETS).toHaveLength(5);
    const counts = INVENTORY_SLOT_PRESETS.map((preset) => preset.layout.length);
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
  });

  INVENTORY_SLOT_PRESETS.forEach((preset) => {
    describe(preset.name, () => {
      it('keeps every slot inside the widget and above the minimum size', () => {
        preset.layout.forEach((s) => {
          expect(s.w).toBeGreaterThanOrEqual(MIN_SLOT_SIZE);
          expect(s.h).toBeGreaterThanOrEqual(MIN_SLOT_SIZE);
          expect(s.x).toBeGreaterThanOrEqual(0);
          expect(s.y).toBeGreaterThanOrEqual(0);
          expect(s.x + s.w).toBeLessThanOrEqual(100.0001);
          expect(s.y + s.h).toBeLessThanOrEqual(100.0001);
        });
      });

      it('has unique names and no overlapping slots', () => {
        const names = preset.layout.map((s) => s.name.toLowerCase());
        expect(new Set(names).size).toBe(names.length);
        preset.layout.forEach((a, i) => {
          preset.layout.slice(i + 1).forEach((b) => expect(overlaps(a, b), `${a.name} / ${b.name}`).toBe(false));
        });
      });
    });
  });
});

describe('applyInventorySlotPreset', () => {
  const basic = INVENTORY_SLOT_PRESETS.find((preset) => preset.id === 'basic')!;
  const current = [slot('s1', 'Head'), slot('s2', 'Cape'), slot('s3', 'Gem')];

  it('moves items to the slot with the same name and gives every slot a fresh id', () => {
    const result = applyInventorySlotPreset(basic, current, [item('helm', 's1')]);
    const head = result.slots.find((s) => s.name === 'Head')!;
    expect(result.items).toEqual([expect.objectContaining({ id: 'helm', slotId: head.id })]);
    expect(result.slots.map((s) => s.id)).not.toContain('s1');
    expect(result.removedCount).toBe(0);
  });

  it('puts items from unmatched slots into free slots and keeps one item per slot', () => {
    const result = applyInventorySlotPreset(basic, current, [item('helm', 's1'), item('cape', 's2'), item('gem', 's3')]);
    const slotIds = result.items.map((i) => i.slotId);
    expect(new Set(slotIds).size).toBe(3);
    expect(result.removedCount).toBe(0);
  });

  it('removes items that no longer fit and reports how many', () => {
    const tiny = { ...basic, layout: basic.layout.slice(0, 1) };
    const result = applyInventorySlotPreset(tiny, current, [item('helm', 's1'), item('cape', 's2')]);
    expect(result.items).toHaveLength(1);
    expect(result.removedCount).toBe(1);
  });

  it('leaves items that are not in a slot untouched', () => {
    const result = applyInventorySlotPreset(basic, current, [item('loose')]);
    expect(result.items).toEqual([expect.objectContaining({ id: 'loose', slotId: undefined })]);
    expect(result.removedCount).toBe(0);
  });
});
