import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Widget, TableRow, TableCell, CellFormat } from '../../types';
import { useStore } from '../../store/useStore';
import { evaluateFormula, collectLabels, getAvailableLabels, detectCircularReference, isFormulaBroken } from '../../utils/formulaEngine';
import { Tooltip } from '../Tooltip';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
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
  position: { x: number; y: number };
  isMobile: boolean;
  usedColors: ColorWithOpacity[];
  cellValue: string;
  cellLabel?: string;
  cellFormula?: string;
  onLabelChange: (label: string | undefined) => void;
  onFormulaChange: (formula: string | undefined) => void;
  character: any;
}

function FormatToolbar({ format, onFormatChange, onClose, position, isMobile, usedColors, cellValue, cellLabel, cellFormula, onLabelChange, onFormulaChange, character }: FormatToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [showFormulaInput, setShowFormulaInput] = useState(false);
  const [labelDraft, setLabelDraft] = useState(cellLabel || '');
  const [formulaDraft, setFormulaDraft] = useState(cellFormula || '');

  const isNumeric = cellValue === '' || !isNaN(Number(cellValue));
  const canAssignLabel = isNumeric;

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
    if (!formulaDraft || !cellLabel) return false;
    const refs = formulaDraft.match(/@([a-zA-Z_][a-zA-Z0-9_]*)/g);
    if (!refs) return false;
    return refs.some(r => r.slice(1) === cellLabel);
  }, [formulaDraft, cellLabel]);

  // Circular reference check
  const circularPath = useMemo(() => {
    if (!formulaDraft || !cellLabel || !character || isSelfReferencing) return null;
    return detectCircularReference(cellLabel, formulaDraft, character);
  }, [formulaDraft, cellLabel, character, isSelfReferencing]);

  const isCircular = isSelfReferencing || circularPath !== null;

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
        left: isMobile ? '50%' : position.x,
        top: isMobile ? '16px' : position.y,
        transform: isMobile ? 'translateX(-50%)' : 'none',
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
        <Tooltip content={cellLabel ? `Label: @${cellLabel}` : canAssignLabel ? 'Set variable label' : 'Cell must contain a number to assign a label'}>
          <button
            className={`${buttonClass} ${iconSize} ${cellLabel ? 'bg-theme-accent text-theme-paper' : canAssignLabel ? 'text-theme-ink' : 'text-theme-muted opacity-40 cursor-not-allowed'}`}
            onClick={() => {
              if (!canAssignLabel && !cellLabel) return;
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
            <span className="text-[10px] font-medium text-theme-ink">Variable Label</span>
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
            Others can reference this as <span className="font-mono">@{labelDraft || 'name'}</span> in formulas
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
              A formula cannot reference its own label (@{cellLabel})
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
                {availableLabels.filter(l => l.label !== cellLabel).map((l, i) => (
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

          <p className="text-[9px] text-theme-muted mt-0.5">
            Use @label to reference values. Supports +, −, *, /, parentheses, floor(), ceil(), round()
          </p>
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
    rows = []
  } = widget.data;
  
  const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null);
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
  const [dragOverRowIndex, setDragOverRowIndex] = useState<number | null>(null);
  const dragRowItem = useRef<number | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Collect all used colors (with opacity) from the character's table widgets
  const usedColors = useMemo(() => {
    const activeChar = characters.find(c => c.id === activeCharacterId);
    if (!activeChar) return [];
    
    const colorMap = new Map<string, ColorWithOpacity>();
    
    // Go through all sheets and widgets
    activeChar.sheets.forEach(sheet => {
      sheet.widgets.forEach(w => {
        if (w.type === 'TABLE' && w.data.rows) {
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
  const labelClass = 'text-xs';
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
    const currentFormula = getCellFormula(currentCell);
    
    // If cell has a label, only allow numeric input
    if (currentLabel && value !== '' && isNaN(Number(value))) return;
    // If cell has a formula, don't allow manual editing
    if (currentFormula) return;
    
    newRows[rowIdx] = { 
      ...newRows[rowIdx], 
      cells: [...newRows[rowIdx].cells]
    };
    newRows[rowIdx].cells[colIdx] = createCell(value, currentFormat, currentLabel, currentFormula);
    updateWidgetData(widget.id, { rows: newRows });
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

  const handleCellClick = (rowIdx: number, colIdx: number, event: React.MouseEvent) => {
    // Always enter edit mode on click, show toolbar alongside
    setEditingCell({ row: rowIdx, col: colIdx });
    setSelectedCell({ row: rowIdx, col: colIdx });
    
    // Calculate toolbar position
    const clientX = event.clientX;
    const clientY = event.clientY;
    const toolbarWidth = 320;
    setToolbarPos({
      x: Math.max(8, Math.min(clientX - toolbarWidth / 2, window.innerWidth - toolbarWidth - 8)),
      y: Math.max(8, clientY - 50)
    });
    setShowToolbar(true);
  };

  const handleCellDoubleClick = (_rowIdx: number, _colIdx: number) => {
    // No longer needed since single click now enters edit mode
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
      newRows.splice(toIndex, 0, movedRow);
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
    const touch = e.touches[0];
    const tableBody = tableRef.current?.querySelector('tbody');
    const scrollContainer = tableRef.current?.querySelector('.overflow-auto') as HTMLElement | null;
    
    if (tableBody) {
      const rowElements = Array.from(tableBody.querySelectorAll('tr')) as HTMLTableRowElement[];
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
    
    // Calculate which row we're hovering over based on touch position
    let accumulatedHeight = 0;
    let targetIndex = -1;
    
    const tableBody = tableRef.current?.querySelector('tbody');
    if (tableBody) {
      const tableRect = tableBody.getBoundingClientRect();
      const relativeY = touch.clientY - tableRect.top + (scrollContainer?.scrollTop || 0);
      
      for (let i = 0; i < rowHeights.length; i++) {
        accumulatedHeight += rowHeights[i];
        if (relativeY < accumulatedHeight) {
          targetIndex = i;
          break;
        }
      }
      
      // If we're past all rows, target the last row
      if (targetIndex === -1 && rowHeights.length > 0) {
        targetIndex = rowHeights.length - 1;
      }
    }
    
    if (targetIndex !== -1 && targetIndex !== fromIndex) {
      setDragOverRowIndex(targetIndex);
    } else {
      setDragOverRowIndex(null);
    }
    
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
    
    if (toIndex !== null && fromIndex !== toIndex) {
      const newRows = [...rows];
      const [movedRow] = newRows.splice(fromIndex, 1);
      newRows.splice(toIndex, 0, movedRow);
      updateWidgetData(widget.id, { rows: newRows });
    }
    
    touchDragState.current = null;
    dragRowItem.current = null;
    setDraggedRowIndex(null);
    setDragOverRowIndex(null);
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
      }
    };
    
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  // Touch long press handling
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [touchStart, setTouchStart] = useState<{ row: number; col: number } | null>(null);

  const handleTouchStart = (rowIdx: number, colIdx: number) => {
    setTouchStart({ row: rowIdx, col: colIdx });
    longPressTimer.current = setTimeout(() => {
      // Long press - show toolbar
      setSelectedCell({ row: rowIdx, col: colIdx });
      setShowToolbar(true);
      longPressTimer.current = null;
    }, 500);
  };

  const handleTouchEnd = (rowIdx: number, colIdx: number, e: React.TouchEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      
      // Quick tap - enter edit mode and show toolbar
      if (touchStart?.row === rowIdx && touchStart?.col === colIdx) {
        setEditingCell({ row: rowIdx, col: colIdx });
        setSelectedCell({ row: rowIdx, col: colIdx });
        
        // Position toolbar at bottom for mobile
        setShowToolbar(true);
        e.preventDefault();
      }
    }
    setTouchStart(null);
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setTouchStart(null);
  };

  return (
    <div ref={tableRef} className={`flex flex-col ${gapClass} w-full h-full`}>
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
        <table className={`w-full ${cellClass}`} style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="w-4 bg-transparent"></th>
              {columns.map((col: string, idx: number) => (
                <th 
                  key={idx} 
                  className={`border border-theme-border bg-theme-background ${cellClass} text-theme-ink font-heading`}
                  style={{ borderLeftWidth: idx === 0 ? 1 : 0 }}
                >
                  {col}
                </th>
              ))}
              <th className="w-4 bg-transparent"></th>
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
                  onTouchStart={(e) => handleRowTouchStart(e, rowIdx)}
                  onTouchMove={handleRowTouchMove}
                  onTouchEnd={handleRowTouchEnd}
                >
                  <div className={`text-theme-muted hover:text-theme-ink text-[10px] text-center touch-none select-none ${isPrintMode ? 'opacity-0' : ''}`}>
                    ⠿
                  </div>
                </td>
                {row.cells.map((cell, colIdx: number) => {
                  const cellValue = getCellValue(cell);
                  const cellFormat = getCellFormat(cell);
                  const cellFml = getCellFormula(cell);
                  const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === colIdx;
                  const isEditing = editingCell?.row === rowIdx && editingCell?.col === colIdx;
                  const needsDarkText = cellFormat.bgColor ? isLightColor(cellFormat.bgColor, cellFormat.bgOpacity ?? 1) : false;
                  // Use inline style with dark color (#1a1a1a) for light backgrounds to ensure readability
                  const textColorStyle = needsDarkText ? { color: '#1a1a1a' } : {};
                  
                  return (
                    <td 
                      key={colIdx} 
                      className={`${isSelected ? 'border-theme-accent border-2' : 'border border-theme-border'} ${cellClass} ${needsDarkText ? '' : 'text-theme-ink'}`}
                      style={{ 
                        ...getCellStyle(cellFormat),
                        ...textColorStyle,
                        borderTopWidth: 0,
                        borderLeftWidth: colIdx === 0 ? 1 : 0,
                      }}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
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
                          className={`w-full bg-transparent focus:outline-none text-[10px] ${needsDarkText ? '' : 'text-theme-ink'} font-body ${getCellTextClass(cellFormat)}`}
                          style={{ textAlign: cellFormat.hAlign || 'left', ...textColorStyle }}
                          onMouseDown={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div 
                          onClick={(e) => handleCellClick(rowIdx, colIdx, e)}
                          onDoubleClick={() => handleCellDoubleClick(rowIdx, colIdx)}
                          onTouchStart={() => handleTouchStart(rowIdx, colIdx)}
                          onTouchEnd={(e) => handleTouchEnd(rowIdx, colIdx, e)}
                          onTouchMove={handleTouchMove}
                          onMouseDown={(e) => e.stopPropagation()}
                          className={`min-h-[1.5em] cursor-pointer hover:opacity-70 font-body flex ${getCellTextClass(cellFormat)}`}
                          style={{
                            ...getCellContentStyle(cellFormat),
                            ...textColorStyle,
                            justifyContent: cellFormat.hAlign === 'center' ? 'center' : cellFormat.hAlign === 'right' ? 'flex-end' : 'flex-start',
                          }}
                        >
                          {cellValue || <span className={`text-theme-muted ${isPrintMode ? 'opacity-0' : ''}`}>-</span>}
                          {cellFml && isFormulaBroken(cellFml, formulaLabels) && (
                            <span className="text-red-500 ml-0.5 text-[9px] flex-shrink-0" title={`Broken formula: ${cellFml}`}>⚠</span>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className={`w-4 p-0`}>
                  <button
                    onClick={() => clearRow(rowIdx)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`w-full h-full text-theme-muted hover:text-theme-ink opacity-0 group-hover:opacity-100 ${isPrintMode ? '!opacity-0' : ''}`}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Formatting Toolbar - rendered via portal to escape transformed container */}
      {showToolbar && selectedCell && createPortal(
        <FormatToolbar
          format={getCellFormat(rows[selectedCell.row]?.cells[selectedCell.col])}
          onFormatChange={(formatUpdate) => handleFormatChange(selectedCell.row, selectedCell.col, formatUpdate)}
          onClose={() => {
            setShowToolbar(false);
            setSelectedCell(null);
          }}
          position={toolbarPos}
          isMobile={isMobile}
          usedColors={usedColors}
          cellValue={getCellValue(rows[selectedCell.row]?.cells[selectedCell.col])}
          cellLabel={getCellLabel(rows[selectedCell.row]?.cells[selectedCell.col])}
          cellFormula={getCellFormula(rows[selectedCell.row]?.cells[selectedCell.col])}
          onLabelChange={(l) => handleCellLabelChange(selectedCell.row, selectedCell.col, l)}
          onFormulaChange={(f) => handleCellFormulaChange(selectedCell.row, selectedCell.col, f)}
          character={activeChar}
        />,
        document.body
      )}
    </div>
  );
}






