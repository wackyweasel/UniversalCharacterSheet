import type { StorageWorkspace, WorkspaceDocument } from '../types';

export interface WorkspaceLoadResult {
  document: WorkspaceDocument;
  fingerprint: string | null;
}

export interface WorkspaceSaveResult {
  fingerprint: string | null;
}

export class WorkspaceReconnectRequiredError extends Error {
  constructor(message = 'This workspace needs to be reconnected before it can be used.') {
    super(message);
    this.name = 'WorkspaceReconnectRequiredError';
  }
}

export class WorkspaceConflictError extends Error {
  constructor(
    message = 'The workspace changed outside Universal Character Sheet.',
    public readonly remoteDocument: WorkspaceDocument | null = null,
    public readonly remoteFingerprint: string | null = null,
  ) {
    super(message);
    this.name = 'WorkspaceConflictError';
  }
}

export interface WorkspaceProvider {
  load(workspace: StorageWorkspace): Promise<WorkspaceLoadResult>;
  save(
    workspace: StorageWorkspace,
    document: WorkspaceDocument,
    expectedFingerprint: string | null,
  ): Promise<WorkspaceSaveResult>;
}