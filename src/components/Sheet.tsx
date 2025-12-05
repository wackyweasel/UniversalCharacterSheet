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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

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

  // Global event listener for mouse up to catch drags outside window
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsPanning(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  if (!activeCharacter) return null;

  // Calculate left offset for buttons based on sidebar state
  const buttonsLeftOffset = mode === 'edit' && !sidebarCollapsed ? 'left-72' : 'left-4';

  return (
    <div className="w-full h-screen overflow-hidden relative bg-gray-200">
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

      {/* HUD / Info */}
      <div className="absolute top-4 right-4 bg-white border-2 border-black p-2 shadow-hard pointer-events-none">
        <h1 className="font-bold text-xl">{activeCharacter.name}</h1>
        <p className="text-xs text-gray-500">
          Pos: {Math.round(pan.x)}, {Math.round(pan.y)} | Zoom: {Math.round(scale * 100)}%
        </p>
      </div>

      {/* Top-left button group - always visible */}
      <div className={`absolute top-4 pointer-events-auto transition-all duration-300 ${buttonsLeftOffset} flex flex-col gap-2`}>
        {/* Exit to Menu Button - always visible */}
        <button
          onClick={() => selectCharacter(null)}
          className="px-4 py-2 bg-white border-2 border-black font-bold shadow-hard hover:bg-red-500 hover:text-white hover:border-red-700 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          ✕ Exit to Menu
        </button>

        {/* Mode Toggle Button */}
        <button
          onClick={() => setMode(mode === 'play' ? 'edit' : 'play')}
          className="px-4 py-2 bg-white border-2 border-black font-bold shadow-hard hover:bg-black hover:text-white transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          {mode === 'play' ? '✎ Edit Mode' : '▶ Play Mode'}
        </button>
      </div>
    </div>
  );
}
