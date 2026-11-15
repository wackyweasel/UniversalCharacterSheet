import { useEffect, useRef, useState } from 'react';
import { SquarePlus } from 'lucide-react';
import { useAutomationsPanelStore, type AutomationsTab } from '../store/useAutomationsPanelStore';
import { useStore } from '../store/useStore';
import { BoltIcon, FunctionIcon, TagIcon, XIcon } from './icons';
import VariablesPanel from './VariablesPanel';
import EventsPanel from './events/EventsPanel';
import EffectsPanel from './EffectsPanel';
import FormulasPanel from './FormulasPanel';

const SIZE_STORAGE_KEY = 'ucs-automations-panel-size';
const MIN_WIDTH = 320;
const MIN_HEIGHT = 220;
const BOTTOM_LAYOUT_QUERY = '(max-width: 639px)';
const tabs: { id: AutomationsTab; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
  { id: 'effects', label: 'Effects', icon: SquarePlus },
  { id: 'labels', label: 'Labels', icon: TagIcon },
  { id: 'formulas', label: 'Formulas', icon: FunctionIcon },
  { id: 'events', label: 'Events', icon: BoltIcon },
];

function loadPanelSize(): { width: number; height: number | null } {
  try {
    const data = JSON.parse(localStorage.getItem(SIZE_STORAGE_KEY) || localStorage.getItem('ucs-events-panel-size') || localStorage.getItem('ucs-variables-panel-size') || '{}');
    return {
      width: typeof data.width === 'number' && Number.isFinite(data.width) ? data.width : 420,
      height: typeof data.height === 'number' && Number.isFinite(data.height) ? data.height : null,
    };
  } catch {
    return { width: 420, height: null };
  }
}

interface Props {
  onRevealWidget: (sheetId: string, widgetId: string) => void;
}

export default function AutomationsPanel({ onRevealWidget }: Props) {
  const tab = useAutomationsPanelStore((state) => state.tab);
  const openTab = useAutomationsPanelStore((state) => state.openTab);
  const setOpen = useAutomationsPanelStore((state) => state.setOpen);
  const characterId = useStore((state) => state.activeCharacterId);
  const [panelSize, setPanelSize] = useState(loadPanelSize);
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const [isBottom, setIsBottom] = useState(() => window.matchMedia(BOTTOM_LAYOUT_QUERY).matches);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const tabListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = window.matchMedia(BOTTOM_LAYOUT_QUERY);
    const updateLayout = () => setIsBottom(query.matches);
    const updateViewport = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    query.addEventListener('change', updateLayout);
    window.addEventListener('resize', updateViewport);
    return () => {
      query.removeEventListener('change', updateLayout);
      window.removeEventListener('resize', updateViewport);
    };
  }, []);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => tabListRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('[role="dialog"]')) return;
      event.preventDefault();
      setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [setOpen]);

  const maxWidth = Math.max(MIN_WIDTH, Math.round(viewport.w * 0.9));
  const maxHeight = Math.max(MIN_HEIGHT, Math.round(viewport.h * 0.95));
  const width = Math.min(Math.max(panelSize.width, MIN_WIDTH), maxWidth);
  const height = Math.min(Math.max(panelSize.height ?? Math.round(viewport.h * 0.72), MIN_HEIGHT), maxHeight);
  const compactTabs = (isBottom ? viewport.w : width) < 380;

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

  return (
    <aside
      id="automations-panel"
      aria-labelledby="automations-title"
      data-touch-camera-panel="true"
      className={`variables-panel fixed z-40 flex flex-col overflow-hidden border-theme-border bg-theme-paper text-theme-ink shadow-2xl touch-pan-y ${
        isBottom ? 'variables-panel--bottom inset-x-0 bottom-0 border-t-[length:var(--border-width)]' : 'right-0 top-0 bottom-0 border-l-[length:var(--border-width)]'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', ...(isBottom ? { height } : { width }) }}
    >
      <div
        role="separator"
        aria-label="Resize automations panel"
        aria-orientation={isBottom ? 'horizontal' : 'vertical'}
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          resizeStartRef.current = { x: event.clientX, y: event.clientY, width, height };
        }}
        onPointerMove={(event) => {
          const start = resizeStartRef.current;
          if (!start) return;
          if (isBottom) setPanelSize((size) => ({ ...size, height: Math.min(Math.max(start.height + start.y - event.clientY, MIN_HEIGHT), maxHeight) }));
          else setPanelSize((size) => ({ ...size, width: Math.min(Math.max(start.width + event.clientX - start.x, MIN_WIDTH), maxWidth) }));
        }}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
        className={`absolute z-20 touch-none transition-colors hover:bg-theme-accent/40 active:bg-theme-accent/60 ${
          isBottom ? 'inset-x-0 top-0 h-2 cursor-row-resize' : 'inset-y-0 left-0 w-2 cursor-col-resize'
        }`}
      />
      <header className="flex shrink-0 items-center justify-between gap-3 px-3 py-1.5 sm:px-4 sm:py-3">
        <h2 id="automations-title" className="flex min-w-0 items-center gap-2 font-heading text-base font-bold sm:text-lg">
          <BoltIcon className="h-4 w-4 shrink-0 text-theme-accent sm:h-5 sm:w-5" /> Automations
        </h2>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close automations" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-button border border-theme-border text-theme-muted transition-colors hover:bg-theme-accent hover:text-theme-paper sm:h-9 sm:w-9">
          <XIcon className="h-4 w-4" />
        </button>
      </header>
      <div ref={tabListRef} role="tablist" aria-label="Automations" className="flex shrink-0 border-b border-theme-border px-2">
        {tabs.map((item, index) => (
          <button
            key={item.id}
            id={`automations-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            aria-controls={`automations-content-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => openTab(item.id)}
            onKeyDown={(event) => {
              let next: number | undefined;
              if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
              if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
              if (event.key === 'Home') next = 0;
              if (event.key === 'End') next = tabs.length - 1;
              if (next === undefined) return;
              event.preventDefault();
              openTab(tabs[next].id);
              tabListRef.current?.querySelector<HTMLElement>(`#automations-tab-${tabs[next].id}`)?.focus();
            }}
            className={`flex min-w-0 flex-1 items-center justify-center border-b-2 px-1 py-2 font-body font-semibold transition-colors ${compactTabs ? isBottom ? 'gap-1 text-xs' : 'flex-col gap-0.5 text-xs' : 'gap-1.5 text-sm'} ${
              tab === item.id ? 'border-theme-accent text-theme-accent' : 'border-transparent text-theme-muted hover:text-theme-ink'
            }`}
          >
            <item.icon aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 ${compactTabs && isBottom ? 'hidden' : ''}`} />
            {item.label}
          </button>
        ))}
      </div>
      <div key={`${characterId}:${tab}`} id={`automations-content-${tab}`} role="tabpanel" aria-labelledby={`automations-tab-${tab}`} className="flex min-h-0 flex-1 flex-col" tabIndex={0}>
        {tab === 'labels' && <VariablesPanel onRevealWidget={onRevealWidget} isBottom={isBottom} />}
        {tab === 'formulas' && <FormulasPanel onRevealWidget={onRevealWidget} isBottom={isBottom} />}
        {tab === 'events' && <EventsPanel onRevealWidget={onRevealWidget} isBottom={isBottom} />}
        {tab === 'effects' && <EffectsPanel onRevealWidget={onRevealWidget} isBottom={isBottom} />}
      </div>
    </aside>
  );
}
