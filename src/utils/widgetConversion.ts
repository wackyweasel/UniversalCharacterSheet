import { v4 as uuidv4 } from 'uuid';
import type {
  Character,
  CheckboxItem,
  CustomDie,
  DiceGroup,
  DisplayNumber,
  FormItem,
  MixedField,
  NumberItem,
  PoolResource,
  ProgressClockItem,
  RollTableItem,
  SpellLevel,
  TableCell,
  ToggleItem,
  WalletCurrency,
  Widget,
  WidgetData,
  WidgetType,
} from '../types';
import { getEventEffects } from '../events/steps';
import { getEventProblems, getEventTitle } from '../events/registry';
import { getCardTableBackDesign, getCardTableCards, getCardTableDiscardedCards, normalizeCardTableOrigins } from './cardTable';
import { getHealDiceExpression, parseDiceExpression } from './diceExpression';
import { adaptInventoryItem, DEFAULT_INVENTORY_ENCUMBRANCE, ensureWeightTemplate } from './inventory';
import { createDefaultInventorySlots } from './inventorySlots';
import { getActiveNoteContent, getNoteTabs } from './noteTabs';
import { DEFAULT_WALLET_RATE, normalizeWalletAmount } from './wallet';

export interface WidgetConversion {
  /** The full data of the converted widget. */
  data: WidgetData;
  /** What is lost by the conversion, in plain language. */
  warnings: string[];
  /** What the conversion invents, or loses without consequence, that the user may want to know. */
  notes: string[];
  /** Variable labels and formulas that survive the conversion. */
  carried: string[];
  /** How much content the converted widget holds, such as "14 items". */
  summary?: string;
}

/** Some conversions keep one thing out of several; the user picks which. */
export interface ConversionChoice {
  label: string;
  options: string[];
}

export interface ConversionOptions {
  /** Index of the option picked from {@link ConversionChoice}; the first one when unset. */
  choice?: number;
  /** Titles of the places that use a variable label, used to tell a harmless loss from a harmful one. */
  labelUsers?: (label: string) => string[];
}

interface ConverterOutput {
  data: WidgetData;
  warnings?: string[];
  notes?: string[];
}

/** Returns null when the source holds nothing the target can represent. */
type Converter = (data: WidgetData, widgetId?: string, choice?: number) => ConverterOutput | null;

const clampChoice = (choice: number | undefined, count: number): number => (
  Math.min(Math.max(Math.floor(choice ?? 0) || 0, 0), Math.max(0, count - 1))
);

type BarType = 'HEALTH_BAR' | 'PROGRESS_BAR' | 'THRESHOLD_TRACK';

const KEPT_KEYS = ['label', 'hideWidgetHeader', 'hideWidgetEditButton'] as const;

function pick<T extends object, K extends keyof T>(source: T, keys: readonly K[]): Partial<Pick<T, K>> {
  const picked: Partial<Pick<T, K>> = {};
  for (const key of keys) {
    if (source[key] !== undefined) picked[key] = source[key];
  }
  return picked;
}

function compact(data: WidgetData): WidgetData {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as WidgetData;
}

const cellValue = (cell: string | TableCell | undefined): string => (
  cell === undefined ? '' : typeof cell === 'string' ? cell : cell.value
);

function htmlToLines(html: string): string[] {
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr|blockquote)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

const LABELLED_ROOTS = new Set(['rows', 'tableColumnSettings', 'tableRowSettings']);

/**
 * Variable labels or formulas used by a widget's data. Other widgets reference labels in formulas,
 * so losing one breaks them.
 */
function collectLinkedStrings(data: WidgetData, kind: 'Label' | 'Formula'): Set<string> {
  const found = new Set<string>();
  const lowerKind = kind.toLowerCase();
  const visit = (value: unknown, root: string, depth: number) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => visit(entry, root, depth + 1));
    } else if (value && typeof value === 'object') {
      for (const [key, entry] of Object.entries(value)) {
        const matches = key.endsWith(kind) || (key === lowerKind && depth > 0 && LABELLED_ROOTS.has(root));
        if (matches && typeof entry === 'string' && entry.trim()) found.add(entry.trim());
        else visit(entry, depth === 0 ? key : root, depth + 1);
      }
    }
  };
  visit(data, '', 0);
  for (const entry of Object.values(kind === 'Label' ? data.fieldLabels ?? {} : data.fieldFormulas ?? {})) {
    if (entry?.trim()) found.add(entry.trim());
  }
  return found;
}

function ok(data: WidgetData, warnings: string[] = [], notes: string[] = []): ConverterOutput {
  return { data, warnings, notes };
}

// ----- Checklist, conditions and switch -----

const checklistToConditions: Converter = (data) => ok({
  toggleItems: (data.checkboxItems ?? []).map((item): ToggleItem => ({
    name: item.name,
    active: item.checked,
    ...(item.tooltip ? { tooltip: item.tooltip } : {}),
  })),
});

const conditionsToChecklist: Converter = (data) => ok({
  checkboxItems: (data.toggleItems ?? []).map((item): CheckboxItem => ({
    name: item.name,
    checked: item.active,
    ...(item.tooltip ? { tooltip: item.tooltip } : {}),
  })),
});

const switchToChecklist: Converter = (data) => ok({
  checkboxItems: [{ name: data.label || 'Item', checked: data.toggleState === true }],
});

const switchToConditions: Converter = (data) => ok({
  toggleItems: [{ name: data.label || 'Item', active: data.toggleState === true }],
});

// ----- Number tracker and number display -----

const NUMBER_SHARED_KEYS = [
  'value', 'showPositiveSign', 'valueLabel', 'valueFormula',
  'minValue', 'minValueLabel', 'minValueFormula',
  'maxValue', 'maxValueLabel', 'maxValueFormula', 'tooltip',
] as const;

const numberToDisplay: Converter = (data) => ok({
  displayNumbers: (data.numberItems ?? []).map((item): DisplayNumber => ({
    ...pick(item, NUMBER_SHARED_KEYS),
    label: item.name,
    value: item.value,
  })),
  displayLayout: 'auto',
  numberBoxFixedAspectRatio: true,
  numberBoxScale: 100,
  showDisplayNumberMax: data.showNumberItemMax,
  showDisplayNumberButtons: data.showIncrementButtons ?? true,
});

const displayToNumber: Converter = (data) => {
  const items = data.displayNumbers ?? [];
  const hasSecondary = items.some((item) => (
    item.secondaryValue !== undefined || item.secondaryValueLabel || item.secondaryValueFormula
  ));
  return ok({
    numberItems: items.map((item): NumberItem => ({
      ...pick(item, NUMBER_SHARED_KEYS),
      name: item.label,
      value: item.value,
    })),
    showNumberItemMax: data.showDisplayNumberMax,
    showIncrementButtons: data.showDisplayNumberButtons ?? false,
  }, hasSecondary ? ['Secondary values are removed.'] : []);
};

// ----- Lists, tables, forms, notes and roll tables -----

const listItems = (data: WidgetData) => data.items ?? [];

const listToTable: Converter = (data) => ok({
  columns: [data.label || 'Items'],
  rows: listItems(data).map((item) => ({ cells: [item] })),
  hideTableHeader: true,
});

const tableColumnName = (data: WidgetData, column: number): string => (
  data.columns?.[column]?.trim() || `Column ${column + 1}`
);

/** The column picked for a one-column target, and a warning when other columns are lost. */
function pickTableColumn(data: WidgetData, choice: number | undefined): { values: string[]; warnings: string[] } {
  const count = data.columns?.length ?? 0;
  const column = clampChoice(choice, count);
  return {
    values: (data.rows ?? []).map((row) => cellValue(row.cells[column])),
    warnings: count > 1 ? [`Only the "${tableColumnName(data, column)}" column is kept.`] : [],
  };
}

const tableToList: Converter = (data, _widgetId, choice) => {
  const { values, warnings } = pickTableColumn(data, choice);
  return ok({ items: values }, warnings);
};

const formToTable: Converter = (data) => ok({
  columns: ['Name', 'Value'],
  rows: (data.formItems ?? []).map((item) => ({
    cells: [
      item.name,
      {
        value: item.value,
        ...(item.valueLabel ? { label: item.valueLabel } : {}),
        ...(item.valueFormula ? { formula: item.valueFormula } : {}),
      },
    ],
  })),
  hideTableHeader: true,
});

const tableToForm: Converter = (data) => ok({
  formItems: (data.rows ?? []).map((row): FormItem => {
    const valueCell = row.cells[1];
    const detail = typeof valueCell === 'object' ? valueCell : undefined;
    return {
      name: cellValue(row.cells[0]),
      value: cellValue(valueCell),
      ...(detail?.label ? { valueLabel: detail.label } : {}),
      ...(detail?.formula ? { valueFormula: detail.formula } : {}),
    };
  }),
}, (data.columns?.length ?? 0) > 2 ? ['Only the first two columns are kept.'] : []);

const listToText: Converter = (data) => ok({ text: listItems(data).join('\n') });

const textToList: Converter = (data) => {
  const { text = '', richText } = getActiveNoteContent(data);
  const lines = richText ? htmlToLines(richText) : text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return ok({ items: lines }, getNoteTabs(data).length > 1 ? ['Only the active tab is converted.'] : []);
};

const listToChecklist: Converter = (data) => ok({
  checkboxItems: listItems(data).map((name): CheckboxItem => ({ name, checked: false })),
});

const listToConditions: Converter = (data) => ok({
  toggleItems: listItems(data).map((name): ToggleItem => ({ name, active: false })),
});

const checklistToList: Converter = (data) => ok({ items: (data.checkboxItems ?? []).map((item) => item.name) });

const conditionsToList: Converter = (data) => ok({ items: (data.toggleItems ?? []).map((item) => item.name) });

const listToRollTable: Converter = (data) => ok({
  rollTableItems: listItems(data).map((text): RollTableItem => ({ text, weight: 1 })),
});

const rollTableToList: Converter = (data) => {
  const items = data.rollTableItems ?? [];
  const losesDetail = items.some((item) => item.weight !== 1 || item.description?.trim());
  return ok({ items: items.map((item) => item.text) }, losesDetail ? ['Weights and descriptions are removed.'] : []);
};

const rollTableToTable: Converter = (data) => ok({
  columns: ['Result', 'Weight', 'Description'],
  rows: (data.rollTableItems ?? []).map((item) => ({
    cells: [item.text, String(item.weight), item.description ?? ''],
  })),
});

// ----- Health bar, progress bar and threshold track -----

const BAR_BASE_KEYS = ['currentValue', 'minValue', 'maxValue', 'increment', 'showIncrementButtons', 'fillColor'] as const;

const BAR_EXTRA_KEYS: Record<BarType, readonly (keyof WidgetData)[]> = {
  HEALTH_BAR: ['verticalBar', 'temporaryValue', 'enableTemporaryHp'],
  PROGRESS_BAR: ['verticalBar', 'showPercentage', 'showValues', 'inlineLabel', 'allowOutOfRange'],
  THRESHOLD_TRACK: ['showValues'],
};

const BAR_FIELD_KEYS: Record<BarType, readonly string[]> = {
  HEALTH_BAR: ['currentValue', 'temporaryValue', 'maxValue', 'increment'],
  PROGRESS_BAR: ['currentValue', 'minValue', 'maxValue', 'increment'],
  THRESHOLD_TRACK: ['currentValue', 'minValue', 'maxValue', 'increment'],
};

function filterRecord(record: Record<string, string> | undefined, keys: readonly string[]): Record<string, string> | undefined {
  if (!record) return undefined;
  const filtered = Object.fromEntries(Object.entries(record).filter(([key]) => keys.includes(key)));
  return Object.keys(filtered).length > 0 ? filtered : undefined;
}

function defaultTrackThresholds(min: number, max: number) {
  const at = (ratio: number) => Math.round(min + (max - min) * ratio);
  return [
    { id: uuidv4(), name: 'Uneasy', value: at(0.3) },
    { id: uuidv4(), name: 'Strained', value: at(0.6), modifier: -1 },
    { id: uuidv4(), name: 'Critical', value: at(0.9), modifier: -2 },
  ];
}

// What each widget shows when a value is missing, so conversions keep the displayed numbers.
const BAR_DEFAULTS: Record<BarType, WidgetData> = {
  HEALTH_BAR: { currentValue: 10, minValue: 0, maxValue: 10, increment: 1, showIncrementButtons: true },
  PROGRESS_BAR: { currentValue: 0, minValue: 0, maxValue: 100, increment: 1, showIncrementButtons: false },
  THRESHOLD_TRACK: { currentValue: 0, minValue: 0, maxValue: 10, showIncrementButtons: true },
};

function barConverter(source: BarType, target: BarType): Converter {
  return (rawData) => {
    const data: WidgetData = { ...BAR_DEFAULTS[source], ...compact(rawData) };
    const warnings: string[] = [];
    const notes: string[] = [];
    const out: WidgetData = {
      ...pick(data, [...BAR_BASE_KEYS, ...BAR_EXTRA_KEYS[target]]),
      fieldLabels: filterRecord(data.fieldLabels, BAR_FIELD_KEYS[target]),
      fieldFormulas: filterRecord(data.fieldFormulas, BAR_FIELD_KEYS[target]),
    };

    if (target === 'HEALTH_BAR') {
      out.showIncrementButtons ??= true;
      out.temporaryValue ??= 0;
      out.enableTemporaryHp ??= true;
    } else if (target === 'PROGRESS_BAR') {
      out.showPercentage ??= false;
      out.showIncrementButtons ??= false;
    } else {
      out.currentValue ??= 0;
      out.minValue ??= 0;
      out.maxValue ??= 10;
      out.trackStyle = 'steps';
      out.trackThresholdMode = 'rising';
      out.trackShowZoneNames = true;
      out.showValues ??= true;
      out.showIncrementButtons ??= true;
      out.trackThresholds = defaultTrackThresholds(out.minValue, out.maxValue);
      notes.push('Default zones are added; edit them afterwards.');
    }

    if (source === 'HEALTH_BAR' && (data.temporaryValue ?? 0) > 0) warnings.push('Temporary HP is removed.');
    if (source === 'THRESHOLD_TRACK' && (data.trackThresholds?.length ?? 0) > 0) warnings.push('The zones are removed.');
    return ok(out, warnings, notes);
  };
}

// ----- Mixed fields -----

const MIXED_LAYOUT_KEYS = ['labelWidth', 'itemSpacing', 'itemColumns', 'wrapItemNames'] as const;

const formToMixed: Converter = (data) => ok({
  ...pick(data, MIXED_LAYOUT_KEYS),
  mixedFields: (data.formItems ?? []).map((item): MixedField => ({
    type: 'text',
    name: item.name,
    value: item.value,
    ...pick(item, ['tooltip', 'valueLabel', 'valueFormula']),
  })),
});

const numberToMixed: Converter = (data) => ok({
  ...pick(data, ['itemColumns', 'wrapItemNames']),
  mixedFields: (data.numberItems ?? []).map((item): MixedField => ({
    type: 'number',
    ...pick(item, NUMBER_SHARED_KEYS),
    name: item.name,
    value: item.value,
    showIncrementButtons: data.showIncrementButtons ?? true,
  })),
});

const checklistToMixed: Converter = (data) => ok({
  ...pick(data, ['itemColumns']),
  mixedFields: (data.checkboxItems ?? []).map((item): MixedField => ({
    type: 'switch',
    name: item.name,
    value: item.checked,
    ...pick(item, ['tooltip']),
  })),
});

const conditionsToMixed: Converter = (data) => ok({
  mixedFields: (data.toggleItems ?? []).map((item): MixedField => ({
    type: 'switch',
    name: item.name,
    value: item.active,
    ...pick(item, ['tooltip']),
  })),
});

function mixedConverter(
  accepts: (field: MixedField) => boolean,
  build: (fields: MixedField[], data: WidgetData) => WidgetData,
): Converter {
  return (data) => {
    const fields = data.mixedFields ?? [];
    const kept = fields.filter(accepts);
    if (fields.length > 0 && kept.length === 0) return null;
    const dropped = fields.length - kept.length;
    return ok(
      build(kept, data),
      dropped > 0 ? [`${dropped} field${dropped === 1 ? '' : 's'} of another type ${dropped === 1 ? 'is' : 'are'} removed.`] : [],
    );
  };
}

const mixedToForm = mixedConverter(
  (field) => field.type === 'text' || field.type === 'menu',
  (fields, data) => ({
    ...pick(data, MIXED_LAYOUT_KEYS),
    formItems: fields.map((field): FormItem => {
      const detail = field as Extract<MixedField, { type: 'text' | 'menu' }>;
      return {
        name: field.name,
        value: detail.value,
        ...pick(field, ['tooltip']),
        ...(detail.valueLabel ? { valueLabel: detail.valueLabel } : {}),
        ...(field.type === 'text' && field.valueFormula ? { valueFormula: field.valueFormula } : {}),
      };
    }),
  }),
);

const mixedToNumber = mixedConverter(
  (field) => field.type === 'number',
  (fields, data) => ({
    ...pick(data, ['itemColumns', 'wrapItemNames']),
    numberItems: fields.flatMap((field): NumberItem[] => (
      field.type === 'number'
        ? [{ ...pick(field, NUMBER_SHARED_KEYS), name: field.name, value: field.value }]
        : []
    )),
  }),
);

const mixedToChecklist = mixedConverter(
  (field) => field.type === 'switch',
  (fields) => ({
    checkboxItems: fields.flatMap((field): CheckboxItem[] => (
      field.type === 'switch' ? [{ name: field.name, checked: field.value, ...pick(field, ['tooltip']) }] : []
    )),
  }),
);

const mixedToConditions = mixedConverter(
  (field) => field.type === 'switch',
  (fields) => ({
    toggleItems: fields.flatMap((field): ToggleItem[] => (
      field.type === 'switch' ? [{ name: field.name, active: field.value, ...pick(field, ['tooltip']) }] : []
    )),
  }),
);

// ----- Inventory and codex -----

const inventoryToCodex: Converter = (data) => ok({
  inventoryItems: (data.inventoryItems ?? []).map((item) => adaptInventoryItem(
    item,
    { type: 'INVENTORY', tracksWeight: false },
    { type: 'COMPENDIUM', tracksWeight: false },
  )),
  inventoryDefaultFields: (data.inventoryDefaultFields ?? []).map((template) => (
    template.reserved ? { ...template, reserved: undefined } : template
  )),
}, data.inventoryEncumbrance?.enabled ? ['Encumbrance tracking is removed; weight stays as a regular attribute.'] : []);

const codexToInventory: Converter = (data) => ok({
  inventoryItems: (data.inventoryItems ?? []).map((item) => adaptInventoryItem(
    item,
    { type: 'COMPENDIUM', tracksWeight: false },
    { type: 'INVENTORY', tracksWeight: false },
  )),
  inventoryDefaultFields: ensureWeightTemplate(data.inventoryDefaultFields ?? []),
  inventoryEncumbrance: { ...DEFAULT_INVENTORY_ENCUMBRANCE },
});

// ----- Resource pool, progress clocks and spell slots -----

function getPoolResources(data: WidgetData): PoolResource[] {
  if (data.poolResources && data.poolResources.length > 0) return data.poolResources;
  return [{
    name: 'Resource 1',
    max: data.maxPool ?? 5,
    current: data.currentPool ?? 5,
    style: data.poolStyle ?? 'dots',
    maxLabel: data.fieldLabels?.maxPool,
    currentLabel: data.fieldLabels?.currentPool,
    maxFormula: data.fieldFormulas?.maxPool,
    currentFormula: data.fieldFormulas?.currentPool,
    tooltip: data.poolTooltip,
  }];
}

const poolToClocks: Converter = (data) => ok({
  clockItems: getPoolResources(data).map((resource): ProgressClockItem => ({
    id: uuidv4(),
    name: resource.name,
    segments: resource.max,
    value: resource.current,
    ...(resource.maxLabel ? { segmentsLabel: resource.maxLabel } : {}),
    ...(resource.maxFormula ? { segmentsFormula: resource.maxFormula } : {}),
    ...(resource.currentLabel ? { valueLabel: resource.currentLabel } : {}),
    ...(resource.currentFormula ? { valueFormula: resource.currentFormula } : {}),
  })),
  clockLayout: 'auto',
  clockSize: 100,
});

const clocksToPool: Converter = (data) => ok({
  poolResources: (data.clockItems ?? []).map((item): PoolResource => ({
    name: item.name,
    max: item.segments,
    current: item.value,
    style: 'dots',
    ...(item.segmentsLabel ? { maxLabel: item.segmentsLabel } : {}),
    ...(item.segmentsFormula ? { maxFormula: item.segmentsFormula } : {}),
    ...(item.valueLabel ? { currentLabel: item.valueLabel } : {}),
    ...(item.valueFormula ? { currentFormula: item.valueFormula } : {}),
  })),
  showPoolCount: false,
});

const SPELL_SHAPE_STYLES = { circle: 'dots', square: 'boxes', diamond: 'diamonds' } as const;
const DEFAULT_SPELL_LEVELS: SpellLevel[] = [{ level: 1, max: 4, used: 0 }];

const spellSlotsToPool: Converter = (data) => {
  const shape = data.spellSlotShape ?? 'circle';
  return ok({
    poolResources: (data.spellLevels ?? DEFAULT_SPELL_LEVELS).map((level): PoolResource => ({
      name: `Level ${level.level}`,
      max: level.max,
      current: Math.max(0, level.max - level.used),
      style: SPELL_SHAPE_STYLES[shape],
    })),
    showPoolCount: false,
  });
};

const poolToSpellSlots: Converter = (data) => {
  const resources = getPoolResources(data);
  const styleShape = Object.entries(SPELL_SHAPE_STYLES).find(([, style]) => style === resources[0]?.style)?.[0];
  const renamed = resources.some((resource, index) => resource.name !== `Level ${index + 1}`);
  return ok({
    spellLevels: resources.map((resource, index): SpellLevel => ({
      level: index + 1,
      max: resource.max,
      used: Math.min(resource.max, Math.max(0, resource.max - resource.current)),
    })),
    spellSlotShape: (styleShape ?? 'circle') as 'circle' | 'square' | 'diamond',
    showResetButton: true,
  }, renamed ? ['Resource names are replaced by level numbers.'] : []);
};

// ----- Wallet and number tracker -----

const walletToNumber: Converter = (data) => {
  const currencies = data.walletCurrencies ?? [];
  return ok({
    numberItems: currencies.map((currency): NumberItem => ({ name: currency.name, value: currency.amount })),
    showIncrementButtons: true,
  }, currencies.length > 1 ? ['Exchange rates and the total are removed.'] : []);
};

const numberToWallet: Converter = (data) => {
  const items = data.numberItems ?? [];
  if (items.length === 0) return null;
  const warnings: string[] = [];
  const notes: string[] = [];
  if (items.length > 1) notes.push(`Exchange rates are set to ${DEFAULT_WALLET_RATE}; edit them afterwards.`);
  if (items.some((item) => normalizeWalletAmount(item.value) !== item.value)) {
    warnings.push('Amounts are rounded to whole numbers, never below zero.');
  }
  if (items.some((item) => item.minValue !== undefined || item.maxValue !== undefined)) {
    warnings.push('Minimum and maximum values are removed.');
  }
  return ok({
    walletCurrencies: items.map((item, index): WalletCurrency => ({
      name: item.name,
      amount: normalizeWalletAmount(item.value),
      rate: index === 0 ? 1 : DEFAULT_WALLET_RATE,
    })),
    walletShowTotal: true,
  }, warnings, notes);
};

// ----- Legacy deck -----

const legacyDeckToDeckOfCards: Converter = (data, widgetId) => {
  const cards = (data.deckCards ?? [])
    .filter((card) => card.name.trim())
    .map((card) => ({
      id: uuidv4(),
      title: card.name,
      symbol: '',
      body: '',
      amount: Math.max(1, Math.floor(card.amount) || 1),
      faceUp: false,
    }));
  const hasDrawnCards = (data.deckState?.discarded.length ?? 0) > 0;
  return ok({
    cardTableCards: widgetId ? normalizeCardTableOrigins(cards, widgetId, getCardTableBackDesign({})) : cards,
    cardTableDiscardedCards: [],
    cardTableShowDiscard: true,
    cardTableShowGrabAll: true,
  }, hasDrawnCards ? ['Cards already drawn go back into the deck.'] : []);
};

// ----- Inventory and equipment -----

const inventoryToEquipment: Converter = (data) => ok({
  inventoryItems: (data.inventoryItems ?? []).map(({ slotId: _slotId, ...item }) => item),
  inventoryDefaultFields: data.inventoryDefaultFields,
  inventoryEncumbrance: data.inventoryEncumbrance,
  inventorySlots: createDefaultInventorySlots(),
}, [], ['Default equipment slots are added; every item starts out unequipped.']);

const equipmentToInventory: Converter = (data) => {
  const items = data.inventoryItems ?? [];
  const equipped = items.filter((item) => item.slotId).length;
  return ok({
    inventoryItems: items.map(({ slotId: _slotId, ...item }) => item),
    inventoryDefaultFields: data.inventoryDefaultFields,
    inventoryEncumbrance: data.inventoryEncumbrance,
  }, equipped > 0 ? [`The slot layout is removed; ${equipped} equipped item${equipped === 1 ? '' : 's'} move${equipped === 1 ? 's' : ''} into the list.`] : []);
};

// ----- Single-value conversions: switch, bars, clocks and trackers -----

type MixedOf<T extends MixedField['type']> = Extract<MixedField, { type: T }>;

function compactRecord(record: Record<string, string | undefined>): Record<string, string> | undefined {
  const entries = Object.entries(record).filter((entry): entry is [string, string] => Boolean(entry[1]?.trim()));
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

/** For targets that hold one thing: one matching field is kept (the first unless the user picked another) and every other field is lost. */
function mixedSingle<T extends MixedField>(
  accepts: (field: MixedField) => field is T,
  build: (field: T, data: WidgetData) => WidgetData,
): Converter {
  return (data, _widgetId, choice) => {
    const fields = data.mixedFields ?? [];
    const matching = fields.filter(accepts);
    const picked = matching[clampChoice(choice, matching.length)];
    if (!picked) return null;
    const dropped = fields.length - 1;
    return ok(build(picked, data), dropped > 0 ? [`${dropped} other field${dropped === 1 ? ' is' : 's are'} removed.`] : []);
  };
}

const switchToMixed: Converter = (data) => ok({
  mixedFields: [{
    type: 'switch',
    name: data.label || 'Switch',
    value: data.toggleState === true,
    ...(data.fieldLabels?.state ? { valueLabel: data.fieldLabels.state } : {}),
    ...(data.fieldFormulas?.state ? { valueFormula: data.fieldFormulas.state } : {}),
    ...(data.toggleColor ? { toggleColor: data.toggleColor } : {}),
  }],
});

const mixedToSwitch = mixedSingle(
  (field): field is MixedOf<'switch'> => field.type === 'switch',
  (field) => ({
    label: field.name,
    toggleState: field.value,
    toggleColor: field.toggleColor,
    fieldLabels: compactRecord({ state: field.valueLabel }),
    fieldFormulas: compactRecord({ state: field.valueFormula }),
  }),
);

const progressBarToMixed: Converter = (rawData) => {
  const data = { ...BAR_DEFAULTS.PROGRESS_BAR, ...compact(rawData) };
  return ok({
    mixedFields: [{
      type: 'progress',
      name: data.label || 'Progress',
      current: data.currentValue ?? 0,
      min: data.minValue ?? 0,
      max: data.maxValue ?? 100,
      showPercentage: data.showPercentage,
      showValues: data.showValues,
      fillColor: data.fillColor,
      currentLabel: data.fieldLabels?.currentValue,
      currentFormula: data.fieldFormulas?.currentValue,
      minLabel: data.fieldLabels?.minValue,
      minFormula: data.fieldFormulas?.minValue,
      maxLabel: data.fieldLabels?.maxValue,
      maxFormula: data.fieldFormulas?.maxValue,
    }],
  });
};

const mixedToProgressBar = mixedSingle(
  (field): field is MixedOf<'progress'> => field.type === 'progress',
  (field) => ({
    label: field.name,
    currentValue: field.current,
    minValue: field.min ?? 0,
    maxValue: field.max,
    showPercentage: field.showPercentage,
    showValues: field.showValues,
    fillColor: field.fillColor,
    fieldLabels: compactRecord({ currentValue: field.currentLabel, minValue: field.minLabel, maxValue: field.maxLabel }),
    fieldFormulas: compactRecord({ currentValue: field.currentFormula, minValue: field.minFormula, maxValue: field.maxFormula }),
  }),
);

const clockToProgressBar: Converter = (data, _widgetId, choice) => {
  const clocks = data.clockItems ?? [];
  const clock = clocks[clampChoice(choice, clocks.length)];
  if (!clock) return null;
  return ok({
    ...(clock.name.trim() ? { label: clock.name } : {}),
    currentValue: clock.value,
    minValue: 0,
    maxValue: clock.segments,
    fillColor: clock.fillColor,
    showValues: data.clockShowValues,
    fieldLabels: compactRecord({ currentValue: clock.valueLabel, maxValue: clock.segmentsLabel }),
    fieldFormulas: compactRecord({ currentValue: clock.valueFormula, maxValue: clock.segmentsFormula }),
  }, clocks.length > 1 ? [`${clocks.length - 1} other clock${clocks.length === 2 ? ' is' : 's are'} removed.`] : []);
};

const progressBarToClock: Converter = (rawData) => {
  const data = { ...BAR_DEFAULTS.PROGRESS_BAR, ...compact(rawData) };
  const min = data.minValue ?? 0;
  const offset = min !== 0;
  return ok({
    clockItems: [{
      id: uuidv4(),
      name: '',
      segments: (data.maxValue ?? 100) - min,
      value: (data.currentValue ?? 0) - min,
      fillColor: data.fillColor,
      ...(!offset && data.fieldLabels?.maxValue ? { segmentsLabel: data.fieldLabels.maxValue } : {}),
      ...(!offset && data.fieldFormulas?.maxValue ? { segmentsFormula: data.fieldFormulas.maxValue } : {}),
      ...(!offset && data.fieldLabels?.currentValue ? { valueLabel: data.fieldLabels.currentValue } : {}),
      ...(!offset && data.fieldFormulas?.currentValue ? { valueFormula: data.fieldFormulas.currentValue } : {}),
    }],
    clockLayout: 'auto',
    clockSize: 100,
    clockShowValues: data.showValues,
  }, offset ? ['The minimum value is removed; the clock counts from 0.'] : []);
};

function numberToBar(target: 'PROGRESS_BAR' | 'HEALTH_BAR'): Converter {
  return (data, _widgetId, choice) => {
    const items = data.numberItems ?? [];
    const item = items[clampChoice(choice, items.length)];
    if (!item) return null;
    const defaults = BAR_DEFAULTS[target];
    const fields = BAR_FIELD_KEYS[target];
    const out: WidgetData = {
      label: item.name,
      currentValue: item.value,
      minValue: item.minValue ?? defaults.minValue,
      maxValue: item.maxValue ?? defaults.maxValue,
      showIncrementButtons: data.showIncrementButtons ?? true,
      fieldLabels: filterRecord(compactRecord({
        currentValue: item.valueLabel,
        minValue: item.minValueLabel,
        maxValue: item.maxValueLabel,
      }), fields),
      fieldFormulas: filterRecord(compactRecord({
        currentValue: item.valueFormula,
        minValue: item.minValueFormula,
        maxValue: item.maxValueFormula,
      }), fields),
    };
    if (target === 'HEALTH_BAR') {
      out.temporaryValue = 0;
      out.enableTemporaryHp = true;
    } else {
      out.showPercentage = false;
    }
    return ok(out, items.length > 1 ? [`${items.length - 1} other tracker${items.length === 2 ? ' is' : 's are'} removed.`] : []);
  };
}

function barToNumber(source: 'PROGRESS_BAR' | 'HEALTH_BAR'): Converter {
  return (rawData) => {
    const data = { ...BAR_DEFAULTS[source], ...compact(rawData) };
    return ok({
      numberItems: [{
        name: data.label || 'Value',
        value: data.currentValue ?? 0,
        minValue: data.minValue,
        maxValue: data.maxValue,
        ...(data.fieldLabels?.currentValue ? { valueLabel: data.fieldLabels.currentValue } : {}),
        ...(data.fieldFormulas?.currentValue ? { valueFormula: data.fieldFormulas.currentValue } : {}),
        ...(data.fieldLabels?.minValue ? { minValueLabel: data.fieldLabels.minValue } : {}),
        ...(data.fieldFormulas?.minValue ? { minValueFormula: data.fieldFormulas.minValue } : {}),
        ...(data.fieldLabels?.maxValue ? { maxValueLabel: data.fieldLabels.maxValue } : {}),
        ...(data.fieldFormulas?.maxValue ? { maxValueFormula: data.fieldFormulas.maxValue } : {}),
      }],
      showNumberItemMax: true,
      showIncrementButtons: data.showIncrementButtons,
    }, source === 'HEALTH_BAR' && (data.temporaryValue ?? 0) > 0 ? ['Temporary HP is removed.'] : []);
  };
}

// ----- Mixed fields with display, pool, step dice -----

const displayToMixed: Converter = (data) => {
  const items = data.displayNumbers ?? [];
  const hasSecondary = items.some((item) => (
    item.secondaryValue !== undefined || item.secondaryValueLabel || item.secondaryValueFormula
  ));
  return ok({
    mixedFields: items.map((item): MixedField => ({
      type: 'number',
      ...pick(item, NUMBER_SHARED_KEYS),
      name: item.label,
      value: item.value,
      showIncrementButtons: data.showDisplayNumberButtons ?? false,
    })),
  }, hasSecondary ? ['Secondary values are removed.'] : []);
};

const mixedToDisplay = mixedConverter(
  (field) => field.type === 'number',
  (fields) => ({
    displayNumbers: fields.flatMap((field): DisplayNumber[] => (
      field.type === 'number'
        ? [{ ...pick(field, NUMBER_SHARED_KEYS), label: field.name, value: field.value }]
        : []
    )),
    displayLayout: 'auto',
    numberBoxFixedAspectRatio: true,
    numberBoxScale: 100,
    showDisplayNumberButtons: fields.some((field) => field.type === 'number' && field.showIncrementButtons === true),
  }),
);

const poolToMixed: Converter = (data) => ok({
  mixedFields: getPoolResources(data).map((resource): MixedField => ({
    type: 'resource',
    name: resource.name,
    current: resource.current,
    max: resource.max,
    style: resource.style,
    showCount: data.showPoolCount,
    ...pick(resource, ['tooltip', 'currentLabel', 'currentFormula', 'maxLabel', 'maxFormula']),
  })),
});

const mixedToPool = mixedConverter(
  (field) => field.type === 'resource',
  (fields) => ({
    poolResources: fields.flatMap((field): PoolResource[] => (
      field.type === 'resource'
        ? [{
            name: field.name,
            current: field.current,
            max: field.max,
            style: field.style,
            ...pick(field, ['tooltip', 'currentLabel', 'currentFormula', 'maxLabel', 'maxFormula']),
          }]
        : []
    )),
    showPoolCount: fields.some((field) => field.type === 'resource' && field.showCount === true),
  }),
);

const stepDiceToMixed: Converter = (data) => ok({
  ...pick(data, ['itemColumns', 'wrapItemNames']),
  mixedFields: (data.stepDiceItems ?? []).map((item): MixedField => ({
    type: 'step-dice',
    name: item.name,
    currentStep: item.currentStep,
    ...(item.tooltip ? { tooltip: item.tooltip } : {}),
    ...(data.stepDiceChain ? { diceChain: data.stepDiceChain } : {}),
  })),
});

const mixedToStepDice: Converter = (data) => {
  const fields = (data.mixedFields ?? []).filter((field): field is MixedOf<'step-dice'> => field.type === 'step-dice');
  const all = data.mixedFields ?? [];
  if (all.length > 0 && fields.length === 0) return null;
  const warnings: string[] = [];
  if (all.length > fields.length) {
    const dropped = all.length - fields.length;
    warnings.push(`${dropped} field${dropped === 1 ? '' : 's'} of another type ${dropped === 1 ? 'is' : 'are'} removed.`);
  }
  if (new Set(fields.map((field) => JSON.stringify(field.diceChain ?? null))).size > 1) {
    warnings.push('The fields use different dice chains; the first one is used for all.');
  }
  return ok({
    ...pick(data, ['itemColumns', 'wrapItemNames']),
    stepDiceItems: fields.map((field) => ({
      name: field.name,
      currentStep: field.currentStep,
      ...(field.tooltip ? { tooltip: field.tooltip } : {}),
    })),
    stepDiceChain: fields.find((field) => field.diceChain)?.diceChain,
  }, warnings);
};

// ----- Number tracker and pool -----

const numberToPool: Converter = (data) => {
  const items = data.numberItems ?? [];
  if (items.length === 0) return null;
  const warnings: string[] = [];
  const notes: string[] = [];
  if (items.some((item) => item.maxValue === undefined)) {
    notes.push('Trackers without a maximum get 5 dots (or their value, if higher).');
  }
  if (items.some((item) => item.value < 0 || (item.maxValue !== undefined && item.value > item.maxValue))) {
    warnings.push('Values are kept between 0 and the maximum.');
  }
  return ok({
    poolResources: items.map((item): PoolResource => {
      const max = item.maxValue ?? Math.max(5, item.value);
      return {
        name: item.name,
        max,
        current: Math.min(max, Math.max(0, item.value)),
        style: 'dots',
        ...(item.tooltip ? { tooltip: item.tooltip } : {}),
        ...(item.valueLabel ? { currentLabel: item.valueLabel } : {}),
        ...(item.valueFormula ? { currentFormula: item.valueFormula } : {}),
        ...(item.maxValueLabel ? { maxLabel: item.maxValueLabel } : {}),
        ...(item.maxValueFormula ? { maxFormula: item.maxValueFormula } : {}),
      };
    }),
    showPoolCount: false,
  }, warnings, notes);
};

const poolToNumber: Converter = (data) => ok({
  numberItems: getPoolResources(data).map((resource): NumberItem => ({
    name: resource.name,
    value: resource.current,
    minValue: 0,
    maxValue: resource.max,
    ...(resource.tooltip ? { tooltip: resource.tooltip } : {}),
    ...(resource.currentLabel ? { valueLabel: resource.currentLabel } : {}),
    ...(resource.currentFormula ? { valueFormula: resource.currentFormula } : {}),
    ...(resource.maxLabel ? { maxValueLabel: resource.maxLabel } : {}),
    ...(resource.maxFormula ? { maxValueFormula: resource.maxFormula } : {}),
  })),
  showNumberItemMax: true,
  showIncrementButtons: true,
});

// ----- Tables -----

const tableToChecklist: Converter = (data, _widgetId, choice) => {
  const { values, warnings } = pickTableColumn(data, choice);
  return ok({
    checkboxItems: values.filter((name) => name.trim()).map((name): CheckboxItem => ({ name, checked: false })),
  }, warnings);
};

const tableToConditions: Converter = (data, _widgetId, choice) => {
  const { values, warnings } = pickTableColumn(data, choice);
  return ok({
    toggleItems: values.filter((name) => name.trim()).map((name): ToggleItem => ({ name, active: false })),
  }, warnings);
};

const tableToRollTable: Converter = (data) => {
  const items = (data.rows ?? []).flatMap((row): RollTableItem[] => {
    const text = cellValue(row.cells[0]);
    if (!text.trim()) return [];
    const second = cellValue(row.cells[1]).trim();
    const weight = Number(second);
    const hasWeight = second !== '' && Number.isFinite(weight) && weight > 0;
    const description = (hasWeight ? cellValue(row.cells[2]) : second).trim();
    return [{ text, weight: hasWeight ? weight : 1, ...(description ? { description } : {}) }];
  });
  return ok({ rollTableItems: items }, (data.columns?.length ?? 0) > 3 ? ['Only the first three columns are used.'] : []);
};

// ----- Dice roller and dice tray -----

const DICE_LINKED_KEYS = ['modifier', 'diceResultOverlay'] as const;

function diceFields(data: WidgetData): Pick<WidgetData, 'fieldLabels' | 'fieldFormulas'> {
  return {
    fieldLabels: filterRecord(data.fieldLabels, ['modifier']),
    fieldFormulas: filterRecord(data.fieldFormulas, ['modifier']),
  };
}

const rollerToTray: Converter = (data) => {
  const dice: (number | CustomDie)[] = [];
  const seen = new Set<string>();
  const add = (die: number | CustomDie) => {
    const key = JSON.stringify(die);
    if (seen.has(key)) return;
    seen.add(key);
    dice.push(die);
  };

  const usesExpression = data.diceUseExpression === true && Boolean(data.diceExpression?.trim());
  const groups: DiceGroup[] = data.diceGroups ?? [{ count: 1, faces: 20 }];
  if (usesExpression) {
    for (const match of (data.diceExpression ?? '').matchAll(/d(\d+)/gi)) add(Number(match[1]));
  } else {
    for (const group of groups) {
      if (group.customFaces && group.customFaces.length > 0) {
        add({ name: group.customDiceName || 'Custom', faces: group.customFaces });
      } else {
        add(group.faces);
      }
    }
  }
  if (dice.length === 0) return null;

  const warnings: string[] = [];
  if (usesExpression) {
    warnings.push('The roll expression is removed; only its dice types are kept.');
  } else if (groups.some((group) => group.count !== 1 || group.explodes)) {
    warnings.push('Dice counts and exploding dice are removed.');
  }
  return ok({ ...pick(data, DICE_LINKED_KEYS), ...diceFields(data), availableDice: dice }, warnings);
};

const trayToRoller: Converter = (data) => {
  const dice = data.availableDice ?? [4, 6, 8, 10, 12, 20];
  if (dice.length === 0) return null;
  return ok({
    ...pick(data, DICE_LINKED_KEYS),
    ...diceFields(data),
    diceUseExpression: false,
    diceGroups: dice.map((die): DiceGroup => (
      typeof die === 'number'
        ? { count: 1, faces: die }
        : { count: 1, faces: die.faces.length, customFaces: die.faces, customDiceName: die.name }
    )),
  }, [], dice.length > 1 ? ['A dice roller rolls all its dice together; delete the ones you do not need.'] : []);
};

// ----- Deck of cards and roll table -----

const cardsToRollTable: Converter = (data) => {
  const drawn = getCardTableCards(data);
  const discarded = getCardTableDiscardedCards(data);
  const cards = [...drawn, ...discarded];
  return ok({
    rollTableItems: cards.map((card): RollTableItem => ({
      text: card.title || card.symbol || 'Card',
      weight: card.amount ?? 1,
      ...(card.body.trim() ? { description: card.body } : {}),
    })),
  },
  cards.some((card) => card.symbol.trim()) ? ['Card symbols and the card back design are removed.'] : [],
  discarded.length > 0 ? ['Cards in the discard pile are included.'] : []);
};

const rollTableToCards: Converter = (data, widgetId) => {
  const items = data.rollTableItems ?? [];
  const cards = items.map((item) => ({
    id: uuidv4(),
    title: item.text,
    symbol: '',
    body: item.description ?? '',
    amount: Math.max(1, Math.round(item.weight)),
    faceUp: false,
  }));
  return ok({
    cardTableCards: widgetId ? normalizeCardTableOrigins(cards, widgetId, getCardTableBackDesign({})) : cards,
    cardTableDiscardedCards: [],
    cardTableShowDiscard: true,
    cardTableShowGrabAll: true,
  }, items.some((item) => !Number.isInteger(item.weight)) ? ['Weights are rounded to whole numbers.'] : []);
};

const CONVERTERS: Partial<Record<WidgetType, Partial<Record<WidgetType, Converter>>>> = {
  CHECKBOX: { TOGGLE_GROUP: checklistToConditions, LIST: checklistToList, MIXED_FIELDS: checklistToMixed },
  TOGGLE_GROUP: { CHECKBOX: conditionsToChecklist, LIST: conditionsToList, MIXED_FIELDS: conditionsToMixed },
  TOGGLE: { CHECKBOX: switchToChecklist, TOGGLE_GROUP: switchToConditions, MIXED_FIELDS: switchToMixed },
  NUMBER: {
    NUMBER_DISPLAY: numberToDisplay,
    MIXED_FIELDS: numberToMixed,
    WALLET: numberToWallet,
    PROGRESS_BAR: numberToBar('PROGRESS_BAR'),
    HEALTH_BAR: numberToBar('HEALTH_BAR'),
    POOL: numberToPool,
  },
  NUMBER_DISPLAY: { NUMBER: displayToNumber, MIXED_FIELDS: displayToMixed },
  LIST: {
    TABLE: listToTable,
    TEXT: listToText,
    CHECKBOX: listToChecklist,
    TOGGLE_GROUP: listToConditions,
    ROLL_TABLE: listToRollTable,
  },
  TABLE: {
    LIST: tableToList,
    FORM: tableToForm,
    ROLL_TABLE: tableToRollTable,
    CHECKBOX: tableToChecklist,
    TOGGLE_GROUP: tableToConditions,
  },
  FORM: { TABLE: formToTable, MIXED_FIELDS: formToMixed },
  TEXT: { LIST: textToList },
  ROLL_TABLE: { LIST: rollTableToList, TABLE: rollTableToTable, DECK_OF_CARDS: rollTableToCards },
  HEALTH_BAR: {
    PROGRESS_BAR: barConverter('HEALTH_BAR', 'PROGRESS_BAR'),
    THRESHOLD_TRACK: barConverter('HEALTH_BAR', 'THRESHOLD_TRACK'),
    NUMBER: barToNumber('HEALTH_BAR'),
  },
  PROGRESS_BAR: {
    HEALTH_BAR: barConverter('PROGRESS_BAR', 'HEALTH_BAR'),
    THRESHOLD_TRACK: barConverter('PROGRESS_BAR', 'THRESHOLD_TRACK'),
    MIXED_FIELDS: progressBarToMixed,
    PROGRESS_CLOCK: progressBarToClock,
    NUMBER: barToNumber('PROGRESS_BAR'),
  },
  THRESHOLD_TRACK: {
    HEALTH_BAR: barConverter('THRESHOLD_TRACK', 'HEALTH_BAR'),
    PROGRESS_BAR: barConverter('THRESHOLD_TRACK', 'PROGRESS_BAR'),
  },
  MIXED_FIELDS: {
    FORM: mixedToForm,
    NUMBER: mixedToNumber,
    CHECKBOX: mixedToChecklist,
    TOGGLE_GROUP: mixedToConditions,
    TOGGLE: mixedToSwitch,
    PROGRESS_BAR: mixedToProgressBar,
    NUMBER_DISPLAY: mixedToDisplay,
    POOL: mixedToPool,
    STEP_DICE: mixedToStepDice,
  },
  STEP_DICE: { MIXED_FIELDS: stepDiceToMixed },
  INVENTORY: { COMPENDIUM: inventoryToCodex, INVENTORY_SLOTS: inventoryToEquipment },
  COMPENDIUM: { INVENTORY: codexToInventory },
  INVENTORY_SLOTS: { INVENTORY: equipmentToInventory },
  POOL: {
    PROGRESS_CLOCK: poolToClocks,
    SPELL_SLOT: poolToSpellSlots,
    MIXED_FIELDS: poolToMixed,
    NUMBER: poolToNumber,
  },
  PROGRESS_CLOCK: { POOL: clocksToPool, PROGRESS_BAR: clockToProgressBar },
  SPELL_SLOT: { POOL: spellSlotsToPool },
  WALLET: { NUMBER: walletToNumber },
  DECK: { DECK_OF_CARDS: legacyDeckToDeckOfCards },
  DECK_OF_CARDS: { ROLL_TABLE: cardsToRollTable },
  DICE_ROLLER: { DICE_TRAY: rollerToTray },
  DICE_TRAY: { DICE_ROLLER: trayToRoller },
};

/** What each target type holds the most of, to tell the user how much came across. */
const CONTENT_SUMMARY: Partial<Record<WidgetType, { key: keyof WidgetData; singular: string; plural: string }>> = {
  LIST: { key: 'items', singular: 'item', plural: 'items' },
  CHECKBOX: { key: 'checkboxItems', singular: 'item', plural: 'items' },
  TOGGLE_GROUP: { key: 'toggleItems', singular: 'condition', plural: 'conditions' },
  NUMBER: { key: 'numberItems', singular: 'tracker', plural: 'trackers' },
  NUMBER_DISPLAY: { key: 'displayNumbers', singular: 'number', plural: 'numbers' },
  FORM: { key: 'formItems', singular: 'field', plural: 'fields' },
  MIXED_FIELDS: { key: 'mixedFields', singular: 'field', plural: 'fields' },
  TABLE: { key: 'rows', singular: 'row', plural: 'rows' },
  ROLL_TABLE: { key: 'rollTableItems', singular: 'entry', plural: 'entries' },
  POOL: { key: 'poolResources', singular: 'resource', plural: 'resources' },
  PROGRESS_CLOCK: { key: 'clockItems', singular: 'clock', plural: 'clocks' },
  SPELL_SLOT: { key: 'spellLevels', singular: 'spell level', plural: 'spell levels' },
  WALLET: { key: 'walletCurrencies', singular: 'currency', plural: 'currencies' },
  INVENTORY: { key: 'inventoryItems', singular: 'item', plural: 'items' },
  COMPENDIUM: { key: 'inventoryItems', singular: 'entry', plural: 'entries' },
  INVENTORY_SLOTS: { key: 'inventoryItems', singular: 'item', plural: 'items' },
  STEP_DICE: { key: 'stepDiceItems', singular: 'die', plural: 'dice' },
  DICE_TRAY: { key: 'availableDice', singular: 'die', plural: 'dice' },
  DICE_ROLLER: { key: 'diceGroups', singular: 'dice group', plural: 'dice groups' },
  DECK_OF_CARDS: { key: 'cardTableCards', singular: 'card', plural: 'cards' },
};

function summarizeContent(type: WidgetType, data: WidgetData): string | undefined {
  const spec = CONTENT_SUMMARY[type];
  const value = spec ? data[spec.key] : undefined;
  if (!spec || !Array.isArray(value) || value.length === 0) return undefined;
  return `${value.length} ${value.length === 1 ? spec.singular : spec.plural}`;
}

function describeUsers(users: string[]): string {
  const unique = [...new Set(users)];
  const shown = unique.slice(0, 3).join(', ');
  return unique.length > 3 ? `${shown} and ${unique.length - 3} more` : shown;
}

export function convertWidgetData(
  widget: Pick<Widget, 'type' | 'data'> & { id?: string },
  target: WidgetType,
  options: ConversionOptions = {},
): WidgetConversion | null {
  const output = CONVERTERS[widget.type]?.[target]?.(widget.data, widget.id, options.choice);
  if (!output) return null;

  const data = compact({ ...pick(widget.data, KEPT_KEYS), ...output.data });
  const warnings = [...(output.warnings ?? [])];
  const notes = [...(output.notes ?? [])];
  const carried: string[] = [];

  const sourceLabels = [...collectLinkedStrings(widget.data, 'Label')];
  const keptLabels = collectLinkedStrings(data, 'Label');
  const lostLabels = sourceLabels.filter((label) => !keptLabels.has(label));
  const carriedLabels = sourceLabels.filter((label) => keptLabels.has(label));
  if (carriedLabels.length > 0) carried.push(`Variable labels: ${carriedLabels.join(', ')}`);
  if (lostLabels.length > 0 && !options.labelUsers) {
    warnings.push(`Variable labels removed, so formulas using them will break: ${lostLabels.join(', ')}`);
  } else if (lostLabels.length > 0 && options.labelUsers) {
    const unused: string[] = [];
    for (const label of lostLabels) {
      const users = options.labelUsers(label);
      if (users.length === 0) unused.push(label);
      else warnings.push(`@${label} is removed, but ${describeUsers(users)} still ${users.length === 1 ? 'uses' : 'use'} it`);
    }
    if (unused.length > 0) notes.push(`Variable labels removed that nothing uses: ${unused.join(', ')}`);
  }

  const sourceFormulas = [...collectLinkedStrings(widget.data, 'Formula')];
  const keptFormulas = collectLinkedStrings(data, 'Formula');
  const lostFormulas = sourceFormulas.filter((formula) => !keptFormulas.has(formula));
  const carriedFormulas = sourceFormulas.filter((formula) => keptFormulas.has(formula));
  if (carriedFormulas.length > 0) carried.push(`Formulas: ${carriedFormulas.join(', ')}`);
  if (lostFormulas.length > 0) warnings.push(`Formulas removed: ${lostFormulas.join(', ')}`);

  return { data, warnings, notes, carried, summary: summarizeContent(target, data) };
}

function mixedChoice(type: MixedField['type'], label: string) {
  return (data: WidgetData): ConversionChoice => ({
    label,
    options: (data.mixedFields ?? []).filter((field) => field.type === type).map((field, index) => field.name.trim() || `Field ${index + 1}`),
  });
}

const trackerChoice = (data: WidgetData): ConversionChoice => ({
  label: 'Which tracker?',
  options: (data.numberItems ?? []).map((item, index) => item.name.trim() || `Tracker ${index + 1}`),
});

const columnChoice = (data: WidgetData): ConversionChoice => ({
  label: 'Which column?',
  options: (data.columns ?? []).map((_, index) => tableColumnName(data, index)),
});

const CHOICES: Partial<Record<WidgetType, Partial<Record<WidgetType, (data: WidgetData) => ConversionChoice>>>> = {
  MIXED_FIELDS: {
    PROGRESS_BAR: mixedChoice('progress', 'Which progress field?'),
    TOGGLE: mixedChoice('switch', 'Which switch field?'),
  },
  PROGRESS_CLOCK: {
    PROGRESS_BAR: (data) => ({
      label: 'Which clock?',
      options: (data.clockItems ?? []).map((clock, index) => clock.name.trim() || `Clock ${index + 1}`),
    }),
  },
  NUMBER: { PROGRESS_BAR: trackerChoice, HEALTH_BAR: trackerChoice },
  TABLE: { LIST: columnChoice, CHECKBOX: columnChoice, TOGGLE_GROUP: columnChoice },
};

/** The pick the user can make for a conversion that keeps one item out of several, if there is more than one to pick from. */
export function getConversionChoice(widget: Pick<Widget, 'type' | 'data'>, target: WidgetType): ConversionChoice | null {
  const choice = CHOICES[widget.type]?.[target]?.(widget.data);
  return choice && choice.options.length > 1 ? choice : null;
}

/** Events that use this widget and would stop working, or work less, once it has the new type. */
export function getEventWarnings(
  widget: Pick<Widget, 'id' | 'type'>,
  conversion: Pick<WidgetConversion, 'data'>,
  target: WidgetType,
  character: Character | undefined,
): string[] {
  const events = (character?.events ?? []).filter((event) => (
    event.trigger.widgetId === widget.id || getEventEffects(event).some((effect) => effect.widgetId === widget.id)
  ));
  if (!character || events.length === 0) return [];

  const converted: Character = {
    ...character,
    sheets: character.sheets.map((sheet) => ({
      ...sheet,
      widgets: sheet.widgets.map((candidate) => (
        candidate.id === widget.id ? { ...candidate, type: target, data: conversion.data } : candidate
      )),
    })),
  };
  return events.flatMap((event) => {
    const before = new Set(getEventProblems(character, event));
    const added = getEventProblems(converted, event).filter((problem) => !before.has(problem));
    return added.length > 0 ? [`Event "${getEventTitle(character, event)}": ${added.join('; ')}`] : [];
  });
}

/** Widget types the given widget can be converted to, in menu order. */
export function getConversionTargets(widget: Pick<Widget, 'type' | 'data'> & { id?: string }): WidgetType[] {
  const targets = Object.keys(CONVERTERS[widget.type] ?? {}) as WidgetType[];
  return targets.filter((target) => convertWidgetData(widget, target) !== null);
}

export function canConvertWidget(widget: Pick<Widget, 'type'>): boolean {
  return Object.keys(CONVERTERS[widget.type] ?? {}).length > 0;
}

const hasHealing = (data: WidgetData) => (
  Boolean(data.healToFull) || (data.healFlatAmount ?? 0) > 0 || Boolean(parseDiceExpression(getHealDiceExpression(data)))
);

/**
 * Rest buttons that act on this widget as its current type. Converting the widget makes them
 * skip it. Pool restores reach every sheet; the other actions only affect the active sheet.
 */
export function getRestButtonWarnings(widget: Pick<Widget, 'id' | 'type'>, character: Character | undefined): string[] {
  if (!character) return [];
  const act: Partial<Record<WidgetType, { verb: string; test: (data: WidgetData) => boolean; activeSheetOnly: boolean }>> = {
    POOL: {
      verb: 'restore this pool',
      test: (data) => (data.poolRestores ?? []).some((target) => target.widgetId === widget.id),
      activeSheetOnly: false,
    },
    HEALTH_BAR: { verb: 'heal health bars', test: hasHealing, activeSheetOnly: true },
    TOGGLE_GROUP: { verb: 'clear conditions', test: (data) => data.clearConditions === true, activeSheetOnly: true },
    SPELL_SLOT: { verb: 'reset spell slots', test: (data) => data.resetSpellSlots === true, activeSheetOnly: true },
  };
  const rule = act[widget.type];
  if (!rule) return [];

  const count = character.sheets
    .filter((sheet) => !rule.activeSheetOnly || sheet.id === character.activeSheetId)
    .flatMap((sheet) => sheet.widgets)
    .filter((candidate) => candidate.type === 'REST_BUTTON' && rule.test(candidate.data)).length;
  if (count === 0) return [];
  const subject = count === 1 ? '1 Rest button is' : `${count} Rest buttons are`;
  return [`${subject} set to ${rule.verb}; resting will no longer affect this widget.`];
}
