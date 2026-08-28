import { describe, expect, it } from 'vitest';
import type { Character } from '../types';
import {
  createWorkspaceDocument,
  parseWorkspaceDocument,
  WorkspaceDocumentError,
} from './workspaceDocument';

const character: Character = {
  id: 'character-1',
  name: 'Ada',
  sheets: [{ id: 'sheet-1', name: 'Main', widgets: [] }],
  activeSheetId: 'sheet-1',
};

describe('workspace documents', () => {
  it('round-trips a valid version 1 document', () => {
    const document = createWorkspaceDocument({
      workspaceId: 'workspace-1',
      name: 'Campaign',
      characters: [character],
      activeCharacterId: character.id,
      mode: 'edit',
    });

    expect(parseWorkspaceDocument(JSON.parse(JSON.stringify(document)))).toEqual(document);
  });

  it('normalizes an active character that is not in the workspace', () => {
    const document = createWorkspaceDocument({
      workspaceId: 'workspace-1',
      name: 'Campaign',
      characters: [character],
      activeCharacterId: 'missing',
      mode: 'edit',
    });

    expect(document.activeCharacterId).toBeNull();
    expect(document.mode).toBe('play');
  });

  it('rejects documents from a newer application version', () => {
    const document = createWorkspaceDocument({ workspaceId: 'workspace-1', name: 'Campaign' });

    expect(() => parseWorkspaceDocument({ ...document, version: 2 })).toThrowError(
      new WorkspaceDocumentError('This workspace was created by a newer version of Universal Character Sheet.'),
    );
  });

  it('rejects malformed character data', () => {
    const document = createWorkspaceDocument({ workspaceId: 'workspace-1', name: 'Campaign' });

    expect(() => parseWorkspaceDocument({ ...document, characters: [{ id: 'broken' }] })).toThrow(
      'Workspace characters are invalid.',
    );
  });
});