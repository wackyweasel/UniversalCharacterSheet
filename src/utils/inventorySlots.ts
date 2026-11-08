import { v4 as uuidv4 } from 'uuid';
import type { InventoryItem, InventorySlot, WidgetData } from '../types';
import { getDefaultInventoryData } from './inventory';

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
 * Replaces the slot layout with a preset. Items follow the slot with the same name, otherwise they
 * move to the next free slot. Items that no longer fit are dropped and counted.
 */
export function applyInventorySlotPreset(
  preset: InventorySlotPreset,
  currentSlots: InventorySlot[],
  items: InventoryItem[],
): { slots: InventorySlot[]; items: InventoryItem[]; removedCount: number } {
  const slots = preset.layout.map((slot) => ({ ...slot, id: uuidv4() }));
  const slotByName = new Map(slots.map((slot) => [slot.name.toLowerCase(), slot.id]));
  const oldName = (slotId?: string) => currentSlots.find((slot) => slot.id === slotId)?.name.trim().toLowerCase();

  const taken = new Set<string>();
  const placed = new Map<string, string>();
  const assign = (item: InventoryItem, slotId: string) => {
    taken.add(slotId);
    placed.set(item.id, slotId);
  };

  const equipped = items.filter((item) => item.slotId);
  equipped.forEach((item) => {
    const match = slotByName.get(oldName(item.slotId) ?? '');
    if (match && !taken.has(match)) assign(item, match);
  });
  equipped.forEach((item) => {
    if (placed.has(item.id)) return;
    const free = slots.find((slot) => !taken.has(slot.id));
    if (free) assign(item, free.id);
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

/** Keeps a slot's rectangle inside the widget area and above the minimum size. */
export function clampInventorySlot(slot: InventorySlot): InventorySlot {
  const finite = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);
  const w = Math.min(100, Math.max(MIN_SLOT_SIZE, finite(slot.w, MIN_SLOT_SIZE)));
  const h = Math.min(100, Math.max(MIN_SLOT_SIZE, finite(slot.h, MIN_SLOT_SIZE)));
  const x = Math.min(100 - w, Math.max(0, finite(slot.x, 0)));
  const y = Math.min(100 - h, Math.max(0, finite(slot.y, 0)));
  return { ...slot, x, y, w, h };
}

/** A new slot placed in the top left, offset so repeated additions do not stack exactly. */
export function createInventorySlot(name: string, existingSlots: InventorySlot[]): InventorySlot {
  const offset = (existingSlots.length % 6) * 4;
  return clampInventorySlot({ id: uuidv4(), name, x: 4 + offset, y: 4 + offset, w: 24, h: 20 });
}

export function getSlotItem(items: InventoryItem[], slotId: string): InventoryItem | undefined {
  return items.find((item) => item.slotId === slotId);
}

export function getFirstFreeSlot(slots: InventorySlot[], items: InventoryItem[]): InventorySlot | undefined {
  const taken = new Set(items.map((item) => item.slotId));
  return slots.find((slot) => !taken.has(slot.id));
}
