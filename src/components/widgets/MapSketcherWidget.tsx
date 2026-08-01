import { PointerEvent as ReactPointerEvent, useState, useRef, useEffect, useCallback } from 'react';
import { Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { Tooltip } from '../Tooltip';
import { useTouchCameraPinchCancellation } from '../../hooks/useTouchCamera';
import { EraserIcon, HandIcon, MinusIcon, PlusIcon, ResetIcon, TrashIcon, UndoIcon } from '../icons';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
  sheetScale?: number;
}

type Tool = 'pan' | 'free' | 'ellipse' | 'rectangle' | 'corridor' | 'auto' | 'eraser';

interface Point {
  x: number;
  y: number;
}

interface CanvasSize {
  width: number;
  height: number;
}

interface PanDrag {
  pointerId: number;
  pointerOrigin: Point;
  panOrigin: Point;
}

interface Shape {
  id: string;
  type: 'free' | 'ellipse' | 'rectangle' | 'corridor';
  points: Point[]; // For free draw
  bounds?: { x: number; y: number; width: number; height: number }; // For rectangle/ellipse
  // For corridor: start and end points define the center line
  corridorStart?: Point;
  corridorEnd?: Point;
  corridorWidth?: number; // Width of the corridor
  color: string;
  strokeWidth: number;
}

// Shape detection utilities
function getDistance(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

function resolveSketchColor(color: string, themeInk: string) {
  const normalized = color.trim().toLowerCase();
  return normalized === '#333' || normalized === '#333333' ? themeInk : color;
}

function withCanvasAlpha(color: string, alpha: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color;
}

// Draw an angled corridor (rectangle) given start and end center points
function drawCorridor(ctx: CanvasRenderingContext2D, start: Point, end: Point, width: number) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const halfWidth = width / 2;
  
  // Calculate the 4 corners of the corridor rectangle
  const perpX = Math.cos(angle + Math.PI / 2) * halfWidth;
  const perpY = Math.sin(angle + Math.PI / 2) * halfWidth;
  
  ctx.beginPath();
  ctx.moveTo(start.x + perpX, start.y + perpY);
  ctx.lineTo(end.x + perpX, end.y + perpY);
  ctx.lineTo(end.x - perpX, end.y - perpY);
  ctx.lineTo(start.x - perpX, start.y - perpY);
  ctx.closePath();
}

// Get the best fit line (start and end points) for a set of points
function getBestFitLine(points: Point[]): { start: Point; end: Point } {
  if (points.length < 2) {
    return { start: points[0] || { x: 0, y: 0 }, end: points[0] || { x: 0, y: 0 } };
  }
  
  // Use first and last points as the line endpoints
  return { start: points[0], end: points[points.length - 1] };
}

function getBoundingBox(points: Point[]): { x: number; y: number; width: number; height: number } {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// Calculate the perpendicular distance from a point to a line defined by two points
// This returns distance to the infinite line (used for shape detection)
function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const lineLen = getDistance(lineStart, lineEnd);
  if (lineLen === 0) return getDistance(point, lineStart);
  
  // Calculate perpendicular distance using cross product
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const crossProduct = Math.abs((point.x - lineStart.x) * dy - (point.y - lineStart.y) * dx);
  return crossProduct / lineLen;
}

// Calculate distance from a point to a line SEGMENT (not infinite line)
function pointToSegmentDistance(point: Point, segStart: Point, segEnd: Point): number {
  const lineLen = getDistance(segStart, segEnd);
  if (lineLen === 0) return getDistance(point, segStart);
  
  // Project point onto line and clamp to segment
  const dx = segEnd.x - segStart.x;
  const dy = segEnd.y - segStart.y;
  
  // t is the parameter along the line segment (0 = start, 1 = end)
  let t = ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / (lineLen * lineLen);
  t = Math.max(0, Math.min(1, t)); // Clamp to segment
  
  // Find the closest point on the segment
  const closestX = segStart.x + t * dx;
  const closestY = segStart.y + t * dy;
  
  return getDistance(point, { x: closestX, y: closestY });
}

// Check if points form a corridor (elongated line shape) regardless of angle
function isCorridorShape(points: Point[]): boolean {
  if (points.length < 2) return false;
  
  const start = points[0];
  const end = points[points.length - 1];
  const lineLength = getDistance(start, end);
  
  // If it's extremely short, just accept it as a corridor
  if (lineLength < 20) {
    return true;
  }
  
  // Calculate average deviation from the straight line
  let totalDeviation = 0;
  for (const p of points) {
    totalDeviation += pointToLineDistance(p, start, end);
  }
  const avgDeviation = totalDeviation / points.length;
  
  // For short-medium lines, use absolute deviation threshold
  if (lineLength < 50) {
    return avgDeviation < 20;
  }
  
  // Longer lines: use ratio
  const straightnessRatio = lineLength / Math.max(avgDeviation, 1);
  return straightnessRatio > 2;
}

function detectShape(points: Point[]): 'ellipse' | 'rectangle' | 'corridor' | 'free' {
  if (points.length < 10) return 'free';

  const bounds = getBoundingBox(points);
  
  // Check if the shape is closed (start and end points are close)
  const startEnd = getDistance(points[0], points[points.length - 1]);
  const perimeter = points.reduce((acc, p, i) => {
    if (i === 0) return 0;
    return acc + getDistance(points[i - 1], p);
  }, 0);
  const isClosed = startEnd < perimeter * 0.15;

  if (!isClosed) {
    // Check for corridor using line-based detection (works for any angle)
    if (isCorridorShape(points)) {
      return 'corridor';
    }
    return 'free';
  }

  // Calculate how well points fit on an ellipse vs rectangle
  const halfWidth = bounds.width / 2;
  const halfHeight = bounds.height / 2;
  const centerX = bounds.x + halfWidth;
  const centerY = bounds.y + halfHeight;

  let ellipseScore = 0;
  let rectScore = 0;

  for (const p of points) {
    // Ellipse: (x-cx)²/a² + (y-cy)²/b² should be close to 1
    const ellipseVal = ((p.x - centerX) ** 2) / (halfWidth ** 2) + ((p.y - centerY) ** 2) / (halfHeight ** 2);
    ellipseScore += Math.abs(ellipseVal - 1);

    // Rectangle: points should be close to edges
    const distToLeft = Math.abs(p.x - bounds.x);
    const distToRight = Math.abs(p.x - (bounds.x + bounds.width));
    const distToTop = Math.abs(p.y - bounds.y);
    const distToBottom = Math.abs(p.y - (bounds.y + bounds.height));
    const minDistToEdge = Math.min(distToLeft, distToRight, distToTop, distToBottom);
    rectScore += minDistToEdge;
  }

  ellipseScore /= points.length;
  rectScore /= points.length;

  // Normalize scores
  const avgDim = (bounds.width + bounds.height) / 2;
  rectScore /= avgDim;

  // Check for corners (sharp angle changes) - more corners = rectangle
  let cornerCount = 0;
  for (let i = 2; i < points.length; i++) {
    const p1 = points[i - 2];
    const p2 = points[i - 1];
    const p3 = points[i];
    
    const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
    let angleDiff = Math.abs(angle2 - angle1);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
    
    if (angleDiff > Math.PI / 4) cornerCount++;
  }

  // If we detect 3-5 strong corners, it's likely a rectangle
  if (cornerCount >= 3 && cornerCount <= 8) {
    return 'rectangle';
  }

  // Otherwise compare scores
  if (ellipseScore < 0.5) {
    return 'ellipse';
  }

  if (rectScore < 0.1) {
    return 'rectangle';
  }

  return ellipseScore < rectScore * 2 ? 'ellipse' : 'rectangle';
}

const MIN_MAP_ZOOM = 0.2;
const MAX_MAP_ZOOM = 3;

export default function MapSketcherWidget({ widget, mode, sheetScale = 1 }: Props) {
  const { label, mapShapes = [], strokeColor = '#333333', strokeWidth = 2, gridEnabled = true, gridSize = 20, corridorWidth = 10 } = widget.data;
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const [themeRevision, setThemeRevision] = useState(0);
  
  const [shapes, setShapes] = useState<Shape[]>(mapShapes as Shape[]);
  const [currentTool, setCurrentTool] = useState<Tool>('auto');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasShellRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 1, height: 1 });
  
  // Pan and zoom state
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [panDrag, setPanDrag] = useState<PanDrag | null>(null);
  
  // Clear all confirmation state
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Undo history - each entry is { type: 'add' | 'erase', shapes: Shape[] }
  const [undoHistory, setUndoHistory] = useState<{ type: 'add' | 'erase'; shapes: Shape[] }[]>([]);
  
  // Eraser state - track shapes erased in current stroke for undo
  const [isErasing, setIsErasing] = useState(false);
  const erasedInStrokeRef = useRef<Shape[]>([]);
  const shapesBeforeEraseRef = useRef<Shape[] | null>(null);
  const activePointerRef = useRef<number | null>(null);

  const releaseActivePointer = useCallback(() => {
    const canvas = canvasRef.current;
    const pointerId = activePointerRef.current;
    if (canvas && pointerId !== null && canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
    activePointerRef.current = null;
  }, []);

  useTouchCameraPinchCancellation(() => {
    if (panDrag) setPanOffset(panDrag.panOrigin);
    releaseActivePointer();
    setIsDrawing(false);
    setCurrentPoints([]);
    setStartPoint(null);
    setIsErasing(false);
    erasedInStrokeRef.current = [];
    if (shapesBeforeEraseRef.current) {
      setShapes(shapesBeforeEraseRef.current);
      shapesBeforeEraseRef.current = null;
    }
    setPanDrag(null);
  });

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeRevision((revision) => revision + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, []);

  const tools: { tool: Tool; icon: React.ReactNode; label: string }[] = [
    { tool: 'pan', icon: <HandIcon className="w-4 h-4" />, label: 'Pan map' },
    { tool: 'auto', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>, label: 'Auto Detect' },
    { tool: 'free', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>, label: 'Free Draw' },
    { tool: 'rectangle', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>, label: 'Rectangle' },
    { tool: 'ellipse', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="12" rx="10" ry="8"/></svg>, label: 'Ellipse' },
    { tool: 'corridor', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h16v6H4z"/></svg>, label: 'Corridor' },
    { tool: 'eraser', icon: <EraserIcon className="w-4 h-4" />, label: 'Erase shape' },
  ];
  
  // Navigation functions
  const screenToWorld = useCallback((point: Point): Point => ({
    x: (point.x - panOffset.x) / zoom,
    y: (point.y - panOffset.y) / zoom,
  }), [panOffset.x, panOffset.y, zoom]);

  const setZoomAroundPoint = useCallback((nextZoom: number, anchor: Point) => {
    const clampedZoom = Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, nextZoom));
    const worldAnchor = screenToWorld(anchor);
    setZoom(clampedZoom);
    setPanOffset({
      x: anchor.x - worldAnchor.x * clampedZoom,
      y: anchor.y - worldAnchor.y * clampedZoom,
    });
  }, [screenToWorld]);

  const zoomBy = (factor: number) => {
    setZoomAroundPoint(zoom * factor, { x: canvasSize.width / 2, y: canvasSize.height / 2 });
  };
  const zoomIn = () => zoomBy(1.2);
  const zoomOut = () => zoomBy(1 / 1.2);
  const resetView = () => { setPanOffset({ x: 0, y: 0 }); setZoom(1); };

  const handleWheel = useCallback((event: WheelEvent) => {
    if (mode === 'edit' || mode === 'print') return;
    event.preventDefault();
    event.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const point = {
      x: (event.clientX - rect.left) * (canvasSize.width / rect.width),
      y: (event.clientY - rect.top) * (canvasSize.height / rect.height),
    };
    setZoomAroundPoint(zoom * Math.exp(-event.deltaY * 0.0015), point);
  }, [canvasSize.height, canvasSize.width, mode, setZoomAroundPoint, zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Save shapes to widget data when they change
  useEffect(() => {
    updateWidgetData(widget.id, { mapShapes: shapes });
  }, [shapes]);

  // Draw everything on canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const physicalScale = Math.max(1, window.devicePixelRatio * sheetScale);
    const backingWidth = Math.max(1, Math.round(canvasSize.width * physicalScale));
    const backingHeight = Math.max(1, Math.round(canvasSize.height * physicalScale));
    if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
      canvas.width = backingWidth;
      canvas.height = backingHeight;
    }
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;
    ctx.setTransform(physicalScale, 0, 0, physicalScale, 0, 0);
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    const styles = getComputedStyle(canvas);
    const themeInk = styles.getPropertyValue('--color-ink').trim() || '#111827';
    ctx.fillStyle = styles.getPropertyValue('--color-paper').trim() || '#ffffff';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    
    // Apply pan and zoom transform
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    // Draw grid if enabled
    if (gridEnabled) {
      ctx.strokeStyle = styles.getPropertyValue('--color-border').trim() || '#cbd5e1';
      ctx.globalAlpha = 0.58;
      ctx.lineWidth = 0.5 / zoom;
      // Extend grid to cover panned/zoomed area
      const startX = Math.floor(-panOffset.x / zoom / gridSize) * gridSize;
      const startY = Math.floor(-panOffset.y / zoom / gridSize) * gridSize;
      const endX = startX + canvasSize.width / zoom + gridSize * 2;
      const endY = startY + canvasSize.height / zoom + gridSize * 2;
      
      for (let x = startX; x <= endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Draw all shapes
    for (const shape of shapes) {
      const shapeColor = resolveSketchColor(shape.color, themeInk);
      ctx.strokeStyle = shapeColor;
      ctx.lineWidth = shape.strokeWidth;
      ctx.fillStyle = withCanvasAlpha(shapeColor, '20');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (shape.type === 'free' && shape.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++) {
          ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
        ctx.stroke();
      } else if (shape.type === 'rectangle' && shape.bounds) {
        ctx.beginPath();
        ctx.rect(shape.bounds.x, shape.bounds.y, shape.bounds.width, shape.bounds.height);
        ctx.fill();
        ctx.stroke();
      } else if (shape.type === 'ellipse' && shape.bounds) {
        ctx.beginPath();
        ctx.ellipse(
          shape.bounds.x + shape.bounds.width / 2,
          shape.bounds.y + shape.bounds.height / 2,
          shape.bounds.width / 2,
          shape.bounds.height / 2,
          0, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
      } else if (shape.type === 'corridor' && shape.corridorStart && shape.corridorEnd) {
        // Draw corridor as an angled rectangle
        drawCorridor(ctx, shape.corridorStart, shape.corridorEnd, shape.corridorWidth || 20);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Draw current drawing in progress
    if (isDrawing && currentPoints.length > 0) {
      const activeStrokeColor = resolveSketchColor(strokeColor, themeInk);
      ctx.strokeStyle = activeStrokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (currentTool === 'free' || currentTool === 'auto') {
        ctx.beginPath();
        ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
        for (let i = 1; i < currentPoints.length; i++) {
          ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
        }
        ctx.stroke();
      } else if (currentTool === 'rectangle' && startPoint && currentPoints.length > 0) {
        const lastPoint = currentPoints[currentPoints.length - 1];
        const x = Math.min(startPoint.x, lastPoint.x);
        const y = Math.min(startPoint.y, lastPoint.y);
        const w = Math.abs(lastPoint.x - startPoint.x);
        const h = Math.abs(lastPoint.y - startPoint.y);
        ctx.fillStyle = withCanvasAlpha(activeStrokeColor, '20');
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.fill();
        ctx.stroke();
      } else if (currentTool === 'ellipse' && startPoint && currentPoints.length > 0) {
        const lastPoint = currentPoints[currentPoints.length - 1];
        const x = Math.min(startPoint.x, lastPoint.x);
        const y = Math.min(startPoint.y, lastPoint.y);
        const w = Math.abs(lastPoint.x - startPoint.x);
        const h = Math.abs(lastPoint.y - startPoint.y);
        ctx.fillStyle = withCanvasAlpha(activeStrokeColor, '20');
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (currentTool === 'corridor' && startPoint && currentPoints.length > 0) {
        const lastPoint = currentPoints[currentPoints.length - 1];
        ctx.fillStyle = withCanvasAlpha(activeStrokeColor, '20');
        drawCorridor(ctx, startPoint, lastPoint, corridorWidth);
        ctx.fill();
        ctx.stroke();
      }
    }
    
    // Restore context after transforms
    ctx.restore();
  }, [canvasSize.height, canvasSize.width, shapes, currentPoints, isDrawing, currentTool, strokeColor, strokeWidth, gridEnabled, gridSize, startPoint, corridorWidth, panOffset, sheetScale, themeRevision, zoom]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    const shell = canvasShellRef.current;
    if (!shell) return;
    const updateSize = () => setCanvasSize({
      width: Math.max(1, shell.clientWidth),
      height: Math.max(1, shell.clientHeight),
    });
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  const getCanvasScreenPoint = useCallback((event: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvasSize.width / rect.width),
      y: (event.clientY - rect.top) * (canvasSize.height / rect.height),
    };
  }, [canvasSize.height, canvasSize.width]);

  const getCanvasPoint = useCallback((event: ReactPointerEvent<HTMLCanvasElement>): Point => (
    screenToWorld(getCanvasScreenPoint(event))
  ), [getCanvasScreenPoint, screenToWorld]);

  // Hit detection for eraser tool
  const findShapeAtPoint = (point: Point): string | null => {
    const hitRadius = 5 / zoom; // Small hit radius for precise erasing
    
    // Check shapes in reverse order (top-most first)
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      
      if (shape.type === 'free' && shape.points.length > 0) {
        // Check if point is near any segment of the free draw
        for (let j = 0; j < shape.points.length - 1; j++) {
          const p1 = shape.points[j];
          const p2 = shape.points[j + 1];
          const dist = pointToSegmentDistance(point, p1, p2);
          if (dist < hitRadius + shape.strokeWidth / 2) {
            return shape.id;
          }
        }
      } else if (shape.type === 'rectangle' && shape.bounds) {
        const b = shape.bounds;
        // Check if point is near the rectangle border (only the stroke itself)
        const strokeHit = hitRadius + shape.strokeWidth / 2;
        const nearLeft = Math.abs(point.x - b.x) < strokeHit && point.y >= b.y && point.y <= b.y + b.height;
        const nearRight = Math.abs(point.x - (b.x + b.width)) < strokeHit && point.y >= b.y && point.y <= b.y + b.height;
        const nearTop = Math.abs(point.y - b.y) < strokeHit && point.x >= b.x && point.x <= b.x + b.width;
        const nearBottom = Math.abs(point.y - (b.y + b.height)) < strokeHit && point.x >= b.x && point.x <= b.x + b.width;
        if (nearLeft || nearRight || nearTop || nearBottom) {
          return shape.id;
        }
      } else if (shape.type === 'ellipse' && shape.bounds) {
        const b = shape.bounds;
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        const rx = b.width / 2;
        const ry = b.height / 2;
        // Check if point is near the ellipse border
        if (rx > 0 && ry > 0) {
          const normalizedDist = Math.sqrt(((point.x - cx) / rx) ** 2 + ((point.y - cy) / ry) ** 2);
          const tolerance = (hitRadius + shape.strokeWidth / 2) / Math.min(rx, ry);
          if (Math.abs(normalizedDist - 1) < tolerance) {
            return shape.id;
          }
        }
      } else if (shape.type === 'corridor' && shape.corridorStart && shape.corridorEnd) {
        const dist = pointToLineDistance(point, shape.corridorStart, shape.corridorEnd);
        const halfWidth = (shape.corridorWidth || 20) / 2;
        // Only hit if within the corridor bounds
        if (dist < halfWidth + hitRadius) {
          // Also check if within the corridor length
          const length = getDistance(shape.corridorStart, shape.corridorEnd);
          const distToStart = getDistance(point, shape.corridorStart);
          const distToEnd = getDistance(point, shape.corridorEnd);
          if (distToStart <= length + hitRadius && distToEnd <= length + hitRadius) {
            return shape.id;
          }
        }
      }
    }
    return null;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (mode !== 'play' || (event.button !== 0 && event.button !== 1)) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerRef.current = event.pointerId;

    const screenPoint = getCanvasScreenPoint(event);
    if (currentTool === 'pan' || event.button === 1) {
      setPanDrag({ pointerId: event.pointerId, pointerOrigin: screenPoint, panOrigin: panOffset });
      return;
    }
    
    if (currentTool === 'eraser') {
      shapesBeforeEraseRef.current = shapes;
      setIsErasing(true);
      erasedInStrokeRef.current = [];
      const point = getCanvasPoint(event);
      const shapeId = findShapeAtPoint(point);
      if (shapeId) {
        const erasedShape = shapes.find(s => s.id === shapeId);
        if (erasedShape) {
          erasedInStrokeRef.current = [erasedShape];
          setShapes(prev => prev.filter(s => s.id !== shapeId));
        }
      }
      return;
    }
    
    const point = getCanvasPoint(event);
    setIsDrawing(true);
    setStartPoint(point);
    setCurrentPoints([point]);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (mode !== 'play') return;

    if (panDrag?.pointerId === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
      const point = getCanvasScreenPoint(event);
      setPanOffset({
        x: panDrag.panOrigin.x + point.x - panDrag.pointerOrigin.x,
        y: panDrag.panOrigin.y + point.y - panDrag.pointerOrigin.y,
      });
      return;
    }

    event.stopPropagation();
    
    // Handle eraser dragging
    if (isErasing && currentTool === 'eraser') {
      const point = getCanvasPoint(event);
      const shapeId = findShapeAtPoint(point);
      if (shapeId) {
        const erasedShape = shapes.find(s => s.id === shapeId);
        if (erasedShape && !erasedInStrokeRef.current.some((shape) => shape.id === shapeId)) {
          erasedInStrokeRef.current.push(erasedShape);
          setShapes(prev => prev.filter(s => s.id !== shapeId));
        }
      }
      return;
    }
    
    if (!isDrawing) return;
    
    const point = getCanvasPoint(event);
    setCurrentPoints(prev => [...prev, point]);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.stopPropagation();

    if (panDrag?.pointerId === event.pointerId) {
      setPanDrag(null);
      releaseActivePointer();
      return;
    }
    
    // Finish erasing - add to undo history
    if (isErasing) {
      setIsErasing(false);
      if (erasedInStrokeRef.current.length > 0) {
        setUndoHistory(prev => [...prev, { type: 'erase', shapes: [...erasedInStrokeRef.current] }]);
      }
      erasedInStrokeRef.current = [];
      shapesBeforeEraseRef.current = null;
      releaseActivePointer();
      return;
    }
    
    if (!isDrawing) {
      releaseActivePointer();
      return;
    }
    
    setIsDrawing(false);
    
    if (currentPoints.length < 2) {
      setCurrentPoints([]);
      setStartPoint(null);
      releaseActivePointer();
      return;
    }

    let newShape: Shape;
    const id = `shape-${Date.now()}`;

    if (currentTool === 'free') {
      newShape = {
        id,
        type: 'free',
        points: currentPoints,
        color: strokeColor,
        strokeWidth
      };
    } else if (currentTool === 'auto') {
      const detectedType = detectShape(currentPoints);
      
      if (detectedType === 'free') {
        newShape = {
          id,
          type: 'free',
          points: currentPoints,
          color: strokeColor,
          strokeWidth
        };
      } else if (detectedType === 'corridor') {
        // For corridors, use best fit line from the drawn points
        const { start, end } = getBestFitLine(currentPoints);
        newShape = {
          id,
          type: 'corridor',
          points: [],
          corridorStart: start,
          corridorEnd: end,
          corridorWidth: corridorWidth,
          color: strokeColor,
          strokeWidth
        };
      } else {
        const bounds = getBoundingBox(currentPoints);
        newShape = {
          id,
          type: detectedType,
          points: [],
          bounds,
          color: strokeColor,
          strokeWidth
        };
      }
    } else if (currentTool === 'corridor') {
      // Corridor tool - use start and end points
      const lastPoint = currentPoints[currentPoints.length - 1];
      newShape = {
        id,
        type: 'corridor',
        points: [],
        corridorStart: startPoint!,
        corridorEnd: lastPoint,
        corridorWidth: corridorWidth,
        color: strokeColor,
        strokeWidth
      };
    } else {
      // Rectangle or ellipse tool
      const bounds = startPoint && currentPoints.length > 0 ? {
        x: Math.min(startPoint.x, currentPoints[currentPoints.length - 1].x),
        y: Math.min(startPoint.y, currentPoints[currentPoints.length - 1].y),
        width: Math.abs(currentPoints[currentPoints.length - 1].x - startPoint.x),
        height: Math.abs(currentPoints[currentPoints.length - 1].y - startPoint.y)
      } : getBoundingBox(currentPoints);

      newShape = {
        id,
        type: currentTool as 'rectangle' | 'ellipse',
        points: [],
        bounds,
        color: strokeColor,
        strokeWidth
      };
    }

    setShapes(prev => [...prev, newShape]);
    setUndoHistory(prev => [...prev, { type: 'add', shapes: [newShape] }]);
    setCurrentPoints([]);
    setStartPoint(null);
    releaseActivePointer();
  };

  const cancelPointerGesture = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (panDrag?.pointerId === event.pointerId) setPanOffset(panDrag.panOrigin);
    if (shapesBeforeEraseRef.current) setShapes(shapesBeforeEraseRef.current);
    setPanDrag(null);
    setIsDrawing(false);
    setCurrentPoints([]);
    setStartPoint(null);
    setIsErasing(false);
    erasedInStrokeRef.current = [];
    shapesBeforeEraseRef.current = null;
    releaseActivePointer();
  };

  const handleToolSelect = (tool: Tool) => {
    setCurrentTool(tool);
  };
  
  const confirmClearAll = () => {
    setUndoHistory(prev => [...prev, { type: 'erase', shapes: shapes }]);
    setShapes([]);
    setShowClearConfirm(false);
  };
  
  const cancelClearAll = () => {
    setShowClearConfirm(false);
  };

  const undoLastShape = () => {
    if (undoHistory.length > 0) {
      const lastAction = undoHistory[undoHistory.length - 1];
      if (lastAction.type === 'erase') {
        // Restore erased shapes
        setShapes(prev => [...prev, ...lastAction.shapes]);
      } else {
        // Remove added shape
        setShapes(prev => prev.filter(s => !lastAction.shapes.some(ls => ls.id === s.id)));
      }
      setUndoHistory(prev => prev.slice(0, -1));
    }
  };

  const toolButtonClass = (active: boolean, disabled = false) => `w-7 h-7 flex items-center justify-center border border-theme-border rounded-button transition-colors ${
    active ? 'bg-theme-accent text-theme-paper' : 'bg-theme-paper text-theme-ink hover:bg-theme-background'
  } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`;

  return (
    <div className="flex flex-col w-full h-full min-h-0 gap-1 relative">
      {label && (
        <div className="widget-header flex-shrink-0">
          <div className="widget-header-title min-w-0 flex-1 truncate">{label}</div>
        </div>
      )}

      {/* Clear Confirmation Dialog */}
      {showClearConfirm && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 rounded-button">
          <div className="bg-theme-paper border border-theme-border rounded-button p-4 shadow-lg max-w-xs text-center">
            <p className="text-theme-ink text-sm mb-3">Clear all shapes?</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={confirmClearAll}
                onMouseDown={(e) => e.stopPropagation()}
                className="px-3 py-1 text-xs border border-theme-border rounded-button bg-red-500 text-white hover:bg-red-600"
              >
                Clear
              </button>
              <button
                onClick={cancelClearAll}
                onMouseDown={(e) => e.stopPropagation()}
                className="px-3 py-1 text-xs border border-theme-border rounded-button bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar - hidden in print mode */}
      {mode !== 'print' && (
        <div role="toolbar" aria-label="Map sketcher tools" className="mx-1 flex flex-shrink-0 flex-wrap items-center justify-center gap-1 rounded-button border border-theme-border bg-theme-background/80 p-1 shadow-sm">
          {tools.map(({ tool, icon, label: toolLabel }) => (
            <Tooltip key={tool} content={toolLabel}>
              <button
                type="button"
                aria-label={toolLabel}
                aria-pressed={currentTool === tool}
                onClick={() => handleToolSelect(tool)}
                onPointerDown={(event) => event.stopPropagation()}
                className={toolButtonClass(currentTool === tool)}
              >
                {icon}
              </button>
            </Tooltip>
          ))}
          <Tooltip content="Undo last shape">
            <button type="button" aria-label="Undo last shape" disabled={undoHistory.length === 0} onClick={undoLastShape} onPointerDown={(event) => event.stopPropagation()} className={toolButtonClass(false, undoHistory.length === 0)}>
              <UndoIcon className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="Clear sketch">
            <button type="button" aria-label="Clear sketch" disabled={shapes.length === 0} onClick={() => setShowClearConfirm(true)} onPointerDown={(event) => event.stopPropagation()} className={toolButtonClass(false, shapes.length === 0)}>
              <TrashIcon className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      )}

      {/* Canvas */}
      <div ref={canvasShellRef} className="relative min-h-0 flex-1 overflow-hidden rounded-theme border border-theme-border bg-theme-paper mx-1 mb-1">
        <canvas
          ref={canvasRef}
          tabIndex={mode === 'play' ? 0 : -1}
          aria-label={`Map sketcher with ${shapes.length} shape${shapes.length === 1 ? '' : 's'}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={cancelPointerGesture}
          onContextMenu={(event) => event.preventDefault()}
          className={`block touch-none outline-none focus-visible:ring-2 focus-visible:ring-theme-accent focus-visible:ring-inset ${
            mode !== 'play' ? 'cursor-default' : currentTool === 'pan' || panDrag ? 'cursor-grab active:cursor-grabbing' : currentTool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'
          }`}
        />
        
        {/* Navigation controls - bottom right - hidden in print mode */}
        {mode !== 'print' && (
          <div className="absolute bottom-2 right-2 z-10 flex h-8 items-center overflow-hidden rounded-button border border-theme-border bg-theme-paper/95 shadow-theme backdrop-blur-sm" onPointerDown={(event) => event.stopPropagation()}>
            <Tooltip content="Zoom out">
              <button type="button" aria-label="Zoom sketch out" onClick={zoomOut} className="flex h-8 w-8 items-center justify-center text-theme-ink hover:bg-theme-background">
                <MinusIcon className="h-4 w-4" />
              </button>
            </Tooltip>
            <button type="button" aria-label="Reset sketch view" onClick={resetView} className="flex h-8 min-w-12 items-center justify-center gap-1 border-x border-theme-border px-1.5 text-[10px] font-semibold tabular-nums text-theme-ink hover:bg-theme-background">
              <ResetIcon className="h-3.5 w-3.5" />
              {Math.round(zoom * 100)}%
            </button>
            <Tooltip content="Zoom in">
              <button type="button" aria-label="Zoom sketch in" onClick={zoomIn} className="flex h-8 w-8 items-center justify-center text-theme-ink hover:bg-theme-background">
                <PlusIcon className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
}






