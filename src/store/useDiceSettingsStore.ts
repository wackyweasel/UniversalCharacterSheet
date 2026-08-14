import { create } from 'zustand';
import { appStorage } from '../persistence/appStorage';

const STORAGE_KEY = 'ucs:3d-dice-enabled';

interface DiceSettingsState {
  threeDDiceEnabled: boolean;
  setThreeDDiceEnabled: (enabled: boolean) => void;
}

const loadThreeDDiceEnabled = () => {
  try {
    const storedValue = appStorage.getItem(STORAGE_KEY);
    return storedValue === null ? true : JSON.parse(storedValue) !== false;
  } catch {
    return true;
  }
};

export const useDiceSettingsStore = create<DiceSettingsState>((set) => ({
  threeDDiceEnabled: loadThreeDDiceEnabled(),
  setThreeDDiceEnabled: (enabled) => {
    try {
      appStorage.setItem(STORAGE_KEY, JSON.stringify(enabled));
    } catch {
      // Keep the in-memory preference when storage is unavailable.
    }
    set({ threeDDiceEnabled: enabled });
  },
}));