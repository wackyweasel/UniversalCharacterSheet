import { useState } from 'react';
import { useTimelineStore, useCurrentCharacterEvents, TimelineEvent } from '../store/useTimelineStore';
import { useStore } from '../store/useStore';
import { Tooltip } from './Tooltip';

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function EventItem({ event, onDelete }: { event: TimelineEvent; onDelete: (eventId: string) => void }) {
  return (
    <div className="group flex gap-2 px-3 py-1.5 border-b border-theme-border/30 last:border-b-0">
      <span className="text-base leading-5 flex-shrink-0 self-center">
        {event.icon === 'fx'
          ? <span className="italic font-semibold text-xs text-theme-ink">fx</span>
          : event.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="font-bold text-sm text-theme-ink font-heading truncate">
            {event.widgetLabel || event.widgetType}
          </span>
          <span className="text-xs text-theme-muted font-body flex-shrink-0">
            {formatTime(event.timestamp)}
          </span>
        </div>
        <p className="text-sm text-theme-ink font-body leading-tight break-words opacity-80">
          {event.description}
        </p>
      </div>
      <Tooltip content="Delete event">
        <button
          onClick={() => onDelete(event.id)}
          onMouseDown={(e) => e.stopPropagation()}
          className="self-center w-5 h-5 flex items-center justify-center rounded-button text-theme-muted hover:text-white hover:bg-red-500 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
          aria-label="Delete event"
        >
          ×
        </button>
      </Tooltip>
    </div>
  );
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
  const setOpen = useTimelineStore((s) => s.setOpen);
  const activeCharacterId = useStore((s) => s.activeCharacterId);
  const [confirmingClear, setConfirmingClear] = useState(false);

  if (!isOpen) return null;

  const filtered = showFormulas ? events : events.filter(e => e.widgetType !== 'FORMULA');
  const displayed = orderNewestFirst ? [...filtered].reverse() : filtered;

  return (
    <div
      className="fixed right-0 top-0 bottom-0 w-[320px] bg-theme-paper border-l-[length:var(--border-width)] border-theme-border z-40 flex flex-col shadow-theme"
      style={{ top: '0' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b-[length:var(--border-width)] border-theme-border bg-theme-background/50 flex-shrink-0">
        <span className="font-bold text-xs text-theme-ink font-heading">Timeline</span>
        <Tooltip content="Close">
          <button
            onClick={() => setOpen(false)}
            className="w-6 h-6 flex items-center justify-center text-theme-muted hover:text-theme-ink transition-colors text-sm"
          >
            ✕
          </button>
        </Tooltip>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-theme-border/50 flex-shrink-0 gap-1">
        <div className="flex items-center gap-1">
        {/* Order toggle */}
        <Tooltip content={orderNewestFirst ? 'Newest first' : 'Oldest first'}>
          <button
            onClick={toggleOrder}
            className="flex items-center gap-1 text-xs text-theme-ink font-body px-1.5 py-0.5 rounded-button border border-theme-border/50 hover:bg-theme-accent hover:text-theme-paper transition-colors"
          >
            {orderNewestFirst ? '↑ Newest first' : '↓ Oldest first'}
          </button>
        </Tooltip>
        {/* Show formulas toggle */}
        <Tooltip content={showFormulas ? 'Hide formula events' : 'Show formula events'}>
          <button
            onClick={toggleShowFormulas}
            className={`flex items-center gap-1 text-xs font-body px-1.5 py-0.5 rounded-button border transition-colors ${
              showFormulas
                ? 'text-theme-ink border-theme-border/50 hover:bg-theme-accent hover:text-theme-paper'
                : 'text-theme-muted border-theme-border/30 opacity-50 hover:opacity-100'
            }`}
          >
            <span className="italic font-semibold" style={{ fontSize: '0.65rem' }}>fx</span>
          </button>
        </Tooltip>
        </div>
        {/* Clear */}
        {confirmingClear ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (activeCharacterId) clearEvents(activeCharacterId);
                setConfirmingClear(false);
              }}
              className="text-xs font-body px-1.5 py-0.5 rounded-button border border-red-500 bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmingClear(false)}
              className="text-xs text-theme-muted font-body px-1.5 py-0.5 rounded-button border border-theme-border/50 hover:bg-theme-accent hover:text-theme-paper transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <Tooltip content="Clear timeline">
            <button
              onClick={() => setConfirmingClear(true)}
              className="text-xs text-theme-muted font-body px-1.5 py-0.5 rounded-button border border-theme-border/50 hover:bg-red-500 hover:text-white hover:border-red-600 transition-colors"
            >
              Clear
            </button>
          </Tooltip>
        )}
      </div>

      {/* Events */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {displayed.length === 0 ? (
          <div className="flex items-center justify-center h-full text-theme-muted text-sm font-body px-4 text-center">
            No events yet. Interact with your character sheet to see a timeline of events here.
          </div>
        ) : (
          displayed.map((event) => (
            <EventItem
              key={event.id}
              event={event}
              onDelete={(eventId) => {
                if (!activeCharacterId) return;
                removeEvent(activeCharacterId, eventId);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
