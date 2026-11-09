import { memo, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { InlineFormulaText } from '../InlineFormulaText';
import { InventoryItem, Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import {
  getCharacterGlobalInventoryLoad,
  getInventoryItemQuantity,
  getInventoryLoad,
} from '../../utils/inventory';
import { getSlotItems, getSlotMaxItems } from '../../utils/inventorySlots';
import { useInventoryItemDrag } from '../../hooks/useInventoryItemDrag';
import { InventoryEditor } from '../editors/InventoryEditor';
import { ChevronDownIcon, ChevronRightIcon, GripVerticalIcon, PencilIcon, PlusIcon, XIcon } from '../icons';
import { InlineDiceText } from '../InlineDiceText';
import { Tooltip } from '../Tooltip';
import InventoryItemDialog from './InventoryItemDialog';
import InventoryQuantityDialog from './InventoryQuantityDialog';
import {
  describeInventoryItemChange,
  formatFieldValue,
  InventoryQuantity,
  isInventoryFieldEmpty,
  LoadMeter,
} from './inventoryItemDisplay';

interface InventorySlotsWidgetProps {
  widget: Widget;
  mode: 'play' | 'print';
  width: number;
  height: number;
  showFieldControls?: boolean;
  interactive?: boolean;
}

// Vertical layout gives widgets an effectively unbounded height, so the canvas keeps the widget's own proportions instead.
const UNBOUNDED_HEIGHT = 5000;

function InventorySlotsWidget({
  widget,
  mode,
  height,
  showFieldControls = true,
  interactive = true,
}: InventorySlotsWidgetProps) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const saveInventoryItem = useStore((state) => state.saveInventoryItem);
  const characters = useStore((state) => state.characters);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const activeCharacter = characters.find((character) => character.id === activeCharacterId);

  const { label, inventoryItems = [], inventoryDefaultFields = [], inventorySlots = [] } = widget.data;
  const title = label || 'Equipment';
  const encumbrance = widget.data.inventoryEncumbrance;
  const isPrintMode = mode === 'print';
  const canInteract = interactive && !isPrintMode;
  const controlsVisible = canInteract && showFieldControls && widget.data.showFieldControls !== false;
  const localLoad = useMemo(() => getInventoryLoad(inventoryItems), [inventoryItems]);
  const globalLoad = useMemo(() => getCharacterGlobalInventoryLoad(activeCharacter), [activeCharacter]);
  const [dialog, setDialog] = useState<{ slotId: string; item?: InventoryItem } | null>(null);
  const [quantityDialogItem, setQuantityDialogItem] = useState<InventoryItem | null>(null);
  const [weightOptionsOpen, setWeightOptionsOpen] = useState(false);
  const { startDrag } = useInventoryItemDrag({ widget, items: inventoryItems, canInteract });
  const unbounded = height >= UNBOUNDED_HEIGHT;
  const collapseAttributes = canInteract && Boolean(widget.data.inventorySlotsCollapseAttributes);
  const [expandedItemIds, setExpandedItemIds] = useState<ReadonlySet<string>>(() => new Set());
  const toggleExpanded = (itemId: string) => {
    setExpandedItemIds((current) => {
      const next = new Set(current);
      if (!next.delete(itemId)) next.add(itemId);
      return next;
    });
  };

  useEffect(() => {
    if (!weightOptionsOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setWeightOptionsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [weightOptionsOpen]);

  const slotName = (slotId: string | undefined) => inventorySlots.find((slot) => slot.id === slotId)?.name;

  const deleteItem = (item: InventoryItem) => {
    updateWidgetData(widget.id, { inventoryItems: inventoryItems.filter((entry) => entry.id !== item.id) });
    addTimelineEvent(title, 'INVENTORY_SLOTS', `Removed: ${item.name}${slotName(item.slotId) ? ` from ${slotName(item.slotId)}` : ''}`, '➖');
    setDialog(null);
  };

  const renderLoadMeter = (props: { value: number; capacity?: number; unit: string; label: string }) => {
    const meter = <LoadMeter {...props} />;
    if (!canInteract) return meter;
    return (
      <Tooltip content="Edit weight and encumbrance options">
        <button
          type="button"
          onClick={() => setWeightOptionsOpen(true)}
          onMouseDown={(event) => event.stopPropagation()}
          aria-label={`Edit ${props.label.toLowerCase()} and encumbrance options`}
          data-touch-camera-ignore="true"
          className="block w-full min-w-0 rounded text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-theme-accent"
        >
          {meter}
        </button>
      </Tooltip>
    );
  };

  const renderItem = (item: InventoryItem, shareSpace: boolean) => {
    const hasVisibleFields = item.fields.some((field) => !isInventoryFieldEmpty(field));
    const collapsible = collapseAttributes && hasVisibleFields;
    const expanded = expandedItemIds.has(item.id);
    const showFields = hasVisibleFields && (!collapseAttributes || expanded);
    const nameText = <InlineFormulaText text={item.name} />;
    return (
      <article
        key={item.id}
        data-inventory-item-row="true"
        data-inventory-item-id={item.id}
        className={`inventory-item inventory-slot__item group relative flex min-h-0 flex-col overflow-hidden px-1 py-1 text-theme-ink ${shareSpace ? 'flex-none' : 'flex-1'}`}
      >
        <div className="inventory-slot__head flex min-w-0 items-start gap-0.5">
          {canInteract && (
            <button
              type="button"
              data-touch-camera-ignore="true"
              onPointerDown={(event) => startDrag(item, event)}
              onClick={(event) => event.stopPropagation()}
              aria-label={`Move ${item.name}`}
              title="Drag to move"
              className="inventory-item__drag-handle flex h-4 w-4 flex-shrink-0 touch-none items-center justify-center rounded text-theme-muted hover:text-theme-ink"
            >
              <GripVerticalIcon className="h-3 w-3" />
            </button>
          )}
          <h3 className="inventory-slot__title min-w-0 flex-1 break-words font-heading text-xs font-bold leading-4 [overflow-wrap:anywhere]">
            {collapsible ? (
              <button
                type="button"
                onClick={() => toggleExpanded(item.id)}
                onMouseDown={(event) => event.stopPropagation()}
                aria-expanded={expanded}
                aria-label={`${expanded ? 'Hide' : 'Show'} attributes of ${item.name}`}
                data-touch-camera-ignore="true"
                className="inline-flex max-w-full items-start gap-0.5 rounded text-left font-heading font-bold hover:text-theme-accent"
              >
                {expanded ? <ChevronDownIcon className="mt-0.5 h-3 w-3 flex-shrink-0" /> : <ChevronRightIcon className="mt-0.5 h-3 w-3 flex-shrink-0" />}
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">{nameText}</span>
              </button>
            ) : nameText}
            {' '}
            <InventoryQuantity item={item} canInteract={canInteract} onEdit={setQuantityDialogItem} />
          </h3>
          {canInteract && (
            <Tooltip content={`Edit ${item.name}`}>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setDialog({ slotId: item.slotId || '', item });
                }}
                onMouseDown={(event) => event.stopPropagation()}
                aria-label={`Edit ${item.name}`}
                className="inventory-item__edit inventory-slot__edit flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-theme-muted opacity-55 hover:bg-theme-accent hover:text-theme-paper group-hover:opacity-100"
              >
                <PencilIcon className="h-3 w-3" />
              </button>
            </Tooltip>
          )}
        </div>
        {showFields && (
          <dl
            className={`mt-0.5 flex min-h-0 min-w-0 flex-row flex-wrap content-start gap-x-2 gap-y-0.5 font-body ${shareSpace ? '' : 'flex-1 overflow-y-auto'}`}
            onWheel={(event) => {
              if (event.currentTarget.scrollHeight > event.currentTarget.clientHeight) event.stopPropagation();
            }}
          >
            {item.fields.map((field, fieldIndex) => (
              isInventoryFieldEmpty(field) ? null : (
                <div key={field.id} className="flex min-w-0 max-w-full flex-wrap items-baseline gap-x-1 text-[9px] leading-3">
                  <dt className="min-w-0 break-words font-body text-theme-muted [overflow-wrap:anywhere]"><InlineFormulaText text={field.name} /></dt>
                  <dd className={`min-w-0 whitespace-pre-wrap break-words font-body font-medium [overflow-wrap:anywhere] ${field.type === 'number' ? 'tabular-nums' : ''}`}>
                    {field.type === 'text' || field.type === 'textarea' ? (
                      <InlineDiceText text={formatFieldValue(item, fieldIndex)} widget={widget} />
                    ) : formatFieldValue(item, fieldIndex)}
                  </dd>
                </div>
              )
            ))}
          </dl>
        )}
      </article>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-1 overflow-hidden">
      <div className={`inventory-widget__header widget-structure-header flex min-h-6 flex-shrink-0 items-center gap-2 ${controlsVisible ? 'inventory-widget__header--edit' : ''}`}>
        <div className="widget-structure-title min-w-0 flex-1 truncate">{title}</div>
      </div>

      {encumbrance?.enabled && (
        <div className={`grid flex-shrink-0 gap-1 px-[3px] ${encumbrance.showGlobalCounter ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
          {renderLoadMeter({ value: localLoad, capacity: encumbrance.localCapacity, unit: encumbrance.unit || 'kg', label: 'Total weight' })}
          {encumbrance.showGlobalCounter && (
            renderLoadMeter({ value: globalLoad, capacity: encumbrance.globalCapacity, unit: encumbrance.unit || 'kg', label: 'Global weight' })
          )}
        </div>
      )}

      <div
        className={`relative min-w-0 ${unbounded ? 'w-full flex-shrink-0' : 'min-h-0 flex-1'}`}
        style={unbounded ? { aspectRatio: `${Math.max(1, widget.w ?? 1)} / ${Math.max(1, widget.h ?? 1)}` } : undefined}
      >
        {inventorySlots.map((slot) => {
          const slotItems = getSlotItems(inventoryItems, slot.id);
          const maxItems = getSlotMaxItems(slot);
          const overCapacity = slotItems.length > maxItems;
          const hasRoom = slotItems.length < maxItems;
          const addLabel = `Add item to ${slot.name}`;
          const addButton = (className: string, iconClassName: string) => (
            <Tooltip content={addLabel}>
              <button
                type="button"
                onClick={() => setDialog({ slotId: slot.id })}
                onMouseDown={(event) => event.stopPropagation()}
                aria-label={addLabel}
                data-touch-camera-ignore="true"
                className={className}
              >
                <PlusIcon className={iconClassName} />
              </button>
            </Tooltip>
          );
          return (
            <div
              key={slot.id}
              data-inventory-slot-drop="true"
              data-inventory-widget-id={widget.id}
              data-inventory-slot-id={slot.id}
              className={`inventory-slot absolute flex flex-col gap-0.5 overflow-hidden p-0.5 ${slotItems.length ? '' : 'inventory-slot--empty'} ${overCapacity ? 'inventory-slot--over' : ''}`}
              style={{ left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.w}%`, height: `${slot.h}%` }}
            >
              <div className="flex min-h-0 flex-shrink-0 items-center gap-1 px-0.5">
                <div className="inventory-slot__name min-w-0 flex-1 truncate" title={slot.name}>{slot.name}</div>
                {(maxItems > 1 || overCapacity) && (
                  <span
                    className="inventory-slot__name inventory-slot__count flex-shrink-0 tabular-nums"
                    title={overCapacity ? `Over capacity: ${slotItems.length} of ${maxItems}` : `${slotItems.length} of ${maxItems} items`}
                  >
                    {slotItems.length}/{maxItems}
                  </span>
                )}
                {controlsVisible && slotItems.length > 0 && hasRoom && addButton(
                  'widget-control widget-control--subtle flex h-4 w-4 flex-shrink-0 items-center justify-center',
                  'h-3 w-3',
                )}
              </div>
              {slotItems.length === 0 && (
                <div className="flex min-h-0 flex-1 items-center justify-center">
                  {controlsVisible && addButton(
                    'widget-control widget-control--subtle flex h-6 w-6 items-center justify-center',
                    'h-3.5 w-3.5',
                  )}
                </div>
              )}
              {slotItems.length === 1 && renderItem(slotItems[0], false)}
              {slotItems.length > 1 && (
                <div
                  className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto"
                  onWheel={(event) => {
                    if (event.currentTarget.scrollHeight > event.currentTarget.clientHeight) event.stopPropagation();
                  }}
                >
                  {slotItems.map((entry) => renderItem(entry, true))}
                </div>
              )}
            </div>
          );
        })}
        {inventorySlots.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-theme-muted">
            No slots yet. Add some in the widget editor.
          </div>
        )}
      </div>

      {dialog && canInteract && (
        <InventoryItemDialog
          key={dialog.item?.id || `new-${dialog.slotId}`}
          item={dialog.item}
          defaultFields={inventoryDefaultFields}
          allowAddMultiple={false}
          onClose={() => setDialog(null)}
          onSave={(item) => {
            const previousItem = inventoryItems.find((entry) => entry.id === item.id);
            saveInventoryItem({
              sourceWidgetId: widget.id,
              targetWidgetId: widget.id,
              item: { ...item, slotId: previousItem?.slotId ?? dialog.slotId },
            });
            if (!previousItem) {
              const quantity = getInventoryItemQuantity(item);
              addTimelineEvent(title, 'INVENTORY_SLOTS', `Equipped: ${item.name}${quantity !== undefined ? ` (x${quantity})` : ''} in ${slotName(dialog.slotId) || 'a slot'}`, '🛡️');
              return;
            }
            const description = describeInventoryItemChange(previousItem, item);
            if (description) addTimelineEvent(title, 'INVENTORY_SLOTS', description, '✏️');
          }}
          onDelete={dialog.item ? () => deleteItem(dialog.item!) : undefined}
        />
      )}

      {quantityDialogItem && canInteract && (
        <InventoryQuantityDialog
          key={quantityDialogItem.id}
          item={quantityDialogItem}
          onClose={() => setQuantityDialogItem(null)}
          onSave={(quantity) => {
            const previousQuantity = getInventoryItemQuantity(quantityDialogItem) ?? 0;
            saveInventoryItem({
              sourceWidgetId: widget.id,
              targetWidgetId: widget.id,
              item: { ...quantityDialogItem, quantity },
            });
            if (quantity !== previousQuantity) {
              addTimelineEvent(title, 'INVENTORY_SLOTS', `${quantityDialogItem.name}: ${previousQuantity} → ${quantity}`, '🎒');
            }
            setQuantityDialogItem(null);
          }}
        />
      )}

      {weightOptionsOpen && canInteract && createPortal(
        <div
          data-touch-camera-ignore="true"
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4 animate-fade-in"
          onClick={() => setWeightOptionsOpen(false)}
          onMouseDown={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`inventory-slots-weight-options-title-${widget.id}`}
            className="flex max-h-[min(90vh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-theme border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink shadow-theme animate-modal-in"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-theme-border px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-theme-muted">Equipment</p>
                <h2 id={`inventory-slots-weight-options-title-${widget.id}`} className="mt-0.5 font-heading text-lg font-bold">
                  Weight &amp; encumbrance
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setWeightOptionsOpen(false)}
                aria-label="Close weight options"
                className="widget-control flex h-7 w-7 flex-shrink-0 items-center justify-center"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto overscroll-contain p-4">
              <InventoryEditor
                widget={widget}
                updateData={(data) => updateWidgetData(widget.id, data)}
                weightOptionsOnly
              />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

export default memo(InventorySlotsWidget);
