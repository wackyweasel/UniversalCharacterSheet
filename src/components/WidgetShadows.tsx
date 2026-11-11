import { useEffect, useState, useMemo, useSyncExternalStore } from 'react';
import { Widget } from '../types';
import { getWidgetDragState, subscribeWidgetDragState } from './widgetDragRegistry';
import { calculateCornerRounding, type CornerRounding, type WidgetRect } from '../utils/groupChrome';

const isAnyWidgetDragging = () => getWidgetDragState() !== null;

interface Props {
  widgets: Widget[];
  scale: number;
}

function getBorderRadiusStyle(corners: CornerRounding): React.CSSProperties {
  const r = 'var(--border-radius)';
  const zero = '0px';
  return {
    borderTopLeftRadius: corners.topLeft ? r : zero,
    borderTopRightRadius: corners.topRight ? r : zero,
    borderBottomLeftRadius: corners.bottomLeft ? r : zero,
    borderBottomRightRadius: corners.bottomRight ? r : zero,
  };
}

export default function WidgetShadows({ widgets, scale }: Props) {
  const [rects, setRects] = useState<WidgetRect[]>([]);
  const isDragging = useSyncExternalStore(subscribeWidgetDragState, isAnyWidgetDragging, isAnyWidgetDragging);

  // Create a key based on widget positions and attachments to detect changes
  const positionKey = widgets.map(w => `${w.id}:${w.x}:${w.y}:${(w.attachedTo || []).join(',')}`).join('|');

  useEffect(() => {
    // Small delay to allow DOM to update after widget movement
    const timer = setTimeout(() => {
      const newRects: WidgetRect[] = [];
      
      widgets.forEach(widget => {
        const el = document.querySelector(`[data-widget-id="${widget.id}"]`) as HTMLElement;
        if (el) {
          newRects.push({
            id: widget.id,
            x: widget.x,
            y: widget.y,
            width: el.offsetWidth,
            height: el.offsetHeight,
            attachedTo: widget.attachedTo,
          });
        }
      });
      
      setRects(newRects);
    }, 50);
    
    return () => clearTimeout(timer);
  }, [widgets, scale, positionKey]);

  // Calculate corner rounding for each widget
  const cornerStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    rects.forEach(rect => {
      const corners = calculateCornerRounding(rect, rects);
      styles[rect.id] = getBorderRadiusStyle(corners);
    });
    return styles;
  }, [rects]);

  // Hide shadows while dragging to avoid visual artifacts
  if (isDragging) {
    return null;
  }

  return (
    <div className="pointer-events-none">
      {rects.map(rect => (
        <div
          key={`shadow-${rect.id}`}
          className="widget-shadow-effect absolute shadow-theme glow-theme"
          style={{
            left: `${rect.x}px`,
            top: `${rect.y}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            ...cornerStyles[rect.id],
          }}
        />
      ))}
    </div>
  );
}
