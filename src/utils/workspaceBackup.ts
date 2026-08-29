import type { RestorableWorkspaceData, WorkspaceData } from '../workspaces/types';
import {
  parseLegacyRestorableWorkspaceData,
  parseWorkspaceDocument,
} from '../workspaces/workspaceDocument';

export interface WorkspaceBackupData extends WorkspaceData {
  version: 1;
  timestamp: string;
}

export interface ParsedWorkspaceBackup extends RestorableWorkspaceData {
  version: 1;
  timestamp: string;
}

export interface RestorableWorkspaceFile extends RestorableWorkspaceData {
  sourceFormat: 'backup' | 'workspace';
  timestamp: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createWorkspaceBackup(
  source: WorkspaceData,
  timestamp = new Date().toISOString(),
): WorkspaceBackupData {
  return {
    version: 1,
    timestamp,
    ...source,
  };
}

export function parseWorkspaceBackup(value: unknown): ParsedWorkspaceBackup {
  if (!isRecord(value) || value.version !== 1) {
    throw new Error('Invalid backup file format.');
  }
  if (typeof value.timestamp !== 'string') {
    throw new Error('Invalid backup file format.');
  }

  return {
    version: 1,
    timestamp: value.timestamp,
    ...parseLegacyRestorableWorkspaceData(value),
  };
}

export function parseRestorableWorkspaceFile(value: unknown): RestorableWorkspaceFile {
  if (isRecord(value) && value.format === 'universal-character-sheet/workspace') {
    const document = parseWorkspaceDocument(value);
    return {
      sourceFormat: 'workspace',
      timestamp: document.updatedAt,
      characters: document.characters,
      eventsByCharacter: document.eventsByCharacter,
      customThemes: document.customThemes,
      templates: document.templates,
      userPresets: document.userPresets,
      activeCharacterId: document.activeCharacterId,
      mode: document.mode,
    };
  }

  const backup = parseWorkspaceBackup(value);
  return {
    sourceFormat: 'backup',
    timestamp: backup.timestamp,
    characters: backup.characters,
    eventsByCharacter: backup.eventsByCharacter,
    customThemes: backup.customThemes,
    templates: backup.templates,
    userPresets: backup.userPresets,
  };
}