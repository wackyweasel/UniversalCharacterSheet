import type { StorageWorkspace, WorkspaceDocument } from './types';
import { createBrowserWorkspace, BROWSER_WORKSPACE_ID } from './providers/browserWorkspaceProvider';
import type { WorkspaceDirectoryHandle } from './providers/directoryWorkspaceProvider';

const DATABASE_NAME = 'ucs:workspaces';
const DATABASE_VERSION = 1;
const ACTIVE_WORKSPACE_KEY = 'ucs:active-storage-workspace';
const WORKSPACES_STORE = 'workspaces';
const HANDLES_STORE = 'directory-handles';
const CACHE_STORE = 'workspace-cache';

type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface WorkspaceCacheRecord {
  workspaceId: string;
  document: WorkspaceDocument;
  fingerprint: string | null;
  pendingSync: boolean;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export class WorkspaceRegistry {
  private readonly databasePromise: Promise<IDBDatabase>;

  constructor(
    indexedDbFactory: IDBFactory = indexedDB,
    private readonly preferences: PreferenceStorage = localStorage,
    databaseName = DATABASE_NAME,
  ) {
    this.databasePromise = new Promise((resolve, reject) => {
      const request = indexedDbFactory.open(databaseName, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(WORKSPACES_STORE)) {
          database.createObjectStore(WORKSPACES_STORE, { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains(HANDLES_STORE)) {
          database.createObjectStore(HANDLES_STORE, { keyPath: 'workspaceId' });
        }
        if (!database.objectStoreNames.contains(CACHE_STORE)) {
          database.createObjectStore(CACHE_STORE, { keyPath: 'workspaceId' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async initialize(): Promise<StorageWorkspace[]> {
    const browserWorkspace = await this.getWorkspace(BROWSER_WORKSPACE_ID);
    if (!browserWorkspace) await this.putWorkspace(createBrowserWorkspace());
    return this.listWorkspaces();
  }

  async listWorkspaces(): Promise<StorageWorkspace[]> {
    const database = await this.databasePromise;
    const transaction = database.transaction(WORKSPACES_STORE, 'readonly');
    const workspaces = await requestResult(transaction.objectStore(WORKSPACES_STORE).getAll()) as StorageWorkspace[];
    return workspaces.sort((left, right) => {
      if (left.id === BROWSER_WORKSPACE_ID) return -1;
      if (right.id === BROWSER_WORKSPACE_ID) return 1;
      return right.lastOpenedAt.localeCompare(left.lastOpenedAt);
    });
  }

  async getWorkspace(workspaceId: string): Promise<StorageWorkspace | null> {
    const database = await this.databasePromise;
    const transaction = database.transaction(WORKSPACES_STORE, 'readonly');
    return (await requestResult(transaction.objectStore(WORKSPACES_STORE).get(workspaceId)) as StorageWorkspace | undefined) ?? null;
  }

  async putWorkspace(workspace: StorageWorkspace): Promise<void> {
    const database = await this.databasePromise;
    const transaction = database.transaction(WORKSPACES_STORE, 'readwrite');
    transaction.objectStore(WORKSPACES_STORE).put(workspace);
    await transactionDone(transaction);
  }

  async removeWorkspace(workspaceId: string): Promise<void> {
    if (workspaceId === BROWSER_WORKSPACE_ID) return;
    const database = await this.databasePromise;
    const transaction = database.transaction([WORKSPACES_STORE, HANDLES_STORE, CACHE_STORE], 'readwrite');
    transaction.objectStore(WORKSPACES_STORE).delete(workspaceId);
    transaction.objectStore(HANDLES_STORE).delete(workspaceId);
    transaction.objectStore(CACHE_STORE).delete(workspaceId);
    await transactionDone(transaction);
    if (this.getActiveWorkspaceId() === workspaceId) this.setActiveWorkspaceId(BROWSER_WORKSPACE_ID);
  }

  async setDirectoryHandle(workspaceId: string, handle: WorkspaceDirectoryHandle): Promise<void> {
    const database = await this.databasePromise;
    const transaction = database.transaction(HANDLES_STORE, 'readwrite');
    transaction.objectStore(HANDLES_STORE).put({ workspaceId, handle });
    await transactionDone(transaction);
  }

  async getDirectoryHandle(workspaceId: string): Promise<WorkspaceDirectoryHandle | null> {
    const database = await this.databasePromise;
    const transaction = database.transaction(HANDLES_STORE, 'readonly');
    const result = await requestResult(transaction.objectStore(HANDLES_STORE).get(workspaceId)) as {
      handle?: WorkspaceDirectoryHandle;
    } | undefined;
    return result?.handle ?? null;
  }

  async setCache(record: WorkspaceCacheRecord): Promise<void> {
    const database = await this.databasePromise;
    const transaction = database.transaction(CACHE_STORE, 'readwrite');
    transaction.objectStore(CACHE_STORE).put(record);
    await transactionDone(transaction);
  }

  async getCache(workspaceId: string): Promise<WorkspaceCacheRecord | null> {
    const database = await this.databasePromise;
    const transaction = database.transaction(CACHE_STORE, 'readonly');
    return (await requestResult(transaction.objectStore(CACHE_STORE).get(workspaceId)) as WorkspaceCacheRecord | undefined) ?? null;
  }

  getActiveWorkspaceId(): string {
    return this.preferences.getItem(ACTIVE_WORKSPACE_KEY) || BROWSER_WORKSPACE_ID;
  }

  setActiveWorkspaceId(workspaceId: string): void {
    if (workspaceId === BROWSER_WORKSPACE_ID) {
      this.preferences.removeItem(ACTIVE_WORKSPACE_KEY);
      return;
    }
    this.preferences.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
  }
}