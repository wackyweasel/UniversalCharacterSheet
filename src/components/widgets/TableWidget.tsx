import { useState } from 'react';
import { Widget, TableRow } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

export default function TableWidget({ widget, mode, width, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { 
    label, 
    columns = ['Item', 'Qty', 'Weight'],
    rows = []
  } = widget.data;
  
  const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null);

  // Responsive sizing
  const isCompact = width < 200 || height < 150;
  const isLarge = width >= 400 && height >= 300;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const cellClass = isCompact ? 'text-[10px] p-0.5' : isLarge ? 'text-base p-2' : 'text-sm p-1';
  const buttonClass = isCompact ? 'text-[10px] px-1 py-0.5' : isLarge ? 'text-sm px-3 py-1.5' : 'text-xs px-2 py-1';
  const deleteButtonClass = isCompact ? 'w-3 h-3 -top-1.5 -right-1.5 text-[10px]' : isLarge ? 'w-5 h-5 -top-2.5 -right-2.5 text-sm' : 'w-4 h-4 -top-2 -right-2 text-xs';
  const countClass = isCompact ? 'text-[10px]' : isLarge ? 'text-sm' : 'text-xs';
  const gapClass = isCompact ? 'gap-1' : 'gap-2';

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateWidgetData(widget.id, { label: e.target.value });
  };

  const handleColumnChange = (index: number, value: string) => {
    const newColumns = [...columns];
    newColumns[index] = value;
    updateWidgetData(widget.id, { columns: newColumns });
  };

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

  const addColumn = () => {
    const newColumns = [...columns, 'New'];
    const newRows = rows.map((row: TableRow) => ({
      ...row,
      cells: [...row.cells, '']
    }));
    updateWidgetData(widget.id, { columns: newColumns, rows: newRows });
  };

  const removeColumn = (index: number) => {
    if (columns.length <= 1) return;
    const newColumns = [...columns];
    newColumns.splice(index, 1);
    const newRows = rows.map((row: TableRow) => {
      const newCells = [...row.cells];
      newCells.splice(index, 1);
      return { ...row, cells: newCells };
    });
    updateWidgetData(widget.id, { columns: newColumns, rows: newRows });
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      <input
        className={`font-bold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-black focus:outline-none flex-shrink-0 ${labelClass}`}
        value={label}
        onChange={handleLabelChange}
        placeholder="Inventory"
        disabled={mode === 'play'}
        onMouseDown={(e) => e.stopPropagation()}
      />

      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className={`w-full border-collapse ${cellClass}`}>
          <thead>
            <tr>
              {columns.map((col: string, idx: number) => (
                <th key={idx} className={`border border-black bg-gray-100 ${cellClass} relative group`}>
                  {mode === 'edit' ? (
                    <input
                      value={col}
                      onChange={(e) => handleColumnChange(idx, e.target.value)}
                      className={`w-full bg-transparent text-center font-bold focus:outline-none ${isCompact ? 'text-[10px]' : isLarge ? 'text-base' : 'text-sm'}`}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  ) : (
                    col
                  )}
                  {mode === 'edit' && columns.length > 1 && (
                    <button
                      onClick={() => removeColumn(idx)}
                      onMouseDown={(e) => e.stopPropagation()}
                      className={`absolute ${deleteButtonClass} bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100`}
                    >
                      ×
                    </button>
                  )}
                </th>
              ))}
              {mode === 'edit' && <th className={isCompact ? 'w-4' : 'w-6'}></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: TableRow, rowIdx: number) => (
              <tr key={rowIdx} className="group">
                {row.cells.map((cell: string, colIdx: number) => (
                  <td key={colIdx} className={`border border-black ${cellClass}`}>
                    {editingCell?.row === rowIdx && editingCell?.col === colIdx ? (
                      <input
                        autoFocus
                        value={cell}
                        onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                        onBlur={() => setEditingCell(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
                        className={`w-full bg-transparent focus:outline-none ${isCompact ? 'text-[10px]' : isLarge ? 'text-base' : 'text-sm'}`}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div 
                        onClick={() => setEditingCell({ row: rowIdx, col: colIdx })}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={`${isCompact ? 'min-h-[1em]' : 'min-h-[1.5em]'} cursor-text hover:bg-gray-50`}
                      >
                        {cell || <span className="text-gray-300">-</span>}
                      </div>
                    )}
                  </td>
                ))}
                {mode === 'edit' && (
                  <td className={`${isCompact ? 'w-4' : 'w-6'} p-0`}>
                    <button
                      onClick={() => removeRow(rowIdx)}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-full h-full text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Controls */}
      <div className={`flex ${gapClass}`}>
        <button
          onClick={addRow}
          onMouseDown={(e) => e.stopPropagation()}
          className={`flex-1 ${buttonClass} border border-black hover:bg-black hover:text-white transition-colors`}
        >
          + Row
        </button>
        {mode === 'edit' && (
          <button
            onClick={addColumn}
            onMouseDown={(e) => e.stopPropagation()}
            className={`flex-1 ${buttonClass} border border-black hover:bg-black hover:text-white transition-colors`}
          >
            + Column
          </button>
        )}
      </div>

      {/* Row Count */}
      <div className={`${countClass} text-gray-500 text-right`}>
        {rows.length} item{rows.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
