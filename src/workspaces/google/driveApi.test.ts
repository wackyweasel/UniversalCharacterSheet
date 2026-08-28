import { describe, expect, it, vi } from 'vitest';
import { createWorkspaceDocument } from '../workspaceDocument';
import { createDriveWorkspaceFile, listDriveWorkspaceFiles, tagDriveWorkspaceFile } from './driveApi';

const metadata = {
  id: 'file-1',
  name: 'Campaign.json',
  modifiedTime: '2026-08-28T00:00:00.000Z',
  version: '1',
};

describe('Google Drive workspace requests', () => {
  it('marks new files with private application properties', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(metadata), { status: 200 }),
    );
    const document = createWorkspaceDocument({ workspaceId: 'workspace-1', name: 'Campaign' });

    await createDriveWorkspaceFile({ name: 'Campaign', document, accessToken: 'token', fetchImpl });

    const requestBody = String(fetchImpl.mock.calls[0][1]?.body);
    expect(requestBody).toContain('"appProperties":{"ucsFormat":"workspace","ucsVersion":"1"}');
    expect(requestBody).not.toContain('"properties":{"ucsFormat"');
  });

  it('discovers private and legacy workspace tags across pages', async () => {
    const secondMetadata = { ...metadata, id: 'file-2', version: '2' };
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ files: [metadata], nextPageToken: 'next-page' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ files: [secondMetadata] }), { status: 200 }));

    const files = await listDriveWorkspaceFiles('token', fetchImpl);

    expect(files).toEqual([metadata, secondMetadata]);
    const firstUrl = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(firstUrl.searchParams.get('q')).toContain('appProperties');
    expect(firstUrl.searchParams.get('q')).toContain('properties');
    expect(firstUrl.searchParams.get('fields')).toContain('md5Checksum');
    expect(new URL(String(fetchImpl.mock.calls[1][0])).searchParams.get('pageToken')).toBe('next-page');
    expect(fetchImpl.mock.calls[0][1]?.headers).toEqual({ Authorization: 'Bearer token' });
  });

  it('tags a manually selected workspace for later discovery', async () => {
    const taggedMetadata = { ...metadata, version: '2' };
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(taggedMetadata), { status: 200 }),
    );

    const result = await tagDriveWorkspaceFile({
      fileId: metadata.id,
      workspaceVersion: 1,
      accessToken: 'token',
      fetchImpl,
    });

    expect(result).toEqual(taggedMetadata);
    expect(fetchImpl.mock.calls[0][1]?.method).toBe('PATCH');
    expect(fetchImpl.mock.calls[0][1]?.body).toBe('{"appProperties":{"ucsFormat":"workspace","ucsVersion":"1"}}');
  });
});