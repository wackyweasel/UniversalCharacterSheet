import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { createWorkspaceDocument } from './workspaceDocument';
import { WorkspaceRegistry } from './workspaceRegistry';

function createPreferences() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

describe('workspace registry', () => {
  it('creates one fixed Browser workspace and remembers the active workspace', async () => {
    const preferences = createPreferences();
    const registry = new WorkspaceRegistry(new IDBFactory(), preferences, 'registry-initialize');

    expect(await registry.initialize()).toHaveLength(1);
    expect((await registry.initialize())[0]).toMatchObject({ id: 'browser', provider: 'browser' });

    registry.setActiveWorkspaceId('directory-1');
    expect(registry.getActiveWorkspaceId()).toBe('directory-1');
    registry.setActiveWorkspaceId('browser');
    expect(registry.getActiveWorkspaceId()).toBe('browser');
  });

  it('persists an external workspace cache and pending-sync state', async () => {
    const registry = new WorkspaceRegistry(new IDBFactory(), createPreferences(), 'registry-cache');
    const document = createWorkspaceDocument({ workspaceId: 'directory-1', name: 'Campaign' });

    await registry.setCache({
      workspaceId: 'directory-1',
      document,
      fingerprint: '1:100',
      pendingSync: true,
    });

    expect(await registry.getCache('directory-1')).toEqual({
      workspaceId: 'directory-1',
      document,
      fingerprint: '1:100',
      pendingSync: true,
    });
  });

  it('forgets external metadata without allowing Browser removal', async () => {
    const registry = new WorkspaceRegistry(new IDBFactory(), createPreferences(), 'registry-remove');
    await registry.initialize();
    await registry.putWorkspace({
      id: 'directory-1',
      name: 'Campaign',
      provider: 'directory',
      createdAt: '2026-08-27T00:00:00.000Z',
      lastOpenedAt: '2026-08-27T00:00:00.000Z',
    });

    await registry.removeWorkspace('directory-1');
    await registry.removeWorkspace('browser');

    expect(await registry.getWorkspace('directory-1')).toBeNull();
    expect(await registry.getWorkspace('browser')).not.toBeNull();
  });
});