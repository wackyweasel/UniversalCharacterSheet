import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Character } from '../types';
import type { PlayLayout, SheetWorkspace } from '../hooks/useWorkspaceNavigation';
import { useToolbarOverflow } from '../hooks/useToolbarOverflow';
import ShareExportMenu from './ShareExportMenu';
import { Tooltip } from './Tooltip';
import { ToolbarShell } from './ToolbarShell';
import { WorkspaceStatusDot } from './WorkspaceStatusIndicator';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CheckIcon,
  ClockIcon,
  LayersIcon,
  LayoutGridIcon,
  ListIcon,
  MinusIcon,
  PaletteIcon,
  PencilIcon,
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
  listColumns: number;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onSelectLayout: (layout: PlayLayout) => void;
  onListColumnsChange: (columns: number) => void;
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
  listHighlighted?: boolean;
  overlay?: boolean;
}

const utilityButtonClass = 'flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-button border-[length:var(--border-width)] border-theme-border bg-theme-paper px-2 text-xs font-body text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper disabled:cursor-not-allowed disabled:opacity-40';

interface ToolbarCharacterNameProps {
  name: string;
  currentCharacterId: string;
  switchableCharacters: Character[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCharacter: (characterId: string) => void;
  onSave: (name: string) => void;
}

function ToolbarCharacterName({
  name,
  currentCharacterId,
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
  const focusMenuOnOpenRef = useRef(false);
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
      if (!focusMenuOnOpenRef.current) return;
      const targetIndex = focusLastOnOpenRef.current ? switchableCharacters.length : 0;
      itemRefs.current[targetIndex]?.focus();
      focusLastOnOpenRef.current = false;
      focusMenuOnOpenRef.current = false;
    });
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onOpenChange(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
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

  if (editing) {
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

  if (switchableCharacters.length === 0) return (
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
        onClick={() => {
          focusMenuOnOpenRef.current = false;
          onOpenChange(!open);
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          event.preventDefault();
          focusMenuOnOpenRef.current = true;
          focusLastOnOpenRef.current = event.key === 'ArrowUp';
          onOpenChange(true);
        }}
        aria-label={`Switch character: ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="group flex h-8 w-12 shrink-0 items-center gap-1 rounded-button border-[length:var(--border-width)] border-theme-border bg-theme-background px-1 text-left text-xs font-body text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper min-[480px]:w-32 min-[480px]:px-2 sm:w-40"
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
            const items = itemRefs.current.slice(0, switchableCharacters.length + 1).filter((item): item is HTMLButtonElement => Boolean(item));
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
          <div className="border-b border-theme-border/50 py-1">
            <button
              ref={(element) => { itemRefs.current[0] = element; }}
              type="button"
              role="menuitem"
              onClick={() => {
                onOpenChange(false);
                setEditing(true);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-body text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper focus:bg-theme-accent focus:text-theme-paper focus:outline-none"
            >
              <PencilIcon className="h-4 w-4 shrink-0" />
              <span>Rename character</span>
            </button>
          </div>
          <div className="border-b border-theme-border/50 px-3 py-2">
            <p className="font-body text-[10px] font-bold uppercase text-theme-muted">Switch Character</p>
          </div>
          <div className="py-1">
            {switchableCharacters.map((option, index) => {
              const isCurrentCharacter = option.id === currentCharacterId;
              return (
                <button
                  key={option.id}
                  ref={(element) => { itemRefs.current[index + 1] = element; }}
                  type="button"
                  role="menuitem"
                  aria-current={isCurrentCharacter ? 'true' : undefined}
                  onClick={() => {
                    onOpenChange(false);
                    onSelectCharacter(option.id);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-body text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper focus:bg-theme-accent focus:text-theme-paper focus:outline-none ${
                    isCurrentCharacter ? 'font-semibold' : ''
                  }`}
                >
                  <span className="min-w-0 truncate">{option.name}</span>
                  {isCurrentCharacter && <CheckIcon className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface MenuCharacterSectionProps {
  name: string;
  currentCharacterId: string;
  switchableCharacters: Character[];
  onSelectCharacter: (characterId: string) => void;
  onSave: (name: string) => void;
  onClose: () => void;
}

function MenuCharacterSection({
  name,
  currentCharacterId,
  switchableCharacters,
  onSelectCharacter,
  onSave,
  onClose,
}: MenuCharacterSectionProps) {
  const [draft, setDraft] = useState(name);
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => setDraft(name), [name]);

  const commit = () => {
    const nextName = draft.trim();
    if (nextName && nextName !== name) onSave(nextName);
    else setDraft(name);
  };

  return (
    <div className="border-b border-theme-border/50">
      <div className="px-3 py-2.5">
        <label className="block">
          <span className="mb-1.5 block font-body text-[10px] font-bold uppercase text-theme-muted">Character name</span>
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') setDraft(name);
            }}
            className="h-8 w-full rounded-button border-[length:var(--border-width)] border-theme-border bg-theme-background px-2 font-heading text-sm font-bold text-theme-ink outline-none focus:border-theme-accent"
          />
        </label>
      </div>
      {switchableCharacters.length > 0 && <div className="pb-1">
      <button
        type="button"
        aria-expanded={listOpen}
        onClick={() => setListOpen((value) => !value)}
        className="group flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-body font-semibold text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper"
      >
        <span className="min-w-0 truncate">Switch character</span>
        <ChevronDownIcon className="h-4 w-4 shrink-0 transition-transform group-aria-expanded:rotate-180" />
      </button>
      {listOpen && <div className="max-h-48 overflow-y-auto overscroll-contain">
        {switchableCharacters.map((option) => {
          const isCurrent = option.id === currentCharacterId;
          return (
            <button
              key={option.id}
              type="button"
              aria-current={isCurrent ? 'true' : undefined}
              onClick={() => {
                onClose();
                onSelectCharacter(option.id);
              }}
              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-body text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper ${isCurrent ? 'font-semibold' : ''}`}
            >
              <span className="min-w-0 truncate">{option.name}</span>
              {isCurrent && <CheckIcon className="h-4 w-4 shrink-0" />}
            </button>
          );
        })}
      </div>}
      </div>}
    </div>
  );
}

export default function SheetToolbar({
  character,
  switchableCharacters,
  onSelectCharacter,
  workspace,
  playLayout,
  listColumns,
  menuOpen,
  onMenuOpenChange,
  onSelectLayout,
  onListColumnsChange,
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
      { id: 'add-widget', labeledWidth: 116, iconWidth: 42 },
      { id: 'theme', labeledWidth: 126, iconWidth: 42 },
    ];
    if (playLayout === 'canvas' && onAutoStack) candidates.push({ id: 'auto-stack', labeledWidth: 110, iconWidth: 42 });
    candidates.push({ id: 'undo-redo', labeledWidth: 80, iconWidth: 80 });
    if (workspace === 'play') candidates.push({ id: 'timeline', labeledWidth: 116, iconWidth: 42 });
    candidates.push({ id: 'layout', labeledWidth: 176, iconWidth: 80 });
    return candidates;
  }, [onAutoStack, playLayout, workspace]);
  const { containerRef, containerWidth, inlineActionIds: overflowInlineIds, labeledActionIds } = useToolbarOverflow({
    actions,
    coreWidth: 464,
    minimumExpandedWidth: 0,
  });
  const compact = containerWidth > 0 && containerWidth < 600;
  const inlineActionIds = useMemo<ReadonlySet<string>>(
    () => (compact ? new Set(['layout', 'undo-redo']) : overflowInlineIds),
    [compact, overflowInlineIds],
  );
  const compactUtilityClass = compact ? `${utilityButtonClass} !px-1.5` : utilityButtonClass;
  const showLabel = (id: string) => labeledActionIds.has(id);

  const layoutButton = (active: boolean) => `flex h-full items-center justify-center gap-1.5 ${compact ? 'min-w-0 flex-1 px-1.5' : 'px-2'} text-xs font-body transition-colors ${
    active ? 'bg-theme-accent text-theme-paper' : 'text-theme-muted hover:bg-theme-accent/10 hover:text-theme-ink'
  }`;

  const content = (
    <div className={compact ? 'flex w-full min-w-0 items-center justify-between gap-1' : 'grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2'}>
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
          topSection={compact ? (
            <MenuCharacterSection
              name={character.name}
              currentCharacterId={character.id}
              switchableCharacters={switchableCharacters}
              onSelectCharacter={onSelectCharacter}
              onSave={onRenameCharacter}
              onClose={() => onMenuOpenChange(false)}
            />
          ) : undefined}
        />
        <WorkspaceStatusDot />
        {!compact && <div className="shrink-0">
          <ToolbarCharacterName
            name={character.name}
            currentCharacterId={character.id}
            switchableCharacters={switchableCharacters}
            open={characterSwitcherOpen}
            onOpenChange={handleCharacterSwitcherOpenChange}
            onSelectCharacter={onSelectCharacter}
            onSave={onRenameCharacter}
          />
        </div>}
      </div>
      <div className={`flex min-w-0 items-center justify-self-center ${compact ? 'gap-1' : 'gap-2'}`}>
      {inlineActionIds.has('layout') && <div className={`flex h-8 shrink-0 overflow-hidden rounded-button border-[length:var(--border-width)] border-theme-border bg-theme-paper ${compact ? 'w-16' : ''}`}>
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
        {playLayout === 'list' && (
          <div className="hidden h-full items-center gap-0.5 border-l border-theme-border px-1 min-[900px]:flex">
            <Tooltip content="Remove list column" placement="below">
              <span className="inline-flex">
                <button
                  type="button"
                  onClick={() => onListColumnsChange(listColumns - 1)}
                  disabled={listColumns <= 1}
                  aria-label="Remove list column"
                  className="flex h-6 w-6 items-center justify-center rounded text-theme-muted transition-colors hover:bg-theme-accent hover:text-theme-paper disabled:opacity-35"
                >
                  <MinusIcon className="h-3.5 w-3.5" />
                </button>
              </span>
            </Tooltip>
            <span aria-label={`${listColumns} list columns`} className="min-w-4 text-center text-xs font-body tabular-nums text-theme-ink">{listColumns}</span>
            <Tooltip content="Add list column" placement="below">
              <button
                type="button"
                onClick={() => onListColumnsChange(listColumns + 1)}
                aria-label="Add list column"
                className="flex h-6 w-6 items-center justify-center rounded text-theme-muted transition-colors hover:bg-theme-accent hover:text-theme-paper"
              >
                <PlusIcon className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          </div>
        )}
      </div>}
      {inlineActionIds.has('add-widget') && (
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
      )}
      {workspace === 'play' && inlineActionIds.has('timeline') && (
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
      )}
      {inlineActionIds.has('undo-redo') && (
        <div className="flex shrink-0 gap-1">
          <Tooltip content="Undo (Ctrl+Z)" placement="below"><span className="inline-flex"><button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Undo" className={compactUtilityClass}><UndoIcon className="h-4 w-4" /></button></span></Tooltip>
          <Tooltip content="Redo (Ctrl+Y)" placement="below"><span className="inline-flex"><button type="button" onClick={onRedo} disabled={!canRedo} aria-label="Redo" className={compactUtilityClass}><UndoIcon className="h-4 w-4 scale-x-[-1]" /></button></span></Tooltip>
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
      <div className={`flex min-w-0 items-center justify-self-end ${compact ? 'gap-1' : 'gap-2'}`}>
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