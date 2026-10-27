import type { Widget, WidgetData, WidgetType } from '../../types';
import { describeMissingRequirements, getSkillPointsLeft, getUnlockedDependents, isSkillTreeUsingPoints, normalizeSkillCost } from '../../utils/skillTree';
import { isAnyTarget, itemKey, itemTitle, plural } from '../helpers';
import type { EffectDef, EventOption, SpecContext, TriggerDef } from '../types';

/** An on/off value inside a widget. */
interface FlagSlot {
  key: string;
  label: string;
  value: boolean;
  /** Returns the patch, or a reason when the change isn't allowed. Absent when a formula sets the value. */
  set?: (value: boolean) => Partial<WidgetData> | string;
}

function replaceAt<T>(items: T[], index: number, item: T): T[] {
  const next = [...items];
  next[index] = item;
  return next;
}

const hasFormula = (formula: unknown) => typeof formula === 'string' && formula.trim() !== '';

const FLAG_PROVIDERS: Partial<Record<WidgetType, (data: WidgetData) => FlagSlot[]>> = {
  TOGGLE: (data) => [{
    key: 'state',
    label: data.label?.trim() || 'Switch',
    value: data.toggleState === true,
    set: hasFormula(data.fieldFormulas?.state) ? undefined : (value) => ({ toggleState: value }),
  }],
  TOGGLE_GROUP: (data) => (data.toggleItems ?? []).map((item, index) => ({
    key: itemKey(item.name, index),
    label: itemTitle(item.name, index, 'Condition'),
    value: item.active,
    set: (value) => ({ toggleItems: replaceAt(data.toggleItems ?? [], index, { ...item, active: value }) }),
  })),
  CHECKBOX: (data) => (data.checkboxItems ?? []).map((item, index) => ({
    key: itemKey(item.name, index),
    label: itemTitle(item.name, index, 'Item'),
    value: item.checked,
    set: (value) => ({ checkboxItems: replaceAt(data.checkboxItems ?? [], index, { ...item, checked: value }) }),
  })),
  MIXED_FIELDS: (data) => {
    const fields = data.mixedFields ?? [];
    return fields.flatMap((field, index) => (field.type !== 'switch' ? [] : [{
      key: itemKey(field.name, index),
      label: itemTitle(field.name, index, 'Switch'),
      value: field.value === true,
      set: hasFormula(field.valueFormula) ? undefined : (value: boolean) => ({ mixedFields: replaceAt(fields, index, { ...field, value }) }),
    }]));
  },
  DICE_POOL: (data) => (data.dicePoolComponents ?? []).map((component, index) => ({
    key: component.id,
    label: itemTitle(component.name, index, 'Trait'),
    value: component.active,
    set: (value) => ({ dicePoolComponents: replaceAt(data.dicePoolComponents ?? [], index, { ...component, active: value }) }),
  })),
  SKILL_TREE: (data) => {
    const nodes = data.skillNodes ?? [];
    return nodes.map((node, index) => ({
      key: node.id,
      label: itemTitle(node.name, index, 'Skill'),
      value: node.unlocked,
      set: (value) => {
        const name = node.name?.trim() || 'the skill';
        if (value) {
          const missing = describeMissingRequirements(nodes, node);
          if (missing) return `${name} needs ${missing} first`;
          const cost = normalizeSkillCost(node.cost);
          if (isSkillTreeUsingPoints(data) && cost > getSkillPointsLeft(data)) return `Not enough points to unlock ${name}`;
        } else if (getUnlockedDependents(nodes, node.id).length > 0) {
          return `Other skills depend on ${name}`;
        }
        return { skillNodes: replaceAt(nodes, index, { ...node, unlocked: value }) };
      },
    }));
  },
};

export const FLAG_WIDGET_TYPES = Object.keys(FLAG_PROVIDERS) as WidgetType[];

function getFlagSlots(widget: Widget | undefined): FlagSlot[] {
  if (!widget) return [];
  return FLAG_PROVIDERS[widget.type]?.(widget.data) ?? [];
}

function findFlag(slots: FlagSlot[], key: string | undefined): FlagSlot | undefined {
  if (!key) return slots.length === 1 ? slots[0] : undefined;
  const lower = key.toLowerCase();
  return slots.find((slot) => slot.key === key) ?? slots.find((slot) => slot.key.toLowerCase() === lower || slot.label.toLowerCase() === lower);
}

interface FlagWording {
  /** Kind prefix, e.g. "switch". */
  prefix: string;
  /** Singular item noun for the editor, e.g. "Condition". */
  noun: string;
  on: string;
  off: string;
  /** State of an item that is on, after "is", e.g. "active". */
  state: string;
  /** Verb phrases for effects, e.g. "Turn on". */
  setOn: string;
  setOff: string;
  /** Whether the widget has several items (adds "any" targets and the "all items" effects). */
  multiple: boolean;
}

function flagOptions({ widget }: SpecContext): EventOption[] {
  return getFlagSlots(widget).map((slot) => ({ value: slot.key, label: slot.label }));
}

function makeFlagDefs(wording: FlagWording) {
  const subject = (d: { target: string; widget: string }) => (wording.multiple ? `${d.target || `any ${wording.noun.toLowerCase()}`} (${d.widget})` : d.widget);
  const stateOptions: EventOption[] = [
    { value: 'on', label: wording.on },
    { value: 'off', label: wording.off },
    { value: 'any', label: `${wording.on} or ${wording.off}` },
  ];

  const changed: TriggerDef = {
    kind: `${wording.prefix}.changed`,
    label: `${wording.noun} ${wording.on} or ${wording.off}`,
    mode: 'state',
    target: wording.multiple ? { label: wording.noun, options: flagOptions, any: `Any ${wording.noun.toLowerCase()}` } : undefined,
    params: [{ key: 'to', label: 'When it', type: 'select', options: stateOptions, default: 'on' }],
    outputs: [
      ...(wording.multiple ? [{ key: 'name', label: `${wording.noun} that changed`, type: 'text' as const }] : []),
      { key: 'on', label: `1 when it ${wording.on}, 0 when it ${wording.off}`, type: 'number' },
    ],
    detect: ({ prev, next, trigger, params }) => {
      const before = getFlagSlots(prev);
      const after = getFlagSlots(next);
      const candidates = wording.multiple && isAnyTarget(trigger.target) ? after : [findFlag(after, trigger.target)].filter((slot): slot is FlagSlot => !!slot);
      for (const slot of candidates) {
        const old = before.find((item) => item.key === slot.key);
        if (!old || old.value === slot.value) continue;
        if (params.to === 'on' && !slot.value) continue;
        if (params.to === 'off' && slot.value) continue;
        return { data: { name: slot.label, on: slot.value ? 1 : 0 }, text: `${slot.label} ${slot.value ? wording.on : wording.off}` };
      }
      return null;
    },
    describe: (d) => `${subject(d)} ${d.params.to === 'off' ? wording.off : d.params.to === 'any' ? `${wording.on} or ${wording.off}` : wording.on}`,
  };

  const set: EffectDef = {
    kind: `${wording.prefix}.set`,
    label: `${wording.setOn} or ${wording.setOff.toLowerCase()}`,
    target: wording.multiple ? { label: wording.noun, options: flagOptions } : undefined,
    params: [{
      key: 'state',
      label: 'Action',
      type: 'select',
      options: [
        { value: 'on', label: wording.setOn },
        { value: 'off', label: wording.setOff },
        { value: 'flip', label: 'Flip' },
      ],
      default: 'on',
    }],
    apply: (ctx) => {
      const slot = findFlag(getFlagSlots(ctx.widget), ctx.effect.target);
      if (!slot) return null;
      if (!slot.set) return { text: `${slot.label} is set by a formula` };
      const value = ctx.params.state === 'flip' ? !slot.value : ctx.params.state !== 'off';
      if (value === slot.value) return { text: `${slot.label} is already ${value ? wording.on : wording.off}` };
      const patch = slot.set(value);
      if (typeof patch === 'string') return { text: patch };
      return { data: patch, text: `${slot.label} ${value ? wording.on : wording.off}` };
    },
    describe: (d) => {
      const verb = d.params.state === 'off' ? wording.setOff : d.params.state === 'flip' ? 'Flip' : wording.setOn;
      return `${verb} ${wording.multiple ? `${d.target || '?'} (${d.widget})` : d.widget}`;
    },
  };

  const triggers: TriggerDef[] = [changed];
  const effects: EffectDef[] = [set];

  if (wording.multiple) {
    triggers.push({
      kind: `${wording.prefix}.all`,
      label: `Every ${wording.noun.toLowerCase()} is ${wording.state}`,
      mode: 'state',
      outputs: [{ key: 'count', label: `Total ${wording.noun.toLowerCase()} count`, type: 'number' }],
      detect: ({ prev, next }) => {
        const before = getFlagSlots(prev);
        const after = getFlagSlots(next);
        if (after.length === 0 || !after.every((slot) => slot.value)) return null;
        if (before.length > 0 && before.every((slot) => slot.value)) return null;
        const all = after.length === 1 ? `The only ${wording.noun.toLowerCase()} is` : `All ${plural(after.length, wording.noun.toLowerCase())} are`;
        return { data: { count: after.length }, text: `${all} ${wording.state}` };
      },
      describe: (d) => `Every ${wording.noun.toLowerCase()} in ${d.widget} is ${wording.state}`,
    });
    effects.push({
      kind: `${wording.prefix}.setAll`,
      label: `${wording.setOn} or ${wording.setOff.toLowerCase()} all`,
      params: [{
        key: 'state',
        label: 'Action',
        type: 'select',
        options: [
          { value: 'off', label: `${wording.setOff} all` },
          { value: 'on', label: `${wording.setOn} all` },
        ],
        default: 'off',
      }],
      apply: (ctx) => {
        const value = ctx.params.state === 'on';
        let widget = ctx.widget;
        let changedCount = 0;
        const refused = new Map<string, string>();
        // One at a time, retrying refused items after each success, so skill prerequisites and costs are respected.
        for (let guard = 0; guard < 10000; guard++) {
          const slot = getFlagSlots(widget).find((item) => item.value !== value && item.set && !refused.has(item.key));
          if (!slot) break;
          const patch = slot.set!(value);
          if (typeof patch === 'string') {
            refused.set(slot.key, slot.label);
            continue;
          }
          widget = widget && { ...widget, data: { ...widget.data, ...patch } };
          changedCount += 1;
          refused.clear();
        }
        if (!widget || changedCount === 0) return { text: `Nothing to ${value ? wording.setOn.toLowerCase() : wording.setOff.toLowerCase()}` };
        const changedData = Object.fromEntries(
          Object.entries(widget.data).filter(([key, item]) => (ctx.widget?.data as Record<string, unknown>)[key] !== item),
        ) as Partial<WidgetData>;
        const skipped = refused.size > 0 ? ` (skipped ${[...refused.values()].join(', ')})` : '';
        return { data: changedData, text: `${value ? wording.setOn : wording.setOff} ${plural(changedCount, wording.noun.toLowerCase())}${skipped}` };
      },
      describe: (d) => `${d.params.state === 'on' ? wording.setOn : wording.setOff} every ${wording.noun.toLowerCase()} in ${d.widget}`,
    });
  }

  return { triggers, effects };
}

export const SWITCH_DEFS = makeFlagDefs({ prefix: 'switch', noun: 'Switch', on: 'turns on', off: 'turns off', state: 'on', setOn: 'Turn on', setOff: 'Turn off', multiple: false });
export const CONDITION_DEFS = makeFlagDefs({ prefix: 'condition', noun: 'Condition', on: 'becomes active', off: 'ends', state: 'active', setOn: 'Activate', setOff: 'End', multiple: true });
export const CHECKLIST_DEFS = makeFlagDefs({ prefix: 'checklist', noun: 'Item', on: 'is checked', off: 'is unchecked', state: 'checked', setOn: 'Check', setOff: 'Uncheck', multiple: true });
export const MIXED_SWITCH_DEFS = makeFlagDefs({ prefix: 'mixedSwitch', noun: 'Switch', on: 'turns on', off: 'turns off', state: 'on', setOn: 'Turn on', setOff: 'Turn off', multiple: true });
export const DICE_POOL_TRAIT_DEFS = makeFlagDefs({ prefix: 'poolTrait', noun: 'Trait', on: 'joins the pool', off: 'leaves the pool', state: 'in the pool', setOn: 'Add', setOff: 'Remove', multiple: true });
export const SKILL_DEFS = makeFlagDefs({ prefix: 'skill', noun: 'Skill', on: 'is unlocked', off: 'is refunded', state: 'unlocked', setOn: 'Unlock', setOff: 'Refund', multiple: true });
