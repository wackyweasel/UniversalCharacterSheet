import { v4 as uuidv4 } from 'uuid';
import type { CardTableCard, Character, Sheet, Widget, WidgetType } from '../types';
import { cloneInventoryData } from './inventory';
import {
  getCardTableBackDesign,
  getCardTableCards,
  getCardTableDiscardedCards,
  normalizeCardTableWidgetData,
} from './cardTable';
import { normalizeWidgetGeometry } from './widgetGeometry';

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

export function cloneWidgetData(type: WidgetType, data: Widget['data'], widgetId: string): Widget['data'] {
  return type === 'DECK_OF_CARDS'
    ? cloneCardTableData(data, widgetId)
    : type === 'INVENTORY'
      ? cloneInventoryData(JSON.parse(JSON.stringify(data)))
      : JSON.parse(JSON.stringify(data));
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
    return {
      ...character,
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
  };
}

export function remapCharacterIds(source: { sheets: Sheet[]; activeSheetId: string }): {
  sheets: Sheet[];
  activeSheetId: string;
} {
  const sheetIdMap = new Map<string, string>();
  const widgetIdMap = new Map<string, string>();
  const groupIdMap = new Map<string, string>();

  source.sheets.forEach((sheet) => {
    sheetIdMap.set(sheet.id, uuidv4());
    sheet.widgets.forEach((widget) => {
      widgetIdMap.set(widget.id, uuidv4());
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
        data: cloneWidgetData(migratedWidget.type, migratedWidget.data, newWidgetId),
      };
    }),
  }));

  return {
    sheets,
    activeSheetId: sheetIdMap.get(source.activeSheetId) || sheets[0]?.id,
  };
}

export function cloneCharacterForWorkspace(character: Character): Character {
  const { sheets, activeSheetId } = remapCharacterIds(character);
  return {
    ...character,
    id: uuidv4(),
    sheets,
    activeSheetId,
  };
}