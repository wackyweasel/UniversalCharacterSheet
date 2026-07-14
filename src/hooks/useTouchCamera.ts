import { useRef, useEffect } from 'react';

const TOUCH_CAMERA_PINCH_START_EVENT = 'ucs:touch-camera-pinch-start';

export function useTouchCameraPinchCancellation(onCancel: () => void) {
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    const handlePinchStart = () => onCancelRef.current();
    window.addEventListener(TOUCH_CAMERA_PINCH_START_EVENT, handlePinchStart);
    return () => window.removeEventListener(TOUCH_CAMERA_PINCH_START_EVENT, handlePinchStart);
  }, []);
}

interface UseTouchCameraOptions {
  mode: 'play' | 'edit' | 'vertical' | 'print';
  onPanChange: (updater: (prev: { x: number; y: number }) => { x: number; y: number }) => void;
  onScaleChange: (scale: number) => void;
  onPinchingChange: (isPinching: boolean) => void;
  getScale: () => number;
  getPan: () => { x: number; y: number };
  minScale?: number;
  maxScale?: number;
  onBackgroundTouch?: () => void;
  isViewLocked?: () => boolean;
}

export function useTouchCamera({
  mode,
  onPanChange,
  onScaleChange,
  onPinchingChange,
  getScale,
  getPan,
  minScale = 0.1,
  maxScale = 5,
  onBackgroundTouch,
  isViewLocked,
}: UseTouchCameraOptions) {
  // Touch state - all managed via refs to work in global handlers
  const lastTouchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);
  const activeTouches = useRef<Map<number, { x: number; y: number }>>(new Map());
  const touchStartTargets = useRef<Map<number, Element | null>>(new Map());
  const isTouchPanning = useRef(false);
  const touchStartedOnScrollable = useRef(false);
  const pinchSessionActive = useRef(false);
  const activeTouchPointers = useRef<Map<number, { target: Element | null; x: number; y: number }>>(new Map());
  
  // Refs to avoid stale closures in global touch handlers
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  
  const onBackgroundTouchRef = useRef(onBackgroundTouch);
  useEffect(() => { onBackgroundTouchRef.current = onBackgroundTouch; }, [onBackgroundTouch]);

  const isViewLockedRef = useRef(isViewLocked);
  useEffect(() => { isViewLockedRef.current = isViewLocked; }, [isViewLocked]);

  useEffect(() => {
    const syncActiveTouches = (touches: TouchList) => {
      activeTouches.current.clear();
      for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        activeTouches.current.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
      }
    };

    const stopWidgetTouchHandling = (event: TouchEvent) => {
      if (event.cancelable) event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    const setPinchGeometry = () => {
      const touches = Array.from(activeTouches.current.values());
      if (touches.length < 2) return;
      const dx = touches[0].x - touches[1].x;
      const dy = touches[0].y - touches[1].y;
      lastTouchDistance.current = Math.hypot(dx, dy);
      lastTouchCenter.current = {
        x: (touches[0].x + touches[1].x) / 2,
        y: (touches[0].y + touches[1].y) / 2,
      };
    };

    const activatePinchSession = () => {
      isTouchPanning.current = false;
      touchStartedOnScrollable.current = false;
      if (!pinchSessionActive.current) {
        pinchSessionActive.current = true;
        window.dispatchEvent(new CustomEvent(TOUCH_CAMERA_PINCH_START_EVENT));
      }
      onPinchingChange(true);
    };

    const beginPinchSession = (event: TouchEvent) => {
      stopWidgetTouchHandling(event);
      activatePinchSession();
      setPinchGeometry();
    };

    const stopWidgetPointerHandling = (event: PointerEvent, preventDefault = true) => {
      if (preventDefault && event.cancelable) event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    const cancelActiveWidgetPointers = (pointerToKeep: number) => {
      for (const [pointerId, pointer] of activeTouchPointers.current) {
        if (pointerId === pointerToKeep || !pointer.target) continue;
        pointer.target.dispatchEvent(new PointerEvent('pointercancel', {
          bubbles: true,
          pointerId,
          pointerType: 'touch',
          clientX: pointer.x,
          clientY: pointer.y,
        }));
      }
    };

    const setPinchGeometryFromPointers = () => {
      const pointers = Array.from(activeTouchPointers.current.values());
      if (pointers.length < 2) return;
      const dx = pointers[0].x - pointers[1].x;
      const dy = pointers[0].y - pointers[1].y;
      lastTouchDistance.current = Math.hypot(dx, dy);
      lastTouchCenter.current = {
        x: (pointers[0].x + pointers[1].x) / 2,
        y: (pointers[0].y + pointers[1].y) / 2,
      };
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' || !event.isTrusted) return;
      activeTouchPointers.current.set(event.pointerId, {
        target: event.target as Element | null,
        x: event.clientX,
        y: event.clientY,
      });

      if (activeTouchPointers.current.size >= 2) {
        setPinchGeometryFromPointers();
        activatePinchSession();
        cancelActiveWidgetPointers(event.pointerId);
        stopWidgetPointerHandling(event, false);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' || !event.isTrusted) return;
      const pointer = activeTouchPointers.current.get(event.pointerId);
      if (pointer) {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
      }
      if (pinchSessionActive.current) stopWidgetPointerHandling(event);
    };

    const handlePointerEnd = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' || !event.isTrusted) return;
      activeTouchPointers.current.delete(event.pointerId);
      if (pinchSessionActive.current) stopWidgetPointerHandling(event, false);
    };

    // Check if an element or its ancestors have scrollable overflow
    const isScrollableElement = (el: Element | null): boolean => {
      while (el && el !== document.body) {
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        const overflowX = style.overflowX;
        const isScrollable = overflowY === 'auto' || overflowY === 'scroll' || 
                            overflowX === 'auto' || overflowX === 'scroll';
        if (isScrollable) {
          const hasScrollableContent = el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
          if (hasScrollableContent) return true;
        }
        el = el.parentElement;
      }
      return false;
    };
    
    // Check if the target is inside a widget
    const isOnWidget = (el: Element | null): boolean => {
      while (el && el !== document.body) {
        if (el.classList.contains('react-draggable')) return true;
        el = el.parentElement;
      }
      return false;
    };
    
    // Check if the target is inside the sidebar
    const isOnSidebar = (el: Element | null): boolean => {
      while (el && el !== document.body) {
        if (el.classList.contains('fixed') && (el.classList.contains('left-0') || el.classList.contains('right-0'))) {
          return true;
        }
        el = el.parentElement;
      }
      return false;
    };

    // Check if the target is a canvas (e.g., map sketcher)
    const isOnCanvas = (el: Element | null): boolean => {
      if (el && el.tagName === 'CANVAS') return true;
      return false;
    };

    // Check if the target is on a print area resize handle
    const isOnPrintAreaOverlay = (el: Element | null): boolean => {
      while (el && el !== document.body) {
        if (el.classList.contains('print-area-overlay')) return true;
        el = el.parentElement;
      }
      return false;
    };

    const getActiveTouchStartTarget = (): Element | null => {
      const firstActiveTouch = activeTouches.current.keys().next().value as number | undefined;
      if (firstActiveTouch === undefined) return null;
      return touchStartTargets.current.get(firstActiveTouch) || null;
    };

    const hasTouchOnSidebar = (): boolean => {
      for (const [touchId, target] of touchStartTargets.current.entries()) {
        if (!activeTouches.current.has(touchId)) continue;
        if (target && isOnSidebar(target)) return true;
      }
      return false;
    };

    const isOnTouchCameraIgnoredControl = (el: Element | null): boolean => {
      while (el && el !== document.body) {
        if ((el as HTMLElement).dataset?.touchCameraIgnore === 'true') {
          return true;
        }
        el = el.parentElement;
      }
      return false;
    };

    const hasTouchOnIgnoredControl = (): boolean => {
      for (const [touchId, target] of touchStartTargets.current.entries()) {
        if (!activeTouches.current.has(touchId)) continue;
        if (target && isOnTouchCameraIgnoredControl(target)) return true;
      }
      return false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      const eventTarget = e.target as Element | null;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const changedTouch = e.changedTouches[i];
        touchStartTargets.current.set(changedTouch.identifier, changedTouch.target as Element || eventTarget);
      }
      
      syncActiveTouches(e.touches);
      
      const touchStartTarget = getActiveTouchStartTarget();

      // Two or more fingers - always take over for camera control (pinch zoom)
      if (activeTouches.current.size >= 2) {
        beginPinchSession(e);
        return;
      }

      if (pinchSessionActive.current) {
        stopWidgetTouchHandling(e);
        return;
      }

      if (hasTouchOnSidebar() || hasTouchOnIgnoredControl()) {
        return;
      }
      
      if (e.touches.length === 1) {
        touchStartedOnScrollable.current = isScrollableElement(touchStartTarget);
      }
      
      if (activeTouches.current.size === 1) {
        const onWidget = touchStartTarget && isOnWidget(touchStartTarget);
        const onScrollable = touchStartedOnScrollable.current;
        const onCanvas = touchStartTarget && isOnCanvas(touchStartTarget);
        const onPrintArea = touchStartTarget && isOnPrintAreaOverlay(touchStartTarget);
        const onIgnoredControl = touchStartTarget && isOnTouchCameraIgnoredControl(touchStartTarget);
        
        // Clear selected widget when touching the background (not on widget, sidebar, canvas, etc.)
        if (!onWidget && !onScrollable && !onCanvas && !onPrintArea && !onIgnoredControl) {
          onBackgroundTouchRef.current?.();
        }
        
        // Don't pan if on a canvas (map sketcher), or print area handles - let them handle their own gestures
        const shouldPan = !onScrollable && !onCanvas && !onPrintArea && !onIgnoredControl && !isViewLockedRef.current?.() && (modeRef.current === 'play' ? true : !onWidget);
        
        if (shouldPan) {
          const touch = activeTouches.current.values().next().value;
          if (touch) {
            lastTouchCenter.current = { x: touch.x, y: touch.y };
            isTouchPanning.current = true;
          }
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      syncActiveTouches(e.touches);
      
      const touchCount = activeTouches.current.size;
      
      // Two-finger gesture: pinch zoom + pan
      if (touchCount >= 2) {
        stopWidgetTouchHandling(e);
        if (!pinchSessionActive.current) {
          activatePinchSession();
        }
        if (isViewLockedRef.current?.()) {
          return;
        }
        const touches = Array.from(activeTouches.current.values());
        const dx = touches[0].x - touches[1].x;
        const dy = touches[0].y - touches[1].y;
        const newDistance = Math.sqrt(dx * dx + dy * dy);
        const newCenter = {
          x: (touches[0].x + touches[1].x) / 2,
          y: (touches[0].y + touches[1].y) / 2
        };
        
        if (lastTouchDistance.current === null || lastTouchCenter.current === null) {
          lastTouchDistance.current = newDistance;
          lastTouchCenter.current = newCenter;
          isTouchPanning.current = false;
          return;
        }
        
        const currentScale = getScale();
        const currentPan = getPan();
        
        // Calculate zoom
        const zoomFactor = newDistance / lastTouchDistance.current;
        const newScale = Math.min(Math.max(currentScale * zoomFactor, minScale), maxScale);
        
        // Keep the canvas point under the previous center beneath the moving pinch center.
        const canvasX = (lastTouchCenter.current.x - currentPan.x) / currentScale;
        const canvasY = (lastTouchCenter.current.y - currentPan.y) / currentScale;
        const newPanX = newCenter.x - canvasX * newScale;
        const newPanY = newCenter.y - canvasY * newScale;
        
        onScaleChange(newScale);
        onPanChange(() => ({ x: newPanX, y: newPanY }));
        
        lastTouchDistance.current = newDistance;
        lastTouchCenter.current = newCenter;
      }
      // Keep the remaining finger from falling back to a widget gesture.
      else if (pinchSessionActive.current) {
        stopWidgetTouchHandling(e);
      }
      // Single finger pan
      else if (touchCount === 1 && isTouchPanning.current && lastTouchCenter.current) {
        if (hasTouchOnSidebar() || hasTouchOnIgnoredControl()) return;
        const touch = activeTouches.current.values().next().value;
        if (touch) {
          e.preventDefault();
          
          const dx = touch.x - lastTouchCenter.current.x;
          const dy = touch.y - lastTouchCenter.current.y;
          
          onPanChange(prev => ({ x: prev.x + dx, y: prev.y + dy }));
          lastTouchCenter.current = { x: touch.x, y: touch.y };
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      syncActiveTouches(e.touches);
      
      if (activeTouches.current.size === 0) {
        lastTouchDistance.current = null;
        lastTouchCenter.current = null;
        isTouchPanning.current = false;
        touchStartedOnScrollable.current = false;
        touchStartTargets.current.clear();
        activeTouchPointers.current.clear();
        onPinchingChange(false);
        if (pinchSessionActive.current) {
          pinchSessionActive.current = false;
        }
      }
      else if (activeTouches.current.size === 1) {
        lastTouchDistance.current = null;
        lastTouchCenter.current = null;
        isTouchPanning.current = false;
      }

      for (let i = 0; i < e.changedTouches.length; i++) {
        touchStartTargets.current.delete(e.changedTouches[i].identifier);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, { capture: true });
    window.addEventListener('pointermove', handlePointerMove, { capture: true });
    window.addEventListener('pointerup', handlePointerEnd, { capture: true });
    window.addEventListener('pointercancel', handlePointerEnd, { capture: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: false, capture: true });
    
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      window.removeEventListener('pointermove', handlePointerMove, { capture: true });
      window.removeEventListener('pointerup', handlePointerEnd, { capture: true });
      window.removeEventListener('pointercancel', handlePointerEnd, { capture: true });
      window.removeEventListener('touchstart', handleTouchStart, { capture: true });
      window.removeEventListener('touchmove', handleTouchMove, { capture: true });
      window.removeEventListener('touchend', handleTouchEnd, { capture: true });
      window.removeEventListener('touchcancel', handleTouchEnd, { capture: true });
    };
  }, [onPanChange, onScaleChange, onPinchingChange, getScale, getPan, minScale, maxScale]);

  return {
    isTouchPanning,
  };
}
