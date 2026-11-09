import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store/useStore';
import { useCompendiumPanelStore } from '../store/useCompendiumPanelStore';
import type { CompendiumSection, InventoryItem } from '../types';
import {
  compendiumItemMatches,
  describeCompendiumImport,
  describeCompendiumReplace,
  getCompendiumSections,
  parseCompendiumImport,
  serializeCompendium,
  type CompendiumImportMode,
} from '../utils/compendium';
import { createInventoryFieldTemplate, duplicateInventoryItem } from '../utils/inventory';
import InventoryItemDialog from './widgets/InventoryItemDialog';
import { InlineDiceRichText } from './InlineDiceRichText';
import {
  BookIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  XIcon,
} from './icons';

const SIZE_STORAGE_KEY = 'ucs-compendium-panel-size';
// Entries carry a weight so Inventory and Equipment widgets that track encumbrance can use it.
const ENTRY_DEFAULT_FIELDS = [createInventoryFieldTemplate('Weight', 'number', 'weight')];
const DEFAULT_WIDTH = 420;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 220;
const BOTTOM_LAYOUT_QUERY = '(max-width: 639px)';
const ACCENT_TINT = { background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)' };

const buttonClass = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-button border border-theme-border px-2.5 text-xs font-body text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper disabled:cursor-not-allowed disabled:opacity-40';
const primaryButtonClass = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-button border border-theme-accent bg-theme-accent px-3 text-xs font-bold font-body text-theme-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40';
const iconButtonClass = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-button text-theme-muted transition-colors hover:bg-theme-accent hover:text-theme-paper';
const inputClass = 'h-9 w-full rounded-button border border-theme-border bg-theme-background px-2.5 text-sm font-body text-theme-ink placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-theme-accent/40';
const menuItemClass = 'block w-full px-3 py-2 text-left text-xs font-body text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper';

function loadPanelSize(): { width: number; height: number | null } {
  try {
    const data = JSON.parse(localStorage.getItem(SIZE_STORAGE_KEY) || '{}');
    return {
      width: typeof data.width === 'number' ? data.width : DEFAULT_WIDTH,
      height: typeof data.height === 'number' ? data.height : null,
    };
  } catch {
    return { width: DEFAULT_WIDTH, height: null };
  }
}

function useIsBottomLayout(): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(BOTTOM_LAYOUT_QUERY).matches);
  useEffect(() => {
    const query = window.matchMedia(BOTTOM_LAYOUT_QUERY);
    const update = () => setMatches(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return matches;
}

function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function ModalShell({ title, titleId, onClose, children }: { title: string; titleId: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      data-touch-camera-ignore="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-3 animate-fade-in"
      onClick={onClose}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-theme border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink shadow-theme animate-modal-in"
      >
        <div className="flex items-center justify-between border-b border-theme-border px-4 py-2.5">
          <h2 id={titleId} className="font-heading text-base font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="widget-control h-7 w-7">
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-3 overflow-y-auto p-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

function ExportDialog({ sections, onClose }: { sections: CompendiumSection[]; onClose: () => void }) {
  const text = useMemo(() => serializeCompendium(sections), [sections]);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the text stays selectable.
    }
  };

  return (
    <ModalShell title="Export compendium" titleId="compendium-export-title" onClose={onClose}>
      <p className="text-xs text-theme-muted font-body">Copy this text, or download it, then import it into another character's compendium.</p>
      <textarea
        readOnly
        value={text}
        aria-label="Exported compendium data"
        onFocus={(event) => event.currentTarget.select()}
        className="h-56 w-full resize-none rounded-button border border-theme-border bg-theme-background p-2 font-mono text-xs text-theme-ink focus:outline-none"
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => downloadText('compendium.json', text)} className={buttonClass}>Download file</button>
        <button type="button" onClick={handleCopy} className={primaryButtonClass}>{copied ? 'Copied!' : 'Copy to Clipboard'}</button>
      </div>
    </ModalShell>
  );
}

function ImportDialog({ initialText, onImport, onClose }: { initialText: string; onImport: (text: string, mode: CompendiumImportMode) => string | null; onClose: () => void }) {
  const [text, setText] = useState(initialText);
  const [mode, setMode] = useState<CompendiumImportMode>('add');
  const [error, setError] = useState<string | null>(null);

  const modeOptions: { value: CompendiumImportMode; label: string; hint: string }[] = [
    { value: 'add', label: 'Add to compendium', hint: 'Entries go into sections with the same name; entries that already exist are skipped.' },
    { value: 'replace', label: 'Replace compendium', hint: 'Every current section and entry is removed first. You can undo this.' },
  ];

  return (
    <ModalShell title="Import compendium" titleId="compendium-import-title" onClose={onClose}>
      <p className="text-xs text-theme-muted font-body">Paste exported compendium data, or load it from a file.</p>
      <textarea
        autoFocus
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setError(null);
        }}
        aria-label="Compendium data to import"
        placeholder="Paste compendium JSON here"
        className="h-56 w-full resize-none rounded-button border border-theme-border bg-theme-background p-2 font-mono text-xs text-theme-ink focus:outline-none focus:ring-2 focus:ring-theme-accent/40"
      />
      <fieldset className="space-y-1.5">
        <legend className="mb-1 text-xs font-bold font-body text-theme-ink">When importing</legend>
        {modeOptions.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-start gap-2">
            <input
              type="radio"
              name="compendium-import-mode"
              value={option.value}
              checked={mode === option.value}
              onChange={() => setMode(option.value)}
              className="mt-0.5 accent-[var(--color-accent)]"
            />
            <span className="text-xs font-body text-theme-ink">
              {option.label}
              <span className="block text-theme-muted">{option.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {error && <p role="alert" className="text-xs text-red-500 font-body">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={buttonClass}>Cancel</button>
        <button
          type="button"
          disabled={!text.trim()}
          onClick={() => {
            const failure = onImport(text, mode);
            if (failure) setError(failure);
            else onClose();
          }}
          className={primaryButtonClass}
        >
          {mode === 'replace' ? 'Replace' : 'Import'}
        </button>
      </div>
    </ModalShell>
  );
}

type DialogState =
  | { kind: 'item'; sectionId: string; item?: InventoryItem }
  | { kind: 'export' }
  | { kind: 'import'; text: string }
  | null;

export default function CompendiumPanel() {
  const isOpen = useCompendiumPanelStore((state) => state.isOpen);
  const setOpen = useCompendiumPanelStore((state) => state.setOpen);
  const character = useStore((state) => state.characters.find((item) => item.id === state.activeCharacterId) ?? null);
  const addSection = useStore((state) => state.addCompendiumSection);
  const renameSection = useStore((state) => state.renameCompendiumSection);
  const deleteSection = useStore((state) => state.deleteCompendiumSection);
  const saveItem = useStore((state) => state.saveCompendiumItem);
  const deleteItem = useStore((state) => state.deleteCompendiumItem);
  const importSections = useStore((state) => state.importCompendiumSections);
  const undo = useStore((state) => state.undo);

  const [query, setQuery] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedDescriptionIds, setExpandedDescriptionIds] = useState<Set<string>>(() => new Set());
  const [menu, setMenu] = useState<'import' | 'export' | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [toast, setToast] = useState<{ message: string; undoable: boolean } | null>(null);
  const [panelSize, setPanelSize] = useState(loadPanelSize);
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const isBottom = useIsBottomLayout();
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const sections = useMemo(() => getCompendiumSections(character ?? undefined), [character]);
  const normalizedQuery = query.trim();

  const visibleSections = useMemo(() => sections.flatMap((section) => {
    if (!normalizedQuery) return [{ section, items: section.items }];
    const items = section.items.filter((item) => compendiumItemMatches(item, normalizedQuery));
    const nameMatches = section.name.toLowerCase().includes(normalizedQuery.toLowerCase());
    return items.length > 0 || nameMatches ? [{ section, items: nameMatches ? section.items : items }] : [];
  }), [sections, normalizedQuery]);

  useEffect(() => {
    if (isOpen) return;
    setQuery('');
    setRenamingId(null);
    setConfirmDeleteId(null);
    setMenu(null);
    setToast(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (menu) setMenu(null);
      else if (renamingId) setRenamingId(null);
      else if (query) setQuery('');
      else setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, menu, query, renamingId, setOpen]);

  useEffect(() => {
    if (!menu) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(null);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [menu]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handleResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxWidth = Math.max(MIN_WIDTH, Math.round(viewport.w * 0.9));
  const maxHeight = Math.max(MIN_HEIGHT, Math.round(viewport.h * 0.95));
  const effectiveWidth = Math.min(Math.max(panelSize.width, MIN_WIDTH), maxWidth);
  const effectiveHeight = Math.min(Math.max(panelSize.height ?? Math.round(viewport.h * 0.72), MIN_HEIGHT), maxHeight);

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeStartRef.current = { x: event.clientX, y: event.clientY, width: effectiveWidth, height: effectiveHeight };
  };
  const handleResizeMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = resizeStartRef.current;
    if (!start) return;
    if (isBottom) {
      const height = Math.min(Math.max(start.height + (start.y - event.clientY), MIN_HEIGHT), maxHeight);
      setPanelSize((size) => ({ ...size, height }));
    } else {
      const width = Math.min(Math.max(start.width + (start.x - event.clientX), MIN_WIDTH), maxWidth);
      setPanelSize((size) => ({ ...size, width }));
    }
  };
  const handleResizeEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeStartRef.current) return;
    resizeStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    try {
      localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(panelSize));
    } catch {
      // Size persistence is best-effort.
    }
  };

  if (!isOpen || !character) return null;

  const runImport = (text: string, mode: CompendiumImportMode): string | null => {
    const parsed = parseCompendiumImport(text);
    if (!parsed.ok) return parsed.error;
    const result = importSections(parsed.sections, mode);
    if (!result) return 'Open a character before importing a compendium.';
    setToast({
      message: mode === 'replace' ? describeCompendiumReplace(result) : describeCompendiumImport(result),
      undoable: result.addedItems > 0 || result.addedSections > 0,
    });
    return null;
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDialog({ kind: 'import', text: String(reader.result ?? '') });
    reader.onerror = () => setToast({ message: 'The file could not be read.', undoable: false });
    reader.readAsText(file);
  };

  const handleAddSection = (event: React.FormEvent) => {
    event.preventDefault();
    const id = addSection(newSectionName);
    if (!id) return;
    setNewSectionName('');
    setCollapsed((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  };

  const startRename = (section: CompendiumSection) => {
    setRenamingId(section.id);
    setRenameValue(section.name);
    setConfirmDeleteId(null);
  };

  const commitRename = () => {
    if (!renamingId) return;
    const name = renameValue.trim();
    const current = sections.find((section) => section.id === renamingId);
    if (name && current && name !== current.name) renameSection(renamingId, name);
    setRenamingId(null);
  };

  const handleDeleteSection = (section: CompendiumSection) => {
    deleteSection(section.id);
    setConfirmDeleteId(null);
    setToast({ message: `Deleted section “${section.name}”`, undoable: true });
  };

  const toggleCollapsed = (id: string) => setCollapsed((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const renderEntry = (section: CompendiumSection, item: InventoryItem) => {
    const hasDescription = Boolean(item.description?.trim());
    const descriptionExpanded = hasDescription && expandedDescriptionIds.has(item.id);
    const descriptionId = `compendium-description-${item.id}`;
    const attributes = item.fields.filter((field) => (
      field.name.trim() && String(field.value) !== '' && field.value !== false && !(field.reserved === 'weight' && Number(field.value) === 0)
    ));
    return (
      <li key={item.id} className="flex items-start gap-2 rounded-button border border-theme-border-soft bg-theme-background/40 px-2.5 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold font-body text-theme-ink">
            {item.name}
            {item.quantity !== undefined && <span className="ml-1.5 text-xs font-normal text-theme-muted">×{item.quantity}</span>}
          </p>
          {attributes.length > 0 && (
            <p className="mt-0.5 line-clamp-2 text-xs text-theme-muted font-body">
              {attributes.map((field) => (field.type === 'checkbox' ? field.name : `${field.name}: ${field.value}`)).join(' · ')}
            </p>
          )}
          {hasDescription && (
            <div className="mt-1">
              <button
                type="button"
                aria-expanded={descriptionExpanded}
                aria-controls={descriptionId}
                onClick={() => setExpandedDescriptionIds((current) => {
                  const next = new Set(current);
                  if (next.has(item.id)) next.delete(item.id);
                  else next.add(item.id);
                  return next;
                })}
                className="flex items-center gap-0.5 text-xs font-body text-theme-muted hover:text-theme-accent"
              >
                <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${descriptionExpanded ? '' : '-rotate-90'}`} />
                Description
              </button>
              {descriptionExpanded && (
                <div id={descriptionId} className="notes-rich-text__content !min-h-0 !p-0 !pt-1 !text-xs">
                  <InlineDiceRichText html={item.description!} />
                </div>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDialog({ kind: 'item', sectionId: section.id, item })}
          className={iconButtonClass}
          aria-label={`Edit ${item.name}`}
          title="Edit entry"
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </button>
      </li>
    );
  };

  const renderSection = ({ section, items }: { section: CompendiumSection; items: InventoryItem[] }) => {
    const isCollapsed = !normalizedQuery && collapsed.has(section.id);
    const isRenaming = renamingId === section.id;
    const isConfirmingDelete = confirmDeleteId === section.id;
    return (
      <section key={section.id} data-compendium-section={section.id} className="rounded-theme border border-theme-border bg-theme-paper">
        <div className="flex items-center gap-1 px-2 py-1.5">
          <button
            type="button"
            onClick={() => toggleCollapsed(section.id)}
            className={iconButtonClass}
            aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${section.name}`}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
          </button>
          {isRenaming ? (
            <form
              className="flex min-w-0 flex-1 items-center gap-1"
              onSubmit={(event) => {
                event.preventDefault();
                commitRename();
              }}
            >
              <input
                autoFocus
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                aria-label="Section name"
                className={`${inputClass} h-8`}
              />
              <button type="submit" className={iconButtonClass} aria-label="Save section name" title="Save"><CheckIcon className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => setRenamingId(null)} className={iconButtonClass} aria-label="Cancel rename" title="Cancel"><XIcon className="h-3.5 w-3.5" /></button>
            </form>
          ) : (
            <>
              <h3 className="min-w-0 flex-1 truncate font-heading text-sm font-bold text-theme-ink">
                {section.name}
                <span className="ml-1.5 text-xs font-normal text-theme-muted tabular-nums">{section.items.length}</span>
              </h3>
              <button type="button" onClick={() => setDialog({ kind: 'item', sectionId: section.id })} className={iconButtonClass} aria-label={`Add entry to ${section.name}`} title="Add entry">
                <PlusIcon className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => startRename(section)} className={iconButtonClass} aria-label={`Rename ${section.name}`} title="Rename section">
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (section.items.length === 0) handleDeleteSection(section);
                  else setConfirmDeleteId(isConfirmingDelete ? null : section.id);
                }}
                className={iconButtonClass}
                aria-label={`Delete ${section.name}`}
                title="Delete section"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
        {isConfirmingDelete && (
          <div className="flex flex-wrap items-center gap-2 border-t border-theme-border px-3 py-2 text-xs font-body">
            <span className="min-w-0 flex-1 text-theme-ink">Delete this section and its {section.items.length} {section.items.length === 1 ? 'entry' : 'entries'}?</span>
            <button type="button" onClick={() => setConfirmDeleteId(null)} className={buttonClass}>Cancel</button>
            <button type="button" onClick={() => handleDeleteSection(section)} className="inline-flex h-8 items-center rounded-button border border-red-500 bg-red-500 px-3 text-xs font-bold text-white hover:opacity-90">Delete</button>
          </div>
        )}
        {!isCollapsed && (
          <div className="border-t border-theme-border-soft p-2">
            {items.length > 0 ? (
              <ul className="space-y-1.5">{items.map((item) => renderEntry(section, item))}</ul>
            ) : (
              <p className="px-1 py-1.5 text-xs text-theme-muted font-body">No entries yet.</p>
            )}
          </div>
        )}
      </section>
    );
  };

  const dialogSection = dialog?.kind === 'item' ? sections.find((section) => section.id === dialog.sectionId) : undefined;

  return (
    <aside
      id="compendium-panel"
      data-touch-camera-panel="true"
      aria-labelledby="compendium-title"
      className={`compendium-panel fixed z-40 flex flex-col overflow-hidden bg-theme-paper text-theme-ink border-theme-border shadow-2xl touch-pan-y ${
        isBottom
          ? 'compendium-panel--bottom inset-x-0 bottom-0 border-t-[length:var(--border-width)]'
          : 'right-0 top-0 bottom-0 border-l-[length:var(--border-width)]'
      }`}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        ...(isBottom ? { height: effectiveHeight } : { width: effectiveWidth }),
      }}
    >
      <div
        role="separator"
        aria-orientation={isBottom ? 'horizontal' : 'vertical'}
        aria-label="Resize compendium panel"
        onPointerDown={handleResizeStart}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
        className={`absolute z-20 touch-none transition-colors hover:bg-theme-accent/40 active:bg-theme-accent/60 ${
          isBottom ? 'inset-x-0 top-0 h-2 cursor-row-resize' : 'inset-y-0 left-0 w-2 cursor-col-resize'
        }`}
      />

      <div className={`flex flex-shrink-0 items-center justify-between gap-3 px-4 ${isBottom ? 'py-2' : 'py-3'}`}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-button text-theme-accent sm:flex" style={ACCENT_TINT} aria-hidden="true">
            <BookIcon className="h-5 w-5" />
          </span>
          <h2 id="compendium-title" className="min-w-0 truncate font-heading text-lg font-bold leading-tight text-theme-ink">Compendium</h2>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <div ref={menuRef} className="relative flex items-center gap-2">
            <button type="button" onClick={() => setMenu(menu === 'import' ? null : 'import')} aria-haspopup="menu" aria-expanded={menu === 'import'} className={buttonClass}>Import</button>
            <button type="button" onClick={() => setMenu(menu === 'export' ? null : 'export')} aria-haspopup="menu" aria-expanded={menu === 'export'} className={buttonClass}>Export</button>
            {menu && (
              <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-theme border border-theme-border bg-theme-paper shadow-theme">
                {menu === 'import' ? (
                  <>
                    <button type="button" role="menuitem" className={menuItemClass} onClick={() => { setMenu(null); fileInputRef.current?.click(); }}>From File</button>
                    <button type="button" role="menuitem" className={menuItemClass} onClick={() => { setMenu(null); setDialog({ kind: 'import', text: '' }); }}>From Raw Data</button>
                  </>
                ) : (
                  <>
                    <button type="button" role="menuitem" className={menuItemClass} onClick={() => { setMenu(null); downloadText('compendium.json', serializeCompendium(sections)); }}>Download File</button>
                    <button type="button" role="menuitem" className={menuItemClass} onClick={() => { setMenu(null); setDialog({ kind: 'export' }); }}>As Raw Data</button>
                  </>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-button border border-theme-border text-theme-muted transition-colors hover:bg-theme-accent hover:text-theme-paper"
            aria-label="Close compendium"
            title="Close compendium"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileSelected} aria-label="Import compendium file" />

      <div className={`flex-shrink-0 space-y-2 border-b border-theme-border px-4 ${isBottom ? 'pb-2' : 'pb-3'}`}>
        <p className="text-xs leading-relaxed text-theme-muted font-body">
          Your reusable library of items, spells and anything else you want to define once. Pick these entries from “Add item” in a Codex, Inventory or Equipment widget.
        </p>
        <span className="relative block">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the compendium"
            aria-label="Search compendium"
            className={`${inputClass} pl-8 pr-9 [&::-webkit-search-cancel-button]:appearance-none`}
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-theme-muted hover:text-theme-ink">
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </span>
        <form onSubmit={handleAddSection} className="flex gap-2">
          <input
            value={newSectionName}
            onChange={(event) => setNewSectionName(event.target.value)}
            placeholder="New section name"
            aria-label="New section name"
            className={inputClass}
          />
          <button type="submit" disabled={!newSectionName.trim()} className={`${primaryButtonClass} h-9 shrink-0`}>
            <PlusIcon className="h-4 w-4" /> Add section
          </button>
        </form>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        {sections.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 py-12 text-center">
            <p className="font-heading text-base font-bold text-theme-ink">No sections yet</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-theme-muted font-body">Create a section above, then add entries you want to reuse.</p>
          </div>
        ) : visibleSections.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 py-12 text-center">
            <p className="font-heading text-base font-bold text-theme-ink">No matching entries</p>
            <button type="button" onClick={() => setQuery('')} className={`${buttonClass} mt-4`}>Clear search</button>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {visibleSections.map(renderSection)}
          </div>
        )}
      </div>

      {toast && (
        <div className="timeline-toast flex flex-shrink-0 items-center gap-3 border-t border-theme-border bg-theme-accent px-4 py-2.5 text-theme-paper" role="status" aria-live="polite">
          <span className="min-w-0 flex-1 text-sm font-body">{toast.message}</span>
          {toast.undoable && (
            <button
              type="button"
              onClick={() => {
                undo();
                setToast(null);
              }}
              className="h-8 rounded-button border border-current px-3 text-xs font-bold font-body transition-opacity hover:opacity-80"
            >
              Undo
            </button>
          )}
          <button type="button" onClick={() => setToast(null)} className="flex h-8 w-8 items-center justify-center rounded-button transition-opacity hover:opacity-80" aria-label="Dismiss message">
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {dialog?.kind === 'item' && dialogSection && (
        <InventoryItemDialog
          key={dialog.item?.id ?? `new-${dialog.sectionId}`}
          item={dialog.item}
          noun="entry"
          defaultFields={ENTRY_DEFAULT_FIELDS}
          allowCompendium={false}
          allowQuantity={false}
          onClose={() => setDialog(null)}
          onSave={(item) => saveItem(dialogSection.id, item)}
          onDelete={dialog.item ? () => {
            deleteItem(dialogSection.id, dialog.item!.id);
            setToast({ message: `Deleted “${dialog.item!.name}”`, undoable: true });
          } : undefined}
          onClone={dialog.item ? (item) => saveItem(dialogSection.id, duplicateInventoryItem(item)) : undefined}
        />
      )}
      {dialog?.kind === 'export' && <ExportDialog sections={sections} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'import' && <ImportDialog initialText={dialog.text} onImport={runImport} onClose={() => setDialog(null)} />}
    </aside>
  );
}
