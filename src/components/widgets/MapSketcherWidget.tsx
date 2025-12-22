import { useState, useRef, useEffect, useCallback } from 'react';
import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

type Tool = 'free' | 'ellipse' | 'rectangle' | 'corridor' | 'auto' | 'eraser' | 'clearAll';

interface Point {
  x: number;
  y: number;
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

export default function MapSketcherWidget({ widget, mode, width, height }: Props) {
  const { label, mapShapes = [], strokeColor = '#333333', strokeWidth = 2, gridEnabled = true, gridSize = 20, corridorWidth = 10 } = widget.data;
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  
  const [shapes, setShapes] = useState<Shape[]>(mapShapes as Shape[]);
  const [currentTool, setCurrentTool] = useState<Tool>('auto');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Pan and zoom state
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  
  // Clear all confirmation state
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Undo history - each entry is { type: 'add' | 'erase', shapes: Shape[] }
  const [undoHistory, setUndoHistory] = useState<{ type: 'add' | 'erase'; shapes: Shape[] }[]>([]);
  
  // Eraser state - track shapes erased in current stroke for undo
  const [isErasing, setIsErasing] = useState(false);
  const [erasedInStroke, setErasedInStroke] = useState<Shape[]>([]);

  const tools: { tool: Tool; icon: string; label: string }[] = [
    { tool: 'auto', icon: '✨', label: 'Auto Detect' },
    { tool: 'free', icon: '✏️', label: 'Free Draw' },
    { tool: 'rectangle', icon: '⬜', label: 'Rectangle' },
    { tool: 'ellipse', icon: '⭕', label: 'Ellipse' },
    { tool: 'corridor', icon: '▬', label: 'Corridor' },
    { tool: 'eraser', icon: '✕', label: 'Eraser' },
    { tool: 'clearAll', icon: '🗑️', label: 'Clear All' },
  ];
  
  // Navigation functions
  const panAmount = 50;
  const panLeft = () => setPanOffset(p => ({ ...p, x: p.x + panAmount }));
  const panRight = () => setPanOffset(p => ({ ...p, x: p.x - panAmount }));
  const panUp = () => setPanOffset(p => ({ ...p, y: p.y + panAmount }));
  const panDown = () => setPanOffset(p => ({ ...p, y: p.y - panAmount }));
  const zoomIn = () => setZoom(z => Math.min(z * 1.25, 4));
  const zoomOut = () => setZoom(z => Math.max(z / 1.25, 0.25));
  const resetView = () => { setPanOffset({ x: 0, y: 0 }); setZoom(1); };

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

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply pan and zoom transform
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    // Draw grid if enabled
    if (gridEnabled) {
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 0.5 / zoom;
      // Extend grid to cover panned/zoomed area
      const startX = Math.floor(-panOffset.x / zoom / gridSize) * gridSize;
      const startY = Math.floor(-panOffset.y / zoom / gridSize) * gridSize;
      const endX = startX + canvas.width / zoom + gridSize * 2;
      const endY = startY + canvas.height / zoom + gridSize * 2;
      
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
    }

    // Draw all shapes
    for (const shape of shapes) {
      ctx.strokeStyle = shape.color;
      ctx.lineWidth = shape.strokeWidth;
      ctx.fillStyle = shape.color + '20'; // Semi-transparent fill
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
      ctx.strokeStyle = strokeColor;
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
        ctx.fillStyle = strokeColor + '20';
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
        ctx.fillStyle = strokeColor + '20';
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (currentTool === 'corridor' && startPoint && currentPoints.length > 0) {
        const lastPoint = currentPoints[currentPoints.length - 1];
        ctx.fillStyle = strokeColor + '20';
        drawCorridor(ctx, startPoint, lastPoint, corridorWidth);
        ctx.fill();
        ctx.stroke();
      }
    }
    
    // Restore context after transforms
    ctx.restore();
  }, [shapes, currentPoints, isDrawing, currentTool, strokeColor, strokeWidth, gridEnabled, gridSize, startPoint, corridorWidth, panOffset, zoom]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Resize canvas when widget size changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas && container) {
      const toolbarHeight = 32;
      const labelHeight = label ? 20 : 0;
      // Use container's actual width for responsive sizing
      const containerWidth = container.clientWidth;
      const canvasWidth = Math.max(containerWidth - 8, 100);
      const canvasHeight = Math.max(height - toolbarHeight - labelHeight - 12, 100);
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      // Also set CSS size to match internal size for 1:1 pixel mapping
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;
      drawCanvas();
    }
  }, [width, height, label, drawCanvas]);

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    // Account for any scaling difference between canvas internal size and display size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Convert screen coordinates to canvas coordinates, then to world coordinates (accounting for pan/zoom)
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;
    
    // Convert to world coordinates by reversing the pan and zoom transforms
    return {
      x: (canvasX - panOffset.x) / zoom,
      y: (canvasY - panOffset.y) / zoom
    };
  };

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

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode === 'edit') return; // Don't draw in edit mode
    e.stopPropagation();
    
    if (currentTool === 'clearAll') {
      if (shapes.length > 0) {
        setShowClearConfirm(true);
      }
      return;
    }
    
    if (currentTool === 'eraser') {
      setIsErasing(true);
      setErasedInStroke([]);
      const point = getCanvasPoint(e);
      const shapeId = findShapeAtPoint(point);
      if (shapeId) {
        const erasedShape = shapes.find(s => s.id === shapeId);
        if (erasedShape) {
          setErasedInStroke([erasedShape]);
          setShapes(prev => prev.filter(s => s.id !== shapeId));
        }
      }
      return;
    }
    
    const point = getCanvasPoint(e);
    setIsDrawing(true);
    setStartPoint(point);
    setCurrentPoints([point]);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    
    // Handle eraser dragging
    if (isErasing && currentTool === 'eraser') {
      const point = getCanvasPoint(e);
      const shapeId = findShapeAtPoint(point);
      if (shapeId) {
        const erasedShape = shapes.find(s => s.id === shapeId);
        if (erasedShape) {
          setErasedInStroke(prev => [...prev, erasedShape]);
          setShapes(prev => prev.filter(s => s.id !== shapeId));
        }
      }
      return;
    }
    
    if (!isDrawing) return;
    
    const point = getCanvasPoint(e);
    setCurrentPoints(prev => [...prev, point]);
  };

  const handlePointerUp = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    
    // Finish erasing - add to undo history
    if (isErasing) {
      setIsErasing(false);
      if (erasedInStroke.length > 0) {
        setUndoHistory(prev => [...prev, { type: 'erase', shapes: erasedInStroke }]);
      }
      setErasedInStroke([]);
      return;
    }
    
    if (!isDrawing) return;
    
    setIsDrawing(false);
    
    if (currentPoints.length < 2) {
      setCurrentPoints([]);
      setStartPoint(null);
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
  };

  const handleToolSelect = (tool: Tool) => {
    if (tool === 'clearAll') {
      if (shapes.length > 0) {
        setShowClearConfirm(true);
      }
    } else {
      setCurrentTool(tool);
    }
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

  return (
    <div ref={containerRef} className="flex flex-col w-full h-full gap-1 relative">
      {label && (
        <div className="font-bold text-center text-xs text-theme-ink font-heading flex-shrink-0">
          {label}
        </div>
      )}

      {/* Clear Confirmation Dialog */}
      {showClearConfirm && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 rounded-button">
          <div className="bg-theme-paper border-[length:var(--border-width)] border-theme-border rounded-button p-4 shadow-lg max-w-xs text-center">
            <p className="text-theme-ink text-sm mb-3">Clear all shapes?</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={confirmClearAll}
                onMouseDown={(e) => e.stopPropagation()}
                className="px-3 py-1 text-xs border-[length:var(--border-width)] border-theme-border rounded-button bg-red-500 text-white hover:bg-red-600"
              >
                Clear
              </button>
              <button
                onClick={cancelClearAll}
                onMouseDown={(e) => e.stopPropagation()}
                className="px-3 py-1 text-xs border-[length:var(--border-width)] border-theme-border rounded-button bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex gap-1 justify-center flex-wrap flex-shrink-0 px-1">
        {tools.map(({ tool, icon, label: toolLabel }) => (
          <button
            key={tool}
            onClick={() => handleToolSelect(tool)}
            onMouseDown={(e) => e.stopPropagation()}
            className={`p-1 text-xs border-[length:var(--border-width)] border-theme-border rounded-button transition-all ${
              currentTool === tool && tool !== 'clearAll'
                ? 'bg-theme-accent text-theme-paper'
                : 'bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
            }`}
            title={toolLabel}
          >
            {icon}
          </button>
        ))}
        {undoHistory.length > 0 && (
          <button
            onClick={undoLastShape}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 text-xs border-[length:var(--border-width)] border-theme-border rounded-button bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper"
            title="Undo"
          >
            ↩️
          </button>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 border-[length:var(--border-width)] border-theme-border rounded-button overflow-hidden bg-white mx-1 mb-1 relative">
        <canvas
          ref={canvasRef}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          className="touch-none cursor-crosshair"
          style={{ display: 'block' }}
        />
        
        {/* Navigation controls - bottom right */}
        <div className="absolute bottom-2 right-2 flex gap-1 items-end">
          {/* Arrow cross */}
          <div className="grid grid-cols-3 gap-0.5">
            <div />
            <button onClick={panUp} onMouseDown={(e) => e.stopPropagation()} className="p-1 text-xs border-[length:var(--border-width)] border-theme-border rounded-button bg-theme-paper/90 text-theme-ink hover:bg-theme-accent hover:text-theme-paper" title="Pan Up">▲</button>
            <div />
            <button onClick={panLeft} onMouseDown={(e) => e.stopPropagation()} className="p-1 text-xs border-[length:var(--border-width)] border-theme-border rounded-button bg-theme-paper/90 text-theme-ink hover:bg-theme-accent hover:text-theme-paper" title="Pan Left">◀</button>
            <button onClick={resetView} onMouseDown={(e) => e.stopPropagation()} className="p-1 text-xs border-[length:var(--border-width)] border-theme-border rounded-button bg-theme-paper/90 text-theme-ink hover:bg-theme-accent hover:text-theme-paper" title="Reset View">⟲</button>
            <button onClick={panRight} onMouseDown={(e) => e.stopPropagation()} className="p-1 text-xs border-[length:var(--border-width)] border-theme-border rounded-button bg-theme-paper/90 text-theme-ink hover:bg-theme-accent hover:text-theme-paper" title="Pan Right">▶</button>
            <div />
            <button onClick={panDown} onMouseDown={(e) => e.stopPropagation()} className="p-1 text-xs border-[length:var(--border-width)] border-theme-border rounded-button bg-theme-paper/90 text-theme-ink hover:bg-theme-accent hover:text-theme-paper" title="Pan Down">▼</button>
            <div />
          </div>
          {/* Zoom vertical */}
          <div className="flex flex-col gap-0.5">
            <button onClick={zoomIn} onMouseDown={(e) => e.stopPropagation()} className="p-1 text-xs border-[length:var(--border-width)] border-theme-border rounded-button bg-theme-paper/90 text-theme-ink hover:bg-theme-accent hover:text-theme-paper" title="Zoom In">+</button>
            <button onClick={zoomOut} onMouseDown={(e) => e.stopPropagation()} className="p-1 text-xs border-[length:var(--border-width)] border-theme-border rounded-button bg-theme-paper/90 text-theme-ink hover:bg-theme-accent hover:text-theme-paper" title="Zoom Out">−</button>
          </div>
        </div>
      </div>
    </div>
  );
}






