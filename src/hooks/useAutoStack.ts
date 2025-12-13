import { useCallback } from 'react';
import { Widget } from '../types';
import { useStore } from '../store/useStore';

interface UseAutoStackOptions {
  widgets: Widget[];
  scale: number;
}

const GRID_SIZE = 10;
const GAP = 10;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface StackableItem {
  type: 'group' | 'single';
  id: string;
  widgets: { id: string; groupId?: string; x: number; y: number; w: number; h: number }[];
  boundingBox: Rect;
  originalOffset: { x: number; y: number };
}

export function useAutoStack({ widgets, scale }: UseAutoStackOptions) {
  const _takeSnapshot = useStore((state) => state._takeSnapshot);
  const updateWidgetPositionNoSnapshot = useStore((state) => state.updateWidgetPositionNoSnapshot);
  
  const handleAutoStack = useCallback(() => {
    if (widgets.length === 0) return;
    
    // Take snapshot before auto-stack (batch operation)
    _takeSnapshot('Auto stack');

    // Get all widget DOM elements and measure their actual sizes
    const widgetElements = document.querySelectorAll('.react-draggable[data-widget-id]');
    const widgetSizes: { id: string; w: number; h: number }[] = [];

    widgetElements.forEach((el) => {
      const id = el.getAttribute('data-widget-id');
      if (id) {
        const rect = el.getBoundingClientRect();
        widgetSizes.push({
          id,
          w: Math.ceil(rect.width / scale / GRID_SIZE) * GRID_SIZE,
          h: Math.ceil(rect.height / scale / GRID_SIZE) * GRID_SIZE,
        });
      }
    });

    // Build widget info with measured sizes
    const widgetInfos = widgets.map(w => {
      const measured = widgetSizes.find(s => s.id === w.id);
      return {
        id: w.id,
        groupId: w.groupId,
        x: w.x,
        y: w.y,
        w: measured ? measured.w : (w.w || 200),
        h: measured ? measured.h : (w.h || 120),
      };
    });

    // Group widgets by groupId
    const groupedWidgets = new Map<string, typeof widgetInfos>();
    const ungroupedWidgets: typeof widgetInfos = [];
    
    for (const widget of widgetInfos) {
      if (widget.groupId) {
        const group = groupedWidgets.get(widget.groupId) || [];
        group.push(widget);
        groupedWidgets.set(widget.groupId, group);
      } else {
        ungroupedWidgets.push(widget);
      }
    }

    const stackableItems: StackableItem[] = [];

    // Process groups
    for (const [groupId, groupWidgets] of groupedWidgets) {
      if (groupWidgets.length === 0) continue;
      
      const minX = Math.min(...groupWidgets.map(w => w.x));
      const minY = Math.min(...groupWidgets.map(w => w.y));
      const maxX = Math.max(...groupWidgets.map(w => w.x + w.w));
      const maxY = Math.max(...groupWidgets.map(w => w.y + w.h));
      
      stackableItems.push({
        type: 'group',
        id: groupId,
        widgets: groupWidgets,
        boundingBox: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
        originalOffset: { x: minX, y: minY },
      });
    }

    // Process ungrouped widgets
    for (const widget of ungroupedWidgets) {
      stackableItems.push({
        type: 'single',
        id: widget.id,
        widgets: [widget],
        boundingBox: { x: widget.x, y: widget.y, w: widget.w, h: widget.h },
        originalOffset: { x: widget.x, y: widget.y },
      });
    }

    // Calculate container width based on total area
    const totalArea = stackableItems.reduce((sum, item) => sum + (item.boundingBox.w + GAP) * (item.boundingBox.h + GAP), 0);
    const CONTAINER_WIDTH = Math.max(800, Math.ceil(Math.sqrt(totalArea * 1.5) / GRID_SIZE) * GRID_SIZE);

    // Sort by original position: top-to-bottom, left-to-right
    const sortedItems = [...stackableItems].sort((a, b) => {
      const ROW_THRESHOLD = 50;
      const rowA = Math.floor(a.boundingBox.y / ROW_THRESHOLD);
      const rowB = Math.floor(b.boundingBox.y / ROW_THRESHOLD);
      if (rowA !== rowB) return rowA - rowB;
      return a.boundingBox.x - b.boundingBox.x;
    });

    // MaxRects bin packing algorithm
    let freeRects: Rect[] = [{ x: 0, y: 0, w: CONTAINER_WIDTH, h: 100000 }];
    const placed: { item: StackableItem; x: number; y: number }[] = [];

    const findBestPosition = (width: number, height: number): { x: number; y: number } | null => {
      let bestScore = Infinity;
      let bestX = 0;
      let bestY = 0;
      let found = false;

      for (const rect of freeRects) {
        if (width <= rect.w && height <= rect.h) {
          const leftoverH = rect.w - width;
          const leftoverV = rect.h - height;
          const shortSide = Math.min(leftoverH, leftoverV);
          const score = rect.y * 10000 + shortSide;

          if (score < bestScore) {
            bestScore = score;
            bestX = rect.x;
            bestY = rect.y;
            found = true;
          }
        }
      }

      return found ? { x: bestX, y: bestY } : null;
    };

    const splitFreeRects = (px: number, py: number, pw: number, ph: number) => {
      const newFreeRects: Rect[] = [];

      for (const rect of freeRects) {
        // No intersection - keep as is
        if (px >= rect.x + rect.w || px + pw <= rect.x ||
            py >= rect.y + rect.h || py + ph <= rect.y) {
          newFreeRects.push(rect);
          continue;
        }

        // Left part
        if (px > rect.x) {
          newFreeRects.push({ x: rect.x, y: rect.y, w: px - rect.x, h: rect.h });
        }
        // Right part
        if (px + pw < rect.x + rect.w) {
          newFreeRects.push({ x: px + pw, y: rect.y, w: rect.x + rect.w - (px + pw), h: rect.h });
        }
        // Top part
        if (py > rect.y) {
          newFreeRects.push({ x: rect.x, y: rect.y, w: rect.w, h: py - rect.y });
        }
        // Bottom part
        if (py + ph < rect.y + rect.h) {
          newFreeRects.push({ x: rect.x, y: py + ph, w: rect.w, h: rect.y + rect.h - (py + ph) });
        }
      }

      // Remove rects contained in others
      freeRects = newFreeRects.filter((a, i) => {
        for (let j = 0; j < newFreeRects.length; j++) {
          if (i === j) continue;
          const b = newFreeRects[j];
          if (a.x >= b.x && a.y >= b.y &&
              a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h) {
            return false;
          }
        }
        return true;
      });
    };

    // Place each stackable item
    for (const item of sortedItems) {
      const itemWidth = item.boundingBox.w + GAP;
      const itemHeight = item.boundingBox.h + GAP;
      const pos = findBestPosition(itemWidth, itemHeight);

      if (pos) {
        const snapX = Math.round(pos.x / GRID_SIZE) * GRID_SIZE;
        const snapY = Math.round(pos.y / GRID_SIZE) * GRID_SIZE;
        placed.push({ item, x: snapX, y: snapY });
        splitFreeRects(snapX, snapY, itemWidth, itemHeight);
      } else {
        // Fallback: place below all others
        const maxY = placed.reduce((max, p) => {
          return Math.max(max, p.y + p.item.boundingBox.h + GAP);
        }, 0);
        placed.push({ item, x: 0, y: maxY });
        splitFreeRects(0, maxY, itemWidth, itemHeight);
      }
    }

    // Update all widget positions
    for (const placement of placed) {
      const { item, x: newX, y: newY } = placement;
      const offsetX = newX - item.originalOffset.x;
      const offsetY = newY - item.originalOffset.y;
      
      for (const widget of item.widgets) {
        const finalX = Math.round((widget.x + offsetX) / GRID_SIZE) * GRID_SIZE;
        const finalY = Math.round((widget.y + offsetY) / GRID_SIZE) * GRID_SIZE;
        updateWidgetPositionNoSnapshot(widget.id, finalX, finalY);
      }
    }
  }, [widgets, scale, _takeSnapshot, updateWidgetPositionNoSnapshot]);

  return { handleAutoStack };
}
