import { useEffect, useRef, useState } from 'react';
import type { SheetSearchResult } from '../utils/sheetSearch';
import { SearchIcon, XIcon } from './icons';
import { Tooltip } from './Tooltip';

interface SheetSearchProps {
  open: boolean;
  query: string;
  results: SheetSearchResult[];
  onOpenChange: (open: boolean) => void;
  onQueryChange: (query: string) => void;
  onSelect: (result: SheetSearchResult) => void;
  triggerClassName?: string;
}

export default function SheetSearch({
  open,
  query,
  results,
  onOpenChange,
  onQueryChange,
  onSelect,
  triggerClassName = '',
}: SheetSearchProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
    window.requestAnimationFrame(() => inputRef.current?.focus());

    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onOpenChange(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onOpenChange, open]);

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(results.length - 1, 0)));
  }, [results.length]);

  const activateResult = (result: SheetSearchResult) => {
    onSelect(result);
    onOpenChange(false);
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <Tooltip content="Search character (Ctrl+F)" placement="below">
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-label="Search character"
          aria-expanded={open}
          className={`w-8 h-8 items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors ${triggerClassName}`}
        >
          <SearchIcon className="w-4 h-4" />
        </button>
      </Tooltip>

      {open && (
        <div
          role="dialog"
          aria-label="Search character sheets"
          className="fixed left-2 right-2 top-12 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[360px] max-h-[min(70dvh,520px)] overflow-hidden bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme z-50 animate-dropdown-in"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="p-2 border-b border-theme-border">
            <label className="relative block">
              <span className="sr-only">Search character sheets</span>
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                role="searchbox"
                inputMode="search"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    onOpenChange(false);
                  } else if (event.key === 'ArrowDown' && results.length > 0) {
                    event.preventDefault();
                    setActiveIndex((index) => (index + 1) % results.length);
                  } else if (event.key === 'ArrowUp' && results.length > 0) {
                    event.preventDefault();
                    setActiveIndex((index) => (index - 1 + results.length) % results.length);
                  } else if (event.key === 'Enter' && results[activeIndex]) {
                    event.preventDefault();
                    activateResult(results[activeIndex]);
                  }
                }}
                placeholder="Search notes, stats, items..."
                className="w-full h-9 pl-9 pr-9 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-sm text-theme-ink placeholder:text-theme-muted font-body focus:outline-none focus:ring-2 focus:ring-theme-accent"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => onQueryChange('')}
                  aria-label="Clear search"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-theme-muted hover:text-theme-ink"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </label>
          </div>

          <div className="max-h-[min(60dvh,440px)] overflow-y-auto p-1" role="listbox" aria-label="Search results">
            {!query.trim() && (
              <p className="px-3 py-8 text-center text-sm font-body text-theme-muted">Search every sheet in this character</p>
            )}
            {query.trim() && results.length === 0 && (
              <p className="px-3 py-8 text-center text-sm font-body text-theme-muted">No matching widgets</p>
            )}
            {results.map((result, index) => {
              const showSheet = index === 0 || results[index - 1].sheetId !== result.sheetId;
              return (
                <div key={`${result.sheetId}:${result.widgetId}`}>
                  {showSheet && (
                    <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider font-bold font-body text-theme-muted">
                      {result.sheetName}
                    </div>
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => activateResult(result)}
                    className={`w-full px-3 py-2 rounded-button text-left font-body transition-colors ${index === activeIndex ? 'bg-theme-accent text-theme-paper' : 'text-theme-ink hover:bg-theme-accent/15'}`}
                  >
                    <span className="block text-sm font-semibold truncate">{result.widgetLabel}</span>
                    <span className={`block text-xs mt-0.5 truncate ${index === activeIndex ? 'opacity-80' : 'text-theme-muted'}`}>
                      {result.match.context}: {result.match.text}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
          {query.trim() && results.length > 0 && (
            <div className="px-3 py-1.5 border-t border-theme-border text-[11px] font-body text-theme-muted" aria-live="polite">
              {results.length} {results.length === 1 ? 'widget' : 'widgets'} found
            </div>
          )}
        </div>
      )}
    </div>
  );
}