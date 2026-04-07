import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useUndoStore } from '../store/useUndoStore';
import { useTutorialStore, TUTORIAL_STEPS } from '../store/useTutorialStore';
import { applyTheme, applyCustomTheme, THEMES } from '../store/useThemeStore';
import { getCustomTheme } from '../store/useCustomThemeStore';
import { usePrintStore, getEffectiveAspectRatio } from '../store/usePrintStore';
import type { PaperFormat } from '../store/usePrintStore';
import { TUTORIAL_PRESET } from '../presets';
import { usePanZoom, useTouchCamera, useAutoStack, useFitWidgets } from '../hooks';

const DARK_MODE_STORAGE_KEY = 'ucs:darkMode';
import Sidebar from './Sidebar';
import ThemeSidebar from './ThemeSidebar';
import DraggableWidget from './DraggableWidget';
import VerticalWidget from './VerticalWidget';
import AttachmentButtons from './AttachmentButtons';
import WidgetShadows from './WidgetShadows';
import PrintAreaOverlay from './PrintAreaOverlay';
import TutorialBubble, { useTutorialForPage } from './TutorialBubble';
import TimelineSidebar from './TimelineSidebar';
import { Tooltip } from './Tooltip';
import { useTimelineStore } from '../store/useTimelineStore';
import { WidgetType, Widget } from '../types';

// Helper to get active sheet widgets
function getActiveSheetWidgets(character: { sheets: { id: string; widgets: Widget[] }[]; activeSheetId: string }): Widget[] {
  const sheet = character.sheets.find(s => s.id === character.activeSheetId);
  return sheet?.widgets || [];
}

export default function Sheet() {
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const characters = useStore((state) => state.characters);
  const addWidget = useStore((state) => state.addWidget);
  const mode = useStore((state) => state.mode);
  const setMode = useStore((state) => state.setMode);
  const selectCharacter = useStore((state) => state.selectCharacter);
  const updateCharacterName = useStore((state) => state.updateCharacterName);
  const editingWidgetId = useStore((state) => state.editingWidgetId);
  const setSelectedWidgetId = useStore((state) => state.setSelectedWidgetId);
  const reorderWidget = useStore((state) => state.reorderWidget);
  const createSheet = useStore((state) => state.createSheet);
  const selectSheet = useStore((state) => state.selectSheet);
  const deleteSheet = useStore((state) => state.deleteSheet);
  const renameSheet = useStore((state) => state.renameSheet);
  const deleteCharacter = useStore((state) => state.deleteCharacter);
  const createCharacterFromPreset = useStore((state) => state.createCharacterFromPreset);
  const updateCharacterTheme = useStore((state) => state.updateCharacterTheme);
  const undo = useStore((state) => state.undo);
  const redo = useStore((state) => state.redo);
  const canUndo = useUndoStore((state) => activeCharacterId ? state.canUndo(activeCharacterId) : false);
  const canRedo = useUndoStore((state) => activeCharacterId ? state.canRedo(activeCharacterId) : false);
  const activeCharacter = characters.find(c => c.id === activeCharacterId);
  
  // Timeline state
  const timelineIsOpen = useTimelineStore((state) => state.isOpen);
  const toggleTimeline = useTimelineStore((state) => state.toggleOpen);
  
  // Tutorial state
  const tutorialStep = useTutorialStore((state) => state.tutorialStep);
  const advanceTutorial = useTutorialStore((state) => state.advanceTutorial);
  const { isActive: tutorialActiveOnPage } = useTutorialForPage('sheet');
  
  // Print mode state
  const printerFriendly = usePrintStore((state) => state.printerFriendly);
  const bordersDisabled = usePrintStore((state) => state.bordersDisabled);
  const shadowsDisabled = usePrintStore((state) => state.shadowsDisabled);
  const printArea = usePrintStore((state) => state.printArea);
  const previousMode = usePrintStore((state) => state.previousMode);
  const setPrinterFriendly = usePrintStore((state) => state.setPrinterFriendly);
  const setBordersDisabled = usePrintStore((state) => state.setBordersDisabled);
  const setShadowsDisabled = usePrintStore((state) => state.setShadowsDisabled);
  const setPrintArea = usePrintStore((state) => state.setPrintArea);
  const setPreviousMode = usePrintStore((state) => state.setPreviousMode);
  const calculatePrintAreaFromWidgets = usePrintStore((state) => state.calculatePrintAreaFromWidgets);
  const resetPrintSettings = usePrintStore((state) => state.resetPrintSettings);
  const paperFormat = usePrintStore((state) => state.paperFormat);
  const setPaperFormat = usePrintStore((state) => state.setPaperFormat);
  const isLandscape = usePrintStore((state) => state.isLandscape);
  const setIsLandscape = usePrintStore((state) => state.setIsLandscape);
  const showInEditMode = usePrintStore((state) => state.showInEditMode);
  const setShowInEditMode = usePrintStore((state) => state.setShowInEditMode);
  
  // Dark mode state (read from localStorage to match CharacterList)
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem(DARK_MODE_STORAGE_KEY);
    if (stored !== null) {
      return stored === 'true';
    }
    // Fall back to OS preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  // Listen for dark mode changes from CharacterList
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === DARK_MODE_STORAGE_KEY) {
        setDarkMode(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // Get widgets from active sheet
  const activeSheetWidgets = activeCharacter ? getActiveSheetWidgets(activeCharacter) : [];
  
  // Default sidebar collapsed (toolbox hidden until user clicks "Add Widget")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [themeSidebarCollapsed, setThemeSidebarCollapsed] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [editedSheetName, setEditedSheetName] = useState('');
  const [sheetDropdownOpen, setSheetDropdownOpen] = useState(false);
  const [sheetToDelete, setSheetToDelete] = useState<string | null>(null);
  
  // Mobile menu state for grid mode
  const [gridMenuOpen, setGridMenuOpen] = useState(false);
  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  const [paperFormatDropdownOpen, setPaperFormatDropdownOpen] = useState(false);
  const paperFormatDropdownRef = useRef<HTMLDivElement>(null);
  const [showAutoStackConfirm, setShowAutoStackConfirm] = useState(false);
  
  // Vertical mode drag state
  const [verticalDragIndex, setVerticalDragIndex] = useState<number | null>(null);
  const [verticalDropIndex, setVerticalDropIndex] = useState<number | null>(null);

  // Pan/Zoom camera hook
  const [isPinching, setIsPinching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);
  
  // Callback to clear selection and blur active element when clicking/touching background
  const handleBackgroundInteraction = useCallback(() => {
    setSelectedWidgetId(null);
    // Blur any focused input/textarea element
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [setSelectedWidgetId]);
  
  const {
    pan,
    scale,
    isPanning,
    setPan,
    setScale,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
  } = usePanZoom({
    editingWidgetId,
    mode,
    onBackgroundClick: handleBackgroundInteraction,
  });

  // Touch camera controls hook
  const scaleRef = useRef(scale);
  const panRef = useRef(pan);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { panRef.current = pan; }, [pan]);
  
  const getScale = useCallback(() => scaleRef.current, []);
  const getPan = useCallback(() => panRef.current, []);
  
  const { isTouchPanning } = useTouchCamera({
    mode,
    onPanChange: setPan,
    onScaleChange: setScale,
    onPinchingChange: setIsPinching,
    getScale,
    getPan,
    onBackgroundTouch: handleBackgroundInteraction,
  });

  // Auto-stack hook
  const { handleAutoStack } = useAutoStack({
    widgets: activeSheetWidgets,
    scale,
  });

  // Fit widgets hook
  const { handleFitAllWidgets } = useFitWidgets({
    widgets: activeSheetWidgets,
    scale,
    setScale,
    setPan,
  });

  // Close paper format dropdown on outside click
  useEffect(() => {
    if (!paperFormatDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (paperFormatDropdownRef.current && !paperFormatDropdownRef.current.contains(e.target as Node)) {
        setPaperFormatDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [paperFormatDropdownOpen]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Ctrl+Z for undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl+Y or Ctrl+Shift+Z for redo
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.shiftKey && e.key === 'Z')) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Print mode handlers
  const enterPrintMode = useCallback(() => {
    setPreviousMode(mode as 'play' | 'edit' | 'vertical');
    setMode('print');
    // Only calculate print area if there isn't one already (preserve previous)
    if (!printArea) {
      const area = calculatePrintAreaFromWidgets(activeSheetWidgets);
      if (area) {
        setPrintArea(area);
      }
    }
  }, [mode, setMode, setPreviousMode, calculatePrintAreaFromWidgets, activeSheetWidgets, setPrintArea, printArea]);

  const exitPrintMode = useCallback((targetMode?: 'play' | 'edit') => {
    const modeToSwitchTo = targetMode || previousMode || 'play';
    setMode(modeToSwitchTo);
    // If "Show in Edit Mode" is on, preserve the print area and that flag
    const keepOverlay = showInEditMode && printArea;
    const savedArea = printArea;
    resetPrintSettings();
    if (keepOverlay) {
      setShowInEditMode(true);
      setPrintArea(savedArea);
    }
  }, [previousMode, setMode, resetPrintSettings, showInEditMode, printArea, setShowInEditMode, setPrintArea]);

  // Handle paper format change: enforce aspect ratio on the print area
  const handlePaperFormatChange = useCallback((format: PaperFormat, landscape: boolean) => {
    setPaperFormat(format);
    setIsLandscape(landscape);
    const ratio = getEffectiveAspectRatio(format, landscape);
    if (ratio && printArea) {
      const newHeight = printArea.width / ratio;
      const deltaY = (newHeight - printArea.height) / 2;
      setPrintArea({
        ...printArea,
        y: printArea.y - deltaY,
        height: newHeight,
      });
    }
  }, [setPaperFormat, setIsLandscape, printArea, setPrintArea]);

  // Recalculate print area on mount if already in print mode (e.g., after page refresh)
  useEffect(() => {
    if (mode === 'print' && !printArea && activeSheetWidgets.length > 0) {
      const area = calculatePrintAreaFromWidgets(activeSheetWidgets);
      if (area) {
        setPrintArea(area);
      }
    }
  }, [mode, printArea, activeSheetWidgets, calculatePrintAreaFromWidgets, setPrintArea]);

  // Apply print mode theme overrides
  useEffect(() => {
    if (mode === 'print' && activeCharacter) {
      const root = document.documentElement;
      
      // First, restore the base theme so toggling OFF works correctly
      const themeId = activeCharacter.theme || 'default';
      const customTheme = getCustomTheme(themeId);
      if (customTheme) {
        applyCustomTheme(customTheme);
      } else {
        applyTheme(themeId);
      }
      
      // Then apply any active print overrides on top
      if (printerFriendly) {
        // Apply classic theme colors for printer-friendly mode
        const classicTheme = THEMES.find(t => t.id === 'default');
        if (classicTheme) {
          root.style.setProperty('--color-background', classicTheme.colors.background);
          root.style.setProperty('--color-paper', classicTheme.colors.paper);
          root.style.setProperty('--color-ink', classicTheme.colors.ink);
          root.style.setProperty('--color-accent', classicTheme.colors.accent);
          root.style.setProperty('--color-accent-hover', classicTheme.colors.accentHover);
          root.style.setProperty('--color-border', classicTheme.colors.border);
          root.style.setProperty('--color-shadow', classicTheme.colors.shadow);
          root.style.setProperty('--color-muted', classicTheme.colors.muted);
          root.style.setProperty('--color-glow', classicTheme.colors.glow);
        }
      }
      
      // Always disable texture in print mode
      root.style.setProperty('--card-texture-key', 'none');
      root.style.setProperty('--card-texture', 'none');
      
      // Note: bordersDisabled is now handled inline in DraggableWidget
      // so buttons keep their borders while widget borders are removed
      
      if (shadowsDisabled) {
        root.style.setProperty('--shadow-style', 'none');
      }
    }
  }, [mode, activeCharacter, printerFriendly, bordersDisabled, shadowsDisabled]);

  // Restore theme when exiting print mode
  useEffect(() => {
    if (mode !== 'print' && activeCharacter) {
      const themeId = activeCharacter.theme || 'default';
      const customTheme = getCustomTheme(themeId);
      if (customTheme) {
        applyCustomTheme(customTheme);
      } else {
        applyTheme(themeId);
      }
    }
  }, [mode, activeCharacter?.theme]);

  // Print function - uses native browser print with a temporary wrapper element
  const handlePrint = useCallback(() => {
    if (!printArea) return;
    
    // Get the canvas content
    const canvas = document.querySelector('.print-canvas-content');
    if (!canvas) return;
    
    // Clone the canvas content
    const clone = canvas.cloneNode(true) as HTMLElement;
    
    // Remove the print area overlay from the clone
    const overlays = clone.querySelectorAll('.print-area-overlay');
    overlays.forEach(el => el.remove());
    
    // Remove elements marked with data-print-hide from the clone
    const hiddenElements = clone.querySelectorAll('[data-print-hide="true"]');
    hiddenElements.forEach(el => {
      el.remove();
    });
    
    // Position the clone to show only the print area
    clone.style.transform = `translate(${-printArea.x}px, ${-printArea.y}px)`;
    clone.style.position = 'absolute';
    clone.style.left = '0';
    clone.style.top = '0';
    
    // Create a wrapper element for printing
    const printWrapper = document.createElement('div');
    printWrapper.className = 'print-content-wrapper';
    printWrapper.style.width = `${printArea.width}px`;
    printWrapper.style.height = `${printArea.height}px`;
    printWrapper.style.overflow = 'hidden';
    printWrapper.style.position = 'relative';
    printWrapper.style.background = 'var(--color-paper)';
    printWrapper.appendChild(clone);
    
    // Add the wrapper to the body
    document.body.appendChild(printWrapper);
    
    // Clean up after printing - iOS Safari fires window.print() asynchronously,
    // so a fixed timeout would remove content before iOS renders the print preview.
    // Use afterprint event with a matchMedia fallback and a long safety timeout.
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      window.removeEventListener('afterprint', cleanup);
      mql?.removeListener(onMqlChange);
      clearTimeout(fallbackTimer);
      if (printWrapper.parentNode) {
        document.body.removeChild(printWrapper);
      }
    };

    // Primary: afterprint event
    window.addEventListener('afterprint', cleanup);

    // Fallback: matchMedia change (covers Safari versions without afterprint)
    const mql = window.matchMedia?.('print');
    const onMqlChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (!(e as MediaQueryListEvent).matches) cleanup();
    };
    if (mql) {
      // addListener is deprecated but has wider iOS support than addEventListener
      mql.addListener(onMqlChange);
    }

    // Safety net: long timeout so it never stays forever
    const fallbackTimer = setTimeout(cleanup, 60000);

    // Trigger native print
    window.print();
  }, [printArea]);

  // Handle tutorial step 22 -> 23: load tutorial preset
  useEffect(() => {
    if (tutorialStep === 23 && TUTORIAL_STEPS[23]?.id === 'switch-to-play') {
      // We just advanced to step 23, load the tutorial preset
      const oldCharId = activeCharacterId;
      createCharacterFromPreset(TUTORIAL_PRESET, 'Tutorial Character');
      // Delete the old tutorial character
      if (oldCharId) {
        deleteCharacter(oldCharId);
      }
      // If in dark mode, set theme to classic-dark
      // We need to get the new character ID after creation
      setTimeout(() => {
        const newCharId = useStore.getState().activeCharacterId;
        if (newCharId && darkMode) {
          updateCharacterTheme(newCharId, 'classic-dark');
        }
      }, 0);
      // Switch to edit mode first so they can see the sheet
      setMode('edit');
      // Fit widgets after a short delay
      setTimeout(() => {
        handleFitAllWidgets();
      }, 200);
    }
  }, [tutorialStep]);

  // Auto-open mobile menu when tutorial step requires the Edit/Play Mode button or Add Widget (hidden on mobile)
  useEffect(() => {
    const isNarrowScreen = window.innerWidth < 640; // sm breakpoint
    const needsEditModeButton = 
      (tutorialStep === 3 && TUTORIAL_STEPS[3]?.id === 'welcome-sheet') ||
      (tutorialStep === 23 && TUTORIAL_STEPS[23]?.id === 'switch-to-play');
    const needsAddWidgetButton = tutorialStep === 4 && TUTORIAL_STEPS[4]?.id === 'add-widget';
    
    if (isNarrowScreen && (needsEditModeButton || needsAddWidgetButton)) {
      setGridMenuOpen(true);
    }
  }, [tutorialStep]);

  // Fit all widgets when character sheet is opened or sheet is changed
  useEffect(() => {
    if (activeCharacterId && activeSheetWidgets.length > 0) {
      // Small delay to ensure DOM elements are rendered
      const timer = setTimeout(() => {
        handleFitAllWidgets();
      }, 100);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCharacterId, activeCharacter?.activeSheetId]);

  // Apply character's theme when entering sheet, revert to default when leaving
  useEffect(() => {
    if (activeCharacter) {
      const themeId = activeCharacter.theme || 'default';
      // Check if it's a custom theme
      const customTheme = getCustomTheme(themeId);
      if (customTheme) {
        applyCustomTheme(customTheme);
      } else {
        applyTheme(themeId);
      }
    }
    return () => {
      // Revert to default theme when component unmounts (going back to main menu)
      applyTheme('default');
    };
  }, [activeCharacter?.theme, activeCharacter?.id]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('widgetType') as WidgetType;
    if (type) {
      const rawX = (e.clientX - pan.x) / scale;
      const rawY = (e.clientY - pan.y) / scale;

      const GRID_SIZE = 10;
      const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;

      const x = snap(rawX);
      const y = snap(rawY);

      addWidget(type, x, y);
    }
  };

  // Vertical mode drag handlers
  const handleVerticalDragStart = (index: number) => {
    setVerticalDragIndex(index);
    setVerticalDropIndex(index);
  };

  const handleVerticalDragOver = (index: number) => {
    setVerticalDropIndex(index);
  };

  const handleVerticalDragEnd = () => {
    if (verticalDragIndex !== null && verticalDropIndex !== null && verticalDragIndex !== verticalDropIndex) {
      const widget = activeSheetWidgets[verticalDragIndex];
      if (widget) {
        reorderWidget(widget.id, verticalDropIndex);
      }
    }
    setVerticalDragIndex(null);
    setVerticalDropIndex(null);
  };

  if (!activeCharacter) return null;

  // Vertical mode menu state
  const [verticalMenuOpen, setVerticalMenuOpen] = useState(false);

  // Render Vertical Mode
  if (mode === 'vertical') {
    return (
      <div className="w-full h-screen overflow-hidden relative bg-theme-background flex flex-col">
        {/* Compact header bar */}
        <div className="bg-theme-paper border-b-[length:var(--border-width)] border-theme-border px-2 py-2 flex items-center gap-2 z-30 shrink-0">
          {/* Mobile: Menu button */}
          <button
            onClick={() => setVerticalMenuOpen(!verticalMenuOpen)}
            className="sm:hidden w-8 h-8 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink"
          >
            ☰
          </button>
          
          {/* Desktop: Inline menu buttons */}
          <div className="hidden sm:flex items-center gap-1">
            <Tooltip content="Exit to character select" placement="below">
              <button
                onClick={() => selectCharacter(null)}
                className="h-8 px-3 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-red-500 text-xs font-body hover:bg-red-500 hover:text-white transition-colors"
              >
                Exit
              </button>
            </Tooltip>
            <Tooltip content="Switch to Edit Mode" placement="below">
              <button
                onClick={() => setMode('edit')}
                className="h-8 px-3 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink text-xs font-body hover:bg-theme-accent hover:text-theme-paper transition-colors"
              >
                Edit Mode
              </button>
            </Tooltip>
            <Tooltip content="Switch to Grid View" placement="below">
              <button
                onClick={() => setMode('play')}
                className="h-8 px-3 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink text-xs font-body hover:bg-theme-accent hover:text-theme-paper transition-colors"
              >
                Grid View
              </button>
            </Tooltip>
            <Tooltip content="Open event timeline" placement="below">
              <button
                onClick={toggleTimeline}
                className={`h-8 px-3 flex items-center justify-center border-[length:var(--border-width)] border-theme-border rounded-button text-xs font-body transition-colors ${timelineIsOpen ? 'bg-theme-accent text-theme-paper' : 'bg-theme-background text-theme-ink hover:bg-theme-accent hover:text-theme-paper'}`}
              >
                Timeline
              </button>
            </Tooltip>
            {/* Undo/Redo buttons */}
            <Tooltip content="Undo (Ctrl+Z)" placement="below">
              <button
                onClick={undo}
                disabled={!canUndo}
                className={`w-8 h-8 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-xs font-body transition-colors ${
                  canUndo 
                    ? 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper' 
                    : 'text-theme-muted opacity-50 cursor-not-allowed'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M3 7v6h6"/>
                  <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
                </svg>
              </button>
            </Tooltip>
            <Tooltip content="Redo (Ctrl+Y)" placement="below">
              <button
                onClick={redo}
                disabled={!canRedo}
                className={`w-8 h-8 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-xs font-body transition-colors ${
                  canRedo 
                    ? 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper' 
                    : 'text-theme-muted opacity-50 cursor-not-allowed'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M21 7v6h-6"/>
                  <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
                </svg>
              </button>
            </Tooltip>
          </div>
          
          {/* Character name - truncated */}
          <h1 className="font-bold text-sm text-theme-ink font-heading truncate flex-1 min-w-0">
            {activeCharacter.name}
          </h1>
          
          {/* Sheet selector */}
          <div className="relative">
            <Tooltip content="Switch sheet" placement="left">
              <button
                onClick={() => setSheetDropdownOpen(!sheetDropdownOpen)}
                className="h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-theme px-2 flex items-center gap-1 text-xs"
              >
                <span className="text-theme-ink truncate max-w-[60px]">
                  {activeCharacter.sheets.find(s => s.id === activeCharacter.activeSheetId)?.name || 'Sheet'}
                </span>
                <span className="text-theme-muted">▼</span>
              </button>
            </Tooltip>
            
            {sheetDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setSheetDropdownOpen(false)}
                />
                <div className="absolute top-full right-0 mt-1 bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme overflow-hidden z-50 min-w-[120px]">
                  {activeCharacter.sheets.map((sheet) => (
                    <button
                      key={sheet.id}
                      onClick={() => {
                        selectSheet(sheet.id);
                        setSheetDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-xs text-left font-body transition-colors ${
                        sheet.id === activeCharacter.activeSheetId
                          ? 'bg-theme-accent text-theme-paper'
                          : 'text-theme-ink hover:bg-theme-accent/20'
                      }`}
                    >
                      {sheet.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          
          {/* Expand/Collapse buttons */}
          <Tooltip content="Expand All" placement="below">
            <button
              onClick={() => {
                activeSheetWidgets.forEach(w => {
                  localStorage.setItem(`ucs:vertical-collapsed:${w.id}`, 'false');
                });
                window.dispatchEvent(new CustomEvent('vertical-collapse-all', { detail: false }));
              }}
              className="w-8 h-8 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink text-xs"
            >
              ▼
            </button>
          </Tooltip>
          <Tooltip content="Collapse All" placement="below">
            <button
              onClick={() => {
                activeSheetWidgets.forEach(w => {
                  localStorage.setItem(`ucs:vertical-collapsed:${w.id}`, 'true');
                });
                window.dispatchEvent(new CustomEvent('vertical-collapse-all', { detail: true }));
              }}
              className="w-8 h-8 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink text-xs"
            >
              ▲
            </button>
          </Tooltip>
          {/* Undo/Redo buttons for mobile */}
          <div className="sm:hidden flex items-center gap-1">
            <Tooltip content="Timeline" placement="below">
              <button
                onClick={toggleTimeline}
                className={`w-8 h-8 flex items-center justify-center border-[length:var(--border-width)] border-theme-border rounded-button text-xs font-body transition-colors ${timelineIsOpen ? 'bg-theme-accent text-theme-paper' : 'bg-theme-background text-theme-ink hover:bg-theme-accent hover:text-theme-paper'}`}
              >
                ⧖
              </button>
            </Tooltip>
            <Tooltip content="Undo" placement="below">
              <button
                onClick={undo}
                disabled={!canUndo}
                className={`w-8 h-8 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-xs font-body transition-colors ${
                  canUndo 
                    ? 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper' 
                    : 'text-theme-muted opacity-50 cursor-not-allowed'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M3 7v6h6"/>
                  <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
                </svg>
              </button>
            </Tooltip>
            <Tooltip content="Redo" placement="below">
              <button
                onClick={redo}
                disabled={!canRedo}
                className={`w-8 h-8 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-xs font-body transition-colors ${
                  canRedo 
                    ? 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper' 
                    : 'text-theme-muted opacity-50 cursor-not-allowed'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M21 7v6h-6"/>
                  <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
                </svg>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Mobile: Dropdown menu */}
        {verticalMenuOpen && (
          <div className="sm:hidden">
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setVerticalMenuOpen(false)}
            />
            <div className="absolute top-12 left-2 bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme overflow-hidden z-50 flex flex-col">
              <button
                onClick={() => {
                  setMode('play');
                  setVerticalMenuOpen(false);
                }}
                className="px-4 py-2.5 text-sm text-left font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors whitespace-nowrap"
              >
                Grid View
              </button>
              <button
                onClick={() => {
                  setMode('edit');
                  setVerticalMenuOpen(false);
                }}
                className="px-4 py-2.5 text-sm text-left font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors whitespace-nowrap"
              >
                Edit Mode
              </button>
              <button
                onClick={() => {
                  toggleTimeline();
                  setVerticalMenuOpen(false);
                }}
                className="px-4 py-2.5 text-sm text-left font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors whitespace-nowrap"
              >
                Timeline
              </button>
              <button
                onClick={() => {
                  selectCharacter(null);
                  setVerticalMenuOpen(false);
                }}
                className="px-4 py-2.5 text-sm text-left font-body text-red-500 hover:bg-red-500 hover:text-white transition-colors border-t border-theme-border/50 whitespace-nowrap"
              >
                Exit to Menu
              </button>
            </div>
          </div>
        )}

        {/* Vertical Mode Container - scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-md mx-auto px-3 py-4 pb-24">
            {/* Widgets in vertical layout */}
            {activeSheetWidgets.map((widget, index) => (
              <VerticalWidget
                key={widget.id}
                widget={widget}
                index={index}
                totalWidgets={activeSheetWidgets.length}
                isDragging={verticalDragIndex !== null}
                draggedIndex={verticalDragIndex}
                dropTargetIndex={verticalDropIndex}
                onDragStart={handleVerticalDragStart}
                onDragOver={handleVerticalDragOver}
                onDragEnd={handleVerticalDragEnd}
              />
            ))}
            
            {activeSheetWidgets.length === 0 && (
              <div className="text-center text-theme-muted py-12">
                <p className="font-body">No widgets on this sheet</p>
                <p className="text-sm mt-2">Switch to Edit mode to add widgets</p>
              </div>
            )}
          </div>
        </div>

        {/* Timeline Sidebar */}
        <TimelineSidebar />
      </div>
    );
  }

  // Render Grid Mode (Edit, Play, or Print)
  return (
    <div ref={containerRef} className="w-full h-screen overflow-hidden relative bg-theme-background">
      {mode === 'edit' && (
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          viewport={containerRef.current ? { pan, scale, width: containerRef.current.clientWidth, height: containerRef.current.clientHeight } : undefined}
        />
      )}
      
      {/* Theme Sidebar - available in edit mode */}
      {mode === 'edit' && (
        <ThemeSidebar
          collapsed={themeSidebarCollapsed}
          onToggle={() => setThemeSidebarCollapsed(!themeSidebarCollapsed)}
        />
      )}
      
      {/* Canvas Container - touch events handled globally */}
      <div 
        className={`absolute inset-0 ${isPanning || isTouchPanning.current ? 'cursor-grabbing' : 'cursor-default'} ${isPinching ? 'pinch-active' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onDragOver={mode !== 'print' ? handleDragOver : undefined}
        onDrop={mode !== 'print' ? handleDrop : undefined}
      >
        {/* Transformed Content */}
        <div 
          ref={printAreaRef}
          className={`absolute top-0 left-0 w-full h-full origin-top-left print-canvas-content ${mode === 'print' ? 'pointer-events-auto' : ''}`}
          style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` 
          }}
        >
          {/* Infinite Grid Background - hidden in play and print mode */}
          {mode !== 'play' && mode !== 'print' && (
            <div 
              className="absolute -top-[50000px] -left-[50000px] w-[100000px] h-[100000px] pattern-grid opacity-20 pointer-events-none" 
            />
          )}

          {/* Shadow Layer - rendered below all widgets (respect shadowsDisabled in print mode) */}
          {!(mode === 'print' && shadowsDisabled) && (
            <WidgetShadows 
              widgets={activeSheetWidgets} 
              scale={scale}
            />
          )}

          {/* Widgets */}
          {activeSheetWidgets.map(widget => (
            <DraggableWidget 
              key={widget.id} 
              widget={widget} 
              scale={scale}
            />
          ))}
          
          {/* Attachment Buttons - only in edit mode */}
          {mode === 'edit' && (
            <AttachmentButtons 
              widgets={activeSheetWidgets} 
              scale={scale}
            />
          )}
          
          {/* Print Area Overlay - in print mode or edit mode when showInEditMode is on */}
          {(mode === 'print' || (mode === 'edit' && showInEditMode && printArea)) && (
            <PrintAreaOverlay 
              scale={scale}
              pan={pan}
              readOnly={mode === 'edit'}
            />
          )}
        </div>
      </div>

      {/* Print Mode Header */}
      {mode === 'print' && (
        <div className="absolute top-0 left-0 right-0 bg-theme-paper border-b-[length:var(--border-width)] border-theme-border px-2 py-2 flex items-center gap-2 z-30">
          {/* Menu button - only on narrow screens */}
          <button
            onClick={() => setPrintMenuOpen(!printMenuOpen)}
            className="sm:hidden w-8 h-8 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink shrink-0"
          >
            ☰
          </button>

          {/* Wide screen: inline buttons */}
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            {/* Exit button */}
            <Tooltip content="Exit to character select" placement="below">
              <button
                onClick={() => {
                  resetPrintSettings();
                  selectCharacter(null);
                }}
                className="px-3 h-8 bg-theme-background border-[length:var(--border-width)] border-red-400 rounded-button text-red-600 text-xs font-body hover:bg-red-600 hover:text-white transition-colors"
              >
                Exit
              </button>
            </Tooltip>
            
            {/* Mode switch buttons */}
            <Tooltip content="Exit print mode, go to Play Mode" placement="below">
              <button
                onClick={() => exitPrintMode('play')}
                className="px-3 h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink text-xs font-body hover:bg-theme-accent hover:text-theme-paper transition-colors"
              >
                Play Mode
              </button>
            </Tooltip>
            <Tooltip content="Exit print mode, go to Edit Mode" placement="below">
              <button
                onClick={() => exitPrintMode('edit')}
                className="px-3 h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink text-xs font-body hover:bg-theme-accent hover:text-theme-paper transition-colors"
              >
                Edit Mode
              </button>
            </Tooltip>
            
            {/* Separator */}
            <div className="w-px h-6 bg-theme-border" />
            
            {/* Print options */}
            <Tooltip content="Use printer-friendly colors (black &amp; white)" placement="below">
              <button
                onClick={() => setPrinterFriendly(!printerFriendly)}
                className={`px-3 h-8 border-[length:var(--border-width)] border-theme-border rounded-button text-xs font-body transition-colors ${
                  printerFriendly 
                    ? 'bg-theme-accent text-theme-paper' 
                    : 'bg-theme-background text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
                }`}
              >
                Printer Friendly Theme
              </button>
            </Tooltip>
            <Tooltip content="Hide widget borders" placement="below">
              <button
                onClick={() => setBordersDisabled(!bordersDisabled)}
                className={`px-3 h-8 border-[length:var(--border-width)] border-theme-border rounded-button text-xs font-body transition-colors ${
                  bordersDisabled 
                    ? 'bg-theme-accent text-theme-paper' 
                    : 'bg-theme-background text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
                }`}
              >
                No Borders
              </button>
            </Tooltip>
            <Tooltip content="Hide widget shadows" placement="below">
              <button
                onClick={() => setShadowsDisabled(!shadowsDisabled)}
                className={`px-3 h-8 border-[length:var(--border-width)] border-theme-border rounded-button text-xs font-body transition-colors ${
                  shadowsDisabled 
                    ? 'bg-theme-accent text-theme-paper' 
                    : 'bg-theme-background text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
                }`}
              >
                No Shadows
              </button>
            </Tooltip>
            {/* Paper Format dropdown */}
            <div className="relative" ref={paperFormatDropdownRef}>
              <Tooltip content="Force print area to a paper aspect ratio" placement="below">
                <button
                  onClick={() => setPaperFormatDropdownOpen(!paperFormatDropdownOpen)}
                  className={`px-3 h-8 border-[length:var(--border-width)] border-theme-border rounded-button text-xs font-body transition-colors flex items-center gap-1 ${
                    paperFormat !== 'none'
                      ? 'bg-theme-accent text-theme-paper'
                      : 'bg-theme-background text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
                  }`}
                >
                  Paper Format{paperFormat !== 'none' ? `: ${paperFormat === 'a4' ? 'A4' : 'Letter'} ${isLandscape ? 'Landscape' : 'Portrait'}` : ''}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
              </Tooltip>
              {paperFormatDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 bg-theme-paper border-[length:var(--border-width)] border-theme-border rounded-theme shadow-theme z-50 overflow-hidden min-w-[140px]">
                  {([
                    ['none', false, 'None'],
                    ['a4', false, 'A4 Portrait'],
                    ['a4', true, 'A4 Landscape'],
                    ['letter', false, 'Letter Portrait'],
                    ['letter', true, 'Letter Landscape'],
                  ] as [PaperFormat, boolean, string][]).map(([fmt, land, label]) => {
                    const isActive = paperFormat === fmt && (fmt === 'none' || isLandscape === land);
                    return (
                      <button
                        key={label}
                        onClick={() => {
                          handlePaperFormatChange(fmt, land);
                          setPaperFormatDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-sm text-left font-body transition-colors whitespace-nowrap ${
                          isActive
                            ? 'bg-theme-accent text-theme-paper'
                            : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Show in Edit Mode toggle */}
            <Tooltip content="Also show the print area rectangle in edit mode" placement="below">
              <button
                onClick={() => setShowInEditMode(!showInEditMode)}
                className={`px-3 h-8 border-[length:var(--border-width)] border-theme-border rounded-button text-xs font-body transition-colors ${
                  showInEditMode
                    ? 'bg-theme-accent text-theme-paper'
                    : 'bg-theme-background text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
                }`}
              >
                Show in Edit Mode
              </button>
            </Tooltip>
          </div>
          
          {/* Spacer */}
          <div className="flex-1" />
          
          {/* Print button */}
          <button
            onClick={handlePrint}
            className="px-4 h-8 bg-blue-500 text-white border-[length:var(--border-width)] border-blue-600 rounded-button text-xs font-body hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print
          </button>
        </div>
      )}

      {/* Print Mode Mobile Menu Dropdown */}
      {printMenuOpen && mode === 'print' && (
        <div className="sm:hidden absolute top-12 left-2 bg-theme-paper border-[length:var(--border-width)] border-theme-border rounded-button shadow-theme z-40 overflow-hidden">
          <button
            onClick={() => {
              resetPrintSettings();
              selectCharacter(null);
              setPrintMenuOpen(false);
            }}
            className="w-full px-4 py-2.5 text-sm text-left font-body text-red-600 hover:bg-red-600 hover:text-white transition-colors whitespace-nowrap"
          >
            Exit
          </button>
          <div className="border-t border-theme-border" />
          <button
            onClick={() => {
              exitPrintMode('play');
              setPrintMenuOpen(false);
            }}
            className="w-full px-4 py-2.5 text-sm text-left font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors whitespace-nowrap"
          >
            Play Mode
          </button>
          <button
            onClick={() => {
              exitPrintMode('edit');
              setPrintMenuOpen(false);
            }}
            className="w-full px-4 py-2.5 text-sm text-left font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors whitespace-nowrap"
          >
            Edit Mode
          </button>
          <div className="border-t border-theme-border" />
          <button
            onClick={() => {
              setPrinterFriendly(!printerFriendly);
              setPrintMenuOpen(false);
            }}
            className={`w-full px-4 py-2.5 text-sm text-left font-body transition-colors whitespace-nowrap ${
              printerFriendly 
                ? 'bg-theme-accent text-theme-paper' 
                : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
            }`}
          >
            Printer Friendly Theme {printerFriendly ? '✓' : ''}
          </button>
          <button
            onClick={() => {
              setBordersDisabled(!bordersDisabled);
              setPrintMenuOpen(false);
            }}
            className={`w-full px-4 py-2.5 text-sm text-left font-body transition-colors whitespace-nowrap ${
              bordersDisabled 
                ? 'bg-theme-accent text-theme-paper' 
                : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
            }`}
          >
            No Borders {bordersDisabled ? '✓' : ''}
          </button>
          <button
            onClick={() => {
              setShadowsDisabled(!shadowsDisabled);
              setPrintMenuOpen(false);
            }}
            className={`w-full px-4 py-2.5 text-sm text-left font-body transition-colors whitespace-nowrap ${
              shadowsDisabled 
                ? 'bg-theme-accent text-theme-paper' 
                : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
            }`}
          >
            No Shadows {shadowsDisabled ? '✓' : ''}
          </button>
          <div className="border-t border-theme-border" />
          <div className="px-4 py-1.5 text-xs font-body text-theme-ink opacity-60">Paper Format</div>
          {([
            ['none', false, 'None'],
            ['a4', false, 'A4 Portrait'],
            ['a4', true, 'A4 Landscape'],
            ['letter', false, 'Letter Portrait'],
            ['letter', true, 'Letter Landscape'],
          ] as [PaperFormat, boolean, string][]).map(([fmt, land, label]) => {
            const isActive = paperFormat === fmt && (fmt === 'none' || isLandscape === land);
            return (
              <button
                key={label}
                onClick={() => {
                  handlePaperFormatChange(fmt, land);
                  setPrintMenuOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-sm text-left font-body transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-theme-accent text-theme-paper'
                    : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
                }`}
              >
                {label} {isActive ? '✓' : ''}
              </button>
            );
          })}
          <div className="border-t border-theme-border" />
          <button
            onClick={() => {
              setShowInEditMode(!showInEditMode);
              setPrintMenuOpen(false);
            }}
            className={`w-full px-4 py-2.5 text-sm text-left font-body transition-colors whitespace-nowrap ${
              showInEditMode
                ? 'bg-theme-accent text-theme-paper'
                : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
            }`}
          >
            Show in Edit Mode {showInEditMode ? '✓' : ''}
          </button>
        </div>
      )}

      {/* Compact header bar for grid/edit mode (hidden in print mode) */}
      {mode !== 'print' && (
      <div className="absolute top-0 left-0 right-0 bg-theme-paper border-b-[length:var(--border-width)] border-theme-border px-2 py-2 flex items-center gap-2 z-30 relative">
        {/* Menu button - only on narrow screens */}
        <button
          onClick={() => setGridMenuOpen(!gridMenuOpen)}
          className="lg:hidden w-8 h-8 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink shrink-0"
        >
          ☰
        </button>

        {/* Wide screen: inline buttons */}
        <div className="hidden lg:flex items-center gap-1 shrink-0">
          <Tooltip content="Exit to character select" placement="below">
            <button
              onClick={() => selectCharacter(null)}
              className="px-3 h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-red-500 text-xs font-body hover:bg-red-500 hover:text-white hover:border-red-700 transition-colors"
            >
              Exit
            </button>
          </Tooltip>
          <Tooltip content={mode === 'play' ? 'Switch to Edit Mode' : 'Switch to Play Mode'} placement="below">
            <button
              data-tutorial="edit-mode-button"
              onClick={() => {
                const newMode = mode === 'play' ? 'edit' : 'play';
                setMode(newMode);
                // If tutorial is on step 3 (welcome-sheet) and user clicked Edit Mode, advance
                if (tutorialStep === 3 && TUTORIAL_STEPS[3]?.id === 'welcome-sheet' && newMode === 'edit') {
                  advanceTutorial();
                }
                // If tutorial is on step 23 (switch-to-play) and user clicked Play Mode, advance
                if (tutorialStep === 23 && TUTORIAL_STEPS[23]?.id === 'switch-to-play' && newMode === 'play') {
                  advanceTutorial();
                }
              }}
              className={`px-3 h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink text-xs font-body hover:bg-theme-accent hover:text-theme-paper transition-colors ${(tutorialStep === 3 && mode === 'play') || (tutorialStep === 23 && mode === 'edit') ? 'outline outline-4 outline-blue-500 outline-offset-2' : ''}`}
            >
              {mode === 'play' ? 'Edit Mode' : 'Play Mode'}
            </button>
          </Tooltip>
          <Tooltip content="Enter print mode to print your character sheet" placement="below">
            <button
              onClick={enterPrintMode}
              className="px-3 h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink text-xs font-body hover:bg-theme-accent hover:text-theme-paper transition-colors"
            >
              Print Mode
            </button>
          </Tooltip>
          {mode === 'play' && (
            <Tooltip content="Switch to single-column Vertical View" placement="below">
              <button
                onClick={() => setMode('vertical')}
                className="px-3 h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink text-xs font-body hover:bg-theme-accent hover:text-theme-paper transition-colors"
              >
                Vertical View
              </button>
            </Tooltip>
          )}
          {mode === 'play' && (
            <Tooltip content="Open event timeline" placement="below">
              <button
                onClick={toggleTimeline}
                className={`px-3 h-8 border-[length:var(--border-width)] border-theme-border rounded-button text-xs font-body transition-colors ${timelineIsOpen ? 'bg-theme-accent text-theme-paper' : 'bg-theme-background text-theme-ink hover:bg-theme-accent hover:text-theme-paper'}`}
              >
                Timeline
              </button>
            </Tooltip>
          )}
          {mode === 'edit' && (
            <>
              <Tooltip content={sidebarCollapsed ? 'Open widget panel' : 'Close widget panel'} placement="below">
                <button
                  data-tutorial="add-widget-button"
                  onClick={() => {
                    const wasCollapsed = sidebarCollapsed;
                    setSidebarCollapsed(!sidebarCollapsed);
                    // If tutorial is on step 4 (add-widget) and user clicked Add Widget, advance
                    if (tutorialStep === 4 && TUTORIAL_STEPS[4]?.id === 'add-widget' && wasCollapsed) {
                      advanceTutorial();
                    }
                  }}
                  className={`px-3 h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink text-xs font-body hover:bg-theme-accent hover:text-theme-paper transition-colors ${tutorialStep === 4 ? 'ring-4 ring-blue-500 ring-offset-2' : ''}`}
                >
                  {sidebarCollapsed ? 'Add Widget' : 'Hide Widgets'}
                </button>
              </Tooltip>
              <Tooltip content="Open theme editor" placement="below">
                <button
                  onClick={() => setThemeSidebarCollapsed(!themeSidebarCollapsed)}
                  className="px-3 h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink text-xs font-body hover:bg-theme-accent hover:text-theme-paper transition-colors"
                >
                  Change Theme
                </button>
              </Tooltip>
              <Tooltip content="Auto-arrange all widgets into a neat stack" placement="below">
                <button
                  onClick={() => setShowAutoStackConfirm(true)}
                  className="px-3 h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink text-xs font-body hover:bg-theme-accent hover:text-theme-paper transition-colors"
                >
                  Auto Stack
                </button>
              </Tooltip>
            </>
          )}
          {/* Undo/Redo buttons */}
          <Tooltip content="Undo (Ctrl+Z)" placement="below">
            <button
              onClick={undo}
              disabled={!canUndo}
              className={`w-8 h-8 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-xs font-body transition-colors ${
                canUndo 
                  ? 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper' 
                  : 'text-theme-muted opacity-50 cursor-not-allowed'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M3 7v6h6"/>
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
              </svg>
            </button>
          </Tooltip>
          <Tooltip content="Redo (Ctrl+Y)" placement="below">
            <button
              onClick={redo}
              disabled={!canRedo}
              className={`w-8 h-8 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-xs font-body transition-colors ${
                canRedo 
                  ? 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper' 
                  : 'text-theme-muted opacity-50 cursor-not-allowed'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M21 7v6h-6"/>
                <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
              </svg>
            </button>
          </Tooltip>
        </div>
        
        {/* Character name - stays in flow until 2xl breakpoint when there's room to center */}
        <div className="flex-1 min-w-0 2xl:absolute 2xl:left-1/2 2xl:top-1/2 2xl:-translate-x-1/2 2xl:-translate-y-1/2 2xl:max-w-[30%] 2xl:flex-none pointer-events-auto">
          {isEditingName ? (
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={() => {
                if (editedName.trim()) {
                  updateCharacterName(activeCharacter.id, editedName.trim());
                }
                setIsEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (editedName.trim()) {
                    updateCharacterName(activeCharacter.id, editedName.trim());
                  }
                  setIsEditingName(false);
                } else if (e.key === 'Escape') {
                  setIsEditingName(false);
                }
              }}
              autoFocus
              className="font-bold text-sm bg-transparent border-b-[length:var(--border-width)] border-theme-border outline-none w-full text-theme-ink font-heading 2xl:text-center"
            />
          ) : (
            <h1 
              className={`font-bold text-sm text-theme-ink font-heading truncate 2xl:text-center ${mode === 'edit' ? 'cursor-pointer' : ''}`}
              onClick={() => {
                if (mode === 'edit') {
                  setEditedName(activeCharacter.name);
                  setIsEditingName(true);
                }
              }}
            >
              {activeCharacter.name}
            </h1>
          )}
        </div>
        
        {/* Spacer to push right-side elements - only needed when character name is centered */}
        <div className="hidden 2xl:block 2xl:flex-1 2xl:min-w-0"></div>
        
        {/* Sheet selector */}
        <div className="relative shrink-0">
          <Tooltip content="Switch sheet" placement="left">
            <button
              onClick={() => setSheetDropdownOpen(!sheetDropdownOpen)}
              className="h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-theme px-3 flex items-center gap-1 text-xs font-body"
            >
              <span className="text-theme-ink truncate max-w-[60px]">
                {activeCharacter.sheets.find(s => s.id === activeCharacter.activeSheetId)?.name || 'Sheet'}
              </span>
              <span className="text-theme-muted">▼</span>
            </button>
          </Tooltip>
        </div>
        
        {/* Fit button */}
        <Tooltip content="Fit all widgets on screen" placement="left">
          <button
            data-tutorial="fit-button"
            onClick={() => {
              handleFitAllWidgets();
              // If tutorial is on step 12 (fit-button), advance
              if (tutorialStep === 12 && TUTORIAL_STEPS[12]?.id === 'fit-button') {
                advanceTutorial();
              }
            }}
            className={`px-3 h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border text-xs font-body flex items-center justify-center rounded-button text-theme-ink shrink-0 ${tutorialStep === 12 ? 'outline outline-4 outline-blue-500 outline-offset-2' : ''}`}
          >
            Fit
          </button>
        </Tooltip>
        
        {/* Undo/Redo buttons - visible on mobile and desktop */}
        <div className="flex items-center gap-1 shrink-0 lg:hidden">
          <Tooltip content="Undo" placement="below">
            <button
              onClick={undo}
              disabled={!canUndo}
              className={`w-8 h-8 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-xs font-body transition-colors ${
                canUndo 
                  ? 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper' 
                  : 'text-theme-muted opacity-50 cursor-not-allowed'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M3 7v6h6"/>
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
              </svg>
            </button>
          </Tooltip>
          <Tooltip content="Redo" placement="below">
            <button
              onClick={redo}
              disabled={!canRedo}
              className={`w-8 h-8 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-xs font-body transition-colors ${
                canRedo 
                  ? 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper' 
                  : 'text-theme-muted opacity-50 cursor-not-allowed'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M21 7v6h-6"/>
                <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
              </svg>
            </button>
          </Tooltip>
        </div>
      </div>
      )}

      {/* Grid menu dropdown - only on narrow screens */}
      {gridMenuOpen && mode !== 'print' && (
        <>
          <div 
            className="lg:hidden fixed inset-0 z-40" 
            onClick={() => setGridMenuOpen(false)}
          />
          <div className="lg:hidden absolute top-12 left-2 bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme overflow-hidden z-50 flex flex-col">
            {/* Mode toggle */}
            <button
              data-tutorial="edit-mode-button-mobile"
              onClick={() => {
                const newMode = mode === 'play' ? 'edit' : 'play';
                setMode(newMode);
                setGridMenuOpen(false);
                // If tutorial is on step 3 (welcome-sheet) and user clicked Edit Mode, advance
                if (tutorialStep === 3 && TUTORIAL_STEPS[3]?.id === 'welcome-sheet' && newMode === 'edit') {
                  advanceTutorial();
                }
                // If tutorial is on step 23 (switch-to-play) and user clicked Play Mode, advance
                if (tutorialStep === 23 && TUTORIAL_STEPS[23]?.id === 'switch-to-play' && newMode === 'play') {
                  advanceTutorial();
                }
              }}
              className={`px-4 py-2.5 text-sm text-left font-body transition-colors whitespace-nowrap ${(tutorialStep === 3 && mode === 'play') || (tutorialStep === 23 && mode === 'edit') ? 'bg-blue-500 text-white font-bold' : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'}`}
            >
              {mode === 'play' ? 'Edit Mode' : 'Play Mode'}
            </button>
            
            {/* Print Mode */}
            <button
              onClick={() => {
                enterPrintMode();
                setGridMenuOpen(false);
              }}
              className="px-4 py-2.5 text-sm text-left font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors whitespace-nowrap"
            >
              Print Mode
            </button>
            
            {/* Vertical View - only in play mode */}
            {mode === 'play' && (
              <button
                onClick={() => {
                  setMode('vertical');
                  setGridMenuOpen(false);
                }}
                className="px-4 py-2.5 text-sm text-left font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors whitespace-nowrap"
              >
                Vertical View
              </button>
            )}
            
            {/* Timeline - only in play mode */}
            {mode === 'play' && (
              <button
                onClick={() => {
                  toggleTimeline();
                  setGridMenuOpen(false);
                }}
                className="px-4 py-2.5 text-sm text-left font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors whitespace-nowrap"
              >
                Timeline
              </button>
            )}
            
            {/* Edit mode specific options */}
            {mode === 'edit' && (
              <>
                <button
                  data-tutorial="add-widget-button-mobile"
                  onClick={() => {
                    const wasCollapsed = sidebarCollapsed;
                    setSidebarCollapsed(!sidebarCollapsed);
                    setGridMenuOpen(false);
                    // If tutorial is on step 4 (add-widget) and user clicked Add Widget, advance
                    if (tutorialStep === 4 && TUTORIAL_STEPS[4]?.id === 'add-widget' && wasCollapsed) {
                      advanceTutorial();
                    }
                  }}
                  className={`px-4 py-2.5 text-sm text-left font-body transition-colors whitespace-nowrap ${tutorialStep === 4 ? 'bg-blue-500 text-white font-bold' : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'}`}
                >
                  {sidebarCollapsed ? 'Add Widget' : 'Hide Toolbox'}
                </button>
                <button
                  onClick={() => {
                    setThemeSidebarCollapsed(!themeSidebarCollapsed);
                    setGridMenuOpen(false);
                  }}
                  className="px-4 py-2.5 text-sm text-left font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors whitespace-nowrap"
                >
                  {themeSidebarCollapsed ? 'Change Theme' : 'Hide Themes'}
                </button>
                <button
                  onClick={() => {
                    setShowAutoStackConfirm(true);
                    setGridMenuOpen(false);
                  }}
                  className="px-4 py-2.5 text-sm text-left font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors whitespace-nowrap"
                >
                  Auto Stack
                </button>
              </>
            )}
            
            {/* Exit */}
            <button
              onClick={() => {
                selectCharacter(null);
                setGridMenuOpen(false);
              }}
              className="px-4 py-2.5 text-sm text-left font-body text-red-500 hover:bg-red-500 hover:text-white transition-colors border-t border-theme-border/50 whitespace-nowrap"
            >
              Exit to Menu
            </button>
          </div>
        </>
      )}

      {/* Sheet dropdown (shared with header) */}
      {sheetDropdownOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setSheetDropdownOpen(false)}
          />
          <div className="absolute top-12 right-2 bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme overflow-hidden z-50 min-w-[150px]">
            {activeCharacter.sheets.map((sheet) => (
              <div key={sheet.id} className="group relative">
                {editingSheetId === sheet.id ? (
                  <input
                    type="text"
                    value={editedSheetName}
                    onChange={(e) => setEditedSheetName(e.target.value)}
                    onBlur={() => {
                      if (editedSheetName.trim()) {
                        renameSheet(sheet.id, editedSheetName.trim());
                      }
                      setEditingSheetId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editedSheetName.trim()) {
                          renameSheet(sheet.id, editedSheetName.trim());
                        }
                        setEditingSheetId(null);
                      } else if (e.key === 'Escape') {
                        setEditingSheetId(null);
                      }
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-3 py-2 text-xs bg-transparent border-b border-theme-border outline-none text-theme-ink font-body"
                  />
                ) : (
                  <button
                    onClick={() => {
                      selectSheet(sheet.id);
                      setSheetDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-xs text-left font-body transition-colors flex items-center justify-between ${
                      sheet.id === activeCharacter.activeSheetId
                        ? 'bg-theme-accent text-theme-paper'
                        : 'text-theme-ink hover:bg-theme-accent/20'
                    }`}
                  >
                    <span>{sheet.name}</span>
                    {mode === 'edit' && (
                      <span className="flex items-center gap-1">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditedSheetName(sheet.name);
                            setEditingSheetId(sheet.id);
                          }}
                          className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                            sheet.id === activeCharacter.activeSheetId
                              ? 'bg-theme-paper/30 text-theme-paper hover:bg-theme-paper/50'
                              : 'bg-theme-accent/20 text-theme-ink hover:bg-theme-accent/40'
                          }`}
                        >
                          ✎
                        </span>
                        {activeCharacter.sheets.length > 1 && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSheetToDelete(sheet.id);
                            }}
                            className="w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                          >
                            ×
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                )}
              </div>
            ))}
            {mode === 'edit' && (
              <button
                onClick={() => {
                  createSheet(`Sheet ${activeCharacter.sheets.length + 1}`);
                  setSheetDropdownOpen(false);
                }}
                className="w-full px-3 py-2 text-xs text-theme-muted hover:text-theme-ink hover:bg-theme-accent/20 text-left font-body border-t border-theme-border/50 transition-colors"
              >
                + Add New Sheet
              </button>
            )}
          </div>
        </>
      )}

      {/* Delete Sheet Confirmation Modal */}
      {sheetToDelete && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50" 
            onClick={() => setSheetToDelete(null)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme p-4 z-50 min-w-[250px]">
            <h3 className="font-heading text-theme-ink font-bold mb-2">Delete Sheet?</h3>
            <p className="text-sm text-theme-muted font-body mb-4">
              Are you sure you want to delete "{activeCharacter.sheets.find(s => s.id === sheetToDelete)?.name}"? This will delete all widgets on this sheet.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setSheetToDelete(null)}
                className="px-3 py-1.5 text-sm font-body text-theme-ink hover:bg-theme-accent/20 rounded-button transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteSheet(sheetToDelete);
                  setSheetToDelete(null);
                  setSheetDropdownOpen(false);
                }}
                className="px-3 py-1.5 text-sm font-body bg-red-500 text-white hover:bg-red-600 rounded-button transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* Auto Stack Confirmation Modal */}
      {showAutoStackConfirm && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50" 
            onClick={() => setShowAutoStackConfirm(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme p-4 z-50 min-w-[250px]">
            <h3 className="font-heading text-theme-ink font-bold mb-2">Auto Stack?</h3>
            <p className="text-sm text-theme-muted font-body mb-4">
              This will automatically rearrange all widgets on this sheet. Your current layout will be replaced.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAutoStackConfirm(false)}
                className="px-3 py-1.5 text-sm font-body text-theme-ink hover:bg-theme-accent/20 rounded-button transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleAutoStack();
                  setShowAutoStackConfirm(false);
                }}
                className="px-3 py-1.5 text-sm font-body bg-theme-accent text-theme-paper hover:bg-theme-accent-hover rounded-button transition-colors"
              >
                Auto Stack
              </button>
            </div>
          </div>
        </>
      )}

      {/* Timeline Sidebar */}
      {mode === 'play' && <TimelineSidebar />}

      {/* Tutorial Bubble */}
      {tutorialActiveOnPage && <TutorialBubble darkMode={darkMode} />}
    </div>
  );
}




