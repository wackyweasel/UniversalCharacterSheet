import { useMemo, useState, useEffect } from 'react';
import { Widget } from '../types';
import { useStore } from '../store/useStore';

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

const EDGE_TOLERANCE = 5; // pixels tolerance for edge detection
const OVERLAP_MIN = 20; // minimum overlap needed to show button

export default function AttachmentButtons({ widgets, scale }: Props) {
  const attachWidgets = useStore((state) => state.attachWidgets);
  const detachWidgets = useStore((state) => state.detachWidgets);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredWidgetId, setHoveredWidgetId] = useState<string | null>(null);

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

  // Track which widget is being hovered
  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if hovering an attachment button - keep the current hovered widget
      const attachButton = target.closest('[data-attach-widget-ids]');
      if (attachButton) {
        // Don't change hoveredWidgetId - keep the last hovered widget
        return;
      }
      
      // Check if hovering a widget
      const widgetEl = target.closest('[data-widget-id]');
      if (widgetEl) {
        setHoveredWidgetId(widgetEl.getAttribute('data-widget-id'));
      } else {
        setHoveredWidgetId(null);
      }
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
      // Break the connection - detaches only the hovered widget completely from its group
      // Determine which widget is hovered and detach that one
      const widgetToDetach = hoveredWidgetId === edge.widget1Id ? edge.widget1Id 
        : hoveredWidgetId === edge.widget2Id ? edge.widget2Id 
        : edge.widget1Id; // fallback
      detachWidgets(widgetToDetach, edge.widget2Id);
    } else {
      // When attaching, find the widget being added and the group it's joining
      const w1 = widgetBounds.find(w => w.id === edge.widget1Id);
      const w2 = widgetBounds.find(w => w.id === edge.widget2Id);
      
      if (!w1 || !w2) {
        attachWidgets(edge.widget1Id, edge.widget2Id);
        return;
      }
      
      // Determine which widget is joining which group
      // The widget without a group (or with a different group) is the "joining" widget
      let joiningWidgetId: string;
      let targetGroupId: string | undefined;
      
      if (w2.groupId && !w1.groupId) {
        joiningWidgetId = w1.id;
        targetGroupId = w2.groupId;
      } else if (w1.groupId && !w2.groupId) {
        joiningWidgetId = w2.id;
        targetGroupId = w1.groupId;
      } else if (w1.groupId && w2.groupId && w1.groupId !== w2.groupId) {
        // Both have groups - we'll merge, but for simplicity just attach this edge
        attachWidgets(edge.widget1Id, edge.widget2Id);
        return;
      } else {
        // Neither has a group - just attach normally
        attachWidgets(edge.widget1Id, edge.widget2Id);
        return;
      }
      
      // Find all unattached edges between the joining widget and any widget in the target group
      const edgesToAttach = touchingEdges.filter(e => {
        if (e.isAttached) return false;
        
        const eW1 = widgetBounds.find(w => w.id === e.widget1Id);
        const eW2 = widgetBounds.find(w => w.id === e.widget2Id);
        
        if (!eW1 || !eW2) return false;
        
        // Check if this edge connects the joining widget to the target group
        if (e.widget1Id === joiningWidgetId && eW2.groupId === targetGroupId) return true;
        if (e.widget2Id === joiningWidgetId && eW1.groupId === targetGroupId) return true;
        
        return false;
      });
      
      // Attach all found edges
      for (const e of edgesToAttach) {
        attachWidgets(e.widget1Id, e.widget2Id);
      }
    }
  };

  // Hide attachment buttons while dragging
  if (isDragging) {
    return null;
  }

  // Filter edges to only show those connected to the hovered widget
  const visibleEdges = hoveredWidgetId 
    ? touchingEdges.filter(edge => edge.widget1Id === hoveredWidgetId || edge.widget2Id === hoveredWidgetId)
    : [];

  return (
    <>
      {visibleEdges.map((edge, index) => (
        <button
          key={`${edge.widget1Id}-${edge.widget2Id}-${index}`}
          data-attach-widget-ids={`${edge.widget1Id},${edge.widget2Id}`}
          className={`absolute w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all transform -translate-x-1/2 -translate-y-1/2 hover:scale-125 ${
            edge.isAttached 
              ? 'bg-green-500 hover:bg-red-500 text-white' 
              : 'bg-blue-500 hover:bg-green-500 text-white'
          }`}
          style={{
            left: `${edge.x}px`,
            top: `${edge.y}px`,
            zIndex: 150,
          }}
          onClick={() => handleClick(edge)}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          title={edge.isAttached ? 'Click to detach widgets' : 'Click to attach widgets'}
        >
          {edge.isAttached ? '🔗' : '⊕'}
        </button>
      ))}
    </>
  );
}
