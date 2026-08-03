import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Character } from '../types';
import type { PlayLayout, SheetWorkspace } from '../hooks/useWorkspaceNavigation';
import { useToolbarOverflow } from '../hooks/useToolbarOverflow';
import ShareExportMenu from './ShareExportMenu';
import { Tooltip } from './Tooltip';
import { ToolbarShell } from './ToolbarShell';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  LayersIcon,
  LayoutGridIcon,
  ListIcon,
  PaletteIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  RowsIcon,
  SearchIcon,
  UndoIcon,
} from './icons';

interface SheetToolbarProps {
  character: Character;
  switchableCharacters: Character[];
  onSelectCharacter: (characterId: string) => void;
  workspace: SheetWorkspace;
  playLayout: PlayLayout;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onBuild: () => void;
  onPlay: () => void;
  onSelectLayout: (layout: PlayLayout) => void;
  onPrintPreview: () => void;
  onExit: () => void;
  onRenameCharacter: (name: string) => void;
  activeSheetName: string;
  sheetSwitcherOpen: boolean;
  onToggleSheetSwitcher: () => void;
  timelineOpen: boolean;
  onToggleTimeline: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAddWidget: () => void;
  addWidgetLabel: string;
  onChangeTheme: () => void;
  changeThemeLabel: string;
  onAutoStack?: () => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  onSearch: () => void;
  attachmentControlsVisible: boolean;
  onToggleAttachmentControls: () => void;
  workspaceHighlighted?: boolean;
  listHighlighted?: boolean;
  overlay?: boolean;
}

const utilityButtonClass = 'flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-button border-[length:var(--border-width)] border-theme-border bg-theme-paper px-2 text-xs font-body text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper disabled:cursor-not-allowed disabled:opacity-40';

interface ToolbarCharacterNameProps {
  name: string;
  editable: boolean;
  switchableCharacters: Character[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCharacter: (characterId: string) => void;
  onSave: (name: string) => void;
}

function ToolbarCharacterName({
  name,
  editable,
  switchableCharacters,
  open,
  onOpenChange,
  onSelectCharacter,
  onSave,
}: ToolbarCharacterNameProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const focusLastOnOpenRef = useRef(false);
  const restoreFocusOnCloseRef = useRef(false);
  const menuId = useId();

  useEffect(() => {
    if (!editing) setDraft(name);
  }, [editing, name]);

  useEffect(() => {
    if (open || !restoreFocusOnCloseRef.current) return;
    restoreFocusOnCloseRef.current = false;
    triggerRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const focusFrame = window.requestAnimationFrame(() => {
      const targetIndex = focusLastOnOpenRef.current ? switchableCharacters.length - 1 : 0;
      itemRefs.current[targetIndex]?.focus();
      focusLastOnOpenRef.current = false;
    });
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onOpenChange(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      restoreFocusOnCloseRef.current = true;
      onOpenChange(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onOpenChange, open, switchableCharacters.length]);

  const commit = () => {
    const nextName = draft.trim();
    if (nextName && nextName !== name) onSave(nextName);
    if (!nextName) setDraft(name);
    setEditing(false);
  };

  if (editable && editing) {
    return (
      <input
        type="text"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();
          if (event.key === 'Escape') {
            setDraft(name);
            setEditing(false);
          }
        }}
        aria-label="Character name"
        autoFocus
        className="h-8 w-20 shrink-0 rounded-button border-[length:var(--border-width)] border-theme-border bg-theme-background px-2 font-heading text-sm font-bold text-theme-ink outline-none focus:border-theme-accent min-[480px]:w-32 sm:w-40"
      />
    );
  }

  if (editable) return (
    <Tooltip content="Edit character name" placement="below">
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label="Edit character name"
        className="flex h-8 w-20 shrink-0 items-center gap-1.5 rounded-button px-2 text-left font-heading text-sm font-bold text-theme-ink transition-colors hover:bg-theme-background hover:text-theme-accent min-[480px]:w-32 sm:w-40"
      >
        <span className="min-w-0 flex-1 truncate">{name}</span>
        <PencilIcon className="h-3.5 w-3.5 shrink-0" />
      </button>
    </Tooltip>
  );

  if (switchableCharacters.length === 0) {
    return <div className="w-12 shrink-0 truncate px-1 font-heading text-sm font-bold text-theme-ink min-[480px]:w-32 min-[480px]:px-2 sm:w-40">{name}</div>;
  }

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) onOpenChange(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => onOpenChange(!open)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          event.preventDefault();
          focusLastOnOpenRef.current = event.key === 'ArrowUp';
          onOpenChange(true);
        }}
        aria-label={`Switch character: ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="group flex h-8 w-12 shrink-0 items-center gap-1 rounded-button px-1 text-left font-heading text-sm font-bold text-theme-ink transition-colors hover:bg-theme-background hover:text-theme-accent min-[480px]:w-32 min-[480px]:px-2 sm:w-40"
      >
        <span className="min-w-0 flex-1 truncate">{name}</span>
        <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 transition-transform group-aria-expanded:rotate-180" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Switch character"
          className="absolute left-0 top-full z-50 mt-2 max-h-[calc(100dvh-7rem)] w-[min(240px,calc(100vw-1rem))] overflow-y-auto overscroll-contain rounded-theme border-[length:var(--border-width)] border-theme-border bg-theme-paper shadow-theme animate-dropdown-in"
          onKeyDown={(event) => {
            const items = itemRefs.current.slice(0, switchableCharacters.length).filter((item): item is HTMLButtonElement => Boolean(item));
            const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
            let nextIndex: number | null = null;
            if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length;
            if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length;
            if (event.key === 'Home') nextIndex = 0;
            if (event.key === 'End') nextIndex = items.length - 1;
            if (nextIndex === null) return;
            event.preventDefault();
            items[nextIndex]?.focus();
          }}
        >
          <div className="border-b border-theme-border/50 px-3 py-2">
            <p className="font-body text-[10px] font-bold uppercase text-theme-muted">Switch Character</p>
          </div>
          <div className="py-1">
            {switchableCharacters.map((option, index) => (
              <button
                key={option.id}
                ref={(element) => { itemRefs.current[index] = element; }}
                type="button"
                role="menuitem"
                onClick={() => {
                  onOpenChange(false);
                  onSelectCharacter(option.id);
                }}
                className="block w-full truncate px-3 py-2 text-left text-sm font-body text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper focus:bg-theme-accent focus:text-theme-paper focus:outline-none"
              >
                {option.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SheetToolbar({
  character,
  switchableCharacters,
  onSelectCharacter,
  workspace,
  playLayout,
  menuOpen,
  onMenuOpenChange,
  onBuild,
  onPlay,
  onSelectLayout,
  onPrintPreview,
  onExit,
  onRenameCharacter,
  activeSheetName,
  sheetSwitcherOpen,
  onToggleSheetSwitcher,
  timelineOpen,
  onToggleTimeline,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAddWidget,
  addWidgetLabel,
  onChangeTheme,
  changeThemeLabel,
  onAutoStack,
  onExpandAll,
  onCollapseAll,
  onSearch,
  attachmentControlsVisible,
  onToggleAttachmentControls,
  workspaceHighlighted = false,
  listHighlighted = false,
  overlay = false,
}: SheetToolbarProps) {
  const [characterSwitcherOpen, setCharacterSwitcherOpen] = useState(false);

  useEffect(() => {
    if (workspace !== 'play' || menuOpen || sheetSwitcherOpen || switchableCharacters.length === 0) {
      setCharacterSwitcherOpen(false);
    }
  }, [menuOpen, sheetSwitcherOpen, switchableCharacters.length, workspace]);

  const handleCharacterSwitcherOpenChange = (open: boolean) => {
    if (open) {
      onMenuOpenChange(false);
      if (sheetSwitcherOpen) onToggleSheetSwitcher();
    }
    setCharacterSwitcherOpen(open);
  };

  const actions = useMemo(() => {
    const candidates = [
      ...(playLayout === 'list' ? [{ id: 'collapse-expand', labeledWidth: 188, iconWidth: 80 }] : []),
      { id: 'layout', labeledWidth: 152, iconWidth: 80 },
      { id: workspace === 'build' ? 'add-widget' : 'timeline', labeledWidth: 116, iconWidth: 42 },
      { id: 'undo-redo', labeledWidth: 152, iconWidth: 80 },
    ];
    if (workspace === 'build') candidates.push({ id: 'theme', labeledWidth: 126, iconWidth: 42 });
    if (workspace === 'build' && playLayout === 'canvas' && onAutoStack) candidates.push({ id: 'auto-stack', labeledWidth: 110, iconWidth: 42 });
    return candidates;
  }, [onAutoStack, playLayout, workspace]);
  const { containerRef, inlineActionIds, labeledActionIds } = useToolbarOverflow({
    actions,
    coreWidth: (width) => width >= 640 ? 548 : width >= 480 ? 364 : 256,
    minimumExpandedWidth: 0,
  });
  const showLabel = (id: string) => labeledActionIds.has(id);

  const workspaceButton = (active: boolean) => `flex h-full min-w-0 flex-1 items-center justify-center gap-1.5 px-2 text-xs font-body transition-colors ${
    active ? 'bg-theme-accent text-theme-paper' : 'text-theme-muted hover:bg-theme-accent/10 hover:text-theme-ink'
  }`;
  const layoutButton = (active: boolean) => `flex h-full items-center justify-center gap-1.5 px-2 text-xs font-body transition-colors ${
    active ? 'bg-theme-accent text-theme-paper' : 'text-theme-muted hover:bg-theme-accent/10 hover:text-theme-ink'
  }`;

  const content = (
    <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
      <div className="flex min-w-0 items-center gap-2 justify-self-start">
        <ShareExportMenu
          character={character}
          open={menuOpen}
          onOpenChange={(open) => {
            if (open) setCharacterSwitcherOpen(false);
            onMenuOpenChange(open);
          }}
          onPrintPreview={onPrintPreview}
          onExit={onExit}
          workspace={workspace}
          playLayout={playLayout}
          onSelectLayout={onSelectLayout}
          timelineOpen={timelineOpen}
          onToggleTimeline={onToggleTimeline}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={onUndo}
          onRedo={onRedo}
          onAddWidget={onAddWidget}
          addWidgetLabel={addWidgetLabel}
          onChangeTheme={onChangeTheme}
          changeThemeLabel={changeThemeLabel}
          onAutoStack={onAutoStack}
          onExpandAll={onExpandAll}
          onCollapseAll={onCollapseAll}
          attachmentControlsVisible={attachmentControlsVisible}
          onToggleAttachmentControls={onToggleAttachmentControls}
          inlineActionIds={inlineActionIds}
        />
        <div className="shrink-0">
          <ToolbarCharacterName
            name={character.name}
            editable={workspace === 'build'}
            switchableCharacters={switchableCharacters}
            open={characterSwitcherOpen}
            onOpenChange={handleCharacterSwitcherOpenChange}
            onSelectCharacter={onSelectCharacter}
            onSave={onRenameCharacter}
          />
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2 justify-self-center">
      <div
        data-tutorial="edit-mode-button"
        className={`flex h-8 w-20 shrink-0 overflow-hidden rounded-button border-[length:var(--border-width)] border-theme-border bg-theme-background sm:w-32 ${workspaceHighlighted ? 'outline outline-4 outline-blue-500 outline-offset-2' : ''}`}
      >
        <Tooltip content="Build mode" placement="below"><button type="button" onClick={onBuild} aria-label="Build" aria-pressed={workspace === 'build'} className={workspaceButton(workspace === 'build')}><PencilIcon className="h-4 w-4 shrink-0" /><span className="hidden sm:inline">Build</span></button></Tooltip>
        <Tooltip content="Play mode" placement="below"><button type="button" onClick={onPlay} aria-label="Play" aria-pressed={workspace === 'play'} className={workspaceButton(workspace === 'play')}><PlayIcon className="h-4 w-4 shrink-0" /><span className="hidden sm:inline">Play</span></button></Tooltip>
      </div>
      <div className="mx-0.5 h-6 w-px shrink-0 bg-theme-border/70" />
      {inlineActionIds.has('layout') && <div className="flex h-8 shrink-0 overflow-hidden rounded-button border-[length:var(--border-width)] border-theme-border bg-theme-paper">
        <Tooltip content="Canvas view" placement="below">
          <button type="button" onClick={() => onSelectLayout('canvas')} aria-label="Canvas" aria-pressed={playLayout === 'canvas'} className={layoutButton(playLayout === 'canvas')}>
            <LayoutGridIcon className="h-4 w-4" /> {showLabel('layout') && <span>Canvas</span>}
          </button>
        </Tooltip>
        <Tooltip content="List view" placement="below">
          <button
            type="button"
            data-tutorial="vertical-view-button"
            onClick={() => onSelectLayout('list')}
            aria-label="List"
            aria-pressed={playLayout === 'list'}
            className={`${layoutButton(playLayout === 'list')} ${listHighlighted ? 'outline outline-2 outline-blue-500 outline-offset-[-2px]' : ''}`}
          >
            <ListIcon className="h-4 w-4" /> {showLabel('layout') && <span>List</span>}
          </button>
        </Tooltip>
      </div>}
      {workspace === 'build' && inlineActionIds.has('add-widget') ? (
        <Tooltip content={addWidgetLabel} placement="below">
          <button
            type="button"
            data-tutorial="add-widget-button"
            onClick={onAddWidget}
            aria-label={addWidgetLabel}
            className={utilityButtonClass}
          >
            <PlusIcon className="h-4 w-4" /> {showLabel('add-widget') && <span>{addWidgetLabel}</span>}
          </button>
        </Tooltip>
      ) : workspace === 'play' && inlineActionIds.has('timeline') ? (
        <Tooltip content={timelineOpen ? 'Close timeline' : 'Open timeline'} placement="below">
          <button
            type="button"
            data-tutorial="timeline-button"
            onClick={onToggleTimeline}
            aria-pressed={timelineOpen}
            aria-label="Timeline"
            className={utilityButtonClass}
          >
            <ClockIcon className="h-4 w-4" /> {showLabel('timeline') && <span>Timeline</span>}
          </button>
        </Tooltip>
      ) : null}
      {inlineActionIds.has('undo-redo') && (
        <div className="flex shrink-0 gap-1">
          <Tooltip content="Undo (Ctrl+Z)" placement="below"><span className="inline-flex"><button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Undo" className={utilityButtonClass}><UndoIcon className="h-4 w-4" /> {showLabel('undo-redo') && <span>Undo</span>}</button></span></Tooltip>
          <Tooltip content="Redo (Ctrl+Y)" placement="below"><span className="inline-flex"><button type="button" onClick={onRedo} disabled={!canRedo} aria-label="Redo" className={utilityButtonClass}><UndoIcon className="h-4 w-4 scale-x-[-1]" /> {showLabel('undo-redo') && <span>Redo</span>}</button></span></Tooltip>
        </div>
      )}
      {inlineActionIds.has('theme') && (
        <Tooltip content={changeThemeLabel} placement="below"><button type="button" data-tutorial="theme-button" onClick={onChangeTheme} aria-label={changeThemeLabel} className={utilityButtonClass}><PaletteIcon className="h-4 w-4" /> {showLabel('theme') && <span>{changeThemeLabel}</span>}</button></Tooltip>
      )}
      {inlineActionIds.has('collapse-expand') && (
        <div className="flex shrink-0 gap-1">
          <Tooltip content="Collapse all widgets" placement="below"><button type="button" onClick={onCollapseAll} aria-label="Collapse all widgets" className={utilityButtonClass}><ChevronUpIcon className="h-4 w-4" /> {showLabel('collapse-expand') && <span>Collapse</span>}</button></Tooltip>
          <Tooltip content="Expand all widgets" placement="below"><button type="button" onClick={onExpandAll} aria-label="Expand all widgets" className={utilityButtonClass}><ChevronDownIcon className="h-4 w-4" /> {showLabel('collapse-expand') && <span>Expand</span>}</button></Tooltip>
        </div>
      )}
      {inlineActionIds.has('auto-stack') && (
        <Tooltip content="Auto Stack" placement="below"><button type="button" onClick={onAutoStack} aria-label="Auto Stack" className={utilityButtonClass}><RowsIcon className="h-4 w-4" /> {showLabel('auto-stack') && <span>Auto Stack</span>}</button></Tooltip>
      )}
      </div>
      <div className="flex min-w-0 items-center gap-2 justify-self-end">
        <Tooltip content={`Switch sheet (current: ${activeSheetName})`} placement="below">
          <button
            type="button"
            data-tutorial="sheet-selector"
            onClick={() => {
              setCharacterSwitcherOpen(false);
              onToggleSheetSwitcher();
            }}
            aria-label={`Switch sheet: ${activeSheetName}`}
            aria-expanded={sheetSwitcherOpen}
            className="group flex h-8 w-9 shrink-0 items-center justify-center gap-1.5 rounded-button border-[length:var(--border-width)] border-theme-border bg-theme-background px-1.5 text-left text-xs font-body text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper min-[480px]:w-24 min-[480px]:justify-start sm:w-32"
          >
            <LayersIcon className="h-4 w-4 shrink-0" />
            <span className="hidden min-w-0 flex-1 truncate min-[480px]:block">{activeSheetName}</span>
            <ChevronDownIcon className="hidden h-3.5 w-3.5 shrink-0 transition-transform group-aria-expanded:rotate-180 min-[480px]:block" />
          </button>
        </Tooltip>
        <Tooltip content="Search character (Ctrl+F)" placement="below">
          <button type="button" onClick={onSearch} aria-label="Search character" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-button border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper">
            <SearchIcon className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>
    </div>
  );

  return (
    <ToolbarShell
      rootRef={containerRef}
      className={`${overlay ? 'absolute left-0 right-0 top-0' : ''} w-full`}
      primary={content}
      expanded={false}
    />
  );
}