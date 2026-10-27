import { Fragment } from 'react';
import type { Character, CharacterEvent, CharacterEventEffect } from '../../types';
import { findWidget } from '../../events/helpers';
import { describeEffect, describeTrigger, getEffectProblem, getEventIcon, getTriggerProblem } from '../../events/registry';

interface FlowLineProps {
  character: Character;
  kind: string;
  widgetId?: string;
  text: string;
  problem: string | null;
  onRevealWidget?: (widgetId: string) => void;
  onHoverWidget?: (widgetId: string | null) => void;
}

function FlowLine({ character, kind, widgetId, text, problem, onRevealWidget, onHoverWidget }: FlowLineProps) {
  const widget = findWidget(character, widgetId);
  const content = (
    <>
      <span className="event-flow__icon" aria-hidden="true">{problem ? '⚠️' : getEventIcon(kind, widget)}</span>
      <span className="min-w-0 flex-1 break-words font-body">{text}</span>
    </>
  );
  const className = `event-flow__line ${problem ? 'event-flow__line--problem' : ''}`;

  if (widget && onRevealWidget) {
    return (
      <button
        type="button"
        className={className}
        title={problem ?? 'Show this widget'}
        onClick={() => onRevealWidget(widget.id)}
        onMouseEnter={() => onHoverWidget?.(widget.id)}
        onMouseLeave={() => onHoverWidget?.(null)}
        onFocus={() => onHoverWidget?.(widget.id)}
        onBlur={() => onHoverWidget?.(null)}
      >
        {content}
      </button>
    );
  }
  return <div className={className} title={problem ?? undefined}>{content}</div>;
}

interface EventFlowProps {
  character: Character;
  event: Pick<CharacterEvent, 'trigger' | 'steps'>;
  onRevealWidget?: (widgetId: string) => void;
  onHoverWidget?: (widgetId: string | null) => void;
}

/** An event drawn as linked WHEN → ONLY IF → THEN → ELSE steps, repeated for each step. */
export function EventFlow({ character, event, onRevealWidget, onHoverWidget }: EventFlowProps) {
  const lineProps = { character, onRevealWidget, onHoverWidget };
  const renderEffects = (effects: CharacterEventEffect[]) => effects.map((effect) => (
    <FlowLine
      key={effect.id}
      {...lineProps}
      kind={effect.kind}
      widgetId={effect.widgetId}
      text={describeEffect(character, effect)}
      problem={getEffectProblem(character, effect)}
    />
  ));

  return (
    <div className="event-flow">
      <div className="event-flow__step">
        <span className="event-flow__pill event-flow__pill--when">When</span>
        <div className="min-w-0">
          <FlowLine
            {...lineProps}
            kind={event.trigger.kind}
            widgetId={event.trigger.widgetId}
            text={describeTrigger(character, event.trigger)}
            problem={getTriggerProblem(character, event.trigger)}
          />
        </div>
      </div>
      {event.steps.map((step, index) => {
        const condition = step.condition?.trim();
        return (
          <Fragment key={step.id}>
            {condition && (
              <div className="event-flow__step">
                <span className="event-flow__pill event-flow__pill--if" title="Only if">If</span>
                <div className="flex min-h-6 min-w-0 items-center">
                  <code className="event-flow__condition text-theme-ink">{condition}</code>
                </div>
              </div>
            )}
            <div className="event-flow__step">
              <span className="event-flow__pill event-flow__pill--then">Then</span>
              <div className="min-w-0 space-y-0.5">
                {step.effects.length === 0 ? (
                  <p className="text-sm italic leading-6 text-theme-muted font-body">
                    {index === 0 && event.steps.length === 1 ? 'Nothing happens yet' : 'Nothing happens'}
                  </p>
                ) : renderEffects(step.effects)}
              </div>
            </div>
            {!!step.otherwise?.length && (
              <div className="event-flow__step">
                <span className="event-flow__pill event-flow__pill--else" title="Otherwise">Else</span>
                <div className="min-w-0 space-y-0.5">{renderEffects(step.otherwise)}</div>
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
