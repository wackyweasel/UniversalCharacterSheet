import { useRef, useState, useEffect } from 'react';
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
import ConditionWidget from './widgets/ConditionWidget';
import TableWidget from './widgets/TableWidget';
import TimeTrackerWidget from './widgets/TimeTrackerWidget';
import WidgetEditModal from './WidgetEditModal';

interface Props {
  widget: Widget;
  scale: number;
}

const GRID_SIZE = 10;
const MIN_WIDTH = 120;

export default function DraggableWidget({ widget, scale }: Props) {
  const updateWidgetPosition = useStore((state) => state.updateWidgetPosition);
  const moveWidgetGroup = useStore((state) => state.moveWidgetGroup);
  const removeWidget = useStore((state) => state.removeWidget);
  const mode = useStore((state) => state.mode);
  const setEditingWidgetId = useStore((state) => state.setEditingWidgetId);
  const nodeRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isTouchActive, setIsTouchActive] = useState(false);
  const [snappedHeight, setSnappedHeight] = useState<number | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const touchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Measure widget and snap height to grid
  useEffect(() => {
    if (nodeRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          // Measure the actual rendered height of the widget
          const naturalHeight = entry.target.scrollHeight;
          const snapped = Math.ceil(naturalHeight / GRID_SIZE) * GRID_SIZE;
          setSnappedHeight(snapped);
        }
      });
      resizeObserver.observe(nodeRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [widget.data]);

  // Clear touch state when clicking outside or after timeout
  useEffect(() => {
    const handleTouchOutside = (e: TouchEvent) => {
      if (nodeRef.current && !nodeRef.current.contains(e.target as Node)) {
        setIsTouchActive(false);
      }
    };

    if (isTouchActive) {
      document.addEventListener('touchstart', handleTouchOutside);
      // Auto-hide after 5 seconds of inactivity
      touchTimeoutRef.current = setTimeout(() => {
        setIsTouchActive(false);
      }, 5000);
    }

    return () => {
      document.removeEventListener('touchstart', handleTouchOutside);
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
    };
  }, [isTouchActive]);

  const handleWidgetTouchStart = (e: React.TouchEvent) => {
    if (mode === 'edit') {
      // If controls are not yet showing, prevent default and just show controls
      if (!isTouchActive) {
        e.preventDefault();
        e.stopPropagation();
        setIsTouchActive(true);
      }
      // Reset the timeout
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
    }
  };

  // Handle click/tap on widget - in edit mode, first tap shows controls
  const handleWidgetClick = (e: React.MouseEvent) => {
    if (mode === 'edit' && !showControls) {
      e.preventDefault();
      e.stopPropagation();
      setIsTouchActive(true);
    }
  };

  const showControls = isHovered || isTouchActive;

  const openEditModal = () => {
    setShowEditModal(true);
    setEditingWidgetId(widget.id);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingWidgetId(null);
  };

  const snapToGrid = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;

  const handleStart = (_e: DraggableEvent, data: DraggableData) => {
    // Store the starting position for calculating delta
    dragStartPos.current = { x: data.x, y: data.y };
  };

  const handleDrag = (_e: DraggableEvent, data: DraggableData) => {
    // If widget is in a group, visually move sibling widgets during drag
    if (widget.groupId) {
      const deltaX = data.x - dragStartPos.current.x;
      const deltaY = data.y - dragStartPos.current.y;
      
      // Find all sibling widgets in the same group and update their visual positions
      const siblingElements = document.querySelectorAll(`[data-group-id="${widget.groupId}"]`);
      siblingElements.forEach((el) => {
        const siblingId = el.getAttribute('data-widget-id');
        if (siblingId && siblingId !== widget.id) {
          // Get original position from the store
          const siblings = useStore.getState().getWidgetsInGroup(widget.groupId!);
          const sibling = siblings.find(s => s.id === siblingId);
          if (sibling) {
            (el as HTMLElement).style.transform = `translate(${sibling.x + deltaX}px, ${sibling.y + deltaY}px)`;
          }
        }
      });
    }
  };

  const handleStop = (_e: DraggableEvent, data: DraggableData) => {
    const snappedX = snapToGrid(data.x);
    const snappedY = snapToGrid(data.y);
    
    // If widget is in a group, move the entire group
    if (widget.groupId) {
      const deltaX = snappedX - widget.x;
      const deltaY = snappedY - widget.y;
      if (deltaX !== 0 || deltaY !== 0) {
        moveWidgetGroup(widget.id, deltaX, deltaY);
      }
    } else {
      updateWidgetPosition(widget.id, snappedX, snappedY);
    }
  };

  // Calculate width based on widget type
  const getWidgetWidth = () => {
    // Use custom width if set on the widget
    if (widget.w) {
      return widget.w;
    }
    if (widget.type === 'TABLE') {
      // Dynamic width for tables based on number of columns
      const columns = widget.data.columns || ['Item', 'Qty', 'Weight'];
      const columnCount = columns.length;
      // Base width per column (minimum 60px) + some padding for delete button
      const baseColumnWidth = 80;
      const minWidth = 200;
      const calculatedWidth = Math.max(minWidth, columnCount * baseColumnWidth + 40);
      // Snap to grid
      return snapToGrid(calculatedWidth);
    }
    return 200; // Default fixed width for other widgets
  };

  const widgetWidth = getWidgetWidth();

  const renderContent = () => {
    // Always render in play mode style - the modal handles editing
    const props = { widget, mode: 'play' as const, width: widgetWidth, height: 200 };
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
      case 'TOGGLE_GROUP': return <ConditionWidget {...props} />;
      case 'TABLE': return <TableWidget {...props} />;
      case 'TIME_TRACKER': return <TimeTrackerWidget {...props} />;
      default: return null;
    }
  };

  return (
    <>
      <Draggable
        nodeRef={nodeRef}
        position={{ x: widget.x, y: widget.y }}
        onStart={handleStart}
        onDrag={handleDrag}
        onStop={handleStop}
        scale={scale}
        grid={[GRID_SIZE, GRID_SIZE]}
        handle=".drag-handle"
        disabled={mode === 'play'}
      >
        <div 
          ref={nodeRef}
          data-widget-id={widget.id}
          data-group-id={widget.groupId || ''}
          className={`react-draggable absolute bg-theme-paper border-[length:var(--border-width)] border-theme-border p-2 sm:p-4 cursor-default group touch-manipulation rounded-theme ${widget.groupId && mode === 'edit' ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}
          style={{ 
            width: `${widgetWidth}px`,
            minWidth: `${MIN_WIDTH}px`,
            minHeight: snappedHeight ? `${snappedHeight}px` : 'auto',
            zIndex: showControls && mode === 'edit' ? 100 : undefined,
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={handleWidgetTouchStart}
          onClick={handleWidgetClick}
        >
          {/* Drag Handle - only visible in edit mode */}
          {mode === 'edit' && (
            <div className="drag-handle absolute top-0 left-0 right-0 h-6 sm:h-4 bg-transparent cursor-move hover:opacity-70 active:opacity-50 flex justify-end pr-1 touch-none rounded-t-theme">
              <div className="w-full h-full" />
            </div>
          )}
          
          {/* Edit Button - visible on hover/touch in edit mode */}
          {mode === 'edit' && showControls && (
            <button
              className="absolute -top-3 -left-3 w-8 h-8 sm:w-6 sm:h-6 bg-theme-accent text-theme-paper rounded-full flex items-center justify-center transition-opacity z-50 hover:bg-blue-600 text-sm"
              onClick={openEditModal}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              title="Edit widget"
            >
              ✏️
            </button>
          )}
          
          {/* Delete Button - visible on hover/touch in edit mode */}
          {mode === 'edit' && showControls && (
            <button
              className="absolute -top-3 -right-3 w-8 h-8 sm:w-6 sm:h-6 bg-theme-accent text-theme-paper rounded-full flex items-center justify-center transition-opacity z-50 hover:bg-red-600 text-lg sm:text-base"
              onClick={() => removeWidget(widget.id)}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              ×
            </button>
          )}

          {/* Touch overlay - blocks interactions with widget content when controls are showing on mobile */}
          {mode === 'edit' && isTouchActive && (
            <div 
              className="absolute inset-0 z-40 bg-theme-accent/10 rounded-theme"
              onTouchStart={(e) => {
                e.stopPropagation();
                // Reset timeout on any touch
                if (touchTimeoutRef.current) {
                  clearTimeout(touchTimeoutRef.current);
                  touchTimeoutRef.current = setTimeout(() => {
                    setIsTouchActive(false);
                  }, 5000);
                }
              }}
            />
          )}

          <div ref={contentRef}>
            {renderContent()}
          </div>
        </div>
      </Draggable>
      
      {/* Edit Modal */}
      {showEditModal && (
        <WidgetEditModal 
          widget={widget} 
          onClose={closeEditModal} 
        />
      )}
    </>
  );
}
