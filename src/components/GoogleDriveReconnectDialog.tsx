import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useStorageWorkspaceStore } from '../store/useStorageWorkspaceStore';
import { GoogleDriveIcon } from './icons';

export default function GoogleDriveReconnectDialog() {
  const workspaces = useStorageWorkspaceStore((state) => state.workspaces);
  const activeWorkspaceId = useStorageWorkspaceStore((state) => state.activeWorkspaceId);
  const syncStatus = useStorageWorkspaceStore((state) => state.syncStatus);
  const reconnectGoogleDriveWorkspace = useStorageWorkspaceStore((state) => state.reconnectGoogleDriveWorkspace);
  const [dismissedWorkspaceId, setDismissedWorkspaceId] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
  const shouldShow = activeWorkspace?.provider === 'google-drive'
    && syncStatus === 'reconnect'
    && dismissedWorkspaceId !== activeWorkspaceId;

  useEffect(() => {
    setDismissedWorkspaceId(null);
    setError(null);
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (syncStatus === 'synced') setDismissedWorkspaceId(null);
  }, [syncStatus]);

  if (!shouldShow || !activeWorkspace) return null;

  const handleReconnect = async () => {
    setIsReconnecting(true);
    setError(null);
    try {
      await reconnectGoogleDriveWorkspace(activeWorkspace.id);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Google Drive could not be reconnected.');
    } finally {
      setIsReconnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="google-drive-reconnect-title"
        className="w-full max-w-md rounded-theme border-2 border-ink bg-paper p-5 text-ink shadow-theme animate-modal-in"
      >
        <div className="flex items-start gap-4">
          <GoogleDriveIcon className="h-10 w-10 flex-none" />
          <div className="min-w-0">
            <h2 id="google-drive-reconnect-title" className="font-heading text-xl font-bold">
              Reconnect Google Drive
            </h2>
            <p className="mt-2 font-body text-sm leading-relaxed text-gray-700">
              Your previous Google Drive session ended when the tab closed. Your cached workspace is available, but it cannot sync until you reconnect.
            </p>
          </div>
        </div>

        {error && <p role="alert" className="mt-4 font-body text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            disabled={isReconnecting}
            onClick={() => setDismissedWorkspaceId(activeWorkspace.id)}
            className="rounded-button border border-gray-400 px-4 py-2 font-body text-sm font-bold hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            autoFocus
            disabled={isReconnecting}
            onClick={() => void handleReconnect()}
            className="flex min-w-[190px] items-center justify-center gap-2 rounded-button bg-theme-accent px-4 py-2 font-body text-sm font-bold text-theme-paper hover:bg-theme-accent-hover disabled:opacity-50"
          >
            {isReconnecting && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Reconnect Google Drive
          </button>
        </div>
      </section>
    </div>
  );
}