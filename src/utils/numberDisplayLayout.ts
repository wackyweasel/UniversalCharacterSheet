import type { CSSProperties } from 'react';
import type { WidgetData } from '../types';

// List view has no fixed widget height, so boxes keep a set size and wrap instead of filling a container.
export function getNumberDisplayListLayout(data: WidgetData) {
  const hasStepButtons = data.showDisplayNumberButtons ?? false;
  const layout = data.displayLayout ?? 'horizontal';
  const fixedAspectRatio = data.numberBoxFixedAspectRatio ?? false;
  const dynamicSize = data.numberBoxDynamic ?? true;
  const scale = dynamicSize ? 1 : Math.min(100, Math.max(50, data.numberBoxScale ?? 100)) / 100;
  const hasSecondary = data.showSecondaryDisplayNumbers ?? false;
  const boxSize = (hasStepButtons ? 100 : 70) * scale;
  const minHeight = Math.round((hasSecondary ? 64 : 48) * scale);
  const stacked = layout === 'vertical';

  const boxStyle: CSSProperties = fixedAspectRatio
    ? { flex: '0 0 auto', width: `min(100%, ${boxSize}px)`, aspectRatio: '1', minWidth: 0 }
    : stacked
      ? { flex: '0 0 auto', width: '100%', minHeight: `${minHeight}px` }
      : { flex: `1 1 ${boxSize}px`, minWidth: `min(100%, ${30 * scale}px)`, maxWidth: dynamicSize ? undefined : `${boxSize}px`, minHeight: `${minHeight}px` };

  return {
    containerClassName: `${stacked ? 'flex-col items-center' : 'flex-row flex-wrap items-stretch justify-center'} content-start`,
    boxStyle: { ...boxStyle, padding: `${0.25 * scale}rem` },
    secondaryBoxStyle: {
      minHeight: `${24 * scale}px`,
      minWidth: `${28 * scale}px`,
      paddingLeft: `${6 * scale}px`,
      paddingRight: `${6 * scale}px`,
    },
    numberFontSize: Math.max(10, Math.min(20, boxSize * 0.25)),
    labelFontSize: Math.max(9, Math.min(10, boxSize * 0.12)),
    secondaryFontSize: Math.max(9, Math.min(15, boxSize * 0.18)),
  };
}

export function getNumberDisplayLayout(data: WidgetData, width: number, height: number) {
  const hasStepButtons = data.showDisplayNumberButtons ?? false;
  // Missing settings retain the original appearance of saved widgets and templates.
  const layout = data.displayLayout ?? 'horizontal';
  const fixedAspectRatio = data.numberBoxFixedAspectRatio ?? false;
  // Dynamic boxes ignore the box size slider and grow or shrink with the widget (no size caps).
  const dynamicSize = data.numberBoxDynamic ?? true;
  const scale = dynamicSize ? 1 : Math.min(100, Math.max(50, data.numberBoxScale ?? 100)) / 100;
  const count = data.displayNumbers?.length || 1;
  const isHorizontal = layout === 'horizontal';
  const boxSize = (hasStepButtons ? 100 : 70) * scale;
  const columns = Math.max(1, Math.min(count, Math.floor((width - 4) / (boxSize + 4))));
  // Dynamic square boxes fill the box area, measured in container units (cqw/cqh) by the widget.
  // The numeric estimate only chooses the Auto column count and font sizes; it allows for the widget header.
  const estimateWidth = Math.max(1, width - 8);
  const estimateHeight = Math.max(1, height - 40);
  const squareFit = (columns: number, rows: number) => Math.max(1,
    Math.min((estimateWidth - 4 * (columns - 1)) / columns, (estimateHeight - 4 * (rows - 1)) / rows));
  let squareColumns = isHorizontal ? count : 1;
  if (layout === 'auto') {
    squareColumns = Array.from({ length: count }, (_, index) => index + 1)
      .reduce((best, columns) => (squareFit(columns, Math.ceil(count / columns)) > squareFit(best, Math.ceil(count / best)) ? columns : best), 1);
  }
  const squareRows = Math.ceil(count / squareColumns);
  const dynamicSquareSize = fixedAspectRatio && dynamicSize
    ? `min(calc((100cqw - ${4 * (squareColumns - 1)}px) / ${squareColumns}), calc((100cqh - ${4 * (squareRows - 1)}px) / ${squareRows}))`
    : undefined;
  const fontDimension = fixedAspectRatio
    ? Math.max(1, dynamicSize ? squareFit(squareColumns, squareRows) : Math.min(boxSize, width - 8))
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
    boxStyle = dynamicSize
      ? { flex: '0 0 auto', width: dynamicSquareSize, aspectRatio: '1', minWidth: 0, minHeight: 0 }
      : {
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
      maxWidth: dynamicSize ? undefined : `${boxSize}px`,
      minHeight: `${30 * scale}px`,
    };
  } else {
    containerClassName = `${isHorizontal ? 'flex-row' : 'flex-col'} items-stretch justify-center overflow-hidden`;
    boxStyle = {
      flex: '1 1 0%',
      minWidth: isHorizontal ? `${30 * scale}px` : undefined,
      maxWidth: isHorizontal && !dynamicSize ? `${boxSize}px` : undefined,
      minHeight: !isHorizontal ? `${30 * scale}px` : undefined,
      maxHeight: !isHorizontal && !dynamicSize ? `${55 * scale}px` : undefined,
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
