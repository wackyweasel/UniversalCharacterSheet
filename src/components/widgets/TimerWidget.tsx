import { useState, useEffect, useRef, useCallback } from 'react';
import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export default function TimerWidget({ widget, mode }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const {
    label,
    timerElapsed = 0,
    timerRunning = false,
    timerStartedAt = 0,
    timerCountDown = false,
    timerDuration = 60000,
  } = widget.data;

  const [displayMs, setDisplayMs] = useState(() => {
    if (timerRunning && timerStartedAt) {
      return timerElapsed + (Date.now() - timerStartedAt);
    }
    return timerElapsed;
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick the display when running
  useEffect(() => {
    if (timerRunning && timerStartedAt) {
      const tick = () => {
        const elapsed = timerElapsed + (Date.now() - timerStartedAt);
        if (timerCountDown && elapsed >= timerDuration) {
          setDisplayMs(timerDuration);
          // Auto-stop when countdown reaches zero
          updateWidgetData(widget.id, {
            timerRunning: false,
            timerElapsed: timerDuration,
            timerStartedAt: 0,
          });
        } else {
          setDisplayMs(elapsed);
        }
      };
      tick();
      intervalRef.current = setInterval(tick, 100);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      setDisplayMs(timerElapsed);
    }
  }, [timerRunning, timerStartedAt, timerElapsed, timerCountDown, timerDuration, widget.id, updateWidgetData]);

  const handleStart = useCallback(() => {
    // Don't start if countdown already finished
    if (timerCountDown && timerElapsed >= timerDuration) return;
    updateWidgetData(widget.id, {
      timerRunning: true,
      timerStartedAt: Date.now(),
    });
  }, [timerCountDown, timerElapsed, timerDuration, widget.id, updateWidgetData]);

  const handlePause = useCallback(() => {
    const now = Date.now();
    const totalElapsed = timerElapsed + (timerStartedAt ? now - timerStartedAt : 0);
    updateWidgetData(widget.id, {
      timerRunning: false,
      timerElapsed: totalElapsed,
      timerStartedAt: 0,
    });
  }, [timerElapsed, timerStartedAt, widget.id, updateWidgetData]);

  const handleReset = useCallback(() => {
    updateWidgetData(widget.id, {
      timerRunning: false,
      timerElapsed: 0,
      timerStartedAt: 0,
    });
  }, [widget.id, updateWidgetData]);

  const shownMs = timerCountDown ? Math.max(0, timerDuration - displayMs) : displayMs;
  const isFinished = timerCountDown && displayMs >= timerDuration;

  const isPrint = mode === 'print';
  const btnBase =
    'px-2 py-1 text-xs font-body rounded-button transition-colors border border-theme-border';

  return (
    <div className="flex flex-col items-center justify-center h-full w-full gap-1 select-none">
      {label && (
        <div className="font-bold text-xs text-theme-ink font-heading flex-shrink-0">
          {label}
        </div>
      )}

      <div
        className={`font-mono text-2xl font-bold text-theme-ink tabular-nums ${
          isFinished ? 'text-red-500 animate-pulse' : ''
        }`}
      >
        {formatTime(shownMs)}
      </div>

      {!isPrint && (
        <div className="flex gap-1 mt-1">
          {!timerRunning ? (
            <button
              onClick={handleStart}
              disabled={isFinished}
              className={`${btnBase} bg-theme-accent text-theme-paper hover:opacity-80 disabled:opacity-40`}
            >
              ▶
            </button>
          ) : (
            <button
              onClick={handlePause}
              className={`${btnBase} bg-theme-accent text-theme-paper hover:opacity-80`}
            >
              ⏸
            </button>
          )}
          <button
            onClick={handleReset}
            className={`${btnBase} text-theme-ink hover:bg-theme-accent/20`}
          >
            ↺
          </button>
        </div>
      )}
    </div>
  );
}
