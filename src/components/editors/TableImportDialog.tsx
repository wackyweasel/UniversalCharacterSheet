import { DragEvent, KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  columnSpecsFromFirstLine,
  moveTableCellWords,
  parseTableTextByColumns,
  parseTableTextRows,
  reshapeTableRows,
  resizeColumnSpecs,
  TABLE_COLUMN_TYPES,
  TABLE_TEXT_DELIMITERS,
  TableColumnSpec,
  TableColumnType,
  tableTextLines,
  TableTextDelimiter,
} from '../../utils/tableText';

export type TableImportMode = 'replace' | 'append';

interface TableImportDialogProps {
  widgetId: string;
  columnCount: number;
  onImport: (grid: string[][], mode: TableImportMode, firstRowIsHeader: boolean) => void;
  onClose: () => void;
}

interface CellRef { row: number; col: number; word: number | null }
interface ManualEdit { source: string[][]; grid: string[][]; rows: number[] }

const MAX_PREVIEW_ROWS = 200;
const MAX_COLUMNS = 50;
const MAX_ROWS = 1000;

interface CountInputProps {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}

// Keeps a text draft so the field can be cleared while typing; only whole numbers in range are applied.
function CountInput({ label, value, max, onChange }: CountInputProps) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  return (
    <input
      type="number"
      min={1}
      max={max}
      value={draft}
      aria-label={label}
      onChange={(event) => {
        setDraft(event.target.value);
        const next = Number(event.target.value);
        if (event.target.value !== '' && Number.isInteger(next) && next >= 1 && next <= max) onChange(next);
      }}
      onBlur={() => setDraft(String(value))}
      className="h-7 w-16 rounded border border-theme-border bg-theme-paper px-1.5 text-xs text-theme-ink focus:border-theme-accent focus:outline-none"
    />
  );
}

export function TableImportDialog({ widgetId, columnCount, onImport, onClose }: TableImportDialogProps) {
  const [text, setText] = useState('');
  const [delimiter, setDelimiter] = useState<TableTextDelimiter>('auto');
  const [mode, setMode] = useState<TableImportMode>('replace');
  const [firstRowIsHeader, setFirstRowIsHeader] = useState(true);
  const [byType, setByType] = useState(false);
  const [specs, setSpecs] = useState<TableColumnSpec[]>([]);
  const [columnOverride, setColumnOverride] = useState<number | null>(null);
  const [rowOverride, setRowOverride] = useState<number | null>(null);
  const [picked, setPicked] = useState<CellRef | null>(null);
  const [dragging, setDragging] = useState<CellRef | null>(null);
  const [dropTarget, setDropTarget] = useState<{ row: number; col: number } | null>(null);
  const [manual, setManual] = useState<ManualEdit | null>(null);
  const useHeader = mode === 'replace' && firstRowIsHeader;

  const parsed = useMemo(() => {
    const bodyRows = rowOverride ?? undefined;
    if (byType) {
      const { rows, unmatched } = parseTableTextByColumns(text, specs, useHeader, bodyRows);
      const grid = specs.length === 0 ? [] : useHeader ? [specs.map(spec => spec.name), ...rows] : rows;
      return {
        grid,
        unmatched: new Set(unmatched.map(index => index + (useHeader ? 1 : 0))),
        detectedRows: Math.max(0, tableTextLines(text).length - (useHeader ? 1 : 0)),
        detectedColumns: columnSpecsFromFirstLine(text, useHeader).length,
      };
    }
    const { rows, delimiter: resolved } = parseTableTextRows(text, delimiter);
    const current = columnOverride && resolved === 'capitals' ? parseTableTextRows(text, resolved, columnOverride).rows : rows;
    return {
      grid: reshapeTableRows(current, resolved, useHeader, { columns: columnOverride ?? undefined, bodyRows }),
      unmatched: new Set<number>(),
      detectedRows: Math.max(0, rows.length - (useHeader ? 1 : 0)),
      detectedColumns: Math.max(0, ...rows.map(row => row.length)),
    };
  }, [text, delimiter, byType, specs, useHeader, columnOverride, rowOverride]);

  // Manual moves apply to one parse result; any change to the text or settings discards them.
  const activeManual = manual && manual.source === parsed.grid ? manual : null;
  const grid = activeManual?.grid ?? parsed.grid;
  useEffect(() => { setPicked(null); }, [parsed.grid]);

  const width = grid[0]?.length ?? 0;
  const bodyRows = grid.length - (useHeader ? 1 : 0);
  const canImport = width > 0 && bodyRows > 0;
  const unmatchedCount = [...parsed.unmatched].filter(row => !activeManual?.rows.includes(row)).length;
  const titleId = `table-import-title-${widgetId}`;
  const selectClass = 'h-8 rounded-button border border-theme-border bg-theme-paper px-2 text-sm text-theme-ink focus:border-theme-accent focus:outline-none';
  const inputClass = 'h-7 w-full rounded border border-theme-border bg-theme-paper px-1.5 text-xs text-theme-ink focus:border-theme-accent focus:outline-none';

  const initialSpecs = (source: string) => columnOverride
    ? resizeColumnSpecs([], columnOverride, source, useHeader)
    : columnSpecsFromFirstLine(source, useHeader);

  const handleTextChange = (value: string) => {
    setText(value);
    if (!value.trim()) {
      setColumnOverride(null);
      setRowOverride(null);
    }
    if (byType && specs.length === 0) setSpecs(initialSpecs(value));
  };

  const handleByTypeChange = (enabled: boolean) => {
    setByType(enabled);
    if (enabled && specs.length === 0) setSpecs(initialSpecs(text));
  };

  const columnTotal = byType ? specs.length : width;
  const setColumnTotal = (count: number) => {
    if (byType) setSpecs(resizeColumnSpecs(specs, count, text, useHeader));
    else setColumnOverride(count);
  };
  const sizeChanged = bodyRows !== parsed.detectedRows || columnTotal !== parsed.detectedColumns;
  const resetSize = () => {
    setRowOverride(null);
    setColumnOverride(null);
    if (byType) setSpecs(resizeColumnSpecs(specs, parsed.detectedColumns, text, useHeader));
  };

  const updateSpec = (index: number, patch: Partial<TableColumnSpec>) =>
    setSpecs(current => current.map((spec, specIndex) => specIndex === index ? { ...spec, ...patch } : spec));

  const addSpec = () =>
    setSpecs(current => [...current, { name: `Column ${current.length + 1}`, type: 'text', keywords: '' }]);

  const moveCell = (row: number, from: number, word: number | null, to: number) => {
    setManual({ source: parsed.grid, grid: moveTableCellWords(grid, row, from, to, word), rows: [...(activeManual?.rows ?? []), row] });
    setPicked(null);
    setDragging(null);
    setDropTarget(null);
  };

  const activate = (row: number, col: number, word: number | null) => {
    if (picked && picked.row === row && picked.col !== col) {
      moveCell(row, picked.col, picked.word, col);
      return;
    }
    if (!grid[row][col]) {
      setPicked(null);
      return;
    }
    const alreadyPicked = picked?.row === row && picked.col === col && picked.word === word;
    setPicked(alreadyPicked ? null : { row, col, word });
  };

  const activateOnKey = (event: KeyboardEvent, row: number, col: number, word: number | null) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    activate(row, col, word);
  };

  const startDrag = (event: DragEvent, ref: CellRef, label: string) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', label);
    setDragging(ref);
    setPicked(null);
  };

  const wordClass = (row: number, col: number, word: number) => {
    const isPicked = picked?.row === row && picked.col === col && (picked.word === null || picked.word === word);
    const isDragged = dragging?.row === row && dragging.col === col && (dragging.word === null || dragging.word === word);
    return `mb-0.5 mr-1 inline-block cursor-grab select-none rounded px-1 py-0.5 ${
      isPicked ? 'bg-theme-accent text-theme-paper' : 'bg-theme-accent/15 hover:bg-theme-accent/30'
    } ${isDragged ? 'opacity-40' : ''}`;
  };

  return createPortal(
    <div
      data-touch-camera-ignore="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4"
      onClick={onClose}
      onMouseDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          if (picked) setPicked(null);
          else onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-full w-full max-w-4xl flex-col gap-3 overflow-y-auto rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id={titleId} className="font-heading text-base font-bold">Import table from text</h3>
        <p className="text-xs text-theme-muted">
          Paste a table copied from a PDF, spreadsheet, web page or CSV file. Each line becomes a row.
        </p>
        <textarea
          value={text}
          onChange={(event) => handleTextChange(event.target.value)}
          aria-label="Table text"
          rows={8}
          autoFocus
          spellCheck={false}
          className="w-full resize-y rounded-button border border-theme-border bg-theme-paper px-2 py-1 font-mono text-xs text-theme-ink focus:border-theme-accent focus:outline-none"
          placeholder={'Item\tQty\tWeight\nRope\t1\t5 lb'}
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <label className={`flex items-center gap-2 ${byType ? 'opacity-50' : ''}`}>
            Separator
            <select
              value={delimiter}
              disabled={byType}
              onChange={(event) => setDelimiter(event.target.value as TableTextDelimiter)}
              className={selectClass}
            >
              {TABLE_TEXT_DELIMITERS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2">
            Import as
            <select value={mode} onChange={(event) => setMode(event.target.value as TableImportMode)} className={selectClass}>
              <option value="replace">Replace table</option>
              <option value="append">Add rows</option>
            </select>
          </label>
          <label className={`flex items-center gap-2 ${mode === 'append' ? 'opacity-50' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={useHeader}
              disabled={mode === 'append'}
              onChange={(event) => setFirstRowIsHeader(event.target.checked)}
              className="h-4 w-4 accent-theme-accent"
            />
            First row is the header
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={byType}
              onChange={(event) => handleByTypeChange(event.target.checked)}
              className="h-4 w-4 accent-theme-accent"
            />
            Try to assign columns by type
          </label>
        </div>
        <p className="text-xs text-theme-muted">
          {mode === 'replace'
            ? 'Replaces all rows and columns, including labels, formulas, formatting and merged cells.'
            : `Adds rows to the end and keeps the existing ${columnCount} column${columnCount === 1 ? '' : 's'}.`}
        </p>

        {byType && (
          <div className="rounded-button border border-theme-border p-2">
            <p className="mb-2 text-xs text-theme-muted">
              Pick a type for each column. Numbers anchor the cells, and text columns take the words in between, so
              multi-word cells stay together and empty cells are kept. For text in adjacent columns, use Keywords to list
              the values that belong to that column.
            </p>
            <div className="flex flex-wrap items-start gap-2">
              {specs.map((spec, index) => (
                <div key={index} className="flex w-40 flex-col gap-1 rounded border border-theme-border-soft bg-theme-accent/5 p-1.5">
                  {useHeader && (
                    <input
                      value={spec.name}
                      onChange={(event) => updateSpec(index, { name: event.target.value })}
                      aria-label={`Column ${index + 1} name`}
                      className={`${inputClass} font-semibold`}
                    />
                  )}
                  <select
                    value={spec.type}
                    onChange={(event) => updateSpec(index, { type: event.target.value as TableColumnType })}
                    aria-label={`Column ${index + 1} type`}
                    className={`${selectClass} h-7 w-full text-xs`}
                  >
                    {TABLE_COLUMN_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  {spec.type === 'keywords' && (
                    <input
                      value={spec.keywords}
                      onChange={(event) => updateSpec(index, { keywords: event.target.value })}
                      aria-label={`Column ${index + 1} keywords`}
                      placeholder="Stackable, Clunky"
                      className={inputClass}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setSpecs(current => current.filter((_, specIndex) => specIndex !== index))}
                    className="self-end text-[10px] text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={addSpec} className="widget-control px-2 py-1 text-xs">+ Column</button>
              <button
                type="button"
                onClick={() => setSpecs(columnSpecsFromFirstLine(text, useHeader))}
                className="widget-control px-2 py-1 text-xs"
              >
                Read columns from first line
              </button>
            </div>
          </div>
        )}

        {grid.length > 0 && (
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="font-medium">Preview:</span>
              <label className="flex items-center gap-1.5">
                Rows
                <CountInput label="Rows" value={Math.max(1, bodyRows)} max={MAX_ROWS} onChange={setRowOverride} />
              </label>
              <label className="flex items-center gap-1.5">
                Columns
                <CountInput label="Columns" value={Math.max(1, columnTotal)} max={MAX_COLUMNS} onChange={setColumnTotal} />
              </label>
              {sizeChanged && (
                <span className="text-theme-muted">
                  Detected {parsed.detectedRows} × {parsed.detectedColumns}.{' '}
                  <button type="button" onClick={resetSize} className="text-theme-accent hover:underline">Reset</button>
                </span>
              )}
            </div>
            <p className="mb-1 text-xs text-theme-muted">
              Wrong size? Lower the rows to join lines that wrapped, and change the columns to split or join cells.
            </p>
            {mode === 'append' && width !== columnCount && (
              <p role="status" className="mb-1 text-xs text-theme-accent">
                {width > columnCount
                  ? `${width - columnCount} extra column${width - columnCount === 1 ? '' : 's'} will be ignored.`
                  : `${columnCount - width} missing column${columnCount - width === 1 ? '' : 's'} will be left blank.`}
              </p>
            )}
            {unmatchedCount > 0 && (
              <p role="status" className="mb-1 text-xs text-red-500">
                {unmatchedCount} line{unmatchedCount === 1 ? '' : 's'} did not fit the column types and {unmatchedCount === 1 ? 'was' : 'were'} put
                in the first cell (highlighted). Adjust the types or move the words below.
              </p>
            )}
            <p className="mb-1 text-xs text-theme-muted">
              Wrong cell? Drag a word, or a whole cell, onto another cell in the same row. You can also click it, then
              click where it belongs.
            </p>
            <div className="max-h-64 overflow-auto rounded-button border border-theme-border">
              <table className="w-full border-collapse text-xs">
                <tbody>
                  {grid.slice(0, MAX_PREVIEW_ROWS).map((row, rowIndex) => {
                    const isHeader = useHeader && rowIndex === 0;
                    const flagged = parsed.unmatched.has(rowIndex) && !activeManual?.rows.includes(rowIndex);
                    return (
                      <tr key={rowIndex} className={isHeader ? 'bg-theme-accent/20 font-semibold' : flagged ? 'bg-red-500/10' : undefined}>
                        {row.map((cell, colIndex) => {
                          if (isHeader) {
                            return <td key={colIndex} className="max-w-[12rem] truncate border border-theme-border-soft px-1.5 py-1">{cell}</td>;
                          }
                          const words = cell.split(' ').filter(Boolean);
                          const isTarget = dropTarget?.row === rowIndex && dropTarget.col === colIndex;
                          const canDrop = dragging?.row === rowIndex && dragging.col !== colIndex;
                          return (
                            <td
                              key={colIndex}
                              tabIndex={0}
                              draggable={words.length > 0}
                              aria-label={`Row ${rowIndex + 1}, column ${colIndex + 1}: ${cell || 'empty'}`}
                              onClick={() => activate(rowIndex, colIndex, null)}
                              onKeyDown={(event) => { if (event.target === event.currentTarget) activateOnKey(event, rowIndex, colIndex, null); }}
                              onDragStart={(event) => startDrag(event, { row: rowIndex, col: colIndex, word: null }, cell)}
                              onDragEnd={() => { setDragging(null); setDropTarget(null); }}
                              onDragOver={(event) => {
                                if (!canDrop) return;
                                event.preventDefault();
                                if (!isTarget) setDropTarget({ row: rowIndex, col: colIndex });
                              }}
                              onDragLeave={() => { if (isTarget) setDropTarget(null); }}
                              onDrop={(event) => {
                                event.preventDefault();
                                if (dragging && canDrop) moveCell(rowIndex, dragging.col, dragging.word, colIndex);
                              }}
                              className={`min-w-[4rem] cursor-pointer border border-theme-border-soft p-1 align-top ${
                                isTarget ? 'bg-theme-accent/30 outline outline-2 -outline-offset-2 outline-theme-accent' : ''
                              } ${picked && picked.row === rowIndex && picked.col !== colIndex ? 'hover:bg-theme-accent/20' : ''}`}
                            >
                              {words.map((word, wordIndex) => (
                                <span
                                  key={wordIndex}
                                  role="button"
                                  tabIndex={0}
                                  draggable
                                  onClick={(event) => { event.stopPropagation(); activate(rowIndex, colIndex, wordIndex); }}
                                  onKeyDown={(event) => activateOnKey(event, rowIndex, colIndex, wordIndex)}
                                  onDragStart={(event) => startDrag(event, { row: rowIndex, col: colIndex, word: wordIndex }, word)}
                                  className={wordClass(rowIndex, colIndex, wordIndex)}
                                >
                                  {word}
                                </span>
                              ))}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {grid.length > MAX_PREVIEW_ROWS && (
              <p className="mt-1 text-[10px] text-theme-muted">Showing the first {MAX_PREVIEW_ROWS} of {grid.length} lines.</p>
            )}
            {activeManual && (
              <button type="button" onClick={() => setManual(null)} className="mt-1 text-xs text-theme-accent hover:underline">
                Undo manual moves
              </button>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="widget-control px-3 py-1.5 text-sm">Cancel</button>
          <button
            type="button"
            disabled={!canImport}
            onClick={() => onImport(grid, mode, useHeader)}
            className="min-h-8 rounded-button bg-theme-accent px-3 py-1.5 text-sm font-semibold text-theme-paper transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Import
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
