import type { Character, CharacterVariable, MixedField, TableRow, Widget, WidgetData } from '../types';
import type { FormulaValue } from '../utils/formulaSyntax';
import { isTruthy } from './helpers';

type ValueKind = 'number' | 'text' | 'bool';
type Item = Record<string, unknown>;
type SlotSpec = [labelKey: string, valueKey: string, formulaKey: string | null, kind: ValueKind];

/** Result of looking for a label: not here, here but read-only, or the updated value. */
type WriteResult<T> = { found: false } | { found: true; value: T | null };

const NOT_FOUND = { found: false } as const;
const READ_ONLY = { found: true, value: null } as const;

const NUMERIC_FIELDS = new Set([
  'minValue', 'maxValue', 'currentValue', 'temporaryValue', 'increment',
  'maxPool', 'currentPool', 'modifier', 'healFlatAmount', 'dicePoolTarget',
]);

function convert(value: FormulaValue, kind: ValueKind): number | string | boolean | null {
  if (kind === 'text') return String(value);
  if (kind === 'bool') return isTruthy(value);
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const trimmed = value.trim();
  const number = Number(trimmed);
  return trimmed !== '' && Number.isFinite(number) ? number : null;
}

function writeItems<T>(items: T[] | undefined, specs: SlotSpec[], label: string, value: FormulaValue): WriteResult<T[]> {
  if (!Array.isArray(items)) return NOT_FOUND;
  for (const [index, rawItem] of items.entries()) {
    if (!rawItem || typeof rawItem !== 'object') continue;
    const item = rawItem as unknown as Item;
    for (const [labelKey, valueKey, formulaKey, kind] of specs) {
      if (item[labelKey] !== label) continue;
      if (formulaKey && typeof item[formulaKey] === 'string' && (item[formulaKey] as string).trim()) return READ_ONLY;
      const converted = convert(value, kind);
      if (converted === null) return READ_ONLY;
      const next = [...items];
      next[index] = { ...item, [valueKey]: converted } as unknown as T;
      return { found: true, value: next };
    }
  }
  return NOT_FOUND;
}

function writeNamedFlags<T extends { name: string }>(items: T[] | undefined, flagKey: 'active' | 'checked', label: string, value: FormulaValue): WriteResult<T[]> {
  if (!Array.isArray(items)) return NOT_FOUND;
  const index = items.findIndex((item) => item.name === label);
  if (index < 0) return NOT_FOUND;
  const next = [...items];
  next[index] = { ...items[index], [flagKey]: isTruthy(value) };
  return { found: true, value: next };
}

function getMixedFieldSpecs(field: MixedField): SlotSpec[] {
  switch (field.type) {
    case 'number':
      return [
        ['valueLabel', 'value', 'valueFormula', 'number'],
        ['minValueLabel', 'minValue', 'minValueFormula', 'number'],
        ['maxValueLabel', 'maxValue', 'maxValueFormula', 'number'],
      ];
    case 'progress':
      return [
        ['currentLabel', 'current', 'currentFormula', 'number'],
        ['minLabel', 'min', 'minFormula', 'number'],
        ['maxLabel', 'max', 'maxFormula', 'number'],
      ];
    case 'resource':
      return [
        ['currentLabel', 'current', 'currentFormula', 'number'],
        ['maxLabel', 'max', 'maxFormula', 'number'],
      ];
    case 'switch': return [['valueLabel', 'value', 'valueFormula', 'bool']];
    case 'menu': return [['valueLabel', 'value', null, 'text']];
    case 'text': return [['valueLabel', 'value', 'valueFormula', 'text']];
    default: return [];
  }
}

function writeFieldLabel(data: WidgetData, label: string, value: FormulaValue): WriteResult<Partial<WidgetData>> {
  if (!data.fieldLabels) return NOT_FOUND;
  const field = Object.entries(data.fieldLabels).find(([, name]) => name === label)?.[0];
  if (!field) return NOT_FOUND;
  if (data.fieldFormulas?.[field]?.trim()) return READ_ONLY;
  if (field === 'state') return { found: true, value: { toggleState: isTruthy(value) } };
  const number = convert(value, 'number');
  if (typeof number !== 'number') return READ_ONLY;
  if (NUMERIC_FIELDS.has(field)) return { found: true, value: { [field]: number } };
  if ((field === 'localCapacity' || field === 'globalCapacity') && data.inventoryEncumbrance) {
    return { found: true, value: { inventoryEncumbrance: { ...data.inventoryEncumbrance, [field]: number } } };
  }
  // Derived fields such as the track zone or XP level can't be set.
  return READ_ONLY;
}

function writeWidgetLabel(widget: Widget, label: string, value: FormulaValue): WriteResult<Partial<WidgetData>> {
  const data = widget.data;
  const results: [keyof WidgetData, WriteResult<unknown>][] = [];

  const field = writeFieldLabel(data, label, value);
  if (field.found) return field;

  const numberSpecs: SlotSpec[] = [
    ['valueLabel', 'value', 'valueFormula', 'number'],
    ['minValueLabel', 'minValue', 'minValueFormula', 'number'],
    ['maxValueLabel', 'maxValue', 'maxValueFormula', 'number'],
  ];
  results.push(['rollTableItems', writeItems(data.rollTableItems, [['weightLabel', 'weight', 'weightFormula', 'number']], label, value)]);
  results.push(['formItems', writeItems(data.formItems, [['valueLabel', 'value', 'valueFormula', 'text']], label, value)]);
  results.push(['numberItems', writeItems(data.numberItems, numberSpecs, label, value)]);
  results.push(['displayNumbers', writeItems(data.displayNumbers, [...numberSpecs, ['secondaryValueLabel', 'secondaryValue', 'secondaryValueFormula', 'number']], label, value)]);
  results.push(['clockItems', writeItems(data.clockItems, [['segmentsLabel', 'segments', 'segmentsFormula', 'number'], ['valueLabel', 'value', 'valueFormula', 'number']], label, value)]);
  results.push(['trackThresholds', writeItems(data.trackThresholds, [['valueLabel', 'value', 'valueFormula', 'number']], label, value)]);
  results.push(['xpLevels', writeItems(data.xpLevels, [['xpLabel', 'xp', 'xpFormula', 'number']], label, value)]);
  results.push(['dicePoolComponents', writeItems(data.dicePoolComponents, [['diceLabel', 'dice', 'diceFormula', 'number']], label, value)]);
  results.push(['poolResources', writeItems(data.poolResources, [['currentLabel', 'current', 'currentFormula', 'number'], ['maxLabel', 'max', 'maxFormula', 'number']], label, value)]);
  results.push(['initiativePool', writeItems(data.initiativePool, [['flatBonusLabel', 'flatBonus', 'flatBonusFormula', 'number']], label, value)]);
  results.push(['diceGroups', writeItems(data.diceGroups, [['countLabel', 'count', 'countFormula', 'number']], label, value)]);
  results.push(['toggleItems', writeNamedFlags(data.toggleItems, 'active', label, value)]);
  results.push(['checkboxItems', writeNamedFlags(data.checkboxItems, 'checked', label, value)]);

  for (const [key, result] of results) {
    if (result.found) return result.value === null ? READ_ONLY : { found: true, value: { [key]: result.value } };
  }

  if (Array.isArray(data.mixedFields)) {
    for (const [index, mixedField] of data.mixedFields.entries()) {
      const result = writeItems([mixedField], getMixedFieldSpecs(mixedField), label, value);
      if (!result.found) continue;
      if (!result.value) return READ_ONLY;
      const mixedFields = [...data.mixedFields];
      mixedFields[index] = result.value[0];
      return { found: true, value: { mixedFields } };
    }
  }

  if (Array.isArray(data.inventoryItems)) {
    for (const [index, item] of data.inventoryItems.entries()) {
      const fieldIndex = item.fields.findIndex((itemField) => itemField.valueLabel === label);
      if (fieldIndex < 0) continue;
      const itemField = item.fields[fieldIndex];
      if (itemField.valueFormula?.trim()) return READ_ONLY;
      const kind: ValueKind = itemField.type === 'checkbox' ? 'bool' : itemField.type === 'number' ? 'number' : 'text';
      const converted = convert(value, kind);
      if (converted === null) return READ_ONLY;
      const fields = [...item.fields];
      fields[fieldIndex] = { ...itemField, value: converted };
      const inventoryItems = [...data.inventoryItems];
      inventoryItems[index] = { ...item, fields };
      return { found: true, value: { inventoryItems } };
    }
  }

  if (Array.isArray(data.rows)) {
    for (const [rowIndex, row] of data.rows.entries()) {
      const colIndex = row.cells.findIndex((cell) => typeof cell !== 'string' && cell.label === label);
      if (colIndex < 0) continue;
      const cell = row.cells[colIndex];
      if (typeof cell === 'string' || cell.formula?.trim()) return READ_ONLY;
      const cells = [...row.cells];
      cells[colIndex] = { ...cell, value: String(value) };
      const rows: TableRow[] = [...data.rows];
      rows[rowIndex] = { ...row, cells };
      return { found: true, value: { rows } };
    }
  }

  return NOT_FOUND;
}

function writeVariable(variables: CharacterVariable[] | undefined, label: string, value: FormulaValue): WriteResult<CharacterVariable[]> {
  const index = variables?.findIndex((variable) => variable.label === label) ?? -1;
  if (!variables || index < 0) return NOT_FOUND;
  const variable = variables[index];
  if (variable.formula?.trim()) return READ_ONLY;
  const next = [...variables];
  next[index] = { ...variable, value };
  return { found: true, value: next };
}

/**
 * Sets the value behind a label. Returns null when the label doesn't exist or can't be written,
 * for example because a formula computes it or it is derived from other values.
 */
export function writeLabelValue(character: Character, label: string, value: FormulaValue): Character | null {
  const variable = writeVariable(character.variables, label, value);
  if (variable.found) return variable.value ? { ...character, variables: variable.value } : null;

  for (const [sheetIndex, sheet] of character.sheets.entries()) {
    for (const [widgetIndex, widget] of sheet.widgets.entries()) {
      const result = writeWidgetLabel(widget, label, value);
      if (!result.found) continue;
      if (!result.value) return null;
      const widgets = [...sheet.widgets];
      widgets[widgetIndex] = { ...widget, data: { ...widget.data, ...result.value } };
      const sheets = [...character.sheets];
      sheets[sheetIndex] = { ...sheet, widgets };
      return { ...character, sheets };
    }
  }
  return null;
}

export function isLabelWritable(character: Character, label: string): boolean {
  return writeLabelValue(character, label, 0) !== null;
}
