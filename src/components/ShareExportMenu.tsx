import { useEffect, useRef, useState } from 'react';
import type { Character } from '../types';
import { useUserPresetStore } from '../store/useUserPresetStore';
import { submitToGallery } from '../hooks/useGallery';
import { stripImages } from '../utils/stripImages';
import { getCharacterTransferData } from '../utils/characterTransfer';
import GalleryShareModal from './GalleryShareModal';
import { Tooltip } from './Tooltip';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  DiceIcon,
  DownloadIcon,
  LayoutGridIcon,
  LinkIcon,
  ListIcon,
  MenuIcon,
  MessageIcon,
  PaletteIcon,
  PlusIcon,
  PrintIcon,
  RowsIcon,
  SaveIcon,
  UndoIcon,
  UploadIcon,
  XIcon,
} from './icons';
import { useDiceSettingsStore } from '../store/useDiceSettingsStore';
import { useTelemetryStore } from '../store/useTelemetryStore';

interface ShareExportMenuProps {
  character: Character;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrintPreview: () => void;
  onExit: () => void;
  workspace: 'build' | 'play' | 'print';
  playLayout: 'canvas' | 'list';
  onSelectLayout: (layout: 'canvas' | 'list') => void;
  timelineOpen: boolean;
  onToggleTimeline: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAddWidget?: () => void;
  addWidgetLabel?: string;
  onChangeTheme?: () => void;
  changeThemeLabel?: string;
  onAutoStack?: () => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  attachmentControlsVisible: boolean;
  onToggleAttachmentControls: () => void;
  inlineActionIds?: ReadonlySet<string>;
}

export function downloadCharacter(character: Character) {
  const data = JSON.stringify(getCharacterTransferData(character), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${character.name.replace(/[^a-z0-9]/gi, '_') || 'character'}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ShareExportMenu({
  character,
  open,
  onOpenChange,
  onPrintPreview,
  onExit,
  workspace,
  playLayout,
  onSelectLayout,
  timelineOpen,
  onToggleTimeline,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAddWidget,
  addWidgetLabel = 'Add Widget',
  onChangeTheme,
  changeThemeLabel = 'Change Theme',
  onAutoStack,
  onExpandAll,
  onCollapseAll,
  attachmentControlsVisible,
  onToggleAttachmentControls,
  inlineActionIds = new Set(),
}: ShareExportMenuProps) {
  const addPreset = useUserPresetStore((state) => state.addPreset);
  const threeDDiceEnabled = useDiceSettingsStore((state) => state.threeDDiceEnabled);
  const setThreeDDiceEnabled = useDiceSettingsStore((state) => state.setThreeDDiceEnabled);
  const recordTelemetryEvent = useTelemetryStore((state) => state.recordEvent);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState(`${character.name} Preset`);
  const [includeTheme, setIncludeTheme] = useState(true);
  const [showPublish, setShowPublish] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onOpenChange(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onOpenChange, open]);

  useEffect(() => {
    setPresetName(`${character.name} Preset`);
  }, [character.name]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2400);
  };

  const handleSavePreset = () => {
    addPreset(character, presetName.trim() || `${character.name} Preset`, includeTheme);
    setShowSavePreset(false);
    showNotice('Preset saved to My Presets');
  };

  const handlePublish = async (name: string, author: string, description: string, gameSystem?: string) => {
    const strippedCharacter = stripImages(character);
    const { id: _, ...preset } = strippedCharacter;
    return submitToGallery('Presets', name, author, description, preset, gameSystem);
  };

  const hasOverflowNavigation =
    !inlineActionIds.has('layout') ||
    !inlineActionIds.has('undo-redo') ||
    (workspace === 'play' && !inlineActionIds.has('timeline'));
  const hasOverflowWorkspaceActions =
    Boolean(onAddWidget && !inlineActionIds.has('add-widget')) ||
    Boolean(onChangeTheme && !inlineActionIds.has('theme')) ||
    Boolean(onAutoStack && !inlineActionIds.has('auto-stack')) ||
    Boolean((onExpandAll || onCollapseAll) && !inlineActionIds.has('collapse-expand'));

  return (
    <>
      <div ref={menuRef} className="relative shrink-0">
        <Tooltip content="Open application menu" placement="below">
          <span className="inline-flex">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => onOpenChange(!open)}
              aria-label="Menu"
              aria-expanded={open}
              className="w-8 h-8 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors"
            >
              <MenuIcon className="w-4 h-4" />
            </button>
          </span>
        </Tooltip>
        {open && (
          <div className="absolute left-0 top-full z-50 mt-2 max-h-[calc(100dvh-7rem)] w-[min(300px,calc(100vw-1rem))] overflow-y-auto rounded-theme border-[length:var(--border-width)] border-theme-border bg-theme-paper shadow-theme animate-dropdown-in">
            {hasOverflowNavigation && <div className="border-b border-theme-border/50 py-1">
              <p className="px-3 pb-1 pt-1.5 font-body text-[10px] font-bold uppercase text-theme-muted">Quick actions</p>
            {(!inlineActionIds.has('layout') || !inlineActionIds.has('undo-redo') || (workspace === 'play' && !inlineActionIds.has('timeline'))) && (
            <div className="space-y-2 px-2 pb-2">
              {!inlineActionIds.has('layout') && <div className="grid grid-cols-2 gap-1">
                <Tooltip content="Use the freeform canvas layout" placement="below"><button
                  type="button"
                  onClick={() => {
                    onSelectLayout('canvas');
                    onOpenChange(false);
                  }}
                  aria-pressed={playLayout === 'canvas'}
                  className={`flex h-8 items-center justify-center gap-1.5 rounded-button text-xs font-body transition-colors ${playLayout === 'canvas' ? 'bg-theme-ink text-theme-paper' : 'bg-theme-background text-theme-ink hover:bg-theme-accent/20'}`}
                >
                  <LayoutGridIcon className="h-4 w-4" /> Canvas
                </button></Tooltip>
                <Tooltip content="Use the structured list layout" placement="below"><button
                  type="button"
                  data-tutorial="vertical-view-button-mobile"
                  onClick={() => {
                    onSelectLayout('list');
                    onOpenChange(false);
                  }}
                  aria-pressed={playLayout === 'list'}
                  className={`flex h-8 items-center justify-center gap-1.5 rounded-button text-xs font-body transition-colors ${playLayout === 'list' ? 'bg-theme-ink text-theme-paper' : 'bg-theme-background text-theme-ink hover:bg-theme-accent/20'}`}
                >
                  <ListIcon className="h-4 w-4" /> List
                </button></Tooltip>
              </div>}
              {!inlineActionIds.has('undo-redo') && <div className="grid grid-cols-2 gap-1">
                <Tooltip content="Undo the last change (Ctrl+Z)" placement="below"><span className="inline-flex w-full"><button type="button" onClick={onUndo} disabled={!canUndo} className="flex h-8 w-full items-center justify-center gap-1.5 rounded-button bg-theme-background text-xs font-body text-theme-ink disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-theme-accent/20">
                  <UndoIcon className="h-4 w-4" /> Undo
                </button></span></Tooltip>
                <Tooltip content="Redo the last undone change (Ctrl+Y)" placement="below"><span className="inline-flex w-full"><button type="button" onClick={onRedo} disabled={!canRedo} className="flex h-8 w-full items-center justify-center gap-1.5 rounded-button bg-theme-background text-xs font-body text-theme-ink disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-theme-accent/20">
                  <UndoIcon className="h-4 w-4 scale-x-[-1]" /> Redo
                </button></span></Tooltip>
              </div>}
              {workspace === 'play' && !inlineActionIds.has('timeline') && (
                <Tooltip content={timelineOpen ? 'Close the event timeline' : 'Open the event timeline'} placement="below"><button
                  type="button"
                  data-tutorial="timeline-button-mobile"
                  onClick={() => {
                    onToggleTimeline();
                    onOpenChange(false);
                  }}
                  aria-controls="timeline-panel"
                  aria-expanded={timelineOpen}
                  className={`flex h-8 w-full items-center justify-center gap-1.5 rounded-button text-xs font-body transition-colors ${timelineOpen ? 'bg-theme-accent text-theme-paper' : 'bg-theme-background text-theme-ink hover:bg-theme-accent/20'}`}
                >
                  <ClockIcon className="h-4 w-4" /> Timeline
                </button></Tooltip>
              )}
            </div>
            )}
            </div>}
            <div className="border-b border-theme-border/50 px-3 py-2.5">
              <p className="mb-1.5 font-body text-[10px] font-bold uppercase text-theme-muted">Settings</p>
              <div>
                <div className="flex h-9 items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <DiceIcon className="h-4 w-4 shrink-0 text-theme-ink" />
                    <div className="min-w-0">
                      <span className="block text-sm font-semibold font-body text-theme-ink">3D Dice</span>
                    </div>
                  </div>
                  <Tooltip content={threeDDiceEnabled ? 'Disable physics-based 3D dice' : 'Enable physics-based 3D dice'} placement="below"><button
                    type="button"
                    role="switch"
                    aria-checked={threeDDiceEnabled}
                    aria-label="Enable 3D dice"
                    onClick={() => setThreeDDiceEnabled(!threeDDiceEnabled)}
                    className={`relative h-6 w-11 shrink-0 rounded-full border border-theme-border transition-colors ${threeDDiceEnabled ? 'bg-theme-accent' : 'bg-theme-background'}`}
                  >
                    <span className={`absolute left-0 top-0.5 h-4 w-4 rounded-full border border-black/25 bg-white shadow-sm transition-transform ${threeDDiceEnabled ? 'translate-x-[22px]' : 'translate-x-1'}`} />
                    <span className="sr-only">{threeDDiceEnabled ? 'On' : 'Off'}</span>
                  </button></Tooltip>
                </div>
                <div className="flex h-9 items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <LinkIcon className="h-4 w-4 shrink-0 text-theme-ink" />
                    <div className="min-w-0">
                      <span className="block text-sm font-semibold font-body text-theme-ink">Attachment controls</span>
                    </div>
                  </div>
                  <Tooltip content={attachmentControlsVisible ? 'Hide attach and detach controls' : 'Show attach and detach controls'} placement="below"><button
                    type="button"
                    role="switch"
                    aria-checked={attachmentControlsVisible}
                    aria-label="Show attachment controls"
                    onClick={onToggleAttachmentControls}
                    className={`relative h-6 w-11 shrink-0 rounded-full border border-theme-border transition-colors ${attachmentControlsVisible ? 'bg-theme-accent' : 'bg-theme-background'}`}
                  >
                    <span className={`absolute left-0 top-0.5 h-4 w-4 rounded-full border border-black/25 bg-white shadow-sm transition-transform ${attachmentControlsVisible ? 'translate-x-[22px]' : 'translate-x-1'}`} />
                    <span className="sr-only">{attachmentControlsVisible ? 'On' : 'Off'}</span>
                  </button></Tooltip>
                </div>
              </div>
            </div>
            {hasOverflowWorkspaceActions && (
              <div className="border-b border-theme-border/50 py-1">
                <p className="px-3 pb-1 pt-1.5 font-body text-[10px] font-bold uppercase text-theme-muted">{workspace === 'build' ? 'Build tools' : 'View tools'}</p>
                {onAddWidget && !inlineActionIds.has('add-widget') && <Tooltip content={addWidgetLabel === 'Add Widget' ? 'Open the widget toolbox' : 'Close the widget toolbox'} placement="below"><button type="button" data-tutorial="add-widget-button-mobile" onClick={() => { onAddWidget(); onOpenChange(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors"><PlusIcon className="h-4 w-4" />{addWidgetLabel}</button></Tooltip>}
                {onChangeTheme && !inlineActionIds.has('theme') && <Tooltip content={changeThemeLabel === 'Change Theme' ? 'Open theme customization' : 'Close theme customization'} placement="below"><button type="button" data-tutorial="theme-button-mobile" onClick={() => { onChangeTheme(); onOpenChange(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors"><PaletteIcon className="h-4 w-4" />{changeThemeLabel}</button></Tooltip>}
                {onAutoStack && !inlineActionIds.has('auto-stack') && <Tooltip content="Arrange canvas widgets into columns automatically" placement="below"><button type="button" onClick={() => { onAutoStack(); onOpenChange(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors"><RowsIcon className="h-4 w-4" />Auto Stack</button></Tooltip>}
                {(onExpandAll || onCollapseAll) && !inlineActionIds.has('collapse-expand') && <>
                  {onExpandAll && <Tooltip content="Expand every widget in the list" placement="below"><button type="button" onClick={() => { onExpandAll(); onOpenChange(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors"><ChevronDownIcon className="h-4 w-4" />Expand All</button></Tooltip>}
                  {onCollapseAll && <Tooltip content="Collapse every widget in the list" placement="below"><button type="button" onClick={() => { onCollapseAll(); onOpenChange(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors"><ChevronUpIcon className="h-4 w-4" />Collapse All</button></Tooltip>}
                </>}
              </div>
            )}
            <div className="border-b border-theme-border/50 py-1">
              <p className="px-3 pb-1 pt-1.5 font-body text-[10px] font-bold uppercase text-theme-muted">Character</p>
            {!inlineActionIds.has('save-preset') && <Tooltip content="Save this character sheet as a reusable preset" placement="below"><button
              type="button"
              onClick={() => {
                setPresetName(`${character.name} Preset`);
                setShowSavePreset(true);
                onOpenChange(false);
              }}
              className="w-full px-3 py-2 text-left text-sm font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors"
            >
              <span className="flex items-center gap-2 font-semibold"><SaveIcon className="h-4 w-4" />Save as Preset</span>
            </button></Tooltip>}
            {!inlineActionIds.has('export-character') && <Tooltip content="Download this character as a JSON file" placement="below"><button
              type="button"
              onClick={() => {
                downloadCharacter(character);
                onOpenChange(false);
                showNotice('Character exported');
              }}
              className="w-full px-3 py-2 text-left text-sm font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors"
            >
              <span className="flex items-center gap-2 font-semibold"><DownloadIcon className="h-4 w-4" />Export Character</span>
            </button></Tooltip>}
            {!inlineActionIds.has('publish') && <Tooltip content="Submit an image-free preset to the community gallery" placement="below"><button
              type="button"
              onClick={() => {
                setShowPublish(true);
                onOpenChange(false);
              }}
              className="w-full px-3 py-2 text-left text-sm font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors"
            >
              <span className="flex items-center gap-2 font-semibold"><UploadIcon className="h-4 w-4" />Publish to Community</span>
            </button></Tooltip>}
            {!inlineActionIds.has('print-preview') && <Tooltip content="Prepare this sheet for paper or PDF" placement="below"><button
              type="button"
              data-tutorial="print-mode-button"
              onClick={() => {
                onPrintPreview();
                onOpenChange(false);
              }}
              className="w-full px-3 py-2 text-left text-sm font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors"
            >
              <span className="flex items-center gap-2 font-semibold"><PrintIcon className="h-4 w-4" />Print Preview</span>
            </button></Tooltip>}
            </div>
            <div className="py-1">
              <p className="px-3 pb-1 pt-1.5 font-body text-[10px] font-bold uppercase text-theme-muted">Application</p>
            <Tooltip content="Report a bug or request a feature" placement="below"><a
              href="https://docs.google.com/forms/d/e/1FAIpQLScDC-2AnN7OXojo3C-6TdoOfpco1qLAhW7wbB93C4POC4y8KA/viewform?usp=dialog"
              target="_blank"
              rel="noopener noreferrer"
              data-tutorial="feedback-button"
              onClick={() => {
                recordTelemetryEvent({
                  eventName: 'external_feedback_opened',
                  category: 'app',
                  source: 'sheet_menu',
                });
                onOpenChange(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors"
            >
              <span className="flex items-center gap-2 font-semibold"><MessageIcon className="h-4 w-4" />Feedback</span>
            </a></Tooltip>
            <Tooltip content="Return to character selection" placement="below"><button
              type="button"
              onClick={() => {
                onExit();
                onOpenChange(false);
              }}
              className="w-full px-3 py-2 text-left text-sm font-body text-red-500 hover:bg-red-500 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2 font-semibold"><XIcon className="h-4 w-4" />Exit</span>
            </button></Tooltip>
            </div>
          </div>
        )}
      </div>

      {notice && (
        <div className="fixed left-1/2 bottom-6 -translate-x-1/2 z-[100] bg-theme-ink text-theme-paper px-4 py-2 rounded-button shadow-lg font-body text-sm animate-fade-in">
          {notice}
        </div>
      )}

      {showSavePreset && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60] animate-fade-in" onClick={() => setShowSavePreset(false)} />
          <div role="dialog" aria-modal="true" aria-labelledby="save-preset-title" className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] p-6 rounded-theme shadow-xl w-[90vw] max-w-[420px] bg-theme-paper text-theme-ink border-[length:var(--border-width)] border-theme-border animate-fade-in">
            <p className="font-body text-xs font-bold uppercase tracking-wider text-theme-muted">My Presets</p>
            <h2 id="save-preset-title" className="font-heading font-bold text-xl mt-1">Save this sheet as a Preset</h2>
            <p className="font-body text-sm text-theme-muted mt-2">The current sheets, widgets, formulas, and values become a reusable starting point.</p>
            <label className="block font-body text-sm font-semibold mt-5">
              Preset name
              <input
                autoFocus
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
                className="mt-1 w-full px-3 py-2 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink"
              />
            </label>
            <label className="mt-4 flex items-center gap-2 font-body text-sm cursor-pointer">
              <input type="checkbox" checked={includeTheme} onChange={(event) => setIncludeTheme(event.target.checked)} />
              Include the current theme
            </label>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={() => setShowSavePreset(false)} className="px-4 py-2 rounded-button font-body text-sm border border-theme-border hover:bg-theme-accent/10">Cancel</button>
              <button type="button" onClick={handleSavePreset} className="px-4 py-2 rounded-button font-body text-sm font-bold bg-theme-accent text-theme-paper hover:bg-theme-accent-hover">Save Preset</button>
            </div>
          </div>
        </>
      )}

      <GalleryShareModal
        open={showPublish}
        initialName={character.name}
        onClose={() => setShowPublish(false)}
        onSubmit={handlePublish}
        requestGameSystem
      />
    </>
  );
}
