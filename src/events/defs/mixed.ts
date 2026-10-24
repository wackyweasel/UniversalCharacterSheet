import type { MixedField, Widget } from '../../types';
import { isAnyTarget, itemKey, itemTitle } from '../helpers';
import type { EffectDef, EventOption, SpecContext, TargetSpec, TriggerDef } from '../types';

type MenuField = Extract<MixedField, { type: 'menu' }>;
type TextField = Extract<MixedField, { type: 'text' }>;

interface FieldRef<T extends MixedField> {
  key: string;
  label: string;
  index: number;
  field: T;
}

const mixedFieldsOf = (widget: Widget | undefined): MixedField[] => (widget?.type === 'MIXED_FIELDS' ? widget.data.mixedFields ?? [] : []);
const hasFormula = (formula: unknown) => typeof formula === 'string' && formula.trim() !== '';
const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const shown = (value: string) => value || '(none)';

function fieldsOfType<T extends MixedField>(widget: Widget | undefined, isType: (field: MixedField) => field is T, noun: string): FieldRef<T>[] {
  return mixedFieldsOf(widget).flatMap((field, index) => (
    isType(field) ? [{ key: itemKey(field.name, index), label: itemTitle(field.name, index, noun), index, field }] : []
  ));
}

const menuFields = (widget: Widget | undefined) => fieldsOfType(widget, (field): field is MenuField => field.type === 'menu', 'Menu');
const textFields = (widget: Widget | undefined) => fieldsOfType(widget, (field): field is TextField => field.type === 'text', 'Text');

function findField<T extends MixedField>(refs: FieldRef<T>[], key: string | undefined): FieldRef<T> | undefined {
  if (!key) return undefined;
  const lower = key.toLowerCase();
  return refs.find((ref) => ref.key === key) ?? refs.find((ref) => ref.key.toLowerCase() === lower);
}

function replaceField(widget: Widget, index: number, field: MixedField) {
  const fields = [...(widget.data.mixedFields ?? [])];
  fields[index] = field;
  return { mixedFields: fields };
}

const refOptions = <T extends MixedField>(refs: FieldRef<T>[]): EventOption[] => refs.map((ref) => ({ value: ref.key, label: ref.label }));

// The chosen menu's options, or those of every menu when any menu will do.
function menuOptionChoices({ widget, target }: SpecContext): EventOption[] {
  const refs = menuFields(widget);
  const chosen = !target || isAnyTarget(target) ? refs : refs.filter((ref) => ref === findField(refs, target));
  const names = new Map<string, string>();
  for (const ref of chosen) {
    for (const option of ref.field.options) {
      if (option.trim() && !names.has(option.trim().toLowerCase())) names.set(option.trim().toLowerCase(), option);
    }
  }
  return [...names.values()].map((option) => ({ value: option, label: option }));
}

const MENU_TARGET: TargetSpec = { label: 'Menu', options: ({ widget }) => refOptions(menuFields(widget)) };

export const menuChangedTrigger: TriggerDef = {
  kind: 'mixedMenu.changed',
  label: 'A menu changes',
  mode: 'state',
  target: { ...MENU_TARGET, any: 'Any menu' },
  params: [{
    key: 'to',
    label: 'When it changes to',
    type: 'select',
    options: (ctx) => [{ value: '', label: 'any option' }, ...menuOptionChoices(ctx)],
    default: '',
  }],
  outputs: [
    { key: 'field', label: 'Menu that changed', type: 'text' },
    { key: 'value', label: 'Option chosen', type: 'text' },
    { key: 'before', label: 'Option before', type: 'text' },
  ],
  detect: ({ prev, next, trigger, params }) => {
    const before = menuFields(prev);
    const after = menuFields(next);
    const candidates = isAnyTarget(trigger.target) ? after : [findField(after, trigger.target)].filter((ref): ref is FieldRef<MenuField> => !!ref);
    for (const ref of candidates) {
      const old = before.find((item) => item.key === ref.key);
      if (!old || old.field.value === ref.field.value) continue;
      if (params.to && !sameText(ref.field.value, params.to)) continue;
      return {
        data: { field: ref.label, value: ref.field.value, before: old.field.value },
        text: `${ref.label}: ${shown(old.field.value)} → ${shown(ref.field.value)}`,
      };
    }
    return null;
  },
  describe: (d) => `${d.target || 'Any menu'} (${d.widget}) changes${d.params.to ? ` to "${d.params.to}"` : ''}`,
};

const NEXT_OPTION = '__next';
const PREVIOUS_OPTION = '__previous';

const describeOption = (option: string | undefined) => (
  option === PREVIOUS_OPTION ? 'the previous option' : !option || option === NEXT_OPTION ? 'the next option' : `"${option}"`
);

export const menuSetEffect: EffectDef = {
  kind: 'mixedMenu.set',
  label: 'Choose a menu option',
  target: MENU_TARGET,
  params: [{
    key: 'option',
    label: 'Choose',
    type: 'select',
    options: (ctx) => [
      { value: NEXT_OPTION, label: 'The next option' },
      { value: PREVIOUS_OPTION, label: 'The previous option' },
      ...menuOptionChoices(ctx),
    ],
    default: NEXT_OPTION,
  }],
  apply: (ctx) => {
    const ref = findField(menuFields(ctx.widget), ctx.effect.target);
    if (!ref || !ctx.widget) return null;
    const options = ref.field.options;
    if (options.length === 0) return { text: `${ref.label} has no options` };
    const wanted = ctx.params.option || NEXT_OPTION;
    let value: string | undefined;
    if (wanted === NEXT_OPTION || wanted === PREVIOUS_OPTION) {
      const step = wanted === NEXT_OPTION ? 1 : -1;
      const current = options.indexOf(ref.field.value);
      value = options[current < 0 ? (step > 0 ? 0 : options.length - 1) : (current + step + options.length) % options.length];
    } else {
      value = options.find((option) => sameText(option, wanted));
      if (value === undefined) return { text: `${ref.label} has no option "${wanted}"` };
    }
    if (value === ref.field.value) return { text: `${ref.label} stays on ${shown(value)}` };
    return {
      data: replaceField(ctx.widget, ref.index, { ...ref.field, value }),
      text: `${ref.label}: ${shown(ref.field.value)} → ${shown(value)}`,
    };
  },
  describe: (d) => `Set ${d.target || '?'} (${d.widget}) to ${describeOption(d.params.option)}`,
};

export const textSetEffect: EffectDef = {
  kind: 'mixedText.set',
  label: 'Change a text field',
  target: { label: 'Text field', options: ({ widget }) => refOptions(textFields(widget)) },
  params: [{
    key: 'text',
    label: 'New text',
    type: 'text',
    default: '',
    placeholder: 'Cursed by {@event_card}',
    help: 'Wrap formulas in {braces} to show their value.',
  }],
  apply: (ctx) => {
    const ref = findField(textFields(ctx.widget), ctx.effect.target);
    if (!ref || !ctx.widget) return null;
    if (hasFormula(ref.field.valueFormula)) return { text: `${ref.label} is computed by a formula and can't be changed` };
    const value = ctx.text('text');
    if (value === ref.field.value) return { text: `${ref.label} stays "${value}"` };
    return { data: replaceField(ctx.widget, ref.index, { ...ref.field, value }), text: `${ref.label}: "${value}"` };
  },
  describe: (d) => `Set ${d.target || '?'} (${d.widget}) to "${d.params.text?.trim() ?? ''}"`,
};

export const MIXED_FIELD_DEFS = { triggers: [menuChangedTrigger], effects: [menuSetEffect, textSetEffect] };
