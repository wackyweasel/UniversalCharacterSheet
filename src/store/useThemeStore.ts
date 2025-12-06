import { create } from 'zustand';

export type ThemeId = 
  | 'default'
  | 'pen-and-paper'
  | 'medieval'
  | 'scifi'
  | 'pirate'
  | 'high-magic'
  | 'necrotic'
  | 'modern'
  | 'steampunk'
  | 'cyberpunk'
  | 'nature';

export interface Theme {
  id: ThemeId;
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

export const THEMES: Theme[] = [
  {
    id: 'default',
    name: 'Classic',
    icon: '📋',
    description: 'Clean black & white with hard shadows',
    colors: {
      background: '#e5e7eb',
      paper: '#ffffff',
      ink: '#000000',
      accent: '#000000',
      accentHover: '#374151',
      border: '#000000',
      shadow: '#000000',
      muted: '#6b7280',
    },
    fonts: {
      heading: '"Courier New", Courier, monospace',
      body: '"Courier New", Courier, monospace',
    },
    borderRadius: '0px',
    borderWidth: '2px',
  },
  {
    id: 'pen-and-paper',
    name: 'Pen & Paper',
    icon: '📝',
    description: 'Handwritten style with lined paper feel',
    colors: {
      background: '#f5f0e6',
      paper: '#fffef9',
      ink: '#2c3e50',
      accent: '#8b4513',
      accentHover: '#a0522d',
      border: '#8b7355',
      shadow: '#8b7355',
      muted: '#7f8c8d',
    },
    fonts: {
      heading: '"Comic Sans MS", "Segoe Print", cursive',
      body: '"Segoe Print", "Comic Sans MS", cursive',
    },
    borderRadius: '2px',
    borderWidth: '1px',
  },
  {
    id: 'medieval',
    name: 'Medieval',
    icon: '⚔️',
    description: 'Aged parchment with ornate styling',
    colors: {
      background: '#3d2914',
      paper: '#d4c4a8',
      ink: '#2c1810',
      accent: '#8b0000',
      accentHover: '#a52a2a',
      border: '#5c4033',
      shadow: '#2c1810',
      muted: '#6b5344',
    },
    fonts: {
      heading: '"Times New Roman", "Palatino Linotype", serif',
      body: '"Palatino Linotype", "Book Antiqua", serif',
    },
    borderRadius: '0px',
    borderWidth: '3px',
  },
  {
    id: 'scifi',
    name: 'Sci-Fi',
    icon: '🚀',
    description: 'Futuristic holographic interface',
    colors: {
      background: '#0a0a1a',
      paper: '#141428',
      ink: '#00ffff',
      accent: '#00ff88',
      accentHover: '#00cc6a',
      border: '#00ffff',
      shadow: '#00ffff40',
      muted: '#4a9eff',
    },
    fonts: {
      heading: '"Orbitron", "Segoe UI", sans-serif',
      body: '"Roboto Mono", "Consolas", monospace',
    },
    borderRadius: '4px',
    borderWidth: '1px',
  },
  {
    id: 'pirate',
    name: 'Pirate',
    icon: '🏴‍☠️',
    description: 'Weathered maps and treasure charts',
    colors: {
      background: '#1a3a4a',
      paper: '#e8d4a8',
      ink: '#2c1810',
      accent: '#c9a227',
      accentHover: '#daa520',
      border: '#5c4033',
      shadow: '#2c1810',
      muted: '#6b5344',
    },
    fonts: {
      heading: '"Pirata One", "Times New Roman", serif',
      body: '"Georgia", "Times New Roman", serif',
    },
    borderRadius: '0px',
    borderWidth: '2px',
  },
  {
    id: 'high-magic',
    name: 'High Magic',
    icon: '✨',
    description: 'Arcane glyphs and mystical energy',
    colors: {
      background: '#1a0a2e',
      paper: '#2d1b4e',
      ink: '#e8d5ff',
      accent: '#bf7fff',
      accentHover: '#9966cc',
      border: '#bf7fff',
      shadow: '#bf7fff40',
      muted: '#9b8ab8',
    },
    fonts: {
      heading: '"Cinzel", "Times New Roman", serif',
      body: '"Crimson Text", "Georgia", serif',
    },
    borderRadius: '8px',
    borderWidth: '2px',
  },
  {
    id: 'necrotic',
    name: 'Necrotic',
    icon: '💀',
    description: 'Dark and sinister undead aesthetic',
    colors: {
      background: '#0d0d0d',
      paper: '#1a1a1a',
      ink: '#c8c8c8',
      accent: '#4a0',
      accentHover: '#5b0',
      border: '#333333',
      shadow: '#00000080',
      muted: '#666666',
    },
    fonts: {
      heading: '"Nosifer", "Impact", sans-serif',
      body: '"Courier New", monospace',
    },
    borderRadius: '0px',
    borderWidth: '1px',
  },
  {
    id: 'modern',
    name: 'Modern',
    icon: '🏢',
    description: 'Sleek contemporary design',
    colors: {
      background: '#f8fafc',
      paper: '#ffffff',
      ink: '#1e293b',
      accent: '#3b82f6',
      accentHover: '#2563eb',
      border: '#e2e8f0',
      shadow: '#64748b20',
      muted: '#64748b',
    },
    fonts: {
      heading: '"Inter", "Segoe UI", sans-serif',
      body: '"Inter", "Segoe UI", sans-serif',
    },
    borderRadius: '8px',
    borderWidth: '1px',
  },
  {
    id: 'steampunk',
    name: 'Steampunk',
    icon: '⚙️',
    description: 'Victorian brass and gears',
    colors: {
      background: '#2a1f1a',
      paper: '#3d2b1f',
      ink: '#d4a574',
      accent: '#cd7f32',
      accentHover: '#b8860b',
      border: '#cd7f32',
      shadow: '#00000060',
      muted: '#8b7355',
    },
    fonts: {
      heading: '"Spectral SC", "Georgia", serif',
      body: '"Cutive Mono", "Courier New", monospace',
    },
    borderRadius: '2px',
    borderWidth: '2px',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    icon: '🌃',
    description: 'Neon lights in a dark future',
    colors: {
      background: '#0f0f23',
      paper: '#1a1a2e',
      ink: '#eeff00',
      accent: '#ff00ff',
      accentHover: '#cc00cc',
      border: '#ff00ff',
      shadow: '#ff00ff40',
      muted: '#00ffff',
    },
    fonts: {
      heading: '"Audiowide", "Impact", sans-serif',
      body: '"Share Tech Mono", "Consolas", monospace',
    },
    borderRadius: '0px',
    borderWidth: '2px',
  },
  {
    id: 'nature',
    name: 'Nature',
    icon: '🌿',
    description: 'Organic earthy woodland feel',
    colors: {
      background: '#2d4a3e',
      paper: '#f4f1e0',
      ink: '#2d3b2d',
      accent: '#4a7c59',
      accentHover: '#3d6b4f',
      border: '#5a7247',
      shadow: '#2d3b2d40',
      muted: '#6b7c5a',
    },
    fonts: {
      heading: '"Amatic SC", "Trebuchet MS", sans-serif',
      body: '"Nunito", "Verdana", sans-serif',
    },
    borderRadius: '12px',
    borderWidth: '2px',
  },
];

interface ThemeState {
  currentTheme: ThemeId;
  setTheme: (themeId: ThemeId) => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  // Load persisted theme from localStorage
  const persisted = (() => {
    try {
      const raw = localStorage.getItem('ucs:theme');
      if (!raw) return 'default';
      return JSON.parse(raw) as ThemeId;
    } catch {
      return 'default';
    }
  })();

  return {
    currentTheme: persisted,
    setTheme: (themeId) => {
      set({ currentTheme: themeId });
      localStorage.setItem('ucs:theme', JSON.stringify(themeId));
      applyTheme(themeId);
    },
  };
});

export function applyTheme(themeId: ThemeId | string) {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  const root = document.documentElement;
  
  root.style.setProperty('--color-background', theme.colors.background);
  root.style.setProperty('--color-paper', theme.colors.paper);
  root.style.setProperty('--color-ink', theme.colors.ink);
  root.style.setProperty('--color-accent', theme.colors.accent);
  root.style.setProperty('--color-accent-hover', theme.colors.accentHover);
  root.style.setProperty('--color-border', theme.colors.border);
  root.style.setProperty('--color-shadow', theme.colors.shadow);
  root.style.setProperty('--color-muted', theme.colors.muted);
  root.style.setProperty('--font-heading', theme.fonts.heading);
  root.style.setProperty('--font-body', theme.fonts.body);
  root.style.setProperty('--border-radius', theme.borderRadius);
  root.style.setProperty('--border-width', theme.borderWidth);
}

// Apply a custom theme (from useCustomThemeStore)
export function applyCustomTheme(theme: {
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
}) {
  const root = document.documentElement;
  
  root.style.setProperty('--color-background', theme.colors.background);
  root.style.setProperty('--color-paper', theme.colors.paper);
  root.style.setProperty('--color-ink', theme.colors.ink);
  root.style.setProperty('--color-accent', theme.colors.accent);
  root.style.setProperty('--color-accent-hover', theme.colors.accentHover);
  root.style.setProperty('--color-border', theme.colors.border);
  root.style.setProperty('--color-shadow', theme.colors.shadow);
  root.style.setProperty('--color-muted', theme.colors.muted);
  root.style.setProperty('--font-heading', theme.fonts.heading);
  root.style.setProperty('--font-body', theme.fonts.body);
  root.style.setProperty('--border-radius', theme.borderRadius);
  root.style.setProperty('--border-width', theme.borderWidth);
}

// Initialize theme on load
export function initializeTheme() {
  const state = useThemeStore.getState();
  applyTheme(state.currentTheme);
}
