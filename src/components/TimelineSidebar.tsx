import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  getTimelineDayKey,
  useTimelineStore,
  useCurrentCharacterEvents,
  TimelineEvent,
} from '../store/useTimelineStore';
import { useStore } from '../store/useStore';
import { Tooltip } from './Tooltip';
import { ArrowDownIcon, ArrowUpIcon, MenuIcon, MessageIcon, TrashIcon, XIcon } from './icons';

function formatClockTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
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

const SIZE_STORAGE_KEY = 'ucs-timeline-panel-size';
const DEFAULT_WIDTH = 390;
const MIN_WIDTH = 300;
const MIN_HEIGHT = 180;
const BOTTOM_LAYOUT_QUERY = '(max-width: 639px)';

function loadPanelSize(): { width: number; height: number | null } {
  try {
    const data = JSON.parse(localStorage.getItem(SIZE_STORAGE_KEY) || '{}');
    return {
      width: typeof data.width === 'number' ? data.width : DEFAULT_WIDTH,
      height: typeof data.height === 'number' ? data.height : null,
    };
  } catch {
    return { width: DEFAULT_WIDTH, height: null };
  }
}

interface MenuToggleRowProps {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onToggle: () => void;
  title?: string;
}

function MenuToggleRow({ icon, label, checked, onToggle, title }: MenuToggleRowProps) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      title={title}
      onClick={onToggle}
      className="w-full h-9 flex items-center justify-between gap-3 px-3 text-left hover:bg-theme-accent/15 transition-colors"
    >
      <span className="flex min-w-0 items-center gap-2.5 text-sm font-body text-theme-ink">
        <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center" aria-hidden="true">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full border border-theme-border transition-colors ${checked ? 'bg-theme-accent' : 'bg-theme-background'}`}
      >
        <span className={`absolute left-0 top-0.5 h-4 w-4 rounded-full border border-black/25 bg-white shadow-sm transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-1'}`} />
      </span>
    </button>
  );
}

interface TimelineMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showToasts: boolean;
  onToggleToasts: () => void;
  formulaEventCount: number;
  showFormulas: boolean;
  onToggleFormulas: () => void;
  orderNewestFirst: boolean;
  onSetNewestFirst: (newestFirst: boolean) => void;
  canClear: boolean;
  onClear: () => void;
}

function TimelineMenu({
  open,
  onOpenChange,
  showToasts,
  onToggleToasts,
  formulaEventCount,
  showFormulas,
  onToggleFormulas,
  orderNewestFirst,
  onSetNewestFirst,
  canClear,
  onClear,
}: TimelineMenuProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);

  // Portaled so the panel's overflow clipping cannot cut the menu off.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, onOpenChange]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Timeline options"
        className={`w-9 h-9 flex-shrink-0 flex items-center justify-center border border-theme-border rounded-button transition-colors ${
          open ? 'bg-theme-accent text-theme-paper' : 'text-theme-muted hover:text-theme-paper hover:bg-theme-accent'
        }`}
      >
        <MenuIcon className="w-4.5 h-4.5" />
      </button>
      {open && position && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label="Timeline options"
          data-touch-camera-ignore="true"
          className="fixed z-[60] w-64 py-1 bg-theme-paper text-theme-ink border-[length:var(--border-width)] border-theme-border rounded-button shadow-2xl animate-dropdown-in"
          style={{ top: position.top, right: position.right }}
        >
          <MenuToggleRow
            icon={<MessageIcon className="h-4 w-4" />}
            label="Live pop-ups"
            checked={showToasts}
            onToggle={onToggleToasts}
            title="Briefly show new events in the bottom right corner while this panel is closed"
          />
          {formulaEventCount > 0 && (
            <MenuToggleRow
              icon={<span className="italic font-semibold text-xs">fx</span>}
              label="Formula updates"
              checked={showFormulas}
              onToggle={onToggleFormulas}
              title="Show events logged when a formula's value changes"
            />
          )}
          <div role="group" aria-label="Event order" className="grid grid-cols-2 gap-1 px-2 py-1">
            {([
              { newestFirst: false, label: 'Oldest first', icon: <ArrowDownIcon className="h-4 w-4" /> },
              { newestFirst: true, label: 'Newest first', icon: <ArrowUpIcon className="h-4 w-4" /> },
            ]).map(({ newestFirst, label, icon }) => (
              <button
                key={label}
                type="button"
                aria-pressed={orderNewestFirst === newestFirst}
                onClick={() => onSetNewestFirst(newestFirst)}
                className={`flex h-8 items-center justify-center gap-1.5 rounded-button text-xs font-body transition-colors ${
                  orderNewestFirst === newestFirst ? 'bg-theme-ink text-theme-paper' : 'bg-theme-background text-theme-ink hover:bg-theme-accent/20'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
          <div role="separator" className="my-1 border-t border-theme-border" />
          <button
            type="button"
            role="menuitem"
            disabled={!canClear}
            onClick={() => { onOpenChange(false); onClear(); }}
            className="w-full h-9 flex items-center gap-2.5 px-3 text-left text-sm font-body text-theme-ink transition-colors disabled:opacity-40 enabled:hover:bg-red-500 enabled:hover:text-white"
          >
            <TrashIcon className="h-4 w-4 flex-shrink-0" />
            Clear all events…
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}

function useIsBottomLayout(): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(BOTTOM_LAYOUT_QUERY).matches);
  useEffect(() => {
    const query = window.matchMedia(BOTTOM_LAYOUT_QUERY);
    const update = () => setMatches(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return matches;
}

export default function TimelineSidebar() {
  const isOpen = useTimelineStore((s) => s.isOpen);
  const events = useCurrentCharacterEvents();
  const orderNewestFirst = useTimelineStore((s) => s.orderNewestFirst);
  const toggleOrder = useTimelineStore((s) => s.toggleOrder);
  const showFormulas = useTimelineStore((s) => s.showFormulas);
  const toggleShowFormulas = useTimelineStore((s) => s.toggleShowFormulas);
  const showToasts = useTimelineStore((s) => s.showToasts);
  const toggleShowToasts = useTimelineStore((s) => s.toggleShowToasts);
  const clearEvents = useTimelineStore((s) => s.clearEvents);
  const clearEventsForDay = useTimelineStore((s) => s.clearEventsForDay);
  const removeEvent = useTimelineStore((s) => s.removeEvent);
  const restoreEvents = useTimelineStore((s) => s.restoreEvents);
  const setOpen = useTimelineStore((s) => s.setOpen);
  const activeCharacterId = useStore((s) => s.activeCharacterId);
  const activeCharacterName = useStore((s) => (
    s.characters.find((character) => character.id === s.activeCharacterId)?.name || 'this character'
  ));
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [confirmingClearDay, setConfirmingClearDay] = useState<string | null>(null);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [isAtLatest, setIsAtLatest] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const isBottom = useIsBottomLayout();
  const [panelSize, setPanelSize] = useState(loadPanelSize);
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
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
    const key = getTimelineDayKey(event.timestamp);
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
      if (menuOpen) {
        setMenuOpen(false);
      } else if (confirmingClear) {
        setConfirmingClear(false);
      } else if (confirmingClearDay) {
        setConfirmingClearDay(null);
      } else {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmingClear, confirmingClearDay, isOpen, menuOpen, setOpen]);

  useEffect(() => {
    if (isOpen) return;
    setSearchQuery('');
    setMenuOpen(false);
    setConfirmingClear(false);
    setConfirmingClearDay(null);
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
    setConfirmingClearDay(null);
    setSearchQuery('');
    setUndoState({
      events: removedEvents,
      message: `${removedEvents.length} ${removedEvents.length === 1 ? 'event' : 'events'} cleared`,
    });
  };

  const handleClearDay = useCallback((dayKey: string, dayLabel: string) => {
    if (!activeCharacterId) return;
    const removedEvents = events.filter((event) => getTimelineDayKey(event.timestamp) === dayKey);
    if (removedEvents.length === 0) {
      setConfirmingClearDay(null);
      return;
    }

    clearEventsForDay(activeCharacterId, dayKey);
    setConfirmingClearDay(null);
    setUndoState({
      events: removedEvents,
      message: `${removedEvents.length} ${removedEvents.length === 1 ? 'event' : 'events'} from ${dayLabel} cleared`,
    });
  }, [activeCharacterId, clearEventsForDay, events]);

  const handleUndo = () => {
    if (!activeCharacterId || !undoState) return;
    restoreEvents(activeCharacterId, undoState.events);
    setUndoState(null);
  };

  useEffect(() => {
    const handleResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxWidth = Math.max(MIN_WIDTH, Math.round(viewport.w * 0.9));
  const maxHeight = Math.max(MIN_HEIGHT, Math.round(viewport.h * 0.95));
  const effectiveWidth = Math.min(Math.max(panelSize.width, MIN_WIDTH), maxWidth);
  const effectiveHeight = Math.min(
    Math.max(panelSize.height ?? Math.round(viewport.h * 0.72), MIN_HEIGHT),
    maxHeight,
  );

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      width: effectiveWidth,
      height: effectiveHeight,
    };
  };

  const handleResizeMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = resizeStartRef.current;
    if (!start) return;
    if (isBottom) {
      const height = Math.min(Math.max(start.height + (start.y - event.clientY), MIN_HEIGHT), maxHeight);
      setPanelSize((size) => ({ ...size, height }));
    } else {
      const width = Math.min(Math.max(start.width + (start.x - event.clientX), MIN_WIDTH), maxWidth);
      setPanelSize((size) => ({ ...size, width }));
    }
  };

  const handleResizeEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeStartRef.current) return;
    resizeStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    try {
      localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(panelSize));
    } catch {
      // Size persistence is best-effort.
    }
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
      data-touch-camera-panel="true"
      aria-labelledby="timeline-title"
      aria-describedby={isBottom ? undefined : 'timeline-summary'}
      className={`fixed z-40 flex flex-col overflow-hidden bg-theme-paper text-theme-ink border-theme-border shadow-2xl touch-pan-y ${
        isBottom
          ? 'inset-x-0 bottom-0 border-t-[length:var(--border-width)]'
          : 'right-0 top-0 bottom-0 border-l-[length:var(--border-width)]'
      }`}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        ...(isBottom ? { height: effectiveHeight } : { width: effectiveWidth }),
      }}
    >
      <div
        role="separator"
        aria-orientation={isBottom ? 'horizontal' : 'vertical'}
        aria-label="Resize timeline"
        onPointerDown={handleResizeStart}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
        className={`absolute z-20 touch-none hover:bg-theme-accent/40 active:bg-theme-accent/60 transition-colors ${
          isBottom ? 'top-0 inset-x-0 h-2 cursor-row-resize' : 'left-0 inset-y-0 w-2 cursor-col-resize'
        }`}
      />

      {/* Header */}
      <div className={`flex justify-between gap-4 px-4 border-b-[length:var(--border-width)] border-theme-border flex-shrink-0 ${isBottom ? 'py-2 items-center' : 'py-3 items-start'}`}>
        <div className="min-w-0">
          <h2 id="timeline-title" className="font-bold text-lg leading-tight text-theme-ink font-heading">Timeline</h2>
          {!isBottom && (
            <p id="timeline-summary" className="mt-0.5 text-xs text-theme-muted font-body truncate">
              {events.length === 0
                ? `No activity recorded for ${activeCharacterName}`
                : `${events.length} ${events.length === 1 ? 'event' : 'events'} recorded for ${activeCharacterName}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <TimelineMenu
            open={menuOpen}
            onOpenChange={setMenuOpen}
            showToasts={showToasts}
            onToggleToasts={toggleShowToasts}
            formulaEventCount={formulaEventCount}
            showFormulas={showFormulas}
            onToggleFormulas={toggleShowFormulas}
            orderNewestFirst={orderNewestFirst}
            onSetNewestFirst={(newestFirst) => {
              if (newestFirst !== orderNewestFirst) toggleOrder();
            }}
            canClear={events.length > 0}
            onClear={() => {
              setConfirmingClearDay(null);
              setConfirmingClear(true);
            }}
          />
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
      </div>

      {/* Controls */}
      {events.length > 0 && (
        <div className={`px-4 border-b border-theme-border flex-shrink-0 ${isBottom ? 'py-2' : 'py-3 space-y-2.5'}`}>
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

          {filtersActive && !isBottom && (
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
            eventGroups.map((group) => {
              const dayEventCount = events.filter(
                (event) => getTimelineDayKey(event.timestamp) === group.key,
              ).length;

              return (
                <section key={group.key} aria-labelledby={`timeline-day-${group.key}`}>
                  <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-2 bg-theme-paper border-b border-theme-border">
                    <h3
                      id={`timeline-day-${group.key}`}
                      className="text-[11px] font-bold uppercase tracking-widest text-theme-muted font-heading"
                    >
                      {group.label}
                    </h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] text-theme-muted font-body">
                        {group.events.length} {group.events.length === 1 ? 'event' : 'events'}
                      </span>
                      <Tooltip content={`Delete all events from ${group.label}`}>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmingClear(false);
                            setConfirmingClearDay((currentDay) => (
                              currentDay === group.key ? null : group.key
                            ));
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-button text-theme-muted hover:text-white hover:bg-red-500 transition-colors"
                          aria-label={`Delete all events from ${group.label}`}
                          title={`Delete all events from ${group.label}`}
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                  {confirmingClearDay === group.key && (
                    <div className="px-4 py-2 border-b border-red-500 bg-theme-paper" role="alert">
                      <p className="text-xs font-bold text-theme-ink font-heading">
                        Delete all {dayEventCount} {dayEventCount === 1 ? 'event' : 'events'} from {group.label}?
                      </p>
                      <p className="mt-1 text-xs text-theme-muted font-body">You can undo this immediately afterward.</p>
                      <div className="flex items-center justify-end gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setConfirmingClearDay(null)}
                          className="h-8 px-3 text-xs text-theme-ink font-body border border-theme-border rounded-button hover:bg-theme-accent hover:text-theme-paper transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClearDay(group.key, group.label)}
                          className="h-8 px-3 text-xs text-white font-body bg-red-500 border border-red-500 rounded-button hover:bg-red-600 transition-colors"
                        >
                          Delete all
                        </button>
                      </div>
                    </div>
                  )}
                  <div role="list">
                    {group.events.map((event) => (
                      <EventItem key={event.id} event={event} onDelete={handleDeleteEvent} />
                    ))}
                  </div>
                </section>
              );
            })
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
