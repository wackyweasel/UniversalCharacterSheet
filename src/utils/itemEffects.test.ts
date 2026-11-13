import { describe, expect, it } from 'vitest';
import type { Character, InventoryItem, NumericTargetReference } from '../types';
import { bindItemEffectTargets, collectNumericTargets, findNumericTarget, writeNumericTarget } from './numericTargets';
import { getItemEffectBaseValues, prepareItemArrivals, reconcileItemEffects } from './itemEffects';
import { duplicateInventoryItem, toCodexItem } from './inventory';

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

  it('identifies legacy numeric cells without labels and refuses inherited formulas', () => {
    const before = hero([]);
    before.sheets[0].widgets.push({ id: 'table', type: 'TABLE', x: 0, y: 0, data: { columns: ['Value'], rows: [{ cells: ['2'] }, { cells: ['4'] }], tableRowSettings: [{}, { formula: '1' }] } });
    const cells = collectNumericTargets(before).filter((entry) => entry.ref.kind === 'widget' && entry.ref.widgetId === 'table');
    expect(cells[1].problem).toBe('Computed by a formula');
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
