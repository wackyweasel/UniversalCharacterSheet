import { useStore } from '../store/useStore';
import { useFormulaLabels } from '../hooks/useFormulaLabels';
import { resolveInlineFormulasToText } from '../utils/inlineDice';

interface Props {
  text?: string;
}

/** Renders `{formula}` tokens as plain text; dice tokens stay literal so it is safe inside controls. */
export function InlineFormulaText({ text }: Props) {
  const mode = useStore((state) => state.mode);
  const labels = useFormulaLabels(!!text?.includes('{'));
  if (!text) return null;
  if (mode === 'edit' || !text.includes('{')) return <>{text}</>;
  return <>{resolveInlineFormulasToText(text, labels)}</>;
}

/** Non-component variant for aria-labels, tooltips and other string-only contexts. */
export function useInlineFormulaString(text: string | undefined): string {
  const mode = useStore((state) => state.mode);
  const labels = useFormulaLabels(!!text?.includes('{'));
  if (!text) return '';
  if (mode === 'edit' || !text.includes('{')) return text;
  return resolveInlineFormulasToText(text, labels);
}
