import { describe, expect, it } from 'vitest';
import type { Character, CharacterEvent } from '../types';
import { cloneCharacterForWorkspace, migrateCharacter } from './characterClone';

const character: Character = {
  id: 'character-1',
  name: 'Ada',
  sheets: [{
    id: 'sheet-1',
    name: 'Main',
    widgets: [
      {
        id: 'widget-1',
        type: 'TEXT',
        x: 0,
        y: 0,
        groupId: 'group-1',
        attachedTo: ['widget-2'],
        data: { text: 'First' },
      },
      {
        id: 'widget-2',
        type: 'TEXT',
        x: 1,
        y: 1,
        groupId: 'group-1',
        attachedTo: ['widget-1'],
        data: { text: 'Second' },
      },
    ],
  }],
  activeSheetId: 'sheet-1',
};

describe('cloneCharacterForWorkspace', () => {
  it('keeps content and remaps every structural identity and reference', () => {
    const clone = cloneCharacterForWorkspace(character);
    const [first, second] = clone.sheets[0].widgets;

    expect(clone.name).toBe(character.name);
    expect(clone.id).not.toBe(character.id);
    expect(clone.sheets[0].id).not.toBe(character.sheets[0].id);
    expect(clone.activeSheetId).toBe(clone.sheets[0].id);
    expect(first.id).not.toBe('widget-1');
    expect(second.id).not.toBe('widget-2');
    expect(first.groupId).toBe(second.groupId);
    expect(first.groupId).not.toBe('group-1');
    expect(first.attachedTo).toEqual([second.id]);
    expect(second.attachedTo).toEqual([first.id]);
  });

  it('points copied events at the copied widgets', () => {
    const clone = cloneCharacterForWorkspace({
      ...character,
      events: [{
        id: 'event-1',
        enabled: true,
        trigger: { kind: 'notes.changed', widgetId: 'widget-1' },
        steps: [{ id: 'step-1', effects: [{ id: 'effect-1', kind: 'notes.append', widgetId: 'widget-2', params: { text: 'Hi' } }] }],
      }],
    });
    const [first, second] = clone.sheets[0].widgets;
    const [event] = clone.events!;

    expect(event.id).not.toBe('event-1');
    expect(event.trigger.widgetId).toBe(first.id);
    expect(event.steps[0].effects[0]).toMatchObject({ widgetId: second.id, params: { text: 'Hi' } });
    expect(event.steps[0].effects[0].id).not.toBe('effect-1');
    expect(event.steps[0].id).not.toBe('step-1');
  });

  it('points "run another event" effects at the copied events, including otherwise branches', () => {
    const clone = cloneCharacterForWorkspace({
      ...character,
      events: [
        { id: 'event-1', enabled: true, trigger: { kind: 'manual' }, steps: [{ id: 's1', effects: [{ id: 'effect-1', kind: 'event.run', target: 'event-2' }], condition: '1', otherwise: [{ id: 'effect-3', kind: 'event.run', target: 'event-2' }] }] },
        { id: 'event-2', enabled: true, trigger: { kind: 'manual' }, steps: [{ id: 's2', effects: [{ id: 'effect-2', kind: 'event.run', target: 'gone' }] }] },
      ],
    });
    const [first, second] = clone.events!;

    expect(second.id).not.toBe('event-2');
    expect(first.steps[0].effects[0].target).toBe(second.id);
    expect(first.steps[0].otherwise?.[0].target).toBe(second.id);
    expect(second.steps[0].effects[0].target).toBe('gone');
  });

  it('turns events saved with one condition and one list of effects into a step', () => {
    const legacy = { id: 'event-1', enabled: true, trigger: { kind: 'manual' }, condition: '@hp > 1', effects: [{ id: 'effect-1', kind: 'log.message', params: { message: 'Hi' } }] };
    const migrated = migrateCharacter({ ...character, events: [legacy as unknown as CharacterEvent] });
    expect(migrated.events![0]).not.toHaveProperty('effects');
    expect(migrated.events![0].steps).toEqual([expect.objectContaining({ condition: '@hp > 1', effects: legacy.effects })]);
    expect(migrateCharacter(migrated).events![0]).toBe(migrated.events![0]);
  });
});

describe('migrateCharacter', () => {
  it('snaps widget positions and dimensions to the canvas grid', () => {
    const migrated = migrateCharacter({
      ...character,
      sheets: [{
        ...character.sheets[0],
        widgets: [{
          id: 'widget-3',
          type: 'TOGGLE',
          x: 13,
          y: 27,
          w: 32,
          h: 48,
          data: {},
        }],
      }],
    });

    expect(migrated.sheets[0].widgets[0]).toMatchObject({
      x: 10,
      y: 30,
      w: 30,
      h: 50,
    });
  });
});