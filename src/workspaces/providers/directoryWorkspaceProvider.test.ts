import { describe, expect, it } from 'vitest';
import { createWorkspaceDocument } from '../workspaceDocument';
import {
  createDirectoryWorkspaceProvider,
  type WorkspaceDirectoryHandle,
  type WorkspaceFileHandle,
} from './directoryWorkspaceProvider';
import { WorkspaceConflictError, WorkspaceReconnectRequiredError } from './types';
import { createBrowserWorkspace } from './browserWorkspaceProvider';

function createMockDirectory(initialDocument = createWorkspaceDocument({ workspaceId: 'directory-1', name: 'Campaign' })) {
  let content = JSON.stringify(initialDocument);
  let lastModified = 1;
  const fileHandle: WorkspaceFileHandle = {
    async getFile() {
      return { lastModified, size: content.length, text: async () => content };
    },
    async createWritable() {
      let nextContent = content;
      return {
        async write(data) { nextContent = data; },
        async close() {
          content = nextContent;
          lastModified += 1;
        },
      };
    },
  };
  const handle: WorkspaceDirectoryHandle = {
    name: 'Campaign',
    queryPermission: async () => 'granted',
    requestPermission: async () => 'granted',
    getFileHandle: async () => fileHandle,
  };
  return {
    handle,
    replaceExternally(document: typeof initialDocument) {
      content = JSON.stringify(document);
      lastModified += 1;
    },
  };
}

function createEmptyMockDirectory() {
  let fileExists = false;
  let content = '';
  let lastModified = 1;
  const fileHandle: WorkspaceFileHandle = {
    async getFile() { return { lastModified, size: content.length, text: async () => content }; },
    async createWritable() {
      return {
        async write(data) { content = data; },
        async close() { fileExists = true; lastModified += 1; },
      };
    },
  };
  const handle: WorkspaceDirectoryHandle = {
    name: 'Empty',
    queryPermission: async () => 'granted',
    requestPermission: async () => 'granted',
    async getFileHandle(_name, options) {
      if (!fileExists && !options?.create) throw new DOMException('Missing', 'NotFoundError');
      return fileHandle;
    },
  };
  return handle;
}

const workspace = { ...createBrowserWorkspace(), id: 'directory-1', name: 'Campaign', provider: 'directory' as const };

describe('directory workspace provider', () => {
  it('creates a managed file only when the directory does not already contain one', async () => {
    const { createDirectoryWorkspace } = await import('./directoryWorkspaceProvider');
    const created = await createDirectoryWorkspace({ handle: createEmptyMockDirectory(), workspaceId: 'new-workspace' });
    expect(created.document.workspaceId).toBe('new-workspace');

    await expect(createDirectoryWorkspace({
      handle: createMockDirectory().handle,
      workspaceId: 'replacement',
    })).rejects.toThrow('already contains ucs-workspace.json');
  });

  it('requires explicit reconnection instead of requesting permission during load', async () => {
    const directory = createMockDirectory();
    directory.handle.queryPermission = async () => 'prompt';
    const provider = createDirectoryWorkspaceProvider(async () => directory.handle);

    await expect(provider.load(workspace)).rejects.toBeInstanceOf(WorkspaceReconnectRequiredError);
  });

  it('detects an external change before overwriting the file', async () => {
    const directory = createMockDirectory();
    const provider = createDirectoryWorkspaceProvider(async () => directory.handle);
    const loaded = await provider.load(workspace);
    directory.replaceExternally({ ...loaded.document, revision: 2 });

    await expect(provider.save(workspace, { ...loaded.document, revision: 1 }, loaded.fingerprint))
      .rejects.toBeInstanceOf(WorkspaceConflictError);
  });

  it('returns the new fingerprint after a successful write', async () => {
    const directory = createMockDirectory();
    const provider = createDirectoryWorkspaceProvider(async () => directory.handle);
    const loaded = await provider.load(workspace);
    const result = await provider.save(workspace, { ...loaded.document, revision: 1 }, loaded.fingerprint);

    expect(result.fingerprint).not.toBe(loaded.fingerprint);
  });
});