import { useState } from 'react';
import { LoaderCircle, RefreshCw } from 'lucide-react';
import { useStorageWorkspaceStore } from '../store/useStorageWorkspaceStore';
import { Tooltip } from './Tooltip';

type WorkspaceSyncStatus = ReturnType<typeof useStorageWorkspaceStore.getState>['syncStatus'];

function workspaceStatusText(syncStatus: WorkspaceSyncStatus) {
  if (syncStatus === 'loading') return 'Loading';
  if (syncStatus === 'saving') return 'Saving';
  if (syncStatus === 'pending') return 'Pending sync';
  if (syncStatus === 'reconnect') return 'Reconnect required';
  if (syncStatus === 'conflict') return 'Conflict';
  if (syncStatus === 'error') return 'Error';
  if (syncStatus === 'synced') return 'Saved';
  return 'Ready';
}

function workspaceStatusColor(syncStatus: WorkspaceSyncStatus) {
  if (syncStatus === 'conflict' || syncStatus === 'error') return 'bg-red-500';
  if (syncStatus === 'pending' || syncStatus === 'reconnect') return 'bg-amber-500';
  if (syncStatus === 'loading' || syncStatus === 'saving') return 'bg-blue-500';
  return 'bg-emerald-500';
}

function WorkspaceStatusMark({ syncStatus, busy = false }: { syncStatus: WorkspaceSyncStatus; busy?: boolean }) {
  if (busy || syncStatus === 'loading' || syncStatus === 'saving') {
    return <LoaderCircle className="h-3.5 w-3.5 flex-none animate-spin text-blue-500" />;
  }

  return <span className={`h-2.5 w-2.5 flex-none rounded-full ${workspaceStatusColor(syncStatus)}`} />;
}

export function WorkspaceStatusDot() {
  const workspaces = useStorageWorkspaceStore((state) => state.workspaces);
  const activeWorkspaceId = useStorageWorkspaceStore((state) => state.activeWorkspaceId);
  const syncStatus = useStorageWorkspaceStore((state) => state.syncStatus);
  const error = useStorageWorkspaceStore((state) => state.error);
  const reconnectDirectoryWorkspace = useStorageWorkspaceStore((state) => state.reconnectDirectoryWorkspace);
  const reconnectGoogleDriveWorkspace = useStorageWorkspaceStore((state) => state.reconnectGoogleDriveWorkspace);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectError, setReconnectError] = useState<string | null>(null);
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);

  if (!activeWorkspace || activeWorkspace.provider === 'browser') return null;

  const statusText = isReconnecting ? 'Reconnecting' : workspaceStatusText(syncStatus);
  const canReconnect = syncStatus === 'reconnect';

  const handleReconnect = async () => {
    setIsReconnecting(true);
    setReconnectError(null);
    try {
      if (activeWorkspace.provider === 'directory') {
        await reconnectDirectoryWorkspace(activeWorkspace.id);
      } else if (activeWorkspace.provider === 'google-drive') {
        await reconnectGoogleDriveWorkspace(activeWorkspace.id);
      }
    } catch (caughtError) {
      setReconnectError(caughtError instanceof Error ? caughtError.message : 'The workspace could not reconnect.');
    } finally {
      setIsReconnecting(false);
    }
  };

  return (
    <span className="flex shrink-0 items-center gap-0.5">
      <Tooltip content={reconnectError ?? error ?? `${activeWorkspace.name}: ${statusText}`} placement="below">
        <span
          role="status"
          aria-label={`${activeWorkspace.name}: ${statusText}`}
          className="flex h-4 w-4 shrink-0 items-center justify-center"
        >
          <WorkspaceStatusMark syncStatus={syncStatus} busy={isReconnecting} />
        </span>
      </Tooltip>
      {canReconnect && (
        <Tooltip content={`Reconnect ${activeWorkspace.name}`} placement="below">
          <button
            type="button"
            aria-label={`Reconnect ${activeWorkspace.name}`}
            disabled={isReconnecting}
            onClick={() => void handleReconnect()}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-button text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      )}
    </span>
  );
}