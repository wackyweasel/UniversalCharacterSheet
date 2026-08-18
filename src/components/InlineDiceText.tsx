import type { Widget } from '../types';
import { useStore } from '../store/useStore';
import { useInlineDiceRoll } from '../hooks/useInlineDiceRoll';
import { tokenizeInlineDiceText } from '../utils/inlineDice';
import { DiceIcon } from './icons';
import { InlineDiceResultPopover } from './InlineDiceResultPopover';
import { Tooltip } from './Tooltip';

interface Props {
  text: string;
  widget: Widget;
  className?: string;
}

export function InlineDiceText({ text, widget, className = '' }: Props) {
  const mode = useStore((state) => state.mode);
  const { closeResult, resolveExpression, rollExpression, rollState } = useInlineDiceRoll(widget);

  if (mode !== 'play' && mode !== 'vertical') {
    return <span className={className}>{text}</span>;
  }

  const segments = tokenizeInlineDiceText(text);
  return (
    <>
      <span className={`inline-dice-text ${className}`}>
        {segments.map((segment, index) => {
          if (segment.type === 'text') return <span key={index}>{segment.value}</span>;

          const resolution = resolveExpression(segment.expression);
          if (segment.type === 'formula') {
            if (!resolution.valid) {
              return <span key={index}>{segment.source}</span>;
            }

            return (
              <Tooltip key={index} content={segment.source}>
                <span className="inline-dice-formula">{resolution.resolvedExpression}</span>
              </Tooltip>
            );
          }

          const label = resolution.valid
            ? `Roll ${resolution.resolvedExpression}`
            : `${segment.expression}: ${resolution.reason}`;
          return (
            <button
              key={index}
              type="button"
              className={`inline-dice-token ${resolution.valid ? '' : 'inline-dice-token--invalid'}`}
              aria-label={label}
              aria-busy={rollState?.rolling && rollState.sourceExpression === segment.expression}
              disabled={!resolution.valid || (rollState?.rolling && rollState.sourceExpression === segment.expression)}
              title={label}
              onPointerDown={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                void rollExpression(segment.expression, event.currentTarget);
              }}
            >
              <DiceIcon />
            </button>
          );
        })}
      </span>
      {rollState && <InlineDiceResultPopover state={rollState} onClose={closeResult} />}
    </>
  );
}