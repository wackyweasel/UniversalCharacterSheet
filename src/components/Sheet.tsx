import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import Sidebar from './Sidebar';
import DraggableWidget from './DraggableWidget';
import { WidgetType } from '../types';

export default function Sheet() {
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const characters = useStore((state) => state.characters);
  const addWidget = useStore((state) => state.addWidget);
  const mode = useStore((state) => state.mode);
  const setMode = useStore((state) => state.setMode);
  const selectCharacter = useStore((state) => state.selectCharacter);
  const activeCharacter = characters.find(c => c.id === activeCharacterId);
  // Default sidebar collapsed on mobile (< 768px)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth < 768);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  
  // Touch pinch zoom state
  const lastTouchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
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
    <div className="w-full h-screen overflow-hidden relative bg-gray-200 touch-none">
      {mode === 'edit' && (
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
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
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-white border-2 border-black p-1.5 sm:p-2 shadow-hard pointer-events-none max-w-[45%] sm:max-w-none">
        <h1 className="font-bold text-sm sm:text-xl truncate">{activeCharacter.name}</h1>
        <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">
          Pos: {Math.round(pan.x)}, {Math.round(pan.y)} | Zoom: {Math.round(scale * 100)}%
        </p>
        <p className="text-[10px] text-gray-500 sm:hidden">
          {Math.round(scale * 100)}%
        </p>
      </div>

      {/* Top-left button group - responsive positioning */}
      <div className={`absolute top-2 left-2 sm:top-4 sm:left-4 ${buttonsLeftOffset} pointer-events-auto transition-all duration-300 flex flex-col gap-1.5 sm:gap-2 z-30`}>
        {/* Exit to Menu Button - always visible */}
        <button
          onClick={() => selectCharacter(null)}
          className="px-2 py-1.5 sm:px-4 sm:py-2 bg-white border-2 border-black font-bold text-xs sm:text-base shadow-hard hover:bg-red-500 hover:text-white hover:border-red-700 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <span className="sm:hidden">✕</span>
          <span className="hidden sm:inline">✕ Exit to Menu</span>
        </button>

        {/* Mode Toggle Button */}
        <button
          onClick={() => setMode(mode === 'play' ? 'edit' : 'play')}
          className="px-2 py-1.5 sm:px-4 sm:py-2 bg-white border-2 border-black font-bold text-xs sm:text-base shadow-hard hover:bg-black hover:text-white transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
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
      </div>

      {/* Floating toolbox toggle button - only in edit mode, larger on mobile */}
      {mode === 'edit' && (
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute bottom-4 left-4 w-14 h-14 sm:w-12 sm:h-12 bg-white border-2 border-black font-bold shadow-hard hover:bg-black hover:text-white transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center text-2xl sm:text-xl z-50"
          title={sidebarCollapsed ? 'Show Toolbox' : 'Hide Toolbox'}
        >
          {sidebarCollapsed ? '🧰' : '✕'}
        </button>
      )}

      {/* Mobile zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 sm:hidden z-30">
        <button
          onClick={() => setScale(s => Math.min(5, s * 1.3))}
          className="w-12 h-12 bg-white border-2 border-black font-bold text-xl shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center"
        >
          +
        </button>
        <button
          onClick={() => setScale(s => Math.max(0.1, s / 1.3))}
          className="w-12 h-12 bg-white border-2 border-black font-bold text-xl shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center"
        >
          −
        </button>
        <button
          onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }}
          className="w-12 h-12 bg-white border-2 border-black font-bold text-xs shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
