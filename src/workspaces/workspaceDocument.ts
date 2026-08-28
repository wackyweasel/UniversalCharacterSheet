import type { Character, Sheet, Widget } from '../types';
import type { WorkspaceDocument, WorkspaceMode } from './types';

export const WORKSPACE_FORMAT = 'universal-character-sheet/workspace';
export const WORKSPACE_VERSION = 1;

const WORKSPACE_MODES = new Set<WorkspaceMode>(['play', 'edit', 'vertical', 'print']);

export class WorkspaceDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkspaceDocumentError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWidget(value: unknown): value is Widget {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.type === 'string'
    && typeof value.x === 'number'
    && typeof value.y === 'number'
    && isRecord(value.data);
}

function isSheet(value: unknown): value is Sheet {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && Array.isArray(value.widgets)
    && value.widgets.every(isWidget);
}

function isCharacter(value: unknown): value is Character {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.activeSheetId === 'string'
    && Array.isArray(value.sheets)
    && value.sheets.length > 0
    && value.sheets.every(isSheet);
}

function parseEventsByCharacter(value: unknown): WorkspaceDocument['eventsByCharacter'] {
  if (!isRecord(value)) throw new WorkspaceDocumentError('Workspace timeline data is invalid.');

  const parsed: WorkspaceDocument['eventsByCharacter'] = {};
  for (const [characterId, timeline] of Object.entries(value)) {
    if (!isRecord(timeline) || !Array.isArray(timeline.events) || typeof timeline.nextId !== 'number') {
      throw new WorkspaceDocumentError('Workspace timeline data is invalid.');
    }

    const eventsAreValid = timeline.events.every((event) => isRecord(event)
      && typeof event.id === 'string'
      && typeof event.timestamp === 'number'
      && typeof event.widgetLabel === 'string'
      && typeof event.widgetType === 'string'
      && typeof event.description === 'string'
      && typeof event.icon === 'string');
    if (!eventsAreValid) throw new WorkspaceDocumentError('Workspace timeline data is invalid.');

    parsed[characterId] = timeline as unknown as WorkspaceDocument['eventsByCharacter'][string];
  }
  return parsed;
}

export function createWorkspaceDocument(options: {
  workspaceId: string;
  name: string;
  characters?: Character[];
  eventsByCharacter?: WorkspaceDocument['eventsByCharacter'];
  activeCharacterId?: string | null;
  mode?: WorkspaceMode;
  revision?: number;
  updatedAt?: string;
}): WorkspaceDocument {
  const characters = options.characters ?? [];
  const activeCharacterId = characters.some((character) => character.id === options.activeCharacterId)
    ? options.activeCharacterId ?? null
    : null;

  return {
    format: WORKSPACE_FORMAT,
    version: WORKSPACE_VERSION,
    workspaceId: options.workspaceId,
    name: options.name,
    revision: options.revision ?? 0,
    updatedAt: options.updatedAt ?? new Date().toISOString(),
    characters,
    eventsByCharacter: options.eventsByCharacter ?? {},
    activeCharacterId,
    mode: activeCharacterId ? options.mode ?? 'play' : 'play',
  };
}

export function parseWorkspaceDocument(value: unknown): WorkspaceDocument {
  if (!isRecord(value)) throw new WorkspaceDocumentError('Workspace file is not a JSON object.');
  if (value.format !== WORKSPACE_FORMAT) throw new WorkspaceDocumentError('This is not a Universal Character Sheet workspace.');
  if (value.version !== WORKSPACE_VERSION) {
    throw new WorkspaceDocumentError(
      typeof value.version === 'number' && value.version > WORKSPACE_VERSION
        ? 'This workspace was created by a newer version of Universal Character Sheet.'
        : 'This workspace version is not supported.',
    );
  }
  if (typeof value.workspaceId !== 'string' || typeof value.name !== 'string') {
    throw new WorkspaceDocumentError('Workspace identity is invalid.');
  }
  if (!Number.isInteger(value.revision) || (value.revision as number) < 0 || typeof value.updatedAt !== 'string') {
    throw new WorkspaceDocumentError('Workspace revision metadata is invalid.');
  }
  if (!Array.isArray(value.characters) || !value.characters.every(isCharacter)) {
    throw new WorkspaceDocumentError('Workspace characters are invalid.');
  }
  if (typeof value.mode !== 'string' || !WORKSPACE_MODES.has(value.mode as WorkspaceMode)) {
    throw new WorkspaceDocumentError('Workspace mode is invalid.');
  }
  if (value.activeCharacterId !== null && typeof value.activeCharacterId !== 'string') {
    throw new WorkspaceDocumentError('Active character is invalid.');
  }

  return createWorkspaceDocument({
    workspaceId: value.workspaceId,
    name: value.name,
    revision: value.revision as number,
    updatedAt: value.updatedAt,
    characters: value.characters as Character[],
    eventsByCharacter: parseEventsByCharacter(value.eventsByCharacter),
    activeCharacterId: value.activeCharacterId,
    mode: value.mode as WorkspaceMode,
  });
}