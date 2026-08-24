import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { InventoryItem, InventoryItemField, Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { getCharacterGlobalInventoryLoad, getInventoryLoad } from '../../utils/inventory';
import { useTouchCameraPinchCancellation } from '../../hooks/useTouchCamera';
import { GripVerticalIcon, MinusIcon, PencilIcon, PlusIcon } from '../icons';
import { InlineDiceText } from '../InlineDiceText';
import { Tooltip } from '../Tooltip';
import { SelectionActions } from './StructureDialogControls';
import { WidgetEmptyState } from './WidgetPrimitives';
import InventoryItemDialog from './InventoryItemDialog';

interface InventoryWidgetProps {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
  showFieldControls?: boolean;
  interactive?: boolean;
}

interface DragTarget {
  widgetId: string;
  index: number;
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
  draggedHeight: number;
  rowsByZone: Map<HTMLElement, HTMLElement[]>;
  zoneGaps: Map<HTMLElement, number>;
  rowScaleY: Map<HTMLElement, number>;
  didMove: boolean;
  target: DragTarget | null;
}

function formatFieldValue(item: InventoryItem, fieldIndex: number): string {
  const field = item.fields[fieldIndex];
  if (!field) return '';
  if (field.type === 'checkbox') return field.value ? 'Yes' : 'No';
  if (field.type === 'number') {
    const value = Number(field.value);
    return Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 3 }) : '0';
  }
  return String(field.value) || '-';
}

function isInventoryFieldEmpty(field: InventoryItemField): boolean {
  return (field.type === 'text' || field.type === 'textarea') && String(field.value).trim() === '';
}

function LoadMeter({ value, capacity, unit, label }: { value: number; capacity?: number; unit: string; label: string }) {
  const hasCapacity = typeof capacity === 'number' && Number.isFinite(capacity) && capacity >= 0;
  const overloaded = hasCapacity && value > capacity;
  const percentage = hasCapacity && capacity > 0 ? Math.min(100, (value / capacity) * 100) : 0;
  const formattedValue = value.toLocaleString(undefined, { maximumFractionDigits: 3 });
  const formattedCapacity = hasCapacity
    ? capacity.toLocaleString(undefined, { maximumFractionDigits: 3 })
    : '';
  const overage = hasCapacity
    ? (value - capacity).toLocaleString(undefined, { maximumFractionDigits: 3 })
    : '';

  return (
    <div
      className={`inventory-load ${overloaded ? 'inventory-load--over' : ''}`}
      role={hasCapacity ? 'progressbar' : 'status'}
      aria-label={`${label}: ${value}${hasCapacity ? ` of ${capacity}` : ''} ${unit}`}
      aria-valuemin={hasCapacity ? 0 : undefined}
      aria-valuemax={hasCapacity ? capacity : undefined}
      aria-valuenow={hasCapacity ? value : undefined}
    >
      <div className="inventory-load__summary">
        <span className="inventory-load__label">{label}</span>
        <span className="inventory-load__value">
          <strong>{formattedValue}</strong>
          {hasCapacity && <span className="inventory-load__capacity"> / {formattedCapacity}</span>}
          <span className="inventory-load__unit"> {unit}</span>
        </span>
      </div>
      {overloaded && <div className="inventory-load__warning">Over by {overage} {unit}</div>}
      {hasCapacity && (
        <div className="inventory-load__track" aria-hidden="true">
          <div className="inventory-load__fill" style={{ width: `${percentage}%` }} />
          <span className="inventory-load__limit" />
        </div>
      )}
    </div>
  );
}

export default function InventoryWidget({
  widget,
  mode,
  showFieldControls = true,
  interactive = true,
}: InventoryWidgetProps) {
  const { label, inventoryItems = [], inventoryDefaultFields = [] } = widget.data;
  const encumbrance = widget.data.inventoryEncumbrance;
  const showGlobalCounter = encumbrance?.enabled === true && encumbrance.showGlobalCounter === true;
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const moveInventoryItem = useStore((state) => state.moveInventoryItem);
  const saveInventoryItem = useStore((state) => state.saveInventoryItem);
  const activeCharacter = useStore((state) => {
    if (!showGlobalCounter) return undefined;
    return state.characters.find((character) => character.id === state.activeCharacterId);
  });
  const isPrintMode = mode === 'print';
  const canInteract = interactive && !isPrintMode;
  const controlsVisible = canInteract && showFieldControls && widget.data.showFieldControls !== false;
  const localLoad = useMemo(
    () => encumbrance?.enabled ? getInventoryLoad(inventoryItems) : 0,
    [encumbrance?.enabled, inventoryItems],
  );
  const globalLoad = useMemo(
    () => showGlobalCounter ? getCharacterGlobalInventoryLoad(activeCharacter) : 0,
    [activeCharacter, showGlobalCounter],
  );
  const [dialogItem, setDialogItem] = useState<InventoryItem | null | undefined>(undefined);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(() => new Set());
  const dragRef = useRef<ActiveDrag | null>(null);
  const removeDragListenersRef = useRef<(() => void) | null>(null);
  const activeDropZoneRef = useRef<HTMLElement | null>(null);
  const activePreviewRowsRef = useRef<Set<HTMLElement>>(new Set());
  const dragPreviewFrameRef = useRef<number | null>(null);
  const pendingDragPointRef = useRef<{ clientX: number; clientY: number } | null>(null);

  const clearDragPreview = () => {
    activePreviewRowsRef.current.forEach((element) => {
      element.classList.remove('inventory-item--preview-shift');
      element.style.removeProperty('transform');
    });
    activePreviewRowsRef.current.clear();
    activeDropZoneRef.current?.classList.remove('inventory-drop-zone--active');
    activeDropZoneRef.current = null;
  };

  const shiftItem = (drag: ActiveDrag, element: HTMLElement, viewportOffsetY: number) => {
    let scaleY = drag.rowScaleY.get(element);
    if (scaleY === undefined) {
      const rect = element.getBoundingClientRect();
      scaleY = element.offsetHeight > 0 ? rect.height / element.offsetHeight : 1;
      drag.rowScaleY.set(element, scaleY);
    }
    element.classList.add('inventory-item--preview-shift');
    element.style.transform = `translate3d(0, ${viewportOffsetY / scaleY}px, 0)`;
    activePreviewRowsRef.current.add(element);
  };

  const getRowsForZone = (drag: ActiveDrag, zone: HTMLElement) => {
    const cachedRows = drag.rowsByZone.get(zone);
    if (cachedRows) return cachedRows;
    const rows = Array.from(zone.querySelectorAll<HTMLElement>('[data-inventory-item-row="true"]'));
    drag.rowsByZone.set(zone, rows);
    return rows;
  };

  const getGapForZone = (drag: ActiveDrag, zone: HTMLElement) => {
    const cachedGap = drag.zoneGaps.get(zone);
    if (cachedGap !== undefined) return cachedGap;
    const gap = parseFloat(getComputedStyle(zone).rowGap || '0');
    drag.zoneGaps.set(zone, gap);
    return gap;
  };

  const updateDragPreview = (drag: ActiveDrag, target: DragTarget | null) => {
    const previousDropZone = activeDropZoneRef.current;
    const targetZone = previousDropZone?.dataset.inventoryWidgetId === target?.widgetId
      ? previousDropZone
      : target
        ? Array.from(document.querySelectorAll<HTMLElement>('[data-inventory-drop-zone="true"]'))
          .find((zone) => zone.dataset.inventoryWidgetId === target.widgetId)
        : undefined;
    clearDragPreview();
    if (!target) return;

    if (!targetZone) return;
    targetZone.classList.add('inventory-drop-zone--active');
    activeDropZoneRef.current = targetZone;

    const sourceRows = getRowsForZone(drag, drag.sourceZone);
    const targetRows = getRowsForZone(drag, targetZone);
    const sourceGap = getGapForZone(drag, drag.sourceZone);
    const targetGap = getGapForZone(drag, targetZone);

    if (target.widgetId === widget.id) {
      const destinationIndex = target.index > drag.sourceIndex ? target.index - 1 : target.index;
      if (destinationIndex < drag.sourceIndex) {
        sourceRows.slice(destinationIndex, drag.sourceIndex).forEach((element) => shiftItem(drag, element, drag.draggedHeight + sourceGap));
      } else if (destinationIndex > drag.sourceIndex) {
        sourceRows.slice(drag.sourceIndex + 1, destinationIndex + 1).forEach((element) => shiftItem(drag, element, -(drag.draggedHeight + sourceGap)));
      }
      return;
    }

    sourceRows.slice(drag.sourceIndex + 1).forEach((element) => shiftItem(drag, element, -(drag.draggedHeight + sourceGap)));
    targetRows.slice(target.index).forEach((element) => shiftItem(drag, element, drag.draggedHeight + targetGap));
  };

  const captureItemRects = () => new Map(
    Array.from(document.querySelectorAll<HTMLElement>('[data-inventory-item-row="true"]'))
      .map((element) => [element.dataset.inventoryItemId || '', element.getBoundingClientRect()] as const)
      .filter(([id]) => Boolean(id)),
  );

  const animateToCommittedPositions = (previousRects: Map<string, DOMRect>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>('[data-inventory-item-row="true"]').forEach((element) => {
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

  const resolveDropTarget = (drag: ActiveDrag, clientX: number, clientY: number): DragTarget | null => {
    const zone = document.elementsFromPoint(clientX, clientY)
      .map((element) => element.closest<HTMLElement>('[data-inventory-drop-zone="true"]'))
      .find((element): element is HTMLElement => Boolean(element?.dataset.inventoryWidgetId));
    if (!zone) return null;

    if (activeDropZoneRef.current !== zone) {
      activeDropZoneRef.current?.classList.remove('inventory-drop-zone--active');
      zone.classList.add('inventory-drop-zone--active');
      activeDropZoneRef.current = zone;
    }

    const zoneRect = zone.getBoundingClientRect();
    if (zone.scrollHeight > zone.clientHeight) {
      if (clientY < zoneRect.top + 28) zone.scrollTop -= 12;
      else if (clientY > zoneRect.bottom - 28) zone.scrollTop += 12;
    }

    const rows = getRowsForZone(drag, zone);
    const targetIndex = rows.findIndex((row) => clientY < row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2);
    const index = targetIndex < 0 ? rows.length : targetIndex;
    return {
      widgetId: zone.dataset.inventoryWidgetId || '',
      index,
    };
  };

  const processPendingDragPreview = () => {
    dragPreviewFrameRef.current = null;
    const drag = dragRef.current;
    const point = pendingDragPointRef.current;
    pendingDragPointRef.current = null;
    if (!drag || !point || !drag.didMove) return;

    const target = resolveDropTarget(drag, point.clientX, point.clientY);
    const targetChanged = drag.target?.widgetId !== target?.widgetId || drag.target?.index !== target?.index;
    if (!targetChanged) return;
    drag.target = target;
    updateDragPreview(drag, target);
  };

  const cancelPendingDragPreview = () => {
    if (dragPreviewFrameRef.current !== null) {
      window.cancelAnimationFrame(dragPreviewFrameRef.current);
      dragPreviewFrameRef.current = null;
    }
  };

  const scheduleDragPreview = (clientX: number, clientY: number) => {
    pendingDragPointRef.current = { clientX, clientY };
    if (dragPreviewFrameRef.current !== null) return;
    dragPreviewFrameRef.current = window.requestAnimationFrame(processPendingDragPreview);
  };

  function finishDrag(pointerId?: number, commit = true) {
    const drag = dragRef.current;
    if (pointerId !== undefined && drag?.pointerId !== pointerId) return;
    removeDragListenersRef.current?.();
    removeDragListenersRef.current = null;
    cancelPendingDragPreview();
    if (drag?.didMove && pendingDragPointRef.current) processPendingDragPreview();
    pendingDragPointRef.current = null;
    if (drag) {
      const previousRects = captureItemRects();
      if (drag.ghostElement) previousRects.set(drag.item.id, drag.ghostElement.getBoundingClientRect());
      drag.ghostElement?.remove();
      drag.sourceElement.classList.remove('inventory-item--dragging');
      clearDragPreview();
      if (commit && drag.didMove && drag.target) {
        moveInventoryItem({
          sourceWidgetId: widget.id,
          targetWidgetId: drag.target.widgetId,
          itemId: drag.item.id,
          targetIndex: drag.target.index,
        });
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
    scheduleDragPreview(event.clientX, event.clientY);
  };

  const startDrag = (item: InventoryItem, event: React.PointerEvent<HTMLButtonElement>) => {
    if (!canInteract || event.button !== 0) return;
    const sourceElement = event.currentTarget.closest<HTMLElement>('[data-inventory-item-row="true"]');
    const sourceZone = sourceElement?.closest<HTMLElement>('[data-inventory-drop-zone="true"]');
    if (!sourceElement || !sourceZone) return;
    const sourceRows = Array.from(sourceZone.querySelectorAll<HTMLElement>('[data-inventory-item-row="true"]'));
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
      draggedHeight: sourceRect.height,
      rowsByZone: new Map([[sourceZone, sourceRows]]),
      zoneGaps: new Map(),
      rowScaleY: new Map(),
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
  useEffect(() => () => {
    removeDragListenersRef.current?.();
    cancelPendingDragPreview();
    pendingDragPointRef.current = null;
  }, []);

  useEffect(() => {
    if (!removeDialogOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedItemIds(new Set());
        setRemoveDialogOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [removeDialogOpen]);

  const handleReorderKey = (index: number, event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'ArrowUp' && index > 0) {
      moveInventoryItem({ sourceWidgetId: widget.id, targetWidgetId: widget.id, itemId: inventoryItems[index].id, targetIndex: index - 1 });
    }
    if (event.key === 'ArrowDown' && index < inventoryItems.length - 1) {
      moveInventoryItem({ sourceWidgetId: widget.id, targetWidgetId: widget.id, itemId: inventoryItems[index].id, targetIndex: index + 2 });
    }
  };

  const deleteItem = (itemId: string) => {
    updateWidgetData(widget.id, { inventoryItems: inventoryItems.filter((item) => item.id !== itemId) });
    setDialogItem(undefined);
  };

  const closeRemoveDialog = () => {
    setSelectedItemIds(new Set());
    setRemoveDialogOpen(false);
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const removeSelectedItems = () => {
    if (selectedItemIds.size === 0) return;
    updateWidgetData(widget.id, {
      inventoryItems: inventoryItems.filter((item) => !selectedItemIds.has(item.id)),
    });
    closeRemoveDialog();
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-1 overflow-hidden">
      <div className={`inventory-widget__header widget-structure-header flex min-h-6 flex-shrink-0 items-center gap-2 ${controlsVisible ? 'inventory-widget__header--edit' : ''}`}>
        <div className="widget-structure-title min-w-0 flex-1 truncate">{label || 'Inventory'}</div>
        {controlsVisible && (
          <div className="widget-structure-controls ml-auto flex flex-shrink-0 items-center gap-1">
            <Tooltip content={inventoryItems.length > 0 ? 'Choose items to remove' : 'No items to remove'}>
              <button
                type="button"
                onClick={() => {
                  setSelectedItemIds(new Set());
                  setRemoveDialogOpen(true);
                }}
                onMouseDown={(event) => event.stopPropagation()}
                disabled={inventoryItems.length === 0}
                aria-label="Choose inventory items to remove"
                className="widget-control widget-control--subtle flex h-6 w-6 items-center justify-center"
              >
                <MinusIcon className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="Add inventory item">
              <button
                type="button"
                onClick={() => setDialogItem(null)}
                onMouseDown={(event) => event.stopPropagation()}
                aria-label="Add inventory item"
                className="widget-control widget-control--subtle flex h-6 w-6 items-center justify-center"
              >
                <PlusIcon className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {encumbrance?.enabled && (
        <div className={`grid flex-shrink-0 gap-1 px-[3px] ${encumbrance.showGlobalCounter ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
          <LoadMeter value={localLoad} capacity={encumbrance.localCapacity} unit={encumbrance.unit || 'kg'} label="Total weight" />
          {encumbrance.showGlobalCounter && (
            <LoadMeter value={globalLoad} capacity={encumbrance.globalCapacity} unit={encumbrance.unit || 'kg'} label="Global weight" />
          )}
        </div>
      )}

      <div
        data-inventory-drop-zone="true"
        data-inventory-widget-id={widget.id}
        className="inventory-drop-zone flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-0.5"
        onWheel={(event) => {
          if (event.currentTarget.scrollHeight > event.currentTarget.clientHeight) event.stopPropagation();
        }}
      >
        {inventoryItems.length === 0 ? (
          <WidgetEmptyState
            title={canInteract ? 'No items yet' : 'Empty inventory'}
            hint={controlsVisible ? 'Add an item or drop one here.' : undefined}
            compact
          />
        ) : inventoryItems.map((item, index) => (
          <article
            key={item.id}
            data-inventory-item-row="true"
            data-inventory-item-id={item.id}
            className="inventory-item group relative px-1.5 py-1.5 text-theme-ink"
          >
            <div className="grid min-w-0 grid-cols-[20px_minmax(62px,0.8fr)_minmax(0,1.7fr)_22px] items-start gap-1">
              {canInteract && (
                <button
                  type="button"
                  data-touch-camera-ignore="true"
                  onPointerDown={(event) => startDrag(item, event)}
                  onKeyDown={(event) => handleReorderKey(index, event)}
                  onClick={(event) => event.stopPropagation()}
                  aria-label={`Move ${item.name}`}
                  title="Drag to move. Arrow keys reorder."
                  className="inventory-item__drag-handle flex h-5 w-5 touch-none items-center self-center justify-center rounded text-theme-muted hover:text-theme-ink"
                >
                  <GripVerticalIcon className="h-3 w-3" />
                </button>
              )}
              {!canInteract && <span />}
              <h3 className="min-w-0 self-center break-words font-heading text-xs font-bold leading-4 [overflow-wrap:anywhere]">{item.name}</h3>
              <dl className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-0.5">
                {item.fields.map((field, fieldIndex) => (
                  isInventoryFieldEmpty(field) ? null : (
                  <div key={field.id} className="flex min-w-0 max-w-full flex-wrap items-baseline gap-x-1 text-[9px] leading-3">
                    <dt className="min-w-0 break-words text-theme-muted [overflow-wrap:anywhere]">{field.name}</dt>
                    <dd className={`min-w-0 whitespace-pre-wrap break-words font-medium [overflow-wrap:anywhere] ${field.type === 'number' ? 'font-mono tabular-nums' : ''}`}>
                      {field.type === 'text' || field.type === 'textarea' ? (
                        <InlineDiceText text={formatFieldValue(item, fieldIndex)} widget={widget} />
                      ) : formatFieldValue(item, fieldIndex)}
                    </dd>
                  </div>
                  )
                ))}
              </dl>
              {canInteract && (
                <Tooltip content={`Edit ${item.name}`}>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setDialogItem(item);
                    }}
                    onMouseDown={(event) => event.stopPropagation()}
                    aria-label={`Edit ${item.name}`}
                    className="inventory-item__edit flex h-5 w-5 self-center items-center justify-center rounded text-theme-muted opacity-55 hover:bg-theme-accent hover:text-theme-paper group-hover:opacity-100"
                  >
                    <PencilIcon className="h-3 w-3" />
                  </button>
                </Tooltip>
              )}
              {!canInteract && <span />}
            </div>
          </article>
        ))}
      </div>

      {dialogItem !== undefined && canInteract && (
        <InventoryItemDialog
          key={dialogItem?.id || 'new-item'}
          item={dialogItem || undefined}
          defaultFields={inventoryDefaultFields}
          onClose={() => setDialogItem(undefined)}
          onSave={(item) => saveInventoryItem({
            sourceWidgetId: widget.id,
            targetWidgetId: widget.id,
            item,
          })}
          onDelete={dialogItem ? () => deleteItem(dialogItem.id) : undefined}
        />
      )}

      {removeDialogOpen && canInteract && createPortal(
        <div
          data-touch-camera-ignore="true"
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4"
          onClick={closeRemoveDialog}
          onMouseDown={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`inventory-remove-dialog-title-${widget.id}`}
            className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id={`inventory-remove-dialog-title-${widget.id}`} className="font-heading text-base font-bold">
              Remove items
            </h3>
            <p className="mt-3 text-sm text-theme-muted">Select one or more items to remove.</p>
            <SelectionActions
              onCheckAll={() => setSelectedItemIds(new Set(inventoryItems.map((item) => item.id)))}
              onUncheckAll={() => setSelectedItemIds(new Set())}
            />
            <div className="mt-2 max-h-64 space-y-1 overflow-y-auto overscroll-contain pr-1">
              {inventoryItems.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center gap-3 rounded-button border border-theme-border px-3 py-2 text-sm transition-colors hover:bg-theme-accent hover:text-theme-paper"
                >
                  <input
                    type="checkbox"
                    checked={selectedItemIds.has(item.id)}
                    onChange={() => toggleItemSelection(item.id)}
                    aria-label={`Select ${item.name}`}
                    className="h-4 w-4 flex-shrink-0 accent-theme-accent"
                  />
                  <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{item.name}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" autoFocus onClick={closeRemoveDialog} className="widget-control px-3 py-1.5 text-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={removeSelectedItems}
                disabled={selectedItemIds.size === 0}
                className="min-h-8 rounded-button border border-red-700 bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remove{selectedItemIds.size > 0 ? ` (${selectedItemIds.size})` : ''}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

    </div>
  );
}
