import { useEffect, useMemo, useRef, useState } from 'react';
import type { CharacterEvent, Widget } from '../types';
import { useStore } from '../store/useStore';
import { useEventsPanelStore } from '../store/useEventsPanelStore';
import { sameButtonName, TEXT_BUTTON_KIND } from '../events/defs/textButton';
import { createTextButtonDraft } from '../events/drafts';
import { emitWidgetAction } from '../events/runtime';
import { Tooltip } from './Tooltip';

interface Props {
  name: string;
  widget: Widget;
}

const NO_EVENTS: CharacterEvent[] = [];
const PRESS_MS = 160;

const eventName = (event: CharacterEvent) => event.name?.trim() || 'Unnamed event';
const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

/** A `{[name]}` button in a widget's text: the first click sets up its event, later clicks run it. */
export function InlineEventButton({ name, widget }: Props) {
  const events = useStore((state) => state.characters.find((character) => character.id === state.activeCharacterId)?.events ?? NO_EVENTS);
  const openEditor = useEventsPanelStore((state) => state.openEditor);
  const [pressed, setPressed] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const linked = useMemo(
    () => events.filter((event) => (
      event.trigger.kind === TEXT_BUTTON_KIND && event.trigger.widgetId === widget.id && sameButtonName(event.trigger.target, name)
    )),
    [events, widget.id, name],
  );
  const enabled = linked.filter((event) => event.enabled);
  const state = linked.length === 0 ? 'new' : enabled.length === 0 ? 'off' : 'ready';
  const tooltip = state === 'new'
    ? 'Click to choose what this button does'
    : state === 'off'
      ? (linked.length > 1 ? 'Its events are turned off' : 'Its event is turned off')
      : `Runs ${enabled.map(eventName).join(', ')}`;

  const press = () => {
    if (state === 'new') {
      openEditor({ draft: createTextButtonDraft(widget, name), source: 'text_button' });
      return;
    }
    if (state === 'off') return;
    setPressed(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setPressed(false), PRESS_MS);
    emitWidgetAction({ widgetId: widget.id, kind: 'press', target: name, text: name });
  };

  return (
    <Tooltip content={tooltip}>
      <button
        type="button"
        className={`inline-event-button inline-event-button--${state} ${pressed ? 'inline-event-button--pressed' : ''}`}
        aria-disabled={state === 'off' || undefined}
        data-tutorial="inline-event-button"
        onPointerDown={stop}
        onMouseDown={stop}
        onTouchStart={stop}
        onTouchEnd={stop}
        onFocus={stop}
        onClick={(event) => {
          event.stopPropagation();
          press();
        }}
      >
        {name}
      </button>
    </Tooltip>
  );
}
