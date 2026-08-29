import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Cloud, CloudDownload, CloudUpload, FolderOpen, FolderSearch, HardDrive, LoaderCircle, RefreshCw, Trash2 } from 'lucide-react';
import { useStorageWorkspaceStore } from '../store/useStorageWorkspaceStore';
import {
  type WorkspaceDirectoryHandle,
} from '../workspaces/providers/directoryWorkspaceProvider';
import { isGoogleDriveConfigured } from '../workspaces/google/googleClient';
import { supportsDirectoryWorkspaces, supportsStorageWorkspaces } from '../workspaces/capabilities';

interface StorageWorkspaceMenuProps {
  darkMode: boolean;
}

type DirectoryPickerWindow = Window & {
  showDirectoryPicker: () => Promise<WorkspaceDirectoryHandle>;
};

export default function StorageWorkspaceMenu({ darkMode }: StorageWorkspaceMenuProps) {
  const workspaces = useStorageWorkspaceStore((state) => state.workspaces);
  const activeWorkspaceId = useStorageWorkspaceStore((state) => state.activeWorkspaceId);
  const syncStatus = useStorageWorkspaceStore((state) => state.syncStatus);
  const error = useStorageWorkspaceStore((state) => state.error);
  const switchWorkspace = useStorageWorkspaceStore((state) => state.switchWorkspace);
  const addDirectoryWorkspace = useStorageWorkspaceStore((state) => state.addDirectoryWorkspace);
  const openDirectoryWorkspace = useStorageWorkspaceStore((state) => state.openDirectoryWorkspace);
  const reconnectDirectoryWorkspace = useStorageWorkspaceStore((state) => state.reconnectDirectoryWorkspace);
  const addGoogleDriveWorkspace = useStorageWorkspaceStore((state) => state.addGoogleDriveWorkspace);
  const connectGoogleDrive = useStorageWorkspaceStore((state) => state.connectGoogleDrive);
  const openGoogleDriveWorkspace = useStorageWorkspaceStore((state) => state.openGoogleDriveWorkspace);
  const reconnectGoogleDriveWorkspace = useStorageWorkspaceStore((state) => state.reconnectGoogleDriveWorkspace);
  const forgetWorkspace = useStorageWorkspaceStore((state) => state.forgetWorkspace);
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [isOpen]);

  if (!supportsStorageWorkspaces()) return null;

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
  const directorySupported = supportsDirectoryWorkspaces();
  const requiresReconnect = syncStatus === 'reconnect' && activeWorkspace?.provider === 'directory';
  const requiresDriveReconnect = syncStatus === 'reconnect' && activeWorkspace?.provider === 'google-drive';
  const driveConfigured = isGoogleDriveConfigured();
  const statusText = syncStatus === 'saving'
    ? 'Saving'
    : syncStatus === 'pending'
      ? 'Pending sync'
      : syncStatus === 'reconnect'
        ? 'Reconnect required'
        : syncStatus === 'conflict'
          ? 'Conflict'
          : syncStatus === 'synced'
            ? 'Saved'
            : null;

  const run = async (operation: () => Promise<void>) => {
    setIsBusy(true);
    setOperationError(null);
    try {
      await operation();
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === 'AbortError') return;
      console.error('Workspace operation failed', caughtError);
      setOperationError(caughtError instanceof Error ? caughtError.message : 'The workspace operation failed.');
    } finally {
      setIsBusy(false);
    }
  };

  const chooseDirectory = () => (window as unknown as DirectoryPickerWindow).showDirectoryPicker();

  return (
    <div ref={menuRef} className="relative w-full sm:w-auto">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        disabled={isBusy || syncStatus === 'loading'}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex h-10 w-full items-center gap-2 rounded-button border px-3 text-left font-body text-sm transition-colors sm:w-auto sm:min-w-[230px] ${
          darkMode
            ? 'border-white/30 bg-black text-white hover:bg-white/10'
            : 'border-theme-border bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
        }`}
      >
        {activeWorkspace?.provider === 'directory'
          ? <FolderOpen className="h-4 w-4" />
          : activeWorkspace?.provider === 'google-drive'
            ? <Cloud className="h-4 w-4" />
            : <HardDrive className="h-4 w-4" />}
        <span className="min-w-0 flex-1 truncate">{activeWorkspace?.name ?? 'Browser'}</span>
        {statusText && <span className="text-[10px] opacity-70">{statusText}</span>}
        {isBusy || syncStatus === 'loading'
          ? <LoaderCircle className="h-4 w-4 animate-spin" />
          : <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Storage workspaces"
          className={`absolute left-0 top-full z-50 mt-2 w-full min-w-[280px] overflow-hidden rounded-button border shadow-lg animate-dropdown-in sm:w-[340px] ${
            darkMode ? 'border-white/30 bg-black text-white' : 'border-gray-300 bg-white text-gray-800'
          }`}
        >
          <div className={`px-3 py-2 text-[10px] font-bold uppercase ${darkMode ? 'text-white/50' : 'text-gray-500'}`}>
            Workspaces
          </div>
          {workspaces.map((workspace) => (
            <div key={workspace.id} className={`flex items-center ${workspace.id === activeWorkspaceId ? (darkMode ? 'bg-white/10' : 'bg-gray-100') : ''}`}>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={workspace.id === activeWorkspaceId}
                className={`flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left text-sm ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                onClick={() => void run(async () => {
                  await switchWorkspace(workspace.id);
                  setIsOpen(false);
                })}
              >
                {workspace.provider === 'directory'
                  ? <FolderOpen className="h-4 w-4 flex-none" />
                  : workspace.provider === 'google-drive'
                    ? <Cloud className="h-4 w-4 flex-none" />
                    : <HardDrive className="h-4 w-4 flex-none" />}
                <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
                {workspace.id === activeWorkspaceId && <span className="text-[10px] font-bold uppercase">Current</span>}
              </button>
              {workspace.provider !== 'browser' && (
                <button
                  type="button"
                  aria-label={`Forget ${workspace.name}`}
                  title="Forget from this browser"
                  className={`flex h-9 w-9 flex-none items-center justify-center ${darkMode ? 'hover:bg-white/10' : 'hover:bg-red-50 hover:text-red-600'}`}
                  onClick={() => {
                    if (!window.confirm(`Forget ${workspace.name} from this browser? The workspace file will not be deleted.`)) return;
                    void run(() => forgetWorkspace(workspace.id));
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}

          <div className={`border-t p-2 ${darkMode ? 'border-white/20' : 'border-gray-200'}`}>
            {requiresReconnect && directorySupported && (
              <button
                type="button"
                role="menuitem"
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-bold ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                onClick={() => void run(async () => {
                  await reconnectDirectoryWorkspace(activeWorkspaceId);
                  setIsOpen(false);
                })}
              >
                <RefreshCw className="h-4 w-4" />
                Reconnect directory
              </button>
            )}
            {requiresReconnect && directorySupported && (
              <button
                type="button"
                role="menuitem"
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                onClick={() => void run(async () => {
                  const handle = await chooseDirectory();
                  await reconnectDirectoryWorkspace(activeWorkspaceId, handle);
                  setIsOpen(false);
                })}
              >
                <FolderSearch className="h-4 w-4" />
                Choose directory again
              </button>
            )}
            {requiresDriveReconnect && driveConfigured && (
              <button
                type="button"
                role="menuitem"
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-bold ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                onClick={() => void run(async () => {
                  await reconnectGoogleDriveWorkspace(activeWorkspaceId);
                  setIsOpen(false);
                })}
              >
                <RefreshCw className="h-4 w-4" />
                Reconnect Google Drive
              </button>
            )}
            {directorySupported && (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-bold ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                  onClick={() => void run(async () => {
                    const handle = await chooseDirectory();
                    await addDirectoryWorkspace(handle);
                    setIsOpen(false);
                  })}
                >
                  <FolderOpen className="h-4 w-4" />
                  New local directory
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-bold ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                  onClick={() => void run(async () => {
                    const handle = await chooseDirectory();
                    await openDirectoryWorkspace(handle);
                    setIsOpen(false);
                  })}
                >
                  <FolderSearch className="h-4 w-4" />
                  Open local workspace
                </button>
              </>
            )}
            {driveConfigured && (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-bold ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                  onClick={() => void run(async () => {
                    const discoveredCount = await connectGoogleDrive();
                    if (discoveredCount === 0) {
                      throw new Error('No Google Drive workspaces were found. Create one or open an existing workspace file.');
                    }
                  })}
                >
                  <Cloud className="h-4 w-4" />
                  Connect Google Drive
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-bold ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                  onClick={() => {
                    const name = window.prompt('Workspace name');
                    if (!name) return;
                    void run(async () => {
                      await addGoogleDriveWorkspace(name);
                      setIsOpen(false);
                    });
                  }}
                >
                  <CloudUpload className="h-4 w-4" />
                  New Google Drive workspace
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-bold ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                  onClick={() => void run(async () => {
                    await openGoogleDriveWorkspace();
                    setIsOpen(false);
                  })}
                >
                  <CloudDownload className="h-4 w-4" />
                  Open Google Drive workspace
                </button>
              </>
            )}
          </div>
          {(operationError || error) && (
            <p className={`border-t px-3 py-2 text-xs ${darkMode ? 'border-white/20 text-amber-300' : 'border-gray-200 text-red-700'}`}>
              {operationError || error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}