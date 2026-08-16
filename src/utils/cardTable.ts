import type { CardTableBackDesign, CardTableCard, WidgetData } from '../types';

export type CardTableContentLayout = 'empty' | 'title' | 'symbol' | 'body' | 'title-symbol' | 'title-body' | 'symbol-body' | 'title-symbol-body';

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

export function getCardTableDiscardedCards(data: WidgetData): CardTableCard[] {
  return data.cardTableDiscardedCards ?? [];
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