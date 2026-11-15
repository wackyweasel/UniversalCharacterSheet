import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AutomationsTab } from '../store/useAutomationsPanelStore';
import { useStore } from '../store/useStore';
import { useUndoStore } from '../store/useUndoStore';
import { TrashIcon, XIcon } from './icons';

export interface AutomationDeletion {
  tab: AutomationsTab;
  count: number;
  editableFormulaCount?: number;
}

const details: Record<AutomationsTab, string> = {
  effects: 'Items and other sources remain. Active bonuses and penalties are removed. Compendium library definitions stay unchanged.',
  labels: 'Standalone labels and their values are deleted. Widget label bindings are removed, but widget values, name-derived labels and sections remain. References in formulas and events may stop working.',
  formulas: 'Field values keep their stored results. Dice expressions are not deleted.',
  events: 'All events are deleted, including disabled events. Widgets and other automations remain.',
};

export default function AutomationsDeleteAllButton({ tab, count, editableFormulaCount = 0 }: AutomationDeletion) {
  const characterId = useStore((state) => state.activeCharacterId);
  const mode = useStore((state) => state.mode);
  const past = useUndoStore((state) => state.past);
  const [confirmedCharacterId, setConfirmedCharacterId] = useState<string | null>(null);
  const [editableOnly, setEditableOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ count: number; snapshotId: string } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const selectedCount = tab === 'formulas' && editableOnly ? editableFormulaCount : count;
  const latestSnapshot = past.filter((snapshot) => snapshot.characterId === characterId).slice(-1)[0];

  useEffect(() => {
    setConfirmedCharacterId(null);
    setNotice(null);
    setError(null);
  }, [characterId, tab]);

  useEffect(() => {
    if (!confirmedCharacterId) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus({ preventScroll: true });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setConfirmedCharacterId(null);
      } else if (event.key === 'Tab') {
        const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)') ?? []);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [confirmedCharacterId]);

  useEffect(() => {
    if (notice) undoRef.current?.focus({ preventScroll: true });
  }, [notice]);

  const confirm = () => {
    try {
      if (!confirmedCharacterId || useStore.getState().activeCharacterId !== confirmedCharacterId) throw new Error('The active character changed. Reopen the deletion dialog.');
      if (!useStore.getState().deleteAllAutomations(tab, editableOnly)) throw new Error('No entries remain to delete.');
      const snapshot = useUndoStore.getState().past.slice(-1)[0];
      setNotice({ count: selectedCount, snapshotId: snapshot.id });
      setConfirmedCharacterId(null);
      setError(null);
    } catch (cause) {
      console.error('Could not delete automations', cause);
      setError(cause instanceof Error ? cause.message : 'Could not delete automations.');
    }
  };

  return <>
    <button
      type="button"
      aria-label={`Delete all ${tab}`}
      disabled={!characterId || count === 0 || mode === 'print'}
      onClick={() => { setEditableOnly(false); setError(null); setConfirmedCharacterId(characterId); }}
      className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-button border border-red-500/40 px-2 text-xs font-body text-red-600 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
    ><TrashIcon className="h-3.5 w-3.5" /> Delete all</button>
    {confirmedCharacterId && createPortal(
      <div
        data-touch-camera-ignore="true"
        className="widget-edit-modal__backdrop fixed inset-0 z-[10000] flex items-center justify-center p-3"
        onClick={() => setConfirmedCharacterId(null)}
        onMouseDown={(event) => event.stopPropagation()}
        onMouseUp={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-all-automations-title"
          aria-describedby="delete-all-automations-description"
          className="widget-edit-modal__aux-dialog max-h-[92vh] w-full max-w-lg overflow-y-auto"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="widget-edit-modal__header border-b border-theme-border">
            <h2 id="delete-all-automations-title" className="widget-edit-modal__title font-heading font-bold text-theme-ink">Delete all {tab}?</h2>
          </header>
          <div className="space-y-3 p-4 text-sm font-body text-theme-ink">
            <p id="delete-all-automations-description">Delete {selectedCount} {tab} across this character, including entries hidden by search or filters. This can be undone in one step.</p>
            <p className="text-xs leading-relaxed text-theme-muted">{details[tab]}</p>
            {tab === 'formulas' && <fieldset className="space-y-2">
              <legend className="mb-2 text-xs font-semibold">Formulas to remove</legend>
              <label className="flex cursor-pointer items-start gap-2 rounded-button border border-theme-border p-3">
                <input type="radio" name="formula-deletion" checked={!editableOnly} onChange={() => setEditableOnly(false)} className="mt-0.5 accent-theme-accent" />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold">All formulas ({count})</span>
                  <span className="mt-1 block text-xs leading-relaxed text-theme-muted">Includes inline text, table templates, Compendium entries and events. Inline tokens are removed, keeping surrounding text. Event conditions are removed, making their actions unconditional; formula inputs reset to defaults, or are cleared if no default exists.</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 rounded-button border border-theme-border p-3">
                <input type="radio" name="formula-deletion" checked={editableOnly} onChange={() => setEditableOnly(true)} className="mt-0.5 accent-theme-accent" />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold">Only formulas with a Clear option ({editableFormulaCount})</span>
                  <span className="mt-1 block text-xs leading-relaxed text-theme-muted">Leaves inline text, table templates and event formulas unchanged.</span>
                </span>
              </label>
            </fieldset>}
            {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          </div>
          <footer className="widget-edit-modal__footer flex flex-wrap justify-end gap-2 border-t border-theme-border">
            <button ref={cancelRef} type="button" onClick={() => setConfirmedCharacterId(null)} className="widget-control px-3 py-2 text-xs font-semibold">Cancel</button>
            <button type="button" onClick={confirm} disabled={selectedCount === 0 || mode === 'print'} className="inline-flex items-center gap-1.5 rounded-button bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-40"><TrashIcon className="h-3.5 w-3.5" /> Delete {selectedCount} {tab}</button>
          </footer>
        </div>
      </div>,
      document.body,
    )}
    {notice && createPortal(
      <div role="status" className="fixed bottom-4 left-1/2 z-[10001] flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-3 rounded-button border border-theme-border bg-theme-paper px-3 py-2 text-xs font-body text-theme-ink shadow-lg">
        <span>{error ? <span role="alert" className="text-red-600">{error}</span> : <>Deleted {notice.count} {tab}.</>}</span>
        <button
          ref={undoRef}
          type="button"
          disabled={latestSnapshot?.id !== notice.snapshotId || mode === 'print'}
          title="Undo this deletion before making other changes, or use the sheet toolbar to undo later changes first."
          onClick={() => {
            if (useStore.getState().activeCharacterId !== characterId || useUndoStore.getState().past.filter((snapshot) => snapshot.characterId === characterId).slice(-1)[0]?.id !== notice.snapshotId) {
              setError('Undo later changes first, using the sheet toolbar.');
              return;
            }
            useStore.getState().undo();
            setNotice(null);
          }}
          className="font-semibold text-theme-accent underline disabled:opacity-40"
        >Undo</button>
        <button type="button" aria-label="Dismiss deletion notification" onClick={() => setNotice(null)} className="shrink-0 text-theme-muted hover:text-theme-ink"><XIcon className="h-3.5 w-3.5" /></button>
      </div>,
      document.body,
    )}
  </>;
}
