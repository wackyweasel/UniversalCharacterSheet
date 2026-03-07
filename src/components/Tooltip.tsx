import React, { useState, useRef, useCallback, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';

interface TooltipProps {
  content: string | undefined;
  children: React.ReactElement;
  placement?: 'above' | 'below' | 'left';
}

const OFFSET = 12;

// Suppress tooltip after any touch interaction (touch fires synthetic mouseenter too)
let recentTouch = false;
let recentTouchTimer: ReturnType<typeof setTimeout> | null = null;
function markRecentTouch() {
  recentTouch = true;
  if (recentTouchTimer) clearTimeout(recentTouchTimer);
  recentTouchTimer = setTimeout(() => { recentTouch = false; }, 600);
}

export function Tooltip({ content, children, placement = 'above' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipElRef = useRef<HTMLDivElement>(null);

  // After the tooltip renders, clamp it to keep it inside the viewport
  useLayoutEffect(() => {
    if (!visible || !tooltipElRef.current) return;
    const el = tooltipElRef.current;
    const rect = el.getBoundingClientRect();
    const PAD = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (rect.right > vw - PAD) {
      el.style.left = `${parseFloat(el.style.left) - (rect.right - (vw - PAD))}px`;
    } else if (rect.left < PAD) {
      el.style.left = `${parseFloat(el.style.left) + (PAD - rect.left)}px`;
    }
    if (rect.bottom > vh - PAD) {
      el.style.top = `${parseFloat(el.style.top) - (rect.bottom - (vh - PAD))}px`;
    } else if (rect.top < PAD) {
      el.style.top = `${parseFloat(el.style.top) + (PAD - rect.top)}px`;
    }
  }, [visible, coords]);

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
    if (recentTouch) return;
    setCoords(calcCoords(e));
  }, [calcCoords]);

  const show = useCallback((e: React.MouseEvent) => {
    if (recentTouch) return;
    setCoords(calcCoords(e));
    setVisible(true);
  }, [calcCoords]);

  const hide = useCallback(() => setVisible(false), []);

  const child = React.cloneElement(children, {
    ref: triggerRef,
    onTouchStart: (e: React.TouchEvent) => {
      markRecentTouch();
      hide();
      children.props.onTouchStart?.(e);
    },
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
          ref={tooltipElRef}
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
