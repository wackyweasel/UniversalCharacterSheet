import { useState } from 'react';
import { Copy, FolderOpen, HardDrive, LoaderCircle, X } from 'lucide-react';
import type { Character } from '../types';
import { useStorageWorkspaceStore } from '../store/useStorageWorkspaceStore';

interface CopyCharacterWorkspaceDialogProps {
  character: Character;
  darkMode: boolean;
  onClose: () => void;
}

export default function CopyCharacterWorkspaceDialog({ character, darkMode, onClose }: CopyCharacterWorkspaceDialogProps) {
  const workspaces = useStorageWorkspaceStore((state) => state.workspaces);
  const activeWorkspaceId = useStorageWorkspaceStore((state) => state.activeWorkspaceId);
  const copyCharacterToWorkspace = useStorageWorkspaceStore((state) => state.copyCharacterToWorkspace);
  const targets = workspaces.filter((workspace) => workspace.id !== activeWorkspaceId);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(targets[0]?.id ?? '');
  const [isCopying, setIsCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCopy = async () => {
    if (!selectedWorkspaceId) return;
    setIsCopying(true);
    setError(null);
    try {
      await copyCharacterToWorkspace(character.id, selectedWorkspaceId);
      onClose();
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : 'The character could not be copied.');
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="copy-character-workspace-title"
        className={`w-full max-w-md rounded-button border-2 p-5 shadow-theme animate-modal-in ${
          darkMode ? 'border-white/30 bg-black text-white' : 'border-theme-border bg-theme-paper text-theme-ink'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 id="copy-character-workspace-title" className="font-heading text-lg font-bold">Copy to workspace</h2>
            <p className={`mt-1 truncate font-body text-sm ${darkMode ? 'text-white/60' : 'text-gray-600'}`} title={character.name}>
              {character.name}
            </p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-8 w-8 items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        {targets.length === 0 ? (
          <p className={`mt-5 font-body text-sm ${darkMode ? 'text-white/70' : 'text-gray-700'}`}>
            Create another workspace before copying this character.
          </p>
        ) : (
          <div className="mt-5 space-y-2">
            {targets.map((workspace) => (
              <label
                key={workspace.id}
                className={`flex cursor-pointer items-center gap-3 rounded-button border p-3 font-body text-sm ${
                  selectedWorkspaceId === workspace.id
                    ? darkMode ? 'border-white bg-white/10' : 'border-theme-accent bg-theme-accent/10'
                    : darkMode ? 'border-white/20 hover:bg-white/10' : 'border-gray-300 hover:bg-gray-100'
                }`}
              >
                <input
                  type="radio"
                  name="target-workspace"
                  value={workspace.id}
                  checked={selectedWorkspaceId === workspace.id}
                  onChange={() => setSelectedWorkspaceId(workspace.id)}
                />
                {workspace.provider === 'directory' ? <FolderOpen className="h-4 w-4" /> : <HardDrive className="h-4 w-4" />}
                <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
              </label>
            ))}
          </div>
        )}

        {error && <p className={`mt-3 font-body text-sm ${darkMode ? 'text-amber-300' : 'text-red-700'}`}>{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-button border px-4 py-2 font-body text-sm font-bold ${darkMode ? 'border-white/30 hover:bg-white/10' : 'border-gray-300 hover:bg-gray-100'}`}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedWorkspaceId || isCopying}
            onClick={() => void handleCopy()}
            className={`flex items-center gap-2 rounded-button px-4 py-2 font-body text-sm font-bold disabled:opacity-50 ${
              darkMode ? 'bg-white text-black hover:bg-white/80' : 'bg-theme-accent text-theme-paper hover:bg-theme-accent-hover'
            }`}
          >
            {isCopying ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            Copy
          </button>
        </div>
      </section>
    </div>
  );
}