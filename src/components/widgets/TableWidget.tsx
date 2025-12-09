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
  const tableRef = useRef<HTMLTableElement>(null);
  const touchDragActive = useRef<boolean>(false);

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

  // Touch drag handlers for mobile devices
  const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    e.stopPropagation();
    e.preventDefault();
    dragRowItem.current = index;
    touchDragActive.current = true;
    setDraggedRowIndex(index);
  }, []);

  const getRowIndexFromTouch = useCallback((touch: Touch): number | null => {
    if (!tableRef.current) return null;
    const rows = tableRef.current.querySelectorAll('tbody tr');
    for (let i = 0; i < rows.length; i++) {
      const rect = rows[i].getBoundingClientRect();
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        return i;
      }
    }
    return null;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchDragActive.current || dragRowItem.current === null) return;
    e.stopPropagation();
    e.preventDefault();
    
    const touch = e.touches[0];
    const targetRowIndex = getRowIndexFromTouch(touch);
    
    if (targetRowIndex !== null && targetRowIndex !== dragRowItem.current) {
      setDragOverRowIndex(targetRowIndex);
    } else {
      setDragOverRowIndex(null);
    }
  }, [getRowIndexFromTouch]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchDragActive.current) return;
    e.stopPropagation();
    e.preventDefault();
    
    const fromIndex = dragRowItem.current;
    const toIndex = dragOverRowIndex;
    
    if (fromIndex !== null && toIndex !== null && fromIndex !== toIndex) {
      const newRows = [...rows];
      const [movedRow] = newRows.splice(fromIndex, 1);
      const insertIndex = fromIndex < toIndex ? toIndex : toIndex;
      newRows.splice(insertIndex, 0, movedRow);
      updateWidgetData(widget.id, { rows: newRows });
    }
    
    dragRowItem.current = null;
    touchDragActive.current = false;
    setDraggedRowIndex(null);
    setDragOverRowIndex(null);
  }, [rows, dragOverRowIndex, updateWidgetData, widget.id]);

  // Add and remove touch event listeners on document
  useEffect(() => {
    const handleDocumentTouchMove = (e: TouchEvent) => handleTouchMove(e);
    const handleDocumentTouchEnd = (e: TouchEvent) => handleTouchEnd(e);
    
    document.addEventListener('touchmove', handleDocumentTouchMove, { passive: false });
    document.addEventListener('touchend', handleDocumentTouchEnd, { passive: false });
    document.addEventListener('touchcancel', handleDocumentTouchEnd, { passive: false });
    
    return () => {
      document.removeEventListener('touchmove', handleDocumentTouchMove);
      document.removeEventListener('touchend', handleDocumentTouchEnd);
      document.removeEventListener('touchcancel', handleDocumentTouchEnd);
    };
  }, [handleTouchMove, handleTouchEnd]);

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
        <table ref={tableRef} className={`w-full border-collapse ${cellClass}`}>
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
                  onTouchStart={(e) => handleTouchStart(e, rowIdx)}
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
