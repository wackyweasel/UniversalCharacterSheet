import { useState, useRef, useEffect, useCallback, useLayoutEffect, type RefObject } from 'react';

const VIEW_LOCK_STORAGE_KEY = 'ucs:viewLocked';
const LOCKED_VIEW_STORAGE_KEY = 'ucs:lockedView';
const SHEET_CAMERA_STORAGE_KEY = 'ucs:sheet-camera';
const CAMERA_SAVE_DELAY_MS = 200;
const WHEEL_COMMIT_DELAY_MS = 150;
const CAMERA_GESTURE_CLASS = 'camera-gesture-active';
// Children with this attribute counter-transform the camera to stay fixed to the viewport.
const CAMERA_INVERSE_LAYER_ATTRIBUTE = 'data-camera-inverse-layer';

// Lets viewport-fixed layers that measure the camera-transformed DOM run after the transform write in the same frame.
const cameraWriteListeners = new Set<(frameTime: number) => void>();
let pendingCameraWrites = 0;

export function subscribeCameraWrite(listener: (frameTime: number) => void): () => void {
  cameraWriteListeners.add(listener);
  return () => { cameraWriteListeners.delete(listener); };
}

export function isCameraWritePending(): boolean {
  return pendingCameraWrites > 0;
}

export function getCameraTransform(pan: { x: number; y: number }, scale: number): string {
  return `translate(${pan.x}px, ${pan.y}px) scale(${scale})`;
}

export function getInverseCameraTransform(pan: { x: number; y: number }, scale: number): string {
  return `translate(${-pan.x / scale}px, ${-pan.y / scale}px) scale(${1 / scale})`;
}

function lockKey(characterId: string | null | undefined): string {
  return characterId ? `${VIEW_LOCK_STORAGE_KEY}:${characterId}` : VIEW_LOCK_STORAGE_KEY;
}

function viewKey(characterId: string | null | undefined): string {
  return characterId ? `${LOCKED_VIEW_STORAGE_KEY}:${characterId}` : LOCKED_VIEW_STORAGE_KEY;
}

interface CameraSettings {
  locked: boolean;
  pan: { x: number; y: number };
  scale: number;
  wheelPanEnabled: boolean;
}

function cameraKey(characterId?: string | null, sheetId?: string | null): string | null {
  return characterId && sheetId ? `${SHEET_CAMERA_STORAGE_KEY}:${characterId}:${sheetId}` : null;
}

function hasCompletedInitialFit(characterId?: string | null, sheetId?: string | null): boolean {
  try {
    const key = cameraKey(characterId, sheetId);
    if (key) {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      if (parsed) return parsed.initialFitComplete !== false;
    }
    return localStorage.getItem(lockKey(characterId)) === 'true';
  } catch {
    return true;
  }
}

function readInitialCamera(characterId: string | null | undefined, sheetId?: string | null): CameraSettings {
  const key = cameraKey(characterId, sheetId);
  try {
    if (key) {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      if (
        parsed && typeof parsed.locked === 'boolean' && typeof parsed.scale === 'number' &&
        parsed.pan && typeof parsed.pan.x === 'number' && typeof parsed.pan.y === 'number' &&
        typeof parsed.wheelPanEnabled === 'boolean'
      ) {
        return parsed;
      }
    }

    const locked = localStorage.getItem(lockKey(characterId)) === 'true';
    if (!locked) return { locked: false, pan: { x: 0, y: 0 }, scale: 1, wheelPanEnabled: false };
    const raw = localStorage.getItem(viewKey(characterId));
    if (!raw) return { locked: true, pan: { x: 0, y: 0 }, scale: 1, wheelPanEnabled: false };
    const parsed = JSON.parse(raw);
    if (
      parsed && typeof parsed.scale === 'number' &&
      parsed.pan && typeof parsed.pan.x === 'number' && typeof parsed.pan.y === 'number'
    ) {
      return { locked: true, pan: parsed.pan, scale: parsed.scale, wheelPanEnabled: false };
    }
  } catch {
    // ignore parse errors
  }
  return { locked: false, pan: { x: 0, y: 0 }, scale: 1, wheelPanEnabled: false };
}

interface UsePanZoomOptions {
  minScale?: number;
  maxScale?: number;
  editingWidgetId: string | null;
  characterId?: string | null;
  sheetId?: string | null;
  onBackgroundClick?: (target?: Element | null) => void;
  /** Camera-transformed element; gestures write its transform directly and commit React state once at the end. */
  contentRef?: RefObject<HTMLElement>;
}

const INTERACTIVE_CANVAS_SELECTOR = [
  'a[href]',
  'button',
  'canvas',
  'input',
  'label',
  'select',
  'summary',
  'textarea',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="switch"]',
  '[role="textbox"]',
  '[data-canvas-interactive]',
  '.drag-handle',
].join(', ');

function isInteractiveCanvasTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest(INTERACTIVE_CANVAS_SELECTOR)) return true;

  const cursor = window.getComputedStyle(target).cursor;
  return !['auto', 'default', 'grab', 'grabbing'].includes(cursor);
}

const NON_TEXT_INPUT_TYPES = new Set(['button', 'checkbox', 'color', 'file', 'image', 'radio', 'range', 'reset', 'submit']);

/** Dragging inside editable text must select it rather than pan the camera. */
function isTextSelectionTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const field = target.closest('input, textarea, [contenteditable="true"], [role="textbox"]');
  if (!field) return false;
  if (field instanceof HTMLInputElement) return !field.disabled && !NON_TEXT_INPUT_TYPES.has(field.type);
  if (field instanceof HTMLTextAreaElement) return !field.disabled;
  return true;
}

const CAMERA_PAN_DRAG_TARGET_SELECTOR = [
  '[data-camera-pan-ignore="true"]',
  '[data-card-deck-grab-all-widget-id]',
  '.card-deck-hit-target',
  '[class*="drag-handle"]',
].join(', ');

function isCameraPanDragTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(CAMERA_PAN_DRAG_TARGET_SELECTOR));
}

function isScrollableCanvasTarget(target: EventTarget | null, canvas: Element): boolean {
  let element = target instanceof Element ? target : null;
  while (element && element !== canvas) {
    const style = window.getComputedStyle(element);
    const canScrollVertically =
      /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight;
    const canScrollHorizontally =
      /(auto|scroll)/.test(style.overflowX) && element.scrollWidth > element.clientWidth;
    if (canScrollVertically || canScrollHorizontally) return true;
    element = element.parentElement;
  }
  return false;
}

export function usePanZoom({ minScale = 0.1, maxScale = 5, editingWidgetId, characterId, sheetId, onBackgroundClick, contentRef }: UsePanZoomOptions) {
  const initial = useRef(readInitialCamera(characterId, sheetId)).current;
  const [pan, setPan] = useState(initial.pan);
  const [scale, setScale] = useState(initial.scale);
  const [viewLocked, setViewLockedState] = useState(initial.locked);
  const [wheelPanEnabled, setWheelPanEnabled] = useState(initial.wheelPanEnabled);
  const [isPanning, setIsPanning] = useState(false);
  const mousePanActive = useRef(false);
  const mousePanMoved = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const mousePanStartPos = useRef({ x: 0, y: 0 });
  const mousePanStartedOnInteractiveTarget = useRef(false);
  const suppressNextInteractiveClick = useRef(false);
  const lastTouchStartTime = useRef(0);
  const viewLockedRef = useRef(viewLocked);
  // Latest camera, including uncommitted gesture previews.
  const panRef = useRef(pan);
  const scaleRef = useRef(scale);
  const cameraFrameRef = useRef<number | null>(null);
  const wheelCommitTimerRef = useRef<number | null>(null);
  // Uncommitted gesture scale, for zoom UI that must follow the gesture without re-rendering the sheet.
  const scalePreviewRef = useRef<number | null>(null);
  const scalePreviewListenersRef = useRef(new Set<() => void>());
  const activeCameraKey = cameraKey(characterId, sheetId);
  const previousCameraKeyRef = useRef(activeCameraKey);
  const [initialFitComplete, setInitialFitComplete] = useState(() => hasCompletedInitialFit(characterId, sheetId));
  useEffect(() => { viewLockedRef.current = viewLocked; }, [viewLocked]);
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);

  const writeCameraTransform = useCallback(() => {
    const content = contentRef?.current;
    if (!content) return;
    content.style.transform = getCameraTransform(panRef.current, scaleRef.current);
    const inverseTransform = getInverseCameraTransform(panRef.current, scaleRef.current);
    content.querySelectorAll<HTMLElement>(`:scope > [${CAMERA_INVERSE_LAYER_ATTRIBUTE}]`).forEach((layer) => {
      layer.style.transform = inverseTransform;
    });
  }, [contentRef]);

  const cancelWheelCommit = useCallback(() => {
    if (wheelCommitTimerRef.current === null) return;
    window.clearTimeout(wheelCommitTimerRef.current);
    wheelCommitTimerRef.current = null;
  }, []);

  const setScalePreview = useCallback((nextScale: number | null) => {
    if (scalePreviewRef.current === nextScale) return;
    scalePreviewRef.current = nextScale;
    scalePreviewListenersRef.current.forEach((listener) => listener());
  }, []);

  const subscribeScalePreview = useCallback((listener: () => void) => {
    scalePreviewListenersRef.current.add(listener);
    return () => { scalePreviewListenersRef.current.delete(listener); };
  }, []);

  const getScalePreview = useCallback(() => scalePreviewRef.current, []);

  // Re-rendering the whole sheet per input event is what makes large sheets stutter, so gestures only touch the DOM.
  const previewCamera = useCallback((nextPan: { x: number; y: number }, nextScale: number) => {
    const scaleChanged = nextScale !== scaleRef.current;
    panRef.current = nextPan;
    scaleRef.current = nextScale;
    if (scaleChanged) setScalePreview(nextScale);
    contentRef?.current?.classList.add(CAMERA_GESTURE_CLASS);
    if (cameraFrameRef.current !== null) return;
    pendingCameraWrites += 1;
    cameraFrameRef.current = window.requestAnimationFrame((frameTime) => {
      cameraFrameRef.current = null;
      pendingCameraWrites -= 1;
      writeCameraTransform();
      cameraWriteListeners.forEach((listener) => listener(frameTime));
    });
  }, [contentRef, setScalePreview, writeCameraTransform]);

  const commitCamera = useCallback((nextPan = panRef.current, nextScale = scaleRef.current) => {
    cancelWheelCommit();
    if (cameraFrameRef.current !== null) {
      window.cancelAnimationFrame(cameraFrameRef.current);
      cameraFrameRef.current = null;
      pendingCameraWrites -= 1;
    }
    panRef.current = nextPan;
    scaleRef.current = nextScale;
    // React skips the write when the committed camera equals the pre-gesture state.
    writeCameraTransform();
    contentRef?.current?.classList.remove(CAMERA_GESTURE_CLASS);
    setPan(nextPan);
    setScale(nextScale);
    setScalePreview(null);
  }, [cancelWheelCommit, contentRef, setScalePreview, writeCameraTransform]);

  useEffect(() => () => {
    if (cameraFrameRef.current !== null) {
      window.cancelAnimationFrame(cameraFrameRef.current);
      cameraFrameRef.current = null;
      pendingCameraWrites -= 1;
    }
    if (wheelCommitTimerRef.current !== null) window.clearTimeout(wheelCommitTimerRef.current);
  }, []);

  useLayoutEffect(() => {
    if (previousCameraKeyRef.current === activeCameraKey) return;
    previousCameraKeyRef.current = activeCameraKey;

    const next = readInitialCamera(characterId, sheetId);
    setInitialFitComplete(hasCompletedInitialFit(characterId, sheetId));
    panRef.current = next.pan;
    scaleRef.current = next.scale;
    viewLockedRef.current = next.locked;
    setPan(next.pan);
    setScale(next.scale);
    setViewLockedState(next.locked);
    setWheelPanEnabled(next.wheelPanEnabled);
  }, [activeCameraKey, characterId, sheetId]);

  useEffect(() => {
    if (!activeCameraKey) return;
    const timeout = window.setTimeout(() => {
      try {
        localStorage.setItem(activeCameraKey, JSON.stringify({
          locked: viewLocked,
          pan,
          scale,
          wheelPanEnabled,
          initialFitComplete,
        }));
      } catch {
        // Camera state is optional when storage is unavailable.
      }
    }, CAMERA_SAVE_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [activeCameraKey, initialFitComplete, pan, scale, viewLocked, wheelPanEnabled]);

  useEffect(() => {
    const handleTouchStart = () => {
      lastTouchStartTime.current = performance.now();
    };
    window.addEventListener('touchstart', handleTouchStart, { capture: true });
    return () => window.removeEventListener('touchstart', handleTouchStart, { capture: true });
  }, []);

  // Use one capture-phase mouse handler so panning works over controls and outside the canvas.
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (mousePanActive.current && mousePanMoved.current) commitCamera();
      mousePanActive.current = false;
      mousePanMoved.current = false;
      setIsPanning(false);
      mousePanStartedOnInteractiveTarget.current = false;
      window.setTimeout(() => { suppressNextInteractiveClick.current = false; }, 0);
    };
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!mousePanActive.current || viewLockedRef.current) return;
      if (!mousePanMoved.current) {
        if (Math.hypot(e.clientX - mousePanStartPos.current.x, e.clientY - mousePanStartPos.current.y) < 4) return;
        mousePanMoved.current = true;
        // The mouseup commit covers any pending wheel preview.
        cancelWheelCommit();
        setIsPanning(true);
      }
      if (mousePanStartedOnInteractiveTarget.current) {
        suppressNextInteractiveClick.current = true;
        e.preventDefault();
      }
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      previewCamera({ x: panRef.current.x + dx, y: panRef.current.y + dy }, scaleRef.current);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mouseup', handleGlobalMouseUp, true);
    window.addEventListener('mousemove', handleGlobalMouseMove, true);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp, true);
      window.removeEventListener('mousemove', handleGlobalMouseMove, true);
    };
  }, [cancelWheelCommit, commitCamera, previewCamera]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    suppressNextInteractiveClick.current = false;
    mousePanActive.current = false;
    mousePanMoved.current = false;
    mousePanStartedOnInteractiveTarget.current = false;
    if (performance.now() - lastTouchStartTime.current < 750) return;
    // Disable panning when editing a widget
    if (editingWidgetId) return;
    // Disable panning when view is locked
    if (viewLockedRef.current) {
      // Still allow background-click selection clearing
      if (!(e.target as HTMLElement).closest('.canvas-widget')) {
        onBackgroundClick?.(e.target as Element);
      }
      return;
    }
    
    if (isCameraPanDragTarget(e.target)) return;
    if (isTextSelectionTarget(e.target)) return;
    const interactiveTarget = isInteractiveCanvasTarget(e.target);

    // Clear the selected widget unless the click stays on it
    if (!interactiveTarget) onBackgroundClick?.(e.target as Element);

    // Left (0) and middle (1) click pan
    if (e.button === 0 || e.button === 1) {
      if (!interactiveTarget) e.preventDefault();
      mousePanActive.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      mousePanStartPos.current = { x: e.clientX, y: e.clientY };
      mousePanStartedOnInteractiveTarget.current = interactiveTarget;
    }
  }, [editingWidgetId, onBackgroundClick]);

  const handleMouseClickCapture = useCallback((e: React.MouseEvent) => {
    if (!suppressNextInteractiveClick.current) return;
    suppressNextInteractiveClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Disable camera wheel controls when editing a widget
    if (editingWidgetId) return;
    // Disable camera wheel controls when view is locked
    if (viewLockedRef.current) return;
    // Let an overflowing widget region receive the wheel event for native scrolling.
    if (isScrollableCanvasTarget(e.target, e.currentTarget)) return;

    const currentPan = panRef.current;
    const currentScale = scaleRef.current;
    if (wheelPanEnabled) {
      previewCamera({ x: currentPan.x, y: currentPan.y - e.deltaY }, currentScale);
    } else {
      // Zoom with scroll wheel relative to mouse cursor
      const zoomSensitivity = e.ctrlKey || e.metaKey ? 0.015 : 0.001;
      const zoomFactor = Math.exp(-e.deltaY * zoomSensitivity);
      const newScale = Math.min(Math.max(currentScale * zoomFactor, minScale), maxScale);

      // Keep the canvas point under the mouse fixed while zooming
      const canvasX = (e.clientX - currentPan.x) / currentScale;
      const canvasY = (e.clientY - currentPan.y) / currentScale;
      previewCamera({ x: e.clientX - canvasX * newScale, y: e.clientY - canvasY * newScale }, newScale);
    }

    // Wheel input has no end event; commit once it goes quiet unless a mouse pan will commit it.
    cancelWheelCommit();
    if (mousePanMoved.current) return;
    wheelCommitTimerRef.current = window.setTimeout(() => {
      wheelCommitTimerRef.current = null;
      commitCamera();
    }, WHEEL_COMMIT_DELAY_MS);
  }, [editingWidgetId, minScale, maxScale, wheelPanEnabled, previewCamera, cancelWheelCommit, commitCamera]);

  const zoomIn = useCallback(() => {
    setScale(s => Math.min(maxScale, s * 1.3));
  }, [maxScale]);

  const zoomOut = useCallback(() => {
    setScale(s => Math.max(minScale, s / 1.3));
  }, [minScale]);

  const resetView = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const setView = useCallback((newPan: { x: number; y: number }, newScale: number) => {
    setPan(newPan);
    setScale(newScale);
  }, []);

  const setViewLocked = useCallback((locked: boolean) => {
    setViewLockedState(locked);
  }, []);

  const completeInitialFit = useCallback(() => {
    setInitialFitComplete(true);
  }, []);

  const toggleViewLock = useCallback(() => {
    setViewLocked(!viewLockedRef.current);
  }, [setViewLocked]);

  return {
    pan,
    scale,
    panRef,
    scaleRef,
    previewCamera,
    commitCamera,
    subscribeScalePreview,
    getScalePreview,
    isPanning,
    viewLocked,
    wheelPanEnabled,
    initialFitComplete,
    setPan,
    setScale,
    setWheelPanEnabled,
    handleMouseDown,
    handleMouseClickCapture,
    handleWheel,
    zoomIn,
    zoomOut,
    resetView,
    setView,
    setViewLocked,
    toggleViewLock,
    completeInitialFit,
  };
}
