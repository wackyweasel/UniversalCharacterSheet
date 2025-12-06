import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Character, Widget, WidgetType } from '../types';

type Mode = 'play' | 'edit';

interface StoreState {
  characters: Character[];
  activeCharacterId: string | null;
  mode: Mode;
  
  // Actions
  createCharacter: (name: string) => void;
  selectCharacter: (id: string | null) => void;
  deleteCharacter: (id: string) => void;
  updateCharacterName: (id: string, name: string) => void;
  updateCharacterTheme: (id: string, theme: string) => void;
  setMode: (mode: Mode) => void;
  
  // Widget Actions (for active character)
  addWidget: (type: WidgetType, x: number, y: number) => void;
  updateWidgetPosition: (id: string, x: number, y: number) => void;
  updateWidgetSize: (id: string, w: number, h: number) => void;
  updateWidgetData: (id: string, data: any) => void;
  removeWidget: (id: string) => void;
}

export const useStore = create<StoreState>((set) => {
  // Try to load persisted state from localStorage
  const persisted = (() => {
    try {
      const raw = localStorage.getItem('ucs:store');
      if (!raw) return null;
      return JSON.parse(raw) as { characters: Character[]; activeCharacterId: string | null };
    } catch (e) {
      console.error('Failed to load persisted store', e);
      return null;
    }
  })();

  const initialCharacters = persisted?.characters ?? [];
  const initialActive = persisted?.activeCharacterId ?? null;

  const api: StoreState = {
    characters: initialCharacters,
    activeCharacterId: initialActive,
    mode: 'play',

    createCharacter: (name) => set((state) => {
      const newChar: Character = {
        id: uuidv4(),
        name,
        widgets: []
      };
      return { 
        characters: [...state.characters, newChar],
        activeCharacterId: newChar.id 
      };
    }),

    selectCharacter: (id) => set({ activeCharacterId: id }),

    deleteCharacter: (id) => set((state) => ({
      characters: state.characters.filter(c => c.id !== id),
      activeCharacterId: state.activeCharacterId === id ? null : state.activeCharacterId
    })),

    updateCharacterName: (id, name) => set((state) => ({
      characters: state.characters.map(c => c.id === id ? { ...c, name } : c)
    })),

    updateCharacterTheme: (id, theme) => set((state) => ({
      characters: state.characters.map(c => c.id === id ? { ...c, theme } : c)
    })),

    setMode: (mode) => set({ mode }),

    addWidget: (type, x, y) => set((state) => {
      if (!state.activeCharacterId) return state;
      
      const newWidget: Widget = {
        id: uuidv4(),
        type,
        x,
        y,
        w: 200, // Default width (grid-aligned: 200 = 10 * 20)
        h: 120, // Default height (grid-aligned: 120 = 6 * 20)
        data: {
          label: 'New Widget',
          value: 0,
          items: [],
          text: ''
        }
      };

      return {
        characters: state.characters.map(c => {
          if (c.id === state.activeCharacterId) {
            return { ...c, widgets: [...c.widgets, newWidget] };
          }
          return c;
        })
      };
    }),

    updateWidgetPosition: (id, x, y) => set((state) => ({
      characters: state.characters.map(c => {
        if (c.id === state.activeCharacterId) {
          return {
            ...c,
            widgets: c.widgets.map(w => w.id === id ? { ...w, x, y } : w)
          };
        }
        return c;
      })
    })),

    updateWidgetSize: (id, w, h) => set((state) => ({
      characters: state.characters.map(c => {
        if (c.id === state.activeCharacterId) {
          return {
            ...c,
            widgets: c.widgets.map(widget => widget.id === id ? { ...widget, w, h } : widget)
          };
        }
        return c;
      })
    })),

    updateWidgetData: (id, data) => set((state) => ({
      characters: state.characters.map(c => {
        if (c.id === state.activeCharacterId) {
          return {
            ...c,
            widgets: c.widgets.map(w => w.id === id ? { ...w, data: { ...w.data, ...data } } : w)
          };
        }
        return c;
      })
    })),

    removeWidget: (id) => set((state) => ({
      characters: state.characters.map(c => {
        if (c.id === state.activeCharacterId) {
          return {
            ...c,
            widgets: c.widgets.filter(w => w.id !== id)
          };
        }
        return c;
      })
    })),
  };

  return api;
});

// Subscribe to store changes and persist state to localStorage with debounce
{
  let saveTimeout: number | null = null;
  (useStore as any).subscribe(() => {
    if (saveTimeout) window.clearTimeout(saveTimeout);
    saveTimeout = window.setTimeout(() => {
      try {
        const state = (useStore as any).getState();
        const data = { characters: state.characters, activeCharacterId: state.activeCharacterId };
        localStorage.setItem('ucs:store', JSON.stringify(data));
      } catch (e) {
        console.error('Failed to persist store', e);
      }
    }, 150);
  });
}
