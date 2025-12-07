import { useState } from 'react';
import { Widget, TableRow } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

export default function TableWidget({ widget, width, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { 
    label, 
    columns = ['Item', 'Qty', 'Weight'],
    rows = []
  } = widget.data;
  
  const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null);

  // Responsive sizing
  const isCompact = width < 200;
  const isLarge = width >= 400;
  const isShort = height < 120;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const cellClass = isCompact || isShort ? 'text-[10px] p-0.5' : isLarge ? 'text-base p-2' : 'text-sm p-1';
  const gapClass = isCompact || isShort ? 'gap-1' : 'gap-2';
  
  // Calculate table area height
  const labelHeight = isCompact ? 16 : isLarge ? 24 : 20;
  const gapSize = isCompact || isShort ? 4 : 8;
  const padding = isCompact ? 8 : 16;
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

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
        {label || 'Table'}
      </div>

      {/* Table */}
      <div 
        className="overflow-auto flex-1"
        style={{ maxHeight: `${tableHeight}px` }}
        onWheel={(e) => e.stopPropagation()}
      >
        <table className={`w-full border-collapse ${cellClass}`}>
          <thead className="sticky top-0">
            <tr>
              {columns.map((col: string, idx: number) => (
                <th key={idx} className={`border border-theme-border bg-theme-background ${cellClass} text-theme-ink font-heading`}>
                  {col}
                </th>
              ))}
              <th className={isCompact || isShort ? 'w-4' : 'w-6'}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: TableRow, rowIdx: number) => (
              <tr key={rowIdx} className="group">
                {row.cells.map((cell: string, colIdx: number) => (
                  <td key={colIdx} className={`border border-theme-border ${cellClass} text-theme-ink`}>
                    {editingCell?.row === rowIdx && editingCell?.col === colIdx ? (
                      <input
                        autoFocus
                        value={cell}
                        onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                        onBlur={() => setEditingCell(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
                        className={`w-full bg-transparent focus:outline-none ${isCompact || isShort ? 'text-[10px]' : isLarge ? 'text-base' : 'text-sm'} text-theme-ink font-body`}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div 
                        onClick={() => setEditingCell({ row: rowIdx, col: colIdx })}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={`${isCompact || isShort ? 'min-h-[1em]' : 'min-h-[1.5em]'} cursor-text hover:opacity-70 font-body`}
                      >
                        {cell || <span className="text-theme-muted">-</span>}
                      </div>
                    )}
                  </td>
                ))}
                <td className={`${isCompact || isShort ? 'w-4' : 'w-6'} p-0`}>
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
