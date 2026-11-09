import { memo, useEffect, useMemo, useState } from 'react';
import { InlineFormulaText } from '../InlineFormulaText';
import { createPortal } from 'react-dom';
import { InventoryItem, Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import {
  getCharacterGlobalInventoryLoad,
  duplicateInventoryItem,
  getInventoryItemQuantity,
  getInventoryLoad,
  getInventoryWidgetTerms,
} from '../../utils/inventory';
import { useInventoryItemDrag } from '../../hooks/useInventoryItemDrag';
import { InventoryEditor } from '../editors/InventoryEditor';
import { ChevronDownIcon, GripVerticalIcon, MinusIcon, PencilIcon, PlusIcon, XIcon } from '../icons';
import { InlineDiceRichText } from '../InlineDiceRichText';
import { InlineDiceText } from '../InlineDiceText';
import { Tooltip } from '../Tooltip';
import { SelectionActions } from './StructureDialogControls';
import { WidgetEmptyState } from './WidgetPrimitives';
import InventoryItemDialog from './InventoryItemDialog';
import InventoryQuantityDialog from './InventoryQuantityDialog';
import {
  describeInventoryItemChange,
  formatFieldValue,
  InventoryQuantity,
  isInventoryFieldEmpty,
  LoadMeter,
} from './inventoryItemDisplay';

interface InventoryWidgetProps {
  widget: Widget;
  mode: 'play' | 'print';
  width: number;
  height: number;
  showFieldControls?: boolean;
  interactive?: boolean;
}

function InventoryWidget({
  widget,
  mode,
  showFieldControls = true,
  interactive = true,
}: InventoryWidgetProps) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const saveInventoryItem = useStore((state) => state.saveInventoryItem);
  const splitInventoryItem = useStore((state) => state.splitInventoryItem);
  const characters = useStore((state) => state.characters);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const activeCharacter = characters.find((character) => character.id === activeCharacterId);

  const { label, inventoryItems = [], inventoryDefaultFields = [] } = widget.data;
  const isCompendium = widget.type === 'COMPENDIUM';
  const { title: defaultTitle, noun } = getInventoryWidgetTerms(widget.type);
  const timelineTitle = label || defaultTitle;
  const encumbrance = isCompendium ? undefined : widget.data.inventoryEncumbrance;
  const isPrintMode = mode === 'print';
  const canInteract = interactive && !isPrintMode;
  const controlsVisible = canInteract && showFieldControls && widget.data.showFieldControls !== false;
  const localLoad = useMemo(() => getInventoryLoad(inventoryItems), [inventoryItems]);
  const globalLoad = useMemo(() => getCharacterGlobalInventoryLoad(activeCharacter), [activeCharacter]);
  const [dialogItem, setDialogItem] = useState<InventoryItem | null | undefined>(undefined);
  const [quantityDialogItem, setQuantityDialogItem] = useState<InventoryItem | null>(null);
  const [weightOptionsOpen, setWeightOptionsOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(() => new Set());
  const [expandedDescriptionIds, setExpandedDescriptionIds] = useState<Set<string>>(() => new Set());
  const { startDrag, moveItemWithTimeline } = useInventoryItemDrag({ widget, items: inventoryItems, canInteract });

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

  useEffect(() => {
    if (!weightOptionsOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setWeightOptionsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [weightOptionsOpen]);

  const handleReorderKey = (index: number, event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'ArrowUp' && index > 0) {
      moveItemWithTimeline(widget.id, inventoryItems[index].id, index - 1);
    }
    if (event.key === 'ArrowDown' && index < inventoryItems.length - 1) {
      moveItemWithTimeline(widget.id, inventoryItems[index].id, index + 2);
    }
  };

  const deleteItem = (itemId: string) => {
    const removedItem = inventoryItems.find((item) => item.id === itemId);
    updateWidgetData(widget.id, { inventoryItems: inventoryItems.filter((item) => item.id !== itemId) });
    if (removedItem) addTimelineEvent(timelineTitle, widget.type, `Removed: ${removedItem.name}`, '➖');
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
    const removedNames = inventoryItems.filter((item) => selectedItemIds.has(item.id)).map((item) => item.name);
    updateWidgetData(widget.id, {
      inventoryItems: inventoryItems.filter((item) => !selectedItemIds.has(item.id)),
    });
    if (removedNames.length > 0) addTimelineEvent(timelineTitle, widget.type, `Removed: ${removedNames.join(', ')}`, '➖');
    closeRemoveDialog();
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

  return (
    <div className="flex h-full min-h-0 flex-col gap-1 overflow-hidden">
      <div className={`inventory-widget__header widget-structure-header flex min-h-6 flex-shrink-0 items-center gap-2 ${controlsVisible ? 'inventory-widget__header--edit' : ''}`}>
        <div className="widget-structure-title min-w-0 flex-1 truncate">{label || defaultTitle}</div>
        {controlsVisible && (
          <div className="widget-structure-controls ml-auto flex flex-shrink-0 items-center gap-1">
            <Tooltip content={inventoryItems.length > 0 ? `Choose ${noun === 'item' ? 'items' : 'entries'} to remove` : `No ${noun === 'item' ? 'items' : 'entries'} to remove`}>
              <button
                type="button"
                onClick={() => {
                  setSelectedItemIds(new Set());
                  setRemoveDialogOpen(true);
                }}
                onMouseDown={(event) => event.stopPropagation()}
                disabled={inventoryItems.length === 0}
                aria-label={`Choose ${noun === 'item' ? 'inventory items' : 'codex entries'} to remove`}
                className="widget-control widget-control--subtle flex h-6 w-6 items-center justify-center"
              >
                <MinusIcon className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
            <Tooltip content={`Add ${defaultTitle.toLowerCase()} ${noun}`}>
              <button
                type="button"
                onClick={() => setDialogItem(null)}
                onMouseDown={(event) => event.stopPropagation()}
                aria-label={`Add ${defaultTitle.toLowerCase()} ${noun}`}
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
          {renderLoadMeter({ value: localLoad, capacity: encumbrance.localCapacity, unit: encumbrance.unit || 'kg', label: 'Total weight' })}
          {encumbrance.showGlobalCounter && (
            renderLoadMeter({ value: globalLoad, capacity: encumbrance.globalCapacity, unit: encumbrance.unit || 'kg', label: 'Global weight' })
          )}
        </div>
      )}

      <div
        data-inventory-drop-zone="true"
        data-inventory-widget-id={widget.id}
        className="inventory-drop-zone flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-0.5"
        onWheel={(event) => {
          if (event.currentTarget.scrollHeight > event.currentTarget.clientHeight) event.stopPropagation();
        }}
      >
        {inventoryItems.length === 0 ? (
          <WidgetEmptyState
            title={canInteract ? `No ${noun === 'item' ? 'items' : 'entries'} yet` : `Empty ${defaultTitle.toLowerCase()}`}
            hint={controlsVisible ? `Add ${noun === 'item' ? 'an item' : 'an entry'} or drop one here.` : undefined}
            compact
          />
        ) : inventoryItems.map((item, index) => {
          const hasVisibleFields = item.fields.some((field) => !isInventoryFieldEmpty(field));
          const handleCellClass = hasVisibleFields ? 'col-start-1 row-start-1 row-span-2' : 'col-start-1 row-start-1';
          const hasDescription = Boolean(item.description?.trim());
          const descriptionExpanded = hasDescription && (isPrintMode || expandedDescriptionIds.has(item.id));
          const descriptionId = `inventory-description-${item.id}`;
          return (
          <article
            key={item.id}
            data-inventory-item-row="true"
            data-inventory-item-id={item.id}
            className="inventory-item group relative px-1.5 py-1.5 text-theme-ink"
          >
            <div className="grid min-w-0 grid-cols-[20px_minmax(0,1fr)_22px] items-center gap-1 gap-y-0">
              {canInteract && (
                <button
                  type="button"
                  data-touch-camera-ignore="true"
                  onPointerDown={(event) => startDrag(item, event)}
                  onKeyDown={(event) => handleReorderKey(index, event)}
                  onClick={(event) => event.stopPropagation()}
                  aria-label={`Move ${item.name}`}
                  title="Drag to move. Arrow keys reorder."
                  className={`inventory-item__drag-handle flex h-5 w-5 touch-none items-center self-center justify-center rounded text-theme-muted hover:text-theme-ink ${handleCellClass}`}
                >
                  <GripVerticalIcon className="h-3 w-3" />
                </button>
              )}
              {!canInteract && <span className={handleCellClass} />}
              <h3 className="col-start-2 row-start-1 -translate-y-px min-w-0 self-center break-words font-heading text-xs font-bold leading-3 [overflow-wrap:anywhere]">
                <InlineFormulaText text={item.name} />
                {!isCompendium && (
                  <>
                    {' '}
                    <InventoryQuantity
                      item={item}
                      canInteract={canInteract}
                      onEdit={setQuantityDialogItem}
                    />
                  </>
                )}
              </h3>
              <dl className={`col-span-2 col-start-2 row-start-2 flex min-w-0 flex-wrap items-start gap-x-2 gap-y-0.5 font-body ${hasVisibleFields ? '' : 'hidden'}`}>
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
              {hasDescription && (
                <div className="col-span-2 col-start-2 row-start-3 mt-0.5 min-w-0">
                  {!isPrintMode && (
                    <button
                      type="button"
                      aria-expanded={descriptionExpanded}
                      aria-controls={descriptionId}
                      data-touch-camera-ignore="true"
                      onClick={(event) => {
                        event.stopPropagation();
                        setExpandedDescriptionIds((current) => {
                          const next = new Set(current);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        });
                      }}
                      onMouseDown={(event) => event.stopPropagation()}
                      className="flex items-center gap-0.5 text-[9px] font-body leading-3 text-theme-muted hover:text-theme-accent"
                    >
                      <ChevronDownIcon className={`h-3 w-3 transition-transform ${descriptionExpanded ? '' : '-rotate-90'}`} />
                      Description
                    </button>
                  )}
                  {descriptionExpanded && (
                    <div id={descriptionId} className="notes-rich-text__content !min-h-0 !p-0 !pt-0.5 !text-[10px]">
                      <InlineDiceRichText html={item.description!} widget={widget} />
                    </div>
                  )}
                </div>
              )}
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
                    className="inventory-item__edit col-start-3 row-start-1 flex h-5 w-5 self-center items-center justify-center rounded text-theme-muted opacity-55 hover:bg-theme-accent hover:text-theme-paper group-hover:opacity-100"
                  >
                    <PencilIcon className="h-3 w-3" />
                  </button>
                </Tooltip>
              )}
              {!canInteract && <span className="col-start-3 row-start-1" />}
            </div>
          </article>
          );
        })}
      </div>

      {dialogItem !== undefined && canInteract && (
        <InventoryItemDialog
          key={dialogItem?.id || 'new-item'}
          item={dialogItem || undefined}
          noun={noun}
          allowQuantity={!isCompendium}
          defaultFields={inventoryDefaultFields}
          onClose={() => setDialogItem(undefined)}
          onSave={(item) => {
            const previousItem = inventoryItems.find((entry) => entry.id === item.id);
            saveInventoryItem({
              sourceWidgetId: widget.id,
              targetWidgetId: widget.id,
              item,
            });
            if (!previousItem) {
              const quantity = getInventoryItemQuantity(item);
              addTimelineEvent(timelineTitle, widget.type, `Added: ${item.name}${quantity !== undefined ? ` (x${quantity})` : ''}`, '➕');
              return;
            }
            const description = describeInventoryItemChange(previousItem, item);
            if (description) addTimelineEvent(timelineTitle, widget.type, description, '✏️');
          }}
          onDelete={dialogItem ? () => deleteItem(dialogItem.id) : undefined}
          onClone={dialogItem ? (item) => {
            const clone = duplicateInventoryItem(item);
            saveInventoryItem({
              sourceWidgetId: widget.id,
              targetWidgetId: widget.id,
              item: clone,
            });
            const quantity = getInventoryItemQuantity(clone);
            addTimelineEvent(timelineTitle, widget.type, `Added: ${clone.name}${quantity !== undefined ? ` (x${quantity})` : ''}`, '➕');
          } : undefined}
        />
      )}

      {quantityDialogItem && canInteract && (
        <InventoryQuantityDialog
          key={quantityDialogItem.id}
          heading={`${defaultTitle} quantity`}
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
              addTimelineEvent(timelineTitle, widget.type, `${quantityDialogItem.name}: ${previousQuantity} → ${quantity}`, '🎒');
            }
            setQuantityDialogItem(null);
          }}
          onSplit={(keptQuantity, splitQuantity) => {
            splitInventoryItem({
              widgetId: widget.id,
              itemId: quantityDialogItem.id,
              keptQuantity,
              splitQuantity,
            });
            addTimelineEvent(timelineTitle, widget.type, `Split ${quantityDialogItem.name}: ${keptQuantity} kept, ${splitQuantity} separated`, '🎒');
            setQuantityDialogItem(null);
          }}
        />
      )}

      {weightOptionsOpen && canInteract && !isCompendium && createPortal(
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
            aria-labelledby={`inventory-weight-options-title-${widget.id}`}
            className="flex max-h-[min(90vh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-theme border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink shadow-theme animate-modal-in"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-theme-border px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-theme-muted">Inventory</p>
                <h2 id={`inventory-weight-options-title-${widget.id}`} className="mt-0.5 font-heading text-lg font-bold">
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
              Remove {noun === 'item' ? 'items' : 'entries'}
            </h3>
            <p className="mt-3 text-sm text-theme-muted">Select one or more {noun === 'item' ? 'items' : 'entries'} to remove.</p>
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
                  <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]"><InlineFormulaText text={item.name} /></span>
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

export default memo(InventoryWidget);
