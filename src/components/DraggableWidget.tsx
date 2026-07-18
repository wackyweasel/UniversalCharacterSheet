import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { Widget, WidgetType } from '../types';
import { useStore } from '../store/useStore';
import { useTemplateStore } from '../store/useTemplateStore';
import { useTutorialStore, TUTORIAL_STEPS } from '../store/useTutorialStore';
import { usePrintStore } from '../store/usePrintStore';
import { isImageTexture, IMAGE_TEXTURES, getBuiltInTheme } from '../store/useThemeStore';
import { getCustomTheme } from '../store/useCustomThemeStore';
import { DotsVerticalIcon } from './icons';

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
import InitiativeTrackerWidget from './widgets/InitiativeTrackerWidget';
import DeckWidget from './widgets/DeckWidget';
import TimerWidget from './widgets/TimerWidget';
import StepDiceWidget from './widgets/StepDiceWidget';
import WidgetEditModal from './WidgetEditModal';
import { Tooltip } from './Tooltip';
import { useTouchCameraPinchCancellation } from '../hooks/useTouchCamera';

interface Props {
  widget: Widget;
  scale: number;
}

const GRID_SIZE = 10;

// Minimum dimensions per widget type
const MIN_DIMENSIONS: Record<WidgetType, { width: number; height: number }> = {
  'NUMBER': { width: 60, height: 30 },
  'NUMBER_DISPLAY': { width: 50, height: 40 },
  'LIST': { width: 60, height: 40 },
  'TEXT': { width: 50, height: 30 },
  'CHECKBOX': { width: 60, height: 30 },
  'HEALTH_BAR': { width: 80, height: 40 },
  'DICE_ROLLER': { width: 80, height: 60 },
  'DICE_TRAY': { width: 70, height: 60 },
  'SPELL_SLOT': { width: 80, height: 40 },
  'IMAGE': { width: 40, height: 40 },
  'POOL': { width: 60, height: 40 },
  'TOGGLE_GROUP': { width: 60, height: 30 },
  'TABLE': { width: 80, height: 40 },
  'TIME_TRACKER': { width: 90, height: 70 },
  'FORM': { width: 80, height: 30 },
  'REST_BUTTON': { width: 60, height: 40 },
  'PROGRESS_BAR': { width: 50, height: 20 },
  'MAP_SKETCHER': { width: 100, height: 100 },
  'ROLL_TABLE': { width: 70, height: 30 },
  'INITIATIVE_TRACKER': { width: 90, height: 60 },
  'DECK': { width: 70, height: 40 },
  'TIMER': { width: 80, height: 60 },
  'STEP_DICE': { width: 70, height: 40 },
};

export default function DraggableWidget({ widget, scale }: Props) {
  const updateWidgetPosition = useStore((state) => state.updateWidgetPosition);
  const updateWidgetSize = useStore((state) => state.updateWidgetSize);
  const moveWidgetGroup = useStore((state) => state.moveWidgetGroup);
  const removeWidget = useStore((state) => state.removeWidget);
  const cloneWidget = useStore((state) => state.cloneWidget);
  const detachWidgets = useStore((state) => state.detachWidgets);
  const toggleWidgetLock = useStore((state) => state.toggleWidgetLock);
  const moveWidgetToSheet = useStore((state) => state.moveWidgetToSheet);
  const getWidgetsInGroup = useStore((state) => state.getWidgetsInGroup);
  const cloneGroup = useStore((state) => state.cloneGroup);
  const removeGroup = useStore((state) => state.removeGroup);
  const toggleGroupLock = useStore((state) => state.toggleGroupLock);
  const moveGroupToSheet = useStore((state) => state.moveGroupToSheet);
  const detachAllInGroup = useStore((state) => state.detachAllInGroup);
  const mode = useStore((state) => state.mode);
  const setEditingWidgetId = useStore((state) => state.setEditingWidgetId);
  const selectedWidgetId = useStore((state) => state.selectedWidgetId);
  const setSelectedWidgetId = useStore((state) => state.setSelectedWidgetId);
  const addTemplate = useTemplateStore((state) => state.addTemplate);
  const addGroupTemplate = useTemplateStore((state) => state.addGroupTemplate);
  const tutorialStep = useTutorialStore((state) => state.tutorialStep);
  const advanceTutorial = useTutorialStore((state) => state.advanceTutorial);
  const isCurrentTutorialStep = (id: string) => tutorialStep !== null && TUTORIAL_STEPS[tutorialStep]?.id === id;
  
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
  
  // Get sheets for "Move to Another Sheet" feature
  const sheets = activeCharacter?.sheets || [];
  const hasMultipleSheets = sheets.length > 1;
  
  const nodeRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const printSettingsRef = useRef<HTMLDivElement>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownAlign, setDropdownAlign] = useState<'left' | 'right'>('right');
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTemplateNameInput, setShowTemplateNameInput] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showMoveToSheet, setShowMoveToSheet] = useState(false);
  // Group action states
  const [showGroupDeleteConfirm, setShowGroupDeleteConfirm] = useState(false);
  const [showGroupTemplateNameInput, setShowGroupTemplateNameInput] = useState(false);
  const [groupTemplateName, setGroupTemplateName] = useState('');
  const [showGroupMoveToSheet, setShowGroupMoveToSheet] = useState(false);
  // Dropdown tab: 'widget' or 'group'
  const [dropdownTab, setDropdownTab] = useState<'widget' | 'group'>('widget');
  const [isHovered, setIsHovered] = useState(false);
  const [snappedHeight, setSnappedHeight] = useState<number | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  
  // Widget types that have print settings customization
  const WIDGETS_WITH_PRINT_SETTINGS: WidgetType[] = ['NUMBER', 'NUMBER_DISPLAY'];
  const hasPrintSettings = WIDGETS_WITH_PRINT_SETTINGS.includes(widget.type);
  
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  
  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0 });
  const isDraggingRef = useRef(false);
  const pinchCanceledDragRef = useRef(false);
  const widgetTouchActiveRef = useRef(false);
  const selectedBeforeTouchRef = useRef<string | null>(null);

  useTouchCameraPinchCancellation(() => {
    if (isDraggingRef.current) pinchCanceledDragRef.current = true;
    if (isResizingRef.current) {
      isResizingRef.current = false;
      updateWidgetSize(widget.id, resizeStartRef.current.width, resizeStartRef.current.height);
      setIsResizing(false);
    }
    if (widgetTouchActiveRef.current) {
      widgetTouchActiveRef.current = false;
      setSelectedWidgetId(selectedBeforeTouchRef.current);
    }
  });

  const isSelected = selectedWidgetId === widget.id;
  const shouldShowTemplateTutorialMenu = widget.type === 'FORM' && (
    isCurrentTutorialStep('templates-open-widget-menu') ||
    isCurrentTutorialStep('templates-open-group-menu')
  );
  const isAutomationAttackDiceRoller = widget.type === 'DICE_ROLLER' && String(widget.data?.label || '').toLowerCase() === 'attack';
  const shouldShowAutomationTutorialMenu =
    (widget.type === 'NUMBER_DISPLAY' && isCurrentTutorialStep('automation-open-number-display-menu')) ||
    (isAutomationAttackDiceRoller && isCurrentTutorialStep('automation-open-dice-menu'));
  const shouldShowAutomationTutorialEdit =
    (widget.type === 'NUMBER_DISPLAY' && isCurrentTutorialStep('automation-edit-number-display')) ||
    (isAutomationAttackDiceRoller && isCurrentTutorialStep('automation-edit-dice-roller'));
  const shouldHighlightWidgetTemplateSave = isCurrentTutorialStep('templates-save-widget-template');
  const shouldHighlightWidgetTemplateConfirm = isCurrentTutorialStep('templates-name-widget-template') && templateName.trim().length > 0;
  const shouldHighlightGroupTab = isCurrentTutorialStep('templates-open-group-tab');
  const shouldHighlightGroupTemplateSave = isCurrentTutorialStep('templates-save-group-template');
  const shouldHighlightGroupTemplateConfirm = isCurrentTutorialStep('templates-name-group-template') && groupTemplateName.trim().length > 0;
  const widgetMenuTutorialTarget = widget.type === 'DICE_ROLLER'
    ? isAutomationAttackDiceRoller ? 'widget-menu-DICE_ROLLER' : undefined
    : `widget-menu-${widget.type}`;
  const editButtonTutorialTarget = widget.type === 'DICE_ROLLER'
    ? isAutomationAttackDiceRoller ? 'edit-button-DICE_ROLLER' : undefined
    : `edit-button-${widget.type}`;
  
  // Get minimum dimensions for this widget type
  const minDimensions = MIN_DIMENSIONS[widget.type] || { width: 120, height: 60 };

  // Auto-open dropdown for the original form tutorial step only. Automation edit steps keep
  // the dropdown opened by the widget the user actually clicked.
  useEffect(() => {
    if (tutorialStep === 17 && widget.type === 'FORM') {
      setShowDropdown(true);
    }
  }, [tutorialStep, widget.type]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      // Don't close dropdown during the original form tutorial step that points inside it.
      if (tutorialStep === 17 && widget.type === 'FORM') {
        return;
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setShowDeleteConfirm(false);
        setShowTemplateNameInput(false);
        setTemplateName('');
        setShowMoveToSheet(false);
        // Reset group action states
        setShowGroupDeleteConfirm(false);
        setShowGroupTemplateNameInput(false);
        setGroupTemplateName('');
        setShowGroupMoveToSheet(false);
        setDropdownTab('widget');
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
      widgetTouchActiveRef.current = true;
      selectedBeforeTouchRef.current = selectedWidgetId;
      // If this widget is not selected, select it without canceling the native touch sequence
      if (!isSelected) {
        setSelectedWidgetId(widget.id);
      }
    }
  };

  const handleWidgetTouchEnd = () => {
    widgetTouchActiveRef.current = false;
  };

  // Handle click/tap on widget - in edit mode, select it to show controls
  const handleWidgetClick = (e: React.MouseEvent) => {
    if (mode === 'edit' && !isSelected) {
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
    
    isResizingRef.current = true;
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
    isResizingRef.current = false;
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
    isDraggingRef.current = true;
    pinchCanceledDragRef.current = false;
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
    isDraggingRef.current = false;
    if (pinchCanceledDragRef.current) {
      pinchCanceledDragRef.current = false;
      if (widget.groupId) {
        const siblings = useStore.getState().getWidgetsInGroup(widget.groupId);
        document.querySelectorAll(`[data-group-id="${widget.groupId}"]`).forEach((element) => {
          const sibling = siblings.find(candidate => candidate.id === element.getAttribute('data-widget-id'));
          if (sibling) {
            (element as HTMLElement).style.transform = `translate(${sibling.x}px, ${sibling.y}px)`;
          }
        });
      }
      return;
    }

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

  // Calculate texture positioning for grouped widgets
  // When widgets are attached together, the texture should stretch to cover the whole group
  const groupTextureStyle = useMemo(() => {
    // If not part of a group, use default cover behavior
    if (!widget.groupId) {
      return {
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    
    // Get all widgets in the same group
    const groupWidgets = allWidgets.filter(w => w.groupId === widget.groupId);
    
    if (groupWidgets.length <= 1) {
      return {
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    
    // Calculate the bounding box of the entire group
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    for (const gw of groupWidgets) {
      const gwEl = document.querySelector(`[data-widget-id="${gw.id}"]`) as HTMLElement;
      const gwWidth = gw.w || (gwEl ? gwEl.offsetWidth : 200);
      const gwHeight = gw.h || (gwEl ? gwEl.offsetHeight : 120);
      
      minX = Math.min(minX, gw.x);
      minY = Math.min(minY, gw.y);
      maxX = Math.max(maxX, gw.x + gwWidth);
      maxY = Math.max(maxY, gw.y + gwHeight);
    }
    
    const groupWidth = maxX - minX;
    const groupHeight = maxY - minY;
    
    // Calculate this widget's offset within the group
    const offsetX = widget.x - minX;
    const offsetY = widget.y - minY;
    
    // The background size should be the group size
    // The background position should offset to show the correct portion
    return {
      backgroundSize: `${groupWidth}px ${groupHeight}px`,
      backgroundPosition: `-${offsetX}px -${offsetY}px`,
    };
  }, [widget.groupId, widget.x, widget.y, widget.w, widgetHeight, allWidgets]);

  const renderContent = () => {
    // Always render in play mode style - the modal handles editing
    // But pass 'print' mode when in print mode for special rendering
    const widgetMode = mode === 'print' ? 'print' : 'play';
    const contentInset = 16;
    const props = {
      widget,
      mode: widgetMode as 'play' | 'print',
      width: Math.max(20, widgetWidth - contentInset),
      height: Math.max(20, (widgetHeight || 120) - contentInset),
    };
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
      case 'INITIATIVE_TRACKER': return <InitiativeTrackerWidget {...props} />;
      case 'DECK': return <DeckWidget {...props} />;
      case 'TIMER': return <TimerWidget {...props} />;
      case 'STEP_DICE': return <StepDiceWidget {...props} />;
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
          data-tutorial={`widget-${widget.type}`}
          data-group-id={widget.groupId || ''}
          className={`react-draggable widget-surface absolute bg-theme-paper border-[length:var(--border-width)] border-theme-border cursor-default group ${isResizing ? 'select-none' : ''} ${mode === 'print' && !hasPrintSettings ? 'pointer-events-none' : ''}`}
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
          onTouchEnd={handleWidgetTouchEnd}
          onTouchCancel={handleWidgetTouchEnd}
          onClick={handleWidgetClick}
        >
          {/* Image texture overlay - grayscale texture tinted with card color */}
          {/* When widgets are attached together, the texture stretches to cover the whole group */}
          {hasImageTexture && (
            <div
              className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
              style={{ backgroundColor: 'var(--color-paper)', ...borderRadiusStyle }}
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${IMAGE_TEXTURES[textureKey]})`,
                  ...groupTextureStyle,
                  filter: 'grayscale(100%)',
                  opacity: 'var(--card-texture-opacity)',
                  mixBlendMode: 'overlay',
                }}
              />
            </div>
          )}
          
          {/* Drag Handle - only visible in edit mode */}
          {mode === 'edit' && (
            <div className={`drag-handle absolute -top-2 left-8 ${widget.type === 'FORM' || widget.type === 'NUMBER' || widget.type === 'NUMBER_DISPLAY' || widget.type === 'LIST' || widget.type === 'CHECKBOX' || widget.type === 'TOGGLE_GROUP' || widget.type === 'HEALTH_BAR' || widget.type === 'PROGRESS_BAR' || widget.type === 'POOL' || widget.type === 'TABLE' ? 'right-20' : 'right-8'} h-8 bg-transparent cursor-move hover:opacity-70 active:opacity-50 flex justify-center items-center touch-none rounded-t-theme z-[60]`}>
              {/* Visual grip indicator - only show when controls visible */}
              {showControls && (
                <div className="flex gap-1">
                  <div className="w-8 h-1 bg-theme-muted/50 rounded-full" />
                </div>
              )}
            </div>
          )}
          
          {/* Menu Button - visible for the selected widget in edit mode, hidden during early tutorial steps */}
          {/* For Form widget during tutorial step 16, always show the button */}
          {/* Also keep visible when dropdown is open (showDropdown) to prevent it from disappearing when cursor leaves */}
          {mode === 'edit' && (showControls || showDropdown || (tutorialStep === 16 && widget.type === 'FORM') || shouldShowTemplateTutorialMenu || shouldShowAutomationTutorialMenu) && (tutorialStep === null || tutorialStep >= 16) && (
            <div className="absolute top-1 right-1 z-[200] flex items-center gap-1" ref={dropdownRef}>
              <Tooltip content="Widget options">
                <button
                  data-tutorial={widgetMenuTutorialTarget}
                  aria-label={`Options for ${widget.data.label || widget.type}`}
                  aria-expanded={showDropdown}
                  className={`widget-menu-trigger w-8 h-8 bg-theme-ink text-theme-paper border border-theme-ink rounded-button shadow-theme flex items-center justify-center transition-[filter] hover:brightness-125 ${(tutorialStep === 16 && widget.type === 'FORM') || shouldShowTemplateTutorialMenu || shouldShowAutomationTutorialMenu ? 'outline outline-4 outline-blue-500 outline-offset-2' : ''}`}
                  style={{ transform: `scale(${1 / scale})`, transformOrigin: 'top right' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Advance tutorial if on step 16 (widget-menu) and this is a Form widget
                    if (tutorialStep === 16 && widget.type === 'FORM' && TUTORIAL_STEPS[16]?.id === 'widget-menu') {
                      advanceTutorial();
                    }
                    if (widget.type === 'FORM' && (isCurrentTutorialStep('templates-open-widget-menu') || isCurrentTutorialStep('templates-open-group-menu'))) {
                      advanceTutorial();
                    }
                    if (shouldShowAutomationTutorialMenu) {
                      advanceTutorial();
                    }
                    if (!showDropdown) {
                      setDropdownAlign(e.currentTarget.getBoundingClientRect().right < 198 ? 'left' : 'right');
                    }
                    setShowDropdown(!showDropdown);
                    if (showDropdown) {
                      setShowDeleteConfirm(false);
                      setShowTemplateNameInput(false);
                      setTemplateName('');
                      setShowMoveToSheet(false);
                      // Reset group action states
                      setShowGroupDeleteConfirm(false);
                      setShowGroupTemplateNameInput(false);
                      setGroupTemplateName('');
                      setShowGroupMoveToSheet(false);
                      setDropdownTab('widget');
                    }
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <DotsVerticalIcon className="w-4 h-4" />
                </button>
              </Tooltip>
              
              {/* Dropdown Menu with Tabs */}
              {showDropdown && (
                <div
                  className={`widget-options-menu absolute top-full mt-1 bg-theme-paper border-[length:var(--border-width)] border-theme-border rounded-theme shadow-theme min-w-[190px] overflow-hidden z-[200] font-body ${dropdownAlign === 'left' ? 'left-0' : 'right-0'}`}
                  style={{ transform: `scale(${1 / scale})`, transformOrigin: dropdownAlign === 'left' ? 'top left' : 'top right' }}
                >
                  {/* Tab Header - only show if widget is part of a group */}
                  {widget.groupId && (
                    <div className="flex border-b border-theme-border">
                      <Tooltip content="Show actions for this widget" placement="left">
                        <button
                          className={`flex-1 px-3 py-1.5 text-xs font-semibold transition-colors ${dropdownTab === 'widget' ? 'bg-theme-accent text-theme-paper' : 'text-theme-muted hover:bg-theme-border/30'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDropdownTab('widget');
                            // Reset sub-states when switching tabs
                            setShowDeleteConfirm(false);
                            setShowTemplateNameInput(false);
                            setShowMoveToSheet(false);
                            setShowGroupDeleteConfirm(false);
                            setShowGroupTemplateNameInput(false);
                            setShowGroupMoveToSheet(false);
                          }}
                        >
                          Widget
                        </button>
                      </Tooltip>
                      <Tooltip content="Show actions for the whole group" placement="left">
                        <button
                          data-tutorial="template-group-tab"
                          className={`flex-1 px-3 py-1.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${dropdownTab === 'group' ? 'bg-theme-accent text-theme-paper' : 'text-theme-muted hover:bg-theme-border/30'} ${shouldHighlightGroupTab ? 'ring-4 ring-blue-500 ring-inset' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDropdownTab('group');
                            if (isCurrentTutorialStep('templates-open-group-tab')) {
                              advanceTutorial();
                            }
                            // Reset sub-states when switching tabs
                            setShowDeleteConfirm(false);
                            setShowTemplateNameInput(false);
                            setShowMoveToSheet(false);
                            setShowGroupDeleteConfirm(false);
                            setShowGroupTemplateNameInput(false);
                            setShowGroupMoveToSheet(false);
                          }}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                          Group
                        </button>
                      </Tooltip>
                    </div>
                  )}
                  
                  {/* Widget Actions Tab */}
                  {dropdownTab === 'widget' && (
                    <>
                      <Tooltip content="Open this widget's editor" placement="left">
                        <button
                          data-tutorial={editButtonTutorialTarget}
                          className={`w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center gap-2 ${(tutorialStep === 17 && widget.type === 'FORM') || shouldShowAutomationTutorialEdit ? 'bg-blue-500 text-white' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (tutorialStep === 17 && widget.type === 'FORM' && TUTORIAL_STEPS[17]?.id === 'edit-widget') {
                              advanceTutorial();
                            }
                            if (shouldShowAutomationTutorialEdit) {
                              advanceTutorial();
                            }
                            setShowDropdown(false);
                            openEditModal();
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          Edit
                        </button>
                      </Tooltip>
                      <Tooltip content="Create a copy of this widget" placement="left">
                        <button
                          className="w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDropdown(false);
                            cloneWidget(widget.id);
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                          Clone
                        </button>
                      </Tooltip>
                      <Tooltip content={widget.locked ? 'Unlock this widget so it can be moved or edited' : 'Lock this widget to prevent changes'} placement="left">
                        <button
                          className="w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDropdown(false);
                            toggleWidgetLock(widget.id);
                          }}
                        >
                          {widget.locked ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                          )}
                          {widget.locked ? 'Unlock' : 'Lock'}
                        </button>
                      </Tooltip>
                      {!showTemplateNameInput ? (
                        <Tooltip content="Save this widget as a reusable template (templates are at the bottom of the widget selection panel)" placement="left">
                          <button
                            data-tutorial="template-save-widget"
                            className={`w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center gap-2 ${shouldHighlightWidgetTemplateSave ? 'bg-blue-500 text-white font-bold' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setTemplateName(isCurrentTutorialStep('templates-save-widget-template') ? '' : widget.data.label || '');
                              setShowTemplateNameInput(true);
                              if (isCurrentTutorialStep('templates-save-widget-template')) {
                                advanceTutorial();
                              }
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                            Save as Template
                          </button>
                        </Tooltip>
                      ) : (
                        <div className="px-2 py-2">
                          <input
                            data-tutorial={templateName.trim() ? 'template-widget-name-input' : 'template-widget-name-target'}
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
                                if (isCurrentTutorialStep('templates-name-widget-template')) {
                                  advanceTutorial();
                                }
                              } else if (e.key === 'Escape') {
                                setShowTemplateNameInput(false);
                                setTemplateName('');
                              }
                            }}
                          />
                          <div className="flex gap-1">
                            <Tooltip content="Save this widget template" placement="left">
                              <button
                                data-tutorial={templateName.trim() ? 'template-widget-name-target' : 'template-widget-save-confirm'}
                                className={`flex-1 px-2 py-1 text-xs bg-theme-accent text-theme-paper rounded hover:bg-theme-accent/80 transition-colors ${shouldHighlightWidgetTemplateConfirm ? 'ring-4 ring-blue-500 ring-offset-1 font-bold' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (templateName.trim()) {
                                    addTemplate(widget, templateName.trim());
                                    setShowDropdown(false);
                                    setShowTemplateNameInput(false);
                                    setTemplateName('');
                                    if (isCurrentTutorialStep('templates-name-widget-template')) {
                                      advanceTutorial();
                                    }
                                  }
                                }}
                              >
                                Save
                              </button>
                            </Tooltip>
                            <Tooltip content="Cancel template creation" placement="left">
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
                            </Tooltip>
                          </div>
                        </div>
                      )}
                      {hasMultipleSheets && (
                        <>
                          {!showMoveToSheet ? (
                            <Tooltip content="Move this widget to another sheet" placement="left">
                              <button
                                className="w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowMoveToSheet(true);
                                }}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
                                Move to Sheet
                              </button>
                            </Tooltip>
                          ) : (
                            <div className="px-2 py-2">
                              <div className="text-xs text-theme-muted mb-2">Select target sheet:</div>
                              {sheets
                                .filter(s => s.id !== activeCharacter?.activeSheetId)
                                .map(sheet => (
                                  <Tooltip key={sheet.id} content={`Move this widget to ${sheet.name}`} placement="left">
                                    <button
                                      className="w-full px-2 py-1.5 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors rounded mb-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveWidgetToSheet(widget.id, sheet.id);
                                        setShowDropdown(false);
                                        setShowMoveToSheet(false);
                                      }}
                                    >
                                      {sheet.name}
                                    </button>
                                  </Tooltip>
                                ))}
                              <Tooltip content="Cancel moving this widget" placement="left">
                                <button
                                  className="w-full px-2 py-1 text-xs text-theme-muted hover:bg-theme-border/50 rounded transition-colors mt-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMoveToSheet(false);
                                  }}
                                >
                                  Cancel
                                </button>
                              </Tooltip>
                            </div>
                          )}
                        </>
                      )}
                      {/* Detach from group - only if widget is in a group */}
                      {widget.groupId && (
                        <Tooltip content="Remove this widget from its current group" placement="left">
                          <button
                            className="w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDropdown(false);
                              detachWidgets(widget.id, widget.id);
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
                            Detach from Group
                          </button>
                        </Tooltip>
                      )}
                      <div className="border-t border-theme-border" />
                      {!showDeleteConfirm ? (
                        <Tooltip content="Delete this widget" placement="left">
                          <button
                            className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(true);
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                            Delete
                          </button>
                        </Tooltip>
                      ) : (
                        <div className="flex">
                          <Tooltip content="Confirm widget deletion" placement="left">
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
                          </Tooltip>
                          <Tooltip content="Cancel widget deletion" placement="left">
                            <button
                              className="flex-1 px-3 py-2 text-sm text-theme-muted hover:bg-theme-accent hover:text-theme-paper transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteConfirm(false);
                              }}
                            >
                              Cancel
                            </button>
                          </Tooltip>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Group Actions Tab */}
                  {dropdownTab === 'group' && widget.groupId && (
                    <>
                      <Tooltip content="Create a copy of this entire group" placement="left">
                        <button
                          className="w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDropdown(false);
                            cloneGroup(widget.groupId!);
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                          Clone Group
                        </button>
                      </Tooltip>
                      <Tooltip content={(() => {
                        const groupWidgets = getWidgetsInGroup(widget.groupId!);
                        const allLocked = groupWidgets.length > 0 && groupWidgets.every(w => w.locked);
                        return allLocked ? 'Unlock this group so its widgets can be changed' : 'Lock this group to prevent changes';
                      })()} placement="left">
                        <button
                          className="w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDropdown(false);
                            toggleGroupLock(widget.groupId!);
                          }}
                        >
                          {(() => {
                            const groupWidgets = getWidgetsInGroup(widget.groupId!);
                            const allLocked = groupWidgets.length > 0 && groupWidgets.every(w => w.locked);
                            return allLocked ? (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>
                                Unlock Group
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                Lock Group
                              </>
                            );
                          })()}
                        </button>
                      </Tooltip>
                      {!showGroupTemplateNameInput ? (
                        <Tooltip content="Save this group as a reusable template (templates are at the bottom of the widget selection panel)" placement="left">
                          <button
                            data-tutorial="template-save-group"
                            className={`w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center gap-2 ${shouldHighlightGroupTemplateSave ? 'bg-blue-500 text-white font-bold' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setGroupTemplateName('');
                              setShowGroupTemplateNameInput(true);
                              if (isCurrentTutorialStep('templates-save-group-template')) {
                                advanceTutorial();
                              }
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                            Save Group as Template
                          </button>
                        </Tooltip>
                      ) : (
                        <div className="px-2 py-2">
                          <input
                            data-tutorial={groupTemplateName.trim() ? 'template-group-name-input' : 'template-group-name-target'}
                            type="text"
                            value={groupTemplateName}
                            onChange={(e) => setGroupTemplateName(e.target.value)}
                            placeholder="Group template name..."
                            className="w-full px-2 py-1 text-sm border border-theme-border rounded bg-theme-paper text-theme-ink mb-2"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter' && groupTemplateName.trim()) {
                                const groupWidgets = getWidgetsInGroup(widget.groupId!);
                                addGroupTemplate(groupWidgets, groupTemplateName.trim());
                                setShowDropdown(false);
                                setShowGroupTemplateNameInput(false);
                                setGroupTemplateName('');
                                if (isCurrentTutorialStep('templates-name-group-template')) {
                                  advanceTutorial();
                                }
                              } else if (e.key === 'Escape') {
                                setShowGroupTemplateNameInput(false);
                                setGroupTemplateName('');
                              }
                            }}
                          />
                          <div className="flex gap-1">
                            <Tooltip content="Save this group template" placement="left">
                              <button
                                data-tutorial={groupTemplateName.trim() ? 'template-group-name-target' : 'template-group-save-confirm'}
                                className={`flex-1 px-2 py-1 text-xs bg-theme-accent text-theme-paper rounded hover:bg-theme-accent/80 transition-colors ${shouldHighlightGroupTemplateConfirm ? 'ring-4 ring-blue-500 ring-offset-1 font-bold' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (groupTemplateName.trim()) {
                                    const groupWidgets = getWidgetsInGroup(widget.groupId!);
                                    addGroupTemplate(groupWidgets, groupTemplateName.trim());
                                    setShowDropdown(false);
                                    setShowGroupTemplateNameInput(false);
                                    setGroupTemplateName('');
                                    if (isCurrentTutorialStep('templates-name-group-template')) {
                                      advanceTutorial();
                                    }
                                  }
                                }}
                              >
                                Save
                              </button>
                            </Tooltip>
                            <Tooltip content="Cancel group template creation" placement="left">
                              <button
                                className="flex-1 px-2 py-1 text-xs text-theme-muted hover:bg-theme-border/50 rounded transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowGroupTemplateNameInput(false);
                                  setGroupTemplateName('');
                                }}
                              >
                                Cancel
                              </button>
                            </Tooltip>
                          </div>
                        </div>
                      )}
                      {hasMultipleSheets && (
                        <>
                          {!showGroupMoveToSheet ? (
                            <Tooltip content="Move this whole group to another sheet" placement="left">
                              <button
                                className="w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowGroupMoveToSheet(true);
                                }}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
                                Move to Sheet
                              </button>
                            </Tooltip>
                          ) : (
                            <div className="px-2 py-2">
                              <div className="text-xs text-theme-muted mb-2">Move group to:</div>
                              {sheets
                                .filter(s => s.id !== activeCharacter?.activeSheetId)
                                .map(sheet => (
                                  <Tooltip key={sheet.id} content={`Move this group to ${sheet.name}`} placement="left">
                                    <button
                                      className="w-full px-2 py-1.5 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors rounded mb-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveGroupToSheet(widget.groupId!, sheet.id);
                                        setShowDropdown(false);
                                        setShowGroupMoveToSheet(false);
                                      }}
                                    >
                                      {sheet.name}
                                    </button>
                                  </Tooltip>
                                ))}
                              <Tooltip content="Cancel moving this group" placement="left">
                                <button
                                  className="w-full px-2 py-1 text-xs text-theme-muted hover:bg-theme-border/50 rounded transition-colors mt-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowGroupMoveToSheet(false);
                                  }}
                                >
                                  Cancel
                                </button>
                              </Tooltip>
                            </div>
                          )}
                        </>
                      )}
                      <Tooltip content="Break apart this group into individual widgets" placement="left">
                        <button
                          className="w-full px-3 py-2 text-left text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDropdown(false);
                            detachAllInGroup(widget.groupId!);
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
                          Detach All
                        </button>
                      </Tooltip>
                      <div className="border-t border-theme-border" />
                      {!showGroupDeleteConfirm ? (
                        <Tooltip content="Delete every widget in this group" placement="left">
                          <button
                            className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowGroupDeleteConfirm(true);
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                            Delete Group ({getWidgetsInGroup(widget.groupId!).length})
                          </button>
                        </Tooltip>
                      ) : (
                        <div className="flex">
                          <Tooltip content="Confirm group deletion" placement="left">
                            <button
                              className="flex-1 px-3 py-2 text-sm text-red-500 hover:bg-red-500 hover:text-white transition-colors font-bold"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDropdown(false);
                                setShowGroupDeleteConfirm(false);
                                removeGroup(widget.groupId!);
                              }}
                            >
                              Confirm
                            </button>
                          </Tooltip>
                          <Tooltip content="Cancel group deletion" placement="left">
                            <button
                              className="flex-1 px-3 py-2 text-sm text-theme-muted hover:bg-theme-accent hover:text-theme-paper transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowGroupDeleteConfirm(false);
                              }}
                            >
                              Cancel
                            </button>
                          </Tooltip>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Print Settings Button - visible on hover in print mode for widgets with print settings */}
          {mode === 'print' && hasPrintSettings && (showControls || showPrintSettings) && (
            <div className="absolute -top-3 -right-3 z-[9999]" ref={printSettingsRef} data-print-hide="true">
              <Tooltip content="Print settings">
                <button
                  className="w-8 h-8 bg-theme-accent text-theme-paper rounded-full flex items-center justify-center transition-opacity hover:bg-theme-accent/80 text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPrintSettings(!showPrintSettings);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>
              </Tooltip>
              
              {/* Print Settings Dropdown */}
              {showPrintSettings && (
                <div className="absolute top-full right-0 mt-1 bg-theme-paper border-[length:var(--border-width)] border-theme-border rounded-theme shadow-theme min-w-[160px] overflow-hidden z-[9999] p-2 animate-dropdown-in">
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
            <Tooltip content="This widget is locked">
              <div 
                className="absolute inset-0 z-40 cursor-not-allowed"
                style={borderRadiusStyle}
              >
                {/* Small lock indicator in corner */}
                <div className="absolute top-1 right-1 text-theme-ink">
                  <svg className="w-2 h-2" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </div>
              </div>
            </Tooltip>
          )}

          {/* Resize Handle - only visible in edit mode when hovered/selected */}
          {mode === 'edit' && showControls && (
            <Tooltip content="Drag to resize">
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 cursor-se-resize z-50 flex items-center justify-center"
                onMouseDown={handleResizeStart}
                onTouchStart={handleResizeStart}
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
            </Tooltip>
          )}

          <div ref={contentRef} className={`widget-content ${mode === 'edit' && (widget.type === 'FORM' || widget.type === 'NUMBER' || widget.type === 'LIST' || widget.type === 'CHECKBOX' || widget.type === 'TOGGLE_GROUP' || widget.type === 'HEALTH_BAR' || widget.type === 'PROGRESS_BAR' || widget.type === 'POOL' || (widget.type === 'IMAGE' && !widget.data.imageUrl)) ? 'widget-content--field-controls-interactive' : ''}`}>
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
