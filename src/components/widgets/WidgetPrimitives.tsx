import type { ReactNode } from 'react';

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
