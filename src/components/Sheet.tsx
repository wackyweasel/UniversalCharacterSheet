import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useUndoStore } from '../store/useUndoStore';
import { TEMPLATE_TUTORIAL_START_ID, THEME_TUTORIAL_START_ID, useTutorialStore, TUTORIAL_STEPS } from '../store/useTutorialStore';
import { applyTheme, applyCustomTheme, THEMES } from '../store/useThemeStore';
import { getCustomTheme } from '../store/useCustomThemeStore';
import { usePrintStore, getEffectiveAspectRatio } from '../store/usePrintStore';
import type { PaperFormat } from '../store/usePrintStore';
import { TUTORIAL_PRESET } from '../presets';
import { usePanZoom, useTouchCamera, useAutoStack, useFitWidgets, useWorkspaceNavigation } from '../hooks';

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
import ShareExportMenu from './ShareExportMenu';
import WorkspaceToggleGroup from './WorkspaceToggleGroup';
import { Tooltip } from './Tooltip';
import { MenuIcon, ChevronDownIcon, ChevronUpIcon, PencilIcon, XIcon, CheckIcon, ClockIcon, PlusIcon } from './icons';
import { useTimelineStore } from '../store/useTimelineStore';
import { WidgetType, Widget } from '../types';
import { useTelemetryStore } from '../store/useTelemetryStore';

// Helper to get active sheet widgets
function getActiveSheetWidgets(character: { sheets: { id: string; widgets: Widget[] }[]; activeSheetId: string }): Widget[] {
  const sheet = character.sheets.find(s => s.id === character.activeSheetId);
  return sheet?.widgets || [];
}

export default function Sheet() {
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const characters = useStore((state) => state.characters);
  const transientCharacterIds = useStore((state) => state.transientCharacterIds);
  const addWidget = useStore((state) => state.addWidget);
  const mode = useStore((state) => state.mode);
  const setMode = useStore((state) => state.setMode);
  const { workspace, playLayout, enterBuild, enterPlay, setPlayLayout } = useWorkspaceNavigation();
  const selectCharacter = useStore((state) => state.selectCharacter);
  const updateCharacterName = useStore((state) => state.updateCharacterName);
  const editingWidgetId = useStore((state) => state.editingWidgetId);
  const setSelectedWidgetId = useStore((state) => state.setSelectedWidgetId);
  const reorderWidget = useStore((state) => state.reorderWidget);
  const createSheet = useStore((state) => state.createSheet);
  const selectSheet = useStore((state) => state.selectSheet);
  const deleteSheet = useStore((state) => state.deleteSheet);
  const renameSheet = useStore((state) => state.renameSheet);
  const createTransientCharacterFromPreset = useStore((state) => state.createTransientCharacterFromPreset);
  const cleanupTransientCharacters = useStore((state) => state.cleanupTransientCharacters);
  const updateCharacterTheme = useStore((state) => state.updateCharacterTheme);
  const undo = useStore((state) => state.undo);
  const redo = useStore((state) => state.redo);
  const canUndo = useUndoStore((state) => activeCharacterId ? state.canUndo(activeCharacterId) : false);
  const canRedo = useUndoStore((state) => activeCharacterId ? state.canRedo(activeCharacterId) : false);
  const activeCharacter = characters.find(c => c.id === activeCharacterId);
  const recordTelemetryEvent = useTelemetryStore((state) => state.recordEvent);
  
  // Timeline state
  const timelineIsOpen = useTimelineStore((state) => state.isOpen);
  const toggleTimeline = useTimelineStore((state) => state.toggleOpen);
  const setTimelineOpen = useTimelineStore((state) => state.setOpen);
  const requestCharacterCreator = useStore((state) => state.requestCharacterCreator);

  useEffect(() => {
    if ((mode === 'edit' || mode === 'print') && timelineIsOpen) {
      setTimelineOpen(false);
    }
  }, [mode, setTimelineOpen, timelineIsOpen]);
  
  // Tutorial state
  const tutorialStep = useTutorialStore((state) => state.tutorialStep);
  const exitTutorial = useTutorialStore((state) => state.exitTutorial);
  const advanceTutorial = useTutorialStore((state) => state.advanceTutorial);
  const { isActive: tutorialActiveOnPage } = useTutorialForPage('sheet');
  const isCurrentTutorialStep = (id: string) => tutorialStep !== null && TUTORIAL_STEPS[tutorialStep]?.id === id;
  
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

  const recordSheetWorkflowEvent = useCallback((eventName: string, category: 'view' | 'print' | 'widget', metadata?: Record<string, string | number | boolean | null | undefined>) => {
    if (activeCharacterId && transientCharacterIds.includes(activeCharacterId)) return;

    recordTelemetryEvent({
      eventName,
      category,
      characterId: activeCharacterId,
      sheetId: activeCharacter?.activeSheetId,
      mode,
      source: 'sheet_toolbar',
      metadata,
    });
  }, [activeCharacter?.activeSheetId, activeCharacterId, mode, recordTelemetryEvent, transientCharacterIds]);
  
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
    viewLocked,
    toggleViewLock,
  } = usePanZoom({
    editingWidgetId,
    mode,
    characterId: activeCharacterId,
    onBackgroundClick: handleBackgroundInteraction,
  });

  // Touch camera controls hook
  const scaleRef = useRef(scale);
  const panRef = useRef(pan);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { panRef.current = pan; }, [pan]);
  
  const getScale = useCallback(() => scaleRef.current, []);
  const getPan = useCallback(() => panRef.current, []);
  const viewLockedRef = useRef(viewLocked);
  useEffect(() => { viewLockedRef.current = viewLocked; }, [viewLocked]);
  const getViewLocked = useCallback(() => viewLockedRef.current, []);
  
  const { isTouchPanning } = useTouchCamera({
    mode,
    onPanChange: setPan,
    onScaleChange: setScale,
    onPinchingChange: setIsPinching,
    getScale,
    getPan,
    onBackgroundTouch: handleBackgroundInteraction,
    isViewLocked: getViewLocked,
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

  const frameWidgetForTutorial = useCallback((widgetType: WidgetType, predicate?: (widget: Widget) => boolean) => {
    const targetWidget = activeSheetWidgets.find((widget) => widget.type === widgetType && (!predicate || predicate(widget)));
    if (!targetWidget) {
      handleFitAllWidgets();
      return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const newScale = viewportWidth < 640 ? 0.85 : 1;
    const targetX = targetWidget.x + (targetWidget.w || 200);
    const targetY = targetWidget.y;

    setScale(newScale);
    setPan({
      x: viewportWidth * 0.68 - targetX * newScale,
      y: viewportHeight * 0.38 - targetY * newScale,
    });
  }, [activeSheetWidgets, handleFitAllWidgets, setPan, setScale]);

  const handleToggleThemeSidebar = (closeGridMenu = false) => {
    const wasCollapsed = themeSidebarCollapsed;
    setThemeSidebarCollapsed((current) => !current);

    if (closeGridMenu) {
      setGridMenuOpen(false);
    }

    if (isCurrentTutorialStep(THEME_TUTORIAL_START_ID) && wasCollapsed) {
      advanceTutorial();
    }
  };

  const handleToggleWidgetSidebar = (closeGridMenu = false) => {
    const wasCollapsed = sidebarCollapsed;
    setSidebarCollapsed((current) => !current);

    if (closeGridMenu) {
      setGridMenuOpen(false);
    }

    if (
      wasCollapsed &&
      (isCurrentTutorialStep('add-widget') || isCurrentTutorialStep('templates-open-toolbox'))
    ) {
      advanceTutorial();
    }
  };

  const handleEnterBuildWorkspace = () => {
    enterBuild();
    if (tutorialStep === 3 && TUTORIAL_STEPS[3]?.id === 'welcome-sheet') {
      advanceTutorial();
    }
  };

  const handleEnterPlayWorkspace = () => {
    enterPlay();
    if (tutorialStep === 23 && TUTORIAL_STEPS[23]?.id === 'switch-to-play') {
      advanceTutorial();
    }
  };

  const handleSelectPlayLayout = (layout: 'canvas' | 'list') => {
    setPlayLayout(layout);
    if (layout === 'list' && isCurrentTutorialStep('various-vertical-view')) {
      advanceTutorial();
    }
  };

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
    recordSheetWorkflowEvent('print_triggered', 'print', {
      width: Math.round(printArea.width),
      height: Math.round(printArea.height),
      paperFormat,
      isLandscape,
    });
    
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
  }, [isLandscape, paperFormat, printArea, recordSheetWorkflowEvent]);

  // Handle tutorial step 22 -> 23: load tutorial preset
  useEffect(() => {
    if (tutorialStep === 23 && TUTORIAL_STEPS[23]?.id === 'switch-to-play') {
      // We just advanced to step 23, load the tutorial preset as a transient character.
      createTransientCharacterFromPreset(TUTORIAL_PRESET, 'Tutorial Character');
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

  // Specialty tutorials start from the same complete tutorial sheet and should open in edit mode.
  useEffect(() => {
    if (isCurrentTutorialStep(THEME_TUTORIAL_START_ID) || isCurrentTutorialStep(TEMPLATE_TUTORIAL_START_ID)) {
      setMode('edit');
      setSidebarCollapsed(true);
      setThemeSidebarCollapsed(true);
      setTimeout(() => {
        if (isCurrentTutorialStep(TEMPLATE_TUTORIAL_START_ID)) {
          frameWidgetForTutorial('FORM');
        } else {
          handleFitAllWidgets();
        }
      }, 200);
    }
  }, [tutorialStep, frameWidgetForTutorial, handleFitAllWidgets]);

  useEffect(() => {
    if (isCurrentTutorialStep('automation-open-number-display-menu')) {
      setMode('edit');
      setSidebarCollapsed(true);
      setThemeSidebarCollapsed(true);
      setTimeout(() => {
        frameWidgetForTutorial('NUMBER_DISPLAY');
      }, 200);
    }
  }, [tutorialStep, frameWidgetForTutorial]);

  useEffect(() => {
    if (isCurrentTutorialStep('automation-open-dice-menu')) {
      setMode('edit');
      setSidebarCollapsed(true);
      setThemeSidebarCollapsed(true);
      setTimeout(() => {
        frameWidgetForTutorial('DICE_ROLLER', (widget) => String(widget.data?.label || '').toLowerCase() === 'attack');
      }, 200);
    }
  }, [tutorialStep, frameWidgetForTutorial]);

  useEffect(() => {
    if (isCurrentTutorialStep('automation-roll-dice')) {
      setMode('play');
      setSidebarCollapsed(true);
      setThemeSidebarCollapsed(true);
      setTimeout(() => {
        frameWidgetForTutorial('DICE_ROLLER', (widget) => String(widget.data?.label || '').toLowerCase() === 'attack');
      }, 200);
    }
  }, [tutorialStep, frameWidgetForTutorial]);

  useEffect(() => {
    if (isCurrentTutorialStep('automation-change-strength')) {
      setMode('play');
      setSidebarCollapsed(true);
      setThemeSidebarCollapsed(true);
      setTimeout(() => {
        frameWidgetForTutorial('NUMBER_DISPLAY');
      }, 200);
    }
  }, [tutorialStep, frameWidgetForTutorial]);

  useEffect(() => {
    if (isCurrentTutorialStep('templates-share-template')) {
      setMode('edit');
      setThemeSidebarCollapsed(true);
      setSidebarCollapsed(false);
    }
  }, [tutorialStep]);

  useEffect(() => {
    if (isCurrentTutorialStep('various-print-mode')) {
      setMode('play');
      setSidebarCollapsed(true);
      setThemeSidebarCollapsed(true);
      setTimelineOpen(false);
      setSheetDropdownOpen(false);
    }

    if (isCurrentTutorialStep('various-vertical-view')) {
      if (mode === 'print') {
        exitPrintMode('play');
      } else if (mode !== 'play') {
        setMode('play');
      }
      setSheetDropdownOpen(false);
    }

    if (isCurrentTutorialStep('various-timeline') || isCurrentTutorialStep('various-timeline-overview')) {
      if (mode !== 'play') {
        setMode('play');
      }
      if (isCurrentTutorialStep('various-timeline-overview')) {
        setTimelineOpen(true);
      }
      setSheetDropdownOpen(false);
    }

    if (isCurrentTutorialStep('various-add-sheets') || isCurrentTutorialStep('various-add-sheet-button')) {
      if (mode !== 'edit') {
        setMode('edit');
      }
      setSidebarCollapsed(true);
      setThemeSidebarCollapsed(true);
      if (isCurrentTutorialStep('various-add-sheet-button')) {
        setSheetDropdownOpen(true);
      }
    }
  }, [tutorialStep, mode, exitPrintMode, setMode, setTimelineOpen]);

  // Auto-open mobile menu when tutorial step requires the Edit/Play Mode button or Add Widget (hidden on mobile)
  useEffect(() => {
    const isNarrowScreen = window.innerWidth < 640; // sm breakpoint
    const needsEditModeButton = 
      (tutorialStep === 3 && TUTORIAL_STEPS[3]?.id === 'welcome-sheet') ||
      (tutorialStep === 23 && TUTORIAL_STEPS[23]?.id === 'switch-to-play');
    const needsAddWidgetButton = tutorialStep === 4 && TUTORIAL_STEPS[4]?.id === 'add-widget';
    const needsThemeButton = isCurrentTutorialStep(THEME_TUTORIAL_START_ID);
    const needsTemplateToolboxButton = isCurrentTutorialStep('templates-open-toolbox');
    
    if (isNarrowScreen && (needsEditModeButton || needsAddWidgetButton || needsThemeButton || needsTemplateToolboxButton)) {
      setGridMenuOpen(true);
    }
  }, [tutorialStep]);

  useEffect(() => {
    const isNarrowToolbar = window.innerWidth < 1024;
    const needsGridMenuButton =
      isCurrentTutorialStep('various-print-mode') ||
      isCurrentTutorialStep('various-vertical-view') ||
      isCurrentTutorialStep('various-timeline');

    if (isNarrowToolbar && needsGridMenuButton) {
      setGridMenuOpen(true);
    }
  }, [tutorialStep]);

  // Fit all widgets when character sheet is opened or sheet is changed
  useEffect(() => {
    if (viewLocked) return;
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

  const handleVerticalDragEnd = (canceled = false) => {
    if (!canceled && verticalDragIndex !== null && verticalDropIndex !== null && verticalDragIndex !== verticalDropIndex) {
      const widget = activeSheetWidgets[verticalDragIndex];
      if (widget) {
        reorderWidget(widget.id, verticalDropIndex);
      }
    }
    setVerticalDragIndex(null);
    setVerticalDropIndex(null);
  };

  const handleExitToMenu = useCallback(() => {
    setTimelineOpen(false);
    cleanupTransientCharacters();
    selectCharacter(null);
    if (tutorialStep !== null) {
      exitTutorial();
    }
  }, [cleanupTransientCharacters, exitTutorial, selectCharacter, setTimelineOpen, tutorialStep]);

  const handleChoosePresetInstead = useCallback(() => {
    if (!activeCharacter) return;
    const characterIsBlank = activeCharacter.sheets.every((sheet) => sheet.widgets.length === 0);
    const canReplaceBlankCharacter = characterIsBlank && !transientCharacterIds.includes(activeCharacter.id);
    requestCharacterCreator({
      initialName: characterIsBlank ? activeCharacter.name : '',
      replaceCharacterId: canReplaceBlankCharacter ? activeCharacter.id : undefined,
    });
    handleExitToMenu();
  }, [activeCharacter, handleExitToMenu, requestCharacterCreator, transientCharacterIds]);

  if (!activeCharacter) return null;

  // Vertical mode menu state
  const [verticalMenuOpen, setVerticalMenuOpen] = useState(false);

  // Render list layout in either Play or Build.
  if (mode === 'vertical' || (mode === 'edit' && playLayout === 'list')) {
    return (
      <div className="w-full h-screen overflow-hidden relative bg-theme-background flex flex-col">
        {workspace === 'build' && (
          <>
            <Sidebar
              collapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
            <ThemeSidebar
              collapsed={themeSidebarCollapsed}
              onToggle={() => setThemeSidebarCollapsed(!themeSidebarCollapsed)}
            />
          </>
        )}

        {/* Compact header bar */}
        <div className="bg-theme-paper border-b-[length:var(--border-width)] border-theme-border px-2 py-2 flex items-center gap-2 z-30 shrink-0">
          {/* Mobile: Menu button */}
          <button
            onClick={() => setVerticalMenuOpen(!verticalMenuOpen)}
            aria-label="Menu"
            className="lg:hidden w-8 h-8 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors"
          >
            <MenuIcon className="w-4 h-4" />
          </button>
          
          {/* Desktop: Inline menu buttons */}
          <div className="hidden lg:flex items-center gap-1 shrink-0">
            <Tooltip content="Exit to character select" placement="below">
              <button
                onClick={handleExitToMenu}
                className="h-8 px-3 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-red-500 text-xs font-body hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
              >
                Exit
              </button>
            </Tooltip>
            <WorkspaceToggleGroup
              workspace={workspace}
              playLayout={playLayout}
              onBuild={handleEnterBuildWorkspace}
              onPlay={handleEnterPlayWorkspace}
              onCanvas={() => handleSelectPlayLayout('canvas')}
              onList={() => handleSelectPlayLayout('list')}
              listHighlighted={isCurrentTutorialStep('various-vertical-view')}
            />
            <div className="flex items-center gap-1 w-[224px] shrink-0">
              {workspace === 'play' ? (
                <Tooltip content="Open event timeline" placement="below">
                  <button
                    onClick={toggleTimeline}
                    aria-controls="timeline-panel"
                    aria-expanded={timelineIsOpen}
                    aria-pressed={timelineIsOpen}
                    className={`w-20 h-8 flex items-center justify-center border-[length:var(--border-width)] border-theme-border rounded-button text-xs font-body transition-colors ${timelineIsOpen ? 'bg-theme-accent text-theme-paper' : 'bg-theme-background text-theme-ink hover:bg-theme-accent hover:text-theme-paper'}`}
                  >
                    Timeline
                  </button>
                </Tooltip>
              ) : (
                <>
                  <Tooltip content={sidebarCollapsed ? 'Open widget panel' : 'Close widget panel'} placement="below">
                    <button
                      data-tutorial="add-widget-button"
                      onClick={() => handleToggleWidgetSidebar()}
                      className="w-[72px] h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink text-xs font-body hover:bg-theme-accent hover:text-theme-paper transition-colors"
                    >
                      {sidebarCollapsed ? 'Add' : 'Hide Add'}
                    </button>
                  </Tooltip>
                  <Tooltip content="Open theme editor" placement="below">
                    <button
                      data-tutorial="theme-button"
                      onClick={() => handleToggleThemeSidebar()}
                      className={`w-[72px] h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink text-xs font-body hover:bg-theme-accent hover:text-theme-paper transition-colors ${isCurrentTutorialStep(THEME_TUTORIAL_START_ID) ? 'ring-4 ring-blue-500 ring-offset-2' : ''}`}
                    >
                      Theme
                    </button>
                  </Tooltip>
                </>
              )}
            </div>
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
                className="h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-theme px-2 flex items-center gap-1 text-xs hover:bg-theme-accent/10 transition-colors"
              >
                <span className="text-theme-ink truncate max-w-[60px]">
                  {activeCharacter.sheets.find(s => s.id === activeCharacter.activeSheetId)?.name || 'Sheet'}
                </span>
                <ChevronDownIcon className="w-3 h-3 text-theme-muted" />
              </button>
            </Tooltip>

            {sheetDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setSheetDropdownOpen(false)}
                />
                <div className="absolute top-full right-0 mt-1 bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme overflow-hidden z-50 min-w-[120px] animate-dropdown-in">
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

          <div className="hidden lg:block">
            <ShareExportMenu character={activeCharacter} onPrintPreview={enterPrintMode} />
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
              aria-label="Expand all"
              className="w-8 h-8 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink text-xs hover:bg-theme-accent hover:text-theme-paper transition-colors"
            >
              <ChevronDownIcon className="w-4 h-4" />
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
              aria-label="Collapse all"
              className="w-8 h-8 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink text-xs hover:bg-theme-accent hover:text-theme-paper transition-colors"
            >
              <ChevronUpIcon className="w-4 h-4" />
            </button>
          </Tooltip>
          {/* Undo/Redo buttons for mobile */}
          <div className="lg:hidden flex items-center gap-1">
            {workspace === 'build' ? (
              <Tooltip content={sidebarCollapsed ? 'Add widget' : 'Hide widget panel'} placement="below">
                <button
                  type="button"
                  onClick={() => handleToggleWidgetSidebar()}
                  aria-label={sidebarCollapsed ? 'Add widget' : 'Hide widget panel'}
                  className="w-8 h-8 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </Tooltip>
            ) : (
              <Tooltip content="Timeline" placement="below">
                <button
                  onClick={toggleTimeline}
                  aria-label="Timeline"
                  aria-controls="timeline-panel"
                  aria-expanded={timelineIsOpen}
                  aria-pressed={timelineIsOpen}
                  className={`w-8 h-8 flex items-center justify-center border-[length:var(--border-width)] border-theme-border rounded-button text-xs font-body transition-colors ${timelineIsOpen ? 'bg-theme-accent text-theme-paper' : 'bg-theme-background text-theme-ink hover:bg-theme-accent hover:text-theme-paper'}`}
                >
                  <ClockIcon className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
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
          <div className="lg:hidden">
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setVerticalMenuOpen(false)}
            />
            <div className="absolute top-12 left-2 bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme overflow-hidden z-50 flex flex-col animate-dropdown-in">
              <button
                onClick={() => {
                  handleSelectPlayLayout('canvas');
                  setVerticalMenuOpen(false);
                }}
                className="px-4 py-2.5 text-sm text-left font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors whitespace-nowrap"
              >
                Use Canvas layout
              </button>
              <button
                onClick={() => {
                  if (workspace === 'build') {
                    handleEnterPlayWorkspace();
                  } else {
                    handleEnterBuildWorkspace();
                  }
                  setVerticalMenuOpen(false);
                }}
                className="px-4 py-2.5 text-sm text-left font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors whitespace-nowrap"
              >
                {workspace === 'build' ? 'Go to Play' : 'Go to Build'}
              </button>
              {workspace === 'build' ? (
                <>
                  <button
                    onClick={() => {
                      handleToggleWidgetSidebar();
                      setVerticalMenuOpen(false);
                    }}
                    className="px-4 py-2.5 text-sm text-left font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors whitespace-nowrap"
                  >
                    {sidebarCollapsed ? 'Add Widget' : 'Hide Toolbox'}
                  </button>
                  <button
                    data-tutorial="theme-button-mobile"
                    onClick={() => {
                      handleToggleThemeSidebar();
                      setVerticalMenuOpen(false);
                    }}
                    className={`px-4 py-2.5 text-sm text-left font-body transition-colors whitespace-nowrap ${isCurrentTutorialStep(THEME_TUTORIAL_START_ID) ? 'bg-blue-500 text-white font-bold' : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'}`}
                  >
                    {themeSidebarCollapsed ? 'Change Theme' : 'Hide Themes'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    toggleTimeline();
                    setVerticalMenuOpen(false);
                  }}
                  aria-controls="timeline-panel"
                  aria-expanded={timelineIsOpen}
                  className="px-4 py-2.5 text-sm text-left font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors whitespace-nowrap"
                >
                  Timeline
                </button>
              )}
              <button
                onClick={() => {
                  handleExitToMenu();
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
          <div className="max-w-2xl mx-auto px-3 sm:px-5 py-4 sm:py-6 pb-24">
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
                isBuildMode={workspace === 'build'}
              />
            ))}
            
            {activeSheetWidgets.length === 0 && (
              <div className="text-center text-theme-muted py-12">
                <p className="font-body">No widgets on this sheet</p>
                {workspace === 'build' ? (
                  <button
                    type="button"
                    onClick={() => handleToggleWidgetSidebar()}
                    className="widget-control widget-control--primary mt-3 px-3 py-1.5 text-sm"
                  >
                    Add widget
                  </button>
                ) : (
                  <p className="text-sm mt-2">Switch to Build to add widgets</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Timeline Sidebar */}
        {workspace === 'play' && <TimelineSidebar />}

        {/* Tutorial Bubble */}
        {tutorialActiveOnPage && <TutorialBubble darkMode={darkMode} />}
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
        className={`canvas-touch-surface absolute inset-0 ${isPanning || isTouchPanning.current ? 'cursor-grabbing' : 'cursor-default'} ${isPinching ? 'pinch-active' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onDragOver={mode !== 'print' ? handleDragOver : undefined}
        onDrop={mode !== 'print' ? handleDrop : undefined}
      >
        {mode === 'edit' && activeSheetWidgets.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-6 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-lg bg-theme-paper/95 backdrop-blur-sm border-[length:var(--border-width)] border-theme-border rounded-theme shadow-theme p-6 sm:p-8 text-center">
              <p className="font-body text-xs font-bold uppercase tracking-[0.18em] text-theme-accent">Build workspace</p>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-theme-ink mt-2">Build the sheet around the game</h2>
              <p className="font-body text-sm text-theme-muted mt-3 max-w-md mx-auto">
                Add only what you need now—stats, notes, resources, dice, or trackers. You can rearrange everything later.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(false)}
                  className="px-5 py-2.5 bg-theme-accent text-theme-paper rounded-button font-body font-bold text-sm hover:bg-theme-accent-hover transition-colors"
                >
                  Add your first widget
                </button>
                <button
                  type="button"
                  onClick={handleChoosePresetInstead}
                  className="px-5 py-2.5 bg-theme-background text-theme-ink border-[length:var(--border-width)] border-theme-border rounded-button font-body font-semibold text-sm hover:bg-theme-accent/10 transition-colors"
                >
                  {activeCharacter.sheets.every((sheet) => sheet.widgets.length === 0)
                    ? 'Choose a Preset instead'
                    : 'Create from a Preset'}
                </button>
              </div>
              <p className="font-body text-[11px] text-theme-muted mt-4">Build changes structure. Play keeps the sheet ready for use at the table.</p>
            </div>
          </div>
        )}

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
        <div data-tutorial="print-toolbar" className="absolute top-0 left-0 right-0 bg-theme-paper border-b-[length:var(--border-width)] border-theme-border px-2 py-2 flex items-center gap-2 z-30">
          {/* Menu button - only on narrow screens */}
          <button
            onClick={() => setPrintMenuOpen(!printMenuOpen)}
            aria-label="Menu"
            className="sm:hidden w-8 h-8 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink shrink-0 hover:bg-theme-accent hover:text-theme-paper transition-colors"
          >
            <MenuIcon className="w-4 h-4" />
          </button>

          {/* Wide screen: inline buttons */}
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            {/* Exit button */}
            <Tooltip content="Exit to character select" placement="below">
              <button
                onClick={() => {
                  resetPrintSettings();
                  handleExitToMenu();
                }}
                className="px-3 h-8 bg-theme-background border-[length:var(--border-width)] border-red-400 rounded-button text-red-500 text-xs font-body hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
              >
                Exit
              </button>
            </Tooltip>
            
            {/* Return to a primary workspace */}
            <Tooltip content="Exit print preview and return to Play" placement="below">
              <button
                onClick={() => exitPrintMode('play')}
                className="px-3 h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink text-xs font-body hover:bg-theme-accent hover:text-theme-paper transition-colors"
              >
                Play
              </button>
            </Tooltip>
            <Tooltip content="Exit print preview and return to Build" placement="below">
              <button
                onClick={() => exitPrintMode('edit')}
                className="px-3 h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink text-xs font-body hover:bg-theme-accent hover:text-theme-paper transition-colors"
              >
                Build
              </button>
            </Tooltip>

            <div className="w-px h-6 bg-theme-border" />

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
                <div className="absolute top-full left-0 mt-1 bg-theme-paper border-[length:var(--border-width)] border-theme-border rounded-theme shadow-theme z-50 overflow-hidden min-w-[140px] animate-dropdown-in">
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
        <div className="sm:hidden absolute top-12 left-2 bg-theme-paper border-[length:var(--border-width)] border-theme-border rounded-theme shadow-theme z-40 overflow-hidden animate-dropdown-in">
          <button
            onClick={() => {
              resetPrintSettings();
              handleExitToMenu();
              setPrintMenuOpen(false);
            }}
            className="w-full px-4 py-2.5 text-sm text-left font-body text-red-500 hover:bg-red-500 hover:text-white transition-colors whitespace-nowrap"
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
            className={`w-full px-4 py-2.5 text-sm text-left font-body transition-colors whitespace-nowrap flex items-center justify-between gap-3 ${
              printerFriendly 
                ? 'bg-theme-accent text-theme-paper' 
                : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
            }`}
          >
            Printer Friendly Theme {printerFriendly && <CheckIcon className="w-3.5 h-3.5 shrink-0" />}
          </button>
          <button
            onClick={() => {
              setBordersDisabled(!bordersDisabled);
              setPrintMenuOpen(false);
            }}
            className={`w-full px-4 py-2.5 text-sm text-left font-body transition-colors whitespace-nowrap flex items-center justify-between gap-3 ${
              bordersDisabled 
                ? 'bg-theme-accent text-theme-paper' 
                : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
            }`}
          >
            No Borders {bordersDisabled && <CheckIcon className="w-3.5 h-3.5 shrink-0" />}
          </button>
          <button
            onClick={() => {
              setShadowsDisabled(!shadowsDisabled);
              setPrintMenuOpen(false);
            }}
            className={`w-full px-4 py-2.5 text-sm text-left font-body transition-colors whitespace-nowrap flex items-center justify-between gap-3 ${
              shadowsDisabled 
                ? 'bg-theme-accent text-theme-paper' 
                : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
            }`}
          >
            No Shadows {shadowsDisabled && <CheckIcon className="w-3.5 h-3.5 shrink-0" />}
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
                className={`w-full px-4 py-2.5 text-sm text-left font-body transition-colors whitespace-nowrap flex items-center justify-between gap-3 ${
                  isActive
                    ? 'bg-theme-accent text-theme-paper'
                    : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
                }`}
              >
                {label} {isActive && <CheckIcon className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
          <div className="border-t border-theme-border" />
          <button
            onClick={() => {
              setShowInEditMode(!showInEditMode);
              setPrintMenuOpen(false);
            }}
            className={`w-full px-4 py-2.5 text-sm text-left font-body transition-colors whitespace-nowrap flex items-center justify-between gap-3 ${
              showInEditMode
                ? 'bg-theme-accent text-theme-paper'
                : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
            }`}
          >
            Show in Edit Mode {showInEditMode && <CheckIcon className="w-3.5 h-3.5 shrink-0" />}
          </button>
        </div>
      )}

      {/* Compact header bar for grid/edit mode (hidden in print mode) */}
      {mode !== 'print' && (
      <div className="absolute top-0 left-0 right-0 bg-theme-paper border-b-[length:var(--border-width)] border-theme-border px-2 py-2 flex items-center gap-2 z-30 relative">
        {/* Menu button - only on narrow screens */}
        <button
          onClick={() => setGridMenuOpen(!gridMenuOpen)}
          aria-label="Menu"
          className="lg:hidden w-8 h-8 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink shrink-0 hover:bg-theme-accent hover:text-theme-paper transition-colors"
        >
          <MenuIcon className="w-4 h-4" />
        </button>

        {/* Wide screen: inline buttons */}
        <div className="hidden lg:flex items-center gap-1 shrink-0">
          <Tooltip content="Exit to character select" placement="below">
            <button
              onClick={handleExitToMenu}
              className="px-3 h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-red-500 text-xs font-body hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
            >
              Exit
            </button>
          </Tooltip>
          <WorkspaceToggleGroup
            workspace={workspace}
            playLayout={playLayout}
            onBuild={handleEnterBuildWorkspace}
            onPlay={handleEnterPlayWorkspace}
            onCanvas={() => handleSelectPlayLayout('canvas')}
            onList={() => handleSelectPlayLayout('list')}
            workspaceHighlighted={(tutorialStep === 3 && mode === 'play') || (tutorialStep === 23 && mode === 'edit')}
            listHighlighted={isCurrentTutorialStep('various-vertical-view')}
          />
          <div className="flex items-center gap-1 w-[224px] shrink-0">
          {mode === 'play' && (
            <Tooltip content="Open event timeline" placement="below">
              <button
                data-tutorial="timeline-button"
                onClick={() => {
                  if (isCurrentTutorialStep('various-timeline')) {
                    setTimelineOpen(true);
                    advanceTutorial();
                  } else {
                    toggleTimeline();
                  }
                }}
                aria-controls="timeline-panel"
                aria-expanded={timelineIsOpen}
                aria-pressed={timelineIsOpen}
                className={`w-20 h-8 border-[length:var(--border-width)] border-theme-border rounded-button text-xs font-body transition-colors ${timelineIsOpen ? 'bg-theme-accent text-theme-paper' : 'bg-theme-background text-theme-ink hover:bg-theme-accent hover:text-theme-paper'} ${isCurrentTutorialStep('various-timeline') ? 'outline outline-4 outline-blue-500 outline-offset-2' : ''}`}
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
                  onClick={() => handleToggleWidgetSidebar()}
                  className={`w-[72px] h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink text-xs font-body hover:bg-theme-accent hover:text-theme-paper transition-colors ${isCurrentTutorialStep('add-widget') || isCurrentTutorialStep('templates-open-toolbox') ? 'ring-4 ring-blue-500 ring-offset-2' : ''}`}
                >
                  {sidebarCollapsed ? 'Add' : 'Hide Add'}
                </button>
              </Tooltip>
              <Tooltip content="Open theme editor" placement="below">
                <button
                  data-tutorial="theme-button"
                  onClick={() => handleToggleThemeSidebar()}
                  className={`w-[72px] h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink text-xs font-body hover:bg-theme-accent hover:text-theme-paper transition-colors ${isCurrentTutorialStep(THEME_TUTORIAL_START_ID) ? 'ring-4 ring-blue-500 ring-offset-2' : ''}`}
                >
                  Theme
                </button>
              </Tooltip>
              <Tooltip content="Auto-arrange all widgets into a neat stack" placement="below">
                <button
                  onClick={() => setShowAutoStackConfirm(true)}
                  className="w-[72px] h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-theme-ink text-xs font-body hover:bg-theme-accent hover:text-theme-paper transition-colors"
                >
                  Stack
                </button>
              </Tooltip>
            </>
          )}
          </div>
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
              data-tutorial="sheet-selector"
              onClick={() => {
                setSheetDropdownOpen(!sheetDropdownOpen);
                if (isCurrentTutorialStep('various-add-sheets')) {
                  advanceTutorial();
                }
              }}
              className={`h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-theme px-3 flex items-center gap-1 text-xs font-body hover:bg-theme-accent/10 transition-colors ${isCurrentTutorialStep('various-add-sheets') ? 'outline outline-4 outline-blue-500 outline-offset-2' : ''}`}
            >
              <span className="text-theme-ink truncate max-w-[60px]">
                {activeCharacter.sheets.find(s => s.id === activeCharacter.activeSheetId)?.name || 'Sheet'}
              </span>
              <ChevronDownIcon className="w-3 h-3 text-theme-muted" />
            </button>
          </Tooltip>
        </div>

        <div className="hidden sm:block">
          <ShareExportMenu character={activeCharacter} onPrintPreview={enterPrintMode} />
        </div>
        
        {/* Fit button */}
        <Tooltip content="Fit all widgets on screen" placement="left">
          <button
            data-tutorial="fit-button"
            onClick={() => {
              if (viewLocked) return;
              handleFitAllWidgets();
              recordSheetWorkflowEvent('view_fit_used', 'view', { widgetCount: activeSheetWidgets.length });
              // If tutorial is on step 12 (fit-button), advance
              if (tutorialStep === 12 && TUTORIAL_STEPS[12]?.id === 'fit-button') {
                advanceTutorial();
              }
            }}
            disabled={viewLocked}
            className={`px-3 h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border text-xs font-body flex items-center justify-center rounded-button text-theme-ink shrink-0 ${tutorialStep === 12 ? 'outline outline-4 outline-blue-500 outline-offset-2' : ''} ${viewLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Fit
          </button>
        </Tooltip>

        {/* Lock View button */}
        <Tooltip content={viewLocked ? 'Unlock view (allow pan & zoom)' : 'Lock view (disable pan & zoom)'} placement="left">
          <button
            onClick={() => {
              recordSheetWorkflowEvent('view_lock_changed', 'view', { locked: !viewLocked });
              toggleViewLock();
            }}
            aria-pressed={viewLocked}
            className={`w-8 h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border text-xs font-body flex items-center justify-center rounded-button shrink-0 ${
              viewLocked
                ? 'bg-theme-accent text-theme-paper'
                : 'text-theme-ink'
            }`}
          >
            {viewLocked ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0" />
              </svg>
            )}
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
          <div className="lg:hidden absolute top-12 left-2 bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme overflow-hidden z-50 flex flex-col animate-dropdown-in">
            {/* Workspace toggle */}
            <button
              data-tutorial="edit-mode-button-mobile"
              onClick={() => {
                const newMode = workspace === 'build' ? 'play' : 'edit';
                if (newMode === 'edit') {
                  enterBuild();
                } else {
                  enterPlay();
                }
                setGridMenuOpen(false);
                // Preserve tutorial transitions while exposing Build/Play terminology.
                if (tutorialStep === 3 && TUTORIAL_STEPS[3]?.id === 'welcome-sheet' && newMode === 'edit') {
                  advanceTutorial();
                }
                if (tutorialStep === 23 && TUTORIAL_STEPS[23]?.id === 'switch-to-play' && newMode === 'play') {
                  advanceTutorial();
                }
              }}
              className={`px-4 py-2.5 text-sm text-left font-body transition-colors whitespace-nowrap ${(tutorialStep === 3 && mode === 'play') || (tutorialStep === 23 && mode === 'edit') ? 'bg-blue-500 text-white font-bold' : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'}`}
            >
              {workspace === 'build' ? 'Go to Play' : 'Go to Build'}
            </button>
            
            {/* Print Mode */}
            <button
              onClick={() => {
                enterPrintMode();
                if (isCurrentTutorialStep('various-print-mode')) {
                  advanceTutorial();
                }
                setGridMenuOpen(false);
              }}
              data-tutorial="print-mode-button-mobile"
              className={`px-4 py-2.5 text-sm text-left font-body transition-colors whitespace-nowrap ${isCurrentTutorialStep('various-print-mode') ? 'bg-blue-500 text-white font-bold' : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'}`}
            >
              Print Preview
            </button>
            
            {/* List layout */}
            {playLayout === 'canvas' && (
              <button
                onClick={() => {
                  setPlayLayout('list');
                  if (isCurrentTutorialStep('various-vertical-view')) {
                    advanceTutorial();
                  }
                  setGridMenuOpen(false);
                }}
                data-tutorial="vertical-view-button-mobile"
                className={`px-4 py-2.5 text-sm text-left font-body transition-colors whitespace-nowrap ${isCurrentTutorialStep('various-vertical-view') ? 'bg-blue-500 text-white font-bold' : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'}`}
              >
                Use List layout
              </button>
            )}
            
            {/* Timeline - only in play mode */}
            {workspace === 'play' && (
              <button
                onClick={() => {
                  if (isCurrentTutorialStep('various-timeline')) {
                    setTimelineOpen(true);
                    advanceTutorial();
                  } else {
                    toggleTimeline();
                  }
                  setGridMenuOpen(false);
                }}
                data-tutorial="timeline-button-mobile"
                aria-controls="timeline-panel"
                aria-expanded={timelineIsOpen}
                className={`px-4 py-2.5 text-sm text-left font-body transition-colors whitespace-nowrap ${isCurrentTutorialStep('various-timeline') ? 'bg-blue-500 text-white font-bold' : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'}`}
              >
                Timeline
              </button>
            )}
            
            {/* Build-specific options */}
            {workspace === 'build' && (
              <>
                <button
                  data-tutorial="add-widget-button-mobile"
                  onClick={() => handleToggleWidgetSidebar(true)}
                  className={`px-4 py-2.5 text-sm text-left font-body transition-colors whitespace-nowrap ${isCurrentTutorialStep('add-widget') || isCurrentTutorialStep('templates-open-toolbox') ? 'bg-blue-500 text-white font-bold' : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'}`}
                >
                  {sidebarCollapsed ? 'Add Widget' : 'Hide Toolbox'}
                </button>
                <button
                  data-tutorial="theme-button-mobile"
                  onClick={() => {
                    handleToggleThemeSidebar(true);
                  }}
                  className={`px-4 py-2.5 text-sm text-left font-body transition-colors whitespace-nowrap ${isCurrentTutorialStep(THEME_TUTORIAL_START_ID) ? 'bg-blue-500 text-white font-bold' : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'}`}
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
                handleExitToMenu();
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
          <div className="absolute top-12 right-2 bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme overflow-hidden z-50 min-w-[150px] animate-dropdown-in">
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
                          className={`w-5 h-5 rounded-full text-xs flex items-center justify-center transition-colors ${
                            sheet.id === activeCharacter.activeSheetId
                              ? 'bg-theme-paper/30 text-theme-paper hover:bg-theme-paper/50'
                              : 'bg-theme-accent/20 text-theme-ink hover:bg-theme-accent/40'
                          }`}
                        >
                          <PencilIcon className="w-3 h-3" />
                        </span>
                        {activeCharacter.sheets.length > 1 && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSheetToDelete(sheet.id);
                            }}
                            className="w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition-colors"
                          >
                            <XIcon className="w-3 h-3" />
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
                  if (isCurrentTutorialStep('various-add-sheet-button')) {
                    advanceTutorial();
                  }
                  setSheetDropdownOpen(false);
                }}
                data-tutorial="add-sheet-button"
                className={`w-full px-3 py-2 text-xs text-left font-body border-t border-theme-border/50 transition-colors ${isCurrentTutorialStep('various-add-sheet-button') ? 'bg-blue-500 text-white font-bold' : 'text-theme-muted hover:text-theme-ink hover:bg-theme-accent/20'}`}
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
            className="fixed inset-0 bg-black/50 z-50 animate-fade-in" 
            onClick={() => setSheetToDelete(null)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme p-4 z-50 min-w-[250px] animate-fade-in">
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
            className="fixed inset-0 bg-black/50 z-50 animate-fade-in" 
            onClick={() => setShowAutoStackConfirm(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme p-4 z-50 min-w-[250px] animate-fade-in">
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
                  recordSheetWorkflowEvent('widgets_auto_stacked', 'widget', { widgetCount: activeSheetWidgets.length });
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




