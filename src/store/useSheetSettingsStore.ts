import { create } from 'zustand';

const STORAGE_KEY = 'ucs:hide-attached-edges';

interface SheetSettingsState {
  hideAttachedEdges: boolean;
  setHideAttachedEdges: (hidden: boolean) => void;
}

const loadHideAttachedEdges = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'false') === true;
  } catch {
    return false;
  }
};

export const useSheetSettingsStore = create<SheetSettingsState>((set) => ({
  hideAttachedEdges: loadHideAttachedEdges(),
  setHideAttachedEdges: (hidden) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hidden));
    } catch {
      // Keep the in-memory preference when storage is unavailable.
    }
    set({ hideAttachedEdges: hidden });
  },
}));
