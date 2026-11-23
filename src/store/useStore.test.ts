import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Character, Widget, WidgetData } from '../types';
import { useStore } from './useStore';
import { useUndoStore } from './useUndoStore';
import { collectLabelEntries } from '../utils/characterVariables';
import { collectCharacterFormulas } from '../utils/characterFormulas';
import { getWidgetEffectSources } from '../utils/widgetEffects';
import { isGroupTemplate, useTemplateStore } from './useTemplateStore';

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

describe('bulk automation deletion', () => {
  const getCharacter = () => useStore.getState().characters[0];
  beforeEach(() => {
    useUndoStore.getState().clearAllHistory();
    useStore.getState()._replaceWorkspaceState({
      characters: [{
        ...character,
        variables: [{ id: 'strength', label: 'strength', value: 10 }, { id: 'bonus', label: 'bonus', value: 5, formula: '5' }],
        events: [{ id: 'event', enabled: true, trigger: { kind: 'manual' }, steps: [{ id: 'step', effects: [] }] }],
        sheets: [...character.sheets, { id: 'sources', name: 'Sources', widgets: [{
          id: 'switch', type: 'TOGGLE', x: 0, y: 0, data: {
            toggleState: true, effects: [{ id: 'effect', amount: 2, target: { kind: 'variable', variableId: 'strength' } }],
          },
        }, {
          id: 'conditions', type: 'TOGGLE_GROUP', x: 0, y: 0,
          data: { toggleItems: [{ id: 'condition', name: 'Bloodied', active: true }] },
        }] }],
      }, { ...character, id: 'other' }],
      activeCharacterId: character.id, mode: 'play',
    });
  });

  it.each(['effects', 'labels', 'formulas', 'events'] as const)('deletes all %s across sheets with a single undo/redo step', (tab) => {
    const before = structuredClone(getCharacter());
    const other = useStore.getState().characters[1];
    expect(useStore.getState().deleteAllAutomations(tab)).toBe(true);
    const after = structuredClone(getCharacter());
    expect(useUndoStore.getState().past).toHaveLength(1);
    expect(useStore.getState().characters[1]).toBe(other);
    if (tab === 'effects') {
      expect(after.sheets.flatMap((sheet) => sheet.widgets.flatMap((widget) => getWidgetEffectSources(widget).flatMap((source) => source.effects)))).toEqual([]);
      expect(after.variables![0].value).toBe(10);
      expect(after.sheets[1].widgets[0].data.toggleState).toBe(true);
      expect(after.events).toEqual(before.events);
    } else if (tab === 'labels') {
      expect(collectLabelEntries(after).map((entry) => entry.label)).toEqual(['Bloodied']);
      expect(after.variables).toEqual([]);
      expect(after.sheets[0].widgets[0].data.inventoryItems![0].fields[0].value).toBe(1);
      expect(after.sheets[0].widgets[1].data.numberItems![0].valueFormula).toBe('@armor + 2');
      expect(after.events).toEqual(before.events);
    } else if (tab === 'formulas') {
      expect(collectCharacterFormulas(after)).toEqual([]);
      expect(after.variables![1].value).toBe(5);
      expect(after.sheets[0].widgets[1].data.numberItems![0].value).toBe(before.sheets[0].widgets[1].data.numberItems![0].value);
      expect(after.events).toEqual(before.events);
    } else {
      expect(after.events).toEqual([]);
      expect(after.sheets).toEqual(before.sheets);
      expect(after.variables).toEqual(before.variables);
    }
    useStore.getState().undo();
    expect(getCharacter()).toEqual(before);
    useStore.getState().redo();
    expect(getCharacter()).toEqual(after);
    expect(useStore.getState().deleteAllAutomations(tab)).toBe(false);
    expect(useUndoStore.getState().past).toHaveLength(1);
  });

  it('keeps deletion separate from immediately preceding and following edits', () => {
    useStore.getState().updateWidgetData('number-1', { label: 'Renamed' });
    const before = structuredClone(getCharacter());
    useStore.getState().deleteAllAutomations('events');
    expect(useUndoStore.getState().past).toHaveLength(2);
    const deleted = structuredClone(getCharacter());
    useStore.getState().updateWidgetData('number-1', { label: 'Renamed again' });
    expect(useUndoStore.getState().past).toHaveLength(3);
    useStore.getState().undo();
    expect(getCharacter()).toEqual(deleted);
    useStore.getState().undo();
    expect(getCharacter()).toEqual(before);
  });
});

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

describe('Effect-bearing templates', () => {
  const getCharacter = () => useStore.getState().characters[0];
  beforeEach(() => {
    useUndoStore.getState().clearAllHistory();
    useTemplateStore.getState().replaceTemplates([]);
  });

  it.each([undefined, '10'])('copies group Effects onto their new targets, preserving base values with formula %s', (valueFormula) => {
    const source: Widget = {
      id: 'source', type: 'TOGGLE', x: 0, y: 0, groupId: 'group', attachedTo: ['strength-widget'],
      data: {
        toggleState: true,
        effects: [
          { id: 'bonus', amount: 2, target: { kind: 'widget', widgetId: 'strength-widget', collection: 'displayNumbers', entryId: 'strength', field: 'value' } },
          { id: 'external-bonus', amount: 1, target: { kind: 'variable', variableId: 'external' } },
        ],
      },
    };
    const strength: Widget = {
      id: 'strength-widget', type: 'NUMBER_DISPLAY', x: 240, y: 0, groupId: 'group', attachedTo: [source.id],
      data: { displayNumbers: [{ id: 'strength', label: 'Strength', value: 10, valueFormula }] },
    };
    useStore.getState()._replaceWorkspaceState({
      characters: [{ ...character, variables: [{ id: 'external', label: 'external', value: 5 }], sheets: [{ id: 'sheet-1', name: 'Main', widgets: [source, strength] }] }],
      activeCharacterId: character.id, mode: 'play',
    });
    expect(getCharacter().sheets[0].widgets[1].data.displayNumbers![0].value).toBe(12);
    useTemplateStore.getState().addGroupTemplate(getCharacter().sheets[0].widgets, 'Strength group');
    useTemplateStore.getState().replaceTemplates(JSON.parse(JSON.stringify(useTemplateStore.getState().templates)));
    const template = useTemplateStore.getState().templates.find(isGroupTemplate)!;
    useStore.getState().addGroupFromTemplate(template);
    const [originalSource, originalStrength, copiedSource, copiedStrength] = getCharacter().sheets[0].widgets;
    expect(originalStrength.data.displayNumbers![0].value).toBe(12);
    expect(copiedStrength.data.displayNumbers![0].value).toBe(12);
    expect(copiedSource.data.effects![0].target).toEqual({
      kind: 'widget', widgetId: copiedStrength.id, collection: 'displayNumbers',
      entryId: copiedStrength.data.displayNumbers![0].id, field: 'value',
    });
    expect(copiedSource.data.effects![1].target).toEqual({ kind: 'variable', variableId: 'external' });
    expect(getCharacter().variables![0].value).toBe(7);
    expect(copiedSource.attachedTo).toEqual([copiedStrength.id]);
    expect(copiedStrength.attachedTo).toEqual([copiedSource.id]);
    expect(template.widgets[1].data.displayNumbers![0].value).toBe(10);
    useStore.getState().updateWidgetData(copiedSource.id, { toggleState: false });
    expect(getCharacter().sheets[0].widgets[1].data.displayNumbers![0].value).toBe(12);
    expect(getCharacter().sheets[0].widgets[3].data.displayNumbers![0].value).toBe(10);
    expect(getCharacter().sheets[0].widgets[0]).toEqual(originalSource);
    expect(getCharacter().variables![0].value).toBe(6);
    useStore.getState()._replaceWorkspaceState({
      characters: [{ ...character, id: 'other-character', variables: [{ id: 'external', label: 'external', value: 5 }], sheets: [{ id: 'sheet-1', name: 'Main', widgets: [] }] }],
      activeCharacterId: 'other-character', mode: 'play',
    });
    useStore.getState().addGroupFromTemplate(template);
    const [importedSource, importedStrength] = getCharacter().sheets[0].widgets;
    expect(importedStrength.data.displayNumbers![0].value).toBe(12);
    expect(importedSource.data.effects![0].target).toMatchObject({ widgetId: importedStrength.id });
  });

  it('copies self-targeting widget Effects without baking them into the saved values', () => {
    const mixed: Widget = {
      id: 'mixed', type: 'MIXED_FIELDS', x: 0, y: 0,
      data: { mixedFields: [
        { id: 'strength', name: 'Strength', type: 'number', value: 10 },
        {
          id: 'switch', name: 'Ring', type: 'switch', value: true,
          effects: [{ id: 'bonus', amount: 2, target: { kind: 'widget', widgetId: 'mixed', collection: 'mixedFields', entryId: 'strength', field: 'value' } }],
        },
      ] },
    };
    useStore.getState()._replaceWorkspaceState({
      characters: [{ ...character, sheets: [{ id: 'sheet-1', name: 'Main', widgets: [mixed] }] }],
      activeCharacterId: character.id, mode: 'play',
    });
    useTemplateStore.getState().addTemplate(getCharacter().sheets[0].widgets[0], 'Strength and ring');
    const template = useTemplateStore.getState().templates[0];
    if (isGroupTemplate(template)) throw new Error('Expected a widget template');
    useStore.getState().addWidgetFromTemplate(template);
    const [original, copy] = getCharacter().sheets[0].widgets;
    const copiedFields = copy.data.mixedFields!;
    expect(original.data.mixedFields![0]).toMatchObject({ type: 'number', value: 12 });
    expect(copiedFields[0]).toMatchObject({ type: 'number', value: 12 });
    expect(getWidgetEffectSources(copy)[0].effects[0].target).toEqual({
      kind: 'widget', widgetId: copy.id, collection: 'mixedFields', entryId: copiedFields[0].id, field: 'value',
    });
    expect(template.data.mixedFields![0]).toMatchObject({ type: 'number', value: 10 });
    useStore.getState().undo();
    expect(getCharacter().sheets[0].widgets).toEqual([original]);
    useStore.getState().redo();
    expect(getCharacter().sheets[0].widgets[1]).toEqual(copy);
  });
});

describe('widget resizing', () => {
  it('records an undo step and restores the previous size', () => {
    useUndoStore.getState().clearAllHistory();
    useStore.getState()._replaceWorkspaceState({
      characters: [{ ...character, sheets: [{ id: 'sheet-1', name: 'Main', widgets: [{ id: 'w1', type: 'NUMBER', x: 0, y: 0, w: 200, h: 100, data: {} }] }] }],
      activeCharacterId: character.id,
      mode: 'play',
    });
    useStore.getState().updateWidgetSize('w1', 300, 100);
    expect(useUndoStore.getState().past).toHaveLength(1);
    useStore.getState().undo();
    expect(useStore.getState().characters[0].sheets[0].widgets[0]).toMatchObject({ w: 200, h: 100 });
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

describe('partial widget detaching', () => {
  // A row a-b-c plus d attached below b.
  const groupedWidget = (id: string, x: number, y: number, attachedTo: string[]) => ({
    id, type: 'LABEL' as const, x, y, w: 100, h: 100, groupId: 'group-1', attachedTo, data: {},
  });

  beforeEach(() => {
    useUndoStore.getState().clearAllHistory();
    useStore.getState()._replaceWorkspaceState({
      characters: [{
        ...character,
        sheets: [{
          id: 'sheet-1',
          name: 'Main',
          widgets: [
            groupedWidget('a', 0, 0, ['b']),
            groupedWidget('b', 100, 0, ['a', 'c', 'd']),
            groupedWidget('c', 200, 0, ['b']),
            groupedWidget('d', 100, 100, ['b']),
          ],
        }],
      }],
      activeCharacterId: character.id,
      mode: 'play',
    });
  });

  const getWidget = (id: string) => useStore.getState().characters[0].sheets[0].widgets.find(w => w.id === id)!;

  it('keeps the other attachments and the group', () => {
    useStore.getState().detachWidgetFrom('b', ['c']);
    expect(getWidget('b')).toMatchObject({ groupId: 'group-1', attachedTo: ['a', 'd'] });
    expect(getWidget('a').groupId).toBe('group-1');
    expect(getWidget('d').groupId).toBe('group-1');
    expect(getWidget('c')).toMatchObject({ groupId: undefined, attachedTo: undefined });
  });

  it('splits the group when the removed edges disconnect it', () => {
    useStore.getState().detachWidgetFrom('b', ['a', 'c']);
    expect(getWidget('b')).toMatchObject({ groupId: 'group-1', attachedTo: ['d'] });
    expect(getWidget('d').groupId).toBe('group-1');
    expect(getWidget('a').groupId).toBeUndefined();
    expect(getWidget('c').groupId).toBeUndefined();
  });

  it('applies layouts and detaches pairs as one undo step', () => {
    useStore.getState().applyWidgetLayouts(
      [{ id: 'b', x: 100, y: 0, w: 50 }, { id: 'c', x: 150, y: 0, w: 150 }],
      'Resize widget',
      { detachPairs: [['b', 'd']] },
    );
    expect(getWidget('b')).toMatchObject({ w: 50, attachedTo: ['a', 'c'] });
    expect(getWidget('c')).toMatchObject({ x: 150, w: 150 });
    expect(getWidget('d')).toMatchObject({ groupId: undefined, attachedTo: undefined });

    useStore.getState().undo();
    expect(getWidget('b')).toMatchObject({ w: 100, attachedTo: ['a', 'c', 'd'] });
    expect(getWidget('c')).toMatchObject({ x: 200, w: 100 });
    expect(getWidget('d').groupId).toBe('group-1');
  });
});

describe('compendium drag store actions', () => {
  const swordEntry = {
    id: 'comp-sword',
    name: 'Sunblade',
    fields: [{ id: 'f-atk', name: 'Bonus', type: 'number' as const, value: 4, valueLabel: 'sunblade_bonus' }],
  };

  beforeEach(() => {
    useUndoStore.getState().clearAllHistory();
    useStore.getState()._replaceWorkspaceState({
      characters: [{
        id: 'character-1',
        name: 'Hero',
        activeSheetId: 'sheet-1',
        compendium: [
          { id: 'sec-gear', name: 'Gear', items: [swordEntry] },
          { id: 'sec-spells', name: 'Spells', items: [] },
        ],
        sheets: [{
          id: 'sheet-1',
          name: 'Main',
          widgets: [
            {
              id: 'inv-1',
              type: 'INVENTORY',
              x: 0,
              y: 0,
              data: { inventoryItems: [{ id: 'torch', name: 'Torch', fields: [] }], inventoryDefaultFields: [] },
            },
            {
              id: 'equip-1',
              type: 'INVENTORY_SLOTS',
              x: 0,
              y: 0,
              data: {
                inventoryItems: [],
                inventorySlots: [{ id: 'hand', name: 'Main hand', x: 0, y: 0, w: 50, h: 50, maxItems: 1 }],
                inventoryDefaultFields: [],
              },
            },
            {
              id: 'codex-1',
              type: 'COMPENDIUM',
              x: 0,
              y: 0,
              data: { inventoryItems: [], inventoryDefaultFields: [] },
            },
            {
              id: 'locked-inv',
              type: 'INVENTORY',
              x: 0,
              y: 0,
              locked: true,
              data: { inventoryItems: [], inventoryDefaultFields: [] },
            },
            {
              id: 'num-1',
              type: 'NUMBER',
              x: 0,
              y: 0,
              data: { numberItems: [{ name: 'Attack', value: 0, valueFormula: '@sunblade_bonus + 1' }] },
            },
          ],
        }],
      }],
      activeCharacterId: 'character-1',
      mode: 'play',
    });
  });

  it('moves compendium entries between sections with undo support', () => {
    const moved = useStore.getState().moveCompendiumItem({
      sourceSectionId: 'sec-gear',
      targetSectionId: 'sec-spells',
      itemId: 'comp-sword',
      beforeItemId: null,
    });
    expect(moved).toBe(true);
    expect(useStore.getState().characters[0].compendium?.[0].items).toEqual([]);
    expect(useStore.getState().characters[0].compendium?.[1].items.map((item) => item.id)).toEqual(['comp-sword']);

    useStore.getState().undo();
    expect(useStore.getState().characters[0].compendium?.[0].items.map((item) => item.id)).toEqual(['comp-sword']);
    expect(useStore.getState().characters[0].compendium?.[1].items).toEqual([]);
  });

  it('copies compendium entries into Inventory, Equipment and Codex widgets, resolves formulas and skips locked widgets', () => {
    const invCopy = useStore.getState().copyCompendiumItemToWidget({
      item: swordEntry,
      targetWidgetId: 'inv-1',
      targetIndex: 0,
    });
    expect(invCopy).not.toBeNull();
    expect(invCopy!.id).not.toBe(swordEntry.id);
    const widgetsAfterInv = useStore.getState().characters[0].sheets[0].widgets;
    expect(widgetsAfterInv.find((w) => w.id === 'inv-1')?.data.inventoryItems?.map((i) => i.name)).toEqual(['Sunblade', 'Torch']);
    expect(widgetsAfterInv.find((w) => w.id === 'num-1')?.data.numberItems?.[0].value).toBe(5);
    // Original compendium entry remains intact
    expect(useStore.getState().characters[0].compendium?.[0].items.map((i) => i.id)).toEqual(['comp-sword']);

    const equipCopy = useStore.getState().copyCompendiumItemToWidget({
      item: swordEntry,
      targetWidgetId: 'equip-1',
      targetSlotId: 'hand',
    });
    expect(equipCopy).not.toBeNull();
    expect(equipCopy!.slotId).toBe('hand');

    const codexCopy = useStore.getState().copyCompendiumItemToWidget({
      item: swordEntry,
      targetWidgetId: 'codex-1',
      targetIndex: 0,
    });
    expect(codexCopy).not.toBeNull();
    expect(useStore.getState().characters[0].sheets[0].widgets.find((w) => w.id === 'codex-1')?.data.inventoryItems).toHaveLength(1);

    expect(useStore.getState().copyCompendiumItemToWidget({
      item: swordEntry,
      targetWidgetId: 'locked-inv',
      targetIndex: 0,
    })).toBeNull();
  });

  it('adds a widget item copy to a compendium section at the requested position while keeping the widget item intact', () => {
    const torch = useStore.getState().characters[0].sheets[0].widgets.find((w) => w.id === 'inv-1')!.data.inventoryItems![0];
    const result = useStore.getState().addItemToCompendium({
      sectionId: 'sec-gear',
      item: { ...torch, quantity: 5 },
      beforeItemId: 'comp-sword',
    });
    expect(result).not.toBeNull();
    expect(result!.sectionName).toBe('Gear');
    expect(result!.entry.id).not.toBe(torch.id);
    expect(useStore.getState().characters[0].compendium?.[0].items.map((i) => i.name)).toEqual(['Torch', 'Sunblade']);
    // Source widget item remains untouched
    expect(useStore.getState().characters[0].sheets[0].widgets.find((w) => w.id === 'inv-1')?.data.inventoryItems?.map((i) => i.id)).toEqual(['torch']);

    useStore.getState().undo();
    expect(useStore.getState().characters[0].compendium?.[0].items.map((i) => i.name)).toEqual(['Sunblade']);
  });
});