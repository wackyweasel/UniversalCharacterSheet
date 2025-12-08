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
    glow: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  borderRadius: string;
  borderWidth: string;
  shadowStyle: string;
  cardTexture: string;
  textureColor: string;
  textureOpacity: number;
  borderStyle: string;
}

// Available font options for custom themes (web-safe fonts available on all browsers/OS)
export const FONT_OPTIONS = [
  // Sans-serif fonts
  { value: '"Arial", "Helvetica Neue", "Helvetica", sans-serif', label: 'Arial' },
  { value: '"Arial Black", "Arial Bold", sans-serif', label: 'Arial Black' },
  { value: '"Verdana", "Geneva", sans-serif', label: 'Verdana' },
  { value: '"Trebuchet MS", "Lucida Sans Unicode", sans-serif', label: 'Trebuchet MS' },
  { value: '"Tahoma", "Geneva", sans-serif', label: 'Tahoma' },
  { value: '"Segoe UI", "Helvetica Neue", sans-serif', label: 'Segoe UI' },
  { value: '"Calibri", "Candara", sans-serif', label: 'Calibri' },
  { value: '"Candara", "Calibri", sans-serif', label: 'Candara' },
  { value: '"Optima", "Segoe UI", sans-serif', label: 'Optima' },
  { value: '"Lucida Sans", "Lucida Grande", sans-serif', label: 'Lucida Sans' },
  // Serif fonts
  { value: '"Times New Roman", "Times", serif', label: 'Times New Roman' },
  { value: '"Georgia", "Palatino", serif', label: 'Georgia' },
  { value: '"Palatino Linotype", "Book Antiqua", "Palatino", serif', label: 'Palatino' },
  { value: '"Book Antiqua", "Palatino Linotype", serif', label: 'Book Antiqua' },
  { value: '"Garamond", "Baskerville", serif', label: 'Garamond' },
  { value: '"Baskerville", "Garamond", serif', label: 'Baskerville' },
  { value: '"Cambria", "Georgia", serif', label: 'Cambria' },
  { value: '"Didot", "Bodoni MT", serif', label: 'Didot' },
  { value: '"Rockwell", "Courier Bold", serif', label: 'Rockwell' },
  // Monospace fonts
  { value: '"Courier New", "Courier", monospace', label: 'Courier New' },
  { value: '"Consolas", "Lucida Console", monospace', label: 'Consolas' },
  { value: '"Lucida Console", "Monaco", monospace', label: 'Lucida Console' },
  { value: '"Monaco", "Consolas", monospace', label: 'Monaco' },
  { value: '"Andale Mono", "Consolas", monospace', label: 'Andale Mono' },
  // Display/Fantasy fonts
  { value: '"Impact", "Haettenschweiler", sans-serif', label: 'Impact' },
  { value: '"Copperplate", "Copperplate Gothic Light", fantasy', label: 'Copperplate' },
  { value: '"Papyrus", fantasy', label: 'Papyrus' },
  { value: '"Brush Script MT", cursive', label: 'Brush Script' },
  // Cursive/Handwriting fonts
  { value: '"Comic Sans MS", "Segoe Print", cursive', label: 'Comic Sans' },
  { value: '"Segoe Print", "Comic Sans MS", cursive', label: 'Segoe Print' },
  { value: '"Lucida Handwriting", cursive', label: 'Lucida Handwriting' },
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
      glow: 'transparent',
    },
    fonts: {
      heading: '"Arial", "Helvetica Neue", sans-serif',
      body: '"Arial", "Helvetica Neue", sans-serif',
    },
    borderRadius: '4px',
    borderWidth: '2px',
    shadowStyle: 'hard',
    cardTexture: 'none',
    textureColor: '#ffffff',
    textureOpacity: 0.15,
    borderStyle: 'solid',
  };
}
