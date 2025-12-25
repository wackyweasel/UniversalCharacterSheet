import React, { useState } from 'react';
import { EditorProps } from './types';
import { TableRow } from '../../types';

export function TableEditor({ widget, updateData }: EditorProps) {
  const { label, columns = ['Item', 'Qty', 'Weight'], rows = [] } = widget.data;
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragItem = React.useRef<number | null>(null);

  const handleColumnChange = (index: number, value: string) => {
    const newColumns = [...columns];
    newColumns[index] = value;
    updateData({ columns: newColumns });
  };

  const addColumn = () => {
    // Also add empty cell to all existing rows
    const newRows = rows.map((row: TableRow) => ({
      ...row,
      cells: [...row.cells, '']
    }));
    updateData({ columns: [...columns, 'New'], rows: newRows });
  };

  const removeColumn = (index: number) => {
    if (columns.length <= 1) return;
    const newColumns = [...columns];
    newColumns.splice(index, 1);
    // Also update rows to remove the column data
    const newRows = rows.map((row: TableRow) => ({
      ...row,
      cells: row.cells.filter((_, i: number) => i !== index)
    }));
    updateData({ columns: newColumns, rows: newRows });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragItem.current = index;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    // Set a drag image
    const target = e.currentTarget as HTMLElement;
    if (target) {
      e.dataTransfer.setDragImage(target, 0, 0);
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragItem.current !== null && dragItem.current !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const fromIndex = dragItem.current;
    if (fromIndex !== null && fromIndex !== toIndex) {
      // Create new arrays
      const newColumns = [...columns];
      const newRows = rows.map((row: TableRow) => ({ ...row, cells: [...row.cells] }));
      
      // Move column: remove from old position, insert at new position
      const [movedColumn] = newColumns.splice(fromIndex, 1);
      // When moving down, the target index shifts after removal, so we use toIndex directly
      // When moving up, toIndex is already correct
      const insertIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
      newColumns.splice(insertIndex, 0, movedColumn);
      
      // Do the same for row cells
      newRows.forEach((row) => {
        const [movedCell] = row.cells.splice(fromIndex, 1);
        row.cells.splice(insertIndex, 0, movedCell);
      });
      
      updateData({ columns: newColumns, rows: newRows });
    }
    dragItem.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    dragItem.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const addRow = () => {
    const newRow = { cells: columns.map(() => '') };
    updateData({ rows: [...rows, newRow] });
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    const newRows = [...rows];
    newRows.splice(index, 1);
    updateData({ rows: newRows });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <div className="relative">
          <input
            className="w-full px-3 py-2 pr-8 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            value={label || ''}
            onChange={(e) => updateData({ label: e.target.value })}
            placeholder="Inventory"
          />
          {label && (
            <button
              type="button"
              onClick={() => updateData({ label: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-ink transition-colors"
              title="Clear label"
            >
              ×
            </button>
          )}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Columns</label>
        <div 
          className="space-y-2"
          onDragOver={(e) => e.preventDefault()}
        >
          {columns.map((col: string, idx: number) => (
            <div 
              key={idx} 
              className={`flex items-center gap-2 ${draggedIndex === idx ? 'opacity-50' : ''} ${dragOverIndex === idx && draggedIndex !== idx ? 'border-t-2 border-theme-accent' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDragOver(e, idx);
              }}
              onDragLeave={handleDragLeave}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDrop(e, idx);
              }}
              onDragEnd={handleDragEnd}
            >
              <div 
                className="cursor-grab active:cursor-grabbing text-theme-muted hover:text-theme-ink px-1 touch-none"
                title="Drag to reorder"
              >
                ⠿
              </div>
              <input
                className="flex-1 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm"
                value={col}
                onChange={(e) => handleColumnChange(idx, e.target.value)}
                placeholder="Column name"
                draggable={false}
                onDragOver={(e) => e.stopPropagation()}
              />
              {columns.length > 1 && (
                <button
                  onClick={() => removeColumn(idx)}
                  className="text-red-500 hover:text-red-700 px-2"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addColumn}
          className="mt-2 px-3 py-1 border border-theme-border rounded-button text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper"
        >
          + Add Column
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Rows ({rows.length})</label>
        <div className="flex gap-2">
          <button
            onClick={addRow}
            className="px-3 py-1 border border-theme-border rounded-button text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper"
          >
            + Add Row
          </button>
          {rows.length > 1 && (
            <button
              onClick={() => removeRow(rows.length - 1)}
              className="px-3 py-1 border border-theme-border rounded-button text-sm text-red-500 hover:bg-red-500 hover:text-white"
            >
              - Remove Row
            </button>
          )}
        </div>
        <p className="text-xs text-theme-muted mt-1">Row contents can be edited in play mode</p>
      </div>
    </div>
  );
}

