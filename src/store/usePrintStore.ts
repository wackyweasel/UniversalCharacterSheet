import { create } from 'zustand';

export interface PrintArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PrintState {
  // Print mode settings
  printerFriendly: boolean;
  textureDisabled: boolean;
  bordersDisabled: boolean;
  shadowsDisabled: boolean;
  
  // Print area (in canvas coordinates)
  printArea: PrintArea | null;
  
  // Previous mode before entering print mode
  previousMode: 'play' | 'edit' | 'vertical' | null;
  
  // Actions
  setPrinterFriendly: (enabled: boolean) => void;
  setTextureDisabled: (disabled: boolean) => void;
  setBordersDisabled: (disabled: boolean) => void;
  setShadowsDisabled: (disabled: boolean) => void;
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
  printArea: null,
  previousMode: null,
  
  setPrinterFriendly: (enabled) => set({ printerFriendly: enabled }),
  setTextureDisabled: (disabled) => set({ textureDisabled: disabled }),
  setBordersDisabled: (disabled) => set({ bordersDisabled: disabled }),
  setShadowsDisabled: (disabled) => set({ shadowsDisabled: disabled }),
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
    printArea: null,
    previousMode: null,
  }),
}));
