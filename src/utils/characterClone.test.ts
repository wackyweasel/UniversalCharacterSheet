import { describe, expect, it } from 'vitest';
import type { Character } from '../types';
import { cloneCharacterForWorkspace } from './characterClone';

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
});