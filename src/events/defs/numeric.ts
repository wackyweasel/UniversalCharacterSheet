import type { Widget, WidgetData, WidgetType } from '../../types';
import { getPoolSize, MAX_POOL_BONUS, MAX_POOL_DICE, normalizePoolBonus } from '../../utils/dicePool';
import { getInventoryItemQuantity, getInventoryLoad, normalizeInventoryQuantity } from '../../utils/inventory';
import { DEFAULT_MIXED_FIELD_DICE_CHAIN } from '../../utils/mixedFields';
import { getClockSegments, getClockValue } from '../../utils/progressClock';
import { normalizeSkillPoints } from '../../utils/skillTree';
import { formatTrackModifier, getTrackBounds, getTrackModifier, getTrackValue, getTrackZone, sortTrackThresholds } from '../../utils/thresholdTrack';
import { getWalletCurrencyName, getWalletTotal, normalizeWalletAmount } from '../../utils/wallet';
import { getExperienceProgress, normalizeFirstLevel, normalizeXp } from '../../utils/experienceLevel';
import {
  clampNumber,
  COMPARISON_OPTIONS,
  compareValues,
  DIRECTION_OPTIONS,
  directionMatches,
  formatNumber,
  getComparisonText,
  getDirectionText,
  isAnyTarget,
  itemKey,
  itemTitle,
  resolveThreshold,
  VALUE_CHANGE_OUTPUTS,
  valueChangeData,
} from '../helpers';
import type { DescribeContext, EffectContext, EffectDef, EffectOutcome, EventParamSpec, StateTriggerContext, TriggerDef } from '../types';

/** A number inside a widget that triggers can watch and effects can change. */
export interface NumericSlot {
  key: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
  /** Absent when a formula computes the value or it can't be set directly. */
  set?: (value: number) => Partial<WidgetData>;
}

export const DEFAULT_STEP_DICE_CHAIN = ['1d4', '1d6', '1d8', '1d10', '1d12', '1d20'];

const finite = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
const optional = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);
const hasFormula = (formula: unknown) => typeof formula === 'string' && formula.trim() !== '';

function fieldSlot(
  data: WidgetData,
  key: string,
  label: string,
  field: 'currentValue' | 'temporaryValue' | 'maxValue' | 'currentPool',
  value: number,
  bounds: { min?: number; max?: number },
): NumericSlot {
  return {
    key,
    label,
    value,
    ...bounds,
    set: hasFormula(data.fieldFormulas?.[field]) ? undefined : (next) => ({ [field]: next }),
  };
}

function replaceAt<T>(items: T[], index: number, item: T): T[] {
  const next = [...items];
  next[index] = item;
  return next;
}

const SLOT_PROVIDERS: Partial<Record<WidgetType, (data: WidgetData) => NumericSlot[]>> = {
  HEALTH_BAR: (data) => {
    const max = Math.max(0, finite(data.maxValue, 10));
    const slots = [fieldSlot(data, 'current', 'Current HP', 'currentValue', finite(data.currentValue, 10), { min: 0, max })];
    if (data.enableTemporaryHp) slots.push(fieldSlot(data, 'temp', 'Temporary HP', 'temporaryValue', finite(data.temporaryValue, 0), { min: 0 }));
    slots.push(fieldSlot(data, 'max', 'Max HP', 'maxValue', max, { min: 0 }));
    return slots;
  },
  PROGRESS_BAR: (data) => [
    fieldSlot(data, 'current', 'Value', 'currentValue', finite(data.currentValue, 0), { min: finite(data.minValue, 0), max: finite(data.maxValue, 100) }),
  ],
  THRESHOLD_TRACK: (data) => [fieldSlot(data, 'current', 'Value', 'currentValue', finite(data.currentValue, 0), getTrackBounds(data))],
  XP_LEVEL: (data) => {
    const slots = [fieldSlot(data, 'current', 'XP', 'currentValue', normalizeXp(data.currentValue), { min: 0 })];
    const progress = getExperienceProgress(data.xpLevels, data.currentValue, data.xpFirstLevel);
    if (progress) {
      const first = normalizeFirstLevel(data.xpFirstLevel);
      // Read-only: the level follows the XP, so triggers can watch it but effects can't set it.
      slots.push({ key: 'level', label: 'Level', value: progress.level, min: first, max: first + (data.xpLevels?.length ?? 1) - 1 });
    }
    return slots;
  },
  SKILL_TREE: (data) => [fieldSlot(data, 'current', 'Points', 'currentValue', normalizeSkillPoints(data.currentValue), { min: 0 })],
  POOL: (data) => {
    const resources = data.poolResources ?? [];
    if (resources.length === 0) {
      return [fieldSlot(data, 'current', 'Current', 'currentPool', finite(data.currentPool, 5), { min: 0, max: finite(data.maxPool, 5) })];
    }
    return resources.map((resource, index) => ({
      key: itemKey(resource.name, index),
      label: itemTitle(resource.name, index, 'Resource'),
      value: finite(resource.current, 0),
      min: 0,
      max: finite(resource.max, 0),
      set: hasFormula(resource.currentFormula) ? undefined : (next) => ({ poolResources: replaceAt(resources, index, { ...resource, current: next }) }),
    }));
  },
  NUMBER: (data) => (data.numberItems ?? []).map((item, index) => ({
    key: itemKey(item.name, index),
    label: itemTitle(item.name, index, 'Number'),
    value: finite(item.value, 0),
    min: optional(item.minValue),
    max: optional(item.maxValue),
    set: hasFormula(item.valueFormula) ? undefined : (next) => ({ numberItems: replaceAt(data.numberItems ?? [], index, { ...item, value: next }) }),
  })),
  NUMBER_DISPLAY: (data) => (data.displayNumbers ?? []).map((item, index) => ({
    key: itemKey(item.label, index),
    label: itemTitle(item.label, index, 'Number'),
    value: finite(item.value, 0),
    min: optional(item.minValue),
    max: optional(item.maxValue),
    set: hasFormula(item.valueFormula) ? undefined : (next) => ({ displayNumbers: replaceAt(data.displayNumbers ?? [], index, { ...item, value: next }) }),
  })),
  PROGRESS_CLOCK: (data) => (data.clockItems ?? []).map((clock, index) => ({
    key: itemKey(clock.name, index, clock.id),
    label: itemTitle(clock.name, index, 'Clock'),
    value: getClockValue(clock.value, clock.segments),
    min: 0,
    max: getClockSegments(clock.segments),
    set: hasFormula(clock.valueFormula) ? undefined : (next) => ({ clockItems: replaceAt(data.clockItems ?? [], index, { ...clock, value: Math.round(next) }) }),
  })),
  SPELL_SLOT: (data) => (data.spellLevels ?? []).map((level, index) => ({
    key: `level:${level.level}`,
    label: `Level ${level.level} slots left`,
    value: Math.max(0, level.max - level.used),
    min: 0,
    max: level.max,
    set: (next) => ({ spellLevels: replaceAt(data.spellLevels ?? [], index, { ...level, used: Math.max(0, Math.min(level.max, level.max - Math.round(next))) }) }),
  })),
  STEP_DICE: (data) => {
    const chain = data.stepDiceChain?.length ? data.stepDiceChain : DEFAULT_STEP_DICE_CHAIN;
    return (data.stepDiceItems ?? []).map((item, index) => ({
      key: itemKey(item.name, index),
      label: `${itemTitle(item.name, index, 'Trait')} step`,
      value: finite(item.currentStep, 0),
      min: 0,
      max: chain.length - 1,
      set: (next) => ({ stepDiceItems: replaceAt(data.stepDiceItems ?? [], index, { ...item, currentStep: Math.round(next) }) }),
    }));
  },
  MIXED_FIELDS: (data) => {
    const fields = data.mixedFields ?? [];
    const slots: NumericSlot[] = [];
    fields.forEach((field, index) => {
      const base = { key: itemKey(field.name, index), label: itemTitle(field.name, index, 'Field') };
      if (field.type === 'number') {
        slots.push({ ...base, value: finite(field.value, 0), min: optional(field.minValue), max: optional(field.maxValue), set: hasFormula(field.valueFormula) ? undefined : (next) => ({ mixedFields: replaceAt(fields, index, { ...field, value: next }) }) });
      } else if (field.type === 'progress') {
        slots.push({ ...base, value: finite(field.current, 0), min: finite(field.min, 0), max: finite(field.max, 100), set: hasFormula(field.currentFormula) ? undefined : (next) => ({ mixedFields: replaceAt(fields, index, { ...field, current: next }) }) });
      } else if (field.type === 'resource') {
        slots.push({ ...base, value: finite(field.current, 0), min: 0, max: finite(field.max, 0), set: hasFormula(field.currentFormula) ? undefined : (next) => ({ mixedFields: replaceAt(fields, index, { ...field, current: next }) }) });
      } else if (field.type === 'step-dice') {
        const chain = field.diceChain?.length ? field.diceChain : DEFAULT_MIXED_FIELD_DICE_CHAIN;
        slots.push({ ...base, label: `${base.label} step`, value: finite(field.currentStep, 0), min: 0, max: chain.length - 1, set: (next) => ({ mixedFields: replaceAt(fields, index, { ...field, currentStep: Math.round(next) }) }) });
      }
    });
    return slots;
  },
  INVENTORY: (data) => {
    const items = data.inventoryItems ?? [];
    const slots: NumericSlot[] = items.flatMap((item, index) => {
      const quantity = getInventoryItemQuantity(item);
      if (quantity === undefined) return [];
      return [{
        key: item.id,
        label: `${itemTitle(item.name, index, 'Item')} quantity`,
        value: quantity,
        min: 0,
        set: (next: number) => ({ inventoryItems: replaceAt(items, index, { ...item, quantity: normalizeInventoryQuantity(next) ?? 0 }) }),
      }];
    });
    const encumbrance = data.inventoryEncumbrance;
    if (encumbrance?.enabled) {
      const unit = encumbrance.unit?.trim();
      // Read-only: the weight follows the items, and 100% means the bag is full.
      slots.push({ key: 'load', label: `Carried weight${unit ? ` (${unit})` : ''}`, value: getInventoryLoad(items), min: 0, max: optional(encumbrance.localCapacity) });
    }
    return slots;
  },
  WALLET: (data) => {
    const currencies = data.walletCurrencies ?? [];
    const slots: NumericSlot[] = currencies.map((currency, index) => ({
      key: itemKey(currency.name, index),
      label: getWalletCurrencyName(currency, index),
      value: normalizeWalletAmount(currency.amount),
      min: 0,
      set: (next) => ({ walletCurrencies: replaceAt(currencies, index, { ...currency, amount: normalizeWalletAmount(next) }) }),
    }));
    if (currencies.length > 1) {
      slots.push({ key: 'total', label: `Total value (in ${getWalletCurrencyName(currencies[0], 0)})`, value: getWalletTotal(currencies), min: 0 });
    }
    return slots;
  },
  DICE_POOL: (data) => [
    {
      key: 'bonus',
      label: 'Bonus dice',
      value: normalizePoolBonus(data.dicePoolBonus),
      min: -MAX_POOL_BONUS,
      max: MAX_POOL_BONUS,
      set: (next) => ({ dicePoolBonus: normalizePoolBonus(next) }),
    },
    // Read-only: the active traits plus the bonus dice.
    { key: 'size', label: 'Dice in the pool', value: getPoolSize(data), min: 0, max: MAX_POOL_DICE },
  ],
};

export const NUMERIC_WIDGET_TYPES = Object.keys(SLOT_PROVIDERS) as WidgetType[];

export function getNumericSlots(widget: Widget | undefined): NumericSlot[] {
  if (!widget) return [];
  return SLOT_PROVIDERS[widget.type]?.(widget.data) ?? [];
}

export function findNumericSlot(widget: Widget | undefined, key: string | undefined): NumericSlot | undefined {
  const slots = getNumericSlots(widget);
  if (!key) return slots[0];
  const lower = key.toLowerCase();
  return slots.find((slot) => slot.key === key) ?? slots.find((slot) => slot.key.toLowerCase() === lower);
}

function subject(d: DescribeContext): string {
  return d.target ? `${d.widget} · ${d.target}` : d.widget;
}

const slotTarget = (settableOnly: boolean) => ({
  label: 'Value',
  options: ({ widget }: { widget?: Widget }) => getNumericSlots(widget)
    .filter((slot) => !settableOnly || slot.set)
    .map((slot) => ({ value: slot.key, label: slot.label })),
});

function readSlots(ctx: StateTriggerContext) {
  const prev = findNumericSlot(ctx.prev, ctx.trigger.target);
  const next = findNumericSlot(ctx.next, ctx.trigger.target);
  return prev && next ? { prev, next } : null;
}

export const valueChangedTrigger: TriggerDef = {
  kind: 'value.changed',
  label: 'A value changes',
  mode: 'state',
  target: slotTarget(false),
  params: [{ key: 'direction', label: 'When it', type: 'select', options: DIRECTION_OPTIONS, default: 'any' }],
  outputs: VALUE_CHANGE_OUTPUTS,
  detect: (ctx) => {
    const slots = readSlots(ctx);
    if (!slots) return null;
    const delta = slots.next.value - slots.prev.value;
    if (!directionMatches(ctx.params.direction, delta)) return null;
    return {
      data: valueChangeData(slots.prev.value, slots.next.value),
      text: `${slots.next.label} ${formatNumber(slots.prev.value)} → ${formatNumber(slots.next.value)}`,
    };
  },
  describe: (d) => `${subject(d)} ${getDirectionText(d.params.direction)}`,
};

export const THRESHOLD_HELP = 'A number or formula, a percentage of the range such as 50%, or max / min.';

export const valueCrossesTrigger: TriggerDef = {
  kind: 'value.crosses',
  label: 'A value crosses a threshold',
  mode: 'state',
  target: slotTarget(false),
  params: [
    { key: 'compare', label: 'When it', type: 'select', options: COMPARISON_OPTIONS, default: 'below' },
    { key: 'threshold', label: 'Threshold', type: 'formula', default: '50%', placeholder: '50%', help: THRESHOLD_HELP },
  ],
  outputs: VALUE_CHANGE_OUTPUTS,
  detect: (ctx) => {
    const slots = readSlots(ctx);
    if (!slots || slots.prev.value === slots.next.value) return null;
    const before = resolveThreshold(ctx.params.threshold, ctx.prevLabels(), slots.prev);
    const after = resolveThreshold(ctx.params.threshold, ctx.nextLabels(), slots.next);
    if (before === null || after === null) return null;
    if (compareValues(ctx.params.compare, slots.prev.value, before) || !compareValues(ctx.params.compare, slots.next.value, after)) return null;
    return {
      data: valueChangeData(slots.prev.value, slots.next.value),
      text: `${slots.next.label} ${getComparisonText(ctx.params.compare)} ${formatNumber(after)} (${formatNumber(slots.prev.value)} → ${formatNumber(slots.next.value)})`,
    };
  },
  describe: (d) => `${subject(d)} ${getComparisonText(d.params.compare)} ${d.params.threshold || '?'}`,
};

const CLAMP_PARAM: EventParamSpec = {
  key: 'clamp',
  label: 'Limits',
  type: 'select',
  options: [
    { value: 'yes', label: 'Stay within min and max' },
    { value: 'no', label: 'Allow going past them' },
  ],
  default: 'yes',
};

function changeSlot(ctx: EffectContext, compute: (slot: NumericSlot) => { value: number; detail?: string } | string): EffectOutcome | null {
  const slot = findNumericSlot(ctx.widget, ctx.effect.target);
  if (!slot) return null;
  if (!slot.set) return { text: `${slot.label} is computed and can't be changed directly` };
  const computed = compute(slot);
  if (typeof computed === 'string') return { text: computed };
  const next = ctx.params.clamp === 'no' ? computed.value : clampNumber(computed.value, slot.min, slot.max);
  if (next === slot.value) return { text: `${slot.label} stays at ${formatNumber(next)}${computed.detail ? ` (${computed.detail})` : ''}` };
  return {
    data: slot.set(next),
    text: `${slot.label} ${formatNumber(slot.value)} → ${formatNumber(next)}${computed.detail ? ` (${computed.detail})` : ''}`,
  };
}

const AMOUNT_PARAM: EventParamSpec = {
  key: 'amount',
  label: 'Amount',
  type: 'amount',
  default: '1',
  placeholder: '1, @level or 1d6+2',
  help: 'A number, a formula or dice to roll.',
};

export const valueAddEffect: EffectDef = {
  kind: 'value.add',
  label: 'Increase a value',
  target: slotTarget(true),
  params: [AMOUNT_PARAM, CLAMP_PARAM],
  apply: (ctx) => changeSlot(ctx, (slot) => {
    const amount = ctx.amount('amount');
    if (!amount) return `${slot.label}: the amount isn't valid`;
    return { value: slot.value + amount.value, detail: `+${amount.text}` };
  }),
  describe: (d) => `Increase ${subject(d)} by ${d.params.amount || '1'}`,
};

export const valueSubtractEffect: EffectDef = {
  kind: 'value.subtract',
  label: 'Decrease a value',
  target: slotTarget(true),
  params: [AMOUNT_PARAM, CLAMP_PARAM],
  apply: (ctx) => changeSlot(ctx, (slot) => {
    const amount = ctx.amount('amount');
    if (!amount) return `${slot.label}: the amount isn't valid`;
    return { value: slot.value - amount.value, detail: `−${amount.text}` };
  }),
  describe: (d) => `Decrease ${subject(d)} by ${d.params.amount || '1'}`,
};

export const valueSetEffect: EffectDef = {
  kind: 'value.set',
  label: 'Set a value',
  target: slotTarget(true),
  params: [{ ...AMOUNT_PARAM, label: 'New value', default: '0' }, CLAMP_PARAM],
  apply: (ctx) => changeSlot(ctx, (slot) => {
    const amount = ctx.amount('amount');
    if (!amount) return `${slot.label}: the new value isn't valid`;
    return { value: amount.value, detail: amount.roll ? amount.text : undefined };
  }),
  describe: (d) => `Set ${subject(d)} to ${d.params.amount || '0'}`,
};

export const valueFillEffect: EffectDef = {
  kind: 'value.fill',
  label: 'Fill a value to its max',
  target: slotTarget(true),
  apply: (ctx) => changeSlot(ctx, (slot) => (slot.max === undefined ? `${slot.label} has no maximum` : { value: slot.max })),
  describe: (d) => `Fill ${subject(d)} to max`,
};

export const valueEmptyEffect: EffectDef = {
  kind: 'value.empty',
  label: 'Empty a value to its min',
  target: slotTarget(true),
  apply: (ctx) => changeSlot(ctx, (slot) => ({ value: slot.min ?? 0 })),
  describe: (d) => `Empty ${subject(d)}`,
};

export const NUMERIC_TRIGGERS = [valueChangedTrigger, valueCrossesTrigger];
export const NUMERIC_EFFECTS = [valueAddEffect, valueSubtractEffect, valueSetEffect, valueFillEffect, valueEmptyEffect];

// ----- Threshold track zones -----

const trackZoneOf = (widget: Widget) => getTrackZone(widget.data.trackThresholds, getTrackValue(widget.data), widget.data.trackThresholdMode ?? 'rising');
const ANY_ZONE = 'Any zone';

const ZONE_WAY_OPTIONS = [
  { value: 'any', label: 'either way' },
  { value: 'deeper', label: 'deeper into the track' },
  { value: 'back', label: 'back toward the start' },
];

export const trackZoneTrigger: TriggerDef = {
  kind: 'track.zone',
  label: 'Enters a zone',
  mode: 'state',
  target: {
    label: 'Zone',
    options: ({ widget }) => sortTrackThresholds(widget?.data.trackThresholds, widget?.data.trackThresholdMode ?? 'rising')
      .map((threshold, index) => ({ value: threshold.id, label: threshold.name?.trim() || `Zone ${index + 1}` })),
    any: ANY_ZONE,
    missing: 'a deleted zone',
  },
  params: [{ key: 'way', label: 'Moving', type: 'select', options: ZONE_WAY_OPTIONS, default: 'any' }],
  outputs: [
    { key: 'zone', label: 'Zone entered', type: 'text' },
    { key: 'modifier', label: "The zone's modifier", type: 'number' },
    { key: 'level', label: 'Zones reached (1 for the first)', type: 'number' },
    { key: 'value', label: 'Track value', type: 'number' },
  ],
  detect: ({ prev, next, trigger, params }) => {
    if (!prev || !next) return null;
    const before = trackZoneOf(prev);
    const after = trackZoneOf(next);
    const zone = after.threshold;
    if (!zone || (after.level === before.level && zone.id === before.threshold?.id)) return null;
    if (!isAnyTarget(trigger.target) && zone.id !== trigger.target) return null;
    if (params.way === 'deeper' && after.level <= before.level) return null;
    if (params.way === 'back' && after.level >= before.level) return null;
    const name = zone.name?.trim() || `Zone ${after.level}`;
    const modifier = getTrackModifier(after);
    return {
      data: { zone: name, modifier, level: after.level, value: getTrackValue(next.data) },
      text: `Entered ${name}${modifier ? ` (${formatTrackModifier(modifier)})` : ''}`,
    };
  },
  describe: (d) => {
    const way = d.params.way === 'deeper' ? ', going deeper' : d.params.way === 'back' ? ', coming back' : '';
    return `${d.widget} enters ${d.target === ANY_ZONE ? 'any zone' : `"${d.target}"`}${way}`;
  },
};

// ----- Experience levels -----

const progressOf = (widget: Widget) => getExperienceProgress(widget.data.xpLevels, widget.data.currentValue, widget.data.xpFirstLevel);

export const xpLevelChangedTrigger: TriggerDef = {
  kind: 'xp.levelChanged',
  label: 'The level changes',
  mode: 'state',
  params: [{ key: 'direction', label: 'When it', type: 'select', options: DIRECTION_OPTIONS, default: 'up' }],
  outputs: [
    { key: 'level', label: 'New level', type: 'number' },
    { key: 'before', label: 'Level before', type: 'number' },
    { key: 'change', label: 'Levels gained (negative when lost)', type: 'number' },
    { key: 'name', label: 'Name of the new level', type: 'text' },
  ],
  detect: ({ prev, next, params }) => {
    if (!prev || !next) return null;
    const before = progressOf(prev);
    const after = progressOf(next);
    if (!before || !after) return null;
    const change = after.level - before.level;
    if (!directionMatches(params.direction, change)) return null;
    return {
      data: { level: after.level, before: before.level, change, name: after.name ?? '' },
      text: `Level ${before.level} → ${after.level}${after.name ? ` (${after.name})` : ''}`,
    };
  },
  describe: (d) => `${d.widget} level ${getDirectionText(d.params.direction)}`,
};

export const TRACK_TRIGGERS = [trackZoneTrigger];
export const XP_TRIGGERS = [xpLevelChangedTrigger];
