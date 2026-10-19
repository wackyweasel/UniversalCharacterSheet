import { useEffect, useRef } from 'react';
import { useStorageWorkspaceStore } from '../store/useStorageWorkspaceStore';
import { getGoogleDriveAccessToken } from '../workspaces/google/googleClient';

export default function GoogleDriveAutoReconnect() {
  const workspaces = useStorageWorkspaceStore((state) => state.workspaces);
  const activeWorkspaceId = useStorageWorkspaceStore((state) => state.activeWorkspaceId);
  const isHydrated = useStorageWorkspaceStore((state) => state.isHydrated);
  const syncStatus = useStorageWorkspaceStore((state) => state.syncStatus);
  const reconnectGoogleDriveWorkspace = useStorageWorkspaceStore((state) => state.reconnectGoogleDriveWorkspace);
  const reconnectingRef = useRef(false);
  const failedWorkspaceRef = useRef<string | null>(null);

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);

  useEffect(() => {
    if (!isHydrated || activeWorkspace?.provider !== 'google-drive') return;
    if (syncStatus === 'synced' && getGoogleDriveAccessToken()) failedWorkspaceRef.current = null;

    const reconnectIfNeeded = () => {
      if (
        document.visibilityState === 'hidden'
        || reconnectingRef.current
        || failedWorkspaceRef.current === activeWorkspace.id
        || (syncStatus !== 'reconnect' && (syncStatus !== 'synced' || getGoogleDriveAccessToken()))
      ) {
        return;
      }

      reconnectingRef.current = true;
      void reconnectGoogleDriveWorkspace(activeWorkspace.id, { reuseToken: true })
        .catch((error) => {
          console.warn('Google Drive could not be reconnected automatically.', error);
        })
        .finally(() => {
          reconnectingRef.current = false;
          // After a failed or cancelled attempt, wait for the user instead of re-prompting on every focus.
          if (useStorageWorkspaceStore.getState().syncStatus !== 'synced') failedWorkspaceRef.current = activeWorkspace.id;
        });
    };

    reconnectIfNeeded();
    window.addEventListener('focus', reconnectIfNeeded);
    document.addEventListener('visibilitychange', reconnectIfNeeded);

    return () => {
      window.removeEventListener('focus', reconnectIfNeeded);
      document.removeEventListener('visibilitychange', reconnectIfNeeded);
    };
  }, [activeWorkspace, isHydrated, reconnectGoogleDriveWorkspace, syncStatus]);

  return null;
}