import type { ReactNode } from 'react';
import { distributeIntoColumns, normalizeItemColumns } from '../../utils/itemColumns';

interface WidgetEmptyStateProps {
  title: string;
  hint?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function WidgetEmptyState({
  title,
  hint,
  action,
  compact = false,
  className = '',
}: WidgetEmptyStateProps) {
  return (
    <div className={`widget-empty-state ${compact ? 'widget-empty-state--compact' : ''} ${className}`}>
      <p className="widget-empty-state__title">{title}</p>
      {hint && <p className="widget-empty-state__hint">{hint}</p>}
      {action && <div className="widget-empty-state__action">{action}</div>}
    </div>
  );
}

interface WidgetItemColumnsProps {
  items: ReactNode[];
  columns?: number;
  rowGap?: number;
}

// Renders items unchanged for one column; otherwise spreads them evenly across side-by-side columns.
export function WidgetItemColumns({ items, columns, rowGap = 4 }: WidgetItemColumnsProps) {
  const columnCount = normalizeItemColumns(columns);
  if (columnCount === 1 || items.length === 0) return <>{items}</>;

  return (
    <div className="flex w-full min-w-0 items-start gap-3">
      {distributeIntoColumns(items, columnCount).map((columnItems, index) => (
        <div key={index} className="flex min-w-0 flex-1 flex-col" style={{ rowGap }}>
          {columnItems}
        </div>
      ))}
    </div>
  );
}
