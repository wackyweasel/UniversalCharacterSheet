import { describe, expect, it } from 'vitest';
import type { Character, InventoryItem } from '../types';
import {
  canMoveInventoryItemBetween,
  getCharacterGlobalInventoryLoad,
  getDefaultCompendiumData,
  getInventoryItemQuantity,
  getInventoryItemWeight,
  getInventoryLoad,
  isInventoryWidgetType,
  moveInventoryItemBetweenLists,
  moveInventoryItemToSlot,
  normalizeInventoryQuantity,
  splitInventoryItem,
} from './inventory';

function createItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'item-1',
    name: 'Arrow',
    fields: [
      { id: 'weight-1', name: 'Weight', type: 'number', value: 0.1, reserved: 'weight' },
    ],
    ...overrides,
  };
}

describe('inventory quantities', () => {
  it('leaves missing quantities disabled for legacy items', () => {
    expect(getInventoryItemQuantity(createItem())).toBeUndefined();
    expect(getInventoryItemWeight(createItem())).toBe(0.1);
  });

  it('normalizes enabled quantities to non-negative whole numbers', () => {
    expect(normalizeInventoryQuantity(10.8)).toBe(10);
    expect(normalizeInventoryQuantity(-2)).toBe(0);
    expect(getInventoryItemQuantity(createItem({ quantity: 10.8 }))).toBe(10);
  });

  it('multiplies weight by quantity, including zero', () => {
    expect(getInventoryItemWeight(createItem({ quantity: 10 }))).toBe(1);
    expect(getInventoryItemWeight(createItem({ quantity: 0 }))).toBe(0);
  });

  it('includes negative item weights in item and inventory load calculations', () => {
    const negativeItem = createItem({
      quantity: 3,
      fields: [{ id: 'weight-2', name: 'Weight', type: 'number', value: -2, reserved: 'weight' }],
    });

    expect(getInventoryItemWeight(negativeItem)).toBe(-6);
    expect(getInventoryLoad([negativeItem, createItem({
      fields: [{ id: 'weight-3', name: 'Weight', type: 'number', value: 5, reserved: 'weight' }],
    })])).toBe(-1);
  });

  it('splits a stack into two cloned items while preserving the total', () => {
    const result = splitInventoryItem(createItem({ quantity: 10 }), 7, 3);

    expect(result?.map((item) => item.quantity)).toEqual([7, 3]);
    expect(result?.[1].id).not.toBe('item-1');
    expect(result?.[1].fields[0].id).not.toBe('weight-1');
  });

  it('rejects invalid stack splits', () => {
    expect(splitInventoryItem(createItem({ quantity: 10 }), 10, 0)).toBeNull();
    expect(splitInventoryItem(createItem({ quantity: 10 }), 6, 3)).toBeNull();
    expect(splitInventoryItem(createItem(), 1, 1)).toBeNull();
  });
});

describe('inventory slots', () => {
  const sword = () => createItem({ id: 'sword', name: 'Sword' });
  const shield = () => createItem({ id: 'shield', name: 'Shield' });
  const rope = () => createItem({ id: 'rope', name: 'Rope' });

  it('equips an item from a list into an empty slot', () => {
    const list = [rope(), sword()];
    const slots: InventoryItem[] = [];
    const result = moveInventoryItemToSlot(list, slots, 'sword', 'head', false, true);

    expect(result?.sourceItems.map((item) => item.id)).toEqual(['rope']);
    expect(result?.targetItems.map((item) => [item.id, item.slotId])).toEqual([['sword', 'head']]);
  });

  it('swaps with the occupant and puts it back at the dragged item position', () => {
    const list = [rope(), sword(), createItem({ id: 'torch', name: 'Torch' })];
    const slots = [{ ...shield(), slotId: 'head' }];
    const result = moveInventoryItemToSlot(list, slots, 'sword', 'head', false, true);

    expect(result?.sourceItems.map((item) => item.id)).toEqual(['rope', 'shield', 'torch']);
    expect(result?.sourceItems[1].slotId).toBeUndefined();
    expect(result?.targetItems.map((item) => [item.id, item.slotId])).toEqual([['sword', 'head']]);
  });

  it('moves within the same slots widget and swaps slots with the occupant', () => {
    const items = [{ ...sword(), slotId: 'left' }, { ...shield(), slotId: 'right' }];
    const moved = moveInventoryItemToSlot(items, items, 'sword', 'free', true, true);
    expect(moved?.targetItems.map((item) => [item.id, item.slotId])).toEqual([['sword', 'free'], ['shield', 'right']]);

    const swapped = moveInventoryItemToSlot(items, items, 'sword', 'right', true, true);
    expect(swapped?.targetItems.map((item) => [item.id, item.slotId])).toEqual([['sword', 'right'], ['shield', 'left']]);
  });

  it('ignores a drop on the slot the item already occupies', () => {
    const items = [{ ...sword(), slotId: 'left' }];
    expect(moveInventoryItemToSlot(items, items, 'sword', 'left', true, true)).toBeNull();
  });

  it('strips the slot when an item returns to a list', () => {
    const slots = [{ ...sword(), slotId: 'left' }];
    const result = moveInventoryItemBetweenLists(slots, [rope()], 'sword', 0, false);

    expect(result?.targetItems.map((item) => item.id)).toEqual(['sword', 'rope']);
    expect(result?.targetItems[0].slotId).toBeUndefined();
  });

  it('counts slot widgets in the global load', () => {
    const encumbrance = { enabled: true, unit: 'kg', includeInGlobalLoad: true, showGlobalCounter: false };
    const widget = (type: 'INVENTORY' | 'INVENTORY_SLOTS', id: string) => ({
      id,
      type,
      x: 0,
      y: 0,
      data: { inventoryItems: [createItem({ id: `${id}-item`, fields: [
        { id: `${id}-weight`, name: 'Weight', type: 'number' as const, value: 2, reserved: 'weight' as const },
      ] })], inventoryEncumbrance: encumbrance },
    });
    const character = {
      sheets: [{ widgets: [widget('INVENTORY', 'list'), widget('INVENTORY_SLOTS', 'slots')] }],
    } as unknown as Character;

    expect(getCharacterGlobalInventoryLoad(character)).toBe(4);
  });
});

describe('compendium', () => {
  it('starts without weight or encumbrance data', () => {
    const data = getDefaultCompendiumData();
    expect(data.inventoryItems).toEqual([]);
    expect(data.inventoryDefaultFields?.some((field) => field.reserved === 'weight')).toBe(false);
    expect('inventoryEncumbrance' in data).toBe(false);
  });

  it('is an inventory-style widget that only exchanges entries with other compendiums', () => {
    expect(isInventoryWidgetType('COMPENDIUM')).toBe(true);
    expect(canMoveInventoryItemBetween('COMPENDIUM', 'COMPENDIUM')).toBe(true);
    expect(canMoveInventoryItemBetween('INVENTORY', 'INVENTORY_SLOTS')).toBe(true);
    expect(canMoveInventoryItemBetween('COMPENDIUM', 'INVENTORY')).toBe(false);
    expect(canMoveInventoryItemBetween('INVENTORY_SLOTS', 'COMPENDIUM')).toBe(false);
  });
});