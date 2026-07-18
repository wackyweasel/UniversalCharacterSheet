import { useEffect, useRef, useState } from 'react';
import type { Character } from '../types';
import { useUserPresetStore } from '../store/useUserPresetStore';
import { submitToGallery } from '../hooks/useGallery';
import { stripImages } from '../utils/stripImages';
import GalleryShareModal from './GalleryShareModal';
import { MenuIcon } from './icons';
import { useDiceSettingsStore } from '../store/useDiceSettingsStore';

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
}

function downloadCharacter(character: Character) {
  const data = JSON.stringify(character, null, 2);
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
}: ShareExportMenuProps) {
  const addPreset = useUserPresetStore((state) => state.addPreset);
  const threeDDiceEnabled = useDiceSettingsStore((state) => state.threeDDiceEnabled);
  const setThreeDDiceEnabled = useDiceSettingsStore((state) => state.setThreeDDiceEnabled);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState(`${character.name} Preset`);
  const [includeTheme, setIncludeTheme] = useState(true);
  const [showPublish, setShowPublish] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
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

  const handlePublish = async (name: string, author: string, description: string) => {
    const strippedCharacter = stripImages(character);
    const { id: _, ...preset } = strippedCharacter;
    return submitToGallery('Presets', name, author, description, preset);
  };

  return (
    <>
      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-label="Menu"
          aria-expanded={open}
          className="w-8 h-8 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors"
        >
          <MenuIcon className="w-4 h-4" />
        </button>
        {open && (
          <div className="absolute left-0 top-full mt-2 w-[min(280px,calc(100vw-1rem))] max-h-[calc(100dvh-7.5rem)] overflow-y-auto bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme z-50 animate-dropdown-in">
            <div className={`${playLayout === 'list' ? 'min-[720px]:hidden' : workspace === 'play' ? 'min-[560px]:hidden' : 'min-[540px]:hidden'} p-2 border-b border-theme-border/50 space-y-2`}>
              <div className={`grid grid-cols-2 gap-1 ${playLayout === 'list' ? 'min-[720px]:hidden' : workspace === 'build' ? 'min-[460px]:hidden' : 'min-[380px]:hidden'}`}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectLayout('canvas');
                    onOpenChange(false);
                  }}
                  aria-pressed={playLayout === 'canvas'}
                  className={`h-8 rounded-button text-xs font-body transition-colors ${playLayout === 'canvas' ? 'bg-theme-ink text-theme-paper' : 'bg-theme-background text-theme-ink hover:bg-theme-accent/20'}`}
                >
                  Canvas
                </button>
                <button
                  type="button"
                  data-tutorial="vertical-view-button-mobile"
                  onClick={() => {
                    onSelectLayout('list');
                    onOpenChange(false);
                  }}
                  aria-pressed={playLayout === 'list'}
                  className={`h-8 rounded-button text-xs font-body transition-colors ${playLayout === 'list' ? 'bg-theme-ink text-theme-paper' : 'bg-theme-background text-theme-ink hover:bg-theme-accent/20'}`}
                >
                  List
                </button>
              </div>
              <div className={`grid grid-cols-2 gap-1 ${workspace === 'play' ? 'min-[480px]:hidden' : 'min-[540px]:hidden'}`}>
                <button type="button" onClick={() => { onUndo(); onOpenChange(false); }} disabled={!canUndo} className="h-8 rounded-button bg-theme-background text-xs font-body text-theme-ink disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-theme-accent/20">
                  Undo
                </button>
                <button type="button" onClick={() => { onRedo(); onOpenChange(false); }} disabled={!canRedo} className="h-8 rounded-button bg-theme-background text-xs font-body text-theme-ink disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-theme-accent/20">
                  Redo
                </button>
              </div>
              {workspace === 'play' && (
                <button
                  type="button"
                  data-tutorial="timeline-button-mobile"
                  onClick={() => {
                    onToggleTimeline();
                    onOpenChange(false);
                  }}
                  aria-controls="timeline-panel"
                  aria-expanded={timelineOpen}
                  className={`min-[560px]:hidden w-full h-8 rounded-button text-xs font-body transition-colors ${timelineOpen ? 'bg-theme-accent text-theme-paper' : 'bg-theme-background text-theme-ink hover:bg-theme-accent/20'}`}
                >
                  Timeline
                </button>
              )}
            </div>
            <div className="px-3 py-2.5 border-b border-theme-border/50">
              {workspace === 'build' && (
                <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-theme-border/50">
                  <div className="min-w-0">
                    <span className="block text-sm font-semibold font-body text-theme-ink">Attachment controls</span>
                    <span className="block text-[11px] font-body text-theme-muted mt-0.5">Show attach and detach buttons</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={attachmentControlsVisible}
                    aria-label="Show attachment controls"
                    onClick={onToggleAttachmentControls}
                    className={`relative w-11 h-6 flex-shrink-0 rounded-full border border-theme-border transition-colors ${attachmentControlsVisible ? 'bg-theme-accent' : 'bg-theme-background'}`}
                  >
                    <span
                      className={`absolute left-0 top-0.5 w-4 h-4 rounded-full bg-white border border-black/25 shadow-sm transition-transform ${attachmentControlsVisible ? 'translate-x-[22px]' : 'translate-x-1'}`}
                    />
                    <span className="sr-only">{attachmentControlsVisible ? 'On' : 'Off'}</span>
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="block text-sm font-semibold font-body text-theme-ink">3D Dice</span>
                  <span className="block text-[11px] font-body text-theme-muted mt-0.5">Physics simulation for supported dice</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={threeDDiceEnabled}
                  aria-label="Enable 3D dice"
                  onClick={() => setThreeDDiceEnabled(!threeDDiceEnabled)}
                  className={`relative w-11 h-6 flex-shrink-0 rounded-full border border-theme-border transition-colors ${threeDDiceEnabled ? 'bg-theme-accent' : 'bg-theme-background'}`}
                >
                  <span
                    className={`absolute left-0 top-0.5 w-4 h-4 rounded-full bg-white border border-black/25 shadow-sm transition-transform ${threeDDiceEnabled ? 'translate-x-[22px]' : 'translate-x-1'}`}
                  />
                  <span className="sr-only">{threeDDiceEnabled ? 'On' : 'Off'}</span>
                </button>
              </div>
            </div>
            {(onAddWidget || onChangeTheme || onAutoStack) && (
              <div className={`py-1 border-b border-theme-border/50 ${onAutoStack ? '' : playLayout === 'list' ? 'min-[1200px]:hidden' : workspace === 'build' ? 'hidden max-[639px]:block min-[900px]:block min-[1200px]:hidden' : 'hidden max-[639px]:block min-[720px]:block min-[1200px]:hidden'}`}>
                {onAddWidget && <button type="button" data-tutorial="add-widget-button-mobile" onClick={() => { onAddWidget(); onOpenChange(false); }} className={`${playLayout === 'list' ? 'min-[380px]:hidden' : 'min-[320px]:hidden'} w-full px-3 py-2 text-left text-sm font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors`}>{addWidgetLabel}</button>}
                {onChangeTheme && <button type="button" data-tutorial="theme-button-mobile" onClick={() => { onChangeTheme(); onOpenChange(false); }} className={`${playLayout === 'list' ? 'min-[1200px]:hidden' : workspace === 'build' ? 'min-[640px]:hidden min-[900px]:block min-[1200px]:hidden' : 'min-[640px]:hidden min-[720px]:block min-[1200px]:hidden'} w-full px-3 py-2 text-left text-sm font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors`}>{changeThemeLabel}</button>}
                {onAutoStack && <button type="button" onClick={() => { onAutoStack(); onOpenChange(false); }} className="w-full px-3 py-2 text-left text-sm font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors">Auto Stack</button>}
              </div>
            )}
            {(onExpandAll || onCollapseAll) && (
              <div className={`${playLayout === 'list' ? 'min-[800px]:hidden' : 'min-[480px]:hidden'} py-1 border-b border-theme-border/50`}>
                {onExpandAll && <button type="button" onClick={() => { onExpandAll(); onOpenChange(false); }} className="w-full px-3 py-2 text-left text-sm font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors">Expand All</button>}
                {onCollapseAll && <button type="button" onClick={() => { onCollapseAll(); onOpenChange(false); }} className="w-full px-3 py-2 text-left text-sm font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors">Collapse All</button>}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setPresetName(`${character.name} Preset`);
                setShowSavePreset(true);
                onOpenChange(false);
              }}
              className="w-full px-3 py-2.5 text-left text-sm font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors"
            >
              <span className="block font-semibold">Save as Preset</span>
              <span className="block text-[11px] opacity-65 mt-0.5">Reuse this sheet for another character</span>
            </button>
            <button
              type="button"
              onClick={() => {
                downloadCharacter(character);
                onOpenChange(false);
                showNotice('Character exported');
              }}
              className="w-full px-3 py-2.5 text-left text-sm font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors"
            >
              <span className="block font-semibold">Export Character</span>
              <span className="block text-[11px] opacity-65 mt-0.5">Download a portable JSON file</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPublish(true);
                onOpenChange(false);
              }}
              className="w-full px-3 py-2.5 text-left text-sm font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors"
            >
              <span className="block font-semibold">Publish to Community</span>
              <span className="block text-[11px] opacity-65 mt-0.5">Submit an image-free preset for review</span>
            </button>
            <button
              type="button"
              data-tutorial="print-mode-button"
              onClick={() => {
                onPrintPreview();
                onOpenChange(false);
              }}
              className="w-full px-3 py-2.5 text-left text-sm font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors border-t border-theme-border/50"
            >
              <span className="block font-semibold">Print Preview</span>
              <span className="block text-[11px] opacity-65 mt-0.5">Prepare this sheet for paper or PDF</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onExit();
                onOpenChange(false);
              }}
              className="w-full px-3 py-2.5 text-left text-sm font-body text-red-500 hover:bg-red-500 hover:text-white transition-colors border-t border-theme-border/50"
            >
              <span className="block font-semibold">Exit</span>
              <span className="block text-[11px] opacity-65 mt-0.5">Go back to character selection</span>
            </button>
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
      />
    </>
  );
}
