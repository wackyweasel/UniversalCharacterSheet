import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { Widget, WidgetType } from '../types';
import { useStore } from '../store/useStore';
import { useTemplateStore } from '../store/useTemplateStore';
import { useTutorialStore, TUTORIAL_STEPS } from '../store/useTutorialStore';
import { usePrintStore } from '../store/usePrintStore';
import { isImageTexture, IMAGE_TEXTURES, getBuiltInTheme } from '../store/useThemeStore';
import { getCustomTheme } from '../store/useCustomThemeStore';

const EDGE_TOLERANCE = 10; // pixels tolerance for edge detection
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
import MapSketcherWidget from './widgets/MapSketcherWidget';
import RollTableWidget from './widgets/RollTableWidget';
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
  'MAP_SKETCHER': { width: 250, height: 250 },
  'ROLL_TABLE': { width: 140, height: 60 },
};

export default function DraggableWidget({ widget, scale }: Props) {
  const updateWidgetPosition = useStore((state) => state.updateWidgetPosition);
  const updateWidgetSize = useStore((state) => state.updateWidgetSize);
  const moveWidgetGroup = useStore((state) => state.moveWidgetGroup);
  const removeWidget = useStore((state) => state.removeWidget);
  const cloneWidget = useStore((state) => state.cloneWidget);
  const detachWidgets = useStore((state) => state.detachWidgets);
  const toggleWidgetLock = useStore((state) => state.toggleWidgetLock);
  const mode = useStore((state) => state.mode);
  const setEditingWidgetId = useStore((state) => state.setEditingWidgetId);
  const selectedWidgetId = useStore((state) => state.selectedWidgetId);
  const setSelectedWidgetId = useStore((state) => state.setSelectedWidgetId);
  const addTemplate = useTemplateStore((state) => state.addTemplate);
  const tutorialStep = useTutorialStore((state) => state.tutorialStep);
  const advanceTutorial = useTutorialStore((state) => state.advanceTutorial);
  
  // Print mode state
  const textureDisabled = usePrintStore((state) => state.textureDisabled);
  const bordersDisabled = usePrintStore((state) => state.bordersDisabled);
  
  // Get current character's theme for texture info
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const characters = useStore((state) => state.characters);
  const activeCharacter = characters.find(c => c.id === activeCharacterId);
  const customTheme = activeCharacter?.theme ? getCustomTheme(activeCharacter.theme) : undefined;
  const builtInTheme = activeCharacter?.theme ? getBuiltInTheme(activeCharacter.theme) : undefined;
  const textureKey = customTheme?.cardTexture || builtInTheme?.cardTexture || 'none';
  // Always disable texture in print mode
  const hasImageTexture = isImageTexture(textureKey) && !textureDisabled && mode !== 'print';
  
  const nodeRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const printSettingsRef = useRef<HTMLDivElement>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTemplateNameInput, setShowTemplateNameInput] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [snappedHeight, setSnappedHeight] = useState<number | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  
  // Widget types that have print settings customization
  const WIDGETS_WITH_PRINT_SETTINGS: WidgetType[] = ['NUMBER', 'NUMBER_DISPLAY'];
  const hasPrintSettings = WIDGETS_WITH_PRINT_SETTINGS.includes(widget.type);
  
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  
  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0 });

  const isSelected = selectedWidgetId === widget.id;
  
  // Get minimum dimensions for this widget type
  const minDimensions = MIN_DIMENSIONS[widget.type] || { width: 120, height: 60 };

  // Auto-open dropdown for Form widget during tutorial step 17
  useEffect(() => {
    if (tutorialStep === 17 && widget.type === 'FORM') {
      setShowDropdown(true);
    }
  }, [tutorialStep, widget.type]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      // Don't close dropdown during tutorial step 17 for Form widget
      if (tutorialStep === 17 && widget.type === 'FORM') {
        return;
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setShowDeleteConfirm(false);
        setShowTemplateNameInput(false);
        setTemplateName('');
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [showDropdown, tutorialStep, widget.type]);

  // Close print settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (printSettingsRef.current && !printSettingsRef.current.contains(e.target as Node)) {
        setShowPrintSettings(false);
      }
    };

    if (showPrintSettings) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [showPrintSettings]);

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
      // If this widget is not selected, prevent default and select it
      if (!isSelected) {
        e.preventDefault();
        e.stopPropagation();
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

  // Get all widgets to calculate corner rounding for attached widgets
  const allWidgets = activeCharacter ? 
    (activeCharacter.sheets.find(s => s.id === activeCharacter.activeSheetId)?.widgets || []) : [];

  // Calculate which corners should have rounding removed based on attachments
  const cornerRounding = useMemo(() => {
    // Default: all corners rounded
    const corners = { topLeft: true, topRight: true, bottomLeft: true, bottomRight: true };
    
    // Only process if this widget is attached to others
    if (!widget.attachedTo || widget.attachedTo.length === 0) {
      return corners;
    }
    
    const currentWidth = widget.w || 200;
    const currentHeight = widgetHeight || 120;
    const currentBounds = {
      left: widget.x,
      right: widget.x + currentWidth,
      top: widget.y,
      bottom: widget.y + currentHeight,
    };
    
    // Check each attached widget
    for (const attachedId of widget.attachedTo) {
      const attachedWidget = allWidgets.find(w => w.id === attachedId);
      if (!attachedWidget) continue;
      
      // Get attached widget dimensions from DOM if available, otherwise estimate
      const attachedEl = document.querySelector(`[data-widget-id="${attachedId}"]`) as HTMLElement;
      const attachedWidth = attachedWidget.w || (attachedEl ? attachedEl.offsetWidth : 200);
      const attachedHeight = attachedWidget.h || (attachedEl ? attachedEl.offsetHeight : 120);
      
      const attachedBounds = {
        left: attachedWidget.x,
        right: attachedWidget.x + attachedWidth,
        top: attachedWidget.y,
        bottom: attachedWidget.y + attachedHeight,
      };
      
      // Check if attached widget is on the left side
      if (Math.abs(attachedBounds.right - currentBounds.left) <= EDGE_TOLERANCE) {
        // Check if top-left corner is covered
        if (attachedBounds.top <= currentBounds.top + EDGE_TOLERANCE && 
            attachedBounds.bottom >= currentBounds.top - EDGE_TOLERANCE) {
          corners.topLeft = false;
        }
        // Check if bottom-left corner is covered
        if (attachedBounds.top <= currentBounds.bottom + EDGE_TOLERANCE && 
            attachedBounds.bottom >= currentBounds.bottom - EDGE_TOLERANCE) {
          corners.bottomLeft = false;
        }
      }
      
      // Check if attached widget is on the right side
      if (Math.abs(attachedBounds.left - currentBounds.right) <= EDGE_TOLERANCE) {
        // Check if top-right corner is covered
        if (attachedBounds.top <= currentBounds.top + EDGE_TOLERANCE && 
            attachedBounds.bottom >= currentBounds.top - EDGE_TOLERANCE) {
          corners.topRight = false;
        }
        // Check if bottom-right corner is covered
        if (attachedBounds.top <= currentBounds.bottom + EDGE_TOLERANCE && 
            attachedBounds.bottom >= currentBounds.bottom - EDGE_TOLERANCE) {
          corners.bottomRight = false;
        }
      }
      
      // Check if attached widget is on the top side
      if (Math.abs(attachedBounds.bottom - currentBounds.top) <= EDGE_TOLERANCE) {
        // Check if top-left corner is covered
        if (attachedBounds.left <= currentBounds.left + EDGE_TOLERANCE && 
            attachedBounds.right >= currentBounds.left - EDGE_TOLERANCE) {
          corners.topLeft = false;
        }
        // Check if top-right corner is covered
        if (attachedBounds.left <= currentBounds.right + EDGE_TOLERANCE && 
            attachedBounds.right >= currentBounds.right - EDGE_TOLERANCE) {
          corners.topRight = false;
        }
      }
      
      // Check if attached widget is on the bottom side
      if (Math.abs(attachedBounds.top - currentBounds.bottom) <= EDGE_TOLERANCE) {
        // Check if bottom-left corner is covered
        if (attachedBounds.left <= currentBounds.left + EDGE_TOLERANCE && 
            attachedBounds.right >= currentBounds.left - EDGE_TOLERANCE) {
          corners.bottomLeft = false;
        }
        // Check if bottom-right corner is covered
        if (attachedBounds.left <= currentBounds.right + EDGE_TOLERANCE && 
            attachedBounds.right >= currentBounds.right - EDGE_TOLERANCE) {
          corners.bottomRight = false;
        }
      }
    }
    
    return corners;
  }, [widget.attachedTo, widget.x, widget.y, widget.w, widgetHeight, allWidgets]);

  // Generate border-radius style based on corner rounding
  const borderRadiusStyle = useMemo(() => {
    const r = 'var(--border-radius)';
    const zero = '0px';
    return {
      borderTopLeftRadius: cornerRounding.topLeft ? r : zero,
      borderTopRightRadius: cornerRounding.topRight ? r : zero,
      borderBottomLeftRadius: cornerRounding.bottomLeft ? r : zero,
      borderBottomRightRadius: cornerRounding.bottomRight ? r : zero,
    };
  }, [cornerRounding]);

  const renderContent = () => {
    // Always render in play mode style - the modal handles editing
    // But pass 'print' mode when in print mode for special rendering
    const widgetMode = mode === 'print' ? 'print' : 'play';
    const props = { widget, mode: widgetMode as 'play' | 'print', width: widgetWidth, height: widgetHeight || 120 };
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
      case 'MAP_SKETCHER': return <MapSketcherWidget {...props} />;
      case 'ROLL_TABLE': return <RollTableWidget {...props} />;
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
        handle=".drag-handle"
        disabled={mode === 'play' || mode === 'print'}
      >
        <div 
          ref={nodeRef}
          data-widget-id={widget.id}
          data-group-id={widget.groupId || ''}
          className={`react-draggable absolute bg-theme-paper border-[length:var(--border-width)] border-theme-border p-1 cursor-default group ${isResizing ? 'select-none' : ''} ${mode === 'print' && !hasPrintSettings ? 'pointer-events-none' : ''}`}
          style={{ 
            width: `${widgetWidth}px`,
            minWidth: `${minDimensions.width}px`,
            height: widgetHeight ? `${widgetHeight}px` : 'auto',
            minHeight: widgetHeight ? `${widgetHeight}px` : (snappedHeight ? `${snappedHeight}px` : 'auto'),
            zIndex: showDropdown ? 200 : showPrintSettings ? 9999 : (showControls && mode === 'print' && hasPrintSettings) ? 9998 : (showControls && mode === 'edit' ? 100 : undefined),
            ...borderRadiusStyle,
            ...(bordersDisabled ? { borderWidth: '0px' } : {}),
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={handleWidgetTouchStart}
          onClick={handleWidgetClick}
        >
          {/* Image texture overlay - grayscale texture tinted with card color */}
          {hasImageTexture && (
            <div
              className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
              style={{ backgroundColor: 'var(--color-paper)', ...borderRadiusStyle }}
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
            <div className="drag-handle absolute -top-2 left-8 right-8 h-8 bg-transparent cursor-move hover:opacity-70 active:opacity-50 flex justify-center items-center touch-none rounded-t-theme z-[60]">
              {/* Visual grip indicator - only show when controls visible */}
              {showControls && (
                <div className="flex gap-1">
                  <div className="w-8 h-1 bg-theme-muted/50 rounded-full" />
                </div>
              )}
            </div>
          )}
          
          {/* Menu Button - visible on hover/touch in edit mode, hidden during early tutorial steps */}
          {/* For Form widget during tutorial step 16, always show the button */}
          {/* Also keep visible when dropdown is open (showDropdown) to prevent it from disappearing when cursor leaves */}
          {mode === 'edit' && (showControls || showDropdown || (tutorialStep === 16 && widget.type === 'FORM')) && (tutorialStep === null || tutorialStep >= 16) && (
            <div className="absolute -top-3 -right-3 z-[200]" ref={dropdownRef}>
              <button
                data-tutorial={widget.type === 'FORM' ? 'widget-menu-FORM' : undefined}
                className={`w-8 h-8 bg-theme-accent text-theme-paper rounded-full flex items-center justify-center transition-opacity hover:bg-theme-accent/80 text-lg ${tutorialStep === 16 && widget.type === 'FORM' ? 'outline outline-4 outline-blue-500 outline-offset-2' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  // Advance tutorial if on step 16 (widget-menu) and this is a Form widget
                  if (tutorialStep === 16 && widget.type === 'FORM' && TUTORIAL_STEPS[16]?.id === 'widget-menu') {
                    advanceTutorial();
                  }
                  setShowDropdown(!showDropdown);
                  if (showDropdown) {
                    setShowDeleteConfirm(false);
                    setShowTemplateNameInput(false);
                    setTemplateName('');
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                title="Widget options"
              >
                ⋮
              </button>
              
              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute top-full right-0 mt-1 bg-theme-paper border-[length:var(--border-width)] border-theme-border rounded-theme shadow-theme min-w-[140px] overflow-hidden z-[200]">
                  <button
                    data-tutorial={widget.type === 'FORM' ? 'edit-button-FORM' : undefined}
                    className={`w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors ${tutorialStep === 17 && widget.type === 'FORM' ? 'bg-blue-500 text-white' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Advance tutorial if on step 17 (edit-widget) and this is a Form widget
                      if (tutorialStep === 17 && widget.type === 'FORM' && TUTORIAL_STEPS[17]?.id === 'edit-widget') {
                        advanceTutorial();
                      }
                      setShowDropdown(false);
                      openEditModal();
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDropdown(false);
                      cloneWidget(widget.id);
                    }}
                  >
                    Clone
                  </button>
                  <button
                    className="w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDropdown(false);
                      toggleWidgetLock(widget.id);
                    }}
                  >
                    {widget.locked ? 'Unlock' : 'Lock'}
                  </button>
                  {!showTemplateNameInput ? (
                    <button
                      className="w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTemplateName(widget.data.label || '');
                        setShowTemplateNameInput(true);
                      }}
                    >
                      Create Template
                    </button>
                  ) : (
                    <div className="px-2 py-2">
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Template name..."
                        className="w-full px-2 py-1 text-sm border border-theme-border rounded bg-theme-paper text-theme-ink mb-2"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Enter' && templateName.trim()) {
                            addTemplate(widget, templateName.trim());
                            setShowDropdown(false);
                            setShowTemplateNameInput(false);
                            setTemplateName('');
                          } else if (e.key === 'Escape') {
                            setShowTemplateNameInput(false);
                            setTemplateName('');
                          }
                        }}
                      />
                      <div className="flex gap-1">
                        <button
                          className="flex-1 px-2 py-1 text-xs bg-theme-accent text-theme-paper rounded hover:bg-theme-accent/80 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (templateName.trim()) {
                              addTemplate(widget, templateName.trim());
                              setShowDropdown(false);
                              setShowTemplateNameInput(false);
                              setTemplateName('');
                            }
                          }}
                        >
                          Save
                        </button>
                        <button
                          className="flex-1 px-2 py-1 text-xs text-theme-muted hover:bg-theme-border/50 rounded transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowTemplateNameInput(false);
                            setTemplateName('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="border-t border-theme-border" />
                  {!showDeleteConfirm ? (
                    <button
                      className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(true);
                      }}
                    >
                      Delete
                    </button>
                  ) : (
                    <div className="flex">
                      <button
                        className="flex-1 px-3 py-2 text-sm text-red-500 hover:bg-red-500 hover:text-white transition-colors font-bold"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDropdown(false);
                          setShowDeleteConfirm(false);
                          removeWidget(widget.id);
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        className="flex-1 px-3 py-2 text-sm text-theme-muted hover:bg-theme-accent hover:text-theme-paper transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(false);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Print Settings Button - visible on hover in print mode for widgets with print settings */}
          {mode === 'print' && hasPrintSettings && (showControls || showPrintSettings) && (
            <div className="absolute -top-3 -right-3 z-[9999]" ref={printSettingsRef} data-print-hide="true">
              <button
                className="w-8 h-8 bg-theme-accent text-theme-paper rounded-full flex items-center justify-center transition-opacity hover:bg-theme-accent/80 text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPrintSettings(!showPrintSettings);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                title="Print settings"
              >
                ⚙️
              </button>
              
              {/* Print Settings Dropdown */}
              {showPrintSettings && (
                <div className="absolute top-full right-0 mt-1 bg-theme-paper border-[length:var(--border-width)] border-theme-border rounded-theme shadow-theme min-w-[160px] overflow-hidden z-[9999] p-2">
                  {/* Number Tracker specific settings */}
                  {(widget.type === 'NUMBER' || widget.type === 'NUMBER_DISPLAY') && (
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-theme-ink hover:bg-theme-accent/10 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={widget.data.printSettings?.hideValues ?? false}
                        onChange={(e) => {
                          updateWidgetData(widget.id, {
                            printSettings: {
                              ...widget.data.printSettings,
                              hideValues: e.target.checked,
                            },
                          });
                        }}
                        className="w-4 h-4 accent-theme-accent"
                      />
                      Hide values
                    </label>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Touch overlay - blocks interactions with widget content when selected on mobile */}
          {mode === 'edit' && isSelected && (
            <div 
              className="absolute inset-0 z-40 bg-theme-accent/10"
              style={borderRadiusStyle}
              onTouchStart={(e) => e.stopPropagation()}
            />
          )}

          {/* Locked overlay - blocks interactions with widget content in play mode when locked */}
          {mode === 'play' && widget.locked && (
            <div 
              className="absolute inset-0 z-40 cursor-not-allowed"
              style={borderRadiusStyle}
              title="This widget is locked"
            >
              {/* Small lock indicator in corner */}
              <div className="absolute top-1 right-1 text-theme-muted/50 text-xs">
                🔒
              </div>
            </div>
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

          <div ref={contentRef} className="h-full overflow-hidden relative z-10 pt-1 pl-1">
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
