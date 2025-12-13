import { useRef, useState, useEffect, useCallback } from 'react';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { Widget, WidgetType } from '../types';
import { useStore } from '../store/useStore';
import { isImageTexture, IMAGE_TEXTURES, getBuiltInTheme } from '../store/useThemeStore';
import { getCustomTheme } from '../store/useCustomThemeStore';
import NumberWidget from './widgets/NumberWidget';
import NumberDisplayWidget from './widgets/NumberDisplayWidget';
import ListWidget from './widgets/ListWidget';
import TextWidget from './widgets/TextWidget';
import CheckboxWidget from './widgets/CheckboxWidget';
import HealthBarWidget from './widgets/HealthBarWidget';
import DiceRollerWidget from './widgets/DiceRollerWidget';
import DiceTrayWidget from './widgets/DiceTrayWidget';
import SpellSlotWidget from './widgets/SpellSlotWidget';
import ImageWidget from './widgets/ImageWidget';
import PoolWidget from './widgets/PoolWidget';
import ConditionWidget from './widgets/ConditionWidget';
import TableWidget from './widgets/TableWidget';
import TimeTrackerWidget from './widgets/TimeTrackerWidget';
import FormWidget from './widgets/FormWidget';
import RestButtonWidget from './widgets/RestButtonWidget';
import ProgressBarWidget from './widgets/ProgressBarWidget';
import WidgetEditModal from './WidgetEditModal';

interface Props {
  widget: Widget;
  scale: number;
}

const GRID_SIZE = 10;

// Minimum dimensions per widget type
const MIN_DIMENSIONS: Record<WidgetType, { width: number; height: number }> = {
  'NUMBER': { width: 140, height: 60 },
  'NUMBER_DISPLAY': { width: 120, height: 80 },
  'LIST': { width: 140, height: 80 },
  'TEXT': { width: 120, height: 60 },
  'CHECKBOX': { width: 140, height: 60 },
  'HEALTH_BAR': { width: 160, height: 80 },
  'DICE_ROLLER': { width: 160, height: 120 },
  'DICE_TRAY': { width: 180, height: 180 },
  'SPELL_SLOT': { width: 160, height: 80 },
  'IMAGE': { width: 100, height: 100 },
  'POOL': { width: 120, height: 80 },
  'TOGGLE_GROUP': { width: 140, height: 60 },
  'TABLE': { width: 180, height: 80 },
  'TIME_TRACKER': { width: 180, height: 140 },
  'FORM': { width: 160, height: 60 },
  'REST_BUTTON': { width: 120, height: 80 },
  'PROGRESS_BAR': { width: 160, height: 80 },
};

export default function DraggableWidget({ widget, scale }: Props) {
  const updateWidgetPosition = useStore((state) => state.updateWidgetPosition);
  const updateWidgetSize = useStore((state) => state.updateWidgetSize);
  const moveWidgetGroup = useStore((state) => state.moveWidgetGroup);
  const removeWidget = useStore((state) => state.removeWidget);
  const detachWidgets = useStore((state) => state.detachWidgets);
  const mode = useStore((state) => state.mode);
  const setEditingWidgetId = useStore((state) => state.setEditingWidgetId);
  const selectedWidgetId = useStore((state) => state.selectedWidgetId);
  const setSelectedWidgetId = useStore((state) => state.setSelectedWidgetId);
  
  // Get current character's theme for texture info
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const characters = useStore((state) => state.characters);
  const activeCharacter = characters.find(c => c.id === activeCharacterId);
  const customTheme = activeCharacter?.theme ? getCustomTheme(activeCharacter.theme) : undefined;
  const builtInTheme = activeCharacter?.theme ? getBuiltInTheme(activeCharacter.theme) : undefined;
  const textureKey = customTheme?.cardTexture || builtInTheme?.cardTexture || 'none';
  const hasImageTexture = isImageTexture(textureKey);
  
  const nodeRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [snappedHeight, setSnappedHeight] = useState<number | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  
  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0 });

  const isSelected = selectedWidgetId === widget.id;
  
  // Get minimum dimensions for this widget type
  const minDimensions = MIN_DIMENSIONS[widget.type] || { width: 120, height: 60 };

  // Measure widget and snap height to grid (only when not manually resized)
  useEffect(() => {
    // If widget has a manual height set, use that
    if (widget.h && widget.h > 0) {
      setSnappedHeight(widget.h);
      return;
    }
    
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
  }, [widget.data, widget.h]);

  const handleWidgetTouchStart = (e: React.TouchEvent) => {
    // Don't interfere with multi-touch gestures (pinch zoom)
    // Let the global handler in Sheet.tsx manage all multi-touch
    if (e.touches.length >= 2) {
      // Cancel any potential drag operation by not selecting
      return;
    }
    
    if (mode === 'edit') {
      // Check if the touch started on an interactive element (table cells, inputs, buttons, etc.)
      const target = e.target as HTMLElement;
      const isInteractiveElement = target.closest('input, button, textarea, select, [data-interactive], td, th');
      
      // If this widget is not selected, select it but allow interactive elements to work
      if (!isSelected) {
        if (!isInteractiveElement) {
          e.preventDefault();
          e.stopPropagation();
        }
        setSelectedWidgetId(widget.id);
      }
    }
  };

  // Handle click/tap on widget - in edit mode, first tap shows controls
  const handleWidgetClick = (e: React.MouseEvent) => {
    if (mode === 'edit' && !showControls) {
      e.preventDefault();
      e.stopPropagation();
      setSelectedWidgetId(widget.id);
    }
  };

  const showControls = isHovered || isSelected;

  const openEditModal = () => {
    setShowEditModal(true);
    setEditingWidgetId(widget.id);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingWidgetId(null);
  };

  const snapToGrid = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;

  // Calculate width based on widget type (used for both display and resize)
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

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Detach widget from any group when resizing
    if (widget.groupId) {
      detachWidgets(widget.id, widget.id);
    }
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    // Get current width and height
    const currentWidth = widget.w || 200;
    const currentHeight = widget.h || 120;
    
    resizeStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      width: currentWidth,
      height: currentHeight,
    };
    
    setIsResizing(true);
  }, [widget.w, widget.h, widget.groupId, widget.id, detachWidgets]);

  const handleResizeMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isResizing) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = (clientX - resizeStartRef.current.mouseX) / scale;
    const deltaY = (clientY - resizeStartRef.current.mouseY) / scale;
    
    const newWidth = snapToGrid(Math.max(minDimensions.width, resizeStartRef.current.width + deltaX));
    const newHeight = snapToGrid(Math.max(minDimensions.height, resizeStartRef.current.height + deltaY));
    
    updateWidgetSize(widget.id, newWidth, newHeight);
  }, [isResizing, scale, minDimensions, widget.id, updateWidgetSize]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Global mouse/touch move and up handlers for resize
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      window.addEventListener('touchmove', handleResizeMove);
      window.addEventListener('touchend', handleResizeEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
        window.removeEventListener('touchmove', handleResizeMove);
        window.removeEventListener('touchend', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

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
  
  // Calculate height - use manual height if set, otherwise use snapped auto height
  const widgetHeight = widget.h && widget.h > 0 ? widget.h : snappedHeight;

  const renderContent = () => {
    // Always render in play mode style - the modal handles editing
    const props = { widget, mode: 'play' as const, width: widgetWidth, height: widgetHeight || 120 };
    switch (widget.type) {
      case 'NUMBER': return <NumberWidget {...props} />;
      case 'NUMBER_DISPLAY': return <NumberDisplayWidget {...props} />;
      case 'LIST': return <ListWidget {...props} />;
      case 'TEXT': return <TextWidget {...props} />;
      case 'CHECKBOX': return <CheckboxWidget {...props} />;
      case 'HEALTH_BAR': return <HealthBarWidget {...props} />;
      case 'DICE_ROLLER': return <DiceRollerWidget {...props} />;
      case 'DICE_TRAY': return <DiceTrayWidget {...props} />;
      case 'SPELL_SLOT': return <SpellSlotWidget {...props} />;
      case 'IMAGE': return <ImageWidget {...props} />;
      case 'POOL': return <PoolWidget {...props} />;
      case 'TOGGLE_GROUP': return <ConditionWidget {...props} />;
      case 'TABLE': return <TableWidget {...props} />;
      case 'TIME_TRACKER': return <TimeTrackerWidget {...props} />;
      case 'FORM': return <FormWidget {...props} />;
      case 'REST_BUTTON': return <RestButtonWidget {...props} />;
      case 'PROGRESS_BAR': return <ProgressBarWidget {...props} />;
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
          className={`react-draggable absolute bg-theme-paper border-[length:var(--border-width)] border-theme-border p-1 sm:p-2 cursor-default group rounded-theme ${isResizing ? 'select-none' : ''}`}
          style={{ 
            width: `${widgetWidth}px`,
            minWidth: `${minDimensions.width}px`,
            height: widgetHeight ? `${widgetHeight}px` : 'auto',
            minHeight: widgetHeight ? `${widgetHeight}px` : (snappedHeight ? `${snappedHeight}px` : 'auto'),
            zIndex: showControls && mode === 'edit' ? 100 : undefined,
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={handleWidgetTouchStart}
          onClick={handleWidgetClick}
        >
          {/* Image texture overlay - grayscale texture tinted with card color */}
          {hasImageTexture && (
            <div
              className="absolute inset-0 pointer-events-none rounded-theme z-0 overflow-hidden"
              style={{ backgroundColor: 'var(--color-paper)' }}
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${IMAGE_TEXTURES[textureKey]})`,
                  backgroundSize: 'cover',
                  filter: 'grayscale(100%)',
                  opacity: 'var(--card-texture-opacity)',
                  mixBlendMode: 'overlay',
                }}
              />
            </div>
          )}
          
          {/* Drag Handle - only visible in edit mode */}
          {mode === 'edit' && (
            <div className="drag-handle absolute -top-2 left-8 right-8 h-8 sm:h-6 sm:top-0 sm:left-0 sm:right-0 bg-transparent cursor-move hover:opacity-70 active:opacity-50 flex justify-center items-center touch-none rounded-t-theme z-[60]">
              {/* Visual grip indicator for mobile - only show when controls visible */}
              {showControls && (
                <div className="sm:hidden flex gap-1">
                  <div className="w-8 h-1 bg-theme-muted/50 rounded-full" />
                </div>
              )}
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

          {/* Touch overlay - blocks interactions with widget content when selected on mobile */}
          {mode === 'edit' && isSelected && (
            <div 
              className="absolute inset-0 z-40 bg-theme-accent/10 rounded-theme"
              onTouchStart={(e) => e.stopPropagation()}
            />
          )}

          {/* Resize Handle - only visible in edit mode when hovered/selected */}
          {mode === 'edit' && showControls && (
            <div
              className="absolute -bottom-1 -right-1 w-6 h-6 cursor-se-resize z-50 flex items-center justify-center"
              onMouseDown={handleResizeStart}
              onTouchStart={handleResizeStart}
              title="Drag to resize"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                className="text-theme-muted hover:text-theme-ink transition-colors"
              >
                <path
                  d="M10 2L2 10M10 6L6 10M10 10L10 10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}

          <div ref={contentRef} className="h-full overflow-hidden relative z-10">
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
