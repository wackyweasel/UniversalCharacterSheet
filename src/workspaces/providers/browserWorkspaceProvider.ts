import type { Character } from '../../types';
import { migrateCharacter } from '../../utils/characterClone';
import type { StorageWorkspace, WorkspaceCharacterTimeline, WorkspaceMode } from '../types';
import { createWorkspaceDocument } from '../workspaceDocument';
import type { WorkspaceProvider } from './types';

export const BROWSER_WORKSPACE_ID = 'browser';
export const BROWSER_WORKSPACE_NAME = 'Browser';

const CHARACTER_STORAGE_KEY = 'ucs:store';
const TIMELINE_STORAGE_KEY = 'ucs:timeline';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

interface BrowserCharacterData {
  characters?: Character[];
  activeCharacterId?: string | null;
  mode?: WorkspaceMode;
}

interface BrowserTimelineData {
  eventsByCharacter?: Record<string, WorkspaceCharacterTimeline>;
  orderNewestFirst?: boolean;
  showFormulas?: boolean;
}

function parseStoredValue<T>(storage: StorageLike, key: string): T | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

export function createBrowserWorkspace(now = new Date()): StorageWorkspace {
  const timestamp = now.toISOString();
  return {
    id: BROWSER_WORKSPACE_ID,
    name: BROWSER_WORKSPACE_NAME,
    provider: 'browser',
    createdAt: timestamp,
    lastOpenedAt: timestamp,
  };
}

export function createBrowserWorkspaceProvider(storage: StorageLike = localStorage): WorkspaceProvider {
  return {
    async load(workspace) {
      const characterData = parseStoredValue<BrowserCharacterData>(storage, CHARACTER_STORAGE_KEY);
      const timelineData = parseStoredValue<BrowserTimelineData>(storage, TIMELINE_STORAGE_KEY);
      const characters = (characterData?.characters ?? []).map(migrateCharacter);

      return {
        document: createWorkspaceDocument({
          workspaceId: workspace.id,
          name: workspace.name,
          characters,
          eventsByCharacter: timelineData?.eventsByCharacter ?? {},
          activeCharacterId: characterData?.activeCharacterId,
          mode: characterData?.mode,
        }),
        fingerprint: null,
      };
    },

    async save(_workspace, document) {
      storage.setItem(CHARACTER_STORAGE_KEY, JSON.stringify({
        characters: document.characters,
        activeCharacterId: document.activeCharacterId,
        mode: document.activeCharacterId ? document.mode : 'play',
      }));

      const currentTimeline = parseStoredValue<BrowserTimelineData>(storage, TIMELINE_STORAGE_KEY);
      storage.setItem(TIMELINE_STORAGE_KEY, JSON.stringify({
        eventsByCharacter: document.eventsByCharacter,
        orderNewestFirst: currentTimeline?.orderNewestFirst ?? false,
        showFormulas: currentTimeline?.showFormulas ?? true,
      }));

      return { fingerprint: null };
    },
  };
}