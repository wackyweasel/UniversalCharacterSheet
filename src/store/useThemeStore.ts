import { create } from 'zustand';

// Import texture images
import paperTexture from '../textures/paper.jpg';
import crumpledPaperTexture from '../textures/paper_2.jpg';
import graphPaperTexture from '../textures/paper_3.jpg';
import woodTexture from '../textures/wood.jpg';
import arcsTexture from '../textures/arcs.jpg';
import circuitBoardTexture from '../textures/circuit_board.jpg';
import clothTexture from '../textures/cloth.jpg';
import fireTexture from '../textures/fire.jpg';
import fogTexture from '../textures/fog.jpg';
import gearsTexture from '../textures/gears.jpg';
import glyphsTexture from '../textures/glyphs.jpg';
import leafTexture from '../textures/leaf.jpg';
import leatherTexture from '../textures/leather.jpg';
import metalTexture from '../textures/metal.jpg';
import smokeTexture from '../textures/smoke.jpg';
import snowTexture from '../textures/snow.jpg';
import soilTexture from '../textures/soil.jpg';
import solarTexture from '../textures/solar.jpg';
import starsTexture from '../textures/stars.jpg';
import stoneTexture from '../textures/stone.jpg';
import techTexture from '../textures/tech.jpg';
import waterTexture from '../textures/water.jpg';
import wavesTexture from '../textures/waves.jpg';

export type ThemeId = 
  | 'default'
  | 'pen-and-paper'
  | 'medieval'
  | 'scifi'
  | 'classic-dark'
  | 'modern-dark'
  | 'high-magic'
  | 'necrotic'
  | 'modern'
  | 'steampunk'
  | 'cyberpunk'
  | 'nature';

// Textures for card backgrounds (legacy - kept for compatibility)
export const TEXTURES: Record<string, string> = {
  none: 'none',
  paper: `url(${paperTexture})`,
  crumpledPaper: `url(${crumpledPaperTexture})`,
  graphPaper: `url(${graphPaperTexture})`,
  wood: `url(${woodTexture})`,
  arcs: `url(${arcsTexture})`,
  circuitBoard: `url(${circuitBoardTexture})`,
  cloth: `url(${clothTexture})`,
  fire: `url(${fireTexture})`,
  fog: `url(${fogTexture})`,
  gears: `url(${gearsTexture})`,
  glyphs: `url(${glyphsTexture})`,
  leaf: `url(${leafTexture})`,
  leather: `url(${leatherTexture})`,
  metal: `url(${metalTexture})`,
  smoke: `url(${smokeTexture})`,
  snow: `url(${snowTexture})`,
  soil: `url(${soilTexture})`,
  solar: `url(${solarTexture})`,
  stars: `url(${starsTexture})`,
  stone: `url(${stoneTexture})`,
  tech: `url(${techTexture})`,
  water: `url(${waterTexture})`,
  waves: `url(${wavesTexture})`,
};

// Image-based textures map (exported for components that need to render overlays)
export const IMAGE_TEXTURES: Record<string, string> = {
  paper: paperTexture,
  crumpledPaper: crumpledPaperTexture,
  graphPaper: graphPaperTexture,
  wood: woodTexture,
  arcs: arcsTexture,
  circuitBoard: circuitBoardTexture,
  cloth: clothTexture,
  fire: fireTexture,
  fog: fogTexture,
  gears: gearsTexture,
  glyphs: glyphsTexture,
  leaf: leafTexture,
  leather: leatherTexture,
  metal: metalTexture,
  smoke: smokeTexture,
  snow: snowTexture,
  soil: soilTexture,
  solar: solarTexture,
  stars: starsTexture,
  stone: stoneTexture,
  tech: techTexture,
  water: waterTexture,
  waves: wavesTexture,
};

// Helper to check if a texture is image-based
export function isImageTexture(textureKey: string): boolean {
  return textureKey in IMAGE_TEXTURES;
}

// Helper to get a built-in theme by ID
export function getBuiltInTheme(themeId: string): Theme | undefined {
  return THEMES.find(t => t.id === themeId);
}

// Available texture options for custom themes
export const TEXTURE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'paper', label: 'Paper' },
  { value: 'crumpledPaper', label: 'Crumpled Paper' },
  { value: 'graphPaper', label: 'Graph Paper' },
  { value: 'wood', label: 'Wood' },
  { value: 'leather', label: 'Leather' },
  { value: 'cloth', label: 'Cloth' },
  { value: 'stone', label: 'Stone' },
  { value: 'metal', label: 'Metal' },
  { value: 'soil', label: 'Soil' },
  { value: 'leaf', label: 'Leaf' },
  { value: 'water', label: 'Water' },
  { value: 'waves', label: 'Waves' },
  { value: 'snow', label: 'Snow' },
  { value: 'fog', label: 'Fog' },
  { value: 'fire', label: 'Fire' },
  { value: 'smoke', label: 'Smoke' },
  { value: 'stars', label: 'Stars' },
  { value: 'solar', label: 'Solar' },
  { value: 'tech', label: 'Technology' },
  { value: 'circuitBoard', label: 'Circuit Board' },
  { value: 'gears', label: 'Gears' },
  { value: 'arcs', label: 'Arcs' },
  { value: 'glyphs', label: 'Glyphs' },
];

// Available shadow style options for custom themes
export const SHADOW_STYLE_OPTIONS = [
  { value: 'hard', label: 'Hard Offset' },
  { value: 'soft', label: 'Soft Drop' },
  { value: 'glow', label: 'Glow' },
  { value: 'inset', label: 'Inset' },
  { value: 'layered', label: 'Layered' },
  { value: 'none', label: 'None' },
];

// Available border style options
export const BORDER_STYLE_OPTIONS = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'double', label: 'Double' },
];

// Helper to get texture CSS from texture key
// For image textures, this returns 'none' - they should be rendered via overlay elements
export function getTextureCSS(textureKey: string, _customColor?: string, _opacity: number = 0.15): string {
  if (textureKey === 'none' || !textureKey) return 'none';
  
  // All textures are now image-based and need to be rendered via overlay elements
  // Return 'none' here - components should check isImageTexture and render overlay
  if (isImageTexture(textureKey)) {
    return 'none';
  }
  
  // Fall back to predefined textures (for legacy compatibility)
  return TEXTURES[textureKey as keyof typeof TEXTURES] || TEXTURES.none;
}

// Helper to compute shadow style CSS from preset name
export function getShadowStyleCSS(preset: string, glowColor: string = 'transparent'): string {
  switch (preset) {
    case 'hard':
      return '4px 4px 0 0 var(--color-shadow)';
    case 'soft':
      return '0 4px 12px var(--color-shadow)';
    case 'glow':
      return `0 0 12px ${glowColor}, 0 0 24px var(--color-shadow)`;
    case 'inset':
      return 'inset 0 2px 8px var(--color-shadow)';
    case 'layered':
      return '2px 2px 0 var(--color-border), 4px 4px 8px var(--color-shadow)';
    case 'none':
      return 'none';
    default:
      return '4px 4px 0 0 var(--color-shadow)';
  }
}

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
  textureOpacity?: number;
  borderStyle: string;
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
      glow: 'transparent',
    },
    fonts: {
      heading: '"Courier New", Courier, monospace',
      body: '"Courier New", Courier, monospace',
    },
    borderRadius: '0px',
    borderWidth: '2px',
    shadowStyle: '4px 4px 0 0 var(--color-shadow)',
    cardTexture: TEXTURES.none,
    borderStyle: 'solid',
  },
  {
    id: 'pen-and-paper',
    name: 'Pen & Paper',
    icon: '📝',
    description: 'Handwritten style with lined paper feel',
    colors: {
      background: '#d7d7d7',
      paper: '#d7d7d7',
      ink: '#2c3e50',
      accent: '#8b4513',
      accentHover: '#a0522d',
      border: '#8b7355',
      shadow: '#8b7355',
      muted: '#7f8c8d',
      glow: 'transparent',
    },
    fonts: {
      heading: '"Comic Sans MS", "Segoe Print", cursive',
      body: '"Segoe Print", "Comic Sans MS", cursive',
    },
    borderRadius: '2px',
    borderWidth: '1px',
    shadowStyle: '2px 2px 0 0 var(--color-shadow)',
    cardTexture: 'graphPaper',
    textureOpacity: 1,
    borderStyle: 'solid',
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
      glow: 'transparent',
    },
    fonts: {
      heading: '"Times New Roman", "Palatino Linotype", serif',
      body: '"Palatino Linotype", "Book Antiqua", serif',
    },
    borderRadius: '0px',
    borderWidth: '3px',
    shadowStyle: '3px 3px 6px 0 var(--color-shadow)',
    cardTexture: 'paper',
    textureOpacity: 1.0,
    borderStyle: 'double',
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
      glow: '#008cffff',
    },
    fonts: {
      heading: '"Orbitron", "Segoe UI", sans-serif',
      body: '"Roboto Mono", "Consolas", monospace',
    },
    borderRadius: '4px',
    borderWidth: '1px',
    shadowStyle: '0 0 8px var(--color-glow), 0 0 16px var(--color-shadow)',
    cardTexture: 'circuitBoard',
    textureOpacity: 0.4,
    borderStyle: 'solid',
  },
  {
    id: 'classic-dark',
    name: 'Classic Dark',
    icon: '🌑',
    description: 'Traditional dark theme with warm accents',
    colors: {
      background: '#1a1a1a',
      paper: '#2d2d2d',
      ink: '#e0e0e0',
      accent: '#d4a574',
      accentHover: '#c49464',
      border: '#404040',
      shadow: '#00000080',
      muted: '#888888',
      glow: 'transparent',
    },
    fonts: {
      heading: '"Georgia", "Times New Roman", serif',
      body: '"Georgia", "Times New Roman", serif',
    },
    borderRadius: '4px',
    borderWidth: '1px',
    shadowStyle: '0 4px 12px var(--color-shadow)',
    cardTexture: TEXTURES.none,
    borderStyle: 'solid',
  },
  {
    id: 'modern-dark',
    name: 'Modern Dark',
    icon: '🌚',
    description: 'Sleek contemporary dark interface',
    colors: {
      background: '#0f172a',
      paper: '#1e293b',
      ink: '#f1f5f9',
      accent: '#3b82f6',
      accentHover: '#2563eb',
      border: '#334155',
      shadow: '#00000060',
      muted: '#94a3b8',
      glow: '#3b82f6',
    },
    fonts: {
      heading: '"Inter", "Segoe UI", sans-serif',
      body: '"Inter", "Segoe UI", sans-serif',
    },
    borderRadius: '8px',
    borderWidth: '1px',
    shadowStyle: '0 4px 20px var(--color-shadow)',
    cardTexture: TEXTURES.darkGrain,
    borderStyle: 'solid',
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
      glow: '#bf7fff',
    },
    fonts: {
      heading: '"Cinzel", "Times New Roman", serif',
      body: '"Crimson Text", "Georgia", serif',
    },
    borderRadius: '8px',
    borderWidth: '2px',
    shadowStyle: '0 0 12px var(--color-glow), 0 0 24px var(--color-shadow)',
    cardTexture: 'arcs',
    textureOpacity: 0.15,
    borderStyle: 'solid',
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
      glow: '#4a0',
    },
    fonts: {
      heading: '"Copperplate", "Copperplate Gothic Light", "Impact", fantasy',
      body: '"Courier New", monospace',
    },
    borderRadius: '0px',
    borderWidth: '1px',
    shadowStyle: '0 0 10px var(--color-shadow), inset 0 0 30px rgba(74, 170, 0, 0.05)',
    cardTexture: 'smoke',
    textureOpacity: 0.6,
    borderStyle: 'solid',
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
      glow: 'transparent',
    },
    fonts: {
      heading: '"Inter", "Segoe UI", sans-serif',
      body: '"Inter", "Segoe UI", sans-serif',
    },
    borderRadius: '8px',
    borderWidth: '1px',
    shadowStyle: '0 4px 16px var(--color-shadow)',
    cardTexture: TEXTURES.none,
    borderStyle: 'solid',
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
      glow: '#cd7f32',
    },
    fonts: {
      heading: '"Spectral SC", "Georgia", serif',
      body: '"Cutive Mono", "Courier New", monospace',
    },
    borderRadius: '2px',
    borderWidth: '2px',
    shadowStyle: '2px 2px 0 var(--color-border), 4px 4px 8px var(--color-shadow)',
    cardTexture: 'gears',
    textureOpacity: 0.25,
    borderStyle: 'solid',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    icon: '🌃',
    description: 'Neon lights in a dark future',
    colors: {
      background: '#0f0f23',
      paper: '#24243fff',
      ink: '#eeff00',
      accent: '#ff00ff',
      accentHover: '#cc00cc',
      border: '#ff00ff',
      shadow: '#ff00ff40',
      muted: '#00ffff',
      glow: '#ff00ff',
    },
    fonts: {
      heading: '"Consolas", "Lucida Console", "Monaco", monospace',
      body: '"Consolas", "Lucida Console", "Monaco", monospace',
    },
    borderRadius: '0px',
    borderWidth: '2px',
    shadowStyle: '0 0 10px var(--color-glow), 0 0 20px var(--color-shadow), 4px 4px 0 var(--color-border)',
    cardTexture: 'tech',
    textureOpacity: 0.4,
    borderStyle: 'solid',
  },
  {
    id: 'nature',
    name: 'Nature',
    icon: '🌿',
    description: 'Organic earthy woodland feel',
    colors: {
      background: '#2d4a3e',
      paper: '#f4f1e0cc',
      ink: '#2d3b2d',
      accent: '#4a7c59',
      accentHover: '#3d6b4f',
      border: '#5a7247',
      shadow: '#2d3b2d40',
      muted: '#6b7c5a',
      glow: 'transparent',
    },
    fonts: {
      heading: '"Amatic SC", "Trebuchet MS", sans-serif',
      body: '"Nunito", "Verdana", sans-serif',
    },
    borderRadius: '12px',
    borderWidth: '2px',
    shadowStyle: '0 4px 12px var(--color-shadow)',
    cardTexture: 'leaf',
    textureOpacity: 0.6,
    borderStyle: 'solid',
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
  root.style.setProperty('--color-glow', theme.colors.glow);
  root.style.setProperty('--font-heading', theme.fonts.heading);
  root.style.setProperty('--font-body', theme.fonts.body);
  root.style.setProperty('--border-radius', theme.borderRadius);
  root.style.setProperty('--border-width', theme.borderWidth);
  root.style.setProperty('--shadow-style', theme.shadowStyle);
  root.style.setProperty('--card-texture', theme.cardTexture);
  // Use theme's texture key if it's an image texture, otherwise 'none'
  const textureKey = isImageTexture(theme.cardTexture) ? theme.cardTexture : 'none';
  root.style.setProperty('--card-texture-key', textureKey);
  root.style.setProperty('--card-texture-color', '#ffffff');
  root.style.setProperty('--card-texture-opacity', String(theme.textureOpacity ?? 0.15));
  root.style.setProperty('--border-style', theme.borderStyle);
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
    glow?: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  borderRadius: string;
  borderWidth: string;
  shadowStyle?: string;
  cardTexture?: string;
  textureColor?: string;
  borderStyle?: string;
  textureOpacity?: number;
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
  root.style.setProperty('--color-glow', theme.colors.glow || 'transparent');
  root.style.setProperty('--font-heading', theme.fonts.heading);
  root.style.setProperty('--font-body', theme.fonts.body);
  root.style.setProperty('--border-radius', theme.borderRadius);
  root.style.setProperty('--border-width', theme.borderWidth);
  
  // Convert shadow style preset to CSS
  const shadowCSS = getShadowStyleCSS(theme.shadowStyle || 'hard', theme.colors.glow || 'transparent');
  root.style.setProperty('--shadow-style', shadowCSS);
  
  // Store texture key for components to detect image textures
  const textureKey = theme.cardTexture || 'none';
  root.style.setProperty('--card-texture-key', textureKey);
  
  // Convert texture key to CSS with custom color if provided (returns 'none' for image textures)
  const textureCSS = getTextureCSS(textureKey, theme.textureColor, theme.textureOpacity ?? 0.15);
  root.style.setProperty('--card-texture', textureCSS);
  
  // Store texture metadata for components that render image texture overlays
  root.style.setProperty('--card-texture-color', theme.textureColor || '#ffffff');
  root.style.setProperty('--card-texture-opacity', String(theme.textureOpacity ?? 0.15));
  
  root.style.setProperty('--border-style', theme.borderStyle || 'solid');
}

// Initialize theme on load
export function initializeTheme() {
  const state = useThemeStore.getState();
  applyTheme(state.currentTheme);
}
