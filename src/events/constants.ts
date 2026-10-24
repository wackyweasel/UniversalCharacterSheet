/** Prefix of the labels that carry a trigger's data while its event runs, e.g. @event_damage. */
export const EVENT_LABEL_PREFIX = 'event_';

export const eventLabel = (key: string) => `${EVENT_LABEL_PREFIX}${key}`;
export const isEventLabel = (label: string) => label.startsWith(EVENT_LABEL_PREFIX);

/** `event_…` labels referenced in a formula or a text with {formulas}. */
export function findEventLabelRefs(source: string | undefined): string[] {
  const refs = new Set<string>();
  for (const match of (source ?? '').matchAll(/@(event_[a-zA-Z0-9_]*)/g)) refs.add(match[1]);
  return Array.from(refs);
}

/** Timeline `widgetType` and icon used for entries logged by events. */
export const EVENT_TIMELINE_TYPE = 'EVENT';
export const EVENT_TIMELINE_ICON = '⚡';

/** Effect that runs another event; its target is that event's id. */
export const RUN_EVENT_KIND = 'event.run';
