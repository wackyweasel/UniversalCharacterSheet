import { describe, expect, it } from 'vitest';
import type { Character, InventoryItem, NumericTargetReference, Widget } from '../types';
import { bindItemEffectTargets, collectNumericTargets, findNumericTarget, writeNumericTarget } from './numericTargets';
import { getItemEffectBaseValues, getItemEffectProblems, prepareItemArrivals, reconcileItemEffects, stripItemEffectContributions } from './itemEffects';
import { duplicateInventoryItem, toCodexItem } from './inventory';
import { collectLabels, resolveCharacterFormulas } from './formulaEngine';

const target: NumericTargetReference = { kind: 'widget', widgetId: 'stats', collection: 'displayNumbers', entryId: 'strength', field: 'value' };
const ring = (id: string, amount = 1, allowExceedLimits = false): InventoryItem => ({
  id, name: 'Ring', fields: [], active: true, effects: [{ id: `effect-${id}`, target, amount, allowExceedLimits }],
});
function hero(items: InventoryItem[], maxValue?: number): Character {
  return { id: 'hero', name: 'Hero', activeSheetId: 'sheet', sheets: [{
    id: 'sheet', name: 'Main', widgets: [
      { id: 'stats', type: 'NUMBER_DISPLAY', x: 0, y: 0, data: { displayNumbers: [{ id: 'strength', label: 'Strength', value: 10, maxValue }] } },
      { id: 'gear', type: 'INVENTORY', x: 0, y: 0, data: { inventoryItems: items } },
    ],
  }] };
}
const value = (character: Character) => findNumericTarget(character, target)!.value;
const items = (character: Character, entries: InventoryItem[]): Character => ({
  ...character, sheets: [{ ...character.sheets[0], widgets: character.sheets[0].widgets.map((widget) => widget.id === 'gear' ? { ...widget, data: { ...widget.data, inventoryItems: entries } } : widget) }],
});

describe('item Effects', () => {
  const resolve = (character: Character, previous?: Character) => {
    const prepared = reconcileItemEffects(previous, character);
    const resolved = resolveCharacterFormulas(prepared);
    if (!resolved) return prepared;
    const { _formulaChanges: _, ...clean } = resolved;
    return clean;
  };

  it('adjusts formula results once, updates downstream labels, and restores the latest base', () => {
    const before = hero([ring('bonus', 2)]);
    before.variables = [{ id: 'source', label: 'source', value: 16 }];
    before.sheets[0].widgets[0].data.displayNumbers = [
      { id: 'strength', label: 'Strength', value: 10, valueLabel: 'strength', valueFormula: '@source' },
      { id: 'derived', label: 'Derived', value: 0, valueLabel: 'derived', valueFormula: '@strength * 2' },
      { id: 'last', label: 'Last', value: 0, valueFormula: '@derived + 1' },
    ];
    expect(getItemEffectProblems(before, ring('bonus', 2))).toEqual([]);
    const active = resolve(before);
    expect(value(active)).toBe(18);
    expect(collectLabels(active)).toMatchObject({ strength: 18, derived: 36 });
    expect(active.sheets[0].widgets[0].data.displayNumbers![2].value).toBe(37);
    expect(resolve(active)).toEqual(active);
    expect(resolveCharacterFormulas(active)).toBeNull();
    const edited = resolve({ ...active, variables: [{ id: 'source', label: 'source', value: 18 }] }, active);
    expect(value(edited)).toBe(20);
    const imported = resolve(JSON.parse(JSON.stringify(edited)));
    expect(value(imported)).toBe(20);
    expect(value(stripItemEffectContributions(imported))).toBe(18);
    const inactive = resolve(items(imported, []), imported);
    expect(value(inactive)).toBe(18);
    expect(inactive.sheets[0].widgets[0].data.displayNumbers![2].value).toBe(37);
    expect(inactive.sheets[0].widgets[0].data.displayNumbers![0].valueFormula).toBe('@source');
  });

  it('derives automatic secondary modifiers from the final primary value', () => {
    const before = hero([ring('bonus', 2)]);
    Object.assign(before.sheets[0].widgets[0].data, { secondaryDisplayAutoCompute: true });
    Object.assign(before.sheets[0].widgets[0].data.displayNumbers![0], { valueFormula: '18', secondaryValue: 0 });
    const active = resolve(before);
    expect(value(active)).toBe(20);
    expect(active.sheets[0].widgets[0].data.displayNumbers![0].secondaryValue).toBe(5);
    expect(resolveCharacterFormulas(active)).toBeNull();
  });

  it('uses adjusted formula-driven limits when clamping other computed values', () => {
    const before = hero([]);
    before.sheets[0].widgets[0].data.displayNumbers![0].valueFormula = '10';
    before.sheets[0].widgets[0].data.displayNumbers![0].maxValue = 5;
    before.sheets[0].widgets[0].data.displayNumbers![0].maxValueFormula = '5';
    const limit = { ...target, field: 'maxValue' };
    const source = { ...ring('limit'), effects: [{ id: 'increase-limit', target: limit, amount: 10 }] };
    const active = resolve(items(before, [source]));
    expect(findNumericTarget(active, limit)?.value).toBe(15);
    expect(value(active)).toBe(10);
  });

  it('uses final formula-driven segment counts for computed clock values', () => {
    const before = hero([]);
    before.sheets[0].widgets.push({ id: 'clock', type: 'PROGRESS_CLOCK', x: 0, y: 0, data: {
      clockItems: [{ id: 'clock', name: 'Clock', value: 0, valueFormula: '8', segments: 2, segmentsFormula: '2' }],
    } });
    const segments: NumericTargetReference = { kind: 'widget', widgetId: 'clock', collection: 'clockItems', entryId: 'clock', field: 'segments' };
    const active = resolve(items(before, [{ ...ring('limit'), effects: [{ id: 'increase-limit', target: segments, amount: 10 }] }]));
    expect(findNumericTarget(active, segments)?.value).toBe(12);
    expect(active.sheets[0].widgets[2].data.clockItems![0].value).toBe(8);
    expect(resolveCharacterFormulas(active)).toBeNull();
  });

  it.each([
    ['progress', { id: 'computed', type: 'PROGRESS_BAR', x: 0, y: 0, data: { currentValue: 0, minValue: 0, maxValue: 10, fieldFormulas: { currentValue: '20' } } }, { kind: 'widget', widgetId: 'computed', field: 'currentValue' }, 5],
    ['clock', { id: 'computed', type: 'PROGRESS_CLOCK', x: 0, y: 0, data: { clockItems: [{ id: 'clock', name: 'Clock', value: 0, segments: 10, valueFormula: '20' }] } }, { kind: 'widget', widgetId: 'computed', collection: 'clockItems', entryId: 'clock', field: 'value' }, 5],
    ['XP', { id: 'computed', type: 'XP_LEVEL', x: 0, y: 0, data: { currentValue: 0, fieldFormulas: { currentValue: '20' } } }, { kind: 'widget', widgetId: 'computed', field: 'currentValue' }, 5],
    ['dice count', { id: 'computed', type: 'DICE_POOL', x: 0, y: 0, data: { dicePoolComponents: [{ id: 'dice', name: 'Dice', active: true, dice: 0, diceFormula: '20' }] } }, { kind: 'widget', widgetId: 'computed', collection: 'dicePoolComponents', entryId: 'dice', field: 'dice' }, 5],
  ] satisfies [string, Widget, NumericTargetReference, number][])('adjusts %s formulas before limits and integer normalization', (_name, widget, ref, expected) => {
    const before = hero([]);
    before.sheets[0].widgets.push(widget);
    const source = { ...ring('penalty'), effects: [{ id: 'penalty', target: ref, amount: -15 }] };
    const active = resolve(items(before, [source]));
    expect(findNumericTarget(active, ref)?.value).toBe(expected);
    expect(resolveCharacterFormulas(active)).toBeNull();
  });

  it('adds bonuses to raw roll-weight and dice-count formulas before their minimums', () => {
    const before = hero([]);
    before.sheets[0].widgets.push(
      { id: 'roll-table', type: 'ROLL_TABLE', x: 0, y: 0, data: { rollTableItems: [{ id: 'option', text: 'Option', weight: 0, weightFormula: '-1' }] } },
      { id: 'dice', type: 'DICE_ROLLER', x: 0, y: 0, data: { diceGroups: [{ id: 'group', count: 1, faces: 6, countFormula: '0' }] } },
    );
    const refs: NumericTargetReference[] = [
      { kind: 'widget', widgetId: 'roll-table', collection: 'rollTableItems', entryId: 'option', field: 'weight' },
      { kind: 'widget', widgetId: 'dice', collection: 'diceGroups', entryId: 'group', field: 'count' },
    ];
    const active = resolve(items(before, [{ ...ring('bonus'), effects: refs.map((ref, index) => ({ id: `bonus-${index}`, target: ref, amount: 2 })) }]));
    expect(refs.map((ref) => findNumericTarget(active, ref)?.value)).toEqual([1, 2]);
    expect(resolveCharacterFormulas(active)).toBeNull();
  });

  it('applies limits after the formula and preserves bounded and unbounded adjustments', () => {
    const before = hero([ring('penalty', -15), ring('override', 2, true)], 10);
    before.sheets[0].widgets[0].data.displayNumbers![0].valueFormula = '20';
    const active = resolve(before);
    expect(value(active)).toBe(7);
    expect(value(resolve(items(active, [ring('override', 2, true)]), active))).toBe(12);
    expect(value(resolve(items(active, []), active))).toBe(10);
  });

  it('supports scalar, standalone, table-template and nested attribute formulas', () => {
    const before = hero([]);
    before.variables = [{ id: 'base', label: 'base', value: 10 }, { id: 'calculated', label: 'calculated', value: 0, formula: '@base + 1' }];
    before.sheets[0].widgets.push(
      { id: 'roller', type: 'DICE_ROLLER', x: 0, y: 0, data: { modifier: 0, fieldLabels: { modifier: 'attack' }, fieldFormulas: { modifier: '@calculated' } } },
      { id: 'table', type: 'TABLE', x: 0, y: 0, data: { columns: ['Value'], rows: [{ cells: [{ id: 'cell', value: '0', label: 'table' }] }], tableColumnSettings: [{ formula: '@attack' }] } },
    );
    const refs: NumericTargetReference[] = [
      { kind: 'variable', variableId: 'calculated' },
      { kind: 'widget', widgetId: 'roller', field: 'modifier' },
      { kind: 'widget', widgetId: 'table', collection: 'tableCells', entryId: 'cell', field: 'value' },
      { kind: 'widget', widgetId: 'gear', collection: 'inventoryFields', entryId: 'attribute', field: 'value' },
    ];
    const source = { ...ring('all'), fields: [{ id: 'attribute', name: 'Attribute', type: 'number' as const, value: 0, valueLabel: 'attribute', valueFormula: '@table' }],
      effects: refs.map((ref, index) => ({ id: `bonus-${index}`, target: ref, amount: 2 })) };
    const active = resolve(items(before, [source]));
    expect(collectLabels(active)).toMatchObject({ calculated: 13, attack: 15, table: 17, attribute: 19 });
    expect(refs.map((ref) => findNumericTarget(active, ref)?.value)).toEqual([13, 15, 17, 19]);
    expect(resolve(active)).toEqual(active);
  });

  it('rejects a formula-controlled switch whose Effect changes its activation condition', () => {
    const before = hero([]);
    before.sheets[0].widgets[0].data.displayNumbers![0].valueLabel = 'strength';
    before.sheets[0].widgets.push({ id: 'switch', type: 'TOGGLE', x: 0, y: 0, data: {
      toggleState: false, fieldFormulas: { state: 'IF(@strength < 11, 1, 0)' }, effects: [{ id: 'loop', target, amount: 2 }],
    } });
    expect(() => resolve(before)).toThrow(/cannot settle/i);
  });

  it('rejects stable activation feedback through a derived secondary label', () => {
    const before = hero([]);
    Object.assign(before.sheets[0].widgets[0].data, { secondaryDisplayAutoCompute: true });
    Object.assign(before.sheets[0].widgets[0].data.displayNumbers![0], { valueFormula: '10', secondaryValueLabel: 'modifier', secondaryValue: 0 });
    before.sheets[0].widgets.push({ id: 'switch', type: 'TOGGLE', x: 0, y: 0, data: {
      toggleState: true, fieldFormulas: { state: 'IF(@modifier >= 0, 1, 0)' }, effects: [{ id: 'loop', target, amount: 2 }],
    } });
    expect(() => resolve(before)).toThrow(/own activation/i);
  });

  it('uses displayed track bounds for zone activation but respects explicit effect overrides', () => {
    const track: NumericTargetReference = { kind: 'widget', widgetId: 'track', field: 'currentValue' };
    const before = hero([]);
    before.sheets[0].widgets.push({ id: 'track', type: 'THRESHOLD_TRACK', x: 0, y: 0, data: {
      currentValue: 20, minValue: 0, maxValue: 10,
      trackThresholds: [{ id: 'outside', name: 'Outside', value: 15, effects: [{ id: 'penalty', target, amount: -2 }] }],
    } });
    expect(value(reconcileItemEffects(undefined, before))).toBe(10);
    const bounded = { ...before, sheets: [{ ...before.sheets[0], widgets: before.sheets[0].widgets.map((widget) => widget.id === 'track' ? { ...widget, data: { ...widget.data, currentValue: 10 } } : widget) }] };
    const active = reconcileItemEffects(undefined, items(bounded, [{ ...ring('override'), effects: [{ id: 'overflow', target: track, amount: 5, allowExceedLimits: true }] }]));
    expect(findNumericTarget(active, track)!.value).toBe(15);
    expect(value(active)).toBe(8);
    expect(value(reconcileItemEffects(active, items(active, [])))).toBe(10);
  });

  it('settles chained zone effects and rejects oscillating zone activation', () => {
    const first: NumericTargetReference = { kind: 'widget', widgetId: 'track-one', field: 'currentValue' };
    const second: NumericTargetReference = { kind: 'widget', widgetId: 'track-two', field: 'currentValue' };
    const before = hero([{ ...ring('one'), effects: [{ id: 'enter-zone', target: first, amount: 3 }] }]);
    before.sheets[0].widgets.push(
      { id: 'track-one', type: 'THRESHOLD_TRACK', x: 0, y: 0, data: { currentValue: 0, trackThresholds: [{ id: 'zone-one', name: 'One', value: 3, effects: [{ id: 'next-zone', target: second, amount: 3 }] }] } },
      { id: 'track-two', type: 'THRESHOLD_TRACK', x: 0, y: 0, data: { currentValue: 0, trackThresholds: [{ id: 'zone-two', name: 'Two', value: 3, effects: [{ id: 'penalty', target, amount: -2 }] }] } },
    );
    const active = reconcileItemEffects(undefined, before);
    expect(value(active)).toBe(8);
    expect(value(reconcileItemEffects(active, items(active, [])))).toBe(10);
    const cyclic = hero([]);
    cyclic.sheets[0].widgets.push({ id: 'track-one', type: 'THRESHOLD_TRACK', x: 0, y: 0, data: {
      currentValue: 3, trackThresholds: [{ id: 'cycle', name: 'Cycle', value: 3, effects: [{ id: 'leave-zone', target: first, amount: -1 }] }],
    } });
    expect(() => reconcileItemEffects(undefined, cyclic)).toThrow('Effects cannot settle');
  });

  it('stacks once per entry, permits zero quantity, and retains independent edits', () => {
    const before = hero([{ ...ring('one'), quantity: 0 }, { ...ring('two'), quantity: 5 }]);
    const active = reconcileItemEffects(undefined, before);
    expect(value(active)).toBe(12);
    expect(reconcileItemEffects(active, active)).toBe(active);
    const edited = { ...active, sheets: [{ ...active.sheets[0], widgets: active.sheets[0].widgets.map((widget) => widget.id === 'stats' ? { ...widget, data: { displayNumbers: [{ id: 'strength', label: 'Strength', value: 15 }] } } : widget) }] };
    const updated = reconcileItemEffects(active, edited);
    expect(value(reconcileItemEffects(updated, items(updated, [])))).toBe(13);
  });

  it('retains capped contributions and aggregates bounded effects before overrides', () => {
    const before = hero([ring('one'), ring('two', 2, true)], 10);
    const active = reconcileItemEffects(undefined, before);
    expect(value(active)).toBe(12);
    const bounded = reconcileItemEffects(active, items(active, [ring('one')]));
    expect(value(bounded)).toBe(10);
    expect(value(reconcileItemEffects(bounded, items(bounded, [])))).toBe(10);
    const override = reconcileItemEffects(active, items(active, [ring('two', 2, true)]));
    expect(value(override)).toBe(12);
    expect(value(reconcileItemEffects(override, items(override, [])))).toBe(10);
  });

  it('replaces edited fractional penalties rather than accumulating them', () => {
    const active = reconcileItemEffects(undefined, hero([ring('one', -0.5)]));
    expect(value(active)).toBe(9.5);
    const edited = reconcileItemEffects(active, items(active, [ring('one', -2)]));
    expect(value(edited)).toBe(8);
    expect(value(reconcileItemEffects(edited, items(edited, [])))).toBe(10);
  });

  it('binds an unlabeled legacy value atomically without creating labels', () => {
    const before = hero([]);
    delete before.sheets[0].widgets[0].data.displayNumbers![0].id;
    const selected = collectNumericTargets(before).find((entry) => entry.ref.kind === 'widget' && entry.ref.field === 'value')!;
    const result = bindItemEffectTargets(before, { ...ring('one'), effects: [{ id: 'effect', target: selected.ref, amount: 1 }] });
    expect(before.sheets[0].widgets[0].data.displayNumbers![0].id).toBeUndefined();
    expect(result.character.sheets[0].widgets[0].data.displayNumbers![0].valueLabel).toBeUndefined();
    expect(findNumericTarget(result.character, result.item.effects![0].target!)?.value).toBe(10);
    const moved = { ...result.character, sheets: [{ ...result.character.sheets[0], widgets: result.character.sheets[0].widgets.map((widget) => widget.id === 'stats' ? { ...widget, data: { displayNumbers: [{ label: 'New', value: 3 }, { ...widget.data.displayNumbers![0], label: 'Might' }] } } : widget) }] };
    expect(findNumericTarget(moved, result.item.effects![0].target!)?.value).toBe(10);
    expect(() => bindItemEffectTargets(moved, { ...ring('one'), effects: [{ id: 'effect', target: selected.ref, amount: 1 }] })).toThrow('changed');
  });

  it('uses destination defaults but preserves manual states within a widget', () => {
    const before = hero([ring('one')]);
    const reordered = prepareItemArrivals(before, items(before, [{ ...ring('one'), active: false }]));
    expect(reordered.sheets[0].widgets[1].data.inventoryItems![0].active).toBe(false);
    const equipment = { ...before, sheets: [{ ...before.sheets[0], widgets: [
      { ...before.sheets[0].widgets[1], id: 'equipment', type: 'INVENTORY_SLOTS' as const },
    ] }] };
    expect(prepareItemArrivals(before, equipment).sheets[0].widgets[0].data.inventoryItems![0].active).toBe(true);
    expect(prepareItemArrivals(equipment, before).sheets[0].widgets[1].data.inventoryItems![0].active).toBe(false);
  });

  it('binds multiple fields of one legacy entry and retains active accounting through JSON', () => {
    const before = hero([], 20);
    delete before.sheets[0].widgets[0].data.displayNumbers![0].id;
    const fields = collectNumericTargets(before).filter((entry) => entry.ref.kind === 'widget' && entry.ref.widgetId === 'stats');
    const bound = bindItemEffectTargets(before, { ...ring('one'), effects: fields.map((field, index) => ({ id: `${index}`, target: field.ref, amount: 1 })) });
    expect(new Set(bound.item.effects!.map((effect) => effect.target?.kind === 'widget' && effect.target.entryId)).size).toBe(1);
    const active = reconcileItemEffects(undefined, items(bound.character, [bound.item]));
    const restored = reconcileItemEffects(undefined, JSON.parse(JSON.stringify(active)));
    expect(findNumericTarget(restored, bound.item.effects![0].target!)!.value).toBe(11);
    expect(findNumericTarget(reconcileItemEffects(restored, items(restored, [])), bound.item.effects![0].target!)!.value).toBe(10);
  });

  it('follows item quantity across widget moves and quantity/attribute adaptation', () => {
    const quantity: NumericTargetReference = { kind: 'widget', widgetId: 'gear', collection: 'inventoryItems', entryId: 'arrows', field: 'quantity' };
    const arrows: InventoryItem = { id: 'arrows', name: 'Arrows', quantity: 3, fields: [] };
    const before = reconcileItemEffects(undefined, hero([arrows, { ...ring('one'), effects: [{ id: 'q', target: quantity, amount: 1 }] }]));
    const moved: Character = { ...before, sheets: [{ ...before.sheets[0], widgets: [
      ...before.sheets[0].widgets.map((widget) => widget.id === 'gear' ? { ...widget, data: { ...widget.data, inventoryItems: [widget.data.inventoryItems![1]] } } : widget),
      { id: 'codex', type: 'COMPENDIUM', x: 0, y: 0, data: { inventoryItems: [toCodexItem(before.sheets[0].widgets[1].data.inventoryItems![0])] } },
    ] }] };
    const updated = reconcileItemEffects(before, prepareItemArrivals(before, moved));
    const ref = updated.sheets[0].widgets[1].data.inventoryItems![0].effects![0].target!;
    expect(ref).toMatchObject({ widgetId: 'codex', collection: 'inventoryFields' });
    expect(findNumericTarget(updated, ref)!.value).toBe(4);
    expect(findNumericTarget(reconcileItemEffects(updated, items(updated, [])), ref)!.value).toBe(3);
  });

  it('identifies legacy numeric cells without labels, including inherited formulas', () => {
    const before = hero([]);
    before.sheets[0].widgets.push({ id: 'table', type: 'TABLE', x: 0, y: 0, data: { columns: ['Value'], rows: [{ cells: ['2'] }, { cells: ['4'] }], tableRowSettings: [{}, { formula: '1' }] } });
    const cells = collectNumericTargets(before).filter((entry) => entry.ref.kind === 'widget' && entry.ref.widgetId === 'table');
    expect(cells[1].problem).toBeUndefined();
    const bound = bindItemEffectTargets(before, { ...ring('one'), effects: [{ id: 'cell', target: cells[0].ref, amount: 1 }] });
    const ref = bound.item.effects![0].target!;
    const updated = writeNumericTarget(bound.character, ref, 3);
    expect(updated.sheets[0].widgets[2].data.rows![0].cells[0]).toMatchObject({ value: '3' });
    expect(findNumericTarget(updated, ref)!.value).toBe(3);
  });

  it('copies self-targeting attributes from their base and follows the cloned attribute IDs', () => {
    const ref: NumericTargetReference = { kind: 'widget', widgetId: 'gear', collection: 'inventoryFields', entryId: 'charge', field: 'value' };
    const before = hero([{ ...ring('one'), fields: [{ id: 'charge', name: 'Charge', type: 'number', value: 10 }], effects: [{ id: 'charge-bonus', target: ref, amount: 2 }] }]);
    before.sheets[0].widgets[1].data.autoActivateItems = true;
    const active = reconcileItemEffects(undefined, before);
    const original = active.sheets[0].widgets[1].data.inventoryItems![0];
    const clone = duplicateInventoryItem(getItemEffectBaseValues(active, original));
    const copied = reconcileItemEffects(active, prepareItemArrivals(active, items(active, [original, clone])));
    const copiedRef = clone.effects![0].target!;
    expect(copiedRef).not.toEqual(ref);
    expect(findNumericTarget(copied, copiedRef)!.value).toBe(12);
    const copiedItem = copied.sheets[0].widgets[1].data.inventoryItems!.find((entry) => entry.id === clone.id)!;
    const inactive = reconcileItemEffects(copied, items(copied, [original, { ...copiedItem, active: false }]));
    expect(findNumericTarget(inactive, copiedRef)!.value).toBe(10);
    expect(findNumericTarget(inactive, ref)!.value).toBe(12);
  });

  it('reports contribution overflow and releases large finite bases without intermediate overflow', () => {
    expect(() => reconcileItemEffects(undefined, hero([ring('one', Number.MAX_VALUE), ring('two', Number.MAX_VALUE)]))).toThrow('supported numeric range');
    const before = hero([ring('one', 1)]);
    before.sheets[0].widgets[0].data.displayNumbers![0].value = Number.MAX_VALUE;
    const active = reconcileItemEffects(undefined, before);
    expect(value(reconcileItemEffects(active, items(active, [])))).toBe(Number.MAX_VALUE);
  });
});
