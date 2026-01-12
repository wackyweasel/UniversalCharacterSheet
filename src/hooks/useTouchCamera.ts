import { useRef, useEffect } from 'react';

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
}: UseTouchCameraOptions) {
  // Touch state - all managed via refs to work in global handlers
  const lastTouchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);
  const activeTouches = useRef<Map<number, { x: number; y: number }>>(new Map());
  const isTouchPanning = useRef(false);
  const touchStartedOnScrollable = useRef(false);
  
  // Refs to avoid stale closures in global touch handlers
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  
  const onBackgroundTouchRef = useRef(onBackgroundTouch);
  useEffect(() => { onBackgroundTouchRef.current = onBackgroundTouch; }, [onBackgroundTouch]);

  useEffect(() => {
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

    let touchStartTarget: Element | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartTarget = e.target as Element;
      }
      
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        activeTouches.current.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
      }
      
      if (touchStartTarget && isOnSidebar(touchStartTarget)) {
        return;
      }
      
      if (e.touches.length === 1) {
        touchStartedOnScrollable.current = isScrollableElement(e.target as Element);
      }
      
      // Two or more fingers - always take over for camera control (pinch zoom)
      if (activeTouches.current.size >= 2) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        onPinchingChange(true);
        
        const touches = Array.from(activeTouches.current.values());
        const dx = touches[0].x - touches[1].x;
        const dy = touches[0].y - touches[1].y;
        lastTouchDistance.current = Math.sqrt(dx * dx + dy * dy);
        lastTouchCenter.current = {
          x: (touches[0].x + touches[1].x) / 2,
          y: (touches[0].y + touches[1].y) / 2
        };
        isTouchPanning.current = false;
      } else if (activeTouches.current.size === 1) {
        const onWidget = touchStartTarget && isOnWidget(touchStartTarget);
        const onScrollable = touchStartedOnScrollable.current;
        const onCanvas = touchStartTarget && isOnCanvas(touchStartTarget);
        const onPrintArea = touchStartTarget && isOnPrintAreaOverlay(touchStartTarget);
        
        // Clear selected widget when touching the background (not on widget, sidebar, canvas, etc.)
        if (!onWidget && !onScrollable && !onCanvas && !onPrintArea) {
          onBackgroundTouchRef.current?.();
        }
        
        // Don't pan if on a canvas (map sketcher), or print area handles - let them handle their own gestures
        const shouldPan = !onScrollable && !onCanvas && !onPrintArea && (modeRef.current === 'play' ? true : !onWidget);
        
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
      if (touchStartTarget && isOnSidebar(touchStartTarget)) {
        return;
      }
      
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        activeTouches.current.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
      }
      
      const touchCount = activeTouches.current.size;
      
      // Two-finger gesture: pinch zoom + pan
      if (touchCount >= 2) {
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
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const currentScale = getScale();
        const currentPan = getPan();
        
        // Calculate zoom
        const zoomFactor = newDistance / lastTouchDistance.current;
        const newScale = Math.min(Math.max(currentScale * zoomFactor, minScale), maxScale);
        
        // Calculate pan to zoom towards center point
        const canvasX = (newCenter.x - currentPan.x) / currentScale;
        const canvasY = (newCenter.y - currentPan.y) / currentScale;
        
        const newPanX = newCenter.x - canvasX * newScale;
        const newPanY = newCenter.y - canvasY * newScale;
        
        // Also handle pan movement during pinch
        const panDx = newCenter.x - lastTouchCenter.current.x;
        const panDy = newCenter.y - lastTouchCenter.current.y;
        
        onScaleChange(newScale);
        onPanChange(() => ({ x: newPanX + panDx, y: newPanY + panDy }));
        
        lastTouchDistance.current = newDistance;
        lastTouchCenter.current = newCenter;
      }
      // Single finger pan
      else if (touchCount === 1 && isTouchPanning.current && lastTouchCenter.current) {
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
      for (let i = 0; i < e.changedTouches.length; i++) {
        activeTouches.current.delete(e.changedTouches[i].identifier);
      }
      
      if (activeTouches.current.size === 0) {
        lastTouchDistance.current = null;
        lastTouchCenter.current = null;
        isTouchPanning.current = false;
        touchStartedOnScrollable.current = false;
        touchStartTarget = null;
        onPinchingChange(false);
      }
      else if (activeTouches.current.size === 1) {
        lastTouchDistance.current = null;
        isTouchPanning.current = false;
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true, capture: true });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: true, capture: true });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart, { capture: true });
      document.removeEventListener('touchmove', handleTouchMove, { capture: true });
      document.removeEventListener('touchend', handleTouchEnd, { capture: true });
      document.removeEventListener('touchcancel', handleTouchEnd, { capture: true });
    };
  }, [onPanChange, onScaleChange, onPinchingChange, getScale, getPan, minScale, maxScale]);

  return {
    isTouchPanning,
  };
}
