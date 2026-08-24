import { useRef, useState } from 'react';
import type { DiceExpressionRollResult } from '../utils/diceExpression';
import { formatDiceRollDetail } from '../utils/diceExpression';
import { rollDiceTerms } from '../utils/diceRoll';
import {
  resolveInlineDiceExpression,
  type ResolvedInlineDiceExpression,
} from '../utils/inlineDice';
import { collectLabels } from '../utils/formulaEngine';
import { useStore } from '../store/useStore';
import { addTimelineEvent } from '../store/useTimelineStore';
import type { Character, Widget } from '../types';

export interface InlineDiceRollState {
  anchor: HTMLElement;
  sourceExpression: string;
  resolvedExpression?: string;
  result?: DiceExpressionRollResult;
  error?: string;
  rolling: boolean;
}

const EMPTY_CHARACTERS: Character[] = [];
const EMPTY_LABELS: Record<string, number> = {};
const labelsByCharacter = new WeakMap<Character, Record<string, number>>();

function getLabelsForCharacter(character: Character): Record<string, number> {
  const cachedLabels = labelsByCharacter.get(character);
  if (cachedLabels) return cachedLabels;

  const labels = collectLabels(character);
  labelsByCharacter.set(character, labels);
  return labels;
}

export function useInlineDiceRoll(widget: Widget, enabled = true) {
  const characters = useStore((state) => enabled ? state.characters : EMPTY_CHARACTERS);
  const activeCharacterId = useStore((state) => enabled ? state.activeCharacterId : null);
  const activeCharacter = enabled
    ? characters.find((character) => character.id === activeCharacterId)
    : undefined;
  const labels = activeCharacter ? getLabelsForCharacter(activeCharacter) : EMPTY_LABELS;
  const [rollState, setRollState] = useState<InlineDiceRollState | null>(null);
  const requestIdRef = useRef(0);

  const resolveExpression = (expression: string): ResolvedInlineDiceExpression => (
    resolveInlineDiceExpression(expression, labels)
  );

  const rollExpression = async (expression: string, anchor: HTMLElement) => {
    const resolution = resolveExpression(expression);
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

    if (!resolution.valid) {
      setRollState({
        anchor,
        sourceExpression: expression,
        error: resolution.reason,
        rolling: false,
      });
      return;
    }

    setRollState({
      anchor,
      sourceExpression: expression,
      resolvedExpression: resolution.resolvedExpression,
      rolling: true,
    });

    const result = await rollDiceTerms(resolution.terms);
    addTimelineEvent(
      widget.data.label || 'Inline roll',
      widget.type,
      `{${expression}}: ${formatDiceRollDetail(result)}`,
      '🎲',
    );

    if (requestIdRef.current !== requestId) return;
    setRollState({
      anchor,
      sourceExpression: expression,
      resolvedExpression: resolution.resolvedExpression,
      result,
      rolling: false,
    });
  };

  const closeResult = () => {
    requestIdRef.current += 1;
    setRollState(null);
  };

  return {
    closeResult,
    resolveExpression,
    rollExpression,
    rollState,
  };
}