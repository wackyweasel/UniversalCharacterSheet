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

const driveWorkspace: StorageWorkspace = {
  id: 'drive-1',
  name: 'Drive Campaign',
  provider: 'google-drive',
  driveFileId: 'file-1',
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
  driveAccessToken: null as string | null,
  restoreDriveToken: vi.fn<() => Promise<string | null>>(),
  driveLoad: vi.fn<(workspace: StorageWorkspace) => Promise<{ document: WorkspaceDocument; fingerprint: string | null }>>(),
  driveSave: vi.fn<(workspace: StorageWorkspace, document: WorkspaceDocument, fingerprint: string | null) => Promise<{ fingerprint: string | null }>>(),
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

vi.mock('../workspaces/providers/googleDriveWorkspaceProvider', () => ({
  createGoogleDriveWorkspaceProvider: () => ({
    load: harness.driveLoad,
    save: harness.driveSave,
  }),
}));

vi.mock('../workspaces/google/googleClient', () => ({
  authorizeGoogleDrive: vi.fn(),
  clearGoogleDriveAccessToken: () => { harness.driveAccessToken = null; },
  getGoogleDriveAccessToken: () => harness.driveAccessToken,
  pickGoogleDriveWorkspace: vi.fn(),
  restoreGoogleDriveAccessToken: harness.restoreDriveToken,
}));

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
    harness.driveAccessToken = null;
    harness.restoreDriveToken.mockReset().mockImplementation(async () => {
      harness.driveAccessToken = 'restored-token';
      return harness.driveAccessToken;
    });
    harness.driveLoad.mockReset();
    harness.driveSave.mockReset();
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

  it('loads a cached Drive workspace without attempting background authorization', async () => {
    installBrowserGlobals();
    harness.workspaces = [browserWorkspace, driveWorkspace];
    harness.activeWorkspaceId = driveWorkspace.id;
    const cachedDocument = createWorkspaceDocument({
      workspaceId: driveWorkspace.id,
      name: driveWorkspace.name,
      characters: [character],
    });
    harness.caches.set(driveWorkspace.id, {
      workspaceId: driveWorkspace.id,
      document: cachedDocument,
      fingerprint: 'remote-1',
      pendingSync: false,
    });
    const { useStorageWorkspaceStore, useStore } = await loadStores();

    await useStorageWorkspaceStore.getState().initialize();

    expect(harness.restoreDriveToken).not.toHaveBeenCalled();
    expect(harness.driveLoad).not.toHaveBeenCalled();
    expect(useStore.getState().characters).toEqual([character]);
    expect(useStorageWorkspaceStore.getState()).toMatchObject({
      activeWorkspaceId: driveWorkspace.id,
      isHydrated: true,
      syncStatus: 'reconnect',
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

  it('continues external persistence after an IndexedDB cache failure', async () => {
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
    expect(harness.directorySave).toHaveBeenCalledTimes(1);
    expect(harness.directorySave.mock.calls[0][1].characters[0].name).toBe('First edit');
    expect(useStorageWorkspaceStore.getState().syncStatus).toBe('synced');

    useStore.getState()._replaceWorkspaceState({
      characters: [{ ...character, name: 'Second edit' }],
      activeCharacterId: null,
      mode: 'play',
    });
    await vi.advanceTimersByTimeAsync(150);

    expect(harness.directorySave).toHaveBeenCalledTimes(2);
    expect(harness.directorySave.mock.calls[1][1].characters[0].name).toBe('Second edit');
    expect(useStorageWorkspaceStore.getState().syncStatus).toBe('synced');
  });

  it('coalesces autosaves queued behind an in-flight save to the latest state', async () => {
    installBrowserGlobals();
    harness.activeWorkspaceId = directoryWorkspace.id;
    const initialDocument = createWorkspaceDocument({
      workspaceId: directoryWorkspace.id,
      name: directoryWorkspace.name,
      characters: [character],
    });
    harness.directoryLoad.mockResolvedValue({ document: initialDocument, fingerprint: 'remote-1' });
    let finishFirstSave: (result: { fingerprint: string | null }) => void = () => undefined;
    let finishTrailingSave: (result: { fingerprint: string | null }) => void = () => undefined;
    harness.directorySave
      .mockImplementationOnce(() => new Promise((resolve) => { finishFirstSave = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { finishTrailingSave = resolve; }));
    const { useStorageWorkspaceStore, useStore } = await loadStores();
    await useStorageWorkspaceStore.getState().initialize();

    useStore.getState()._replaceWorkspaceState({
      characters: [{ ...character, name: 'First edit' }],
      activeCharacterId: null,
      mode: 'play',
    });
    await vi.advanceTimersByTimeAsync(150);
    expect(harness.directorySave).toHaveBeenCalledTimes(1);

    useStore.getState()._replaceWorkspaceState({
      characters: [{ ...character, name: 'Second edit' }],
      activeCharacterId: null,
      mode: 'play',
    });
    await vi.advanceTimersByTimeAsync(150);
    useStore.getState()._replaceWorkspaceState({
      characters: [{ ...character, name: 'Latest edit' }],
      activeCharacterId: null,
      mode: 'play',
    });
    await vi.advanceTimersByTimeAsync(150);
    expect(harness.directorySave).toHaveBeenCalledTimes(1);

    finishFirstSave({ fingerprint: 'remote-2' });
    await vi.advanceTimersByTimeAsync(0);

    expect(harness.directorySave).toHaveBeenCalledTimes(2);
    expect(harness.directorySave.mock.calls[1][1].characters[0].name).toBe('Latest edit');

    finishTrailingSave({ fingerprint: 'remote-3' });
    await vi.advanceTimersByTimeAsync(0);

    expect(harness.directorySave).toHaveBeenCalledTimes(2);
    expect(useStorageWorkspaceStore.getState().syncStatus).toBe('synced');
  });

  it('keeps the switching guard active until the target workspace finishes loading', async () => {
    installBrowserGlobals();
    const targetDocument = createWorkspaceDocument({
      workspaceId: directoryWorkspace.id,
      name: directoryWorkspace.name,
      characters: [character],
    });
    let finishLoad: (result: { document: WorkspaceDocument; fingerprint: string | null }) => void = () => undefined;
    const targetLoad = new Promise<{ document: WorkspaceDocument; fingerprint: string | null }>((resolve) => {
      finishLoad = resolve;
    });
    harness.directoryLoad.mockReturnValue(targetLoad);
    const { useStorageWorkspaceStore } = await loadStores();
    await useStorageWorkspaceStore.getState().initialize();

    const switching = useStorageWorkspaceStore.getState().switchWorkspace(directoryWorkspace.id);
    expect(useStorageWorkspaceStore.getState().isSwitchingWorkspace).toBe(true);

    finishLoad({ document: targetDocument, fingerprint: 'remote-1' });
    await switching;

    expect(useStorageWorkspaceStore.getState()).toMatchObject({
      activeWorkspaceId: directoryWorkspace.id,
      isSwitchingWorkspace: false,
      syncStatus: 'synced',
    });
  });

  it('leaves an uncached load failure in an actionable error state', async () => {
    const storage = installBrowserGlobals();
    harness.activeWorkspaceId = directoryWorkspace.id;
    const initialDocument = createWorkspaceDocument({
      workspaceId: directoryWorkspace.id,
      name: directoryWorkspace.name,
      characters: [character],
    });
    harness.directoryLoad.mockResolvedValue({ document: initialDocument, fingerprint: 'remote-1' });
    const { useStorageWorkspaceStore } = await loadStores();
    await useStorageWorkspaceStore.getState().initialize();
    storage.values.set('ucs:store', '{broken');

    await expect(useStorageWorkspaceStore.getState().switchWorkspace(browserWorkspace.id)).rejects.toThrow();

    expect(useStorageWorkspaceStore.getState()).toMatchObject({
      activeWorkspaceId: directoryWorkspace.id,
      isSwitchingWorkspace: false,
      syncStatus: 'error',
    });
  });

  it('silently restores Drive authorization before copying to an inactive workspace', async () => {
    installBrowserGlobals();
    const targetDocument = createWorkspaceDocument({
      workspaceId: driveWorkspace.id,
      name: driveWorkspace.name,
    });
    harness.driveLoad.mockResolvedValue({ document: targetDocument, fingerprint: 'remote-1' });
    harness.driveSave.mockResolvedValue({ fingerprint: 'remote-2' });
    const { useStorageWorkspaceStore, useStore } = await loadStores();
    useStorageWorkspaceStore.setState({
      workspaces: [browserWorkspace, driveWorkspace],
      activeWorkspaceId: browserWorkspace.id,
      isHydrated: true,
    });
    useStore.getState()._replaceWorkspaceState({ characters: [character], activeCharacterId: null, mode: 'play' });

    await useStorageWorkspaceStore.getState().copyCharacterToWorkspace(character.id, driveWorkspace.id);

    expect(harness.restoreDriveToken).toHaveBeenCalledOnce();
    expect(harness.driveLoad).toHaveBeenCalledOnce();
    expect(harness.driveSave).toHaveBeenCalledOnce();
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