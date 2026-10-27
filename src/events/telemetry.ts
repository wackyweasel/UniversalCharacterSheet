import type { Character, CharacterEvent, WidgetType } from '../types';
import { getEventEffects } from './steps';

/** Where an event was created or changed. */
export type EventTelemetrySource = 'events_panel' | 'widget_settings' | 'event_button' | 'text_button' | 'tutorial';

export interface EventTelemetryDetails {
  /** Type of the widget the trigger watches, if any. */
  widgetType: WidgetType | null;
  metadata: Record<string, string | number | boolean>;
}

/** Describes an event by its kinds only, so names, messages, targets and values are never sent. */
export function getEventTelemetryDetails(character: Character, event: Omit<CharacterEvent, 'id'>): EventTelemetryDetails {
  const widgetId = event.trigger.widgetId;
  let widgetType: WidgetType | null = null;
  if (widgetId) {
    for (const sheet of character.sheets) {
      const widget = sheet.widgets.find((item) => item.id === widgetId);
      if (widget) {
        widgetType = widget.type;
        break;
      }
    }
  }
  const effects = getEventEffects(event);
  return {
    widgetType,
    metadata: {
      triggerKind: event.trigger.kind,
      effectKinds: [...new Set(effects.map((effect) => effect.kind))].join(','),
      effectCount: effects.length,
      hasCondition: event.steps.some((step) => Boolean(step.condition?.trim())),
      stepCount: event.steps.length,
      enabled: event.enabled,
      eventCount: character.events?.length ?? 0,
    },
  };
}
