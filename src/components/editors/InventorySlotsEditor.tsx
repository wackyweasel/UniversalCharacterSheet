import { useRef, useState } from 'react';
import { InventorySlot } from '../../types';
import {
  applyInventorySlotPreset,
  clampInventorySlot,
  createInventorySlot,
  fitInventorySlotsHeight,
  getSlotMaxItems,
  INVENTORY_SLOT_PRESETS,
  InventorySlotPreset,
} from '../../utils/inventorySlots';
import { SNAP_DISTANCE_PX, SnapGuide, snapInventorySlot } from '../../utils/inventorySlotSnap';
import { PlusIcon, TrashIcon } from '../icons';
import { CollapsibleSection } from './CollapsibleSection';
import { InventoryEditor } from './InventoryEditor';
import { LabeledNumberField } from './LabeledNumberField';
import { EditorProps } from './types';

const inputClass = 'h-8 w-full rounded-button border border-theme-border bg-theme-paper px-2 text-xs text-theme-ink focus:border-theme-accent focus:outline-none';
const dangerButtonClass = 'min-h-8 rounded-button border border-red-700 bg-red-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-700';

const roundToTenth = (value: number) => Math.round(value * 10) / 10;
const formatPercent = (value: number) => `${roundToTenth(value)}%`;

interface ActiveGesture {
  pointerId: number;
  slotId: string;
  kind: 'move' | 'resize';
  startX: number;
  startY: number;
  origin: InventorySlot;
}

export function InventorySlotsEditor(props: EditorProps) {
  const { widget, updateData, updateHeight } = props;
  const { inventorySlots = [], inventoryItems = [] } = widget.data;
  const canvasRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<ActiveGesture | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftSlots, setDraftSlots] = useState<InventorySlot[] | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [pendingPreset, setPendingPreset] = useState<InventorySlotPreset | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const [activeGesture, setActiveGesture] = useState<{ slotId: string; kind: ActiveGesture['kind'] } | null>(null);

  const slots = draftSlots ?? inventorySlots;
  const selected = slots.find((slot) => slot.id === selectedId) ?? null;
  const aspectRatio = `${Math.max(1, widget.w ?? 1)} / ${Math.max(1, widget.h ?? 1)}`;

  const commitSlots = (next: InventorySlot[], extra: Record<string, unknown> = {}) => {
    const fitted = updateHeight ? fitInventorySlotsHeight(next, widget.h ?? 0, widget.w ?? 0) : null;
    updateData({ ...extra, inventorySlots: fitted ? fitted.slots : next });
    if (fitted) updateHeight?.(fitted.height);
  };

  const updateSlot = (slotId: string, update: Partial<InventorySlot>) => {
    commitSlots(inventorySlots.map((slot) => (slot.id === slotId ? clampInventorySlot({ ...slot, ...update }) : slot)));
  };

  const addSlot = () => {
    const slot = createInventorySlot('New slot', inventorySlots);
    commitSlots([...inventorySlots, slot]);
    setSelectedId(slot.id);
  };

  const deleteSlot = (slotId: string) => {
    commitSlots(
      inventorySlots.filter((slot) => slot.id !== slotId),
      { inventoryItems: inventoryItems.filter((item) => item.slotId !== slotId) },
    );
    setSelectedId(null);
    setConfirmDeleteId(null);
  };

  const presetOutcome = pendingPreset ? applyInventorySlotPreset(pendingPreset, inventorySlots, inventoryItems) : null;

  const applyPreset = () => {
    if (!presetOutcome) return;
    commitSlots(presetOutcome.slots, { inventoryItems: presetOutcome.items });
    setSelectedId(null);
    setConfirmDeleteId(null);
    setPendingPreset(null);
  };

  const startGesture = (slot: InventorySlot, kind: ActiveGesture['kind'], event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = {
      pointerId: event.pointerId,
      slotId: slot.id,
      kind,
      startX: event.clientX,
      startY: event.clientY,
      origin: slot,
    };
    setSelectedId(slot.id);
    setConfirmDeleteId(null);
  };

  const moveGesture = (event: React.PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    const canvas = canvasRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dx = ((event.clientX - gesture.startX) / rect.width) * 100;
    const dy = ((event.clientY - gesture.startY) / rect.height) * 100;
    const { origin } = gesture;
    const proposed = gesture.kind === 'move'
      ? { ...origin, x: origin.x + dx, y: origin.y + dy }
      : { ...origin, w: origin.w + dx, h: origin.h + dy };

    // Alt temporarily turns snapping off, for placing a slot exactly where the pointer is.
    const snapping = snapEnabled && !event.altKey;
    let result: InventorySlot;
    let nextGuides: SnapGuide[] = [];
    if (snapping) {
      const snapped = snapInventorySlot({
        mode: gesture.kind,
        proposed,
        others: inventorySlots.filter((slot) => slot.id !== gesture.slotId),
        threshold: {
          x: (SNAP_DISTANCE_PX / rect.width) * 100,
          y: (SNAP_DISTANCE_PX / rect.height) * 100,
        },
      });
      result = snapped.slot;
      nextGuides = snapped.guides;
    } else {
      result = clampInventorySlot({
        ...proposed,
        x: roundToTenth(proposed.x),
        y: roundToTenth(proposed.y),
        w: roundToTenth(proposed.w),
        h: roundToTenth(proposed.h),
      });
    }
    setGuides(nextGuides);
    setActiveGesture({ slotId: gesture.slotId, kind: gesture.kind });
    setDraftSlots(inventorySlots.map((slot) => (slot.id === gesture.slotId ? result : slot)));
  };

  const endGesture = (event: React.PointerEvent<HTMLElement>, commit: boolean) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    if (commit && draftSlots) commitSlots(draftSlots);
    setDraftSlots(null);
    setGuides([]);
    setActiveGesture(null);
  };

  const handleSlotKey = (slot: InventorySlot, event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      setConfirmDeleteId(slot.id);
      return;
    }
    if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault();
      setRenamingId(slot.id);
      return;
    }
    const step = event.altKey ? 0.5 : 2;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = delta[event.key];
    if (!move) return;
    event.preventDefault();
    if (event.shiftKey) updateSlot(slot.id, { w: slot.w + move[0], h: slot.h + move[1] });
    else updateSlot(slot.id, { x: slot.x + move[0], y: slot.y + move[1] });
  };

  const selectedHasItem = selected ? inventoryItems.some((item) => item.slotId === selected.id) : false;

  return (
    <div className="widget-editor widget-editor--inventory-slots space-y-4">
      <CollapsibleSection>
        <div className="widget-editor__section-heading">
          <div>
            <h3 className="widget-editor__section-title">Slots</h3>
            <p className="mt-0.5 text-[11px] leading-4 text-theme-muted">
              Drag a slot to move it, drag its dotted corner to resize it. Arrow keys move, Shift + arrows resize.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="widget-editor__section-count">{slots.length}</span>
            <button type="button" onClick={addSlot} className="widget-control flex h-10 items-center gap-1 whitespace-nowrap px-2 py-1 text-[11px]">
              <PlusIcon className="h-3.5 w-3.5" />
              Add slot
            </button>
          </div>
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <button
            type="button"
            aria-pressed={snapEnabled}
            title="Snap to edges, centers and neighbors while dragging"
            onClick={() => setSnapEnabled((value) => !value)}
            className={`widget-control flex h-8 shrink-0 items-center whitespace-nowrap px-2 text-[11px] ${snapEnabled ? 'widget-control--primary' : ''}`}
          >
            Snap: {snapEnabled ? 'on' : 'off'}
          </button>
          <p className="text-right text-[11px] leading-4 text-theme-muted">
            {snapEnabled ? 'Hold Alt to place freely.' : 'Snapping is off.'}
          </p>
        </div>

        <div
          ref={canvasRef}
          className="relative mt-1.5 w-full select-none overflow-hidden rounded-theme border border-dashed border-theme-border bg-theme-background/40"
          style={{ aspectRatio }}
          onPointerDown={() => setSelectedId(null)}
        >
          {slots.map((slot) => {
            const isSelected = slot.id === selectedId;
            return (
              <div
                key={slot.id}
                role="button"
                tabIndex={0}
                aria-label={`${slot.name || 'Slot'} slot`}
                onPointerDown={(event) => startGesture(slot, 'move', event)}
                onPointerMove={moveGesture}
                onPointerUp={(event) => endGesture(event, true)}
                onPointerCancel={(event) => endGesture(event, false)}
                onKeyDown={(event) => handleSlotKey(slot, event)}
                onDoubleClick={() => setRenamingId(slot.id)}
                onFocus={() => setSelectedId(slot.id)}
                className={`absolute flex cursor-move touch-none items-center justify-center overflow-hidden rounded-button border text-center text-[10px] font-bold uppercase tracking-wider focus:outline-none ${
                  isSelected
                    ? 'z-10 border-theme-accent bg-theme-accent/20 text-theme-ink'
                    : 'border-theme-border bg-theme-paper text-theme-muted'
                }`}
                style={{ left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.w}%`, height: `${slot.h}%` }}
              >
                <span className="pointer-events-none min-w-0 truncate px-1">{slot.name || 'Slot'}</span>
                {activeGesture?.slotId === slot.id && (
                  <span className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap rounded-button bg-theme-ink px-1 py-0.5 text-[9px] font-semibold normal-case tabular-nums tracking-normal text-theme-paper">
                    {activeGesture.kind === 'move'
                      ? `${formatPercent(slot.x)} · ${formatPercent(slot.y)}`
                      : `${formatPercent(slot.w)} × ${formatPercent(slot.h)}`}
                  </span>
                )}
                <span
                  aria-hidden="true"
                  onPointerDown={(event) => startGesture(slot, 'resize', event)}
                  onPointerMove={moveGesture}
                  onPointerUp={(event) => endGesture(event, true)}
                  onPointerCancel={(event) => endGesture(event, false)}
                  className={`absolute bottom-0 right-0 flex h-5 w-5 cursor-nwse-resize touch-none items-end justify-end p-[3px] ${
                    isSelected ? 'text-theme-accent' : 'text-theme-muted'
                  }`}
                >
                  <svg viewBox="0 0 10 10" className="pointer-events-none h-2.5 w-2.5" fill="currentColor">
                    <circle cx="8.5" cy="8.5" r="1" />
                    <circle cx="8.5" cy="4.8" r="1" />
                    <circle cx="4.8" cy="8.5" r="1" />
                    <circle cx="8.5" cy="1.1" r="1" />
                    <circle cx="4.8" cy="4.8" r="1" />
                    <circle cx="1.1" cy="8.5" r="1" />
                  </svg>
                </span>
              </div>
            );
          })}
          {guides.map((guide, index) => {
            const vertical = guide.axis === 'x';
            const span = Math.max(0, guide.to - guide.from);
            const lineStyle: React.CSSProperties = vertical
              ? { left: `${guide.position}%`, top: `${guide.from}%`, height: `${span}%`, width: 0 }
              : { top: `${guide.position}%`, left: `${guide.from}%`, width: `${span}%`, height: 0 };
            const lineClass = guide.kind === 'size'
              ? 'border-dotted'
              : guide.kind === 'center'
                ? 'border-dashed'
                : 'border-solid';
            return (
              <div key={`guide-${index}`} className="pointer-events-none absolute inset-0 z-20" aria-hidden="true" data-snap-guide={guide.kind}>
                {guide.band && (
                  <div
                    className="pointer-events-none absolute bg-theme-accent/25"
                    style={vertical
                      ? { left: `${guide.band[0]}%`, width: `${guide.band[1] - guide.band[0]}%`, top: `${guide.from}%`, height: `${span}%` }
                      : { top: `${guide.band[0]}%`, height: `${guide.band[1] - guide.band[0]}%`, left: `${guide.from}%`, width: `${span}%` }}
                  />
                )}
                <div
                  className={`pointer-events-none absolute ${vertical ? 'border-l' : 'border-t'} border-theme-accent ${lineClass}`}
                  style={lineStyle}
                />
              </div>
            );
          })}
          {selected && !activeGesture && (
            <div
              onPointerDown={(event) => event.stopPropagation()}
              className="absolute z-30 flex max-w-full items-center gap-1 rounded-theme border border-theme-accent bg-theme-paper p-1 shadow-lg"
              style={{
                ...(selected.x > 50 ? { right: `${100 - selected.x - selected.w}%` } : { left: `${selected.x}%` }),
                ...(selected.y >= 12
                  ? { top: `${selected.y}%`, transform: 'translateY(calc(-100% - 4px))' }
                  : { top: `${selected.y + selected.h <= 88 ? selected.y + selected.h : selected.y}%`, marginTop: 4 }),
              }}
            >
              {confirmDeleteId === selected.id ? (
                <>
                  <span className="px-1 text-[11px] text-theme-muted">
                    {selectedHasItem ? 'Delete slot and its item?' : 'Delete slot?'}
                  </span>
                  <button type="button" onClick={() => setConfirmDeleteId(null)} className="widget-control px-2 py-1 text-[11px]">Cancel</button>
                  <button type="button" onClick={() => deleteSlot(selected.id)} className={dangerButtonClass}>Delete</button>
                </>
              ) : (
                <>
                  {renamingId === selected.id ? (
                    <input
                      autoFocus
                      value={selected.name}
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) => updateSlot(selected.id, { name: event.target.value })}
                      onBlur={() => setRenamingId(null)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === 'Escape') event.currentTarget.blur();
                      }}
                      aria-label="Slot name"
                      placeholder="Slot name"
                      className={`${inputClass} w-36`}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRenamingId(selected.id)}
                      title="Click to rename"
                      aria-label={`Rename ${selected.name || 'slot'}`}
                      className="widget-control h-8 max-w-[9rem] truncate px-2 text-[11px] font-semibold"
                    >
                      {selected.name || 'Slot'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(selected.id)}
                    aria-label="Delete slot"
                    title="Delete slot"
                    className="widget-control flex h-8 w-8 shrink-0 items-center justify-center text-red-500"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <p className="mt-1.5 text-[11px] leading-4 text-theme-muted">
          Select a slot, then click its name to rename it or use the trash icon to delete it.
        </p>

        {selected && (
          <div className="mt-2 rounded-theme border border-theme-border p-2">
            <span className="mb-0.5 block text-[11px] font-medium text-theme-ink">
              Items held by {selected.name || 'this slot'}
            </span>
            <LabeledNumberField
              value={getSlotMaxItems(selected)}
              onChange={(value) => updateSlot(selected.id, { maxItems: Math.max(1, Math.floor(value)) })}
              fieldLabel={selected.maxItemsLabel}
              onFieldLabelChange={(maxItemsLabel) => updateSlot(selected.id, { maxItemsLabel })}
              formula={selected.maxItemsFormula}
              onFormulaChange={(maxItemsFormula) => updateSlot(selected.id, { maxItemsFormula })}
              readOnlyValue={Boolean(selected.maxItemsFormula)}
              min={1}
              step={1}
              allowEmpty
              controlHeight="input"
              hideStepperButtons
            />
            <p className="mt-1 text-[11px] leading-4 text-theme-muted">
              The most items this slot is meant to hold. Slots holding more than this are tinted red.
            </p>
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection>
        <div className="widget-editor__section-heading">
          <h3 className="widget-editor__section-title">Item cards</h3>
        </div>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={Boolean(widget.data.inventorySlotsCollapseAttributes)}
            onChange={(event) => updateData({ inventorySlotsCollapseAttributes: event.target.checked })}
            className="mt-0.5 h-4 w-4 flex-shrink-0 accent-theme-accent"
          />
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-theme-ink">Collapse attributes</span>
            <span className="mt-0.5 block text-[11px] leading-4 text-theme-muted">
              Show only the item name. Click the name to see its attributes.
            </span>
          </span>
        </label>
      </CollapsibleSection>

      <CollapsibleSection>
        <div className="widget-editor__section-heading">
          <div>
            <h3 className="widget-editor__section-title">Presets</h3>
            <p className="mt-0.5 text-[11px] leading-4 text-theme-muted">
              Start from a ready-made layout, from simple to complex. Equipped items move to the matching slot.
            </p>
          </div>
        </div>

        <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {INVENTORY_SLOT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              aria-label={`Apply ${preset.name} preset`}
              aria-pressed={pendingPreset?.id === preset.id}
              onClick={() => setPendingPreset(preset)}
              className={`widget-control flex flex-col gap-1.5 p-2 text-left ${pendingPreset?.id === preset.id ? 'border-theme-accent bg-theme-accent/15' : ''}`}
            >
              <span className="relative block aspect-square w-full rounded-button border border-theme-border bg-theme-background/40">
                {preset.layout.map((slot) => (
                  <span
                    key={slot.name}
                    className="absolute rounded-[2px] border border-theme-accent/70 bg-theme-accent/15"
                    style={{ left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.w}%`, height: `${slot.h}%` }}
                  />
                ))}
              </span>
              <span className="block min-w-0">
                <span className="block truncate text-xs font-semibold">{preset.name}</span>
                <span className="block text-[10px] opacity-70">{preset.layout.length} slots</span>
              </span>
            </button>
          ))}
        </div>

        {pendingPreset && presetOutcome && (
          <div className="mt-2 flex flex-wrap items-center justify-end gap-2 rounded-theme border border-theme-border p-2">
            <span className="min-w-0 flex-1 text-[11px] text-theme-muted">
              {pendingPreset.description} This replaces your current layout.
              {presetOutcome.removedCount > 0 && ` ${presetOutcome.removedCount} item${presetOutcome.removedCount === 1 ? '' : 's'} will be removed.`}
            </span>
            <button type="button" onClick={() => setPendingPreset(null)} className="widget-control px-2 py-1 text-[11px]">Cancel</button>
            <button
              type="button"
              onClick={applyPreset}
              className={presetOutcome.removedCount > 0 ? dangerButtonClass : 'widget-control widget-control--primary px-2 py-1 text-[11px]'}
            >
              Apply {pendingPreset.name}
            </button>
          </div>
        )}
      </CollapsibleSection>

      <InventoryEditor {...props} />
    </div>
  );
}
