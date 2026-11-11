import { v4 as uuidv4 } from 'uuid';
import type {
  Character,
  CompendiumSection,
  InventoryFieldTemplate,
  InventoryFieldType,
  InventoryItem,
  InventoryItemField,
  Widget,
} from '../types';
import {
  adaptInventoryItem,
  coerceInventoryFieldValue,
  createInventoryItemField,
  ensureWeightTemplate,
  fromCodexItem,
  getInventoryItemEndpoint,
  isInventoryWidgetType,
  linkInventoryFieldsToTemplates,
  normalizeInventoryQuantity,
  toCodexItem,
} from './inventory';
import { getSlotItems, getSlotMaxItems } from './inventorySlots';

type CompendiumSource = Pick<Character, 'compendium'>;

export const COMPENDIUM_EXPORT_KIND = 'ucs-compendium';
export const COMPENDIUM_EXPORT_VERSION = 1;

const DEFAULT_SECTION_NAMES = ['Gear', 'Spells', 'Feats', 'NPCs'];
const FIELD_TYPES: InventoryFieldType[] = ['text', 'number', 'checkbox', 'textarea'];

export function getDefaultCompendiumSections(): CompendiumSection[] {
  return DEFAULT_SECTION_NAMES.map((name) => ({ id: `default-${name.toLowerCase()}`, name, items: [] }));
}

/** Sections in display order. A character that never edited its compendium shows the default sections. */
export function getCompendiumSections(character: CompendiumSource | undefined): CompendiumSection[] {
  return character?.compendium ?? getDefaultCompendiumSections();
}

export function countCompendiumItems(sections: CompendiumSection[]): number {
  return sections.reduce((total, section) => total + section.items.length, 0);
}

function withSections<T extends CompendiumSource>(character: T, sections: CompendiumSection[]): T {
  return { ...character, compendium: sections };
}

export function addCompendiumSection<T extends CompendiumSource>(character: T, section: { id: string; name: string }): T {
  const name = section.name.trim();
  if (!name) return character;
  return withSections(character, [...getCompendiumSections(character), { id: section.id, name, items: [] }]);
}

export function renameCompendiumSection<T extends CompendiumSource>(character: T, sectionId: string, name: string): T {
  const trimmed = name.trim();
  const sections = getCompendiumSections(character);
  const current = sections.find((section) => section.id === sectionId);
  if (!trimmed || !current || current.name === trimmed) return character;
  return withSections(character, sections.map((section) => (section.id === sectionId ? { ...section, name: trimmed } : section)));
}

/** Deletes a section together with every entry in it. */
export function deleteCompendiumSection<T extends CompendiumSource>(character: T, sectionId: string): T {
  const sections = getCompendiumSections(character);
  if (!sections.some((section) => section.id === sectionId)) return character;
  return withSections(character, sections.filter((section) => section.id !== sectionId));
}

/** Adds an entry to a section (optionally before `beforeItemId`), or replaces the entry that has the same id. */
export function saveCompendiumItem<T extends CompendiumSource>(
  character: T,
  sectionId: string,
  item: InventoryItem,
  beforeItemId?: string | null,
): T {
  const sections = getCompendiumSections(character);
  if (!sections.some((section) => section.id === sectionId)) return character;
  return withSections(character, sections.map((section) => {
    if (section.id !== sectionId) return section;
    const exists = section.items.some((entry) => entry.id === item.id);
    if (exists) {
      return {
        ...section,
        items: section.items.map((entry) => (entry.id === item.id ? item : entry)),
      };
    }
    const beforeIndex = beforeItemId ? section.items.findIndex((entry) => entry.id === beforeItemId) : -1;
    if (beforeIndex < 0) {
      return { ...section, items: [...section.items, item] };
    }
    const nextItems = [...section.items];
    nextItems.splice(beforeIndex, 0, item);
    return { ...section, items: nextItems };
  }));
}

export function deleteCompendiumItem<T extends CompendiumSource>(character: T, sectionId: string, itemId: string): T {
  const sections = getCompendiumSections(character);
  const section = sections.find((entry) => entry.id === sectionId);
  if (!section?.items.some((item) => item.id === itemId)) return character;
  return withSections(character, sections.map((entry) => (
    entry.id === sectionId ? { ...entry, items: entry.items.filter((item) => item.id !== itemId) } : entry
  )));
}

/** Reorders an entry within a section or moves it into another section. */
export function moveCompendiumItem<T extends CompendiumSource>(
  character: T,
  options: {
    sourceSectionId: string;
    targetSectionId: string;
    itemId: string;
    /** Entry in the target section to insert before; null/undefined appends to the end. */
    beforeItemId?: string | null;
  },
): T {
  const { sourceSectionId, targetSectionId, itemId, beforeItemId } = options;
  const sections = getCompendiumSections(character);
  const sourceSection = sections.find((section) => section.id === sourceSectionId);
  const targetSection = sections.find((section) => section.id === targetSectionId);
  if (!sourceSection || !targetSection) return character;

  const sourceIndex = sourceSection.items.findIndex((entry) => entry.id === itemId);
  if (sourceIndex < 0) return character;
  if (sourceSectionId === targetSectionId && beforeItemId === itemId) return character;

  const movedItem = sourceSection.items[sourceIndex];

  if (sourceSectionId === targetSectionId) {
    const remaining = sourceSection.items.filter((entry) => entry.id !== itemId);
    const beforeIndex = beforeItemId ? remaining.findIndex((entry) => entry.id === beforeItemId) : -1;
    const insertIndex = beforeIndex >= 0 ? beforeIndex : remaining.length;
    if (insertIndex === sourceIndex) return character;
    const nextItems = [...remaining];
    nextItems.splice(insertIndex, 0, movedItem);
    return withSections(
      character,
      sections.map((section) => (section.id === sourceSectionId ? { ...section, items: nextItems } : section)),
    );
  }

  const nextSourceItems = sourceSection.items.filter((entry) => entry.id !== itemId);
  const targetBase = targetSection.items.some((entry) => entry.id === movedItem.id)
    ? { ...movedItem, id: uuidv4() }
    : movedItem;
  const beforeIndex = beforeItemId ? targetSection.items.findIndex((entry) => entry.id === beforeItemId) : -1;
  const insertIndex = beforeIndex >= 0 ? beforeIndex : targetSection.items.length;
  const nextTargetItems = [...targetSection.items];
  nextTargetItems.splice(insertIndex, 0, targetBase);

  return withSections(
    character,
    sections.map((section) => {
      if (section.id === sourceSectionId) return { ...section, items: nextSourceItems };
      if (section.id === targetSectionId) return { ...section, items: nextTargetItems };
      return section;
    }),
  );
}

/** Copies the compendium, e.g. when creating a character from a preset. */
export function copyCompendiumData(source: CompendiumSource): CompendiumSource {
  return source.compendium ? { compendium: JSON.parse(JSON.stringify(source.compendium)) } : {};
}

function stripHtml(html: string): string {
  return new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';
}

/** Plain text of an entry's description, for previews and search. */
export function getCompendiumDescriptionText(item: InventoryItem): string {
  return item.description ? stripHtml(item.description).replace(/\s+/g, ' ').trim() : '';
}

export function compendiumItemMatches(item: InventoryItem, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    item.name,
    ...item.fields.flatMap((field) => [field.name, String(field.value)]),
    getCompendiumDescriptionText(item),
  ].join('\n').toLowerCase();
  return haystack.includes(needle);
}

/** Converts a widget item into a standalone compendium entry with fresh ids. */
export function createCompendiumEntryFromItem(item: InventoryItem): InventoryItem | null {
  const name = item.name.trim();
  if (!name) return null;
  const { slotId: _slotId, description, ...rest } = item;
  const trimmedDescription = description?.trim() ? description : undefined;
  return toCodexItem({
    ...rest,
    id: uuidv4(),
    name,
    ...(trimmedDescription ? { description: trimmedDescription } : {}),
    fields: item.fields.map((field) => ({ ...field, id: uuidv4(), templateId: undefined })),
  });
}

/**
 * Builds a new item for an inventory, equipment or compendium widget from a compendium entry.
 * Attributes matching the widget's default attributes fill them in; the rest stay as additional attributes.
 */
export function instantiateCompendiumItem(
  item: InventoryItem,
  templates: InventoryFieldTemplate[],
  options: { allowQuantity?: boolean } = {},
): InventoryItem {
  const { slotId: _slotId, ...entry } = item;
  const source = options.allowQuantity === false ? toCodexItem(entry) : fromCodexItem(entry);
  const { quantity, ...rest } = source;
  const tracksWeight = templates.some((template) => template.reserved === 'weight');
  // Without encumbrance a weight is just another attribute.
  const fields = source.fields.map((field) => ({
    ...field,
    id: uuidv4(),
    reserved: tracksWeight ? field.reserved : undefined,
    templateId: undefined,
  }));
  const linked = linkInventoryFieldsToTemplates(fields, templates);
  const defaultFields = templates.map((template) => {
    const existing = linked.find((field) => field.templateId === template.id);
    if (!existing) {
      return createInventoryItemField(template.name, template.type, template.defaultValue, template.reserved, template.id);
    }
    return template.reserved
      ? { ...existing, name: template.name, type: template.type, value: coerceInventoryFieldValue(existing.value, template.type), reserved: template.reserved }
      : existing;
  });
  const additionalFields = linked.filter((field) => !field.templateId);

  return {
    ...rest,
    id: uuidv4(),
    ...(quantity !== undefined ? { quantity } : {}),
    fields: [...defaultFields, ...additionalFields],
  };
}

/**
 * Instantiates a copy of a compendium entry and inserts it into an Inventory, Equipment or Codex widget.
 */
export function copyCompendiumItemToWidgetData(
  entry: InventoryItem,
  widget: Pick<Widget, 'type' | 'data'>,
  options: { targetIndex?: number; targetSlotId?: string } = {},
): { items: InventoryItem[]; createdItem: InventoryItem } | null {
  if (!isInventoryWidgetType(widget.type)) return null;
  const currentItems = widget.data.inventoryItems ?? [];
  const endpoint = getInventoryItemEndpoint(widget);
  const templates = endpoint.tracksWeight
    ? ensureWeightTemplate(widget.data.inventoryDefaultFields ?? [])
    : (widget.data.inventoryDefaultFields ?? []);

  if (widget.type === 'INVENTORY_SLOTS') {
    if (!options.targetSlotId) return null;
    const slot = widget.data.inventorySlots?.find((candidate) => candidate.id === options.targetSlotId);
    if (!slot) return null;
    if (getSlotItems(currentItems, slot.id).length >= getSlotMaxItems(slot)) return null;
    const instantiated = instantiateCompendiumItem(entry, templates, { allowQuantity: true });
    const createdItem: InventoryItem = {
      ...adaptInventoryItem(instantiated, endpoint, endpoint),
      slotId: slot.id,
    };
    return { items: [...currentItems, createdItem], createdItem };
  }

  if (options.targetSlotId !== undefined) return null;
  const isCodex = widget.type === 'COMPENDIUM';
  const instantiated = instantiateCompendiumItem(entry, templates, { allowQuantity: !isCodex });
  const createdItem = adaptInventoryItem(instantiated, endpoint, endpoint);
  const nextItems = [...currentItems];
  const insertionIndex = options.targetIndex === undefined
    ? nextItems.length
    : Math.max(0, Math.min(options.targetIndex, nextItems.length));
  nextItems.splice(insertionIndex, 0, createdItem);
  return { items: nextItems, createdItem };
}

function sanitizeField(value: unknown): InventoryItemField | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.name !== 'string') return null;
  const type = FIELD_TYPES.includes(raw.type as InventoryFieldType) ? (raw.type as InventoryFieldType) : 'text';
  const rawValue = typeof raw.value === 'string' || typeof raw.value === 'number' || typeof raw.value === 'boolean' ? raw.value : '';
  const reserved = raw.reserved === 'weight' ? 'weight' : undefined;
  return {
    ...createInventoryItemField(raw.name, type, coerceInventoryFieldValue(rawValue, type), reserved),
    ...(typeof raw.valueLabel === 'string' && raw.valueLabel ? { valueLabel: raw.valueLabel } : {}),
    ...(typeof raw.valueFormula === 'string' && raw.valueFormula ? { valueFormula: raw.valueFormula } : {}),
  };
}

function sanitizeItem(value: unknown): InventoryItem | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;
  const quantity = normalizeInventoryQuantity(raw.quantity);
  return toCodexItem({
    id: uuidv4(),
    name,
    ...(quantity !== undefined ? { quantity } : {}),
    ...(typeof raw.description === 'string' && raw.description.trim() ? { description: raw.description } : {}),
    fields: (Array.isArray(raw.fields) ? raw.fields : []).flatMap((field) => sanitizeField(field) ?? []),
      });
}

function sanitizeSection(value: unknown): CompendiumSection | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;
  return {
    id: uuidv4(),
    name,
    items: (Array.isArray(raw.items) ? raw.items : []).flatMap((item) => sanitizeItem(item) ?? []),
  };
}

export function serializeCompendium(sections: CompendiumSection[]): string {
  return JSON.stringify({
    kind: COMPENDIUM_EXPORT_KIND,
    version: COMPENDIUM_EXPORT_VERSION,
    sections: sections.map((section) => ({
      name: section.name,
      items: section.items.map(({ slotId: _slotId, ...item }) => item),
    })),
  }, null, 2);
}

export type CompendiumImportParse =
  | { ok: true; sections: CompendiumSection[] }
  | { ok: false; error: string };

/** Reads exported compendium JSON (or a bare list of sections). Every section, entry and attribute gets a fresh id. */
export function parseCompendiumImport(text: string): CompendiumImportParse {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Enter valid JSON before importing the compendium.' };
  }
  const rawSections = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { sections?: unknown }).sections)
      ? (data as { sections: unknown[] }).sections
      : null;
  if (!rawSections) return { ok: false, error: 'This JSON does not contain a compendium.' };
  const sections = rawSections.flatMap((section) => sanitizeSection(section) ?? []);
  if (sections.length === 0) return { ok: false, error: 'This JSON does not contain any compendium sections.' };
  return { ok: true, sections };
}

export interface CompendiumMergeResult {
  sections: CompendiumSection[];
  addedSections: number;
  addedItems: number;
  /** Entries left out because their section already has an entry with the same name. */
  skippedItems: number;
}

const normalizeName = (name: string) => name.trim().toLowerCase();

/** Adds imported entries to the sections that share their name, creating sections that don't exist yet. */
export function mergeCompendiumSections(existing: CompendiumSection[], imported: CompendiumSection[]): CompendiumMergeResult {
  const sections = existing.map((section) => ({ ...section, items: [...section.items] }));
  let addedSections = 0;
  let addedItems = 0;
  let skippedItems = 0;

  for (const incoming of imported) {
    let target = sections.find((section) => normalizeName(section.name) === normalizeName(incoming.name));
    if (!target) {
      target = { id: uuidv4(), name: incoming.name, items: [] };
      sections.push(target);
      addedSections += 1;
    }
    for (const item of incoming.items) {
      if (target.items.some((entry) => normalizeName(entry.name) === normalizeName(item.name))) {
        skippedItems += 1;
      } else {
        target.items.push(item);
        addedItems += 1;
      }
    }
  }

  return { sections, addedSections, addedItems, skippedItems };
}

export type CompendiumImportMode = 'add' | 'replace';

/** Discards the existing sections and keeps only the imported ones. */
export function replaceCompendiumSections(imported: CompendiumSection[]): CompendiumMergeResult {
  const sections = imported.map((section) => ({ ...section, items: [...section.items] }));
  return { sections, addedSections: sections.length, addedItems: countCompendiumItems(sections), skippedItems: 0 };
}

export function describeCompendiumReplace(result: Pick<CompendiumMergeResult, 'addedSections' | 'addedItems'>): string {
  const entries = `${result.addedItems} ${result.addedItems === 1 ? 'entry' : 'entries'}`;
  const sections = `${result.addedSections} ${result.addedSections === 1 ? 'section' : 'sections'}`;
  return `Replaced the compendium with ${entries} in ${sections}.`;
}

export function describeCompendiumImport(result: Pick<CompendiumMergeResult, 'addedSections' | 'addedItems' | 'skippedItems'>): string {
  const parts = [`Imported ${result.addedItems} ${result.addedItems === 1 ? 'entry' : 'entries'}`];
  if (result.addedSections > 0) parts[0] += ` and ${result.addedSections} new ${result.addedSections === 1 ? 'section' : 'sections'}`;
  if (result.skippedItems > 0) parts.push(`${result.skippedItems} skipped because an entry with the same name already exists`);
  return `${parts.join(', ')}.`;
}
