import { describe, expect, it, vi } from 'vitest';
import { createWorkspaceDocument } from '../workspaceDocument';
import { createDriveWorkspaceFile, tagDriveWorkspaceFile } from './driveApi';

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

  it('tags a manually selected workspace with UCS metadata', async () => {
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