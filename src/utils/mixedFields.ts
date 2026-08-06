import type { MixedField, MixedFieldType } from '../types';
import type { DiceStep } from './diceExpression';

export const DEFAULT_MIXED_FIELD_DICE_CHAIN: DiceStep[] = ['1d4', '1d6', '1d8', '1d10', '1d12', '1d20'];

export const MIXED_FIELD_TYPE_OPTIONS: { value: MixedFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'progress', label: 'Progress bar' },
  { value: 'resource', label: 'Resource' },
  { value: 'step-dice', label: 'Step dice' },
  { value: 'menu', label: 'Menu' },
  { value: 'switch', label: 'Switch' },
];

export function createMixedField(type: MixedFieldType, name: string): MixedField {
  switch (type) {
    case 'number':
      return { type, name, value: 0 };
    case 'progress':
      return { type, name, current: 0, min: 0, max: 10, showValues: true };
    case 'resource':
      return { type, name, current: 5, max: 5, style: 'dots' };
    case 'step-dice':
      return { type, name, currentStep: 0 };
    case 'menu':
      return { type, name, value: '', options: [] };
    case 'switch':
      return { type, name, value: false };
    case 'text':
    default:
      return { type: 'text', name, value: '' };
  }
}

export function clampMixedFieldValue(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}