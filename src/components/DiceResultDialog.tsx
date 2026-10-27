import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store/useStore';
import { closeDiceResult, getLastClickPoint, useDiceResultStore } from '../store/useDiceResultStore';
import type { DiceResultEntry } from '../utils/diceResult';
import { DiceResultContent } from './DiceResultContent';
import { XIcon } from './icons';

const VIEWPORT_PADDING = 8;
const stopPropagation = (event: { stopPropagation: () => void }) => event.stopPropagation();

function DiceResultDialog({ entry }: { entry: DiceResultEntry }) {
  const { widgetId, view, centered, point } = entry;
  const dialogRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [rerolling, setRerolling] = useState(false);
  const onClose = useCallback(() => closeDiceResult(widgetId), [widgetId]);

  useLayoutEffect(() => {
    let frame = 0;
    // Click point as a fraction of the widget, so the dialog keeps its spot while the sheet pans or zooms.
    let origin: { fx: number; fy: number } | null | undefined;
    const update = () => {
      const anchor = centered ? null : document.querySelector<HTMLElement>(`[data-widget-id="${CSS.escape(widgetId)}"]`);
      if (!anchor && !centered) {
        onClose();
        return;
      }

      const rect = anchor?.getBoundingClientRect() ?? new DOMRect(0, 0, window.innerWidth, window.innerHeight);
      if (origin === undefined) {
        const click = centered ? point ?? null : getLastClickPoint();
        origin = click && rect.width > 0 && rect.height > 0
          ? { fx: (click.x - rect.left) / rect.width, fy: (click.y - rect.top) / rect.height }
          : null;
      }

      const width = dialogRef.current?.offsetWidth ?? 0;
      const height = dialogRef.current?.offsetHeight ?? 0;
      let preferredLeft: number;
      let preferredTop: number;
      if (origin) {
        // The corner sits on the click; flip to the other side when it would leave the screen.
        const x = rect.left + origin.fx * rect.width;
        const y = rect.top + origin.fy * rect.height;
        preferredLeft = x + width + VIEWPORT_PADDING > window.innerWidth ? x - width : x;
        preferredTop = y + height + VIEWPORT_PADDING > window.innerHeight ? y - height : y;
      } else {
        preferredLeft = rect.left + rect.width / 2 - width / 2;
        preferredTop = rect.top + rect.height / 2 - height / 2;
      }
      const left = Math.min(
        Math.max(VIEWPORT_PADDING, preferredLeft),
        Math.max(VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING),
      );
      const top = Math.min(
        Math.max(VIEWPORT_PADDING, preferredTop),
        Math.max(VIEWPORT_PADDING, window.innerHeight - height - VIEWPORT_PADDING),
      );
      setPosition((current) => (
        current && current.left === left && current.top === top
          ? current
          : { left, top }
      ));
      frame = requestAnimationFrame(update);
    };

    update();
    return () => cancelAnimationFrame(frame);
  }, [widgetId, centered, point, onClose]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (dialogRef.current?.contains(event.target as Node)) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-label={`${view.title} result`}
      className={`dice-result-dialog animate-dropdown-in ${rerolling ? 'dice-result-dialog--hidden' : ''}`}
      style={{
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        visibility: position ? undefined : 'hidden',
      }}
      data-touch-camera-ignore="true"
      onMouseDown={stopPropagation}
      onTouchStart={stopPropagation}
      onWheel={stopPropagation}
    >
      <div className="dice-result-dialog__header">
        <div className="min-w-0">
          <div className="dice-result-dialog__title">{view.title}</div>
          {view.subtitle && <div className="dice-result-dialog__subtitle">{view.subtitle}</div>}
        </div>
        <button type="button" onClick={onClose} className="dice-result-dialog__close" aria-label="Close roll result">
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <DiceResultContent output={entry} variant="overlay" onBusyChange={setRerolling} />
    </div>,
    document.body,
  );
}

export default function DiceResultHost() {
  const entry = useDiceResultStore((state) => state.entry);
  const mode = useStore((state) => state.mode);

  useEffect(() => {
    if (mode === 'print') closeDiceResult();
  }, [mode]);

  return entry ? <DiceResultDialog key={entry.widgetId} entry={entry} /> : null;
}
