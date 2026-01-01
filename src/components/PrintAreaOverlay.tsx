import { useState, useRef, useCallback, useEffect } from 'react';
import { usePrintStore, PrintArea as PrintAreaType } from '../store/usePrintStore';

interface Props {
  scale: number;
  pan: { x: number; y: number };
}

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export default function PrintAreaOverlay({ scale }: Props) {
  const printArea = usePrintStore((state) => state.printArea);
  const setPrintArea = usePrintStore((state) => state.setPrintArea);
  
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, area: { x: 0, y: 0, width: 0, height: 0 } });
  
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!printArea) return;
    
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      area: { ...printArea },
    };
    setResizeHandle(handle);
  }, [printArea]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizeHandle || !printArea) return;
    
    const deltaX = (e.clientX - dragStartRef.current.mouseX) / scale;
    const deltaY = (e.clientY - dragStartRef.current.mouseY) / scale;
    const { area } = dragStartRef.current;
    
    const newArea: PrintAreaType = { ...area };
    
    // Handle resizing based on which handle is being dragged
    switch (resizeHandle) {
      case 'n':
        newArea.y = area.y + deltaY;
        newArea.height = area.height - deltaY;
        break;
      case 's':
        newArea.height = area.height + deltaY;
        break;
      case 'e':
        newArea.width = area.width + deltaX;
        break;
      case 'w':
        newArea.x = area.x + deltaX;
        newArea.width = area.width - deltaX;
        break;
      case 'ne':
        newArea.y = area.y + deltaY;
        newArea.height = area.height - deltaY;
        newArea.width = area.width + deltaX;
        break;
      case 'nw':
        newArea.x = area.x + deltaX;
        newArea.width = area.width - deltaX;
        newArea.y = area.y + deltaY;
        newArea.height = area.height - deltaY;
        break;
      case 'se':
        newArea.width = area.width + deltaX;
        newArea.height = area.height + deltaY;
        break;
      case 'sw':
        newArea.x = area.x + deltaX;
        newArea.width = area.width - deltaX;
        newArea.height = area.height + deltaY;
        break;
    }
    
    // Ensure minimum dimensions
    if (newArea.width < 100) {
      newArea.width = 100;
      if (resizeHandle.includes('w')) {
        newArea.x = area.x + area.width - 100;
      }
    }
    if (newArea.height < 100) {
      newArea.height = 100;
      if (resizeHandle.includes('n')) {
        newArea.y = area.y + area.height - 100;
      }
    }
    
    setPrintArea(newArea);
  }, [resizeHandle, printArea, scale, setPrintArea]);
  
  const handleMouseUp = useCallback(() => {
    setResizeHandle(null);
  }, []);
  
  useEffect(() => {
    if (resizeHandle) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizeHandle, handleMouseMove, handleMouseUp]);
  
  if (!printArea) return null;
  
  const handleStyle = "absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full shadow-md hover:scale-125 transition-transform";
  
  return (
    <div
      className="absolute pointer-events-none print-area-overlay"
      style={{
        left: printArea.x,
        top: printArea.y,
        width: printArea.width,
        height: printArea.height,
      }}
    >
      {/* Border frame */}
      <div className="absolute inset-0 border-2 border-blue-500 border-dashed rounded-sm">
        {/* Resize handles - corners */}
        <div 
          className={`${handleStyle} -top-1.5 -left-1.5 cursor-nw-resize pointer-events-auto`}
          onMouseDown={(e) => handleResizeStart(e, 'nw')}
        />
        <div 
          className={`${handleStyle} -top-1.5 -right-1.5 cursor-ne-resize pointer-events-auto`}
          onMouseDown={(e) => handleResizeStart(e, 'ne')}
        />
        <div 
          className={`${handleStyle} -bottom-1.5 -left-1.5 cursor-sw-resize pointer-events-auto`}
          onMouseDown={(e) => handleResizeStart(e, 'sw')}
        />
        <div 
          className={`${handleStyle} -bottom-1.5 -right-1.5 cursor-se-resize pointer-events-auto`}
          onMouseDown={(e) => handleResizeStart(e, 'se')}
        />
        
        {/* Resize handles - edges */}
        <div 
          className={`${handleStyle} -top-1.5 left-1/2 -translate-x-1/2 cursor-n-resize pointer-events-auto`}
          onMouseDown={(e) => handleResizeStart(e, 'n')}
        />
        <div 
          className={`${handleStyle} -bottom-1.5 left-1/2 -translate-x-1/2 cursor-s-resize pointer-events-auto`}
          onMouseDown={(e) => handleResizeStart(e, 's')}
        />
        <div 
          className={`${handleStyle} top-1/2 -left-1.5 -translate-y-1/2 cursor-w-resize pointer-events-auto`}
          onMouseDown={(e) => handleResizeStart(e, 'w')}
        />
        <div 
          className={`${handleStyle} top-1/2 -right-1.5 -translate-y-1/2 cursor-e-resize pointer-events-auto`}
          onMouseDown={(e) => handleResizeStart(e, 'e')}
        />
      </div>
      
      {/* Label */}
      <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-2 py-0.5 rounded">
        Print Area ({Math.round(printArea.width)} × {Math.round(printArea.height)})
      </div>
    </div>
  );
}
