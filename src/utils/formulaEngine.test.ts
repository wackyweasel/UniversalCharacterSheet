import { describe, expect, it } from 'vitest';
import type { Character, WidgetData } from '../types';
import { collectLabels, getAvailableLabels, resolveCharacterFormulas } from './formulaEngine';

function createCharacter(data: WidgetData): Character {
  return {
    id: 'character-1',
    name: 'Test Character',
    activeSheetId: 'sheet-1',
    sheets: [{
      id: 'sheet-1',
      name: 'Inventory',
      widgets: [{ id: 'widget-1', type: 'INVENTORY', x: 0, y: 0, data }],
    }],
  };
}

describe('inventory field labels', () => {
  const data: WidgetData = {
    label: 'Pack',
    inventoryItems: [{
      id: 'item-1',
      name: 'Adventuring gear',
      fields: [
        { id: 'armor', name: 'Armor', type: 'number', value: 7, valueLabel: 'armor' },
        { id: 'equipped', name: 'Equipped', type: 'checkbox', value: true, valueLabel: 'equipped' },
        { id: 'stored', name: 'Stored', type: 'checkbox', value: false, valueLabel: 'stored' },
        { id: 'blank', name: 'Blank', type: 'number', value: '', valueLabel: 'blank' },
        { id: 'invalid', name: 'Invalid', type: 'number', value: 'not a number', valueLabel: 'invalid' },
        { id: 'description', name: 'Description', type: 'text', value: 'shield', valueLabel: 'description' },
        { id: 'unlabeled', name: 'Unlabeled', type: 'number', value: 12 },
      ],
    }],
  };

  it('collects number and checkbox values while excluding text fields', () => {
    expect(collectLabels(createCharacter(data))).toEqual({
      armor: 7,
      equipped: 1,
      stored: 0,
      blank: 0,
      invalid: 0,
    });
  });

  it('lists inventory labels with widget and sheet metadata', () => {
    expect(getAvailableLabels(createCharacter(data))).toEqual([
      { label: 'armor', value: 7, widgetLabel: 'Pack', sheetName: 'Inventory' },
      { label: 'equipped', value: 1, widgetLabel: 'Pack', sheetName: 'Inventory' },
      { label: 'stored', value: 0, widgetLabel: 'Pack', sheetName: 'Inventory' },
      { label: 'blank', value: 0, widgetLabel: 'Pack', sheetName: 'Inventory' },
      { label: 'invalid', value: 0, widgetLabel: 'Pack', sheetName: 'Inventory' },
    ]);
  });
});

describe('roll table weight formulas', () => {
  it('collects weight labels and resolves formulas into option weights', () => {
    const character = createCharacter({
      rollTableItems: [
        { text: 'Base', weight: 3, weightLabel: 'base_weight' },
        { text: 'Computed', weight: 1, weightFormula: '@base_weight * 2' },
      ],
    });

    expect(collectLabels(character)).toMatchObject({ base_weight: 3 });

    const resolved = resolveCharacterFormulas(character);
    expect(resolved?.sheets[0].widgets[0].data.rollTableItems?.[1].weight).toBe(6);
  });
});