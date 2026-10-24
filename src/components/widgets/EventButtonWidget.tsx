import { useEffect, useMemo, useRef, useState } from 'react';
import type { CharacterEvent, Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { useEventsPanelStore } from '../../store/useEventsPanelStore';
import { BUTTON_PRESSED_KIND } from '../../events/defs/button';
import { createEventDraft } from '../../events/drafts';
import type { EventFiring } from '../../events/engine';
import { emitWidgetAction, subscribeEventFirings } from '../../events/runtime';
import { Tooltip } from '../Tooltip';
import { PlusIcon } from '../icons';
import { WidgetEmptyState } from './WidgetPrimitives';

interface Props {
  widget: Widget;
  mode: 'play' | 'print';
  width: number;
  height: number;
  interactive?: boolean;
}

const FEEDBACK_MS = 2500;
// Firings arrive a microtask after the press; stop waiting if none come (e.g. events are paused).
const FIRING_WAIT_MS = 1000;
const NO_EVENTS: CharacterEvent[] = [];

export const DEFAULT_EVENT_BUTTON_TEXT = 'Event button';

const eventName = (event: CharacterEvent) => event.name?.trim() || 'Unnamed event';

function summarize(firings: EventFiring[]): string {
  const ran = firings.filter((firing) => !firing.conditionFailed);
  if (ran.length === 0) return 'Condition not met';
  if (ran.length > 1) return `${ran.length} events ran`;
  const changes = ran[0].effects.filter((effect) => !effect.skipped).map((effect) => effect.text);
  return changes.length > 0 ? changes.join(' • ') : 'Nothing changed';
}

export default function EventButtonWidget({ widget, mode, height, interactive = true }: Props) {
  const events = useStore((state) => state.characters.find((character) => character.id === state.activeCharacterId)?.events ?? NO_EVENTS);
  const openEditor = useEventsPanelStore((state) => state.openEditor);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const awaitingRef = useRef(false);
  const linkedIdsRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<number[]>([]);

  const { buttonText, buttonColor, buttonTextColor } = widget.data;
  const text = buttonText?.trim() || widget.data.label?.trim() || DEFAULT_EVENT_BUTTON_TEXT;
  const canPress = interactive && mode === 'play';

  const linked = useMemo(
    () => events.filter((event) => event.trigger.kind === BUTTON_PRESSED_KIND && event.trigger.widgetId === widget.id),
    [events, widget.id],
  );
  const enabled = linked.filter((event) => event.enabled);

  useEffect(() => {
    linkedIdsRef.current = new Set(linked.map((event) => event.id));
  }, [linked]);

  useEffect(() => () => timersRef.current.forEach((timer) => window.clearTimeout(timer)), []);

  const later = (callback: () => void, delay: number) => {
    timersRef.current.push(window.setTimeout(callback, delay));
  };

  const showFeedback = (message: string) => {
    setFeedback(message);
    later(() => setFeedback((current) => (current === message ? null : current)), FEEDBACK_MS);
  };

  useEffect(() => subscribeEventFirings((firings) => {
    if (!awaitingRef.current) return;
    const mine = firings.filter((firing) => firing.depth === 0 && !firing.manual && linkedIdsRef.current.has(firing.eventId));
    if (mine.length === 0) return;
    awaitingRef.current = false;
    showFeedback(summarize(mine));
  }), []);

  const press = () => {
    if (!canPress) return;
    setIsAnimating(true);
    later(() => setIsAnimating(false), 150);
    if (enabled.length === 0) {
      showFeedback(linked.length > 1 ? 'Its events are off' : 'Its event is off');
      return;
    }
    awaitingRef.current = true;
    later(() => { awaitingRef.current = false; }, FIRING_WAIT_MS);
    emitWidgetAction({ widgetId: widget.id, kind: 'press', text });
  };

  const addEvent = () => {
    const state = useStore.getState();
    const character = state.characters.find((item) => item.id === state.activeCharacterId);
    if (!character) return;
    openEditor({ draft: createEventDraft(character, widget), source: 'event_button' });
  };

  if (canPress && linked.length === 0) {
    return (
      <div className="event-button-widget flex h-full w-full p-1">
        <WidgetEmptyState
          compact={height < 90}
          title="No event yet"
          hint={height < 90 ? undefined : 'Choose what happens when this button is pressed.'}
          action={(
            <button
              type="button"
              onClick={addEvent}
              onMouseDown={(event) => event.stopPropagation()}
              className="widget-control widget-control--primary flex items-center gap-1 px-2.5 py-1 text-xs"
            >
              <PlusIcon className="h-3.5 w-3.5" /> Add event
            </button>
          )}
        />
      </div>
    );
  }

  const tooltip = !canPress
    ? text
    : enabled.length > 0
      ? `Runs ${enabled.map(eventName).join(', ')}`
      : linked.length > 1 ? 'Its events are turned off' : 'Its event is turned off';

  return (
    <div className="event-button-widget flex h-full w-full items-center justify-center p-1">
      <Tooltip content={tooltip}>
        <button
          type="button"
          onClick={press}
          onMouseDown={(event) => event.stopPropagation()}
          aria-label={text}
          className={`widget-control flex h-full w-full min-w-0 items-center justify-center overflow-hidden px-3 py-2 text-xs transition-transform ${isAnimating ? 'scale-95' : ''} ${canPress && enabled.length === 0 ? 'opacity-60' : ''}`}
          style={{
            ...(buttonColor ? { backgroundColor: buttonColor } : {}),
            ...(buttonTextColor ? { color: buttonTextColor } : {}),
          }}
        >
          {feedback ? (
            <span className="line-clamp-3 min-w-0 break-words text-center font-bold leading-tight animate-fade-in">{feedback}</span>
          ) : (
            <span className="min-w-0 truncate">{text}</span>
          )}
        </button>
      </Tooltip>
      <span className="sr-only" aria-live="polite">{feedback ?? ''}</span>
    </div>
  );
}
