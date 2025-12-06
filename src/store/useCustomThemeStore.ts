import { create } from 'zustand';

export interface CustomTheme {
  id: string; // UUID for custom themes
  name: string;
  icon: string;
  description: string;
  colors: {
    background: string;
    paper: string;
    ink: string;
    accent: string;
    accentHover: string;
    border: string;
    shadow: string;
    muted: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  borderRadius: string;
  borderWidth: string;
}

// Available font options for custom themes
export const FONT_OPTIONS = [
  { value: '"Courier New", Courier, monospace', label: 'Courier New' },
  { value: '"Times New Roman", "Palatino Linotype", serif', label: 'Times New Roman' },
  { value: '"Arial", "Helvetica Neue", sans-serif', label: 'Arial' },
  { value: '"Georgia", "Palatino", serif', label: 'Georgia' },
  { value: '"Comic Sans MS", "Segoe Print", cursive', label: 'Comic Sans' },
  { value: '"Segoe Print", "Comic Sans MS", cursive', label: 'Segoe Print' },
  { value: '"Trebuchet MS", "Lucida Sans", sans-serif', label: 'Trebuchet MS' },
  { value: '"Verdana", "Geneva", sans-serif', label: 'Verdana' },
  { value: '"Impact", "Charcoal", sans-serif', label: 'Impact' },
  { value: '"Lucida Console", "Monaco", monospace', label: 'Lucida Console' },
];

// Available icons for custom themes
export const ICON_OPTIONS = [
  '🎨', '⭐', '🌟', '✨', '💎', '🔮', '🎭', '🎪', '🎯', '🎲',
  '🌙', '☀️', '🌈', '🔥', '💧', '🌿', '🍂', '❄️', '⚡', '💀',
  '👑', '🗡️', '🛡️', '⚔️', '🏰', '🐉', '🦅', '🦁', '🐺', '🦊',
  '📜', '📖', '🖋️', '✏️', '🎬', '🎮', '🎵', '🎸', '🎻', '🎹',
];

interface CustomThemeState {
  customThemes: CustomTheme[];
  addCustomTheme: (theme: CustomTheme) => void;
  updateCustomTheme: (id: string, theme: CustomTheme) => void;
  deleteCustomTheme: (id: string) => void;
}

const STORAGE_KEY = 'ucs:custom-themes';

function loadCustomThemes(): CustomTheme[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CustomTheme[];
  } catch {
    return [];
  }
}

function saveCustomThemes(themes: CustomTheme[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
}

export const useCustomThemeStore = create<CustomThemeState>((set, get) => ({
  customThemes: loadCustomThemes(),

  addCustomTheme: (theme) => {
    const newThemes = [...get().customThemes, theme];
    saveCustomThemes(newThemes);
    set({ customThemes: newThemes });
  },

  updateCustomTheme: (id, theme) => {
    const newThemes = get().customThemes.map(t => t.id === id ? theme : t);
    saveCustomThemes(newThemes);
    set({ customThemes: newThemes });
  },

  deleteCustomTheme: (id) => {
    const newThemes = get().customThemes.filter(t => t.id !== id);
    saveCustomThemes(newThemes);
    set({ customThemes: newThemes });
  },
}));

// Get a custom theme by ID
export function getCustomTheme(id: string): CustomTheme | undefined {
  return useCustomThemeStore.getState().customThemes.find(t => t.id === id);
}

// Create a default custom theme template
export function createDefaultCustomTheme(): Omit<CustomTheme, 'id'> {
  return {
    name: 'My Custom Theme',
    icon: '🎨',
    description: 'A personalized theme',
    colors: {
      background: '#e5e7eb',
      paper: '#ffffff',
      ink: '#000000',
      accent: '#3b82f6',
      accentHover: '#2563eb',
      border: '#374151',
      shadow: '#1f2937',
      muted: '#6b7280',
    },
    fonts: {
      heading: '"Arial", "Helvetica Neue", sans-serif',
      body: '"Arial", "Helvetica Neue", sans-serif',
    },
    borderRadius: '4px',
    borderWidth: '2px',
  };
}
