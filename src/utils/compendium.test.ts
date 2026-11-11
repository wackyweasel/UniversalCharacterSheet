import { describe, expect, it } from 'vitest';
import type { CompendiumSection, InventoryFieldTemplate, InventoryItem, Widget } from '../types';
import {
  addCompendiumSection,
  compendiumItemMatches,
  copyCompendiumData,
  copyCompendiumItemToWidgetData,
  createCompendiumEntryFromItem,
  deleteCompendiumItem,
  deleteCompendiumSection,
  describeCompendiumImport,
  describeCompendiumReplace,
  getCompendiumSections,
  instantiateCompendiumItem,
  mergeCompendiumSections,
  moveCompendiumItem,
  replaceCompendiumSections,
  parseCompendiumImport,
  renameCompendiumSection,
  saveCompendiumItem,
  serializeCompendium,
} from './compendium';

function createItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'item-1',
    name: 'Fireball',
    fields: [{ id: 'field-1', name: 'Level', type: 'number', value: 3 }],
    ...overrides,
  };
}

const empty = {} as { compendium?: CompendiumSection[] };

describe('compendium sections', () => {
  it('shows the default sections until the compendium is edited', () => {
    expect(getCompendiumSections(empty).map((section) => section.name)).toEqual(['Gear', 'Spells', 'Feats', 'NPCs']);
  });

  it('adds sections after the defaults and ignores blank names', () => {
    const added = addCompendiumSection(empty, { id: 'custom', name: '  Rituals ' });
    expect(added.compendium?.map((section) => section.name)).toEqual(['Gear', 'Spells', 'Feats', 'NPCs', 'Rituals']);
    expect(addCompendiumSection(empty, { id: 'blank', name: '   ' })).toBe(empty);
  });

  it('renames and deletes sections', () => {
    const renamed = renameCompendiumSection(empty, 'default-gear', 'Equipment');
    expect(getCompendiumSections(renamed)[0].name).toBe('Equipment');
    expect(renameCompendiumSection(renamed, 'missing', 'Nope')).toBe(renamed);

    const deleted = deleteCompendiumSection(renamed, 'default-gear');
    expect(getCompendiumSections(deleted).map((section) => section.id)).not.toContain('default-gear');
    expect(deleteCompendiumSection(deleted, 'default-gear')).toBe(deleted);
  });

  it('can delete every section', () => {
    let character = empty;
    for (const id of ['default-gear', 'default-spells', 'default-feats', 'default-npcs']) {
      character = deleteCompendiumSection(character, id);
    }
    expect(getCompendiumSections(character)).toEqual([]);
  });
});

describe('compendium entries', () => {
  it('saves new entries and replaces existing ones by id', () => {
    const added = saveCompendiumItem(empty, 'default-spells', createItem());
    expect(getCompendiumSections(added)[1].items).toHaveLength(1);

    const updated = saveCompendiumItem(added, 'default-spells', createItem({ name: 'Fire Bolt' }));
    expect(getCompendiumSections(updated)[1].items.map((item) => item.name)).toEqual(['Fire Bolt']);
    expect(saveCompendiumItem(empty, 'missing', createItem())).toBe(empty);
  });

  it('deletes entries', () => {
    const added = saveCompendiumItem(empty, 'default-spells', createItem());
    const removed = deleteCompendiumItem(added, 'default-spells', 'item-1');
    expect(getCompendiumSections(removed)[1].items).toEqual([]);
    expect(deleteCompendiumItem(removed, 'default-spells', 'item-1')).toBe(removed);
  });

  it('matches entries on name and attributes', () => {
    const item = createItem();
    expect(compendiumItemMatches(item, 'fire')).toBe(true);
    expect(compendiumItemMatches(item, 'level')).toBe(true);
    expect(compendiumItemMatches(item, 'frost')).toBe(false);
    expect(compendiumItemMatches(item, '  ')).toBe(true);
  });

  it('copies the compendium without sharing references', () => {
    const source = saveCompendiumItem(empty, 'default-gear', createItem());
    const copy = copyCompendiumData(source);
    expect(copy).toEqual(source);
    expect(copy.compendium).not.toBe(source.compendium);
    expect(copyCompendiumData(empty)).toEqual({});
  });
});

describe('instantiateCompendiumItem', () => {
  const templates: InventoryFieldTemplate[] = [
    { id: 'tpl-level', name: 'Level', type: 'number', defaultValue: 0 },
    { id: 'tpl-weight', name: 'Weight', type: 'number', defaultValue: 0, reserved: 'weight' },
  ];

  it('creates fresh ids and fills the widget default attributes', () => {
    const source = createItem({ quantity: 2, slotId: 'slot-1' });
    const result = instantiateCompendiumItem(source, templates);

    expect(result.id).not.toBe(source.id);
    expect(result.slotId).toBeUndefined();
    expect(result.quantity).toBe(2);
    expect(result.fields.map((field) => field.name)).toEqual(['Level', 'Weight']);
    expect(result.fields[0]).toMatchObject({ templateId: 'tpl-level', value: 3 });
    expect(result.fields[1]).toMatchObject({ reserved: 'weight', value: 0 });
    expect(result.fields.every((field) => field.id !== 'field-1')).toBe(true);
  });

  it('keeps unmatched attributes as additional attributes', () => {
    const result = instantiateCompendiumItem(createItem(), []);
    expect(result.fields).toHaveLength(1);
    expect(result.fields[0]).toMatchObject({ name: 'Level', value: 3 });
    expect(result.fields[0].templateId).toBeUndefined();
  });

  it('turns the quantity into a Quantity attribute when the target is a codex', () => {
    const result = instantiateCompendiumItem(createItem({ quantity: 4 }), [], { allowQuantity: false });
    expect(result.quantity).toBeUndefined();
    expect(result.fields.find((field) => field.name === 'Quantity')?.value).toBe(4);
  });

  it('turns a Quantity attribute back into a real quantity for inventories', () => {
    const entry = createItem({ fields: [{ id: 'q', name: 'Quantity', type: 'number', value: 6 }] });
    const result = instantiateCompendiumItem(entry, []);
    expect(result.quantity).toBe(6);
    expect(result.fields.some((field) => field.name === 'Quantity')).toBe(false);
  });

  it('carries an entry weight into widgets that track encumbrance', () => {
    const rope = createItem({
      name: 'Rope',
      fields: [{ id: 'w', name: 'Weight', type: 'number', value: 5, reserved: 'weight' }],
    });
    const result = instantiateCompendiumItem(rope, templates);
    const weight = result.fields.find((field) => field.reserved === 'weight');
    expect(weight).toMatchObject({ value: 5, templateId: 'tpl-weight' });
    expect(result.fields.filter((field) => field.name === 'Weight')).toHaveLength(1);
  });

  it('keeps the weight as a plain attribute when the widget does not track encumbrance', () => {
    const rope = createItem({
      name: 'Rope',
      fields: [
        { id: 'w', name: 'Weight', type: 'number', value: 5, reserved: 'weight' },
        { id: 'l', name: 'Length', type: 'text', value: '50 ft' },
      ],
    });
    const result = instantiateCompendiumItem(rope, [templates[0]]);
    expect(result.fields.map((field) => field.name)).toEqual(['Level', 'Weight', 'Length']);
    expect(result.fields[1]).toMatchObject({ value: 5, reserved: undefined });
  });
});

describe('compendium export and import', () => {
  const sections: CompendiumSection[] = [
    { id: 'a', name: 'Spells', items: [createItem()] },
    { id: 'b', name: 'Gear', items: [] },
  ];

  it('round-trips through JSON with fresh ids', () => {
    const parsed = parseCompendiumImport(serializeCompendium(sections));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.sections.map((section) => section.name)).toEqual(['Spells', 'Gear']);
    expect(parsed.sections[0].id).not.toBe('a');
    expect(parsed.sections[0].items[0]).toMatchObject({ name: 'Fireball' });
    expect(parsed.sections[0].items[0].id).not.toBe('item-1');
    expect(parsed.sections[0].items[0].fields[0]).toMatchObject({ name: 'Level', type: 'number', value: 3 });
  });

  it('accepts a bare list of sections', () => {
    const parsed = parseCompendiumImport(JSON.stringify([{ name: 'Loot', items: [{ name: 'Gem' }] }]));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.sections[0].items[0].name).toBe('Gem');
  });

  it('skips malformed entries and rejects invalid input', () => {
    const parsed = parseCompendiumImport(JSON.stringify({ sections: [{ name: 'Loot', items: [{ name: '' }, 5, { name: 'Gem' }] }] }));
    expect(parsed.ok && parsed.sections[0].items.map((item) => item.name)).toEqual(['Gem']);

    expect(parseCompendiumImport('not json').ok).toBe(false);
    expect(parseCompendiumImport('{"foo":1}').ok).toBe(false);
    expect(parseCompendiumImport('{"sections":[]}').ok).toBe(false);
  });

  it('keeps the weight attribute as a plain attribute and strips template links from imported attributes', () => {
    const text = JSON.stringify({
      sections: [{ name: 'Gear', items: [{ name: 'Rope', fields: [
        { name: 'Weight', type: 'number', value: 2, reserved: 'weight', templateId: 'x' },
        { name: 'Length', type: 'text', value: '50 ft', reserved: 'other' },
      ] }] }],
    });
    const parsed = parseCompendiumImport(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const [weight, length] = parsed.sections[0].items[0].fields;
    expect(weight).toMatchObject({ value: 2 });
    expect(weight.reserved).toBeUndefined();
    expect(weight.templateId).toBeUndefined();
    expect(length.reserved).toBeUndefined();
  });

  it('merges by section name and skips entries that already exist', () => {
    const existing: CompendiumSection[] = [{ id: 'a', name: 'Spells', items: [createItem()] }];
    const imported: CompendiumSection[] = [
      { id: 'x', name: 'spells', items: [createItem({ id: 'n1' }), createItem({ id: 'n2', name: 'Shield' })] },
      { id: 'y', name: 'Rituals', items: [createItem({ id: 'n3', name: 'Augury' })] },
    ];
    const result = mergeCompendiumSections(existing, imported);

    expect(result).toMatchObject({ addedSections: 1, addedItems: 2, skippedItems: 1 });
    expect(result.sections.map((section) => section.name)).toEqual(['Spells', 'Rituals']);
    expect(result.sections[0].items.map((item) => item.name)).toEqual(['Fireball', 'Shield']);
    expect(existing[0].items).toHaveLength(1);
  });

  it('replaces the existing sections with the imported ones', () => {
    const imported: CompendiumSection[] = [
      { id: 'x', name: 'Rituals', items: [createItem({ id: 'n1', name: 'Augury' }), createItem({ id: 'n2', name: 'Divination' })] },
    ];
    const result = replaceCompendiumSections(imported);

    expect(result.sections.map((section) => section.name)).toEqual(['Rituals']);
    expect(result).toMatchObject({ addedSections: 1, addedItems: 2, skippedItems: 0 });
    expect(describeCompendiumReplace(result)).toBe('Replaced the compendium with 2 entries in 1 section.');
  });

  it('describes the import result', () => {
    expect(describeCompendiumImport({ addedSections: 0, addedItems: 1, skippedItems: 0 })).toBe('Imported 1 entry.');
    expect(describeCompendiumImport({ addedSections: 2, addedItems: 3, skippedItems: 1 })).toBe(
      'Imported 3 entries and 2 new sections, 1 skipped because an entry with the same name already exists.',
    );
  });
});

describe('moveCompendiumItem', () => {
  const seeded = () => {
    let character = empty;
    character = saveCompendiumItem(character, 'default-spells', createItem({ id: 's1', name: 'Fireball' }));
    character = saveCompendiumItem(character, 'default-spells', createItem({ id: 's2', name: 'Misty Step' }));
    character = saveCompendiumItem(character, 'default-spells', createItem({ id: 's3', name: 'Shield' }));
    character = saveCompendiumItem(character, 'default-gear', createItem({ id: 'g1', name: 'Rope' }));
    return character;
  };

  it('reorders entries within the same section and ignores no-op drops', () => {
    const initial = seeded();
    expect(moveCompendiumItem(initial, { sourceSectionId: 'default-spells', targetSectionId: 'default-spells', itemId: 's2', beforeItemId: 's2' })).toBe(initial);
    expect(moveCompendiumItem(initial, { sourceSectionId: 'default-spells', targetSectionId: 'default-spells', itemId: 's2', beforeItemId: 's3' })).toBe(initial);

    const movedUp = moveCompendiumItem(initial, { sourceSectionId: 'default-spells', targetSectionId: 'default-spells', itemId: 's3', beforeItemId: 's1' });
    expect(getCompendiumSections(movedUp)[1].items.map((item) => item.id)).toEqual(['s3', 's1', 's2']);

    const movedToEnd = moveCompendiumItem(initial, { sourceSectionId: 'default-spells', targetSectionId: 'default-spells', itemId: 's1', beforeItemId: null });
    expect(getCompendiumSections(movedToEnd)[1].items.map((item) => item.id)).toEqual(['s2', 's3', 's1']);
  });

  it('moves entries across sections at a position or at the end', () => {
    const initial = seeded();
    const moved = moveCompendiumItem(initial, {
      sourceSectionId: 'default-gear',
      targetSectionId: 'default-spells',
      itemId: 'g1',
      beforeItemId: 's2',
    });
    expect(getCompendiumSections(moved)[0].items).toEqual([]);
    expect(getCompendiumSections(moved)[1].items.map((item) => item.id)).toEqual(['s1', 'g1', 's2', 's3']);

    const movedToEmpty = moveCompendiumItem(moved, {
      sourceSectionId: 'default-spells',
      targetSectionId: 'default-feats',
      itemId: 's1',
      beforeItemId: null,
    });
    expect(getCompendiumSections(movedToEmpty)[2].items.map((item) => item.id)).toEqual(['s1']);
  });
});

describe('copyCompendiumItemToWidgetData', () => {
  const entry = createItem({
    id: 'comp-sword',
    name: 'Longsword',
    fields: [
      { id: 'f-weight', name: 'Weight', type: 'number', value: 3, reserved: 'weight' },
      { id: 'f-dmg', name: 'Damage', type: 'text', value: '1d8' },
    ],
  });

  it('inserts a copy at the requested index in an Inventory widget', () => {
    const widget: Pick<Widget, 'type' | 'data'> = {
      type: 'INVENTORY',
      data: {
        inventoryItems: [createItem({ id: 'inv-1', name: 'Torch' }), createItem({ id: 'inv-2', name: 'Rations' })],
        inventoryDefaultFields: [{ id: 'tpl-w', name: 'Weight', type: 'number', defaultValue: 0, reserved: 'weight' }],
        inventoryEncumbrance: { enabled: true, unit: 'lb', includeInGlobalLoad: true, showGlobalCounter: false },
      },
    };

    const result = copyCompendiumItemToWidgetData(entry, widget, { targetIndex: 1 });
    expect(result).not.toBeNull();
    expect(result!.items.map((item) => item.name)).toEqual(['Torch', 'Longsword', 'Rations']);
    expect(result!.createdItem.id).not.toBe(entry.id);
    expect(result!.createdItem.fields.find((field) => field.reserved === 'weight')?.value).toBe(3);
  });

  it('creates a codex copy without reserved weight or quantity', () => {
    const widget: Pick<Widget, 'type' | 'data'> = {
      type: 'COMPENDIUM',
      data: {
        inventoryItems: [],
        inventoryDefaultFields: [],
      },
    };

    const result = copyCompendiumItemToWidgetData({ ...entry, quantity: 2 }, widget, { targetIndex: 0 });
    expect(result).not.toBeNull();
    expect(result!.createdItem.quantity).toBeUndefined();
    expect(result!.createdItem.fields.find((field) => field.name === 'Quantity')?.value).toBe(2);
    expect(result!.createdItem.fields.every((field) => !field.reserved)).toBe(true);
  });

  it('equips a copy in an Equipment slot and respects slot capacity', () => {
    const widget: Pick<Widget, 'type' | 'data'> = {
      type: 'INVENTORY_SLOTS',
      data: {
        inventoryItems: [],
        inventorySlots: [{ id: 'main-hand', name: 'Main hand', x: 0, y: 0, w: 50, h: 50, maxItems: 1 }],
        inventoryDefaultFields: [],
        inventoryEncumbrance: { enabled: false, unit: 'lb', includeInGlobalLoad: false, showGlobalCounter: false },
      },
    };

    const first = copyCompendiumItemToWidgetData(entry, widget, { targetSlotId: 'main-hand' });
    expect(first).not.toBeNull();
    expect(first!.createdItem.slotId).toBe('main-hand');

    const fullWidget: Pick<Widget, 'type' | 'data'> = {
      ...widget,
      data: { ...widget.data, inventoryItems: first!.items },
    };
    expect(copyCompendiumItemToWidgetData(entry, fullWidget, { targetSlotId: 'main-hand' })).toBeNull();
  });
});

describe('createCompendiumEntryFromItem and positional saveCompendiumItem', () => {
  it('converts a widget item into a standalone compendium entry without slot, template links, or reserved flags', () => {
    const item: InventoryItem = {
      id: 'w-item-1',
      name: '  Healing Potion  ',
      quantity: 3,
      slotId: 'belt-slot',
      description: '<p>Restores 2d4+2 HP</p>',
      fields: [
        { id: 'f1', name: 'Weight', type: 'number', value: 0.5, reserved: 'weight', templateId: 'tpl-w' },
        { id: 'f2', name: 'Rarity', type: 'text', value: 'Common', templateId: 'tpl-r' },
      ],
    };

    const entry = createCompendiumEntryFromItem(item);
    expect(entry).not.toBeNull();
    expect(entry!.id).not.toBe(item.id);
    expect(entry!.name).toBe('Healing Potion');
    expect(entry!.slotId).toBeUndefined();
    expect(entry!.quantity).toBeUndefined();
    expect(entry!.description).toBe('<p>Restores 2d4+2 HP</p>');
    expect(entry!.fields.map((field) => [field.name, field.value, field.reserved, field.templateId])).toEqual([
      ['Weight', 0.5, undefined, undefined],
      ['Rarity', 'Common', undefined, undefined],
      ['Quantity', 3, undefined, undefined],
    ]);
  });

  it('inserts new entries before a target entry when beforeItemId is given', () => {
    let character = saveCompendiumItem(empty, 'default-gear', createItem({ id: 'g1', name: 'Rope' }));
    character = saveCompendiumItem(character, 'default-gear', createItem({ id: 'g2', name: 'Torch' }), 'g1');
    expect(getCompendiumSections(character)[0].items.map((item) => item.name)).toEqual(['Torch', 'Rope']);
  });
});
