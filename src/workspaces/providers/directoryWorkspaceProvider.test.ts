import { describe, expect, it } from 'vitest';
import { createWorkspaceDocument } from '../workspaceDocument';
import {
  createDirectoryWorkspaceProvider,
  openDirectoryWorkspace,
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
    touchMetadata() {
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
  it('requests permission before opening an existing workspace', async () => {
    const directory = createMockDirectory();
    let permission: PermissionState = 'prompt';
    directory.handle.queryPermission = async () => permission;
    directory.handle.requestPermission = async () => {
      permission = 'granted';
      return permission;
    };

    const opened = await openDirectoryWorkspace(directory.handle);

    expect(permission).toBe('granted');
    expect(opened.document.workspaceId).toBe('directory-1');
  });

  it('creates a managed file only when the directory does not already contain one', async () => {
    const { createDirectoryWorkspace } = await import('./directoryWorkspaceProvider');
    const created = await createDirectoryWorkspace({ handle: createEmptyMockDirectory(), workspaceId: 'new-workspace' });
    expect(created.document.workspaceId).toBe('new-workspace');

    await expect(createDirectoryWorkspace({
      handle: createMockDirectory().handle,
      workspaceId: 'replacement',
    })).rejects.toThrow('already contains ucs-workspace.json');
  });

  it('uses an accessible handle when Android reports its permission as prompt', async () => {
    const directory = createMockDirectory();
    directory.handle.queryPermission = async () => 'prompt';
    const provider = createDirectoryWorkspaceProvider(async () => directory.handle);

    const loaded = await provider.load(workspace);
    await expect(provider.save(workspace, { ...loaded.document, revision: 1 }, loaded.fingerprint)).resolves.toEqual({
      fingerprint: expect.any(String),
    });
  });

  it('requires reconnection when the browser denies access to the directory', async () => {
    const directory = createMockDirectory();
    directory.handle.getFileHandle = async () => {
      throw new DOMException('Permission denied', 'NotAllowedError');
    };
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

  it('does not report a conflict when only file metadata changes', async () => {
    const directory = createMockDirectory();
    const provider = createDirectoryWorkspaceProvider(async () => directory.handle);
    const loaded = await provider.load(workspace);
    directory.touchMetadata();

    await expect(provider.save(workspace, { ...loaded.document, revision: 1 }, loaded.fingerprint)).resolves.toEqual({
      fingerprint: expect.any(String),
    });
  });

  it('returns the new fingerprint after a successful write', async () => {
    const directory = createMockDirectory();
    const provider = createDirectoryWorkspaceProvider(async () => directory.handle);
    const loaded = await provider.load(workspace);
    const result = await provider.save(workspace, { ...loaded.document, revision: 1 }, loaded.fingerprint);

    expect(result.fingerprint).not.toBe(loaded.fingerprint);
  });
});