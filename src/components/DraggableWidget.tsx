import { memo, useRef, useState, useEffect, useCallback, useMemo, useSyncExternalStore, type CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Widget, WidgetType } from '../types';
import { useStore, type WidgetSelectionSource } from '../store/useStore';
import { useTutorialStore, getTutorialStepIndex } from '../store/useTutorialStore';
import { usePrintStore } from '../store/usePrintStore';
import { useSheetSettingsStore } from '../store/useSheetSettingsStore';
import { isImageTexture, IMAGE_TEXTURES, getBuiltInTheme } from '../store/useThemeStore';
import { useCustomThemeStore } from '../store/useCustomThemeStore';
import { snapWidgetCoordinate, WIDGET_GRID_SIZE } from '../utils/widgetGeometry';
import { DotsVerticalIcon, PencilIcon } from './icons';
import {
  getWidgetDragState,
  subscribeWidgetDragState,
  WIDGET_CONTROLS_DISMISS_EVENT,
} from './widgetDragRegistry';
import WidgetOptionsMenu, {
  getWidgetMenuTutorialTarget,
  isWidgetEditTutorialTarget,
  isWidgetMenuTutorialTarget,
} from './WidgetOptionsMenu';
import { isTouchContextMenu, useWidgetDrag } from '../hooks/useWidgetDrag';

const EDGE_TOLERANCE = 10; // pixels tolerance for edge detection
import NumberWidget from './widgets/NumberWidget';
import NumberDisplayWidget from './widgets/NumberDisplayWidget';
import LabelWidget from './widgets/LabelWidget';
import ToggleWidget from './widgets/ToggleWidget';
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
import MixedFieldsWidget from './widgets/MixedFieldsWidget';
import RestButtonWidget from './widgets/RestButtonWidget';
import ProgressBarWidget from './widgets/ProgressBarWidget';
import ProgressClockWidget from './widgets/ProgressClockWidget';
import MapSketcherWidget from './widgets/MapSketcherWidget';
import GridMapWidget from './widgets/GridMapWidget';
import RollTableWidget from './widgets/RollTableWidget';
import InitiativeTrackerWidget from './widgets/InitiativeTrackerWidget';
import InventoryWidget from './widgets/InventoryWidget';
import DeckWidget from './widgets/DeckWidget';
import CardTableWidget from './widgets/CardTableWidget';
import TimerWidget from './widgets/TimerWidget';
import StepDiceWidget from './widgets/StepDiceWidget';
import WalletWidget from './widgets/WalletWidget';
import WidgetEditModal from './WidgetEditModal';
import { Tooltip } from './Tooltip';
import { useTouchCameraPinchCancellation } from '../hooks/useTouchCamera';
import { useLockedWidgetWheel } from '../hooks/useLockedWidgetWheel';

interface Props {
  widget: Widget;
  scale: number;
  isSearchTarget?: boolean;
}

const GRID_SIZE = WIDGET_GRID_SIZE;
// Hovered widgets rise so their outer resize edges sit above attached neighbours.
const HOVERED_WIDGET_Z_INDEX = 9000;
const SELECTED_WIDGET_Z_INDEX = 10001;
const MENU_OPEN_Z_INDEX = 10003;

type ResizeDirection = -1 | 0 | 1;

// Edge and corner zones, sized in CSS; the move grip sits over the middle of the top edge.
// Full class names keep Tailwind from purging the layered rules.
const RESIZE_ZONES: { key: string; x: ResizeDirection; y: ResizeDirection; className: string }[] = [
  { key: 'n', x: 0, y: -1, className: 'widget-resize-zone--n' },
  { key: 'e', x: 1, y: 0, className: 'widget-resize-zone--e' },
  { key: 'w', x: -1, y: 0, className: 'widget-resize-zone--w' },
  { key: 's', x: 0, y: 1, className: 'widget-resize-zone--s' },
  { key: 'se', x: 1, y: 1, className: 'widget-resize-zone--se' },
  { key: 'sw', x: -1, y: 1, className: 'widget-resize-zone--sw' },
  { key: 'ne', x: 1, y: -1, className: 'widget-resize-zone--ne' },
  { key: 'nw', x: -1, y: -1, className: 'widget-resize-zone--nw' },
];

// Minimum dimensions per widget type
const MIN_DIMENSIONS: Record<WidgetType, { width: number; height: number }> = {
  'NUMBER': { width: 60, height: 30 },
  'NUMBER_DISPLAY': { width: 50, height: 40 },
  'LABEL': { width: 50, height: 20 },
  'LIST': { width: 60, height: 40 },
  'TEXT': { width: 50, height: 30 },
  'CHECKBOX': { width: 60, height: 30 },
  'HEALTH_BAR': { width: 80, height: 40 },
  'DICE_ROLLER': { width: 80, height: 60 },
  'DICE_TRAY': { width: 70, height: 60 },
  'SPELL_SLOT': { width: 80, height: 40 },
  'IMAGE': { width: 40, height: 40 },
  'POOL': { width: 60, height: 40 },
  'TOGGLE': { width: 60, height: 30 },
  'TOGGLE_GROUP': { width: 60, height: 30 },
  'TABLE': { width: 80, height: 40 },
  'TIME_TRACKER': { width: 90, height: 70 },
  'FORM': { width: 80, height: 30 },
  'MIXED_FIELDS': { width: 140, height: 30 },
  'REST_BUTTON': { width: 60, height: 40 },
  'PROGRESS_BAR': { width: 50, height: 20 },
  'PROGRESS_CLOCK': { width: 80, height: 80 },
  'MAP_SKETCHER': { width: 100, height: 100 },
  'GRID_MAP': { width: 260, height: 240 },
  'ROLL_TABLE': { width: 70, height: 30 },
  'INITIATIVE_TRACKER': { width: 90, height: 60 },
  'INVENTORY': { width: 150, height: 80 },
  'DECK': { width: 70, height: 40 },
  'DECK_OF_CARDS': { width: 100, height: 120 },
  'TIMER': { width: 80, height: 60 },
  'STEP_DICE': { width: 70, height: 40 },
  'WALLET': { width: 120, height: 60 },
};

type StoreState = ReturnType<typeof useStore.getState>;
const EMPTY_WIDGETS: Widget[] = [];

const selectActiveCharacter = (state: StoreState) => (
  state.characters.find((character) => character.id === state.activeCharacterId)
);

const selectActiveSheetWidgets = (state: StoreState) => {
  const character = selectActiveCharacter(state);
  return character?.sheets.find((sheet) => sheet.id === character.activeSheetId)?.widgets ?? EMPTY_WIDGETS;
};

// Only widgets without a stored size need a (layout-forcing) DOM measurement.
function getWidgetBoxSize(candidate: Widget) {
  if (candidate.w && candidate.h) return { width: candidate.w, height: candidate.h };
  const element = document.querySelector<HTMLElement>(`[data-widget-id="${candidate.id}"]`);
  return {
    width: candidate.w || (element ? element.offsetWidth : 200),
    height: candidate.h || (element ? element.offsetHeight : 120),
  };
}

type WidgetBox = { x: number; y: number; width: number; height: number };
type WidgetSide = 'left' | 'right' | 'top' | 'bottom';

// The side of `box` that the neighbour touches, or null when they no longer share an edge.
function getTouchingSide(box: WidgetBox, neighbor: Widget): WidgetSide | null {
  const { width, height } = getWidgetBoxSize(neighbor);
  const overlapsX = Math.min(box.x + box.width, neighbor.x + width) > Math.max(box.x, neighbor.x);
  const overlapsY = Math.min(box.y + box.height, neighbor.y + height) > Math.max(box.y, neighbor.y);
  if (overlapsY && Math.abs(neighbor.x + width - box.x) <= EDGE_TOLERANCE) return 'left';
  if (overlapsY && Math.abs(neighbor.x - (box.x + box.width)) <= EDGE_TOLERANCE) return 'right';
  if (overlapsX && Math.abs(neighbor.y + height - box.y) <= EDGE_TOLERANCE) return 'top';
  if (overlapsX && Math.abs(neighbor.y - (box.y + box.height)) <= EDGE_TOLERANCE) return 'bottom';
  return null;
}

const PLACEMENT_KEYS = new Set<string>(['x', 'y', 'zIndex']);

function hasSameContent(previous: Widget, next: Widget) {
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  for (const key of keys) {
    if (PLACEMENT_KEYS.has(key)) continue;
    if (!Object.is(previous[key as keyof Widget], next[key as keyof Widget])) return false;
  }
  return true;
}

function DraggableWidget({ widget, scale, isSearchTarget = false }: Props) {
  const updateWidgetPosition = useStore((state) => state.updateWidgetPosition);
  const updateWidgetSize = useStore((state) => state.updateWidgetSize);
  const bringWidgetToFront = useStore((state) => state.bringWidgetToFront);
  const detachWidgetFrom = useStore((state) => state.detachWidgetFrom);
  const mode = useStore((state) => state.mode);
  const setEditingWidgetId = useStore((state) => state.setEditingWidgetId);
  const isSelected = useStore((state) => state.selectedWidgetId === widget.id);
  // Touch selection covers the content so a one-finger drag moves the widget.
  const isArranging = useStore((state) => state.selectedWidgetId === widget.id && state.selectedWidgetSource === 'touch');
  const setSelectedWidgetId = useStore((state) => state.setSelectedWidgetId);
  const tutorialStep = useTutorialStore((state) => state.tutorialStep);
  const advanceTutorial = useTutorialStore((state) => state.advanceTutorial);
  
  // Print mode state
  const textureDisabled = usePrintStore((state) => state.textureDisabled);
  const bordersDisabled = usePrintStore((state) => state.bordersDisabled);
  const hideAttachedEdges = useSheetSettingsStore((state) => state.hideAttachedEdges);
  
  // Get current character's theme for texture info
  // Narrow selectors: subscribing to all characters re-rendered every widget whenever any widget changed.
  const activeTheme = useStore((state) => selectActiveCharacter(state)?.theme);
  const customCardTexture = useCustomThemeStore((state) => (
    activeTheme ? state.customThemes.find((theme) => theme.id === activeTheme)?.cardTexture : undefined
  ));
  const builtInTheme = activeTheme ? getBuiltInTheme(activeTheme) : undefined;
  const textureKey = customCardTexture || builtInTheme?.cardTexture || 'none';
  // Always disable texture in print mode
  const hasImageTexture = isImageTexture(textureKey) && !textureDisabled && mode !== 'print';
  
  const nodeRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  useLockedWidgetWheel(nodeRef, mode !== 'print' && widget.locked === true);
  const printSettingsRef = useRef<HTMLDivElement>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  // The key remounts the menu so every open starts from its first tab.
  const [menu, setMenu] = useState<{ key: number; point: { x: number; y: number } | null } | null>(null);
  const menuKeyRef = useRef(0);
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  // Touch has no hover, so a single tap reveals the move bar instead.
  const [isTapRevealed, setIsTapRevealed] = useState(false);
  const [snappedHeight, setSnappedHeight] = useState<number | null>(null);

  const openMenu = useCallback((point: { x: number; y: number } | null) => {
    menuKeyRef.current += 1;
    setMenu({ key: menuKeyRef.current, point });
  }, []);
  const closeMenu = useCallback(() => setMenu(null), []);
  
  // Widget types that have print settings customization
  const WIDGETS_WITH_PRINT_SETTINGS: WidgetType[] = ['NUMBER', 'NUMBER_DISPLAY'];
  const hasPrintSettings = WIDGETS_WITH_PRINT_SETTINGS.includes(widget.type);
  
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  
  // Resize previews stay local so the store and sheet re-render only once on release.
  const [resizePreview, setResizePreview] = useState<{ x: number; y: number; w?: number; h?: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const getIsWidgetDragging = () => {
    const drag = getWidgetDragState();
    return drag?.widgetId === widget.id || (!!widget.groupId && drag?.groupId === widget.groupId);
  };
  const isWidgetDragging = useSyncExternalStore(
    subscribeWidgetDragState,
    getIsWidgetDragging,
    getIsWidgetDragging,
  );

  const cancelResize = useCallback(() => {
    if (!resizeCleanupRef.current) return;
    resizeCleanupRef.current();
    resizeCleanupRef.current = null;
    setResizePreview(null);
    setIsResizing(false);
  }, []);

  useTouchCameraPinchCancellation(cancelResize);
  useEffect(() => () => resizeCleanupRef.current?.(), []);

  const isWidgetHeaderHidden = widget.type !== 'LABEL' && widget.type !== 'IMAGE' && widget.data.hideWidgetHeader === true;
  const isWidgetEditButtonHidden = widget.data.hideWidgetEditButton === true;
  const hasEditableWidgetHeader = !isWidgetHeaderHidden && !isWidgetEditButtonHidden;
  const hasInlineWidgetHeader = (widget.type === 'PROGRESS_BAR' || widget.type === 'TOGGLE') && widget.data.inlineLabel === true;
  // Widget content never reads x/y/zIndex, so moving or raising a widget keeps the previous object and skips re-rendering it.
  const contentWidgetRef = useRef(widget);
  if (contentWidgetRef.current !== widget && !hasSameContent(contentWidgetRef.current, widget)) {
    contentWidgetRef.current = widget;
  }
  const contentWidget = contentWidgetRef.current;
  const renderedWidget = useMemo(() => ({
    ...contentWidget,
    data: {
      ...contentWidget.data,
      label: isWidgetHeaderHidden ? undefined : contentWidget.data.label,
      showFieldControls: isWidgetHeaderHidden ? false : contentWidget.data.showFieldControls,
      showTableEditButton: isWidgetHeaderHidden ? false : contentWidget.data.showTableEditButton,
    },
  }), [isWidgetHeaderHidden, contentWidget]);
  const isMenuTutorialTarget = isWidgetMenuTutorialTarget(widget, tutorialStep);
  // The menu unlocks once the tutorial reaches its widget menu step.
  const menuAllowed = tutorialStep === null || tutorialStep >= getTutorialStepIndex('widget-menu');
  
  // Get minimum dimensions for this widget type
  const minDimensions = MIN_DIMENSIONS[widget.type] || { width: 120, height: 60 };
  const buildControlScale = Math.min(1, 1 / scale);
  // Grip and resize zones grow when zoomed out so they stay easy to hit.
  const hitScale = Math.min(3, Math.max(1, 1 / scale));

  useEffect(() => {
    const dismissHoverControls = () => {
      setIsHovered(false);
      setIsTapRevealed(false);
    };
    window.addEventListener(WIDGET_CONTROLS_DISMISS_EVENT, dismissHoverControls);
    return () => window.removeEventListener(WIDGET_CONTROLS_DISMISS_EVENT, dismissHoverControls);
  }, []);

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

  const handleWidgetPointerDown = () => {
    if (mode !== 'print') {
      bringWidgetToFront(widget.id);
    }
  };

  const { handleGripPointerDown, handleSurfaceTouchStart } = useWidgetDrag({
    widget,
    scale,
    enabled: mode !== 'print',
    isArranging,
    onTap: () => setIsTapRevealed(true),
  });

  const handleWidgetContextMenu = (e: React.MouseEvent) => {
    if (mode === 'print') return;

    e.preventDefault();
    e.stopPropagation();
    // Long-press on touch lifts the widget instead of opening the menu.
    if (isTouchContextMenu() || !menuAllowed) return;
    setSelectedWidgetId(widget.id, 'pointer');
    openMenu({ x: e.clientX, y: e.clientY });
  };

  const openEditModal = () => {
    setShowEditModal(true);
    setEditingWidgetId(widget.id);
  };

  const handleEditWidget = () => {
    if (isWidgetEditTutorialTarget(widget, tutorialStep)) {
      advanceTutorial();
    }
    closeMenu();
    openEditModal();
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingWidgetId(null);
  };

  const snapToGrid = snapWidgetCoordinate;

  // Calculate width based on widget type (used for both display and resize)
  const getWidgetWidth = () => {
    if (resizePreview?.w !== undefined) return resizePreview.w;
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

  const minResizeWidth = minDimensions.width;
  const minResizeHeight = minDimensions.height;

  // dirX/dirY pick the edges that move: -1 left/top, 1 right/bottom, 0 untouched.
  const handleResizePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    dirX: ResizeDirection,
    dirY: ResizeDirection,
  ) => {
    if (event.button !== 0 || widget.locked || mode === 'print') return;
    event.preventDefault();
    event.stopPropagation();
    cancelResize();

    // Start from the rendered logical size so auto-sized widgets do not jump on first resize.
    const node = nodeRef.current;
    const start = {
      clientX: event.clientX,
      clientY: event.clientY,
      width: node?.offsetWidth || widget.w || 200,
      height: node?.offsetHeight || widget.h || 120,
      x: widget.x,
      y: widget.y,
    };
    const { id: widgetId, w: startW, h: startH } = widget;
    const pointerId = event.pointerId;
    const source: WidgetSelectionSource = event.pointerType === 'touch' ? 'touch' : 'pointer';
    let preview: { x: number; y: number; w?: number; h?: number } | null = null;
    let detached = false;

    // Neighbours on the dragged edges detach; the others stay attached while they still touch.
    const isMovingSide = (side: WidgetSide | null) => (
      (side === 'left' && dirX === -1) || (side === 'right' && dirX === 1)
      || (side === 'top' && dirY === -1) || (side === 'bottom' && dirY === 1)
    );
    const neighbors = selectActiveSheetWidgets(useStore.getState())
      .filter((candidate) => widget.attachedTo?.includes(candidate.id))
      .map((candidate) => ({ candidate, side: getTouchingSide(start, candidate) }));
    const movingEdgeNeighborIds = neighbors.filter(({ side }) => isMovingSide(side)).map(({ candidate }) => candidate.id);
    const keptNeighbors = neighbors.filter(({ side }) => side && !isMovingSide(side)).map(({ candidate }) => candidate);

    const handleMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const deltaX = (moveEvent.clientX - start.clientX) / scale;
      const deltaY = (moveEvent.clientY - start.clientY) / scale;
      const w = dirX === 0 ? undefined : snapToGrid(Math.max(minResizeWidth, start.width + dirX * deltaX));
      const h = dirY === 0 ? undefined : snapToGrid(Math.max(minResizeHeight, start.height + dirY * deltaY));
      const changed = (w !== undefined && w !== start.width) || (h !== undefined && h !== start.height);
      if (!preview && !changed) return;
      const x = dirX === -1 && w !== undefined ? start.x + start.width - w : start.x;
      const y = dirY === -1 && h !== undefined ? start.y + start.height - h : start.y;
      if (preview && preview.w === w && preview.h === h && preview.x === x && preview.y === y) return;
      if (!detached && movingEdgeNeighborIds.length > 0) {
        detached = true;
        detachWidgetFrom(widgetId, movingEdgeNeighborIds);
      }
      preview = { x, y, w, h };
      setResizePreview(preview);
    };

    const removeListeners = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
    };

    function handleUp(upEvent: PointerEvent) {
      if (upEvent.pointerId !== pointerId) return;
      removeListeners();
      resizeCleanupRef.current = null;
      if (preview) {
        if (dirX === -1 || dirY === -1) updateWidgetPosition(widgetId, preview.x, preview.y);
        updateWidgetSize(widgetId, preview.w ?? startW, preview.h ?? startH);
        const endBox = { x: preview.x, y: preview.y, width: preview.w ?? start.width, height: preview.h ?? start.height };
        const separatedIds = keptNeighbors.filter((neighbor) => !getTouchingSide(endBox, neighbor)).map((neighbor) => neighbor.id);
        if (separatedIds.length > 0) detachWidgetFrom(widgetId, separatedIds);
      }
      setResizePreview(null);
      setIsResizing(false);
      setSelectedWidgetId(widgetId, source);
    }

    function handleCancel(cancelEvent: PointerEvent) {
      if (cancelEvent.pointerId === pointerId) cancelResize();
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
    resizeCleanupRef.current = removeListeners;
    setIsResizing(true);
  };
  
  // Calculate height - use manual height if set, otherwise use snapped auto height
  const widgetHeight = resizePreview?.h ?? (widget.h && widget.h > 0 ? widget.h : snappedHeight);

  // Group members and attached widgets; unchanged widget objects keep this stable across unrelated store updates.
  const relatedWidgets = useStore(useShallow((state) => (
    widget.groupId || widget.attachedTo?.length
      ? selectActiveSheetWidgets(state).filter((candidate) => (
        (!!widget.groupId && candidate.groupId === widget.groupId) || !!widget.attachedTo?.includes(candidate.id)
      ))
      : EMPTY_WIDGETS
  )));

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
      const attachedWidget = relatedWidgets.find(w => w.id === attachedId);
      if (!attachedWidget) continue;
      
      const { width: attachedWidth, height: attachedHeight } = getWidgetBoxSize(attachedWidget);
      
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
  }, [widget.attachedTo, widget.x, widget.y, widget.w, widgetHeight, relatedWidgets]);

  // Sides whose edge is fully shared with attached neighbours; their border line is hidden.
  const seamSides = useMemo(() => {
    if (!hideAttachedEdges || !widget.attachedTo?.length) return null;
    const width = widget.w || 200;
    const height = widgetHeight || 120;
    const covered: Record<WidgetSide, [number, number][]> = { left: [], right: [], top: [], bottom: [] };
    for (const attachedId of widget.attachedTo) {
      const neighbor = relatedWidgets.find((candidate) => candidate.id === attachedId);
      if (!neighbor) continue;
      const { width: nw, height: nh } = getWidgetBoxSize(neighbor);
      const yRange: [number, number] = [Math.max(widget.y, neighbor.y), Math.min(widget.y + height, neighbor.y + nh)];
      const xRange: [number, number] = [Math.max(widget.x, neighbor.x), Math.min(widget.x + width, neighbor.x + nw)];
      const overlapsY = yRange[1] > yRange[0];
      const overlapsX = xRange[1] > xRange[0];
      if (overlapsY && Math.abs(neighbor.x + nw - widget.x) <= EDGE_TOLERANCE) covered.left.push(yRange);
      if (overlapsY && Math.abs(neighbor.x - (widget.x + width)) <= EDGE_TOLERANCE) covered.right.push(yRange);
      if (overlapsX && Math.abs(neighbor.y + nh - widget.y) <= EDGE_TOLERANCE) covered.top.push(xRange);
      if (overlapsX && Math.abs(neighbor.y - (widget.y + height)) <= EDGE_TOLERANCE) covered.bottom.push(xRange);
    }
    const isSideCovered = (ranges: [number, number][], length: number) => {
      let total = 0;
      let end = -Infinity;
      for (const [start, stop] of [...ranges].sort((a, b) => a[0] - b[0])) {
        total += Math.max(0, stop - Math.max(start, end));
        end = Math.max(end, stop);
      }
      return total >= length - 2 * EDGE_TOLERANCE;
    };
    const sides = {
      left: isSideCovered(covered.left, height),
      right: isSideCovered(covered.right, height),
      top: isSideCovered(covered.top, width),
      bottom: isSideCovered(covered.bottom, width),
    };
    return sides.left || sides.right || sides.top || sides.bottom ? sides : null;
  }, [hideAttachedEdges, widget.attachedTo, widget.x, widget.y, widget.w, widgetHeight, relatedWidgets]);

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
    // If not part of a group (or no texture is drawn), use default cover behavior
    if (!widget.groupId || !hasImageTexture) {
      return {
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    
    // Get all widgets in the same group
    const groupWidgets = relatedWidgets.filter(w => w.groupId === widget.groupId);
    
    if (groupWidgets.length <= 1) {
      return {
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    
    // Calculate the bounding box of the entire group
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    for (const gw of groupWidgets) {
      const { width: gwWidth, height: gwHeight } = getWidgetBoxSize(gw);
      
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
  }, [widget.groupId, widget.x, widget.y, widget.w, widgetHeight, relatedWidgets, hasImageTexture]);

  const renderContent = () => {
    // Always render in play mode style - the modal handles editing
    // But pass 'print' mode when in print mode for special rendering
    const widgetMode = mode === 'print' ? 'print' : 'play';
    const contentInset = 16;
    const props = {
      widget: renderedWidget,
      mode: widgetMode as 'play' | 'print',
      width: Math.max(20, widgetWidth - contentInset),
      height: Math.max(20, (widgetHeight || 120) - contentInset),
    };
    switch (widget.type) {
      case 'NUMBER': return <NumberWidget {...props} />;
      case 'NUMBER_DISPLAY': return <NumberDisplayWidget {...props} />;
      case 'LABEL': return <LabelWidget widget={renderedWidget} />;
      case 'LIST': return <ListWidget {...props} />;
      case 'TEXT': return <TextWidget {...props} sheetScale={scale} />;
      case 'CHECKBOX': return <CheckboxWidget {...props} />;
      case 'HEALTH_BAR': return <HealthBarWidget {...props} />;
      case 'DICE_ROLLER': return <DiceRollerWidget {...props} sheetScale={scale} />;
      case 'DICE_TRAY': return <DiceTrayWidget {...props} sheetScale={scale} />;
      case 'SPELL_SLOT': return <SpellSlotWidget {...props} />;
      case 'IMAGE': return <ImageWidget {...props} />;
      case 'POOL': return <PoolWidget {...props} />;
      case 'TOGGLE': return <ToggleWidget {...props} />;
      case 'TOGGLE_GROUP': return <ConditionWidget {...props} />;
      case 'TABLE': return <TableWidget {...props} sheetScale={scale} />;
      case 'TIME_TRACKER': return <TimeTrackerWidget {...props} />;
      case 'FORM': return <FormWidget {...props} />;
      case 'MIXED_FIELDS': return <MixedFieldsWidget {...props} />;
      case 'REST_BUTTON': return <RestButtonWidget {...props} />;
      case 'PROGRESS_BAR': return <ProgressBarWidget {...props} />;
      case 'PROGRESS_CLOCK': return <ProgressClockWidget {...props} interactive={mode === 'play'} />;
      case 'MAP_SKETCHER': return <MapSketcherWidget {...props} sheetScale={scale} />;
      case 'GRID_MAP': return <GridMapWidget {...props} sheetScale={scale} />;
      case 'ROLL_TABLE': return <RollTableWidget {...props} />;
      case 'INITIATIVE_TRACKER': return <InitiativeTrackerWidget {...props} />;
      case 'INVENTORY': return <InventoryWidget {...props} />;
      case 'DECK': return <DeckWidget {...props} />;
      case 'DECK_OF_CARDS': return <CardTableWidget {...props} interactive={mode === 'play'} showControls />;
      case 'TIMER': return <TimerWidget {...props} />;
      case 'STEP_DICE': return <StepDiceWidget {...props} />;
      case 'WALLET': return <WalletWidget {...props} />;
      default: return null;
    }
  };
  // Hover, selection, drag and placement re-renders reuse the same element, so React skips the content subtree.
  const widgetContent = useMemo(renderContent, [renderedWidget, mode, widgetWidth, widgetHeight, scale]);

  const showControls = isHovered || isSelected;
  const showSelection = isSelected && mode !== 'print';
  const canArrange = mode !== 'print' && !widget.locked;
  const showTapBar = isTapRevealed && canArrange;
  const showMenuTrigger = mode !== 'print' && menuAllowed && (isSelected || menu !== null || isMenuTutorialTarget);
  const position = resizePreview ?? widget;

  return (
    <>
      <div 
        ref={nodeRef}
        data-widget-id={widget.id}
        data-tutorial={`widget-${widget.type}`}
        data-group-id={widget.groupId || ''}
        data-widget-arranging={isArranging && mode !== 'print' ? 'true' : undefined}
        className={`canvas-widget widget-surface absolute bg-theme-paper group ${widget.type === 'DECK_OF_CARDS' ? 'widget-surface--card-table' : ''} ${isWidgetDragging ? 'widget-surface--dragging' : ''} ${showSelection ? 'widget-surface--selected' : ''} ${seamSides && !bordersDisabled && !showSelection ? 'widget-surface--seamless' : ''} ${showTapBar ? 'widget-surface--tap-revealed' : ''} ${isSearchTarget ? 'widget-search-target' : ''} ${isResizing ? 'select-none' : ''} ${mode === 'print' && !hasPrintSettings ? 'pointer-events-none' : ''}`}
        style={{ 
          transform: `translate(${position.x}px, ${position.y}px)`,
          width: `${widgetWidth}px`,
          minWidth: `${minDimensions.width}px`,
          height: widgetHeight ? `${widgetHeight}px` : 'auto',
          minHeight: widgetHeight ? `${widgetHeight}px` : (snappedHeight ? `${snappedHeight}px` : 'auto'),
          zIndex: menu ? MENU_OPEN_Z_INDEX : ((showSelection && widget.type !== 'DECK_OF_CARDS') || isResizing ? SELECTED_WIDGET_Z_INDEX : isSearchTarget ? 10000 : showPrintSettings ? 9999 : (showControls && mode === 'print' && hasPrintSettings) ? 9998 : ((isHovered || showTapBar) && canArrange && widget.type !== 'DECK_OF_CARDS') ? HOVERED_WIDGET_Z_INDEX : widget.zIndex),
          ...borderRadiusStyle,
          ...(bordersDisabled ? { borderWidth: '0px', ...(showSelection ? {} : { outlineWidth: '0px' }) } : {}),
          ...({
            '--widget-hit-scale': hitScale,
            ...(seamSides ? {
              '--seam-left': seamSides.left ? 1 : 0,
              '--seam-right': seamSides.right ? 1 : 0,
              '--seam-top': seamSides.top ? 1 : 0,
              '--seam-bottom': seamSides.bottom ? 1 : 0,
            } : {}),
          } as CSSProperties),
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStartCapture={handleSurfaceTouchStart}
        onPointerDownCapture={handleWidgetPointerDown}
        onContextMenu={handleWidgetContextMenu}
      >
          {/* Image texture overlay - grayscale texture tinted with card color */}
          {/* When widgets are attached together, the texture stretches to cover the whole group */}
          {hasImageTexture && (
            <div
              className="widget-texture-layer absolute pointer-events-none z-0 overflow-hidden"
              style={{ backgroundColor: 'var(--color-paper)', ...borderRadiusStyle }}
            >
              <div
                className="widget-texture-effect absolute inset-0"
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
          
          {/* Move grip centered on the top edge; narrow so the widget above keeps its bottom resize edge. Touch shows it after a tap. */}
          {canArrange && (
            <Tooltip content="Drag to move">
              <div
                className="drag-handle widget-drag-grip absolute z-[80] flex items-center justify-center cursor-move touch-none select-none"
                data-camera-pan-ignore="true"
                onPointerDown={handleGripPointerDown}
              >
                <div className="widget-drag-grip__pill" />
              </div>
            </Tooltip>
          )}
          
          {showMenuTrigger && (
            <div className="right-1 top-1 absolute z-[10002] flex items-center gap-1">
              <Tooltip content="Widget options">
                <button
                  ref={menuTriggerRef}
                  data-tutorial={getWidgetMenuTutorialTarget(widget)}
                  aria-label={`Options for ${widget.data.label || widget.type}`}
                  aria-expanded={menu !== null}
                  className={`widget-menu-trigger w-8 h-8 bg-theme-ink text-theme-paper border border-theme-ink rounded-button shadow-theme flex items-center justify-center transition-[filter] hover:brightness-125 ${isMenuTutorialTarget ? 'outline outline-4 outline-blue-500 outline-offset-2' : ''}`}
                  style={{ transform: `scale(${buildControlScale})`, transformOrigin: 'top right' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isMenuTutorialTarget) {
                      advanceTutorial();
                    }
                    if (menu) {
                      closeMenu();
                    } else {
                      openMenu(null);
                    }
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <DotsVerticalIcon className="w-4 h-4" />
                </button>
              </Tooltip>
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

          {/* Touch selection: covers the content so a one-finger drag moves the widget */}
          {isArranging && mode !== 'print' && (
            <div 
              className="absolute inset-0 z-40 bg-theme-accent/10"
              style={borderRadiusStyle}
            />
          )}

          {/* Locked overlay - blocks interactions with widget content when locked */}
          {mode !== 'print' && widget.locked && (
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

          {/* Invisible edge and corner resize zones for mouse and pen */}
          {canArrange && RESIZE_ZONES.map((zone) => (
            <div
              key={zone.key}
              className={`widget-resize-zone ${zone.className} absolute z-[60] touch-none`}
              data-camera-pan-ignore="true"
              data-touch-camera-ignore="true"
              onPointerDown={(event) => handleResizePointerDown(event, zone.x, zone.y)}
            />
          ))}

          {/* Visible corner handles on the selected widget; the only resize affordance on touch */}
          {canArrange && showSelection && (
            <>
              <Tooltip content="Drag to resize">
                <div
                  className="widget-resize-handle widget-resize-handle--nw absolute cursor-nwse-resize z-[70] touch-none"
                  data-camera-pan-ignore="true"
                  data-touch-camera-ignore="true"
                  onPointerDown={(event) => handleResizePointerDown(event, -1, -1)}
                >
                  <svg
                    viewBox="0 0 12 12"
                    className="text-theme-accent"
                  >
                    <path
                      d="M2 10L10 2M2 6L6 2M2 2L2 2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </Tooltip>
              <Tooltip content="Drag to resize">
                <div
                  className="widget-resize-handle widget-resize-handle--se absolute cursor-nwse-resize z-[70] touch-none"
                  data-camera-pan-ignore="true"
                  data-touch-camera-ignore="true"
                  onPointerDown={(event) => handleResizePointerDown(event, 1, 1)}
                >
                  <svg
                    viewBox="0 0 12 12"
                    className="text-theme-accent"
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
            </>
          )}

          <div ref={contentRef} className={`widget-content ${mode !== 'print' && hasEditableWidgetHeader && widget.type !== 'LABEL' ? 'widget-content--editable-header' : ''} ${mode !== 'print' && hasEditableWidgetHeader && hasInlineWidgetHeader ? 'widget-content--progress-inline-edit' : ''} ${isWidgetHeaderHidden ? 'widget-content--header-hidden' : ''}`}>
            {mode !== 'print' && hasEditableWidgetHeader && widget.type !== 'LABEL' && (
              <Tooltip content={`Edit ${widget.data.label || 'widget'}`}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleEditWidget();
                  }}
                  onMouseDown={(event) => event.stopPropagation()}
                  onTouchStart={(event) => event.stopPropagation()}
                  aria-label={`Edit ${widget.data.label || 'widget'}`}
                  className={`widget-header-edit-button widget-control widget-control--subtle ${widget.type === 'IMAGE' ? 'widget-header-edit-button--image-play' : ''}`}
                >
                  <PencilIcon className="h-3 w-3" />
                </button>
              </Tooltip>
            )}
            {widgetContent}
          </div>
      </div>

      {menu && (
        <WidgetOptionsMenu
          key={menu.key}
          widget={widget}
          anchorRef={menuTriggerRef}
          point={menu.point}
          onClose={closeMenu}
          onEdit={handleEditWidget}
        />
      )}
      
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

export default memo(DraggableWidget);
