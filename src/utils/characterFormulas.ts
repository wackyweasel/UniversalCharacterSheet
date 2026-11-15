import type { Character, CharacterEventEffect, CharacterEventTrigger } from '../types';
import { getEffectDef, getEventLabelsAt, getTriggerDef, getTriggerLabels } from '../events/registry';
import type { EventParamSpec } from '../events/types';
import { getWidgetTitle } from './characterVariables';
import { collectLabels, detectCircularReference, evaluateFormulaValue, hasUnresolvedRefs } from './formulaEngine';
import { extractFormulaLabelReferences, maskFormulaStringLiterals, type FormulaLabels, type FormulaValue } from './formulaSyntax';
import { removeInlineFormulas, tokenizeInlineDiceText } from './inlineDice';
import { entryIdentity } from './numericTargets';
import { getVariableGroupNames } from './variableGroups';

type Path = (string | number)[];
export type FormulaCategory = 'fields' | 'inline' | 'events' | 'library';

export interface CharacterFormula {
  key: string;
  characterId: string;
  category: FormulaCategory;
  groupKey: string;
  groupTitle: string;
  context: string;
  title: string;
  formula: string;
  resultType: 'number' | 'text';
  sourceLabels: string[];
  editable: boolean;
  path: Path;
  storedValue: string;
  inline?: boolean;
  html?: boolean;
  widgetId?: string;
  sheetId?: string;
  noteTabId?: string;
  eventId?: string;
  runtimeLabels?: FormulaLabels;
}

export interface FormulaPreview {
  kind: 'value' | 'runtime' | 'problem';
  value?: FormulaValue;
  message?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const humanize = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase());
const columnName = (index: number): string => index < 26 ? String.fromCharCode(65 + index) : `${columnName(Math.floor(index / 26) - 1)}${columnName(index % 26)}`;
const collectionNames: Record<string, string> = {
  numberItems: 'Number', displayNumbers: 'Number', formItems: 'Field', mixedFields: 'Field',
  clockItems: 'Clock', trackThresholds: 'Zone', xpLevels: 'Level', dicePoolComponents: 'Trait',
  poolResources: 'Resource', inventoryItems: 'Item', fields: 'Attribute', inventorySlots: 'Slot',
  initiativePool: 'Participant', initiativeEncounter: 'Encounter', diceGroups: 'Dice group',
  rollTableItems: 'Option', restorePools: 'Restore', calendarSteps: 'Time step', noteTabs: 'Notes tab',
};
const fieldTitle = (key: string) => ({ richText: 'Notes', text: 'Text', label: 'Title', formula: 'Value' }[key] ?? humanize(key.replace(/Formula$/, '')));
const containsDiceRoll = (text: string) => {
  const expression = maskFormulaStringLiterals(text) ?? text;
  return tokenizeInlineDiceText(expression).some((segment) => segment.type === 'dice')
    || tokenizeInlineDiceText(`{${expression}}`).some((segment) => segment.type === 'dice');
};

// Event inputs also accept literal values. Keep expression-shaped input, including broken formulas.
const isEventFormula = (text: string) => {
  if (!text.trim() || Number.isFinite(Number(text))) return false;
  const expression = maskFormulaStringLiterals(text) ?? text;
  return /@|[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(expression)
    || (/^[\d\s+\-*/().,?:!=<>]+$/.test(expression) && /[+\-*/?:!=<>]/.test(expression));
};

// Rich text is tokenized per text node, just like InlineDiceRichText, without reading HTML attributes.
function decodeInlineText(text: string): string {
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (whole, entity: string) => {
    if (!entity.startsWith('#')) return entities[entity.toLowerCase()] ?? whole;
    const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });
}

function inlineTextParts(text: string): string[] {
  return text.split(/<[^>]*>/g).map(decodeInlineText);
}

export function collectCharacterFormulas(character: Character): CharacterFormula[] {
  const entries: CharacterFormula[] = [];
  type Owner = Omit<CharacterFormula, 'key' | 'characterId' | 'title' | 'formula' | 'resultType' | 'sourceLabels' | 'editable' | 'path' | 'storedValue'>;
  const add = (owner: Owner, path: Path, identity: Path, title: string, text: string, options: Partial<Pick<CharacterFormula, 'resultType' | 'sourceLabels' | 'editable' | 'inline' | 'html'>> = {}, token?: number) => {
    if (!text.trim() || containsDiceRoll(text)) return;
    entries.push({
      ...owner, key: JSON.stringify([owner.groupKey, ...identity, token ?? null]), characterId: character.id,
      title, formula: text.trim(), resultType: 'number', sourceLabels: [], editable: true,
      path, storedValue: text, ...options,
    });
  };
  const inline = (owner: Owner, path: Path, identity: Path, title: string, text: string, html: boolean) => {
    if (!text.includes('{')) return;
    let token = 0;
    for (const part of html ? inlineTextParts(text) : [text]) {
      for (const segment of tokenizeInlineDiceText(part)) {
        if (segment.type !== 'formula') continue;
        add({ ...owner, category: owner.category === 'fields' ? 'inline' : owner.category }, path, identity, `${title} · Inline formula`, segment.expression,
          { resultType: 'text', editable: false, inline: true, html }, token++);
      }
    }
  };
  const walk = (value: unknown, owner: Owner, path: Path, identity: Path, parts: string[] = [], parent: Record<string, unknown> = {}, field = '') => {
    if (typeof value === 'string') {
      const title = [...parts, fieldTitle(field)].filter(Boolean).join(' · ');
      if (/formula$/i.test(field) || path[path.length - 2] === 'fieldFormulas') {
        const targetField = field.replace(/Formula$/, '');
        const label = path[path.length - 2] === 'fieldFormulas'
          ? isRecord(parent.fieldLabels) ? parent.fieldLabels[field] : undefined
          : parent[field === 'formula' ? 'label' : `${targetField}Label`];
        const sourceLabels = typeof label === 'string' && label ? [label] : [];
        const textResult = typeof parent[targetField] === 'string' || parent.type === 'text' || parent.type === 'textarea' || field === 'formula';
        const tableTemplate = path.includes('tableColumnSettings') || path.includes('tableRowSettings');
        add(owner, path, identity, title, value, { sourceLabels, resultType: textResult ? 'text' : 'number', editable: !tableTemplate });
      } else if (!/expression$/i.test(field) && (field === 'label' || !/^(id|.*Id|.*Label|targetName|image|imageUrl|icon|formula)$/i.test(field))) {
        inline(owner, path, identity, title, value, /richText|description|tooltip/i.test(field) && /<[^>]*>/.test(value));
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        const name = isRecord(item) ? [item.name, item.label, item.text].find((text) => typeof text === 'string' && text.trim()) : undefined;
        const part = field === 'rows' ? `Row ${index + 1}` : field === 'cells' ? `Cell ${columnName(index)}`
          : field === 'tableColumnSettings' ? `Column ${columnName(index)}` : field === 'tableRowSettings' ? `Row ${index + 1}`
            : typeof name === 'string' ? name : `${collectionNames[field] ?? humanize(field)} ${index + 1}`;
        const noteTabId = field === 'noteTabs' && isRecord(item) && typeof item.id === 'string' ? item.id : owner.noteTabId;
        walk(item, { ...owner, noteTabId }, [...path, index], [...identity, entryIdentity(item, index)], [...parts, part], {}, '');
      });
      return;
    }
    if (!isRecord(value)) return;
    for (const [key, child] of Object.entries(value)) {
      if (key === 'fieldLabels' || key === 'format' || key === 'target' || key === 'tableColumnFormats' || key === 'tableRowFormats') continue;
      if (key === 'text' && typeof value.richText === 'string') continue;
      if ((key === 'text' || key === 'richText') && Array.isArray(value.noteTabs) && value.noteTabs.length > 0) continue;
      walk(child, owner, [...path, key], [...identity, key], parts, field === 'fieldFormulas' ? parent : value, key);
    }
  };

  const groupNames = getVariableGroupNames(character);
  character.variables?.forEach((variable, index) => {
    if (!variable.formula?.trim()) return;
    add({ category: 'fields', groupKey: `variables:${variable.groupId ?? ''}`, groupTitle: groupNames.get(variable.id) ?? 'Standalone labels', context: 'Standalone labels' },
      ['variables', index, 'formula'], [variable.id, 'formula'], `@${variable.label}`, variable.formula, { sourceLabels: [variable.label], resultType: 'text' });
  });
  character.sheets.forEach((sheet, sheetIndex) => sheet.widgets.forEach((widget, widgetIndex) => {
    walk(widget.data, { category: 'fields', groupKey: widget.id, groupTitle: getWidgetTitle(widget), context: sheet.name, sheetId: sheet.id, widgetId: widget.id },
      ['sheets', sheetIndex, 'widgets', widgetIndex, 'data'], []);
  }));
  character.compendium?.forEach((section, sectionIndex) => {
    walk(section.items, { category: 'library', groupKey: `library:${section.id}`, groupTitle: section.name, context: 'Compendium library' },
      ['compendium', sectionIndex, 'items'], [], [], {}, 'inventoryItems');
  });
  character.events?.forEach((event, eventIndex) => {
    const owner: Owner = { category: 'events', groupKey: `event:${event.id}`, groupTitle: event.name?.trim() || 'Unnamed event', context: 'Event', eventId: event.id };
    const eventPath: Path = ['events', eventIndex];
    const params = (part: CharacterEventTrigger | CharacterEventEffect, specs: EventParamSpec[] | undefined, path: Path, prefix: string, runtimeLabels: FormulaLabels) => {
      for (const [key, text] of Object.entries(part.params ?? {})) {
        const spec = specs?.find((entry) => entry.key === key);
        if (spec?.type === 'dice' || (spec && ['formula', 'amount'].includes(spec.type) && containsDiceRoll(text))) continue;
        const title = `${prefix} · ${spec?.label ?? humanize(key)}`;
        const identity = [...path.slice(2).map((value) => typeof value === 'number' ? String(value) : value), key];
        if (spec && ['formula', 'amount'].includes(spec.type) && !text.includes('{')) {
          if (!isEventFormula(text)) continue;
          add({ ...owner, runtimeLabels }, [...path, 'params', key], identity, title, text,
            { editable: false, resultType: 'text' });
        } else inline({ ...owner, runtimeLabels }, [...path, 'params', key], identity, title, text, false);
      }
    };
    params(event.trigger, getTriggerDef(event.trigger.kind)?.params, [...eventPath, 'trigger'], 'Trigger', getTriggerLabels(event.trigger.kind));
    event.steps.forEach((step, stepIndex) => {
      const path = [...eventPath, 'steps', stepIndex];
      const prefix = `Step ${stepIndex + 1}`;
      if (step.condition) add({ ...owner, runtimeLabels: getEventLabelsAt(event, stepIndex, 'condition') },
        [...path, 'condition'], [step.id, 'condition'], `${prefix} · Condition`, step.condition, { editable: false });
      for (const section of ['effects', 'otherwise'] as const) {
        step[section]?.forEach((effect, effectIndex) => params(effect, getEffectDef(effect.kind)?.params,
          [...path, section, effectIndex], `${prefix} · ${section === 'otherwise' ? 'Otherwise' : 'Action'} ${effectIndex + 1}`,
          getEventLabelsAt(event, stepIndex, section, effectIndex)));
      }
    });
  });
  return entries;
}

export function previewCharacterFormula(character: Character, entry: CharacterFormula, labels = collectLabels(character)): FormulaPreview {
  const available = { ...labels, ...entry.runtimeLabels };
  const refs = extractFormulaLabelReferences(entry.formula) ?? [];
  const missing = refs.filter((ref) => !(ref in available));
  if (hasUnresolvedRefs(entry.formula, available)) return { kind: 'problem', message: missing.length ? `Unavailable labels: ${[...new Set(missing)].map((ref) => `@${ref}`).join(', ')}` : 'One or more labels are unavailable.' };
  for (const label of entry.sourceLabels) {
    const cycle = detectCircularReference(label, entry.formula, character);
    if (cycle) return { kind: 'problem', message: `Circular reference: ${cycle.map((ref) => `@${ref}`).join(' -> ')}` };
  }
  if (entry.eventId) return { kind: 'runtime', message: 'Evaluated when the event runs' };
  const result = evaluateFormulaValue(entry.formula, available);
  if (result === null) return { kind: 'problem', message: 'This formula cannot be evaluated.' };
  if (typeof result === 'string' && entry.resultType === 'number') return { kind: 'problem', message: 'This field needs a number, not text.' };
  return { kind: 'value', value: result };
}

function replacePath<T>(root: T, path: Path, value: string | undefined): T {
  const replace = (current: unknown, remaining: Path): unknown => {
    if (remaining.length === 0) return value;
    const [key, ...rest] = remaining;
    if (Array.isArray(current) && typeof key === 'number' && key < current.length) {
      return current.map((item, index) => index === key ? replace(item, rest) : item);
    }
    if (isRecord(current) && typeof key === 'string' && key in current) {
      return { ...current, [key]: replace(current[key], rest) };
    }
    throw new Error('The formula source is no longer available. Reopen its editor.');
  };
  return replace(root, path) as T;
}

export function updateCharacterFormula(character: Character, request: CharacterFormula, formula: string | undefined): Character {
  const current = character.id === request.characterId ? collectCharacterFormulas(character).find((entry) => entry.key === request.key) : undefined;
  if (!current?.editable || current.storedValue !== request.storedValue) throw new Error('The formula changed or was removed. Reopen its editor.');
  const next = formula?.trim() || undefined;
  if (next === current.formula) return character;
  if (next) {
    const preview = previewCharacterFormula(character, { ...current, formula: next });
    if (preview.kind === 'problem') throw new Error(preview.message);
  }
  return replacePath(character, current.path, next);
}

function readPath(root: unknown, path: Path): unknown {
  let current = root;
  for (const key of path) {
    if (Array.isArray(current) && typeof key === 'number') current = current[key];
    else if (isRecord(current) && typeof key === 'string') current = current[key];
    else return undefined;
  }
  return current;
}

function clearInlineText(text: string, html = false): string {
  if (!html) return removeInlineFormulas(text);
  return text.split(/(<[^>]*>)/g).map((part, index) => {
    if (index % 2) return part;
    const decoded = decodeInlineText(part);
    const cleared = removeInlineFormulas(decoded);
    return cleared === decoded ? part : cleared.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }).join('');
}

export function removeAllCharacterFormulas(character: Character, editableOnly = false): Character {
  const entries = new Map(collectCharacterFormulas(character)
    .filter((entry) => !editableOnly || entry.editable)
    .map((entry) => [JSON.stringify(entry.path), entry]));
  let next = character;
  const write = (path: Path, value: string | undefined) => {
    if (readPath(next, path) !== value) next = replacePath(next, path, value);
  };
  const clearMirror = (path: Path, html = false) => {
    const text = readPath(next, path);
    if (typeof text === 'string') write(path, clearInlineText(text, html));
  };
  for (const entry of entries.values()) {
    const text = readPath(next, entry.path);
    if (typeof text !== 'string') throw new Error('The formula source is no longer available.');
    let value = entry.inline ? clearInlineText(text, entry.html) : undefined;
    if (entry.eventId && entry.path[entry.path.length - 2] === 'params') {
      const part = readPath(character, entry.path.slice(0, -2));
      if (!isRecord(part) || typeof part.kind !== 'string') throw new Error('The event formula source is no longer available.');
      const definition = entry.path[2] === 'trigger' ? getTriggerDef(part.kind) : getEffectDef(part.kind);
      const spec = definition?.params?.find((param) => param.key === entry.path[entry.path.length - 1]);
      if (spec && (spec.type === 'formula' || spec.type === 'amount')) value = spec.default;
    }
    write(entry.path, value);
    if (!entry.inline) continue;
    if (entry.path[entry.path.length - 1] === 'richText') clearMirror([...entry.path.slice(0, -1), 'text']);
    const noteTabsIndex = entry.path.indexOf('noteTabs');
    if (noteTabsIndex !== -1) {
      const dataPath = entry.path.slice(0, noteTabsIndex);
      clearMirror([...dataPath, 'text']);
      clearMirror([...dataPath, 'richText'], true);
    }
  }
  return next;
}
