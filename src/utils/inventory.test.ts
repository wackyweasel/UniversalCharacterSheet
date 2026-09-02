import { describe, expect, it } from 'vitest';
import type { InventoryItem } from '../types';
import {
  getInventoryItemQuantity,
  getInventoryItemWeight,
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