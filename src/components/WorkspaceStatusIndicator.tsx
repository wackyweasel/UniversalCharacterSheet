import { useState } from 'react';
import { LoaderCircle, RefreshCw } from 'lucide-react';
import { useStorageWorkspaceStore } from '../store/useStorageWorkspaceStore';

export default function WorkspaceStatusIndicator() {
  const workspaces = useStorageWorkspaceStore((state) => state.workspaces);
  const activeWorkspaceId = useStorageWorkspaceStore((state) => state.activeWorkspaceId);
  const syncStatus = useStorageWorkspaceStore((state) => state.syncStatus);
  const error = useStorageWorkspaceStore((state) => state.error);
  const reconnectDirectoryWorkspace = useStorageWorkspaceStore((state) => state.reconnectDirectoryWorkspace);
  const reconnectGoogleDriveWorkspace = useStorageWorkspaceStore((state) => state.reconnectGoogleDriveWorkspace);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectError, setReconnectError] = useState<string | null>(null);

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
  if (!activeWorkspace) return null;

  const statusText = isReconnecting
    ? 'Reconnecting'
    : syncStatus === 'loading'
      ? 'Loading'
      : syncStatus === 'saving'
        ? 'Saving'
        : syncStatus === 'pending'
          ? 'Pending sync'
          : syncStatus === 'reconnect'
            ? 'Reconnect required'
            : syncStatus === 'conflict'
              ? 'Conflict'
              : syncStatus === 'error'
                ? 'Error'
                : syncStatus === 'synced'
                  ? 'Saved'
                  : 'Ready';
  const statusColor = syncStatus === 'conflict' || syncStatus === 'error'
    ? 'bg-red-500'
    : syncStatus === 'pending' || syncStatus === 'reconnect'
      ? 'bg-amber-500'
      : syncStatus === 'loading' || syncStatus === 'saving' || isReconnecting
        ? 'bg-blue-500'
        : 'bg-emerald-500';
  const canReconnect = syncStatus === 'reconnect' && activeWorkspace.provider !== 'browser';

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
    <aside
      aria-label={`Workspace ${activeWorkspace.name}: ${statusText}`}
      title={reconnectError ?? error ?? `${activeWorkspace.name}: ${statusText}`}
      className="fixed right-2 top-14 z-30 flex max-w-[min(18rem,calc(100vw-1rem))] items-center gap-2 rounded-theme border-[length:var(--border-width)] border-theme-border bg-theme-paper px-2.5 py-1.5 font-body text-xs text-theme-ink shadow-theme print:hidden"
    >
      <span className={`h-2 w-2 flex-none rounded-full ${statusColor}`} />
      {(isReconnecting || syncStatus === 'loading' || syncStatus === 'saving') && (
        <LoaderCircle className="h-3.5 w-3.5 flex-none animate-spin text-theme-muted" />
      )}
      <span className="min-w-0 truncate">
        <span className="font-bold">{activeWorkspace.name}</span>
        <span className="text-theme-muted"> · {statusText}</span>
      </span>
      {canReconnect && (
        <button
          type="button"
          disabled={isReconnecting}
          onClick={() => void handleReconnect()}
          className="flex h-7 flex-none items-center gap-1 rounded-button border-[length:var(--border-width)] border-theme-border bg-theme-background px-2 font-body text-[11px] font-bold text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
          Reconnect
        </button>
      )}
    </aside>
  );
}