import type { Character } from '../types';
import { useStore } from '../store/useStore';
import { collectLabels } from '../utils/formulaEngine';
import type { FormulaLabels } from '../utils/formulaSyntax';

const labelCache = new WeakMap<Character, FormulaLabels>();

/** Labels are cached per character object so many inline tokens share one scan. */
export function useFormulaLabels(): FormulaLabels {
  const activeCharacter = useStore((state) => (
    state.characters.find((character) => character.id === state.activeCharacterId)
  ));
  if (!activeCharacter) return {};

  let labels = labelCache.get(activeCharacter);
  if (!labels) {
    labels = collectLabels(activeCharacter);
    labelCache.set(activeCharacter, labels);
  }
  return labels;
}
