import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Character } from '../types';
import { useStore } from './useStore';
import { useUndoStore } from './useUndoStore';

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

const hero: Character = {
  id: 'c1',
  name: 'Hero',
  activeSheetId: 's1',
  sheets: [{
    id: 's1',
    name: 'Main',
    widgets: [
      { id: 'table', type: 'TABLE', x: 40, y: 60, w: 200, h: 100, groupId: 'g1', data: { label: 'Gear', columns: ['Name', 'Qty'], rows: [{ cells: ['Rope', '2'] }, { cells: ['Torch', '5'] }] } },
    ],
  }],
};

const widget = () => useStore.getState().characters[0].sheets[0].widgets[0];

describe('convertWidget', () => {
  beforeEach(() => {
    useUndoStore.getState().clearAllHistory();
    useStore.getState()._replaceWorkspaceState({ characters: [hero], activeCharacterId: hero.id, mode: 'play' });
  });

  it('changes the type in place, honouring the picked item and a taller height', () => {
    useStore.getState().convertWidget('table', 'LIST', { choice: 1, height: 233 });

    expect(widget()).toMatchObject({ id: 'table', type: 'LIST', x: 40, y: 60, w: 200, groupId: 'g1' });
    expect(widget().data).toMatchObject({ label: 'Gear', items: ['2', '5'] });
    expect(widget().data.rows).toBeUndefined();
    expect(widget().h).toBe(230);
  });

  it('keeps the size when no height is given, and is undone in one step', () => {
    useStore.getState().convertWidget('table', 'CHECKBOX');
    expect(widget().type).toBe('CHECKBOX');
    expect(widget().h).toBe(100);

    useStore.getState().undo();
    expect(widget().type).toBe('TABLE');
    expect(widget().data.rows).toHaveLength(2);
  });

  it('ignores a target the widget cannot convert to', () => {
    useStore.getState().convertWidget('table', 'CALENDAR');
    expect(widget().type).toBe('TABLE');
  });
});
