import { formatDiceExpression, formatDiceRollDetail, rollDiceExpression } from '../../utils/diceExpression';
import { collectLabels } from '../../utils/formulaEngine';
import type { FormulaValue } from '../../utils/formulaSyntax';
import { resolveDiceExpressionField } from '../../utils/inlineDice';
import {
  COMPARISON_OPTIONS,
  compareValues,
  DIRECTION_OPTIONS,
  directionMatches,
  flattenRollDice,
  formatNumber,
  getComparisonText,
  getDirectionText,
  resolveThreshold,
  ROLL_OUTPUTS,
  rollResultData,
  VALUE_CHANGE_OUTPUTS,
  valueChangeData,
} from '../helpers';
import { isLabelWritable, writeLabelValue } from '../labelWriter';
import type { EffectDef, EventOption, SpecContext, TargetSpec, TriggerDef } from '../types';

function labelOptions(ctx: SpecContext, filter?: (label: string, value: FormulaValue) => boolean): EventOption[] {
  const labels = collectLabels(ctx.character);
  return Object.keys(labels)
    .filter((label) => !filter || filter(label, labels[label]))
    .sort((a, b) => a.localeCompare(b))
    .map((label) => ({ value: label, label: `@${label}` }));
}

const LABEL_TARGET: TargetSpec = { label: 'Label', options: (ctx) => labelOptions(ctx) };
const NUMBER_LABEL_TARGET: TargetSpec = { label: 'Label', options: (ctx) => labelOptions(ctx, (_, value) => typeof value === 'number') };
const WRITABLE_LABEL_TARGET: TargetSpec = { label: 'Label', options: (ctx) => labelOptions(ctx, (label) => isLabelWritable(ctx.character, label)) };
const WRITABLE_NUMBER_LABEL_TARGET: TargetSpec = {
  label: 'Label',
  options: (ctx) => labelOptions(ctx, (label, value) => typeof value === 'number' && isLabelWritable(ctx.character, label)),
};

const show = (value: FormulaValue | undefined) => (value === undefined ? '—' : typeof value === 'number' ? formatNumber(value) : `"${value}"`);
const labelName = (target: string) => (target ? (target.startsWith('@') ? target : `@${target}`) : '@?');

export const labelChangedTrigger: TriggerDef = {
  kind: 'label.changed',
  label: 'A label changes',
  mode: 'state',
  target: LABEL_TARGET,
  params: [{ key: 'direction', label: 'When it', type: 'select', options: DIRECTION_OPTIONS, default: 'any', help: 'Text labels only support "changes".' }],
  outputs: VALUE_CHANGE_OUTPUTS,
  detect: ({ trigger, params, prevLabels, nextLabels }) => {
    const label = trigger.target;
    if (!label) return null;
    const before = prevLabels()[label];
    const after = nextLabels()[label];
    if (before === after || after === undefined) return null;
    if (typeof before === 'number' && typeof after === 'number') {
      if (!directionMatches(params.direction, after - before)) return null;
    } else if (params.direction && params.direction !== 'any') {
      return null;
    }
    return { data: valueChangeData(before, after), text: `@${label} ${show(before)} → ${show(after)}` };
  },
  describe: (d) => `${labelName(d.target)} ${getDirectionText(d.params.direction)}`,
};

export const labelCrossesTrigger: TriggerDef = {
  kind: 'label.crosses',
  label: 'A label crosses a threshold',
  mode: 'state',
  target: NUMBER_LABEL_TARGET,
  params: [
    { key: 'compare', label: 'When it', type: 'select', options: COMPARISON_OPTIONS, default: 'below' },
    { key: 'threshold', label: 'Threshold', type: 'formula', default: '0', placeholder: '0 or @max_hp / 2', help: 'A number or a formula.' },
  ],
  outputs: VALUE_CHANGE_OUTPUTS,
  detect: ({ trigger, params, prevLabels, nextLabels }) => {
    const label = trigger.target;
    if (!label) return null;
    const before = prevLabels()[label];
    const after = nextLabels()[label];
    if (typeof before !== 'number' || typeof after !== 'number' || before === after) return null;
    const thresholdBefore = resolveThreshold(params.threshold, prevLabels());
    const thresholdAfter = resolveThreshold(params.threshold, nextLabels());
    if (thresholdBefore === null || thresholdAfter === null) return null;
    if (compareValues(params.compare, before, thresholdBefore) || !compareValues(params.compare, after, thresholdAfter)) return null;
    return {
      data: valueChangeData(before, after),
      text: `@${label} ${getComparisonText(params.compare)} ${formatNumber(thresholdAfter)} (${show(before)} → ${show(after)})`,
    };
  },
  describe: (d) => `${labelName(d.target)} ${getComparisonText(d.params.compare)} ${d.params.threshold || '?'}`,
};

export const manualTrigger: TriggerDef = {
  kind: 'manual',
  label: 'No trigger (run by hand or by another event)',
  mode: 'manual',
  describe: () => 'it is run by hand or by another event',
};

export const labelSetEffect: EffectDef = {
  kind: 'label.set',
  label: 'Set a label',
  target: WRITABLE_LABEL_TARGET,
  params: [{ key: 'value', label: 'New value', type: 'formula', default: '0', placeholder: '0, @level + 1 or {@name} the brave', help: 'A number or formula. Text works too; wrap formulas inside text in {braces}.' }],
  apply: (ctx) => {
    const label = ctx.effect.target;
    if (!label) return null;
    const raw = (ctx.params.value ?? '').trim();
    let value: FormulaValue;
    let detail = '';
    const amount = raw ? ctx.amount('value') : null;
    if (amount) {
      value = amount.value;
      if (amount.roll) detail = ` (${amount.text})`;
    } else {
      value = ctx.text('value');
    }
    const before = ctx.labels[label];
    if (before === value) return { text: `@${label} stays at ${show(value)}` };
    const character = writeLabelValue(ctx.character, label, value);
    if (!character) return { text: `@${label} can't be changed (it's missing or computed by a formula)` };
    return { character, text: `@${label} ${show(before)} → ${show(value)}${detail}` };
  },
  describe: (d) => `Set ${labelName(d.target)} to ${d.params.value || '0'}`,
};

export const labelAddEffect: EffectDef = {
  kind: 'label.add',
  label: 'Add to a label',
  target: WRITABLE_NUMBER_LABEL_TARGET,
  params: [{ key: 'amount', label: 'Amount', type: 'amount', default: '1', placeholder: '1, -2 or 1d6', help: 'Use a negative amount to subtract.' }],
  apply: (ctx) => {
    const label = ctx.effect.target;
    if (!label) return null;
    const before = ctx.labels[label];
    if (typeof before !== 'number') return { text: `@${label} isn't a number` };
    const amount = ctx.amount('amount');
    if (!amount) return { text: `@${label}: the amount isn't valid` };
    const value = before + amount.value;
    const character = writeLabelValue(ctx.character, label, value);
    if (!character) return { text: `@${label} can't be changed (it's missing or computed by a formula)` };
    const sign = amount.value < 0 ? '' : '+';
    return { character, text: `@${label} ${show(before)} → ${show(value)} (${sign}${amount.text})` };
  },
  describe: (d) => {
    const amount = (d.params.amount || '1').trim();
    return amount.startsWith('-') ? `Subtract ${amount.slice(1).trim()} from ${labelName(d.target)}` : `Add ${amount} to ${labelName(d.target)}`;
  },
};

export const diceRollEffect: EffectDef = {
  kind: 'dice.roll',
  label: 'Roll dice',
  outputs: ROLL_OUTPUTS,
  params: [
    { key: 'dice', label: 'Dice', type: 'dice', default: '1d20', placeholder: '1d20 + @str', help: 'Any dice expression; labels are allowed.' },
    { key: 'title', label: 'Title', type: 'text', default: '', placeholder: 'Shown on the result' },
  ],
  apply: (ctx) => {
    const resolved = resolveDiceExpressionField(ctx.params.dice ?? '', ctx.labels);
    if (!resolved.terms) return { text: `Couldn't roll: ${resolved.reason}` };
    const expression = formatDiceExpression(resolved.terms);
    const roll = rollDiceExpression(expression);
    if (!roll) return { text: `Couldn't roll ${expression}` };
    const title = ctx.text('title').trim() || 'Event roll';
    return {
      text: `${ctx.params.title?.trim() ? `${title}: ` : ''}${formatDiceRollDetail(roll)}`,
      rolls: [{ title, subtitle: roll.expression, result: roll }],
      result: rollResultData(roll.total, flattenRollDice(roll)),
    };
  },
  describe: (d) => `Roll ${d.params.dice || '?'}${d.params.title?.trim() ? ` for ${d.params.title.trim()}` : ''}`,
};

export const logMessageEffect: EffectDef = {
  kind: 'log.message',
  label: 'Write in the timeline',
  params: [{ key: 'message', label: 'Message', type: 'text', default: '', placeholder: 'You feel weakened. HP: {@hp}', help: 'Wrap formulas in {braces} to show their value.' }],
  apply: (ctx) => {
    const message = ctx.text('message').trim();
    return { text: message || '(empty message)' };
  },
  describe: (d) => `Write "${d.params.message?.trim() || '…'}"`,
};

/** Triggers and effects that don't belong to a widget. */
export const GLOBAL_TRIGGERS = [labelChangedTrigger, labelCrossesTrigger, manualTrigger];
export const GLOBAL_EFFECTS = [labelSetEffect, labelAddEffect, diceRollEffect, logMessageEffect];
