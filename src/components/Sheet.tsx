import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { applyTheme, applyCustomTheme } from '../store/useThemeStore';
import { getCustomTheme } from '../store/useCustomThemeStore';
import { usePanZoom, useTouchCamera, useAutoStack, useFitWidgets } from '../hooks';
import Sidebar from './Sidebar';
import ThemeSidebar from './ThemeSidebar';
import DraggableWidget from './DraggableWidget';
import VerticalWidget from './VerticalWidget';
import AttachmentButtons from './AttachmentButtons';
import WidgetShadows from './WidgetShadows';
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
  const updateWidgetPosition = useStore((state) => state.updateWidgetPosition);
  const reorderWidget = useStore((state) => state.reorderWidget);
  const createSheet = useStore((state) => state.createSheet);
  const selectSheet = useStore((state) => state.selectSheet);
  const deleteSheet = useStore((state) => state.deleteSheet);
  const renameSheet = useStore((state) => state.renameSheet);
  const activeCharacter = characters.find(c => c.id === activeCharacterId);
  
  // Get widgets from active sheet
  const activeSheetWidgets = activeCharacter ? getActiveSheetWidgets(activeCharacter) : [];
  
  // Default sidebar collapsed on mobile (< 768px)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth < 768);
  const [themeSidebarCollapsed, setThemeSidebarCollapsed] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [editedSheetName, setEditedSheetName] = useState('');
  const [sheetDropdownOpen, setSheetDropdownOpen] = useState(false);
  const [sheetToDelete, setSheetToDelete] = useState<string | null>(null);
  
  // Mobile menu state for grid mode
  const [gridMenuOpen, setGridMenuOpen] = useState(false);
  
  // Vertical mode drag state
  const [verticalDragIndex, setVerticalDragIndex] = useState<number | null>(null);
  const [verticalDropIndex, setVerticalDropIndex] = useState<number | null>(null);

  // Pan/Zoom camera hook
  const [isPinching, setIsPinching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
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
    zoomIn,
    zoomOut,
  } = usePanZoom({
    editingWidgetId,
    mode,
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
  });

  // Auto-stack hook
  const { handleAutoStack } = useAutoStack({
    widgets: activeSheetWidgets,
    scale,
    updateWidgetPosition,
  });

  // Fit widgets hook
  const { handleFitAllWidgets } = useFitWidgets({
    widgets: activeSheetWidgets,
    scale,
    setScale,
    setPan,
  });

  // Fit all widgets when character sheet is opened
  useEffect(() => {
    if (activeCharacterId && activeSheetWidgets.length > 0) {
      // Small delay to ensure DOM elements are rendered
      const timer = setTimeout(() => {
        handleFitAllWidgets();
      }, 100);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCharacterId]);

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

  // Calculate left offset for buttons based on sidebar state - simpler on mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const buttonsLeftOffset = mode === 'edit' && !sidebarCollapsed && !isMobile ? 'md:left-72' : '';

  // Vertical mode menu state
  const [verticalMenuOpen, setVerticalMenuOpen] = useState(false);

  // Render Vertical Mode
  if (mode === 'vertical') {
    return (
      <div className="w-full h-screen overflow-hidden relative bg-theme-background flex flex-col">
        {/* Mobile: Single compact header bar */}
        <div className="sm:hidden bg-theme-paper border-b-[length:var(--border-width)] border-theme-border px-2 py-2 flex items-center gap-2 z-30 shrink-0">
          {/* Menu button */}
          <button
            onClick={() => setVerticalMenuOpen(!verticalMenuOpen)}
            className="w-8 h-8 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-theme text-theme-ink"
          >
            ☰
          </button>
          
          {/* Character name - truncated */}
          <h1 className="font-bold text-sm text-theme-ink font-heading truncate flex-1 min-w-0">
            {activeCharacter.name}
          </h1>
          
          {/* Sheet selector */}
          <div className="relative">
            <button
              onClick={() => setSheetDropdownOpen(!sheetDropdownOpen)}
              className="h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-theme px-2 flex items-center gap-1 text-xs"
            >
              <span className="text-theme-ink truncate max-w-[60px]">
                {activeCharacter.sheets.find(s => s.id === activeCharacter.activeSheetId)?.name || 'Sheet'}
              </span>
              <span className="text-theme-muted">▼</span>
            </button>
            
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
          <button
            onClick={() => {
              activeSheetWidgets.forEach(w => {
                localStorage.setItem(`ucs:vertical-collapsed:${w.id}`, 'false');
              });
              window.dispatchEvent(new CustomEvent('vertical-collapse-all', { detail: false }));
            }}
            className="w-8 h-8 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-theme text-theme-ink text-xs"
            title="Expand All"
          >
            ▼
          </button>
          <button
            onClick={() => {
              activeSheetWidgets.forEach(w => {
                localStorage.setItem(`ucs:vertical-collapsed:${w.id}`, 'true');
              });
              window.dispatchEvent(new CustomEvent('vertical-collapse-all', { detail: true }));
            }}
            className="w-8 h-8 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-theme text-theme-ink text-xs"
            title="Collapse All"
          >
            ▲
          </button>
        </div>

        {/* Mobile: Dropdown menu */}
        {verticalMenuOpen && (
          <>
            <div 
              className="sm:hidden fixed inset-0 z-40" 
              onClick={() => setVerticalMenuOpen(false)}
            />
            <div className="sm:hidden absolute top-12 left-2 bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme overflow-hidden z-50 flex flex-col">
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
                  selectCharacter(null);
                  setVerticalMenuOpen(false);
                }}
                className="px-4 py-2.5 text-sm text-left font-body text-red-500 hover:bg-red-500 hover:text-white transition-colors border-t border-theme-border/50 whitespace-nowrap"
              >
                Exit to Menu
              </button>
            </div>
          </>
        )}

        {/* Vertical Mode Container - scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-md mx-auto px-3 py-4 sm:py-16 pb-24">
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

        {/* Desktop: HUD for Vertical Mode - Fixed at top right */}
        <div className="hidden sm:flex absolute top-4 right-4 flex-col gap-2 pointer-events-auto z-30">
          <div className="bg-theme-paper border-[length:var(--border-width)] border-theme-border p-2 shadow-theme rounded-theme">
            <h1 className="font-bold text-xl text-theme-ink font-heading">
              {activeCharacter.name}
            </h1>
          </div>
          
          {/* Sheet Dropdown for Vertical Mode */}
          <div className="relative w-full">
            <button
              onClick={() => setSheetDropdownOpen(!sheetDropdownOpen)}
              className="w-full bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme px-3 py-1.5 flex items-center justify-between gap-2 hover:bg-theme-accent/10 transition-colors"
            >
              <span className="text-sm font-body text-theme-ink">
                {activeCharacter.sheets.find(s => s.id === activeCharacter.activeSheetId)?.name || 'Sheet'}
              </span>
              <span className="text-theme-muted text-xs">▼</span>
            </button>
            
            {sheetDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setSheetDropdownOpen(false)}
                />
                <div className="absolute top-full right-0 mt-1 bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme overflow-hidden z-50 min-w-[150px]">
                  {activeCharacter.sheets.map((sheet) => (
                    <button
                      key={sheet.id}
                      onClick={() => {
                        selectSheet(sheet.id);
                        setSheetDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-sm text-left font-body transition-colors ${
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

          {/* Expand/Collapse All Buttons */}
          <div className="flex gap-1">
            <button
              onClick={() => {
                activeSheetWidgets.forEach(w => {
                  localStorage.setItem(`ucs:vertical-collapsed:${w.id}`, 'false');
                });
                window.dispatchEvent(new CustomEvent('vertical-collapse-all', { detail: false }));
              }}
              className="flex-1 px-2 py-1.5 bg-theme-paper border-[length:var(--border-width)] border-theme-border font-bold text-xs shadow-theme hover:bg-theme-accent hover:text-theme-paper transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-theme text-theme-ink"
              title="Expand All"
            >
              ▼ Expand
            </button>
            <button
              onClick={() => {
                activeSheetWidgets.forEach(w => {
                  localStorage.setItem(`ucs:vertical-collapsed:${w.id}`, 'true');
                });
                window.dispatchEvent(new CustomEvent('vertical-collapse-all', { detail: true }));
              }}
              className="flex-1 px-2 py-1.5 bg-theme-paper border-[length:var(--border-width)] border-theme-border font-bold text-xs shadow-theme hover:bg-theme-accent hover:text-theme-paper transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-theme text-theme-ink"
              title="Collapse All"
            >
              ▲ Collapse
            </button>
          </div>
        </div>

        {/* Desktop: Top-left buttons for Vertical Mode */}
        <div className="hidden sm:flex absolute top-4 left-4 pointer-events-auto flex-col gap-2 z-30">
          {/* Exit to Menu */}
          <button
            onClick={() => selectCharacter(null)}
            className="px-4 py-2 bg-theme-paper border-[length:var(--border-width)] border-theme-border font-bold text-base shadow-theme hover:bg-red-500 hover:text-white hover:border-red-700 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-theme text-theme-ink"
          >
            Exit to Menu
          </button>

          {/* Edit Mode Button */}
          <button
            onClick={() => setMode('edit')}
            className="px-4 py-2 bg-theme-paper border-[length:var(--border-width)] border-theme-border font-bold text-base shadow-theme hover:bg-theme-accent hover:text-theme-paper transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-theme text-theme-ink"
          >
            Edit Mode
          </button>

          {/* Grid View Button - to go back to Play mode */}
          <button
            onClick={() => setMode('play')}
            className="px-4 py-2 bg-theme-accent text-theme-paper border-[length:var(--border-width)] border-theme-border font-bold text-base shadow-theme hover:opacity-90 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-theme"
          >
            Grid View
          </button>
        </div>
      </div>
    );
  }

  // Render Grid Mode (Edit or Play)
  return (
    <div ref={containerRef} className="w-full h-screen overflow-hidden relative bg-theme-background">
      {mode === 'edit' && (
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
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
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Transformed Content */}
        <div 
          className="absolute top-0 left-0 w-full h-full origin-top-left"
          style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` 
          }}
        >
          {/* Infinite Grid Background - hidden in play mode */}
          {mode !== 'play' && (
            <div 
              className="absolute -top-[50000px] -left-[50000px] w-[100000px] h-[100000px] pattern-grid opacity-20 pointer-events-none" 
            />
          )}

          {/* Shadow Layer - rendered below all widgets */}
          <WidgetShadows 
            widgets={activeSheetWidgets} 
            scale={scale}
          />

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
        </div>
      </div>

      {/* Mobile: Compact header bar for grid/edit mode */}
      <div className="sm:hidden absolute top-0 left-0 right-0 bg-theme-paper border-b-[length:var(--border-width)] border-theme-border px-2 py-2 flex items-center gap-2 z-30">
        {/* Menu button */}
        <button
          onClick={() => setGridMenuOpen(!gridMenuOpen)}
          className="w-8 h-8 flex items-center justify-center bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-theme text-theme-ink shrink-0"
        >
          ☰
        </button>
        
        {/* Character name - truncated, editable in edit mode */}
        <div className="flex-1 min-w-0">
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
              className="font-bold text-sm bg-transparent border-b-[length:var(--border-width)] border-theme-border outline-none w-full text-theme-ink font-heading"
            />
          ) : (
            <h1 
              className={`font-bold text-sm text-theme-ink font-heading truncate ${mode === 'edit' ? 'cursor-pointer' : ''}`}
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
        
        {/* Sheet selector */}
        <div className="relative shrink-0">
          <button
            onClick={() => setSheetDropdownOpen(!sheetDropdownOpen)}
            className="h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-theme px-2 flex items-center gap-1 text-xs"
          >
            <span className="text-theme-ink truncate max-w-[60px]">
              {activeCharacter.sheets.find(s => s.id === activeCharacter.activeSheetId)?.name || 'Sheet'}
            </span>
            <span className="text-theme-muted">▼</span>
          </button>
        </div>
        
        {/* Fit button only on mobile */}
        <button
          onClick={handleFitAllWidgets}
          className="px-2 h-8 bg-theme-background border-[length:var(--border-width)] border-theme-border font-bold text-xs flex items-center justify-center rounded-theme text-theme-ink shrink-0"
        >
          Fit
        </button>
      </div>

      {/* Mobile: Grid menu dropdown */}
      {gridMenuOpen && (
        <>
          <div 
            className="sm:hidden fixed inset-0 z-40" 
            onClick={() => setGridMenuOpen(false)}
          />
          <div className="sm:hidden absolute top-12 left-2 bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme overflow-hidden z-50 flex flex-col">
            {/* Mode toggle */}
            <button
              onClick={() => {
                setMode(mode === 'play' ? 'edit' : 'play');
                setGridMenuOpen(false);
              }}
              className="px-4 py-2.5 text-sm text-left font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors whitespace-nowrap"
            >
              {mode === 'play' ? 'Edit Mode' : 'Play Mode'}
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
            
            {/* Edit mode specific options */}
            {mode === 'edit' && (
              <>
                <button
                  onClick={() => {
                    setSidebarCollapsed(!sidebarCollapsed);
                    setGridMenuOpen(false);
                  }}
                  className="px-4 py-2.5 text-sm text-left font-body text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors whitespace-nowrap"
                >
                  {sidebarCollapsed ? 'Show Toolbox' : 'Hide Toolbox'}
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
                    handleAutoStack();
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

      {/* Mobile: Sheet dropdown (shared with header) */}
      {sheetDropdownOpen && (
        <>
          <div 
            className="sm:hidden fixed inset-0 z-40" 
            onClick={() => setSheetDropdownOpen(false)}
          />
          <div className="sm:hidden absolute top-12 right-2 bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme overflow-hidden z-50 min-w-[150px]">
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

      {/* Desktop: HUD / Info */}
      <div className="hidden sm:flex absolute top-4 right-4 flex-col gap-2 pointer-events-auto z-30">
        <div className={`bg-theme-paper border-[length:var(--border-width)] border-theme-border p-2 shadow-theme rounded-theme ${mode === 'edit' && !isEditingName ? 'cursor-pointer hover:opacity-90' : ''}`}>
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
              className="font-bold text-xl bg-transparent border-b-[length:var(--border-width)] border-theme-border outline-none w-full text-theme-ink font-heading"
            />
          ) : (
            <h1 
              className="font-bold text-xl text-theme-ink font-heading"
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
        
        {/* Sheet Dropdown */}
        <div className="relative w-full">
          <button
            onClick={() => setSheetDropdownOpen(!sheetDropdownOpen)}
            className="w-full bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme px-3 py-1.5 flex items-center justify-between gap-2 hover:bg-theme-accent/10 transition-colors"
          >
            <span className="text-sm font-body text-theme-ink">
              {activeCharacter.sheets.find(s => s.id === activeCharacter.activeSheetId)?.name || 'Sheet'}
            </span>
            <span className="text-theme-muted text-xs">▼</span>
          </button>
          
          {sheetDropdownOpen && (
            <>
              {/* Backdrop to close dropdown */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setSheetDropdownOpen(false)}
              />
              
              {/* Dropdown menu */}
              <div className="absolute top-full right-0 mt-1 bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme overflow-hidden z-50 min-w-[150px]">
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
                        className="w-full px-3 py-2 text-sm bg-transparent border-b border-theme-border outline-none text-theme-ink font-body"
                      />
                    ) : (
                      <button
                        onClick={() => {
                          selectSheet(sheet.id);
                          setSheetDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-sm text-left font-body transition-colors flex items-center justify-between ${
                          sheet.id === activeCharacter.activeSheetId
                            ? 'bg-theme-accent text-theme-paper'
                            : 'text-theme-ink hover:bg-theme-accent/20'
                        }`}
                      >
                        <span>{sheet.name}</span>
                        {/* Edit buttons - only show in edit mode */}
                        {mode === 'edit' && (
                          <span className="flex items-center gap-1">
                            {/* Rename button */}
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
                              title="Rename sheet"
                            >
                              ✎
                            </span>
                            {/* Delete button - only if more than 1 sheet */}
                            {activeCharacter.sheets.length > 1 && (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSheetToDelete(sheet.id);
                                }}
                                className="w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                                title="Delete sheet"
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
                {/* Add Sheet Button - only in edit mode */}
                {mode === 'edit' && (
                  <button
                    onClick={() => {
                      createSheet(`Sheet ${activeCharacter.sheets.length + 1}`);
                      setSheetDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-sm text-theme-muted hover:text-theme-ink hover:bg-theme-accent/20 text-left font-body border-t border-theme-border/50 transition-colors"
                  >
                    + Add New Sheet
                  </button>
                )}
              </div>
            </>
          )}
          
          {/* Delete Confirmation Modal */}
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
                    className="px-3 py-1.5 text-sm font-body text-theme-ink hover:bg-theme-accent/20 rounded-theme transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      deleteSheet(sheetToDelete);
                      setSheetToDelete(null);
                      setSheetDropdownOpen(false);
                    }}
                    className="px-3 py-1.5 text-sm font-body bg-red-500 text-white hover:bg-red-600 rounded-theme transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Zoom controls */}
        <div className="flex gap-1 justify-end">
          <button
            onClick={zoomIn}
            className="w-10 h-10 bg-theme-paper border-[length:var(--border-width)] border-theme-border font-bold text-xl shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center rounded-theme text-theme-ink"
          >
            +
          </button>
          <button
            onClick={zoomOut}
            className="w-10 h-10 bg-theme-paper border-[length:var(--border-width)] border-theme-border font-bold text-xl shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center rounded-theme text-theme-ink"
          >
            −
          </button>
          <button
            onClick={handleFitAllWidgets}
            className="px-2 h-10 bg-theme-paper border-[length:var(--border-width)] border-theme-border font-bold text-xs shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center rounded-theme text-theme-ink"
          >
            Fit
          </button>
        </div>
      </div>

      {/* Desktop: Top-left button group */}
      <div className={`hidden sm:flex absolute top-4 left-4 ${buttonsLeftOffset} pointer-events-auto transition-all duration-300 flex-col gap-2 z-30`}>
        {/* Exit to Menu Button */}
        <button
          onClick={() => selectCharacter(null)}
          className="px-4 py-2 bg-theme-paper border-[length:var(--border-width)] border-theme-border font-bold text-base shadow-theme hover:bg-red-500 hover:text-white hover:border-red-700 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-theme text-theme-ink"
        >
          Exit to Menu
        </button>

        {/* Mode Toggle Button */}
        <button
          onClick={() => setMode(mode === 'play' ? 'edit' : 'play')}
          className="px-4 py-2 bg-theme-paper border-[length:var(--border-width)] border-theme-border font-bold text-base shadow-theme hover:bg-theme-accent hover:text-theme-paper transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-theme text-theme-ink"
        >
          {mode === 'play' ? 'Edit Mode' : 'Play Mode'}
        </button>

        {/* Vertical View Button - only in play mode */}
        {mode === 'play' && (
          <button
            onClick={() => setMode('vertical')}
            className="px-4 py-2 bg-theme-paper border-[length:var(--border-width)] border-theme-border font-bold text-base shadow-theme hover:bg-theme-accent hover:text-theme-paper transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-theme text-theme-ink"
          >
            Vertical View
          </button>
        )}

        {/* Toolbox Toggle Button - only in edit mode */}
        {mode === 'edit' && (
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="px-4 py-2 bg-theme-paper border-[length:var(--border-width)] border-theme-border font-bold text-base shadow-theme hover:bg-theme-accent hover:text-theme-paper transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-theme text-theme-ink"
          >
            {sidebarCollapsed ? 'Show Toolbox' : 'Hide Toolbox'}
          </button>
        )}

        {/* Theme Toggle Button - only in edit mode */}
        {mode === 'edit' && (
          <button
            onClick={() => setThemeSidebarCollapsed(!themeSidebarCollapsed)}
            className="px-4 py-2 bg-theme-paper border-[length:var(--border-width)] border-theme-border font-bold text-base shadow-theme hover:bg-theme-accent hover:text-theme-paper transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-theme text-theme-ink"
          >
            {themeSidebarCollapsed ? 'Change Theme' : 'Hide Themes'}
          </button>
        )}

        {/* Auto Stack Button - only in edit mode */}
        {mode === 'edit' && (
          <button
            onClick={handleAutoStack}
            className="px-4 py-2 bg-theme-paper border-[length:var(--border-width)] border-theme-border font-bold text-base shadow-theme hover:bg-theme-accent hover:text-theme-paper transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-theme text-theme-ink"
          >
            Auto Stack
          </button>
        )}
      </div>
    </div>
  );
}
