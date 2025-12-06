import { useState } from 'react';
import { Widget, TableRow } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

export default function TableWidget({ widget, width }: Props) {
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
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const cellClass = isCompact ? 'text-[10px] p-0.5' : isLarge ? 'text-base p-2' : 'text-sm p-1';
  const buttonClass = isCompact ? 'text-[10px] px-1 py-0.5' : isLarge ? 'text-sm px-3 py-1.5' : 'text-xs px-2 py-1';
  const countClass = isCompact ? 'text-[10px]' : isLarge ? 'text-sm' : 'text-xs';
  const gapClass = isCompact ? 'gap-1' : 'gap-2';

  const handleCellChange = (rowIdx: number, colIdx: number, value: string) => {
    const newRows = [...rows];
    newRows[rowIdx] = { 
      ...newRows[rowIdx], 
      cells: [...newRows[rowIdx].cells]
    };
    newRows[rowIdx].cells[colIdx] = value;
    updateWidgetData(widget.id, { rows: newRows });
  };

  const addRow = () => {
    const newRow: TableRow = { cells: columns.map(() => '') };
    updateWidgetData(widget.id, { rows: [...rows, newRow] });
  };

  const removeRow = (index: number) => {
    const newRows = [...rows];
    newRows.splice(index, 1);
    updateWidgetData(widget.id, { rows: newRows });
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full`}>
      <div className={`font-bold ${labelClass} text-theme-ink font-heading`}>
        {label || 'Table'}
      </div>

      {/* Table */}
      <div>
        <table className={`w-full border-collapse ${cellClass}`}>
          <thead>
            <tr>
              {columns.map((col: string, idx: number) => (
                <th key={idx} className={`border border-theme-border bg-theme-background ${cellClass} text-theme-ink font-heading`}>
                  {col}
                </th>
              ))}
              <th className={isCompact ? 'w-4' : 'w-6'}></th>
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
                        className={`w-full bg-transparent focus:outline-none ${isCompact ? 'text-[10px]' : isLarge ? 'text-base' : 'text-sm'} text-theme-ink font-body`}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div 
                        onClick={() => setEditingCell({ row: rowIdx, col: colIdx })}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={`${isCompact ? 'min-h-[1em]' : 'min-h-[1.5em]'} cursor-text hover:opacity-70 font-body`}
                      >
                        {cell || <span className="text-theme-muted">-</span>}
                      </div>
                    )}
                  </td>
                ))}
                <td className={`${isCompact ? 'w-4' : 'w-6'} p-0`}>
                  <button
                    onClick={() => removeRow(rowIdx)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full h-full text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Row Button */}
      <div className={`flex ${gapClass}`}>
        <button
          onClick={addRow}
          onMouseDown={(e) => e.stopPropagation()}
          className={`flex-1 ${buttonClass} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors text-theme-ink rounded-theme`}
        >
          + Row
        </button>
      </div>

      {/* Row Count */}
      <div className={`${countClass} text-theme-muted text-right font-body`}>
        {rows.length} item{rows.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
