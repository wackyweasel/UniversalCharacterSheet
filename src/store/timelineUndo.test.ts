import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Character } from '../types';
import { useStore } from './useStore';
import { useUndoStore } from './useUndoStore';
import { addTimelineEvent, useTimelineStore } from './useTimelineStore';

vi.hoisted(() => {
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem: () => undefined,
  });
  vi.stubGlobal('window', {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({}));
});

const character: Character = {
  id: 'character-1',
  name: 'Test Character',
  activeSheetId: 'sheet-1',
  sheets: [{
    id: 'sheet-1',
    name: 'Main',
    widgets: [{ id: 'toggle-1', type: 'TOGGLE', x: 0, y: 0, data: { toggleState: false } }],
  }],
};

const events = () => useTimelineStore.getState().eventsByCharacter[character.id]?.events ?? [];

describe('timeline and undo', () => {
  beforeEach(() => {
    useUndoStore.getState().clearAllHistory();
    useTimelineStore.getState().replaceWorkspaceEvents({});
    useStore.getState()._replaceWorkspaceState({
      characters: [character],
      activeCharacterId: character.id,
      mode: 'play',
    });
  });

  it('removes the event of an undone change and brings it back on redo', () => {
    useStore.getState().updateWidgetData('toggle-1', { toggleState: true });
    addTimelineEvent('Switch', 'TOGGLE', 'On', 'ON');
    expect(events()).toHaveLength(1);

    useStore.getState().undo();
    expect(events()).toHaveLength(0);

    useStore.getState().redo();
    expect(events().map((event) => event.description)).toEqual(['On']);

    useStore.getState().undo();
    expect(events()).toHaveLength(0);
  });

  it('keeps events that are not tied to an undoable change', () => {
    addTimelineEvent('Dice', 'DICE_ROLLER', 'Rolled 1d20 = 12', 'dice');
    useStore.getState().updateWidgetData('toggle-1', { toggleState: true });
    addTimelineEvent('Switch', 'TOGGLE', 'On', 'ON');

    useStore.getState().undo();
    expect(events().map((event) => event.description)).toEqual(['Rolled 1d20 = 12']);
  });
});
