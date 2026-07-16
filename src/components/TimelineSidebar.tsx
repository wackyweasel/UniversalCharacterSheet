import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTimelineStore, useCurrentCharacterEvents, TimelineEvent } from '../store/useTimelineStore';
import { useStore } from '../store/useStore';
import { Tooltip } from './Tooltip';
import { XIcon } from './icons';

function formatClockTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDayHeading(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (eventDay.getTime() === today.getTime()) return 'Today';
  if (eventDay.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    year: eventDay.getFullYear() === now.getFullYear() ? undefined : 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function EventItem({ event, onDelete }: { event: TimelineEvent; onDelete: (event: TimelineEvent) => void }) {
  return (
    <article
      role="listitem"
      className="group grid grid-cols-[2rem_minmax(0,1fr)_2rem] gap-2.5 px-4 py-3 border-b border-theme-border last:border-b-0"
    >
      <span
        className="w-8 h-8 flex items-center justify-center self-start border border-theme-border rounded-button bg-theme-background text-base leading-none"
        aria-hidden="true"
      >
        {event.icon === 'fx'
          ? <span className="italic font-semibold text-xs text-theme-ink">fx</span>
          : event.icon}
      </span>
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="font-bold text-sm text-theme-ink font-heading truncate">
            {event.widgetLabel || event.widgetType}
          </h4>
          <time
            dateTime={new Date(event.timestamp).toISOString()}
            title={new Date(event.timestamp).toLocaleString()}
            className="text-[11px] text-theme-muted font-body flex-shrink-0 tabular-nums"
          >
            {formatClockTime(event.timestamp)}
          </time>
        </div>
        <p className="mt-0.5 text-sm text-theme-ink font-body leading-snug break-words">
          {event.description}
        </p>
      </div>
      <Tooltip content="Delete event">
        <button
          type="button"
          onClick={() => onDelete(event)}
          onMouseDown={(e) => e.stopPropagation()}
          className="self-start w-8 h-8 flex items-center justify-center rounded-button text-theme-muted hover:text-white hover:bg-red-500 transition-colors"
          aria-label={`Delete ${event.widgetLabel || event.widgetType} event`}
        >
          <XIcon className="w-3.5 h-3.5" />
        </button>
      </Tooltip>
    </article>
  );
}

interface EventGroup {
  key: string;
  label: string;
  events: TimelineEvent[];
}

interface UndoState {
  events: TimelineEvent[];
  message: string;
}

export default function TimelineSidebar() {
  const isOpen = useTimelineStore((s) => s.isOpen);
  const events = useCurrentCharacterEvents();
  const orderNewestFirst = useTimelineStore((s) => s.orderNewestFirst);
  const toggleOrder = useTimelineStore((s) => s.toggleOrder);
  const showFormulas = useTimelineStore((s) => s.showFormulas);
  const toggleShowFormulas = useTimelineStore((s) => s.toggleShowFormulas);
  const clearEvents = useTimelineStore((s) => s.clearEvents);
  const removeEvent = useTimelineStore((s) => s.removeEvent);
  const restoreEvents = useTimelineStore((s) => s.restoreEvents);
  const setOpen = useTimelineStore((s) => s.setOpen);
  const activeCharacterId = useStore((s) => s.activeCharacterId);
  const activeCharacterName = useStore((s) => (
    s.characters.find((character) => character.id === s.activeCharacterId)?.name || 'this character'
  ));
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [isAtLatest, setIsAtLatest] = useState(true);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const eventsListRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const previousEventCountRef = useRef(events.length);

  const formulaEventCount = useMemo(
    () => events.filter((event) => event.widgetType === 'FORMULA').length,
    [events],
  );

  const filteredEvents = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    return events.filter((event) => {
      if (!showFormulas && event.widgetType === 'FORMULA') return false;
      if (!normalizedQuery) return true;
      return `${event.widgetLabel} ${event.widgetType} ${event.description}`
        .toLocaleLowerCase()
        .includes(normalizedQuery);
    });
  }, [events, searchQuery, showFormulas]);

  const displayedEvents = useMemo(
    () => orderNewestFirst ? [...filteredEvents].reverse() : filteredEvents,
    [filteredEvents, orderNewestFirst],
  );

  const eventGroups = useMemo(() => displayedEvents.reduce<EventGroup[]>((groups, event) => {
    const key = getDayKey(event.timestamp);
    const currentGroup = groups[groups.length - 1];
    if (currentGroup?.key === key) {
      currentGroup.events.push(event);
    } else {
      groups.push({ key, label: formatDayHeading(event.timestamp), events: [event] });
    }
    return groups;
  }, []), [displayedEvents]);

  const filtersActive = Boolean(searchQuery.trim()) || (!showFormulas && formulaEventCount > 0);

  const scrollToLatest = useCallback(() => {
    const list = eventsListRef.current;
    if (!list) return;
    list.scrollTop = orderNewestFirst ? 0 : list.scrollHeight;
    setIsAtLatest(true);
  }, [orderNewestFirst]);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(focusFrame);
      if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (confirmingClear) {
        setConfirmingClear(false);
      } else {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmingClear, isOpen, setOpen]);

  useEffect(() => {
    if (isOpen) return;
    setSearchQuery('');
    setConfirmingClear(false);
    setUndoState(null);
  }, [isOpen]);

  useEffect(() => {
    if (!undoState) return;
    const timer = window.setTimeout(() => setUndoState(null), 7000);
    return () => window.clearTimeout(timer);
  }, [undoState]);

  useEffect(() => {
    if (!isOpen || displayedEvents.length === 0) return;
    setIsAtLatest(true);
    const frame = window.requestAnimationFrame(scrollToLatest);
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, orderNewestFirst, scrollToLatest]);

  useEffect(() => {
    const previousCount = previousEventCountRef.current;
    const eventWasAdded = events.length > previousCount;
    previousEventCountRef.current = events.length;
    if (!isOpen || !eventWasAdded || !isAtLatest) return;
    const frame = window.requestAnimationFrame(scrollToLatest);
    return () => window.cancelAnimationFrame(frame);
  }, [events.length, isAtLatest, isOpen, scrollToLatest]);

  const handleEventsScroll = useCallback(() => {
    const list = eventsListRef.current;
    if (!list) return;
    const distanceFromLatest = orderNewestFirst
      ? list.scrollTop
      : list.scrollHeight - list.clientHeight - list.scrollTop;
    setIsAtLatest(distanceFromLatest < 48);
  }, [orderNewestFirst]);

  const handleDeleteEvent = useCallback((event: TimelineEvent) => {
    if (!activeCharacterId) return;
    removeEvent(activeCharacterId, event.id);
    setUndoState({ events: [event], message: 'Event deleted' });
  }, [activeCharacterId, removeEvent]);

  const handleClearEvents = () => {
    if (!activeCharacterId || events.length === 0) return;
    const removedEvents = [...events];
    clearEvents(activeCharacterId);
    setConfirmingClear(false);
    setSearchQuery('');
    setUndoState({
      events: removedEvents,
      message: `${removedEvents.length} ${removedEvents.length === 1 ? 'event' : 'events'} cleared`,
    });
  };

  const handleUndo = () => {
    if (!activeCharacterId || !undoState) return;
    restoreEvents(activeCharacterId, undoState.events);
    setUndoState(null);
  };

  const resetFilters = () => {
    setSearchQuery('');
    if (!showFormulas) toggleShowFormulas();
  };

  if (!isOpen) return null;

  return (
    <aside
      id="timeline-panel"
      data-tutorial="timeline-panel"
      aria-labelledby="timeline-title"
      aria-describedby="timeline-summary"
      className="fixed inset-x-0 bottom-0 h-[72dvh] sm:inset-x-auto sm:right-0 sm:top-0 sm:bottom-0 sm:h-auto sm:w-[390px] z-40 flex flex-col overflow-hidden bg-theme-paper text-theme-ink border-t-[length:var(--border-width)] sm:border-t-0 sm:border-l-[length:var(--border-width)] border-theme-border shadow-2xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-4 py-3 border-b-[length:var(--border-width)] border-theme-border flex-shrink-0">
        <div className="min-w-0">
          <h2 id="timeline-title" className="font-bold text-lg leading-tight text-theme-ink font-heading">Timeline</h2>
          <p id="timeline-summary" className="mt-0.5 text-xs text-theme-muted font-body truncate">
            {events.length === 0
              ? `No activity recorded for ${activeCharacterName}`
              : `${events.length} ${events.length === 1 ? 'event' : 'events'} recorded for ${activeCharacterName}`}
          </p>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={() => setOpen(false)}
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center border border-theme-border rounded-button text-theme-muted hover:text-theme-paper hover:bg-theme-accent transition-colors"
          aria-label="Close timeline"
          title="Close timeline"
        >
          <XIcon className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Controls */}
      {events.length > 0 && (
        <div className="px-4 py-3 border-b border-theme-border flex-shrink-0 space-y-2.5">
          <div>
            <label htmlFor="timeline-search" className="sr-only">Search timeline events</label>
            <span className="relative block">
              <input
                id="timeline-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search events"
                className="w-full h-9 pl-3 pr-9 bg-theme-background border border-theme-border rounded-button text-sm text-theme-ink placeholder:text-theme-muted font-body [&::-webkit-search-cancel-button]:appearance-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear timeline search"
                  className="absolute right-0 top-0 w-9 h-9 flex items-center justify-center text-theme-muted hover:text-theme-ink"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <label className="flex items-center gap-2 min-w-0 text-xs text-theme-muted font-body">
              <span className="flex-shrink-0">Order</span>
              <select
                value={orderNewestFirst ? 'newest' : 'oldest'}
                onChange={(event) => {
                  const nextNewestFirst = event.target.value === 'newest';
                  if (nextNewestFirst !== orderNewestFirst) toggleOrder();
                }}
                aria-label="Timeline event order"
                className="h-8 min-w-0 bg-theme-background border border-theme-border rounded-button px-2 text-xs text-theme-ink font-body"
              >
                <option value="oldest">Oldest first</option>
                <option value="newest">Newest first</option>
              </select>
            </label>

            {formulaEventCount > 0 && (
              <label className="h-8 flex items-center gap-1.5 px-2 border border-theme-border rounded-button text-xs text-theme-ink font-body whitespace-nowrap cursor-pointer">
                <input
                  type="checkbox"
                  checked={showFormulas}
                  onChange={toggleShowFormulas}
                  style={{ accentColor: 'var(--color-accent)' }}
                />
                Formulas
              </label>
            )}

            <button
              type="button"
              onClick={() => setConfirmingClear(true)}
              className="h-8 ml-auto px-2 text-xs text-theme-muted font-body hover:text-red-500 transition-colors whitespace-nowrap"
            >
              Clear all…
            </button>
          </div>

          {filtersActive && (
            <p className="text-xs text-theme-muted font-body" role="status">
              Showing {displayedEvents.length} of {events.length} events
            </p>
          )}
        </div>
      )}

      {confirmingClear && events.length > 0 && (
        <div className="m-3 mb-0 p-3 border border-red-500 bg-theme-paper flex-shrink-0" role="alert">
          <p className="text-sm font-bold text-theme-ink font-heading">
            Clear all {events.length} {events.length === 1 ? 'event' : 'events'}?
          </p>
          <p className="mt-1 text-xs text-theme-muted font-body">You can undo this immediately afterward.</p>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              type="button"
              onClick={() => setConfirmingClear(false)}
              className="h-8 px-3 text-xs text-theme-ink font-body border border-theme-border rounded-button hover:bg-theme-accent hover:text-theme-paper transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleClearEvents}
              className="h-8 px-3 text-xs text-white font-body bg-red-500 border border-red-500 rounded-button hover:bg-red-600 transition-colors"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Events */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={eventsListRef}
          role="log"
          aria-label="Character activity"
          aria-live="polite"
          aria-relevant="additions"
          onScroll={handleEventsScroll}
          className="h-full overflow-y-auto overflow-x-hidden overscroll-contain"
        >
          {events.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-8 py-12 text-center">
              <p className="font-bold text-base text-theme-ink font-heading">Nothing recorded yet</p>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-theme-muted font-body">
                Roll dice, change a tracker, or use another interactive widget in Play. Activity will appear here automatically.
              </p>
            </div>
          ) : displayedEvents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-8 py-12 text-center">
              <p className="font-bold text-base text-theme-ink font-heading">No matching events</p>
              <p className="mt-2 text-sm text-theme-muted font-body">Try another search or reset the filters.</p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 h-9 px-3 border border-theme-border rounded-button text-sm text-theme-ink font-body hover:bg-theme-accent hover:text-theme-paper transition-colors"
              >
                Reset filters
              </button>
            </div>
          ) : (
            eventGroups.map((group) => (
              <section key={group.key} aria-labelledby={`timeline-day-${group.key}`}>
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-2 bg-theme-paper border-b border-theme-border">
                  <h3
                    id={`timeline-day-${group.key}`}
                    className="text-[11px] font-bold uppercase tracking-widest text-theme-muted font-heading"
                  >
                    {group.label}
                  </h3>
                  <span className="text-[11px] text-theme-muted font-body">
                    {group.events.length} {group.events.length === 1 ? 'event' : 'events'}
                  </span>
                </div>
                <div role="list">
                  {group.events.map((event) => (
                    <EventItem key={event.id} event={event} onDelete={handleDeleteEvent} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        {!isAtLatest && displayedEvents.length > 0 && (
          <button
            type="button"
            onClick={scrollToLatest}
            className="absolute left-1/2 -translate-x-1/2 bottom-3 h-9 px-3 bg-theme-accent text-theme-paper border border-theme-border rounded-button shadow-lg text-xs font-bold font-body whitespace-nowrap"
          >
            Jump to latest
          </button>
        )}
      </div>

      {undoState && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-theme-accent text-theme-paper border-t border-theme-border flex-shrink-0" role="status" aria-live="polite">
          <span className="flex-1 min-w-0 text-sm font-body truncate">{undoState.message}</span>
          <button
            type="button"
            onClick={handleUndo}
            className="h-8 px-3 border border-current rounded-button text-xs font-bold font-body hover:opacity-80 transition-opacity"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => setUndoState(null)}
            className="w-8 h-8 flex items-center justify-center rounded-button hover:opacity-80 transition-opacity"
            aria-label="Dismiss undo message"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </aside>
  );
}
