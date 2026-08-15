import type { CardTableBackDesign, CardTableCard, WidgetData } from '../types';

export function getCardTableBackDesign(data: WidgetData): CardTableBackDesign {
  return {
    color: data.cardTableBackColor,
    symbol: data.cardTableBackSymbol,
    text: data.cardTableBackText,
    pattern: data.cardTableBackPattern ?? 'crosshatch',
  };
}

export function getCardOriginBackDesign(card: CardTableCard): CardTableBackDesign {
  return {
    color: card.originBackColor,
    symbol: card.originBackSymbol,
    text: card.originBackText,
    pattern: card.originBackPattern ?? 'crosshatch',
  };
}

export function getCardTableCards(data: WidgetData): CardTableCard[] {
  if (data.cardTableCards) return data.cardTableCards;
  return data.cardTableSpots?.flatMap((spot) => spot.cards) ?? [];
}

export function normalizeCardTableOrigins(
  cards: CardTableCard[],
  widgetId: string,
  backDesign: CardTableBackDesign,
): CardTableCard[] {
  return cards.map((card, index) => {
    const hasOrigin = Boolean(card.originWidgetId);
    return {
      ...card,
      originWidgetId: card.originWidgetId ?? widgetId,
      originOrder: card.originOrder ?? index,
      originBackColor: hasOrigin ? card.originBackColor : backDesign.color,
      originBackSymbol: hasOrigin ? card.originBackSymbol : backDesign.symbol,
      originBackText: hasOrigin ? card.originBackText : backDesign.text,
      originBackPattern: hasOrigin ? card.originBackPattern : backDesign.pattern,
    };
  });
}