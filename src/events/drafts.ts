import { v4 as uuidv4 } from 'uuid';
import type { Character, CharacterEvent, CharacterEventEffect, CharacterEventTrigger, Widget } from '../types';
import { TEXT_BUTTON_KIND } from './defs/textButton';
import { fillParams, getWidgetEventDefs, GLOBAL_EFFECT_DEFS, GLOBAL_TRIGGER_DEFS } from './registry';
import { ANY_TARGET, type EffectDef, type SpecContext, type TargetSpec, type TriggerDef } from './types';

export function getTriggerDefsFor(widget: Widget | undefined): TriggerDef[] {
  return widget ? getWidgetEventDefs(widget.type).triggers : GLOBAL_TRIGGER_DEFS;
}

/** False for a trigger that needs a target while there is nothing to choose, like a text with no buttons. */
export function isTriggerOffered(def: TriggerDef, ctx: SpecContext): boolean {
  return !def.needsTarget || !def.target || def.target.options(ctx).length > 0;
}

export function getEffectDefsFor(widget: Widget | undefined): EffectDef[] {
  return widget ? getWidgetEventDefs(widget.type).effects : GLOBAL_EFFECT_DEFS;
}

/** "Any" when the target allows it, else the first available choice. */
export function defaultTarget(spec: TargetSpec | undefined, ctx: SpecContext): string | undefined {
  if (!spec) return undefined;
  if (spec.any) return ANY_TARGET;
  return spec.options(ctx)[0]?.value;
}

export function createTrigger(character: Character, def: TriggerDef, widget?: Widget): CharacterEventTrigger {
  const target = defaultTarget(def.target, { character, widget });
  return {
    kind: def.kind,
    ...(widget ? { widgetId: widget.id } : {}),
    ...(target !== undefined ? { target } : {}),
    ...(def.params?.length ? { params: fillParams(def.params, {}) } : {}),
  };
}

export function createEffect(character: Character, def: EffectDef, widget?: Widget, id: string = uuidv4()): CharacterEventEffect {
  const target = def.target ? (def.target.options({ character, widget })[0]?.value ?? (def.target.any ? ANY_TARGET : undefined)) : undefined;
  return {
    id,
    kind: def.kind,
    ...(widget ? { widgetId: widget.id } : {}),
    ...(target !== undefined ? { target } : {}),
    ...(def.params?.length ? { params: fillParams(def.params, {}) } : {}),
  };
}

/** An effect whose action hasn't been chosen yet. */
export function createBlankEffect(): CharacterEventEffect {
  return { id: uuidv4(), kind: '' };
}

/** A new event; from a widget it starts with the widget's first trigger, or its first effect when it has no triggers to offer. */
export function createEventDraft(character: Character, widget?: Widget): Omit<CharacterEvent, 'id'> {
  const draft: Omit<CharacterEvent, 'id'> = { enabled: true, trigger: { kind: '' }, effects: [createBlankEffect()] };
  if (!widget) return draft;
  const triggers = getTriggerDefsFor(widget);
  const trigger = triggers.find((def) => isTriggerOffered(def, { character, widget }));
  if (trigger) return { ...draft, trigger: createTrigger(character, trigger, widget) };
  const effect = getEffectDefsFor(widget)[0];
  if (effect) return { ...draft, effects: [createEffect(character, effect, widget)] };
  // Still start from the widget, so the editor explains how to make its trigger available.
  if (triggers[0]) return { ...draft, trigger: createTrigger(character, triggers[0], widget) };
  return draft;
}

/** A new event run by the `{[name]}` button in a widget's text. */
export function createTextButtonDraft(widget: Widget, name: string): Omit<CharacterEvent, 'id'> {
  return {
    name,
    enabled: true,
    trigger: { kind: TEXT_BUTTON_KIND, widgetId: widget.id, target: name },
    effects: [createBlankEffect()],
  };
}

/** Events whose trigger or effects use the widget. */
export function getWidgetEvents(character: Character, widgetId: string): CharacterEvent[] {
  return (character.events ?? []).filter((event) => (
    event.trigger.widgetId === widgetId || event.effects.some((effect) => effect.widgetId === widgetId)
  ));
}

/** Widgets that offer triggers (or effects), grouped by sheet; `keepWidgetId` stays listed even when it offers nothing. */
export function getEventSourceWidgets(
  character: Character,
  role: 'trigger' | 'effect',
  keepWidgetId?: string,
): { sheetId: string; sheetName: string; widgets: Widget[] }[] {
  return character.sheets
    .map((sheet) => ({
      sheetId: sheet.id,
      sheetName: sheet.name || 'Sheet',
      widgets: sheet.widgets.filter((widget) => {
        if (widget.id === keepWidgetId) return true;
        const defs = getWidgetEventDefs(widget.type);
        return role === 'trigger'
          ? defs.triggers.some((def) => isTriggerOffered(def, { character, widget }))
          : defs.effects.length > 0;
      }),
    }))
    .filter((group) => group.widgets.length > 0);
}

export function findWidgetSheetId(character: Character, widgetId: string): string | undefined {
  return character.sheets.find((sheet) => sheet.widgets.some((widget) => widget.id === widgetId))?.id;
}
