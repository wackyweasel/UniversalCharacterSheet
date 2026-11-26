import { GridMapToken } from '../types';
import { getAttributeChipText, getBarFraction, readableTextColor } from './gridMapTokens';

interface Point {
  x: number;
  y: number;
}

export interface CaptionLayout {
  width: number;
  height: number;
  name: { lines: string[]; width: number; height: number; fontSize: number; lineHeight: number } | null;
  chips: Array<{ text: string; color: string; filled: boolean; x: number; y: number; width: number; height: number }>;
  chipFontSize: number;
  chipPadding: number;
  dotRadius: number;
  dotSpace: number;
}

const FONT_FAMILY = 'sans-serif';

export function wrapTokenName(context: CanvasRenderingContext2D, name: string, maxWidth: number, maxLines = 3) {
  const words = name.trim().split(/\s+/);
  const lines: string[] = [];

  for (const word of words) {
    const candidate = lines.length === 0 ? word : `${lines[lines.length - 1]} ${word}`;
    if (lines.length === 0 || context.measureText(candidate).width <= maxWidth) {
      if (lines.length === 0) lines.push(word);
      else lines[lines.length - 1] = candidate;
    } else if (lines.length < maxLines) {
      lines.push(word);
    } else {
      lines[maxLines - 1] = `${lines[maxLines - 1]} ${word}`;
    }
  }

  return lines;
}

function fitText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (context.measureText(text).width <= maxWidth) return text;
  let end = text.length;
  while (end > 1 && context.measureText(`${text.slice(0, end)}…`).width > maxWidth) end -= 1;
  return `${text.slice(0, end)}…`;
}

interface BodyOptions {
  center: Point;
  radius: number;
  color: string;
  image: HTMLImageElement | null;
  selected: boolean;
  hovered: boolean;
  accent: string;
}

export function drawTokenBody(context: CanvasRenderingContext2D, { center, radius, color, image, selected, hovered, accent }: BodyOptions) {
  context.save();
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.fillStyle = color;
  context.shadowColor = 'rgba(15, 23, 42, 0.4)';
  context.shadowBlur = selected ? 9 : 5;
  context.shadowOffsetY = 2;
  context.fill();
  context.shadowColor = 'transparent';

  context.save();
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.clip();
  if (image && image.naturalWidth > 0) {
    const scale = Math.max((radius * 2) / image.naturalWidth, (radius * 2) / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(image, center.x - width / 2, center.y - height / 2, width, height);
  } else {
    const sheen = context.createRadialGradient(center.x - radius * 0.35, center.y - radius * 0.45, radius * 0.1, center.x, center.y, radius * 1.1);
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.34)');
    sheen.addColorStop(0.55, 'rgba(255, 255, 255, 0)');
    sheen.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
    context.fillStyle = sheen;
    context.fillRect(center.x - radius, center.y - radius, radius * 2, radius * 2);
  }
  context.restore();

  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.lineWidth = selected ? 3 : hovered ? 2.5 : 2;
  context.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  context.stroke();
  context.beginPath();
  context.arc(center.x, center.y, radius + 1.2, 0, Math.PI * 2);
  context.lineWidth = 1;
  context.strokeStyle = 'rgba(15, 23, 42, 0.45)';
  context.stroke();
  if (selected) {
    context.beginPath();
    context.arc(center.x, center.y, radius + 4, 0, Math.PI * 2);
    context.lineWidth = 2;
    context.strokeStyle = accent;
    context.stroke();
  }
  context.restore();
}

/** Draws visible bar attributes stacked above the token. */
export function drawTokenBars(context: CanvasRenderingContext2D, token: GridMapToken, center: Point, radius: number) {
  const bars = (token.attributes || []).filter((attribute) => attribute.kind === 'bar' && attribute.showOnToken);
  if (bars.length === 0) return;

  const labelled = radius >= 20;
  const height = labelled ? 12 : 6;
  const width = Math.max(radius * 2, 26);
  const gap = 2;
  let top = center.y - radius - 5 - height;

  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  for (const bar of bars) {
    const left = center.x - width / 2;
    const fraction = getBarFraction(bar);
    const color = bar.color || '#ef4444';

    context.shadowColor = 'rgba(15, 23, 42, 0.35)';
    context.shadowBlur = 3;
    context.shadowOffsetY = 1;
    context.fillStyle = 'rgba(15, 23, 42, 0.88)';
    context.beginPath();
    context.roundRect(left - 1.5, top - 1.5, width + 3, height + 3, (height + 3) / 2);
    context.fill();
    context.shadowColor = 'transparent';

    if (fraction > 0) {
      context.fillStyle = color;
      context.beginPath();
      context.roundRect(left, top, Math.max(height, width * fraction), height, height / 2);
      context.fill();
      const gloss = context.createLinearGradient(0, top, 0, top + height);
      gloss.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
      gloss.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
      context.fillStyle = gloss;
      context.fill();
    }

    if (labelled) {
      const text = `${Number(bar.value) || 0}/${Number(bar.max) || 0}`;
      context.font = `700 ${height - 3}px ${FONT_FAMILY}`;
      context.lineWidth = 2.5;
      context.strokeStyle = 'rgba(15, 23, 42, 0.85)';
      context.lineJoin = 'round';
      context.strokeText(text, center.x, top + height / 2 + 0.5);
      context.fillStyle = '#ffffff';
      context.fillText(text, center.x, top + height / 2 + 0.5);
    }
    top -= height + gap + 2;
  }
  context.restore();
}

interface CaptionOptions {
  token: GridMapToken;
  showName: boolean;
  radius: number;
  nameFontSize: number;
  gridSize: number;
}

/** Lays out the name badge and attribute pills that sit below a token. */
export function layoutTokenCaption(context: CanvasRenderingContext2D, { token, showName, radius, nameFontSize, gridSize }: CaptionOptions): CaptionLayout | null {
  const chipSources = (token.attributes || [])
    .filter((attribute) => attribute.showOnToken && attribute.kind !== 'bar')
    .map((attribute) => ({ attribute, text: getAttributeChipText(attribute) }))
    .filter((chip) => chip.text !== '');
  if (!showName && chipSources.length === 0) return null;

  const maxWidth = Math.max(gridSize * 2.75, radius * 2.4);
  let name: CaptionLayout['name'] = null;
  if (showName) {
    const lineHeight = nameFontSize * 1.18;
    const horizontalPadding = Math.max(5, nameFontSize * 0.55);
    const verticalPadding = Math.max(3.5, nameFontSize * 0.38);
    context.font = `700 ${nameFontSize}px ${FONT_FAMILY}`;
    const lines = wrapTokenName(context, token.name, maxWidth - horizontalPadding * 2);
    name = {
      lines,
      width: Math.max(...lines.map((line) => context.measureText(line).width)) + horizontalPadding * 2,
      height: lines.length * lineHeight + verticalPadding * 2,
      fontSize: nameFontSize,
      lineHeight,
    };
  }

  const chipFontSize = Math.max(7.5, Math.min(11, nameFontSize * 0.9));
  const chipHeight = chipFontSize * 1.55;
  const chipPadding = chipFontSize * 0.65;
  const dotRadius = chipFontSize * 0.28;
  const dotSpace = dotRadius * 2 + chipFontSize * 0.3;
  const chipGap = 3;
  context.font = `600 ${chipFontSize}px ${FONT_FAMILY}`;

  const rows: Array<Array<{ text: string; color: string; filled: boolean; width: number }>> = [];
  let rowWidth = 0;
  for (const { attribute, text } of chipSources) {
    const filled = attribute.kind === 'condition';
    const leading = filled ? 0 : dotSpace;
    const fitted = fitText(context, text, maxWidth - chipPadding * 2 - leading);
    const width = context.measureText(fitted).width + chipPadding * 2 + leading;
    const chip = { text: fitted, color: attribute.color || '#475569', filled, width };
    if (rows.length === 0 || rowWidth + chipGap + width > maxWidth) {
      rows.push([chip]);
      rowWidth = width;
    } else {
      rows[rows.length - 1].push(chip);
      rowWidth += chipGap + width;
    }
  }

  const rowWidths = rows.map((row) => row.reduce((sum, chip) => sum + chip.width, 0) + chipGap * (row.length - 1));
  const width = Math.max(name?.width ?? 0, ...rowWidths);
  const nameBlockHeight = name ? name.height + (rows.length > 0 ? 3 : 0) : 0;
  const chips: CaptionLayout['chips'] = [];
  rows.forEach((row, rowIndex) => {
    let x = (width - rowWidths[rowIndex]) / 2;
    for (const chip of row) {
      chips.push({ ...chip, x, y: nameBlockHeight + rowIndex * (chipHeight + chipGap), height: chipHeight });
      x += chip.width + chipGap;
    }
  });

  return {
    width,
    height: nameBlockHeight + (rows.length > 0 ? rows.length * chipHeight + (rows.length - 1) * chipGap : 0),
    name,
    chips,
    chipFontSize,
    chipPadding,
    dotRadius,
    dotSpace,
  };
}

export function drawTokenCaption(context: CanvasRenderingContext2D, layout: CaptionLayout, left: number, top: number) {
  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  if (layout.name) {
    const { name } = layout;
    const x = left + (layout.width - name.width) / 2;
    context.font = `700 ${name.fontSize}px ${FONT_FAMILY}`;
    context.shadowColor = 'rgba(15, 23, 42, 0.3)';
    context.shadowBlur = 4;
    context.shadowOffsetY = 1;
    context.fillStyle = 'rgba(15, 23, 42, 0.9)';
    context.beginPath();
    context.roundRect(x, top, name.width, name.height, Math.min(8, name.height / 2.5));
    context.fill();
    context.shadowColor = 'transparent';
    context.lineWidth = 1;
    context.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    context.stroke();
    context.fillStyle = '#ffffff';
    const firstLineY = top + name.height / 2 - ((name.lines.length - 1) * name.lineHeight) / 2;
    name.lines.forEach((line, index) => {
      context.fillText(line, x + name.width / 2, firstLineY + index * name.lineHeight);
    });
  }

  context.font = `600 ${layout.chipFontSize}px ${FONT_FAMILY}`;
  for (const chip of layout.chips) {
    const x = left + chip.x;
    const y = top + chip.y;
    context.shadowColor = 'rgba(15, 23, 42, 0.3)';
    context.shadowBlur = 3;
    context.shadowOffsetY = 1;
    context.fillStyle = chip.filled ? chip.color : 'rgba(15, 23, 42, 0.9)';
    context.beginPath();
    context.roundRect(x, y, chip.width, chip.height, chip.height / 2);
    context.fill();
    context.shadowColor = 'transparent';
    context.lineWidth = 1;
    context.strokeStyle = chip.filled ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.45)';
    context.stroke();

    let textLeft = x + layout.chipPadding;
    if (!chip.filled) {
      context.fillStyle = chip.color;
      context.beginPath();
      context.arc(x + layout.chipPadding + layout.dotRadius, y + chip.height / 2, layout.dotRadius, 0, Math.PI * 2);
      context.fill();
      textLeft += layout.dotSpace;
    }
    context.fillStyle = chip.filled ? readableTextColor(chip.color) : '#ffffff';
    context.textAlign = 'left';
    context.fillText(chip.text, textLeft, y + chip.height / 2 + 0.5);
    context.textAlign = 'center';
  }
  context.restore();
}
