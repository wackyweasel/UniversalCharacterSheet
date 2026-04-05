import { create } from 'zustand';

export interface PrintArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PaperFormat = 'none' | 'a4' | 'letter';

// Aspect ratios (width / height) for paper formats in portrait orientation
export const PAPER_ASPECT_RATIOS: Record<PaperFormat, number | null> = {
  none: null,
  a4: 210 / 297,       // ~0.7071
  letter: 8.5 / 11,    // ~0.7727
};

export function getEffectiveAspectRatio(format: PaperFormat, landscape: boolean): number | null {
  const ratio = PAPER_ASPECT_RATIOS[format];
  if (ratio == null) return null;
  return landscape ? 1 / ratio : ratio;
}

interface PrintState {
  // Print mode settings
  printerFriendly: boolean;
  textureDisabled: boolean;
  bordersDisabled: boolean;
  shadowsDisabled: boolean;
  
  // Paper format
  paperFormat: PaperFormat;
  
  // Landscape orientation
  isLandscape: boolean;
  
  // Show print area in edit mode
  showInEditMode: boolean;
  
  // Print area (in canvas coordinates)
  printArea: PrintArea | null;
  
  // Previous mode before entering print mode
  previousMode: 'play' | 'edit' | 'vertical' | null;
  
  // Actions
  setPrinterFriendly: (enabled: boolean) => void;
  setTextureDisabled: (disabled: boolean) => void;
  setBordersDisabled: (disabled: boolean) => void;
  setShadowsDisabled: (disabled: boolean) => void;
  setPaperFormat: (format: PaperFormat) => void;
  setIsLandscape: (landscape: boolean) => void;
  setShowInEditMode: (show: boolean) => void;
  setPrintArea: (area: PrintArea | null) => void;
  setPreviousMode: (mode: 'play' | 'edit' | 'vertical' | null) => void;
  
  // Calculate print area from widgets
  calculatePrintAreaFromWidgets: (widgets: { x: number; y: number; w?: number; h?: number }[]) => PrintArea | null;
  
  // Reset all settings
  resetPrintSettings: () => void;
}

export const usePrintStore = create<PrintState>((set) => ({
  printerFriendly: false,
  textureDisabled: false,
  bordersDisabled: false,
  shadowsDisabled: false,
  paperFormat: 'none' as PaperFormat,
  isLandscape: false,
  showInEditMode: false,
  printArea: null,
  previousMode: null,
  
  setPrinterFriendly: (enabled) => set({ printerFriendly: enabled }),
  setTextureDisabled: (disabled) => set({ textureDisabled: disabled }),
  setBordersDisabled: (disabled) => set({ bordersDisabled: disabled }),
  setShadowsDisabled: (disabled) => set({ shadowsDisabled: disabled }),
  setPaperFormat: (format) => set({ paperFormat: format }),
  setIsLandscape: (landscape) => set({ isLandscape: landscape }),
  setShowInEditMode: (show) => set({ showInEditMode: show }),
  setPrintArea: (area) => set({ printArea: area }),
  setPreviousMode: (mode) => set({ previousMode: mode }),
  
  calculatePrintAreaFromWidgets: (widgets) => {
    if (!widgets || widgets.length === 0) return null;
    
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    widgets.forEach(widget => {
      const w = widget.w || 200;
      const h = widget.h || 120;
      
      minX = Math.min(minX, widget.x);
      minY = Math.min(minY, widget.y);
      maxX = Math.max(maxX, widget.x + w);
      maxY = Math.max(maxY, widget.y + h);
    });
    
    // Add a small padding
    const padding = 10;
    
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    };
  },
  
  resetPrintSettings: () => set({
    printerFriendly: false,
    textureDisabled: false,
    bordersDisabled: false,
    shadowsDisabled: false,
    paperFormat: 'none' as PaperFormat,
    isLandscape: false,
    showInEditMode: false,
    printArea: null,
    previousMode: null,
  }),
}));
