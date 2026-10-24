import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { useEventsPanelStore } from '../../store/useEventsPanelStore';
import { createEventDraft, getWidgetEvents } from '../../events/drafts';
import { findWidget } from '../../events/helpers';
import { getEventProblems, getWidgetEventDefs, widgetSupportsEvents } from '../../events/registry';
import { CollapsibleSection } from '../editors/CollapsibleSection';
import { Tooltip } from '../Tooltip';
import { PencilIcon, PlusIcon } from '../icons';
import { EventFlow } from './EventFlow';

const iconButtonClass = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-button text-theme-muted transition-colors hover:bg-theme-accent hover:text-theme-paper';
const MAX_LISTED = 3;

function formatList(labels: string[]): string {
  const shown = labels.slice(0, MAX_LISTED).map((label, index) => (index === 0 ? label : label.toLocaleLowerCase()));
  const more = labels.length - shown.length;
  return `${shown.join(', ')}${more > 0 ? `, and ${more} more` : ''}`;
}

/** Lists the events that use a widget, inside its settings dialog. */
export function WidgetEventsSection({ widgetId }: { widgetId: string }) {
  const character = useStore((s) => s.characters.find((c) => c.id === s.activeCharacterId));
  const setEventEnabled = useStore((s) => s.setCharacterEventEnabled);
  const openEditor = useEventsPanelStore((s) => s.openEditor);
  const widget = character ? findWidget(character, widgetId) : undefined;
  const events = useMemo(
    () => (character ? getWidgetEvents(character, widgetId) : []),
    [character, widgetId],
  );

  if (!character || !widget || !widgetSupportsEvents(widget.type)) return null;

  const defs = getWidgetEventDefs(widget.type);
  const capabilities = [
    { title: 'Can start an event', labels: defs.triggers.map((def) => def.label) },
    { title: 'Events can', labels: defs.effects.map((def) => def.label) },
  ].filter((row) => row.labels.length > 0);

  return (
    <CollapsibleSection title="Events" count={events.length > 0 ? events.length : undefined} defaultOpen={events.length > 0}>
      <div className="space-y-2.5" data-tutorial="widget-events-section">
        {events.length === 0 && (
          <div className="space-y-1.5 text-sm leading-relaxed text-theme-muted font-body">
            <p>Make this widget react when something happens, or let other events change it.</p>
            <dl className="space-y-1 text-xs">
              {capabilities.map((row) => (
                <div key={row.title} className="flex flex-wrap items-baseline gap-x-1.5">
                  <dt className="font-bold text-theme-ink">{row.title}:</dt>
                  <dd>{formatList(row.labels)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        {events.map((event) => {
          const name = event.name?.trim();
          const problems = getEventProblems(character, event);
          return (
            <article
              key={event.id}
              aria-label={name || 'Unnamed event'}
              className={`event-card p-2.5 ${event.enabled ? '' : 'event-card--off'} ${problems.length > 0 ? 'event-card--problem' : ''}`}
            >
              <header className="mb-2 flex items-center gap-1.5">
                <h4 className="min-w-0 flex-1 truncate font-heading text-sm font-bold text-theme-ink">
                  {name || <span className="font-body font-normal italic text-theme-muted">Unnamed event</span>}
                </h4>
                {problems.length > 0 && (
                  <span className="shrink-0 text-xs text-amber-600 font-body" title={problems.join('\n')}>⚠ Needs attention</span>
                )}
                <Tooltip content="Edit">
                  <button
                    type="button"
                    onClick={() => openEditor({ eventId: event.id, source: 'widget_settings' })}
                    aria-label={`Edit ${name || 'event'}`}
                    className={iconButtonClass}
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
                <Tooltip content={event.enabled ? 'On: turn off' : 'Off: turn on'}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={event.enabled}
                    aria-label={`${name || 'Event'} is on`}
                    onClick={() => setEventEnabled(event.id, !event.enabled, 'widget_settings')}
                    className="event-switch ml-1"
                  />
                </Tooltip>
              </header>
              <EventFlow character={character} event={event} />
            </article>
          );
        })}
        <button
          type="button"
          onClick={() => openEditor({ draft: createEventDraft(character, widget), source: 'widget_settings' })}
          className="event-editor__add flex h-9 w-full items-center justify-center gap-1.5 text-xs"
        >
          <PlusIcon className="h-3.5 w-3.5" /> New event with this widget
        </button>
      </div>
    </CollapsibleSection>
  );
}
