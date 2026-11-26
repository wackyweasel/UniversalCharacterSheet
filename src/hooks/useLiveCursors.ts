import { useEffect, type RefObject } from 'react';
import { useSessionStore } from '../store/useSessionStore';

const SEND_INTERVAL_MS = 40;

interface LiveCursorOptions {
  enabled: boolean;
  containerRef: RefObject<HTMLElement | null>;
  panRef: { readonly current: { x: number; y: number } };
  scaleRef: { readonly current: number };
  sheetId: string | undefined;
}

/** Shares this tab's mouse or pen position, in sheet coordinates, while a live session is running. */
export function useLiveCursors({ enabled, containerRef, panRef, scaleRef, sheetId }: LiveCursorOptions): void {
  const sessionActive = useSessionStore((state) => state.phase === 'active');

  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !sessionActive || !container || !sheetId) return;

    let lastSent = 0;
    let timer: number | null = null;
    let latest: { x: number; y: number } | null = null;

    const flush = () => {
      timer = null;
      if (!latest) return;
      lastSent = performance.now();
      useSessionStore.getState().sendCursor({ sheetId, x: Math.round(latest.x), y: Math.round(latest.y) });
      latest = null;
    };

    const handleMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const rect = container.getBoundingClientRect();
      const scale = scaleRef.current || 1;
      latest = {
        x: (event.clientX - rect.left - panRef.current.x) / scale,
        y: (event.clientY - rect.top - panRef.current.y) / scale,
      };
      if (timer !== null) return;
      const wait = Math.max(0, SEND_INTERVAL_MS - (performance.now() - lastSent));
      timer = window.setTimeout(flush, wait);
    };

    const handleLeave = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
      latest = null;
      useSessionStore.getState().sendCursor(null);
    };

    container.addEventListener('pointermove', handleMove);
    container.addEventListener('pointerleave', handleLeave);
    return () => {
      container.removeEventListener('pointermove', handleMove);
      container.removeEventListener('pointerleave', handleLeave);
      if (timer !== null) window.clearTimeout(timer);
      useSessionStore.getState().sendCursor(null);
    };
  }, [enabled, sessionActive, containerRef, panRef, scaleRef, sheetId]);
}
