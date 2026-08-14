const DATABASE_VERSION = 1;
const RECORD_STORE = 'records';
const META_STORE = 'meta';
const MIGRATION_META_KEY = 'websiteMigration';
const WORKSPACE_NOTICE_DISMISSED_META_KEY = 'workspaceNoticeDismissed';

export interface MigrationSummary {
  migratedAt: string;
  characterCount: number;
  templateCount: number;
  userPresetCount: number;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction was aborted'));
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
  });
}

export function openInstalledDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(RECORD_STORE)) database.createObjectStore(RECORD_STORE);
      if (!database.objectStoreNames.contains(META_STORE)) database.createObjectStore(META_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open installed app storage'));
    request.onblocked = () => reject(new Error('Installed app storage upgrade is blocked by another window'));
  });
}

export async function readInstalledRecords(database: IDBDatabase): Promise<Map<string, string>> {
  const transaction = database.transaction(RECORD_STORE, 'readonly');
  const store = transaction.objectStore(RECORD_STORE);
  const [keys, values] = await Promise.all([
    requestResult(store.getAllKeys()),
    requestResult(store.getAll()),
  ]);
  await transactionComplete(transaction);

  const records = new Map<string, string>();
  keys.forEach((key, index) => records.set(String(key), String(values[index])));
  return records;
}

export async function readMigrationSummary(database: IDBDatabase): Promise<MigrationSummary | null> {
  const transaction = database.transaction(META_STORE, 'readonly');
  const result = await requestResult(transaction.objectStore(META_STORE).get(MIGRATION_META_KEY));
  await transactionComplete(transaction);
  return result && typeof result === 'object' ? result as MigrationSummary : null;
}

export async function initializeInstalledRecords(
  database: IDBDatabase,
  records: ReadonlyMap<string, string>,
  summary: MigrationSummary,
): Promise<void> {
  const transaction = database.transaction([RECORD_STORE, META_STORE], 'readwrite');
  const recordStore = transaction.objectStore(RECORD_STORE);
  recordStore.clear();
  records.forEach((value, key) => recordStore.put(value, key));
  transaction.objectStore(META_STORE).put(summary, MIGRATION_META_KEY);
  await transactionComplete(transaction);
}

export async function readWorkspaceNoticeDismissed(database: IDBDatabase): Promise<boolean> {
  const transaction = database.transaction(META_STORE, 'readonly');
  const result = await requestResult(transaction.objectStore(META_STORE).get(WORKSPACE_NOTICE_DISMISSED_META_KEY));
  await transactionComplete(transaction);
  return result === true;
}

export async function dismissWorkspaceNotice(database: IDBDatabase): Promise<void> {
  const transaction = database.transaction(META_STORE, 'readwrite');
  transaction.objectStore(META_STORE).put(true, WORKSPACE_NOTICE_DISMISSED_META_KEY);
  await transactionComplete(transaction);
}

export async function setInstalledRecord(database: IDBDatabase, key: string, value: string): Promise<void> {
  const transaction = database.transaction(RECORD_STORE, 'readwrite');
  transaction.objectStore(RECORD_STORE).put(value, key);
  await transactionComplete(transaction);
}

export async function setInstalledRecords(
  database: IDBDatabase,
  records: ReadonlyMap<string, string>,
): Promise<void> {
  const transaction = database.transaction(RECORD_STORE, 'readwrite');
  const store = transaction.objectStore(RECORD_STORE);
  records.forEach((value, key) => store.put(value, key));
  await transactionComplete(transaction);
}

export async function removeInstalledRecord(database: IDBDatabase, key: string): Promise<void> {
  const transaction = database.transaction(RECORD_STORE, 'readwrite');
  transaction.objectStore(RECORD_STORE).delete(key);
  await transactionComplete(transaction);
}

export async function clearInstalledRecords(database: IDBDatabase): Promise<void> {
  const transaction = database.transaction(RECORD_STORE, 'readwrite');
  transaction.objectStore(RECORD_STORE).clear();
  await transactionComplete(transaction);
}