import { MAX_ITEM_COLUMNS, normalizeItemColumns } from '../../utils/itemColumns';

interface ItemColumnsControlProps {
  id: string;
  value?: number;
  onChange: (columns: number) => void;
}

export function ItemColumnsControl({ id, value, onChange }: ItemColumnsControlProps) {
  const columns = normalizeItemColumns(value);

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-bold uppercase text-theme-muted">Columns</label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(columns - 1)}
          disabled={columns <= 1}
          aria-label="Decrease columns"
          className="widget-control h-10 w-10 flex-shrink-0 text-base font-bold"
        >
          −
        </button>
        <input
          id={id}
          type="number"
          min={1}
          max={MAX_ITEM_COLUMNS}
          value={columns}
          onChange={(event) => {
            if (event.target.value !== '') onChange(normalizeItemColumns(event.target.value));
          }}
          className="h-10 min-w-0 flex-1 rounded-button border border-theme-border bg-theme-paper px-3 text-center text-sm text-theme-ink focus:border-theme-accent focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => onChange(columns + 1)}
          disabled={columns >= MAX_ITEM_COLUMNS}
          aria-label="Increase columns"
          className="widget-control h-10 w-10 flex-shrink-0 text-base font-bold"
        >
          +
        </button>
      </div>
    </div>
  );
}
