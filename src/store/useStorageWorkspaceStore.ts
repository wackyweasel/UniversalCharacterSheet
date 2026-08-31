import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from './useStore';
import { useTimelineStore } from './useTimelineStore';
import { useUndoStore } from './useUndoStore';
import { useCustomThemeStore } from './useCustomThemeStore';
import { useTemplateStore } from './useTemplateStore';
import { useUserPresetStore } from './useUserPresetStore';
import type { Character } from '../types';
import { cloneCharacterForWorkspace } from '../utils/characterClone';
import { includeCharacterCustomTheme } from '../utils/characterTransfer';
import type { RestorableWorkspaceFile } from '../utils/workspaceBackup';
import type { StorageWorkspace, WorkspaceDocument } from '../workspaces/types';
import { createWorkspaceDocument } from '../workspaces/workspaceDocument';
import { WorkspaceRegistry } from '../workspaces/workspaceRegistry';
import {
  BROWSER_WORKSPACE_ID,
  createBrowserWorkspace,
  createBrowserWorkspaceProvider,
  resetBrowserWorkspaceStorage,
} from '../workspaces/providers/browserWorkspaceProvider';
import {
  createDirectoryWorkspace,
  createDirectoryWorkspaceProvider,
  openDirectoryWorkspace,
  reconnectDirectoryWorkspace,
  type WorkspaceDirectoryHandle,
} from '../workspaces/providers/directoryWorkspaceProvider';
import {
  WorkspaceConflictError,
  WorkspaceReconnectRequiredError,
  type WorkspaceProvider,
} from '../workspaces/providers/types';
import { createGoogleDriveWorkspaceProvider } from '../workspaces/providers/googleDriveWorkspaceProvider';
import {
  createDriveWorkspaceFile,
  getDriveFingerprint,
  tagDriveWorkspaceFile,
} from '../workspaces/google/driveApi';
import {
  authorizeGoogleDrive,
  clearGoogleDriveAccessToken,
  getGoogleDriveAccessToken,
  pickGoogleDriveWorkspace,
  restoreGoogleDriveAccessToken,
} from '../workspaces/google/googleClient';

type WorkspaceSyncStatus = 'idle' | 'loading' | 'saving' | 'synced' | 'pending' | 'reconnect' | 'conflict' | 'error';

export interface WorkspaceTransferSelection {
  characterIds: string[];
  presetIds: string[];
  themeIds: string[];
  templateIds: string[];
}

interface StorageWorkspaceState {
  workspaces: StorageWorkspace[];
  activeWorkspaceId: string;
  supportsExternalWorkspaces: boolean;
  isHydrated: boolean;
  isSwitchingWorkspace: boolean;
  syncStatus: WorkspaceSyncStatus;
  error: string | null;
  conflict: WorkspaceConflictError | null;
  initialize: () => Promise<void>;
  resetBrowserWorkspace: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  addDirectoryWorkspace: (handle: WorkspaceDirectoryHandle) => Promise<void>;
  openDirectoryWorkspace: (handle: WorkspaceDirectoryHandle) => Promise<void>;
  addGoogleDriveWorkspace: (name: string) => Promise<void>;
  openGoogleDriveWorkspace: () => Promise<void>;
  reconnectDirectoryWorkspace: (workspaceId: string, handle?: WorkspaceDirectoryHandle) => Promise<void>;
  reconnectGoogleDriveWorkspace: (workspaceId: string) => Promise<void>;
  copyCharacterToWorkspace: (characterId: string, targetWorkspaceId: string) => Promise<void>;
  getWorkspaceContents: (workspaceId: string) => Promise<WorkspaceDocument>;
  transferWorkspaceData: (
    sourceWorkspaceId: string,
    targetWorkspaceId: string,
    selection: WorkspaceTransferSelection,
    mode: 'copy' | 'move',
  ) => Promise<void>;
  resolveConflict: (resolution: 'remote' | 'local') => Promise<void>;
  saveConflictAsNewDirectory: (handle: WorkspaceDirectoryHandle) => Promise<void>;
  saveConflictAsNewGoogleDrive: (name: string) => Promise<void>;
  restoreActiveWorkspace: (source: RestorableWorkspaceFile) => Promise<void>;
  forgetWorkspace: (workspaceId: string) => Promise<void>;
}

let registry = typeof indexedDB === 'undefined' ? null : new WorkspaceRegistry();
const browserProvider = createBrowserWorkspaceProvider();
const directoryProvider = createDirectoryWorkspaceProvider((workspaceId) => (
  registry?.getDirectoryHandle(workspaceId) ?? Promise.resolve(null)
));
const googleDriveProvider = createGoogleDriveWorkspaceProvider(getGoogleDriveAccessToken);

let currentDocument: WorkspaceDocument | null = null;
let currentFingerprint: string | null = null;
let suppressPersistence = true;
let subscriptionsStarted = false;
let saveTimeout: number | null = null;
let saveQueue: Promise<void> = Promise.resolve();
let saveInProgress = false;
let saveRequested = false;

function requireRegistry(): WorkspaceRegistry {
  if (!registry) throw new Error('External workspaces are unavailable in this browser.');
  return registry;
}

function getProvider(workspace: StorageWorkspace): WorkspaceProvider {
  if (workspace.provider === 'browser') return browserProvider;
  if (workspace.provider === 'directory') return directoryProvider;
  return googleDriveProvider;
}

async function flushActiveWorkspaceSave(): Promise<void> {
  if (saveTimeout !== null) {
    window.clearTimeout(saveTimeout);
    saveTimeout = null;
    enqueueSave();
  }
  await saveQueue;
}

async function readWorkspaceDocument(workspace: StorageWorkspace): Promise<{ document: WorkspaceDocument; fingerprint: string | null }> {
  const isActive = workspace.id === useStorageWorkspaceStore.getState().activeWorkspaceId;
  if (isActive) {
    await flushActiveWorkspaceSave();
    return { document: captureWorkspaceDocument(workspace), fingerprint: currentFingerprint };
  }

  const cache = workspace.provider === 'browser' ? null : await requireRegistry().getCache(workspace.id);
  if (cache?.pendingSync) {
    throw new Error(`Open and sync ${workspace.name} before transferring workspace data.`);
  }
  if (workspace.provider === 'google-drive' && !getGoogleDriveAccessToken()) {
    await restoreGoogleDriveAccessToken();
  }
  return getProvider(workspace).load(workspace);
}

async function saveWorkspaceDocument(
  workspace: StorageWorkspace,
  document: WorkspaceDocument,
  fingerprint: string | null,
): Promise<string | null> {
  const result = await getProvider(workspace).save(workspace, document, fingerprint);
  if (workspace.provider !== 'browser') {
    await requireRegistry().setCache({
      workspaceId: workspace.id,
      document,
      fingerprint: result.fingerprint,
      pendingSync: false,
    });
  }
  return result.fingerprint;
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const incomingById = new Map(incoming.map((item) => [item.id, item]));
  const existingIds = new Set(existing.map((item) => item.id));
  return [
    ...existing.map((item) => incomingById.get(item.id) ?? item),
    ...incoming.filter((item) => !existingIds.has(item.id)),
  ];
}

function applyWorkspaceDocument(document: WorkspaceDocument, restoreActiveCharacter = true): void {
  useUndoStore.getState().clearAllHistory();
  useCustomThemeStore.getState().replaceCustomThemes(document.customThemes);
  useTemplateStore.getState().replaceTemplates(document.templates);
  useUserPresetStore.getState().replaceUserPresets(document.userPresets);
  useStore.getState()._replaceWorkspaceState({
    characters: document.characters,
    activeCharacterId: restoreActiveCharacter ? document.activeCharacterId : null,
    mode: restoreActiveCharacter ? document.mode : 'play',
  });
  useTimelineStore.getState().replaceWorkspaceEvents(document.eventsByCharacter);
}

function captureWorkspaceDocument(workspace: StorageWorkspace): WorkspaceDocument {
  const characterState = useStore.getState();
  const transientIds = new Set(characterState.transientCharacterIds);
  const characters = characterState.characters.filter((character) => !transientIds.has(character.id));
  const activeCharacterId = characterState.activeCharacterId && !transientIds.has(characterState.activeCharacterId)
    ? characterState.activeCharacterId
    : null;

  return createWorkspaceDocument({
    workspaceId: workspace.id,
    name: workspace.name,
    characters,
    eventsByCharacter: useTimelineStore.getState().eventsByCharacter,
    activeCharacterId,
    mode: characterState.mode,
    customThemes: useCustomThemeStore.getState().customThemes,
    templates: useTemplateStore.getState().templates,
    userPresets: useUserPresetStore.getState().userPresets,
    revision: (currentDocument?.revision ?? 0) + 1,
  });
}

async function persistActiveWorkspace(): Promise<void> {
  const state = useStorageWorkspaceStore.getState();
  const workspace = state.workspaces.find((candidate) => candidate.id === state.activeWorkspaceId);
  if (!workspace || suppressPersistence) return;

  useStorageWorkspaceStore.setState({ syncStatus: 'saving', error: null });
  let pendingCacheStored = workspace.provider === 'browser';

  try {
    const document = captureWorkspaceDocument(workspace);
    if (workspace.provider !== 'browser') {
      try {
        await requireRegistry().setCache({ workspaceId: workspace.id, document, fingerprint: currentFingerprint, pendingSync: true });
        pendingCacheStored = true;
      } catch {
        pendingCacheStored = false;
      }
    }
    const result = await getProvider(workspace).save(workspace, document, currentFingerprint);
    currentDocument = document;
    currentFingerprint = result.fingerprint;
    let cacheWarning: string | null = null;
    if (workspace.provider !== 'browser') {
      try {
        await requireRegistry().setCache({ workspaceId: workspace.id, document, fingerprint: result.fingerprint, pendingSync: false });
      } catch {
        cacheWarning = 'Workspace saved externally, but its local offline cache could not be updated.';
      }
    } else {
      void import('./useStorageWarningStore').then((module) => module.useStorageWarningStore.getState().refresh());
    }
    useStorageWorkspaceStore.setState({ syncStatus: 'synced', error: cacheWarning });

    if (document.activeCharacterId) {
      const activeCharacter = document.characters.find((character) => character.id === document.activeCharacterId);
      if (activeCharacter) useTelemetryStoreSafely(activeCharacter);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Workspace save failed.';
    const recoveryWarning = workspace.provider !== 'browser' && !pendingCacheStored
      ? ' Changes are only in this tab because the local recovery cache is unavailable. Keep this tab open and try again.'
      : '';
    if (error instanceof WorkspaceConflictError) {
      useStorageWorkspaceStore.setState({ syncStatus: 'conflict', conflict: error, error: `${error.message}${recoveryWarning}` });
    } else if (error instanceof WorkspaceReconnectRequiredError) {
      useStorageWorkspaceStore.setState({ syncStatus: 'reconnect', error: `${error.message}${recoveryWarning}` });
    } else {
      useStorageWorkspaceStore.setState({
        syncStatus: pendingCacheStored ? 'pending' : 'error',
        error: `${errorMessage}${recoveryWarning}`,
      });
    }
  }
}

function useTelemetryStoreSafely(character: Character): void {
  void import('./useTelemetryStore').then((module) => module.useTelemetryStore.getState().sendTelemetry(character));
}

function scheduleSave(): void {
  if (suppressPersistence) return;
  if (saveTimeout !== null) window.clearTimeout(saveTimeout);
  saveTimeout = window.setTimeout(() => {
    saveTimeout = null;
    enqueueSave();
  }, 150);
}

function enqueueSave(): Promise<void> {
  saveRequested = true;
  if (saveInProgress) return saveQueue;

  saveInProgress = true;
  saveQueue = (async () => {
    try {
      while (saveRequested) {
        saveRequested = false;
        await persistActiveWorkspace();
      }
    } finally {
      saveInProgress = false;
    }
  })();
  return saveQueue;
}

function startSubscriptions(): void {
  if (subscriptionsStarted) return;
  subscriptionsStarted = true;
  useStore.subscribe(scheduleSave);
  useTimelineStore.subscribe(scheduleSave);
  useCustomThemeStore.subscribe(scheduleSave);
  useTemplateStore.subscribe(scheduleSave);
  useUserPresetStore.subscribe(scheduleSave);
}

async function loadWorkspace(workspace: StorageWorkspace, restoreActiveCharacter = true): Promise<void> {
  suppressPersistence = true;
  useStorageWorkspaceStore.setState({ syncStatus: 'loading', error: null, conflict: null });
  let cache = null;
  try {
    cache = workspace.provider === 'browser' ? null : await requireRegistry().getCache(workspace.id);
    if (workspace.provider === 'google-drive' && !getGoogleDriveAccessToken()) {
      if (!cache) throw new WorkspaceReconnectRequiredError('Reconnect Google Drive to load this workspace.');
      currentDocument = cache.document;
      currentFingerprint = cache.fingerprint;
      applyWorkspaceDocument(cache.document, restoreActiveCharacter);
      useStorageWorkspaceStore.setState({
        syncStatus: 'reconnect',
        error: 'Reconnect Google Drive to resume syncing this workspace.',
      });
      return;
    }
    const result = await getProvider(workspace).load(workspace);

    if (cache?.pendingSync) {
      const cached = cache.document;
      currentDocument = cached;
      currentFingerprint = cache.fingerprint;
      applyWorkspaceDocument(cached, restoreActiveCharacter);

      if (result.fingerprint !== cache.fingerprint) {
        const conflict = new WorkspaceConflictError(undefined, result.document, result.fingerprint);
        useStorageWorkspaceStore.setState({ syncStatus: 'conflict', conflict, error: conflict.message });
        return;
      }

      const saved = await getProvider(workspace).save(workspace, cached, cache.fingerprint);
      currentFingerprint = saved.fingerprint;
      await requireRegistry().setCache({
        workspaceId: workspace.id,
        document: cached,
        fingerprint: saved.fingerprint,
        pendingSync: false,
      });
      useStorageWorkspaceStore.setState({ syncStatus: 'synced' });
      return;
    }

    currentDocument = result.document;
    currentFingerprint = result.fingerprint;
    if (workspace.provider !== 'browser') {
      await requireRegistry().setCache({ workspaceId: workspace.id, document: result.document, fingerprint: result.fingerprint, pendingSync: false });
    }
    applyWorkspaceDocument(result.document, restoreActiveCharacter);
    useStorageWorkspaceStore.setState({ syncStatus: 'synced' });
  } catch (error) {
    if (!cache) {
      useStorageWorkspaceStore.setState({
        syncStatus: 'error',
        error: error instanceof Error ? error.message : 'The workspace could not be loaded.',
      });
      throw error;
    }
    currentDocument = cache.document;
    currentFingerprint = cache.fingerprint;
    applyWorkspaceDocument(cache.document, restoreActiveCharacter);
    useStorageWorkspaceStore.setState({
      syncStatus: error instanceof WorkspaceReconnectRequiredError ? 'reconnect' : 'pending',
      error: error instanceof Error ? error.message : 'The cached workspace was loaded.',
    });
  } finally {
    suppressPersistence = false;
  }
}

export const useStorageWorkspaceStore = create<StorageWorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: BROWSER_WORKSPACE_ID,
  supportsExternalWorkspaces: registry !== null,
  isHydrated: false,
  isSwitchingWorkspace: false,
  syncStatus: 'idle',
  error: null,
  conflict: null,

  initialize: async () => {
    if (get().isHydrated || get().syncStatus === 'loading') return;
    startSubscriptions();
    set({ syncStatus: 'loading', error: null });
    try {
      if (!registry) {
        const browserWorkspace = createBrowserWorkspace();
        set({ workspaces: [browserWorkspace], activeWorkspaceId: BROWSER_WORKSPACE_ID, supportsExternalWorkspaces: false });
        await loadWorkspace(browserWorkspace);
        set({ isHydrated: true });
        return;
      }

      let workspaces: StorageWorkspace[];
      try {
        workspaces = await registry.initialize();
      } catch {
        registry = null;
        const browserWorkspace = createBrowserWorkspace();
        set({ workspaces: [browserWorkspace], activeWorkspaceId: BROWSER_WORKSPACE_ID, supportsExternalWorkspaces: false });
        await loadWorkspace(browserWorkspace);
        set({ isHydrated: true });
        return;
      }
      const browserWorkspace = workspaces.find((candidate) => candidate.id === BROWSER_WORKSPACE_ID)!;
      const browserDocument = (await browserProvider.load(browserWorkspace)).document;
      await browserProvider.save(browserWorkspace, browserDocument, null);
      const preferredId = requireRegistry().getActiveWorkspaceId();
      const workspace = workspaces.find((candidate) => candidate.id === preferredId)
        ?? browserWorkspace;
      set({ workspaces, activeWorkspaceId: workspace.id });
      try {
        await loadWorkspace(workspace);
        set({ isHydrated: true });
      } catch (error) {
        if (workspace.id === BROWSER_WORKSPACE_ID) throw error;
        requireRegistry().setActiveWorkspaceId(BROWSER_WORKSPACE_ID);
        await loadWorkspace(browserWorkspace);
        set({
          activeWorkspaceId: BROWSER_WORKSPACE_ID,
          isHydrated: true,
          error: error instanceof Error ? error.message : 'The selected workspace could not be loaded.',
        });
      }
    } catch (error) {
      suppressPersistence = false;
      set({
        isHydrated: false,
        syncStatus: 'error',
        error: error instanceof Error ? error.message : 'Workspace initialization failed.',
      });
    }
  },

  resetBrowserWorkspace: async () => {
    try {
      resetBrowserWorkspaceStorage();
      registry?.setActiveWorkspaceId(BROWSER_WORKSPACE_ID);
      set({ isHydrated: false, syncStatus: 'idle', error: null, conflict: null });
      await get().initialize();
    } catch (error) {
      set({
        isHydrated: false,
        syncStatus: 'error',
        error: error instanceof Error ? error.message : 'The Browser workspace could not be reset.',
      });
    }
  },

  switchWorkspace: async (workspaceId) => {
    if (workspaceId === get().activeWorkspaceId) return;
    const workspace = get().workspaces.find((candidate) => candidate.id === workspaceId);
    if (!workspace) throw new Error('Workspace not found.');
    set({ isSwitchingWorkspace: true });
    try {
      if (saveTimeout !== null) {
        window.clearTimeout(saveTimeout);
        saveTimeout = null;
        enqueueSave();
      }
      await saveQueue;
      await loadWorkspace(workspace, false);
      const updatedWorkspace = { ...workspace, lastOpenedAt: new Date().toISOString() };
      requireRegistry().setActiveWorkspaceId(workspaceId);
      set({
        activeWorkspaceId: workspaceId,
        workspaces: get().workspaces.map((candidate) => candidate.id === workspaceId ? updatedWorkspace : candidate),
      });
      await requireRegistry().putWorkspace(updatedWorkspace);
    } finally {
      set({ isSwitchingWorkspace: false });
    }
  },

  addDirectoryWorkspace: async (handle) => {
    const workspaceId = uuidv4();
    const created = await createDirectoryWorkspace({ handle, workspaceId });
    const timestamp = new Date().toISOString();
    const workspace: StorageWorkspace = {
      id: workspaceId,
      name: created.document.name,
      provider: 'directory',
      locationName: handle.name,
      createdAt: timestamp,
      lastOpenedAt: timestamp,
    };
    await requireRegistry().setDirectoryHandle(workspaceId, handle);
    await requireRegistry().putWorkspace(workspace);
    await requireRegistry().setCache({ workspaceId, document: created.document, fingerprint: created.fingerprint, pendingSync: false });
    set({ workspaces: [...get().workspaces, workspace] });
    await get().switchWorkspace(workspaceId);
  },

  openDirectoryWorkspace: async (handle) => {
    const loaded = await openDirectoryWorkspace(handle);
    const timestamp = new Date().toISOString();
    const existingWorkspace = get().workspaces.find((candidate) => candidate.id === loaded.document.workspaceId);
    const workspace: StorageWorkspace = {
      id: loaded.document.workspaceId,
      name: loaded.document.name,
      provider: 'directory',
      locationName: handle.name,
      createdAt: existingWorkspace?.createdAt ?? timestamp,
      lastOpenedAt: timestamp,
    };

    const workspaceRegistry = requireRegistry();
    const existingCache = existingWorkspace ? await workspaceRegistry.getCache(workspace.id) : null;
    await workspaceRegistry.setDirectoryHandle(workspace.id, handle);
    await workspaceRegistry.putWorkspace(workspace);
    if (!existingCache?.pendingSync) {
      await workspaceRegistry.setCache({
        workspaceId: workspace.id,
        document: loaded.document,
        fingerprint: loaded.fingerprint,
        pendingSync: false,
      });
    }

    const workspaces = existingWorkspace
      ? get().workspaces.map((candidate) => candidate.id === workspace.id ? workspace : candidate)
      : [...get().workspaces, workspace];
    set({ workspaces });

    if (workspace.id === get().activeWorkspaceId) {
      await loadWorkspace(workspace);
    } else {
      await get().switchWorkspace(workspace.id);
    }
  },

  addGoogleDriveWorkspace: async (name) => {
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('Enter a workspace name.');
    const accessToken = await authorizeGoogleDrive();
    const workspaceId = uuidv4();
    const document = createWorkspaceDocument({ workspaceId, name: trimmedName });
    const metadata = await createDriveWorkspaceFile({ name: trimmedName, document, accessToken });
    const timestamp = new Date().toISOString();
    const workspace: StorageWorkspace = {
      id: workspaceId,
      name: trimmedName,
      provider: 'google-drive',
      driveFileId: metadata.id,
      locationName: metadata.name,
      createdAt: timestamp,
      lastOpenedAt: timestamp,
    };
    const fingerprint = getDriveFingerprint(metadata);
    await requireRegistry().putWorkspace(workspace);
    await requireRegistry().setCache({ workspaceId, document, fingerprint, pendingSync: false });
    set({ workspaces: [...get().workspaces, workspace] });
    await get().switchWorkspace(workspaceId);
  },

  openGoogleDriveWorkspace: async () => {
    const selectedFile = await pickGoogleDriveWorkspace();
    if (!selectedFile) return;
    const temporaryWorkspace: StorageWorkspace = {
      id: uuidv4(),
      name: selectedFile.name.replace(/\.json$/i, ''),
      provider: 'google-drive',
      driveFileId: selectedFile.id,
      locationName: selectedFile.name,
      createdAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
    };
    const loaded = await googleDriveProvider.load(temporaryWorkspace);
    const accessToken = getGoogleDriveAccessToken();
    if (!accessToken) throw new WorkspaceReconnectRequiredError('Connect Google Drive to open this workspace.');
    const taggedMetadata = await tagDriveWorkspaceFile({
      fileId: selectedFile.id,
      workspaceVersion: loaded.document.version,
      accessToken,
    });
    const workspace: StorageWorkspace = {
      ...temporaryWorkspace,
      id: loaded.document.workspaceId,
      name: loaded.document.name,
    };
    const workspaceRegistry = requireRegistry();
    const existingCache = await workspaceRegistry.getCache(workspace.id);
    await workspaceRegistry.putWorkspace(workspace);
    if (!existingCache?.pendingSync) {
      await workspaceRegistry.setCache({
        workspaceId: workspace.id,
        document: loaded.document,
        fingerprint: getDriveFingerprint(taggedMetadata),
        pendingSync: false,
      });
    }
    const existingIndex = get().workspaces.findIndex((candidate) => candidate.id === workspace.id);
    const workspaces = existingIndex >= 0
      ? get().workspaces.map((candidate) => candidate.id === workspace.id ? workspace : candidate)
      : [...get().workspaces, workspace];
    set({ workspaces });
    await get().switchWorkspace(workspace.id);
  },

  reconnectDirectoryWorkspace: async (workspaceId, handle) => {
    const workspace = get().workspaces.find((candidate) => candidate.id === workspaceId);
    if (!workspace || workspace.provider !== 'directory') throw new Error('Directory workspace not found.');
    const selectedHandle = handle ?? await requireRegistry().getDirectoryHandle(workspaceId);
    if (!selectedHandle) {
      throw new WorkspaceReconnectRequiredError('The saved directory handle is unavailable. Choose the workspace directory again.');
    }
    const hasPermission = await reconnectDirectoryWorkspace(selectedHandle);
    if (!hasPermission) throw new WorkspaceReconnectRequiredError('Directory access was not granted.');
    const selectedProvider = createDirectoryWorkspaceProvider(async () => selectedHandle);
    const selected = await selectedProvider.load(workspace);
    if (selected.document.workspaceId !== workspaceId) {
      throw new Error('The selected directory belongs to a different workspace.');
    }
    await requireRegistry().setDirectoryHandle(workspaceId, selectedHandle);
    if (workspaceId === get().activeWorkspaceId) await loadWorkspace(workspace);
  },

  reconnectGoogleDriveWorkspace: async (workspaceId) => {
    clearGoogleDriveAccessToken();
    await authorizeGoogleDrive();
    if (workspaceId === get().activeWorkspaceId) {
      const workspace = get().workspaces.find((candidate) => candidate.id === workspaceId);
      if (workspace) await loadWorkspace(workspace);
    }
  },

  copyCharacterToWorkspace: async (characterId, targetWorkspaceId) => {
    const sourceCharacter = useStore.getState().characters.find((character) => character.id === characterId);
    if (!sourceCharacter) throw new Error('Character not found.');
    const targetWorkspace = get().workspaces.find((workspace) => workspace.id === targetWorkspaceId);
    if (!targetWorkspace || targetWorkspace.id === get().activeWorkspaceId) {
      throw new Error('Choose another workspace.');
    }

    const targetCache = targetWorkspace.provider === 'browser'
      ? null
      : await requireRegistry().getCache(targetWorkspace.id);
    if (targetCache?.pendingSync) {
      throw new Error('Open and sync the target workspace before copying a character to it.');
    }

    const provider = getProvider(targetWorkspace);
    if (targetWorkspace.provider === 'google-drive' && !getGoogleDriveAccessToken()) {
      await restoreGoogleDriveAccessToken();
    }
    const loaded = await provider.load(targetWorkspace);
    const clonedCharacter = cloneCharacterForWorkspace(sourceCharacter);
    const targetCustomThemes = includeCharacterCustomTheme(
      sourceCharacter,
      useCustomThemeStore.getState().customThemes,
      loaded.document.customThemes,
    );
    const sourceTimeline = useTimelineStore.getState().eventsByCharacter[characterId];
    const eventsByCharacter = {
      ...loaded.document.eventsByCharacter,
      ...(sourceTimeline ? { [clonedCharacter.id]: structuredClone(sourceTimeline) } : {}),
    };
    const document = createWorkspaceDocument({
      workspaceId: targetWorkspace.id,
      name: targetWorkspace.name,
      characters: [...loaded.document.characters, clonedCharacter],
      eventsByCharacter,
      activeCharacterId: loaded.document.activeCharacterId,
      mode: loaded.document.mode,
      customThemes: targetCustomThemes,
      templates: loaded.document.templates,
      userPresets: loaded.document.userPresets,
      revision: loaded.document.revision + 1,
    });

    const result = await provider.save(targetWorkspace, document, loaded.fingerprint);
    if (targetWorkspace.provider !== 'browser') {
      await requireRegistry().setCache({
        workspaceId: targetWorkspace.id,
        document,
        fingerprint: result.fingerprint,
        pendingSync: false,
      });
    }
  },

  getWorkspaceContents: async (workspaceId) => {
    const workspace = get().workspaces.find((candidate) => candidate.id === workspaceId);
    if (!workspace) throw new Error('Workspace not found.');
    return (await readWorkspaceDocument(workspace)).document;
  },

  transferWorkspaceData: async (sourceWorkspaceId, targetWorkspaceId, selection, mode) => {
    if (sourceWorkspaceId === targetWorkspaceId) throw new Error('Choose two different workspaces.');
    const sourceWorkspace = get().workspaces.find((workspace) => workspace.id === sourceWorkspaceId);
    const targetWorkspace = get().workspaces.find((workspace) => workspace.id === targetWorkspaceId);
    if (!sourceWorkspace || !targetWorkspace) throw new Error('Workspace not found.');

    const hasSelection = selection.characterIds.length > 0
      || selection.presetIds.length > 0
      || selection.themeIds.length > 0
      || selection.templateIds.length > 0;
    if (!hasSelection) throw new Error(`Select at least one item to ${mode}.`);

    const [source, target] = await Promise.all([
      readWorkspaceDocument(sourceWorkspace),
      readWorkspaceDocument(targetWorkspace),
    ]);
    const characterIds = new Set(selection.characterIds);
    const presetIds = new Set(selection.presetIds);
    const themeIds = new Set(selection.themeIds);
    const templateIds = new Set(selection.templateIds);
    const selectedCharacters = source.document.characters.filter((item) => characterIds.has(item.id));
    const transferredCharacters = mode === 'copy'
      ? selectedCharacters.map(cloneCharacterForWorkspace)
      : selectedCharacters;
    const transferredPresets = source.document.userPresets.filter((item) => presetIds.has(item.id));
    const transferredThemes = source.document.customThemes.filter((item) => themeIds.has(item.id));
    const transferredTemplates = source.document.templates.filter((item) => templateIds.has(item.id));

    const targetEvents = structuredClone(target.document.eventsByCharacter);
    selectedCharacters.forEach((selectedCharacter, index) => {
      const transferredCharacter = transferredCharacters[index];
      const timeline = source.document.eventsByCharacter[selectedCharacter.id];
      if (timeline) targetEvents[transferredCharacter.id] = structuredClone(timeline);
      else delete targetEvents[transferredCharacter.id];
    });
    const sourceEvents = mode === 'move' ? structuredClone(source.document.eventsByCharacter) : null;
    if (sourceEvents) {
      for (const selectedCharacter of selectedCharacters) delete sourceEvents[selectedCharacter.id];
    }

    const targetDocument = createWorkspaceDocument({
      workspaceId: targetWorkspace.id,
      name: targetWorkspace.name,
      characters: mergeById(target.document.characters, transferredCharacters),
      eventsByCharacter: targetEvents,
      activeCharacterId: target.document.activeCharacterId,
      mode: target.document.mode,
      customThemes: mergeById(target.document.customThemes, transferredThemes),
      templates: mergeById(target.document.templates, transferredTemplates),
      userPresets: mergeById(target.document.userPresets, transferredPresets),
      revision: target.document.revision + 1,
    });

    const targetFingerprint = await saveWorkspaceDocument(targetWorkspace, targetDocument, target.fingerprint);
    let sourceDocument: WorkspaceDocument | null = null;
    let sourceFingerprint = source.fingerprint;
    if (mode === 'move' && sourceEvents) {
      sourceDocument = createWorkspaceDocument({
        workspaceId: sourceWorkspace.id,
        name: sourceWorkspace.name,
        characters: source.document.characters.filter((item) => !characterIds.has(item.id)),
        eventsByCharacter: sourceEvents,
        activeCharacterId: source.document.activeCharacterId,
        mode: source.document.mode,
        customThemes: source.document.customThemes.filter((item) => !themeIds.has(item.id)),
        templates: source.document.templates.filter((item) => !templateIds.has(item.id)),
        userPresets: source.document.userPresets.filter((item) => !presetIds.has(item.id)),
        revision: source.document.revision + 1,
      });
      sourceFingerprint = await saveWorkspaceDocument(sourceWorkspace, sourceDocument, source.fingerprint);
    }
    const activeWorkspaceId = get().activeWorkspaceId;
    const activeDocument = activeWorkspaceId === targetWorkspace.id
      ? targetDocument
      : activeWorkspaceId === sourceWorkspace.id
        ? sourceDocument
        : null;
    if (activeDocument) {
      suppressPersistence = true;
      currentDocument = activeDocument;
      currentFingerprint = activeWorkspaceId === sourceWorkspace.id ? sourceFingerprint : targetFingerprint;
      applyWorkspaceDocument(activeDocument);
      suppressPersistence = false;
    }
  },

  resolveConflict: async (resolution) => {
    const conflict = get().conflict;
    const workspace = get().workspaces.find((candidate) => candidate.id === get().activeWorkspaceId);
    if (!conflict || !workspace) return;

    if (resolution === 'remote') {
      if (!conflict.remoteDocument) throw new Error('The external workspace could not be loaded.');
      suppressPersistence = true;
      try {
        currentDocument = conflict.remoteDocument;
        currentFingerprint = conflict.remoteFingerprint;
        applyWorkspaceDocument(conflict.remoteDocument);
        await requireRegistry().setCache({
          workspaceId: workspace.id,
          document: conflict.remoteDocument,
          fingerprint: conflict.remoteFingerprint,
          pendingSync: false,
        });
      } finally {
        suppressPersistence = false;
      }
      set({ conflict: null, error: null, syncStatus: 'synced' });
      return;
    }

    const localDocument = captureWorkspaceDocument(workspace);
    const result = await getProvider(workspace).save(workspace, localDocument, conflict.remoteFingerprint);
    currentDocument = localDocument;
    currentFingerprint = result.fingerprint;
    await requireRegistry().setCache({
      workspaceId: workspace.id,
      document: localDocument,
      fingerprint: result.fingerprint,
      pendingSync: false,
    });
    set({ conflict: null, error: null, syncStatus: 'synced' });
  },

  saveConflictAsNewDirectory: async (handle) => {
    if (!get().conflict) return;
    const workspaceId = uuidv4();
    const created = await createDirectoryWorkspace({ handle, workspaceId });
    const document = {
      ...captureWorkspaceDocument({
        id: workspaceId,
        name: handle.name,
        provider: 'directory',
        createdAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString(),
      }),
      workspaceId,
      name: handle.name,
    };
    const workspace: StorageWorkspace = {
      id: workspaceId,
      name: handle.name,
      provider: 'directory',
      locationName: handle.name,
      createdAt: document.updatedAt,
      lastOpenedAt: document.updatedAt,
    };
    await requireRegistry().setDirectoryHandle(workspaceId, handle);
    const result = await directoryProvider.save(workspace, document, created.fingerprint);
    await requireRegistry().putWorkspace(workspace);
    await requireRegistry().setCache({ workspaceId, document, fingerprint: result.fingerprint, pendingSync: false });
    requireRegistry().setActiveWorkspaceId(workspaceId);
    currentDocument = document;
    currentFingerprint = result.fingerprint;
    set({
      workspaces: [...get().workspaces, workspace],
      activeWorkspaceId: workspaceId,
      conflict: null,
      error: null,
      syncStatus: 'synced',
    });
  },

  saveConflictAsNewGoogleDrive: async (name) => {
    if (!get().conflict) return;
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('Enter a workspace name.');
    const accessToken = await authorizeGoogleDrive();
    const workspaceId = uuidv4();
    const timestamp = new Date().toISOString();
    const document = {
      ...captureWorkspaceDocument({
        id: workspaceId,
        name: trimmedName,
        provider: 'google-drive',
        createdAt: timestamp,
        lastOpenedAt: timestamp,
      }),
      workspaceId,
      name: trimmedName,
    };
    const metadata = await createDriveWorkspaceFile({ name: trimmedName, document, accessToken });
    const workspace: StorageWorkspace = {
      id: workspaceId,
      name: trimmedName,
      provider: 'google-drive',
      driveFileId: metadata.id,
      locationName: metadata.name,
      createdAt: timestamp,
      lastOpenedAt: timestamp,
    };
    const fingerprint = getDriveFingerprint(metadata);
    await requireRegistry().putWorkspace(workspace);
    await requireRegistry().setCache({ workspaceId, document, fingerprint, pendingSync: false });
    requireRegistry().setActiveWorkspaceId(workspaceId);
    currentDocument = document;
    currentFingerprint = fingerprint;
    set({
      workspaces: [...get().workspaces, workspace],
      activeWorkspaceId: workspaceId,
      conflict: null,
      error: null,
      syncStatus: 'synced',
    });
  },

  restoreActiveWorkspace: async (source) => {
    if (saveTimeout !== null) {
      window.clearTimeout(saveTimeout);
      saveTimeout = null;
      enqueueSave();
    }
    await saveQueue.catch(() => undefined);

    const characterIds = new Set(source.characters.map((character) => character.id));
    const sourceEvents = source.eventsByCharacter ?? useTimelineStore.getState().eventsByCharacter;
    const eventsByCharacter = Object.fromEntries(
      Object.entries(sourceEvents)
        .filter(([characterId]) => characterIds.has(characterId)),
    );
    const activeCharacterId = source.activeCharacterId && characterIds.has(source.activeCharacterId)
      ? source.activeCharacterId
      : null;
    suppressPersistence = true;
    try {
      useUndoStore.getState().clearAllHistory();
      if (source.customThemes !== undefined) {
        useCustomThemeStore.getState().replaceCustomThemes(source.customThemes);
      }
      if (source.templates !== undefined) {
        useTemplateStore.getState().replaceTemplates(source.templates);
      }
      if (source.userPresets !== undefined) {
        useUserPresetStore.getState().replaceUserPresets(source.userPresets);
      }
      useStore.getState()._replaceWorkspaceState({
        characters: source.characters,
        activeCharacterId,
        mode: activeCharacterId ? source.mode ?? 'play' : 'play',
      });
      useTimelineStore.getState().replaceWorkspaceEvents(eventsByCharacter);
    } finally {
      suppressPersistence = false;
    }
    await enqueueSave();
    if (useStorageWorkspaceStore.getState().syncStatus !== 'synced') {
      throw new Error(useStorageWorkspaceStore.getState().error || 'The restored workspace could not be saved.');
    }
  },

  forgetWorkspace: async (workspaceId) => {
    if (workspaceId === BROWSER_WORKSPACE_ID) return;
    if (workspaceId === get().activeWorkspaceId) await get().switchWorkspace(BROWSER_WORKSPACE_ID);
    await requireRegistry().removeWorkspace(workspaceId);
    set({ workspaces: get().workspaces.filter((workspace) => workspace.id !== workspaceId) });
  },
}));