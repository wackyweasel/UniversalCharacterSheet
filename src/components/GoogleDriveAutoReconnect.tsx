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

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);

  useEffect(() => {
    if (!isHydrated || activeWorkspace?.provider !== 'google-drive') return;

    const reconnectIfNeeded = () => {
      if (
        document.visibilityState === 'hidden'
        || reconnectingRef.current
        || (syncStatus !== 'reconnect' && (syncStatus !== 'synced' || getGoogleDriveAccessToken()))
      ) {
        return;
      }

      reconnectingRef.current = true;
      void reconnectGoogleDriveWorkspace(activeWorkspace.id)
        .catch((error) => {
          console.warn('Google Drive could not be reconnected automatically.', error);
        })
        .finally(() => {
          reconnectingRef.current = false;
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