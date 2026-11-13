import type { Character, InventoryItem, ItemEffect, ItemEffectValueState, NumericTargetReference, Widget } from '../types';
import { collectNumericTargets, findNumericTarget, numericTargetKey, writeNumericTarget } from './numericTargets';
import { remapInventoryItemTarget } from './inventory';
import { getWidgetEffectSources, mapWidgetEffects } from './widgetEffects';

export const isItemWidget = (widget: Pick<Widget, 'type'>) => (
  widget.type === 'INVENTORY' || widget.type === 'INVENTORY_SLOTS' || widget.type === 'COMPENDIUM'
);

export function getAutoActivateItems(widget: Pick<Widget, 'type' | 'data'>): boolean {
  return widget.data.autoActivateItems ?? widget.type === 'INVENTORY_SLOTS';
}

export function getItemEffectProblems(character: Character, item: Pick<InventoryItem, 'effects'>): string[] {
  return (item.effects ?? []).flatMap((effect) => {
    const target = effect.target && findNumericTarget(character, effect.target);
    if (!Number.isFinite(effect.amount)) return ['Effect amount must be a finite number.'];
    if (!target) return [`${effect.targetName || 'Effect'}: select a target value.`];
    if (target.problem) return [`${effect.targetName || target.title}: ${target.problem}.`];
    return [];
  });
}

interface Contribution {
  ref: NumericTargetReference;
  bounded: number;
  unbounded: number;
}

/** Computes from retained bases, including bonuses hidden by limits, rather than inverting clamped changes. */
function reconcileEffectPass(previous: Character | undefined, character: Character): Character {
  const oldStates = character.itemEffectValues ?? previous?.itemEffectValues ?? {};
  const contributions = new Map<string, Contribution>();
  for (const sheet of character.sheets) for (const widget of sheet.widgets) {
    for (const source of getWidgetEffectSources(widget, oldStates)) {
      if (!source.active) continue;
      for (const effect of source.effects) {
        if (!effect.target || !Number.isFinite(effect.amount)) continue;
        const key = numericTargetKey(effect.target);
        const total = contributions.get(key) ?? { ref: effect.target, bounded: 0, unbounded: 0 };
        if (effect.allowExceedLimits) total.unbounded += effect.amount;
        else total.bounded += effect.amount;
        contributions.set(key, total);
      }
    }
  }
  if (!contributions.size && !Object.keys(oldStates).length) return character;
  let next = character;
  const states: Record<string, ItemEffectValueState> = {};
  const keys = [...new Set([...Object.keys(oldStates), ...contributions.keys()])];
  // Limits can themselves have effects; calculate them before the values they bound.
  keys.sort((a, b) => {
    const priority = (key: string) => {
      const ref = contributions.get(key)?.ref ?? oldStates[key]?.target;
      return ref?.kind === 'widget' && /^(min|max|segments)/i.test(ref.field) ? 0 : 1;
    };
    return priority(a) - priority(b);
  });
  for (const key of keys) {
    const contribution = contributions.get(key);
    const old = oldStates[key];
    const ref = contribution?.ref ?? old?.target;
    if (!ref) continue;
    const target = findNumericTarget(next, ref);
    if (!target) continue;
    if (target.problem) {
      // Formula resolution runs after reconciliation. Release the old bonus first.
      if (old && target.value === old.effective) next = writeNumericTarget(next, ref, old.base, true);
      continue;
    }
    if (!contribution) {
      if (old) next = writeNumericTarget(next, ref, old.base + (target.value - old.effective));
      continue;
    }
    const { bounded, unbounded } = contribution;
    if (!Number.isFinite(bounded + unbounded)) throw new Error('Effects exceed the supported numeric range.');
    const base = old
      ? target.value === old.effective ? old.base : target.value - bounded - unbounded
      : target.value;
    let effective = base + bounded;
    if (target.min !== undefined) effective = Math.max(target.min, effective);
    if (target.max !== undefined) effective = Math.min(target.max, effective);
    effective += unbounded;
    if (target.integer) effective = target.integer === 'floor' ? Math.floor(effective) : Math.round(effective);
    if (!Number.isFinite(effective)) throw new Error('Effects exceed the supported numeric range.');
    next = writeNumericTarget(next, ref, effective);
    states[key] = { target: ref, base, effective };
  }
  const unchanged = Object.keys(states).length === Object.keys(oldStates).length
    && Object.entries(states).every(([key, value]) => {
      const old = oldStates[key];
      return old?.base === value.base && old.effective === value.effective && numericTargetKey(old.target) === numericTargetKey(value.target);
    });
  if (unchanged && next === character) return character;
  return { ...next, itemEffectValues: states };
}

export function reconcileItemEffects(previous: Character | undefined, character: Character): Character {
  const activeSources = (current: Character) => JSON.stringify(current.sheets.flatMap((sheet) => sheet.widgets.flatMap((widget) => (
    getWidgetEffectSources(widget, current.itemEffectValues).filter((source) => source.active && source.effects.length).map((source) => [widget.id, source.key])
  ))));
  const seen = new Set<string>();
  let current = character;
  for (let pass = 0; pass < 32; pass++) {
    const active = activeSources(current);
    if (seen.has(active)) throw new Error('Effects cannot settle: a zone effect changes which zone is active.');
    seen.add(active);
    const next = reconcileEffectPass(pass === 0 ? previous : undefined, current);
    if (activeSources(next) === active) return next;
    current = next;
  }
  throw new Error('Effects cannot settle: too many dependent zone changes.');
}

/** New entries and cross-widget arrivals use destination policy; conversion/reordering do not. */
export function prepareItemArrivals(previous: Character | undefined, character: Character): Character {
  if (!previous) return character;
  const locations = new Map<string, string>();
  const previousItems = new Map<string, InventoryItem>();
  for (const sheet of previous.sheets) for (const widget of sheet.widgets) {
    for (const item of widget.data.inventoryItems ?? []) {
      locations.set(item.id, widget.id);
      previousItems.set(item.id, item);
    }
  }
  const moves = new Map<string, NumericTargetReference>();
  let previousTargets: ReturnType<typeof collectNumericTargets> | undefined;
  let changed = false;
  const sheets = character.sheets.map((sheet) => {
    let sheetChanged = false;
    const widgets = sheet.widgets.map((widget) => {
      if (!isItemWidget(widget) || !widget.data.inventoryItems) return widget;
      let widgetChanged = false;
      const items = widget.data.inventoryItems.map((item) => {
        const hasEffects = !!item.effects?.length;
        const oldLocation = locations.get(item.id);
        const oldItem = previousItems.get(item.id);
        if (oldLocation && oldItem && oldLocation !== widget.id) {
          previousTargets ??= collectNumericTargets(previous);
          for (const { ref } of previousTargets) {
            if (ref.kind !== 'widget' || ref.widgetId !== oldLocation) continue;
            const mapped = remapInventoryItemTarget(ref, oldItem, item, widget.id);
            if (mapped) moves.set(numericTargetKey(ref), mapped);
          }
        }
        const active = !hasEffects ? false
          : oldLocation !== widget.id ? getAutoActivateItems(widget) : item.active === true;
        if ((!hasEffects && item.active === undefined) || item.active === active) return item;
        widgetChanged = true;
        return { ...item, active };
      });
      if (!widgetChanged) return widget;
      changed = sheetChanged = true;
      return { ...widget, data: { ...widget.data, inventoryItems: items } };
    });
    return sheetChanged ? { ...sheet, widgets } : sheet;
  });
  const next = changed ? { ...character, sheets } : character;
  return moves.size ? retargetItemEffects(next, (ref) => moves.get(numericTargetKey(ref)) ?? ref) : next;
}

export function retargetItemEffects(character: Character, map: (ref: NumericTargetReference) => NumericTargetReference): Character {
  const item = (entry: InventoryItem): InventoryItem => entry.effects?.length
    ? { ...entry, effects: entry.effects.map((effect): ItemEffect => effect.target ? { ...effect, target: map(effect.target) } : effect) } : entry;
  const states: Record<string, ItemEffectValueState> = {};
  for (const state of Object.values(character.itemEffectValues ?? {})) {
    const target = map(state.target);
    states[numericTargetKey(target)] = { ...state, target };
  }
  return {
    ...character,
    sheets: character.sheets.map((sheet) => ({
      ...sheet, widgets: sheet.widgets.map((widget) => mapWidgetEffects(widget, (source) => source.effects.map((effect) => effect.target ? { ...effect, target: map(effect.target) } : effect))),
    })),
    ...(character.compendium ? { compendium: character.compendium.map((section) => ({ ...section, items: section.items.map(item) })) } : {}),
    ...(character.itemEffectValues ? { itemEffectValues: states } : {}),
  };
}

export function stripItemEffectContributions(character: Character): Character {
  let next = character;
  const targets = collectNumericTargets(character);
  for (const state of Object.values(character.itemEffectValues ?? {})) {
    if (targets.some((target) => numericTargetKey(target.ref) === numericTargetKey(state.target) && !target.problem)) {
      next = writeNumericTarget(next, state.target, state.base);
    }
  }
  return { ...next, itemEffectValues: {} };
}

/** Copies underlying attribute values while preserving edits made in the item's draft. */
export function getItemEffectBaseValues(character: Character | undefined, item: InventoryItem): InventoryItem {
  const owner = character?.sheets.flatMap((sheet) => sheet.widgets).find((widget) => widget.data.inventoryItems?.some((entry) => entry.id === item.id));
  if (!owner || !character?.itemEffectValues) return item;
  const state = (collection: 'inventoryItems' | 'inventoryFields', entryId: string, field: string) => (
    character.itemEffectValues?.[numericTargetKey({ kind: 'widget', widgetId: owner.id, collection, entryId, field })]
  );
  const quantity = state('inventoryItems', item.id, 'quantity');
  return {
    ...item,
    ...(item.quantity !== undefined && quantity ? { quantity: quantity.base + (item.quantity - quantity.effective) } : {}),
    fields: item.fields.map((field) => {
      const stored = field.type === 'number' && state('inventoryFields', field.id, 'value');
      return stored ? { ...field, value: stored.base + (Number(field.value) - stored.effective) } : field;
    }),
  };
}
