import { useEffect, useState, useMemo } from 'react';
import { Widget } from '../types';

const EDGE_TOLERANCE = 10; // pixels tolerance for edge detection

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
  attachedTo?: string[];
}

interface CornerRounding {
  topLeft: boolean;
  topRight: boolean;
  bottomLeft: boolean;
  bottomRight: boolean;
}

// Calculate which corners should have rounding removed based on attachments
function calculateCornerRounding(
  widget: WidgetRect,
  allWidgets: WidgetRect[]
): CornerRounding {
  const corners: CornerRounding = { topLeft: true, topRight: true, bottomLeft: true, bottomRight: true };
  
  if (!widget.attachedTo || widget.attachedTo.length === 0) {
    return corners;
  }
  
  const currentBounds = {
    left: widget.x,
    right: widget.x + widget.width,
    top: widget.y,
    bottom: widget.y + widget.height,
  };
  
  for (const attachedId of widget.attachedTo) {
    const attachedWidget = allWidgets.find(w => w.id === attachedId);
    if (!attachedWidget) continue;
    
    const attachedBounds = {
      left: attachedWidget.x,
      right: attachedWidget.x + attachedWidget.width,
      top: attachedWidget.y,
      bottom: attachedWidget.y + attachedWidget.height,
    };
    
    // Check if attached widget is on the left side
    if (Math.abs(attachedBounds.right - currentBounds.left) <= EDGE_TOLERANCE) {
      if (attachedBounds.top <= currentBounds.top + EDGE_TOLERANCE && 
          attachedBounds.bottom >= currentBounds.top - EDGE_TOLERANCE) {
        corners.topLeft = false;
      }
      if (attachedBounds.top <= currentBounds.bottom + EDGE_TOLERANCE && 
          attachedBounds.bottom >= currentBounds.bottom - EDGE_TOLERANCE) {
        corners.bottomLeft = false;
      }
    }
    
    // Check if attached widget is on the right side
    if (Math.abs(attachedBounds.left - currentBounds.right) <= EDGE_TOLERANCE) {
      if (attachedBounds.top <= currentBounds.top + EDGE_TOLERANCE && 
          attachedBounds.bottom >= currentBounds.top - EDGE_TOLERANCE) {
        corners.topRight = false;
      }
      if (attachedBounds.top <= currentBounds.bottom + EDGE_TOLERANCE && 
          attachedBounds.bottom >= currentBounds.bottom - EDGE_TOLERANCE) {
        corners.bottomRight = false;
      }
    }
    
    // Check if attached widget is on the top side
    if (Math.abs(attachedBounds.bottom - currentBounds.top) <= EDGE_TOLERANCE) {
      if (attachedBounds.left <= currentBounds.left + EDGE_TOLERANCE && 
          attachedBounds.right >= currentBounds.left - EDGE_TOLERANCE) {
        corners.topLeft = false;
      }
      if (attachedBounds.left <= currentBounds.right + EDGE_TOLERANCE && 
          attachedBounds.right >= currentBounds.right - EDGE_TOLERANCE) {
        corners.topRight = false;
      }
    }
    
    // Check if attached widget is on the bottom side
    if (Math.abs(attachedBounds.top - currentBounds.bottom) <= EDGE_TOLERANCE) {
      if (attachedBounds.left <= currentBounds.left + EDGE_TOLERANCE && 
          attachedBounds.right >= currentBounds.left - EDGE_TOLERANCE) {
        corners.bottomLeft = false;
      }
      if (attachedBounds.left <= currentBounds.right + EDGE_TOLERANCE && 
          attachedBounds.right >= currentBounds.right - EDGE_TOLERANCE) {
        corners.bottomRight = false;
      }
    }
  }
  
  return corners;
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
  const [isDragging, setIsDragging] = useState(false);

  // Create a key based on widget positions and attachments to detect changes
  const positionKey = widgets.map(w => `${w.id}:${w.x}:${w.y}:${(w.attachedTo || []).join(',')}`).join('|');

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
          className="absolute shadow-theme glow-theme"
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
