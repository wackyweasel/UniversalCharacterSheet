import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EditorProps } from './types';
import { TableRow, WidgetData } from '../../types';
import { usePointerReorder } from '../../hooks';
import { getTableCellOwner, isCoveredTableCell, tableCellObject, tableCellValue, transformTableAxis, validateTableMerges } from '../../utils/tableCells';
import { Tooltip } from '../Tooltip';
import { GripVerticalIcon, TrashIcon, XIcon } from '../icons';
import { CollapsibleSection } from './CollapsibleSection';

type LabelScope = 'column' | 'row';

interface TableLabelButtonProps {
  scope: LabelScope;
  label?: string;
  canAssign: boolean;
  isOpen: boolean;
  onClick: () => void;
}

function TableLabelButton({ scope, label, canAssign, isOpen, onClick }: TableLabelButtonProps) {
  const subject = scope === 'column' ? 'column' : 'row';
  const isDisabled = !canAssign && !label;
  const tooltip = label
    ? `${scope === 'column' ? 'Column' : 'Row'} label: @${label}1, @${label}2...`
    : isDisabled
      ? `The ${subject} must contain numbers to assign a label`
      : `Set ${subject} label`;

  return (
    <Tooltip content={tooltip}>
      <button
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        aria-label={label ? `Edit ${subject} label ${label}` : `Set ${subject} label`}
        title={tooltip}
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-button border text-xs transition-colors ${
          isOpen
            ? 'border-theme-accent bg-theme-accent/30 text-theme-accent ring-1 ring-theme-accent'
            : label
              ? 'border-theme-accent bg-theme-accent/20 text-theme-accent'
              : 'border-theme-border text-theme-muted hover:border-theme-accent hover:text-theme-ink'
        } disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      </button>
    </Tooltip>
  );
}

interface TableLabelEditorProps {
  scope: LabelScope;
  draft: string;
  hasLabel: boolean;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  onClear: () => void;
  onCancel: () => void;
}

function TableLabelEditor({ scope, draft, hasLabel, onDraftChange, onSave, onClear, onCancel }: TableLabelEditorProps) {
  const subject = scope === 'column' ? 'Column' : 'Row';

  return (
    <div className="mt-2 w-full border-t border-theme-border/50 pt-2">
      <div className="mb-1 flex items-center gap-1 text-[10px] font-medium text-theme-ink">
        <span className="text-theme-accent">@</span>
        {subject} Label
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-theme-muted">@</span>
        <input
          type="text"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onSave();
            } else if (event.key === 'Escape') {
              onCancel();
            }
          }}
          placeholder="e.g. str, max_hp"
          aria-label={`${subject} label`}
          className="h-7 min-w-0 flex-1 rounded border border-theme-border bg-theme-paper px-1.5 py-1 text-[10px] text-theme-ink focus:border-theme-accent focus:outline-none"
          autoFocus
        />
        <button
          type="button"
          onClick={onSave}
          className="h-7 rounded bg-theme-accent px-2 py-1 text-[10px] text-theme-paper hover:opacity-90"
        >
          Set
        </button>
        <button
          type="button"
          onClick={onCancel}
          aria-label={`Cancel ${subject.toLowerCase()} label editing`}
          title="Cancel label editing"
          className="flex h-7 w-7 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-accent hover:text-theme-ink"
        >
          <XIcon className="h-3 w-3" />
        </button>
        {hasLabel && (
          <button
            type="button"
            onClick={onClear}
            className="h-7 rounded border border-red-300 px-2 py-1 text-[10px] text-red-500 hover:bg-red-50"
          >
            ×
          </button>
        )}
      </div>
      <p className="mt-0.5 text-[9px] text-theme-muted">
        {scope === 'column' ? 'Rows use' : 'Columns use'} <span className="font-mono">@{draft || 'name'}1</span>, <span className="font-mono">@{draft || 'name'}2</span>, etc.
      </p>
    </div>
  );
}

export function TableEditor({ widget, updateData }: EditorProps) {
  const { columns = ['Item', 'Qty', 'Weight'], rows = [], tableColumnSettings = [], tableRowSettings = [], hideTableHeader = false, tableCornerRadius = false } = widget.data;
  const [editingLabel, setEditingLabel] = useState<{ scope: LabelScope; index: number } | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [expandedCell, setExpandedCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<{ axis: LabelScope; id: string; data: WidgetData } | null>(null);
  const validation = validateTableMerges(widget.data);
  const { merges } = validation;
  const columnIdsRef = useRef<string[]>([]);
  const nextColumnIdRef = useRef(0);
  const getColumnId = (index: number) => {
    const existingId = columnIdsRef.current[index];
    if (existingId) return existingId;
    const id = `table-column-${nextColumnIdRef.current++}`;
    columnIdsRef.current[index] = id;
    return id;
  };
  const reorderableColumns = columns.map((column: string, index: number) => ({
    id: getColumnId(index),
    column,
    index,
  }));
  const rowIdsRef = useRef<string[]>([]);
  const nextRowIdRef = useRef(0);
  const getRowId = (index: number) => {
    const existingId = rowIdsRef.current[index];
    if (existingId) return existingId;
    const id = `table-row-${nextRowIdRef.current++}`;
    rowIdsRef.current[index] = id;
    return id;
  };
  const reorderableRows = rows.map((row: TableRow, index: number) => ({
    id: getRowId(index),
    row,
    index,
  }));
  const expandedRowIndex = reorderableRows.findIndex(item => item.id === expandedCell?.rowId);
  const expandedColumnIndex = reorderableColumns.findIndex(item => item.id === expandedCell?.columnId);
  const expandedOwner = expandedRowIndex >= 0 && expandedColumnIndex >= 0
    ? getTableCellOwner(merges, expandedRowIndex, expandedColumnIndex)
    : null;
  const visibleExpandedCell = expandedOwner ? {
    rowId: reorderableRows[expandedOwner.row].id,
    columnId: reorderableColumns[expandedOwner.col].id,
  } : null;
  const mergedRange = (merge: typeof merges[number]) =>
    `rows ${merge.row + 1}–${merge.row + merge.rowSpan}, columns ${merge.col + 1}–${merge.col + merge.colSpan}`;

  const handleColumnChange = (index: number, value: string) => {
    const newColumns = [...columns];
    newColumns[index] = value;
    updateData({ columns: newColumns });
  };

  const addColumn = () => {
    getColumnId(columns.length);
    const newRows = rows.map((row: TableRow) => ({
      ...row,
      cells: [...row.cells, '']
    }));
    updateData({ columns: [...columns, 'New'], rows: newRows, tableColumnSettings: [...tableColumnSettings, {}] });
  };

  const applyAxisChange = (axis: LabelScope, order: number[], confirmed = false) => {
    const result = transformTableAxis(widget.data, axis, order);
    if (!result.ok) {
      setOperationError(result.reason);
      return;
    }
    const items = axis === 'row' ? reorderableRows : reorderableColumns;
    if (result.removesMergedCells && !confirmed) {
      const removedItem = items.find((_, index) => !order.includes(index));
      if (removedItem) setPendingRemoval({ axis, id: removedItem.id, data: widget.data });
      setOperationError(null);
      return;
    }
    updateData(result.data);
    const ids = order.map(index => items[index].id);
    if (axis === 'row') rowIdsRef.current = ids;
    else columnIdsRef.current = ids;
    if (order.length < items.length) setExpandedCell(null);
    setEditingLabel(null);
    setLabelDraft('');
    setPendingRemoval(null);
    setOperationError(null);
  };

  const removeColumn = (index: number) => {
    if (columns.length <= 1) return;
    applyAxisChange('column', columns.map((_, i) => i).filter(i => i !== index));
  };

  const updateLabel = (scope: LabelScope, index: number, labelValue: string | undefined) => {
    if (scope === 'column') {
      const nextSettings = [...tableColumnSettings];
      const nextSetting = { ...(nextSettings[index] || {}) };
      if (labelValue) nextSetting.label = labelValue;
      else delete nextSetting.label;
      nextSettings[index] = nextSetting;
      updateData({ tableColumnSettings: nextSettings });
    } else {
      const nextSettings = [...tableRowSettings];
      const nextSetting = { ...(nextSettings[index] || {}) };
      if (labelValue) nextSetting.label = labelValue;
      else delete nextSetting.label;
      nextSettings[index] = nextSetting;
      updateData({ tableRowSettings: nextSettings });
    }
    setEditingLabel(null);
    setLabelDraft('');
  };

  const openLabelEditor = (scope: LabelScope, index: number, currentLabel?: string) => {
    setEditingLabel({ scope, index });
    setLabelDraft(currentLabel || '');
  };

  const saveLabel = () => {
    if (!editingLabel) return;
    if (labelDraft.trim() && !(editingLabel.scope === 'column'
      ? canAssignColumnLabel(editingLabel.index)
      : canAssignRowLabel(editingLabel.index))) {
      setOperationError('Only rows or columns with numeric visible cells can have a label.');
      return;
    }
    updateLabel(editingLabel.scope, editingLabel.index, labelDraft.trim() || undefined);
  };

  const cancelLabelEdit = () => {
    setEditingLabel(null);
    setLabelDraft('');
  };

  const canAssignColumnLabel = (index: number) => rows.every((row: TableRow, rowIndex: number) => {
    if (isCoveredTableCell(merges, rowIndex, index)) return true;
    const value = tableCellValue(row.cells[index]);
    return value === '' || !isNaN(Number(value));
  });

  const canAssignRowLabel = (index: number) => (rows[index]?.cells || []).every((cell, columnIndex) => {
    if (isCoveredTableCell(merges, index, columnIndex)) return true;
    const value = tableCellValue(cell);
    return value === '' || !isNaN(Number(value));
  });

  const handleRowCellChange = (rowIndex: number, columnIndex: number, value: string) => {
    const owner = getTableCellOwner(merges, rowIndex, columnIndex);
    rowIndex = owner.row;
    columnIndex = owner.col;
    if (!rows[rowIndex]) { setOperationError('The selected cell no longer exists. Please select a cell again.'); return; }
    const updatedRows = [...rows];
    const updatedCells = [...updatedRows[rowIndex].cells];
    const currentCell = updatedCells[columnIndex] ?? '';
    const cell = tableCellObject(currentCell);
    if (cell.formula || tableRowSettings[rowIndex]?.formula || tableColumnSettings[columnIndex]?.formula) {
      setOperationError('This cell is controlled by a formula. Edit the formula instead.');
      return;
    }
    if ((cell.label || tableRowSettings[rowIndex]?.label || tableColumnSettings[columnIndex]?.label) &&
      value !== '' && isNaN(Number(value))) {
      setOperationError('Cells with variable labels must contain a number.');
      return;
    }
    updatedCells[columnIndex] = typeof currentCell === 'string'
      ? value
      : { ...currentCell, value };
    updatedRows[rowIndex] = { ...updatedRows[rowIndex], cells: updatedCells };
    updateData({ rows: updatedRows });
    setOperationError(null);
  };

  // Pointer drags retain their initial callback; resolve IDs against the latest table.
  const reorderRef = useRef<(axis: LabelScope, ids: string[]) => void>(() => {});
  reorderRef.current = (axis, ids) => {
    const items = axis === 'row' ? reorderableRows : reorderableColumns;
    const order = ids.map(id => items.findIndex(item => item.id === id));
    if (order.length !== items.length || order.some(index => index < 0)) {
      setOperationError('The table changed while dragging. Please try again.');
      return;
    }
    applyAxisChange(axis, order);
  };

  const { setRowRef: setColumnRowRef, startDrag, handleReorderKey } = usePointerReorder({
    items: reorderableColumns,
    onReorder: (reorderedItems) => {
      reorderRef.current('column', reorderedItems.map(({ id }) => id));
    },
  });
  const { setRowRef: setTableRowRef, startDrag: startRowDrag, handleReorderKey: handleRowReorderKey } = usePointerReorder({
    items: reorderableRows,
    onReorder: (reorderedItems) => {
      reorderRef.current('row', reorderedItems.map(({ id }) => id));
    },
  });

  const addRow = () => {
    getRowId(rows.length);
    const newRow = { cells: columns.map(() => '') };
    updateData({ rows: [...rows, newRow], tableRowSettings: [...tableRowSettings, {}] });
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    applyAxisChange('row', rows.map((_, i) => i).filter(i => i !== index));
  };

  const confirmRemoval = () => {
    if (!pendingRemoval) return;
    const { axis, id, data } = pendingRemoval;
    const items = axis === 'row' ? reorderableRows : reorderableColumns;
    const index = items.findIndex(item => item.id === id);
    if (data !== widget.data || index < 0 || items.length <= 1) {
      setPendingRemoval(null);
      setOperationError('The table changed. Please select the row or column to remove again.');
      return;
    }
    applyAxisChange(axis, items.map((_, i) => i).filter(i => i !== index), true);
  };

  return (
    <div className="widget-editor widget-editor--table space-y-4">
      {(validation.error || operationError) && (
        <p role="alert" className="rounded-button border border-red-500 p-2 text-xs text-red-500">
          {validation.error || operationError}
        </p>
      )}

      <CollapsibleSection>
        <div className="widget-editor__section-heading">
          <h3 id={`display-title-${widget.id}`} className="widget-editor__section-title">Display</h3>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-theme-ink">
          <input
            type="checkbox"
            checked={!hideTableHeader}
            onChange={(event) => updateData({ hideTableHeader: !event.target.checked })}
            className="h-4 w-4 accent-theme-accent"
          />
          Show column headers
        </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-theme-ink">
            <input
              type="checkbox"
              checked={tableCornerRadius}
              onChange={(event) => updateData({ tableCornerRadius: event.target.checked })}
              className="h-4 w-4 accent-theme-accent"
            />
            Use the theme corner radius
          </label>
      </CollapsibleSection>

      <CollapsibleSection>
        <div className="widget-editor__section-heading">
          <h3 id={`columns-title-${widget.id}`} className="widget-editor__section-title">Columns</h3>
          <span className="widget-editor__section-count">{columns.length}</span>
        </div>
        <div className="space-y-2">
          {reorderableColumns.map(({ id, column, index }, idx) => {
            const columnLabel = tableColumnSettings[index]?.label;
            const isEditingColumnLabel = editingLabel?.scope === 'column' && editingLabel.index === index;

            return (
            <div
              key={id}
              ref={(element) => setColumnRowRef(id, element)}
              className="pointer-sort-row flex flex-wrap items-center gap-2 rounded-button border border-theme-border bg-theme-accent/5 p-1"
            >
              <Tooltip content="Drag to reorder">
                <button
                  type="button"
                  className="flex h-10 w-10 flex-shrink-0 cursor-grab items-center justify-center rounded-button px-1 text-theme-muted select-none touch-none hover:text-theme-ink active:cursor-grabbing disabled:cursor-default disabled:opacity-40"
                  onPointerDown={(event) => startDrag(id, event)}
                  onKeyDown={(event) => handleReorderKey(id, event)}
                  disabled={columns.length < 2}
                  aria-label={`Reorder ${column || `column ${idx + 1}`}`}
                  title="Drag to reorder. Arrow keys also work."
                >
                  <GripVerticalIcon className="h-4 w-4" />
                </button>
              </Tooltip>
              <input
                className="flex-1 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm"
                value={column}
                onChange={(e) => handleColumnChange(index, e.target.value)}
                placeholder="Column name"
              />
              <TableLabelButton
                scope="column"
                label={columnLabel}
                canAssign={canAssignColumnLabel(index)}
                isOpen={isEditingColumnLabel}
                onClick={() => openLabelEditor('column', index, columnLabel)}
              />
              {columns.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeColumn(index)}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-button border border-theme-border text-red-500 transition-colors hover:border-red-500 hover:text-red-700"
                  aria-label={`Delete ${column || `column ${idx + 1}`}`}
                  title="Delete column"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
              {isEditingColumnLabel && (
                <TableLabelEditor
                  scope="column"
                  draft={labelDraft}
                  hasLabel={!!columnLabel}
                  onDraftChange={setLabelDraft}
                  onSave={saveLabel}
                  onClear={() => updateLabel('column', index, undefined)}
                  onCancel={cancelLabelEdit}
                />
              )}
            </div>
            );
          })}
        </div>
        <div className="widget-editor__add-row">
          <button
            onClick={addColumn}
            className="rounded-button border border-theme-border px-3 py-1 text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper"
          >
            + Add Column
          </button>
        </div>
      </CollapsibleSection>

      <CollapsibleSection>
        <div className="widget-editor__section-heading">
          <h3 id={`rows-title-${widget.id}`} className="widget-editor__section-title">Rows</h3>
          <span className="widget-editor__section-count">{rows.length}</span>
        </div>
        {rows.length > 0 ? (
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {reorderableRows.map(({ id, row, index }, rowIdx) => {
              const rowLabel = tableRowSettings[index]?.label;
              const isEditingRowLabel = editingLabel?.scope === 'row' && editingLabel.index === index;
              const expandedColumn = visibleExpandedCell?.rowId === id
                ? reorderableColumns.find(({ id: columnId }) => columnId === visibleExpandedCell.columnId)
                : undefined;
              const expandedCellData = expandedColumn ? row.cells[expandedColumn.index] ?? '' : '';
              const expandedCellFormula = expandedColumn
                ? tableCellObject(expandedCellData).formula || tableRowSettings[index]?.formula || tableColumnSettings[expandedColumn.index]?.formula
                : undefined;
              const expandedMerge = expandedColumn
                ? merges.find(merge => merge.row === index && merge.col === expandedColumn.index)
                : undefined;

              return (
                <div
                  key={id}
                  ref={(element) => setTableRowRef(id, element)}
                  className="pointer-sort-row rounded-button border border-theme-border bg-theme-accent/5 p-1"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Tooltip content="Drag to reorder">
                      <button
                        type="button"
                        className="flex h-10 w-10 flex-shrink-0 cursor-grab items-center justify-center rounded-button px-1 text-theme-muted select-none touch-none hover:text-theme-ink active:cursor-grabbing disabled:cursor-default disabled:opacity-40"
                        onPointerDown={(event) => startRowDrag(id, event)}
                        onKeyDown={(event) => handleRowReorderKey(id, event)}
                        disabled={reorderableRows.length < 2}
                        aria-label={`Reorder row ${rowIdx + 1}`}
                        title="Drag to reorder. Arrow keys also work."
                      >
                        <GripVerticalIcon className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <span className="flex-shrink-0 text-xs font-semibold text-theme-ink">Row {rowIdx + 1}</span>
                    <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                      {reorderableColumns.map(({ id: columnId, column }, colIdx) => {
                        const columnName = column || `Column ${colIdx + 1}`;
                        const owner = getTableCellOwner(merges, index, colIdx);
                        const ownerCell = { rowId: reorderableRows[owner.row].id, columnId: reorderableColumns[owner.col].id };
                        const merge = merges.find(merge => merge.row === owner.row && merge.col === owner.col);
                        const rangeDescription = merge ? ` (merged ${mergedRange(merge)})` : '';
                        const isExpanded = visibleExpandedCell?.rowId === ownerCell.rowId && visibleExpandedCell.columnId === ownerCell.columnId;

                        return (
                          <button
                            key={columnId}
                            type="button"
                            onClick={() => setExpandedCell(isExpanded ? null : ownerCell)}
                            aria-expanded={isExpanded}
                            aria-label={`${isExpanded ? 'Hide' : 'Show'} ${columnName} for row ${rowIdx + 1}${rangeDescription}`}
                            title={`${isExpanded ? 'Hide' : 'Edit'} ${columnName}${rangeDescription}`}
                            className={`h-10 min-w-0 flex-1 truncate rounded border px-2 py-1 text-left text-[10px] font-medium transition-colors ${
                              isExpanded
                                ? 'border-theme-accent-soft bg-theme-accent/20 text-theme-accent'
                                : 'border-theme-border-soft text-theme-muted hover:text-theme-ink'
                            }`}
                          >
                            {columnName}{merge ? ' (merged)' : ''}
                          </button>
                        );
                      })}
                    </div>
                    <TableLabelButton
                      scope="row"
                      label={rowLabel}
                      canAssign={canAssignRowLabel(index)}
                      isOpen={isEditingRowLabel}
                      onClick={() => openLabelEditor('row', index, rowLabel)}
                    />
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-button border border-theme-border text-red-500 transition-colors hover:border-red-500 hover:text-red-700"
                        aria-label={`Delete row ${rowIdx + 1}`}
                        title="Delete row"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {expandedColumn && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 pt-2">
                      {expandedMerge && (
                        <p className="w-full text-[10px] text-theme-muted">
                          Merged cell: {mergedRange(expandedMerge)}. Editing the top-left cell.
                        </p>
                      )}
                      <span className="min-w-0 max-w-[35%] truncate text-[10px] font-medium text-theme-muted">
                        {expandedColumn.column || `Column ${expandedColumn.index + 1}`}
                      </span>
                      {expandedMerge ? (
                        <textarea
                          value={tableCellValue(expandedCellData)}
                          onChange={(event) => handleRowCellChange(index, expandedColumn.index, event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') setExpandedCell(null);
                          }}
                          readOnly={!!expandedCellFormula}
                          aria-label={`Merged cell, ${mergedRange(expandedMerge)}`}
                          rows={3}
                          className="min-w-0 flex-1 rounded-button border border-theme-border bg-theme-paper px-2 py-1 text-sm text-theme-ink focus:border-theme-accent focus:outline-none read-only:cursor-default read-only:bg-theme-accent/10"
                          placeholder="-"
                          autoFocus
                        />
                      ) : (
                      <input
                        type="text"
                        value={tableCellValue(expandedCellData)}
                        onChange={(event) => handleRowCellChange(index, expandedColumn.index, event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') setExpandedCell(null);
                        }}
                        readOnly={!!expandedCellFormula}
                        aria-label={`Row ${rowIdx + 1}, ${expandedColumn.column || `column ${expandedColumn.index + 1}`}`}
                        className="h-8 min-w-0 flex-1 rounded-button border border-theme-border bg-theme-paper px-2 py-1 text-sm text-theme-ink focus:border-theme-accent focus:outline-none read-only:cursor-default read-only:bg-theme-accent/10"
                        placeholder="-"
                        autoFocus
                      />
                      )}
                    </div>
                  )}
                  {isEditingRowLabel && (
                    <TableLabelEditor
                      scope="row"
                      draft={labelDraft}
                      hasLabel={!!rowLabel}
                      onDraftChange={setLabelDraft}
                      onSave={saveLabel}
                      onClear={() => updateLabel('row', index, undefined)}
                      onCancel={cancelLabelEdit}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-theme-muted">No rows yet.</p>
        )}
        <div className="widget-editor__add-row flex gap-2">
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
      </CollapsibleSection>
      {pendingRemoval && createPortal(
        <div
          data-touch-camera-ignore="true"
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4"
          onClick={() => setPendingRemoval(null)}
          onMouseDown={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              setPendingRemoval(null);
            }
            if (event.key === 'Tab') {
              event.preventDefault();
              const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button');
              const next = document.activeElement === buttons[0] ? buttons[1] : buttons[0];
              next?.focus();
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`table-editor-remove-title-${widget.id}`}
            aria-describedby={`table-editor-remove-description-${widget.id}`}
            className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id={`table-editor-remove-title-${widget.id}`} className="font-heading text-base font-bold">
              Remove {pendingRemoval.axis} and merged cells?
            </h3>
            <p id={`table-editor-remove-description-${widget.id}`} className="mt-2 text-sm text-theme-muted">
              This {pendingRemoval.axis} and all of its values, labels, formulas, formatting, and merged cells will be removed.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setPendingRemoval(null)}
                className="widget-control px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemoval}
                className="min-h-8 rounded-button border border-red-700 bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                Remove {pendingRemoval.axis}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
