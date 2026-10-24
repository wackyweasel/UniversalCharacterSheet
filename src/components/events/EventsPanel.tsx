import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { useEventsPanelStore } from '../../store/useEventsPanelStore';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import { TUTORIAL_STEPS, useTutorialStore } from '../../store/useTutorialStore';
import type { CharacterEvent } from '../../types';
import { findWidgetSheetId } from '../../events/drafts';
import { describeEffect, describeTrigger, getEventProblems, getTriggerDef } from '../../events/registry';
import { runEventNow, subscribeEventFirings } from '../../events/runtime';
import { getEventTelemetryDetails } from '../../events/telemetry';
import { Tooltip } from '../Tooltip';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BoltIcon,
  CopyIcon,
  DotsVerticalIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  XIcon,
} from '../icons';
import { EventFlow } from './EventFlow';

type Filter = 'all' | 'on' | 'off' | 'problems';

interface PanelItem {
  event: CharacterEvent;
  index: number;
  name: string;
  problems: string[];
  search: string;
}

interface EventsPanelProps {
  onRevealWidget: (sheetId: string, widgetId: string) => void;
}

const SIZE_STORAGE_KEY = 'ucs-events-panel-size';
const DEFAULT_WIDTH = 420;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 220;
const BOTTOM_LAYOUT_QUERY = '(max-width: 639px)';
const HOVER_CLASS = 'variables-hover-target';
const ACCENT_TINT = { background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)' };

const buttonClass = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-button border border-theme-border px-2.5 text-xs font-body text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper disabled:cursor-not-allowed disabled:opacity-40';
const primaryButtonClass = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-button border border-theme-accent bg-theme-accent px-3 text-xs font-bold font-body text-theme-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40';
const iconButtonClass = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-button text-theme-muted transition-colors hover:bg-theme-accent hover:text-theme-paper';
const inputClass = 'h-9 w-full rounded-button border border-theme-border bg-theme-background px-2.5 text-sm font-body text-theme-ink placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-theme-accent/40';
const tutorialTargetClass = 'outline outline-4 outline-blue-500 outline-offset-2';

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

function highlightWidget(widgetId: string | null) {
  document.querySelectorAll(`.${HOVER_CLASS}`).forEach((element) => element.classList.remove(HOVER_CLASS));
  if (!widgetId) return;
  document.querySelectorAll(`[data-widget-id="${CSS.escape(widgetId)}"]`).forEach((element) => element.classList.add(HOVER_CLASS));
}

/** Restarts a one-shot animation class on an event card. */
function animateCard(list: HTMLElement | null, eventId: string, className: string): HTMLElement | null {
  const card = list?.querySelector<HTMLElement>(`[data-event-id="${CSS.escape(eventId)}"]`) ?? null;
  if (!card) return null;
  card.classList.remove(className);
  void card.offsetWidth;
  card.classList.add(className);
  return card;
}

const quoted = (name: string) => (name ? `“${name}”` : 'the event');

export default function EventsPanel({ onRevealWidget }: EventsPanelProps) {
  const isOpen = useEventsPanelStore((state) => state.isOpen);
  const setOpen = useEventsPanelStore((state) => state.setOpen);
  const focusEventId = useEventsPanelStore((state) => state.focusEventId);
  const clearFocus = useEventsPanelStore((state) => state.clearFocus);
  const openEditor = useEventsPanelStore((state) => state.openEditor);
  const character = useStore((state) => state.characters.find((item) => item.id === state.activeCharacterId) ?? null);
  const setEventEnabled = useStore((state) => state.setCharacterEventEnabled);
  const duplicateEvent = useStore((state) => state.duplicateCharacterEvent);
  const moveEvent = useStore((state) => state.moveCharacterEvent);
  const removeEvent = useStore((state) => state.removeCharacterEvent);
  const undo = useStore((state) => state.undo);
  const tutorialStepId = useTutorialStore((state) => (state.tutorialStep !== null ? TUTORIAL_STEPS[state.tutorialStep]?.id : undefined));

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [actionsId, setActionsId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; undoable: boolean } | null>(null);
  const [panelSize, setPanelSize] = useState(loadPanelSize);
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const isBottom = useIsBottomLayout();
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const pendingFocusRef = useRef<string | null>(null);

  const items = useMemo<PanelItem[]>(() => {
    if (!character) return [];
    return (character.events ?? []).map((event, index) => ({
      event,
      index,
      name: event.name?.trim() ?? '',
      problems: getEventProblems(character, event),
      search: [
        event.name ?? '',
        describeTrigger(character, event.trigger),
        ...event.effects.map((effect) => describeEffect(character, effect)),
        event.condition ?? '',
      ].join('\n').toLowerCase(),
    }));
  }, [character]);

  const counts = useMemo(() => ({
    all: items.length,
    on: items.filter((item) => item.event.enabled).length,
    off: items.filter((item) => !item.event.enabled).length,
    problems: items.filter((item) => item.problems.length > 0).length,
  }), [items]);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleItems = useMemo(() => items.filter((item) => {
    if (filter === 'on' && !item.event.enabled) return false;
    if (filter === 'off' && item.event.enabled) return false;
    if (filter === 'problems' && item.problems.length === 0) return false;
    return !normalizedQuery || item.search.includes(normalizedQuery);
  }), [filter, items, normalizedQuery]);

  useEffect(() => {
    if (filter === 'problems' && counts.problems === 0) setFilter('all');
  }, [counts.problems, filter]);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      highlightWidget(null);
      if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    setQuery('');
    setFilter('all');
    setActionsId(null);
    setToast(null);
    pendingFocusRef.current = null;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (actionsId) setActionsId(null);
      else if (query) setQuery('');
      else setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actionsId, isOpen, query, setOpen]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handleResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    return subscribeEventFirings((firings) => {
      const fired = new Set(firings.filter((firing) => !firing.conditionFailed).map((firing) => firing.eventId));
      window.requestAnimationFrame(() => fired.forEach((eventId) => animateCard(listRef.current, eventId, 'event-card--fired')));
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !focusEventId) return;
    pendingFocusRef.current = focusEventId;
    setQuery('');
    setFilter('all');
    clearFocus();
  }, [clearFocus, focusEventId, isOpen]);

  // Reveals a requested card once it's rendered, e.g. right after it's created.
  useEffect(() => {
    const eventId = pendingFocusRef.current;
    if (!eventId) return;
    const card = animateCard(listRef.current, eventId, 'event-card--focus');
    if (!card) return;
    pendingFocusRef.current = null;
    card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  const revealWidget = useCallback((widgetId: string) => {
    if (!character) return;
    const sheetId = findWidgetSheetId(character, widgetId);
    if (!sheetId) return;
    highlightWidget(null);
    onRevealWidget(sheetId, widgetId);
    if (isBottom) setOpen(false);
  }, [character, isBottom, onRevealWidget, setOpen]);

  const getActiveCharacter = () => {
    const state = useStore.getState();
    return state.characters.find((item) => item.id === state.activeCharacterId);
  };

  const handleRun = (item: PanelItem) => {
    const before = getActiveCharacter();
    const result = runEventNow(item.event.id);
    if (!result) return;
    const firing = result.firings.find((entry) => entry.eventId === item.event.id);
    setToast({
      message: firing?.conditionFailed ? `${item.name || 'The event'}: its condition isn't met` : `Ran ${quoted(item.name)}`,
      undoable: getActiveCharacter() !== before,
    });
    recordRun(item.event, !firing?.conditionFailed, result.firings.length - 1);
  };

  const recordRun = (event: CharacterEvent, conditionMet: boolean, chainedEvents: number) => {
    const state = useStore.getState();
    const current = getActiveCharacter();
    if (!current || state.transientCharacterIds.includes(current.id)) return;
    const { widgetType, metadata } = getEventTelemetryDetails(current, event);
    useTelemetryStore.getState().recordEvent({
      eventName: 'event_run',
      category: 'event',
      characterId: current.id,
      sheetId: current.activeSheetId,
      mode: state.mode,
      widgetType,
      source: tutorialStepId === 'events-run-manual' ? 'tutorial' : 'events_panel',
      metadata: { ...metadata, conditionMet, chainedEvents: Math.max(0, chainedEvents) },
    });
  };

  const handleDuplicate = (item: PanelItem) => {
    const id = duplicateEvent(item.event.id);
    setActionsId(null);
    if (id) pendingFocusRef.current = id;
  };

  const handleMove = (item: PanelItem, offset: number) => {
    moveEvent(item.event.id, item.index + offset);
    pendingFocusRef.current = item.event.id;
  };

  const handleDelete = (item: PanelItem) => {
    removeEvent(item.event.id);
    setActionsId(null);
    setToast({ message: `Deleted ${quoted(item.name)}`, undoable: true });
  };

  const maxWidth = Math.max(MIN_WIDTH, Math.round(viewport.w * 0.9));
  const maxHeight = Math.max(MIN_HEIGHT, Math.round(viewport.h * 0.95));
  const effectiveWidth = Math.min(Math.max(panelSize.width, MIN_WIDTH), maxWidth);
  const effectiveHeight = Math.min(Math.max(panelSize.height ?? Math.round(viewport.h * 0.72), MIN_HEIGHT), maxHeight);

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeStartRef.current = { x: event.clientX, y: event.clientY, width: effectiveWidth, height: effectiveHeight };
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
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    try {
      localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(panelSize));
    } catch {
      // Size persistence is best-effort.
    }
  };

  if (!isOpen || !character) return null;

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'on', label: 'On', count: counts.on },
    { id: 'off', label: 'Off', count: counts.off },
    ...(counts.problems > 0 ? [{ id: 'problems' as const, label: 'Needs attention', count: counts.problems }] : []),
  ];
  const showFilters = items.length > 0;

  const renderCard = (item: PanelItem, position: number) => {
    const { event, name, problems } = item;
    const manual = getTriggerDef(event.trigger.kind)?.mode === 'manual';
    const showActions = actionsId === event.id;
    return (
      <article
        key={event.id}
        data-event-id={event.id}
        data-tutorial={position === 0 ? 'event-card' : undefined}
        aria-label={name || 'Unnamed event'}
        className={`event-card p-3 ${event.enabled ? '' : 'event-card--off'} ${problems.length > 0 ? 'event-card--problem' : ''}`}
      >
        <header className="mb-2.5 flex items-center gap-1.5">
          <h3 className="min-w-0 flex-1 truncate font-heading text-sm font-bold text-theme-ink">
            {name || <span className="font-body font-normal italic text-theme-muted">Unnamed event</span>}
          </h3>
          {!event.enabled && <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-theme-muted font-heading">Off</span>}
          <Tooltip content={manual ? 'Run' : 'Run now, whatever the trigger'}>
            <button
              type="button"
              onClick={() => handleRun(item)}
              aria-label={`Run ${name || 'event'}`}
              data-tutorial={manual ? 'event-run-manual' : undefined}
              className={`${manual ? `${primaryButtonClass} h-7 px-2` : iconButtonClass} ${manual && tutorialStepId === 'events-run-manual' ? tutorialTargetClass : ''}`}
            >
              <PlayIcon className="h-3.5 w-3.5" />
              {manual && <span>Run</span>}
            </button>
          </Tooltip>
          <Tooltip content="Edit">
            <button type="button" onClick={() => openEditor({ eventId: event.id })} aria-label={`Edit ${name || 'event'}`} className={iconButtonClass}>
              <PencilIcon className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <Tooltip content={event.enabled ? 'On: turn off' : 'Off: turn on'}>
            <button
              type="button"
              role="switch"
              aria-checked={event.enabled}
              aria-label={`${name || 'Event'} is on`}
              onClick={() => setEventEnabled(event.id, !event.enabled)}
              className="event-switch mx-1"
            />
          </Tooltip>
          <Tooltip content="More actions">
            <button
              type="button"
              onClick={() => setActionsId((current) => (current === event.id ? null : event.id))}
              aria-expanded={showActions}
              aria-label="More actions"
              className={`${iconButtonClass} ${showActions ? '!bg-theme-accent !text-theme-paper' : ''}`}
            >
              <DotsVerticalIcon className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </header>

        <EventFlow character={character} event={event} onRevealWidget={revealWidget} onHoverWidget={highlightWidget} />

        {problems.length > 0 && (
          <ul className="mt-2.5 space-y-0.5 rounded-button border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-600 font-body">
            {problems.map((problem) => <li key={problem}>⚠ {problem}</li>)}
          </ul>
        )}

        {showActions && (
          <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-theme-border pt-2.5 animate-dropdown-in">
            <button type="button" onClick={() => handleDuplicate(item)} className={buttonClass}>
              <CopyIcon className="h-3.5 w-3.5" /> Duplicate
            </button>
            <button type="button" onClick={() => handleMove(item, -1)} disabled={item.index === 0} className={buttonClass}>
              <ArrowUpIcon className="h-3.5 w-3.5" /> Move up
            </button>
            <button type="button" onClick={() => handleMove(item, 1)} disabled={item.index === items.length - 1} className={buttonClass}>
              <ArrowDownIcon className="h-3.5 w-3.5" /> Move down
            </button>
            <button type="button" onClick={() => handleDelete(item)} className={`${buttonClass} text-red-600 hover:!bg-red-600 hover:!text-white`}>
              <TrashIcon className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        )}
      </article>
    );
  };

  return (
    <aside
      id="events-panel"
      data-tutorial="events-panel"
      data-touch-camera-panel="true"
      aria-labelledby="events-title"
      className={`events-panel fixed z-40 flex flex-col overflow-hidden bg-theme-paper text-theme-ink border-theme-border shadow-2xl touch-pan-y ${
        isBottom
          ? 'events-panel--bottom inset-x-0 bottom-0 border-t-[length:var(--border-width)]'
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
        aria-label="Resize events panel"
        onPointerDown={handleResizeStart}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
        className={`absolute z-20 touch-none transition-colors hover:bg-theme-accent/40 active:bg-theme-accent/60 ${
          isBottom ? 'inset-x-0 top-0 h-2 cursor-row-resize' : 'inset-y-0 left-0 w-2 cursor-col-resize'
        }`}
      />

      <div className={`flex flex-shrink-0 justify-between gap-4 px-4 ${showFilters ? '' : 'border-b-[length:var(--border-width)] border-theme-border'} ${isBottom ? 'items-center py-2' : 'items-start py-3'}`}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-button text-theme-accent sm:flex" style={ACCENT_TINT} aria-hidden="true">
            <BoltIcon className="h-5 w-5" />
          </span>
          <h2 id="events-title" className="min-w-0 truncate font-heading text-lg font-bold leading-tight text-theme-ink">Events</h2>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button type="button" data-tutorial="events-new" onClick={() => openEditor()} className={`${primaryButtonClass} h-9 ${tutorialStepId === 'events-new' ? tutorialTargetClass : ''}`}>
            <PlusIcon className="h-4 w-4" /> <span>New event</span>
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-button border border-theme-border text-theme-muted transition-colors hover:bg-theme-accent hover:text-theme-paper"
            aria-label="Close events"
            title="Close events"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className={`flex-shrink-0 space-y-2.5 border-b border-theme-border px-4 ${isBottom ? 'pb-2' : 'pb-3 pt-1'}`}>
          <span className="relative block">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-muted" aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search events, widgets, labels"
              aria-label="Search events"
              className={`${inputClass} pl-8 pr-9 [&::-webkit-search-cancel-button]:appearance-none`}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-theme-muted hover:text-theme-ink">
                <XIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
          <div role="tablist" aria-label="Filter events" className="flex flex-wrap gap-1.5">
            {filters.map((item) => {
              const active = filter === item.id;
              const warning = item.id === 'problems';
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(item.id)}
                  className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-body transition-colors ${
                    active
                      ? warning ? 'border-amber-500 bg-amber-500 text-white' : 'border-theme-accent bg-theme-accent text-theme-paper'
                      : warning ? 'border-amber-500/60 text-amber-500 hover:bg-amber-500/10' : 'border-theme-border text-theme-muted hover:text-theme-ink'
                  }`}
                >
                  {item.label}
                  <span className={`tabular-nums ${active ? 'opacity-80' : 'opacity-60'}`}>{item.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div
        ref={listRef}
        className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
        onMouseLeave={() => highlightWidget(null)}
      >
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 py-12 text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full text-theme-accent" style={ACCENT_TINT} aria-hidden="true">
              <BoltIcon className="h-6 w-6" />
            </span>
            <p className="font-heading text-base font-bold text-theme-ink">No events yet</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-theme-muted font-body">
              Events make your sheet react on its own. For example: when HP drops below half, turn on Bloodied.
            </p>
            <button type="button" onClick={() => openEditor()} className={`${primaryButtonClass} mt-4 h-9`}>
              <PlusIcon className="h-4 w-4" /> New event
            </button>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 py-12 text-center">
            <p className="font-heading text-base font-bold text-theme-ink">No matching events</p>
            <p className="mt-2 text-sm text-theme-muted font-body">Try another search or filter.</p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
              className={`${buttonClass} mt-4`}
            >
              Show all events
            </button>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {visibleItems.map(renderCard)}
            <p className="px-1 pt-1 text-[11px] leading-relaxed text-theme-muted font-body">
              Events run while you play, not while a widget is being edited or on undo. Each one that fires is written in the timeline.
            </p>
          </div>
        )}
      </div>

      {toast && (
        <div className="timeline-toast flex flex-shrink-0 items-center gap-3 border-t border-theme-border bg-theme-accent px-4 py-2.5 text-theme-paper" role="status" aria-live="polite">
          <span className="min-w-0 flex-1 truncate text-sm font-body">{toast.message}</span>
          {toast.undoable && (
            <button
              type="button"
              onClick={() => {
                undo();
                setToast(null);
              }}
              className="h-8 rounded-button border border-current px-3 text-xs font-bold font-body transition-opacity hover:opacity-80"
            >
              Undo
            </button>
          )}
          <button type="button" onClick={() => setToast(null)} className="flex h-8 w-8 items-center justify-center rounded-button transition-opacity hover:opacity-80" aria-label="Dismiss message">
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </aside>
  );
}
