import type { CSSProperties } from 'react';
import type { WidgetData } from '../types';

const CLOCK_GAP_PX = 12;
const CHART_GAP_PX = 5;
const LABEL_LINE_PX = 17;
const VALUE_LINE_PX = 16;

export function getProgressClockGrid(data: WidgetData, width: number, height: number) {
  const clocks = data.clockItems ?? [];
  const count = Math.max(1, clocks.length);
  const layout = data.clockLayout ?? 'auto';
  const rowExtra = (clocks.some((clock) => clock.name) ? CHART_GAP_PX + LABEL_LINE_PX : 0)
    + (data.clockShowValues ? CHART_GAP_PX + VALUE_LINE_PX : 0);
  // The numeric estimate only chooses the column count; the CSS size is measured from the clock container.
  const estimateWidth = Math.max(1, width - 8);
  const estimateHeight = Math.max(1, height - 40);
  let best = { columns: 1, rows: count, size: -Infinity };
  const fixedColumns = layout === 'horizontal' ? count : layout === 'vertical' ? 1 : null;
  const minColumns = fixedColumns ?? 1;
  const maxColumns = fixedColumns ?? count;
  for (let columns = minColumns; columns <= maxColumns; columns++) {
    const rows = Math.ceil(count / columns);
    const size = Math.min(
      (estimateWidth - CLOCK_GAP_PX * (columns - 1)) / columns,
      (estimateHeight - CLOCK_GAP_PX * (rows - 1) - rows * rowExtra) / rows,
    );
    if (size > best.size) best = { columns, rows, size };
  }
  const { columns, rows } = best;
  const byWidth = `calc((100cqw - ${CLOCK_GAP_PX * (columns - 1)}px) / ${columns} - 1px)`;
  const byHeight = `calc((100cqh - ${CLOCK_GAP_PX * (rows - 1) + rows * rowExtra}px) / ${rows})`;
  const style = {
    containerType: 'size',
    '--clock-size': `max(8px, min(${byWidth}, ${byHeight}))`,
  } as CSSProperties;
  return { columns, rows, style };
}
