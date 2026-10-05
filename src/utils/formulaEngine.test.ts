import { describe, expect, it } from 'vitest';
import type { Character, WidgetData } from '../types';
import { collectLabels, evaluateFormula, evaluateFormulaValue, getAvailableLabels, resolveCharacterFormulas } from './formulaEngine';

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

  it('collects number and checkbox values as numbers and text fields as text', () => {
    expect(collectLabels(createCharacter(data))).toEqual({
      armor: 7,
      equipped: 1,
      stored: 0,
      blank: 0,
      invalid: 0,
      description: 'shield',
    });
  });

  it('lists inventory labels with widget and sheet metadata', () => {
    expect(getAvailableLabels(createCharacter(data))).toEqual([
      { label: 'armor', value: 7, widgetLabel: 'Pack', sheetName: 'Inventory' },
      { label: 'equipped', value: 1, widgetLabel: 'Pack', sheetName: 'Inventory' },
      { label: 'stored', value: 0, widgetLabel: 'Pack', sheetName: 'Inventory' },
      { label: 'blank', value: 0, widgetLabel: 'Pack', sheetName: 'Inventory' },
      { label: 'invalid', value: 0, widgetLabel: 'Pack', sheetName: 'Inventory' },
      { label: 'description', value: 'shield', widgetLabel: 'Pack', sheetName: 'Inventory' },
    ]);
  });
});

describe('text formula results', () => {
  it('returns text from literals, labels, concatenation and IF', () => {
    const labels = { name: 'Aria', level: 3, stance: 'Defensive' };
    expect(evaluateFormulaValue('"Hi " + @name', labels)).toBe('Hi Aria');
    expect(evaluateFormulaValue('@name + " L" + @level', labels)).toBe('Aria L3');
    expect(evaluateFormulaValue('IF(@stance = "Defensive", "Guarding", "Ready")', labels)).toBe('Guarding');
    expect(evaluateFormulaValue('IF(@name + "!" = "Aria!", 1, 0)', labels)).toBe(1);
    expect(evaluateFormulaValue('@level * 2', labels)).toBe(6);
  });

  it('compares unquoted words as text in IF and SWITCH', () => {
    const labels = { class: 'druid', level: 3 };
    expect(evaluateFormula('IF(@class=druid, 0, 1)', labels)).toBe(0);
    expect(evaluateFormula('IF(@class <> druid, 0, 1)', labels)).toBe(1);
    expect(evaluateFormula('SWITCH(@class, bard, 1, druid, 2, 0)', labels)).toBe(2);
    expect(evaluateFormula('IF(@level=3, 5, 6)', labels)).toBe(5);
  });

  it('keeps evaluateFormula numeric-only', () => {
    expect(evaluateFormula('"abc"', {})).toBeNull();
  });

  it('resolves text formulas on form, mixed and inventory fields', () => {
    const character: Character = {
      id: 'c', name: 'C', activeSheetId: 's',
      sheets: [{ id: 's', name: 'S', widgets: [
        { id: 'w1', type: 'FORM', x: 0, y: 0, data: { formItems: [
          { name: 'Who', value: 'Aria', valueLabel: 'who' },
          { name: 'Title', value: '', valueFormula: '@who + " the Bold"' },
        ] } },
        { id: 'w2', type: 'MIXED_FIELDS', x: 0, y: 0, data: { mixedFields: [
          { type: 'text', name: 'T', value: '', valueFormula: '"Hello " + @who' },
        ] } },
        { id: 'w3', type: 'INVENTORY', x: 0, y: 0, data: { inventoryItems: [
          { id: 'i', name: 'I', fields: [{ id: 'f', name: 'F', type: 'text', value: '', valueFormula: "@who + \" owns\"" }] },
        ] } },
      ] }],
    } as unknown as Character;

    const resolved = resolveCharacterFormulas(character);
    const [form, mixed, inventory] = resolved!.sheets[0].widgets;
    expect(form.data.formItems?.[1].value).toBe('Aria the Bold');
    expect((mixed.data.mixedFields?.[0] as { value: string }).value).toBe('Hello Aria');
    expect(inventory.data.inventoryItems?.[0].fields[0].value).toBe('Aria owns');
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

describe('mixed field menu labels', () => {
  it('collects the selected menu text and exposes it to the label browser', () => {
    const character = createCharacter({
      label: 'Choices',
      mixedFields: [{
        type: 'menu',
        name: 'Stance',
        value: 'Defensive',
        options: ['Aggressive', 'Defensive'],
        valueLabel: 'stance',
      }],
    });

    expect(collectLabels(character)).toMatchObject({ stance: 'Defensive' });
    expect(getAvailableLabels(character)).toContainEqual({
      label: 'stance',
      value: 'Defensive',
      widgetLabel: 'Choices',
      sheetName: 'Inventory',
    });
  });

  it('matches menu text in IF and SWITCH without coercing numeric-looking text', () => {
    const labels = { stance: '2', otherStance: 'Defensive', damage: 5 };

    expect(evaluateFormula('IF(@stance = "2", 7, 0)', labels)).toBe(7);
    expect(evaluateFormula('IF(@stance = 2, 7, 0)', labels)).toBe(0);
    expect(evaluateFormula('SWITCH(@otherStance, "Aggressive", 1, "Defensive", 3, 0)', labels)).toBe(3);
    expect(evaluateFormula('IF(@stance <> "Defensive", @damage, 0)', labels)).toBe(5);
  });

  it('handles an empty selection and keeps quoted label-like text out of references', () => {
    const labels = { stance: '' };

    expect(evaluateFormula('IF(@stance = "", 1, 0)', labels)).toBe(1);
    expect(evaluateFormula('IF(@stance = "@missing, (text)", 1, 0)', labels)).toBe(0);
  });

  it('resolves a numeric field formula from a selected menu', () => {
    const character = createCharacter({
      mixedFields: [
        { type: 'menu', name: 'Stance', value: 'Defensive', options: ['Aggressive', 'Defensive'], valueLabel: 'stance' },
        { type: 'number', name: 'Damage', value: 0, valueLabel: 'damage', valueFormula: 'IF(@stance = "Defensive", 7, 2)' },
      ],
    });

    const resolved = resolveCharacterFormulas(character);
    expect(resolved?.sheets[0].widgets[0].data.mixedFields?.[1]).toMatchObject({ value: 7 });
  });
});
describe('table cell text starting with a number', () => {
  it('keeps text like 1d8 intact when VALUE/SWITCH read it from another table', () => {
    const character: Character = {
      id: 'c', name: 'C', activeSheetId: 's',
      sheets: [{ id: 's', name: 'S', widgets: [
        { id: 'src', type: 'TABLE', x: 0, y: 0, data: {
          columns: ['Level', 'Die'],
          rows: [{ cells: ['1', '1d8'] }, { cells: ['2', '1d10'] }],
          tableColumnSettings: [{}, { label: 'src_die' }],
        } },
        { id: 'cls', type: 'MIXED_FIELDS', x: 0, y: 0, data: { mixedFields: [
          { type: 'text', name: 'Class', value: 'Mutant', valueLabel: 'class' },
          { type: 'number', name: 'Lvl', value: 2, valueLabel: 'lvl' },
        ] } },
        { id: 'dst', type: 'TABLE', x: 0, y: 0, data: {
          columns: ['Die'],
          rows: [{ cells: [{ value: '1', formula: 'SWITCH(@class, "Mutant", VALUE(@src_die, @lvl, 0), 0)' }] }],
        } },
      ] }],
    } as unknown as Character;

    expect(collectLabels(character)).toMatchObject({ src_die1: '1d8', src_die2: '1d10' });
    const resolved = resolveCharacterFormulas(character);
    const cell = (resolved!.sheets[0].widgets[2].data.rows![0].cells[0]) as { value: string };
    expect(cell.value).toBe('1d10');
  });
});
