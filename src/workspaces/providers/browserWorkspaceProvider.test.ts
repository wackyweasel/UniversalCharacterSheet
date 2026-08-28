import { describe, expect, it } from 'vitest';
import type { Character } from '../../types';
import { createWorkspaceDocument } from '../workspaceDocument';
import {
  createBrowserWorkspace,
  createBrowserWorkspaceProvider,
} from './browserWorkspaceProvider';

function createMemoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    values,
  };
}

const character: Character = {
  id: 'character-1',
  name: 'Ada',
  sheets: [{ id: 'sheet-1', name: 'Main', widgets: [] }],
  activeSheetId: 'sheet-1',
};

describe('browser workspace provider', () => {
  it('loads the existing character and timeline keys as the Browser workspace', async () => {
    const storage = createMemoryStorage({
      'ucs:store': JSON.stringify({ characters: [character], activeCharacterId: character.id, mode: 'edit' }),
      'ucs:timeline': JSON.stringify({
        eventsByCharacter: { [character.id]: { events: [], nextId: 1 } },
        orderNewestFirst: true,
        showFormulas: false,
      }),
    });

    const result = await createBrowserWorkspaceProvider(storage).load(createBrowserWorkspace());

    expect(result.document.characters).toEqual([character]);
    expect(result.document.activeCharacterId).toBe(character.id);
    expect(result.document.eventsByCharacter[character.id]).toEqual({ events: [], nextId: 1 });
  });

  it('saves workspace data without replacing global timeline preferences', async () => {
    const storage = createMemoryStorage({
      'ucs:timeline': JSON.stringify({ eventsByCharacter: {}, orderNewestFirst: true, showFormulas: false }),
    });
    const workspace = createBrowserWorkspace();
    const document = createWorkspaceDocument({
      workspaceId: workspace.id,
      name: workspace.name,
      characters: [character],
      eventsByCharacter: { [character.id]: { events: [], nextId: 2 } },
    });

    await createBrowserWorkspaceProvider(storage).save(workspace, document, null);

    expect(JSON.parse(storage.values.get('ucs:store')!)).toMatchObject({ characters: [character] });
    expect(JSON.parse(storage.values.get('ucs:timeline')!)).toEqual({
      eventsByCharacter: { [character.id]: { events: [], nextId: 2 } },
      orderNewestFirst: true,
      showFormulas: false,
    });
  });
});