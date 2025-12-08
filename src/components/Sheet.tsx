import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { applyTheme, applyCustomTheme } from '../store/useThemeStore';
import { getCustomTheme } from '../store/useCustomThemeStore';
import Sidebar from './Sidebar';
import ThemeSidebar from './ThemeSidebar';
import DraggableWidget from './DraggableWidget';
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

  // Auto-stack function that measures actual DOM widget sizes
  // Now preserves widget groups and treats them as single units
  const handleAutoStack = () => {
    if (!activeCharacter || activeSheetWidgets.length === 0) return;

    const GRID_SIZE = 10;
    const GAP = 10;

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

    // Build widget info with measured sizes
    const widgets = activeSheetWidgets.map(w => {
      const measured = widgetSizes.find(s => s.id === w.id);
      return {
        id: w.id,
        groupId: w.groupId,
        x: w.x,
        y: w.y,
        w: measured ? measured.w : (w.w || 200),
        h: measured ? measured.h : (w.h || 120),
      };
    });

    // Group widgets by groupId
    const groupedWidgets = new Map<string, typeof widgets>();
    const ungroupedWidgets: typeof widgets = [];
    
    for (const widget of widgets) {
      if (widget.groupId) {
        const group = groupedWidgets.get(widget.groupId) || [];
        group.push(widget);
        groupedWidgets.set(widget.groupId, group);
      } else {
        ungroupedWidgets.push(widget);
      }
    }

    // Calculate bounding box for each group (preserving internal positions)
    interface StackableItem {
      type: 'group' | 'single';
      id: string; // groupId for groups, widgetId for singles
      widgets: typeof widgets; // widgets in this item
      boundingBox: { x: number; y: number; w: number; h: number };
      originalOffset: { x: number; y: number }; // offset of bounding box from origin
    }

    const stackableItems: StackableItem[] = [];

    // Process groups
    for (const [groupId, groupWidgets] of groupedWidgets) {
      if (groupWidgets.length === 0) continue;
      
      // Calculate bounding box of the group
      const minX = Math.min(...groupWidgets.map(w => w.x));
      const minY = Math.min(...groupWidgets.map(w => w.y));
      const maxX = Math.max(...groupWidgets.map(w => w.x + w.w));
      const maxY = Math.max(...groupWidgets.map(w => w.y + w.h));
      
      stackableItems.push({
        type: 'group',
        id: groupId,
        widgets: groupWidgets,
        boundingBox: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
        originalOffset: { x: minX, y: minY },
      });
    }

    // Process ungrouped widgets
    for (const widget of ungroupedWidgets) {
      stackableItems.push({
        type: 'single',
        id: widget.id,
        widgets: [widget],
        boundingBox: { x: widget.x, y: widget.y, w: widget.w, h: widget.h },
        originalOffset: { x: widget.x, y: widget.y },
      });
    }

    // Calculate container width based on total area
    const totalArea = stackableItems.reduce((sum, item) => sum + (item.boundingBox.w + GAP) * (item.boundingBox.h + GAP), 0);
    const CONTAINER_WIDTH = Math.max(800, Math.ceil(Math.sqrt(totalArea * 1.5) / GRID_SIZE) * GRID_SIZE);

    // Sort by original position: top-to-bottom, left-to-right
    const sortedItems = [...stackableItems].sort((a, b) => {
      const ROW_THRESHOLD = 50;
      const rowA = Math.floor(a.boundingBox.y / ROW_THRESHOLD);
      const rowB = Math.floor(b.boundingBox.y / ROW_THRESHOLD);
      if (rowA !== rowB) return rowA - rowB;
      return a.boundingBox.x - b.boundingBox.x;
    });

    // MaxRects bin packing algorithm
    interface Rect { x: number; y: number; w: number; h: number; }
    let freeRects: Rect[] = [{ x: 0, y: 0, w: CONTAINER_WIDTH, h: 100000 }];
    const placed: { item: StackableItem; x: number; y: number }[] = [];

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

    // Place each stackable item
    for (const item of sortedItems) {
      const itemWidth = item.boundingBox.w + GAP;
      const itemHeight = item.boundingBox.h + GAP;
      const pos = findBestPosition(itemWidth, itemHeight);

      if (pos) {
        const snapX = Math.round(pos.x / GRID_SIZE) * GRID_SIZE;
        const snapY = Math.round(pos.y / GRID_SIZE) * GRID_SIZE;
        placed.push({ item, x: snapX, y: snapY });
        splitFreeRects(snapX, snapY, itemWidth, itemHeight);
      } else {
        // Fallback: place below all others
        const maxY = placed.reduce((max, p) => {
          return Math.max(max, p.y + p.item.boundingBox.h + GAP);
        }, 0);
        placed.push({ item, x: 0, y: maxY });
        splitFreeRects(0, maxY, itemWidth, itemHeight);
      }
    }

    // Update all widget positions
    for (const placement of placed) {
      const { item, x: newX, y: newY } = placement;
      const offsetX = newX - item.originalOffset.x;
      const offsetY = newY - item.originalOffset.y;
      
      // Update each widget in the item, preserving relative positions within groups
      for (const widget of item.widgets) {
        const finalX = Math.round((widget.x + offsetX) / GRID_SIZE) * GRID_SIZE;
        const finalY = Math.round((widget.y + offsetY) / GRID_SIZE) * GRID_SIZE;
        updateWidgetPosition(widget.id, finalX, finalY);
      }
    }
  };

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  
  // Touch pinch zoom state
  const lastTouchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);
  // Track if multi-touch gesture is active (for gestures that start on widgets)
  const isMultiTouchActive = useRef(false);
  // Refs to avoid stale closures in global touch handlers
  const scaleRef = useRef(scale);
  const panRef = useRef(pan);
  
  // Keep refs in sync with state
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { panRef.current = pan; }, [pan]);

  // Fit all widgets in view with maximum zoom
  const handleFitAllWidgets = () => {
    if (!activeCharacter || activeSheetWidgets.length === 0) {
      // No widgets, just reset to default
      setScale(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    // Get all widget DOM elements and measure their actual sizes
    const widgetElements = document.querySelectorAll('.react-draggable[data-widget-id]');
    const widgetBounds: { x: number; y: number; w: number; h: number }[] = [];

    widgetElements.forEach((el) => {
      const id = el.getAttribute('data-widget-id');
      const widget = activeSheetWidgets.find(w => w.id === id);
      if (widget) {
        const rect = el.getBoundingClientRect();
        // Account for current scale to get actual widget dimensions
        widgetBounds.push({
          x: widget.x,
          y: widget.y,
          w: rect.width / scale,
          h: rect.height / scale,
        });
      }
    });

    if (widgetBounds.length === 0) {
      setScale(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    // Calculate bounding box of all widgets
    const minX = Math.min(...widgetBounds.map(b => b.x));
    const minY = Math.min(...widgetBounds.map(b => b.y));
    const maxX = Math.max(...widgetBounds.map(b => b.x + b.w));
    const maxY = Math.max(...widgetBounds.map(b => b.y + b.h));

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Add padding (in pixels)
    const padding = 60;
    const availableWidth = viewportWidth - padding * 2;
    const availableHeight = viewportHeight - padding * 2;

    // Calculate scale to fit all widgets
    const scaleX = availableWidth / contentWidth;
    const scaleY = availableHeight / contentHeight;
    const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.1), 5);

    // Calculate center of widgets bounding box
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Calculate pan to center the content
    const newPanX = viewportWidth / 2 - centerX * newScale;
    const newPanY = viewportHeight / 2 - centerY * newScale;

    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
  };

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

  // Global touch event listeners to capture multi-touch gestures even when starting on widgets
  useEffect(() => {
    const getTouchDist = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };
    
    const getTouchCtr = (touches: TouchList) => ({
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    });

    const handleGlobalTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Two fingers detected - activate pinch zoom
        isMultiTouchActive.current = true;
        lastTouchDistance.current = getTouchDist(e.touches);
        lastTouchCenter.current = getTouchCtr(e.touches);
      }
    };
    
    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Always handle 2-finger gestures
        if (!isMultiTouchActive.current) {
          // Just became 2 fingers
          isMultiTouchActive.current = true;
          lastTouchDistance.current = getTouchDist(e.touches);
          lastTouchCenter.current = getTouchCtr(e.touches);
          return;
        }
        
        if (lastTouchDistance.current === null || lastTouchCenter.current === null) {
          lastTouchDistance.current = getTouchDist(e.touches);
          lastTouchCenter.current = getTouchCtr(e.touches);
          return;
        }
        
        e.preventDefault();
        
        const newDistance = getTouchDist(e.touches);
        const newCenter = getTouchCtr(e.touches);
        
        const currentScale = scaleRef.current;
        const currentPan = panRef.current;
        
        // Calculate zoom
        const zoomFactor = newDistance / lastTouchDistance.current;
        const newScale = Math.min(Math.max(currentScale * zoomFactor, 0.1), 5);
        
        // Calculate pan to zoom towards center point
        const canvasX = (newCenter.x - currentPan.x) / currentScale;
        const canvasY = (newCenter.y - currentPan.y) / currentScale;
        
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
    
    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        isMultiTouchActive.current = false;
        lastTouchDistance.current = null;
        lastTouchCenter.current = null;
      }
    };
    
    // Use capture phase to get events before they're handled by children
    document.addEventListener('touchstart', handleGlobalTouchStart, { passive: true, capture: true });
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', handleGlobalTouchEnd, { passive: true, capture: true });
    
    return () => {
      document.removeEventListener('touchstart', handleGlobalTouchStart, { capture: true });
      document.removeEventListener('touchmove', handleGlobalTouchMove, { capture: true });
      document.removeEventListener('touchend', handleGlobalTouchEnd, { capture: true });
    };
  }, []); // Empty deps - uses refs for current values

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

  // Touch event handlers for mobile panning (pinch zoom handled by global listeners)
  const handleTouchStart = (e: React.TouchEvent) => {
    // Disable touch interactions when editing a widget
    if (editingWidgetId) return;
    
    // Check if touching a widget
    const onWidget = (e.target as HTMLElement).closest('.react-draggable');
    
    if (e.touches.length === 1 && !onWidget) {
      // Single finger on background: start panning
      const touch = e.touches[0];
      setIsPanning(true);
      lastMousePos.current = { x: touch.clientX, y: touch.clientY };
    }
    // Note: Two-finger gestures are handled by global document listeners
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Two-finger gestures handled by global listeners
    if (e.touches.length === 2) {
      return; // Let global handler deal with it
    }
    
    // Single finger pan (only if we started panning on background)
    if (e.touches.length === 1 && isPanning && !isMultiTouchActive.current) {
      const touch = e.touches[0];
      const dx = touch.clientX - lastMousePos.current.x;
      const dy = touch.clientY - lastMousePos.current.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMousePos.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsPanning(false);
    }
    // Note: Multi-touch cleanup handled by global listeners
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

      const GRID_SIZE = 10;
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
    <div className="w-full h-screen overflow-hidden relative bg-theme-background">
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
        style={{ touchAction: 'none' }}
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

      {/* HUD / Info - simplified on mobile */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex flex-col gap-2 pointer-events-auto z-30">
        <div className={`bg-theme-paper border-[length:var(--border-width)] border-theme-border p-1.5 sm:p-2 shadow-theme rounded-theme ${mode === 'edit' && !isEditingName ? 'cursor-pointer hover:opacity-90' : ''}`}>
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
              className="font-bold text-sm sm:text-xl text-theme-ink font-heading"
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
            <span className="text-xs sm:text-sm font-body text-theme-ink">
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
                        className="w-full px-3 py-2 text-xs sm:text-sm bg-transparent border-b border-theme-border outline-none text-theme-ink font-body"
                      />
                    ) : (
                      <button
                        onClick={() => {
                          selectSheet(sheet.id);
                          setSheetDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-xs sm:text-sm text-left font-body transition-colors flex items-center justify-between ${
                          sheet.id === activeCharacter.activeSheetId
                            ? 'bg-theme-accent text-theme-paper'
                            : 'text-theme-ink hover:bg-theme-accent/20'
                        }`}
                      >
                        <span>{sheet.name}</span>
                        {/* Edit buttons - only show in edit mode */}
                        {mode === 'edit' && (
                          <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    className="w-full px-3 py-2 text-xs sm:text-sm text-theme-muted hover:text-theme-ink hover:bg-theme-accent/20 text-left font-body border-t border-theme-border/50 transition-colors"
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
            onClick={() => setScale(s => Math.min(5, s * 1.3))}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-theme-paper border-[length:var(--border-width)] border-theme-border font-bold text-base sm:text-xl shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center rounded-theme text-theme-ink"
          >
            +
          </button>
          <button
            onClick={() => setScale(s => Math.max(0.1, s / 1.3))}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-theme-paper border-[length:var(--border-width)] border-theme-border font-bold text-base sm:text-xl shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center rounded-theme text-theme-ink"
          >
            −
          </button>
          <button
            onClick={handleFitAllWidgets}
            className="px-2 h-8 sm:h-10 bg-theme-paper border-[length:var(--border-width)] border-theme-border font-bold text-xs shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center rounded-theme text-theme-ink"
          >
            Fit
          </button>
        </div>
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
    </div>
  );
}
