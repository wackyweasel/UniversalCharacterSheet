import { describe, expect, it } from 'vitest';
import type { Character } from '../types';
import { createDefaultCustomTheme } from '../store/useCustomThemeStore';
import type { AnyTemplate } from '../store/useTemplateStore';
import type { UserPreset } from '../store/useUserPresetStore';
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
const { id: _characterId, ...presetCharacter } = character;
const customTheme = { ...createDefaultCustomTheme(), id: 'theme-1' };
const template: AnyTemplate = {
  id: 'template-1',
  name: 'Label',
  type: 'LABEL',
  data: { label: 'Name' },
  createdAt: 1,
};
const userPreset: UserPreset = {
  id: 'preset-1',
  name: 'Ada preset',
  preset: presetCharacter,
  createdAt: 1,
};

describe('workspace documents', () => {
  it('round-trips a valid version 1 document', () => {
    const document = createWorkspaceDocument({
      workspaceId: 'workspace-1',
      name: 'Campaign',
      characters: [character],
      activeCharacterId: character.id,
      mode: 'edit',
      customThemes: [customTheme],
      templates: [template],
      userPresets: [userPreset],
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

  it('preserves absent library fields from legacy workspace files', () => {
    const document = createWorkspaceDocument({ workspaceId: 'workspace-1', name: 'Campaign' });
    delete document.customThemes;
    delete document.templates;
    delete document.userPresets;

    const parsed = parseWorkspaceDocument(document);

    expect(parsed.customThemes).toBeUndefined();
    expect(parsed.templates).toBeUndefined();
    expect(parsed.userPresets).toBeUndefined();
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