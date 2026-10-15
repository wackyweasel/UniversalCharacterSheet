import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { DiceResultContent } from '../components/DiceResultContent';
import { closeDiceResult, showDiceResult } from '../store/useDiceResultStore';
import type { DiceResultOutput } from '../utils/diceResult';

/**
 * Shows a widget's dice results either in the lower part of the widget (`panel`)
 * or, when `overlay` is set, in the floating dialog over the widget.
 */
export function useDiceResult(widgetId: string, overlay: boolean, hidden = false): {
  show: (output: DiceResultOutput) => void;
  close: () => void;
  /** An inline result is showing, so the widget can offer a clear button. */
  hasResult: boolean;
  panel: ReactNode;
} {
  const [output, setOutput] = useState<DiceResultOutput | null>(null);

  useEffect(() => {
    if (overlay) setOutput(null);
  }, [overlay]);

  const show = useCallback((next: DiceResultOutput) => {
    if (overlay) {
      showDiceResult({ widgetId, ...next });
    } else {
      closeDiceResult(widgetId);
      setOutput(next);
    }
  }, [overlay, widgetId]);

  const close = useCallback(() => {
    setOutput(null);
    closeDiceResult(widgetId);
  }, [widgetId]);

  const hasResult = !!output && !overlay && !hidden;
  const panel = hasResult && output
    ? <DiceResultContent output={output} variant="inline" />
    : null;

  return { show, close, hasResult, panel };
}
