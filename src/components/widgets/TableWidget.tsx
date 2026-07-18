import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Widget, TableRow, TableCell, CellFormat, TableColumnSettings, TableRowSettings } from '../../types';
import { useStore } from '../../store/useStore';
import { evaluateFormula, collectLabels, getAvailableLabels, detectCircularReference, isFormulaBroken } from '../../utils/formulaEngine';
import { Tooltip } from '../Tooltip';
import { FormulaHelpDetailsButton } from '../FormulaHelpDetailsButton';
import { CheckIcon, GripVerticalIcon, PencilIcon, PlusIcon, TrashIcon } from '../icons';
import { useTouchCameraPinchCancellation } from '../../hooks/useTouchCamera';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
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
}

// Helper to normalize cell data (supports both legacy string and new TableCell format)
function getCellValue(cell: string | TableCell): string {
  return typeof cell === 'string' ? cell : cell.value;
}

function getCellFormat(cell: string | TableCell): CellFormat {
  return typeof cell === 'string' ? {} : (cell.format || {});
}

function getCellLabel(cell: string | TableCell): string | undefined {
  return typeof cell === 'string' ? undefined : cell.label;
}

function getCellFormula(cell: string | TableCell): string | undefined {
  return typeof cell === 'string' ? undefined : cell.formula;
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
}

function FormatToolbar({ format, onFormatChange, onClose, position, isMobile, usedColors, cellValue, cellLabel, cellFormula, onLabelChange, onFormulaChange, character, labelScope = 'cell', canAssignLabelOverride, formulaSourceLabels = [], excludedFormulaLabels = [], labelDisabledReason }: FormatToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState({ x: position.x, y: position.y });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [showFormulaInput, setShowFormulaInput] = useState(false);
  const [labelDraft, setLabelDraft] = useState(cellLabel || '');
  const [formulaDraft, setFormulaDraft] = useState(cellFormula || '');

  const isNumeric = cellValue === '' || !isNaN(Number(cellValue));
  const canAssignLabel = canAssignLabelOverride ?? isNumeric;
  const isLabelButtonDisabled = !!labelDisabledReason || (!canAssignLabel && !cellLabel);
  const labelTooltip = labelDisabledReason || (cellLabel ? (labelScope === 'column' ? `Column labels: @${cellLabel}1, @${cellLabel}2...` : labelScope === 'row' ? `Row labels: @${cellLabel}1, @${cellLabel}2...` : `Label: @${cellLabel}`) : canAssignLabel ? 'Set variable label' : 'Cell must contain a number to assign a label');
  const selfReferenceLabels = formulaSourceLabels.length > 0 ? formulaSourceLabels : (cellLabel ? [cellLabel] : []);
  const excludedFormulaLabelSet = useMemo(() => new Set(excludedFormulaLabels), [excludedFormulaLabels]);

  const availableLabels = useMemo(
    () => character ? getAvailableLabels(character) : [],
    [character]
  );

  const formulaPreview = useMemo(() => {
    if (!formulaDraft || !character) return null;
    const labels = collectLabels(character);
    return evaluateFormula(formulaDraft, labels);
  }, [formulaDraft, character]);

  // Self-reference check
  const isSelfReferencing = useMemo(() => {
    if (!formulaDraft || selfReferenceLabels.length === 0) return false;
    const refs = formulaDraft.match(/@([a-zA-Z_][a-zA-Z0-9_]*)/g);
    if (!refs) return false;
    return refs.some(r => selfReferenceLabels.includes(r.slice(1)));
  }, [formulaDraft, selfReferenceLabels]);

  // Circular reference check
  const circularPath = useMemo(() => {
    if (!formulaDraft || selfReferenceLabels.length === 0 || !character || isSelfReferencing) return null;
    for (const sourceLabel of selfReferenceLabels) {
      const cycle = detectCircularReference(sourceLabel, formulaDraft, character);
      if (cycle) return cycle;
    }
    return null;
  }, [formulaDraft, selfReferenceLabels, character, isSelfReferencing]);

  const isCircular = isSelfReferencing || circularPath !== null;

  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    const margin = 8;
    const toolbarWidth = toolbar.offsetWidth;
    const toolbarHeight = toolbar.offsetHeight;
    const maxX = Math.max(margin, window.innerWidth - toolbarWidth - margin);
    const maxY = Math.max(margin, window.innerHeight - toolbarHeight - margin);
    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
    const rectsOverlap = (x: number, y: number, rect: RectBounds) => {
      return x < rect.right + margin &&
        x + toolbarWidth > rect.left - margin &&
        y < rect.bottom + margin &&
        y + toolbarHeight > rect.top - margin;
    };
    const overlapArea = (x: number, y: number, rect: RectBounds) => {
      const overlapWidth = Math.max(0, Math.min(x + toolbarWidth, rect.right + margin) - Math.max(x, rect.left - margin));
      const overlapHeight = Math.max(0, Math.min(y + toolbarHeight, rect.bottom + margin) - Math.max(y, rect.top - margin));
      return overlapWidth * overlapHeight;
    };

    let nextPosition = {
      x: clamp(position.x, margin, maxX),
      y: clamp(position.y, margin, maxY),
    };

    if (position.avoidRect) {
      const rect = position.avoidRect;
      const centeredX = rect.left + rect.width / 2 - toolbarWidth / 2;
      const centeredY = rect.top + rect.height / 2 - toolbarHeight / 2;
      const candidates = [
        { x: centeredX, y: rect.top - toolbarHeight - margin },
        { x: centeredX, y: rect.bottom + margin },
        { x: rect.right + margin, y: centeredY },
        { x: rect.left - toolbarWidth - margin, y: centeredY },
      ].map(candidate => ({
        x: clamp(candidate.x, margin, maxX),
        y: clamp(candidate.y, margin, maxY),
      }));

      nextPosition = candidates.find(candidate => !rectsOverlap(candidate.x, candidate.y, rect)) ||
        candidates.reduce((best, candidate) => {
          return overlapArea(candidate.x, candidate.y, rect) < overlapArea(best.x, best.y, rect) ? candidate : best;
        }, candidates[0]);
    }

    setAdjustedPosition(current => (
      current.x === nextPosition.x && current.y === nextPosition.y ? current : nextPosition
    ));
  }, [position, isMobile, showColorPicker, showLabelInput, showFormulaInput]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
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
      className="fixed z-[9999] bg-theme-paper border border-theme-border rounded-button shadow-lg"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className={`flex items-center gap-0.5 p-1 ${isMobile ? 'flex-wrap justify-center max-w-[280px]' : ''}`}>
        {/* Text Style Buttons */}
        <Tooltip content="Bold">
          <button
            className={`${buttonClass} ${iconSize} font-bold ${format.bold ? activeClass : 'text-theme-ink'}`}
            onClick={() => onFormatChange({ bold: !format.bold })}
          >
            B
          </button>
        </Tooltip>
        <Tooltip content="Italic">
          <button
            className={`${buttonClass} ${iconSize} italic ${format.italic ? activeClass : 'text-theme-ink'}`}
            onClick={() => onFormatChange({ italic: !format.italic })}
          >
            I
          </button>
        </Tooltip>
        <Tooltip content="Underline">
          <button
            className={`${buttonClass} ${iconSize} underline ${format.underline ? activeClass : 'text-theme-ink'}`}
            onClick={() => onFormatChange({ underline: !format.underline })}
          >
            U
          </button>
        </Tooltip>
        <Tooltip content="Strikethrough">
          <button
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
              className={`${buttonClass} ${iconSize} text-theme-ink`}
              onClick={() => setShowColorPicker(!showColorPicker)}
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
            <div 
              className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-theme-paper border border-theme-border rounded-button shadow-lg p-2 z-10"
              style={{ minWidth: '160px' }}
            >
              {/* No color option */}
              <Tooltip content="No color">
                <button
                  className={`w-full h-7 rounded border mb-1 ${!format.bgColor ? 'border-theme-accent ring-2 ring-theme-accent' : 'border-theme-border'} bg-theme-paper relative`}
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

        {/* Divider */}
        <div className="w-px h-5 bg-theme-border mx-1" />

        {/* Label button */}
        <Tooltip content={labelTooltip}>
          <button
            className={`${buttonClass} ${iconSize} ${isLabelButtonDisabled ? 'text-theme-muted opacity-40 cursor-not-allowed' : cellLabel ? 'bg-theme-accent text-theme-paper' : 'text-theme-ink'}`}
            onClick={() => {
              if (isLabelButtonDisabled) return;
              setShowLabelInput(!showLabelInput);
              setShowFormulaInput(false);
              setShowColorPicker(false);
              setLabelDraft(cellLabel || '');
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
          </button>
        </Tooltip>

        {/* Formula button */}
        <Tooltip content={cellFormula ? `Formula: ${cellFormula}` : 'Set formula'}>
          <button
            className={`${buttonClass} ${iconSize} font-bold ${cellFormula ? 'bg-theme-accent text-theme-paper' : 'text-theme-ink'}`}
            onClick={() => {
              setShowFormulaInput(!showFormulaInput);
              setShowLabelInput(false);
              setShowColorPicker(false);
              setFormulaDraft(cellFormula || '');
            }}
          >
            <span className="italic" style={{ fontSize: '11px' }}>fx</span>
          </button>
        </Tooltip>
      </div>

      {/* Label input panel */}
      {showLabelInput && (
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

      {/* Formula input panel */}
      {showFormulaInput && (
        <div className="px-2 pb-2 border-t border-theme-border/50">
          <div className="flex items-center gap-1 mt-1.5 mb-1">
            <span className="italic font-bold text-theme-accent text-[10px]">fx</span>
            <span className="text-[10px] font-medium text-theme-ink">Formula</span>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={formulaDraft}
              onChange={(e) => setFormulaDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isCircular) {
                  const trimmed = formulaDraft.trim();
                  onFormulaChange(trimmed || undefined);
                  setShowFormulaInput(false);
                }
                if (e.key === 'Escape') setShowFormulaInput(false);
              }}
              placeholder="e.g. @str * 2 + 5"
              className="flex-1 px-1.5 py-0.5 border border-theme-border rounded bg-theme-paper text-theme-ink text-[10px] font-mono focus:outline-none focus:border-theme-accent"
              autoFocus
              onMouseDown={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => {
                if (isCircular) return;
                const trimmed = formulaDraft.trim();
                onFormulaChange(trimmed || undefined);
                setShowFormulaInput(false);
              }}
              disabled={isCircular}
              className={`px-1.5 py-0.5 bg-theme-accent text-theme-paper rounded text-[10px] hover:opacity-90 ${isCircular ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              Set
            </button>
            {cellFormula && (
              <button
                onClick={() => {
                  setFormulaDraft('');
                  onFormulaChange(undefined);
                  setShowFormulaInput(false);
                }}
                className="px-1.5 py-0.5 border border-red-300 text-red-500 rounded text-[10px] hover:bg-red-50"
              >
                ×
              </button>
            )}
          </div>

          {/* Self-reference warning */}
          {isSelfReferencing && (
            <p className="text-[9px] text-red-500 mt-0.5">
              {labelScope === 'column' ? 'A column formula cannot reference labels generated by that same column' : labelScope === 'row' ? 'A row formula cannot reference labels generated by that same row' : `A formula cannot reference its own label (@${cellLabel})`}
            </p>
          )}

          {/* Circular reference warning */}
          {!isSelfReferencing && circularPath && (
            <p className="text-[9px] text-red-500 mt-0.5">
              Circular reference: {circularPath.map(l => `@${l}`).join(' → ')}
            </p>
          )}

          {/* Formula preview */}
          {formulaDraft && !isCircular && (
            <div className="mt-0.5 flex items-center gap-1">
              <span className="text-[9px] text-theme-muted">Result:</span>
              <span className={`text-[10px] font-bold ${formulaPreview !== null ? 'text-theme-accent' : 'text-red-500'}`}>
                {formulaPreview !== null ? formulaPreview : 'Invalid'}
              </span>
            </div>
          )}

          {/* Available labels */}
          {availableLabels.length > 0 && (
            <div className="mt-1">
              <p className="text-[9px] text-theme-muted mb-0.5">Available labels (click to insert):</p>
              <div className="flex flex-wrap gap-0.5 max-h-16 overflow-y-auto">
                {availableLabels.filter(l => l.label !== cellLabel && !excludedFormulaLabelSet.has(l.label)).map((l, i) => (
                  <button
                    key={`${l.label}-${i}`}
                    type="button"
                    onClick={() => setFormulaDraft(prev => prev + `@${l.label}`)}
                    className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] bg-theme-accent/10 text-theme-accent border border-theme-accent/20 hover:bg-theme-accent/25 transition-colors cursor-pointer"
                    title={`${l.widgetLabel} (${l.sheetName}) = ${l.value}`}
                  >
                    @{l.label}
                    <span className="text-theme-muted ml-0.5">={l.value}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[9px] text-theme-muted">
            <span>Use @label to reference values. Supports math functions, IF(), SWITCH(), ranges like 1..5, THRESHOLD(), VALUE(@column, row), SUM(@column), and SUM(@qty * @weight)</span>
            <FormulaHelpDetailsButton className="text-[9px]" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function TableWidget({ widget, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const characters = useStore((state) => state.characters);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const mode = useStore((state) => state.mode);
  const isPrintMode = mode === 'print';
  
  const { 
    label, 
    columns = ['Item', 'Qty', 'Weight'],
    rows = [],
    tableColumnSettings = [],
    tableRowSettings = [],
    showTableEditButton = true
  } = widget.data;
  
  const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null);
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState<ToolbarPosition>({ x: 0, y: 0 });
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
  const [dragOverRowIndex, setDragOverRowIndex] = useState<number | null>(null);
  const [columnPendingRemoval, setColumnPendingRemoval] = useState<number | null>(null);
  const [isTableEditing, setIsTableEditing] = useState(false);
  const [editingColumnHeader, setEditingColumnHeader] = useState<number | null>(null);
  const showTableControls = isTableEditing && !isPrintMode;
  const dragRowItem = useRef<number | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [touchStart, setTouchStart] = useState<{ row: number; col: number } | null>(null);
  const touchUiSnapshotRef = useRef<{
    editingCell: { row: number; col: number } | null;
    selectedCell: { row: number; col: number } | null;
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
  
  // Calculate table area height
  const labelHeight = 16;
  const gapSize = 4;
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

  const handleFormatChange = (rowIdx: number, colIdx: number, formatUpdate: Partial<CellFormat>) => {
    const newRows = [...rows];
    const currentCell = newRows[rowIdx].cells[colIdx];
    const currentValue = getCellValue(currentCell);
    const currentFormat = getCellFormat(currentCell);
    const currentLabel = getCellLabel(currentCell);
    const currentFormula = getCellFormula(currentCell);
    
    newRows[rowIdx] = { 
      ...newRows[rowIdx], 
      cells: [...newRows[rowIdx].cells]
    };
    
    const newFormat = { ...currentFormat, ...formatUpdate };
    // Clean up undefined values
    Object.keys(newFormat).forEach(key => {
      if (newFormat[key as keyof CellFormat] === undefined) {
        delete newFormat[key as keyof CellFormat];
      }
    });
    
    newRows[rowIdx].cells[colIdx] = createCell(currentValue, Object.keys(newFormat).length > 0 ? newFormat : undefined, currentLabel, currentFormula);
    updateWidgetData(widget.id, { rows: newRows });
  };

  const handleColumnFormatChange = (colIdx: number, formatUpdate: Partial<CellFormat>) => {
    const currentColumnFormat = getColumnSetting(tableColumnSettings, colIdx).format || {};
    const nextFormat = cleanFormat({ ...currentColumnFormat, ...formatUpdate });
    const newColumnSettings = updateColumnSettings(colIdx, { format: nextFormat });
    const newRows = rows.map((row: TableRow) => {
      const currentCell = row.cells[colIdx] ?? '';
      const currentValue = getCellValue(currentCell);
      const currentLabel = getCellLabel(currentCell);
      const currentFormula = getCellFormula(currentCell);
      return {
        ...row,
        cells: row.cells.map((cell, cellIdx) => (
          cellIdx === colIdx ? createCell(currentValue, nextFormat, currentLabel, currentFormula) : cell
        ))
      };
    });

    updateWidgetData(widget.id, { rows: newRows, tableColumnSettings: newColumnSettings });
  };

  const handleRowFormatChange = (rowIdx: number, formatUpdate: Partial<CellFormat>) => {
    const currentRowFormat = getRowSetting(tableRowSettings, rowIdx).format || {};
    const nextFormat = cleanFormat({ ...currentRowFormat, ...formatUpdate });
    const newRowSettings = updateRowSettings(rowIdx, { format: nextFormat });
    const newRows = rows.map((row: TableRow, currentRowIdx: number) => {
      if (currentRowIdx !== rowIdx) return row;
      return {
        ...row,
        cells: row.cells.map(cell => createCell(getCellValue(cell), nextFormat, getCellLabel(cell), getCellFormula(cell)))
      };
    });

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

  const handleCellClick = (rowIdx: number, colIdx: number, event: React.MouseEvent<HTMLElement>) => {
    // Always enter edit mode on click, show toolbar alongside
    setEditingCell({ row: rowIdx, col: colIdx });
    setSelectedCell({ row: rowIdx, col: colIdx });
    setSelectedColumn(null);
    setSelectedRow(null);
    setToolbarPos(getToolbarPositionForElement(event.currentTarget));
    setShowToolbar(true);
  };

  const handleColumnHeaderClick = (colIdx: number, event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setEditingCell(null);
    setEditingColumnHeader(null);
    setSelectedCell(null);
    setSelectedColumn(colIdx);
    setSelectedRow(null);
    setToolbarPos(getToolbarPositionForElement(event.currentTarget));
    setShowToolbar(true);
  };

  const handleRowFormatClick = (rowIdx: number, event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setEditingCell(null);
    setSelectedCell(null);
    setSelectedColumn(null);
    setSelectedRow(rowIdx);
    setToolbarPos(getToolbarPositionForElement(event.currentTarget));
    setShowToolbar(true);
  };

  const handleCellDoubleClick = (_rowIdx: number, _colIdx: number) => {
    // No longer needed since single click now enters edit mode
  };

  const closeTableSelection = () => {
    setEditingCell(null);
    setEditingColumnHeader(null);
    setSelectedCell(null);
    setSelectedColumn(null);
    setSelectedRow(null);
    setShowToolbar(false);
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

  const removeRow = (indexToRemove: number) => {
    closeTableSelection();
    updateWidgetData(widget.id, {
      rows: rows.filter((_, index) => index !== indexToRemove),
      tableRowSettings: rows
        .map((_, index) => getRowSetting(tableRowSettings, index))
        .filter((_, index) => index !== indexToRemove),
    });
  };

  const requestColumnRemoval = (index: number) => {
    closeTableSelection();
    setColumnPendingRemoval(index);
  };

  const confirmColumnRemoval = () => {
    if (columnPendingRemoval === null) return;

    if (columns.length > 1) {
      updateWidgetData(widget.id, {
        columns: columns.filter((_, index) => index !== columnPendingRemoval),
        rows: rows.map((row: TableRow) => ({
          ...row,
          cells: columns
            .map((_, index) => row.cells[index] ?? '')
            .filter((_, index) => index !== columnPendingRemoval),
        })),
        tableColumnSettings: columns
          .map((_, index) => getColumnSetting(tableColumnSettings, index))
          .filter((_, index) => index !== columnPendingRemoval),
      });
    }

    setColumnPendingRemoval(null);
  };

  useEffect(() => {
    if (columnPendingRemoval === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setColumnPendingRemoval(null);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [columnPendingRemoval]);

  // Row drag handlers
  const moveRowToInsertion = (fromIndex: number, insertionIndex: number) => {
    if (insertionIndex === fromIndex || insertionIndex === fromIndex + 1) return;

    const newRows = [...rows];
    const newRowSettings = rows.map((_, index) => getRowSetting(tableRowSettings, index));
    const [movedRow] = newRows.splice(fromIndex, 1);
    const [movedRowSetting] = newRowSettings.splice(fromIndex, 1);
    const adjustedIndex = insertionIndex > fromIndex ? insertionIndex - 1 : insertionIndex;
    newRows.splice(adjustedIndex, 0, movedRow);
    newRowSettings.splice(adjustedIndex, 0, movedRowSetting);
    updateWidgetData(widget.id, { rows: newRows, tableRowSettings: newRowSettings });
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
      if (tableRef.current && !tableRef.current.contains(e.target as Node)) {
        setShowToolbar(false);
        setSelectedCell(null);
        setSelectedColumn(null);
        setSelectedRow(null);
      }
    };
    
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, []);

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
    const snapshot = touchUiSnapshotRef.current;
    if (snapshot) {
      setEditingCell(snapshot.editingCell);
      setSelectedCell(snapshot.selectedCell);
      setSelectedColumn(snapshot.selectedColumn);
      setSelectedRow(snapshot.selectedRow);
      setShowToolbar(snapshot.showToolbar);
      setToolbarPos(snapshot.toolbarPos);
      touchUiSnapshotRef.current = null;
    }
  });

  const handleTouchStart = (rowIdx: number, colIdx: number, e: React.TouchEvent<HTMLElement>) => {
    captureTouchUiState();
    const targetElement = e.currentTarget;
    setTouchStart({ row: rowIdx, col: colIdx });
    longPressTimer.current = setTimeout(() => {
      // Long press - show toolbar
      setSelectedCell({ row: rowIdx, col: colIdx });
      setSelectedColumn(null);
      setSelectedRow(null);
      setToolbarPos(getToolbarPositionForElement(targetElement));
      setShowToolbar(true);
      longPressTimer.current = null;
    }, 500);
  };

  const handleTouchEnd = (rowIdx: number, colIdx: number, e: React.TouchEvent<HTMLElement>) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      
      // Quick tap - enter edit mode and show toolbar
      if (touchStart?.row === rowIdx && touchStart?.col === colIdx) {
        setEditingCell({ row: rowIdx, col: colIdx });
        setSelectedCell({ row: rowIdx, col: colIdx });
        setSelectedColumn(null);
        setSelectedRow(null);
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
  const selectedColumnGeneratedLabels = selectedColumnLabel ? rows.map((_, index) => `${selectedColumnLabel}${index + 1}`) : [];
  const selectedColumnRowLabels = selectedColumn !== null ? rows.map((_, index) => getRowSetting(tableRowSettings, index).label).filter((rowLabel): rowLabel is string => !!rowLabel) : [];
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
  const selectedColumnCanAssignLabel = selectedColumn === null || rows.every((row: TableRow) => {
    const value = getCellValue(row.cells[selectedColumn] ?? '');
    return value === '' || !isNaN(Number(value));
  });
  const selectedRowSetting = selectedRow !== null ? getRowSetting(tableRowSettings, selectedRow) : null;
  const selectedRowLabel = selectedRowSetting?.label;
  const selectedRowGeneratedLabels = selectedRowLabel ? columns.map((_, index) => `${selectedRowLabel}${index + 1}`) : [];
  const selectedRowColumnLabels = selectedRow !== null ? columns.map((_, colIndex) => getColumnSetting(tableColumnSettings, colIndex).label).filter((columnLabel): columnLabel is string => !!columnLabel) : [];
  const selectedRowColumnGeneratedLabels = selectedRow !== null ? selectedRowColumnLabels.map(columnLabel => `${columnLabel}${selectedRow + 1}`) : [];
  const selectedRowFormulaLabels = [
    ...(selectedRowLabel ? [selectedRowLabel] : []),
    ...selectedRowGeneratedLabels,
    ...selectedRowColumnLabels,
    ...selectedRowColumnGeneratedLabels,
  ];
  const selectedRowCanAssignLabel = selectedRow === null || (rows[selectedRow]?.cells || []).every(cell => {
    const value = getCellValue(cell);
    return value === '' || !isNaN(Number(value));
  });

  return (
    <div ref={tableRef} className={`flex flex-col ${gapClass} w-full h-full`}>
      {(label || !isPrintMode) && (
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
                closeTableSelection();
                setIsTableEditing((current) => !current);
              }}
              onMouseDown={(event) => event.stopPropagation()}
              className={`widget-control ml-auto h-6 flex-shrink-0 gap-1 px-2 text-[10px] font-semibold ${isTableEditing ? 'bg-theme-accent text-theme-paper' : ''}`}
            >
              {isTableEditing ? <CheckIcon className="h-3 w-3" /> : <PencilIcon className="h-3 w-3" />}
              {isTableEditing ? 'Done' : 'Edit table'}
            </button>
          )}
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
        <table className={`w-full ${cellClass}`} style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead className="sticky top-0 z-10">
            <tr>
              {showTableControls && <th className="w-5 bg-transparent" />}
              {columns.map((col: string, idx: number) => {
                const columnSetting = getColumnSetting(tableColumnSettings, idx);
                const columnFormat = columnSetting.format || {};
                const isSelected = selectedColumn === idx;
                const isEditingHeader = editingColumnHeader === idx;
                const needsDarkText = columnFormat.bgColor ? isLightColor(columnFormat.bgColor, columnFormat.bgOpacity ?? 1) : false;
                const textColorStyle = needsDarkText ? { color: '#1a1a1a' } : {};

                return (
                <th
                  key={idx}
                  className={`group/column relative border border-theme-border bg-theme-background ${cellClass} ${needsDarkText ? '' : 'text-theme-ink'} font-heading ${isSelected ? 'ring-2 ring-theme-accent ring-inset' : ''}`}
                  style={{
                    ...getCellStyle(columnFormat),
                    ...textColorStyle,
                    borderLeftWidth: idx === 0 ? 1 : 0
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div
                    onClick={() => {
                      if (showTableControls) setEditingColumnHeader(idx);
                    }}
                    className={`relative flex min-w-0 items-center justify-center ${showTableControls ? 'cursor-text' : ''}`}
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
                        className={`w-full min-w-0 bg-transparent p-0 text-center font-heading focus:outline-none ${needsDarkText ? '' : 'text-theme-ink'}`}
                        style={textColorStyle}
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
          </thead>
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
                  const cellValue = getCellValue(cell);
                  const columnSetting = getColumnSetting(tableColumnSettings, colIdx);
                  const rowSetting = getRowSetting(tableRowSettings, rowIdx);
                  const cellFormat = getEffectiveCellFormat(cell, columnSetting, rowSetting);
                  const cellFml = getCellFormula(cell) || rowSetting.formula || columnSetting.formula;
                  const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === colIdx;
                  const isEditing = editingCell?.row === rowIdx && editingCell?.col === colIdx;
                  const needsDarkText = cellFormat.bgColor ? isLightColor(cellFormat.bgColor, cellFormat.bgOpacity ?? 1) : false;
                  // Use inline style with dark color (#1a1a1a) for light backgrounds to ensure readability
                  const textColorStyle = needsDarkText ? { color: '#1a1a1a' } : {};
                  
                  return (
                    <td 
                      key={colIdx} 
                      className={`border border-theme-border ${isSelected ? 'ring-2 ring-theme-accent ring-inset' : selectedRow === rowIdx ? 'ring-1 ring-theme-accent/70 ring-inset' : ''} ${cellClass} ${needsDarkText ? '' : 'text-theme-ink'}`}
                      style={{ 
                        ...getCellStyle(cellFormat),
                        ...textColorStyle,
                        borderTopWidth: 0,
                        borderLeftWidth: colIdx === 0 ? 1 : 0,
                      }}
                    >
                      <div 
                        onClick={(e) => handleCellClick(rowIdx, colIdx, e)}
                        onDoubleClick={() => handleCellDoubleClick(rowIdx, colIdx)}
                        onTouchStart={(e) => handleTouchStart(rowIdx, colIdx, e)}
                        onTouchEnd={(e) => handleTouchEnd(rowIdx, colIdx, e)}
                        onTouchMove={handleTouchMove}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={`relative min-h-[1.5em] cursor-pointer hover:opacity-70 font-body flex leading-[1.5] ${getCellTextClass(cellFormat)}`}
                        style={{
                          ...getCellContentStyle(cellFormat),
                          ...textColorStyle,
                          justifyContent: cellFormat.hAlign === 'center' ? 'center' : cellFormat.hAlign === 'right' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <span className={`block min-w-0 whitespace-pre-wrap break-words ${isEditing ? 'invisible' : ''}`}>
                          {cellValue || <span className={`text-theme-muted ${isPrintMode ? 'opacity-0' : ''}`}>-</span>}
                        </span>
                        {cellFml && isFormulaBroken(cellFml, formulaLabels) && (
                          <span className={`text-red-500 ml-0.5 text-[9px] flex-shrink-0 ${isEditing ? 'invisible' : ''}`} title={`Broken formula: ${cellFml}`}>⚠</span>
                        )}
                        {isEditing && (
                          <textarea
                            autoFocus
                            rows={1}
                            value={cellValue}
                            onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                            readOnly={!!cellFml}
                            onBlur={() => setEditingCell(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setEditingCell(null);
                              } else if (e.key === 'Tab') {
                                e.preventDefault();
                                if (e.shiftKey) {
                                  if (colIdx > 0) {
                                    setEditingCell({ row: rowIdx, col: colIdx - 1 });
                                    setSelectedCell({ row: rowIdx, col: colIdx - 1 });
                                  } else if (rowIdx > 0) {
                                    setEditingCell({ row: rowIdx - 1, col: columns.length - 1 });
                                    setSelectedCell({ row: rowIdx - 1, col: columns.length - 1 });
                                  }
                                } else {
                                  if (colIdx < columns.length - 1) {
                                    setEditingCell({ row: rowIdx, col: colIdx + 1 });
                                    setSelectedCell({ row: rowIdx, col: colIdx + 1 });
                                  } else if (rowIdx < rows.length - 1) {
                                    setEditingCell({ row: rowIdx + 1, col: 0 });
                                    setSelectedCell({ row: rowIdx + 1, col: 0 });
                                  }
                                }
                              } else if (e.key === 'Escape') {
                                setEditingCell(null);
                              }
                            }}
                            className={`absolute inset-0 block w-full min-w-0 h-full bg-transparent border-0 p-0 resize-none overflow-hidden focus:outline-none text-[10px] leading-[1.5] whitespace-pre-wrap break-words ${needsDarkText ? '' : 'text-theme-ink'} font-body ${getCellTextClass(cellFormat)}`}
                            style={{ textAlign: cellFormat.hAlign || 'left', ...textColorStyle }}
                            onMouseDown={(e) => e.stopPropagation()}
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

      {columnPendingRemoval !== null && createPortal(
        <div
          data-touch-camera-ignore="true"
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4"
          onClick={() => setColumnPendingRemoval(null)}
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
              Remove column {columnPendingRemoval + 1}?
            </h3>
            <p id={`table-remove-description-${widget.id}`} className="mt-2 text-sm text-theme-muted">
              This column and all of its values, labels, formulas, and formatting will be removed.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setColumnPendingRemoval(null)}
                className="widget-control px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmColumnRemoval}
                className="min-h-8 rounded-button border border-red-700 bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                Remove column
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Formatting Toolbar - rendered via portal to escape transformed container */}
      {showToolbar && selectedCell && createPortal(
        <FormatToolbar
          format={getCellFormat(rows[selectedCell.row]?.cells[selectedCell.col])}
          onFormatChange={(formatUpdate) => handleFormatChange(selectedCell.row, selectedCell.col, formatUpdate)}
          onClose={() => {
            setShowToolbar(false);
            setSelectedCell(null);
            setSelectedColumn(null);
            setSelectedRow(null);
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
      {showToolbar && selectedColumn !== null && createPortal(
        <FormatToolbar
          format={selectedColumnSetting?.format || {}}
          onFormatChange={(formatUpdate) => handleColumnFormatChange(selectedColumn, formatUpdate)}
          onClose={() => {
            setShowToolbar(false);
            setSelectedCell(null);
            setSelectedColumn(null);
            setSelectedRow(null);
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
      {showToolbar && selectedRow !== null && createPortal(
        <FormatToolbar
          format={selectedRowSetting?.format || {}}
          onFormatChange={(formatUpdate) => handleRowFormatChange(selectedRow, formatUpdate)}
          onClose={() => {
            setShowToolbar(false);
            setSelectedCell(null);
            setSelectedColumn(null);
            setSelectedRow(null);
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






