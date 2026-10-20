import type { Character, CharacterVariable, Widget, WidgetData } from '../types';
import { getCalendarLabelFields } from './calendar';
import { collectLabels } from './formulaEngine';
import type { FormulaLabels, FormulaValue } from './formulaSyntax';
import { getWidgetTypeLabel } from './widgetMetadata';

export const LABEL_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/** Where a label lives: a custom variable, a widget value, a table column/row prefix, or an item name. */
export type LabelKind = 'custom' | 'field' | 'column' | 'row' | 'name';

export interface LabelEntry {
  label: string;
  kind: LabelKind;
  /** Short description of the value the label points at. */
  context: string;
  value: FormulaValue | undefined;
  /** Number of generated labels for table column/row prefixes. */
  generatedCount?: number;
  formula?: string;
  editable: boolean;
  variableId?: string;
  widgetId?: string;
  widgetTitle?: string;
  sheetId?: string;
  sheetName?: string;
}

export interface LabelReference {
  /** `variable:<id>` or the widget id. */
  sourceId: string;
  title: string;
  sheetId?: string;
  sheetName?: string;
  widgetId?: string;
  count: number;
}

export interface LabelReferenceIndex {
  /** Referenced identifier -> places that reference it. */
  byRef: Map<string, LabelReference[]>;
  /** Identifiers referenced from formulas, dice expressions or inline `{...}` tokens. */
  formulaRefs: Set<string>;
}

interface LabelSlot {
  label: string;
  kind: Exclude<LabelKind, 'custom'>;
  context: string;
  formula?: string;
}

/** Returns the new label, or undefined to remove it. Returning the same label keeps it. */
type SlotMapper = (slot: LabelSlot) => string | undefined;

type Item = Record<string, unknown>;
type SlotSpec = [labelKey: string, formulaKey: string | null, suffix: string];

const REF_BOUNDARY_BEFORE = '(?<![A-Za-z0-9_.])';
const REF_PATTERN = new RegExp(`${REF_BOUNDARY_BEFORE}@([A-Za-z_][A-Za-z0-9_]*)`, 'g');
const STRICT_KEY_PATTERN = /formula|expression/i;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function humanize(key: string) {
  const words = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function columnName(index: number) {
  let name = '';
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function joinContext(...parts: (string | undefined)[]) {
  return parts.filter((part) => part && part.trim()).join(' · ');
}

function mapItems<T>(
  items: T[] | undefined,
  specs: SlotSpec[],
  describe: (item: Item, index: number) => string,
  mapper: SlotMapper,
  kind: LabelSlot['kind'] = 'field',
): T[] | undefined {
  if (!Array.isArray(items)) return items;
  let changed = false;
  const next = items.map((rawItem, index) => {
    if (!rawItem || typeof rawItem !== 'object') return rawItem;
    const item = rawItem as unknown as Item;
    let updated: Item | null = null;
    for (const [labelKey, formulaKey, suffix] of specs) {
      const label = item[labelKey];
      if (typeof label !== 'string' || !label) continue;
      const formula = formulaKey && typeof item[formulaKey] === 'string' ? item[formulaKey] as string : undefined;
      const result = mapper({ label, kind, context: joinContext(describe(item, index), suffix), formula: formula || undefined });
      if (result === label) continue;
      updated = updated ?? { ...item };
      if (result) updated[labelKey] = result;
      else delete updated[labelKey];
    }
    if (!updated) return rawItem;
    changed = true;
    return updated as unknown as T;
  });
  return changed ? next : items;
}

const itemName = (key: string, fallback: string) => (item: Item, index: number) => {
  const value = item[key];
  return typeof value === 'string' && value.trim() ? value.trim() : `${fallback} ${index + 1}`;
};

/**
 * Walks every label stored in a widget. The mapper can rename or remove editable labels;
 * the returned data is the original object when nothing changed.
 */
function mapWidgetLabels(widget: Widget, mapper: SlotMapper): WidgetData {
  const data = widget.data;
  const patch: Partial<WidgetData> = {};
  const assign = <K extends keyof WidgetData>(key: K, value: WidgetData[K]) => {
    if (value !== data[key]) patch[key] = value;
  };

  if (data.fieldLabels) {
    let next: Record<string, string> | null = null;
    for (const [field, label] of Object.entries(data.fieldLabels)) {
      if (!label) continue;
      const result = mapper({ label, kind: 'field', context: humanize(field), formula: data.fieldFormulas?.[field] || undefined });
      if (result === label) continue;
      next = next ?? { ...data.fieldLabels };
      if (result) next[field] = result;
      else delete next[field];
    }
    if (next) assign('fieldLabels', next);
  }

  if (widget.type === 'CALENDAR' && data.calendarLabels) {
    const names = new Map(getCalendarLabelFields(data).map((field) => [field.key, field.label]));
    let next: Record<string, string> | null = null;
    for (const [key, label] of Object.entries(data.calendarLabels)) {
      if (!label) continue;
      const result = mapper({ label, kind: 'field', context: names.get(key) ?? humanize(key) });
      if (result === label) continue;
      next = next ?? { ...data.calendarLabels };
      if (result) next[key] = result;
      else delete next[key];
    }
    if (next) assign('calendarLabels', next);
  }

  assign('rollTableItems', mapItems(data.rollTableItems, [['weightLabel', 'weightFormula', 'Weight']], itemName('text', 'Option'), mapper));
  assign('formItems', mapItems(data.formItems, [['valueLabel', 'valueFormula', '']], itemName('name', 'Field'), mapper));
  const numberSpecs: SlotSpec[] = [
    ['valueLabel', 'valueFormula', ''],
    ['minValueLabel', 'minValueFormula', 'Min'],
    ['maxValueLabel', 'maxValueFormula', 'Max'],
  ];
  assign('numberItems', mapItems(data.numberItems, numberSpecs, itemName('name', 'Number'), mapper));
  assign('displayNumbers', mapItems(data.displayNumbers, [...numberSpecs, ['secondaryValueLabel', 'secondaryValueFormula', 'Secondary']], itemName('label', 'Number'), mapper));
  assign('clockItems', mapItems(data.clockItems, [['segmentsLabel', 'segmentsFormula', 'Segments'], ['valueLabel', 'valueFormula', 'Filled']], itemName('name', 'Clock'), mapper));
  assign('trackThresholds', mapItems(data.trackThresholds, [['valueLabel', 'valueFormula', 'Threshold']], itemName('name', 'Zone'), mapper));
  assign('xpLevels', mapItems(data.xpLevels, [['xpLabel', 'xpFormula', 'XP']], itemName('name', 'Level'), mapper));
  assign('skillNodes', mapItems(data.skillNodes, [['unlockedLabel', null, 'Unlocked']], itemName('name', 'Skill'), mapper));
  assign('dicePoolComponents', mapItems(data.dicePoolComponents, [['diceLabel', 'diceFormula', 'Dice']], itemName('name', 'Trait'), mapper));
  assign('poolResources', mapItems(data.poolResources, [['currentLabel', 'currentFormula', 'Current'], ['maxLabel', 'maxFormula', 'Max']], itemName('name', 'Resource'), mapper));
  assign('mixedFields', mapItems(data.mixedFields, [
    ['valueLabel', 'valueFormula', ''],
    ['currentLabel', 'currentFormula', 'Current'],
    ['minValueLabel', 'minValueFormula', 'Min'],
    ['minLabel', 'minFormula', 'Min'],
    ['maxValueLabel', 'maxValueFormula', 'Max'],
    ['maxLabel', 'maxFormula', 'Max'],
  ], itemName('name', 'Field'), mapper));
  assign('initiativePool', mapItems(data.initiativePool, [['flatBonusLabel', 'flatBonusFormula', 'Bonus']], itemName('name', 'Participant'), mapper));
  assign('diceGroups', mapItems(data.diceGroups, [['countLabel', 'countFormula', 'Dice count']], (item, index) => {
    const faces = typeof item.faces === 'number' ? `d${item.faces}` : '';
    return typeof item.customDiceName === 'string' && item.customDiceName ? item.customDiceName : faces || `Group ${index + 1}`;
  }, mapper));

  if (Array.isArray(data.inventoryItems)) {
    let changed = false;
    const nextItems = data.inventoryItems.map((item) => {
      const fields = mapItems(item.fields, [['valueLabel', 'valueFormula', '']], (field) => joinContext(item.name, String(field.name ?? '')), mapper);
      if (fields === item.fields) return item;
      changed = true;
      return { ...item, fields: fields ?? [] };
    });
    if (changed) assign('inventoryItems', nextItems);
  }

  if (Array.isArray(data.rows)) {
    let changed = false;
    const nextRows = data.rows.map((row, rowIndex) => {
      let rowChanged = false;
      const cells = row.cells.map((cell, colIndex) => {
        if (typeof cell === 'string' || !cell.label) return cell;
        const result = mapper({ label: cell.label, kind: 'field', context: `Cell ${columnName(colIndex)}${rowIndex + 1}`, formula: cell.formula || undefined });
        if (result === cell.label) return cell;
        rowChanged = true;
        const next = { ...cell };
        if (result) next.label = result;
        else delete next.label;
        return next;
      });
      if (!rowChanged) return row;
      changed = true;
      return { ...row, cells };
    });
    if (changed) assign('rows', nextRows);
  }

  const mapTableSettings = <T extends { label?: string; formula?: string } | null | undefined>(settings: T[] | undefined, kind: 'column' | 'row') => {
    if (!Array.isArray(settings)) return settings;
    let changed = false;
    const next = settings.map((setting, index) => {
      if (!setting?.label) return setting;
      const context = kind === 'column' ? `Column ${columnName(index)}` : `Row ${index + 1}`;
      const result = mapper({ label: setting.label, kind, context, formula: setting.formula || undefined });
      if (result === setting.label) return setting;
      changed = true;
      const updated = { ...setting };
      if (result) updated.label = result;
      else delete updated.label;
      return updated as T;
    });
    return changed ? next : settings;
  };
  assign('tableColumnSettings', mapTableSettings(data.tableColumnSettings, 'column'));
  assign('tableRowSettings', mapTableSettings(data.tableRowSettings, 'row'));

  // Item names double as labels; they are renamed from their widget, so the mapper result is ignored.
  const visitNames = (items: { name?: string }[] | undefined, context: string) => {
    for (const item of items ?? []) {
      if (item?.name && LABEL_PATTERN.test(item.name)) mapper({ label: item.name, kind: 'name', context });
    }
  };
  visitNames(data.toggleItems, 'Condition');
  visitNames(data.checkboxItems, 'Checkbox');
  visitNames(data.timedEffects, 'Timed effect');

  return Object.keys(patch).length > 0 ? { ...data, ...patch } : data;
}

function mapCharacterWidgetLabels(character: Character, mapper: SlotMapper): Character {
  let changed = false;
  const sheets = character.sheets.map((sheet) => {
    let sheetChanged = false;
    const widgets = sheet.widgets.map((widget) => {
      const data = mapWidgetLabels(widget, mapper);
      if (data === widget.data) return widget;
      sheetChanged = true;
      return { ...widget, data };
    });
    if (!sheetChanged) return sheet;
    changed = true;
    return { ...sheet, widgets };
  });
  return changed ? { ...character, sheets } : character;
}

export function getWidgetTitle(widget: Widget) {
  const label = typeof widget.data.label === 'string' ? widget.data.label.trim() : '';
  return label || getWidgetTypeLabel(widget.type);
}

function countGenerated(labels: FormulaLabels, prefix: string) {
  const pattern = new RegExp(`^${escapeRegex(prefix)}[1-9]\\d*$`);
  return Object.keys(labels).filter((label) => pattern.test(label)).length;
}

/** Every label defined on the character, custom variables first. */
export function collectLabelEntries(character: Character, labels: FormulaLabels = collectLabels(character)): LabelEntry[] {
  const entries: LabelEntry[] = [];

  for (const variable of character.variables ?? []) {
    if (!variable.label) continue;
    entries.push({
      label: variable.label,
      kind: 'custom',
      context: variable.formula ? 'Calculated' : 'Value',
      value: labels[variable.label],
      formula: variable.formula || undefined,
      editable: true,
      variableId: variable.id,
    });
  }

  for (const sheet of character.sheets) {
    for (const widget of sheet.widgets) {
      const widgetTitle = getWidgetTitle(widget);
      mapWidgetLabels(widget, (slot) => {
        const generated = slot.kind === 'column' || slot.kind === 'row';
        entries.push({
          label: slot.label,
          kind: slot.kind,
          context: slot.context,
          value: generated ? undefined : labels[slot.label],
          generatedCount: generated ? countGenerated(labels, slot.label) : undefined,
          formula: slot.formula,
          editable: slot.kind !== 'name',
          widgetId: widget.id,
          widgetTitle,
          sheetId: sheet.id,
          sheetName: sheet.name,
        });
        return slot.label;
      });
    }
  }

  return entries;
}

function visitStrings(value: unknown, key: string, visit: (text: string, key: string) => void) {
  if (typeof value === 'string') {
    if (value.includes('@')) visit(value, key);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) visitStrings(item, key, visit);
    return;
  }
  if (value && typeof value === 'object') {
    for (const [childKey, child] of Object.entries(value)) visitStrings(child, childKey, visit);
  }
}

function inlineTokenText(text: string) {
  return (text.match(/\{[^{}]*\}/g) ?? []).join(' ');
}

/** Finds every `@label` reference in widget data and custom variable formulas. */
export function buildReferenceIndex(character: Character): LabelReferenceIndex {
  const byRef = new Map<string, LabelReference[]>();
  const formulaRefs = new Set<string>();

  const record = (source: Omit<LabelReference, 'count'>, counts: Map<string, number>) => {
    for (const [ref, count] of counts) {
      const list = byRef.get(ref) ?? [];
      list.push({ ...source, count });
      byRef.set(ref, list);
    }
  };

  const scan = (root: unknown) => {
    const counts = new Map<string, number>();
    visitStrings(root, '', (text, key) => {
      for (const match of text.matchAll(REF_PATTERN)) counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
      const strictText = STRICT_KEY_PATTERN.test(key) ? text : inlineTokenText(text);
      for (const match of strictText.matchAll(REF_PATTERN)) formulaRefs.add(match[1]);
    });
    return counts;
  };

  for (const variable of character.variables ?? []) {
    if (!variable.formula) continue;
    record({ sourceId: `variable:${variable.id}`, title: `@${variable.label}` }, scan({ formula: variable.formula }));
  }

  for (const sheet of character.sheets) {
    for (const widget of sheet.widgets) {
      record({
        sourceId: widget.id,
        title: getWidgetTitle(widget),
        sheetId: sheet.id,
        sheetName: sheet.name,
        widgetId: widget.id,
      }, scan(widget.data));
    }
  }

  return { byRef, formulaRefs };
}

/** Places that reference a label; column/row prefixes also match their generated labels. */
export function getLabelReferences(index: LabelReferenceIndex, label: string, kind: LabelKind): LabelReference[] {
  const merged = new Map<string, LabelReference>();
  const add = (refs: LabelReference[] | undefined) => {
    for (const ref of refs ?? []) {
      const existing = merged.get(ref.sourceId);
      merged.set(ref.sourceId, existing ? { ...existing, count: existing.count + ref.count } : ref);
    }
  };
  add(index.byRef.get(label));
  if (kind === 'column' || kind === 'row') {
    const pattern = new RegExp(`^${escapeRegex(label)}[1-9]\\d*$`);
    for (const [ref, refs] of index.byRef) {
      if (pattern.test(ref)) add(refs);
    }
  }
  return Array.from(merged.values());
}

/** Labels used in formulas that no widget or variable defines. */
export function getMissingLabels(index: LabelReferenceIndex, entries: LabelEntry[], labels: FormulaLabels): string[] {
  const defined = new Set(entries.map((entry) => entry.label));
  const prefixes = entries.filter((entry) => entry.kind === 'column' || entry.kind === 'row').map((entry) => entry.label);
  return Array.from(index.formulaRefs)
    .filter((ref) => !(ref in labels) && !defined.has(ref))
    .filter((ref) => !prefixes.some((prefix) => new RegExp(`^${escapeRegex(prefix)}[1-9]\\d*$`).test(ref)))
    .sort((a, b) => a.localeCompare(b));
}

export type LabelNameError = 'empty' | 'invalid' | 'taken';

export function validateLabelName(name: string, takenLabels: Iterable<string>, currentLabel?: string): LabelNameError | null {
  if (!name) return 'empty';
  if (!LABEL_PATTERN.test(name)) return 'invalid';
  if (name === currentLabel) return null;
  for (const label of takenLabels) {
    if (label === name) return 'taken';
  }
  return null;
}

/** Keeps only characters allowed in labels and turns spaces into underscores. */
export function sanitizeLabelInput(value: string) {
  return value.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
}

function rewriteStrings<T>(value: T, rewrite: (text: string) => string): T {
  if (typeof value === 'string') {
    if (!value.includes('@')) return value;
    return rewrite(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const updated = rewriteStrings(item, rewrite);
      if (updated !== item) changed = true;
      return updated;
    });
    return (changed ? next : value) as unknown as T;
  }
  if (value && typeof value === 'object') {
    let next: Record<string, unknown> | null = null;
    for (const [key, child] of Object.entries(value)) {
      const updated = rewriteStrings(child, rewrite);
      if (updated !== child) {
        next = next ?? { ...(value as Record<string, unknown>) };
        next[key] = updated;
      }
    }
    return (next ?? value) as T;
  }
  return value;
}

function rewriteReferences(character: Character, from: string, to: string, includeGenerated: boolean): Character {
  const pattern = new RegExp(`${REF_BOUNDARY_BEFORE}@${escapeRegex(from)}(${includeGenerated ? '(?:[1-9]\\d*)?' : ''})(?![A-Za-z0-9_])`, 'g');
  const rewrite = (text: string) => text.replace(pattern, (_match, suffix: string) => `@${to}${suffix}`);

  const variables = character.variables?.map((variable) => {
    if (!variable.formula) return variable;
    const formula = rewrite(variable.formula);
    return formula === variable.formula ? variable : { ...variable, formula };
  });
  const variablesChanged = variables?.some((variable, index) => variable !== character.variables?.[index]);

  let sheetsChanged = false;
  const sheets = character.sheets.map((sheet) => {
    let changed = false;
    const widgets = sheet.widgets.map((widget) => {
      const data = rewriteStrings(widget.data, rewrite);
      if (data === widget.data) return widget;
      changed = true;
      return { ...widget, data };
    });
    if (!changed) return sheet;
    sheetsChanged = true;
    return { ...sheet, widgets };
  });

  if (!variablesChanged && !sheetsChanged) return character;
  return {
    ...character,
    sheets: sheetsChanged ? sheets : character.sheets,
    ...(variablesChanged ? { variables } : {}),
  };
}

/**
 * Renames a label wherever it is defined and, optionally, in every formula that references it.
 * Column/row prefixes also rewrite their generated labels (e.g. `@hp1` -> `@health1`).
 */
export function renameLabelInCharacter(character: Character, from: string, to: string, updateReferences: boolean): Character {
  if (!from || !to || from === to) return character;
  let generated = false;
  let next = mapCharacterWidgetLabels(character, (slot) => {
    if (slot.label !== from || slot.kind === 'name') return slot.label;
    if (slot.kind === 'column' || slot.kind === 'row') generated = true;
    return to;
  });

  if (next.variables?.some((variable) => variable.label === from)) {
    next = {
      ...next,
      variables: next.variables.map((variable) => variable.label === from ? { ...variable, label: to } : variable),
    };
  }

  return updateReferences ? rewriteReferences(next, from, to, generated) : next;
}

/** Removes a label from its widget field or deletes the custom variable that defines it. */
export function removeLabelFromCharacter(character: Character, label: string): Character {
  let next = mapCharacterWidgetLabels(character, (slot) => (slot.label === label && slot.kind !== 'name' ? undefined : slot.label));
  if (next.variables?.some((variable) => variable.label === label)) {
    next = { ...next, variables: next.variables.filter((variable) => variable.label !== label) };
  }
  return next;
}

/** Suggests an unused label like `var1`, `var2`, ... */
export function suggestVariableLabel(taken: Iterable<string>, base = 'var') {
  const used = new Set(taken);
  for (let index = 1; ; index += 1) {
    const candidate = `${base}${index}`;
    if (!used.has(candidate)) return candidate;
  }
}

export function parseVariableValue(input: string): CharacterVariable['value'] {
  const trimmed = input.trim();
  if (trimmed === '') return 0;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : input;
}
