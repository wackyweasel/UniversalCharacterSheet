import { useEffect, useId, useRef, useState } from 'react';
import type { PaperFormat } from '../store/usePrintStore';
import { ArrowLeftIcon, BorderIcon, CheckIcon, ChevronDownIcon, PaletteIcon, PaperIcon, PencilIcon, PlayIcon, PrintIcon, XIcon } from './icons';
import { ToolbarOverflow, ToolbarShell } from './ToolbarShell';
import { Tooltip } from './Tooltip';

interface PrintToolbarProps {
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onBack: () => void;
  onExit: () => void;
  onPlay: () => void;
  onBuild: () => void;
  onPrint: () => void;
  printerFriendly: boolean;
  onTogglePrinterFriendly: () => void;
  bordersDisabled: boolean;
  onToggleBorders: () => void;
  paperFormat: PaperFormat;
  isLandscape: boolean;
  onPaperFormatChange: (format: PaperFormat, landscape: boolean) => void;
  showInEditMode: boolean;
  onToggleShowInEditMode: () => void;
}

const formatOptions: [PaperFormat, boolean, string][] = [
  ['none', false, 'Freeform'],
  ['a4', false, 'A4 Portrait'],
  ['a4', true, 'A4 Landscape'],
  ['letter', false, 'Letter Portrait'],
  ['letter', true, 'Letter Landscape'],
];

export default function PrintToolbar({
  menuOpen,
  onMenuOpenChange,
  onBack,
  onExit,
  onPlay,
  onBuild,
  onPrint,
  printerFriendly,
  onTogglePrinterFriendly,
  bordersDisabled,
  onToggleBorders,
  paperFormat,
  isLandscape,
  onPaperFormatChange,
  showInEditMode,
  onToggleShowInEditMode,
}: PrintToolbarProps) {
  const [formatMenuOpen, setFormatMenuOpen] = useState(false);
  const formatMenuRef = useRef<HTMLDivElement>(null);
  const formatTriggerRef = useRef<HTMLButtonElement>(null);
  const formatMenuId = useId();
  const formatLabel = paperFormat === 'none'
    ? 'Freeform'
    : `${paperFormat === 'a4' ? 'A4' : 'Letter'} ${isLandscape ? 'Landscape' : 'Portrait'}`;
  const menuButtonClass = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold font-body text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper';
  const menuSwitchClass = (active: boolean) => `relative h-6 w-11 shrink-0 rounded-full border border-theme-border transition-colors ${active ? 'bg-theme-accent' : 'bg-theme-background'}`;
  const menuSwitchThumbClass = (active: boolean) => `absolute left-0 top-0.5 h-4 w-4 rounded-full border border-black/25 bg-white shadow-sm transition-transform ${active ? 'translate-x-[22px]' : 'translate-x-1'}`;
  const toggleButtonClass = 'h-8 shrink-0 items-center justify-center gap-1.5 rounded-button border-[length:var(--border-width)] px-2 text-xs font-body transition-colors';
  const toggleStateClass = (active: boolean) => active
    ? 'border-theme-accent bg-theme-accent text-theme-paper hover:bg-theme-accent-hover'
    : 'border-theme-border bg-theme-background text-theme-ink hover:bg-theme-accent hover:text-theme-paper';

  useEffect(() => {
    if (!formatMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!formatMenuRef.current?.contains(event.target as Node)) setFormatMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setFormatMenuOpen(false);
      formatTriggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [formatMenuOpen]);

  const selectPaperFormat = (format: PaperFormat, landscape: boolean) => {
    onPaperFormatChange(format, landscape);
    setFormatMenuOpen(false);
    formatTriggerRef.current?.focus();
  };

  const primary = (
    <>
      <ToolbarOverflow open={menuOpen} onOpenChange={onMenuOpenChange} label="Print menu">
        <div className="border-b border-theme-border/50 py-1">
          <p className="px-3 pb-1 pt-1.5 font-body text-[10px] font-bold uppercase text-theme-muted">Workspace</p>
          <Tooltip content="Return to the workspace that opened Print Preview" placement="below"><button type="button" onClick={() => { onBack(); onMenuOpenChange(false); }} className={menuButtonClass}><ArrowLeftIcon className="h-4 w-4" />Back to previous workspace</button></Tooltip>
          <Tooltip content="Exit Print Preview and open Play" placement="below"><button type="button" onClick={() => { onPlay(); onMenuOpenChange(false); }} className={menuButtonClass}><PlayIcon className="h-4 w-4" />Open Play</button></Tooltip>
          <Tooltip content="Exit Print Preview and open Build" placement="below"><button type="button" onClick={() => { onBuild(); onMenuOpenChange(false); }} className={menuButtonClass}><PencilIcon className="h-4 w-4" />Open Build</button></Tooltip>
        </div>

        <div className="border-b border-theme-border/50 px-3 py-2.5">
          <p className="mb-1.5 font-body text-[10px] font-bold uppercase text-theme-muted">Appearance</p>
          <div className="min-[640px]:hidden">
            <div className="flex min-h-12 items-center justify-between gap-3 py-1.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <PaletteIcon className="h-4 w-4 shrink-0 text-theme-muted" />
                <div className="min-w-0">
                  <span className="block text-sm font-semibold font-body text-theme-ink">Printer friendly</span>
                  <span className="block truncate text-[11px] font-body text-theme-muted">Use high-contrast print colors</span>
                </div>
              </div>
              <Tooltip content={printerFriendly ? 'Disable printer friendly colors' : 'Use printer friendly colors'} placement="below"><button type="button" role="switch" aria-checked={printerFriendly} aria-label="Use printer friendly colors" onClick={onTogglePrinterFriendly} className={menuSwitchClass(printerFriendly)}>
                <span className={menuSwitchThumbClass(printerFriendly)} />
                <span className="sr-only">{printerFriendly ? 'On' : 'Off'}</span>
              </button></Tooltip>
            </div>
          </div>
          <div className="min-[760px]:hidden">
            <div className="flex min-h-12 items-center justify-between gap-3 py-1.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <BorderIcon className="h-4 w-4 shrink-0 text-theme-muted" />
                <div className="min-w-0">
                  <span className="block text-sm font-semibold font-body text-theme-ink">Hide borders</span>
                  <span className="block truncate text-[11px] font-body text-theme-muted">Remove widget outlines</span>
                </div>
              </div>
              <Tooltip content={bordersDisabled ? 'Show widget borders' : 'Hide widget borders'} placement="below"><button type="button" role="switch" aria-checked={bordersDisabled} aria-label="Hide widget borders" onClick={onToggleBorders} className={menuSwitchClass(bordersDisabled)}>
                <span className={menuSwitchThumbClass(bordersDisabled)} />
                <span className="sr-only">{bordersDisabled ? 'On' : 'Off'}</span>
              </button></Tooltip>
            </div>
          </div>
          <div className="flex min-h-12 items-center justify-between gap-3 py-1.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <PaperIcon className="h-4 w-4 shrink-0 text-theme-muted" />
              <div className="min-w-0">
                <span className="block text-sm font-semibold font-body text-theme-ink">Show print area in Build</span>
                <span className="block truncate text-[11px] font-body text-theme-muted">Keep the print boundary visible while editing</span>
              </div>
            </div>
            <Tooltip content={showInEditMode ? 'Hide the print area in Build' : 'Show the print area in Build'} placement="below"><button type="button" role="switch" aria-checked={showInEditMode} aria-label="Show print area in Build" onClick={onToggleShowInEditMode} className={menuSwitchClass(showInEditMode)}>
              <span className={menuSwitchThumbClass(showInEditMode)} />
              <span className="sr-only">{showInEditMode ? 'On' : 'Off'}</span>
            </button></Tooltip>
          </div>
        </div>

        <div className="py-1">
          <p className="px-3 pb-1 pt-1.5 font-body text-[10px] font-bold uppercase text-theme-muted">Character</p>
          <Tooltip content="Return to character selection" placement="below"><button type="button" onClick={() => { onExit(); onMenuOpenChange(false); }} className={`${menuButtonClass} text-red-500 hover:bg-red-500 hover:text-white`}><XIcon className="h-4 w-4" />Exit</button></Tooltip>
        </div>
      </ToolbarOverflow>

      <Tooltip content="Back to previous workspace" placement="below">
        <button type="button" onClick={onBack} aria-label="Back to previous workspace" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-button border-[length:var(--border-width)] border-theme-border bg-theme-background text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper">
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
      </Tooltip>

      <div ref={formatMenuRef} className="relative w-[11.25rem] shrink-0 min-[480px]:w-[15.25rem]">
        <Tooltip content={`Paper format: ${formatLabel}`} placement="below">
          <button
            ref={formatTriggerRef}
            type="button"
            aria-label={`Paper format: ${formatLabel}`}
            aria-haspopup="menu"
            aria-expanded={formatMenuOpen}
            aria-controls={formatMenuOpen ? formatMenuId : undefined}
            onClick={() => setFormatMenuOpen((open) => !open)}
            className="flex h-8 w-full items-center gap-0.5 rounded-button border-[length:var(--border-width)] border-theme-border bg-theme-background px-1.5 text-theme-ink transition-colors hover:border-theme-accent hover:bg-theme-paper min-[480px]:gap-1.5 min-[480px]:px-2"
          >
            <PaperIcon className="hidden h-4 w-4 shrink-0 min-[480px]:block" />
            <span className="min-w-0 flex-1 truncate text-left text-[10px] font-body min-[480px]:text-xs">
              Paper Format: {formatLabel}
            </span>
            <ChevronDownIcon className={`h-3 w-3 shrink-0 transition-transform min-[480px]:h-3.5 min-[480px]:w-3.5 ${formatMenuOpen ? 'rotate-180' : ''}`} />
          </button>
        </Tooltip>

        {formatMenuOpen && (
          <div
            id={formatMenuId}
            role="menu"
            aria-label="Paper format"
            className="absolute left-0 top-full z-20 mt-2 w-[10.5rem] overflow-hidden rounded-theme border-[length:var(--border-width)] border-theme-border bg-theme-paper p-1 shadow-theme animate-dropdown-in"
          >
            {formatOptions.map(([format, landscape, label]) => {
              const selected = paperFormat === format && (format === 'none' || isLandscape === landscape);
              return (
                <button
                  key={label}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => selectPaperFormat(format, landscape)}
                  className={`flex w-full items-center justify-between gap-2 rounded-button px-2.5 py-2 text-left text-xs font-body transition-colors ${
                    selected
                      ? 'bg-theme-accent text-theme-paper'
                      : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
                  }`}
                >
                  <span>{label}</span>
                  {selected && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Tooltip content={printerFriendly ? 'Disable printer friendly colors' : 'Use printer friendly colors'} placement="below">
        <button
          type="button"
          onClick={onTogglePrinterFriendly}
          aria-label={printerFriendly ? 'Disable printer friendly colors' : 'Use printer friendly colors'}
          aria-pressed={printerFriendly}
          className={`hidden min-[640px]:flex ${toggleButtonClass} ${toggleStateClass(printerFriendly)}`}
        >
          <PaletteIcon className="h-4 w-4" />
          <span className="hidden min-[700px]:inline">Printer friendly</span>
        </button>
      </Tooltip>

      <Tooltip content={bordersDisabled ? 'Show widget borders' : 'Hide widget borders'} placement="below">
        <button
          type="button"
          onClick={onToggleBorders}
          aria-label={bordersDisabled ? 'Show widget borders' : 'Hide widget borders'}
          aria-pressed={bordersDisabled}
          className={`hidden min-[760px]:flex ${toggleButtonClass} ${toggleStateClass(bordersDisabled)}`}
        >
          <BorderIcon className="h-4 w-4" />
          <span className="hidden min-[1020px]:inline">Borders</span>
        </button>
      </Tooltip>

      <Tooltip content="Print character sheet" placement="below">
        <button
          type="button"
          onClick={onPrint}
          aria-label="Print character sheet"
          className="ml-auto flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-button bg-theme-accent px-2.5 text-xs font-bold text-theme-paper shadow-sm transition-colors hover:bg-theme-accent-hover min-[360px]:px-4"
        >
          <PrintIcon className="h-4 w-4" />
          <span className="hidden min-[360px]:inline">Print</span>
        </button>
      </Tooltip>
    </>
  );

  return (
    <ToolbarShell
      tutorialId="print-toolbar"
      className="absolute left-0 right-0 top-0 w-full"
      primary={primary}
      expanded={false}
    />
  );
}