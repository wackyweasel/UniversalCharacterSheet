import { describe, expect, it } from 'vitest';
import type { InventorySlot } from '../types';
import { SNAP_GAP, snapInventorySlot } from './inventorySlotSnap';

const slot = (id: string, x: number, y: number, w: number, h: number): InventorySlot => ({ id, name: id, x, y, w, h });
const threshold = { x: 1, y: 1 };

describe('snapInventorySlot', () => {
  const neighbour = slot('a', 20, 20, 20, 20);

  it('keeps the standard gap to a neighbouring slot when moving next to it', () => {
    const { slot: result, guides } = snapInventorySlot({
      mode: 'move',
      proposed: slot('b', 40 + SNAP_GAP + 0.6, 20.3, 12, 20),
      others: [neighbour],
      threshold,
    });
    expect(result.x).toBe(40 + SNAP_GAP);
    expect(result.y).toBe(20);
    expect(guides.some((guide) => guide.axis === 'x' && guide.kind === 'gap' && guide.band)).toBe(true);
  });

  it('aligns centers with another slot', () => {
    const { slot: result } = snapInventorySlot({
      mode: 'move',
      proposed: slot('b', 18.4, 60, 24, 10),
      others: [neighbour],
      threshold,
    });
    // Center of b (x + 12) lines up with the center of a (30).
    expect(result.x).toBe(18);
  });

  it('snaps to the inset from the widget edge and the widget center', () => {
    const edge = snapInventorySlot({ mode: 'move', proposed: slot('b', 2.7, 2.4, 10, 10), others: [], threshold });
    expect(edge.slot.x).toBe(2);
    expect(edge.slot.y).toBe(2);

    const center = snapInventorySlot({ mode: 'move', proposed: slot('b', 39.4, 50, 20, 10), others: [], threshold });
    expect(center.slot.x).toBe(40);
  });

  it('snaps to the far widget edge', () => {
    const { slot: result } = snapInventorySlot({ mode: 'move', proposed: slot('b', 89.8, 60, 10, 10), others: [], threshold });
    expect(result.x).toBe(90);
  });

  it('rounds to a whole percent when nothing is close', () => {
    const { slot: result, guides } = snapInventorySlot({
      mode: 'move',
      proposed: slot('b', 63.6, 71.2, 10, 10),
      others: [neighbour],
      threshold: { x: 0.2, y: 0.2 },
    });
    expect(result.x).toBe(64);
    expect(result.y).toBe(71);
    expect(guides).toEqual([]);
  });

  it('never pushes a moved slot outside the widget', () => {
    const { slot: result } = snapInventorySlot({ mode: 'move', proposed: slot('b', -5, 120, 20, 20), others: [], threshold });
    expect(result.x).toBe(0);
    expect(result.y).toBe(80);
  });

  it('matches the size of another slot when resizing', () => {
    const { slot: result, guides } = snapInventorySlot({
      mode: 'resize',
      proposed: slot('b', 50, 50, 20.5, 19.6),
      others: [neighbour],
      threshold,
    });
    expect(result.w).toBe(20);
    expect(result.h).toBe(20);
    expect(result.x).toBe(50);
    expect(guides.length).toBeGreaterThan(0);
  });

  it('snaps the resized edge to the widget inset and keeps the slot inside the widget', () => {
    const snapped = snapInventorySlot({ mode: 'resize', proposed: slot('b', 60, 10, 37.5, 10), others: [], threshold });
    expect(snapped.slot.x + snapped.slot.w).toBe(98);

    const capped = snapInventorySlot({ mode: 'resize', proposed: slot('b', 60, 10, 80, 10), others: [], threshold });
    expect(capped.slot.x).toBe(60);
    expect(capped.slot.w).toBe(40);
  });
});
