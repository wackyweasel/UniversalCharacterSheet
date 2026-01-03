import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Character } from '../types';
import { CharacterPreset } from '../presets';

export interface UserPreset {
  id: string;
  name: string;
  preset: CharacterPreset;
  createdAt: number;
}

interface UserPresetStoreState {
  userPresets: UserPreset[];
  
  // Actions
  addPreset: (character: Character, name?: string) => void;
  removePreset: (id: string) => void;
  renamePreset: (id: string, name: string) => void;
}

export const useUserPresetStore = create<UserPresetStoreState>((set) => {
  // Load persisted user presets from localStorage
  const persisted = (() => {
    try {
      const raw = localStorage.getItem('ucs:userPresets');
      if (!raw) return null;
      return JSON.parse(raw) as { userPresets: UserPreset[] };
    } catch (e) {
      console.error('Failed to load persisted user presets', e);
      return null;
    }
  })();

  const initialUserPresets = persisted?.userPresets ?? [];

  // Subscribe to persist changes
  const persistUserPresets = (userPresets: UserPreset[]) => {
    try {
      localStorage.setItem('ucs:userPresets', JSON.stringify({ userPresets }));
    } catch (e) {
      console.error('Failed to persist user presets', e);
    }
  };

  return {
    userPresets: initialUserPresets,

    addPreset: (character, name) => {
      // Create a preset from the character (without the id)
      const { id: _, ...presetData } = character;
      
      const userPreset: UserPreset = {
        id: uuidv4(),
        name: name || `${character.name} Preset`,
        preset: presetData as CharacterPreset,
        createdAt: Date.now(),
      };

      set((state) => {
        const newUserPresets = [...state.userPresets, userPreset];
        persistUserPresets(newUserPresets);
        return { userPresets: newUserPresets };
      });
    },

    removePreset: (id) => {
      set((state) => {
        const newUserPresets = state.userPresets.filter(p => p.id !== id);
        persistUserPresets(newUserPresets);
        return { userPresets: newUserPresets };
      });
    },

    renamePreset: (id, name) => {
      set((state) => {
        const newUserPresets = state.userPresets.map(p => 
          p.id === id ? { ...p, name } : p
        );
        persistUserPresets(newUserPresets);
        return { userPresets: newUserPresets };
      });
    },
  };
});

// Helper function to get user presets (for use outside of React components)
export function getUserPresets(): UserPreset[] {
  return useUserPresetStore.getState().userPresets;
}
