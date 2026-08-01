import {
  useEffect,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

interface ReorderableItem {
  id: string;
}

interface UsePointerReorderOptions<T extends ReorderableItem> {
  items: T[];
  onReorder: (items: T[]) => void;
  scrollAreaSelector?: string;
}

export function usePointerReorder<T extends ReorderableItem>({
  items,
  onReorder,
  scrollAreaSelector = '.overflow-auto, .overflow-y-auto',
}: UsePointerReorderOptions<T>) {
  const rowRefs = useRef(new Map<string, HTMLElement>());
  const previousRectsRef = useRef(new Map<string, DOMRect>());
  const removeDragListenersRef = useRef<(() => void) | null>(null);
  const dragRef = useRef<{
    itemId: string;
    pointerId: number;
    rowElement: HTMLElement;
    scrollArea: HTMLElement | null;
    startY: number;
    startScrollTop: number;
    order: string[];
    slotRects: DOMRect[];
    startIndex: number;
    targetIndex: number;
    didMove: boolean;
  } | null>(null);

  const captureRects = () => {
    previousRectsRef.current = new Map(
      Array.from(rowRefs.current.entries()).map(([id, element]) => [id, element.getBoundingClientRect()]),
    );
  };

  const updateDragPreview = (drag: NonNullable<typeof dragRef.current>, targetIndex: number) => {
    const previewOrder = drag.order.filter((id) => id !== drag.itemId);
    previewOrder.splice(targetIndex, 0, drag.itemId);

    previewOrder.forEach((id, previewIndex) => {
      if (id === drag.itemId) return;
      const originalIndex = drag.order.indexOf(id);
      const element = rowRefs.current.get(id);
      const originalRect = drag.slotRects[originalIndex];
      const previewRect = drag.slotRects[previewIndex];
      if (!element || !originalRect || !previewRect) return;

      const deltaY = previewRect.top - originalRect.top;
      if (Math.abs(deltaY) < 1) {
        element.classList.remove('pointer-sort-row--preview-shift');
        element.style.removeProperty('transform');
        return;
      }

      element.classList.add('pointer-sort-row--preview-shift');
      element.style.transform = `translate3d(0, ${deltaY}px, 0)`;
    });
  };

  const clearDragPreview = (drag: NonNullable<typeof dragRef.current>) => {
    drag.order.forEach((id) => {
      const element = rowRefs.current.get(id);
      element?.classList.remove('pointer-sort-row--preview-shift');
      element?.style.removeProperty('transform');
    });
  };

  const finishDrag = (pointerId?: number, commit = true) => {
    const drag = dragRef.current;
    if (pointerId !== undefined && drag?.pointerId !== pointerId) return;

    removeDragListenersRef.current?.();
    removeDragListenersRef.current = null;
    const shouldReorder = Boolean(commit && drag?.didMove && drag.targetIndex !== drag.startIndex);
    if (drag && shouldReorder) captureRects();
    if (drag) {
      drag.rowElement.classList.remove('pointer-sort-row--dragging');
      clearDragPreview(drag);
    }
    if (drag && shouldReorder) {
      const draggedItem = items.find((item) => item.id === drag.itemId);
      if (draggedItem) {
        const reorderedItems = items.filter((item) => item.id !== drag.itemId);
        reorderedItems.splice(drag.targetIndex, 0, draggedItem);
        onReorder(reorderedItems);
      }
    }
    dragRef.current = null;
  };

  const handleDragMove = (event: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.didMove && Math.abs(event.clientY - drag.startY) < 4) return;

    event.preventDefault();
    if (!drag.didMove) {
      drag.didMove = true;
      drag.rowElement.classList.add('pointer-sort-row--dragging');
    }

    const scrollRect = drag.scrollArea?.getBoundingClientRect();
    if (drag.scrollArea && scrollRect) {
      if (event.clientY < scrollRect.top + 32) drag.scrollArea.scrollTop -= 10;
      if (event.clientY > scrollRect.bottom - 32) drag.scrollArea.scrollTop += 10;
    }

    const scrollDelta = (drag.scrollArea?.scrollTop ?? 0) - drag.startScrollTop;
    drag.rowElement.style.transform = `translate3d(0, ${event.clientY - drag.startY + scrollDelta}px, 0) scale(1.01)`;

    const targetIndex = drag.slotRects.reduce((closestIndex, rect, index) => {
      const centerY = rect.top - scrollDelta + rect.height / 2;
      const closestRect = drag.slotRects[closestIndex];
      const closestCenterY = closestRect.top - scrollDelta + closestRect.height / 2;
      return Math.abs(event.clientY - centerY) < Math.abs(event.clientY - closestCenterY) ? index : closestIndex;
    }, drag.targetIndex);
    if (targetIndex === drag.targetIndex) return;

    drag.targetIndex = targetIndex;
    updateDragPreview(drag, targetIndex);
  };

  const startDrag = (itemId: string, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (items.length < 2 || event.button !== 0) return;
    const rowElement = rowRefs.current.get(itemId);
    if (!rowElement) return;
    const order = items.map((item) => item.id);
    const startIndex = order.indexOf(itemId);
    const slotRects = order
      .map((id) => rowRefs.current.get(id)?.getBoundingClientRect())
      .filter((rect): rect is DOMRect => Boolean(rect));
    if (startIndex < 0 || slotRects.length !== order.length) return;

    event.preventDefault();
    event.stopPropagation();
    removeDragListenersRef.current?.();
    const scrollArea = rowElement.closest<HTMLElement>(scrollAreaSelector);
    dragRef.current = {
      itemId,
      pointerId: event.pointerId,
      rowElement,
      scrollArea,
      startY: event.clientY,
      startScrollTop: scrollArea?.scrollTop ?? 0,
      order,
      slotRects,
      startIndex,
      targetIndex: startIndex,
      didMove: false,
    };

    const handlePointerMove = (pointerEvent: PointerEvent) => handleDragMove(pointerEvent);
    const handlePointerUp = (pointerEvent: PointerEvent) => finishDrag(pointerEvent.pointerId);
    const handlePointerCancel = (pointerEvent: PointerEvent) => finishDrag(pointerEvent.pointerId, false);
    const handleWindowBlur = () => finishDrag(undefined, false);
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    window.addEventListener('blur', handleWindowBlur);
    removeDragListenersRef.current = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('blur', handleWindowBlur);
    };
    event.currentTarget.focus({ preventScroll: true });
  };

  const handleReorderKey = (itemId: string, event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    const currentIndex = items.findIndex((item) => item.id === itemId);
    const targetIndex = event.key === 'ArrowUp' ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= items.length) return;

    event.preventDefault();
    event.stopPropagation();
    captureRects();
    const reorderedItems = [...items];
    const [movedItem] = reorderedItems.splice(currentIndex, 1);
    reorderedItems.splice(targetIndex, 0, movedItem);
    onReorder(reorderedItems);
  };

  useLayoutEffect(() => {
    if (previousRectsRef.current.size === 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      previousRectsRef.current.clear();
      return;
    }

    rowRefs.current.forEach((element, id) => {
      const previousRect = previousRectsRef.current.get(id);
      if (!previousRect) return;
      const nextRect = element.getBoundingClientRect();
      const deltaY = previousRect.top - nextRect.top;
      if (Math.abs(deltaY) < 1) return;
      element.getAnimations().forEach((animation) => animation.cancel());
      element.animate(
        [{ transform: `translateY(${deltaY}px)` }, { transform: 'translateY(0)' }],
        { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      );
    });
    previousRectsRef.current.clear();
  }, [items]);

  useEffect(() => () => removeDragListenersRef.current?.(), []);

  return {
    setRowRef: (itemId: string, element: HTMLElement | null) => {
      if (element) rowRefs.current.set(itemId, element);
      else rowRefs.current.delete(itemId);
    },
    startDrag,
    handleReorderKey,
  };
}