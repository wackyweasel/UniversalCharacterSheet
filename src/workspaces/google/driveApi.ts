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
  size?: string;
}

interface DriveFileListResponse {
  files?: DriveFileMetadata[];
  nextPageToken?: string;
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
  return `${metadata.version}:${metadata.modifiedTime}`;
}

export async function listDriveWorkspaceFiles(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DriveFileMetadata[]> {
  const files: DriveFileMetadata[] = [];
  let pageToken: string | undefined;

  do {
    const parameters = new URLSearchParams({
      q: "trashed = false and (appProperties has { key='ucsFormat' and value='workspace' } or properties has { key='ucsFormat' and value='workspace' })",
      fields: 'nextPageToken,files(id,name,modifiedTime,version,size)',
      orderBy: 'modifiedTime desc',
      pageSize: '1000',
    });
    if (pageToken) parameters.set('pageToken', pageToken);
    const response = await fetchImpl(`${DRIVE_FILES_URL}?${parameters}`, {
      headers: authorizationHeaders(accessToken),
    });
    const page = await requireSuccessfulResponse(response).then((result) => result.json()) as DriveFileListResponse;
    files.push(...(page.files ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);

  return files;
}

export async function getDriveFileMetadata(
  fileId: string,
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DriveFileMetadata> {
  const response = await fetchImpl(
    `${DRIVE_FILES_URL}/${encodeURIComponent(fileId)}?fields=id,name,modifiedTime,version,size&supportsAllDrives=true`,
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
    `${DRIVE_FILES_URL}/${encodeURIComponent(options.fileId)}?fields=id,name,modifiedTime,version,size&supportsAllDrives=true`,
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
      url: `${DRIVE_UPLOAD_URL}?uploadType=resumable&fields=id,name,modifiedTime,version,size`,
      metadata,
      serializedDocument,
      accessToken: options.accessToken,
      fetchImpl,
    });
  }

  const boundary = `ucs-${crypto.randomUUID()}`;
  const response = await fetchImpl(`${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name,modifiedTime,version,size`, {
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
      url: `${DRIVE_UPLOAD_URL}/${encodedFileId}?uploadType=resumable&fields=id,name,modifiedTime,version,size&supportsAllDrives=true`,
      serializedDocument,
      accessToken: options.accessToken,
      fetchImpl,
    });
  }

  const response = await fetchImpl(
    `${DRIVE_UPLOAD_URL}/${encodedFileId}?uploadType=media&fields=id,name,modifiedTime,version,size&supportsAllDrives=true`,
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