import { describe, expect, it } from 'vitest';
import type { InventoryItem, InventorySlot } from '../types';
import {
  applyInventorySlotPreset,
  fitInventorySlotsHeight,
  getFirstFreeSlot,
  getSlotMaxItems,
  INVENTORY_SLOT_PRESETS,
  isSlotOverCapacity,
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

describe('inventory slot capacity', () => {
  it('defaults to one item and ignores unusable values', () => {
    expect(getSlotMaxItems(undefined)).toBe(1);
    expect(getSlotMaxItems({})).toBe(1);
    expect(getSlotMaxItems({ maxItems: 0 })).toBe(1);
    expect(getSlotMaxItems({ maxItems: 2.9 })).toBe(2);
    expect(getSlotMaxItems({ maxItems: Number.NaN })).toBe(1);
  });

  it('flags a slot holding more items than its maximum', () => {
    const ring = { ...slot('r', 'Ring'), maxItems: 2 };
    expect(isSlotOverCapacity(ring, [item('a', 'r'), item('b', 'r')])).toBe(false);
    expect(isSlotOverCapacity({ ...ring, maxItems: 1 }, [item('a', 'r'), item('b', 'r')])).toBe(true);
  });

  it('finds a slot with room, preferring empty slots', () => {
    const slots = [{ ...slot('r', 'Ring'), maxItems: 2 }, slot('h', 'Head')];
    expect(getFirstFreeSlot(slots, [item('a', 'r')])?.id).toBe('h');
    expect(getFirstFreeSlot(slots, [item('a', 'r'), item('b', 'h')])?.id).toBe('r');
    expect(getFirstFreeSlot(slots, [item('a', 'r'), item('b', 'r'), item('c', 'h')])).toBeUndefined();
  });

  it('keeps a slot capacity and its items when a preset has a slot with the same name', () => {
    const basic = INVENTORY_SLOT_PRESETS.find((preset) => preset.id === 'basic')!;
    const headName = basic.layout[0].name;
    const current = [{ ...slot('s1', headName), maxItems: 2, maxItemsLabel: 'head_max', maxItemsFormula: '@lvl' }];
    const result = applyInventorySlotPreset(basic, current, [item('a', 's1'), item('b', 's1')]);
    const head = result.slots.find((s) => s.name === headName)!;

    expect(head).toMatchObject({ maxItems: 2, maxItemsLabel: 'head_max', maxItemsFormula: '@lvl' });
    expect(result.items.map((i) => i.slotId)).toEqual([head.id, head.id]);
    expect(result.removedCount).toBe(0);
  });
});

describe('fitInventorySlotsHeight', () => {
  const at = (id: string, y: number, h: number): InventorySlot => ({ id, name: id, x: 0, y, w: 30, h });

  it('shrinks the widget to the lowest slot and keeps slot sizes in pixels', () => {
    const result = fitInventorySlotsHeight([at('a', 0, 20), at('b', 20, 20)], 300, 320);
    expect(result).not.toBeNull();
    const { height, slots } = result!;
    expect(height).toBe(130);
    expect(height).toBeLessThan(300);
    slots.forEach((s, i) => {
      expect((s.h / 100) * height).toBeCloseTo(60, 0);
      expect((s.y / 100) * height).toBeCloseTo(i * 60, 0);
      expect(s.y + s.h).toBeLessThanOrEqual(100);
    });
  });

  it('does nothing when the slots already fill the widget', () => {
    expect(fitInventorySlotsHeight([at('a', 0, 100)], 300, 320)).toBeNull();
    expect(fitInventorySlotsHeight([at('a', 2, 96)], 300, 320)).toBeNull();
  });

  it('does nothing without slots and never goes below a minimum height', () => {
    expect(fitInventorySlotsHeight([], 300, 320)).toBeNull();
    expect(fitInventorySlotsHeight([at('a', 0, 6)], 300, 320)?.height).toBe(60);
  });
});
