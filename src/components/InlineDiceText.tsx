import { useMemo } from 'react';
import type { Widget } from '../types';
import { useStore } from '../store/useStore';
import { useInlineDiceRoll } from '../hooks/useInlineDiceRoll';
import { tokenizeInlineDiceText } from '../utils/inlineDice';
import { DiceIcon } from './icons';
import { InlineEventButton } from './InlineEventButton';
import { Tooltip } from './Tooltip';

interface Props {
  text: string;
  widget: Widget;
  className?: string;
}

export function InlineDiceText({ text, widget, className = '' }: Props) {
  const mode = useStore((state) => state.mode);
  const segments = useMemo(() => tokenizeInlineDiceText(text), [text]);
  const hasTokens = segments.some((segment) => segment.type === 'formula' || segment.type === 'dice');
  const { resolveExpression, rollExpression, rollingExpression } = useInlineDiceRoll(widget, hasTokens);

  if (mode !== 'play' && mode !== 'vertical') {
    return <span className={className}>{text}</span>;
  }

  return (
    <>
      <span className={`inline-dice-text ${className}`}>
        {segments.map((segment, index) => {
          if (segment.type === 'text') return <span key={index}>{segment.value}</span>;
          if (segment.type === 'button') return <InlineEventButton key={index} name={segment.name} widget={widget} />;

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
              aria-busy={rollingExpression === segment.expression}
              disabled={!resolution.valid || rollingExpression === segment.expression}
              title={label}
              onPointerDown={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
              onTouchStart={(event) => event.stopPropagation()}
              onTouchEnd={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                void rollExpression(segment.expression);
              }}
            >
              <DiceIcon />
            </button>
          );
        })}
      </span>
    </>
  );
}