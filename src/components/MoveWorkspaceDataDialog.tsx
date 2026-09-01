import { useEffect, useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, Copy, LoaderCircle, MoveRight, X } from 'lucide-react';
import { useStorageWorkspaceStore, type WorkspaceTransferSelection } from '../store/useStorageWorkspaceStore';
import type { WorkspaceDocument } from '../workspaces/types';

type TransferCategory = keyof WorkspaceTransferSelection;

interface TransferSectionProps {
  title: string;
  items: Array<{ id: string; name: string }>;
  selectedIds: string[];
  expanded: boolean;
  darkMode: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onSelectedIdsChange: (ids: string[]) => void;
}

function TransferSection({
  title,
  items,
  selectedIds,
  expanded,
  darkMode,
  onExpandedChange,
  onSelectedIdsChange,
}: TransferSectionProps) {
  const selected = new Set(selectedIds);
  const allSelected = items.length > 0 && items.every((item) => selected.has(item.id));

  return (
    <section className={`overflow-hidden rounded-button border ${darkMode ? 'border-white/20' : 'border-gray-300'}`}>
      <div className={`flex min-h-11 items-center gap-2 px-3 ${darkMode ? 'bg-white/10' : 'bg-gray-100'}`}>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => onExpandedChange(!expanded)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left font-body text-sm font-bold"
        >
          {expanded ? <ChevronUp className="h-4 w-4 flex-none" /> : <ChevronDown className="h-4 w-4 flex-none" />}
          <span className="truncate">{title}</span>
          <span className="flex-none text-xs opacity-60">{selectedIds.length}/{items.length}</span>
        </button>
        <button
          type="button"
          disabled={items.length === 0}
          onClick={() => onSelectedIdsChange(allSelected ? [] : items.map((item) => item.id))}
          className={`flex-none px-2 py-1 font-body text-xs font-bold disabled:opacity-40 ${darkMode ? 'hover:bg-white/10' : 'hover:bg-white'}`}
        >
          {allSelected ? 'Unselect all' : 'Select all'}
        </button>
      </div>
      {expanded && (
        <div className={`max-h-40 overflow-y-auto border-t ${darkMode ? 'border-white/20' : 'border-gray-300'}`}>
          {items.length === 0 ? (
            <p className="px-3 py-3 font-body text-sm opacity-60">No {title.toLowerCase()} in this workspace.</p>
          ) : items.map((item) => (
            <label key={item.id} className={`flex cursor-pointer items-center gap-3 px-3 py-2 font-body text-sm ${darkMode ? 'hover:bg-white/10' : 'hover:bg-gray-50'}`}>
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={(event) => onSelectedIdsChange(
                  event.target.checked
                    ? [...selectedIds, item.id]
                    : selectedIds.filter((id) => id !== item.id),
                )}
              />
              <span className="min-w-0 flex-1 truncate" title={item.name}>{item.name}</span>
            </label>
          ))}
        </div>
      )}
    </section>
  );
}

interface MoveWorkspaceDataDialogProps {
  darkMode: boolean;
  onClose: () => void;
}

const EMPTY_SELECTION: WorkspaceTransferSelection = {
  characterIds: [],
  presetIds: [],
  themeIds: [],
  templateIds: [],
};

export default function MoveWorkspaceDataDialog({ darkMode, onClose }: MoveWorkspaceDataDialogProps) {
  const workspaces = useStorageWorkspaceStore((state) => state.workspaces);
  const activeWorkspaceId = useStorageWorkspaceStore((state) => state.activeWorkspaceId);
  const getWorkspaceContents = useStorageWorkspaceStore((state) => state.getWorkspaceContents);
  const transferWorkspaceData = useStorageWorkspaceStore((state) => state.transferWorkspaceData);
  const [sourceWorkspaceId, setSourceWorkspaceId] = useState(activeWorkspaceId);
  const [targetWorkspaceId, setTargetWorkspaceId] = useState(
    workspaces.find((workspace) => workspace.id !== activeWorkspaceId)?.id ?? '',
  );
  const [sourceDocument, setSourceDocument] = useState<WorkspaceDocument | null>(null);
  const [selection, setSelection] = useState<WorkspaceTransferSelection>(EMPTY_SELECTION);
  const [expanded, setExpanded] = useState<Record<TransferCategory, boolean>>({
    characterIds: true,
    presetIds: true,
    themeIds: true,
    templateIds: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferMode, setTransferMode] = useState<'copy' | 'move'>('copy');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isTransferring) onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isTransferring, onClose]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setSourceDocument(null);
    void getWorkspaceContents(sourceWorkspaceId)
      .then((document) => {
        if (cancelled) return;
        setSourceDocument(document);
        setSelection({
          characterIds: document.characters.map((item) => item.id),
          presetIds: document.userPresets.map((item) => item.id),
          themeIds: document.customThemes.map((item) => item.id),
          templateIds: document.templates.map((item) => item.id),
        });
      })
      .catch((caughtError) => {
        if (!cancelled) setError(caughtError instanceof Error ? caughtError.message : 'The workspace contents could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [getWorkspaceContents, sourceWorkspaceId]);

  const setCategorySelection = (category: TransferCategory, ids: string[]) => {
    setSelection((current) => ({ ...current, [category]: ids }));
  };

  const handleSourceChange = (workspaceId: string) => {
    setSourceWorkspaceId(workspaceId);
    if (targetWorkspaceId === workspaceId) {
      setTargetWorkspaceId(workspaces.find((workspace) => workspace.id !== workspaceId)?.id ?? '');
    }
  };

  const selectedCount = Object.values(selection).reduce((count, ids) => count + ids.length, 0);
  const handleTransfer = async () => {
    if (!targetWorkspaceId || selectedCount === 0) return;
    setIsTransferring(true);
    setError(null);
    try {
      await transferWorkspaceData(sourceWorkspaceId, targetWorkspaceId, selection, transferMode);
      onClose();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : `The selected workspace data could not be ${transferMode === 'copy' ? 'copied' : 'moved'}.`);
    } finally {
      setIsTransferring(false);
    }
  };

  const sections: Array<{ category: TransferCategory; title: string; items: Array<{ id: string; name: string }> }> = [
    { category: 'characterIds', title: 'Characters', items: sourceDocument?.characters ?? [] },
    { category: 'presetIds', title: 'Presets', items: sourceDocument?.userPresets ?? [] },
    { category: 'themeIds', title: 'Themes', items: sourceDocument?.customThemes ?? [] },
    { category: 'templateIds', title: 'Templates', items: sourceDocument?.templates ?? [] },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={isTransferring ? undefined : onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-workspace-data-title"
        className={`flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-button border-2 shadow-theme animate-modal-in ${
          darkMode ? 'border-white/30 bg-black text-white' : 'border-theme-border bg-theme-paper text-theme-ink'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={`flex items-start gap-3 border-b p-5 ${darkMode ? 'border-white/20' : 'border-gray-300'}`}>
          <div className="min-w-0 flex-1">
            <h2 id="transfer-workspace-data-title" className="font-heading text-xl font-bold">Transfer workspace data</h2>
            <p className={`mt-1 font-body text-sm ${darkMode ? 'text-white/60' : 'text-gray-600'}`}>
              {transferMode === 'copy'
                ? 'Selected items will be copied to the target workspace.'
                : 'Selected items will be removed from the origin after they are saved to the target.'}
            </p>
          </div>
          <button type="button" aria-label="Close" disabled={isTransferring} onClick={onClose} className="flex h-8 w-8 flex-none items-center justify-center disabled:opacity-40">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
            <label className="font-body text-xs font-bold uppercase">
              Origin workspace
              <select
                value={sourceWorkspaceId}
                disabled={isTransferring}
                onChange={(event) => handleSourceChange(event.target.value)}
                className={`mt-1.5 h-10 w-full rounded-button border px-3 font-body text-sm normal-case ${darkMode ? 'border-white/30 bg-black' : 'border-gray-300 bg-white'}`}
              >
                {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
              </select>
            </label>
            <ArrowRight className="mb-3 hidden h-5 w-5 opacity-50 sm:block" />
            <label className="font-body text-xs font-bold uppercase">
              Target workspace
              <select
                value={targetWorkspaceId}
                disabled={isTransferring}
                onChange={(event) => setTargetWorkspaceId(event.target.value)}
                className={`mt-1.5 h-10 w-full rounded-button border px-3 font-body text-sm normal-case ${darkMode ? 'border-white/30 bg-black' : 'border-gray-300 bg-white'}`}
              >
                {workspaces.filter((workspace) => workspace.id !== sourceWorkspaceId).map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
                ))}
              </select>
            </label>
          </div>

          <label className={`mt-4 flex cursor-pointer items-start gap-3 rounded-button border p-3 ${darkMode ? 'border-white/20 hover:bg-white/10' : 'border-gray-300 hover:bg-gray-50'}`}>
            <input
              type="checkbox"
              checked={transferMode === 'move'}
              disabled={isTransferring}
              onChange={(event) => setTransferMode(event.target.checked ? 'move' : 'copy')}
              className="mt-0.5"
            />
            <span className="min-w-0">
              <span className="block font-body text-sm font-bold">Move instead of copy</span>
              <span className={`mt-0.5 block font-body text-xs ${darkMode ? 'text-white/60' : 'text-gray-600'}`}>
                Remove selected items from the origin after the target is saved.
              </span>
            </span>
          </label>

          <div className="mt-5 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 font-body text-sm opacity-70">
                <LoaderCircle className="h-5 w-5 animate-spin" /> Loading workspace data
              </div>
            ) : sections.map((section) => (
              <TransferSection
                key={section.category}
                title={section.title}
                items={section.items}
                selectedIds={selection[section.category]}
                expanded={expanded[section.category]}
                darkMode={darkMode}
                onExpandedChange={(isExpanded) => setExpanded((current) => ({ ...current, [section.category]: isExpanded }))}
                onSelectedIdsChange={(ids) => setCategorySelection(section.category, ids)}
              />
            ))}
          </div>

          {error && <p role="alert" className={`mt-4 font-body text-sm ${darkMode ? 'text-amber-300' : 'text-red-700'}`}>{error}</p>}
        </div>

        <footer className={`flex items-center justify-end gap-2 border-t p-4 ${darkMode ? 'border-white/20' : 'border-gray-300'}`}>
          <button
            type="button"
            disabled={isTransferring}
            onClick={onClose}
            className={`rounded-button border px-4 py-2 font-body text-sm font-bold disabled:opacity-40 ${darkMode ? 'border-white/30 hover:bg-white/10' : 'border-gray-300 hover:bg-gray-100'}`}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isLoading || isTransferring || !targetWorkspaceId || selectedCount === 0}
            onClick={() => void handleTransfer()}
            className={`flex items-center gap-2 rounded-button px-4 py-2 font-body text-sm font-bold disabled:opacity-50 ${
              darkMode ? 'bg-white text-black hover:bg-white/80' : 'bg-theme-accent text-theme-paper hover:bg-theme-accent-hover'
            }`}
          >
            {isTransferring
              ? <LoaderCircle className="h-4 w-4 animate-spin" />
              : transferMode === 'copy'
                ? <Copy className="h-4 w-4" />
                : <MoveRight className="h-4 w-4" />}
            {transferMode === 'copy' ? 'Copy' : 'Move'} {selectedCount} {selectedCount === 1 ? 'item' : 'items'}
          </button>
        </footer>
      </section>
    </div>
  );
}