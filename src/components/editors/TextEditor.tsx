import { useState } from 'react';
import { usePointerReorder } from '../../hooks';
import { EditorProps } from './types';
import { CollapsibleSection } from './CollapsibleSection';
import { Tooltip } from '../Tooltip';
import { GripVerticalIcon, TrashIcon } from '../icons';
import { addNoteTab, getActiveNoteTab, getNoteTabs, hasNoteContent, removeNoteTab, renameNoteTab } from '../../utils/noteTabs';
import type { NoteTab } from '../../types';

export function TextEditor({ widget, updateData }: EditorProps) {
  const tabs = getNoteTabs(widget.data);
  const activeTabId = getActiveNoteTab(widget.data)?.id;
  const [newTabName, setNewTabName] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const { setRowRef, startDrag, handleReorderKey } = usePointerReorder({
    items: tabs,
    onReorder: (noteTabs) => updateData({ noteTabs }),
  });

  const handleAddTab = (event: React.FormEvent) => {
    event.preventDefault();
    updateData(addNoteTab(widget.data, newTabName));
    setNewTabName('');
  };

  const deleteTab = (tab: NoteTab) => {
    setConfirmingDeleteId(null);
    updateData(removeNoteTab(widget.data, tab.id));
  };

  const handleRemoveTab = (tab: NoteTab) => {
    // Removing the last tab keeps its notes, so only real deletions need confirming.
    if (tabs.length > 1 && hasNoteContent(tab)) {
      setConfirmingDeleteId(tab.id);
      return;
    }
    deleteTab(tab);
  };

  const commitRename = (tab: NoteTab, name: string) => {
    if (name.trim() && name.trim() !== tab.name) updateData(renameNoteTab(widget.data, tab.id, name));
  };

  return (
    <div className="widget-editor widget-editor--text space-y-4">
      <CollapsibleSection>
        <div className="widget-editor__section-heading">
          <h3 id={`notes-tabs-title-${widget.id}`} className="widget-editor__section-title">Tabs</h3>
          <span className="widget-editor__section-count">{tabs.length}</span>
        </div>
        {tabs.length === 0 ? (
          <p className="text-sm text-theme-muted">
            Add a tab to split these notes into pages. Your current notes become "Tab 1". Double-click a tab on the sheet to rename it.
          </p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {tabs.map((tab, index) => {
              const isLastTab = tabs.length === 1;
              const removeLabel = isLastTab ? 'Remove tabs (keeps these notes)' : 'Delete tab';
              const tabLabel = tab.name || `tab ${index + 1}`;
              if (confirmingDeleteId === tab.id) {
                return (
                  <div
                    key={tab.id}
                    ref={(element) => setRowRef(tab.id, element)}
                    role="alertdialog"
                    aria-label={`Delete ${tabLabel}?`}
                    className="flex items-center gap-2 rounded-button border border-red-500 bg-red-500/10 p-1 pl-3 text-sm"
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.stopPropagation();
                        setConfirmingDeleteId(null);
                      }
                    }}
                  >
                    <span className="min-w-0 flex-1 text-theme-ink">
                      Delete <strong className="break-words">"{tab.name}"</strong>? Its notes will be lost.
                    </span>
                    <button
                      type="button"
                      autoFocus
                      onClick={() => setConfirmingDeleteId(null)}
                      className="h-10 flex-shrink-0 rounded-button border border-theme-border bg-theme-paper px-3 text-theme-ink transition-colors hover:border-theme-accent"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTab(tab)}
                      className="h-10 flex-shrink-0 rounded-button bg-red-600 px-3 font-semibold text-white transition-colors hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                );
              }
              return (
                <div
                  key={tab.id}
                  ref={(element) => setRowRef(tab.id, element)}
                  className="pointer-sort-row flex items-center gap-2 rounded-button border border-theme-border bg-theme-accent/5 p-1 text-sm transition-colors"
                >
                  <Tooltip content="Drag to reorder">
                    <button
                      type="button"
                      className="flex h-10 w-10 flex-shrink-0 cursor-grab items-center justify-center rounded-button px-1 text-theme-muted select-none touch-none hover:text-theme-ink active:cursor-grabbing disabled:cursor-default disabled:opacity-40"
                      onPointerDown={(event) => startDrag(tab.id, event)}
                      onKeyDown={(event) => handleReorderKey(tab.id, event)}
                      disabled={tabs.length < 2}
                      aria-label={`Reorder ${tabLabel}`}
                      title="Drag to reorder. Arrow keys also work."
                    >
                      <GripVerticalIcon className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  <input
                    key={`${tab.id}-${tab.name}`}
                    type="text"
                    defaultValue={tab.name}
                    maxLength={60}
                    aria-label={`Tab ${index + 1} name`}
                    className="min-w-0 flex-1 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm focus:outline-none focus:border-theme-accent"
                    onBlur={(event) => {
                      if (!event.target.value.trim()) event.target.value = tab.name;
                      commitRename(tab, event.target.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.currentTarget.blur();
                      if (event.key === 'Escape') {
                        event.currentTarget.value = tab.name;
                        event.currentTarget.blur();
                      }
                    }}
                  />
                  {tab.id === activeTabId && tabs.length > 1 && (
                    <span className="flex-shrink-0 text-xs text-theme-muted">Shown</span>
                  )}
                  <Tooltip content={removeLabel}>
                    <button
                      type="button"
                      onClick={() => handleRemoveTab(tab)}
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-button border border-theme-border text-red-500 transition-colors hover:border-red-500 hover:text-red-700"
                      aria-label={isLastTab ? removeLabel : `Delete ${tabLabel}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        )}
        <form onSubmit={handleAddTab} className="widget-editor__add-row flex gap-2 mt-2">
          <input
            type="text"
            value={newTabName}
            maxLength={60}
            onChange={(event) => setNewTabName(event.target.value)}
            placeholder="New tab name..."
            aria-label="New tab name"
            className="flex-1 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-theme-accent text-theme-paper rounded-button text-sm hover:opacity-90"
          >
            Add tab
          </button>
        </form>
      </CollapsibleSection>
    </div>
  );
}
