import { v4 as uuidv4 } from 'uuid';
import type { InventoryItem, InventorySlot, WidgetData } from '../types';
import { getDefaultInventoryData } from './inventory';
import { WIDGET_GRID_SIZE } from './widgetGeometry';

export const INVENTORY_SLOTS_DEFAULT_SIZE = { width: 320, height: 300 };

/** The narrowest and shortest a slot can be, in percent of the widget area. */
export const MIN_SLOT_SIZE = 6;

type SlotLayout = Omit<InventorySlot, 'id'>[];

// Hands on the sides, head to torso in the middle, small gear along the bottom.
const DETAILED_SLOT_LAYOUT: SlotLayout = [
  { name: 'Head', x: 34, y: 2, w: 32, h: 19 },
  { name: 'Torso', x: 27, y: 43, w: 46, h: 30 },
  { name: 'Left hand', x: 2, y: 2, w: 23, h: 71 },
  { name: 'Right hand', x: 75, y: 2, w: 23, h: 71 },
  { name: 'Belt', x: 27, y: 77, w: 21, h: 21 },
  { name: 'Shoulders', x: 27, y: 24, w: 21, h: 16 },
  { name: 'Rings', x: 2, y: 77, w: 23, h: 21 },
  { name: 'Amulet', x: 52, y: 24, w: 21, h: 16 },
  { name: 'Boots', x: 75, y: 77, w: 23, h: 21 },
  { name: 'Pants', x: 52, y: 77, w: 21, h: 21 },
];

export interface InventorySlotPreset {
  id: string;
  name: string;
  description: string;
  layout: SlotLayout;
}

// Every preset keeps the same 2% outer margin and 2% gutter the snapping uses.
export const INVENTORY_SLOT_PRESETS: InventorySlotPreset[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Two hands and one armor slot.',
    layout: [
      { name: 'Main hand', x: 2, y: 2, w: 47, h: 46 },
      { name: 'Off hand', x: 51, y: 2, w: 47, h: 46 },
      { name: 'Armor', x: 2, y: 50, w: 96, h: 48 },
    ],
  },
  {
    id: 'basic',
    name: 'Basic',
    description: 'Hands on the sides, head, body and boots in the middle.',
    layout: [
      { name: 'Main hand', x: 2, y: 2, w: 31, h: 96 },
      { name: 'Head', x: 35, y: 2, w: 30, h: 26 },
      { name: 'Body', x: 35, y: 30, w: 30, h: 40 },
      { name: 'Boots', x: 35, y: 72, w: 30, h: 26 },
      { name: 'Off hand', x: 67, y: 2, w: 31, h: 96 },
    ],
  },
  {
    id: 'adventurer',
    name: 'Adventurer',
    description: 'Armor from head to boots, two hands, a ring and an amulet.',
    layout: [
      { name: 'Head', x: 28, y: 2, w: 44, h: 18 },
      { name: 'Torso', x: 28, y: 22, w: 44, h: 28 },
      { name: 'Legs', x: 28, y: 52, w: 44, h: 26 },
      { name: 'Boots', x: 28, y: 80, w: 44, h: 18 },
      { name: 'Main hand', x: 2, y: 2, w: 24, h: 62 },
      { name: 'Ring', x: 2, y: 66, w: 24, h: 32 },
      { name: 'Off hand', x: 74, y: 2, w: 24, h: 62 },
      { name: 'Amulet', x: 74, y: 66, w: 24, h: 32 },
    ],
  },
  {
    id: 'detailed',
    name: 'Detailed',
    description: 'Ten slots, with shoulders, belt, pants, rings and an amulet.',
    layout: DETAILED_SLOT_LAYOUT,
  },
  {
    id: 'full-gear',
    name: 'Full gear',
    description: 'Fifteen slots on a grid, for systems that track every piece of equipment.',
    layout: [
      { name: 'Main hand', x: 2, y: 2, w: 22, h: 37.2 },
      { name: 'Hands', x: 2, y: 41.2, w: 22, h: 17.6 },
      { name: 'Wrists', x: 2, y: 60.8, w: 22, h: 17.6 },
      { name: 'Ring 1', x: 2, y: 80.4, w: 22, h: 17.6 },
      { name: 'Head', x: 26, y: 2, w: 48, h: 17.6 },
      { name: 'Neck', x: 26, y: 21.6, w: 23, h: 17.6 },
      { name: 'Shoulders', x: 51, y: 21.6, w: 23, h: 17.6 },
      { name: 'Chest', x: 26, y: 41.2, w: 48, h: 17.6 },
      { name: 'Belt', x: 26, y: 60.8, w: 48, h: 17.6 },
      { name: 'Legs', x: 26, y: 80.4, w: 23, h: 17.6 },
      { name: 'Boots', x: 51, y: 80.4, w: 23, h: 17.6 },
      { name: 'Off hand', x: 76, y: 2, w: 22, h: 37.2 },
      { name: 'Back', x: 76, y: 41.2, w: 22, h: 17.6 },
      { name: 'Trinket', x: 76, y: 60.8, w: 22, h: 17.6 },
      { name: 'Ring 2', x: 76, y: 80.4, w: 22, h: 17.6 },
    ],
  },
];

const NEW_WIDGET_PRESET_ID = 'basic';

export function createDefaultInventorySlots(): InventorySlot[] {
  const preset = INVENTORY_SLOT_PRESETS.find((candidate) => candidate.id === NEW_WIDGET_PRESET_ID) ?? INVENTORY_SLOT_PRESETS[0];
  return preset.layout.map((slot) => ({ ...slot, id: uuidv4() }));
}

/**
 * Replaces the slot layout with a preset. Slots keep the capacity of the slot with the same name.
 * Items follow the slot with the same name, otherwise they move to the next slot with room.
 * Items that no longer fit are dropped and counted.
 */
export function applyInventorySlotPreset(
  preset: InventorySlotPreset,
  currentSlots: InventorySlot[],
  items: InventoryItem[],
): { slots: InventorySlot[]; items: InventoryItem[]; removedCount: number } {
  const normalize = (name: string) => name.trim().toLowerCase();
  const oldSlotByName = new Map(currentSlots.map((slot) => [normalize(slot.name), slot]));
  const slots = preset.layout.map((layoutSlot): InventorySlot => {
    const previous = oldSlotByName.get(normalize(layoutSlot.name));
    const capacity: Partial<InventorySlot> = {};
    if (previous?.maxItems !== undefined) capacity.maxItems = previous.maxItems;
    if (previous?.maxItemsLabel) capacity.maxItemsLabel = previous.maxItemsLabel;
    if (previous?.maxItemsFormula) capacity.maxItemsFormula = previous.maxItemsFormula;
    return { ...layoutSlot, ...capacity, id: uuidv4() };
  });
  const slotByName = new Map(slots.map((slot) => [normalize(slot.name), slot]));
  const oldName = (slotId?: string) => currentSlots.find((slot) => slot.id === slotId)?.name;

  const counts = new Map<string, number>();
  const placed = new Map<string, string>();
  const hasRoom = (slot: InventorySlot) => (counts.get(slot.id) ?? 0) < getSlotMaxItems(slot);
  const assign = (item: InventoryItem, slot: InventorySlot) => {
    counts.set(slot.id, (counts.get(slot.id) ?? 0) + 1);
    placed.set(item.id, slot.id);
  };

  const equipped = items.filter((item) => item.slotId);
  equipped.forEach((item) => {
    const match = slotByName.get(normalize(oldName(item.slotId) ?? ''));
    if (match && hasRoom(match)) assign(item, match);
  });
  equipped.forEach((item) => {
    if (placed.has(item.id)) return;
    const free = slots.find((slot) => !counts.get(slot.id)) ?? slots.find(hasRoom);
    if (free) assign(item, free);
  });

  const unslotted = items.filter((item) => !item.slotId);
  const kept = equipped.filter((item) => placed.has(item.id)).map((item) => ({ ...item, slotId: placed.get(item.id) }));
  return { slots, items: [...unslotted, ...kept], removedCount: equipped.length - kept.length };
}

export function getDefaultInventorySlotsData(): Pick<
  WidgetData,
  'inventoryItems' | 'inventorySlots' | 'inventoryDefaultFields' | 'inventoryEncumbrance'
> {
  return { ...getDefaultInventoryData(), inventorySlots: createDefaultInventorySlots() };
}

/** How far below the widget a slot may be dragged while editing, in percent of the current height. */
export const MAX_SLOT_EXTENT = 300;

/**
 * Keeps a slot's rectangle inside the widget area and above the minimum size. `maxBottom` lets a slot
 * go past the bottom edge while it is being dragged, before the widget grows to hold it.
 */
export function clampInventorySlot(slot: InventorySlot, maxBottom = 100): InventorySlot {
  const finite = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);
  const w = Math.min(100, Math.max(MIN_SLOT_SIZE, finite(slot.w, MIN_SLOT_SIZE)));
  const h = Math.min(maxBottom, Math.max(MIN_SLOT_SIZE, finite(slot.h, MIN_SLOT_SIZE)));
  const x = Math.min(100 - w, Math.max(0, finite(slot.x, 0)));
  const y = Math.min(maxBottom - h, Math.max(0, finite(slot.y, 0)));
  return { ...slot, x, y, w, h };
}

const FIT_BOTTOM_MARGIN_PX = 6;
const FIT_MIN_HEIGHT_PX = 60;
const roundSlotValue = (value: number) => Math.round(value * 100) / 100;

/**
 * Resizes the widget height to match the lowest slot: it shrinks so no empty space is left under it,
 * and grows when a slot was dragged past the bottom edge. Slots are stored in percent, so their
 * vertical values are rescaled to keep every slot the same size in pixels.
 * Returns null when the height is already right.
 */
export function fitInventorySlotsHeight(
  slots: InventorySlot[],
  widgetHeight: number,
  widgetWidth: number,
): { slots: InventorySlot[]; height: number } | null {
  if (slots.length === 0 || !(widgetHeight > 0)) return null;
  const bottomPx = Math.max(...slots.map((slot) => ((slot.y + slot.h) / 100) * widgetHeight));
  const margin = Math.min(FIT_BOTTOM_MARGIN_PX, Math.max(2, widgetWidth * 0.02));
  const target = Math.max(FIT_MIN_HEIGHT_PX, Math.ceil((bottomPx + margin) / WIDGET_GRID_SIZE) * WIDGET_GRID_SIZE);
  const overflows = bottomPx > widgetHeight + 0.01;
  if (target === widgetHeight || (target > widgetHeight && !overflows)) return null;
  const scale = widgetHeight / target;
  return {
    height: target,
    slots: slots.map((slot) =>
      clampInventorySlot({ ...slot, y: roundSlotValue(slot.y * scale), h: roundSlotValue(slot.h * scale) }),
    ),
  };
}

/** A new slot placed in the top left, offset so repeated additions do not stack exactly. */
export function createInventorySlot(name: string, existingSlots: InventorySlot[]): InventorySlot {
  const offset = (existingSlots.length % 6) * 4;
  return clampInventorySlot({ id: uuidv4(), name, x: 4 + offset, y: 4 + offset, w: 24, h: 20 });
}

export const DEFAULT_SLOT_MAX_ITEMS = 1;

/** How many items a slot holds. Anything unusable falls back to the default. */
export function getSlotMaxItems(slot: Pick<InventorySlot, 'maxItems'> | undefined): number {
  const value = slot?.maxItems;
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(1, Math.floor(value)) : DEFAULT_SLOT_MAX_ITEMS;
}

export function getSlotItems(items: InventoryItem[], slotId: string): InventoryItem[] {
  return items.filter((item) => item.slotId === slotId);
}

export function isSlotOverCapacity(slot: InventorySlot, items: InventoryItem[]): boolean {
  return getSlotItems(items, slot.id).length > getSlotMaxItems(slot);
}

/** The first slot with room, preferring slots that are still empty. */
export function getFirstFreeSlot(slots: InventorySlot[], items: InventoryItem[]): InventorySlot | undefined {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    if (item.slotId) counts.set(item.slotId, (counts.get(item.slotId) ?? 0) + 1);
  });
  return slots.find((slot) => !counts.get(slot.id))
    ?? slots.find((slot) => (counts.get(slot.id) ?? 0) < getSlotMaxItems(slot));
}
