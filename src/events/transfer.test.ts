import { describe, expect, it } from 'vitest';
import type { Character, CharacterEvent } from '../types';
import { parseEventsImport, planEventsImport, serializeEvents } from './transfer';

const widget = (id: string, type: 'HEALTH_BAR' | 'TOGGLE', label: string) => ({ id, type, x: 0, y: 0, data: { label } }) as Character['sheets'][number]['widgets'][number];

const source: Character = {
  id: 'a',
  name: 'Source',
  activeSheetId: 's',
  sheets: [{ id: 's', name: 'Main', widgets: [widget('hp-a', 'HEALTH_BAR', 'Health'), widget('flag-a', 'TOGGLE', 'Bloodied')] }],
};

const target: Character = {
  id: 'b',
  name: 'Target',
  activeSheetId: 's2',
  sheets: [{ id: 's2', name: 'Main', widgets: [widget('hp-b', 'HEALTH_BAR', ' health '), widget('other', 'TOGGLE', 'Poisoned')] }],
};

const events: CharacterEvent[] = [
  {
    id: 'e1',
    name: 'Bloodied',
    enabled: false,
    trigger: { kind: 'value.crosses', widgetId: 'hp-a', target: 'current', params: { compare: 'below', threshold: '50%' } },
    steps: [{
      id: 's1',
      condition: '1 > 0',
      effects: [{ id: 'f1', kind: 'switch.set', widgetId: 'flag-a', params: { state: 'on' } }],
      steps: [{ id: 's2', effects: [{ id: 'f2', kind: 'event.run', target: 'e2' }] }],
    }],
  },
  { id: 'e2', enabled: true, trigger: { kind: 'manual' }, steps: [{ id: 's3', effects: [{ id: 'f3', kind: 'log.message', params: { message: 'Hi' } }] }] },
];

describe('event export and import', () => {
  it('round-trips events through the exported text', () => {
    const parsed = parseEventsImport(serializeEvents(source, events));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.events[0]).toMatchObject({ id: 'e1', name: 'Bloodied', enabled: false, trigger: events[0].trigger });
    expect(parsed.data.events[0].steps?.[0].steps?.[0].effects[0]).toMatchObject({ kind: 'event.run', target: 'e2' });
    expect(parsed.data.widgets).toEqual({ 'hp-a': { type: 'HEALTH_BAR', title: 'Health' }, 'flag-a': { type: 'TOGGLE', title: 'Bloodied' } });
  });

  it('matches widgets by type and title, gives fresh ids and keeps links between events', () => {
    const parsed = parseEventsImport(serializeEvents(source, events));
    if (!parsed.ok) throw new Error(parsed.error);
    const plan = planEventsImport(target, parsed.data);
    const [first, second] = plan.events;
    expect(first.trigger.widgetId).toBe('hp-b');
    expect(first.steps[0].effects[0].widgetId).toBe('flag-a');
    expect(plan.missingWidgets).toBe(1);
    expect(first.id).not.toBe('e1');
    expect(first.steps[0].steps?.[0].effects[0].target).toBe(second.id);
    expect(first.enabled).toBe(false);
  });

  it('gives every step and effect an id of its own, even when the file has none or repeats them', () => {
    const effects = [{ kind: 'log.message', params: { message: 'a' } }, { id: 'dup', kind: 'log.message' }, { id: 'dup', kind: 'log.message' }];
    const parsed = parseEventsImport(JSON.stringify([{ trigger: { kind: 'manual' }, steps: [{ effects }, { id: 'dup', condition: '1', effects: [{ kind: 'log.message' }] }] }]));
    if (!parsed.ok) throw new Error(parsed.error);
    const [event] = planEventsImport(target, parsed.data).events;
    const ids = event.steps.flatMap((step) => [step.id, ...step.effects.map((effect) => effect.id)]);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('points jumps at the copied steps and effects', () => {
    const jumping: CharacterEvent = {
      id: 'e3',
      enabled: true,
      trigger: { kind: 'manual' },
      steps: [
        { id: 'j1', condition: '1', effects: [], otherwise: [{ id: 'jf', kind: 'log.message' }], jump: 'j2', otherwiseJump: 'end' },
        { id: 'j2', condition: '1', effects: [{ id: 'jg', kind: 'log.message' }], otherwiseJump: 'jf' },
      ],
    };
    const parsed = parseEventsImport(serializeEvents(source, [jumping]));
    if (!parsed.ok) throw new Error(parsed.error);
    const [event] = planEventsImport(target, parsed.data).events;
    expect(event.steps[0].jump).toBe(event.steps[1].id);
    expect(event.steps[0].otherwiseJump).toBe('end');
    expect(event.steps[1].otherwiseJump).toBe(event.steps[0].otherwise![0].id);
  });

  it('accepts a bare list and rejects text that is not events', () => {
    expect(parseEventsImport(JSON.stringify([events[1]])).ok).toBe(true);
    expect(parseEventsImport('nope').ok).toBe(false);
    expect(parseEventsImport('{"events": []}').ok).toBe(false);
    expect(parseEventsImport('{"events": [{"trigger": {}}]}').ok).toBe(false);
  });

  it('drops fields that are not part of an event', () => {
    const parsed = parseEventsImport(JSON.stringify([{ ...events[1], extra: 1, steps: [{ effects: [{ kind: 'log.message', params: { message: 'x', bad: 3 }, evil: true }] }] }]));
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.data.events[0]).not.toHaveProperty('extra');
    expect(parsed.data.events[0].steps?.[0].effects[0]).toEqual({ id: '', kind: 'log.message', params: { message: 'x' } });
  });
});
