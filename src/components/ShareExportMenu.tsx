import { useEffect, useRef, useState } from 'react';
import type { Character } from '../types';
import { useUserPresetStore } from '../store/useUserPresetStore';
import { submitToGallery } from '../hooks/useGallery';
import { stripImages } from '../utils/stripImages';
import GalleryShareModal from './GalleryShareModal';

interface ShareExportMenuProps {
  character: Character;
  onPrintPreview: () => void;
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

export default function ShareExportMenu({ character, onPrintPreview }: ShareExportMenuProps) {
  const addPreset = useUserPresetStore((state) => state.addPreset);
  const [open, setOpen] = useState(false);
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
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

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
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className="h-8 px-3 bg-theme-accent text-theme-paper border-[length:var(--border-width)] border-theme-border rounded-button text-xs font-body font-bold hover:bg-theme-accent-hover transition-colors"
        >
          Share &amp; Export
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-2 min-w-[220px] bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme overflow-hidden z-50 animate-dropdown-in">
            <div className="px-3 py-2 border-b border-theme-border/50">
              <p className="font-heading text-xs font-bold text-theme-ink">Share &amp; Export</p>
              <p className="font-body text-[11px] text-theme-muted mt-0.5">Actions for {character.name}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPresetName(`${character.name} Preset`);
                setShowSavePreset(true);
                setOpen(false);
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
                setOpen(false);
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
                setOpen(false);
              }}
              className="w-full px-3 py-2.5 text-left text-sm font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors"
            >
              <span className="block font-semibold">Publish to Community</span>
              <span className="block text-[11px] opacity-65 mt-0.5">Submit an image-free preset for review</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onPrintPreview();
                setOpen(false);
              }}
              className="w-full px-3 py-2.5 text-left text-sm font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors border-t border-theme-border/50"
            >
              <span className="block font-semibold">Print Preview</span>
              <span className="block text-[11px] opacity-65 mt-0.5">Prepare this sheet for paper or PDF</span>
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
