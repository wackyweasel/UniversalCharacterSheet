import { splitCardSymbols } from './cardSymbols';

const LEGACY_STYLES = new Set(['dots', 'boxes', 'stars', 'diamonds', 'crosses', 'checkmarks', 'hearts', 'flames', 'skulls', 'shields', 'swords', 'lightning', 'moons', 'suns', 'coins', 'gems']);
const EMOJI_STYLES = new Set(['hearts', 'flames', 'skulls', 'shields', 'swords', 'lightning', 'moons', 'suns', 'coins', 'gems']);

/** Emoji symbols keep their own colors; the others take the text color. */
export function isEmojiResourceStyle(style: string): boolean {
  return EMOJI_STYLES.has(style);
}

/** A style that is itself the symbol, used for every point (empty ones are dimmed). */
export function isLiteralResourceStyle(style: string): boolean {
  return !LEGACY_STYLES.has(style) && splitCardSymbols(style).length === 1;
}

export function getResourceSymbol(filled: boolean, style: string): string {
  switch (style) {
    case 'hearts': return filled ? '❤️' : '🖤';
    case 'boxes': return filled ? '■' : '□';
    case 'stars': return filled ? '★' : '☆';
    case 'diamonds': return filled ? '◆' : '◇';
    case 'crosses': return filled ? '✖' : '✕';
    case 'checkmarks': return filled ? '✔' : '○';
    case 'flames': return filled ? '🔥' : '·';
    case 'skulls': return filled ? '💀' : '·';
    case 'shields': return filled ? '🛡️' : '·';
    case 'swords': return filled ? '⚔️' : '·';
    case 'lightning': return filled ? '⚡' : '·';
    case 'moons': return filled ? '🌙' : '·';
    case 'suns': return filled ? '☀️' : '·';
    case 'coins': return filled ? '🪙' : '·';
    case 'gems': return filled ? '💎' : '·';
    case 'dots': return filled ? '●' : '○';
    default: return isLiteralResourceStyle(style) ? style : filled ? '●' : '○';
  }
}
