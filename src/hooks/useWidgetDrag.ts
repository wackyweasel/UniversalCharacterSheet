import { useCallback, useEffect, useRef } from 'react';
import type React from 'react';
import type { Widget } from '../types';
import { useStore, type WidgetSelectionSource } from '../store/useStore';
import { finishWidgetDrag, startWidgetDrag } from '../components/widgetDragRegistry';
import { snapWidgetMove, type SnapRect } from '../utils/widgetSnap';
import { useTouchCameraPinchCancellation } from './useTouchCamera';

const POINTER_DRAG_THRESHOLD = 3;
const TOUCH_SLOP = 8;
const LIFTED_MOVE_THRESHOLD = 6;
const LONG_PRESS_DELAY_MS = 450;
// Screen pixels; divided by the camera scale so snapping feels the same at every zoom.
const SNAP_DISTANCE = 12;
const SNAP_MIN_OVERLAP = 20;
const TOUCH_CONTEXT_MENU_WINDOW_MS = 800;

// These targets own their touch gestures or need native text selection.
const LONG_PRESS_EXCLUDED_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
  'canvas',
  '[data-touch-camera-ignore="true"]',
  '.card-deck-hit-target',
  '[data-card-deck-grab-all-widget-id]',
  '.drag-handle',
  '.widget-menu-trigger',
].join(', ');

let activeTouchCount = 0;
let lastTouchEndTime = -Infinity;
if (typeof window !== 'undefined') {
  const trackTouchEnd = (event: TouchEvent) => {
    activeTouchCount = event.touches.length;
    lastTouchEndTime = performance.now();
  };
  window.addEventListener('touchstart', (event) => { activeTouchCount = event.touches.length; }, { capture: true, passive: true });
  window.addEventListener('touchend', trackTouchEnd, { capture: true, passive: true });
  window.addEventListener('touchcancel', trackTouchEnd, { capture: true, passive: true });
}

/** Android also fires contextmenu for long-presses, which the widget long-press already handles. */
export const isTouchContextMenu = () => (
  activeTouchCount > 0 || performance.now() - lastTouchEndTime < TOUCH_CONTEXT_MENU_WINDOW_MS
);

interface MoveSession {
  widgetId: string;
  origins: Map<string, { x: number; y: number }>;
  elements: HTMLElement[];
  anchor: { x: number; y: number };
  moving: SnapRect[];
  others: SnapRect[];
  delta: { x: number; y: number };
}

function createMoveSession(widgetId: string): MoveSession | null {
  const state = useStore.getState();
  const character = state.characters.find((candidate) => candidate.id === state.activeCharacterId);
  const widgets = character?.sheets.find((sheet) => sheet.id === character.activeSheetId)?.widgets;
  const widget = widgets?.find((candidate) => candidate.id === widgetId);
  if (!widgets || !widget) return null;

  const movingIds = new Set(widget.groupId
    ? widgets.filter((candidate) => candidate.groupId === widget.groupId).map((candidate) => candidate.id)
    : [widget.id]);
  const elementsById = new Map<string, HTMLElement>();
  document.querySelectorAll<HTMLElement>('.canvas-widget[data-widget-id]').forEach((element) => {
    const id = element.dataset.widgetId;
    if (id) elementsById.set(id, element);
  });
  const rectOf = (candidate: Widget): SnapRect => {
    const element = elementsById.get(candidate.id);
    const width = element?.offsetWidth || candidate.w || 200;
    const height = element?.offsetHeight || candidate.h || 120;
    return { left: candidate.x, top: candidate.y, right: candidate.x + width, bottom: candidate.y + height };
  };

  const session: MoveSession = {
    widgetId,
    origins: new Map(),
    elements: [],
    anchor: { x: widget.x, y: widget.y },
    moving: [],
    others: [],
    delta: { x: 0, y: 0 },
  };
  for (const candidate of widgets) {
    if (!movingIds.has(candidate.id)) {
      session.others.push(rectOf(candidate));
      continue;
    }
    session.origins.set(candidate.id, { x: candidate.x, y: candidate.y });
    session.moving.push(rectOf(candidate));
    const element = elementsById.get(candidate.id);
    if (element) session.elements.push(element);
  }
  return session;
}

// Writes every moving widget in one pass so group members never lag a frame apart.
function writeTransforms(session: MoveSession) {
  for (const element of session.elements) {
    const origin = session.origins.get(element.dataset.widgetId ?? '');
    if (!origin) continue;
    element.style.transform = `translate(${origin.x + session.delta.x}px, ${origin.y + session.delta.y}px)`;
  }
}

interface UseWidgetDragOptions {
  widget: Widget;
  scale: number;
  enabled: boolean;
  /** Touch-selected widgets move with a plain one-finger drag. */
  isArranging: boolean;
}

export function useWidgetDrag({ widget, scale, enabled, isArranging }: UseWidgetDragOptions) {
  const latest = useRef({ widget, scale, enabled, isArranging });
  latest.current = { widget, scale, enabled, isArranging };
  const gestureCleanupRef = useRef<(() => void) | null>(null);
  const moveRef = useRef<MoveSession | null>(null);

  const endGesture = useCallback(() => {
    gestureCleanupRef.current?.();
    gestureCleanupRef.current = null;
  }, []);

  const select = useCallback((source: WidgetSelectionSource) => {
    useStore.getState().setSelectedWidgetId(latest.current.widget.id, source);
  }, []);

  const startMove = useCallback(() => {
    const { widget: current } = latest.current;
    const session = createMoveSession(current.id);
    if (!session) return false;
    moveRef.current = session;
    startWidgetDrag(current.id, current.groupId ?? null);
    return true;
  }, []);

  const updateMove = useCallback((session: MoveSession, screenDx: number, screenDy: number, grid: boolean) => {
    const currentScale = latest.current.scale;
    session.delta = snapWidgetMove({
      moving: session.moving,
      others: session.others,
      anchor: session.anchor,
      deltaX: screenDx / currentScale,
      deltaY: screenDy / currentScale,
      threshold: SNAP_DISTANCE / currentScale,
      minOverlap: SNAP_MIN_OVERLAP,
      grid,
    });
    writeTransforms(session);
  }, []);

  const finishMove = useCallback((commit: boolean, screenDx = 0, screenDy = 0) => {
    const session = moveRef.current;
    if (!session) return;
    moveRef.current = null;
    // React skips unchanged transforms, so the final position is always written here.
    if (commit) {
      updateMove(session, screenDx, screenDy, true);
    } else {
      session.delta = { x: 0, y: 0 };
      writeTransforms(session);
    }
    finishWidgetDrag(session.widgetId);
    if (!commit || (session.delta.x === 0 && session.delta.y === 0)) return;
    useStore.getState().moveWidgetGroup(session.widgetId, session.delta.x, session.delta.y);
  }, [updateMove]);

  useTouchCameraPinchCancellation(() => {
    endGesture();
    finishMove(false);
  });

  useEffect(() => () => {
    endGesture();
    finishMove(false);
  }, [endGesture, finishMove]);

  // Mouse and pen drag from the grip; a click without movement selects the widget.
  const handleGripPointerDown = useCallback((event: React.PointerEvent) => {
    const { enabled: canMove, widget: current } = latest.current;
    if (!canMove || current.locked || event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    event.stopPropagation();
    endGesture();

    const { pointerId, clientX: startX, clientY: startY } = event;
    const source: WidgetSelectionSource = event.pointerType === 'touch' ? 'touch' : 'pointer';
    let dragging = false;

    const handleMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (!dragging) {
        if (Math.hypot(dx, dy) < POINTER_DRAG_THRESHOLD) return;
        dragging = startMove();
        if (!dragging) return;
      }
      moveEvent.preventDefault();
      if (moveRef.current) updateMove(moveRef.current, dx, dy, false);
    };
    const handleUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      endGesture();
      if (dragging) finishMove(true, upEvent.clientX - startX, upEvent.clientY - startY);
      select(source);
    };
    const handleCancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId !== pointerId) return;
      endGesture();
      finishMove(false);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
    gestureCleanupRef.current = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
    };
  }, [endGesture, finishMove, select, startMove, updateMove]);

  // Touch: long-press lifts the widget; touch-selected widgets drag right away.
  const handleSurfaceTouchStart = useCallback((event: React.TouchEvent) => {
    if (event.touches.length !== 1) {
      endGesture();
      finishMove(false);
      return;
    }
    const { enabled: canMove, isArranging: arranging } = latest.current;
    if (!canMove) return;
    const target = event.target as Element | null;
    if (target?.closest(LONG_PRESS_EXCLUDED_SELECTOR)) return;
    endGesture();

    const touch = event.changedTouches[0];
    const touchId = touch.identifier;
    let startX = touch.clientX;
    let startY = touch.clientY;
    let lastX = startX;
    let lastY = startY;
    let lifted = arranging;
    let moved = false;
    let timer = 0;

    const lift = () => {
      timer = 0;
      lifted = true;
      startX = lastX;
      startY = lastY;
      navigator.vibrate?.(10);
      select('touch');
      if (!latest.current.widget.locked) startMove();
    };
    if (!lifted) timer = window.setTimeout(lift, LONG_PRESS_DELAY_MS);

    const findTouch = (list: TouchList) => Array.from(list).find((candidate) => candidate.identifier === touchId);
    const handleMove = (moveEvent: TouchEvent) => {
      const current = findTouch(moveEvent.changedTouches);
      if (!current) return;
      lastX = current.clientX;
      lastY = current.clientY;
      const dx = lastX - startX;
      const dy = lastY - startY;
      if (!lifted) {
        // Moving before the long-press fires is a camera pan or a scroll.
        if (Math.hypot(dx, dy) > TOUCH_SLOP) endGesture();
        return;
      }
      if (!moved) {
        if (Math.hypot(dx, dy) < (arranging ? TOUCH_SLOP : LIFTED_MOVE_THRESHOLD)) return;
        moved = true;
        if (arranging && !latest.current.widget.locked) startMove();
      }
      if (!moveRef.current) return;
      if (moveEvent.cancelable) moveEvent.preventDefault();
      updateMove(moveRef.current, dx, dy, false);
    };
    const handleEnd = (endEvent: TouchEvent) => {
      const current = findTouch(endEvent.changedTouches);
      if (!current) return;
      endGesture();
      if (!lifted) return;
      if (moveRef.current) {
        if (endEvent.cancelable) endEvent.preventDefault();
        finishMove(moved, current.clientX - startX, current.clientY - startY);
        if (moved) select('touch');
      }
      if (!arranging) {
        // Suppress the click and compatibility mouse events that follow a long-press.
        if (endEvent.cancelable) endEvent.preventDefault();
      }
    };
    const handleCancel = (cancelEvent: TouchEvent) => {
      if (!findTouch(cancelEvent.changedTouches)) return;
      endGesture();
      finishMove(false);
    };

    window.addEventListener('touchmove', handleMove, { capture: true, passive: false });
    window.addEventListener('touchend', handleEnd, { capture: true, passive: false });
    window.addEventListener('touchcancel', handleCancel, { capture: true });
    gestureCleanupRef.current = () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener('touchmove', handleMove, { capture: true });
      window.removeEventListener('touchend', handleEnd, { capture: true });
      window.removeEventListener('touchcancel', handleCancel, { capture: true });
    };
  }, [endGesture, finishMove, select, startMove, updateMove]);

  return { handleGripPointerDown, handleSurfaceTouchStart };
}
