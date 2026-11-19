import { v4 as uuidv4 } from 'uuid';
import type { Character, CharacterEvent, CharacterEventEffect, CharacterEventParams, CharacterEventStep, CharacterEventTrigger, WidgetType } from '../types';
import { remapEventIds } from '../utils/characterClone';
import { getWidgetTitle } from '../utils/characterVariables';
import { findWidget } from './helpers';
import { getAllSteps, getEventEffects, normalizeEvent, type StoredCharacterEvent } from './steps';

export const EVENTS_EXPORT_KIND = 'ucs-events';
const EVENTS_EXPORT_VERSION = 1;
const MAX_STEP_DEPTH = 32;

/** How the widgets an event uses are recognised on another character, where their ids differ. */
interface ExportedWidget {
  type: WidgetType;
  title: string;
}

export interface ParsedEventsImport {
  events: StoredCharacterEvent[];
  widgets: Record<string, ExportedWidget>;
}

export type EventsImportParse = { ok: true; data: ParsedEventsImport } | { ok: false; error: string };

export interface EventsImportPlan {
  events: CharacterEvent[];
  /** Widgets the events use that this character has no counterpart for. */
  missingWidgets: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

function cleanParams(value: unknown): CharacterEventParams | undefined {
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string');
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function cleanEffect(value: unknown): CharacterEventEffect | null {
  if (!isRecord(value) || !text(value.kind)) return null;
  const params = cleanParams(value.params);
  return {
    id: text(value.id) ?? '',
    kind: value.kind as string,
    ...(text(value.widgetId) ? { widgetId: text(value.widgetId) } : {}),
    ...(text(value.target) !== undefined ? { target: text(value.target) } : {}),
    ...(params ? { params } : {}),
    ...(text(value.resultName) ? { resultName: text(value.resultName) } : {}),
  };
}

const cleanEffects = (value: unknown): CharacterEventEffect[] | null => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const effects = value.map(cleanEffect);
  return effects.every((effect): effect is CharacterEventEffect => effect !== null) ? effects : null;
};

function cleanSteps(value: unknown, depth: number): CharacterEventStep[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || depth > MAX_STEP_DEPTH) return null;
  const steps = value.map((item): CharacterEventStep | null => {
    if (!isRecord(item)) return null;
    const effects = cleanEffects(item.effects);
    const otherwise = cleanEffects(item.otherwise);
    const nested = cleanSteps(item.steps, depth + 1);
    const otherwiseSteps = cleanSteps(item.otherwiseSteps, depth + 1);
    if (!effects || !otherwise || !nested || !otherwiseSteps) return null;
    return {
      id: text(item.id) ?? '',
      ...(text(item.condition) !== undefined ? { condition: text(item.condition) } : {}),
      effects,
      ...(otherwise.length ? { otherwise } : {}),
      ...(nested.length ? { steps: nested } : {}),
      ...(otherwiseSteps.length ? { otherwiseSteps } : {}),
      ...(item.stopIfFalse === true ? { stopIfFalse: true } : {}),
      ...(text(item.jump) ? { jump: text(item.jump) } : {}),
      ...(text(item.otherwiseJump) ? { otherwiseJump: text(item.otherwiseJump) } : {}),
    };
  });
  return steps.every((step): step is CharacterEventStep => step !== null) ? steps : null;
}

function cleanTrigger(value: unknown): CharacterEventTrigger | null {
  if (!isRecord(value) || !text(value.kind)) return null;
  const params = cleanParams(value.params);
  return {
    kind: value.kind as string,
    ...(text(value.widgetId) ? { widgetId: text(value.widgetId) } : {}),
    ...(text(value.target) !== undefined ? { target: text(value.target) } : {}),
    ...(params ? { params } : {}),
  };
}

/** Events from before steps existed have one condition and one list of effects on the event itself. */
function cleanEvent(value: unknown): StoredCharacterEvent | null {
  if (!isRecord(value)) return null;
  const trigger = cleanTrigger(value.trigger);
  const steps = Array.isArray(value.steps) ? cleanSteps(value.steps, 0) : cleanSteps([{ condition: value.condition, effects: value.effects }], 0);
  if (!trigger || !steps) return null;
  const name = text(value.name)?.trim();
  return { id: text(value.id) || uuidv4(), ...(name ? { name } : {}), enabled: value.enabled !== false, trigger, steps };
}

function cleanWidgets(value: unknown): Record<string, ExportedWidget> {
  if (!isRecord(value)) return {};
  const widgets: Record<string, ExportedWidget> = {};
  for (const [id, widget] of Object.entries(value)) {
    if (isRecord(widget) && text(widget.type)) widgets[id] = { type: widget.type as WidgetType, title: text(widget.title) ?? '' };
  }
  return widgets;
}

/** The events as shareable text, with enough about the widgets they use to find the same ones on another character. */
export function serializeEvents(character: Character, events: CharacterEvent[]): string {
  const widgets: Record<string, ExportedWidget> = {};
  for (const event of events) {
    const ids = [event.trigger.widgetId, ...getEventEffects(event).map((effect) => effect.widgetId)];
    for (const id of ids) {
      const widget = id && !widgets[id] ? findWidget(character, id) : undefined;
      if (id && widget) widgets[id] = { type: widget.type, title: getWidgetTitle(widget) };
    }
  }
  return JSON.stringify({ kind: EVENTS_EXPORT_KIND, version: EVENTS_EXPORT_VERSION, events: events.map(normalizeEvent), widgets }, null, 2);
}

/** Reads exported events (or a bare list of them), dropping anything that isn't part of an event. */
export function parseEventsImport(source: string): EventsImportParse {
  let data: unknown;
  try {
    data = JSON.parse(source);
  } catch {
    return { ok: false, error: 'Enter valid JSON before importing events.' };
  }
  const list = Array.isArray(data) ? data : isRecord(data) && Array.isArray(data.events) ? data.events : null;
  if (!list) return { ok: false, error: 'This JSON does not contain events.' };
  const events = list.map(cleanEvent);
  if (events.length === 0) return { ok: false, error: 'This JSON does not contain any events.' };
  if (events.some((event) => event === null)) return { ok: false, error: 'Some of these events are not valid, so nothing was imported.' };
  return { ok: true, data: { events: events as StoredCharacterEvent[], widgets: isRecord(data) ? cleanWidgets(data.widgets) : {} } };
}

/** Gives the events fresh ids and points them at this character's widgets: the same widget, or an unused one of the same type and title. */
export function planEventsImport(character: Character, { events, widgets }: ParsedEventsImport): EventsImportPlan {
  const own = character.sheets.flatMap((sheet) => sheet.widgets);
  const used = new Set<string>();
  const idMap = new Map<string, string>();
  let missingWidgets = 0;
  for (const [id, exported] of Object.entries(widgets)) {
    const same = own.find((widget) => widget.id === id);
    const title = exported.title.trim().toLowerCase();
    const match = same ?? own.find((widget) => !used.has(widget.id) && widget.type === exported.type && getWidgetTitle(widget).trim().toLowerCase() === title);
    if (match) {
      used.add(match.id);
      idMap.set(id, match.id);
    } else {
      missingWidgets += 1;
    }
  }
  // A widget that isn't in the file's list can only be matched by its id.
  const referenced = new Set(events.flatMap((event) => [event.trigger.widgetId, ...getAllSteps(normalizeEvent(event).steps).flatMap((step) => [...step.effects, ...(step.otherwise ?? [])].map((effect) => effect.widgetId))]));
  for (const id of referenced) {
    if (id && !widgets[id] && !own.some((widget) => widget.id === id)) missingWidgets += 1;
  }
  return { events: remapEventIds(events, idMap), missingWidgets };
}
