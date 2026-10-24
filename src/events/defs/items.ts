import type { InventoryFieldValue, InventoryItem, InventoryItemField, Widget, WidgetData } from '../../types';
import { createInventoryItem, getInventoryItemQuantity } from '../../utils/inventory';
import { getActiveNoteContent, getNoteContentUpdate } from '../../utils/noteTabs';
import {
  addToWallet,
  formatWalletAmounts,
  formatWalletTotal,
  getWalletTotal,
  spendFromWallet,
} from '../../utils/wallet';
import { findItemIndex, formatNumber, isAnyTarget, itemOptions } from '../helpers';
import type { EffectDef, EventAmount, EventOption, EventParamSpec, SpecContext, TriggerDef } from '../types';

const NAME_FILTER: EventParamSpec = {
  key: 'name',
  label: 'Item name',
  type: 'text',
  default: '',
  placeholder: 'Any item',
  help: 'Leave blank to match any item.',
};

const sameName = (a: string | undefined, b: string | undefined) => (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();
const matchesFilter = (name: string, filter: string | undefined) => !filter?.trim() || sameName(name, filter);

// ----- Inventory -----

function inventoryItems(widget: Widget | undefined): InventoryItem[] {
  return widget?.type === 'INVENTORY' ? widget.data.inventoryItems ?? [] : [];
}

const quantityOf = (item: InventoryItem) => getInventoryItemQuantity(item) ?? 1;

function inventoryTrigger(kind: string, label: string, adding: boolean): TriggerDef {
  return {
    kind,
    label,
    mode: 'state',
    params: [NAME_FILTER],
    outputs: [
      { key: 'item', label: `Item ${adding ? 'added' : 'removed'}`, type: 'text' },
      { key: 'quantity', label: `How many were ${adding ? 'added' : 'removed'}`, type: 'number' },
      { key: 'total', label: 'How many are left in the inventory', type: 'number' },
    ],
    detect: ({ prev, next, params }) => {
      const before = inventoryItems(prev);
      const after = inventoryItems(next);
      const [from, to] = adding ? [before, after] : [after, before];
      for (const item of to) {
        if (!matchesFilter(item.name, params.name)) continue;
        const old = from.find((candidate) => candidate.id === item.id);
        const change = old ? quantityOf(item) - quantityOf(old) : quantityOf(item);
        if (change <= 0) continue;
        const name = item.name.trim() || 'Unnamed item';
        const current = adding ? item : old;
        return {
          data: { item: name, quantity: change, total: current ? quantityOf(current) : 0 },
          text: `${adding ? 'Added' : 'Removed'} ${change > 1 ? `${formatNumber(change)} × ` : ''}${name}`,
        };
      }
      return null;
    },
    describe: (d) => `${d.params.name?.trim() || 'An item'} is ${adding ? 'added to' : 'removed from'} ${d.widget}`,
  };
}

export const inventoryAddedTrigger = inventoryTrigger('inventory.added', 'An item is added', true);
export const inventoryRemovedTrigger = inventoryTrigger('inventory.removed', 'An item is removed', false);

// Field names found in the default fields and on the items, for field targets.
function fieldNameOptions({ widget }: SpecContext): EventOption[] {
  const names = new Map<string, string>();
  const add = (name: string | undefined) => {
    const trimmed = name?.trim();
    if (trimmed && !names.has(trimmed.toLowerCase())) names.set(trimmed.toLowerCase(), trimmed);
  };
  if (widget?.type === 'INVENTORY') (widget.data.inventoryDefaultFields ?? []).forEach((template) => add(template.name));
  inventoryItems(widget).forEach((item) => item.fields.forEach((field) => add(field.name)));
  return [...names.values()].map((name) => ({ value: name, label: name }));
}

const ANY_FIELD = 'Any field';

/** A field's value for formulas: checkboxes read as 1 or 0. */
function fieldValue(field: InventoryItemField): number | string {
  if (field.type === 'checkbox') return field.value === true ? 1 : 0;
  if (field.type === 'number') {
    const value = Number(field.value);
    return Number.isFinite(value) ? value : 0;
  }
  return String(field.value ?? '');
}

function showField(field: InventoryItemField): string {
  if (field.type === 'checkbox') return field.value === true ? 'checked' : 'unchecked';
  const value = fieldValue(field);
  return typeof value === 'number' ? formatNumber(value) : `"${value}"`;
}

const itemName = (item: InventoryItem) => item.name.trim() || 'Unnamed item';

export const inventoryFieldChangedTrigger: TriggerDef = {
  kind: 'inventory.fieldChanged',
  label: "An item's field changes",
  mode: 'state',
  target: { label: 'Field', options: fieldNameOptions, any: ANY_FIELD },
  params: [NAME_FILTER],
  outputs: [
    { key: 'item', label: 'Item that changed', type: 'text' },
    { key: 'field', label: 'Field that changed', type: 'text' },
    { key: 'value', label: 'New value (1 or 0 for a checkbox)', type: 'number' },
    { key: 'before', label: 'Value before', type: 'number' },
  ],
  detect: ({ prev, next, trigger, params }) => {
    const before = inventoryItems(prev);
    for (const item of inventoryItems(next)) {
      if (!matchesFilter(item.name, params.name)) continue;
      const old = before.find((candidate) => candidate.id === item.id);
      if (!old || old === item) continue;
      for (const field of item.fields) {
        if (!isAnyTarget(trigger.target) && !sameName(field.name, trigger.target)) continue;
        const oldField = old.fields.find((candidate) => candidate.id === field.id);
        if (!oldField || fieldValue(oldField) === fieldValue(field)) continue;
        return {
          data: { item: itemName(item), field: field.name, value: fieldValue(field), before: fieldValue(oldField) },
          text: `${itemName(item)} · ${field.name}: ${showField(oldField)} → ${showField(field)}`,
        };
      }
    }
    return null;
  },
  describe: (d) => `${d.target === ANY_FIELD ? 'Any field' : d.target} of ${d.params.name?.trim() || 'any item'} changes in ${d.widget}`,
};

// The new value for a field of this type, or a reason it can't be used.
function convertFieldValue(field: InventoryItemField, amount: EventAmount | null, text: string): InventoryFieldValue | { error: string } {
  if (field.type === 'number') {
    const value = amount?.value ?? Number(text.trim());
    return text.trim() && Number.isFinite(value) ? value : { error: `"${text}" isn't a number` };
  }
  if (field.type === 'checkbox') return amount ? amount.value !== 0 : /^(true|yes|on|checked|x)$/i.test(text.trim());
  return amount ? formatNumber(amount.value) : text;
}

export const inventorySetFieldEffect: EffectDef = {
  kind: 'inventory.setField',
  label: "Change an item's field",
  target: { label: 'Field', options: fieldNameOptions },
  params: [
    { key: 'name', label: 'Item name', type: 'text', default: '', placeholder: 'Every item with this field', help: 'Leave blank to change every item that has the field. Use {formulas} to insert values.' },
    { key: 'value', label: 'New value', type: 'formula', default: '', placeholder: '3, @level or {@event_item} notes', help: 'A number or formula; 1 or 0 for a checkbox. Text works too; wrap formulas inside text in {braces}.' },
  ],
  apply: (ctx) => {
    const fieldName = ctx.effect.target;
    if (!ctx.widget || ctx.widget.type !== 'INVENTORY' || !fieldName) return null;
    const filter = ctx.text('name').trim();
    const amount = (ctx.params.value ?? '').trim() ? ctx.amount('value') : null;
    const text = amount ? formatNumber(amount.value) : ctx.text('value');
    const detail = amount?.roll ? ` (${amount.text})` : '';
    let matched = 0;
    let computed = 0;
    let error = '';
    let shownName = fieldName;
    const changes: string[] = [];
    const items = ctx.widget.data.inventoryItems ?? [];
    const next = items.map((item) => {
      if (!matchesFilter(item.name, filter)) return item;
      const index = item.fields.findIndex((field) => sameName(field.name, fieldName));
      if (index < 0) return item;
      matched += 1;
      const field = item.fields[index];
      shownName = field.name;
      if (field.valueFormula?.trim()) {
        computed += 1;
        return item;
      }
      const value = convertFieldValue(field, amount, text);
      if (typeof value === 'object') {
        error = value.error;
        return item;
      }
      if (value === field.value) return item;
      const updated = { ...field, value };
      changes.push(`${itemName(item)} · ${field.name}: ${showField(field)} → ${showField(updated)}`);
      const fields = [...item.fields];
      fields[index] = updated;
      return { ...item, fields };
    });
    if (matched === 0) return { text: `${filter || 'No item'}${filter ? ' has no' : ' has a'} ${fieldName} field` };
    if (changes.length === 0) {
      if (error) return { text: `${shownName}: ${error}` };
      return { text: computed === matched ? `${shownName} is computed by a formula and can't be changed` : `${shownName} stays the same` };
    }
    return {
      data: { inventoryItems: next },
      text: `${changes.length === 1 ? changes[0] : `${shownName} changed on ${changes.length} items`}${detail}`,
    };
  },
  describe: (d) => `Set ${d.target || '?'} of ${d.params.name?.trim() || 'every item'} in ${d.widget} to ${d.params.value?.trim() || '""'}`,
};

export const inventoryAddEffect: EffectDef = {
  kind: 'inventory.add',
  label: 'Add an item',
  params: [
    { key: 'name', label: 'Item name', type: 'text', default: '', placeholder: 'Healing potion', help: 'Use {formulas} to insert values.' },
    { key: 'quantity', label: 'Quantity', type: 'amount', default: '1', placeholder: '1 or 1d4' },
  ],
  apply: (ctx) => {
    if (!ctx.widget || ctx.widget.type !== 'INVENTORY') return null;
    const name = ctx.text('name').trim();
    if (!name) return { text: 'No item name' };
    const amount = ctx.amount('quantity');
    const quantity = Math.max(0, Math.floor(amount?.value ?? 1));
    if (quantity === 0) return { text: `Added no ${name}` };
    const items = ctx.widget.data.inventoryItems ?? [];
    const index = items.findIndex((item) => sameName(item.name, name));
    const detail = amount?.roll ? ` (${amount.text})` : '';
    if (index >= 0) {
      const item = items[index];
      const next = [...items];
      next[index] = { ...item, quantity: quantityOf(item) + quantity };
      return { data: { inventoryItems: next }, text: `Added ${formatNumber(quantity)} × ${item.name} (now ${formatNumber(quantityOf(item) + quantity)})${detail}` };
    }
    const created = createInventoryItem(name, ctx.widget.data.inventoryDefaultFields ?? []);
    if (quantity !== 1) created.quantity = quantity;
    return { data: { inventoryItems: [...items, created] }, text: `Added ${quantity !== 1 ? `${formatNumber(quantity)} × ` : ''}${name}${detail}` };
  },
  describe: (d) => `Add ${d.params.quantity && d.params.quantity !== '1' ? `${d.params.quantity} × ` : ''}${d.params.name || '?'} to ${d.widget}`,
};

export const inventoryRemoveEffect: EffectDef = {
  kind: 'inventory.remove',
  label: 'Remove an item',
  params: [
    { key: 'name', label: 'Item name', type: 'text', default: '', placeholder: 'Healing potion', help: 'Use {formulas} to insert values.' },
    { key: 'quantity', label: 'Quantity (blank = all)', type: 'amount', default: '1', placeholder: 'all' },
  ],
  apply: (ctx) => {
    if (!ctx.widget || ctx.widget.type !== 'INVENTORY') return null;
    const name = ctx.text('name').trim();
    const items = ctx.widget.data.inventoryItems ?? [];
    const index = items.findIndex((item) => sameName(item.name, name));
    if (index < 0) return { text: `No ${name || 'item'} to remove` };
    const item = items[index];
    const have = quantityOf(item);
    const wanted = ctx.params.quantity?.trim() ? Math.max(0, Math.floor(ctx.amount('quantity')?.value ?? 1)) : have;
    if (wanted === 0) return { text: `Removed no ${item.name}` };
    const left = have - wanted;
    if (left <= 0) {
      return { data: { inventoryItems: items.filter((_, itemIndex) => itemIndex !== index) }, text: `Removed ${have > 1 ? `all ${formatNumber(have)} × ` : ''}${item.name}` };
    }
    const next = [...items];
    next[index] = { ...item, quantity: left };
    return { data: { inventoryItems: next }, text: `Removed ${formatNumber(wanted)} × ${item.name} (${formatNumber(left)} left)` };
  },
  describe: (d) => `Remove ${d.params.quantity?.trim() ? (d.params.quantity === '1' ? '' : `${d.params.quantity} × `) : 'all '}${d.params.name || '?'} from ${d.widget}`,
};

// ----- Wallet -----

function walletCurrencies(widget: Widget | undefined) {
  return widget?.type === 'WALLET' ? widget.data.walletCurrencies ?? [] : [];
}

export const walletChangedTrigger: TriggerDef = {
  kind: 'wallet.changed',
  label: 'Money is gained or spent',
  mode: 'state',
  params: [{
    key: 'direction',
    label: 'When money is',
    type: 'select',
    options: [
      { value: 'up', label: 'gained' },
      { value: 'down', label: 'spent' },
      { value: 'any', label: 'gained or spent' },
    ],
    default: 'up',
  }],
  outputs: [
    { key: 'amount', label: 'Money gained or spent, in the first currency', type: 'number' },
    { key: 'change', label: 'Change in money, negative when spent', type: 'number' },
    { key: 'total', label: 'Total money now, in the first currency', type: 'number' },
  ],
  detect: ({ prev, next, params }) => {
    const before = walletCurrencies(prev);
    const after = walletCurrencies(next);
    if (after.length === 0 || before.length !== after.length) return null;
    const delta = getWalletTotal(after) - getWalletTotal(before);
    if (delta === 0 || (params.direction === 'up' && delta < 0) || (params.direction === 'down' && delta > 0)) return null;
    return {
      data: { amount: Math.abs(delta), change: delta, total: getWalletTotal(after) },
      text: `${delta > 0 ? 'Gained' : 'Spent'} money (${formatWalletTotal(before)} → ${formatWalletTotal(after)})`,
    };
  },
  describe: (d) => `Money is ${d.params.direction === 'down' ? 'spent from' : d.params.direction === 'any' ? 'gained or spent in' : 'added to'} ${d.widget}`,
};

const CURRENCY_TARGET = {
  label: 'Currency',
  options: ({ widget }: { widget?: Widget }) => itemOptions(walletCurrencies(widget), (currency) => currency.name, 'Currency'),
};

function walletEffect(kind: string, label: string, spending: boolean): EffectDef {
  return {
    kind,
    label,
    target: CURRENCY_TARGET,
    params: [{ key: 'amount', label: 'Amount', type: 'amount', default: '1', placeholder: '10, @gold or 2d6' }],
    apply: (ctx) => {
      const currencies = walletCurrencies(ctx.widget);
      const index = findItemIndex(currencies, ctx.effect.target, (currency) => currency.name);
      if (index < 0) return null;
      const amount = ctx.amount('amount');
      if (!amount) return { text: 'The amount isn\'t valid' };
      const coins = Math.max(0, Math.floor(amount.value));
      const amounts = currencies.map((_, currencyIndex) => (currencyIndex === index ? coins : 0));
      const paid = formatWalletAmounts(currencies, amounts);
      const detail = amount.roll ? ` (${amount.text})` : '';
      if (coins === 0) return { text: `${spending ? 'Spent' : 'Added'} nothing${detail}` };
      const next = spending ? spendFromWallet(currencies, amounts) : addToWallet(currencies, amounts);
      if (!next) return { text: `Couldn't afford ${paid} (have ${formatWalletTotal(currencies)})` };
      return { data: { walletCurrencies: next }, text: `${spending ? 'Spent' : 'Added'} ${paid}${detail} → ${formatWalletAmounts(next)}` };
    },
    describe: (d) => `${spending ? 'Spend' : 'Add'} ${d.params.amount || '1'} ${d.target || ''} ${spending ? 'from' : 'to'} ${d.widget}`.replace(/\s+/g, ' '),
  };
}

export const walletAddEffect = walletEffect('wallet.add', 'Add money', false);
export const walletSpendEffect = walletEffect('wallet.spend', 'Spend money', true);

// ----- List -----

function listEntries(data: WidgetData): string[] {
  const count = Math.max(0, data.itemCount ?? 5);
  return Array.from({ length: count }, (_, index) => data.items?.[index] || '');
}

export const listAddEffect: EffectDef = {
  kind: 'list.add',
  label: 'Add an entry',
  params: [{ key: 'text', label: 'Text', type: 'text', default: '', placeholder: 'New entry', help: 'Use {formulas} to insert values.' }],
  apply: (ctx) => {
    if (!ctx.widget || ctx.widget.type !== 'LIST') return null;
    const text = ctx.text('text').trim();
    if (!text) return { text: 'No text to add' };
    const entries = listEntries(ctx.widget.data);
    const empty = entries.findIndex((entry) => !entry.trim());
    if (empty >= 0) {
      entries[empty] = text;
      return { data: { items: entries }, text: `Added "${text}"` };
    }
    return { data: { items: [...entries, text], itemCount: entries.length + 1 }, text: `Added "${text}"` };
  },
  describe: (d) => `Add "${d.params.text || '?'}" to ${d.widget}`,
};

export const listRemoveEffect: EffectDef = {
  kind: 'list.remove',
  label: 'Clear an entry',
  params: [{ key: 'text', label: 'Text', type: 'text', default: '', placeholder: 'Entry to clear', help: 'The first entry with this text is cleared.' }],
  apply: (ctx) => {
    if (!ctx.widget || ctx.widget.type !== 'LIST') return null;
    const text = ctx.text('text').trim();
    const entries = listEntries(ctx.widget.data);
    const index = entries.findIndex((entry) => sameName(entry, text));
    if (!text || index < 0) return { text: `No "${text}" entry to clear` };
    entries[index] = '';
    return { data: { items: entries }, text: `Cleared "${text}"` };
  },
  describe: (d) => `Clear "${d.params.text || '?'}" from ${d.widget}`,
};

// ----- Notes & heading -----

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const notesAppendEffect: EffectDef = {
  kind: 'notes.append',
  label: 'Add a line to the notes',
  params: [{ key: 'text', label: 'Text', type: 'text', default: '', placeholder: 'Took {@damage} damage', help: 'Use {formulas} to insert values.' }],
  apply: (ctx) => {
    if (!ctx.widget || ctx.widget.type !== 'TEXT') return null;
    const line = ctx.text('text');
    if (!line.trim()) return { text: 'No text to add' };
    const content = getActiveNoteContent(ctx.widget.data);
    const text = content.text ? `${content.text}\n${line}` : line;
    const richText = content.richText !== undefined
      ? `${content.richText}<p>${escapeHtml(line)}</p>`
      : undefined;
    return {
      data: getNoteContentUpdate(ctx.widget.data, richText !== undefined ? { text, richText } : { text }),
      text: `Added "${line}"`,
    };
  },
  describe: (d) => `Add "${d.params.text || '?'}" to ${d.widget}`,
};

export const headingSetEffect: EffectDef = {
  kind: 'heading.set',
  label: 'Change the text',
  params: [{ key: 'text', label: 'Text', type: 'text', default: '', placeholder: 'Bloodied!', help: 'Use {formulas} to insert values.' }],
  apply: (ctx) => {
    if (!ctx.widget || ctx.widget.type !== 'LABEL') return null;
    const text = ctx.text('text');
    if (text === (ctx.widget.data.label ?? '')) return { text: `Text is already "${text}"` };
    return { data: { label: text }, text: `Text → "${text}"` };
  },
  describe: (d) => `Set ${d.widget} to "${d.params.text || ''}"`,
};

export const INVENTORY_TRIGGERS = [inventoryAddedTrigger, inventoryRemovedTrigger, inventoryFieldChangedTrigger];
export const INVENTORY_EFFECTS = [inventoryAddEffect, inventoryRemoveEffect, inventorySetFieldEffect];
export const WALLET_TRIGGERS = [walletChangedTrigger];
export const WALLET_EFFECTS = [walletAddEffect, walletSpendEffect];
export const LIST_EFFECTS = [listAddEffect, listRemoveEffect];
export const NOTES_EFFECTS = [notesAppendEffect];
export const HEADING_EFFECTS = [headingSetEffect];
