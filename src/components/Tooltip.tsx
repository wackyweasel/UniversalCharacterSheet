import React, { useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';

interface TooltipProps {
  content: string | undefined;
  children: React.ReactElement;
  placement?: 'above' | 'below' | 'left';
}

const OFFSET = 12;

export function Tooltip({ content, children, placement = 'above' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);

  const calcCoords = useCallback((e: React.MouseEvent) => {
    if (placement === 'below') {
      return { top: e.clientY + window.scrollY + OFFSET, left: e.clientX + window.scrollX + OFFSET };
    }
    if (placement === 'left') {
      return { top: e.clientY + window.scrollY + OFFSET, left: e.clientX + window.scrollX - OFFSET };
    }
    return { top: e.clientY + window.scrollY - OFFSET, left: e.clientX + window.scrollX + OFFSET };
  }, [placement]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    setCoords(calcCoords(e));
  }, [calcCoords]);

  const show = useCallback((e: React.MouseEvent) => {
    setCoords(calcCoords(e));
    setVisible(true);
  }, [calcCoords]);

  const hide = useCallback(() => setVisible(false), []);

  const child = React.cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: content ? (e: React.MouseEvent) => {
      show(e);
      children.props.onMouseEnter?.(e);
    } : children.props.onMouseEnter,
    onMouseLeave: content ? (e: React.MouseEvent) => {
      hide();
      children.props.onMouseLeave?.(e);
    } : children.props.onMouseLeave,
    onMouseMove: content ? (e: React.MouseEvent) => {
      onMouseMove(e);
      children.props.onMouseMove?.(e);
    } : children.props.onMouseMove,
  });

  return (
    <>
      {child}
      {visible && content && ReactDOM.createPortal(
        <div
          style={{
            position: 'absolute',
            top: coords.top,
            left: coords.left,
            transform: placement === 'below' ? 'translateY(0)' : placement === 'left' ? 'translate(-100%, 0)' : 'translateY(-100%)',
            zIndex: 9999,
            maxWidth: '260px',
            padding: '6px 10px',
            fontSize: '0.82rem',
            lineHeight: '1.5',
            fontFamily: 'var(--font-body)',
            color: 'var(--color-paper)',
            backgroundColor: 'var(--color-ink)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-style)',
            borderRadius: 'var(--button-radius)',
            whiteSpace: 'pre-wrap',
            pointerEvents: 'none',
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
}
