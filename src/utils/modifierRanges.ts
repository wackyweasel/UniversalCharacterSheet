import { ModifierRange } from '../types';

export const DEFAULT_MODIFIER_RANGES: ModifierRange[] = [
  { min: 1, max: 1, modifier: -5 },
  { min: 2, max: 3, modifier: -4 },
  { min: 4, max: 5, modifier: -3 },
  { min: 6, max: 7, modifier: -2 },
  { min: 8, max: 9, modifier: -1 },
  { min: 10, max: 11, modifier: 0 },
  { min: 12, max: 13, modifier: 1 },
  { min: 14, max: 15, modifier: 2 },
  { min: 16, max: 17, modifier: 3 },
  { min: 18, max: 19, modifier: 4 },
  { min: 20, max: 21, modifier: 5 },
  { min: 22, max: 23, modifier: 6 },
  { min: 24, max: 25, modifier: 7 },
  { min: 26, max: 27, modifier: 8 },
  { min: 28, max: 29, modifier: 9 },
  { min: 30, max: 30, modifier: 10 },
];

export function getModifierForValue(value: number, ranges: ModifierRange[]): number | undefined {
  return ranges.find(range => value >= range.min && value <= range.max)?.modifier;
}

export function getModifierRangeIssue(ranges: ModifierRange[]): string | null {
  if (ranges.some(range => range.min > range.max)) return 'A range minimum cannot exceed its maximum.';

  const sorted = [...ranges].sort((first, second) => first.min - second.min);
  for (let index = 1; index < sorted.length; index++) {
    if (sorted[index].min <= sorted[index - 1].max) return 'Ranges cannot overlap.';
  }

  return null;
}

export function formatSignedNumber(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}