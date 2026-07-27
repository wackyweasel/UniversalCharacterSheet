import { v4 as uuidv4 } from 'uuid';
import {
  Character,
  InventoryEncumbranceSettings,
  InventoryFieldTemplate,
  InventoryFieldType,
  InventoryFieldValue,
  InventoryItem,
  InventoryItemField,
  WidgetData,
} from '../types';

export const DEFAULT_INVENTORY_ENCUMBRANCE: InventoryEncumbranceSettings = {
  enabled: true,
  unit: 'kg',
  includeInGlobalLoad: true,
  showGlobalCounter: false,
};

export function getDefaultInventoryData(): Pick<
  WidgetData,
  'inventoryItems' | 'inventoryDefaultFields' | 'inventoryEncumbrance'
> {
  const defaultFields = [
    createInventoryFieldTemplate('Value', 'text'),
    createInventoryFieldTemplate('Notes', 'text'),
  ];

  return {
    inventoryItems: [],
    inventoryDefaultFields: ensureWeightTemplate(defaultFields),
    inventoryEncumbrance: { ...DEFAULT_INVENTORY_ENCUMBRANCE },
  };
}

export function getDefaultInventoryFieldValue(type: InventoryFieldType): InventoryFieldValue {
  if (type === 'number') return 0;
  if (type === 'checkbox') return false;
  return '';
}

export function normalizeInventoryFieldType(type: InventoryFieldType): Exclude<InventoryFieldType, 'textarea'> {
  return type === 'textarea' ? 'text' : type;
}

export function coerceInventoryFieldValue(
  value: InventoryFieldValue,
  type: InventoryFieldType,
): InventoryFieldValue {
  if (type === 'number') {
    const numericValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }
  if (type === 'checkbox') return typeof value === 'boolean' ? value : Boolean(value);
  return typeof value === 'string' ? value : String(value);
}

export function createInventoryFieldTemplate(
  name: string,
  type: InventoryFieldType,
  reserved?: 'weight',
): InventoryFieldTemplate {
  const normalizedType = reserved === 'weight' ? 'number' : normalizeInventoryFieldType(type);
  return {
    id: uuidv4(),
    name: reserved === 'weight' ? 'Weight' : name,
    type: normalizedType,
    defaultValue: getDefaultInventoryFieldValue(normalizedType),
    reserved,
  };
}

export function createInventoryItemField(
  name: string,
  type: InventoryFieldType,
  value: InventoryFieldValue = getDefaultInventoryFieldValue(type),
  reserved?: 'weight',
  templateId?: string,
): InventoryItemField {
  const normalizedType = reserved === 'weight' ? 'number' : normalizeInventoryFieldType(type);
  return {
    id: uuidv4(),
    name: reserved === 'weight' ? 'Weight' : name,
    type: normalizedType,
    value: coerceInventoryFieldValue(value, normalizedType),
    reserved,
    templateId,
  };
}

export function createInventoryItem(
  name: string,
  templates: InventoryFieldTemplate[],
): InventoryItem {
  return {
    id: uuidv4(),
    name,
    fields: templates.map((template) => createInventoryItemField(
      template.name,
      template.type,
      template.defaultValue,
      template.reserved,
      template.id,
    )),
  };
}

export function linkInventoryFieldsToTemplates(
  fields: InventoryItemField[],
  templates: InventoryFieldTemplate[],
): InventoryItemField[] {
  const claimedTemplateIds = new Set<string>();
  const templateIds = new Set(templates.map((template) => template.id));
  const linkedFields = fields.map((field) => {
    const normalizedField = { ...field, type: normalizeInventoryFieldType(field.type) };
    let template = field.templateId && templateIds.has(field.templateId)
      ? templates.find((entry) => entry.id === field.templateId)
      : undefined;

    if (!template && field.reserved) {
      template = templates.find((entry) => entry.reserved === field.reserved && !claimedTemplateIds.has(entry.id));
    }
    if (!template) {
      template = templates.find((entry) => (
        !claimedTemplateIds.has(entry.id)
        && entry.name.trim().toLowerCase() === field.name.trim().toLowerCase()
        && normalizeInventoryFieldType(entry.type) === normalizedField.type
      ));
    }
    if (!template || claimedTemplateIds.has(template.id)) {
      return { ...normalizedField, templateId: undefined };
    }

    claimedTemplateIds.add(template.id);
    return { ...normalizedField, templateId: template.id };
  });

  const defaultFields = templates.flatMap((template) => {
    const field = linkedFields.find((entry) => entry.templateId === template.id);
    return field ? [field] : [];
  });
  const additionalFields = linkedFields.filter((field) => !field.templateId || !templateIds.has(field.templateId));
  return [...defaultFields, ...additionalFields];
}

export function ensureWeightTemplate(templates: InventoryFieldTemplate[]): InventoryFieldTemplate[] {
  const reservedIndex = templates.findIndex((template) => template.reserved === 'weight');
  if (reservedIndex >= 0) {
    return templates.map((template, index) => index === reservedIndex
      ? { ...template, name: 'Weight', type: 'number', defaultValue: coerceInventoryFieldValue(template.defaultValue, 'number'), reserved: 'weight' }
      : template);
  }

  const compatibleIndex = templates.findIndex((template) => (
    template.type === 'number' && template.name.trim().toLowerCase() === 'weight'
  ));
  if (compatibleIndex >= 0) {
    return templates.map((template, index) => index === compatibleIndex
      ? { ...template, name: 'Weight', type: 'number', defaultValue: coerceInventoryFieldValue(template.defaultValue, 'number'), reserved: 'weight' }
      : template);
  }

  return [createInventoryFieldTemplate('Weight', 'number', 'weight'), ...templates];
}

export function ensureItemWeight(item: InventoryItem): InventoryItem {
  const reservedIndex = item.fields.findIndex((field) => field.reserved === 'weight');
  if (reservedIndex >= 0) {
    return {
      ...item,
      fields: item.fields.map((field, index) => index === reservedIndex
        ? { ...field, name: 'Weight', type: 'number', value: coerceInventoryFieldValue(field.value, 'number'), reserved: 'weight' }
        : field),
    };
  }

  const compatibleIndex = item.fields.findIndex((field) => (
    field.type === 'number' && field.name.trim().toLowerCase() === 'weight'
  ));
  if (compatibleIndex >= 0) {
    return {
      ...item,
      fields: item.fields.map((field, index) => index === compatibleIndex
        ? { ...field, name: 'Weight', type: 'number', value: coerceInventoryFieldValue(field.value, 'number'), reserved: 'weight' }
        : field),
    };
  }

  return {
    ...item,
    fields: [createInventoryItemField('Weight', 'number', 0, 'weight'), ...item.fields],
  };
}

export function setInventoryEncumbranceEnabled(
  items: InventoryItem[],
  templates: InventoryFieldTemplate[],
  enabled: boolean,
): { items: InventoryItem[]; templates: InventoryFieldTemplate[] } {
  if (enabled) {
    return {
      items: items.map(ensureItemWeight),
      templates: ensureWeightTemplate(templates),
    };
  }

  return {
    items,
    templates: templates.filter((template) => template.reserved !== 'weight'),
  };
}

export function getInventoryItemWeight(item: InventoryItem): number {
  const weightField = item.fields.find((field) => field.reserved === 'weight');
  const weight = weightField?.type === 'number' ? Number(weightField.value) : 0;
  return Number.isFinite(weight) ? Math.max(0, weight) : 0;
}

export function getInventoryLoad(items: InventoryItem[]): number {
  return items.reduce((total, item) => total + getInventoryItemWeight(item), 0);
}

export function getCharacterGlobalInventoryLoad(character: Character | undefined): number {
  if (!character) return 0;
  return character.sheets.reduce((characterTotal, sheet) => (
    characterTotal + sheet.widgets.reduce((sheetTotal, widget) => {
      if (widget.type !== 'INVENTORY') return sheetTotal;
      const settings = widget.data.inventoryEncumbrance;
      if (!settings?.enabled || !settings.includeInGlobalLoad) return sheetTotal;
      return sheetTotal + getInventoryLoad(widget.data.inventoryItems || []);
    }, 0)
  ), 0);
}

interface InventoryMoveResult {
  sourceItems: InventoryItem[];
  targetItems: InventoryItem[];
}

export function moveInventoryItemBetweenLists(
  sourceItems: InventoryItem[],
  targetItems: InventoryItem[],
  itemId: string,
  targetIndex: number,
  targetRequiresWeight: boolean,
): InventoryMoveResult | null {
  const sourceIndex = sourceItems.findIndex((item) => item.id === itemId);
  if (sourceIndex < 0) return null;

  if (sourceItems === targetItems) {
    const reordered = [...sourceItems];
    const [sourceItem] = reordered.splice(sourceIndex, 1);
    const movedItem = targetRequiresWeight ? ensureItemWeight(sourceItem) : sourceItem;
    const adjustedTargetIndex = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
    const insertionIndex = Math.max(0, Math.min(adjustedTargetIndex, reordered.length));
    const itemUnchanged = movedItem === sourceItem;
    if (insertionIndex === sourceIndex && itemUnchanged) return null;
    reordered.splice(insertionIndex, 0, movedItem);
    return { sourceItems: reordered, targetItems: reordered };
  }

  if (targetItems.some((item) => item.id === itemId)) return null;
  const sourceItem = sourceItems[sourceIndex];
  const movedItem = targetRequiresWeight ? ensureItemWeight(sourceItem) : sourceItem;
  const nextSourceItems = sourceItems.filter((item) => item.id !== itemId);
  const nextTargetItems = [...targetItems];
  const insertionIndex = Math.max(0, Math.min(targetIndex, nextTargetItems.length));
  nextTargetItems.splice(insertionIndex, 0, movedItem);
  return { sourceItems: nextSourceItems, targetItems: nextTargetItems };
}