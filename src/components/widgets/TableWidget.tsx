import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Widget, TableRow, TableCell, CellFormat, TableColumnSettings, TableRowSettings } from '../../types';
import { useStore } from '../../store/useStore';
import { collectLabels, isFormulaBroken } from '../../utils/formulaEngine';
import { Tooltip } from '../Tooltip';
import { InlineDiceText } from '../InlineDiceText';
import { FormulaEditorDialog } from '../FormulaEditorDialog';
import { CheckIcon, GripVerticalIcon, PencilIcon, PlusIcon, ResetIcon, TrashIcon } from '../icons';
import { useTouchCameraPinchCancellation } from '../../hooks/useTouchCamera';
import { commonTableFormat, formatTableCells, getTableCellOwner, isCoveredTableCell, logicalTableCells,
  mergeTableCells, mixedTableFormatFields, selectedTableRectangle, tableCellKey, tableMergeBlockedReason, tableRangeSelection,
  transformTableAxis, unmergeTableCells, validateTableMerges, type TableCoordinate } from '../../utils/tableCells';
import { placeTableToolbar } from '../../utils/tableToolbar';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
  sheetScale?: number;
}

interface RectBounds {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

interface ToolbarPosition {
  x: number;
  y: number;
  avoidRect?: RectBounds;
  avoidRects?: RectBounds[];
}

// Helper to normalize cell data (supports both legacy string and new TableCell format)
function getCellValue(cell: string | TableCell): string {
  return typeof cell === 'string' ? cell : cell?.value ?? '';
}

function getCellFormat(cell: string | TableCell): CellFormat {
  return typeof cell === 'string' ? {} : (cell?.format || {});
}

function getCellLabel(cell: string | TableCell): string | undefined {
  return typeof cell === 'string' ? undefined : cell?.label;
}

function getCellFormula(cell: string | TableCell): string | undefined {
  return typeof cell === 'string' ? undefined : cell?.formula;
}

function createCell(value: string, format?: CellFormat, label?: string, formula?: string): TableCell {
  return { value, format, label, formula };
}

function cleanFormat(format: CellFormat): CellFormat | undefined {
  const cleaned = { ...format };
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key as keyof CellFormat] === undefined) {
      delete cleaned[key as keyof CellFormat];
    }
  });
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

function getColumnSetting(settings: (TableColumnSettings | null | undefined)[] | undefined, colIdx: number): TableColumnSettings {
  const setting = settings?.[colIdx];
  return setting && typeof setting === 'object' ? setting : {};
}

function getRowSetting(settings: (TableRowSettings | null | undefined)[] | undefined, rowIdx: number): TableRowSettings {
  const setting = settings?.[rowIdx];
  return setting && typeof setting === 'object' ? setting : {};
}

function getEffectiveCellFormat(cell: string | TableCell, columnSetting?: TableColumnSettings, rowSetting?: TableRowSettings): CellFormat {
  return { ...(columnSetting?.format || {}), ...(rowSetting?.format || {}), ...getCellFormat(cell) };
}

// Color with opacity pair for recently used colors
interface ColorWithOpacity {
  color: string;
  opacity: number;
}

// Helper to calculate relative luminance and determine if text should be dark
function isLightColor(hexColor: string, opacity: number = 1): boolean {
  // Don't apply to CSS variables or undefined
  if (!hexColor || hexColor.startsWith('var(')) return false;
  
  // Parse hex color
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return false;
  
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  // Calculate relative luminance using sRGB formula
  const luminance = (channel: number) => {
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  };
  
  const L = 0.2126 * luminance(r) + 0.7152 * luminance(g) + 0.0722 * luminance(b);
  
  // If opacity is low, the background shows through, so don't switch text color
  // Only apply dark text if opacity is high enough and luminance is above threshold
  return opacity >= 0.5 && L > 0.5;
}

// Formatting toolbar component
interface FormatToolbarProps {
  format: CellFormat;
  onFormatChange: (format: Partial<CellFormat>) => void;
  onClose: () => void;
  position: ToolbarPosition;
  isMobile: boolean;
  usedColors: ColorWithOpacity[];
  cellValue: string;
  cellLabel?: string;
  cellFormula?: string;
  onLabelChange: (label: string | undefined) => void;
  onFormulaChange: (formula: string | undefined) => void;
  character: any;
  labelScope?: 'cell' | 'column' | 'row';
  canAssignLabelOverride?: boolean;
  formulaSourceLabels?: string[];
  excludedFormulaLabels?: string[];
  labelDisabledReason?: string;
  multiple?: boolean;
  onMerge?: () => void;
  mergeDisabledReason?: string;
  onUnmerge?: () => void;
  mixedFields?: (keyof CellFormat)[];
  showVerticalAlignment?: boolean;
}

function FormatToolbar({ format, onFormatChange, onClose, position, isMobile, usedColors, cellValue, cellLabel, cellFormula, onLabelChange, onFormulaChange, character, labelScope = 'cell', canAssignLabelOverride, formulaSourceLabels = [], excludedFormulaLabels = [], labelDisabledReason, multiple = false, onMerge, mergeDisabledReason, onUnmerge, mixedFields = [], showVerticalAlignment = false }: FormatToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState({ x: position.x, y: position.y });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const textColorInputRef = useRef<HTMLInputElement>(null);
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [showFormulaInput, setShowFormulaInput] = useState(false);
  const [labelDraft, setLabelDraft] = useState(cellLabel || '');
  const [toolbarLayoutVersion, setToolbarLayoutVersion] = useState(0);

  useEffect(() => {
    const resized = () => setToolbarLayoutVersion(version => version + 1);
    const observer = new ResizeObserver(resized);
    if (toolbarRef.current) observer.observe(toolbarRef.current);
    window.addEventListener('resize', resized);
    return () => { observer.disconnect(); window.removeEventListener('resize', resized); };
  }, []);

  const isNumeric = cellValue === '' || !isNaN(Number(cellValue));
  const canAssignLabel = canAssignLabelOverride ?? isNumeric;
  const isLabelButtonDisabled = !!labelDisabledReason || (!canAssignLabel && !cellLabel);
  const labelTooltip = labelDisabledReason || (cellLabel ? (labelScope === 'column' ? `Column labels: @${cellLabel}1, @${cellLabel}2...` : labelScope === 'row' ? `Row labels: @${cellLabel}1, @${cellLabel}2...` : `Label: @${cellLabel}`) : canAssignLabel ? 'Set variable label' : 'Cell must contain a number to assign a label');
  const selfReferenceLabels = formulaSourceLabels.length > 0 ? formulaSourceLabels : (cellLabel ? [cellLabel] : []);

  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    const root = toolbar.getBoundingClientRect();
    const bounds = [root, ...Array.from(toolbar.querySelectorAll<HTMLElement>('[data-toolbar-panel]')).map(el => el.getBoundingClientRect())];
    const left = Math.min(...bounds.map(r => r.left)), top = Math.min(...bounds.map(r => r.top));
    const width = Math.max(...bounds.map(r => r.right)) - left;
    const height = Math.max(...bounds.map(r => r.bottom)) - top;
    const placed = placeTableToolbar(position.avoidRects ?? (position.avoidRect ? [position.avoidRect] : []),
      width, height, window.innerWidth, window.innerHeight, position);
    const nextPosition = { x: placed.x + root.left - left, y: placed.y + root.top - top };
    setAdjustedPosition(current => (
      current.x === nextPosition.x && current.y === nextPosition.y ? current : nextPosition
    ));
  }, [position, isMobile, showColorPicker, showTextColorPicker, showLabelInput, showFormulaInput, multiple, onMerge, onUnmerge, showVerticalAlignment, toolbarLayoutVersion]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('[data-formula-editor-dialog="true"]')) return;
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
      role="toolbar"
      aria-label="Cell formatting"
      data-table-toolbar="true"
      className="fixed z-[9999] bg-theme-paper border border-theme-border rounded-button shadow-lg"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        maxWidth: 'calc(100vw - 16px)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className={`flex flex-wrap items-center gap-0.5 p-1 ${isMobile ? 'justify-center max-w-[280px]' : ''}`}>
        {/* Text Style Buttons */}
        <Tooltip content="Bold">
          <button
            aria-label="Bold"
            aria-pressed={mixedFields.includes('bold') ? 'mixed' : !!format.bold}
            className={`${buttonClass} ${iconSize} font-bold ${format.bold ? activeClass : 'text-theme-ink'}`}
            onClick={() => onFormatChange({ bold: !format.bold })}
          >
            B
          </button>
        </Tooltip>
        <Tooltip content="Italic">
          <button
            aria-label="Italic"
            aria-pressed={mixedFields.includes('italic') ? 'mixed' : !!format.italic}
            className={`${buttonClass} ${iconSize} italic ${format.italic ? activeClass : 'text-theme-ink'}`}
            onClick={() => onFormatChange({ italic: !format.italic })}
          >
            I
          </button>
        </Tooltip>
        <Tooltip content="Underline">
          <button
            aria-label="Underline"
            aria-pressed={mixedFields.includes('underline') ? 'mixed' : !!format.underline}
            className={`${buttonClass} ${iconSize} underline ${format.underline ? activeClass : 'text-theme-ink'}`}
            onClick={() => onFormatChange({ underline: !format.underline })}
          >
            U
          </button>
        </Tooltip>
        <Tooltip content="Strikethrough">
          <button
            aria-label="Strikethrough"
            aria-pressed={mixedFields.includes('strikethrough') ? 'mixed' : !!format.strikethrough}
            className={`${buttonClass} ${iconSize} line-through ${format.strikethrough ? activeClass : 'text-theme-ink'}`}
            onClick={() => onFormatChange({ strikethrough: !format.strikethrough })}
          >
            S
          </button>
        </Tooltip>

        {/* Divider */}
        <div className="w-px h-5 bg-theme-border mx-1" />

        {/* Background Color */}
        <div className="relative">
          <Tooltip content="Background Color">
            <button
              aria-label="Background color"
              className={`${buttonClass} ${iconSize} text-theme-ink`}
              onClick={() => {
                setShowColorPicker(!showColorPicker);
                setShowTextColorPicker(false);
              }}
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
          </Tooltip>
          {showColorPicker && (
            <div data-toolbar-panel="true"
              className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-theme-paper border border-theme-border rounded-button shadow-lg p-2 z-10"
              style={{ minWidth: '160px', maxHeight: '70vh', overflowY: 'auto' }}
            >
              {/* No color option */}
              <Tooltip content="No color">
                <button
                  className={`w-full h-7 rounded border mb-1 ${!format.bgColor && !mixedFields.includes('bgColor') ? 'border-theme-accent ring-2 ring-theme-accent' : 'border-theme-border'} bg-theme-paper relative`}
                  onClick={() => {
                    onFormatChange({ bgColor: undefined, bgOpacity: undefined });
                    setShowColorPicker(false);
                  }}
                >
                  <span className="text-theme-muted text-xs">No color</span>
                </button>
              </Tooltip>

              {/* Header color option */}
              <Tooltip content="Header color">
                <button
                  className={`w-full h-7 rounded border mb-2 ${format.bgColor === 'var(--color-background)' ? 'border-theme-accent ring-2 ring-theme-accent' : 'border-theme-border'} bg-theme-background relative`}
                  onClick={() => {
                    onFormatChange({ bgColor: 'var(--color-background)' });
                    setShowColorPicker(false);
                  }}
                >
                  <span className="text-theme-ink text-xs">Header color</span>
                </button>
              </Tooltip>
              
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

        {/* Text Color */}
        <div className="relative">
          <Tooltip content="Text Color">
            <button
              aria-label="Text color"
              className={`${buttonClass} ${iconSize} text-theme-ink`}
              onClick={() => {
                setShowTextColorPicker(!showTextColorPicker);
                setShowColorPicker(false);
              }}
            >
              <span className="relative font-bold">
                A
                {format.textColor && (
                  <span
                    className="absolute -bottom-0.5 left-0 right-0 h-1 rounded-sm"
                    style={{ backgroundColor: format.textColor }}
                  />
                )}
              </span>
            </button>
          </Tooltip>
          {showTextColorPicker && (
            <div data-toolbar-panel="true"
              className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-theme-paper border border-theme-border rounded-button shadow-lg p-2 z-10"
              style={{ minWidth: '160px', maxHeight: '70vh', overflowY: 'auto' }}
            >
              <Tooltip content="Use the theme text color">
                <button
                  className={`w-full h-7 rounded border mb-2 ${!format.textColor && !mixedFields.includes('textColor') ? 'border-theme-accent ring-2 ring-theme-accent' : 'border-theme-border'} bg-theme-paper relative`}
                  onClick={() => {
                    onFormatChange({ textColor: undefined });
                    setShowTextColorPicker(false);
                  }}
                >
                  <span className="text-theme-ink text-xs">Default text color</span>
                </button>
              </Tooltip>
              <div className="text-[10px] text-theme-muted mb-1">Custom color</div>
              <div className="flex items-center gap-2">
                <input
                  ref={textColorInputRef}
                  type="color"
                  value={format.textColor || '#1a1a1a'}
                  onChange={(e) => onFormatChange({ textColor: e.target.value })}
                  className="w-8 h-8 rounded border border-theme-border cursor-pointer"
                  style={{ padding: 0 }}
                />
                <button
                  className="flex-1 px-2 py-1 text-xs border border-theme-border rounded hover:bg-theme-accent hover:text-theme-paper"
                  onClick={() => textColorInputRef.current?.click()}
                >
                  Pick color
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-theme-border mx-1" />

        {/* Horizontal Alignment */}
        <Tooltip content="Align Left">
          <button
            className={`${buttonClass} ${iconSize} ${format.hAlign === 'left' || !format.hAlign ? activeClass : 'text-theme-ink'}`}
            onClick={() => onFormatChange({ hAlign: 'left' })}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" clipRule="evenodd" />
            </svg>
          </button>
        </Tooltip>
        <Tooltip content="Align Center">
          <button
            className={`${buttonClass} ${iconSize} ${format.hAlign === 'center' ? activeClass : 'text-theme-ink'}`}
            onClick={() => onFormatChange({ hAlign: 'center' })}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm4 5.25a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 01-.75-.75z" clipRule="evenodd" />
            </svg>
          </button>
        </Tooltip>
        <Tooltip content="Align Right">
          <button
            className={`${buttonClass} ${iconSize} ${format.hAlign === 'right' ? activeClass : 'text-theme-ink'}`}
            onClick={() => onFormatChange({ hAlign: 'right' })}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm5 10.5a.75.75 0 01.75-.75h9.5a.75.75 0 010 1.5h-9.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" clipRule="evenodd" />
            </svg>
          </button>
        </Tooltip>

        {/* Vertical Alignment, available for selections containing a vertical merge */}
        {showVerticalAlignment && <>
          <div className="w-px h-5 bg-theme-border mx-1" />
          <Tooltip content="Align Top">
            <button
              aria-label="Align Top"
              aria-pressed={mixedFields.includes('vAlign') ? 'mixed' : (format.vAlign === 'top' ? 'true' : 'false')}
              className={`${buttonClass} ${iconSize} ${format.vAlign === 'top' ? activeClass : 'text-theme-ink'}`}
              onClick={() => onFormatChange({ vAlign: 'top' })}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3h16v1.5H2zM5 6h10v1.5H5zM5 8.5h10V10H5zM5 11h10v1.5H5z" />
              </svg>
            </button>
          </Tooltip>
          <Tooltip content="Align Center">
            <button
              aria-label="Align Center Vertically"
              aria-pressed={mixedFields.includes('vAlign') ? 'mixed' : (!format.vAlign || format.vAlign === 'middle' ? 'true' : 'false')}
              className={`${buttonClass} ${iconSize} ${!format.vAlign || format.vAlign === 'middle' ? activeClass : 'text-theme-ink'}`}
              onClick={() => onFormatChange({ vAlign: 'middle' })}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3h16v1.5H2zM5 8h10v1.5H5zM5 10.5h10V12H5zM2 15.5h16V17H2z" />
              </svg>
            </button>
          </Tooltip>
          <Tooltip content="Align Bottom">
            <button
              aria-label="Align Bottom"
              aria-pressed={mixedFields.includes('vAlign') ? 'mixed' : (format.vAlign === 'bottom' ? 'true' : 'false')}
              className={`${buttonClass} ${iconSize} ${format.vAlign === 'bottom' ? activeClass : 'text-theme-ink'}`}
              onClick={() => onFormatChange({ vAlign: 'bottom' })}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 9.5h10V11H5zM5 12h10v1.5H5zM5 14.5h10V16H5zM2 17h16v1.5H2z" />
              </svg>
            </button>
          </Tooltip>
        </>}

        {/* Divider */}
        <div className="w-px h-5 bg-theme-border mx-1" />

        {/* Label button */}
        {!multiple && <Tooltip content={labelTooltip}>
          <button
            aria-label="Set variable label"
            className={`${buttonClass} ${iconSize} ${isLabelButtonDisabled ? 'text-theme-muted opacity-40 cursor-not-allowed' : cellLabel ? 'bg-theme-accent text-theme-paper' : 'text-theme-ink'}`}
            onClick={() => {
              if (isLabelButtonDisabled) return;
              setShowLabelInput(!showLabelInput);
              setShowFormulaInput(false);
              setShowColorPicker(false);
              setShowTextColorPicker(false);
              setLabelDraft(cellLabel || '');
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
          </button>
        </Tooltip>}

        {/* Formula button */}
        {!multiple && <Tooltip content={cellFormula ? `Formula: ${cellFormula}` : 'Set formula'}>
          <button
            aria-label="Set formula"
            className={`${buttonClass} ${iconSize} font-bold ${cellFormula ? 'bg-theme-accent text-theme-paper' : 'text-theme-ink'}`}
            onClick={() => {
              setShowFormulaInput(!showFormulaInput);
              setShowLabelInput(false);
              setShowColorPicker(false);
              setShowTextColorPicker(false);
            }}
          >
            <span className="italic" style={{ fontSize: '11px' }}>fx</span>
          </button>
        </Tooltip>}
        {onMerge && <Tooltip content={mergeDisabledReason || 'Merge selected cells'}>
          <button type="button" aria-label="Merge cells" disabled={!!mergeDisabledReason}
            title={mergeDisabledReason} onClick={onMerge}
            className={`${buttonClass} text-xs text-theme-ink disabled:opacity-40`}>Merge</button>
        </Tooltip>}
        {onUnmerge && <button type="button" onClick={onUnmerge} aria-label="Unmerge cell"
          className={`${buttonClass} text-xs text-theme-ink`}>Unmerge</button>}
      </div>
      {mixedFields.length > 0 && <div className="px-2 pb-1 text-[10px] text-theme-muted" role="status">
        Mixed formatting
      </div>}

      {/* Label input panel */}
      {!multiple && showLabelInput && (
        <div className="px-2 pb-2 border-t border-theme-border/50">
          <div className="flex items-center gap-1 mt-1.5 mb-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-theme-accent shrink-0">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            <span className="text-[10px] font-medium text-theme-ink">{labelScope === 'column' ? 'Column Label' : labelScope === 'row' ? 'Row Label' : 'Variable Label'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-theme-muted">@</span>
            <input
              type="text"
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const trimmed = labelDraft.trim().replace(/\s+/g, '_');
                  onLabelChange(trimmed || undefined);
                  setShowLabelInput(false);
                }
                if (e.key === 'Escape') setShowLabelInput(false);
              }}
              placeholder="e.g. str, max_hp"
              className="flex-1 px-1.5 py-0.5 border border-theme-border rounded bg-theme-paper text-theme-ink text-[10px] focus:outline-none focus:border-theme-accent"
              autoFocus
              onMouseDown={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => {
                const trimmed = labelDraft.trim().replace(/\s+/g, '_');
                onLabelChange(trimmed || undefined);
                setShowLabelInput(false);
              }}
              className="px-1.5 py-0.5 bg-theme-accent text-theme-paper rounded text-[10px] hover:opacity-90"
            >
              Set
            </button>
            {cellLabel && (
              <button
                onClick={() => {
                  setLabelDraft('');
                  onLabelChange(undefined);
                  setShowLabelInput(false);
                }}
                className="px-1.5 py-0.5 border border-red-300 text-red-500 rounded text-[10px] hover:bg-red-50"
              >
                ×
              </button>
            )}
          </div>
          {!canAssignLabel && !cellLabel && (
            <p className="text-[9px] text-red-500 mt-0.5">Cell must contain a number to assign a label</p>
          )}
          <p className="text-[9px] text-theme-muted mt-0.5">
            {labelScope === 'column' ? (
              <>Rows are referenced as <span className="font-mono">@{labelDraft || 'name'}1</span>, <span className="font-mono">@{labelDraft || 'name'}2</span>, etc.</>
            ) : labelScope === 'row' ? (
              <>Columns are referenced as <span className="font-mono">@{labelDraft || 'name'}1</span>, <span className="font-mono">@{labelDraft || 'name'}2</span>, etc.</>
            ) : (
              <>Others can reference this as <span className="font-mono">@{labelDraft || 'name'}</span> in formulas</>
            )}
          </p>
        </div>
      )}

      {/* Formula editor */}
      {!multiple && showFormulaInput && (
        <FormulaEditorDialog
          formula={cellFormula}
          character={character}
          sourceLabels={selfReferenceLabels}
          excludedLabels={excludedFormulaLabels}
          selfReferenceMessage={
            labelScope === 'column'
              ? 'A column formula cannot reference labels generated by that same column.'
              : labelScope === 'row'
                ? 'A row formula cannot reference labels generated by that same row.'
                : cellLabel
                  ? `A formula cannot reference its own label (@${cellLabel}).`
                  : undefined
          }
          onApply={(nextFormula) => {
            onFormulaChange(nextFormula);
            setShowFormulaInput(false);
          }}
          onClear={cellFormula ? () => {
            onFormulaChange(undefined);
            setShowFormulaInput(false);
          } : undefined}
          onCancel={() => setShowFormulaInput(false)}
        />
      )}
    </div>
  );
}

export default function TableWidget({ widget, height, sheetScale = 1, mode }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const characters = useStore((state) => state.characters);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const isPrintMode = mode === 'print';
  
  const { 
    label, 
    columns = ['Item', 'Qty', 'Weight'],
    rows = [],
    tableColumnSettings = [],
    tableRowSettings = [],
    hideTableHeader = false,
    tableCornerRadius = false,
    showTableEditButton = true
  } = widget.data;
  
  const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null);
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [selectedCells, setSelectedCells] = useState<TableCoordinate[]>([]);
  const [tableError, setTableError] = useState<string | null>(null);
  const [rowPendingRemoval, setRowPendingRemoval] = useState<number | null>(null);
  const removalDataRef = useRef<Widget['data'] | null>(null);
  const selectionAnchorRef = useRef<TableCoordinate | null>(null);
  const selectionDragRef = useRef<{ start: TableCoordinate; rangeAnchor: TableCoordinate | null; x: number; y: number; moved: boolean; snapshot: TableCoordinate[] } | null>(null);
  const suppressSelectionClick = useRef(false);
  const mergeValidation = useMemo(() => validateTableMerges(widget.data), [widget.data]);
  const merges = mergeValidation.merges;
  const selection = selectedCell ? logicalTableCells(selectedCells.length ? selectedCells : [selectedCell], merges)
    .filter(cell => cell.row < rows.length && cell.col < columns.length) : [];
  const selectionKeys = new Set(selection.map(tableCellKey));
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState<ToolbarPosition>({ x: 0, y: 0 });
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
  const [dragOverRowIndex, setDragOverRowIndex] = useState<number | null>(null);
  const [columnPendingRemoval, setColumnPendingRemoval] = useState<number | null>(null);
  const [isTableEditing, setIsTableEditing] = useState(false);
  const selectCellsMode = isTableEditing;
  const [editingColumnHeader, setEditingColumnHeader] = useState<number | null>(null);
  const [columnWidthDraft, setColumnWidthDraft] = useState<{ column: number; width: number } | null>(null);
  const showTableControls = isTableEditing && !isPrintMode;
  const dragRowItem = useRef<number | null>(null);
  const columnResizeRef = useRef<{ column: number; pointerId: number; startX: number; startWidth: number } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const toolbarAnchorRef = useRef<HTMLElement | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [touchStart, setTouchStart] = useState<{ row: number; col: number } | null>(null);
  const touchUiSnapshotRef = useRef<{
    editingCell: { row: number; col: number } | null;
    selectedCell: { row: number; col: number } | null;
    selectedCells: TableCoordinate[];
    selectionAnchor: TableCoordinate | null;
    toolbarAnchor: HTMLElement | null;
    selectedColumn: number | null;
    selectedRow: number | null;
    showToolbar: boolean;
    toolbarPos: ToolbarPosition;
  } | null>(null);

  const captureTouchUiState = () => {
    if (touchUiSnapshotRef.current) return;
    touchUiSnapshotRef.current = {
      editingCell,
      selectedCell,
      selectedCells,
      selectionAnchor: selectionAnchorRef.current,
      toolbarAnchor: toolbarAnchorRef.current,
      selectedColumn,
      selectedRow,
      showToolbar,
      toolbarPos: { ...toolbarPos },
    };
  };

  // Collect all used colors (with opacity) from the character's table widgets
  const usedColors = useMemo(() => {
    const activeChar = characters.find(c => c.id === activeCharacterId);
    if (!activeChar) return [];
    
    const colorMap = new Map<string, ColorWithOpacity>();
    
    // Go through all sheets and widgets
    activeChar.sheets.forEach(sheet => {
      sheet.widgets.forEach(w => {
        if (w.type === 'TABLE' && w.data.rows) {
          (w.data.tableColumnSettings || []).forEach(setting => {
            const fmt = setting && typeof setting === 'object' ? setting.format || {} : {};
            if (fmt.bgColor) {
              const key = `${fmt.bgColor}|${fmt.bgOpacity ?? 1}`;
              if (!colorMap.has(key)) {
                colorMap.set(key, { color: fmt.bgColor, opacity: fmt.bgOpacity ?? 1 });
              }
            }
          });

          (w.data.tableRowSettings || []).forEach(setting => {
            const fmt = setting && typeof setting === 'object' ? setting.format || {} : {};
            if (fmt.bgColor) {
              const key = `${fmt.bgColor}|${fmt.bgOpacity ?? 1}`;
              if (!colorMap.has(key)) {
                colorMap.set(key, { color: fmt.bgColor, opacity: fmt.bgOpacity ?? 1 });
              }
            }
          });

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

  const activeChar = useMemo(
    () => characters.find(c => c.id === activeCharacterId),
    [characters, activeCharacterId]
  );

  const formulaLabels = useMemo(() => {
    return activeChar ? collectLabels(activeChar) : {};
  }, [activeChar]);

  const handleCellLabelChange = (rowIdx: number, colIdx: number, label: string | undefined) => {
    const newRows = [...rows];
    const currentCell = newRows[rowIdx].cells[colIdx];
    const currentValue = getCellValue(currentCell);
    const currentFormat = getCellFormat(currentCell);
    const currentFormula = getCellFormula(currentCell);
    
    newRows[rowIdx] = { ...newRows[rowIdx], cells: [...newRows[rowIdx].cells] };
    newRows[rowIdx].cells[colIdx] = createCell(currentValue, currentFormat, label, currentFormula);
    updateWidgetData(widget.id, { rows: newRows });
  };

  const updateColumnSettings = (colIdx: number, update: Partial<TableColumnSettings>) => {
    const newColumnSettings = [...tableColumnSettings];
    const nextSetting = { ...(newColumnSettings[colIdx] || {}), ...update };
    if (!nextSetting.format || Object.keys(nextSetting.format).length === 0) delete nextSetting.format;
    if (!nextSetting.label) delete nextSetting.label;
    if (!nextSetting.formula) delete nextSetting.formula;
    if (!Number.isFinite(nextSetting.width) || !nextSetting.width || nextSetting.width < 1) delete nextSetting.width;
    newColumnSettings[colIdx] = nextSetting;
    return newColumnSettings;
  };

  const handleColumnLabelChange = (colIdx: number, label: string | undefined) => {
    const newColumnSettings = updateColumnSettings(colIdx, { label });
    updateWidgetData(widget.id, { tableColumnSettings: newColumnSettings });
  };

  const handleColumnFormulaChange = (colIdx: number, formula: string | undefined) => {
    const newColumnSettings = updateColumnSettings(colIdx, { formula });
    updateWidgetData(widget.id, { tableColumnSettings: newColumnSettings });
  };

  const updateRowSettings = (rowIdx: number, update: Partial<TableRowSettings>) => {
    const newRowSettings = [...tableRowSettings];
    const nextSetting = { ...getRowSetting(newRowSettings, rowIdx), ...update };
    if (!nextSetting.format || Object.keys(nextSetting.format).length === 0) delete nextSetting.format;
    if (!nextSetting.label) delete nextSetting.label;
    if (!nextSetting.formula) delete nextSetting.formula;
    newRowSettings[rowIdx] = nextSetting;
    return newRowSettings;
  };

  const handleRowLabelChange = (rowIdx: number, label: string | undefined) => {
    const newRowSettings = updateRowSettings(rowIdx, { label });
    updateWidgetData(widget.id, { tableRowSettings: newRowSettings });
  };

  const handleRowFormulaChange = (rowIdx: number, formula: string | undefined) => {
    const newRowSettings = updateRowSettings(rowIdx, { formula });
    updateWidgetData(widget.id, { tableRowSettings: newRowSettings });
  };

  const handleCellFormulaChange = (rowIdx: number, colIdx: number, formula: string | undefined) => {
    const newRows = [...rows];
    const currentCell = newRows[rowIdx].cells[colIdx];
    const currentValue = getCellValue(currentCell);
    const currentFormat = getCellFormat(currentCell);
    const currentLabel = getCellLabel(currentCell);
    
    newRows[rowIdx] = { ...newRows[rowIdx], cells: [...newRows[rowIdx].cells] };
    newRows[rowIdx].cells[colIdx] = createCell(currentValue, currentFormat, currentLabel, formula);
    updateWidgetData(widget.id, { rows: newRows });
  };

  // Detect mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fixed small sizing
  const cellClass = 'text-[10px] p-0.5';
  const gapClass = 'gap-1';
  const showHeader = !!label || !isPrintMode;
  const showTableHeader = !hideTableHeader || showTableControls;
  const hasTableCornerRadius = tableCornerRadius === true && !showTableControls;
  
  // Calculate table area height
  const labelHeight = showHeader ? 16 : 0;
  const gapSize = showHeader ? 4 : 0;
  const padding = 0;
  const tableHeight = Math.max(40, height - labelHeight - gapSize - padding * 2);

  const handleCellChange = (rowIdx: number, colIdx: number, value: string) => {
    const newRows = [...rows];
    const currentCell = newRows[rowIdx].cells[colIdx];
    const currentFormat = getCellFormat(currentCell);
    const currentLabel = getCellLabel(currentCell);
    const currentFormula = getCellFormula(currentCell) || getRowSetting(tableRowSettings, rowIdx).formula || getColumnSetting(tableColumnSettings, colIdx).formula;
    const columnLabel = getColumnSetting(tableColumnSettings, colIdx).label;
    const rowLabel = getRowSetting(tableRowSettings, rowIdx).label;
    
    // If cell has a label, only allow numeric input
    if ((currentLabel || columnLabel || rowLabel) && value !== '' && isNaN(Number(value))) return;
    // If cell has a formula, don't allow manual editing
    if (currentFormula) return;
    
    newRows[rowIdx] = { 
      ...newRows[rowIdx], 
      cells: [...newRows[rowIdx].cells]
    };
    newRows[rowIdx].cells[colIdx] = createCell(value, currentFormat, currentLabel, currentFormula);
    updateWidgetData(widget.id, { rows: newRows });
  };

  const handleColumnNameChange = (colIdx: number, value: string) => {
    const newColumns = [...columns];
    newColumns[colIdx] = value;
    updateWidgetData(widget.id, { columns: newColumns });
  };

  const handleColumnWidthChange = (colIdx: number, width: number | undefined) => {
    const newColumnSettings = updateColumnSettings(colIdx, { width });
    updateWidgetData(widget.id, { tableColumnSettings: newColumnSettings });
  };

  const getColumnWidth = (colIdx: number): number | undefined => {
    if (columnWidthDraft?.column === colIdx) return columnWidthDraft.width;
    return getColumnSetting(tableColumnSettings, colIdx).width;
  };

  const getColumnWidthStyle = (colIdx: number): React.CSSProperties => {
    const columnWidth = getColumnWidth(colIdx);
    return columnWidth === undefined
      ? {}
      : { width: `${columnWidth}px`, minWidth: `${columnWidth}px`, maxWidth: `${columnWidth}px` };
  };

  const handleColumnResizeStart = (event: React.PointerEvent<HTMLSpanElement>, colIdx: number) => {
    event.preventDefault();
    event.stopPropagation();
    const header = event.currentTarget.closest('th');
    if (!header) return;

    const startWidth = Math.round(header.getBoundingClientRect().width);
    columnResizeRef.current = { column: colIdx, pointerId: event.pointerId, startX: event.clientX, startWidth };
    setColumnWidthDraft({ column: colIdx, width: startWidth });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleColumnResizeMove = (event: React.PointerEvent<HTMLSpanElement>) => {
    const resize = columnResizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;

    setColumnWidthDraft({
      column: resize.column,
      width: Math.max(48, Math.round(resize.startWidth + event.clientX - resize.startX)),
    });
  };

  const finishColumnResize = (event: React.PointerEvent<HTMLSpanElement>, saveWidth: boolean) => {
    const resize = columnResizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;

    const width = Math.max(48, Math.round(resize.startWidth + event.clientX - resize.startX));
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    columnResizeRef.current = null;
    setColumnWidthDraft(null);
    if (saveWidth) handleColumnWidthChange(resize.column, width);
  };

  const handleFormatChange = (rowIdx: number, colIdx: number, formatUpdate: Partial<CellFormat>) => {
    updateWidgetData(widget.id, { rows: formatTableCells(widget.data,
      selection.length ? selection : [{ row: rowIdx, col: colIdx }], formatUpdate) });
  };

  const handleColumnFormatChange = (colIdx: number, formatUpdate: Partial<CellFormat>) => {
    const currentColumnFormat = getColumnSetting(tableColumnSettings, colIdx).format || {};
    const nextFormat = cleanFormat({ ...currentColumnFormat, ...formatUpdate });
    const newColumnSettings = updateColumnSettings(colIdx, { format: nextFormat });
    const newRows = formatTableCells(widget.data, rows.map((_, row) => ({ row, col: colIdx })), formatUpdate);

    updateWidgetData(widget.id, { rows: newRows, tableColumnSettings: newColumnSettings });
  };

  const handleRowFormatChange = (rowIdx: number, formatUpdate: Partial<CellFormat>) => {
    const currentRowFormat = getRowSetting(tableRowSettings, rowIdx).format || {};
    const nextFormat = cleanFormat({ ...currentRowFormat, ...formatUpdate });
    const newRowSettings = updateRowSettings(rowIdx, { format: nextFormat });
    const newRows = formatTableCells(widget.data, columns.map((_, col) => ({ row: rowIdx, col })), formatUpdate);

    updateWidgetData(widget.id, { rows: newRows, tableRowSettings: newRowSettings });
  };

  const getToolbarPositionForElement = (element: HTMLElement): ToolbarPosition => {
    const cellElement = element.closest('td, th') || element;
    const rect = cellElement.getBoundingClientRect();
    const toolbarWidth = isMobile ? 280 : 320;
    return {
      x: rect.left + rect.width / 2 - toolbarWidth / 2,
      y: rect.top - 56,
      avoidRect: {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
    };
  };

  useLayoutEffect(() => {
    if (!showToolbar) return;

    const updateToolbarPosition = () => {
      const elements = Array.from(tableRef.current?.querySelectorAll<HTMLElement>('[data-table-cell]') ?? [])
        .filter(el => selectionKeys.has(el.dataset.tableCell ?? ''));
      const anchor = elements[0] ?? toolbarAnchorRef.current;
      if (!anchor) return;

      const nextPosition = getToolbarPositionForElement(anchor);
      const viewport = tableRef.current?.querySelector('[data-table-scroll]')?.getBoundingClientRect();
      nextPosition.avoidRects = elements.map(el => {
        const rect = el.getBoundingClientRect();
        const left = Math.max(rect.left, viewport?.left ?? 0, 0);
        const top = Math.max(rect.top, viewport?.top ?? 0, 0);
        const right = Math.min(rect.right, viewport?.right ?? window.innerWidth, window.innerWidth);
        const bottom = Math.min(rect.bottom, viewport?.bottom ?? window.innerHeight, window.innerHeight);
        return { left, top, right, bottom, width: right - left, height: bottom - top };
      }).filter(rect => rect.width > 0 && rect.height > 0);
      if (!elements.length && nextPosition.avoidRect) nextPosition.avoidRects = [nextPosition.avoidRect];
      setToolbarPos((currentPosition) => {
        const currentRect = currentPosition.avoidRect;
        const nextRect = nextPosition.avoidRect;
        if (
          currentPosition.x === nextPosition.x &&
          currentPosition.y === nextPosition.y &&
          currentRect?.top === nextRect?.top &&
          currentRect?.right === nextRect?.right &&
          currentRect?.bottom === nextRect?.bottom &&
          currentRect?.left === nextRect?.left &&
          currentRect?.width === nextRect?.width &&
          currentRect?.height === nextRect?.height
          && JSON.stringify(currentPosition.avoidRects) === JSON.stringify(nextPosition.avoidRects)
        ) {
          return currentPosition;
        }
        return nextPosition;
      });
    };

    updateToolbarPosition();
    let frame = window.requestAnimationFrame(function refreshToolbarPosition() {
      updateToolbarPosition();
      frame = window.requestAnimationFrame(refreshToolbarPosition);
    });
    window.addEventListener('resize', updateToolbarPosition);
    window.addEventListener('scroll', updateToolbarPosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updateToolbarPosition);
      window.removeEventListener('scroll', updateToolbarPosition, true);
    };
  }, [isMobile, sheetScale, showToolbar, selectedCell, selectedCells, merges]);

  const handleCellClick = (rowIdx: number, colIdx: number, event: React.MouseEvent<HTMLElement>) => {
    if (mode === 'print') return;
    if (suppressSelectionClick.current) { suppressSelectionClick.current = false; return; }
    const cell = getTableCellOwner(merges, rowIdx, colIdx);
    let next = [cell];
    if (event.shiftKey && selectionAnchorRef.current) {
      next = tableRangeSelection(selectionAnchorRef.current, cell, merges);
    } else if (event.ctrlKey || event.metaKey || selectCellsMode) {
      next = selectionKeys.has(tableCellKey(cell)) ? selection.filter(c => tableCellKey(c) !== tableCellKey(cell)) : [...selection, cell];
      selectionAnchorRef.current = cell;
    } else selectionAnchorRef.current = cell;
    setSelectedCells(next);
    setEditingCell(next.length === 1 && !selectCellsMode && !event.shiftKey && !event.ctrlKey && !event.metaKey ? cell : null);
    setSelectedCell(next[0] ?? null);
    setSelectedColumn(null);
    setSelectedRow(null);
    toolbarAnchorRef.current = event.currentTarget;
    setToolbarPos(getToolbarPositionForElement(event.currentTarget));
    setShowToolbar(next.length > 0);
  };

  const handleColumnHeaderClick = (colIdx: number, event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setEditingCell(null);
    setEditingColumnHeader(null);
    setSelectedCell(null);
    setSelectedCells([]);
    setSelectedColumn(colIdx);
    setSelectedRow(null);
    toolbarAnchorRef.current = event.currentTarget;
    setToolbarPos(getToolbarPositionForElement(event.currentTarget));
    setShowToolbar(true);
  };

  const handleRowFormatClick = (rowIdx: number, event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setEditingCell(null);
    setSelectedCell(null);
    setSelectedCells([]);
    setSelectedColumn(null);
    setSelectedRow(rowIdx);
    toolbarAnchorRef.current = event.currentTarget;
    setToolbarPos(getToolbarPositionForElement(event.currentTarget));
    setShowToolbar(true);
  };

  const handleCellDoubleClick = (_rowIdx: number, _colIdx: number) => {
    // No longer needed since single click now enters edit mode
  };

  const startCellSelection = (event: React.PointerEvent<HTMLElement>, cell: TableCoordinate) => {
    if (!selectCellsMode || isPrintMode || event.button !== 0) return;
    if (!event.isPrimary) return;
    captureTouchUiState();
    suppressSelectionClick.current = false;
    event.stopPropagation();
    if (event.pointerType === 'mouse') event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    selectionDragRef.current = { start: cell, rangeAnchor: event.shiftKey ? selectionAnchorRef.current : null,
      x: event.clientX, y: event.clientY, moved: false, snapshot: selection };
    setEditingCell(null);
  };

  const moveCellSelection = (event: React.PointerEvent<HTMLElement>) => {
    const drag = selectionDragRef.current;
    if (!drag) return;
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6 && !drag.moved) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-table-cell]');
    if (!target || !tableRef.current?.contains(target)) return;
    const cell = { row: Number(target.dataset.cellRow), col: Number(target.dataset.cellCol) };
    drag.moved = true;
    const next = tableRangeSelection(drag.rangeAnchor ?? drag.start, cell, merges);
    setSelectedCells(next);
    setSelectedCell(next[0]);
    selectionAnchorRef.current = drag.rangeAnchor ?? drag.start;
    toolbarAnchorRef.current = target;
    setSelectedColumn(null);
    setSelectedRow(null);
    setShowToolbar(true);
  };

  const endCellSelection = (event: React.PointerEvent<HTMLElement>, cancelled = false) => {
    const drag = selectionDragRef.current;
    if (!drag) return;
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    let next = selection;
    if (cancelled) next = drag.snapshot;
    else if (!drag.moved && drag.rangeAnchor) next = tableRangeSelection(drag.rangeAnchor, drag.start, merges);
    else if (!drag.moved) {
      next = drag.snapshot.some(c => tableCellKey(c) === tableCellKey(drag.start))
        ? drag.snapshot.filter(c => tableCellKey(c) !== tableCellKey(drag.start)) : [...drag.snapshot, drag.start];
    }
    setSelectedCells(next);
    setSelectedCell(next[0] ?? null);
    setSelectedColumn(null);
    setSelectedRow(null);
    setShowToolbar(next.length > 0);
    toolbarAnchorRef.current = event.currentTarget;
    selectionAnchorRef.current = drag.rangeAnchor ?? drag.start;
    selectionDragRef.current = null;
    suppressSelectionClick.current = true;
    touchUiSnapshotRef.current = null;
  };

  const applyMerge = () => {
    const reason = tableMergeBlockedReason(widget.data, selection);
    if (reason) { setTableError(reason); return; }
    const data = mergeTableCells(widget.data, selection);
    const anchor = selection[0];
    setTableError(null);
    setSelectedCells([anchor]);
    setSelectedCell(anchor);
    setEditingCell(null);
    updateWidgetData(widget.id, data);
  };

  const applyUnmerge = () => {
    if (!selectedCell) return;
    updateWidgetData(widget.id, unmergeTableCells(widget.data, selectedCell));
    setSelectedCells([selectedCell]);
    setTableError(null);
  };

  const closeTableSelection = () => {
    setEditingCell(null);
    setEditingColumnHeader(null);
    setSelectedCell(null);
    setSelectedCells([]);
    selectionAnchorRef.current = null;
    selectionDragRef.current = null;
    setSelectedColumn(null);
    setSelectedRow(null);
    setShowToolbar(false);
    toolbarAnchorRef.current = null;
  };

  const addRow = () => {
    closeTableSelection();
    updateWidgetData(widget.id, {
      rows: [...rows, { cells: columns.map(() => '') }],
      tableRowSettings: [...rows.map((_, index) => getRowSetting(tableRowSettings, index)), {}],
    });
  };

  const addColumn = () => {
    closeTableSelection();
    updateWidgetData(widget.id, {
      columns: [...columns, `Column ${columns.length + 1}`],
      rows: rows.map((row: TableRow) => ({
        ...row,
        cells: [...columns.map((_, index) => row.cells[index] ?? ''), ''],
      })),
      tableColumnSettings: [...columns.map((_, index) => getColumnSetting(tableColumnSettings, index)), {}],
    });
  };

  const removeRow = (indexToRemove: number, confirmed = false) => {
    closeTableSelection();
    if (confirmed && removalDataRef.current !== widget.data) {
      setRowPendingRemoval(null);
      setTableError('The table changed. Please select the row to remove again.');
      return;
    }
    const result = transformTableAxis(widget.data, 'row', rows.map((_, i) => i).filter(i => i !== indexToRemove));
    if (!result.ok) { setTableError(result.reason); return; }
    if (result.removesMergedCells && !confirmed) {
      removalDataRef.current = widget.data;
      setRowPendingRemoval(indexToRemove);
      return;
    }
    setRowPendingRemoval(null);
    setTableError(null);
    updateWidgetData(widget.id, result.data);
  };

  const requestColumnRemoval = (index: number) => {
    closeTableSelection();
    const result = transformTableAxis(widget.data, 'column', columns.map((_, i) => i).filter(i => i !== index));
    if (!result.ok) { setTableError(result.reason); return; }
    removalDataRef.current = widget.data;
    setColumnPendingRemoval(index);
  };

  const confirmColumnRemoval = () => {
    if (columnPendingRemoval === null) return;
    if (removalDataRef.current !== widget.data) {
      setColumnPendingRemoval(null);
      setTableError('The table changed. Please select the column to remove again.');
      return;
    }

    if (columns.length > 1) {
      const result = transformTableAxis(widget.data, 'column', columns.map((_, i) => i).filter(i => i !== columnPendingRemoval));
      if (!result.ok) { setTableError(result.reason); setColumnPendingRemoval(null); return; }
      setTableError(null);
      updateWidgetData(widget.id, result.data);
    }

    setColumnPendingRemoval(null);
  };

  useEffect(() => {
    if (columnPendingRemoval === null && rowPendingRemoval === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setColumnPendingRemoval(null); setRowPendingRemoval(null); }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [columnPendingRemoval, rowPendingRemoval]);

  // Row drag handlers
  const moveRowToInsertion = (fromIndex: number, insertionIndex: number) => {
    if (insertionIndex === fromIndex || insertionIndex === fromIndex + 1) return;

    const order = rows.map((_, index) => index);
    const [movedRow] = order.splice(fromIndex, 1);
    const adjustedIndex = insertionIndex > fromIndex ? insertionIndex - 1 : insertionIndex;
    order.splice(adjustedIndex, 0, movedRow);
    const result = transformTableAxis(widget.data, 'row', order);
    if (!result.ok) { setTableError(result.reason); return; }
    closeTableSelection();
    setTableError(null);
    updateWidgetData(widget.id, result.data);
  };

  const handleRowDragStart = (e: React.DragEvent, index: number) => {
    setShowToolbar(false);
    setSelectedCell(null);
    setSelectedColumn(null);
    setSelectedRow(null);
    dragRowItem.current = index;
    setDraggedRowIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleRowDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const fromIndex = dragRowItem.current;
    if (fromIndex !== null) {
      const rowRect = e.currentTarget.getBoundingClientRect();
      const insertionIndex = e.clientY < rowRect.top + rowRect.height / 2 ? index : index + 1;
      setDragOverRowIndex(insertionIndex === fromIndex || insertionIndex === fromIndex + 1 ? null : insertionIndex);
    }
  };

  const handleRowDragLeave = () => {
    setDragOverRowIndex(null);
  };

  const handleRowDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const fromIndex = dragRowItem.current;
    if (fromIndex !== null && dragOverRowIndex !== null) {
      moveRowToInsertion(fromIndex, dragOverRowIndex);
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

  // Touch drag handlers for row reordering
  const touchDragState = useRef<{
    startY: number;
    currentY: number;
    rowIndex: number;
    rowElements: HTMLTableRowElement[];
    rowHeights: number[];
    scrollContainer: HTMLElement | null;
  } | null>(null);

  const handleRowTouchStart = (e: React.TouchEvent, index: number) => {
    e.stopPropagation();
    captureTouchUiState();
    setShowToolbar(false);
    setSelectedCell(null);
    setSelectedColumn(null);
    setSelectedRow(null);
    const touch = e.touches[0];
    const tableBody = tableRef.current?.querySelector('tbody');
    const scrollContainer = tableRef.current?.querySelector('.overflow-auto') as HTMLElement | null;
    
    if (tableBody) {
      const rowElements = Array.from(tableBody.querySelectorAll('tr[data-table-row-index]')) as HTMLTableRowElement[];
      const rowHeights = rowElements.map(row => row.getBoundingClientRect().height);
      
      touchDragState.current = {
        startY: touch.clientY,
        currentY: touch.clientY,
        rowIndex: index,
        rowElements,
        rowHeights,
        scrollContainer,
      };
      
      dragRowItem.current = index;
      setDraggedRowIndex(index);
    }
  };

  const handleRowTouchMove = (e: React.TouchEvent) => {
    if (!touchDragState.current || dragRowItem.current === null) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches[0];
    touchDragState.current.currentY = touch.clientY;
    
    const { rowHeights, scrollContainer } = touchDragState.current;
    const fromIndex = dragRowItem.current;
    
    let insertionIndex = rowHeights.length;
    let accumulatedHeight = touchDragState.current.rowElements[0]?.getBoundingClientRect().top || 0;

    for (let index = 0; index < rowHeights.length; index++) {
      const midpoint = accumulatedHeight + rowHeights[index] / 2;
      if (touch.clientY < midpoint) {
        insertionIndex = index;
        break;
      }
      accumulatedHeight += rowHeights[index];
    }

    setDragOverRowIndex(insertionIndex === fromIndex || insertionIndex === fromIndex + 1 ? null : insertionIndex);
    
    // Auto-scroll when near edges
    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const scrollThreshold = 40;
      const scrollSpeed = 5;
      
      if (touch.clientY < containerRect.top + scrollThreshold) {
        scrollContainer.scrollTop -= scrollSpeed;
      } else if (touch.clientY > containerRect.bottom - scrollThreshold) {
        scrollContainer.scrollTop += scrollSpeed;
      }
    }
  };

  const handleRowTouchEnd = () => {
    if (!touchDragState.current || dragRowItem.current === null) return;
    
    const fromIndex = dragRowItem.current;
    const toIndex = dragOverRowIndex;
    
    if (toIndex !== null) {
      moveRowToInsertion(fromIndex, toIndex);
    }
    
    touchDragState.current = null;
    dragRowItem.current = null;
    setDraggedRowIndex(null);
    setDragOverRowIndex(null);
    touchUiSnapshotRef.current = null;
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

    if (format.textColor) {
      style.color = format.textColor;
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
      if (e.target instanceof Element && e.target.closest('[data-table-toolbar], [data-formula-editor-dialog]')) return;
      if (tableRef.current && !tableRef.current.contains(e.target as Node)) {
        setShowToolbar(false);
        setSelectedCell(null);
        setSelectedCells([]);
        setSelectedColumn(null);
        setSelectedRow(null);
        toolbarAnchorRef.current = null;
      }
    };
    
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || (event.target instanceof Element && event.target.closest('[data-formula-editor-dialog]'))) return;
      closeTableSelection();
      setIsTableEditing(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    closeTableSelection();
  }, [rows.length, columns.length]);

  useEffect(() => {
      closeTableSelection();
      setIsTableEditing(false);
  }, [mode, widget.id]);

  useEffect(() => {
    if (editingCell && isCoveredTableCell(merges, editingCell.row, editingCell.col)) setEditingCell(null);
    if (selectedCell) {
      const owner = getTableCellOwner(merges, selectedCell.row, selectedCell.col);
      if (owner.row !== selectedCell.row || owner.col !== selectedCell.col) setSelectedCell(owner);
    }
  }, [merges]);

  // Touch long press handling
  useTouchCameraPinchCancellation(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchDragState.current = null;
    dragRowItem.current = null;
    setDraggedRowIndex(null);
    setDragOverRowIndex(null);
    setTouchStart(null);
    if (selectionDragRef.current) suppressSelectionClick.current = true;
    selectionDragRef.current = null;
    const snapshot = touchUiSnapshotRef.current;
    if (snapshot) {
      setEditingCell(snapshot.editingCell);
      setSelectedCell(snapshot.selectedCell);
      setSelectedCells(snapshot.selectedCells);
      selectionAnchorRef.current = snapshot.selectionAnchor;
      toolbarAnchorRef.current = snapshot.toolbarAnchor;
      setSelectedColumn(snapshot.selectedColumn);
      setSelectedRow(snapshot.selectedRow);
      setShowToolbar(snapshot.showToolbar);
      setToolbarPos(snapshot.toolbarPos);
      touchUiSnapshotRef.current = null;
    }
  });

  const handleTouchStart = (rowIdx: number, colIdx: number, e: React.TouchEvent<HTMLElement>) => {
    if (mode === 'print' || selectCellsMode) return;
    captureTouchUiState();
    const targetElement = e.currentTarget;
    setTouchStart({ row: rowIdx, col: colIdx });
    longPressTimer.current = setTimeout(() => {
      // Long press - show toolbar
      setSelectedCell({ row: rowIdx, col: colIdx });
      setSelectedCells([{ row: rowIdx, col: colIdx }]);
      selectionAnchorRef.current = { row: rowIdx, col: colIdx };
      setSelectedColumn(null);
      setSelectedRow(null);
      toolbarAnchorRef.current = targetElement;
      setToolbarPos(getToolbarPositionForElement(targetElement));
      setShowToolbar(true);
      longPressTimer.current = null;
    }, 500);
  };

  const handleTouchEnd = (rowIdx: number, colIdx: number, e: React.TouchEvent<HTMLElement>) => {
    if (mode === 'print' || selectCellsMode) return;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      
      // Quick tap - enter edit mode and show toolbar
      if (touchStart?.row === rowIdx && touchStart?.col === colIdx) {
        setEditingCell({ row: rowIdx, col: colIdx });
        setSelectedCell({ row: rowIdx, col: colIdx });
        setSelectedCells([{ row: rowIdx, col: colIdx }]);
        selectionAnchorRef.current = { row: rowIdx, col: colIdx };
        setSelectedColumn(null);
        setSelectedRow(null);
        toolbarAnchorRef.current = e.currentTarget;
        setToolbarPos(getToolbarPositionForElement(e.currentTarget));
        
        setShowToolbar(true);
        e.preventDefault();
      }
    }
    setTouchStart(null);
    touchUiSnapshotRef.current = null;
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setTouchStart(null);
  };

  const selectedColumnSetting = selectedColumn !== null ? getColumnSetting(tableColumnSettings, selectedColumn) : null;
  const selectedColumnLabel = selectedColumnSetting?.label;
  const selectedColumnGeneratedLabels = selectedColumnLabel && selectedColumn !== null ? rows.flatMap((_, index) =>
    isCoveredTableCell(merges, index, selectedColumn) ? [] : [`${selectedColumnLabel}${index + 1}`]) : [];
  const selectedColumnRowLabels = selectedColumn !== null ? rows.flatMap((_, index) =>
    isCoveredTableCell(merges, index, selectedColumn) ? [] : [getRowSetting(tableRowSettings, index).label]).filter((rowLabel): rowLabel is string => !!rowLabel) : [];
  const selectedColumnRowGeneratedLabels = selectedColumn !== null ? selectedColumnRowLabels.map(rowLabel => `${rowLabel}${selectedColumn + 1}`) : [];
  const selectedCellColumnSetting = selectedCell ? getColumnSetting(tableColumnSettings, selectedCell.col) : null;
  const selectedCellColumnLabel = selectedCellColumnSetting?.label;
  const selectedCellGeneratedLabel = selectedCell && selectedCellColumnLabel ? `${selectedCellColumnLabel}${selectedCell.row + 1}` : undefined;
  const selectedCellRowSetting = selectedCell ? getRowSetting(tableRowSettings, selectedCell.row) : null;
  const selectedCellRowLabel = selectedCellRowSetting?.label;
  const selectedCellRowGeneratedLabel = selectedCell && selectedCellRowLabel ? `${selectedCellRowLabel}${selectedCell.col + 1}` : undefined;
  const selectedCellOwnLabel = selectedCell ? getCellLabel(rows[selectedCell.row]?.cells[selectedCell.col]) : undefined;
  const selectedCellFormulaLabels = [selectedCellOwnLabel, selectedCellGeneratedLabel, selectedCellColumnLabel, selectedCellRowGeneratedLabel, selectedCellRowLabel].filter((label): label is string => !!label);
  const selectedCellControlledLabels = [selectedCellGeneratedLabel, selectedCellRowGeneratedLabel].filter((label): label is string => !!label);
  const selectedCellLabelDisabledReason = selectedCellControlledLabels.length > 0 ? `Generated labels control this cell: ${selectedCellControlledLabels.map(label => `@${label}`).join(', ')}.` : undefined;
  const selectedColumnCanAssignLabel = selectedColumn === null || rows.every((row: TableRow, index) => {
    if (isCoveredTableCell(merges, index, selectedColumn)) return true;
    const value = getCellValue(row.cells[selectedColumn] ?? '');
    return value === '' || !isNaN(Number(value));
  });
  const selectedRowSetting = selectedRow !== null ? getRowSetting(tableRowSettings, selectedRow) : null;
  const selectedRowLabel = selectedRowSetting?.label;
  const selectedRowGeneratedLabels = selectedRowLabel && selectedRow !== null ? columns.flatMap((_, index) =>
    isCoveredTableCell(merges, selectedRow, index) ? [] : [`${selectedRowLabel}${index + 1}`]) : [];
  const selectedRowColumnLabels = selectedRow !== null ? columns.flatMap((_, colIndex) =>
    isCoveredTableCell(merges, selectedRow, colIndex) ? [] : [getColumnSetting(tableColumnSettings, colIndex).label]).filter((columnLabel): columnLabel is string => !!columnLabel) : [];
  const selectedRowColumnGeneratedLabels = selectedRow !== null ? selectedRowColumnLabels.map(columnLabel => `${columnLabel}${selectedRow + 1}`) : [];
  const selectedRowFormulaLabels = [
    ...(selectedRowLabel ? [selectedRowLabel] : []),
    ...selectedRowGeneratedLabels,
    ...selectedRowColumnLabels,
    ...selectedRowColumnGeneratedLabels,
  ];
  const selectedRowCanAssignLabel = selectedRow === null || (rows[selectedRow]?.cells || []).every((cell, col) => {
    if (isCoveredTableCell(merges, selectedRow, col)) return true;
    const value = getCellValue(cell);
    return value === '' || !isNaN(Number(value));
  });
  const hasDynamicColumn = columns.some((_, index) => getColumnWidth(index) === undefined);
  const showVerticalAlignment = selectedCell !== null && selection.some(cell =>
    merges.some(merge => merge.row === cell.row && merge.col === cell.col && merge.rowSpan > 1)
  );

  return (
    <div ref={tableRef} className={`flex flex-col ${gapClass} w-full h-full`}>
      {showHeader && (
        <div className="widget-header flex-shrink-0">
          {label && (
            <div className="widget-header-title min-w-0 flex-1 truncate">
              {label}
            </div>
          )}
          {!isPrintMode && showTableEditButton && (
            <button
              type="button"
              aria-pressed={isTableEditing}
              onClick={() => {
                const nextEditingState = !isTableEditing;
                if (!nextEditingState) closeTableSelection();
                setIsTableEditing(nextEditingState);
              }}
              onMouseDown={(event) => event.stopPropagation()}
              className={`widget-control ml-auto h-[18px] min-h-[18px] flex-shrink-0 gap-1 px-1.5 text-[10px] font-semibold ${isTableEditing ? 'bg-theme-accent text-theme-paper' : ''}`}
            >
              {isTableEditing ? <CheckIcon className="h-3 w-3" /> : <PencilIcon className="h-3 w-3" />}
              {isTableEditing ? 'Done' : 'Edit table'}
            </button>
          )}
        </div>
      )}
      {mergeValidation.error && <div role="alert" className="text-xs text-red-600">{mergeValidation.error}</div>}

      {/* Table */}
      <div data-table-scroll="true"
        className={`overflow-auto flex-1 ${hasTableCornerRadius ? 'rounded-theme' : ''}`}
        style={{ maxHeight: `${tableHeight}px` }}
        onWheel={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
            e.stopPropagation();
          }
        }}
        onDragOver={(e) => e.preventDefault()}
      >
        <table
          className={`${hasDynamicColumn ? 'w-full' : ''} ${cellClass}`}
          style={{
            borderCollapse: 'separate',
            borderSpacing: 0,
            tableLayout: 'auto',
            width: hasDynamicColumn ? undefined : 'max-content',
          }}
        >
          <colgroup>
            {showTableControls && <col style={{ width: '20px' }} />}
            {columns.map((_, idx) => {
              const columnWidth = getColumnWidth(idx);
              return <col key={idx} style={columnWidth === undefined ? undefined : { width: `${columnWidth}px` }} />;
            })}
            {showTableControls && <col style={{ width: '36px' }} />}
          </colgroup>
          {showTableHeader && <thead className="sticky top-0 z-10">
            <tr>
              {showTableControls && <th className="w-5 bg-transparent" />}
              {columns.map((col: string, idx: number) => {
                const columnSetting = getColumnSetting(tableColumnSettings, idx);
                const columnFormat = columnSetting.format || {};
                const isSelected = selectedColumn === idx;
                const isEditingHeader = editingColumnHeader === idx;
                const needsDarkText = columnFormat.bgColor ? isLightColor(columnFormat.bgColor, columnFormat.bgOpacity ?? 1) : false;
                const textColorStyle = !columnFormat.textColor && needsDarkText ? { color: '#1a1a1a' } : {};

                return (
                <th
                  key={idx}
                  className={`group/column relative border border-theme-border bg-theme-background ${cellClass} ${needsDarkText ? '' : 'text-theme-ink'} font-heading ${isSelected ? 'ring-2 ring-theme-accent ring-inset' : ''}`}
                  style={{
                    ...getCellStyle(columnFormat),
                    ...textColorStyle,
                    ...getColumnWidthStyle(idx),
                    borderLeftWidth: idx === 0 ? 1 : 0,
                    borderTopLeftRadius: hasTableCornerRadius && idx === 0 ? 'var(--border-radius)' : undefined,
                    borderTopRightRadius: hasTableCornerRadius && idx === columns.length - 1 ? 'var(--border-radius)' : undefined,
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div
                    onClick={(event) => {
                      handleColumnHeaderClick(idx, event);
                      if (showTableControls) setEditingColumnHeader(idx);
                    }}
                    className={`relative flex min-w-0 cursor-pointer items-center justify-center ${showTableControls ? 'cursor-text' : ''}`}
                  >
                    {isEditingHeader ? (
                      <input
                        type="text"
                        autoFocus
                        aria-label={`Edit ${col} column header`}
                        value={col}
                        onChange={(event) => handleColumnNameChange(idx, event.target.value)}
                        onBlur={() => setEditingColumnHeader(null)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === 'Escape') setEditingColumnHeader(null);
                        }}
                        onClick={(event) => event.stopPropagation()}
                        className={`w-full min-w-0 bg-transparent p-0 text-center font-heading focus:outline-none ${needsDarkText || columnFormat.textColor ? '' : 'text-theme-ink'}`}
                        style={columnFormat.textColor ? { color: columnFormat.textColor } : textColorStyle}
                      />
                    ) : (
                      <span className="min-w-0 truncate text-center">{col}</span>
                    )}
                    {showTableControls && (
                      <span className={`absolute right-0 top-1/2 flex -translate-y-1/2 items-center rounded border border-theme-border bg-theme-background shadow-sm transition-opacity ${isMobile ? 'opacity-100' : 'opacity-0 group-hover/column:opacity-100 focus-within:opacity-100'}`}>
                        <Tooltip content={`Format ${col} column`}>
                          <button
                            type="button"
                            aria-label={`Format ${col} column`}
                            onClick={(event) => handleColumnHeaderClick(idx, event)}
                            className="inline-flex h-4 w-4 items-center justify-center rounded text-theme-muted opacity-55 transition-colors hover:bg-theme-accent hover:text-theme-paper hover:opacity-100 focus-visible:opacity-100"
                          >
                            <PencilIcon className="h-2.5 w-2.5" />
                          </button>
                        </Tooltip>
                        {columnSetting.width !== undefined && (
                          <Tooltip content={`Use dynamic width for ${col} column`}>
                            <button
                              type="button"
                              aria-label={`Use dynamic width for ${col} column`}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleColumnWidthChange(idx, undefined);
                              }}
                              className="inline-flex h-4 w-4 items-center justify-center rounded text-theme-muted opacity-55 transition-colors hover:bg-theme-accent hover:text-theme-paper hover:opacity-100 focus-visible:opacity-100"
                            >
                              <ResetIcon className="h-2.5 w-2.5" />
                            </button>
                          </Tooltip>
                        )}
                        <Tooltip content={columns.length > 1 ? `Remove ${col} column` : 'A table needs at least one column'}>
                          <button
                            type="button"
                            aria-label={`Remove ${col} column`}
                            disabled={columns.length <= 1}
                            onClick={(event) => {
                              event.stopPropagation();
                              requestColumnRemoval(idx);
                            }}
                            className="inline-flex h-4 w-4 items-center justify-center rounded text-theme-muted opacity-55 transition-colors hover:bg-red-600 hover:text-white hover:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-20"
                          >
                            <TrashIcon className="h-2.5 w-2.5" />
                          </button>
                        </Tooltip>
                      </span>
                    )}
                  </div>
                  {showTableControls && (
                    <span
                      role="separator"
                      aria-label={`Resize ${col} column`}
                      aria-orientation="vertical"
                      title={`Drag to resize ${col} column`}
                      onClick={(event) => event.stopPropagation()}
                      onPointerDown={(event) => handleColumnResizeStart(event, idx)}
                      onPointerMove={handleColumnResizeMove}
                      onPointerUp={(event) => finishColumnResize(event, true)}
                      onPointerCancel={(event) => finishColumnResize(event, false)}
                      className="absolute -right-1 top-0 z-20 h-full w-2 cursor-col-resize touch-none"
                    />
                  )}
                </th>
                );
              })}
              {showTableControls && (
                <th className="w-9 bg-transparent p-0">
                  <Tooltip content="Add column">
                    <button
                      type="button"
                      aria-label="Add column"
                      onClick={addColumn}
                      onMouseDown={(event) => event.stopPropagation()}
                      className="widget-control h-5 w-5 p-0"
                    >
                      <PlusIcon className="h-3 w-3" />
                    </button>
                  </Tooltip>
                </th>
              )}
            </tr>
          </thead>}
          <tbody>
            {rows.length === 0 && (
              <tr>
                {showTableControls && <td className="w-5 bg-transparent" />}
                <td colSpan={columns.length} className="px-2 py-1.5 text-center text-[10px] text-theme-muted/80 font-body border border-t-0 border-theme-border">
                  {isPrintMode ? '' : 'No rows yet.'}
                </td>
                {showTableControls && <td className="w-9 bg-transparent" />}
              </tr>
            )}
            {rows.map((row: TableRow, rowIdx: number) => {
              const showDropBefore = dragOverRowIndex === rowIdx;
              const showDropAfter = rowIdx === rows.length - 1 && dragOverRowIndex === rows.length;
              return (
              <tr 
                key={rowIdx} 
                data-table-row-index={rowIdx}
                className={`group transition-colors ${draggedRowIndex === rowIdx ? 'opacity-40' : ''} ${showDropBefore || showDropAfter ? 'bg-theme-accent/10' : ''}`}
                style={{
                  boxShadow: showDropBefore
                    ? 'inset 0 3px 0 var(--color-accent)'
                    : showDropAfter
                      ? 'inset 0 -3px 0 var(--color-accent)'
                      : undefined,
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRowDragOver(e, rowIdx);
                }}
                onDragLeave={handleRowDragLeave}
                onDrop={(e) => {
                  handleRowDrop(e);
                }}
              >
                {showTableControls && <td
                  className={`w-5 p-0 cursor-grab active:cursor-grabbing ${selectedRow === rowIdx ? 'bg-theme-accent/10 ring-1 ring-theme-accent ring-inset' : ''}`}
                  draggable
                  onDragStart={(e) => handleRowDragStart(e, rowIdx)}
                  onDragEnd={handleRowDragEnd}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => handleRowTouchStart(e, rowIdx)}
                  onTouchMove={handleRowTouchMove}
                  onTouchEnd={handleRowTouchEnd}
                >
                  <div
                    aria-label={`Drag row ${rowIdx + 1} to reorder`}
                    title={`Drag row ${rowIdx + 1} to reorder`}
                    className={`flex h-full min-h-5 touch-none select-none items-center justify-center text-theme-muted hover:text-theme-ink ${isPrintMode ? 'opacity-0' : ''}`}
                  >
                    <GripVerticalIcon className="h-3 w-3" />
                  </div>
                </td>}
                {row.cells.map((cell, colIdx: number) => {
                  if (isCoveredTableCell(merges, rowIdx, colIdx)) return null;
                  const merge = merges.find(m => m.row === rowIdx && m.col === colIdx);
                  const cellValue = getCellValue(cell);
                  const columnSetting = getColumnSetting(tableColumnSettings, colIdx);
                  const rowSetting = getRowSetting(tableRowSettings, rowIdx);
                  const cellFormat = getEffectiveCellFormat(cell, columnSetting, rowSetting);
                  const cellFml = getCellFormula(cell) || rowSetting.formula || columnSetting.formula;
                  const isSelected = selectionKeys.has(tableCellKey({ row: rowIdx, col: colIdx }));
                  const isEditing = editingCell?.row === rowIdx && editingCell?.col === colIdx;
                  const needsDarkText = cellFormat.bgColor ? isLightColor(cellFormat.bgColor, cellFormat.bgOpacity ?? 1) : false;
                  // Use inline style with dark color (#1a1a1a) for light backgrounds to ensure readability
                  const textColorStyle = !cellFormat.textColor && needsDarkText ? { color: '#1a1a1a' } : {};
                  
                  return (
                    <td 
                      key={colIdx} 
                      rowSpan={merge?.rowSpan}
                      colSpan={merge?.colSpan}
                      data-table-cell={tableCellKey({ row: rowIdx, col: colIdx })}
                      data-cell-row={rowIdx}
                      data-cell-col={colIdx}
                      aria-selected={isSelected}
                      onPointerDown={event => startCellSelection(event, { row: rowIdx, col: colIdx })}
                      onPointerMove={moveCellSelection}
                      onPointerUp={event => endCellSelection(event)}
                      onPointerCancel={event => endCellSelection(event, true)}
                      onMouseDown={event => event.stopPropagation()}
                      onClickCapture={event => {
                        if (selectCellsMode || event.shiftKey || event.ctrlKey || event.metaKey) {
                          event.stopPropagation();
                          event.preventDefault();
                          handleCellClick(rowIdx, colIdx, event);
                        }
                      }}
                      className={`border border-theme-border ${isSelected ? 'ring-2 ring-theme-accent ring-inset' : selectedRow === rowIdx ? 'ring-1 ring-theme-accent/70 ring-inset' : ''} ${cellClass} ${needsDarkText ? '' : 'text-theme-ink'}`}
                      style={{ 
                        ...getCellStyle(cellFormat),
                        ...textColorStyle,
                        ...(merge && merge.colSpan > 1 ? {} : getColumnWidthStyle(colIdx)),
                        verticalAlign: cellFormat.vAlign || 'middle',
                        touchAction: selectCellsMode ? 'none' : undefined,
                        userSelect: selectCellsMode ? 'none' : undefined,
                        borderTopWidth: rowIdx === 0 && !showTableHeader ? 1 : 0,
                        borderLeftWidth: colIdx === 0 ? 1 : 0,
                        borderTopLeftRadius: hasTableCornerRadius && rowIdx === 0 && !showTableHeader && colIdx === 0 ? 'var(--border-radius)' : undefined,
                        borderTopRightRadius: hasTableCornerRadius && rowIdx === 0 && !showTableHeader && colIdx + (merge?.colSpan ?? 1) === columns.length ? 'var(--border-radius)' : undefined,
                        borderBottomLeftRadius: hasTableCornerRadius && rowIdx + (merge?.rowSpan ?? 1) === rows.length && colIdx === 0 ? 'var(--border-radius)' : undefined,
                        borderBottomRightRadius: hasTableCornerRadius && rowIdx + (merge?.rowSpan ?? 1) === rows.length && colIdx + (merge?.colSpan ?? 1) === columns.length ? 'var(--border-radius)' : undefined,
                      }}
                    >
                      <div 
                        onClick={(e) => handleCellClick(rowIdx, colIdx, e)}
                        onDoubleClick={() => handleCellDoubleClick(rowIdx, colIdx)}
                        onTouchStart={(e) => handleTouchStart(rowIdx, colIdx, e)}
                        onTouchEnd={(e) => handleTouchEnd(rowIdx, colIdx, e)}
                        onTouchMove={handleTouchMove}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={`relative min-h-[1.5em] font-body flex leading-[1.5] ${mode === 'print' ? '' : 'cursor-pointer hover:opacity-70'} ${getCellTextClass(cellFormat)}`}
                        style={{
                          ...getCellContentStyle(cellFormat),
                          ...textColorStyle,
                          justifyContent: cellFormat.hAlign === 'center' ? 'center' : cellFormat.hAlign === 'right' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <span className={`block min-w-0 whitespace-pre-wrap break-words ${isEditing ? 'invisible' : ''}`}>
                          {cellValue ? (
                            <InlineDiceText text={cellValue} widget={widget} />
                          ) : <span className={`text-theme-muted ${isPrintMode ? 'opacity-0' : ''}`}>-</span>}
                        </span>
                        {cellFml && isFormulaBroken(cellFml, formulaLabels) && (
                          <span className={`text-red-500 ml-0.5 text-[9px] flex-shrink-0 ${isEditing ? 'invisible' : ''}`} title={`Broken formula: ${cellFml}`}>⚠</span>
                        )}
                        {isEditing && (
                          <textarea
                            autoFocus
                            aria-label={`Edit cell ${rowIdx + 1}, ${colIdx + 1}`}
                            rows={1}
                            value={cellValue}
                            onFocus={(event) => {
                              const end = event.currentTarget.value.length;
                              event.currentTarget.setSelectionRange(end, end);
                            }}
                            onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                            readOnly={!!cellFml}
                            onBlur={() => setEditingCell(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setEditingCell(null);
                              } else if (e.key === 'Tab') {
                                e.preventDefault();
                                const visible = logicalTableCells(rows.flatMap((row, r) => row.cells.map((_, c) => ({ row: r, col: c }))), merges);
                                const index = visible.findIndex(cell => cell.row === rowIdx && cell.col === colIdx);
                                const next = visible[index + (e.shiftKey ? -1 : 1)];
                                if (next) {
                                  setEditingCell(next);
                                  setSelectedCell(next);
                                  setSelectedCells([next]);
                                  selectionAnchorRef.current = next;
                                }
                              } else if (e.key === 'Escape') {
                                setEditingCell(null);
                              }
                            }}
                            className={`absolute inset-0 block w-full min-w-0 h-full bg-transparent border-0 p-0 resize-none overflow-hidden focus:outline-none text-[10px] leading-[1.5] whitespace-pre-wrap break-words ${needsDarkText ? '' : 'text-theme-ink'} font-body ${getCellTextClass(cellFormat)}`}
                            style={{ textAlign: cellFormat.hAlign || 'left', ...textColorStyle }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onTouchEnd={(e) => e.stopPropagation()}
                          />
                        )}
                      </div>
                    </td>
                  );
                })}
                {showTableControls && <td className="w-9 p-0">
                  <div className="flex h-full min-h-5 items-center justify-center">
                    <Tooltip content={`Format row ${rowIdx + 1}`}>
                      <button
                        type="button"
                        aria-label={`Format row ${rowIdx + 1}`}
                        onClick={(event) => handleRowFormatClick(rowIdx, event)}
                        onMouseDown={(event) => event.stopPropagation()}
                        className="inline-flex h-5 w-4 items-center justify-center rounded text-theme-muted opacity-55 transition-colors hover:bg-theme-accent hover:text-theme-paper hover:opacity-100 focus-visible:opacity-100"
                      >
                        <PencilIcon className="h-2.5 w-2.5" />
                      </button>
                    </Tooltip>
                    <Tooltip content={`Remove row ${rowIdx + 1}`}>
                      <button
                        type="button"
                        aria-label={`Remove row ${rowIdx + 1}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          removeRow(rowIdx);
                        }}
                        onMouseDown={(event) => event.stopPropagation()}
                        className="inline-flex h-5 w-4 items-center justify-center rounded text-theme-muted opacity-55 transition-colors hover:bg-red-600 hover:text-white hover:opacity-100 focus-visible:opacity-100"
                      >
                        <TrashIcon className="h-2.5 w-2.5" />
                      </button>
                    </Tooltip>
                  </div>
                </td>}
              </tr>
              );
            })}
            {showTableControls && (
              <tr
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const fromIndex = dragRowItem.current;
                  setDragOverRowIndex(fromIndex === null || fromIndex === rows.length - 1 ? null : rows.length);
                }}
                onDrop={handleRowDrop}
              >
                <td className="w-5 bg-transparent" />
                <td colSpan={columns.length} className="py-0.5 text-center">
                  <button
                    type="button"
                    aria-label="Add row"
                    onClick={addRow}
                    onMouseDown={(event) => event.stopPropagation()}
                    className="widget-control widget-control--subtle mx-auto h-5 min-h-0 gap-1 px-2 text-[10px] font-medium"
                  >
                    <PlusIcon className="h-2.5 w-2.5" />
                    <span>Add row</span>
                  </button>
                </td>
                <td className="w-9 bg-transparent" />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(columnPendingRemoval !== null || rowPendingRemoval !== null) && createPortal(
        <div
          data-touch-camera-ignore="true"
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4"
          onClick={() => { setColumnPendingRemoval(null); setRowPendingRemoval(null); }}
          onMouseDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`table-remove-title-${widget.id}`}
            aria-describedby={`table-remove-description-${widget.id}`}
            className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={`table-remove-title-${widget.id}`} className="font-heading text-base font-bold">
              Remove {rowPendingRemoval !== null ? `row ${rowPendingRemoval + 1}` : `column ${(columnPendingRemoval ?? 0) + 1}`}?
            </h3>
            <p id={`table-remove-description-${widget.id}`} className="mt-2 text-sm text-theme-muted">
              This {rowPendingRemoval !== null ? 'row' : 'column'} and all of its values, labels, formulas, formatting, and merged cells will be removed.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => { setColumnPendingRemoval(null); setRowPendingRemoval(null); }}
                className="widget-control px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => rowPendingRemoval !== null ? removeRow(rowPendingRemoval, true) : confirmColumnRemoval()}
                className="min-h-8 rounded-button border border-red-700 bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                Remove {rowPendingRemoval !== null ? 'row' : 'column'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {tableError && createPortal(
        <div
          data-touch-camera-ignore="true"
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4"
          onClick={() => setTableError(null)}
          onMouseDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`table-error-title-${widget.id}`}
            aria-describedby={`table-error-description-${widget.id}`}
            className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={`table-error-title-${widget.id}`} className="font-heading text-base font-bold">
              Table action unavailable
            </h3>
            <p id={`table-error-description-${widget.id}`} className="mt-2 text-sm text-theme-muted">
              {tableError}
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                autoFocus
                onClick={() => setTableError(null)}
                className="widget-control px-3 py-1.5 text-sm"
              >
                OK
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Formatting Toolbar - rendered via portal to escape transformed container */}
      {!isPrintMode && showToolbar && selectedCell && createPortal(
        <FormatToolbar
          key={selection.length > 1 ? 'multiple' : tableCellKey(selectedCell)}
          format={commonTableFormat(widget.data, selection)}
          mixedFields={mixedTableFormatFields(widget.data, selection)}
          multiple={selection.length > 1}
          showVerticalAlignment={showVerticalAlignment}
          onMerge={selectedTableRectangle(selection, merges) ? applyMerge : undefined}
          mergeDisabledReason={tableMergeBlockedReason(widget.data, selection)}
          onUnmerge={selection.length === 1 && merges.some(m => m.row === selectedCell.row && m.col === selectedCell.col) ? applyUnmerge : undefined}
          onFormatChange={(formatUpdate) => handleFormatChange(selectedCell.row, selectedCell.col, formatUpdate)}
          onClose={() => {
            setShowToolbar(false);
            setSelectedCell(null);
            setSelectedCells([]);
            setSelectedColumn(null);
            setSelectedRow(null);
            toolbarAnchorRef.current = null;
          }}
          position={toolbarPos}
          isMobile={isMobile}
          usedColors={usedColors}
          cellValue={getCellValue(rows[selectedCell.row]?.cells[selectedCell.col])}
          cellLabel={selectedCellOwnLabel}
          cellFormula={getCellFormula(rows[selectedCell.row]?.cells[selectedCell.col])}
          onLabelChange={(l) => handleCellLabelChange(selectedCell.row, selectedCell.col, l)}
          onFormulaChange={(f) => handleCellFormulaChange(selectedCell.row, selectedCell.col, f)}
          character={activeChar}
          labelDisabledReason={selectedCellLabelDisabledReason}
          formulaSourceLabels={selectedCellFormulaLabels}
          excludedFormulaLabels={selectedCellFormulaLabels}
        />,
        document.body
      )}
      {!isPrintMode && showToolbar && selectedColumn !== null && createPortal(
        <FormatToolbar
          format={selectedColumnSetting?.format || {}}
          onFormatChange={(formatUpdate) => handleColumnFormatChange(selectedColumn, formatUpdate)}
          onClose={() => {
            setShowToolbar(false);
            setSelectedCell(null);
            setSelectedColumn(null);
            setSelectedRow(null);
            toolbarAnchorRef.current = null;
          }}
          position={toolbarPos}
          isMobile={isMobile}
          usedColors={usedColors}
          cellValue=""
          cellLabel={selectedColumnSetting?.label}
          cellFormula={selectedColumnSetting?.formula}
          onLabelChange={(l) => handleColumnLabelChange(selectedColumn, l)}
          onFormulaChange={(f) => handleColumnFormulaChange(selectedColumn, f)}
          character={activeChar}
          labelScope="column"
          canAssignLabelOverride={selectedColumnCanAssignLabel}
          formulaSourceLabels={[...(selectedColumnLabel ? [selectedColumnLabel] : []), ...selectedColumnGeneratedLabels, ...selectedColumnRowLabels, ...selectedColumnRowGeneratedLabels]}
          excludedFormulaLabels={[...selectedColumnGeneratedLabels, ...selectedColumnRowGeneratedLabels]}
        />,
        document.body
      )}
      {!isPrintMode && showToolbar && selectedRow !== null && createPortal(
        <FormatToolbar
          format={selectedRowSetting?.format || {}}
          onFormatChange={(formatUpdate) => handleRowFormatChange(selectedRow, formatUpdate)}
          onClose={() => {
            setShowToolbar(false);
            setSelectedCell(null);
            setSelectedColumn(null);
            setSelectedRow(null);
            toolbarAnchorRef.current = null;
          }}
          position={toolbarPos}
          isMobile={isMobile}
          usedColors={usedColors}
          cellValue=""
          cellLabel={selectedRowSetting?.label}
          cellFormula={selectedRowSetting?.formula}
          onLabelChange={(l) => handleRowLabelChange(selectedRow, l)}
          onFormulaChange={(f) => handleRowFormulaChange(selectedRow, f)}
          character={activeChar}
          labelScope="row"
          canAssignLabelOverride={selectedRowCanAssignLabel}
          formulaSourceLabels={selectedRowFormulaLabels}
          excludedFormulaLabels={[...selectedRowGeneratedLabels, ...selectedRowColumnGeneratedLabels]}
        />,
        document.body
      )}
    </div>
  );
}
