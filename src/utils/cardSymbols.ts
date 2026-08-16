export const MAX_CARD_SYMBOLS = 20;

export function splitCardSymbols(value: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const SegmenterClass = (Intl as typeof Intl & {
      Segmenter: new (locale: string, options: { granularity: 'grapheme' }) => {
        segment: (input: string) => Iterable<{ segment: string }>;
      };
    }).Segmenter;
    const segmenter = new SegmenterClass('en', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(value), (entry) => entry.segment);
  }
  return [...value];
}

export function limitCardSymbols(value: string): string {
  return splitCardSymbols(value).slice(0, MAX_CARD_SYMBOLS).join('');
}

export function getCardSymbolColumns(symbolCount: number): number {
  if (symbolCount <= 1) return 1;
  if (symbolCount <= 4) return 2;
  if (symbolCount <= 12) return 3;
  if (symbolCount <= 18 && symbolCount % 3 === 0) return 3;
  if (symbolCount <= 16) return 4;
  if (symbolCount % 4 === 0) return 4;
  return 5;
}

export function getCardSymbolSizeFactor(columns: number): number {
  if (columns === 1) return 0.24;
  if (columns === 2) return 0.17;
  if (columns === 3) return 0.14;
  if (columns === 4) return 0.12;
  return 0.1;
}
