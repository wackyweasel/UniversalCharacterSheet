import { useEffect, type RefObject } from 'react';

const WHEEL_LINE_PX = 16;

// Hit testing is bypassed on purpose: locked overlays and pointer-events-none hide the content underneath.
function findScrollRegionAt(root: HTMLElement, x: number, y: number): HTMLElement | null {
  let region: HTMLElement | null = null;
  for (const element of root.querySelectorAll<HTMLElement>('*')) {
    const rect = element.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue;
    const style = window.getComputedStyle(element);
    const scrollsY = /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight;
    const scrollsX = /(auto|scroll)/.test(style.overflowX) && element.scrollWidth > element.clientWidth;
    if (scrollsY || scrollsX) region = element;
  }
  return region;
}

/** Lets the wheel scroll a locked widget's overflowing regions instead of panning or zooming the canvas. */
export function useLockedWidgetWheel(rootRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root) return;

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return;
      const region = findScrollRegionAt(root, event.clientX, event.clientY);
      if (!region) return;

      const unit = event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? region.clientHeight
        : event.deltaMode === WheelEvent.DOM_DELTA_LINE ? WHEEL_LINE_PX : 1;
      region.scrollBy({ left: event.deltaX * unit, top: event.deltaY * unit });
      event.preventDefault();
      event.stopPropagation();
    };

    root.addEventListener('wheel', handleWheel, { passive: false });
    return () => root.removeEventListener('wheel', handleWheel);
  }, [rootRef, enabled]);
}
