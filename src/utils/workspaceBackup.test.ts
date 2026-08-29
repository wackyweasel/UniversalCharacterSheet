import { describe, expect, it } from 'vitest';
import type { Character } from '../types';
import { createWorkspaceDocument } from '../workspaces/workspaceDocument';
import { createWorkspaceBackup, parseRestorableWorkspaceFile, parseWorkspaceBackup } from './workspaceBackup';

const character: Character = {
  id: 'character-1',
  name: 'Ada',
  sheets: [{ id: 'sheet-1', name: 'Main', widgets: [] }],
  activeSheetId: 'sheet-1',
};

describe('workspace backups', () => {
  it('creates a complete backup of workspace-owned collections', () => {
    const backup = createWorkspaceBackup({
      characters: [character],
      eventsByCharacter: { [character.id]: { events: [], nextId: 2 } },
      customThemes: [],
      templates: [],
      userPresets: [],
    }, '2026-08-28T12:00:00.000Z');

    expect(backup).toEqual({
      version: 1,
      timestamp: '2026-08-28T12:00:00.000Z',
      characters: [character],
      eventsByCharacter: { [character.id]: { events: [], nextId: 2 } },
      customThemes: [],
      templates: [],
      userPresets: [],
    });
  });

  it('preserves omitted library collections in legacy backups', () => {
    const backup = parseWorkspaceBackup({
      version: 1,
      timestamp: '2026-08-28T12:00:00.000Z',
      characters: [character],
    });

    expect(backup.customThemes).toBeUndefined();
    expect(backup.templates).toBeUndefined();
    expect(backup.userPresets).toBeUndefined();
    expect(backup.eventsByCharacter).toBeUndefined();
  });

  it('rejects malformed backups', () => {
    expect(() => parseWorkspaceBackup({ version: 1, timestamp: 'today', characters: 'invalid' })).toThrow('Workspace characters are invalid.');
    expect(() => parseWorkspaceBackup({
      version: 1,
      timestamp: 'today',
      characters: [character],
      templates: {},
    })).toThrow('Workspace templates are invalid.');
  });

  it('accepts a workspace document as restore input', () => {
    const document = createWorkspaceDocument({
      workspaceId: 'workspace-1',
      name: 'Campaign',
      characters: [character],
      eventsByCharacter: { [character.id]: { events: [], nextId: 3 } },
      activeCharacterId: character.id,
      mode: 'edit',
    });

    const restored = parseRestorableWorkspaceFile(document);

    expect(restored.sourceFormat).toBe('workspace');
    expect(restored.eventsByCharacter).toEqual(document.eventsByCharacter);
    expect(restored.activeCharacterId).toBe(character.id);
    expect(restored.mode).toBe('edit');
  });
});