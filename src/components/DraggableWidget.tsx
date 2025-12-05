import { useRef, useState, useCallback, useEffect } from 'react';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { Widget } from '../types';
import { useStore } from '../store/useStore';
import NumberWidget from './widgets/NumberWidget';
import ListWidget from './widgets/ListWidget';
import TextWidget from './widgets/TextWidget';
import CheckboxWidget from './widgets/CheckboxWidget';
import HealthBarWidget from './widgets/HealthBarWidget';
import DiceRollerWidget from './widgets/DiceRollerWidget';
import SpellSlotWidget from './widgets/SpellSlotWidget';
import SkillWidget from './widgets/SkillWidget';
import ImageWidget from './widgets/ImageWidget';
import PoolWidget from './widgets/PoolWidget';
import ToggleGroupWidget from './widgets/ToggleGroupWidget';
import TableWidget from './widgets/TableWidget';

interface Props {
  widget: Widget;
  scale: number;
}

const GRID_SIZE = 20;
const MIN_WIDTH = 120;
const MIN_HEIGHT = 60;

export default function DraggableWidget({ widget, scale }: Props) {
  const updateWidgetPosition = useStore((state) => state.updateWidgetPosition);
  const updateWidgetSize = useStore((state) => state.updateWidgetSize);
  const removeWidget = useStore((state) => state.removeWidget);
  const mode = useStore((state) => state.mode);
  const nodeRef = useRef<HTMLDivElement>(null);
  
  const [isResizing, setIsResizing] = useState(false);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const snapToGrid = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;

  const handleStop = (_e: DraggableEvent, data: DraggableData) => {
    if (isResizing) return;
    const snappedX = snapToGrid(data.x);
    const snappedY = snapToGrid(data.y);
    updateWidgetPosition(widget.id, snappedX, snappedY);
  };

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode !== 'edit') return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent text selection during resize
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'nwse-resize';
    
    setIsResizing(true);
    
    const currentW = widget.w || nodeRef.current?.offsetWidth || MIN_WIDTH;
    const currentH = widget.h || nodeRef.current?.offsetHeight || MIN_HEIGHT;
    
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      w: currentW,
      h: currentH
    };
  }, [mode, widget.w, widget.h]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
      const deltaX = (e.clientX - resizeStart.current.x) / scale;
      const deltaY = (e.clientY - resizeStart.current.y) / scale;
      
      const newW = Math.max(MIN_WIDTH, snapToGrid(resizeStart.current.w + deltaX));
      const newH = Math.max(MIN_HEIGHT, snapToGrid(resizeStart.current.h + deltaY));
      
      updateWidgetSize(widget.id, newW, newH);
    };

    const handleMouseUp = () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, scale, widget.id, updateWidgetSize]);

  const widgetWidth = widget.w || 200;
  const widgetHeight = widget.h || 120;

  const renderContent = () => {
    const props = { widget, mode, width: widgetWidth, height: widgetHeight };
    switch (widget.type) {
      case 'NUMBER': return <NumberWidget {...props} />;
      case 'LIST': return <ListWidget {...props} />;
      case 'TEXT': return <TextWidget {...props} />;
      case 'CHECKBOX': return <CheckboxWidget {...props} />;
      case 'HEALTH_BAR': return <HealthBarWidget {...props} />;
      case 'DICE_ROLLER': return <DiceRollerWidget {...props} />;
      case 'SPELL_SLOT': return <SpellSlotWidget {...props} />;
      case 'SKILL': return <SkillWidget {...props} />;
      case 'IMAGE': return <ImageWidget {...props} />;
      case 'POOL': return <PoolWidget {...props} />;
      case 'TOGGLE_GROUP': return <ToggleGroupWidget {...props} />;
      case 'TABLE': return <TableWidget {...props} />;
      default: return null;
    }
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: widget.x, y: widget.y }}
      onStop={handleStop}
      scale={scale}
      grid={[GRID_SIZE, GRID_SIZE]}
      handle=".drag-handle"
      disabled={mode === 'play' || isResizing}
    >
      <div 
        ref={nodeRef}
        className="react-draggable absolute bg-white border-2 border-black shadow-hard p-4 cursor-default group"
        style={{ 
          width: widget.w ? `${widget.w}px` : 'auto',
          height: widget.h ? `${widget.h}px` : 'auto',
          minWidth: `${MIN_WIDTH}px`,
          minHeight: `${MIN_HEIGHT}px`,
        }}
      >
        {/* Drag Handle - only visible in edit mode */}
        {mode === 'edit' && (
          <div className="drag-handle absolute top-0 left-0 right-0 h-4 bg-transparent cursor-move hover:bg-gray-100 flex justify-end pr-1">
             <div className="w-full h-full" />
          </div>
        )}
        
        {/* Delete Button - only visible in edit mode */}
        {mode === 'edit' && (
          <button
            className="absolute -top-3 -right-3 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600"
            onClick={() => removeWidget(widget.id)}
            onMouseDown={(e) => e.stopPropagation()}
          >
            ×
          </button>
        )}

        {/* Resize Handle - only visible in edit mode */}
        {mode === 'edit' && (
          <div 
            className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize z-20 opacity-30 hover:opacity-100 transition-opacity"
            onMouseDown={handleResizeMouseDown}
          >
            <svg viewBox="0 0 20 20" className="w-full h-full text-gray-600">
              <path d="M20 20L6 20L20 6Z" fill="currentColor" />
            </svg>
          </div>
        )}

        <div className="mt-2 h-[calc(100%-0.5rem)] overflow-auto">
          {renderContent()}
        </div>
      </div>
    </Draggable>
  );
}
