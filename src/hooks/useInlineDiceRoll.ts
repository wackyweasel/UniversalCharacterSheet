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
import type { Widget } from '../types';

export interface InlineDiceRollState {
  anchor: HTMLElement;
  sourceExpression: string;
  resolvedExpression?: string;
  result?: DiceExpressionRollResult;
  error?: string;
  rolling: boolean;
}

export function useInlineDiceRoll(widget: Widget) {
  const characters = useStore((state) => state.characters);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const activeCharacter = characters.find((character) => character.id === activeCharacterId);
  const labels = activeCharacter ? collectLabels(activeCharacter) : {};
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