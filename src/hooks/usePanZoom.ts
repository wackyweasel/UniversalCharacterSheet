import { useState, useRef, useEffect, useCallback } from 'react';

interface UsePanZoomOptions {
  minScale?: number;
  maxScale?: number;
  editingWidgetId: string | null;
  mode: 'play' | 'edit' | 'vertical' | 'print';
}

export function usePanZoom({ minScale = 0.1, maxScale = 5, editingWidgetId, mode }: UsePanZoomOptions) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Global mouse handlers for panning outside window
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsPanning(false);
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isPanning) {
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
    // Disable panning when editing a widget
    if (editingWidgetId) return;
    
    // Ignore if clicking on a widget
    if ((e.target as HTMLElement).closest('.react-draggable')) return;

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
  }, [editingWidgetId, mode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
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
    // Disable zoom when editing a widget
    if (editingWidgetId) return;
    
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
  }, [editingWidgetId, mode, scale, pan, minScale, maxScale]);

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

  return {
    pan,
    scale,
    isPanning,
    setPan,
    setScale,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    zoomIn,
    zoomOut,
    resetView,
    setView,
  };
}
