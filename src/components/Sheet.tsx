import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { applyTheme, applyCustomTheme } from '../store/useThemeStore';
import { getCustomTheme } from '../store/useCustomThemeStore';
import Sidebar from './Sidebar';
import ThemeSidebar from './ThemeSidebar';
import DraggableWidget from './DraggableWidget';
import { WidgetType } from '../types';

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
  const activeCharacter = characters.find(c => c.id === activeCharacterId);
  // Default sidebar collapsed on mobile (< 768px)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth < 768);
  const [themeSidebarCollapsed, setThemeSidebarCollapsed] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  // Auto-stack function that measures actual DOM widget sizes
  const handleAutoStack = () => {
    if (!activeCharacter || activeCharacter.widgets.length === 0) return;

    const GRID_SIZE = 20;
    const GAP = 20;

    // Get all widget DOM elements and measure their actual sizes
    const widgetElements = document.querySelectorAll('.react-draggable[data-widget-id]');
    const widgetSizes: { id: string; w: number; h: number }[] = [];

    widgetElements.forEach((el) => {
      const id = el.getAttribute('data-widget-id');
      if (id) {
        const rect = el.getBoundingClientRect();
        // Account for current scale
        widgetSizes.push({
          id,
          w: Math.ceil(rect.width / scale / GRID_SIZE) * GRID_SIZE,
          h: Math.ceil(rect.height / scale / GRID_SIZE) * GRID_SIZE,
        });
      }
    });

    // If we couldn't measure any widgets, fall back to stored sizes
    const widgets = activeCharacter.widgets.map(w => {
      const measured = widgetSizes.find(s => s.id === w.id);
      return {
        id: w.id,
        x: w.x,  // Keep original position for sorting
        y: w.y,
        w: measured ? measured.w + GAP : (w.w || 200) + GAP,
        h: measured ? measured.h + GAP : (w.h || 120) + GAP,
      };
    });

    // Calculate container width based on total widget area
    const totalArea = widgets.reduce((sum, w) => sum + w.w * w.h, 0);
    const CONTAINER_WIDTH = Math.max(800, Math.ceil(Math.sqrt(totalArea * 1.5) / GRID_SIZE) * GRID_SIZE);

    // Sort by original position: top-to-bottom, left-to-right (preserves relative layout)
    const sortedWidgets = [...widgets].sort((a, b) => {
      // Primary sort by Y (row), secondary by X (column)
      // Use a threshold to group widgets in the same "row" together
      const ROW_THRESHOLD = 50;
      const rowA = Math.floor(a.y / ROW_THRESHOLD);
      const rowB = Math.floor(b.y / ROW_THRESHOLD);
      if (rowA !== rowB) return rowA - rowB;
      return a.x - b.x;
    });

    // MaxRects bin packing algorithm
    interface Rect { x: number; y: number; w: number; h: number; }
    let freeRects: Rect[] = [{ x: 0, y: 0, w: CONTAINER_WIDTH, h: 100000 }];
    const placed: { id: string; x: number; y: number }[] = [];

    const findBestPosition = (width: number, height: number): { x: number; y: number } | null => {
      let bestScore = Infinity;
      let bestX = 0;
      let bestY = 0;
      let found = false;

      for (const rect of freeRects) {
        if (width <= rect.w && height <= rect.h) {
          const leftoverH = rect.w - width;
          const leftoverV = rect.h - height;
          const shortSide = Math.min(leftoverH, leftoverV);
          const score = rect.y * 10000 + shortSide;

          if (score < bestScore) {
            bestScore = score;
            bestX = rect.x;
            bestY = rect.y;
            found = true;
          }
        }
      }

      return found ? { x: bestX, y: bestY } : null;
    };

    const splitFreeRects = (px: number, py: number, pw: number, ph: number) => {
      const newFreeRects: Rect[] = [];

      for (const rect of freeRects) {
        // No intersection - keep as is
        if (px >= rect.x + rect.w || px + pw <= rect.x ||
            py >= rect.y + rect.h || py + ph <= rect.y) {
          newFreeRects.push(rect);
          continue;
        }

        // Left part
        if (px > rect.x) {
          newFreeRects.push({ x: rect.x, y: rect.y, w: px - rect.x, h: rect.h });
        }
        // Right part
        if (px + pw < rect.x + rect.w) {
          newFreeRects.push({ x: px + pw, y: rect.y, w: rect.x + rect.w - (px + pw), h: rect.h });
        }
        // Top part
        if (py > rect.y) {
          newFreeRects.push({ x: rect.x, y: rect.y, w: rect.w, h: py - rect.y });
        }
        // Bottom part
        if (py + ph < rect.y + rect.h) {
          newFreeRects.push({ x: rect.x, y: py + ph, w: rect.w, h: rect.y + rect.h - (py + ph) });
        }
      }

      // Remove rects contained in others
      freeRects = newFreeRects.filter((a, i) => {
        for (let j = 0; j < newFreeRects.length; j++) {
          if (i === j) continue;
          const b = newFreeRects[j];
          if (a.x >= b.x && a.y >= b.y &&
              a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h) {
            return false;
          }
        }
        return true;
      });
    };

    // Place each widget
    for (const widget of sortedWidgets) {
      const pos = findBestPosition(widget.w, widget.h);

      if (pos) {
        const snapX = Math.round(pos.x / GRID_SIZE) * GRID_SIZE;
        const snapY = Math.round(pos.y / GRID_SIZE) * GRID_SIZE;
        placed.push({ id: widget.id, x: snapX, y: snapY });
        splitFreeRects(snapX, snapY, widget.w, widget.h);
      } else {
        // Fallback: place below all others
        const maxY = placed.reduce((max, p) => {
          const w = widgets.find(wg => wg.id === p.id);
          return Math.max(max, p.y + (w?.h || 120));
        }, 0);
        placed.push({ id: widget.id, x: 0, y: maxY });
        splitFreeRects(0, maxY, widget.w, widget.h);
      }
    }

    // Update all widget positions
    for (const p of placed) {
      updateWidgetPosition(p.id, p.x, p.y);
    }
  };

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  
  // Touch pinch zoom state
  const lastTouchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);

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

  const handleMouseDown = (e: React.MouseEvent) => {
    // Disable panning when editing a widget
    if (editingWidgetId) return;
    
    // Ignore if clicking on a widget (unless it's the background of the widget and we want to allow panning through it? No, usually widgets block panning)
    if ((e.target as HTMLElement).closest('.react-draggable')) return;

    // In play mode: Left Click (0) to pan
    // In edit mode: Middle Click (1) to pan
    if (mode === 'play') {
      if (e.button === 0) {
        e.preventDefault();
        setIsPanning(true);
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    } else {
      // Edit mode - left click and middle click for panning
      if (e.button === 0 || e.button === 1) {
        e.preventDefault();
        setIsPanning(true);
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Calculate distance between two touch points
  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Calculate center point between two touches
  const getTouchCenter = (touches: React.TouchList) => {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  };

  // Touch event handlers for mobile panning and pinch zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    // Disable touch interactions when editing a widget
    if (editingWidgetId) return;
    
    // Ignore if touching a widget
    if ((e.target as HTMLElement).closest('.react-draggable')) return;
    
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsPanning(true);
      lastMousePos.current = { x: touch.clientX, y: touch.clientY };
      lastTouchDistance.current = null;
      lastTouchCenter.current = null;
    } else if (e.touches.length === 2) {
      // Start pinch zoom
      e.preventDefault();
      setIsPanning(false);
      lastTouchDistance.current = getTouchDistance(e.touches);
      lastTouchCenter.current = getTouchCenter(e.touches);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isPanning) {
      const touch = e.touches[0];
      const dx = touch.clientX - lastMousePos.current.x;
      const dy = touch.clientY - lastMousePos.current.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMousePos.current = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2 && lastTouchDistance.current !== null && lastTouchCenter.current !== null) {
      e.preventDefault();
      
      const newDistance = getTouchDistance(e.touches);
      const newCenter = getTouchCenter(e.touches);
      
      // Calculate zoom
      const zoomFactor = newDistance / lastTouchDistance.current;
      const newScale = Math.min(Math.max(scale * zoomFactor, 0.1), 5);
      
      // Calculate pan to zoom towards center point
      const canvasX = (newCenter.x - pan.x) / scale;
      const canvasY = (newCenter.y - pan.y) / scale;
      
      const newPanX = newCenter.x - canvasX * newScale;
      const newPanY = newCenter.y - canvasY * newScale;
      
      // Also handle pan movement during pinch
      const panDx = newCenter.x - lastTouchCenter.current.x;
      const panDy = newCenter.y - lastTouchCenter.current.y;
      
      setScale(newScale);
      setPan({ x: newPanX + panDx, y: newPanY + panDy });
      
      lastTouchDistance.current = newDistance;
      lastTouchCenter.current = newCenter;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsPanning(false);
      lastTouchDistance.current = null;
      lastTouchCenter.current = null;
    } else if (e.touches.length === 1) {
      // Transition from pinch to single-finger pan
      const touch = e.touches[0];
      setIsPanning(true);
      lastMousePos.current = { x: touch.clientX, y: touch.clientY };
      lastTouchDistance.current = null;
      lastTouchCenter.current = null;
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Disable zoom when editing a widget
    if (editingWidgetId) return;
    
    // Zoom with scroll wheel relative to mouse cursor
    const zoomFactor = Math.exp(-e.deltaY * 0.001);
    const newScale = Math.min(Math.max(scale * zoomFactor, 0.1), 5);
    
    // Get mouse position relative to the viewport
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    // Calculate the point in canvas space that the mouse is over
    // Before zoom: canvasPoint = (mousePos - pan) / scale
    const canvasX = (mouseX - pan.x) / scale;
    const canvasY = (mouseY - pan.y) / scale;
    
    // After zoom, we want the same canvas point to be under the mouse
    // mousePos = canvasPoint * newScale + newPan
    // newPan = mousePos - canvasPoint * newScale
    const newPanX = mouseX - canvasX * newScale;
    const newPanY = mouseY - canvasY * newScale;
    
    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('widgetType') as WidgetType;
    if (type) {
      // Calculate position relative to the canvas transform
      // The canvas transform is: translate(pan.x, pan.y) scale(scale)
      // So screen coordinate (clientX, clientY) maps to:
      // x = (clientX - pan.x) / scale
      // y = (clientY - pan.y) / scale
      
      const rawX = (e.clientX - pan.x) / scale;
      const rawY = (e.clientY - pan.y) / scale;

      const GRID_SIZE = 20;
      const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;

      const x = snap(rawX);
      const y = snap(rawY);

      addWidget(type, x, y);
    }
  };

  // Global event listeners for mouse up and move to handle panning outside window
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsPanning(false);
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isPanning]);

  if (!activeCharacter) return null;

  // Calculate left offset for buttons based on sidebar state - simpler on mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const buttonsLeftOffset = mode === 'edit' && !sidebarCollapsed && !isMobile ? 'md:left-72' : '';

  return (
    <div className="w-full h-screen overflow-hidden relative bg-theme-background touch-none">
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
      
      {/* Canvas Container */}
      <div 
        className={`absolute inset-0 ${isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
          {/* Infinite Grid Background */}
          <div 
            className="absolute -top-[50000px] -left-[50000px] w-[100000px] h-[100000px] pattern-grid opacity-20 pointer-events-none" 
          />

          {/* Widgets */}
          {activeCharacter.widgets.map(widget => (
            <DraggableWidget 
              key={widget.id} 
              widget={widget} 
              scale={scale}
            />
          ))}
        </div>
      </div>

      {/* HUD / Info - simplified on mobile */}
      <div className={`absolute top-2 right-2 sm:top-4 sm:right-4 bg-theme-paper border-[length:var(--border-width)] border-theme-border p-1.5 sm:p-2 shadow-theme max-w-[45%] sm:max-w-none rounded-theme ${mode === 'edit' && !isEditingName ? 'cursor-pointer hover:opacity-90' : ''} ${isEditingName ? '' : 'pointer-events-auto'}`}>
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
            className="font-bold text-sm sm:text-xl bg-transparent border-b-[length:var(--border-width)] border-theme-border outline-none w-full text-theme-ink font-heading"
          />
        ) : (
          <h1 
            className="font-bold text-sm sm:text-xl truncate text-theme-ink font-heading"
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

      {/* Top-left button group - responsive positioning */}
      <div className={`absolute top-2 left-2 sm:top-4 sm:left-4 ${buttonsLeftOffset} pointer-events-auto transition-all duration-300 flex flex-col gap-1.5 sm:gap-2 z-30`}>
        {/* Exit to Menu Button - always visible */}
        <button
          onClick={() => selectCharacter(null)}
          className="px-2 py-1.5 sm:px-4 sm:py-2 bg-theme-paper border-[length:var(--border-width)] border-theme-border font-bold text-xs sm:text-base shadow-theme hover:bg-red-500 hover:text-white hover:border-red-700 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-theme text-theme-ink"
        >
          <span className="sm:hidden">✕</span>
          <span className="hidden sm:inline">✕ Exit to Menu</span>
        </button>

        {/* Mode Toggle Button */}
        <button
          onClick={() => setMode(mode === 'play' ? 'edit' : 'play')}
          className="px-2 py-1.5 sm:px-4 sm:py-2 bg-theme-paper border-[length:var(--border-width)] border-theme-border font-bold text-xs sm:text-base shadow-theme hover:bg-theme-accent hover:text-theme-paper transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-theme text-theme-ink"
        >
          {mode === 'play' ? (
            <>
              <span className="sm:hidden">✎</span>
              <span className="hidden sm:inline">✎ Edit Mode</span>
            </>
          ) : (
            <>
              <span className="sm:hidden">▶</span>
              <span className="hidden sm:inline">▶ Play Mode</span>
            </>
          )}
        </button>

        {/* Toolbox Toggle Button - only in edit mode */}
        {mode === 'edit' && (
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="px-2 py-1.5 sm:px-4 sm:py-2 bg-theme-paper border-[length:var(--border-width)] border-theme-border font-bold text-xs sm:text-base shadow-theme hover:bg-theme-accent hover:text-theme-paper transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-theme text-theme-ink"
          >
            {sidebarCollapsed ? (
              <>
                <span className="sm:hidden">🧰</span>
                <span className="hidden sm:inline">🧰 Show Toolbox</span>
              </>
            ) : (
              <>
                <span className="sm:hidden">✕</span>
                <span className="hidden sm:inline">✕ Hide Toolbox</span>
              </>
            )}
          </button>
        )}

        {/* Theme Toggle Button - only in edit mode */}
        {mode === 'edit' && (
          <button
            onClick={() => setThemeSidebarCollapsed(!themeSidebarCollapsed)}
            className="px-2 py-1.5 sm:px-4 sm:py-2 bg-theme-paper border-[length:var(--border-width)] border-theme-border font-bold text-xs sm:text-base shadow-theme hover:bg-theme-accent hover:text-theme-paper transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-theme text-theme-ink"
          >
            {themeSidebarCollapsed ? (
              <>
                <span className="sm:hidden">🎨</span>
                <span className="hidden sm:inline">🎨 Change Theme</span>
              </>
            ) : (
              <>
                <span className="sm:hidden">✕</span>
                <span className="hidden sm:inline">✕ Hide Themes</span>
              </>
            )}
          </button>
        )}

        {/* Auto Stack Button - only in edit mode */}
        {mode === 'edit' && (
          <button
            onClick={handleAutoStack}
            className="px-2 py-1.5 sm:px-4 sm:py-2 bg-theme-paper border-[length:var(--border-width)] border-theme-border font-bold text-xs sm:text-base shadow-theme hover:bg-theme-accent hover:text-theme-paper transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-theme text-theme-ink"
          >
            <span className="sm:hidden">📐</span>
            <span className="hidden sm:inline">📐 Auto Stack</span>
          </button>
        )}
      </div>

      {/* Mobile zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 sm:hidden z-30">
        <button
          onClick={() => setScale(s => Math.min(5, s * 1.3))}
          className="w-12 h-12 bg-theme-paper border-[length:var(--border-width)] border-theme-border font-bold text-xl shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center rounded-theme text-theme-ink"
        >
          +
        </button>
        <button
          onClick={() => setScale(s => Math.max(0.1, s / 1.3))}
          className="w-12 h-12 bg-theme-paper border-[length:var(--border-width)] border-theme-border font-bold text-xl shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center rounded-theme text-theme-ink"
        >
          −
        </button>
        <button
          onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }}
          className="w-12 h-12 bg-theme-paper border-[length:var(--border-width)] border-theme-border font-bold text-xs shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center rounded-theme text-theme-ink"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
