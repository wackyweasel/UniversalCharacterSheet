import { describe, expect, it } from 'vitest';
import { getNumberDisplayLayout } from './numberDisplayLayout';

describe('number display layout compatibility', () => {
  it('defaults saved widgets without settings to the original horizontal sizing', () => {
    expect(getNumberDisplayLayout({}, 220, 112)).toEqual(
      getNumberDisplayLayout({ displayLayout: 'horizontal', numberBoxFixedAspectRatio: false }, 220, 112),
    );
  });

  it.each(['horizontal', 'vertical'] as const)('preserves original %s box dimensions and fonts', (displayLayout) => {
    for (const [width, height, count, percent] of [[220, 112, 3, 100], [50, 300, 4, 75], [300, 40, 6, 50]]) {
      const scale = percent / 100;
      const horizontal = displayLayout === 'horizontal';
      const result = getNumberDisplayLayout({
        displayLayout,
        displayNumbers: Array.from({ length: count }, () => ({ label: 'Score', value: 12 })),
        numberBoxScale: percent,
      }, width, height);
      expect(result.containerClassName).toBe(`${horizontal ? 'flex-row' : 'flex-col'} items-stretch justify-center overflow-hidden`);
      expect(result.boxStyle).toEqual({
        flex: '1 1 0%',
        minWidth: horizontal ? `${30 * scale}px` : undefined,
        maxWidth: horizontal ? `${70 * scale}px` : undefined,
        minHeight: !horizontal ? `${30 * scale}px` : undefined,
        maxHeight: !horizontal ? `${55 * scale}px` : undefined,
        width: !horizontal ? `${100 * scale}%` : undefined,
        height: horizontal ? `${100 * scale}%` : undefined,
        padding: `${0.25 * scale}rem`,
      });
      expect(result.secondaryBoxStyle).toEqual({
        minHeight: `${24 * scale}px`,
        minWidth: `${28 * scale}px`,
        paddingLeft: `${6 * scale}px`,
        paddingRight: `${6 * scale}px`,
      });
      const dimension = Math.min(width / (horizontal ? count : 1), height / (horizontal ? 1 : count));
      expect(result.numberFontSize).toBe(Math.max(10, Math.min(20, dimension * 0.25)));
      expect(result.labelFontSize).toBe(Math.max(7, Math.min(10, dimension * 0.12)));
      expect(result.secondaryFontSize).toBe(Math.max(9, Math.min(15, dimension * 0.18)));
    }
  });

  it.each(['horizontal', 'vertical', 'auto'] as const)('supports fixed square boxes with %s arrangement', (displayLayout) => {
    const data = { displayLayout, numberBoxFixedAspectRatio: true, numberBoxScale: 71 };
    const result = getNumberDisplayLayout(data, 300, 200);
    expect(result.boxStyle).toMatchObject({ flex: '0 0 auto', aspectRatio: '1', width: `min(100%, ${70 * 0.71}px)` });
    expect(result.secondaryBoxStyle).toEqual({
      minHeight: `${24 * 0.71}px`,
      minWidth: `${28 * 0.71}px`,
      paddingLeft: `${6 * 0.71}px`,
      paddingRight: `${6 * 0.71}px`,
    });
    expect(result.containerClassName).toContain(displayLayout === 'auto' ? 'flex-wrap' : 'flex-nowrap');
    expect(result.containerClassName).toContain(displayLayout === 'vertical' ? 'flex-col' : 'flex-row');
    expect(result).toEqual(getNumberDisplayLayout(data, 300, 40));
    expect(result.boxStyle).not.toEqual(getNumberDisplayLayout({ ...data, numberBoxScale: 70 }, 300, 200).boxStyle);
  });

  it('allows Auto wrapping without fixing the aspect ratio', () => {
    const result = getNumberDisplayLayout({ displayLayout: 'auto', numberBoxFixedAspectRatio: false }, 200, 200);
    expect(result.containerClassName).toContain('flex-wrap');
    expect(result.containerClassName).toContain('items-stretch');
    expect(result.boxStyle.aspectRatio).toBeUndefined();
    expect(result.boxStyle.flex).toBe('1 1 70px');
  });

  it('restores the legacy appearance when fixed aspect ratio is turned off', () => {
    expect(getNumberDisplayLayout({ displayLayout: 'vertical', numberBoxFixedAspectRatio: false }, 120, 240))
      .toEqual(getNumberDisplayLayout({ displayLayout: 'vertical' }, 120, 240));
  });

  it('keeps the size control effective for adaptive boxes', () => {
    const result = getNumberDisplayLayout({ displayLayout: 'horizontal', numberBoxFixedAspectRatio: false, numberBoxScale: 60 }, 220, 112);
    expect(result.secondaryBoxStyle).toEqual({
      minHeight: '14.399999999999999px',
      minWidth: '16.8px',
      paddingLeft: '3.5999999999999996px',
      paddingRight: '3.5999999999999996px',
    });
  });
});
