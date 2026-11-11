import { useEffect, useRef } from 'react';
import type { InventoryItem, Widget } from '../types';
import { useStore } from '../store/useStore';
import { useCompendiumPanelStore } from '../store/useCompendiumPanelStore';
import { addTimelineEvent } from '../store/useTimelineStore';
import { useTouchCameraPinchCancellation } from './useTouchCamera';

const ROW_SELECTOR = '[data-inventory-item-row="true"]';
const ZONE_SELECTOR = '[data-inventory-drop-zone="true"]';
const SLOT_SELECTOR = '[data-inventory-slot-drop="true"]';
const COMPENDIUM_ROW_SELECTOR = '[data-compendium-entry-row="true"]';
const COMPENDIUM_ZONE_SELECTOR = '[data-compendium-drop-zone="true"]';
const COMPENDIUM_LIST_SELECTOR = '[data-compendium-list="true"]';
const COMPENDIUM_SECTION_SELECTOR = '[data-compendium-section]';
const COMPENDIUM_SCROLL_SELECTOR = '[data-compendium-scroll="true"]';

type DragTarget =
  | {
      kind: 'widget';
      widgetId: string;
      /** Position in the target list. Unused when dropping on a slot. */
      index: number;
      slotId?: string;
    }
  | {
      kind: 'compendium';
      sectionId: string;
      index: number;
      beforeItemId: string | null;
      collapsed: boolean;
    };

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
  return widget?.data.label || (widget?.type === 'INVENTORY_SLOTS' ? 'Equipment' : widget?.type === 'COMPENDIUM' ? 'Codex' : 'Inventory');
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
  const addItemToCompendium = useStore((state) => state.addItemToCompendium);
  const dragRef = useRef<ActiveDrag | null>(null);
  const removeDragListenersRef = useRef<(() => void) | null>(null);
  const activeDropZoneRef = useRef<HTMLElement | null>(null);
  const expandedDropZoneRef = useRef<HTMLElement | null>(null);

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
    document.querySelectorAll<HTMLElement>(`${ROW_SELECTOR}, ${COMPENDIUM_ROW_SELECTOR}`).forEach((element) => {
      element.classList.remove('inventory-item--preview-shift');
      element.style.removeProperty('transform');
    });
    if (expandedDropZoneRef.current) {
      expandedDropZoneRef.current.style.removeProperty('padding-bottom');
      expandedDropZoneRef.current = null;
    }
    if (activeDropZoneRef.current) {
      activeDropZoneRef.current.classList.remove('inventory-drop-zone--active', 'compendium-section--drop-active');
      activeDropZoneRef.current = null;
    }
  };

  const shiftItem = (element: HTMLElement, viewportOffsetY: number) => {
    const rect = element.getBoundingClientRect();
    const scaleY = element.offsetHeight > 0 ? rect.height / element.offsetHeight : 1;
    element.classList.add('inventory-item--preview-shift');
    element.style.transform = `translate3d(0, ${viewportOffsetY / scaleY}px, 0)`;
  };

  const setActiveDropZone = (zone: HTMLElement, className = 'inventory-drop-zone--active') => {
    if (activeDropZoneRef.current === zone && zone.classList.contains(className)) return;
    activeDropZoneRef.current?.classList.remove('inventory-drop-zone--active', 'compendium-section--drop-active');
    zone.classList.add(className);
    activeDropZoneRef.current = zone;
  };

  const updateDragPreview = (drag: ActiveDrag, target: DragTarget | null) => {
    clearDragPreview();
    drag.sourceElement.classList.toggle('inventory-item--copy-source', target?.kind === 'compendium');
    if (!target) return;

    if (target.kind === 'compendium') {
      if (target.collapsed) {
        const sectionEl = document.querySelector<HTMLElement>(`[data-compendium-section="${CSS.escape(target.sectionId)}"]`);
        if (sectionEl) setActiveDropZone(sectionEl, 'compendium-section--drop-active');
        return;
      }

      const targetZone = document.querySelector<HTMLElement>(
        `${COMPENDIUM_ZONE_SELECTOR}[data-compendium-section-id="${CSS.escape(target.sectionId)}"]`,
      );
      if (!targetZone) return;
      setActiveDropZone(targetZone);

      const targetList = targetZone.querySelector<HTMLElement>(COMPENDIUM_LIST_SELECTOR);
      const targetRows = Array.from(targetZone.querySelectorAll<HTMLElement>(COMPENDIUM_ROW_SELECTOR));
      const targetGap = targetList ? (parseFloat(getComputedStyle(targetList).rowGap || '0') || 0) : 6;
      const ghostHeight = drag.ghostElement?.getBoundingClientRect().height ?? drag.sourceElement.getBoundingClientRect().height;
      const shiftHeight = Math.min(Math.max(ghostHeight, 42), 160);
      const basePaddingBottom = parseFloat(getComputedStyle(targetZone).paddingTop || '8') || 8;
      targetZone.style.paddingBottom = `${basePaddingBottom + shiftHeight + (targetRows.length > 0 ? targetGap : 0)}px`;
      expandedDropZoneRef.current = targetZone;
      targetRows.slice(target.index).forEach((element) => shiftItem(element, shiftHeight + targetGap));
      return;
    }

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

  const captureRects = (selector: string, idKey: 'inventoryItemId' | 'compendiumEntryId') => new Map(
    Array.from(document.querySelectorAll<HTMLElement>(selector))
      .map((element) => [element.dataset[idKey] || '', element.getBoundingClientRect()] as const)
      .filter(([id]) => Boolean(id)),
  );

  const animateToCommittedPositions = (
    selector: string,
    idKey: 'inventoryItemId' | 'compendiumEntryId',
    previousRects: Map<string, DOMRect>,
  ) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        const previousRect = previousRects.get(element.dataset[idKey] || '');
        if (!previousRect) return;
        element.getAnimations().forEach((animation) => animation.cancel());
        const nextRect = element.getBoundingClientRect();
        const scaleX = element.offsetWidth > 0 ? nextRect.width / element.offsetWidth : 1;
        const scaleY = element.offsetHeight > 0 ? nextRect.height / element.offsetHeight : 1;
        const deltaX = (previousRect.left - nextRect.left) / scaleX;
        const deltaY = (previousRect.top - nextRect.top) / scaleY;
        if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;
        element.animate(
          [{ transform: `translate(${deltaX}px, ${deltaY}px)` }, { transform: 'translate(0, 0)' }],
          { duration: 240, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        );
      });
    }));
  };

  const resolveDropTarget = (clientX: number, clientY: number): DragTarget | null => {
    const compendiumScroll = document.querySelector<HTMLElement>(COMPENDIUM_SCROLL_SELECTOR);
    if (compendiumScroll && compendiumScroll.scrollHeight > compendiumScroll.clientHeight) {
      const scrollRect = compendiumScroll.getBoundingClientRect();
      if (clientX >= scrollRect.left && clientX <= scrollRect.right && clientY >= scrollRect.top && clientY <= scrollRect.bottom) {
        if (clientY < scrollRect.top + 36) compendiumScroll.scrollTop -= 12;
        else if (clientY > scrollRect.bottom - 36) compendiumScroll.scrollTop += 12;
      }
    }

    for (const hit of document.elementsFromPoint(clientX, clientY)) {
      const compendiumZone = hit.closest<HTMLElement>(COMPENDIUM_ZONE_SELECTOR);
      if (compendiumZone?.dataset.compendiumSectionId) {
        const sectionId = compendiumZone.dataset.compendiumSectionId;
        const rows = Array.from(compendiumZone.querySelectorAll<HTMLElement>(COMPENDIUM_ROW_SELECTOR));
        const foundIndex = rows.findIndex((row) => {
          const rect = row.getBoundingClientRect();
          return clientY < rect.top + rect.height / 2;
        });
        const index = foundIndex < 0 ? rows.length : foundIndex;
        const beforeItemId = index < rows.length ? (rows[index].dataset.compendiumEntryId ?? null) : null;
        return { kind: 'compendium', sectionId, index, beforeItemId, collapsed: false };
      }

      const compendiumSection = hit.closest<HTMLElement>(COMPENDIUM_SECTION_SELECTOR);
      if (compendiumSection?.dataset.compendiumSection) {
        const sectionId = compendiumSection.dataset.compendiumSection;
        const innerZone = compendiumSection.querySelector<HTMLElement>(COMPENDIUM_ZONE_SELECTOR);
        if (!innerZone) {
          return { kind: 'compendium', sectionId, index: 0, beforeItemId: null, collapsed: true };
        }
        const rows = Array.from(innerZone.querySelectorAll<HTMLElement>(COMPENDIUM_ROW_SELECTOR));
        const beforeItemId = rows[0]?.dataset.compendiumEntryId ?? null;
        return { kind: 'compendium', sectionId, index: 0, beforeItemId, collapsed: false };
      }

      if (hit.id === 'compendium-panel' || hit.matches('[data-touch-camera-panel="true"], [role="dialog"]')) {
        return null;
      }

      const slot = hit.closest<HTMLElement>(SLOT_SELECTOR);
      if (slot?.dataset.inventoryWidgetId && slot.dataset.inventorySlotId) {
        const targetWidget = findInventoryWidget(slot.dataset.inventoryWidgetId);
        if (!targetWidget || targetWidget.locked) return null;
        setActiveDropZone(slot);
        return { kind: 'widget', widgetId: slot.dataset.inventoryWidgetId, index: 0, slotId: slot.dataset.inventorySlotId };
      }

      const zone = hit.closest<HTMLElement>(ZONE_SELECTOR);
      if (zone?.dataset.inventoryWidgetId) {
        const targetWidget = findInventoryWidget(zone.dataset.inventoryWidgetId);
        if (!targetWidget || targetWidget.locked) return null;
        setActiveDropZone(zone);

        const zoneRect = zone.getBoundingClientRect();
        if (zone.scrollHeight > zone.clientHeight) {
          if (clientY < zoneRect.top + 28) zone.scrollTop -= 12;
          else if (clientY > zoneRect.bottom - 28) zone.scrollTop += 12;
        }

        const rows = Array.from(zone.querySelectorAll<HTMLElement>(ROW_SELECTOR));
        const targetIndex = rows.findIndex((row) => clientY < row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2);
        return {
          kind: 'widget',
          widgetId: zone.dataset.inventoryWidgetId,
          index: targetIndex < 0 ? rows.length : targetIndex,
        };
      }

      if (hit.hasAttribute('data-widget-id')) {
        const hitWidget = findInventoryWidget(hit.getAttribute('data-widget-id') || '');
        if (hitWidget?.locked) return null;
      }
    }
    return null;
  };

  function finishDrag(pointerId?: number, commit = true) {
    const drag = dragRef.current;
    if (pointerId !== undefined && drag?.pointerId !== pointerId) return;
    removeDragListenersRef.current?.();
    removeDragListenersRef.current = null;
    if (drag) {
      const ghostRect = drag.ghostElement?.getBoundingClientRect() ?? null;
      const previousWidgetRects = captureRects(ROW_SELECTOR, 'inventoryItemId');
      const previousCompendiumRects = captureRects(COMPENDIUM_ROW_SELECTOR, 'compendiumEntryId');
      drag.ghostElement?.remove();
      drag.sourceElement.classList.remove('inventory-item--dragging', 'inventory-item--copy-source');
      clearDragPreview();
      if (commit && drag.didMove && drag.target) {
        if (drag.target.kind === 'compendium') {
          const added = addItemToCompendium({
            sectionId: drag.target.sectionId,
            item: drag.item,
            beforeItemId: drag.target.beforeItemId,
          });
          if (added) {
            useCompendiumPanelStore.getState().notifyEntryAdded(
              drag.target.sectionId,
              `Added “${added.entry.name}” to “${added.sectionName}”`,
            );
            if (ghostRect) previousCompendiumRects.set(added.entry.id, ghostRect);
            animateToCommittedPositions(COMPENDIUM_ROW_SELECTOR, 'compendiumEntryId', previousCompendiumRects);
          }
        } else {
          if (ghostRect) previousWidgetRects.set(drag.item.id, ghostRect);
          moveItemWithTimeline(drag.target.widgetId, drag.item.id, drag.target.index, drag.target.slotId);
          animateToCommittedPositions(ROW_SELECTOR, 'inventoryItemId', previousWidgetRects);
        }
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
      ghost.removeAttribute('data-inventory-item-id');
      ghost.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
      ghost.classList.remove('inventory-item--dragging', 'inventory-item--preview-shift', 'inventory-item--copy-source');
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
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key !== 'Escape' || !dragRef.current?.didMove) return;
      keyEvent.preventDefault();
      keyEvent.stopPropagation();
      finishDrag(undefined, false);
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('blur', onBlur);
    window.addEventListener('keydown', onKeyDown, true);
    removeDragListenersRef.current = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('keydown', onKeyDown, true);
    };
    event.currentTarget.focus({ preventScroll: true });
  };

  useTouchCameraPinchCancellation(() => finishDrag(undefined, false));
  useEffect(() => () => removeDragListenersRef.current?.(), []);

  return { startDrag, moveItemWithTimeline };
}
