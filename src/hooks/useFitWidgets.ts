import { useCallback } from 'react';
import { Widget } from '../types';

interface UseFitWidgetsOptions {
  widgets: Widget[];
  scale: number;
  setScale: (scale: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  minScale?: number;
  maxScale?: number;
}

export function useFitWidgets({
  widgets,
  scale,
  setScale,
  setPan,
  minScale = 0.1,
  maxScale = 5,
}: UseFitWidgetsOptions) {
  const handleFitAllWidgets = useCallback(() => {
    if (widgets.length === 0) {
      setScale(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    // Get all widget DOM elements and measure their actual sizes
    const widgetElements = document.querySelectorAll('.react-draggable[data-widget-id]');
    const widgetBounds: { x: number; y: number; w: number; h: number }[] = [];

    widgetElements.forEach((el) => {
      const id = el.getAttribute('data-widget-id');
      const widget = widgets.find(w => w.id === id);
      if (widget) {
        const rect = el.getBoundingClientRect();
        widgetBounds.push({
          x: widget.x,
          y: widget.y,
          w: rect.width / scale,
          h: rect.height / scale,
        });
      }
    });

    if (widgetBounds.length === 0) {
      setScale(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    // Calculate bounding box of all widgets
    const minX = Math.min(...widgetBounds.map(b => b.x));
    const minY = Math.min(...widgetBounds.map(b => b.y));
    const maxX = Math.max(...widgetBounds.map(b => b.x + b.w));
    const maxY = Math.max(...widgetBounds.map(b => b.y + b.h));

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Add padding (in pixels)
    const padding = 60;
    const availableWidth = viewportWidth - padding * 2;
    const availableHeight = viewportHeight - padding * 2;

    // Calculate scale to fit all widgets
    const scaleX = availableWidth / contentWidth;
    const scaleY = availableHeight / contentHeight;
    const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), minScale), maxScale);

    // Calculate center of widgets bounding box
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Calculate pan to center the content
    const newPanX = viewportWidth / 2 - centerX * newScale;
    const newPanY = viewportHeight / 2 - centerY * newScale;

    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
  }, [widgets, scale, setScale, setPan, minScale, maxScale]);

  return { handleFitAllWidgets };
}
