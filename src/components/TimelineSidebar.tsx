import { useState } from 'react';
import { useTimelineStore, useCurrentCharacterEvents, TimelineEvent } from '../store/useTimelineStore';
import { useStore } from '../store/useStore';

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function EventItem({ event }: { event: TimelineEvent }) {
  return (
    <div className="flex gap-2 px-3 py-1.5 border-b border-theme-border/30 last:border-b-0">
      <span className="text-base leading-5 flex-shrink-0">{event.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="font-bold text-[11px] text-theme-ink font-heading truncate">
            {event.widgetLabel || event.widgetType}
          </span>
          <span className="text-[10px] text-theme-muted font-body flex-shrink-0">
            {formatTime(event.timestamp)}
          </span>
        </div>
        <p className="text-[11px] text-theme-ink font-body leading-tight break-words opacity-80">
          {event.description}
        </p>
      </div>
    </div>
  );
}

export default function TimelineSidebar() {
  const isOpen = useTimelineStore((s) => s.isOpen);
  const events = useCurrentCharacterEvents();
  const orderNewestFirst = useTimelineStore((s) => s.orderNewestFirst);
  const toggleOrder = useTimelineStore((s) => s.toggleOrder);
  const clearEvents = useTimelineStore((s) => s.clearEvents);
  const setOpen = useTimelineStore((s) => s.setOpen);
  const activeCharacterId = useStore((s) => s.activeCharacterId);
  const [confirmingClear, setConfirmingClear] = useState(false);

  if (!isOpen) return null;

  const displayed = orderNewestFirst ? [...events].reverse() : events;

  return (
    <div
      className="fixed right-0 top-0 bottom-0 w-[260px] bg-theme-paper border-l-[length:var(--border-width)] border-theme-border z-40 flex flex-col shadow-theme"
      style={{ top: '0' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b-[length:var(--border-width)] border-theme-border bg-theme-background/50 flex-shrink-0">
        <span className="font-bold text-xs text-theme-ink font-heading">Timeline</span>
        <button
          onClick={() => setOpen(false)}
          className="w-6 h-6 flex items-center justify-center text-theme-muted hover:text-theme-ink transition-colors text-sm"
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-theme-border/50 flex-shrink-0 gap-1">
        {/* Order toggle */}
        <button
          onClick={toggleOrder}
          className="flex items-center gap-1 text-[10px] text-theme-ink font-body px-1.5 py-0.5 rounded-button border border-theme-border/50 hover:bg-theme-accent hover:text-theme-paper transition-colors"
          title={orderNewestFirst ? 'Newest first' : 'Oldest first'}
        >
          {orderNewestFirst ? '↑ Newest first' : '↓ Oldest first'}
        </button>
        {/* Clear */}
        {confirmingClear ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (activeCharacterId) clearEvents(activeCharacterId);
                setConfirmingClear(false);
              }}
              className="text-[10px] font-body px-1.5 py-0.5 rounded-button border border-red-500 bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmingClear(false)}
              className="text-[10px] text-theme-muted font-body px-1.5 py-0.5 rounded-button border border-theme-border/50 hover:bg-theme-accent hover:text-theme-paper transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingClear(true)}
            className="text-[10px] text-theme-muted font-body px-1.5 py-0.5 rounded-button border border-theme-border/50 hover:bg-red-500 hover:text-white hover:border-red-600 transition-colors"
            title="Clear timeline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Events */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {displayed.length === 0 ? (
          <div className="flex items-center justify-center h-full text-theme-muted text-xs font-body px-4 text-center">
            No events yet. Interact with your character sheet to see a timeline of events here.
          </div>
        ) : (
          displayed.map((event) => (
            <EventItem key={event.id} event={event} />
          ))
        )}
      </div>
    </div>
  );
}
