import { v4 as uuidv4 } from 'uuid';
import { GridMapAttributeKind, GridMapTokenAttribute, GridMapTokenSize } from '../types';

export const TOKEN_SIZES: GridMapTokenSize[] = ['tiny', 'medium', 'large', 'huge', 'gargantuan'];

export const TOKEN_SIZE_NAMES: Record<GridMapTokenSize, string> = {
  tiny: 'Tiny',
  medium: 'Medium',
  large: 'Large',
  huge: 'Huge',
  gargantuan: 'Gargantuan',
};

export const SQUARE_TOKEN_CELLS: Record<GridMapTokenSize, number> = { tiny: 0.5, medium: 1, large: 4, huge: 9, gargantuan: 16 };
export const HEX_TOKEN_CELLS: Record<GridMapTokenSize, number> = { tiny: 0.5, medium: 1, large: 3, huge: 7, gargantuan: 19 };

/** Black or white, whichever reads better on the given #rrggbb background. */
export function readableTextColor(background: string) {
  const match = /^#?([0-9a-f]{6})$/i.exec(background.trim());
  if (!match) return '#ffffff';
  const value = parseInt(match[1], 16);
  const luminance = (0.299 * ((value >> 16) & 255) + 0.587 * ((value >> 8) & 255) + 0.114 * (value & 255)) / 255;
  return luminance > 0.62 ? '#0f172a' : '#ffffff';
}

export interface AttributePreset {
  label: string;
  kind: GridMapAttributeKind;
  name: string;
  value?: number | string;
  max?: number;
  color: string;
}

export const ATTRIBUTE_PRESETS: AttributePreset[] = [
  { label: 'Health', kind: 'bar', name: 'HP', value: 10, max: 10, color: '#ef4444' },
  { label: 'Armor class', kind: 'number', name: 'AC', value: 10, color: '#475569' },
  { label: 'Initiative', kind: 'number', name: 'Init', value: 0, color: '#475569' },
  { label: 'Bar', kind: 'bar', name: 'Bar', value: 5, max: 5, color: '#3b82f6' },
  { label: 'Number', kind: 'number', name: 'Number', value: 0, color: '#475569' },
  { label: 'Text', kind: 'text', name: 'Note', value: '', color: '#475569' },
];

export const CONDITION_PRESETS: Array<{ name: string; color: string }> = [
  { name: 'Blinded', color: '#64748b' },
  { name: 'Charmed', color: '#ec4899' },
  { name: 'Concentrating', color: '#0ea5e9' },
  { name: 'Frightened', color: '#a855f7' },
  { name: 'Grappled', color: '#b45309' },
  { name: 'Incapacitated', color: '#78716c' },
  { name: 'Invisible', color: '#14b8a6' },
  { name: 'Paralyzed', color: '#eab308' },
  { name: 'Poisoned', color: '#16a34a' },
  { name: 'Prone', color: '#92400e' },
  { name: 'Restrained', color: '#ea580c' },
  { name: 'Stunned', color: '#f59e0b' },
  { name: 'Unconscious', color: '#1e293b' },
];

export const CUSTOM_CONDITION_COLOR = '#f97316';

export function createAttribute(preset: Pick<AttributePreset, 'kind' | 'name' | 'value' | 'max' | 'color'>): GridMapTokenAttribute {
  return {
    id: uuidv4(),
    kind: preset.kind,
    name: preset.name,
    ...(preset.kind === 'condition' ? {} : { value: preset.value }),
    ...(preset.kind === 'bar' ? { max: preset.max } : {}),
    color: preset.color,
    showOnToken: true,
  };
}

export function getBarFraction(attribute: GridMapTokenAttribute) {
  const max = Number(attribute.max) || 0;
  if (max <= 0) return 0;
  return Math.max(0, Math.min(1, (Number(attribute.value) || 0) / max));
}

/** Text drawn on the token for pill-style (non-bar) attributes. */
export function getAttributeChipText(attribute: GridMapTokenAttribute) {
  const name = attribute.name.trim();
  if (attribute.kind === 'condition') return name;
  const value = attribute.value === undefined ? '' : String(attribute.value).trim();
  if (attribute.kind === 'text') return name && value ? `${name}: ${value}` : name || value;
  return name && value ? `${name} ${value}` : name || value;
}

/** Fills blank numeric drafts and drops attributes that would render as nothing. */
export function normalizeAttributes(attributes: GridMapTokenAttribute[]): GridMapTokenAttribute[] {
  return attributes
    .map((attribute) => {
      if (attribute.kind === 'bar') {
        const max = Math.max(0, Number(attribute.max) || 0);
        const value = Math.max(0, Number(attribute.value) || 0);
        return { ...attribute, name: attribute.name.trim(), value, max };
      }
      if (attribute.kind === 'number') {
        return { ...attribute, name: attribute.name.trim(), value: Number(attribute.value) || 0 };
      }
      if (attribute.kind === 'text') {
        return { ...attribute, name: attribute.name.trim(), value: String(attribute.value ?? '').trim() };
      }
      return { ...attribute, name: attribute.name.trim() };
    })
    .filter((attribute) => attribute.kind === 'bar' || getAttributeChipText(attribute) !== '');
}

const MAX_TOKEN_IMAGE_DIMENSION = 256;
const MAX_BACKGROUND_IMAGE_DIMENSION = 1600;

/** Downscales a picked image so token art stays small in the saved sheet. */
export function readTokenImage(file: File): Promise<string> {
  return readScaledImage(file, MAX_TOKEN_IMAGE_DIMENSION);
}

/** Downscales a picked map image so the background stays reasonable in the saved sheet. */
export function readBackgroundImage(file: File): Promise<string> {
  return readScaledImage(file, MAX_BACKGROUND_IMAGE_DIMENSION);
}

function readScaledImage(file: File, maxDimension: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight, 1));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const webp = canvas.toDataURL('image/webp', 0.88);
      resolve(webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png'));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    image.src = url;
  });
}
