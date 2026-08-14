import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { InlineDiceRollState } from '../hooks/useInlineDiceRoll';
import { XIcon } from './icons';

interface Props {
  state: InlineDiceRollState;
  onClose: () => void;
}

const VIEWPORT_PADDING = 8;
const POPOVER_OFFSET = 6;

export function InlineDiceResultPopover({ state, onClose }: Props) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    const updatePosition = () => {
      const anchorRect = state.anchor.getBoundingClientRect();
      const popoverRect = popoverRef.current?.getBoundingClientRect();
      const width = popoverRect?.width ?? 280;
      const height = popoverRect?.height ?? 160;
      const left = Math.min(
        Math.max(VIEWPORT_PADDING, anchorRect.left),
        Math.max(VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING),
      );
      const below = anchorRect.bottom + POPOVER_OFFSET;
      const top = below + height <= window.innerHeight - VIEWPORT_PADDING
        ? below
        : Math.max(VIEWPORT_PADDING, anchorRect.top - height - POPOVER_OFFSET);
      setPosition({ left, top });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [state]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target) || state.anchor.contains(target)) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, state.anchor]);

  return createPortal(
    <div
      ref={popoverRef}
      role="status"
      aria-live="polite"
      className="inline-dice-popover animate-dropdown-in"
      style={{ left: position.left, top: position.top }}
      data-touch-camera-ignore="true"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="inline-dice-popover__header">
        <div className="min-w-0">
          <div className="inline-dice-popover__source">{`{${state.sourceExpression}}`}</div>
          {state.resolvedExpression && state.resolvedExpression !== state.sourceExpression && (
            <div className="inline-dice-popover__resolved">{state.resolvedExpression}</div>
          )}
        </div>
        <button type="button" onClick={onClose} className="inline-dice-popover__close" aria-label="Close roll result">
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {state.rolling && <div className="inline-dice-popover__message">Rolling...</div>}
      {state.error && <div className="inline-dice-popover__error">{state.error}</div>}
      {state.result && (
        <>
          <div className="inline-dice-popover__total" aria-label={`Roll total ${state.result.total}`}>
            {state.result.total}
          </div>
          <div className="inline-dice-popover__terms">
            {state.result.terms.map((rollTerm, index) => {
              const sign = rollTerm.term.sign === -1 ? '−' : index > 0 ? '+' : '';
              const detail = rollTerm.term.type === 'dice'
                ? `${rollTerm.term.count}d${rollTerm.term.faces}: [${rollTerm.rolls?.join(', ') || ''}]`
                : String(rollTerm.term.value);
              return <span key={index}>{sign}{detail}</span>;
            })}
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}