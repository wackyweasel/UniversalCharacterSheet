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
  const removeWidget = useStore((state) => state.removeWidget);
  const mode = useStore((state) => state.mode);
  const setEditingWidgetId = useStore((state) => state.setEditingWidgetId);
  const nodeRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [snappedHeight, setSnappedHeight] = useState<number | null>(null);

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

  const openEditModal = () => {
    setShowEditModal(true);
    setEditingWidgetId(widget.id);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingWidgetId(null);
  };

  const snapToGrid = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;

  const handleStop = (_e: DraggableEvent, data: DraggableData) => {
    const snappedX = snapToGrid(data.x);
    const snappedY = snapToGrid(data.y);
    updateWidgetPosition(widget.id, snappedX, snappedY);
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
        onStop={handleStop}
        scale={scale}
        grid={[GRID_SIZE, GRID_SIZE]}
        handle=".drag-handle"
        disabled={mode === 'play'}
      >
        <div 
          ref={nodeRef}
          data-widget-id={widget.id}
          className="react-draggable absolute bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme p-2 sm:p-4 cursor-default group touch-manipulation rounded-theme"
          style={{ 
            width: `${widgetWidth}px`,
            minWidth: `${MIN_WIDTH}px`,
            minHeight: snappedHeight ? `${snappedHeight}px` : 'auto',
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Drag Handle - only visible in edit mode */}
          {mode === 'edit' && (
            <div className="drag-handle absolute top-0 left-0 right-0 h-6 sm:h-4 bg-transparent cursor-move hover:opacity-70 active:opacity-50 flex justify-end pr-1 touch-none rounded-t-theme">
              <div className="w-full h-full" />
            </div>
          )}
          
          {/* Edit Button - visible on hover in edit mode */}
          {mode === 'edit' && (
            <button
              className={`absolute -top-3 -left-3 w-8 h-8 sm:w-6 sm:h-6 bg-theme-accent text-theme-paper rounded-full flex items-center justify-center transition-opacity z-10 hover:bg-blue-600 text-sm ${isHovered ? 'opacity-100' : 'sm:opacity-0'}`}
              onClick={openEditModal}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              title="Edit widget"
            >
              ✏️
            </button>
          )}
          
          {/* Delete Button - larger touch target on mobile, always visible on mobile */}
          {mode === 'edit' && (
            <button
              className={`absolute -top-3 -right-3 w-8 h-8 sm:w-6 sm:h-6 bg-theme-accent text-theme-paper rounded-full flex items-center justify-center transition-opacity z-10 hover:bg-red-600 text-lg sm:text-base ${isHovered ? 'opacity-100' : 'sm:opacity-0'}`}
              onClick={() => removeWidget(widget.id)}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              ×
            </button>
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
