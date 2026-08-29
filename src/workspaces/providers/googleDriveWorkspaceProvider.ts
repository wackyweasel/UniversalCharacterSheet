import type { WorkspaceProvider } from './types';
import { WorkspaceConflictError, WorkspaceReconnectRequiredError } from './types';
import {
  downloadDriveWorkspace,
  getDriveFileMetadata,
  getDriveFingerprint,
  updateDriveWorkspaceFile,
} from '../google/driveApi';

const DRIVE_LOAD_TIMEOUT_MS = 10000;

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_resolve, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Google Drive did not respond while loading the workspace.')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
  }
}

export function createGoogleDriveWorkspaceProvider(
  getAccessToken: () => string | null,
  fetchImpl: typeof fetch = fetch,
  loadTimeoutMs = DRIVE_LOAD_TIMEOUT_MS,
): WorkspaceProvider {
  const requireAccessToken = () => {
    const accessToken = getAccessToken();
    if (!accessToken) throw new WorkspaceReconnectRequiredError('Connect Google Drive to open this workspace.');
    return accessToken;
  };

  return {
    async load(workspace) {
      if (!workspace.driveFileId) throw new Error('Google Drive workspace is missing its file ID.');
      const accessToken = requireAccessToken();
      const [metadata, document] = await withTimeout(
        Promise.all([
          getDriveFileMetadata(workspace.driveFileId, accessToken, fetchImpl),
          downloadDriveWorkspace(workspace.driveFileId, accessToken, fetchImpl),
        ]),
        loadTimeoutMs,
      );
      return { document, fingerprint: getDriveFingerprint(metadata) };
    },

    async save(workspace, document, expectedFingerprint) {
      if (!workspace.driveFileId) throw new Error('Google Drive workspace is missing its file ID.');
      const accessToken = requireAccessToken();
      const remoteMetadata = await getDriveFileMetadata(workspace.driveFileId, accessToken, fetchImpl);
      const remoteFingerprint = getDriveFingerprint(remoteMetadata);

      if (expectedFingerprint !== null && remoteFingerprint !== expectedFingerprint) {
        const remoteDocument = await downloadDriveWorkspace(workspace.driveFileId, accessToken, fetchImpl);
        throw new WorkspaceConflictError(undefined, remoteDocument, remoteFingerprint);
      }

      const savedMetadata = await updateDriveWorkspaceFile({
        fileId: workspace.driveFileId,
        document,
        accessToken,
        fetchImpl,
      });
      return { fingerprint: getDriveFingerprint(savedMetadata) };
    },
  };
}