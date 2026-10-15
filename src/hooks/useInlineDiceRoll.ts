import { useState } from 'react';
import { formatDiceRollDetail } from '../utils/diceExpression';
import { rollDiceTerms } from '../utils/diceRoll';
import {
  resolveInlineDiceExpression,
  type ResolvedInlineDiceExpression,
} from '../utils/inlineDice';
import { showExpressionRoll } from '../utils/showExpressionRoll';
import { useFormulaLabels } from './useFormulaLabels';
import { addTimelineEvent } from '../store/useTimelineStore';
import { showDiceResult } from '../store/useDiceResultStore';
import { TUTORIAL_STEPS, useTutorialStore } from '../store/useTutorialStore';
import type { Widget } from '../types';

/** `hasTokens = false` skips label subscriptions for plain text, which has nothing to resolve or roll. */
export function useInlineDiceRoll(widget: Widget, hasTokens = true) {
  const labels = useFormulaLabels(hasTokens);
  const [rollingExpression, setRollingExpression] = useState<string | null>(null);

  const resolveExpression = (expression: string): ResolvedInlineDiceExpression => (
    resolveInlineDiceExpression(expression, labels)
  );

  const logRoll = (expression: string, detail: string) => addTimelineEvent(
    widget.data.label || 'Inline roll',
    widget.type,
    `{${expression}}: ${detail}`,
    '🎲',
  );

  const rollExpression = async (expression: string) => {
    const resolution = resolveExpression(expression);
    const title = `{${expression}}`;

    if (!resolution.valid) {
      showDiceResult({ widgetId: widget.id, view: { title, dice: [], error: resolution.reason } });
      return;
    }

    setRollingExpression(expression);
    try {
      const result = await rollDiceTerms(resolution.terms);
      logRoll(expression, formatDiceRollDetail(result));
      showExpressionRoll({
        show: (output) => showDiceResult({ widgetId: widget.id, ...output }),
        title,
        subtitle: resolution.resolvedExpression !== expression ? resolution.resolvedExpression : undefined,
        result,
        onReroll: (next) => logRoll(expression, `rerolled ${formatDiceRollDetail(next)}`),
      });

      const { tutorialStep, advanceTutorial } = useTutorialStore.getState();
      if (tutorialStep !== null && TUTORIAL_STEPS[tutorialStep]?.id === 'advanced-inline-dice-roll') {
        // Let the result dialog mount so the next step can point at it.
        window.setTimeout(advanceTutorial, 150);
      }
    } finally {
      setRollingExpression(null);
    }
  };

  return {
    resolveExpression,
    rollExpression,
    rollingExpression,
  };
}
