import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { distributeIntoColumns, distributeIntoColumnsByHeight, normalizeItemColumns } from '../../utils/itemColumns';

interface ValueAdjustRowProps {
  onAdjust: (delta: number) => void;
  disabled?: boolean;
}

// Collapsed "Add or Remove amount" button that expands into "Remove [amount] Add" for adjusting a draft current value.
export function ValueAdjustRow({ onAdjust, disabled = false }: ValueAdjustRowProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const parsed = Number(amount);
  const invalid = disabled || amount.trim() === '' || !Number.isFinite(parsed) || parsed <= 0;

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="widget-control h-8 min-h-0 w-full px-2 text-sm"
      >
        Add or Remove amount
      </button>
    );
  }

  return (
    <div role="group" aria-label="Adjust current value" className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={invalid}
        onClick={() => onAdjust(-parsed)}
        className="widget-control h-8 min-h-0 flex-1 px-2 text-sm"
      >
        − Remove
      </button>
      <input
        autoFocus
        type="number"
        step="any"
        min="0"
        value={amount}
        placeholder="Amount"
        onChange={(event) => setAmount(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          if (!invalid) onAdjust(parsed);
        }}
        aria-label="Amount to add or remove"
        className="h-8 w-16 rounded-button border border-theme-border bg-theme-paper px-1 text-center text-sm font-bold text-theme-ink placeholder:font-normal focus:border-theme-accent focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        disabled={invalid}
        onClick={() => onAdjust(parsed)}
        className="widget-control h-8 min-h-0 flex-1 px-2 text-sm"
      >
        + Add
      </button>
    </div>
  );
}

// Adds delta to a numeric draft string, keeping an explicit "+" sign style; returns the draft unchanged if it is not a number.
export function applyDeltaToDraft(draft: string, delta: number): string {
  const value = Number(draft);
  if (draft.trim() === '' || !Number.isFinite(value)) return draft;
  const next = Number((value + delta).toFixed(10));
  return draft.trim().startsWith('+') && next >= 0 ? `+${next}` : String(next);
}

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
  // Balance columns by rendered item height instead of item count (for items whose height varies, e.g. wrapped names).
  balanceByHeight?: boolean;
}

function HeightBalancedColumns({ items, columns, rowGap }: { items: ReactNode[]; columns: number; rowGap: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [heights, setHeights] = useState<number[]>([]);

  const measure = () => {
    const elements = rootRef.current?.querySelectorAll<HTMLElement>('[data-column-item]');
    if (!elements) return;
    const next: number[] = [];
    elements.forEach((element) => { next[Number(element.dataset.columnItem)] = element.offsetHeight; });
    setHeights((current) => (current.length === next.length && current.every((height, index) => height === next[index]) ? current : next));
  };

  // Item heights are the same in any column (equal widths), so measuring the current layout is enough.
  useLayoutEffect(measure);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const columnItems = distributeIntoColumnsByHeight(items, heights, columns, rowGap);
  let itemIndex = 0;

  return (
    <div ref={rootRef} className="flex w-full min-w-0 items-start gap-3">
      {columnItems.map((group, index) => (
        <div key={index} className="flex min-w-0 flex-1 flex-col" style={{ rowGap }}>
          {group.map((item) => {
            const currentIndex = itemIndex++;
            return <div key={currentIndex} data-column-item={currentIndex} className="min-w-0">{item}</div>;
          })}
        </div>
      ))}
    </div>
  );
}

// Renders items unchanged for one column; otherwise spreads them evenly across side-by-side columns.
export function WidgetItemColumns({ items, columns, rowGap = 4, balanceByHeight = false }: WidgetItemColumnsProps) {
  const columnCount = normalizeItemColumns(columns);
  if (columnCount === 1 || items.length === 0) return <>{items}</>;
  if (balanceByHeight) return <HeightBalancedColumns items={items} columns={columnCount} rowGap={rowGap} />;

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
