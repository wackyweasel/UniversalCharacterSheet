import type { CardTableCard, WidgetData } from '../types';

export function getCardTableCards(data: WidgetData): CardTableCard[] {
  if (data.cardTableCards) return data.cardTableCards;
  return data.cardTableSpots?.flatMap((spot) => spot.cards) ?? [];
}