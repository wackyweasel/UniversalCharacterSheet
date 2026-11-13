import { describe, expect, it } from 'vitest';
import type { Character, Widget } from '../types';
import { buildReferenceIndex, getLabelReferences } from './characterVariables';
import {
  canConvertWidget,
  convertWidgetData,
  getConversionChoice,
  getConversionTargets,
  getEventWarnings,
  getRestButtonWarnings,
} from './widgetConversion';

const widget = (type: Widget['type'], data: Widget['data']): Pick<Widget, 'type' | 'data'> => ({ type, data });

describe('widget conversion', () => {
  it('turns a list into a one-column table and back', () => {
    const list = widget('LIST', { label: 'Gear', items: ['Rope', 'Torch'] });
    const table = convertWidgetData(list, 'TABLE')!;
    expect(table.data.label).toBe('Gear');
    expect(table.data.rows?.map((row) => row.cells)).toEqual([['Rope'], ['Torch']]);

    const back = convertWidgetData(widget('TABLE', table.data), 'LIST')!;
    expect(back.data.items).toEqual(['Rope', 'Torch']);
    expect(back.warnings).toEqual([]);
  });

  it('warns when a table has columns a list cannot keep', () => {
    const table = widget('TABLE', { columns: ['Item', 'Qty'], rows: [{ cells: ['Rope', '2'] }] });
    expect(convertWidgetData(table, 'LIST')!.warnings).toContain('Only the "Item" column is kept.');
  });

  it('converts between checklist and conditions', () => {
    const checklist = widget('CHECKBOX', { checkboxItems: [{ name: 'Poisoned', checked: true, tooltip: 'Sick' }] });
    const conditions = convertWidgetData(checklist, 'TOGGLE_GROUP')!;
    expect(conditions.data.toggleItems).toEqual([{ name: 'Poisoned', active: true, tooltip: 'Sick' }]);
  });

  it('keeps variable labels and formulas between number tracker and display', () => {
    const tracker = widget('NUMBER', {
      numberItems: [{ name: 'Strength', value: 14, valueLabel: 'str', maxValue: 20, maxValueFormula: '@cap' }],
    });
    const result = convertWidgetData(tracker, 'NUMBER_DISPLAY')!;
    expect(result.data.displayNumbers).toEqual([
      { label: 'Strength', value: 14, valueLabel: 'str', maxValue: 20, maxValueFormula: '@cap' },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('warns about variable labels that cannot be carried over', () => {
    const table = widget('TABLE', { columns: ['A', 'B'], rows: [{ cells: ['x', { value: '1', label: 'one' }] }] });
    expect(convertWidgetData(table, 'LIST')!.warnings.join(' ')).toContain('one');

    const form = widget('FORM', { formItems: [{ name: 'Class', value: 'Wizard', valueLabel: 'class' }] });
    expect(convertWidgetData(form, 'TABLE')!.warnings).toEqual([]);
  });

  it('carries bar values across and flags what is lost', () => {
    const health = widget('HEALTH_BAR', {
      currentValue: 8,
      maxValue: 12,
      temporaryValue: 3,
      fieldLabels: { currentValue: 'hp', temporaryValue: 'temp_hp' },
    });
    const progress = convertWidgetData(health, 'PROGRESS_BAR')!;
    expect(progress.data).toMatchObject({ currentValue: 8, maxValue: 12, fieldLabels: { currentValue: 'hp' } });
    expect(progress.warnings).toContain('Temporary HP is removed.');
    expect(progress.warnings.join(' ')).toContain('temp_hp');

    const track = convertWidgetData(widget('PROGRESS_BAR', { currentValue: 2, maxValue: 6 }), 'THRESHOLD_TRACK')!;
    expect(track.data.trackThresholds).toHaveLength(3);
    expect(track.data.minValue).toBe(0);
  });

  it('converts mixed fields, dropping the types the target cannot hold', () => {
    const mixed = widget('MIXED_FIELDS', {
      mixedFields: [
        { type: 'text', name: 'Class', value: 'Rogue' },
        { type: 'number', name: 'Level', value: 3 },
      ],
    });
    const form = convertWidgetData(mixed, 'FORM')!;
    expect(form.data.formItems).toEqual([{ name: 'Class', value: 'Rogue' }]);
    expect(form.warnings).toEqual(['1 field of another type is removed.']);
    expect(convertWidgetData(mixed, 'TOGGLE_GROUP')).toBeNull();
    expect(getConversionTargets(mixed)).toEqual(['FORM', 'NUMBER', 'NUMBER_DISPLAY']);
  });

  it('turns notes into list items', () => {
    const notes = widget('TEXT', { richText: '<p>First</p><p>Second&nbsp;line</p>' });
    expect(convertWidgetData(notes, 'LIST')!.data.items).toEqual(['First', 'Second line']);
  });

  it('turns an inventory into a codex and back', () => {
    const inventory = widget('INVENTORY', {
      inventoryItems: [{ id: 'a', name: 'Arrow', quantity: 20, fields: [] }],
      inventoryDefaultFields: [],
      inventoryEncumbrance: { enabled: true, unit: 'lb', includeInGlobalLoad: true, showGlobalCounter: false },
    });
    const codex = convertWidgetData(inventory, 'COMPENDIUM')!;
    expect(codex.data.inventoryItems?.[0].fields).toMatchObject([{ name: 'Quantity', value: 20 }]);
    expect(codex.warnings).toHaveLength(1);

    const back = convertWidgetData(widget('COMPENDIUM', codex.data), 'INVENTORY')!;
    expect(back.data.inventoryItems?.[0].quantity).toBe(20);
  });

  it('converts pools to progress clocks and spell slots', () => {
    const pool = widget('POOL', {
      poolResources: [
        { name: 'Level 1', max: 4, current: 3, style: 'boxes', currentLabel: 'slots_1' },
        { name: 'Level 2', max: 2, current: 0, style: 'boxes' },
      ],
    });
    const clocks = convertWidgetData(pool, 'PROGRESS_CLOCK')!;
    expect(clocks.data.clockItems).toMatchObject([
      { name: 'Level 1', segments: 4, value: 3, valueLabel: 'slots_1' },
      { name: 'Level 2', segments: 2, value: 0 },
    ]);
    expect(convertWidgetData(widget('PROGRESS_CLOCK', clocks.data), 'POOL')!.data.poolResources)
      .toMatchObject([{ name: 'Level 1', max: 4, current: 3, currentLabel: 'slots_1' }, { name: 'Level 2', max: 2, current: 0 }]);

    const slots = convertWidgetData(pool, 'SPELL_SLOT')!;
    expect(slots.data.spellLevels).toEqual([{ level: 1, max: 4, used: 1 }, { level: 2, max: 2, used: 2 }]);
    expect(slots.data.spellSlotShape).toBe('square');
    expect(slots.warnings.join(' ')).toContain('slots_1');
  });

  it('reads a legacy single pool', () => {
    const legacy = widget('POOL', { maxPool: 6, currentPool: 2, fieldFormulas: { maxPool: '@level + 3' } });
    const clocks = convertWidgetData(legacy, 'PROGRESS_CLOCK')!;
    expect(clocks.data.clockItems).toMatchObject([{ segments: 6, value: 2, segmentsFormula: '@level + 3' }]);
    expect(clocks.warnings).toEqual([]);
  });

  it('turns spell slots into a pool where used slots are missing points', () => {
    const slots = widget('SPELL_SLOT', { spellLevels: [{ level: 1, max: 4, used: 1 }], spellSlotShape: 'diamond' });
    expect(convertWidgetData(slots, 'POOL')!.data.poolResources).toEqual([
      { name: 'Level 1', max: 4, current: 3, style: 'diamonds' },
    ]);
  });

  it('converts between wallet and number tracker', () => {
    const wallet = widget('WALLET', { walletCurrencies: [{ name: 'cp', amount: 5, rate: 1 }, { name: 'gp', amount: 2, rate: 100 }] });
    const numbers = convertWidgetData(wallet, 'NUMBER')!;
    expect(numbers.data.numberItems).toEqual([{ name: 'cp', value: 5 }, { name: 'gp', value: 2 }]);
    expect(numbers.warnings).toHaveLength(1);

    const back = convertWidgetData(widget('NUMBER', numbers.data), 'WALLET')!;
    expect(back.data.walletCurrencies).toEqual([{ name: 'cp', amount: 5, rate: 1 }, { name: 'gp', amount: 2, rate: 10 }]);
    expect(convertWidgetData(widget('NUMBER', {}), 'WALLET')).toBeNull();
  });

  it('turns the legacy deck into a deck of cards', () => {
    const deck = widget('DECK', {
      deckCards: [{ name: 'Ace', amount: 4 }, { name: '', amount: 1 }],
      deckState: { remaining: [], discarded: ['Ace'] },
    });
    const result = convertWidgetData({ ...deck, id: 'deck-1' }, 'DECK_OF_CARDS')!;
    expect(result.data.cardTableCards).toMatchObject([{ title: 'Ace', amount: 4, faceUp: false, originWidgetId: 'deck-1' }]);
    expect(result.warnings).toHaveLength(1);
  });

  it('moves inventory items out of and into equipment slots', () => {
    const inventory = widget('INVENTORY', { inventoryItems: [{ id: 'a', name: 'Rope', fields: [] }] });
    const equipment = convertWidgetData(inventory, 'INVENTORY_SLOTS')!;
    expect(equipment.data.inventorySlots?.length).toBeGreaterThan(0);

    const equipped = widget('INVENTORY_SLOTS', {
      inventorySlots: equipment.data.inventorySlots,
      inventoryItems: [{ id: 'a', name: 'Sword', slotId: equipment.data.inventorySlots![0].id, fields: [] }],
    });
    const back = convertWidgetData(equipped, 'INVENTORY')!;
    expect(back.data.inventoryItems?.[0]).not.toHaveProperty('slotId');
    expect(back.data.inventorySlots).toBeUndefined();
    expect(back.warnings).toHaveLength(1);
  });

  it('warns about formulas that are dropped', () => {
    const clocks = widget('PROGRESS_CLOCK', { clockItems: [{ id: 'c', name: 'Doom', segments: 6, value: 0 }] });
    expect(convertWidgetData(clocks, 'POOL')!.warnings).toEqual([]);
    const bar = widget('PROGRESS_BAR', { currentValue: 1, fieldFormulas: { currentValue: '@a', temporaryValue: '@b' } });
    expect(convertWidgetData(bar, 'HEALTH_BAR')!.warnings).toEqual([]);
    const track = widget('THRESHOLD_TRACK', { currentValue: 1, fieldFormulas: { currentValue: '@a' }, trackThresholds: [] });
    expect(convertWidgetData(track, 'PROGRESS_BAR')!.warnings).toEqual([]);
    const health = widget('HEALTH_BAR', { fieldFormulas: { temporaryValue: '@b' } });
    expect(convertWidgetData(health, 'PROGRESS_BAR')!.warnings.join(' ')).toContain('Formulas removed: @b');
  });

  it('lists the labels and formulas that carry over', () => {
    const tracker = widget('NUMBER', {
      numberItems: [{ name: 'Strength', value: 14, valueLabel: 'str', maxValue: 20, maxValueFormula: '@cap' }],
    });
    expect(convertWidgetData(tracker, 'NUMBER_DISPLAY')!.carried).toEqual(['Variable labels: str', 'Formulas: @cap']);

    const form = widget('FORM', { formItems: [{ name: 'Class', value: 'Wizard', valueLabel: 'class' }] });
    expect(convertWidgetData(form, 'MIXED_FIELDS')!.carried).toEqual(['Variable labels: class']);
    expect(convertWidgetData(widget('LIST', { items: ['a'] }), 'TABLE')!.carried).toEqual([]);
  });

  it('keeps the displayed numbers when a bar relies on its default range', () => {
    const health = convertWidgetData(widget('HEALTH_BAR', {}), 'PROGRESS_BAR')!;
    expect(health.data).toMatchObject({ currentValue: 10, minValue: 0, maxValue: 10 });
    const progress = convertWidgetData(widget('PROGRESS_BAR', { currentValue: 5 }), 'HEALTH_BAR')!;
    expect(progress.data).toMatchObject({ currentValue: 5, maxValue: 100 });
  });

  it('keeps added defaults out of the lost list', () => {
    const track = convertWidgetData(widget('PROGRESS_BAR', { currentValue: 1 }), 'THRESHOLD_TRACK')!;
    expect(track.warnings).toEqual([]);
    expect(track.notes).toEqual(['Default zones are added; edit them afterwards.']);
  });

  it('warns when a Rest button acts on the widget being converted', () => {
    const character = {
      activeSheetId: 'main',
      sheets: [
        { id: 'main', widgets: [{ id: 'rest', type: 'REST_BUTTON', data: { poolRestores: [{ widgetId: 'pool-1', resourceIndex: 0, mode: 'full' }], resetSpellSlots: true } }] },
        { id: 'other', widgets: [{ id: 'rest-2', type: 'REST_BUTTON', data: { poolRestores: [{ widgetId: 'pool-1', resourceIndex: 1, mode: 'full' }] } }] },
      ],
    } as unknown as Character;
    expect(getRestButtonWarnings({ id: 'pool-1', type: 'POOL' }, character)).toEqual([
      '2 Rest buttons are set to restore this pool; resting will no longer affect this widget.',
    ]);
    expect(getRestButtonWarnings({ id: 'slots', type: 'SPELL_SLOT' }, character)).toHaveLength(1);
    expect(getRestButtonWarnings({ id: 'bar', type: 'HEALTH_BAR' }, character)).toEqual([]);
    expect(getRestButtonWarnings({ id: 'list', type: 'LIST' }, character)).toEqual([]);
  });

  it('converts mixed fields to and from pools, step dice and displays', () => {
    const pool = widget('POOL', {
      poolResources: [{ name: 'Rage', max: 3, current: 2, style: 'flames', currentLabel: 'rage', maxFormula: '@level' }],
      showPoolCount: true,
    });
    const mixedPool = convertWidgetData(pool, 'MIXED_FIELDS')!;
    expect(mixedPool.data.mixedFields).toMatchObject([{ type: 'resource', name: 'Rage', current: 2, max: 3, style: 'flames', showCount: true, currentLabel: 'rage', maxFormula: '@level' }]);
    expect(mixedPool.warnings).toEqual([]);
    expect(convertWidgetData(widget('MIXED_FIELDS', mixedPool.data), 'POOL')!.data).toMatchObject({
      poolResources: [{ name: 'Rage', current: 2, max: 3, style: 'flames', currentLabel: 'rage', maxFormula: '@level' }],
      showPoolCount: true,
    });

    const steps = widget('STEP_DICE', { stepDiceItems: [{ name: 'Agility', currentStep: 2 }], stepDiceChain: ['1d4', '1d6', '1d8'] });
    const mixedSteps = convertWidgetData(steps, 'MIXED_FIELDS')!;
    expect(mixedSteps.data.mixedFields).toEqual([{ type: 'step-dice', name: 'Agility', currentStep: 2, diceChain: ['1d4', '1d6', '1d8'] }]);
    const back = convertWidgetData(widget('MIXED_FIELDS', mixedSteps.data), 'STEP_DICE')!;
    expect(back.data).toMatchObject({ stepDiceItems: [{ name: 'Agility', currentStep: 2 }], stepDiceChain: ['1d4', '1d6', '1d8'] });

    const display = widget('NUMBER_DISPLAY', { displayNumbers: [{ label: 'AC', value: 15, secondaryValue: 2 }] });
    const mixedDisplay = convertWidgetData(display, 'MIXED_FIELDS')!;
    expect(mixedDisplay.data.mixedFields).toMatchObject([{ type: 'number', name: 'AC', value: 15 }]);
    expect(mixedDisplay.warnings).toEqual(['Secondary values are removed.']);
    expect(convertWidgetData(widget('MIXED_FIELDS', mixedDisplay.data), 'NUMBER_DISPLAY')!.data.displayNumbers)
      .toMatchObject([{ label: 'AC', value: 15 }]);
  });

  it('keeps only the first matching mixed field when the target holds one thing', () => {
    const mixed = widget('MIXED_FIELDS', {
      mixedFields: [
        { type: 'text', name: 'Class', value: 'Rogue' },
        { type: 'progress', name: 'Stamina', current: 4, min: 1, max: 8, currentLabel: 'stam', maxFormula: '@con' },
        { type: 'switch', name: 'Raging', value: true, valueLabel: 'raging' },
      ],
    });
    const bar = convertWidgetData(mixed, 'PROGRESS_BAR')!;
    expect(bar.data).toMatchObject({ label: 'Stamina', currentValue: 4, minValue: 1, maxValue: 8, fieldLabels: { currentValue: 'stam' }, fieldFormulas: { maxValue: '@con' } });
    expect(bar.warnings).toContain('2 other fields are removed.');

    const toggle = convertWidgetData(mixed, 'TOGGLE')!;
    expect(toggle.data).toMatchObject({ label: 'Raging', toggleState: true, fieldLabels: { state: 'raging' } });
    expect(getConversionTargets(mixed)).toContain('TOGGLE');
    expect(convertWidgetData(widget('MIXED_FIELDS', { mixedFields: [{ type: 'text', name: 'a', value: '' }] }), 'TOGGLE')).toBeNull();
  });

  it('converts a switch or progress bar into a mixed field and back', () => {
    const toggle = widget('TOGGLE', { label: 'Inspired', toggleState: true, toggleColor: '#fff', fieldLabels: { state: 'insp' } });
    const mixed = convertWidgetData(toggle, 'MIXED_FIELDS')!;
    expect(mixed.data.mixedFields).toEqual([{ type: 'switch', name: 'Inspired', value: true, valueLabel: 'insp', toggleColor: '#fff' }]);
    expect(mixed.carried).toEqual(['Variable labels: insp']);

    const bar = widget('PROGRESS_BAR', { label: 'XP', currentValue: 30, fieldLabels: { currentValue: 'xp' } });
    expect(convertWidgetData(bar, 'MIXED_FIELDS')!.data.mixedFields).toMatchObject([{ type: 'progress', name: 'XP', current: 30, min: 0, max: 100, currentLabel: 'xp' }]);
  });

  it('converts between progress bar, progress clocks and trackers', () => {
    const bar = widget('PROGRESS_BAR', { currentValue: 3, maxValue: 6, fieldLabels: { currentValue: 'doom' } });
    const clock = convertWidgetData(bar, 'PROGRESS_CLOCK')!;
    expect(clock.data.clockItems).toMatchObject([{ segments: 6, value: 3, valueLabel: 'doom' }]);
    expect(convertWidgetData(widget('PROGRESS_CLOCK', clock.data), 'PROGRESS_BAR')!.data)
      .toMatchObject({ currentValue: 3, minValue: 0, maxValue: 6, fieldLabels: { currentValue: 'doom' } });

    const offset = convertWidgetData(widget('PROGRESS_BAR', { currentValue: 5, minValue: 2, maxValue: 8 }), 'PROGRESS_CLOCK')!;
    expect(offset.data.clockItems).toMatchObject([{ segments: 6, value: 3 }]);
    expect(offset.warnings).toHaveLength(1);

    const clocks = widget('PROGRESS_CLOCK', { clockItems: [{ id: 'a', name: 'Fear', segments: 4, value: 1 }, { id: 'b', name: 'Doom', segments: 6, value: 0 }] });
    const single = convertWidgetData(clocks, 'PROGRESS_BAR')!;
    expect(single.data).toMatchObject({ label: 'Fear', maxValue: 4 });
    expect(single.warnings).toEqual(['1 other clock is removed.']);
  });

  it('converts a number tracker into a bar and back', () => {
    const tracker = widget('NUMBER', {
      numberItems: [{ name: 'Hit points', value: 7, maxValue: 12, valueLabel: 'hp' }, { name: 'Luck', value: 1 }],
    });
    const health = convertWidgetData(tracker, 'HEALTH_BAR')!;
    expect(health.data).toMatchObject({ label: 'Hit points', currentValue: 7, maxValue: 12, fieldLabels: { currentValue: 'hp' }, temporaryValue: 0 });
    expect(health.warnings).toEqual(['1 other tracker is removed.']);

    const back = convertWidgetData(widget('HEALTH_BAR', health.data), 'NUMBER')!;
    expect(back.data.numberItems).toMatchObject([{ name: 'Hit points', value: 7, maxValue: 12, valueLabel: 'hp' }]);
    expect(back.data.showNumberItemMax).toBe(true);
    expect(convertWidgetData(widget('HEALTH_BAR', { temporaryValue: 4 }), 'NUMBER')!.warnings).toContain('Temporary HP is removed.');
  });

  it('converts a number tracker into a pool and back', () => {
    const tracker = widget('NUMBER', { numberItems: [{ name: 'Ammo', value: 12 }, { name: 'Luck', value: 2, maxValue: 3, valueLabel: 'luck' }] });
    const pool = convertWidgetData(tracker, 'POOL')!;
    expect(pool.data.poolResources).toMatchObject([
      { name: 'Ammo', current: 12, max: 12 },
      { name: 'Luck', current: 2, max: 3, currentLabel: 'luck' },
    ]);
    expect(pool.notes).toHaveLength(1);

    const back = convertWidgetData(widget('POOL', pool.data), 'NUMBER')!;
    expect(back.data.numberItems).toMatchObject([{ name: 'Ammo', value: 12, maxValue: 12 }, { name: 'Luck', value: 2, maxValue: 3, valueLabel: 'luck' }]);
  });

  it('turns table rows into roll table entries, checklists and conditions', () => {
    const table = widget('TABLE', {
      columns: ['Result', 'Weight', 'Notes'],
      rows: [{ cells: ['Goblin', '3', 'Sneaky'] }, { cells: ['Ogre', 'x', 'Big'] }, { cells: ['', '1', ''] }],
    });
    expect(convertWidgetData(table, 'ROLL_TABLE')!.data.rollTableItems).toEqual([
      { text: 'Goblin', weight: 3, description: 'Sneaky' },
      { text: 'Ogre', weight: 1, description: 'x' },
    ]);
    const checklist = convertWidgetData(table, 'CHECKBOX')!;
    expect(checklist.data.checkboxItems).toEqual([{ name: 'Goblin', checked: false }, { name: 'Ogre', checked: false }]);
    expect(checklist.warnings).toContain('Only the "Result" column is kept.');
    expect(convertWidgetData(table, 'TOGGLE_GROUP')!.data.toggleItems).toHaveLength(2);
  });

  it('converts between dice roller and dice tray', () => {
    const roller = widget('DICE_ROLLER', {
      diceGroups: [{ count: 2, faces: 6 }, { count: 1, faces: 6 }, { count: 1, faces: 3, customFaces: ['a', 'b', 'c'], customDiceName: 'Fate' }],
      modifier: 2,
      fieldLabels: { modifier: 'bonus' },
    });
    const tray = convertWidgetData(roller, 'DICE_TRAY')!;
    expect(tray.data).toMatchObject({ availableDice: [6, { name: 'Fate', faces: ['a', 'b', 'c'] }], modifier: 2, fieldLabels: { modifier: 'bonus' } });
    expect(tray.warnings).toContain('Dice counts and exploding dice are removed.');

    const expression = convertWidgetData(widget('DICE_ROLLER', { diceUseExpression: true, diceExpression: '2d8 + 1d4kh' }), 'DICE_TRAY')!;
    expect(expression.data.availableDice).toEqual([8, 4]);
    expect(expression.warnings).toHaveLength(1);

    const back = convertWidgetData(widget('DICE_TRAY', tray.data), 'DICE_ROLLER')!;
    expect(back.data.diceGroups).toEqual([{ count: 1, faces: 6 }, { count: 1, faces: 3, customFaces: ['a', 'b', 'c'], customDiceName: 'Fate' }]);
    expect(back.data.modifier).toBe(2);
    expect(back.notes).toHaveLength(1);
  });

  it('converts between deck of cards and roll table', () => {
    const deck = widget('DECK_OF_CARDS', {
      cardTableCards: [{ id: 'a', title: 'Ace', symbol: '♠', body: 'High', amount: 4, faceUp: false }],
      cardTableDiscardedCards: [{ id: 'b', title: 'Joker', symbol: '', body: '', amount: 1, faceUp: true }],
    });
    const table = convertWidgetData(deck, 'ROLL_TABLE')!;
    expect(table.data.rollTableItems).toEqual([{ text: 'Ace', weight: 4, description: 'High' }, { text: 'Joker', weight: 1 }]);
    expect(table.warnings).toHaveLength(1);
    expect(table.notes).toEqual(['Cards in the discard pile are included.']);

    const back = convertWidgetData({ ...widget('ROLL_TABLE', { rollTableItems: [{ text: 'Ogre', weight: 2.4, description: 'Big' }] }), id: 'w1' }, 'DECK_OF_CARDS')!;
    expect(back.data.cardTableCards).toMatchObject([{ title: 'Ogre', body: 'Big', amount: 2, faceUp: false, originWidgetId: 'w1' }]);
    expect(back.warnings).toEqual(['Weights are rounded to whole numbers.']);
  });

  it('lets the user pick which item a one-item target keeps', () => {
    const table = widget('TABLE', { columns: ['Name', 'Qty'], rows: [{ cells: ['Rope', '2'] }, { cells: ['Torch', '5'] }] });
    expect(getConversionChoice(table, 'LIST')).toEqual({ label: 'Which column?', options: ['Name', 'Qty'] });
    const list = convertWidgetData(table, 'LIST', { choice: 1 })!;
    expect(list.data.items).toEqual(['2', '5']);
    expect(list.warnings).toEqual(['Only the "Qty" column is kept.']);
    expect(convertWidgetData(table, 'CHECKBOX', { choice: 1 })!.data.checkboxItems?.[0].name).toBe('2');
    expect(convertWidgetData(table, 'LIST', { choice: 9 })!.data.items).toEqual(['2', '5']);

    const mixed = widget('MIXED_FIELDS', {
      mixedFields: [
        { type: 'progress', name: 'Stamina', current: 1, max: 4 },
        { type: 'text', name: 'Class', value: '' },
        { type: 'progress', name: 'Focus', current: 3, max: 6 },
      ],
    });
    expect(getConversionChoice(mixed, 'PROGRESS_BAR')?.options).toEqual(['Stamina', 'Focus']);
    expect(convertWidgetData(mixed, 'PROGRESS_BAR', { choice: 1 })!.data).toMatchObject({ label: 'Focus', currentValue: 3, maxValue: 6 });
    expect(getConversionChoice(mixed, 'TOGGLE')).toBeNull();

    const clocks = widget('PROGRESS_CLOCK', { clockItems: [{ id: 'a', name: '', segments: 4, value: 1 }, { id: 'b', name: 'Doom', segments: 6, value: 2 }] });
    expect(getConversionChoice(clocks, 'PROGRESS_BAR')?.options).toEqual(['Clock 1', 'Doom']);
    expect(convertWidgetData(clocks, 'PROGRESS_BAR', { choice: 1 })!.data).toMatchObject({ label: 'Doom', maxValue: 6 });

    const trackers = widget('NUMBER', { numberItems: [{ name: 'HP', value: 5 }, { name: 'Luck', value: 2, maxValue: 3 }] });
    expect(convertWidgetData(trackers, 'HEALTH_BAR', { choice: 1 })!.data).toMatchObject({ label: 'Luck', currentValue: 2, maxValue: 3 });
    expect(getConversionChoice(widget('NUMBER', { numberItems: [{ name: 'HP', value: 5 }] }), 'HEALTH_BAR')).toBeNull();
  });

  it('summarizes what the converted widget holds', () => {
    expect(convertWidgetData(widget('LIST', { items: ['a', 'b'] }), 'CHECKBOX')!.summary).toBe('2 items');
    expect(convertWidgetData(widget('LIST', { items: ['a'] }), 'TOGGLE_GROUP')!.summary).toBe('1 condition');
    expect(convertWidgetData(widget('LIST', { items: [] }), 'CHECKBOX')!.summary).toBeUndefined();
    expect(convertWidgetData(widget('HEALTH_BAR', {}), 'PROGRESS_BAR')!.summary).toBeUndefined();
  });

  it('tells harmful label losses from harmless ones', () => {
    const roll = widget('ROLL_TABLE', { rollTableItems: [{ text: 'Goblin', weight: 3, weightLabel: 'goblin_weight' }, { text: 'Ogre', weight: 1, weightLabel: 'ogre_weight' }] });
    const users = (label: string) => (label === 'goblin_weight' ? ['Encounter', '⚡ Rage'] : []);
    const result = convertWidgetData(roll, 'LIST', { labelUsers: users })!;
    expect(result.warnings).toEqual([
      'Weights and descriptions are removed.',
      '@goblin_weight is removed, but Encounter, ⚡ Rage still use it',
    ]);
    expect(result.notes).toEqual(['Variable labels removed that nothing uses: ogre_weight']);
  });

  it('warns about events that stop working after the conversion', () => {
    const effect = { id: 'e1', kind: 'health.heal', widgetId: 'hp', target: '*', params: { amount: '2' } };
    const character = {
      id: 'c', name: 'C', activeSheetId: 's',
      sheets: [{ id: 's', name: 'Main', widgets: [
        { id: 'hp', type: 'HEALTH_BAR', x: 0, y: 0, data: {} },
        { id: 'other', type: 'HEALTH_BAR', x: 0, y: 0, data: {} },
      ] }],
      events: [
        { id: 'ev1', name: 'Rage', enabled: true, trigger: { kind: 'health.damaged', widgetId: 'hp', target: '*' }, steps: [{ id: 's1', effects: [effect] }] },
        { id: 'ev2', name: 'Unrelated', enabled: true, trigger: { kind: 'health.damaged', widgetId: 'other', target: '*' }, steps: [{ id: 's2', effects: [] }] },
      ],
    } as unknown as Character;
    const hp = { id: 'hp', type: 'HEALTH_BAR' as const, data: {} };
    const conversion = convertWidgetData(hp, 'PROGRESS_BAR')!;
    const warnings = getEventWarnings(hp, conversion, 'PROGRESS_BAR', character);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('Event "Rage"');
    expect(warnings[0]).toContain('no longer supports');
    expect(getEventWarnings(hp, conversion, 'PROGRESS_BAR', undefined)).toEqual([]);
  });

  it('finds who uses a lost label through the character reference index', () => {
    const character = {
      id: 'c', name: 'C', activeSheetId: 's',
      sheets: [{ id: 's', name: 'Main', widgets: [
        { id: 'stats', type: 'NUMBER', x: 0, y: 0, data: { label: 'Stats', numberItems: [{ name: 'Strength', value: 14, valueLabel: 'str' }] } },
        { id: 'mods', type: 'FORM', x: 0, y: 0, data: { label: 'Modifiers', formItems: [{ name: 'Mod', value: '', valueFormula: '@str + 1' }] } },
      ] }],
    } as unknown as Character;
    const index = buildReferenceIndex(character);
    const labelUsers = (label: string) => getLabelReferences(index, label, 'field').filter((reference) => reference.sourceId !== 'stats').map((reference) => reference.title);

    const toWallet = convertWidgetData({ type: 'NUMBER', data: { numberItems: [{ name: 'Strength', value: 14, valueLabel: 'str' }] } }, 'WALLET', { labelUsers })!;
    expect(toWallet.warnings).toContain('@str is removed, but Modifiers still uses it');
    expect(convertWidgetData({ type: 'NUMBER', data: { numberItems: [{ name: 'Strength', value: 14, valueLabel: 'other' }] } }, 'WALLET', { labelUsers })!.notes)
      .toContain('Variable labels removed that nothing uses: other');
  });

  it('reports which widget types can be converted at all', () => {
    expect(canConvertWidget({ type: 'LIST' })).toBe(true);
    expect(canConvertWidget({ type: 'CALENDAR' })).toBe(false);
  });
});
