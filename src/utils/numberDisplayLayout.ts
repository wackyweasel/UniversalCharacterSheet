import type { CSSProperties } from 'react';
import type { WidgetData } from '../types';

export function getNumberDisplayLayout(data: WidgetData, width: number, height: number) {
  // Missing settings retain the original appearance of saved widgets and templates.
  const layout = data.displayLayout ?? 'horizontal';
  const fixedAspectRatio = data.numberBoxFixedAspectRatio ?? false;
  const scale = Math.min(100, Math.max(50, data.numberBoxScale ?? 100)) / 100;
  const count = data.displayNumbers?.length || 1;
  const isHorizontal = layout === 'horizontal';
  const boxSize = 70 * scale;
  const columns = Math.max(1, Math.min(count, Math.floor((width - 4) / (boxSize + 4))));
  const fontDimension = fixedAspectRatio
    ? Math.max(1, Math.min(boxSize, width - 8))
    : layout === 'auto'
      ? Math.min(boxSize, height / Math.ceil(count / columns))
      : Math.min(width / (isHorizontal ? count : 1), height / (isHorizontal ? 1 : count));

  let containerClassName: string;
  let boxStyle: CSSProperties;
  if (fixedAspectRatio) {
    containerClassName = layout === 'auto'
      ? 'flex-row flex-wrap content-start items-start justify-center overflow-auto'
      : layout === 'vertical'
        ? 'flex-col flex-nowrap items-center justify-start overflow-auto'
        : 'flex-row flex-nowrap items-start justify-start overflow-auto';
    boxStyle = {
      flex: '0 0 auto',
      width: `min(100%, ${boxSize}px)`,
      aspectRatio: '1',
      minWidth: 0,
      minHeight: 0,
    };
  } else if (layout === 'auto') {
    containerClassName = 'flex-row flex-wrap content-stretch items-stretch justify-center overflow-auto';
    boxStyle = {
      flex: `1 1 ${boxSize}px`,
      minWidth: `min(100%, ${30 * scale}px)`,
      maxWidth: `${boxSize}px`,
      minHeight: `${30 * scale}px`,
    };
  } else {
    containerClassName = `${isHorizontal ? 'flex-row' : 'flex-col'} items-stretch justify-center overflow-hidden`;
    boxStyle = {
      flex: '1 1 0%',
      minWidth: isHorizontal ? `${30 * scale}px` : undefined,
      maxWidth: isHorizontal ? `${70 * scale}px` : undefined,
      minHeight: !isHorizontal ? `${30 * scale}px` : undefined,
      maxHeight: !isHorizontal ? `${55 * scale}px` : undefined,
      width: !isHorizontal ? `${100 * scale}%` : undefined,
      height: isHorizontal ? `${100 * scale}%` : undefined,
    };
  }

  return {
    containerClassName,
    boxStyle: { ...boxStyle, padding: `${0.25 * scale}rem` },
    secondaryBoxStyle: {
      minHeight: `${24 * scale}px`,
      minWidth: `${28 * scale}px`,
      paddingLeft: `${6 * scale}px`,
      paddingRight: `${6 * scale}px`,
    },
    numberFontSize: Math.max(10, Math.min(20, fontDimension * 0.25)),
    labelFontSize: Math.max(7, Math.min(10, fontDimension * 0.12)),
    secondaryFontSize: Math.max(9, Math.min(15, fontDimension * 0.18)),
  };
}
