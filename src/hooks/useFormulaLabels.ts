import type { Character } from '../types';
import { useStore } from '../store/useStore';
import { collectLabels } from '../utils/formulaEngine';
import type { FormulaLabels } from '../utils/formulaSyntax';

const labelCache = new WeakMap<Character, FormulaLabels>();
const NO_LABELS: FormulaLabels = {};

/**
 * Labels are cached per character object so many inline tokens share one scan.
 * Pass `enabled = false` for text without tokens so it does not re-render on every character change.
 */
export function useFormulaLabels(enabled = true): FormulaLabels {
  const activeCharacter = useStore((state) => (
    enabled ? state.characters.find((character) => character.id === state.activeCharacterId) : undefined
  ));
  if (!activeCharacter) return NO_LABELS;

  let labels = labelCache.get(activeCharacter);
  if (!labels) {
    labels = collectLabels(activeCharacter);
    labelCache.set(activeCharacter, labels);
  }
  return labels;
}
