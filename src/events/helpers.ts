import type { Character, Widget, WidgetData } from '../types';
import { formatDiceRollDetail, rollDiceExpression, type DiceExpressionRollResult } from '../utils/diceExpression';
import { evaluateFormula, evaluateFormulaValue } from '../utils/formulaEngine';
import type { FormulaLabels, FormulaValue } from '../utils/formulaSyntax';
import { resolveInlineDiceExpression } from '../utils/inlineDice';
import { ANY_TARGET, type EventAmount, type EventOption, type TriggerData, type TriggerOutput, type WidgetAction } from './types';

export function findWidget(character: Character, widgetId: string | undefined): Widget | undefined {
  if (!widgetId) return undefined;
  for (const sheet of character.sheets) {
    const widget = sheet.widgets.find((item) => item.id === widgetId);
    if (widget) return widget;
  }
  return undefined;
}

export function forEachWidget(character: Character, visit: (widget: Widget) => void) {
  for (const sheet of character.sheets) {
    for (const widget of sheet.widgets) visit(widget);
  }
}

/** Applies a data patch to a widget on any sheet. */
export function patchWidgetData(character: Character, widgetId: string, patch: Partial<WidgetData>): Character {
  return {
    ...character,
    sheets: character.sheets.map((sheet) => (
      sheet.widgets.some((widget) => widget.id === widgetId)
        ? { ...sheet, widgets: sheet.widgets.map((widget) => (widget.id === widgetId ? { ...widget, data: { ...widget.data, ...patch } } : widget)) }
        : sheet
    )),
  };
}

// ----- Items inside widgets -----

/** Key that identifies an item: its id, else its name, else its 1-based position as `#n`. */
export function itemKey(name: string | undefined, index: number, id?: string): string {
  return id || name?.trim() || `#${index + 1}`;
}

export function itemTitle(name: string | undefined, index: number, fallback: string): string {
  return name?.trim() || `${fallback} ${index + 1}`;
}

export function findItemIndex<T>(
  items: T[] | undefined,
  key: string | undefined,
  getName: (item: T) => string | undefined,
  getId?: (item: T) => string | undefined,
): number {
  if (!items || !key) return -1;
  if (getId) {
    const byId = items.findIndex((item) => getId(item) === key);
    if (byId >= 0) return byId;
  }
  const wanted = key.trim().toLowerCase();
  const byName = items.findIndex((item) => getName(item)?.trim().toLowerCase() === wanted);
  if (byName >= 0) return byName;
  const position = key.match(/^#(\d+)$/);
  if (position) {
    const index = Number(position[1]) - 1;
    return index >= 0 && index < items.length ? index : -1;
  }
  return -1;
}

export function itemOptions<T>(
  items: T[] | undefined,
  getName: (item: T) => string | undefined,
  fallback: string,
  getId?: (item: T) => string | undefined,
): EventOption[] {
  return (items ?? []).map((item, index) => ({
    value: itemKey(getName(item), index, getId?.(item)),
    label: itemTitle(getName(item), index, fallback),
  }));
}

export function isAnyTarget(target: string | undefined): boolean {
  return !target || target === ANY_TARGET;
}

// ----- Numbers -----

export function formatNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}

export function clampNumber(value: number, min?: number, max?: number): number {
  let result = value;
  if (max !== undefined && Number.isFinite(max)) result = Math.min(max, result);
  if (min !== undefined && Number.isFinite(min)) result = Math.max(min, result);
  return result;
}

export type Comparison = 'below' | 'atOrBelow' | 'above' | 'atOrAbove' | 'equals';

export const COMPARISON_OPTIONS: EventOption[] = [
  { value: 'below', label: 'drops below' },
  { value: 'atOrBelow', label: 'drops to or below' },
  { value: 'above', label: 'rises above' },
  { value: 'atOrAbove', label: 'rises to or above' },
  { value: 'equals', label: 'becomes exactly' },
];

export function getComparisonText(value: string | undefined): string {
  return COMPARISON_OPTIONS.find((option) => option.value === value)?.label ?? 'drops below';
}

export function compareValues(comparison: string | undefined, value: number, threshold: number): boolean {
  switch (comparison) {
    case 'atOrBelow': return value <= threshold;
    case 'above': return value > threshold;
    case 'atOrAbove': return value >= threshold;
    case 'equals': return value === threshold;
    default: return value < threshold;
  }
}

export const DIRECTION_OPTIONS: EventOption[] = [
  { value: 'any', label: 'changes' },
  { value: 'up', label: 'goes up' },
  { value: 'down', label: 'goes down' },
];

export function getDirectionText(value: string | undefined): string {
  return DIRECTION_OPTIONS.find((option) => option.value === value)?.label ?? 'changes';
}

export function directionMatches(direction: string | undefined, delta: number): boolean {
  if (delta === 0) return false;
  if (direction === 'up') return delta > 0;
  if (direction === 'down') return delta < 0;
  return true;
}

/** Data passed by triggers that watch a value change. */
export const VALUE_CHANGE_OUTPUTS: TriggerOutput[] = [
  { key: 'value', label: 'New value', type: 'number' },
  { key: 'before', label: 'Value before the change', type: 'number' },
  { key: 'change', label: 'How much it changed, negative when it went down', type: 'number' },
];

export function valueChangeData(before: FormulaValue | undefined, after: FormulaValue): TriggerData {
  const data: TriggerData = { value: after };
  if (before !== undefined) data.before = before;
  if (typeof before === 'number' && typeof after === 'number') data.change = after - before;
  return data;
}

/**
 * Threshold for a comparison: a number or formula, `N%` of the value's range, `max` or `min`.
 * Returns null when it can't be worked out.
 */
export function resolveThreshold(
  source: string | undefined,
  labels: FormulaLabels,
  bounds: { min?: number; max?: number } = {},
): number | null {
  const raw = (source ?? '').trim();
  if (!raw) return null;
  const percent = raw.match(/^(-?\d+(?:\.\d+)?)\s*%$/);
  if (percent) {
    if (bounds.max === undefined) return null;
    const min = bounds.min ?? 0;
    return min + ((bounds.max - min) * Number(percent[1])) / 100;
  }
  if (/^max$/i.test(raw)) return bounds.max ?? null;
  if (/^min$/i.test(raw)) return bounds.min ?? null;
  return evaluateFormula(raw, labels);
}

/** Evaluates a number, formula or dice expression; dice are rolled. */
export function evaluateAmount(source: string | undefined, labels: FormulaLabels): EventAmount | null {
  const raw = (source ?? '').trim();
  if (!raw) return null;
  const expression = /^\{[^{}]*\}$/.test(raw) ? raw.slice(1, -1).trim() : raw;
  if (/^-?\d+(\.\d+)?$/.test(expression)) {
    const value = Number(expression);
    return { value, text: formatNumber(value) };
  }
  const resolved = resolveInlineDiceExpression(expression, labels);
  if (!resolved.valid) return null;
  if (resolved.terms.some((term) => term.type === 'dice')) {
    const roll = rollDiceExpression(resolved.resolvedExpression);
    if (!roll) return null;
    return { value: roll.total, text: formatDiceRollDetail(roll), roll };
  }
  if (resolved.terms.length === 0) return null;
  const value = Number(resolved.resolvedExpression);
  return Number.isFinite(value) ? { value, text: formatNumber(value) } : null;
}

export function isTruthy(value: FormulaValue | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return value !== 0;
  return value.trim() !== '';
}

/** A blank condition always passes; comparisons such as `@hp < 5` are supported. */
export function evaluateCondition(condition: string | undefined, labels: FormulaLabels): boolean {
  const formula = condition?.trim();
  if (!formula) return true;
  const result = evaluateFormulaValue(`(${formula}) ? 1 : 0`, labels);
  return result === 1;
}

export const TIME_UNIT_OPTIONS: EventOption[] = [
  { value: 'seconds', label: 'seconds' },
  { value: 'minutes', label: 'minutes' },
  { value: 'hours', label: 'hours' },
  { value: 'days', label: 'days' },
  { value: 'months', label: 'months' },
  { value: 'years', label: 'years' },
];

const TIME_UNIT_SECONDS: Record<string, number> = {
  seconds: 1,
  minutes: 60,
  hours: 3600,
  days: 86400,
  months: 30 * 86400,
  years: 365 * 86400,
};

export function timeToSeconds(amount: number, unit: string | undefined): number {
  return amount * (TIME_UNIT_SECONDS[unit ?? 'seconds'] ?? 1);
}

export function plural(count: number, singular: string, pluralForm = `${singular}${/(s|x|z|ch|sh)$/i.test(singular) ? 'es' : 's'}`): string {
  return `${formatNumber(count)} ${Math.abs(count) === 1 ? singular : pluralForm}`;
}

/** Every die an expression rolled, in term order. */
export const flattenRollDice = (roll: DiceExpressionRollResult): number[] => roll.terms.flatMap((term) => term.rolls ?? []);

/** What dice rolls pass along: to an event's trigger conditions and to later steps. */
export const ROLL_OUTPUTS: TriggerOutput[] = [
  { key: 'total', label: 'Total of the roll', type: 'number' },
  { key: 'highest', label: 'Highest die', type: 'number' },
  { key: 'lowest', label: 'Lowest die', type: 'number' },
];

export function rollResultData(total: number | undefined, dice: number[]): TriggerData {
  const data: TriggerData = dice.length ? { highest: Math.max(...dice), lowest: Math.min(...dice) } : {};
  if (total !== undefined) data.total = total;
  return data;
}

/** Describes a widget's expression roll for action triggers; `total` overrides the roll's own, e.g. to add a modifier. */
export function expressionRollAction(widgetId: string, roll: DiceExpressionRollResult, extra: Partial<WidgetAction> = {}): WidgetAction {
  return { widgetId, kind: 'roll', total: roll.total, dice: flattenRollDice(roll), text: roll.expression, ...extra };
}
