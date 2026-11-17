import { v4 as uuidv4 } from 'uuid';
import type { CardTableCard, Character, CharacterEvent, CharacterEventEffect, InventoryItem, NumericTargetReference, Sheet, Widget, WidgetType } from '../types';
import { RUN_EVENT_KIND } from '../events/constants';
import { mapSteps, normalizeEvent, normalizeEvents, type StoredCharacterEvent } from '../events/steps';
import { numericTargetKey } from './numericTargets';
import { copyVariableData } from './variableGroups';
import { copyCompendiumData } from './compendium';
import {
  getCardTableBackDesign,
  getCardTableCards,
  getCardTableDiscardedCards,
  normalizeCardTableWidgetData,
} from './cardTable';
import { normalizeWidgetGeometry } from './widgetGeometry';
import { mapWidgetEffects } from './widgetEffects';

function cloneCardTableData(data: Widget['data'], widgetId: string): Widget['data'] {
  const normalizedData = normalizeCardTableWidgetData(data, widgetId);
  const backDesign = getCardTableBackDesign(normalizedData);
  const activeCards = getCardTableCards(normalizedData);
  const discardedCards = getCardTableDiscardedCards(normalizedData);
  const cloneCards = (cards: CardTableCard[], orderOffset: number) => cards.map((card, index) => ({
    ...card,
    id: uuidv4(),
    originWidgetId: widgetId,
    originOrder: orderOffset + index,
    originBackColor: backDesign.color,
    originBackTextColor: backDesign.textColor,
    originBackSymbol: backDesign.symbol,
    originBackText: backDesign.text,
    originBackPattern: backDesign.pattern,
  }));

  return {
    ...data,
    cardTableCards: cloneCards(activeCards, 0),
    cardTableDiscardedCards: cloneCards(discardedCards, activeCards.length),
    cardTableSpots: undefined,
  };
}

export function collectWidgetDataIds(value: unknown, ids: Map<string, string>) {
  if (Array.isArray(value)) value.forEach((entry) => collectWidgetDataIds(entry, ids));
  else if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      if (key === 'id' && typeof entry === 'string' && !ids.has(entry)) ids.set(entry, uuidv4());
      else collectWidgetDataIds(entry, ids);
    }
  }
}

function copyDataIds(value: unknown, ids: Map<string, string>): unknown {
  if (Array.isArray(value)) return value.map((entry) => copyDataIds(entry, ids));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
    key, ['requires', 'requiresAny'].includes(key) && Array.isArray(entry)
      ? entry.map((id) => typeof id === 'string' ? ids.get(id) ?? id : id)
      : ['id', 'slotId', 'templateId'].includes(key) && typeof entry === 'string' ? ids.get(entry) ?? entry : copyDataIds(entry, ids),
  ]));
  return value;
}

function remapTarget(ref: NumericTargetReference, widgets: Map<string, string>, entries: Map<string, string>): NumericTargetReference {
  return ref.kind === 'variable' ? ref : {
    ...ref, widgetId: widgets.get(ref.widgetId) ?? ref.widgetId,
    ...(ref.entryId ? { entryId: entries.get(ref.entryId) ?? ref.entryId } : {}),
  };
}

function remapItemTargets(item: InventoryItem, widgets: Map<string, string>, entries: Map<string, string>): InventoryItem {
  return item.effects ? { ...item, effects: item.effects.map((effect) => effect.target
    ? { ...effect, target: remapTarget(effect.target, widgets, entries) } : effect) } : item;
}

export function cloneWidgetData(type: WidgetType, data: Widget['data'], widgetId: string, sourceWidgetId?: string, sharedIds?: Map<string, string>, widgets = new Map<string, string>()): Widget['data'] {
  if (type === 'DECK_OF_CARDS') return cloneCardTableData(data, widgetId);
  const ids = sharedIds ?? new Map<string, string>();
  collectWidgetDataIds(data, ids);
  const cloned = copyDataIds(data, ids) as Widget['data'];
  const widgetIds = new Map(widgets);
  if (sourceWidgetId) widgetIds.set(sourceWidgetId, widgetId);
  return mapWidgetEffects({ id: widgetId, type, x: 0, y: 0, data: cloned }, (source) => source.effects.length
    ? source.effects.map((effect) => effect.target ? { ...effect, target: remapTarget(effect.target, widgetIds, ids) } : effect)
    : source.effects).data;
}

export function migrateLegacyWidgetHeader(widget: Widget): Widget {
  const migratedWidget = (widget.type as string) === 'CARD_TABLE'
    ? { ...widget, type: 'DECK_OF_CARDS' as const }
    : widget;
  const normalizedWidget = normalizeWidgetGeometry(
    migratedWidget.type === 'DECK_OF_CARDS'
      ? { ...migratedWidget, data: normalizeCardTableWidgetData(migratedWidget.data, migratedWidget.id) }
      : migratedWidget,
  );
  const label = normalizedWidget.data?.label;
  const hasNoLabel = typeof label !== 'string' || label.trim().length === 0;
  const hidLegacyHeaderControls =
    normalizedWidget.data?.showFieldControls === false ||
    (normalizedWidget.type === 'TABLE' && normalizedWidget.data?.showTableEditButton === false);
  if (
    normalizedWidget.data?.hideWidgetHeader === undefined &&
    hidLegacyHeaderControls &&
    hasNoLabel
  ) {
    return {
      ...normalizedWidget,
      data: { ...normalizedWidget.data, hideWidgetHeader: true },
    };
  }

  return normalizedWidget;
}

export function migrateCharacter(character: Character): Character {
  if (character.sheets && character.sheets.length > 0) {
    const events = normalizeEvents(character.events);
    return {
      ...character,
      ...(events ? { events } : {}),
      sheets: character.sheets.map((sheet) => ({
        ...sheet,
        widgets: sheet.widgets.map(migrateLegacyWidgetHeader),
      })),
    };
  }

  const defaultSheet: Sheet = {
    id: uuidv4(),
    name: 'Main',
    widgets: (character.widgets || []).map(migrateLegacyWidgetHeader),
  };

  return {
    id: character.id,
    name: character.name,
    theme: character.theme,
    customTheme: character.customTheme,
    sheets: [defaultSheet],
    activeSheetId: defaultSheet.id,
    ...copyVariableData(character),
    ...copyCompendiumData(character),
    ...(character.events ? { events: normalizeEvents(character.events) } : {}),
  };
}

/** Copies events with fresh ids, pointing their widget and event references at the copies. */
export function remapEventIds(events: StoredCharacterEvent[], widgetIdMap: Map<string, string>): CharacterEvent[] {
  const remap = (widgetId: string | undefined) => (widgetId ? widgetIdMap.get(widgetId) ?? widgetId : widgetId);
  const eventIdMap = new Map(events.map((event) => [event.id, uuidv4()]));
  const remapEffects = (effects: CharacterEventEffect[]) => effects.map((effect) => ({
    ...effect,
    id: uuidv4(),
    widgetId: remap(effect.widgetId),
    ...(effect.kind === RUN_EVENT_KIND && effect.target ? { target: eventIdMap.get(effect.target) ?? effect.target } : {}),
    params: effect.params ? { ...effect.params } : undefined,
  }));
  return events.map(normalizeEvent).map((event, index) => ({
    ...event,
    id: eventIdMap.get(events[index].id)!,
    trigger: { ...event.trigger, widgetId: remap(event.trigger.widgetId), params: event.trigger.params ? { ...event.trigger.params } : undefined },
    steps: mapSteps(event.steps, (step) => ({
      ...step,
      id: uuidv4(),
      effects: remapEffects(step.effects),
      ...(step.otherwise ? { otherwise: remapEffects(step.otherwise) } : {}),
    })),
  }));
}

export function remapCharacterIds(source: { sheets: Sheet[]; activeSheetId: string; events?: StoredCharacterEvent[]; itemEffectValues?: Character['itemEffectValues']; compendium?: Character['compendium'] }): {
  sheets: Sheet[];
  activeSheetId: string;
  events?: CharacterEvent[];
  itemEffectValues?: Character['itemEffectValues'];
  compendium?: Character['compendium'];
} {
  const sheetIdMap = new Map<string, string>();
  const widgetIdMap = new Map<string, string>();
  const groupIdMap = new Map<string, string>();
  const entryIdMap = new Map<string, string>();

  source.sheets.forEach((sheet) => {
    sheetIdMap.set(sheet.id, uuidv4());
    sheet.widgets.forEach((widget) => {
      widgetIdMap.set(widget.id, uuidv4());
      collectWidgetDataIds(widget.data, entryIdMap);
      if (widget.groupId && !groupIdMap.has(widget.groupId)) {
        groupIdMap.set(widget.groupId, uuidv4());
      }
    });
  });

  const sheets = source.sheets.map((sheet) => ({
    ...sheet,
    id: sheetIdMap.get(sheet.id)!,
    widgets: sheet.widgets.map((widget) => {
      const migratedWidget = migrateLegacyWidgetHeader(widget);
      const newWidgetId = widgetIdMap.get(widget.id)!;
      return {
        ...migratedWidget,
        id: newWidgetId,
        groupId: widget.groupId ? groupIdMap.get(widget.groupId) : undefined,
        attachedTo: widget.attachedTo?.map((id) => widgetIdMap.get(id) || id),
        data: cloneWidgetData(migratedWidget.type, migratedWidget.data, newWidgetId, widget.id, entryIdMap, widgetIdMap),
      };
    }),
  }));

  const itemEffectValues = source.itemEffectValues ? Object.fromEntries(Object.values(source.itemEffectValues).map((state) => {
    const target = remapTarget(state.target, widgetIdMap, entryIdMap);
    return [numericTargetKey(target), { ...state, target }];
  })) : undefined;
  return {
    sheets,
    activeSheetId: sheetIdMap.get(source.activeSheetId) || sheets[0]?.id,
    ...(source.events ? { events: remapEventIds(source.events, widgetIdMap) } : {}),
    ...(itemEffectValues ? { itemEffectValues } : {}),
    ...(source.compendium ? { compendium: source.compendium.map((section) => ({ ...section, items: section.items.map((item) => remapItemTargets(JSON.parse(JSON.stringify(item)), widgetIdMap, entryIdMap)) })) } : {}),
  };
}

export function cloneCharacterForWorkspace(character: Character): Character {
  const { sheets, activeSheetId, events, itemEffectValues, compendium } = remapCharacterIds(character);
  return {
    ...character,
    id: uuidv4(),
    sheets,
    activeSheetId,
    events,
    ...(itemEffectValues ? { itemEffectValues } : {}),
    ...(compendium ? { compendium } : {}),
  };
}