import { describe, expect, it } from 'vitest';
import type { Character, InventoryItem } from '../types';
import {
  adaptInventoryItem,
  fromCodexItem,
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
  toCodexItem,
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
    const result = moveInventoryItemToSlot(list, slots, 'sword', 'head');

    expect(result?.sourceItems.map((item) => item.id)).toEqual(['rope']);
    expect(result?.targetItems.map((item) => [item.id, item.slotId])).toEqual([['sword', 'head']]);
  });

  it('swaps with the occupant and puts it back at the dragged item position', () => {
    const list = [rope(), sword(), createItem({ id: 'torch', name: 'Torch' })];
    const slots = [{ ...shield(), slotId: 'head' }];
    const result = moveInventoryItemToSlot(list, slots, 'sword', 'head');

    expect(result?.sourceItems.map((item) => item.id)).toEqual(['rope', 'shield', 'torch']);
    expect(result?.sourceItems[1].slotId).toBeUndefined();
    expect(result?.targetItems.map((item) => [item.id, item.slotId])).toEqual([['sword', 'head']]);
  });

  it('moves within the same slots widget and swaps slots with the occupant', () => {
    const items = [{ ...sword(), slotId: 'left' }, { ...shield(), slotId: 'right' }];
    const moved = moveInventoryItemToSlot(items, items, 'sword', 'free');
    expect(moved?.targetItems.map((item) => [item.id, item.slotId])).toEqual([['sword', 'free'], ['shield', 'right']]);

    const swapped = moveInventoryItemToSlot(items, items, 'sword', 'right');
    expect(swapped?.targetItems.map((item) => [item.id, item.slotId])).toEqual([['sword', 'right'], ['shield', 'left']]);
  });

  it('ignores a drop on the slot the item already occupies', () => {
    const items = [{ ...sword(), slotId: 'left' }];
    expect(moveInventoryItemToSlot(items, items, 'sword', 'left')).toBeNull();
  });

  it('adds to a slot with room instead of swapping', () => {
    const list = [rope(), sword()];
    const slots = [{ ...shield(), slotId: 'ring' }];
    const result = moveInventoryItemToSlot(list, slots, 'sword', 'ring', undefined, undefined, 2);

    expect(result?.sourceItems.map((item) => item.id)).toEqual(['rope']);
    expect(result?.targetItems.map((item) => [item.id, item.slotId])).toEqual([['shield', 'ring'], ['sword', 'ring']]);
  });

  it('swaps with the last item once a larger slot is full', () => {
    const list = [rope(), sword()];
    const ring = (id: string) => createItem({ id, name: id, slotId: 'ring' });
    const result = moveInventoryItemToSlot(list, [ring('a'), ring('b')], 'sword', 'ring', undefined, undefined, 2);

    expect(result?.sourceItems.map((item) => item.id)).toEqual(['rope', 'b']);
    expect(result?.targetItems.map((item) => [item.id, item.slotId])).toEqual([['a', 'ring'], ['sword', 'ring']]);
  });

  it('strips the slot when an item returns to a list', () => {
    const slots = [{ ...sword(), slotId: 'left' }];
    const result = moveInventoryItemBetweenLists(slots, [rope()], 'sword', 0);

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

  it('is an inventory-style widget', () => {
    expect(isInventoryWidgetType('COMPENDIUM')).toBe(true);
  });
});

describe('moving items between inventories, equipment and codex', () => {
  const list = { type: 'INVENTORY' as const, tracksWeight: true };
  const slots = { type: 'INVENTORY_SLOTS' as const, tracksWeight: true };
  const codex = { type: 'COMPENDIUM' as const, tracksWeight: false };
  const arrows = () => createItem({ id: 'arrows', name: 'Arrows', quantity: 20 });

  it('turns quantity and weight into plain attributes in a codex', () => {
    const entry = toCodexItem(arrows());

    expect(entry.quantity).toBeUndefined();
    expect(entry.fields.map((field) => [field.name, field.value, field.reserved])).toEqual([
      ['Weight', 0.1, undefined],
      ['Quantity', 20, undefined],
    ]);
  });

  it('leaves items without quantity or reserved fields untouched', () => {
    const plain = createItem({ fields: [{ id: 'f', name: 'Damage', type: 'text', value: '1d6' }] });
    expect(toCodexItem(plain)).toBe(plain);
  });

  it('restores the quantity attribute as a real quantity', () => {
    const restored = fromCodexItem(toCodexItem(arrows()));

    expect(restored.quantity).toBe(20);
    expect(restored.fields.map((field) => field.name)).toEqual(['Weight']);
  });

  it('keeps an existing quantity and ignores unusable quantity attributes', () => {
    const withQuantity = createItem({ quantity: 3, fields: [{ id: 'q', name: 'Quantity', type: 'number', value: 9 }] });
    expect(fromCodexItem(withQuantity)).toBe(withQuantity);
    const blank = createItem({ fields: [{ id: 'q', name: 'Quantity', type: 'number', value: '' }] });
    expect(fromCodexItem(blank)).toBe(blank);
  });

  it('re-reserves the weight when an entry lands in a widget that tracks encumbrance', () => {
    const adapted = adaptInventoryItem(toCodexItem(arrows()), codex, list);

    expect(adapted.quantity).toBe(20);
    expect(adapted.fields.find((field) => field.name === 'Weight')?.reserved).toBe('weight');
    expect(getInventoryItemWeight(adapted)).toBeCloseTo(2);
  });

  it('keeps weight as a plain attribute when the target does not track encumbrance', () => {
    const adapted = adaptInventoryItem(arrows(), list, { type: 'INVENTORY', tracksWeight: false });

    expect(adapted.quantity).toBe(20);
    expect(adapted.fields[0].reserved).toBe('weight');
  });

  it('moves items from a list into a codex and back', () => {
    const into = moveInventoryItemBetweenLists([arrows()], [], 'arrows', 0, (item) => adaptInventoryItem(item, list, codex));
    expect(into?.targetItems[0].quantity).toBeUndefined();
    expect(into?.targetItems[0].fields.some((field) => field.name === 'Quantity' && field.value === 20)).toBe(true);

    const back = moveInventoryItemBetweenLists(into!.targetItems, [], 'arrows', 0, (item) => adaptInventoryItem(item, codex, list));
    expect(back?.targetItems[0].quantity).toBe(20);
    expect(back?.targetItems[0].fields.map((field) => field.name)).toEqual(['Weight']);
  });

  it('swaps a codex entry with an equipped item, converting both', () => {
    const entry = toCodexItem(createItem({ id: 'entry', name: 'Entry', quantity: 2 }));
    const equipped = [{ ...arrows(), slotId: 'head' }];
    const result = moveInventoryItemToSlot(
      [entry],
      equipped,
      'entry',
      'head',
      (item) => adaptInventoryItem(item, slots, codex),
      (item) => adaptInventoryItem(item, codex, slots),
    );

    const equippedEntry = result?.targetItems.find((item) => item.id === 'entry');
    expect(equippedEntry?.quantity).toBe(2);
    expect(equippedEntry?.slotId).toBe('head');
    const returned = result?.sourceItems.find((item) => item.id === 'arrows');
    expect(returned?.quantity).toBeUndefined();
    expect(returned?.fields.some((field) => field.name === 'Quantity' && field.value === 20)).toBe(true);
  });
});