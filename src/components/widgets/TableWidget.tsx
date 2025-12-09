import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Widget, TableRow } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

export default function TableWidget({ widget, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { 
    label, 
    columns = ['Item', 'Qty', 'Weight'],
    rows = []
  } = widget.data;
  
  const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null);
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
  const [dragOverRowIndex, setDragOverRowIndex] = useState<number | null>(null);
  const dragRowItem = useRef<number | null>(null);
  
  // Touch drag state
  const touchDragState = useRef<{
    isDragging: boolean;
    startY: number;
    currentIndex: number;
    rowElements: HTMLTableRowElement[];
  } | null>(null);
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);

  // Fixed small sizing
  const labelClass = 'text-xs';
  const cellClass = 'text-[10px] p-0.5';
  const gapClass = 'gap-1';
  
  // Calculate table area height
  const labelHeight = 16;
  const gapSize = 4;
  const padding = 8;
  const tableHeight = Math.max(40, height - labelHeight - gapSize - padding * 2);

  const handleCellChange = (rowIdx: number, colIdx: number, value: string) => {
    const newRows = [...rows];
    newRows[rowIdx] = { 
      ...newRows[rowIdx], 
      cells: [...newRows[rowIdx].cells]
    };
    newRows[rowIdx].cells[colIdx] = value;
    updateWidgetData(widget.id, { rows: newRows });
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

  // Touch drag handlers for mobile support
  const handleRowTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    e.stopPropagation();
    
    const touch = e.touches[0];
    const rowElements = tableBodyRef.current 
      ? Array.from(tableBodyRef.current.querySelectorAll('tr')) as HTMLTableRowElement[]
      : [];
    
    touchDragState.current = {
      isDragging: true,
      startY: touch.clientY,
      currentIndex: index,
      rowElements
    };
    
    setDraggedRowIndex(index);
    dragRowItem.current = index;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchDragState.current?.isDragging) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches[0];
    const { rowElements, currentIndex } = touchDragState.current;
    
    // Find which row the touch is over
    for (let i = 0; i < rowElements.length; i++) {
      const rect = rowElements[i].getBoundingClientRect();
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        if (i !== currentIndex) {
          setDragOverRowIndex(i);
        } else {
          setDragOverRowIndex(null);
        }
        break;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchDragState.current?.isDragging) return;
    
    const fromIndex = dragRowItem.current;
    const toIndex = dragOverRowIndex;
    
    if (fromIndex !== null && toIndex !== null && fromIndex !== toIndex) {
      const newRows = [...rows];
      const [movedRow] = newRows.splice(fromIndex, 1);
      const insertIndex = fromIndex < toIndex ? toIndex : toIndex;
      newRows.splice(insertIndex, 0, movedRow);
      updateWidgetData(widget.id, { rows: newRows });
    }
    
    touchDragState.current = null;
    dragRowItem.current = null;
    setDraggedRowIndex(null);
    setDragOverRowIndex(null);
  }, [dragOverRowIndex, rows, updateWidgetData, widget.id]);

  // Add global touch event listeners when dragging
  useEffect(() => {
    if (draggedRowIndex !== null) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      document.addEventListener('touchcancel', handleTouchEnd);
      
      return () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel', handleTouchEnd);
      };
    }
  }, [draggedRowIndex, handleTouchMove, handleTouchEnd]);

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
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
          <tbody ref={tableBodyRef}>
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
                  onTouchStart={(e) => handleRowTouchStart(e, rowIdx)}
                  data-touch-drag
                >
                  <div className="text-theme-muted hover:text-theme-ink text-[10px] text-center touch-none select-none">
                    ⠿
                  </div>
                </td>
                {row.cells.map((cell: string, colIdx: number) => (
                  <td key={colIdx} className={`border border-theme-border ${cellClass} text-theme-ink`}>
                    {editingCell?.row === rowIdx && editingCell?.col === colIdx ? (
                      <input
                        autoFocus
                        value={cell}
                        onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                        onBlur={() => setEditingCell(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setEditingCell(null);
                          } else if (e.key === 'Tab') {
                            e.preventDefault();
                            if (e.shiftKey) {
                              // Move to previous cell
                              if (colIdx > 0) {
                                setEditingCell({ row: rowIdx, col: colIdx - 1 });
                              } else if (rowIdx > 0) {
                                setEditingCell({ row: rowIdx - 1, col: columns.length - 1 });
                              }
                            } else {
                              // Move to next cell
                              if (colIdx < columns.length - 1) {
                                setEditingCell({ row: rowIdx, col: colIdx + 1 });
                              } else if (rowIdx < rows.length - 1) {
                                setEditingCell({ row: rowIdx + 1, col: 0 });
                              }
                            }
                          }
                        }}
                        className={`w-full bg-transparent focus:outline-none text-[10px] text-theme-ink font-body`}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div 
                        onClick={() => setEditingCell({ row: rowIdx, col: colIdx })}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={`min-h-[1em] cursor-text hover:opacity-70 font-body`}
                      >
                        {cell || <span className="text-theme-muted">-</span>}
                      </div>
                    )}
                  </td>
                ))}
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
    </div>
  );
}
