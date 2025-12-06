import { useEffect, useState } from 'react';
import { Widget } from '../types';

interface Props {
  widgets: Widget[];
  scale: number;
}

interface WidgetRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function WidgetShadows({ widgets, scale }: Props) {
  const [rects, setRects] = useState<WidgetRect[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Create a key based on widget positions to detect changes
  const positionKey = widgets.map(w => `${w.id}:${w.x}:${w.y}`).join('|');

  // Detect when dragging starts/stops by watching for react-draggable-dragging class
  useEffect(() => {
    const checkDragging = () => {
      const draggingElement = document.querySelector('.react-draggable-dragging');
      setIsDragging(!!draggingElement);
    };

    // Use MutationObserver to watch for class changes
    const observer = new MutationObserver(checkDragging);
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Small delay to allow DOM to update after widget movement
    const timer = setTimeout(() => {
      const newRects: WidgetRect[] = [];
      
      widgets.forEach(widget => {
        const el = document.querySelector(`[data-widget-id="${widget.id}"]`) as HTMLElement;
        if (el) {
          const rect = el.getBoundingClientRect();
          newRects.push({
            id: widget.id,
            x: widget.x,
            y: widget.y,
            width: rect.width / scale,
            height: rect.height / scale,
          });
        }
      });
      
      setRects(newRects);
    }, 50);
    
    return () => clearTimeout(timer);
  }, [widgets, scale, positionKey]);

  // Hide shadows while dragging to avoid visual artifacts
  if (isDragging) {
    return null;
  }

  return (
    <div className="pointer-events-none">
      {rects.map(rect => (
        <div
          key={`shadow-${rect.id}`}
          className="absolute shadow-theme rounded-theme"
          style={{
            left: `${rect.x}px`,
            top: `${rect.y}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
          }}
        />
      ))}
    </div>
  );
}
