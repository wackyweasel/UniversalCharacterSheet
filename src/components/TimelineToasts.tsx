import { useEffect, useRef, useState } from 'react';
import { useTimelineStore, useCurrentCharacterEvents, TimelineEvent } from '../store/useTimelineStore';
import { useStore } from '../store/useStore';

const MAX_VISIBLE = 3;
const VISIBLE_MS = 4200;
const EXIT_MS = 260;
// Events older than this are restores or workspace loads, not live activity.
const FRESH_MS = 3000;

function Toast({ event, onDone }: { event: TimelineEvent; onDone: (id: string) => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const leaveTimer = window.setTimeout(() => setLeaving(true), VISIBLE_MS);
    const doneTimer = window.setTimeout(() => onDone(event.id), VISIBLE_MS + EXIT_MS);
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(doneTimer);
    };
  }, [event.id, onDone]);

  return (
    <div
      className={`timeline-toast ${leaving ? 'timeline-toast--out' : ''} grid grid-cols-[2rem_minmax(0,1fr)] gap-2.5 px-3 py-2.5 bg-theme-paper text-theme-ink border-[length:var(--border-width)] border-theme-border rounded-button shadow-xl`}
    >
      <span
        className="w-8 h-8 flex items-center justify-center border border-theme-border rounded-button bg-theme-background text-base leading-none"
        aria-hidden="true"
      >
        {event.icon === 'fx'
          ? <span className="italic font-semibold text-xs">fx</span>
          : event.icon}
      </span>
      <div className="min-w-0">
        <p className="font-bold text-sm font-heading truncate">{event.widgetLabel || event.widgetType}</p>
        <p className="text-sm font-body leading-snug break-words line-clamp-2">{event.description}</p>
      </div>
    </div>
  );
}

export default function TimelineToasts() {
  const enabled = useTimelineStore((s) => s.showToasts);
  const panelOpen = useTimelineStore((s) => s.isOpen);
  const showFormulas = useTimelineStore((s) => s.showFormulas);
  const activeCharacterId = useStore((s) => s.activeCharacterId);
  const events = useCurrentCharacterEvents();
  const [toasts, setToasts] = useState<TimelineEvent[]>([]);
  const seenRef = useRef<{ characterId: string | null; ids: Set<string> }>({
    characterId: activeCharacterId,
    ids: new Set(events.map((event) => event.id)),
  });

  useEffect(() => {
    const seen = seenRef.current;
    if (seen.characterId !== activeCharacterId) {
      seenRef.current = { characterId: activeCharacterId, ids: new Set(events.map((event) => event.id)) };
      setToasts([]);
      return;
    }

    const now = Date.now();
    const fresh = events.filter((event) => !seen.ids.has(event.id));
    fresh.forEach((event) => seen.ids.add(event.id));

    if (!enabled || panelOpen) return;
    const incoming = fresh.filter((event) => (
      now - event.timestamp < FRESH_MS && (showFormulas || event.widgetType !== 'FORMULA')
    ));
    if (incoming.length === 0) return;
    setToasts((current) => [...current, ...incoming].slice(-MAX_VISIBLE));
  }, [events, activeCharacterId, enabled, panelOpen, showFormulas]);

  useEffect(() => {
    if (!enabled || panelOpen) setToasts([]);
  }, [enabled, panelOpen]);

  const dismiss = useRef((id: string) => setToasts((current) => current.filter((toast) => toast.id !== id))).current;

  if (toasts.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed right-3 z-40 flex flex-col gap-2 w-72 max-w-[calc(100vw-1.5rem)] pointer-events-none"
      style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} event={toast} onDone={dismiss} />
      ))}
    </div>
  );
}
