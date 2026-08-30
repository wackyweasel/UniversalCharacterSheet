import type { WorkspaceDocument } from '../types';
import { parseWorkspaceDocument } from '../workspaceDocument';
import { WorkspaceReconnectRequiredError } from '../providers/types';

const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const RESUMABLE_UPLOAD_THRESHOLD_BYTES = 5 * 1024 * 1024;
export const DRIVE_WORKSPACE_MIME_TYPE = 'application/json';

export interface DriveFileMetadata {
  id: string;
  name: string;
  modifiedTime: string;
  version: string;
  md5Checksum?: string;
  size?: string;
}

function authorizationHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

async function requireSuccessfulResponse(response: Response): Promise<Response> {
  if (response.ok) return response;
  if (response.status === 401 || response.status === 403) {
    throw new WorkspaceReconnectRequiredError('Reconnect Google Drive to continue syncing this workspace.');
  }
  const details = await response.text().catch(() => '');
  throw new Error(`Google Drive request failed (${response.status})${details ? `: ${details}` : ''}`);
}

export function getDriveFingerprint(metadata: DriveFileMetadata): string {
  if (metadata.md5Checksum) return `md5:${metadata.md5Checksum}`;
  return `${metadata.version}:${metadata.modifiedTime}`;
}

export async function getDriveFileMetadata(
  fileId: string,
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DriveFileMetadata> {
  const response = await fetchImpl(
    `${DRIVE_FILES_URL}/${encodeURIComponent(fileId)}?fields=id,name,modifiedTime,version,md5Checksum,size&supportsAllDrives=true`,
    { headers: authorizationHeaders(accessToken) },
  );
  return requireSuccessfulResponse(response).then((result) => result.json());
}

export async function downloadDriveWorkspace(
  fileId: string,
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<WorkspaceDocument> {
  const response = await fetchImpl(
    `${DRIVE_FILES_URL}/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    { headers: authorizationHeaders(accessToken) },
  );
  return parseWorkspaceDocument(await requireSuccessfulResponse(response).then((result) => result.json()));
}

export async function tagDriveWorkspaceFile(options: {
  fileId: string;
  workspaceVersion: number;
  accessToken: string;
  fetchImpl?: typeof fetch;
}): Promise<DriveFileMetadata> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(
    `${DRIVE_FILES_URL}/${encodeURIComponent(options.fileId)}?fields=id,name,modifiedTime,version,md5Checksum,size&supportsAllDrives=true`,
    {
      method: 'PATCH',
      headers: {
        ...authorizationHeaders(options.accessToken),
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        appProperties: { ucsFormat: 'workspace', ucsVersion: String(options.workspaceVersion) },
      }),
    },
  );
  return requireSuccessfulResponse(response).then((result) => result.json());
}

function createMultipartBody(metadata: Record<string, unknown>, serializedDocument: string, boundary: string): string {
  return [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    `Content-Type: ${DRIVE_WORKSPACE_MIME_TYPE}`,
    '',
    serializedDocument,
    `--${boundary}--`,
  ].join('\r\n');
}

async function uploadResumable(options: {
  method: 'POST' | 'PATCH';
  url: string;
  metadata?: Record<string, unknown>;
  serializedDocument: string;
  accessToken: string;
  fetchImpl: typeof fetch;
}): Promise<DriveFileMetadata> {
  const initialResponse = await options.fetchImpl(options.url, {
    method: options.method,
    headers: {
      ...authorizationHeaders(options.accessToken),
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': DRIVE_WORKSPACE_MIME_TYPE,
      'X-Upload-Content-Length': String(new Blob([options.serializedDocument]).size),
    },
    body: JSON.stringify(options.metadata ?? {}),
  });
  await requireSuccessfulResponse(initialResponse);
  const uploadUrl = initialResponse.headers.get('Location');
  if (!uploadUrl) throw new Error('Google Drive did not provide a resumable upload URL.');

  const uploadResponse = await options.fetchImpl(uploadUrl, {
    method: 'PUT',
    headers: {
      ...authorizationHeaders(options.accessToken),
      'Content-Type': DRIVE_WORKSPACE_MIME_TYPE,
    },
    body: options.serializedDocument,
  });
  return requireSuccessfulResponse(uploadResponse).then((result) => result.json());
}

export async function createDriveWorkspaceFile(options: {
  name: string;
  document: WorkspaceDocument;
  accessToken: string;
  fetchImpl?: typeof fetch;
}): Promise<DriveFileMetadata> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const serializedDocument = JSON.stringify(options.document, null, 2);
  const metadata = {
    name: options.name.toLowerCase().endsWith('.json') ? options.name : `${options.name}.json`,
    mimeType: DRIVE_WORKSPACE_MIME_TYPE,
    appProperties: { ucsFormat: 'workspace', ucsVersion: String(options.document.version) },
  };

  if (new Blob([serializedDocument]).size > RESUMABLE_UPLOAD_THRESHOLD_BYTES) {
    return uploadResumable({
      method: 'POST',
      url: `${DRIVE_UPLOAD_URL}?uploadType=resumable&fields=id,name,modifiedTime,version,md5Checksum,size`,
      metadata,
      serializedDocument,
      accessToken: options.accessToken,
      fetchImpl,
    });
  }

  const boundary = `ucs-${crypto.randomUUID()}`;
  const response = await fetchImpl(`${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name,modifiedTime,version,md5Checksum,size`, {
    method: 'POST',
    headers: {
      ...authorizationHeaders(options.accessToken),
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: createMultipartBody(metadata, serializedDocument, boundary),
  });
  return requireSuccessfulResponse(response).then((result) => result.json());
}

export async function updateDriveWorkspaceFile(options: {
  fileId: string;
  document: WorkspaceDocument;
  accessToken: string;
  fetchImpl?: typeof fetch;
}): Promise<DriveFileMetadata> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const serializedDocument = JSON.stringify(options.document, null, 2);
  const encodedFileId = encodeURIComponent(options.fileId);

  if (new Blob([serializedDocument]).size > RESUMABLE_UPLOAD_THRESHOLD_BYTES) {
    return uploadResumable({
      method: 'PATCH',
      url: `${DRIVE_UPLOAD_URL}/${encodedFileId}?uploadType=resumable&fields=id,name,modifiedTime,version,md5Checksum,size&supportsAllDrives=true`,
      serializedDocument,
      accessToken: options.accessToken,
      fetchImpl,
    });
  }

  const response = await fetchImpl(
    `${DRIVE_UPLOAD_URL}/${encodedFileId}?uploadType=media&fields=id,name,modifiedTime,version,md5Checksum,size&supportsAllDrives=true`,
    {
      method: 'PATCH',
      headers: {
        ...authorizationHeaders(options.accessToken),
        'Content-Type': DRIVE_WORKSPACE_MIME_TYPE,
      },
      body: serializedDocument,
    },
  );
  return requireSuccessfulResponse(response).then((result) => result.json());
}