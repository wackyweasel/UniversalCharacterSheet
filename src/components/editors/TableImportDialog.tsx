import { KeyboardEvent, PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  columnSpecsFromFirstLine,
  isNoopTableWordMove,
  moveTableWords,
  parseTableTextByColumns,
  parseTableTextRows,
  reshapeTableRows,
  resizeColumnSpecs,
  TABLE_COLUMN_TYPES,
  TABLE_TEXT_DELIMITERS,
  TableColumnSpec,
  TableColumnType,
  tableCellWords,
  tableTextLines,
  TableTextDelimiter,
  TableWordRange,
  TableWordSlot,
} from '../../utils/tableText';

export type TableImportMode = 'replace' | 'append';

interface TableImportDialogProps {
  widgetId: string;
  columnCount: number;
  onImport: (grid: string[][], mode: TableImportMode, firstRowIsHeader: boolean) => void;
  onClose: () => void;
}

// `origins` maps each current row to its row in the parsed grid (null for added rows); `edited` lists parsed rows already fixed by hand.
interface ManualEdit { source: string[][]; grid: string[][]; origins: (number | null)[]; edited: number[] }

// A pointer press starts as 'pending' and becomes a click, a word-range selection or a move.
interface Gesture {
  pointerId: number;
  x: number;
  y: number;
  row: number;
  col: number;
  word: number | null;
  anchor: number;
  mode: 'pending' | 'select' | 'move';
  source: TableWordRange | null;
}

const DRAG_THRESHOLD = 4;

const sameSlot = (a: TableWordSlot | null, b: TableWordSlot | null) =>
  a === b || (!!a && !!b && a.row === b.row && a.col === b.col && a.index === b.index);

const inRange = (range: TableWordRange | null, row: number, col: number, word: number) =>
  !!range && range.row === row && range.col === col && word >= range.start && word <= range.end;

const cellAt = (x: number, y: number) =>
  document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-import-cell]') ?? null;

// Finds the word position under the pointer, following the cell's wrapped lines.
function slotAt(x: number, y: number): TableWordSlot | null {
  const cell = cellAt(x, y);
  if (!cell) return null;
  const words = [...cell.querySelectorAll<HTMLElement>('[data-import-word]')];
  let index = words.length;
  for (let i = 0; i < words.length; i++) {
    const rect = words[i].getBoundingClientRect();
    if (y < rect.top || (y <= rect.bottom && x < rect.left + rect.width / 2)) {
      index = i;
      break;
    }
  }
  return { row: Number(cell.dataset.row), col: Number(cell.dataset.col), index };
}

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
  const [selection, setSelection] = useState<TableWordRange | null>(null);
  const [moving, setMoving] = useState(false);
  const [dropTarget, setDropTarget] = useState<TableWordSlot | null>(null);
  const gesture = useRef<Gesture | null>(null);
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
  useEffect(() => { setSelection(null); }, [grid]);

  const width = grid[0]?.length ?? 0;
  const bodyRows = grid.length - (useHeader ? 1 : 0);
  const canImport = width > 0 && bodyRows > 0;
  const origins = activeManual?.origins ?? grid.map((_, index) => index);
  const isFlagged = (row: number) => {
    const origin = origins[row];
    return origin != null && parsed.unmatched.has(origin) && !activeManual?.edited.includes(origin);
  };
  const unmatchedCount = grid.reduce((count, _, row) => count + (isFlagged(row) ? 1 : 0), 0);
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

  const wordsOf = (row: number, col: number) => tableCellWords(grid[row]?.[col] ?? '');
  const wholeCell = (row: number, col: number): TableWordRange | null => {
    const count = wordsOf(row, col).length;
    return count > 0 ? { row, col, start: 0, end: count - 1 } : null;
  };
  const validSlot = (range: TableWordRange | null, slot: TableWordSlot | null) =>
    range && slot && !isNoopTableWordMove(range, slot) ? slot : null;

  const moveWords = (range: TableWordRange, slot: TableWordSlot) => {
    const touched = [origins[range.row], origins[slot.row]].filter((origin): origin is number => origin != null);
    setManual({
      source: parsed.grid,
      grid: moveTableWords(grid, range, slot),
      origins,
      edited: [...(activeManual?.edited ?? []), ...touched],
    });
    setSelection(null);
    setDropTarget(null);
  };

  const insertRow = (after: number) => {
    const blank = Array<string>(width).fill('');
    setManual({
      source: parsed.grid,
      grid: [...grid.slice(0, after + 1), blank, ...grid.slice(after + 1)],
      origins: [...origins.slice(0, after + 1), null, ...origins.slice(after + 1)],
      edited: activeManual?.edited ?? [],
    });
    setSelection(null);
  };

  const deleteRow = (row: number) => {
    if (grid.length <= 1) return;
    setManual({
      source: parsed.grid,
      grid: grid.filter((_, index) => index !== row),
      origins: origins.filter((_, index) => index !== row),
      edited: activeManual?.edited ?? [],
    });
    setSelection(null);
  };

  // Click: with words selected, place them at the clicked position; otherwise select the word or whole cell.
  const handleClick = (row: number, col: number, word: number | null, slot: TableWordSlot | null, extend: boolean) => {
    if (selection && extend && word !== null && selection.row === row && selection.col === col) {
      setSelection({ row, col, start: Math.min(selection.start, word), end: Math.max(selection.end, word) });
      return;
    }
    if (selection) {
      const target = validSlot(selection, slot);
      if (target && !(word !== null && inRange(selection, row, col, word))) moveWords(selection, target);
      else setSelection(null);
      return;
    }
    setSelection(word !== null ? { row, col, start: word, end: word } : wholeCell(row, col));
  };

  const handlePointerDown = (event: PointerEvent<HTMLTableElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    const cell = target.closest<HTMLElement>('[data-import-cell]');
    if (!cell) return;
    const wordElement = target.closest<HTMLElement>('[data-import-word]');
    const word = wordElement ? Number(wordElement.dataset.word) : null;
    gesture.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      row: Number(cell.dataset.row),
      col: Number(cell.dataset.col),
      word,
      anchor: word ?? 0,
      mode: 'pending',
      source: null,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const startMove = (current: Gesture, source: TableWordRange | null) => {
    if (!source) {
      gesture.current = null;
      return;
    }
    current.mode = 'move';
    current.source = source;
    setSelection(source);
    setMoving(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLTableElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) {
      // Hovering with a selection previews where a click would place it.
      if (!current && selection && event.pointerType === 'mouse') {
        const next = validSlot(selection, slotAt(event.clientX, event.clientY));
        if (!sameSlot(next, dropTarget)) setDropTarget(next);
      }
      return;
    }
    if (current.mode === 'pending') {
      if (Math.hypot(event.clientX - current.x, event.clientY - current.y) < DRAG_THRESHOLD) return;
      if (current.word !== null && inRange(selection, current.row, current.col, current.word)) startMove(current, selection);
      else if (current.word !== null) {
        current.mode = 'select';
        current.source = { row: current.row, col: current.col, start: current.word, end: current.word };
        setSelection(current.source);
      } else startMove(current, wholeCell(current.row, current.col));
      if (!gesture.current) return;
    }
    if (current.mode === 'select') {
      const cell = cellAt(event.clientX, event.clientY);
      const sameCell = cell && Number(cell.dataset.row) === current.row && Number(cell.dataset.col) === current.col;
      if (sameCell) {
        const wordElement = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-import-word]');
        if (wordElement) {
          const word = Number(wordElement.dataset.word);
          const next = { row: current.row, col: current.col, start: Math.min(current.anchor, word), end: Math.max(current.anchor, word) };
          if (current.source?.start !== next.start || current.source.end !== next.end) {
            current.source = next;
            setSelection(next);
          }
        }
        return;
      }
      // Leaving the cell carries the selected words along.
      startMove(current, current.source);
    }
    if (current.mode === 'move') {
      const next = validSlot(current.source, slotAt(event.clientX, event.clientY));
      if (!sameSlot(next, dropTarget)) setDropTarget(next);
    }
  };

  const endGesture = () => {
    gesture.current = null;
    setMoving(false);
    setDropTarget(null);
  };

  const handlePointerUp = (event: PointerEvent<HTMLTableElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const slot = slotAt(event.clientX, event.clientY);
    endGesture();
    if (current.mode === 'pending') handleClick(current.row, current.col, current.word, slot, event.shiftKey);
    else if (current.mode === 'move' && current.source) {
      const target = validSlot(current.source, slot);
      if (target) moveWords(current.source, target);
    }
  };

  // Keyboard: Enter/Space selects a word (Shift extends), or places the selection before the focused word / at the end of the focused cell.
  const handleKeyDown = (event: KeyboardEvent, row: number, col: number, word: number | null) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    const slot = { row, col, index: word ?? wordsOf(row, col).length };
    handleClick(row, col, word, slot, event.shiftKey);
  };

  const wordClass = (row: number, col: number, word: number) => {
    const selected = inRange(selection, row, col, word);
    return `mb-0.5 mr-1 inline-block rounded px-1 py-0.5 touch-none ${
      selected ? 'cursor-grab bg-theme-accent text-theme-paper' : 'cursor-pointer bg-theme-accent/15 hover:bg-theme-accent/30'
    } ${selected && moving ? 'opacity-40' : ''}`;
  };

  const insertMarker = (
    <span aria-hidden="true" className="pointer-events-none relative inline-block h-5 w-0 align-top">
      <span className="absolute -left-[3px] top-0 bottom-0 w-0.5 rounded bg-theme-accent" />
    </span>
  );

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
          if (selection) setSelection(null);
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
              Wrong cell? Drag across words to select them (or click a word, Shift+click to extend, or click a cell's
              empty space for the whole cell). Then drag the selection, or click, to place it at any word position in
              any cell.
            </p>
            <div className="max-h-64 overflow-auto rounded-button border border-theme-border">
              <table
                className={`w-full select-none border-collapse text-xs ${moving ? 'cursor-grabbing' : ''}`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={endGesture}
                onPointerLeave={() => { if (!gesture.current) setDropTarget(null); }}
              >
                <tbody>
                  {grid.slice(0, MAX_PREVIEW_ROWS).map((row, rowIndex) => {
                    const isHeader = useHeader && rowIndex === 0;
                    const flagged = isFlagged(rowIndex);
                    return (
                      <tr key={rowIndex} className={isHeader ? 'bg-theme-accent/20 font-semibold' : flagged ? 'bg-red-500/10' : undefined}>
                        <td className="w-px whitespace-nowrap border border-theme-border-soft px-1 py-0.5 align-middle">
                          <div className="flex gap-0.5">
                            <button
                              type="button"
                              onClick={() => insertRow(rowIndex)}
                              aria-label={`Add a row below row ${rowIndex + 1}`}
                              title="Add a row below"
                              className="flex h-5 w-5 items-center justify-center rounded text-sm leading-none text-theme-accent hover:bg-theme-accent hover:text-theme-paper"
                            >
                              +
                            </button>
                            {!isHeader && (
                              <button
                                type="button"
                                disabled={grid.length <= 1}
                                onClick={() => deleteRow(rowIndex)}
                                aria-label={`Delete row ${rowIndex + 1}`}
                                title="Delete row"
                                className="flex h-5 w-5 items-center justify-center rounded text-sm leading-none text-red-500 hover:bg-red-500 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-red-500"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </td>
                        {row.map((cell, colIndex) => {
                          const words = tableCellWords(cell);
                          const isTarget = !!selection && dropTarget?.row === rowIndex && dropTarget.col === colIndex;
                          return (
                            <td
                              key={colIndex}
                              tabIndex={0}
                              data-import-cell=""
                              data-row={rowIndex}
                              data-col={colIndex}
                              aria-label={`Row ${rowIndex + 1}, column ${colIndex + 1}: ${cell || 'empty'}`}
                              onKeyDown={(event) => { if (event.target === event.currentTarget) handleKeyDown(event, rowIndex, colIndex, null); }}
                              className={`min-w-[4rem] cursor-pointer border border-theme-border-soft p-1 align-top ${
                                isTarget ? 'bg-theme-accent/30 outline outline-2 -outline-offset-2 outline-theme-accent' : ''
                              }`}
                            >
                              {words.map((word, wordIndex) => (
                                <span key={wordIndex}>
                                  {isTarget && dropTarget?.index === wordIndex && insertMarker}
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    data-import-word=""
                                    data-word={wordIndex}
                                    aria-pressed={inRange(selection, rowIndex, colIndex, wordIndex)}
                                    onKeyDown={(event) => handleKeyDown(event, rowIndex, colIndex, wordIndex)}
                                    className={wordClass(rowIndex, colIndex, wordIndex)}
                                  >
                                    {word}
                                  </span>
                                </span>
                              ))}
                              {isTarget && dropTarget?.index === words.length && insertMarker}
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
                Undo manual changes
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
