import type { InventorySlot } from '../types';
import { clampInventorySlot, MIN_SLOT_SIZE } from './inventorySlots';

/** Spacing kept between neighbouring slots, and between slots and the widget edge. Matches the preset layouts. */
export const SNAP_GAP = 2;
export const SNAP_INSET = 2;
/** How close, in screen pixels, a slot has to get to a guide before it is pulled onto it. */
export const SNAP_DISTANCE_PX = 7;

export type SnapKind = 'edge' | 'center' | 'gap' | 'size';
type Axis = 'x' | 'y';
type Feature = 'start' | 'center' | 'end';
type Geometry = Pick<InventorySlot, 'x' | 'y' | 'w' | 'h'>;

/**
 * A guide to draw while snapped. `axis: 'x'` is a vertical line at x = `position` that spans y from `from` to `to`.
 * Gap guides also carry the band between the two slots that the spacing is measured across.
 */
export interface SnapGuide {
  axis: Axis;
  position: number;
  from: number;
  to: number;
  kind: SnapKind;
  band?: [number, number];
}

interface Target {
  value: number;
  kind: SnapKind;
  features: Feature[];
  /** Extent of the slot that produced the target on the other axis. Null for the widget edges. */
  span: [number, number] | null;
  band?: [number, number];
}

const EPS = 0.01;
const KIND_PRIORITY: Record<SnapKind, number> = { edge: 0, center: 0, gap: 1, size: 2 };

const startOf = (g: Geometry, axis: Axis) => (axis === 'x' ? g.x : g.y);
const lengthOf = (g: Geometry, axis: Axis) => (axis === 'x' ? g.w : g.h);
const round2 = (value: number) => Math.round(value * 100) / 100;

function subjectFeatures(subject: Geometry, axis: Axis, resizing: boolean): { feature: Feature; position: number }[] {
  const start = startOf(subject, axis);
  const length = lengthOf(subject, axis);
  if (resizing) return [{ feature: 'end', position: start + length }];
  return [
    { feature: 'start', position: start },
    { feature: 'center', position: start + length / 2 },
    { feature: 'end', position: start + length },
  ];
}

function buildTargets(axis: Axis, subject: Geometry, others: Geometry[], resizing: boolean): Target[] {
  const cross: Axis = axis === 'x' ? 'y' : 'x';
  const subjectStart = startOf(subject, axis);
  const crossStart = startOf(subject, cross);
  const crossEnd = crossStart + lengthOf(subject, cross);

  const targets: Target[] = [
    { value: 0, kind: 'edge', features: ['start'], span: null },
    { value: SNAP_INSET, kind: 'edge', features: ['start'], span: null },
    { value: 50, kind: 'center', features: ['center'], span: null },
    { value: 100 - SNAP_INSET, kind: 'edge', features: ['end'], span: null },
    { value: 100, kind: 'edge', features: ['end'], span: null },
  ];

  for (const other of others) {
    const otherStart = startOf(other, axis);
    const otherEnd = otherStart + lengthOf(other, axis);
    const span: [number, number] = [startOf(other, cross), startOf(other, cross) + lengthOf(other, cross)];
    const all: Feature[] = resizing ? ['end'] : ['start', 'center', 'end'];

    targets.push(
      { value: otherStart, kind: 'edge', features: all, span },
      { value: (otherStart + otherEnd) / 2, kind: 'center', features: all, span },
      { value: otherEnd, kind: 'edge', features: all, span },
    );

    // Spacing only makes sense between slots that sit side by side, so the other axis has to overlap.
    if (span[0] < crossEnd && span[1] > crossStart) {
      targets.push(
        { value: otherEnd + SNAP_GAP, kind: 'gap', features: ['start'], span, band: [otherEnd, otherEnd + SNAP_GAP] },
        { value: otherStart - SNAP_GAP, kind: 'gap', features: ['end'], span, band: [otherStart - SNAP_GAP, otherStart] },
      );
    }

    if (resizing) {
      targets.push({ value: subjectStart + lengthOf(other, axis), kind: 'size', features: ['end'], span });
    }
  }

  return targets;
}

function constrain(slot: InventorySlot, resizing: boolean): InventorySlot {
  if (!resizing) return clampInventorySlot(slot);
  const w = Math.max(MIN_SLOT_SIZE, Math.min(slot.w, 100 - slot.x));
  const h = Math.max(MIN_SLOT_SIZE, Math.min(slot.h, 100 - slot.y));
  return { ...slot, w, h };
}

function snapAxis(
  axis: Axis,
  subject: InventorySlot,
  others: Geometry[],
  resizing: boolean,
  threshold: number,
): InventorySlot {
  const targets = buildTargets(axis, subject, others, resizing);
  let best: { delta: number; priority: number } | null = null;

  for (const { feature, position } of subjectFeatures(subject, axis, resizing)) {
    for (const target of targets) {
      if (!target.features.includes(feature)) continue;
      const delta = target.value - position;
      const distance = Math.abs(delta);
      if (distance > threshold) continue;
      const priority = KIND_PRIORITY[target.kind];
      if (
        !best
        || distance < Math.abs(best.delta) - EPS
        || (distance <= Math.abs(best.delta) + EPS && priority < best.priority)
      ) {
        best = { delta, priority };
      }
    }
  }

  const start = startOf(subject, axis);
  const length = lengthOf(subject, axis);
  // With nothing nearby, land on a whole percent so values stay tidy instead of ending up as 33.7.
  const nextStart = resizing ? start : best ? start + best.delta : Math.round(start);
  const nextLength = resizing ? (best ? length + best.delta : Math.round(start + length) - start) : length;
  return axis === 'x' ? { ...subject, x: round2(nextStart), w: round2(nextLength) } : { ...subject, y: round2(nextStart), h: round2(nextLength) };
}

function collectGuides(slot: InventorySlot, others: Geometry[], resizing: boolean): SnapGuide[] {
  const guides = new Map<string, SnapGuide>();

  (['x', 'y'] as Axis[]).forEach((axis) => {
    const cross: Axis = axis === 'x' ? 'y' : 'x';
    const crossStart = startOf(slot, cross);
    const crossEnd = crossStart + lengthOf(slot, cross);
    const targets = buildTargets(axis, slot, others, resizing);

    for (const { feature, position } of subjectFeatures(slot, axis, resizing)) {
      for (const target of targets) {
        if (!target.features.includes(feature) || Math.abs(target.value - position) > EPS) continue;
        const [spanStart, spanEnd] = target.span ?? [0, 100];
        const key = `${axis}:${round2(target.value)}`;
        const existing = guides.get(key);
        if (!existing) {
          guides.set(key, {
            axis,
            position: round2(target.value),
            from: Math.min(spanStart, crossStart),
            to: Math.max(spanEnd, crossEnd),
            kind: target.kind,
            band: target.band,
          });
          continue;
        }
        existing.from = Math.min(existing.from, spanStart, crossStart);
        existing.to = Math.max(existing.to, spanEnd, crossEnd);
        if (target.band && !existing.band) {
          existing.band = target.band;
          existing.kind = target.kind;
        }
      }
    }
  });

  return [...guides.values()];
}

export interface SnapRequest {
  mode: 'move' | 'resize';
  /** Where the slot would be without any snapping. */
  proposed: InventorySlot;
  /** Every other slot in the widget. */
  others: Geometry[];
  /** Snap distance in percent of the widget area, per axis. */
  threshold: { x: number; y: number };
}

export function snapInventorySlot({ mode, proposed, others, threshold }: SnapRequest): { slot: InventorySlot; guides: SnapGuide[] } {
  const resizing = mode === 'resize';
  let slot = constrain(proposed, resizing);
  slot = constrain(snapAxis('x', slot, others, resizing, threshold.x), resizing);
  // Snapping vertically after horizontally lets the spacing check use the final horizontal position.
  slot = constrain(snapAxis('y', slot, others, resizing, threshold.y), resizing);
  return { slot, guides: collectGuides(slot, others, resizing) };
}
