import type { CardTableBackDesign, CardTableCard, WidgetData } from '../types';

export type CardTableContentLayout = 'empty' | 'title' | 'symbol' | 'body' | 'title-symbol' | 'title-body' | 'symbol-body' | 'title-symbol-body';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeCardText(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

export function normalizeCardTableAmount(value: unknown): number {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) ? Math.max(1, Math.floor(amount)) : 1;
}

export function getCardTableCardGroupId(card: CardTableCard): string {
  return card.cardGroupId || card.id;
}

function normalizeCardPattern(value: unknown): CardTableCard['originBackPattern'] {
  return value === 'none' || value === 'crosshatch' || value === 'diamonds' || value === 'stripes' || value === 'dots'
    ? value
    : undefined;
}

export function normalizeCardTableCards(cards: unknown, idPrefix: string): CardTableCard[] {
  if (!Array.isArray(cards)) return [];

  return cards.flatMap((value, index) => {
    if (!isRecord(value)) return [];

    return [{
      ...value,
      id: typeof value.id === 'string' && value.id.trim() ? value.id : `${idPrefix}-${index}`,
      title: normalizeCardText(value.title),
      symbol: normalizeCardText(value.symbol),
      body: normalizeCardText(value.body),
      amount: normalizeCardTableAmount(value.amount),
      cardGroupId: typeof value.cardGroupId === 'string' && value.cardGroupId.trim() ? value.cardGroupId : undefined,
      faceUp: value.faceUp === true,
      originWidgetId: typeof value.originWidgetId === 'string' && value.originWidgetId ? value.originWidgetId : undefined,
      originOrder: typeof value.originOrder === 'number' && Number.isFinite(value.originOrder) ? value.originOrder : undefined,
      originBackColor: typeof value.originBackColor === 'string' ? value.originBackColor : undefined,
      originBackTextColor: typeof value.originBackTextColor === 'string' ? value.originBackTextColor : undefined,
      originBackSymbol: normalizeCardText(value.originBackSymbol) || undefined,
      originBackText: normalizeCardText(value.originBackText) || undefined,
      originBackPattern: normalizeCardPattern(value.originBackPattern),
    }];
  });
}

export function getCardTableContentLayout(card: CardTableCard): CardTableContentLayout {
  const parts: string[] = [];
  if (card.title.trim()) parts.push('title');
  if (card.symbol.trim()) parts.push('symbol');
  if (card.body.trim()) parts.push('body');
  return (parts.join('-') || 'empty') as CardTableContentLayout;
}

export function getCardTableBackDesign(data: WidgetData): CardTableBackDesign {
  return {
    color: data.cardTableBackColor,
    textColor: data.cardTableBackTextColor,
    symbol: data.cardTableBackSymbol,
    text: data.cardTableBackText,
    pattern: data.cardTableBackPattern ?? 'crosshatch',
  };
}

export function getCardOriginBackDesign(card: CardTableCard): CardTableBackDesign {
  return {
    color: card.originBackColor,
    textColor: card.originBackTextColor,
    symbol: card.originBackSymbol,
    text: card.originBackText,
    pattern: card.originBackPattern ?? 'crosshatch',
  };
}

export function getCardTableCards(data: WidgetData): CardTableCard[] {
  if (Array.isArray(data.cardTableCards) && data.cardTableCards.length > 0) return data.cardTableCards;
  return Array.isArray(data.cardTableSpots)
    ? data.cardTableSpots.flatMap((spot) => Array.isArray(spot.cards) ? spot.cards : [])
    : [];
}

export function getCardTableDiscardedCards(data: WidgetData): CardTableCard[] {
  return Array.isArray(data.cardTableDiscardedCards) ? data.cardTableDiscardedCards : [];
}

export function normalizeCardTableWidgetData(data: WidgetData, widgetId: string): WidgetData {
  const backDesign = getCardTableBackDesign(data);
  return {
    ...data,
    cardTableCards: normalizeCardTableOrigins(getCardTableCards(data), widgetId, backDesign, `${widgetId}-card`),
    cardTableDiscardedCards: normalizeCardTableOrigins(getCardTableDiscardedCards(data), widgetId, backDesign, `${widgetId}-discarded-card`),
    cardTableSpots: undefined,
  };
}

export function normalizeCardTableOrigins(
  cards: CardTableCard[],
  widgetId: string,
  backDesign: CardTableBackDesign,
  idPrefix = `${widgetId}-card`,
): CardTableCard[] {
  return normalizeCardTableCards(cards, idPrefix).map((card, index) => {
    const hasOrigin = Boolean(card.originWidgetId);
    return {
      ...card,
      amount: normalizeCardTableAmount(card.amount),
      cardGroupId: getCardTableCardGroupId(card),
      originWidgetId: card.originWidgetId ?? widgetId,
      originOrder: card.originOrder ?? index,
      originBackColor: hasOrigin ? card.originBackColor : backDesign.color,
      originBackTextColor: hasOrigin ? card.originBackTextColor : backDesign.textColor,
      originBackSymbol: hasOrigin ? card.originBackSymbol : backDesign.symbol,
      originBackText: hasOrigin ? card.originBackText : backDesign.text,
      originBackPattern: hasOrigin ? card.originBackPattern : backDesign.pattern,
    };
  });
}