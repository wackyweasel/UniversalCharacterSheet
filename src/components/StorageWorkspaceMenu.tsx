import { useEffect, useRef, useState } from 'react';
import { ChevronDown, FolderOpen, FolderSearch, HardDrive, LoaderCircle, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useStorageWorkspaceStore } from '../store/useStorageWorkspaceStore';
import type { StorageWorkspace } from '../workspaces/types';
import { supportsDirectoryWorkspaces, supportsStorageWorkspaces } from '../workspaces/capabilities';
import type { WorkspaceDirectoryHandle } from '../workspaces/providers/directoryWorkspaceProvider';
import AddWorkspaceDialog from './AddWorkspaceDialog';
import { GoogleDriveIcon } from './icons';

interface StorageWorkspaceMenuProps {
  darkMode: boolean;
}

type DirectoryPickerWindow = Window & {
  showDirectoryPicker: () => Promise<WorkspaceDirectoryHandle>;
};

function WorkspaceIcon({ workspace, className = 'h-4 w-4' }: { workspace: StorageWorkspace; className?: string }) {
  if (workspace.provider === 'directory') return <FolderOpen className={className} />;
  if (workspace.provider === 'google-drive') return <GoogleDriveIcon className={className} />;
  return <HardDrive className={className} />;
}

function workspaceDescription(workspace: StorageWorkspace): string {
  if (workspace.provider === 'browser') return 'Stored in this browser on this device.';
  if (workspace.provider === 'directory') return `This device / ${workspace.locationName ?? workspace.name}`;
  const fileName = workspace.locationName ?? `${workspace.name}.json`;
  return `Google Drive / ${fileName.toLowerCase().endsWith('.json') ? fileName : `${fileName}.json`}`;
}

export default function StorageWorkspaceMenu({ darkMode }: StorageWorkspaceMenuProps) {
  const workspaces = useStorageWorkspaceStore((state) => state.workspaces);
  const activeWorkspaceId = useStorageWorkspaceStore((state) => state.activeWorkspaceId);
  const supportsExternalWorkspaces = useStorageWorkspaceStore((state) => state.supportsExternalWorkspaces);
  const syncStatus = useStorageWorkspaceStore((state) => state.syncStatus);
  const error = useStorageWorkspaceStore((state) => state.error);
  const switchWorkspace = useStorageWorkspaceStore((state) => state.switchWorkspace);
  const reconnectDirectoryWorkspace = useStorageWorkspaceStore((state) => state.reconnectDirectoryWorkspace);
  const reconnectGoogleDriveWorkspace = useStorageWorkspaceStore((state) => state.reconnectGoogleDriveWorkspace);
  const forgetWorkspace = useStorageWorkspaceStore((state) => state.forgetWorkspace);
  const [isOpen, setIsOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  if (!supportsStorageWorkspaces() || !supportsExternalWorkspaces) return null;

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
  const statusText = syncStatus === 'saving'
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
              : null;
  const statusColor = syncStatus === 'conflict' || syncStatus === 'error'
    ? 'bg-red-500'
    : syncStatus === 'pending' || syncStatus === 'reconnect'
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  const run = async (operation: () => Promise<void>) => {
    setIsBusy(true);
    setOperationError(null);
    try {
      await operation();
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === 'AbortError') return;
      setOperationError(caughtError instanceof Error ? caughtError.message : 'The workspace operation failed.');
    } finally {
      setIsBusy(false);
    }
  };

  const chooseDirectory = () => (window as unknown as DirectoryPickerWindow).showDirectoryPicker();

  return (
    <>
      <div ref={menuRef} className="relative min-w-0">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          disabled={isBusy || syncStatus === 'loading'}
          onClick={() => setIsOpen((open) => !open)}
          title={`${activeWorkspace?.name ?? 'Browser'}${statusText ? `: ${statusText}` : ''}`}
          className={`flex h-14 w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-button border px-1 font-body text-[10px] transition-colors active:translate-y-px sm:h-10 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm ${
            darkMode
              ? 'border-white/30 bg-black text-white hover:bg-white/10'
              : 'border-theme-border bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
          }`}
        >
          {activeWorkspace && <WorkspaceIcon workspace={activeWorkspace} className="h-5 w-5 flex-none" />}
          <span className="flex min-w-0 flex-col items-start leading-none">
            <span className="max-w-full truncate text-[10px] sm:text-sm">{activeWorkspace?.name ?? 'Browser'}</span>
            <span className="mt-1 flex max-w-full items-center gap-1 text-[9px] opacity-70 sm:text-[10px]">
              {isBusy || syncStatus === 'loading'
                ? <LoaderCircle className="h-3 w-3 flex-none animate-spin" />
                : statusText && <span className={`h-1.5 w-1.5 flex-none rounded-full ${statusColor}`} />}
              {(isBusy || statusText) && <span className="truncate">{isBusy ? 'Working' : statusText}</span>}
            </span>
          </span>
          <ChevronDown className={`hidden h-3.5 w-3.5 flex-none transition-transform sm:block ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div
            role="menu"
            aria-label="Storage workspaces"
            className={`absolute left-0 top-full z-50 mt-2 max-h-[calc(100dvh-7rem)] w-[min(360px,calc(100vw-2rem))] overflow-y-auto rounded-button border shadow-lg animate-dropdown-in ${
              darkMode ? 'border-white/30 bg-black text-white' : 'border-gray-300 bg-white text-gray-800'
            }`}
          >
            <div className={`px-3 py-2 text-[10px] font-bold uppercase ${darkMode ? 'text-white/50' : 'text-gray-500'}`}>Workspaces</div>
            {workspaces.map((workspace) => {
              const isCurrent = workspace.id === activeWorkspaceId;
              const requiresDirectoryReconnect = isCurrent && syncStatus === 'reconnect' && workspace.provider === 'directory';
              const requiresDriveReconnect = isCurrent && syncStatus === 'reconnect' && workspace.provider === 'google-drive';
              return (
                <div key={workspace.id} className={`${isCurrent ? darkMode ? 'bg-white/10' : 'bg-gray-100' : ''}`}>
                  <div className="flex items-stretch">
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={isCurrent}
                      className={`flex min-w-0 flex-1 items-start gap-3 px-3 py-3 text-left ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                      onClick={() => void run(async () => {
                        await switchWorkspace(workspace.id);
                        setIsOpen(false);
                      })}
                    >
                      <WorkspaceIcon workspace={workspace} className="mt-0.5 h-4 w-4 flex-none" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 font-body text-sm font-bold">
                          <span className="truncate">{workspace.name}</span>
                          {isCurrent && <span className="flex-none text-[9px] uppercase opacity-60">Current</span>}
                        </span>
                        <span className="mt-0.5 block truncate font-body text-xs opacity-55">{workspaceDescription(workspace)}</span>
                      </span>
                    </button>
                    {workspace.provider !== 'browser' && (
                      <button
                        type="button"
                        aria-label={`Forget ${workspace.name}`}
                        title="Forget from this browser"
                        className={`flex w-10 flex-none items-center justify-center ${darkMode ? 'hover:bg-white/10' : 'hover:bg-red-50 hover:text-red-600'}`}
                        onClick={() => {
                          if (!window.confirm(`Forget ${workspace.name} from this browser? The workspace file will not be deleted.`)) return;
                          void run(() => forgetWorkspace(workspace.id));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {(requiresDirectoryReconnect || requiresDriveReconnect) && (
                    <div className={`flex flex-wrap gap-1 border-t px-3 py-2 ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
                      <button
                        type="button"
                        className={`flex items-center gap-2 rounded-button px-2 py-1.5 font-body text-xs font-bold ${darkMode ? 'hover:bg-white/10' : 'hover:bg-white'}`}
                        onClick={() => void run(async () => {
                          if (requiresDirectoryReconnect) await reconnectDirectoryWorkspace(workspace.id);
                          if (requiresDriveReconnect) await reconnectGoogleDriveWorkspace(workspace.id);
                          setIsOpen(false);
                        })}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Reconnect
                      </button>
                      {requiresDirectoryReconnect && supportsDirectoryWorkspaces() && (
                        <button
                          type="button"
                          className={`flex items-center gap-2 rounded-button px-2 py-1.5 font-body text-xs ${darkMode ? 'hover:bg-white/10' : 'hover:bg-white'}`}
                          onClick={() => void run(async () => {
                            await reconnectDirectoryWorkspace(workspace.id, await chooseDirectory());
                            setIsOpen(false);
                          })}
                        >
                          <FolderSearch className="h-3.5 w-3.5" />
                          Choose directory again
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div className={`border-t p-2 ${darkMode ? 'border-white/20' : 'border-gray-200'}`}>
              <button
                type="button"
                role="menuitem"
                className={`flex w-full items-center gap-3 rounded-button px-3 py-2.5 text-left font-body text-sm font-bold ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                onClick={() => {
                  setIsOpen(false);
                  setShowAddDialog(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add workspace
              </button>
            </div>

            {(operationError || error) && (
              <p role="alert" className={`border-t px-3 py-2 font-body text-xs ${darkMode ? 'border-white/20 text-amber-300' : 'border-gray-200 text-red-700'}`}>
                {operationError || error}
              </p>
            )}
          </div>
        )}
      </div>

      {showAddDialog && <AddWorkspaceDialog darkMode={darkMode} onClose={() => setShowAddDialog(false)} />}
    </>
  );
}