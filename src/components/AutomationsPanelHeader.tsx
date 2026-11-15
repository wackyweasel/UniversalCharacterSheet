import type { ReactNode } from 'react';
import { ChevronsDownIcon, ChevronsUpIcon, SearchIcon, XIcon } from './icons';
import AutomationsDeleteAllButton, { type AutomationDeletion } from './AutomationsDeleteAllButton';

interface Props<T extends string> {
  description: string;
  searchLabel: string;
  searchPlaceholder: string;
  query: string;
  onQueryChange: (query: string) => void;
  filter: T;
  filters: { id: T; label: string; count: number; warning?: boolean }[];
  onFilterChange: (filter: T) => void;
  filterLabel: string;
  addAction?: ReactNode;
  deletion: AutomationDeletion;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  collapseDisabled: boolean;
  expandDisabled: boolean;
}

const actionClass = 'inline-flex h-8 items-center justify-center gap-1 rounded-button border border-theme-border px-2 text-xs font-body text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper disabled:cursor-not-allowed disabled:opacity-40';

export default function AutomationsPanelHeader<T extends string>({
  description, searchLabel, searchPlaceholder, query, onQueryChange, filter, filters, onFilterChange,
  filterLabel, addAction, deletion, onCollapseAll, onExpandAll, collapseDisabled, expandDisabled,
}: Props<T>) {
  return (
    <div className="shrink-0 space-y-2.5 border-b border-theme-border p-3">
      <p className="text-xs leading-relaxed text-theme-muted font-body">{description}</p>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-muted" />
        <input
          type="search"
          aria-label={searchLabel}
          placeholder={searchPlaceholder}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="h-9 w-full rounded-button border border-theme-border bg-theme-background pl-8 pr-9 text-sm font-body text-theme-ink placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-theme-accent/40 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query && <button type="button" aria-label="Clear search" onClick={() => onQueryChange('')} className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-theme-muted hover:text-theme-ink"><XIcon className="h-3.5 w-3.5" /></button>}
      </div>
      <div role="group" aria-label={filterLabel} className="flex flex-wrap gap-1.5">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            onClick={() => onFilterChange(item.id)}
            className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-body transition-colors ${
              filter === item.id
                ? item.warning ? 'border-amber-500 bg-amber-500 text-white' : 'border-theme-accent bg-theme-accent text-theme-paper'
                : item.warning ? 'border-amber-500/60 text-amber-600 hover:bg-amber-500/10' : 'border-theme-border text-theme-muted hover:text-theme-ink'
            }`}
          >
            {item.label} <span className="tabular-nums opacity-70">{item.count}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {addAction}
        <AutomationsDeleteAllButton key={deletion.tab} {...deletion} />
        <div className="ml-auto flex gap-1.5">
          <button type="button" onClick={onCollapseAll} disabled={collapseDisabled} className={actionClass}><ChevronsUpIcon className="h-3.5 w-3.5" /> Collapse all</button>
          <button type="button" onClick={onExpandAll} disabled={expandDisabled} className={actionClass}><ChevronsDownIcon className="h-3.5 w-3.5" /> Expand all</button>
        </div>
      </div>
    </div>
  );
}
