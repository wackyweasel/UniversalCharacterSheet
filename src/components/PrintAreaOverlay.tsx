import { useState, useRef, useCallback, useEffect } from 'react';
import { usePrintStore, PrintArea as PrintAreaType, getEffectiveAspectRatio } from '../store/usePrintStore';

interface Props {
  scale: number;
  pan: { x: number; y: number };
  readOnly?: boolean;
}

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'move';

export default function PrintAreaOverlay({ scale, readOnly }: Props) {
  const printArea = usePrintStore((state) => state.printArea);
  const setPrintArea = usePrintStore((state) => state.setPrintArea);
  const paperFormat = usePrintStore((state) => state.paperFormat);
  const isLandscape = usePrintStore((state) => state.isLandscape);
  
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, area: { x: 0, y: 0, width: 0, height: 0 } });
  
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent, handle: ResizeHandle) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!printArea) return;
    
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      area: { ...printArea },
    };
    setResizeHandle(handle);
  }, [printArea]);
  
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!resizeHandle || !printArea) return;
    
    const deltaX = (clientX - dragStartRef.current.mouseX) / scale;
    const deltaY = (clientY - dragStartRef.current.mouseY) / scale;
    const { area } = dragStartRef.current;
    
    const newArea: PrintAreaType = { ...area };
    
    // Handle resizing or moving based on which handle is being dragged
    switch (resizeHandle) {
      case 'move':
        newArea.x = area.x + deltaX;
        newArea.y = area.y + deltaY;
        break;
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
    
    // Skip dimension constraints for move
    if (resizeHandle === 'move') {
      setPrintArea(newArea);
      return;
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
    
    // Enforce aspect ratio if a paper format is selected
    const aspectRatio = getEffectiveAspectRatio(paperFormat, isLandscape);
    if (aspectRatio) {
      // Determine whether width or height is the "driving" dimension based on the handle
      const isHorizontalHandle = resizeHandle === 'e' || resizeHandle === 'w';
      const isVerticalHandle = resizeHandle === 'n' || resizeHandle === 's';
      
      if (isHorizontalHandle) {
        // Width changed → adjust height to match
        const requiredHeight = newArea.width / aspectRatio;
        const heightDelta = requiredHeight - newArea.height;
        newArea.height = requiredHeight;
        // Center the height adjustment
        newArea.y = newArea.y - heightDelta / 2;
      } else if (isVerticalHandle) {
        // Height changed → adjust width to match
        const requiredWidth = newArea.height * aspectRatio;
        const widthDelta = requiredWidth - newArea.width;
        newArea.width = requiredWidth;
        // Center the width adjustment
        newArea.x = newArea.x - widthDelta / 2;
      } else {
        // Corner handle: use width as driving dimension
        const requiredHeight = newArea.width / aspectRatio;
        if (resizeHandle.includes('n')) {
          newArea.y = newArea.y + newArea.height - requiredHeight;
        }
        newArea.height = requiredHeight;
      }
    }
    
    setPrintArea(newArea);
  }, [resizeHandle, printArea, scale, setPrintArea, paperFormat, isLandscape]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handleMove]);
  
  const [isDragging, setIsDragging] = useState(false);

  const handleEnd = useCallback(() => {
    setResizeHandle(null);
    setIsDragging(false);
  }, []);
  
  useEffect(() => {
    if (resizeHandle) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
      window.addEventListener('touchcancel', handleEnd);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleEnd);
        window.removeEventListener('touchcancel', handleEnd);
      };
    }
  }, [resizeHandle, handleMouseMove, handleTouchMove, handleEnd]);

  const handleMoveStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!printArea) return;

    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      area: { ...printArea },
    };
    setResizeHandle('move');
    setIsDragging(true);
  }, [printArea]);
  
  if (!printArea) return null;
  
  const handleStyle = "absolute w-5 h-5 bg-blue-500 border-2 border-white rounded-full shadow-md hover:scale-125 transition-transform touch-none";
  
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
        {!readOnly && <>
        {/* Resize handles - corners */}
        <div 
          className={`${handleStyle} -top-2.5 -left-2.5 cursor-nw-resize pointer-events-auto`}
          onMouseDown={(e) => handleResizeStart(e, 'nw')}
          onTouchStart={(e) => handleResizeStart(e, 'nw')}
        />
        <div 
          className={`${handleStyle} -top-2.5 -right-2.5 cursor-ne-resize pointer-events-auto`}
          onMouseDown={(e) => handleResizeStart(e, 'ne')}
          onTouchStart={(e) => handleResizeStart(e, 'ne')}
        />
        <div 
          className={`${handleStyle} -bottom-2.5 -left-2.5 cursor-sw-resize pointer-events-auto`}
          onMouseDown={(e) => handleResizeStart(e, 'sw')}
          onTouchStart={(e) => handleResizeStart(e, 'sw')}
        />
        <div 
          className={`${handleStyle} -bottom-2.5 -right-2.5 cursor-se-resize pointer-events-auto`}
          onMouseDown={(e) => handleResizeStart(e, 'se')}
          onTouchStart={(e) => handleResizeStart(e, 'se')}
        />
        
        {/* Resize handles - edges */}
        <div 
          className={`${handleStyle} -top-2.5 left-1/2 -translate-x-1/2 cursor-n-resize pointer-events-auto`}
          onMouseDown={(e) => handleResizeStart(e, 'n')}
          onTouchStart={(e) => handleResizeStart(e, 'n')}
        />
        <div 
          className={`${handleStyle} -bottom-2.5 left-1/2 -translate-x-1/2 cursor-s-resize pointer-events-auto`}
          onMouseDown={(e) => handleResizeStart(e, 's')}
          onTouchStart={(e) => handleResizeStart(e, 's')}
        />
        <div 
          className={`${handleStyle} top-1/2 -left-2.5 -translate-y-1/2 cursor-w-resize pointer-events-auto`}
          onMouseDown={(e) => handleResizeStart(e, 'w')}
          onTouchStart={(e) => handleResizeStart(e, 'w')}
        />
        <div 
          className={`${handleStyle} top-1/2 -right-2.5 -translate-y-1/2 cursor-e-resize pointer-events-auto`}
          onMouseDown={(e) => handleResizeStart(e, 'e')}
          onTouchStart={(e) => handleResizeStart(e, 'e')}
        />
        {/* Move handle - center */}
        <div 
          className={`${handleStyle} top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-move pointer-events-auto ${isDragging ? 'scale-125' : ''}`}
          onMouseDown={handleMoveStart}
          onTouchStart={handleMoveStart}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="white" className="w-3 h-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <path d="M8 1l2 2H9v3h3V5l2 2-2 2V8H9v3h1l-2 2-2-2h1V8H4v1L2 7l2-2v1h3V3H6l2-2z"/>
          </svg>
        </div>
        </>}
      </div>
      
      {/* Label */}
      <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-2 py-0.5 rounded">
        Print Area ({Math.round(printArea.width)} × {Math.round(printArea.height)})
      </div>
    </div>
  );
}
