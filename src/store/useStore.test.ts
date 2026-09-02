import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Character } from '../types';
import { useStore } from './useStore';
import { useUndoStore } from './useUndoStore';

vi.hoisted(() => {
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem: () => undefined,
  });
  vi.stubGlobal('window', {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({}));
});

const character: Character = {
  id: 'character-1',
  name: 'Test Character',
  activeSheetId: 'sheet-1',
  sheets: [{
    id: 'sheet-1',
    name: 'Main',
    widgets: [
      {
        id: 'inventory-1',
        type: 'INVENTORY',
        x: 0,
        y: 0,
        data: {
          inventoryItems: [{
            id: 'item-1',
            name: 'Shield',
            fields: [{
              id: 'armor-1',
              name: 'Armor',
              type: 'number',
              value: 1,
              valueLabel: 'armor',
            }],
          }],
        },
      },
      {
        id: 'number-1',
        type: 'NUMBER',
        x: 0,
        y: 0,
        data: {
          numberItems: [{
            name: 'Defense',
            value: 3,
            valueFormula: '@armor + 2',
          }],
        },
      },
    ],
  }],
};

describe('inventory store updates', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => undefined,
    });
    vi.stubGlobal('window', {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({}));
    useUndoStore.getState().clearAllHistory();
    useStore.getState()._replaceWorkspaceState({
      characters: [character],
      activeCharacterId: character.id,
      mode: 'play',
    });
  });

  it('resolves dependent formulas immediately after saving an inventory item', () => {
    useStore.getState().saveInventoryItem({
      sourceWidgetId: 'inventory-1',
      targetWidgetId: 'inventory-1',
      item: {
        ...character.sheets[0].widgets[0].data.inventoryItems![0],
        fields: [{
          ...character.sheets[0].widgets[0].data.inventoryItems![0].fields[0],
          value: 5,
        }],
      },
    });

    const updatedCharacter = useStore.getState().characters[0];
    const numberWidget = updatedCharacter.sheets[0].widgets.find((widget) => widget.id === 'number-1');
    expect(numberWidget?.data.numberItems?.[0].value).toBe(7);
  });
});