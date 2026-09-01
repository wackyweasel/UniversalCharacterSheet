import { afterEach, describe, expect, it, vi } from 'vitest';
import { supportsDirectoryWorkspaces, supportsStorageWorkspaces } from './capabilities';

describe('workspace capabilities', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('supports browser and Drive workspaces without a directory picker', () => {
    vi.stubGlobal('window', { isSecureContext: true });
    vi.stubGlobal('indexedDB', {});

    expect(supportsStorageWorkspaces()).toBe(true);
    expect(supportsDirectoryWorkspaces()).toBe(false);
  });

  it('enables directory workspaces only when the picker is available', () => {
    vi.stubGlobal('window', { isSecureContext: true, showDirectoryPicker: vi.fn() });
    vi.stubGlobal('indexedDB', {});

    expect(supportsStorageWorkspaces()).toBe(true);
    expect(supportsDirectoryWorkspaces()).toBe(true);
  });

  it('rejects workspace persistence outside a secure context', () => {
    vi.stubGlobal('window', { isSecureContext: false, showDirectoryPicker: vi.fn() });
    vi.stubGlobal('indexedDB', {});

    expect(supportsStorageWorkspaces()).toBe(false);
    expect(supportsDirectoryWorkspaces()).toBe(false);
  });
});