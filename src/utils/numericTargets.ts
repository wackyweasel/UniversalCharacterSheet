import { v4 as uuidv4 } from 'uuid';
import type { Character, InventoryItem, ItemEffect, NumericTargetCollection, NumericTargetReference, WidgetData, WidgetType } from '../types';
import { getWidgetTitle } from './characterVariables';
import { DEFAULT_POOL_TARGET, MAX_POOL_BONUS, MAX_POOL_DICE } from './dicePool';
import { isCoveredTableCell } from './tableCells';

type Path = (string | number)[];
type RecordValue = Record<string, unknown>;

export interface NumericTarget {
  ref: NumericTargetReference;
  title: string;
  source: string;
  value: number;
  min?: number;
  max?: number;
  integer?: 'round' | 'floor';
  label?: string;
  formula?: string;
  problem?: string;
  path: Path;
  identityPath?: Path;
  legacyCell?: boolean;
}

const record = (value: unknown): value is RecordValue => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const numeric = (value: unknown): number | undefined => {
  if (finite(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const result = Number(value);
  return Number.isFinite(result) ? result : undefined;
};
const formula = (value: unknown) => typeof value === 'string' && !!value.trim();
const humanize = (field: string) => field.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase());

export function numericTargetKey(ref: NumericTargetReference): string {
  return ref.kind === 'variable'
    ? JSON.stringify(['variable', ref.variableId])
    : JSON.stringify([ref.widgetId, ref.collection ?? '', ref.entryId ?? '', ref.field]);
}

// Unsaved legacy entries get a fingerprint, never a durable positional reference.
export function entryIdentity(value: unknown, index: number): string {
  if (record(value) && typeof value.id === 'string' && value.id) return value.id;
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `~${index}:${hash >>> 0}`;
}

const ROOT_FIELDS: Partial<Record<WidgetType, Record<string, number>>> = {
  HEALTH_BAR: { currentValue: 10, maxValue: 10, temporaryValue: 0, increment: 1 },
  PROGRESS_BAR: { currentValue: 0, minValue: 0, maxValue: 100, increment: 1 },
  THRESHOLD_TRACK: { currentValue: 0, minValue: 0, maxValue: 10, increment: 1 },
  XP_LEVEL: { currentValue: 0 },
  SKILL_TREE: { currentValue: 0 },
  POOL: { currentPool: 5, maxPool: 5 },
  DICE_ROLLER: { modifier: 0 },
  DICE_TRAY: { modifier: 0 },
  DICE_POOL: { dicePoolBonus: 0, dicePoolTarget: DEFAULT_POOL_TARGET },
};

const COLLECTION_FIELDS: Partial<Record<NumericTargetCollection, string[]>> = {
  numberItems: ['value', 'minValue', 'maxValue'],
  displayNumbers: ['value', 'minValue', 'maxValue', 'secondaryValue'],
  poolResources: ['current', 'max'],
  clockItems: ['value', 'segments'],
  trackThresholds: ['value', 'modifier'],
  xpLevels: ['xp'],
  dicePoolComponents: ['dice'],
  diceGroups: ['count'],
  initiativePool: ['flatBonus'],
  rollTableItems: ['weight'],
  inventorySlots: ['maxItems'],
  inventoryItems: ['quantity'],
  spellLevels: ['used', 'max'],
  stepDiceItems: ['currentStep'],
  walletCurrencies: ['amount'],
  skillNodes: ['cost'],
};

function labelKey(field: string): string {
  return field === 'segments' ? 'segmentsLabel' : `${field}Label`;
}

function bounds(data: WidgetData, item: RecordValue, field: string, collection: NumericTargetCollection | undefined, type: WidgetType): Pick<NumericTarget, 'min' | 'max' | 'integer'> {
  if (!collection && field === 'currentValue') {
    if (type === 'XP_LEVEL' || type === 'SKILL_TREE') return { min: 0, integer: 'floor' };
    return {
      min: numeric(item.minValue) ?? 0,
      max: numeric(item.maxValue),
      ...(type === 'THRESHOLD_TRACK' ? { integer: 'round' as const } : {}),
    };
  }
  if (field === 'maxValue') return { min: type === 'HEALTH_BAR' ? 1 : numeric(item.minValue) };
  if (field === 'minValue') return { max: numeric(item.maxValue) };
  if (!collection && field === 'dicePoolBonus') return { min: -MAX_POOL_BONUS, max: MAX_POOL_BONUS, integer: 'round' };
  if (!collection && field === 'dicePoolTarget') return { min: 1, integer: 'round' };
  if (!collection && field === 'temporaryValue') return { min: 0 };
  if (!collection && field === 'currentPool') return { min: 0, max: data.maxPool ?? 5 };
  if (field === 'value' && (collection === 'numberItems' || collection === 'displayNumbers')) return { min: numeric(item.minValue), max: numeric(item.maxValue) };
  if (collection === 'mixedFields') {
    if (field === 'value') return { min: numeric(item.minValue), max: numeric(item.maxValue) };
    if (field === 'current') return { min: numeric(item.min) ?? 0, max: numeric(item.max) };
  }
  if (field === 'current' && collection === 'poolResources') return { min: 0, max: numeric(item.max) };
  if (collection === 'clockItems') return field === 'value' ? { min: 0, max: numeric(item.segments), integer: 'floor' } : { min: 1, integer: 'floor' };
  if (collection === 'inventorySlots') return { min: 1, integer: 'floor' };
  if (collection === 'spellLevels') return { min: 0, max: field === 'used' ? numeric(item.max) : undefined, integer: 'round' };
  if (collection === 'stepDiceItems' || (collection === 'mixedFields' && field === 'currentStep')) {
    const chain = Array.isArray(item.diceChain) ? item.diceChain : data.stepDiceChain;
    return { min: 0, max: (chain?.length ?? 6) - 1, integer: 'round' };
  }
  if (collection === 'dicePoolComponents') return { min: 0, max: MAX_POOL_DICE, integer: 'round' };
  if (collection === 'diceGroups') return { min: 1, integer: 'round' };
  if (collection === 'rollTableItems') return { min: 0 };
  if (['inventoryItems', 'walletCurrencies', 'xpLevels', 'skillNodes'].includes(collection ?? '')) return { min: 0, integer: 'floor' };
  return {};
}

export function collectNumericTargets(character: Character): NumericTarget[] {
  const targets: NumericTarget[] = [];
  for (const variable of character.variables ?? []) {
    if (!finite(variable.value)) continue;
    targets.push({
      ref: { kind: 'variable', variableId: variable.id },
      title: variable.label, source: 'Standalone labels', value: variable.value,
      label: variable.label, formula: formula(variable.formula) ? variable.formula : undefined, path: [],
    });
  }
  for (const sheet of character.sheets) for (const widget of sheet.widgets) {
    const data = widget.data;
    const source = `${sheet.name} - ${getWidgetTitle(widget)}`;
    const add = (item: RecordValue, fields: string[], path: Path, collection?: NumericTargetCollection, index = 0, name?: string, identityPath?: Path) => {
      for (const field of fields) {
        const value = numeric(item[field]);
        if (value === undefined) continue;
        const label = collection ? item[labelKey(field)] : data.fieldLabels?.[field];
        const computed = collection ? item[`${field}Formula`] : data.fieldFormulas?.[field];
        const ref: NumericTargetReference = {
          kind: 'widget', widgetId: widget.id, field, ...(collection ? { collection, entryId: entryIdentity(item, index) } : {}),
        };
        targets.push({
          ref, title: name ? `${name} - ${humanize(field)}` : humanize(field), source, value,
          label: typeof label === 'string' ? label : undefined,
          formula: formula(computed) ? String(computed) : undefined,
          problem: collection === 'displayNumbers' && field === 'secondaryValue' && data.secondaryDisplayAutoCompute
            ? 'Derived from the primary value' : undefined,
          ...bounds(data, item, field, collection, widget.type),
          path: [...path, field], identityPath,
        });
      }
    };
    const roots = ROOT_FIELDS[widget.type];
    if (roots) {
      const values = { ...roots, ...data };
      if (widget.type === 'HEALTH_BAR' && !data.enableTemporaryHp) delete values.temporaryValue;
      if (widget.type === 'POOL' && data.poolResources?.length) {
        delete values.currentPool;
        delete values.maxPool;
      }
      add(values, Object.keys(roots).filter((field) => field in values), []);
    }
    if (widget.type !== 'COMPENDIUM' && data.inventoryEncumbrance?.enabled) {
      for (const field of ['localCapacity', 'globalCapacity'] as const) {
        const value = data.inventoryEncumbrance[field];
        if (!finite(value)) continue;
        targets.push({
          ref: { kind: 'widget', widgetId: widget.id, field: `inventoryEncumbrance.${field}` },
          title: humanize(field), source, value, min: 0,
          label: data.fieldLabels?.[field],
          formula: formula(data.fieldFormulas?.[field]) ? data.fieldFormulas?.[field] : undefined,
          path: ['inventoryEncumbrance', field],
        });
      }
    }
    for (const [collection, fields] of Object.entries(COLLECTION_FIELDS)) {
      const entries: unknown = data[collection as keyof WidgetData];
      if (!Array.isArray(entries)) continue;
      entries.forEach((item: unknown, index: number) => {
        if (!record(item)) return;
        const name = String(item.name ?? item.label ?? item.text ?? (collection === 'spellLevels' ? `Level ${item.level}` : `Entry ${index + 1}`));
        add(item, fields, [collection, index], collection as NumericTargetCollection, index, name, [collection, index]);
      });
    }
    data.mixedFields?.forEach((field, index) => {
      const fields = field.type === 'number' ? ['value', 'minValue', 'maxValue']
        : field.type === 'progress' ? ['current', 'min', 'max']
          : field.type === 'resource' ? ['current', 'max']
            : field.type === 'step-dice' ? ['currentStep'] : [];
      add({ ...field }, fields, ['mixedFields', index], 'mixedFields', index, field.name, ['mixedFields', index]);
    });
    data.inventoryItems?.forEach((item, itemIndex) => item.fields.forEach((field, fieldIndex) => {
      if (field.type !== 'number') return;
      add({ ...field }, ['value'], ['inventoryItems', itemIndex, 'fields', fieldIndex], 'inventoryFields', fieldIndex, `${item.name} - ${field.name}`);
    }));
    data.rows?.forEach((row, rowIndex) => row.cells.forEach((cell, colIndex) => {
      const value = numeric(typeof cell === 'string' ? cell : cell.value);
      if (value === undefined) return;
      const details = typeof cell === 'string' ? { value: cell } : cell;
      const inherited = data.tableRowSettings?.[rowIndex]?.formula || data.tableColumnSettings?.[colIndex]?.formula;
      targets.push({
        ref: { kind: 'widget', widgetId: widget.id, collection: 'tableCells', entryId: entryIdentity(cell, rowIndex * (data.columns?.length ?? row.cells.length) + colIndex), field: 'value' },
        title: `Row ${rowIndex + 1} - ${data.columns?.[colIndex] || `Column ${colIndex + 1}`}`,
        source, value, label: 'label' in details ? details.label : undefined,
        formula: ('formula' in details && formula(details.formula) ? details.formula : inherited) || undefined,
        problem: isCoveredTableCell(data.tableMergedCells, rowIndex, colIndex) ? 'Covered by a merged cell' : undefined,
        path: typeof cell === 'string' ? ['rows', rowIndex, 'cells', colIndex] : ['rows', rowIndex, 'cells', colIndex, 'value'],
        identityPath: ['rows', rowIndex, 'cells', colIndex], legacyCell: typeof cell === 'string',
      });
    }));
  }
  return targets;
}

export function findNumericTarget(character: Character, ref: NumericTargetReference): NumericTarget | undefined {
  const key = numericTargetKey(ref);
  return collectNumericTargets(character).find((target) => numericTargetKey(target.ref) === key);
}

function replacePath(value: unknown, path: Path, replacement: (value: unknown) => unknown): unknown {
  if (!path.length) return replacement(value);
  const [key, ...rest] = path;
  if (Array.isArray(value) && typeof key === 'number') {
    const result = [...value];
    result[key] = replacePath(result[key], rest, replacement);
    return result;
  }
  if (record(value) && typeof key === 'string') return { ...value, [key]: replacePath(value[key], rest, replacement) };
  throw new Error('The selected numeric value no longer exists.');
}

function updateTargetData(character: Character, target: NumericTarget, path: Path, replacement: (value: unknown) => unknown): Character {
  const ref = target.ref;
  if (ref.kind !== 'widget') throw new Error('Expected a widget value.');
  return {
    ...character,
    sheets: character.sheets.map((sheet) => ({
      ...sheet,
      widgets: sheet.widgets.map((widget) => widget.id === ref.widgetId
        ? { ...widget, data: replacePath(widget.data, path, replacement) as WidgetData } : widget),
    })),
  };
}

export function writeNumericTarget(character: Character, ref: NumericTargetReference, value: number, release = false): Character {
  const target = findNumericTarget(character, ref);
  if (!target || (!release && target.problem) || !Number.isFinite(value)) throw new Error(target?.problem ?? 'The selected numeric value no longer exists.');
  if (target.value === value) return character;
  if (ref.kind === 'variable') return { ...character, variables: character.variables?.map((variable) => variable.id === ref.variableId ? { ...variable, value } : variable) };
  return updateTargetData(character, target, target.path, (old) => typeof old === 'string' ? String(value) : value);
}

export function bindEffectTargets(character: Character, definitions: ItemEffect[]): { character: Character; effects: ItemEffect[] } {
  let next = character;
  const mappings = new Map<string, NumericTargetReference>();
  const effects = definitions.map((effect) => {
    const ref = effect.target;
    if (!ref || ref.kind !== 'widget' || !ref.entryId?.startsWith('~')) return effect;
    const key = numericTargetKey(ref);
    let bound = mappings.get(key);
    if (!bound) {
      const target = findNumericTarget(next, ref);
      if (!target?.identityPath || target.problem) throw new Error('The selected value changed while this dialog was open. Select it again.');
      const id = uuidv4();
      next = updateTargetData(next, target, target.identityPath, (value) => (
        typeof value === 'string' ? { id, value } : record(value) ? { ...value, id } : value
      ));
      bound = { ...ref, entryId: id };
      // Every field of the same newly identified entry uses this ID.
      for (const candidate of definitions) {
        if (candidate.target?.kind === 'widget' && candidate.target.widgetId === ref.widgetId && candidate.target.collection === ref.collection && candidate.target.entryId === ref.entryId) {
          mappings.set(numericTargetKey(candidate.target), { ...candidate.target, entryId: id });
        }
      }
    }
    return { ...effect, target: bound };
  });
  return { character: next, effects };
}

export function bindItemEffectTargets(character: Character, item: InventoryItem): { character: Character; item: InventoryItem } {
  if (!item.effects) return { character, item };
  const bound = bindEffectTargets(character, item.effects);
  return { character: bound.character, item: { ...item, effects: bound.effects } };
}
