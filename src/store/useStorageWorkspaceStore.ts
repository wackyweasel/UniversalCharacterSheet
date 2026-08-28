import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from './useStore';
import { useTimelineStore } from './useTimelineStore';
import { useUndoStore } from './useUndoStore';
import type { Character } from '../types';
import { cloneCharacterForWorkspace } from '../utils/characterClone';
import type { StorageWorkspace, WorkspaceDocument } from '../workspaces/types';
import { createWorkspaceDocument } from '../workspaces/workspaceDocument';
import { WorkspaceRegistry } from '../workspaces/workspaceRegistry';
import {
  BROWSER_WORKSPACE_ID,
  createBrowserWorkspaceProvider,
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
  downloadDriveWorkspace,
  getDriveFingerprint,
  listDriveWorkspaceFiles,
  tagDriveWorkspaceFile,
} from '../workspaces/google/driveApi';
import {
  authorizeGoogleDrive,
  getGoogleDriveAccessToken,
  pickGoogleDriveWorkspace,
} from '../workspaces/google/googleClient';

type WorkspaceSyncStatus = 'idle' | 'loading' | 'saving' | 'synced' | 'pending' | 'reconnect' | 'conflict' | 'error';

interface StorageWorkspaceState {
  workspaces: StorageWorkspace[];
  activeWorkspaceId: string;
  isHydrated: boolean;
  syncStatus: WorkspaceSyncStatus;
  error: string | null;
  conflict: WorkspaceConflictError | null;
  initialize: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  addDirectoryWorkspace: (handle: WorkspaceDirectoryHandle) => Promise<void>;
  openDirectoryWorkspace: (handle: WorkspaceDirectoryHandle) => Promise<void>;
  addGoogleDriveWorkspace: (name: string) => Promise<void>;
  connectGoogleDrive: () => Promise<number>;
  openGoogleDriveWorkspace: () => Promise<void>;
  reconnectDirectoryWorkspace: (workspaceId: string, handle: WorkspaceDirectoryHandle) => Promise<void>;
  reconnectGoogleDriveWorkspace: (workspaceId: string) => Promise<void>;
  copyCharacterToWorkspace: (characterId: string, targetWorkspaceId: string) => Promise<void>;
  resolveConflict: (resolution: 'remote' | 'local') => Promise<void>;
  saveConflictAsNewDirectory: (handle: WorkspaceDirectoryHandle) => Promise<void>;
  saveConflictAsNewGoogleDrive: (name: string) => Promise<void>;
  replaceActiveWorkspaceCharacters: (characters: Character[]) => Promise<void>;
  forgetWorkspace: (workspaceId: string) => Promise<void>;
}

const registry = new WorkspaceRegistry();
const browserProvider = createBrowserWorkspaceProvider();
const directoryProvider = createDirectoryWorkspaceProvider((workspaceId) => registry.getDirectoryHandle(workspaceId));
const googleDriveProvider = createGoogleDriveWorkspaceProvider(getGoogleDriveAccessToken);

let currentDocument: WorkspaceDocument | null = null;
let currentFingerprint: string | null = null;
let suppressPersistence = true;
let subscriptionsStarted = false;
let saveTimeout: number | null = null;
let saveQueue: Promise<void> = Promise.resolve();

function getProvider(workspace: StorageWorkspace): WorkspaceProvider {
  if (workspace.provider === 'browser') return browserProvider;
  if (workspace.provider === 'directory') return directoryProvider;
  return googleDriveProvider;
}

function applyWorkspaceDocument(document: WorkspaceDocument): void {
  useUndoStore.getState().clearAllHistory();
  useStore.getState()._replaceWorkspaceState({
    characters: document.characters,
    activeCharacterId: document.activeCharacterId,
    mode: document.mode,
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
    revision: (currentDocument?.revision ?? 0) + 1,
  });
}

async function persistActiveWorkspace(): Promise<void> {
  const state = useStorageWorkspaceStore.getState();
  const workspace = state.workspaces.find((candidate) => candidate.id === state.activeWorkspaceId);
  if (!workspace || suppressPersistence) return;

  const document = captureWorkspaceDocument(workspace);
  if (workspace.provider !== 'browser') {
    await registry.setCache({ workspaceId: workspace.id, document, fingerprint: currentFingerprint, pendingSync: true });
  }
  useStorageWorkspaceStore.setState({ syncStatus: 'saving', error: null });

  try {
    const result = await getProvider(workspace).save(workspace, document, currentFingerprint);
    currentDocument = document;
    currentFingerprint = result.fingerprint;
    if (workspace.provider !== 'browser') {
      await registry.setCache({ workspaceId: workspace.id, document, fingerprint: result.fingerprint, pendingSync: false });
    } else {
      void import('./useStorageWarningStore').then((module) => module.useStorageWarningStore.getState().refresh());
    }
    useStorageWorkspaceStore.setState({ syncStatus: 'synced', error: null });

    if (document.activeCharacterId) {
      const activeCharacter = document.characters.find((character) => character.id === document.activeCharacterId);
      if (activeCharacter) useTelemetryStoreSafely(activeCharacter);
    }
  } catch (error) {
    if (error instanceof WorkspaceConflictError) {
      useStorageWorkspaceStore.setState({ syncStatus: 'conflict', conflict: error, error: error.message });
    } else if (error instanceof WorkspaceReconnectRequiredError) {
      useStorageWorkspaceStore.setState({ syncStatus: 'reconnect', error: error.message });
    } else {
      useStorageWorkspaceStore.setState({ syncStatus: 'pending', error: error instanceof Error ? error.message : 'Workspace save failed.' });
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
    saveQueue = saveQueue.then(persistActiveWorkspace);
  }, 150);
}

function startSubscriptions(): void {
  if (subscriptionsStarted) return;
  subscriptionsStarted = true;
  useStore.subscribe(scheduleSave);
  useTimelineStore.subscribe(scheduleSave);
}

async function loadWorkspace(workspace: StorageWorkspace): Promise<void> {
  suppressPersistence = true;
  useStorageWorkspaceStore.setState({ syncStatus: 'loading', error: null, conflict: null });
  const cache = workspace.provider === 'browser' ? null : await registry.getCache(workspace.id);
  try {
    const result = await getProvider(workspace).load(workspace);

    if (cache?.pendingSync) {
      currentDocument = cache.document;
      currentFingerprint = cache.fingerprint;
      applyWorkspaceDocument(cache.document);

      if (result.fingerprint !== cache.fingerprint) {
        const conflict = new WorkspaceConflictError(undefined, result.document, result.fingerprint);
        useStorageWorkspaceStore.setState({ syncStatus: 'conflict', conflict, error: conflict.message });
        return;
      }

      const saved = await getProvider(workspace).save(workspace, cache.document, cache.fingerprint);
      currentFingerprint = saved.fingerprint;
      await registry.setCache({
        workspaceId: workspace.id,
        document: cache.document,
        fingerprint: saved.fingerprint,
        pendingSync: false,
      });
      useStorageWorkspaceStore.setState({ syncStatus: 'synced' });
      return;
    }

    currentDocument = result.document;
    currentFingerprint = result.fingerprint;
    if (workspace.provider !== 'browser') {
      await registry.setCache({ workspaceId: workspace.id, document: result.document, fingerprint: result.fingerprint, pendingSync: false });
    }
    applyWorkspaceDocument(result.document);
    useStorageWorkspaceStore.setState({ syncStatus: 'synced' });
  } catch (error) {
    if (!cache) throw error;
    currentDocument = cache.document;
    currentFingerprint = cache.fingerprint;
    applyWorkspaceDocument(cache.document);
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
  isHydrated: false,
  syncStatus: 'idle',
  error: null,
  conflict: null,

  initialize: async () => {
    if (get().isHydrated || get().syncStatus === 'loading') return;
    startSubscriptions();
    const workspaces = await registry.initialize();
    const preferredId = registry.getActiveWorkspaceId();
    const workspace = workspaces.find((candidate) => candidate.id === preferredId)
      ?? workspaces.find((candidate) => candidate.id === BROWSER_WORKSPACE_ID)!;
    set({ workspaces, activeWorkspaceId: workspace.id, syncStatus: 'loading' });
    try {
      await loadWorkspace(workspace);
      set({ isHydrated: true });
    } catch (error) {
      const browserWorkspace = workspaces.find((candidate) => candidate.id === BROWSER_WORKSPACE_ID)!;
      registry.setActiveWorkspaceId(BROWSER_WORKSPACE_ID);
      await loadWorkspace(browserWorkspace);
      set({
        activeWorkspaceId: BROWSER_WORKSPACE_ID,
        isHydrated: true,
        error: error instanceof Error ? error.message : 'The selected workspace could not be loaded.',
      });
    }
  },

  switchWorkspace: async (workspaceId) => {
    if (workspaceId === get().activeWorkspaceId) return;
    const workspace = get().workspaces.find((candidate) => candidate.id === workspaceId);
    if (!workspace) throw new Error('Workspace not found.');
    if (saveTimeout !== null) {
      window.clearTimeout(saveTimeout);
      saveTimeout = null;
      saveQueue = saveQueue.then(persistActiveWorkspace);
    }
    await saveQueue;
    await loadWorkspace(workspace);
    const updatedWorkspace = { ...workspace, lastOpenedAt: new Date().toISOString() };
    await registry.putWorkspace(updatedWorkspace);
    registry.setActiveWorkspaceId(workspaceId);
    set({
      activeWorkspaceId: workspaceId,
      workspaces: get().workspaces.map((candidate) => candidate.id === workspaceId ? updatedWorkspace : candidate),
    });
  },

  addDirectoryWorkspace: async (handle) => {
    const workspaceId = uuidv4();
    const created = await createDirectoryWorkspace({ handle, workspaceId });
    const timestamp = new Date().toISOString();
    const workspace: StorageWorkspace = {
      id: workspaceId,
      name: created.document.name,
      provider: 'directory',
      createdAt: timestamp,
      lastOpenedAt: timestamp,
    };
    await registry.setDirectoryHandle(workspaceId, handle);
    await registry.putWorkspace(workspace);
    await registry.setCache({ workspaceId, document: created.document, fingerprint: created.fingerprint, pendingSync: false });
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
      createdAt: existingWorkspace?.createdAt ?? timestamp,
      lastOpenedAt: timestamp,
    };

    await registry.setDirectoryHandle(workspace.id, handle);
    await registry.putWorkspace(workspace);
    await registry.setCache({
      workspaceId: workspace.id,
      document: loaded.document,
      fingerprint: loaded.fingerprint,
      pendingSync: false,
    });

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
      createdAt: timestamp,
      lastOpenedAt: timestamp,
    };
    const fingerprint = `${metadata.version}:${metadata.modifiedTime}`;
    await registry.putWorkspace(workspace);
    await registry.setCache({ workspaceId, document, fingerprint, pendingSync: false });
    set({ workspaces: [...get().workspaces, workspace] });
    await get().switchWorkspace(workspaceId);
  },

  connectGoogleDrive: async () => {
    const accessToken = await authorizeGoogleDrive();
    const files = await listDriveWorkspaceFiles(accessToken);
    const timestamp = new Date().toISOString();
    const discovered = await Promise.allSettled(files.map(async (metadata) => {
      const document = await downloadDriveWorkspace(metadata.id, accessToken);
      const existing = get().workspaces.find((workspace) => workspace.id === document.workspaceId);
      const workspace: StorageWorkspace = {
        id: document.workspaceId,
        name: document.name,
        provider: 'google-drive',
        driveFileId: metadata.id,
        createdAt: existing?.createdAt ?? timestamp,
        lastOpenedAt: existing?.lastOpenedAt ?? timestamp,
      };
      return { workspace, document, fingerprint: getDriveFingerprint(metadata) };
    }));
    const discoveredWorkspaceIds = new Set<string>();
    const validWorkspaces = discovered.flatMap((result) => {
      if (result.status !== 'fulfilled' || discoveredWorkspaceIds.has(result.value.workspace.id)) return [];
      discoveredWorkspaceIds.add(result.value.workspace.id);
      return [result.value];
    });

    for (const discoveredWorkspace of validWorkspaces) {
      await registry.putWorkspace(discoveredWorkspace.workspace);
      const existingCache = await registry.getCache(discoveredWorkspace.workspace.id);
      if (!existingCache?.pendingSync) {
        await registry.setCache({
          workspaceId: discoveredWorkspace.workspace.id,
          document: discoveredWorkspace.document,
          fingerprint: discoveredWorkspace.fingerprint,
          pendingSync: false,
        });
      }
    }

    const workspacesById = new Map(get().workspaces.map((workspace) => [workspace.id, workspace]));
    for (const discoveredWorkspace of validWorkspaces) {
      workspacesById.set(discoveredWorkspace.workspace.id, discoveredWorkspace.workspace);
    }
    set({ workspaces: [...workspacesById.values()], error: null });

    if (files.length > 0 && validWorkspaces.length === 0) {
      throw new Error('Google Drive workspace files were found, but none contained a supported workspace document.');
    }
    return validWorkspaces.length;
  },

  openGoogleDriveWorkspace: async () => {
    const selectedFile = await pickGoogleDriveWorkspace();
    if (!selectedFile) return;
    const temporaryWorkspace: StorageWorkspace = {
      id: uuidv4(),
      name: selectedFile.name.replace(/\.json$/i, ''),
      provider: 'google-drive',
      driveFileId: selectedFile.id,
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
    await registry.putWorkspace(workspace);
    await registry.setCache({
      workspaceId: workspace.id,
      document: loaded.document,
      fingerprint: getDriveFingerprint(taggedMetadata),
      pendingSync: false,
    });
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
    const hasPermission = await reconnectDirectoryWorkspace(handle);
    if (!hasPermission) throw new WorkspaceReconnectRequiredError('Directory access was not granted.');
    const selectedProvider = createDirectoryWorkspaceProvider(async () => handle);
    const selected = await selectedProvider.load(workspace);
    if (selected.document.workspaceId !== workspaceId) {
      throw new Error('The selected directory belongs to a different workspace.');
    }
    await registry.setDirectoryHandle(workspaceId, handle);
    if (workspaceId === get().activeWorkspaceId) await loadWorkspace(workspace);
  },

  reconnectGoogleDriveWorkspace: async (workspaceId) => {
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

    const provider = getProvider(targetWorkspace);
    const loaded = await provider.load(targetWorkspace);
    const clonedCharacter = cloneCharacterForWorkspace(sourceCharacter);
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
      revision: loaded.document.revision + 1,
    });

    const result = await provider.save(targetWorkspace, document, loaded.fingerprint);
    if (targetWorkspace.provider !== 'browser') {
      await registry.setCache({
        workspaceId: targetWorkspace.id,
        document,
        fingerprint: result.fingerprint,
        pendingSync: false,
      });
    }
  },

  resolveConflict: async (resolution) => {
    const conflict = get().conflict;
    const workspace = get().workspaces.find((candidate) => candidate.id === get().activeWorkspaceId);
    if (!conflict || !workspace) return;

    if (resolution === 'remote') {
      if (!conflict.remoteDocument) throw new Error('The external workspace could not be loaded.');
      suppressPersistence = true;
      currentDocument = conflict.remoteDocument;
      currentFingerprint = conflict.remoteFingerprint;
      applyWorkspaceDocument(conflict.remoteDocument);
      await registry.setCache({
        workspaceId: workspace.id,
        document: conflict.remoteDocument,
        fingerprint: conflict.remoteFingerprint,
        pendingSync: false,
      });
      suppressPersistence = false;
      set({ conflict: null, error: null, syncStatus: 'synced' });
      return;
    }

    const localDocument = captureWorkspaceDocument(workspace);
    const result = await getProvider(workspace).save(workspace, localDocument, conflict.remoteFingerprint);
    currentDocument = localDocument;
    currentFingerprint = result.fingerprint;
    await registry.setCache({
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
      createdAt: document.updatedAt,
      lastOpenedAt: document.updatedAt,
    };
    await registry.setDirectoryHandle(workspaceId, handle);
    const result = await directoryProvider.save(workspace, document, created.fingerprint);
    await registry.putWorkspace(workspace);
    await registry.setCache({ workspaceId, document, fingerprint: result.fingerprint, pendingSync: false });
    registry.setActiveWorkspaceId(workspaceId);
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
      createdAt: timestamp,
      lastOpenedAt: timestamp,
    };
    const fingerprint = `${metadata.version}:${metadata.modifiedTime}`;
    await registry.putWorkspace(workspace);
    await registry.setCache({ workspaceId, document, fingerprint, pendingSync: false });
    registry.setActiveWorkspaceId(workspaceId);
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

  replaceActiveWorkspaceCharacters: async (characters) => {
    const characterIds = new Set(characters.map((character) => character.id));
    const eventsByCharacter = Object.fromEntries(
      Object.entries(useTimelineStore.getState().eventsByCharacter)
        .filter(([characterId]) => characterIds.has(characterId)),
    );
    suppressPersistence = true;
    useUndoStore.getState().clearAllHistory();
    useStore.getState()._replaceWorkspaceState({ characters, activeCharacterId: null, mode: 'play' });
    useTimelineStore.getState().replaceWorkspaceEvents(eventsByCharacter);
    suppressPersistence = false;
    await persistActiveWorkspace();
    if (useStorageWorkspaceStore.getState().syncStatus !== 'synced') {
      throw new Error(useStorageWorkspaceStore.getState().error || 'The restored characters could not be saved.');
    }
  },

  forgetWorkspace: async (workspaceId) => {
    if (workspaceId === BROWSER_WORKSPACE_ID) return;
    if (workspaceId === get().activeWorkspaceId) await get().switchWorkspace(BROWSER_WORKSPACE_ID);
    await registry.removeWorkspace(workspaceId);
    set({ workspaces: get().workspaces.filter((workspace) => workspace.id !== workspaceId) });
  },
}));