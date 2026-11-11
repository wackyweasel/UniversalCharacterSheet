import { useEffect, useRef, type RefObject } from 'react';
import type { InventoryItem, Widget } from '../types';
import { useStore } from '../store/useStore';
import { addTimelineEvent } from '../store/useTimelineStore';
import { getInventoryItemQuantity, getInventoryWidgetTerms } from '../utils/inventory';
import { getSlotItems, getSlotMaxItems } from '../utils/inventorySlots';
import { useTouchCameraPinchCancellation } from './useTouchCamera';

const COMPENDIUM_ROW_SELECTOR = '[data-compendium-entry-row="true"]';
const COMPENDIUM_ZONE_SELECTOR = '[data-compendium-drop-zone="true"]';
const COMPENDIUM_LIST_SELECTOR = '[data-compendium-list="true"]';
const COMPENDIUM_SECTION_SELECTOR = '[data-compendium-section]';
const INVENTORY_ROW_SELECTOR = '[data-inventory-item-row="true"]';
const ZONE_SELECTOR = '[data-inventory-drop-zone="true"]';
const SLOT_SELECTOR = '[data-inventory-slot-drop="true"]';

const MAX_GHOST_HEIGHT = 160;
const MAX_WIDGET_SHIFT_HEIGHT = 120;

type CompendiumDragTarget =
  | {
      kind: 'compendium';
      sectionId: string;
      index: number;
      beforeItemId: string | null;
      collapsed: boolean;
    }
  | {
      kind: 'widget-list';
      widgetId: string;
      index: number;
    }
  | {
      kind: 'widget-slot';
      widgetId: string;
      slotId: string;
    };

interface ActiveCompendiumDrag {
  pointerId: number;
  sectionId: string;
  item: InventoryItem;
  sourceElement: HTMLElement;
  sourceZone: HTMLElement;
  sourceIndex: number;
  ghostElement: HTMLElement | null;
  startX: number;
  startY: number;
  originLeft: number;
  originTop: number;
  originWidth: number;
  originHeight: number;
  didMove: boolean;
  target: CompendiumDragTarget | null;
}

function findActiveSheetWidget(widgetId: string): Widget | undefined {
  const state = useStore.getState();
  const character = state.characters.find((entry) => entry.id === state.activeCharacterId);
  return character?.sheets
    .find((sheet) => sheet.id === character.activeSheetId)
    ?.widgets.find((entry) => entry.id === widgetId);
}

/**
 * Pointer-driven drag and drop for compendium entries.
 * Entries can be reordered within a section, moved to another compendium section,
 * or dropped onto an Inventory, Equipment or Codex widget to create a copy there.
 */
export function useCompendiumItemDrag({
  listScrollRef,
  onExpandSection,
}: {
  listScrollRef: RefObject<HTMLElement | null>;
  onExpandSection?: (sectionId: string) => void;
}) {
  const moveCompendiumItem = useStore((state) => state.moveCompendiumItem);
  const copyCompendiumItemToWidget = useStore((state) => state.copyCompendiumItemToWidget);
  const dragRef = useRef<ActiveCompendiumDrag | null>(null);
  const removeDragListenersRef = useRef<(() => void) | null>(null);
  const activeDropZoneRef = useRef<HTMLElement | null>(null);
  const expandedDropZoneRef = useRef<HTMLElement | null>(null);

  const clearDragPreview = () => {
    document.querySelectorAll<HTMLElement>(`${COMPENDIUM_ROW_SELECTOR}, ${INVENTORY_ROW_SELECTOR}`).forEach((element) => {
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

  const setActiveDropZone = (zone: HTMLElement, className = 'inventory-drop-zone--active') => {
    if (activeDropZoneRef.current === zone && zone.classList.contains(className)) return;
    activeDropZoneRef.current?.classList.remove('inventory-drop-zone--active', 'compendium-section--drop-active');
    zone.classList.add(className);
    activeDropZoneRef.current = zone;
  };

  const shiftItem = (element: HTMLElement, viewportOffsetY: number) => {
    const rect = element.getBoundingClientRect();
    const scaleY = element.offsetHeight > 0 ? rect.height / element.offsetHeight : 1;
    element.classList.add('inventory-item--preview-shift');
    element.style.transform = `translate3d(0, ${viewportOffsetY / scaleY}px, 0)`;
  };

  const updateDragPreview = (drag: ActiveCompendiumDrag, target: CompendiumDragTarget | null) => {
    clearDragPreview();
    const isWidgetCopy = target?.kind === 'widget-list' || target?.kind === 'widget-slot';
    drag.sourceElement.classList.toggle('compendium-entry--copy-source', isWidgetCopy);
    if (!target) return;

    const draggedHeight = Math.min(drag.sourceElement.getBoundingClientRect().height, MAX_GHOST_HEIGHT);
    const sourceList = drag.sourceZone.querySelector<HTMLElement>(COMPENDIUM_LIST_SELECTOR);
    const sourceRows = Array.from(drag.sourceZone.querySelectorAll<HTMLElement>(COMPENDIUM_ROW_SELECTOR));
    const sourceGap = sourceList ? (parseFloat(getComputedStyle(sourceList).rowGap || '0') || 0) : 6;

    if (target.kind === 'compendium') {
      if (target.collapsed) {
        const sectionEl = document.querySelector<HTMLElement>(`[data-compendium-section="${CSS.escape(target.sectionId)}"]`);
        if (sectionEl) setActiveDropZone(sectionEl, 'compendium-section--drop-active');
        if (target.sectionId !== drag.sectionId) {
          sourceRows.slice(drag.sourceIndex + 1).forEach((element) => shiftItem(element, -(draggedHeight + sourceGap)));
        }
        return;
      }

      const targetZone = document.querySelector<HTMLElement>(
        `${COMPENDIUM_ZONE_SELECTOR}[data-compendium-section-id="${CSS.escape(target.sectionId)}"]`,
      );
      if (!targetZone) return;
      setActiveDropZone(targetZone);

      if (target.sectionId === drag.sectionId) {
        const destinationIndex = target.index > drag.sourceIndex ? target.index - 1 : target.index;
        if (destinationIndex < drag.sourceIndex) {
          sourceRows.slice(destinationIndex, drag.sourceIndex).forEach((element) => shiftItem(element, draggedHeight + sourceGap));
        } else if (destinationIndex > drag.sourceIndex) {
          sourceRows.slice(drag.sourceIndex + 1, destinationIndex + 1).forEach((element) => shiftItem(element, -(draggedHeight + sourceGap)));
        }
        return;
      }

      sourceRows.slice(drag.sourceIndex + 1).forEach((element) => shiftItem(element, -(draggedHeight + sourceGap)));
      const targetList = targetZone.querySelector<HTMLElement>(COMPENDIUM_LIST_SELECTOR);
      const targetRows = Array.from(targetZone.querySelectorAll<HTMLElement>(COMPENDIUM_ROW_SELECTOR));
      const targetGap = targetList ? (parseFloat(getComputedStyle(targetList).rowGap || '0') || 0) : 6;
      const basePaddingBottom = parseFloat(getComputedStyle(targetZone).paddingTop || '8') || 8;
      targetZone.style.paddingBottom = `${basePaddingBottom + draggedHeight + (targetRows.length > 0 ? targetGap : 0)}px`;
      expandedDropZoneRef.current = targetZone;
      targetRows.slice(target.index).forEach((element) => shiftItem(element, draggedHeight + targetGap));
      return;
    }

    if (target.kind === 'widget-slot') {
      const targetSlot = Array.from(document.querySelectorAll<HTMLElement>(SLOT_SELECTOR))
        .find((slot) => slot.dataset.inventoryWidgetId === target.widgetId && slot.dataset.inventorySlotId === target.slotId);
      if (targetSlot) setActiveDropZone(targetSlot);
      return;
    }

    const targetZone = Array.from(document.querySelectorAll<HTMLElement>(ZONE_SELECTOR))
      .find((zone) => zone.dataset.inventoryWidgetId === target.widgetId);
    if (!targetZone) return;
    setActiveDropZone(targetZone);

    const targetRows = Array.from(targetZone.querySelectorAll<HTMLElement>(INVENTORY_ROW_SELECTOR));
    const zoneRect = targetZone.getBoundingClientRect();
    const zoneScaleY = targetZone.offsetHeight > 0 ? zoneRect.height / targetZone.offsetHeight : 1;
    const targetGap = (parseFloat(getComputedStyle(targetZone).rowGap || '0') || 0) * zoneScaleY;
    const shiftHeight = Math.min(draggedHeight, MAX_WIDGET_SHIFT_HEIGHT);
    targetRows.slice(target.index).forEach((element) => shiftItem(element, shiftHeight + targetGap));
  };

  const captureRects = (selector: string, idKey: 'compendiumEntryId' | 'inventoryItemId') => new Map(
    Array.from(document.querySelectorAll<HTMLElement>(selector))
      .map((element) => [element.dataset[idKey] || '', element.getBoundingClientRect()] as const)
      .filter(([id]) => Boolean(id)),
  );

  const animateToCommittedPositions = (
    selector: string,
    idKey: 'compendiumEntryId' | 'inventoryItemId',
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

  const resolveDropTarget = (clientX: number, clientY: number): CompendiumDragTarget | null => {
    const scrollEl = listScrollRef.current;
    if (scrollEl && scrollEl.scrollHeight > scrollEl.clientHeight) {
      const scrollRect = scrollEl.getBoundingClientRect();
      if (clientX >= scrollRect.left && clientX <= scrollRect.right && clientY >= scrollRect.top && clientY <= scrollRect.bottom) {
        if (clientY < scrollRect.top + 36) scrollEl.scrollTop -= 12;
        else if (clientY > scrollRect.bottom - 36) scrollEl.scrollTop += 12;
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

      // Never pierce through floating panels or dialogs into occluded sheet widgets underneath.
      if (hit.id === 'compendium-panel' || hit.matches('[data-touch-camera-panel="true"], [role="dialog"]')) {
        return null;
      }

      const slotEl = hit.closest<HTMLElement>(SLOT_SELECTOR);
      if (slotEl?.dataset.inventoryWidgetId && slotEl.dataset.inventorySlotId) {
        const widget = findActiveSheetWidget(slotEl.dataset.inventoryWidgetId);
        if (!widget || widget.locked || useStore.getState().mode === 'print') return null;
        const slot = widget.data.inventorySlots?.find((candidate) => candidate.id === slotEl.dataset.inventorySlotId);
        if (!slot) return null;
        const items = widget.data.inventoryItems ?? [];
        if (getSlotItems(items, slot.id).length >= getSlotMaxItems(slot)) return null;
        return { kind: 'widget-slot', widgetId: widget.id, slotId: slot.id };
      }

      const zoneEl = hit.closest<HTMLElement>(ZONE_SELECTOR);
      if (zoneEl?.dataset.inventoryWidgetId) {
        const widget = findActiveSheetWidget(zoneEl.dataset.inventoryWidgetId);
        if (!widget || widget.locked || useStore.getState().mode === 'print') return null;

        const zoneRect = zoneEl.getBoundingClientRect();
        if (zoneEl.scrollHeight > zoneEl.clientHeight) {
          if (clientY < zoneRect.top + 28) zoneEl.scrollTop -= 12;
          else if (clientY > zoneRect.bottom - 28) zoneEl.scrollTop += 12;
        }

        const rows = Array.from(zoneEl.querySelectorAll<HTMLElement>(INVENTORY_ROW_SELECTOR));
        const foundIndex = rows.findIndex((row) => {
          const rect = row.getBoundingClientRect();
          return clientY < rect.top + rect.height / 2;
        });
        return {
          kind: 'widget-list',
          widgetId: widget.id,
          index: foundIndex < 0 ? rows.length : foundIndex,
        };
      }

      if (hit.hasAttribute('data-widget-id')) {
        const hitWidget = findActiveSheetWidget(hit.getAttribute('data-widget-id') || '');
        if (hitWidget?.locked) return null;
      }
    }

    return null;
  };

  const logWidgetCopyTimeline = (targetWidgetId: string, createdItem: InventoryItem, slotId?: string) => {
    const targetWidget = findActiveSheetWidget(targetWidgetId);
    if (!targetWidget) return;
    const quantity = getInventoryItemQuantity(createdItem);
    const quantitySuffix = quantity !== undefined ? ` (x${quantity})` : '';
    if (targetWidget.type === 'INVENTORY_SLOTS') {
      const title = targetWidget.data.label || 'Equipment';
      const slotName = targetWidget.data.inventorySlots?.find((slot) => slot.id === slotId)?.name || 'a slot';
      addTimelineEvent(title, 'INVENTORY_SLOTS', `Equipped: ${createdItem.name}${quantitySuffix} in ${slotName}`, '🛡️');
      return;
    }
    const { title: defaultTitle } = getInventoryWidgetTerms(targetWidget.type);
    const title = targetWidget.data.label || defaultTitle;
    addTimelineEvent(title, targetWidget.type, `Added: ${createdItem.name}${quantitySuffix}`, '➕');
  };

  function finishDrag(pointerId?: number, commit = true) {
    const drag = dragRef.current;
    if (pointerId !== undefined && drag?.pointerId !== pointerId) return;
    removeDragListenersRef.current?.();
    removeDragListenersRef.current = null;

    if (drag) {
      const ghostRect = drag.ghostElement?.getBoundingClientRect() ?? null;
      const compendiumRects = captureRects(COMPENDIUM_ROW_SELECTOR, 'compendiumEntryId');
      const widgetRects = captureRects(INVENTORY_ROW_SELECTOR, 'inventoryItemId');

      drag.ghostElement?.remove();
      drag.sourceElement.classList.remove('inventory-item--dragging', 'compendium-entry--copy-source');
      clearDragPreview();

      if (commit && drag.didMove && drag.target) {
        if (drag.target.kind === 'compendium') {
          if (ghostRect) compendiumRects.set(drag.item.id, ghostRect);
          const moved = moveCompendiumItem({
            sourceSectionId: drag.sectionId,
            targetSectionId: drag.target.sectionId,
            itemId: drag.item.id,
            beforeItemId: drag.target.beforeItemId,
          });
          if (moved) {
            if (drag.target.collapsed) onExpandSection?.(drag.target.sectionId);
            animateToCommittedPositions(COMPENDIUM_ROW_SELECTOR, 'compendiumEntryId', compendiumRects);
          }
        } else if (drag.target.kind === 'widget-list') {
          const created = copyCompendiumItemToWidget({
            item: drag.item,
            targetWidgetId: drag.target.widgetId,
            targetIndex: drag.target.index,
          });
          if (created) {
            logWidgetCopyTimeline(drag.target.widgetId, created);
            if (ghostRect) widgetRects.set(created.id, ghostRect);
            animateToCommittedPositions(INVENTORY_ROW_SELECTOR, 'inventoryItemId', widgetRects);
          }
        } else if (drag.target.kind === 'widget-slot') {
          const created = copyCompendiumItemToWidget({
            item: drag.item,
            targetWidgetId: drag.target.widgetId,
            targetSlotId: drag.target.slotId,
          });
          if (created) {
            logWidgetCopyTimeline(drag.target.widgetId, created, drag.target.slotId);
            if (ghostRect) widgetRects.set(created.id, ghostRect);
            animateToCommittedPositions(INVENTORY_ROW_SELECTOR, 'inventoryItemId', widgetRects);
          }
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
      const ghost = drag.sourceElement.cloneNode(true) as HTMLElement;
      ghost.removeAttribute('data-compendium-entry-row');
      ghost.removeAttribute('data-compendium-entry-id');
      ghost.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
      ghost.classList.remove('inventory-item--dragging', 'inventory-item--preview-shift', 'compendium-entry--copy-source');
      ghost.classList.add('inventory-item--drag-ghost');
      ghost.style.left = `${drag.originLeft}px`;
      ghost.style.top = `${drag.originTop}px`;
      ghost.style.width = `${drag.originWidth}px`;
      ghost.style.height = `${Math.min(drag.originHeight, MAX_GHOST_HEIGHT)}px`;
      document.body.appendChild(ghost);
      drag.ghostElement = ghost;
    }

    drag.ghostElement!.style.transform = `translate3d(${event.clientX - drag.startX}px, ${event.clientY - drag.startY}px, 0) scale(1.02) rotate(0.35deg)`;
    drag.target = resolveDropTarget(event.clientX, event.clientY);
    updateDragPreview(drag, drag.target);
  };

  const startDrag = (sectionId: string, item: InventoryItem, event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const sourceElement = event.currentTarget.closest<HTMLElement>(COMPENDIUM_ROW_SELECTOR);
    const sourceZone = sourceElement?.closest<HTMLElement>(COMPENDIUM_ZONE_SELECTOR);
    if (!sourceElement || !sourceZone) return;

    const sourceRows = Array.from(sourceZone.querySelectorAll<HTMLElement>(COMPENDIUM_ROW_SELECTOR));
    const sourceIndex = sourceRows.indexOf(sourceElement);
    const sourceRect = sourceElement.getBoundingClientRect();

    event.preventDefault();
    event.stopPropagation();
    removeDragListenersRef.current?.();

    dragRef.current = {
      pointerId: event.pointerId,
      sectionId,
      item,
      sourceElement,
      sourceZone,
      sourceIndex,
      ghostElement: null,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: sourceRect.left,
      originTop: sourceRect.top,
      originWidth: sourceRect.width,
      originHeight: sourceRect.height,
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

  return { startDrag };
}
