import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';

const VIEW_LOCK_STORAGE_KEY = 'ucs:viewLocked';
const LOCKED_VIEW_STORAGE_KEY = 'ucs:lockedView';

function lockKey(characterId: string | null | undefined): string {
  return characterId ? `${VIEW_LOCK_STORAGE_KEY}:${characterId}` : VIEW_LOCK_STORAGE_KEY;
}

function viewKey(characterId: string | null | undefined): string {
  return characterId ? `${LOCKED_VIEW_STORAGE_KEY}:${characterId}` : LOCKED_VIEW_STORAGE_KEY;
}

function readInitialLock(characterId: string | null | undefined): { locked: boolean; pan: { x: number; y: number }; scale: number } {
  try {
    const locked = localStorage.getItem(lockKey(characterId)) === 'true';
    if (!locked) return { locked: false, pan: { x: 0, y: 0 }, scale: 1 };
    const raw = localStorage.getItem(viewKey(characterId));
    if (!raw) return { locked: true, pan: { x: 0, y: 0 }, scale: 1 };
    const parsed = JSON.parse(raw);
    if (
      parsed && typeof parsed.scale === 'number' &&
      parsed.pan && typeof parsed.pan.x === 'number' && typeof parsed.pan.y === 'number'
    ) {
      return { locked: true, pan: parsed.pan, scale: parsed.scale };
    }
  } catch {
    // ignore parse errors
  }
  return { locked: false, pan: { x: 0, y: 0 }, scale: 1 };
}

interface UsePanZoomOptions {
  minScale?: number;
  maxScale?: number;
  editingWidgetId: string | null;
  mode: 'play' | 'edit' | 'vertical' | 'print';
  characterId?: string | null;
  onBackgroundClick?: () => void;
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

export function usePanZoom({ minScale = 0.1, maxScale = 5, editingWidgetId, mode, characterId, onBackgroundClick }: UsePanZoomOptions) {
  const initial = useRef(readInitialLock(characterId)).current;
  const [pan, setPan] = useState(initial.pan);
  const [scale, setScale] = useState(initial.scale);
  const [viewLocked, setViewLockedState] = useState(initial.locked);
  const [wheelPanEnabled, setWheelPanEnabled] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const lastTouchStartTime = useRef(0);
  const viewLockedRef = useRef(viewLocked);
  useEffect(() => { viewLockedRef.current = viewLocked; }, [viewLocked]);

  useEffect(() => {
    const handleTouchStart = () => {
      lastTouchStartTime.current = performance.now();
    };
    window.addEventListener('touchstart', handleTouchStart, { capture: true });
    return () => window.removeEventListener('touchstart', handleTouchStart, { capture: true });
  }, []);

  // Global mouse handlers for panning outside window
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsPanning(false);
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        if (viewLockedRef.current) return;
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isPanning]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (performance.now() - lastTouchStartTime.current < 750) return;
    // Disable panning when editing a widget
    if (editingWidgetId) return;
    // Disable panning when view is locked
    if (viewLockedRef.current) {
      // Still allow background-click selection clearing
      if (!(e.target as HTMLElement).closest('.react-draggable')) {
        onBackgroundClick?.();
      }
      return;
    }
    
    // Preserve controls and widget manipulation while allowing inert widget space to pan.
    if (isInteractiveCanvasTarget(e.target)) return;

    // Clear selected widget when clicking on the background
    onBackgroundClick?.();

    // In play/print mode: Left Click (0) to pan
    // In edit mode: Left Click (0) and Middle Click (1) to pan
    if (mode === 'play' || mode === 'print') {
      if (e.button === 0) {
        e.preventDefault();
        setIsPanning(true);
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    } else {
      if (e.button === 0 || e.button === 1) {
        e.preventDefault();
        setIsPanning(true);
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    }
  }, [editingWidgetId, mode, onBackgroundClick]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      if (viewLockedRef.current) return;
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Disable camera wheel controls when editing a widget
    if (editingWidgetId) return;
    // Disable camera wheel controls when view is locked
    if (viewLockedRef.current) return;
    // Let an overflowing widget region receive the wheel event for native scrolling.
    if (isScrollableCanvasTarget(e.target, e.currentTarget)) return;

    if (wheelPanEnabled) {
      setPan(currentPan => ({ x: currentPan.x, y: currentPan.y - e.deltaY }));
      return;
    }
    
    // Zoom with scroll wheel relative to mouse cursor
    const zoomFactor = Math.exp(-e.deltaY * 0.001);
    const newScale = Math.min(Math.max(scale * zoomFactor, minScale), maxScale);
    
    // Get mouse position relative to the viewport
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    // Calculate the point in canvas space that the mouse is over
    const canvasX = (mouseX - pan.x) / scale;
    const canvasY = (mouseY - pan.y) / scale;
    
    // After zoom, we want the same canvas point to be under the mouse
    const newPanX = mouseX - canvasX * newScale;
    const newPanY = mouseY - canvasY * newScale;
    
    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
  }, [editingWidgetId, scale, pan, minScale, maxScale, wheelPanEnabled]);

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

  const panRef = useRef(pan);
  const scaleRefInternal = useRef(scale);
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { scaleRefInternal.current = scale; }, [scale]);

  const setViewLocked = useCallback((locked: boolean) => {
    setViewLockedState(locked);
    try {
      if (locked) {
        localStorage.setItem(lockKey(characterId), 'true');
        localStorage.setItem(
          viewKey(characterId),
          JSON.stringify({ pan: panRef.current, scale: scaleRefInternal.current }),
        );
      } else {
        localStorage.removeItem(lockKey(characterId));
        localStorage.removeItem(viewKey(characterId));
      }
    } catch {
      // ignore storage errors (quota, privacy mode)
    }
  }, [characterId]);

  const toggleViewLock = useCallback(() => {
    setViewLocked(!viewLockedRef.current);
  }, [setViewLocked]);

  // Re-apply the lock state (and locked view) for the active character when it changes.
  const prevCharacterIdRef = useRef(characterId);
  useLayoutEffect(() => {
    if (prevCharacterIdRef.current === characterId) return;
    prevCharacterIdRef.current = characterId;
    const next = readInitialLock(characterId);
    viewLockedRef.current = next.locked;
    setViewLockedState(next.locked);
    if (next.locked) {
      setPan(next.pan);
      setScale(next.scale);
    }
  }, [characterId]);

  return {
    pan,
    scale,
    isPanning,
    viewLocked,
    wheelPanEnabled,
    setPan,
    setScale,
    setWheelPanEnabled,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    zoomIn,
    zoomOut,
    resetView,
    setView,
    setViewLocked,
    toggleViewLock,
  };
}
