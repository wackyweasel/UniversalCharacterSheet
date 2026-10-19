import { useState } from 'react';
import { Cloud, FolderOpen, LoaderCircle } from 'lucide-react';
import { useStorageWorkspaceStore } from '../store/useStorageWorkspaceStore';
import { supportsDirectoryWorkspaces } from '../workspaces/capabilities';
import { isGoogleDriveConfigured } from '../workspaces/google/googleClient';
import type { WorkspaceDirectoryHandle } from '../workspaces/providers/directoryWorkspaceProvider';
import type { WorkspaceDocument } from '../workspaces/types';

type DirectoryPickerWindow = Window & {
  showDirectoryPicker: () => Promise<WorkspaceDirectoryHandle>;
};

function formatTimestamp(value: string | undefined): string {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'unknown time';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' });
}

function describeDocument(document: WorkspaceDocument | null): string {
  if (!document) return 'unavailable';
  const count = document.characters.length;
  return `${formatTimestamp(document.updatedAt)} · ${count} character${count === 1 ? '' : 's'}`;
}

export default function WorkspaceConflictDialog({ darkMode }: { darkMode: boolean }) {
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
  const secondaryButton = darkMode ? 'border border-white/40 hover:bg-white/10' : 'border border-gray-400 hover:bg-gray-100';
  const mutedText = darkMode ? 'text-white/60' : 'text-gray-600';
  const remoteTime = Date.parse(conflict.remoteDocument?.updatedAt ?? '');
  const localTime = Date.parse(conflict.localDocument?.updatedAt ?? '');
  const externalIsNewer = conflict.remoteDocument !== null && (Number.isNaN(localTime) || remoteTime > localTime);
  const newest = externalIsNewer ? 'remote' : 'local';
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
      <section role="alertdialog" aria-modal="true" aria-labelledby="workspace-conflict-title" className={`w-full max-w-lg border-2 p-5 shadow-theme animate-modal-in ${darkMode ? 'border-white/30 bg-black text-white' : 'border-ink bg-paper text-ink'}`}>
        <h2 id="workspace-conflict-title" className="font-heading text-xl font-bold">Workspace changed elsewhere</h2>
        <p className={`mt-2 font-body text-sm ${darkMode ? 'text-white/75' : 'text-gray-700'}`}>
          {activeWorkspace?.name ?? 'This workspace'} was updated outside this browser while you had local changes. Autosave is paused.
        </p>
        {error && <p className={`mt-3 font-body text-sm ${darkMode ? 'text-amber-300' : 'text-red-700'}`}>{error}</p>}
        <div className="mt-5 grid gap-2">
          <button type="button" disabled={isBusy} onClick={() => void run(() => resolveConflict(newest))} className={`px-3 py-2 text-left font-body text-sm font-bold ${darkMode ? 'bg-white text-black hover:bg-white/85' : 'bg-gray-900 text-white hover:bg-gray-700'}`}>
            <span>Keep most recent ({newest === 'remote' ? 'external' : 'local'})</span>
            <span className="block text-xs font-normal opacity-75">
              {describeDocument(newest === 'remote' ? conflict.remoteDocument : conflict.localDocument)}
            </span>
          </button>
          <button type="button" disabled={isBusy || !conflict.remoteDocument} onClick={() => void run(() => resolveConflict('remote'))} className={`${secondaryButton} px-3 py-2 text-left font-body text-sm`}>
            <span className="font-bold">Keep external</span>
            <span className={`block text-xs ${mutedText}`}>{describeDocument(conflict.remoteDocument)}</span>
          </button>
          <button type="button" disabled={isBusy} onClick={() => void run(() => resolveConflict('local'))} className={`${secondaryButton} px-3 py-2 text-left font-body text-sm`}>
            <span className="font-bold">Keep local</span>
            <span className={`block text-xs ${mutedText}`}>{describeDocument(conflict.localDocument)}</span>
          </button>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {supportsDirectoryWorkspaces() && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void run(async () => {
                const handle = await (window as unknown as DirectoryPickerWindow).showDirectoryPicker();
                await saveAsNewDirectory(handle);
              })}
              className={`flex items-center justify-center gap-2 ${secondaryButton} px-3 py-2 font-body text-sm font-bold`}
            >
              <FolderOpen className="h-4 w-4" />
              Save in new directory
            </button>
          )}
          {isGoogleDriveConfigured() && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                const name = window.prompt('New workspace name', `${activeWorkspace?.name ?? 'Workspace'} copy`);
                if (name) void run(() => saveAsNewGoogleDrive(name));
              }}
              className={`flex items-center justify-center gap-2 ${secondaryButton} px-3 py-2 font-body text-sm font-bold`}
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