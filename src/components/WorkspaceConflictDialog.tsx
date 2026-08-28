import { useState } from 'react';
import { Cloud, FolderOpen, LoaderCircle } from 'lucide-react';
import { useStorageWorkspaceStore } from '../store/useStorageWorkspaceStore';
import { isGoogleDriveConfigured } from '../workspaces/google/googleClient';
import type { WorkspaceDirectoryHandle } from '../workspaces/providers/directoryWorkspaceProvider';

type DirectoryPickerWindow = Window & {
  showDirectoryPicker: () => Promise<WorkspaceDirectoryHandle>;
};

export default function WorkspaceConflictDialog() {
  const conflict = useStorageWorkspaceStore((state) => state.conflict);
  const activeWorkspaceId = useStorageWorkspaceStore((state) => state.activeWorkspaceId);
  const workspaces = useStorageWorkspaceStore((state) => state.workspaces);
  const resolveConflict = useStorageWorkspaceStore((state) => state.resolveConflict);
  const saveAsNewDirectory = useStorageWorkspaceStore((state) => state.saveConflictAsNewDirectory);
  const saveAsNewGoogleDrive = useStorageWorkspaceStore((state) => state.saveConflictAsNewGoogleDrive);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!conflict) return null;

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
  const run = async (operation: () => Promise<void>) => {
    setIsBusy(true);
    setError(null);
    try {
      await operation();
    } catch (operationError) {
      setError(operationError instanceof Error ? operationError.message : 'Conflict resolution failed.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <section role="alertdialog" aria-modal="true" aria-labelledby="workspace-conflict-title" className="w-full max-w-lg border-2 border-ink bg-paper p-5 text-ink shadow-theme animate-modal-in">
        <h2 id="workspace-conflict-title" className="font-heading text-xl font-bold">Workspace changed elsewhere</h2>
        <p className="mt-2 font-body text-sm text-gray-700">
          {activeWorkspace?.name ?? 'This workspace'} was updated outside this browser while you had local changes. Autosave is paused.
        </p>
        {error && <p className="mt-3 font-body text-sm text-red-700">{error}</p>}
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button type="button" disabled={isBusy} onClick={() => void run(() => resolveConflict('remote'))} className="border border-gray-400 px-3 py-2 font-body text-sm font-bold hover:bg-gray-100">
            Load external version
          </button>
          <button type="button" disabled={isBusy} onClick={() => void run(() => resolveConflict('local'))} className="bg-theme-accent px-3 py-2 font-body text-sm font-bold text-theme-paper hover:bg-theme-accent-hover">
            Keep my changes
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void run(async () => {
              const handle = await (window as unknown as DirectoryPickerWindow).showDirectoryPicker();
              await saveAsNewDirectory(handle);
            })}
            className="flex items-center justify-center gap-2 border border-gray-400 px-3 py-2 font-body text-sm font-bold hover:bg-gray-100"
          >
            <FolderOpen className="h-4 w-4" />
            Save in new directory
          </button>
          {isGoogleDriveConfigured() && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                const name = window.prompt('New workspace name', `${activeWorkspace?.name ?? 'Workspace'} copy`);
                if (name) void run(() => saveAsNewGoogleDrive(name));
              }}
              className="flex items-center justify-center gap-2 border border-gray-400 px-3 py-2 font-body text-sm font-bold hover:bg-gray-100"
            >
              <Cloud className="h-4 w-4" />
              Save as new Drive file
            </button>
          )}
        </div>
        {isBusy && <div className="mt-4 flex items-center gap-2 font-body text-sm"><LoaderCircle className="h-4 w-4 animate-spin" /> Saving...</div>}
      </section>
    </div>
  );
}