import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Widget, TableRow, TableCell, CellFormat } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

// Helper to normalize cell data (supports both legacy string and new TableCell format)
function getCellValue(cell: string | TableCell): string {
  return typeof cell === 'string' ? cell : cell.value;
}

function getCellFormat(cell: string | TableCell): CellFormat {
  return typeof cell === 'string' ? {} : (cell.format || {});
}

function createCell(value: string, format?: CellFormat): TableCell {
  return { value, format };
}

// Color with opacity pair for recently used colors
interface ColorWithOpacity {
  color: string;
  opacity: number;
}

// Formatting toolbar component
interface FormatToolbarProps {
  format: CellFormat;
  onFormatChange: (format: Partial<CellFormat>) => void;
  onClose: () => void;
  position: { x: number; y: number };
  isMobile: boolean;
  usedColors: ColorWithOpacity[];
}

function FormatToolbar({ format, onFormatChange, onClose, position, isMobile, usedColors }: FormatToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  const buttonClass = `p-1.5 rounded hover:bg-theme-accent hover:text-theme-paper transition-colors ${isMobile ? 'min-w-[36px] min-h-[36px]' : 'min-w-[28px] min-h-[28px]'} flex items-center justify-center`;
  const activeClass = 'bg-theme-accent text-theme-paper';
  const iconSize = isMobile ? 'text-base' : 'text-sm';

  return (
    <div
      ref={toolbarRef}
      className="fixed z-[9999] bg-theme-paper border border-theme-border rounded-theme shadow-lg"
      style={{
        left: isMobile ? '50%' : position.x,
        top: isMobile ? 'auto' : position.y,
        bottom: isMobile ? '16px' : 'auto',
        transform: isMobile ? 'translateX(-50%)' : 'none',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className={`flex items-center gap-0.5 p-1 ${isMobile ? 'flex-wrap justify-center max-w-[280px]' : ''}`}>
        {/* Text Style Buttons */}
        <button
          className={`${buttonClass} ${iconSize} font-bold ${format.bold ? activeClass : 'text-theme-ink'}`}
          onClick={() => onFormatChange({ bold: !format.bold })}
          title="Bold"
        >
          B
        </button>
        <button
          className={`${buttonClass} ${iconSize} italic ${format.italic ? activeClass : 'text-theme-ink'}`}
          onClick={() => onFormatChange({ italic: !format.italic })}
          title="Italic"
        >
          I
        </button>
        <button
          className={`${buttonClass} ${iconSize} underline ${format.underline ? activeClass : 'text-theme-ink'}`}
          onClick={() => onFormatChange({ underline: !format.underline })}
          title="Underline"
        >
          U
        </button>
        <button
          className={`${buttonClass} ${iconSize} line-through ${format.strikethrough ? activeClass : 'text-theme-ink'}`}
          onClick={() => onFormatChange({ strikethrough: !format.strikethrough })}
          title="Strikethrough"
        >
          S
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-theme-border mx-1" />

        {/* Background Color */}
        <div className="relative">
          <button
            className={`${buttonClass} ${iconSize} text-theme-ink`}
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="Background Color"
          >
            <span className="relative">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
              </svg>
              {format.bgColor && (
                <span 
                  className="absolute -bottom-0.5 left-0 right-0 h-1 rounded-sm"
                  style={{ backgroundColor: format.bgColor, opacity: format.bgOpacity ?? 1 }}
                />
              )}
            </span>
          </button>
          {showColorPicker && (
            <div 
              className={`absolute left-1/2 -translate-x-1/2 bg-theme-paper border border-theme-border rounded-theme shadow-lg p-2 z-10 ${isMobile ? 'bottom-full mb-1' : 'top-full mt-1'}`}
              style={{ minWidth: '160px' }}
            >
              {/* No color option */}
              <button
                className={`w-full h-7 rounded border mb-1 ${!format.bgColor ? 'border-theme-accent ring-2 ring-theme-accent' : 'border-theme-border'} bg-theme-paper relative`}
                onClick={() => {
                  onFormatChange({ bgColor: undefined, bgOpacity: undefined });
                  setShowColorPicker(false);
                }}
                title="No color"
              >
                <span className="text-theme-muted text-xs">No color</span>
              </button>

              {/* Header color option */}
              <button
                className={`w-full h-7 rounded border mb-2 ${format.bgColor === 'var(--color-background)' ? 'border-theme-accent ring-2 ring-theme-accent' : 'border-theme-border'} bg-theme-background relative`}
                onClick={() => {
                  onFormatChange({ bgColor: 'var(--color-background)' });
                  setShowColorPicker(false);
                }}
                title="Header color"
              >
                <span className="text-theme-ink text-xs">Header color</span>
              </button>
              
              {/* Used colors from character */}
              {usedColors.length > 0 && (
                <>
                  <div className="text-[10px] text-theme-muted mb-1">Recently used</div>
                  <div className="grid grid-cols-5 gap-1 mb-2">
                    {usedColors.filter(c => c.color !== 'var(--color-background)').slice(0, 10).map((colorObj, idx) => {
                      // Apply the stored opacity to the swatch
                      let swatchBg = colorObj.color;
                      if (colorObj.opacity < 1 && !colorObj.color.startsWith('var(')) {
                        const hex = colorObj.color.replace('#', '');
                        const r = parseInt(hex.substring(0, 2), 16);
                        const g = parseInt(hex.substring(2, 4), 16);
                        const b = parseInt(hex.substring(4, 6), 16);
                        swatchBg = `rgba(${r}, ${g}, ${b}, ${colorObj.opacity})`;
                      }
                      const isSelected = format.bgColor === colorObj.color && (format.bgOpacity ?? 1) === colorObj.opacity;
                      return (
                        <button
                          key={`${colorObj.color}-${colorObj.opacity}-${idx}`}
                          className={`w-6 h-6 rounded border ${isSelected ? 'border-theme-accent ring-2 ring-theme-accent' : 'border-theme-border'}`}
                          style={{ backgroundColor: swatchBg }}
                          onClick={() => {
                            onFormatChange({ bgColor: colorObj.color, bgOpacity: colorObj.opacity });
                          }}
                          title={`${colorObj.color} (${Math.round(colorObj.opacity * 100)}%)`}
                        />
                      );
                    })}
                  </div>
                </>
              )}
              
              {/* Color picker */}
              <div className="text-[10px] text-theme-muted mb-1">Custom color</div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  ref={colorInputRef}
                  type="color"
                  value={format.bgColor && !format.bgColor.startsWith('var(') ? format.bgColor : '#ffffff'}
                  onChange={(e) => {
                    onFormatChange({ bgColor: e.target.value });
                  }}
                  className="w-8 h-8 rounded border border-theme-border cursor-pointer"
                  style={{ padding: 0 }}
                />
                <button
                  className="flex-1 px-2 py-1 text-xs border border-theme-border rounded hover:bg-theme-accent hover:text-theme-paper"
                  onClick={() => {
                    colorInputRef.current?.click();
                  }}
                >
                  Pick color
                </button>
              </div>

              {/* Opacity slider */}
              {format.bgColor && (
                <>
                  <div className="text-[10px] text-theme-muted mb-1">Opacity: {Math.round((format.bgOpacity ?? 1) * 100)}%</div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round((format.bgOpacity ?? 1) * 100)}
                    onChange={(e) => {
                      onFormatChange({ bgOpacity: parseInt(e.target.value) / 100 });
                    }}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-theme-border"
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-theme-border mx-1" />

        {/* Horizontal Alignment */}
        <button
          className={`${buttonClass} ${iconSize} ${format.hAlign === 'left' || !format.hAlign ? activeClass : 'text-theme-ink'}`}
          onClick={() => onFormatChange({ hAlign: 'left' })}
          title="Align Left"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          className={`${buttonClass} ${iconSize} ${format.hAlign === 'center' ? activeClass : 'text-theme-ink'}`}
          onClick={() => onFormatChange({ hAlign: 'center' })}
          title="Align Center"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm4 5.25a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 01-.75-.75z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          className={`${buttonClass} ${iconSize} ${format.hAlign === 'right' ? activeClass : 'text-theme-ink'}`}
          onClick={() => onFormatChange({ hAlign: 'right' })}
          title="Align Right"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm5 10.5a.75.75 0 01.75-.75h9.5a.75.75 0 010 1.5h-9.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function TableWidget({ widget, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const characters = useStore((state) => state.characters);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  
  const { 
    label, 
    columns = ['Item', 'Qty', 'Weight'],
    rows = []
  } = widget.data;
  
  const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null);
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
  const [dragOverRowIndex, setDragOverRowIndex] = useState<number | null>(null);
  const dragRowItem = useRef<number | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Collect all used colors (with opacity) from the character's table widgets
  const usedColors = useMemo(() => {
    const activeChar = characters.find(c => c.id === activeCharacterId);
    if (!activeChar) return [];
    
    const colorMap = new Map<string, ColorWithOpacity>();
    
    // Go through all sheets and widgets
    activeChar.sheets.forEach(sheet => {
      sheet.widgets.forEach(w => {
        if (w.type === 'TABLE' && w.data.rows) {
          (w.data.rows as TableRow[]).forEach(row => {
            row.cells.forEach(cell => {
              const fmt = getCellFormat(cell);
              if (fmt.bgColor) {
                // Use color+opacity as key to dedupe
                const key = `${fmt.bgColor}|${fmt.bgOpacity ?? 1}`;
                if (!colorMap.has(key)) {
                  colorMap.set(key, { color: fmt.bgColor, opacity: fmt.bgOpacity ?? 1 });
                }
              }
            });
          });
        }
      });
    });
    
    return Array.from(colorMap.values());
  }, [characters, activeCharacterId]);

  // Detect mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fixed small sizing
  const labelClass = 'text-xs';
  const cellClass = 'text-[10px] p-0.5';
  const gapClass = 'gap-1';
  
  // Calculate table area height
  const labelHeight = 16;
  const gapSize = 4;
  const padding = 0;
  const tableHeight = Math.max(40, height - labelHeight - gapSize - padding * 2);

  const handleCellChange = (rowIdx: number, colIdx: number, value: string) => {
    const newRows = [...rows];
    const currentCell = newRows[rowIdx].cells[colIdx];
    const currentFormat = getCellFormat(currentCell);
    
    newRows[rowIdx] = { 
      ...newRows[rowIdx], 
      cells: [...newRows[rowIdx].cells]
    };
    newRows[rowIdx].cells[colIdx] = createCell(value, currentFormat);
    updateWidgetData(widget.id, { rows: newRows });
  };

  const handleFormatChange = (rowIdx: number, colIdx: number, formatUpdate: Partial<CellFormat>) => {
    const newRows = [...rows];
    const currentCell = newRows[rowIdx].cells[colIdx];
    const currentValue = getCellValue(currentCell);
    const currentFormat = getCellFormat(currentCell);
    
    newRows[rowIdx] = { 
      ...newRows[rowIdx], 
      cells: [...newRows[rowIdx].cells]
    };
    
    const newFormat = { ...currentFormat, ...formatUpdate };
    // Clean up undefined values
    Object.keys(newFormat).forEach(key => {
      if (newFormat[key as keyof CellFormat] === undefined) {
        delete newFormat[key as keyof CellFormat];
      }
    });
    
    newRows[rowIdx].cells[colIdx] = createCell(currentValue, Object.keys(newFormat).length > 0 ? newFormat : undefined);
    updateWidgetData(widget.id, { rows: newRows });
  };

  const handleCellClick = (rowIdx: number, colIdx: number, event: React.MouseEvent) => {
    // Always enter edit mode on click, show toolbar alongside
    setEditingCell({ row: rowIdx, col: colIdx });
    setSelectedCell({ row: rowIdx, col: colIdx });
    
    // Calculate toolbar position
    const clientX = event.clientX;
    const clientY = event.clientY;
    const toolbarWidth = 320;
    setToolbarPos({
      x: Math.max(8, Math.min(clientX - toolbarWidth / 2, window.innerWidth - toolbarWidth - 8)),
      y: Math.max(8, clientY - 50)
    });
    setShowToolbar(true);
  };

  const handleCellDoubleClick = (_rowIdx: number, _colIdx: number) => {
    // No longer needed since single click now enters edit mode
  };

  const clearRow = (index: number) => {
    const newRows = [...rows];
    newRows[index] = { cells: columns.map(() => '') };
    updateWidgetData(widget.id, { rows: newRows });
  };

  // Row drag handlers
  const handleRowDragStart = (e: React.DragEvent, index: number) => {
    dragRowItem.current = index;
    setDraggedRowIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleRowDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragRowItem.current !== null && dragRowItem.current !== index) {
      setDragOverRowIndex(index);
    }
  };

  const handleRowDragLeave = () => {
    setDragOverRowIndex(null);
  };

  const handleRowDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const fromIndex = dragRowItem.current;
    if (fromIndex !== null && fromIndex !== toIndex) {
      const newRows = [...rows];
      const [movedRow] = newRows.splice(fromIndex, 1);
      const insertIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
      newRows.splice(insertIndex, 0, movedRow);
      updateWidgetData(widget.id, { rows: newRows });
    }
    dragRowItem.current = null;
    setDraggedRowIndex(null);
    setDragOverRowIndex(null);
  };

  const handleRowDragEnd = () => {
    dragRowItem.current = null;
    setDraggedRowIndex(null);
    setDragOverRowIndex(null);
  };

  // Get cell style based on format
  const getCellStyle = (format: CellFormat): React.CSSProperties => {
    const style: React.CSSProperties = {};
    
    if (format.bgColor) {
      // Handle CSS variable colors
      if (format.bgColor.startsWith('var(')) {
        style.backgroundColor = format.bgColor;
        if (format.bgOpacity !== undefined && format.bgOpacity < 1) {
          // For CSS variables, we use a pseudo-element approach via opacity
          style.position = 'relative';
        }
      } else {
        // For hex colors, we can apply opacity directly
        const opacity = format.bgOpacity ?? 1;
        if (opacity < 1) {
          // Convert hex to rgba
          const hex = format.bgColor.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        } else {
          style.backgroundColor = format.bgColor;
        }
      }
    }
    
    if (format.hAlign) {
      style.textAlign = format.hAlign;
    }
    
    return style;
  };

  const getCellContentStyle = (format: CellFormat): React.CSSProperties => {
    const style: React.CSSProperties = {};
    
    if (format.vAlign === 'top') {
      style.alignItems = 'flex-start';
    } else if (format.vAlign === 'bottom') {
      style.alignItems = 'flex-end';
    } else {
      style.alignItems = 'center';
    }
    
    return style;
  };

  const getCellTextClass = (format: CellFormat): string => {
    const classes: string[] = [];
    if (format.bold) classes.push('font-bold');
    if (format.italic) classes.push('italic');
    if (format.underline) classes.push('underline');
    if (format.strikethrough) classes.push('line-through');
    return classes.join(' ');
  };

  // Close toolbar when clicking elsewhere
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (tableRef.current && !tableRef.current.contains(e.target as Node)) {
        setShowToolbar(false);
        setSelectedCell(null);
      }
    };
    
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  // Touch long press handling
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [touchStart, setTouchStart] = useState<{ row: number; col: number } | null>(null);

  const handleTouchStart = (rowIdx: number, colIdx: number) => {
    setTouchStart({ row: rowIdx, col: colIdx });
    longPressTimer.current = setTimeout(() => {
      // Long press - show toolbar
      setSelectedCell({ row: rowIdx, col: colIdx });
      setShowToolbar(true);
      longPressTimer.current = null;
    }, 500);
  };

  const handleTouchEnd = (rowIdx: number, colIdx: number, e: React.TouchEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      
      // Quick tap - enter edit mode and show toolbar
      if (touchStart?.row === rowIdx && touchStart?.col === colIdx) {
        setEditingCell({ row: rowIdx, col: colIdx });
        setSelectedCell({ row: rowIdx, col: colIdx });
        
        // Position toolbar at bottom for mobile
        setShowToolbar(true);
        e.preventDefault();
      }
    }
    setTouchStart(null);
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setTouchStart(null);
  };

  return (
    <div ref={tableRef} className={`flex flex-col ${gapClass} w-full h-full`}>
      {label && (
        <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {label}
        </div>
      )}

      {/* Table */}
      <div 
        className="overflow-auto flex-1"
        style={{ maxHeight: `${tableHeight}px` }}
        onWheel={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
            e.stopPropagation();
          }
        }}
        onDragOver={(e) => e.preventDefault()}
      >
        <table className={`w-full border-collapse ${cellClass}`}>
          <thead className="sticky top-0">
            <tr>
              <th className="w-4"></th>
              {columns.map((col: string, idx: number) => (
                <th key={idx} className={`border border-theme-border bg-theme-background ${cellClass} text-theme-ink font-heading`}>
                  {col}
                </th>
              ))}
              <th className={'w-4'}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: TableRow, rowIdx: number) => (
              <tr 
                key={rowIdx} 
                className={`group ${draggedRowIndex === rowIdx ? 'opacity-50' : ''} ${dragOverRowIndex === rowIdx && draggedRowIndex !== rowIdx ? 'border-t-2 border-theme-accent' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRowDragOver(e, rowIdx);
                }}
                onDragLeave={handleRowDragLeave}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRowDrop(e, rowIdx);
                }}
              >
                <td 
                  className="w-4 p-0 cursor-grab active:cursor-grabbing"
                  draggable
                  onDragStart={(e) => handleRowDragStart(e, rowIdx)}
                  onDragEnd={handleRowDragEnd}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="text-theme-muted hover:text-theme-ink text-[10px] text-center touch-none select-none">
                    ⠿
                  </div>
                </td>
                {row.cells.map((cell, colIdx: number) => {
                  const cellValue = getCellValue(cell);
                  const cellFormat = getCellFormat(cell);
                  const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === colIdx;
                  const isEditing = editingCell?.row === rowIdx && editingCell?.col === colIdx;
                  
                  return (
                    <td 
                      key={colIdx} 
                      className={`border ${isSelected ? 'border-theme-accent border-2' : 'border-theme-border'} ${cellClass} text-theme-ink`}
                      style={getCellStyle(cellFormat)}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          value={cellValue}
                          onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setEditingCell(null);
                            } else if (e.key === 'Tab') {
                              e.preventDefault();
                              if (e.shiftKey) {
                                if (colIdx > 0) {
                                  setEditingCell({ row: rowIdx, col: colIdx - 1 });
                                  setSelectedCell({ row: rowIdx, col: colIdx - 1 });
                                } else if (rowIdx > 0) {
                                  setEditingCell({ row: rowIdx - 1, col: columns.length - 1 });
                                  setSelectedCell({ row: rowIdx - 1, col: columns.length - 1 });
                                }
                              } else {
                                if (colIdx < columns.length - 1) {
                                  setEditingCell({ row: rowIdx, col: colIdx + 1 });
                                  setSelectedCell({ row: rowIdx, col: colIdx + 1 });
                                } else if (rowIdx < rows.length - 1) {
                                  setEditingCell({ row: rowIdx + 1, col: 0 });
                                  setSelectedCell({ row: rowIdx + 1, col: 0 });
                                }
                              }
                            } else if (e.key === 'Escape') {
                              setEditingCell(null);
                            }
                          }}
                          className={`w-full bg-transparent focus:outline-none text-[10px] text-theme-ink font-body ${getCellTextClass(cellFormat)}`}
                          style={{ textAlign: cellFormat.hAlign || 'left' }}
                          onMouseDown={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div 
                          onClick={(e) => handleCellClick(rowIdx, colIdx, e)}
                          onDoubleClick={() => handleCellDoubleClick(rowIdx, colIdx)}
                          onTouchStart={() => handleTouchStart(rowIdx, colIdx)}
                          onTouchEnd={(e) => handleTouchEnd(rowIdx, colIdx, e)}
                          onTouchMove={handleTouchMove}
                          onMouseDown={(e) => e.stopPropagation()}
                          className={`min-h-[1.5em] cursor-pointer hover:opacity-70 font-body flex ${getCellTextClass(cellFormat)}`}
                          style={{
                            ...getCellContentStyle(cellFormat),
                            justifyContent: cellFormat.hAlign === 'center' ? 'center' : cellFormat.hAlign === 'right' ? 'flex-end' : 'flex-start',
                          }}
                        >
                          {cellValue || <span className="text-theme-muted">-</span>}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className={`w-4 p-0`}>
                  <button
                    onClick={() => clearRow(rowIdx)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full h-full text-theme-muted hover:text-theme-ink opacity-0 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Formatting Toolbar - rendered via portal to escape transformed container */}
      {showToolbar && selectedCell && createPortal(
        <FormatToolbar
          format={getCellFormat(rows[selectedCell.row]?.cells[selectedCell.col])}
          onFormatChange={(formatUpdate) => handleFormatChange(selectedCell.row, selectedCell.col, formatUpdate)}
          onClose={() => {
            setShowToolbar(false);
            setSelectedCell(null);
          }}
          position={toolbarPos}
          isMobile={isMobile}
          usedColors={usedColors}
        />,
        document.body
      )}
    </div>
  );
}
