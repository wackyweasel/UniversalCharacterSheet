import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Character, WidgetData } from '../types';
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

describe('number display creation defaults', () => {
  beforeEach(() => {
    useUndoStore.getState().clearAllHistory();
    useStore.getState()._replaceWorkspaceState({
      characters: [{ ...character, sheets: [{ id: 'sheet-1', name: 'Main', widgets: [] }] }],
      activeCharacterId: character.id,
      mode: 'play',
    });
  });

  it('uses Auto and fixed square boxes only when creating a fresh widget', () => {
    useStore.getState().addWidget('NUMBER_DISPLAY', 0, 0, undefined, 'exact');
    expect(useStore.getState().characters[0].sheets[0].widgets[0].data).toMatchObject({
      displayLayout: 'auto',
      numberBoxFixedAspectRatio: true,
      numberBoxScale: 100,
    });
  });

  it.each([undefined, 'horizontal', 'vertical'] as const)('preserves saved %s layout data through loading, templates, cloning and edits', (displayLayout) => {
    const data: WidgetData = {
      displayNumbers: [{ label: 'Strength', value: 12 }],
      ...(displayLayout ? { displayLayout } : {}),
      numberBoxScale: 75,
    };
    useStore.getState()._replaceWorkspaceState({
      characters: [{
        ...character,
        sheets: [{ id: 'sheet-1', name: 'Main', widgets: [{ id: 'old-stats', type: 'NUMBER_DISPLAY', x: 0, y: 0, data }] }],
      }],
      activeCharacterId: character.id,
      mode: 'play',
    });
    expect(useStore.getState().characters[0].sheets[0].widgets[0].data).toEqual(data);
    useStore.getState().cloneWidget('old-stats');
    useStore.getState().addWidgetFromTemplate({ type: 'NUMBER_DISPLAY', data });
    expect(useStore.getState().characters[0].sheets[0].widgets.map((widget) => widget.data)).toEqual([data, data, data]);
    useStore.getState().updateWidgetData('old-stats', { label: 'Renamed' });
    expect(useStore.getState().characters[0].sheets[0].widgets[0].data).toEqual({ ...data, label: 'Renamed' });
  });

  it('retains the new settings through workspace reload', () => {
    useStore.getState().addWidget('NUMBER_DISPLAY', 0, 0, undefined, 'exact');
    const saved = JSON.parse(JSON.stringify(useStore.getState().characters)) as Character[];
    useStore.getState()._replaceWorkspaceState({ characters: saved, activeCharacterId: character.id, mode: 'play' });
    expect(useStore.getState().characters[0].sheets[0].widgets[0].data).toMatchObject({
      displayLayout: 'auto',
      numberBoxFixedAspectRatio: true,
      numberBoxScale: 100,
    });
  });
});

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

describe('mixed menu formula updates', () => {
  it('recalculates dependent formulas when a menu selection changes', () => {
    const menuCharacter: Character = {
      id: 'menu-character',
      name: 'Menu Character',
      activeSheetId: 'sheet-1',
      sheets: [
        {
          id: 'sheet-1',
          name: 'Main',
          widgets: [{
            id: 'menu-widget',
            type: 'MIXED_FIELDS',
            x: 0,
            y: 0,
            data: {
              mixedFields: [{
                type: 'menu',
                name: 'Stance',
                value: 'Aggressive',
                options: ['Aggressive', 'Defensive'],
                valueLabel: 'stance',
              }],
            },
          }],
        },
        {
          id: 'sheet-2',
          name: 'Bonuses',
          widgets: [{
            id: 'bonus-widget',
            type: 'MIXED_FIELDS',
            x: 0,
            y: 0,
            data: {
              mixedFields: [{
                type: 'number',
                name: 'Bonus',
                value: 0,
                valueFormula: 'IF(@stance = "Defensive", 2, 0)',
              }],
            },
          }],
        },
      ],
    };

    useStore.getState()._replaceWorkspaceState({
      characters: [menuCharacter],
      activeCharacterId: menuCharacter.id,
      mode: 'play',
    });

    useStore.getState().updateWidgetData('menu-widget', {
      mixedFields: [{
        type: 'menu',
        name: 'Stance',
        value: 'Defensive',
        options: ['Aggressive', 'Defensive'],
        valueLabel: 'stance',
      }],
    });

    const updatedCharacter = useStore.getState().characters[0];
    const bonusWidget = updatedCharacter.sheets[1].widgets[0];
    expect(bonusWidget.data.mixedFields?.[0]).toMatchObject({ value: 2 });
  });
});