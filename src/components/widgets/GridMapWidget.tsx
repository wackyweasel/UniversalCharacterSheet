import { FormEvent, KeyboardEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GridMapPoint, GridMapToken, GridMapTokenSize, GridMapWall, Widget } from '../../types';
import { useTouchCameraPinchCancellation } from '../../hooks/useTouchCamera';
import { useStore } from '../../store/useStore';
import { CheckIcon, EraserIcon, HandIcon, MinusIcon, PencilIcon, PlusIcon, PointerIcon, ResetIcon, RulerIcon, TrashIcon, UndoIcon, WallIcon, XIcon } from '../icons';
import { Tooltip } from '../Tooltip';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
  interactive?: boolean;
  sheetScale?: number;
}

type Tool = 'select' | 'pan' | 'measure' | 'wall' | 'erase';
type TokenDialog = 'add' | 'edit' | null;

interface CanvasSize {
  width: number;
  height: number;
}

interface SceneSnapshot {
  tokens: GridMapToken[];
  walls: GridMapWall[];
}

interface TokenDrag {
  pointerId: number;
  tokenId: string;
  origin: GridMapPoint;
  current: GridMapPoint;
  pointerOffset: { x: number; y: number };
  previewCenter: { x: number; y: number };
}

interface WallDraft {
  pointerId: number;
  start: GridMapPoint;
  end: GridMapPoint;
}

interface Measurement {
  pointerId: number | null;
  start: GridMapPoint;
  end: GridMapPoint;
}

interface PanDrag {
  pointerId: number;
  pointerOrigin: { x: number; y: number };
  panOrigin: { x: number; y: number };
}

interface PixelPoint {
  x: number;
  y: number;
}

const MAX_UNDO_STEPS = 30;
const MIN_MAP_ZOOM = 0.2;
const MAX_MAP_ZOOM = 3;
const TOKEN_SIZES: GridMapTokenSize[] = ['tiny', 'medium', 'large', 'huge', 'gargantuan'];

const TOKEN_SIZE_NAMES: Record<GridMapTokenSize, string> = {
  tiny: 'Tiny',
  medium: 'Medium',
  large: 'Large',
  huge: 'Huge',
  gargantuan: 'Gargantuan',
};

const SQUARE_TOKEN_CELLS: Record<GridMapTokenSize, number> = {
  tiny: 0.5,
  medium: 1,
  large: 4,
  huge: 9,
  gargantuan: 16,
};

const HEX_TOKEN_CELLS: Record<GridMapTokenSize, number> = {
  tiny: 0.5,
  medium: 1,
  large: 3,
  huge: 7,
  gargantuan: 19,
};

function pointsEqual(first: GridMapPoint, second: GridMapPoint) {
  return first.column === second.column && first.row === second.row;
}

function pointToSegmentDistance(point: { x: number; y: number }, start: { x: number; y: number }, end: { x: number; y: number }) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);

  const amount = Math.max(0, Math.min(1, ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / lengthSquared));
  return Math.hypot(point.x - (start.x + amount * deltaX), point.y - (start.y + amount * deltaY));
}

function cloneScene(tokens: GridMapToken[], walls: GridMapWall[]): SceneSnapshot {
  return {
    tokens: tokens.map((token) => ({ ...token })),
    walls: walls.map((wall) => ({ ...wall, start: { ...wall.start }, end: { ...wall.end } })),
  };
}

function roundAxial(q: number, r: number) {
  let roundedQ = Math.round(q);
  let roundedR = Math.round(r);
  const roundedS = Math.round(-q - r);
  const qDifference = Math.abs(roundedQ - q);
  const rDifference = Math.abs(roundedR - r);
  const sDifference = Math.abs(roundedS + q + r);

  if (qDifference > rDifference && qDifference > sDifference) {
    roundedQ = -roundedR - roundedS;
  } else if (rDifference > sDifference) {
    roundedR = -roundedQ - roundedS;
  }

  return { q: roundedQ, r: roundedR };
}

function tracePointyHex(context: CanvasRenderingContext2D, center: PixelPoint, radius: number) {
  context.beginPath();
  for (let index = 0; index < 6; index += 1) {
    const angle = -Math.PI / 2 + index * Math.PI / 3;
    const x = center.x + Math.cos(angle) * radius;
    const y = center.y + Math.sin(angle) * radius;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
}

function wrapTokenName(context: CanvasRenderingContext2D, name: string, maxWidth: number, maxLines = 3) {
  const words = name.trim().split(/\s+/);
  const lines: string[] = [];

  for (const word of words) {
    const candidate = lines.length === 0 ? word : `${lines[lines.length - 1]} ${word}`;
    if (lines.length === 0 || context.measureText(candidate).width <= maxWidth) {
      if (lines.length === 0) lines.push(word);
      else lines[lines.length - 1] = candidate;
    } else if (lines.length < maxLines) {
      lines.push(word);
    } else {
      lines[maxLines - 1] = `${lines[maxLines - 1]} ${word}`;
    }
  }

  return lines;
}

function getInnerTokenFontSize(context: CanvasRenderingContext2D, name: string, preferredSize: number, maxWidth: number) {
  for (let size = preferredSize; size >= 6.5; size -= 0.5) {
    context.font = `600 ${size}px sans-serif`;
    if (context.measureText(name).width <= maxWidth) return size;
  }
  return null;
}

function getTokenDiameterInCells(size: GridMapTokenSize = 'medium', gridType: 'square' | 'hex') {
  if (size === 'tiny') return 0.5;
  if (gridType === 'square') return Math.sqrt(SQUARE_TOKEN_CELLS[size]);
  if (size === 'large') return 2;
  if (size === 'huge') return 3;
  if (size === 'gargantuan') return 5;
  return 1;
}

function getTokenRadius(size: GridMapTokenSize | undefined, gridType: 'square' | 'hex', gridSize: number) {
  const diameter = getTokenDiameterInCells(size, gridType);
  return Math.max(gridSize * 0.24, (diameter * 0.5 - 0.1) * gridSize);
}

export default function GridMapWidget({ widget, mode, interactive = true, sheetScale = 1 }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const {
    label,
    gridMapGridType = 'square',
    gridMapGridSize = 32,
    gridMapGridColor = '#cbd5e1',
    gridMapWallColor = '#334155',
    gridMapWallWidth = 4,
    gridMapDefaultTokenColor = '#2563eb',
    gridMapCellDistance = 5,
    gridMapDistanceUnit = 'ft',
  } = widget.data;

  const [tokens, setTokens] = useState<GridMapToken[]>(widget.data.gridMapTokens || []);
  const [walls, setWalls] = useState<GridMapWall[]>(widget.data.gridMapWalls || []);
  const [tool, setTool] = useState<Tool>('select');
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [hoveredTokenId, setHoveredTokenId] = useState<string | null>(null);
  const [tokenDrag, setTokenDrag] = useState<TokenDrag | null>(null);
  const [wallDraft, setWallDraft] = useState<WallDraft | null>(null);
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const [panDrag, setPanDrag] = useState<PanDrag | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [mapZoom, setMapZoom] = useState(1);
  const [undoHistory, setUndoHistory] = useState<SceneSnapshot[]>([]);
  const [tokenDialog, setTokenDialog] = useState<TokenDialog>(null);
  const [tokenName, setTokenName] = useState('');
  const [tokenColor, setTokenColor] = useState(gridMapDefaultTokenColor);
  const [tokenSize, setTokenSize] = useState<GridMapTokenSize>('medium');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 1, height: 1 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasShellRef = useRef<HTMLDivElement>(null);
  const activePointerRef = useRef<number | null>(null);

  const canInteract = interactive && mode !== 'print';
  const measurementDistanceLabel = measurement ? (() => {
    const cellDeltaX = measurement.end.column - measurement.start.column;
    const cellDeltaY = measurement.end.row - measurement.start.row;
    const distance = Math.hypot(cellDeltaX, cellDeltaY) * Math.max(0.1, gridMapCellDistance);
    return `${Math.round(distance * 10) / 10} ${gridMapDistanceUnit.trim() || 'ft'}`;
  })() : null;

  useEffect(() => {
    setTokens(widget.data.gridMapTokens || []);
  }, [widget.data.gridMapTokens]);

  useEffect(() => {
    setWalls(widget.data.gridMapWalls || []);
  }, [widget.data.gridMapWalls]);

  useEffect(() => {
    if (selectedTokenId && !tokens.some((token) => token.id === selectedTokenId)) {
      setSelectedTokenId(null);
    }
  }, [selectedTokenId, tokens]);

  useEffect(() => {
    if (tool !== 'measure') setMeasurement(null);
  }, [tool]);

  useEffect(() => {
    setTokenDrag(null);
    setWallDraft(null);
    setMeasurement(null);
    setHoveredTokenId(null);
  }, [gridMapGridType]);

  useEffect(() => {
    const shell = canvasShellRef.current;
    if (!shell) return;

    const updateSize = () => {
      setCanvasSize({
        width: Math.max(1, shell.clientWidth),
        height: Math.max(1, shell.clientHeight),
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

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
    setTokenDrag(null);
    setWallDraft(null);
    if (measurement?.pointerId !== null) setMeasurement(null);
    setPanDrag(null);
    setHoveredTokenId(null);
  });

  const pushUndo = useCallback((currentTokens: GridMapToken[], currentWalls: GridMapWall[]) => {
    const snapshot = cloneScene(currentTokens, currentWalls);
    setUndoHistory((history) => [...history.slice(-(MAX_UNDO_STEPS - 1)), snapshot]);
  }, []);

  const commitScene = useCallback((nextTokens: GridMapToken[], nextWalls: GridMapWall[], remember = true) => {
    if (remember) pushUndo(tokens, walls);
    setTokens(nextTokens);
    setWalls(nextWalls);
    updateWidgetData(widget.id, { gridMapTokens: nextTokens, gridMapWalls: nextWalls });
  }, [pushUndo, tokens, updateWidgetData, walls, widget.id]);

  const getCanvasPoint = useCallback((event: { clientX: number; clientY: number; currentTarget: HTMLCanvasElement }) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvasSize.width / rect.width),
      y: (event.clientY - rect.top) * (canvasSize.height / rect.height),
    };
  }, [canvasSize.height, canvasSize.width]);

  const screenToWorld = useCallback((point: { x: number; y: number }) => ({
    x: (point.x - panOffset.x) / mapZoom,
    y: (point.y - panOffset.y) / mapZoom,
  }), [mapZoom, panOffset.x, panOffset.y]);

  const keepOriginReachable = useCallback((nextPan: { x: number; y: number }) => ({
    x: Math.min(gridMapGridSize, nextPan.x),
    y: Math.min(gridMapGridSize, nextPan.y),
  }), [gridMapGridSize]);

  const hexRadius = gridMapGridSize / Math.sqrt(3);
  const hexVerticalSpacing = hexRadius * 1.5;

  const getCellCenter = useCallback((cell: GridMapPoint): PixelPoint => {
    if (gridMapGridType === 'square') {
      return {
        x: (cell.column + 0.5) * gridMapGridSize,
        y: (cell.row + 0.5) * gridMapGridSize,
      };
    }

    const row = Math.round(cell.row);
    return {
      x: (cell.column + 0.5 + (row % 2 === 0 ? 0 : 0.5)) * gridMapGridSize,
      y: hexRadius + row * hexVerticalSpacing,
    };
  }, [gridMapGridSize, gridMapGridType, hexRadius, hexVerticalSpacing]);

  const getTokenCenter = useCallback((token: GridMapToken): PixelPoint => {
    if (gridMapGridType === 'hex' || !token.size || token.size === 'tiny' || token.size === 'medium') {
      return getCellCenter(token);
    }

    const diameter = getTokenDiameterInCells(token.size, gridMapGridType);
    return {
      x: (token.column + diameter / 2) * gridMapGridSize,
      y: (token.row + diameter / 2) * gridMapGridSize,
    };
  }, [getCellCenter, gridMapGridSize, gridMapGridType]);

  const snapToCell = useCallback((point: { x: number; y: number }): GridMapPoint => {
    if (gridMapGridType === 'hex') {
      const localX = point.x - gridMapGridSize / 2;
      const localY = point.y - hexRadius;
      const axial = roundAxial(
        (Math.sqrt(3) / 3 * localX - localY / 3) / hexRadius,
        (2 / 3 * localY) / hexRadius,
      );
      const row = Math.max(0, axial.r);
      const column = Math.max(0, axial.q + (row - (row & 1)) / 2);
      return { column, row };
    }

    return {
      column: Math.max(0, Math.floor(point.x / gridMapGridSize)),
      row: Math.max(0, Math.floor(point.y / gridMapGridSize)),
    };
  }, [gridMapGridSize, gridMapGridType, hexRadius]);

  const snapTokenAnchor = useCallback((point: PixelPoint, size: GridMapTokenSize = 'medium'): GridMapPoint => {
    if (gridMapGridType === 'hex' || size === 'tiny' || size === 'medium') return snapToCell(point);
    const diameter = getTokenDiameterInCells(size, gridMapGridType);
    return {
      column: Math.max(0, Math.round(point.x / gridMapGridSize - diameter / 2)),
      row: Math.max(0, Math.round(point.y / gridMapGridSize - diameter / 2)),
    };
  }, [gridMapGridSize, gridMapGridType, snapToCell]);

  const snapToHexAnchor = useCallback((point: PixelPoint, includeEdgeMidpoints: boolean, includeCenter: boolean): GridMapPoint => {
    const baseCell = snapToCell(point);
    let nearestPoint: PixelPoint | null = null;
    let nearestDistance = Infinity;

    for (let row = Math.max(0, baseCell.row - 2); row <= baseCell.row + 2; row += 1) {
      for (let column = Math.max(0, baseCell.column - 2); column <= baseCell.column + 2; column += 1) {
        const center = getCellCenter({ column, row });
        const vertices = Array.from({ length: 6 }, (_, index) => {
          const angle = -Math.PI / 2 + index * Math.PI / 3;
          return {
            x: center.x + Math.cos(angle) * hexRadius,
            y: center.y + Math.sin(angle) * hexRadius,
          };
        });
        const candidates = [...vertices];
        if (includeEdgeMidpoints) {
          for (let index = 0; index < vertices.length; index += 1) {
            const next = vertices[(index + 1) % vertices.length];
            candidates.push({
              x: (vertices[index].x + next.x) / 2,
              y: (vertices[index].y + next.y) / 2,
            });
          }
        }
        if (includeCenter) candidates.push(center);

        for (const candidate of candidates) {
          if (candidate.x < 0 || candidate.y < 0) continue;
          const distance = Math.hypot(point.x - candidate.x, point.y - candidate.y);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestPoint = candidate;
          }
        }
      }
    }

    const snapped = nearestPoint || getCellCenter(baseCell);
    return { column: snapped.x / gridMapGridSize, row: snapped.y / gridMapGridSize };
  }, [getCellCenter, gridMapGridSize, hexRadius, snapToCell]);

  const snapToIntersection = useCallback((point: { x: number; y: number }): GridMapPoint => {
    if (gridMapGridType === 'hex') return snapToHexAnchor(point, false, false);
    return {
      column: Math.max(0, Math.round(point.x / gridMapGridSize)),
      row: Math.max(0, Math.round(point.y / gridMapGridSize)),
    };
  }, [gridMapGridSize, gridMapGridType, snapToHexAnchor]);

  const snapToMeasurementAnchor = useCallback((point: { x: number; y: number }): GridMapPoint => {
    if (gridMapGridType === 'hex') return snapToHexAnchor(point, true, true);
    return {
      column: Math.max(0, Math.round((point.x / gridMapGridSize) * 2) / 2),
      row: Math.max(0, Math.round((point.y / gridMapGridSize) * 2) / 2),
    };
  }, [gridMapGridSize, gridMapGridType, snapToHexAnchor]);

  const findTokenAtPoint = useCallback((point: { x: number; y: number }) => {
    for (let index = tokens.length - 1; index >= 0; index -= 1) {
      const token = tokens[index];
      const center = tokenDrag?.tokenId === token.id ? tokenDrag.previewCenter : getTokenCenter(token);
      const centerX = center.x;
      const centerY = center.y;
      const radius = getTokenRadius(token.size, gridMapGridType, gridMapGridSize);
      if (Math.hypot(point.x - centerX, point.y - centerY) <= radius) return token;
    }
    return null;
  }, [getTokenCenter, gridMapGridSize, gridMapGridType, tokenDrag, tokens]);

  const findWallAtPoint = useCallback((point: { x: number; y: number }) => {
    const tolerance = Math.max(7, gridMapWallWidth + 3) / mapZoom;
    for (let index = walls.length - 1; index >= 0; index -= 1) {
      const wall = walls[index];
      const start = { x: wall.start.column * gridMapGridSize, y: wall.start.row * gridMapGridSize };
      const end = { x: wall.end.column * gridMapGridSize, y: wall.end.row * gridMapGridSize };
      if (pointToSegmentDistance(point, start, end) <= tolerance) return wall;
    }
    return null;
  }, [gridMapGridSize, gridMapWallWidth, mapZoom, walls]);

  const beginTokenDialog = (dialog: Exclude<TokenDialog, null>) => {
    if (dialog === 'edit') {
      const selected = tokens.find((token) => token.id === selectedTokenId);
      if (!selected) return;
      setTokenName(selected.name);
      setTokenColor(selected.color);
      setTokenSize(selected.size || 'medium');
    } else {
      setTokenName('');
      setTokenColor(gridMapDefaultTokenColor);
      setTokenSize('medium');
    }
    setTokenDialog(dialog);
  };

  const findOpenCell = (size: GridMapTokenSize) => {
    const visibleCenter = screenToWorld({ x: canvasSize.width / 2, y: canvasSize.height / 2 });
    const center = snapTokenAnchor(visibleCenter, size);
    const occupied = new Set(tokens.map((token) => `${token.column}:${token.row}`));
    const candidates: GridMapPoint[] = [];

    for (let radius = 0; radius <= 12; radius += 1) {
      for (let row = Math.max(0, center.row - radius); row <= center.row + radius; row += 1) {
        for (let column = Math.max(0, center.column - radius); column <= center.column + radius; column += 1) {
          candidates.push({ column, row });
        }
      }
    }

    candidates.sort((first, second) => (
      Math.abs(first.column - center.column) + Math.abs(first.row - center.row)
      - Math.abs(second.column - center.column) - Math.abs(second.row - center.row)
    ));
    return candidates.find((candidate) => !occupied.has(`${candidate.column}:${candidate.row}`)) || center;
  };

  const submitTokenDialog = (event: FormEvent) => {
    event.preventDefault();
    const name = tokenName.trim();
    if (!name) return;

    if (tokenDialog === 'edit' && selectedTokenId) {
      const nextTokens = tokens.map((token) => token.id === selectedTokenId ? { ...token, name, color: tokenColor, size: tokenSize } : token);
      commitScene(nextTokens, walls);
    } else {
      const cell = findOpenCell(tokenSize);
      const token: GridMapToken = { id: uuidv4(), name, color: tokenColor, size: tokenSize, ...cell };
      commitScene([...tokens, token], walls);
      setSelectedTokenId(token.id);
      setTool('select');
    }

    setTokenDialog(null);
  };

  const eraseAtPoint = (point: { x: number; y: number }) => {
    const token = findTokenAtPoint(point);
    if (token) {
      commitScene(tokens.filter((candidate) => candidate.id !== token.id), walls);
      if (selectedTokenId === token.id) setSelectedTokenId(null);
      return;
    }

    const wall = findWallAtPoint(point);
    if (wall) commitScene(tokens, walls.filter((candidate) => candidate.id !== wall.id));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!canInteract || (event.button !== 0 && event.button !== 1)) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerRef.current = event.pointerId;
    const canvasPoint = getCanvasPoint(event);
    const point = screenToWorld(canvasPoint);

    if (tool === 'pan' || event.button === 1) {
      setPanDrag({ pointerId: event.pointerId, pointerOrigin: canvasPoint, panOrigin: panOffset });
      return;
    }

    if (tool === 'select') {
      const token = findTokenAtPoint(point);
      setSelectedTokenId(token?.id || null);
      if (token) {
        const center = getTokenCenter(token);
        setTokenDrag({
          pointerId: event.pointerId,
          tokenId: token.id,
          origin: { column: token.column, row: token.row },
          current: { column: token.column, row: token.row },
          pointerOffset: { x: point.x - center.x, y: point.y - center.y },
          previewCenter: center,
        });
      }
      return;
    }

    if (tool === 'wall') {
      const start = snapToIntersection(point);
      setWallDraft({ pointerId: event.pointerId, start, end: start });
      return;
    }

    if (tool === 'measure') {
      const start = snapToMeasurementAnchor(point);
      setMeasurement({ pointerId: event.pointerId, start, end: start });
      return;
    }

    eraseAtPoint(point);
    releaseActivePointer();
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!canInteract) return;
    const canvasPoint = getCanvasPoint(event);
    const point = screenToWorld(canvasPoint);

    if (panDrag?.pointerId === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
      setPanOffset(keepOriginReachable({
        x: panDrag.panOrigin.x + canvasPoint.x - panDrag.pointerOrigin.x,
        y: panDrag.panOrigin.y + canvasPoint.y - panDrag.pointerOrigin.y,
      }));
      return;
    }

    if (tokenDrag?.pointerId === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
      const firstCellCenter = getCellCenter({ column: 0, row: 0 });
      const previewCenter = {
        x: Math.max(firstCellCenter.x, point.x - tokenDrag.pointerOffset.x),
        y: Math.max(firstCellCenter.y, point.y - tokenDrag.pointerOffset.y),
      };
      const draggedToken = tokens.find((token) => token.id === tokenDrag.tokenId);
      setTokenDrag({ ...tokenDrag, current: snapTokenAnchor(previewCenter, draggedToken?.size), previewCenter });
      return;
    }

    if (wallDraft?.pointerId === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
      setWallDraft({ ...wallDraft, end: snapToIntersection(point) });
      return;
    }

    if (measurement?.pointerId === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
      setMeasurement({ ...measurement, end: snapToMeasurementAnchor(point) });
      return;
    }

    setHoveredTokenId(findTokenAtPoint(point)?.id || null);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (panDrag?.pointerId === event.pointerId) {
      setPanDrag(null);
    } else if (tokenDrag?.pointerId === event.pointerId) {
      const destination = tokenDrag.current;
      if (!pointsEqual(tokenDrag.origin, destination)) {
        const nextTokens = tokens.map((token) => token.id === tokenDrag.tokenId ? { ...token, ...destination } : token);
        commitScene(nextTokens, walls);
      }
      setTokenDrag(null);
    } else if (wallDraft?.pointerId === event.pointerId) {
      const end = snapToIntersection(screenToWorld(getCanvasPoint(event)));
      if (!pointsEqual(wallDraft.start, end)) {
        const wall: GridMapWall = { id: uuidv4(), start: wallDraft.start, end };
        commitScene(tokens, [...walls, wall]);
      }
      setWallDraft(null);
    } else if (measurement?.pointerId === event.pointerId) {
      const end = snapToMeasurementAnchor(screenToWorld(getCanvasPoint(event)));
      setMeasurement(pointsEqual(measurement.start, end) ? null : { ...measurement, pointerId: null, end });
    }
    releaseActivePointer();
  };

  const cancelPointerGesture = () => {
    releaseActivePointer();
    setTokenDrag(null);
    setWallDraft(null);
    if (measurement?.pointerId !== null) setMeasurement(null);
    setPanDrag(null);
  };

  const undo = () => {
    const previous = undoHistory[undoHistory.length - 1];
    if (!previous) return;
    setUndoHistory((history) => history.slice(0, -1));
    setSelectedTokenId(null);
    commitScene(previous.tokens, previous.walls, false);
  };

  const clearScene = () => {
    commitScene([], []);
    setSelectedTokenId(null);
    setShowClearConfirm(false);
  };

  const moveSelectedToken = (columnDelta: number, rowDelta: number) => {
    if (!selectedTokenId) return;
    const selected = tokens.find((token) => token.id === selectedTokenId);
    if (!selected) return;
    const destination = {
      column: Math.max(0, selected.column + columnDelta),
      row: Math.max(0, selected.row + rowDelta),
    };
    if (pointsEqual(selected, destination)) return;
    commitScene(tokens.map((token) => token.id === selected.id ? { ...token, ...destination } : token), walls);
  };

  const setZoomAroundPoint = useCallback((nextZoom: number, anchor: { x: number; y: number }) => {
    const clampedZoom = Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, nextZoom));
    const worldAnchor = screenToWorld(anchor);
    setMapZoom(clampedZoom);
    setPanOffset(keepOriginReachable({
      x: anchor.x - worldAnchor.x * clampedZoom,
      y: anchor.y - worldAnchor.y * clampedZoom,
    }));
  }, [keepOriginReachable, screenToWorld]);

  const zoomBy = (factor: number) => {
    setZoomAroundPoint(mapZoom * factor, { x: canvasSize.width / 2, y: canvasSize.height / 2 });
  };

  const resetView = () => {
    setPanOffset({ x: 0, y: 0 });
    setMapZoom(1);
  };

  const handleWheel = useCallback((event: WheelEvent) => {
    if (!canInteract) return;
    event.preventDefault();
    event.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const point = {
      x: (event.clientX - rect.left) * (canvasSize.width / rect.width),
      y: (event.clientY - rect.top) * (canvasSize.height / rect.height),
    };
    setZoomAroundPoint(mapZoom * Math.exp(-event.deltaY * 0.0015), point);
  }, [canInteract, canvasSize.height, canvasSize.width, mapZoom, setZoomAroundPoint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleCanvasKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (!canInteract || !selectedTokenId) return;
    const movement: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (movement[event.key]) {
      event.preventDefault();
      moveSelectedToken(...movement[event.key]);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      beginTokenDialog('edit');
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      commitScene(tokens.filter((token) => token.id !== selectedTokenId), walls);
      setSelectedTokenId(null);
    }
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const pixelRatio = Math.min(3, (window.devicePixelRatio || 1) * Math.max(1, sheetScale));
    const backingWidth = Math.max(1, Math.ceil(canvasSize.width * pixelRatio));
    const backingHeight = Math.max(1, Math.ceil(canvasSize.height * pixelRatio));
    if (canvas.width !== backingWidth) canvas.width = backingWidth;
    if (canvas.height !== backingHeight) canvas.height = backingHeight;
    if (canvas.style.width !== `${canvasSize.width}px`) canvas.style.width = `${canvasSize.width}px`;
    if (canvas.style.height !== `${canvasSize.height}px`) canvas.style.height = `${canvasSize.height}px`;
    context.setTransform(backingWidth / canvasSize.width, 0, 0, backingHeight / canvasSize.height, 0, 0);
    context.clearRect(0, 0, canvasSize.width, canvasSize.height);

    const styles = getComputedStyle(canvas);
    context.fillStyle = styles.getPropertyValue('--color-paper').trim() || '#ffffff';
    context.fillRect(0, 0, canvasSize.width, canvasSize.height);

    context.save();
    context.translate(panOffset.x, panOffset.y);
    context.scale(mapZoom, mapZoom);

    const worldLeft = Math.max(0, -panOffset.x / mapZoom);
    const worldTop = Math.max(0, -panOffset.y / mapZoom);
    const worldRight = (canvasSize.width - panOffset.x) / mapZoom;
    const worldBottom = (canvasSize.height - panOffset.y) / mapZoom;
    if (gridMapGridType === 'hex') {
      const startRow = Math.max(0, Math.floor((worldTop - hexRadius * 2) / hexVerticalSpacing));
      const endRow = Math.ceil(worldBottom / hexVerticalSpacing) + 1;
      context.lineWidth = 1 / mapZoom;
      context.strokeStyle = gridMapGridColor;
      context.globalAlpha = 0.58;
      for (let row = startRow; row <= endRow; row += 1) {
        const rowOffset = row % 2 === 0 ? 0 : 0.5;
        const startColumn = Math.max(0, Math.floor(worldLeft / gridMapGridSize - rowOffset) - 1);
        const endColumn = Math.ceil(worldRight / gridMapGridSize - rowOffset) + 1;
        for (let column = startColumn; column <= endColumn; column += 1) {
          tracePointyHex(context, getCellCenter({ column, row }), hexRadius);
          context.stroke();
        }
      }
    } else {
      const startColumn = Math.max(0, Math.floor(worldLeft / gridMapGridSize));
      const startRow = Math.max(0, Math.floor(worldTop / gridMapGridSize));
      const endColumn = Math.ceil(worldRight / gridMapGridSize) + 1;
      const endRow = Math.ceil(worldBottom / gridMapGridSize) + 1;

      context.lineWidth = 1 / mapZoom;
      for (let column = startColumn; column <= endColumn; column += 1) {
        const x = column * gridMapGridSize;
        context.globalAlpha = column % 5 === 0 ? 0.85 : 0.38;
        context.strokeStyle = gridMapGridColor;
        context.beginPath();
        context.moveTo(x, worldTop);
        context.lineTo(x, worldBottom);
        context.stroke();
      }
      for (let row = startRow; row <= endRow; row += 1) {
        const y = row * gridMapGridSize;
        context.globalAlpha = row % 5 === 0 ? 0.85 : 0.38;
        context.strokeStyle = gridMapGridColor;
        context.beginPath();
        context.moveTo(worldLeft, y);
        context.lineTo(worldRight, y);
        context.stroke();
      }
    }
    context.globalAlpha = 1;

    context.lineCap = 'round';
    context.lineJoin = 'round';
    for (const wall of walls) {
      const startX = wall.start.column * gridMapGridSize;
      const startY = wall.start.row * gridMapGridSize;
      const endX = wall.end.column * gridMapGridSize;
      const endY = wall.end.row * gridMapGridSize;
      context.strokeStyle = 'rgba(15, 23, 42, 0.24)';
      context.lineWidth = gridMapWallWidth + 4;
      context.beginPath();
      context.moveTo(startX, startY);
      context.lineTo(endX, endY);
      context.stroke();
      context.strokeStyle = gridMapWallColor;
      context.lineWidth = gridMapWallWidth;
      context.beginPath();
      context.moveTo(startX, startY);
      context.lineTo(endX, endY);
      context.stroke();
    }
    if (wallDraft) {
      context.save();
      context.globalAlpha = 0.65;
      context.setLineDash([7, 5]);
      context.beginPath();
      context.moveTo(wallDraft.start.column * gridMapGridSize, wallDraft.start.row * gridMapGridSize);
      context.lineTo(wallDraft.end.column * gridMapGridSize, wallDraft.end.row * gridMapGridSize);
      context.stroke();
      context.restore();
    }

    for (const token of tokens) {
      const center = tokenDrag?.tokenId === token.id ? tokenDrag.previewCenter : getTokenCenter(token);
      const centerX = center.x;
      const centerY = center.y;
      const radius = getTokenRadius(token.size, gridMapGridType, gridMapGridSize);
      const isSelected = token.id === selectedTokenId;
      const isHovered = token.id === hoveredTokenId;

      context.save();
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.fillStyle = token.color;
      context.shadowColor = 'rgba(15, 23, 42, 0.35)';
      context.shadowBlur = isSelected ? 7 : 4;
      context.shadowOffsetY = 2;
      context.fill();
      context.shadowColor = 'transparent';
      context.lineWidth = isSelected ? 3 : isHovered ? 2 : 1.5;
      context.strokeStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.9)';
      context.stroke();
      if (isSelected) {
        context.beginPath();
        context.arc(centerX, centerY, radius + 3, 0, Math.PI * 2);
        context.lineWidth = 2;
        context.strokeStyle = '#2563eb';
        context.stroke();
      }
      context.restore();
    }

    const baseFontSize = Math.min(12, gridMapGridSize * 0.31);
    const mediumRadius = getTokenRadius('medium', gridMapGridType, gridMapGridSize);
    const tokenLabelMetrics = new Map(tokens.map((token) => {
      const radius = getTokenRadius(token.size, gridMapGridType, gridMapGridSize);
      const fontSize = Math.min(18, baseFontSize * Math.max(1, Math.sqrt(radius / mediumRadius)));
      return [token.id, { radius, fontSize }];
    }));
    const innerFontSizes = new Map(tokens.map((token) => [
      token.id,
      getInnerTokenFontSize(
        context,
        token.name,
        tokenLabelMetrics.get(token.id)?.fontSize || baseFontSize,
        (tokenLabelMetrics.get(token.id)?.radius || mediumRadius) * 1.55,
      ),
    ]));
    const labelTokens = [...tokens].sort((first, second) => second.name.length - first.name.length);
    const badgeLayouts = new Map<string, { lines: string[]; x: number; y: number; width: number; height: number; fontSize: number; lineHeight: number }>();
    const placedBadges: Array<{ x: number; y: number; width: number; height: number }> = [];

    for (const token of labelTokens) {
      if (innerFontSizes.get(token.id) !== null) continue;

      const center = tokenDrag?.tokenId === token.id ? tokenDrag.previewCenter : getTokenCenter(token);
      const metrics = tokenLabelMetrics.get(token.id);
      const fontSize = metrics?.fontSize || baseFontSize;
      const lineHeight = fontSize * 1.18;
      const horizontalPadding = Math.max(5, fontSize * 0.55);
      const verticalPadding = Math.max(4, fontSize * 0.42);
      const maxBadgeTextWidth = Math.max(gridMapGridSize * 2.75, (metrics?.radius || mediumRadius) * 1.55);
      context.font = `600 ${fontSize}px sans-serif`;
      const lines = wrapTokenName(context, token.name, maxBadgeTextWidth);
      const badgeWidth = Math.max(...lines.map((line) => context.measureText(line).width)) + horizontalPadding * 2;
      const badgeHeight = lines.length * lineHeight + verticalPadding * 2;
      const badgeX = center.x - badgeWidth / 2;
      let badgeY = center.y - badgeHeight / 2;

      while (placedBadges.some((badge) => (
        badgeX < badge.x + badge.width + 2
        && badgeX + badgeWidth + 2 > badge.x
        && badgeY < badge.y + badge.height + 2
        && badgeY + badgeHeight + 2 > badge.y
      ))) {
        badgeY += badgeHeight + 2;
      }

      badgeLayouts.set(token.id, { lines, x: badgeX, y: badgeY, width: badgeWidth, height: badgeHeight, fontSize, lineHeight });
      placedBadges.push({ x: badgeX, y: badgeY, width: badgeWidth, height: badgeHeight });
    }

    for (const token of labelTokens) {
      const center = tokenDrag?.tokenId === token.id ? tokenDrag.previewCenter : getTokenCenter(token);
      const centerX = center.x;
      const centerY = center.y;

      context.save();
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      const innerFontSize = innerFontSizes.get(token.id);

      if (innerFontSize === null) {
        const layout = badgeLayouts.get(token.id);
        if (!layout) continue;
        context.font = `600 ${layout.fontSize}px sans-serif`;

        context.shadowColor = 'rgba(15, 23, 42, 0.28)';
        context.shadowBlur = 3;
        context.shadowOffsetY = 1;
        context.fillStyle = 'rgba(15, 23, 42, 0.9)';
        context.beginPath();
        context.roundRect(layout.x, layout.y, layout.width, layout.height, Math.min(7, layout.height / 3));
        context.fill();
        context.shadowColor = 'transparent';
        context.lineWidth = 1;
        context.strokeStyle = 'rgba(255, 255, 255, 0.78)';
        context.stroke();
        context.fillStyle = '#ffffff';
        const firstLineY = layout.y + layout.height / 2 - ((layout.lines.length - 1) * layout.lineHeight) / 2;
        layout.lines.forEach((line, index) => {
          context.fillText(line, centerX, firstLineY + index * layout.lineHeight);
        });
      } else {
        context.font = `600 ${innerFontSize ?? baseFontSize}px sans-serif`;
        context.fillStyle = '#ffffff';
        context.fillText(token.name, centerX, centerY);
      }
      context.restore();
    }

    if (measurement) {
      const startX = measurement.start.column * gridMapGridSize;
      const startY = measurement.start.row * gridMapGridSize;
      const endX = measurement.end.column * gridMapGridSize;
      const endY = measurement.end.row * gridMapGridSize;
      const distanceLabel = measurementDistanceLabel || '';
      const markerRadius = 4 / mapZoom;

      context.save();
      context.strokeStyle = '#0ea5e9';
      context.fillStyle = '#0ea5e9';
      context.lineWidth = 2.5 / mapZoom;
      context.setLineDash([8 / mapZoom, 5 / mapZoom]);
      context.beginPath();
      context.moveTo(startX, startY);
      context.lineTo(endX, endY);
      context.stroke();
      context.setLineDash([]);
      for (const point of [{ x: startX, y: startY }, { x: endX, y: endY }]) {
        context.beginPath();
        context.arc(point.x, point.y, markerRadius, 0, Math.PI * 2);
        context.fill();
        context.lineWidth = 1.5 / mapZoom;
        context.strokeStyle = '#ffffff';
        context.stroke();
      }

      const fontSize = 12 / mapZoom;
      const horizontalPadding = 7 / mapZoom;
      const badgeHeight = 24 / mapZoom;
      context.font = `700 ${fontSize}px sans-serif`;
      const badgeWidth = context.measureText(distanceLabel).width + horizontalPadding * 2;
      const badgeX = (startX + endX) / 2 - badgeWidth / 2;
      const badgeY = (startY + endY) / 2 - badgeHeight / 2;
      context.fillStyle = 'rgba(15, 23, 42, 0.92)';
      context.beginPath();
      context.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 5 / mapZoom);
      context.fill();
      context.fillStyle = '#ffffff';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(distanceLabel, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
      context.restore();
    }
    context.restore();
  }, [canvasSize.height, canvasSize.width, getCellCenter, getTokenCenter, gridMapGridColor, gridMapGridSize, gridMapGridType, gridMapWallColor, gridMapWallWidth, hexRadius, hexVerticalSpacing, hoveredTokenId, mapZoom, measurement, measurementDistanceLabel, panOffset.x, panOffset.y, selectedTokenId, sheetScale, tokenDrag, tokens, wallDraft, walls]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const toolButtonClass = (active: boolean, disabled = false) => `w-7 h-7 flex items-center justify-center border border-theme-border rounded-button transition-colors ${
    active ? 'bg-theme-accent text-theme-paper' : 'bg-theme-paper text-theme-ink hover:bg-theme-background'
  } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`;

  return (
    <div className="relative flex h-full w-full min-h-0 flex-col gap-1">
      {label && (
        <div className="widget-header flex-shrink-0">
          <div className="widget-header-title min-w-0 flex-1 truncate">{label}</div>
        </div>
      )}

      {canInteract && (
        <div role="toolbar" aria-label="Grid map tools" className="mx-1 flex flex-shrink-0 flex-wrap items-center justify-center gap-1 rounded-button border border-theme-border bg-theme-background/80 p-1 shadow-sm">
          <Tooltip content="Select and move tokens">
            <button type="button" aria-label="Select and move tokens" aria-pressed={tool === 'select'} onClick={() => setTool('select')} onPointerDown={(event) => event.stopPropagation()} className={toolButtonClass(tool === 'select')}>
              <PointerIcon className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="Pan map">
            <button type="button" aria-label="Pan map" aria-pressed={tool === 'pan'} onClick={() => setTool('pan')} onPointerDown={(event) => event.stopPropagation()} className={toolButtonClass(tool === 'pan')}>
              <HandIcon className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="Add token">
            <button type="button" aria-label="Add token" onClick={() => beginTokenDialog('add')} onPointerDown={(event) => event.stopPropagation()} className={toolButtonClass(false)}>
              <PlusIcon className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="Measure distance">
            <button type="button" aria-label="Measure distance" aria-pressed={tool === 'measure'} onClick={() => setTool('measure')} onPointerDown={(event) => event.stopPropagation()} className={toolButtonClass(tool === 'measure')}>
              <RulerIcon className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="Draw wall">
            <button type="button" aria-label="Draw wall" aria-pressed={tool === 'wall'} onClick={() => setTool('wall')} onPointerDown={(event) => event.stopPropagation()} className={toolButtonClass(tool === 'wall')}>
              <WallIcon className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="Erase token or wall">
            <button type="button" aria-label="Erase token or wall" aria-pressed={tool === 'erase'} onClick={() => setTool('erase')} onPointerDown={(event) => event.stopPropagation()} className={toolButtonClass(tool === 'erase')}>
              <EraserIcon className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="Edit selected token">
            <button type="button" aria-label="Edit selected token" disabled={!selectedTokenId} onClick={() => beginTokenDialog('edit')} onPointerDown={(event) => event.stopPropagation()} className={toolButtonClass(false, !selectedTokenId)}>
              <PencilIcon className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="Undo last map action">
            <button type="button" aria-label="Undo last map action" disabled={undoHistory.length === 0} onClick={undo} onPointerDown={(event) => event.stopPropagation()} className={toolButtonClass(false, undoHistory.length === 0)}>
              <UndoIcon className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="Clear map">
            <button type="button" aria-label="Clear map" disabled={tokens.length === 0 && walls.length === 0} onClick={() => setShowClearConfirm(true)} onPointerDown={(event) => event.stopPropagation()} className={toolButtonClass(false, tokens.length === 0 && walls.length === 0)}>
              <TrashIcon className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      )}

      <div ref={canvasShellRef} className="relative min-h-0 flex-1 overflow-hidden rounded-theme border border-theme-border bg-theme-paper mx-1 mb-1">
        <canvas
          ref={canvasRef}
          tabIndex={canInteract ? 0 : -1}
          aria-label={`Grid map with ${tokens.length} token${tokens.length === 1 ? '' : 's'} and ${walls.length} wall${walls.length === 1 ? '' : 's'}${measurementDistanceLabel ? `, measuring ${measurementDistanceLabel}` : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={cancelPointerGesture}
          onPointerLeave={() => !tokenDrag && !wallDraft && setHoveredTokenId(null)}
          onContextMenu={(event) => event.preventDefault()}
          onDoubleClick={(event) => {
            if (!canInteract || tool !== 'select') return;
            const token = findTokenAtPoint(screenToWorld(getCanvasPoint(event)));
            if (token) {
              setSelectedTokenId(token.id);
              setTokenName(token.name);
              setTokenColor(token.color);
              setTokenSize(token.size || 'medium');
              setTokenDialog('edit');
            }
          }}
          onKeyDown={handleCanvasKeyDown}
          className={`block touch-none outline-none focus-visible:ring-2 focus-visible:ring-theme-accent focus-visible:ring-inset ${
            !canInteract ? 'cursor-default' : tool === 'pan' || panDrag ? 'cursor-grab active:cursor-grabbing' : tool === 'select' ? hoveredTokenId ? 'cursor-grab active:cursor-grabbing' : 'cursor-default' : 'cursor-crosshair'
          }`}
        />

        {canInteract && (
          <div className="absolute bottom-2 right-2 z-10 flex h-8 items-center overflow-hidden rounded-button border border-theme-border bg-theme-paper/95 shadow-theme backdrop-blur-sm" onPointerDown={(event) => event.stopPropagation()}>
            <Tooltip content="Zoom out">
              <button type="button" aria-label="Zoom map out" onClick={() => zoomBy(1 / 1.2)} className="flex h-8 w-8 items-center justify-center text-theme-ink hover:bg-theme-background">
                <MinusIcon className="h-4 w-4" />
              </button>
            </Tooltip>
            <button type="button" aria-label="Reset map view" onClick={resetView} className="flex h-8 min-w-12 items-center justify-center gap-1 border-x border-theme-border px-1.5 text-[10px] font-semibold tabular-nums text-theme-ink hover:bg-theme-background">
              <ResetIcon className="h-3.5 w-3.5" />
              {Math.round(mapZoom * 100)}%
            </button>
            <Tooltip content="Zoom in">
              <button type="button" aria-label="Zoom map in" onClick={() => zoomBy(1.2)} className="flex h-8 w-8 items-center justify-center text-theme-ink hover:bg-theme-background">
                <PlusIcon className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
        )}

        {tokenDialog && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-3" onPointerDown={(event) => event.stopPropagation()}>
            <form onSubmit={submitTokenDialog} className="w-full max-w-56 space-y-3 rounded-theme border border-theme-border bg-theme-paper p-3 shadow-theme">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-heading text-sm font-bold text-theme-ink">{tokenDialog === 'add' ? 'Add token' : 'Edit token'}</h3>
                <button type="button" aria-label="Close token editor" onClick={() => setTokenDialog(null)} className="w-7 h-7 flex items-center justify-center rounded-button text-theme-muted hover:bg-theme-background hover:text-theme-ink">
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
              <div>
                <label htmlFor={`grid-map-token-name-${widget.id}`} className="mb-1 block text-xs font-medium text-theme-ink">Name</label>
                <input
                  id={`grid-map-token-name-${widget.id}`}
                  autoFocus
                  required
                  maxLength={40}
                  value={tokenName}
                  onChange={(event) => setTokenName(event.target.value)}
                  className="w-full rounded-button border border-theme-border bg-theme-paper px-2 py-1.5 text-sm text-theme-ink focus:outline-none focus:border-theme-accent"
                />
              </div>
              <div>
                <label htmlFor={`grid-map-token-color-dialog-${widget.id}`} className="mb-1 block text-xs font-medium text-theme-ink">Color</label>
                <input id={`grid-map-token-color-dialog-${widget.id}`} type="color" value={tokenColor} onChange={(event) => setTokenColor(event.target.value)} className="h-9 w-full cursor-pointer rounded-button border border-theme-border" />
              </div>
              <div>
                <label htmlFor={`grid-map-token-size-${widget.id}`} className="mb-1 block text-xs font-medium text-theme-ink">Size</label>
                <select
                  id={`grid-map-token-size-${widget.id}`}
                  value={tokenSize}
                  onChange={(event) => setTokenSize(event.target.value as GridMapTokenSize)}
                  className="w-full rounded-button border border-theme-border bg-theme-paper px-2 py-1.5 text-sm text-theme-ink focus:border-theme-accent focus:outline-none"
                >
                  {TOKEN_SIZES.map((size) => {
                    const cells = (gridMapGridType === 'hex' ? HEX_TOKEN_CELLS : SQUARE_TOKEN_CELLS)[size];
                    const unit = gridMapGridType === 'hex' ? (cells <= 1 ? 'hex' : 'hexes') : (cells <= 1 ? 'square' : 'squares');
                    return <option key={size} value={size}>{TOKEN_SIZE_NAMES[size]} - {cells} {unit}</option>;
                  })}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setTokenDialog(null)} className="px-3 py-1.5 text-xs rounded-button border border-theme-border text-theme-ink hover:bg-theme-background">Cancel</button>
                <button type="submit" className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-button bg-theme-accent text-theme-paper hover:opacity-90">
                  <CheckIcon className="w-3.5 h-3.5" />
                  {tokenDialog === 'add' ? 'Add' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        )}

        {showClearConfirm && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-3" onPointerDown={(event) => event.stopPropagation()}>
            <div role="alertdialog" aria-modal="true" aria-labelledby={`grid-map-clear-title-${widget.id}`} className="w-full max-w-56 rounded-theme border border-theme-border bg-theme-paper p-3 text-center shadow-theme">
              <h3 id={`grid-map-clear-title-${widget.id}`} className="font-heading text-sm font-bold text-theme-ink">Clear the map?</h3>
              <p className="mt-1 text-xs text-theme-muted">All tokens and walls will be removed.</p>
              <div className="mt-3 flex justify-center gap-2">
                <button type="button" onClick={() => setShowClearConfirm(false)} className="px-3 py-1.5 text-xs rounded-button border border-theme-border text-theme-ink hover:bg-theme-background">Cancel</button>
                <button type="button" onClick={clearScene} className="px-3 py-1.5 text-xs rounded-button bg-red-500 text-white hover:bg-red-600">Clear</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
