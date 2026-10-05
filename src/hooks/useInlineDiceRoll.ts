import { useRef, useState } from 'react';
import type { DiceExpressionRollResult } from '../utils/diceExpression';
import { formatDiceRollDetail } from '../utils/diceExpression';
import { rollDiceTerms } from '../utils/diceRoll';
import {
  resolveInlineDiceExpression,
  type ResolvedInlineDiceExpression,
} from '../utils/inlineDice';
import { useFormulaLabels } from './useFormulaLabels';
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

/** `hasTokens = false` skips label subscriptions for plain text, which has nothing to resolve or roll. */
export function useInlineDiceRoll(widget: Widget, hasTokens = true) {
  const labels = useFormulaLabels(hasTokens);
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