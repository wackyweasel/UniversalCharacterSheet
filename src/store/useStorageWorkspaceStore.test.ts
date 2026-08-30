import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Character } from '../types';
import type { WorkspaceCacheRecord } from '../workspaces/workspaceRegistry';
import type { StorageWorkspace, WorkspaceDocument } from '../workspaces/types';
import { createWorkspaceDocument } from '../workspaces/workspaceDocument';
import type { WorkspaceDirectoryHandle } from '../workspaces/providers/directoryWorkspaceProvider';

const browserWorkspace: StorageWorkspace = {
  id: 'browser',
  name: 'Browser',
  provider: 'browser',
  createdAt: '2026-08-29T00:00:00.000Z',
  lastOpenedAt: '2026-08-29T00:00:00.000Z',
};

const directoryWorkspace: StorageWorkspace = {
  id: 'directory-1',
  name: 'Campaign',
  provider: 'directory',
  locationName: 'Campaign',
  createdAt: '2026-08-29T00:00:00.000Z',
  lastOpenedAt: '2026-08-29T00:00:00.000Z',
};

const character: Character = {
  id: 'character-1',
  name: 'Ada',
  sheets: [{ id: 'sheet-1', name: 'Main', widgets: [] }],
  activeSheetId: 'sheet-1',
};

const harness = vi.hoisted(() => ({
  workspaces: [] as StorageWorkspace[],
  activeWorkspaceId: 'browser',
  caches: new Map<string, WorkspaceCacheRecord>(),
  setCacheFailures: 0,
  directoryLoad: vi.fn<(workspace: StorageWorkspace) => Promise<{ document: WorkspaceDocument; fingerprint: string | null }>>(),
  directorySave: vi.fn<(workspace: StorageWorkspace, document: WorkspaceDocument, fingerprint: string | null) => Promise<{ fingerprint: string | null }>>(),
  openDirectory: vi.fn<(handle: WorkspaceDirectoryHandle) => Promise<{ document: WorkspaceDocument; fingerprint: string }>>(),
}));

vi.mock('../workspaces/workspaceRegistry', () => ({
  WorkspaceRegistry: class {
    async initialize() {
      return harness.workspaces;
    }

    getActiveWorkspaceId() {
      return harness.activeWorkspaceId;
    }

    setActiveWorkspaceId(workspaceId: string) {
      harness.activeWorkspaceId = workspaceId;
    }

    async getCache(workspaceId: string) {
      return harness.caches.get(workspaceId) ?? null;
    }

    async setCache(record: WorkspaceCacheRecord) {
      if (harness.setCacheFailures > 0) {
        harness.setCacheFailures -= 1;
        throw new Error('IndexedDB cache failed.');
      }
      harness.caches.set(record.workspaceId, record);
    }

    async putWorkspace(workspace: StorageWorkspace) {
      const existingIndex = harness.workspaces.findIndex((candidate) => candidate.id === workspace.id);
      if (existingIndex >= 0) harness.workspaces[existingIndex] = workspace;
      else harness.workspaces.push(workspace);
    }

    async setDirectoryHandle() {}
    async getDirectoryHandle() { return null; }
    async removeWorkspace(workspaceId: string) {
      harness.workspaces = harness.workspaces.filter((workspace) => workspace.id !== workspaceId);
      harness.caches.delete(workspaceId);
    }
  },
}));

vi.mock('../workspaces/providers/directoryWorkspaceProvider', async () => {
  const actual = await vi.importActual<typeof import('../workspaces/providers/directoryWorkspaceProvider')>(
    '../workspaces/providers/directoryWorkspaceProvider',
  );
  return {
    ...actual,
    createDirectoryWorkspaceProvider: () => ({
      load: harness.directoryLoad,
      save: harness.directorySave,
    }),
    openDirectoryWorkspace: harness.openDirectory,
  };
});

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    values,
  };
}

function installBrowserGlobals(indexedDbAvailable = true) {
  const storage = createStorage();
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('sessionStorage', createStorage());
  vi.stubGlobal('indexedDB', indexedDbAvailable ? {} : undefined);
  vi.stubGlobal('window', {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    matchMedia: () => ({ matches: false }),
  });
  return storage;
}

async function loadStores() {
  const [{ useStorageWorkspaceStore }, { useStore }] = await Promise.all([
    import('./useStorageWorkspaceStore'),
    import('./useStore'),
  ]);
  return { useStorageWorkspaceStore, useStore };
}

describe('storage workspace coordinator', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    harness.workspaces = [browserWorkspace, directoryWorkspace];
    harness.activeWorkspaceId = 'browser';
    harness.caches.clear();
    harness.setCacheFailures = 0;
    harness.directoryLoad.mockReset();
    harness.directorySave.mockReset();
    harness.openDirectory.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('hydrates the Browser workspace when IndexedDB is unavailable', async () => {
    installBrowserGlobals(false);
    const { useStorageWorkspaceStore } = await loadStores();

    await useStorageWorkspaceStore.getState().initialize();

    expect(useStorageWorkspaceStore.getState()).toMatchObject({
      activeWorkspaceId: 'browser',
      isHydrated: true,
      supportsExternalWorkspaces: false,
      syncStatus: 'synced',
    });
  });

  it('refuses to copy over an inactive workspace with pending edits', async () => {
    installBrowserGlobals();
    const { useStorageWorkspaceStore, useStore } = await loadStores();
    const pendingDocument = createWorkspaceDocument({
      workspaceId: directoryWorkspace.id,
      name: directoryWorkspace.name,
      characters: [{ ...character, name: 'Pending edit' }],
    });
    harness.caches.set(directoryWorkspace.id, {
      workspaceId: directoryWorkspace.id,
      document: pendingDocument,
      fingerprint: 'remote-1',
      pendingSync: true,
    });
    useStorageWorkspaceStore.setState({
      workspaces: harness.workspaces,
      activeWorkspaceId: 'browser',
      isHydrated: true,
    });
    useStore.getState()._replaceWorkspaceState({ characters: [character], activeCharacterId: null, mode: 'play' });

    await expect(useStorageWorkspaceStore.getState().copyCharacterToWorkspace(character.id, directoryWorkspace.id))
      .rejects.toThrow('Open and sync the target workspace');

    expect(harness.directoryLoad).not.toHaveBeenCalled();
    expect(harness.caches.get(directoryWorkspace.id)?.document).toEqual(pendingDocument);
  });

  it('recovers the save queue after an IndexedDB cache failure', async () => {
    installBrowserGlobals();
    harness.activeWorkspaceId = directoryWorkspace.id;
    const initialDocument = createWorkspaceDocument({
      workspaceId: directoryWorkspace.id,
      name: directoryWorkspace.name,
      characters: [character],
    });
    harness.directoryLoad.mockResolvedValue({ document: initialDocument, fingerprint: 'remote-1' });
    harness.directorySave.mockResolvedValue({ fingerprint: 'remote-2' });
    const { useStorageWorkspaceStore, useStore } = await loadStores();
    await useStorageWorkspaceStore.getState().initialize();

    harness.setCacheFailures = 1;
    useStore.getState()._replaceWorkspaceState({
      characters: [{ ...character, name: 'First edit' }],
      activeCharacterId: null,
      mode: 'play',
    });
    await vi.advanceTimersByTimeAsync(150);
    expect(useStorageWorkspaceStore.getState().syncStatus).toBe('pending');

    useStore.getState()._replaceWorkspaceState({
      characters: [{ ...character, name: 'Second edit' }],
      activeCharacterId: null,
      mode: 'play',
    });
    await vi.advanceTimersByTimeAsync(150);

    expect(harness.directorySave).toHaveBeenCalledTimes(1);
    expect(harness.directorySave.mock.calls[0][1].characters[0].name).toBe('Second edit');
    expect(useStorageWorkspaceStore.getState().syncStatus).toBe('synced');
  });

  it('waits for an in-flight autosave before applying and saving a restore', async () => {
    installBrowserGlobals();
    harness.activeWorkspaceId = directoryWorkspace.id;
    const initialDocument = createWorkspaceDocument({
      workspaceId: directoryWorkspace.id,
      name: directoryWorkspace.name,
      characters: [character],
    });
    harness.directoryLoad.mockResolvedValue({ document: initialDocument, fingerprint: 'remote-1' });
    let finishAutosave: (result: { fingerprint: string | null }) => void = () => undefined;
    const autosave = new Promise<{ fingerprint: string | null }>((resolve) => {
      finishAutosave = resolve;
    });
    harness.directorySave
      .mockImplementationOnce(() => autosave)
      .mockResolvedValueOnce({ fingerprint: 'remote-3' });
    const { useStorageWorkspaceStore, useStore } = await loadStores();
    await useStorageWorkspaceStore.getState().initialize();

    useStore.getState()._replaceWorkspaceState({
      characters: [{ ...character, name: 'Unsaved edit' }],
      activeCharacterId: null,
      mode: 'play',
    });
    await vi.advanceTimersByTimeAsync(150);
    expect(harness.directorySave).toHaveBeenCalledTimes(1);

    const restoredCharacter = { ...character, name: 'Restored' };
    const restoring = useStorageWorkspaceStore.getState().restoreActiveWorkspace({
      sourceFormat: 'backup',
      timestamp: '2026-08-29T00:00:00.000Z',
      characters: [restoredCharacter],
      eventsByCharacter: {},
      customThemes: [],
      templates: [],
      userPresets: [],
    });
    await Promise.resolve();
    expect(useStore.getState().characters[0].name).toBe('Unsaved edit');

    finishAutosave({ fingerprint: 'remote-2' });
    await restoring;

    expect(harness.directorySave).toHaveBeenCalledTimes(2);
    expect(harness.directorySave.mock.calls[1][1].characters[0].name).toBe('Restored');
    expect(useStore.getState().characters[0].name).toBe('Restored');
  });
});