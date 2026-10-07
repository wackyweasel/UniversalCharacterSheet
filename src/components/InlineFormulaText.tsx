import { useFormulaLabels } from '../hooks/useFormulaLabels';
import { resolveInlineFormulasToText } from '../utils/inlineDice';

interface Props {
  text?: string;
}

/** Renders `{formula}` tokens as plain text; dice tokens stay literal so it is safe inside controls. */
export function InlineFormulaText({ text }: Props) {
  const labels = useFormulaLabels(!!text?.includes('{'));
  if (!text) return null;
  if (!text.includes('{')) return <>{text}</>;
  return <>{resolveInlineFormulasToText(text, labels)}</>;
}

/** Non-component variant for aria-labels, tooltips and other string-only contexts. */
export function useInlineFormulaString(text: string | undefined): string {
  const labels = useFormulaLabels(!!text?.includes('{'));
  if (!text) return '';
  if (!text.includes('{')) return text;
  return resolveInlineFormulasToText(text, labels);
}
