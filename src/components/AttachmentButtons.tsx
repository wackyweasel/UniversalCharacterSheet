import { useMemo, useState, useEffect } from 'react';
import { Link2, Unlink2 } from 'lucide-react';
import { Widget } from '../types';
import { useStore } from '../store/useStore';
import { Tooltip } from './Tooltip';

interface Props {
  widgets: Widget[];
  scale: number;
}

interface TouchingEdge {
  widget1Id: string;
  widget2Id: string;
  x: number;
  y: number;
  orientation: 'horizontal' | 'vertical';
  direction: 'left' | 'right' | 'up' | 'down'; // direction from widget1 to widget2
  isAttached: boolean;
}

interface WidgetBounds {
  id: string;
  groupId?: string;
  attachedTo?: string[];
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const EDGE_TOLERANCE = 10; // pixels tolerance for edge detection
const OVERLAP_MIN = 20; // minimum overlap needed to show button

export default function AttachmentButtons({ widgets, scale }: Props) {
  const attachWidgets = useStore((state) => state.attachWidgets);
  const detachWidgets = useStore((state) => state.detachWidgets);
  const selectedWidgetId = useStore((state) => state.selectedWidgetId);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredWidgetId, setHoveredWidgetId] = useState<string | null>(null);
  const activeWidgetId = selectedWidgetId || hoveredWidgetId;

  // Create a key based on widget positions to detect when they change
  const positionKey = widgets.map(w => `${w.id}:${w.x}:${w.y}:${w.groupId || ''}`).join('|');

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
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-attach-widget-ids]')) return;

      const widgetEl = target.closest('[data-widget-id]');
      setHoveredWidgetId(widgetEl?.getAttribute('data-widget-id') || null);
    };

    document.addEventListener('mouseover', handleMouseOver);
    return () => document.removeEventListener('mouseover', handleMouseOver);
  }, []);

  // Refresh bounds calculation when widgets change position or scale changes
  useEffect(() => {
    // Small delay to allow DOM to update after widget movement
    const timer = setTimeout(() => {
      setRefreshKey(k => k + 1);
    }, 100);
    return () => clearTimeout(timer);
  }, [positionKey, scale]);

  // Calculate widget bounds from DOM
  const widgetBounds = useMemo(() => {
    const bounds: WidgetBounds[] = [];
    
    widgets.forEach(widget => {
      const el = document.querySelector(`[data-widget-id="${widget.id}"]`) as HTMLElement;
      if (el) {
        const rect = el.getBoundingClientRect();
        // Convert screen coordinates to canvas coordinates
        // Note: The positions are stored in canvas space already
        bounds.push({
          id: widget.id,
          groupId: widget.groupId,
          attachedTo: widget.attachedTo,
          left: widget.x,
          right: widget.x + rect.width / scale,
          top: widget.y,
          bottom: widget.y + rect.height / scale,
        });
      }
    });
    
    return bounds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgets, scale, refreshKey]);

  // Find all touching edges
  const touchingEdges = useMemo(() => {
    const edges: TouchingEdge[] = [];
    
    for (let i = 0; i < widgetBounds.length; i++) {
      for (let j = i + 1; j < widgetBounds.length; j++) {
        const w1 = widgetBounds[i];
        const w2 = widgetBounds[j];
        
        // Check if these two widgets are directly attached (have an edge between them)
        const isAttached = !!(w1.attachedTo?.includes(w2.id) || w2.attachedTo?.includes(w1.id));
        
        // Check if right edge of w1 touches left edge of w2
        if (Math.abs(w1.right - w2.left) <= EDGE_TOLERANCE) {
          const overlapTop = Math.max(w1.top, w2.top);
          const overlapBottom = Math.min(w1.bottom, w2.bottom);
          if (overlapBottom - overlapTop >= OVERLAP_MIN) {
            edges.push({
              widget1Id: w1.id,
              widget2Id: w2.id,
              x: w1.right,
              y: (overlapTop + overlapBottom) / 2,
              orientation: 'vertical',
              direction: 'right', // w2 is to the right of w1
              isAttached,
            });
          }
        }
        
        // Check if left edge of w1 touches right edge of w2
        if (Math.abs(w1.left - w2.right) <= EDGE_TOLERANCE) {
          const overlapTop = Math.max(w1.top, w2.top);
          const overlapBottom = Math.min(w1.bottom, w2.bottom);
          if (overlapBottom - overlapTop >= OVERLAP_MIN) {
            edges.push({
              widget1Id: w1.id,
              widget2Id: w2.id,
              x: w1.left,
              y: (overlapTop + overlapBottom) / 2,
              orientation: 'vertical',
              direction: 'left', // w2 is to the left of w1
              isAttached,
            });
          }
        }
        
        // Check if bottom edge of w1 touches top edge of w2
        if (Math.abs(w1.bottom - w2.top) <= EDGE_TOLERANCE) {
          const overlapLeft = Math.max(w1.left, w2.left);
          const overlapRight = Math.min(w1.right, w2.right);
          if (overlapRight - overlapLeft >= OVERLAP_MIN) {
            edges.push({
              widget1Id: w1.id,
              widget2Id: w2.id,
              x: (overlapLeft + overlapRight) / 2,
              y: w1.bottom,
              orientation: 'horizontal',
              direction: 'down', // w2 is below w1
              isAttached,
            });
          }
        }
        
        // Check if top edge of w1 touches bottom edge of w2
        if (Math.abs(w1.top - w2.bottom) <= EDGE_TOLERANCE) {
          const overlapLeft = Math.max(w1.left, w2.left);
          const overlapRight = Math.min(w1.right, w2.right);
          if (overlapRight - overlapLeft >= OVERLAP_MIN) {
            edges.push({
              widget1Id: w1.id,
              widget2Id: w2.id,
              x: (overlapLeft + overlapRight) / 2,
              y: w1.top,
              orientation: 'horizontal',
              direction: 'up', // w2 is above w1
              isAttached,
            });
          }
        }
      }
    }
    
    return edges;
  }, [widgetBounds]);

  const handleClick = (edge: TouchingEdge) => {
    if (edge.isAttached) {
      // Break the connection - detaches only the active widget completely from its group
      // Determine which widget is active and detach that one
      const widgetToDetach = activeWidgetId === edge.widget1Id ? edge.widget1Id 
        : activeWidgetId === edge.widget2Id ? edge.widget2Id 
        : edge.widget1Id; // fallback
      detachWidgets(widgetToDetach, edge.widget2Id);
    } else {
      const getClusterIds = (widgetId: string): string[] => {
        const widget = widgetBounds.find(w => w.id === widgetId);
        if (!widget?.groupId) {
          return [widgetId];
        }
        return widgetBounds.filter(w => w.groupId === widget.groupId).map(w => w.id);
      };

      const sourceWidgetId = activeWidgetId === edge.widget1Id
        ? edge.widget1Id
        : activeWidgetId === edge.widget2Id
          ? edge.widget2Id
          : edge.widget1Id;
      const targetWidgetId = sourceWidgetId === edge.widget1Id ? edge.widget2Id : edge.widget1Id;

      const sourceIds = new Set(getClusterIds(sourceWidgetId));
      const targetIds = new Set(getClusterIds(targetWidgetId));

      const edgesToAttach = touchingEdges.filter(e => {
        if (e.isAttached) return false;
        const sourceToTarget = sourceIds.has(e.widget1Id) && targetIds.has(e.widget2Id);
        const targetToSource = sourceIds.has(e.widget2Id) && targetIds.has(e.widget1Id);
        return sourceToTarget || targetToSource;
      });

      if (edgesToAttach.length === 0) {
        attachWidgets(edge.widget1Id, edge.widget2Id);
        return;
      }

      for (const e of edgesToAttach) {
        attachWidgets(e.widget1Id, e.widget2Id);
      }
    }
  };

  // Hide attachment buttons while dragging
  if (isDragging) {
    return null;
  }

  // Show attachment actions for the hovered widget or the current touch selection.
  const visibleEdges = activeWidgetId 
    ? touchingEdges.filter(edge => edge.widget1Id === activeWidgetId || edge.widget2Id === activeWidgetId)
    : [];

  return (
    <>
      {visibleEdges.map((edge, index) => {
        const label = edge.isAttached ? 'Detach widgets' : 'Attach widgets';
        
        return (
          <Tooltip key={`${edge.widget1Id}-${edge.widget2Id}-${index}`} content={label}>
            <button
              data-attach-widget-ids={`${edge.widget1Id},${edge.widget2Id}`}
              data-touch-camera-ignore="true"
              aria-label={label}
              className={`widget-attachment-control absolute w-8 h-8 rounded-button flex items-center justify-center border shadow-theme transition-colors ${
                edge.isAttached
                  ? 'bg-theme-ink text-theme-paper border-theme-ink hover:bg-red-500 hover:text-white hover:border-red-500'
                  : 'bg-theme-ink text-theme-paper border-theme-ink hover:brightness-125'
              }`}
              style={{
                left: `${edge.x}px`,
                top: `${edge.y}px`,
                zIndex: 100,
                transform: `translate(-50%, -50%) scale(${1 / scale})`,
              }}
              onClick={() => handleClick(edge)}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClick(edge);
              }}
            >
              {edge.isAttached ? <Unlink2 className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
            </button>
          </Tooltip>
        );
      })}
    </>
  );
}
