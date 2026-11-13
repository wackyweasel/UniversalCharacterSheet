import { v4 as uuidv4 } from 'uuid';
import type { Character, ItemEffect, Widget } from '../types';
import { entryIdentity, numericTargetKey } from './numericTargets';
import { getTrackValue, getTrackZone } from './thresholdTrack';
import { describeMissingRequirements, getSkillNodeStatus, getSkillPointsLeft, getUnlockedDependents, isSkillTreeUsingPoints } from './skillTree';

export type EffectSourceCollection = 'inventoryItems' | 'timedEffects' | 'skillNodes' | 'toggleItems' | 'mixedFields' | 'checkboxItems' | 'trackThresholds';

export interface WidgetEffectSource {
  key: string;
  id: string;
  name: string;
  active: boolean;
  effects: ItemEffect[];
  collection?: EffectSourceCollection;
  index?: number;
  hint: string;
}

export function getWidgetEffectSources(widget: Widget, values?: Character['itemEffectValues']): WidgetEffectSource[] {
  const sources: WidgetEffectSource[] = [];
  const add = (collection: EffectSourceCollection, entries: { id?: string; name: string; effects?: ItemEffect[] }[], active: (index: number) => boolean, hint: string) => {
    entries.forEach((entry, index) => {
      const id = entryIdentity(entry, index);
      sources.push({ key: JSON.stringify([collection, id]), id, collection, index, name: entry.name, effects: entry.effects ?? [], active: active(index), hint });
    });
  };
  const data = widget.data;
  switch (widget.type) {
    case 'INVENTORY':
    case 'INVENTORY_SLOTS':
    case 'COMPENDIUM':
      add('inventoryItems', data.inventoryItems ?? [], (index) => data.inventoryItems![index].active === true, 'Bonuses and penalties while this item is active.');
      break;
    case 'TIME_TRACKER':
      add('timedEffects', data.timedEffects ?? [], (index) => data.timedEffects![index].remainingSeconds > 0, 'Bonuses and penalties until this timed entry expires. Resetting its duration reapplies them.');
      break;
    case 'SKILL_TREE':
      add('skillNodes', data.skillNodes ?? [], (index) => data.skillNodes![index].unlocked, 'Bonuses and penalties while this skill is unlocked.');
      break;
    case 'TOGGLE_GROUP':
      add('toggleItems', data.toggleItems ?? [], (index) => data.toggleItems![index].active, 'Bonuses and penalties while this condition is enabled.');
      break;
    case 'CHECKBOX':
      add('checkboxItems', data.checkboxItems ?? [], (index) => data.checkboxItems![index].checked, 'Bonuses and penalties while this checklist item is checked.');
      break;
    case 'MIXED_FIELDS':
      add('mixedFields', data.mixedFields ?? [], (index) => {
        const field = data.mixedFields![index];
        return field.type === 'switch' && field.value;
      }, 'Bonuses and penalties while this switch is on.');
      return sources.filter((source) => data.mixedFields![source.index!].type === 'switch');
    case 'TOGGLE':
      sources.push({ key: 'switch', id: widget.id, name: data.label || 'Switch', effects: data.effects ?? [], active: data.toggleState === true, hint: 'Bonuses and penalties while this switch is on.' });
      break;
    case 'THRESHOLD_TRACK': {
      const controlled = values?.[numericTargetKey({ kind: 'widget', widgetId: widget.id, field: 'currentValue' })];
      const value = controlled ? data.currentValue ?? getTrackValue(data) : getTrackValue(data);
      const zone = getTrackZone(data.trackThresholds, value, data.trackThresholdMode);
      add('trackThresholds', data.trackThresholds ?? [], (index) => data.trackThresholds![index].id === zone.threshold?.id, 'Bonuses and penalties only while this is the current zone. Effects from previous zones do not stack.');
      break;
    }
  }
  return sources;
}

export function getEffectSourceActivationProblem(widget: Widget, source: WidgetEffectSource, active: boolean): string | undefined {
  if (widget.locked) return 'This widget is locked.';
  const data = widget.data;
  switch (source.collection) {
    case 'trackThresholds': return 'Automatic: change the track value to enter or leave this zone.';
    case 'timedEffects': {
      const duration = data.timedEffects?.[source.index!]?.initialSeconds;
      if (active && (!duration || !Number.isFinite(duration) || duration <= 0)) return 'Set a positive duration in the widget before restarting this entry.';
      break;
    }
    case 'mixedFields': {
      const field = data.mixedFields?.[source.index!];
      if (field?.type === 'switch' && field.valueFormula) return 'Automatic: this switch is controlled by a formula.';
      break;
    }
    case 'skillNodes': {
      const nodes = data.skillNodes ?? [];
      const node = nodes[source.index!];
      if (!node) return 'This skill is no longer available.';
      if (!active && getUnlockedDependents(nodes, node.id).length) return 'Lock dependent skills first.';
      if (active) {
        const status = getSkillNodeStatus(nodes, node, getSkillPointsLeft(data), isSkillTreeUsingPoints(data));
        if (status === 'locked') return `Requires ${describeMissingRequirements(nodes, node)}.`;
        if (status === 'unaffordable') return 'Not enough skill points.';
      }
      break;
    }
    case undefined:
      if (data.fieldFormulas?.state) return 'Automatic: this switch is controlled by a formula.';
      break;
  }
}

export function setWidgetSourceActive(widget: Widget, key: string, active: boolean): Widget {
  const source = getWidgetEffectSources(widget).find((entry) => entry.key === key);
  if (!source) throw new Error('The effect source changed. Refresh the panel and try again.');
  const problem = getEffectSourceActivationProblem(widget, source, active);
  if (problem) throw new Error(problem);
  if (source.active === active) return widget;
  const data = widget.data;
  const index = source.index!;
  switch (source.collection) {
    case 'inventoryItems': return { ...widget, data: { ...data, inventoryItems: data.inventoryItems?.map((entry, i) => i === index ? { ...entry, active } : entry) } };
    case 'timedEffects': return { ...widget, data: { ...data, timedEffects: data.timedEffects?.map((entry, i) => i === index ? { ...entry, remainingSeconds: active ? entry.initialSeconds! : 0 } : entry) } };
    case 'skillNodes': return { ...widget, data: { ...data, skillNodes: data.skillNodes?.map((entry, i) => i === index ? { ...entry, unlocked: active } : entry) } };
    case 'toggleItems': return { ...widget, data: { ...data, toggleItems: data.toggleItems?.map((entry, i) => i === index ? { ...entry, active } : entry) } };
    case 'checkboxItems': return { ...widget, data: { ...data, checkboxItems: data.checkboxItems?.map((entry, i) => i === index ? { ...entry, checked: active } : entry) } };
    case 'mixedFields': return { ...widget, data: { ...data, mixedFields: data.mixedFields?.map((entry, i) => i === index && entry.type === 'switch' ? { ...entry, value: active } : entry) } };
    case undefined: return { ...widget, data: { ...data, toggleState: active } };
    default: throw new Error('This effect source is controlled automatically.');
  }
}

export function mapWidgetEffects(widget: Widget, map: (source: WidgetEffectSource) => ItemEffect[]): Widget {
  const sources = getWidgetEffectSources(widget);
  let data = widget.data;
  for (const source of sources) {
    const effects = map(source);
    if (effects === source.effects) continue;
    if (!source.collection) {
      data = { ...data, effects };
      continue;
    }
    const index = source.index!;
    const update = <T extends { effects?: ItemEffect[] }>(entries: T[] | undefined): T[] | undefined => entries?.map((entry, i) => i === index ? { ...entry, effects } : entry);
    switch (source.collection) {
      case 'inventoryItems': data = { ...data, inventoryItems: update(data.inventoryItems) }; break;
      case 'timedEffects': data = { ...data, timedEffects: update(data.timedEffects) }; break;
      case 'skillNodes': data = { ...data, skillNodes: update(data.skillNodes) }; break;
      case 'toggleItems': data = { ...data, toggleItems: update(data.toggleItems) }; break;
      case 'checkboxItems': data = { ...data, checkboxItems: update(data.checkboxItems) }; break;
      case 'trackThresholds': data = { ...data, trackThresholds: update(data.trackThresholds) }; break;
      case 'mixedFields': data = { ...data, mixedFields: data.mixedFields?.map((entry, i) => i === index && entry.type === 'switch' ? { ...entry, effects } : entry) }; break;
    }
  }
  return data === widget.data ? widget : { ...widget, data };
}

export function setWidgetSourceEffects(widget: Widget, key: string, effects: ItemEffect[]): Widget {
  const source = getWidgetEffectSources(widget).find((entry) => entry.key === key);
  if (!source) throw new Error('The effect source changed while the dialog was open. Open it again.');
  let updated = mapWidgetEffects(widget, (entry) => entry.key === key ? effects : entry.effects);
  if (!source.collection || !source.id.startsWith('~')) return updated;
  const index = source.index!;
  const id = uuidv4();
  const identify = <T extends { id?: string }>(entries: T[] | undefined): T[] | undefined => entries?.map((entry, i) => i === index ? { ...entry, id } : entry);
  const data = updated.data;
  switch (source.collection) {
    case 'inventoryItems': updated = { ...updated, data: { ...data, inventoryItems: identify(data.inventoryItems) } }; break;
    case 'timedEffects': updated = { ...updated, data: { ...data, timedEffects: identify(data.timedEffects) } }; break;
    case 'skillNodes': updated = { ...updated, data: { ...data, skillNodes: identify(data.skillNodes) } }; break;
    case 'toggleItems': updated = { ...updated, data: { ...data, toggleItems: identify(data.toggleItems) } }; break;
    case 'checkboxItems': updated = { ...updated, data: { ...data, checkboxItems: identify(data.checkboxItems) } }; break;
    case 'trackThresholds': updated = { ...updated, data: { ...data, trackThresholds: identify(data.trackThresholds) } }; break;
    case 'mixedFields': updated = { ...updated, data: { ...data, mixedFields: identify(data.mixedFields) } }; break;
  }
  return updated;
}
