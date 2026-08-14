import { getInstalledDatabaseName, isInstalledApp } from '../pwa/runtimeContext';
import {
  clearInstalledRecords,
  dismissWorkspaceNotice,
  initializeInstalledRecords,
  MigrationSummary,
  openInstalledDatabase,
  readInstalledRecords,
  readMigrationSummary,
  readWorkspaceNoticeDismissed,
  removeInstalledRecord,
  setInstalledRecord,
  setInstalledRecords,
} from './installedDatabase';
import { CUSTOM_THEMES_STORAGE_KEY, LEGACY_CUSTOM_THEMES_STORAGE_KEY } from './storageKeys';

const MIGRATED_EXACT_KEYS = new Set([
  'ucs:store',
  CUSTOM_THEMES_STORAGE_KEY,
  LEGACY_CUSTOM_THEMES_STORAGE_KEY,
  'ucs:templates',
  'ucs:userPresets',
  'ucs:timeline',
  'ucs:theme',
  'ucs:darkMode',
  'ucs:3d-dice-enabled',
  'ucs:tutorialStep',
  'ucs:play-layout',
  'ucs:list-columns',
  'ucs:viewLocked',
  'ucs:lockedView',
]);

const MIGRATED_KEY_PREFIXES = [
  'ucs:vertical-collapsed:',
  'ucs:sheet-workspace:',
  'ucs:sheet-camera:',
  'ucs:viewLocked:',
  'ucs:lockedView:',
];

class MemoryStorage implements Storage {
  constructor(
    private readonly records: Map<string, string>,
    private readonly persist: (operation: () => Promise<void>) => void,
    private readonly database: IDBDatabase,
  ) {}

  get length(): number {
    return this.records.size;
  }

  clear(): void {
    this.records.clear();
    this.persist(() => clearInstalledRecords(this.database));
  }

  getItem(key: string): string | null {
    return this.records.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.records.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.records.delete(key);
    this.persist(() => removeInstalledRecord(this.database, key));
  }

  setItem(key: string, value: string): void {
    const serializedValue = String(value);
    this.records.set(key, serializedValue);
    this.persist(() => setInstalledRecord(this.database, key, serializedValue));
  }

  applyPersistedRecords(records: ReadonlyMap<string, string>): void {
    records.forEach((value, key) => this.records.set(key, value));
  }
}

export interface StorageBootstrapResult {
  mode: 'website' | 'installed';
  migrationSummary: MigrationSummary | null;
  showWorkspaceNotice: boolean;
}

let activeStorage: Storage = window.localStorage;
let installedDatabase: IDBDatabase | null = null;
let installedMemoryStorage: MemoryStorage | null = null;
let pendingWrite: Promise<void> = Promise.resolve();
let writeFailure: unknown = null;
let lifecycleFlushRegistered = false;

function queueInstalledWrite(operation: () => Promise<void>): void {
  pendingWrite = pendingWrite
    .catch(() => undefined)
    .then(operation)
    .catch((error: unknown) => {
      writeFailure = error;
      console.error('Failed to persist installed workspace', error);
      window.dispatchEvent(new CustomEvent('ucs:storage-write-error'));
      throw error;
    });
}

function shouldMigrateWebsiteKey(key: string): boolean {
  return MIGRATED_EXACT_KEYS.has(key) || MIGRATED_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function readWebsiteRecords(): Map<string, string> {
  const records = new Map<string, string>();
  for (let index = 0; index < window.localStorage.length; index++) {
    const key = window.localStorage.key(index);
    if (!key || !shouldMigrateWebsiteKey(key)) continue;
    const value = window.localStorage.getItem(key);
    if (value !== null) records.set(key, value);
  }
  return records;
}

function countArrayProperty(records: ReadonlyMap<string, string>, key: string, property: string): number {
  try {
    const parsed = JSON.parse(records.get(key) ?? '{}') as Record<string, unknown>;
    return Array.isArray(parsed[property]) ? parsed[property].length : 0;
  } catch {
    return 0;
  }
}

function createMigrationSummary(records: ReadonlyMap<string, string>): MigrationSummary {
  return {
    migratedAt: new Date().toISOString(),
    characterCount: countArrayProperty(records, 'ucs:store', 'characters'),
    templateCount: countArrayProperty(records, 'ucs:templates', 'templates'),
    userPresetCount: countArrayProperty(records, 'ucs:userPresets', 'userPresets'),
  };
}

function registerLifecycleFlush(): void {
  if (lifecycleFlushRegistered) return;
  lifecycleFlushRegistered = true;

  const flush = () => {
    void flushAppStorage().catch((error) => {
      console.error('Installed workspace changes could not be flushed', error);
      window.dispatchEvent(new CustomEvent('ucs:storage-write-error'));
    });
  };

  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

async function requestInstalledStoragePersistence(): Promise<void> {
  const storage = window.navigator.storage;
  if (!storage || typeof storage.persist !== 'function') return;

  try {
    await storage.persist();
  } catch (error) {
    console.warn('Could not request persistent installed storage', error);
  }
}

export const appStorage: Storage = {
  get length() {
    return activeStorage.length;
  },
  clear: () => activeStorage.clear(),
  getItem: (key) => activeStorage.getItem(key),
  key: (index) => activeStorage.key(index),
  removeItem: (key) => activeStorage.removeItem(key),
  setItem: (key, value) => activeStorage.setItem(key, value),
};

export async function initializeAppStorage(): Promise<StorageBootstrapResult> {
  if (!isInstalledApp()) return { mode: 'website', migrationSummary: null, showWorkspaceNotice: false };

  await requestInstalledStoragePersistence();
  installedDatabase = await openInstalledDatabase(getInstalledDatabaseName());
  let migrationSummary = await readMigrationSummary(installedDatabase);

  if (!migrationSummary) {
    const websiteRecords = readWebsiteRecords();
    migrationSummary = createMigrationSummary(websiteRecords);
    await initializeInstalledRecords(installedDatabase, websiteRecords, migrationSummary);
  }

  const showWorkspaceNotice = !(await readWorkspaceNoticeDismissed(installedDatabase));

  const records = await readInstalledRecords(installedDatabase);
  if (!records.has(CUSTOM_THEMES_STORAGE_KEY)) {
    const customThemes = records.get(LEGACY_CUSTOM_THEMES_STORAGE_KEY)
      ?? window.localStorage.getItem(CUSTOM_THEMES_STORAGE_KEY)
      ?? window.localStorage.getItem(LEGACY_CUSTOM_THEMES_STORAGE_KEY)
      ?? '[]';
    await setInstalledRecord(installedDatabase, CUSTOM_THEMES_STORAGE_KEY, customThemes);
    records.set(CUSTOM_THEMES_STORAGE_KEY, customThemes);
  }
  installedMemoryStorage = new MemoryStorage(records, queueInstalledWrite, installedDatabase);
  activeStorage = installedMemoryStorage;
  registerLifecycleFlush();
  return { mode: 'installed', migrationSummary, showWorkspaceNotice };
}

export async function flushAppStorage(): Promise<void> {
  await pendingWrite;
  if (writeFailure) throw writeFailure;
}

export function getAppStorageMode(): 'website' | 'installed' {
  return installedDatabase ? 'installed' : 'website';
}

export async function setAppStorageRecords(records: ReadonlyMap<string, string>): Promise<void> {
  if (!installedDatabase) {
    records.forEach((value, key) => window.localStorage.setItem(key, value));
    return;
  }

  await flushAppStorage();
  await setInstalledRecords(installedDatabase, records);
  installedMemoryStorage?.applyPersistedRecords(records);
}

export async function dismissInstalledWorkspaceNotice(): Promise<void> {
  if (!installedDatabase) return;
  await dismissWorkspaceNotice(installedDatabase);
}