import { describe, expect, it, vi } from 'vitest';
import { createWorkspaceDocument } from '../workspaceDocument';
import { createGoogleDriveWorkspaceProvider } from './googleDriveWorkspaceProvider';
import { WorkspaceConflictError, WorkspaceReconnectRequiredError } from './types';

const workspace = {
  id: 'drive-1',
  name: 'Campaign',
  provider: 'google-drive' as const,
  driveFileId: 'file-1',
  createdAt: '2026-08-27T00:00:00.000Z',
  lastOpenedAt: '2026-08-27T00:00:00.000Z',
};
const document = createWorkspaceDocument({ workspaceId: workspace.id, name: workspace.name });
const metadata = {
  id: 'file-1',
  name: 'Campaign.json',
  modifiedTime: '2026-08-27T00:00:00.000Z',
  version: '1',
  md5Checksum: 'checksum-1',
};

describe('Google Drive workspace provider', () => {
  it('requires a live access token', async () => {
    const provider = createGoogleDriveWorkspaceProvider(() => null);
    await expect(provider.load(workspace)).rejects.toBeInstanceOf(WorkspaceReconnectRequiredError);
  });

  it('loads metadata and content with an authorization header', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(metadata), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(document), { status: 200 }));
    const provider = createGoogleDriveWorkspaceProvider(() => 'token', fetchImpl);

    const result = await provider.load(workspace);

    expect(result).toEqual({ document, fingerprint: `md5:${metadata.md5Checksum}` });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0][1]?.headers).toEqual({ Authorization: 'Bearer token' });
  });

  it('stops waiting when Google Drive does not respond while loading', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(() => new Promise<Response>(() => undefined));
    const provider = createGoogleDriveWorkspaceProvider(() => 'token', fetchImpl, 10000);

    const loading = expect(provider.load(workspace))
      .rejects.toThrow('Google Drive did not respond while loading the workspace.');
    await vi.advanceTimersByTimeAsync(10000);

    await loading;
    vi.useRealTimers();
  });

  it('loads the remote document and raises a conflict before upload', async () => {
    const remoteDocument = { ...document, revision: 2 };
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...metadata, version: '2', md5Checksum: 'checksum-2' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(remoteDocument), { status: 200 }));
    const provider = createGoogleDriveWorkspaceProvider(() => 'token', fetchImpl);

    await expect(provider.save(workspace, { ...document, revision: 1 }, `md5:${metadata.md5Checksum}`))
      .rejects.toBeInstanceOf(WorkspaceConflictError);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not treat a metadata-only Drive revision as a conflict', async () => {
    const metadataOnlyRevision = { ...metadata, version: '2', modifiedTime: '2026-08-27T00:01:00.000Z' };
    const savedMetadata = { ...metadataOnlyRevision, version: '3', md5Checksum: 'checksum-2' };
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(metadataOnlyRevision), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(savedMetadata), { status: 200 }));
    const provider = createGoogleDriveWorkspaceProvider(() => 'token', fetchImpl);

    const result = await provider.save(workspace, { ...document, revision: 1 }, `md5:${metadata.md5Checksum}`);

    expect(result.fingerprint).toBe(`md5:${savedMetadata.md5Checksum}`);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('updates a small workspace with a media upload', async () => {
    const savedMetadata = {
      ...metadata,
      modifiedTime: '2026-08-27T00:01:00.000Z',
      version: '2',
      md5Checksum: 'checksum-2',
    };
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(metadata), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(savedMetadata), { status: 200 }));
    const provider = createGoogleDriveWorkspaceProvider(() => 'token', fetchImpl);

    const result = await provider.save(workspace, { ...document, revision: 1 }, `md5:${metadata.md5Checksum}`);

    expect(result.fingerprint).toBe(`md5:${savedMetadata.md5Checksum}`);
    expect(String(fetchImpl.mock.calls[1][0])).toContain('uploadType=media');
    expect(fetchImpl.mock.calls[1][1]?.method).toBe('PATCH');
  });
});