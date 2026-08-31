import type { StorageWorkspace, WorkspaceDocument } from '../types';
import { createWorkspaceDocument, parseWorkspaceDocument } from '../workspaceDocument';
import {
  WorkspaceConflictError,
  WorkspaceReconnectRequiredError,
  type WorkspaceProvider,
  type WorkspaceSaveResult,
} from './types';

export const DIRECTORY_WORKSPACE_FILE_NAME = 'ucs-workspace.json';

export interface WorkspaceFile {
  lastModified: number;
  size: number;
  text(): Promise<string>;
}

export interface WorkspaceWritableFile {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

export interface WorkspaceFileHandle {
  getFile(): Promise<WorkspaceFile>;
  createWritable(): Promise<WorkspaceWritableFile>;
}

export interface WorkspaceDirectoryHandle {
  name: string;
  queryPermission(options: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission(options: { mode: 'readwrite' }): Promise<PermissionState>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<WorkspaceFileHandle>;
}

function getFileFingerprint(file: WorkspaceFile): string {
  return `${file.lastModified}:${file.size}`;
}

function translatePermissionError(error: unknown): never {
  if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) {
    throw new WorkspaceReconnectRequiredError('Allow access to this directory to reconnect the workspace.');
  }
  throw error;
}

async function readWorkspaceFile(fileHandle: WorkspaceFileHandle): Promise<{
  document: WorkspaceDocument;
  fingerprint: string;
}> {
  const file = await fileHandle.getFile();
  return {
    document: parseWorkspaceDocument(JSON.parse(await file.text())),
    fingerprint: getFileFingerprint(file),
  };
}

export async function reconnectDirectoryWorkspace(handle: WorkspaceDirectoryHandle): Promise<boolean> {
  return await handle.requestPermission({ mode: 'readwrite' }) === 'granted';
}

export async function openDirectoryWorkspace(handle: WorkspaceDirectoryHandle): Promise<{
  document: WorkspaceDocument;
  fingerprint: string;
}> {
  const hasPermission = await reconnectDirectoryWorkspace(handle);
  if (!hasPermission) throw new WorkspaceReconnectRequiredError('Directory access was not granted.');
  const fileHandle = await handle.getFileHandle(DIRECTORY_WORKSPACE_FILE_NAME);
  return readWorkspaceFile(fileHandle);
}

export async function createDirectoryWorkspace(options: {
  handle: WorkspaceDirectoryHandle;
  workspaceId: string;
  name?: string;
}): Promise<{ document: WorkspaceDocument; fingerprint: string }> {
  const hasPermission = await reconnectDirectoryWorkspace(options.handle);
  if (!hasPermission) throw new WorkspaceReconnectRequiredError('Directory access was not granted.');

  try {
    await options.handle.getFileHandle(DIRECTORY_WORKSPACE_FILE_NAME);
    throw new Error(`This directory already contains ${DIRECTORY_WORKSPACE_FILE_NAME}. Open or reconnect that workspace instead.`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already contains')) throw error;
    if (!(error instanceof DOMException) || error.name !== 'NotFoundError') throw error;
  }

  const document = createWorkspaceDocument({
    workspaceId: options.workspaceId,
    name: options.name?.trim() || options.handle.name,
  });
  const fileHandle = await options.handle.getFileHandle(DIRECTORY_WORKSPACE_FILE_NAME, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(document, null, 2));
  await writable.close();
  const file = await fileHandle.getFile();
  return { document, fingerprint: getFileFingerprint(file) };
}

export function createDirectoryWorkspaceProvider(
  getHandle: (workspaceId: string) => Promise<WorkspaceDirectoryHandle | null>,
): WorkspaceProvider {
  const getWorkspaceHandle = async (workspace: StorageWorkspace) => {
    const handle = await getHandle(workspace.id);
    if (!handle) throw new WorkspaceReconnectRequiredError('Choose the workspace directory again to reconnect it.');
    return handle;
  };

  return {
    async load(workspace) {
      try {
        const handle = await getWorkspaceHandle(workspace);
        const fileHandle = await handle.getFileHandle(DIRECTORY_WORKSPACE_FILE_NAME);
        return await readWorkspaceFile(fileHandle);
      } catch (error) {
        translatePermissionError(error);
      }
    },

    async save(workspace, document, expectedFingerprint): Promise<WorkspaceSaveResult> {
      try {
        const handle = await getWorkspaceHandle(workspace);
        const fileHandle = await handle.getFileHandle(DIRECTORY_WORKSPACE_FILE_NAME);
        const remote = await readWorkspaceFile(fileHandle);

        if (expectedFingerprint !== null && remote.fingerprint !== expectedFingerprint) {
          throw new WorkspaceConflictError(undefined, remote.document, remote.fingerprint);
        }

        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(document, null, 2));
        await writable.close();
        const savedFile = await fileHandle.getFile();
        return { fingerprint: getFileFingerprint(savedFile) };
      } catch (error) {
        translatePermissionError(error);
      }
    },
  };
}