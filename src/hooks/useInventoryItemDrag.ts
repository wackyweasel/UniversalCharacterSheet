import { useEffect, useRef } from 'react';
import type { InventoryItem, Widget } from '../types';
import { useStore } from '../store/useStore';
import { addTimelineEvent } from '../store/useTimelineStore';
import { useTouchCameraPinchCancellation } from './useTouchCamera';

const ROW_SELECTOR = '[data-inventory-item-row="true"]';
const ZONE_SELECTOR = '[data-inventory-drop-zone="true"]';
const SLOT_SELECTOR = '[data-inventory-slot-drop="true"]';

interface DragTarget {
  widgetId: string;
  /** Position in the target list. Unused when dropping on a slot. */
  index: number;
  slotId?: string;
}

interface ActiveDrag {
  pointerId: number;
  item: InventoryItem;
  sourceElement: HTMLElement;
  sourceZone: HTMLElement;
  sourceIndex: number;
  ghostElement: HTMLElement | null;
  startX: number;
  startY: number;
  startScrollTop: number;
  scaleX: number;
  scaleY: number;
  didMove: boolean;
  target: DragTarget | null;
}

function findInventoryWidget(widgetId: string): Widget | undefined {
  const state = useStore.getState();
  const character = state.characters.find((entry) => entry.id === state.activeCharacterId);
  return character?.sheets
    .find((sheet) => sheet.id === character.activeSheetId)
    ?.widgets.find((entry) => entry.id === widgetId);
}

function defaultWidgetLabel(widget: Widget | undefined): string {
  return widget?.data.label || (widget?.type === 'INVENTORY_SLOTS' ? 'Equipment' : widget?.type === 'COMPENDIUM' ? 'Compendium' : 'Inventory');
}

/**
 * Pointer-driven drag and drop of inventory items, shared by the list and slots widgets.
 * Items can be dropped on any list (`data-inventory-drop-zone`) or slot (`data-inventory-slot-drop`)
 * of any inventory widget on the sheet.
 */
export function useInventoryItemDrag({
  widget,
  items,
  canInteract,
}: {
  widget: Widget;
  items: InventoryItem[];
  canInteract: boolean;
}) {
  const moveInventoryItem = useStore((state) => state.moveInventoryItem);
  const dragRef = useRef<ActiveDrag | null>(null);
  const removeDragListenersRef = useRef<(() => void) | null>(null);
  const activeDropZoneRef = useRef<HTMLElement | null>(null);

  const moveItemWithTimeline = (targetWidgetId: string, itemId: string, targetIndex: number, targetSlotId?: string) => {
    const item = items.find((entry) => entry.id === itemId);
    const previousIndex = items.findIndex((entry) => entry.id === itemId);
    moveInventoryItem({ sourceWidgetId: widget.id, targetWidgetId, itemId, targetIndex, targetSlotId });
    if (!item) return;

    const targetWidget = findInventoryWidget(targetWidgetId);
    const targetItems = targetWidget?.data.inventoryItems ?? [];
    const nextIndex = targetItems.findIndex((entry) => entry.id === itemId);
    if (nextIndex < 0) return;
    const sourceLabel = defaultWidgetLabel(widget);

    if (targetSlotId !== undefined) {
      if (targetWidgetId === widget.id && item.slotId === targetSlotId) return;
      const slotName = targetWidget?.data.inventorySlots?.find((slot) => slot.id === targetSlotId)?.name || 'a slot';
      const fromSlot = widget.data.inventorySlots?.find((slot) => slot.id === item.slotId)?.name;
      const where = targetWidgetId === widget.id ? '' : ` (${defaultWidgetLabel(targetWidget)})`;
      addTimelineEvent(
        sourceLabel,
        widget.type,
        fromSlot ? `Moved ${item.name} from ${fromSlot} to ${slotName}${where}` : `Equipped ${item.name} in ${slotName}${where}`,
        '🛡️',
      );
    } else if (targetWidgetId === widget.id) {
      if (nextIndex === previousIndex) return;
      addTimelineEvent(sourceLabel, widget.type, `Reordered ${item.name} (position ${previousIndex + 1} → ${nextIndex + 1})`, '↕️');
    } else {
      addTimelineEvent(sourceLabel, widget.type, `Moved ${item.name} to ${defaultWidgetLabel(targetWidget)}`, '📦');
    }
  };

  const clearDragPreview = () => {
    document.querySelectorAll<HTMLElement>(ROW_SELECTOR).forEach((element) => {
      element.classList.remove('inventory-item--preview-shift');
      element.style.removeProperty('transform');
    });
    activeDropZoneRef.current?.classList.remove('inventory-drop-zone--active');
    activeDropZoneRef.current = null;
  };

  const shiftItem = (element: HTMLElement, viewportOffsetY: number) => {
    const rect = element.getBoundingClientRect();
    const scaleY = element.offsetHeight > 0 ? rect.height / element.offsetHeight : 1;
    element.classList.add('inventory-item--preview-shift');
    element.style.transform = `translate3d(0, ${viewportOffsetY / scaleY}px, 0)`;
  };

  const setActiveDropZone = (zone: HTMLElement) => {
    if (activeDropZoneRef.current === zone) return;
    activeDropZoneRef.current?.classList.remove('inventory-drop-zone--active');
    zone.classList.add('inventory-drop-zone--active');
    activeDropZoneRef.current = zone;
  };

  const updateDragPreview = (drag: ActiveDrag, target: DragTarget | null) => {
    clearDragPreview();
    if (!target) return;

    const sourceRows = Array.from(drag.sourceZone.querySelectorAll<HTMLElement>(ROW_SELECTOR));
    const draggedHeight = drag.sourceElement.getBoundingClientRect().height;
    const sourceGap = parseFloat(getComputedStyle(drag.sourceZone).rowGap || '0') || 0;

    if (target.slotId !== undefined) {
      const targetSlot = Array.from(document.querySelectorAll<HTMLElement>(SLOT_SELECTOR))
        .find((slot) => slot.dataset.inventoryWidgetId === target.widgetId && slot.dataset.inventorySlotId === target.slotId);
      if (!targetSlot) return;
      setActiveDropZone(targetSlot);
      // A swap puts the displaced item back where the dragged one was, so the source list keeps its shape.
      const occupant = targetSlot.querySelector<HTMLElement>(ROW_SELECTOR);
      const swaps = Boolean(occupant && occupant !== drag.sourceElement);
      if (!swaps && drag.sourceZone.matches(ZONE_SELECTOR)) {
        sourceRows.slice(drag.sourceIndex + 1).forEach((element) => shiftItem(element, -(draggedHeight + sourceGap)));
      }
      return;
    }

    const targetZone = Array.from(document.querySelectorAll<HTMLElement>(ZONE_SELECTOR))
      .find((zone) => zone.dataset.inventoryWidgetId === target.widgetId);
    if (!targetZone) return;
    setActiveDropZone(targetZone);

    const targetRows = Array.from(targetZone.querySelectorAll<HTMLElement>(ROW_SELECTOR));
    const targetGap = parseFloat(getComputedStyle(targetZone).rowGap || '0') || 0;

    if (target.widgetId === widget.id && drag.sourceZone === targetZone) {
      const destinationIndex = target.index > drag.sourceIndex ? target.index - 1 : target.index;
      if (destinationIndex < drag.sourceIndex) {
        sourceRows.slice(destinationIndex, drag.sourceIndex).forEach((element) => shiftItem(element, draggedHeight + sourceGap));
      } else if (destinationIndex > drag.sourceIndex) {
        sourceRows.slice(drag.sourceIndex + 1, destinationIndex + 1).forEach((element) => shiftItem(element, -(draggedHeight + sourceGap)));
      }
      return;
    }

    if (drag.sourceZone.matches(ZONE_SELECTOR)) {
      sourceRows.slice(drag.sourceIndex + 1).forEach((element) => shiftItem(element, -(draggedHeight + sourceGap)));
    }
    targetRows.slice(target.index).forEach((element) => shiftItem(element, draggedHeight + targetGap));
  };

  const captureItemRects = () => new Map(
    Array.from(document.querySelectorAll<HTMLElement>(ROW_SELECTOR))
      .map((element) => [element.dataset.inventoryItemId || '', element.getBoundingClientRect()] as const)
      .filter(([id]) => Boolean(id)),
  );

  const animateToCommittedPositions = (previousRects: Map<string, DOMRect>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>(ROW_SELECTOR).forEach((element) => {
        const previousRect = previousRects.get(element.dataset.inventoryItemId || '');
        if (!previousRect) return;
        const nextRect = element.getBoundingClientRect();
        const deltaX = previousRect.left - nextRect.left;
        const deltaY = previousRect.top - nextRect.top;
        if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;
        element.getAnimations().forEach((animation) => animation.cancel());
        element.animate(
          [{ transform: `translate(${deltaX}px, ${deltaY}px)` }, { transform: 'translate(0, 0)' }],
          { duration: 240, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        );
      });
    }));
  };

  const resolveDropTarget = (clientX: number, clientY: number): DragTarget | null => {
    const draggingCompendiumEntry = widget.type === 'COMPENDIUM';
    for (const hit of document.elementsFromPoint(clientX, clientY)) {
      const slot = hit.closest<HTMLElement>(SLOT_SELECTOR);
      if (slot?.dataset.inventoryWidgetId && slot.dataset.inventorySlotId && !draggingCompendiumEntry) {
        setActiveDropZone(slot);
        return { widgetId: slot.dataset.inventoryWidgetId, index: 0, slotId: slot.dataset.inventorySlotId };
      }

      const zone = hit.closest<HTMLElement>(ZONE_SELECTOR);
      if (!zone?.dataset.inventoryWidgetId) continue;
      // Compendium entries only move between compendiums.
      if ((zone.dataset.inventoryCompendium === 'true') !== draggingCompendiumEntry) continue;
      setActiveDropZone(zone);

      const zoneRect = zone.getBoundingClientRect();
      if (zone.scrollHeight > zone.clientHeight) {
        if (clientY < zoneRect.top + 28) zone.scrollTop -= 12;
        else if (clientY > zoneRect.bottom - 28) zone.scrollTop += 12;
      }

      const rows = Array.from(zone.querySelectorAll<HTMLElement>(ROW_SELECTOR));
      const targetIndex = rows.findIndex((row) => clientY < row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2);
      return {
        widgetId: zone.dataset.inventoryWidgetId,
        index: targetIndex < 0 ? rows.length : targetIndex,
      };
    }
    return null;
  };

  function finishDrag(pointerId?: number, commit = true) {
    const drag = dragRef.current;
    if (pointerId !== undefined && drag?.pointerId !== pointerId) return;
    removeDragListenersRef.current?.();
    removeDragListenersRef.current = null;
    if (drag) {
      const previousRects = captureItemRects();
      if (drag.ghostElement) previousRects.set(drag.item.id, drag.ghostElement.getBoundingClientRect());
      drag.ghostElement?.remove();
      drag.sourceElement.classList.remove('inventory-item--dragging');
      clearDragPreview();
      if (commit && drag.didMove && drag.target) {
        moveItemWithTimeline(drag.target.widgetId, drag.item.id, drag.target.index, drag.target.slotId);
        animateToCommittedPositions(previousRects);
      }
    }
    dragRef.current = null;
    clearDragPreview();
  }

  const handleDragMove = (event: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.didMove && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 4) return;
    event.preventDefault();
    if (!drag.didMove) {
      drag.didMove = true;
      drag.sourceElement.classList.add('inventory-item--dragging');
      const sourceRect = drag.sourceElement.getBoundingClientRect();
      const ghost = drag.sourceElement.cloneNode(true) as HTMLElement;
      ghost.removeAttribute('data-inventory-item-row');
      ghost.classList.remove('inventory-item--dragging', 'inventory-item--preview-shift');
      ghost.classList.add('inventory-item--drag-ghost');
      ghost.style.left = `${sourceRect.left}px`;
      ghost.style.top = `${sourceRect.top}px`;
      ghost.style.width = `${drag.sourceElement.offsetWidth}px`;
      ghost.style.height = `${drag.sourceElement.offsetHeight}px`;
      document.body.appendChild(ghost);
      drag.ghostElement = ghost;
    }
    const sourceScrollDelta = drag.sourceZone.scrollTop - drag.startScrollTop;
    drag.ghostElement!.style.transform = `translate3d(${event.clientX - drag.startX}px, ${event.clientY - drag.startY + sourceScrollDelta}px, 0) scale(${drag.scaleX * 1.02}, ${drag.scaleY * 1.02}) rotate(0.35deg)`;
    drag.target = resolveDropTarget(event.clientX, event.clientY);
    updateDragPreview(drag, drag.target);
  };

  const startDrag = (item: InventoryItem, event: React.PointerEvent<HTMLElement>) => {
    if (!canInteract || event.button !== 0) return;
    const sourceElement = event.currentTarget.closest<HTMLElement>(ROW_SELECTOR);
    const sourceZone = sourceElement?.closest<HTMLElement>(`${ZONE_SELECTOR}, ${SLOT_SELECTOR}`);
    if (!sourceElement || !sourceZone) return;
    const sourceRows = Array.from(sourceZone.querySelectorAll<HTMLElement>(ROW_SELECTOR));
    const sourceIndex = sourceRows.indexOf(sourceElement);
    const sourceRect = sourceElement.getBoundingClientRect();
    event.preventDefault();
    event.stopPropagation();
    removeDragListenersRef.current?.();
    dragRef.current = {
      pointerId: event.pointerId,
      item,
      sourceElement,
      sourceZone,
      sourceIndex,
      ghostElement: null,
      startX: event.clientX,
      startY: event.clientY,
      startScrollTop: sourceZone.scrollTop,
      scaleX: sourceElement.offsetWidth > 0 ? sourceRect.width / sourceElement.offsetWidth : 1,
      scaleY: sourceElement.offsetHeight > 0 ? sourceRect.height / sourceElement.offsetHeight : 1,
      didMove: false,
      target: null,
    };
    const onMove = (pointerEvent: PointerEvent) => handleDragMove(pointerEvent);
    const onUp = (pointerEvent: PointerEvent) => finishDrag(pointerEvent.pointerId);
    const onCancel = (pointerEvent: PointerEvent) => finishDrag(pointerEvent.pointerId, false);
    const onBlur = () => finishDrag(undefined, false);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('blur', onBlur);
    removeDragListenersRef.current = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('blur', onBlur);
    };
    event.currentTarget.focus({ preventScroll: true });
  };

  useTouchCameraPinchCancellation(() => finishDrag(undefined, false));
  useEffect(() => () => removeDragListenersRef.current?.(), []);

  return { startDrag, moveItemWithTimeline };
}
