import { useRef, useState, type ReactNode } from 'react';
import { ChevronsDownIcon, ChevronsUpIcon, FilterIcon, SearchIcon, XIcon } from './icons';
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

const actionClass = 'inline-flex h-8 w-8 items-center justify-center gap-1 rounded-button border border-theme-border text-xs font-body text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-2';

export default function AutomationsPanelHeader<T extends string>({
  description, searchLabel, searchPlaceholder, query, onQueryChange, filter, filters, onFilterChange,
  filterLabel, addAction, deletion, onCollapseAll, onExpandAll, collapseDisabled, expandDisabled,
}: Props<T>) {
  const [searchOpen, setSearchOpen] = useState(Boolean(query));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const searchId = `automation-${deletion.tab}-search`;
  const filtersId = `automation-${deletion.tab}-filters`;
  const filterActive = filter !== filters[0]?.id;

  return (
    <div
      className="flex shrink-0 flex-col gap-2 border-b border-theme-border p-3 sm:gap-2.5"
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || (!searchOpen && !filtersOpen) || !window.matchMedia('(max-width: 639px)').matches) return;
        event.preventDefault();
        event.stopPropagation();
        if (searchOpen && query) onQueryChange('');
        setSearchOpen(false);
        setFiltersOpen(false);
        (filtersOpen ? filterButtonRef : searchButtonRef).current?.focus({ preventScroll: true });
      }}
    >
      <p className="hidden text-xs leading-relaxed text-theme-muted font-body sm:block">{description}</p>
      <div id={searchId} className={`min-w-0 ${searchOpen ? 'block' : 'hidden'} sm:block`}>
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-muted" />
          <input
            ref={searchRef}
            type="search"
            aria-label={searchLabel}
            placeholder={searchPlaceholder}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="h-9 w-full rounded-button border border-theme-border bg-theme-background pl-8 pr-9 text-sm font-body text-theme-ink placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-theme-accent/40 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && <button type="button" aria-label="Clear search" onClick={() => onQueryChange('')} className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-theme-muted hover:text-theme-ink"><XIcon className="h-3.5 w-3.5" /></button>}
        </div>
      </div>
      <div id={filtersId} role="group" aria-label={filterLabel} className={`${filtersOpen ? 'flex' : 'hidden'} flex-wrap gap-1.5 sm:flex`}>
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            onClick={() => {
              onFilterChange(item.id);
              setFiltersOpen(false);
              if (filtersOpen) filterButtonRef.current?.focus({ preventScroll: true });
            }}
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
      <div className="order-first flex flex-wrap items-center justify-between gap-2 sm:order-none max-sm:[&>button]:w-8 max-sm:[&>button]:px-0">
        {addAction}
        <button
          ref={searchButtonRef}
          type="button"
          aria-label={searchLabel}
          aria-expanded={searchOpen}
          aria-controls={searchId}
          title={query ? `${searchLabel} (active)` : searchLabel}
          onClick={() => {
            setSearchOpen(!searchOpen);
            if (!searchOpen) window.requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true }));
          }}
          className={`${actionClass} relative sm:hidden`}
        >
          <SearchIcon className="h-3.5 w-3.5" />
          {query && <span aria-hidden="true" className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-theme-accent" />}
        </button>
        <button
          ref={filterButtonRef}
          type="button"
          aria-label={filterLabel}
          aria-expanded={filtersOpen}
          aria-controls={filtersId}
          title={filterActive ? `${filterLabel} (active)` : filterLabel}
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={`${actionClass} relative sm:hidden`}
        >
          <FilterIcon className="h-3.5 w-3.5" />
          {filterActive && <span aria-hidden="true" className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-theme-accent" />}
        </button>
        <AutomationsDeleteAllButton key={deletion.tab} {...deletion} />
        <div className="ml-auto flex gap-1.5">
          <button type="button" title="Collapse all" onClick={onCollapseAll} disabled={collapseDisabled} className={actionClass}><ChevronsUpIcon className="h-3.5 w-3.5" /><span className="sr-only sm:not-sr-only">Collapse all</span></button>
          <button type="button" title="Expand all" onClick={onExpandAll} disabled={expandDisabled} className={actionClass}><ChevronsDownIcon className="h-3.5 w-3.5" /><span className="sr-only sm:not-sr-only">Expand all</span></button>
        </div>
      </div>
    </div>
  );
}
