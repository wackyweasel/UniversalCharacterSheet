import type { CharacterEventEffect, CharacterEventStep } from '../types';
import { createStep } from './steps';

export type BranchSection = 'effects' | 'otherwise';

/** A place on a link where something can be added or dropped. */
export type GraphSlot =
  /** Position `index` in a list of effects; `trunk` when the list is on the main line, where a condition can go too. */
  | { kind: 'list'; stepId: string; section: BranchSection; index: number; trunk: boolean }
  /** Between two steps: what is added becomes a new step before `steps[index]`. */
  | { kind: 'gap'; index: number };

export interface EffectLocation {
  stepIndex: number;
  step: CharacterEventStep;
  section: BranchSection;
  index: number;
  effect: CharacterEventEffect;
}

export const hasCondition = (step: CharacterEventStep) => step.condition !== undefined;

const getList = (step: CharacterEventStep, section: BranchSection) => (section === 'effects' ? step.effects : step.otherwise ?? []);

function withList(step: CharacterEventStep, section: BranchSection, list: CharacterEventEffect[]): CharacterEventStep {
  if (section === 'effects') return { ...step, effects: list };
  const { otherwise: _unused, ...rest } = step;
  return list.length ? { ...rest, otherwise: list } : rest;
}

/**
 * Keeps steps in the shape the graph draws: a step without a condition is a run of effects on the main line,
 * so empty ones go (one step always stays) and neighbouring ones become one.
 */
export function tidySteps(steps: CharacterEventStep[]): CharacterEventStep[] {
  const tidy: CharacterEventStep[] = [];
  for (const step of steps) {
    if (hasCondition(step)) {
      tidy.push(step);
      continue;
    }
    if (step.effects.length === 0) continue;
    const last = tidy[tidy.length - 1];
    if (last && !hasCondition(last)) tidy[tidy.length - 1] = { ...last, effects: [...last.effects, ...step.effects] };
    else tidy.push(step);
  }
  if (tidy.length === 0) return [steps.find((step) => !hasCondition(step)) ?? createStep()];
  return tidy.length === steps.length && tidy.every((step, index) => step === steps[index]) ? steps : tidy;
}

export function findEffect(steps: CharacterEventStep[], effectId: string): EffectLocation | null {
  for (let stepIndex = 0; stepIndex < steps.length; stepIndex += 1) {
    const step = steps[stepIndex];
    for (const section of ['effects', 'otherwise'] as const) {
      const index = getList(step, section).findIndex((effect) => effect.id === effectId);
      if (index >= 0) return { stepIndex, step, section, index, effect: getList(step, section)[index] };
    }
  }
  return null;
}

export function insertEffect(steps: CharacterEventStep[], slot: GraphSlot, effect: CharacterEventEffect): CharacterEventStep[] {
  if (slot.kind === 'gap') return tidySteps([...steps.slice(0, slot.index), createStep([effect]), ...steps.slice(slot.index)]);
  return steps.map((step) => {
    if (step.id !== slot.stepId) return step;
    const list = [...getList(step, slot.section)];
    list.splice(slot.index, 0, effect);
    return withList(step, slot.section, list);
  });
}

/**
 * Adds a blank condition at a slot of the main line. The effects that followed it in their step become what runs
 * when it is true. Returns null for a slot inside a branch, since conditions don't nest.
 */
export function insertCondition(steps: CharacterEventStep[], slot: GraphSlot): { steps: CharacterEventStep[]; stepId: string } | null {
  if (slot.kind === 'gap') {
    const added = createStep([], '');
    return { steps: [...steps.slice(0, slot.index), added, ...steps.slice(slot.index)], stepId: added.id };
  }
  const at = steps.findIndex((step) => step.id === slot.stepId);
  if (!slot.trunk || at < 0) return null;
  const step = steps[at];
  const before = step.effects.slice(0, slot.index);
  const added = createStep(step.effects.slice(slot.index), '');
  return {
    steps: [...steps.slice(0, at), ...(before.length ? [{ ...step, effects: before }] : []), added, ...steps.slice(at + 1)],
    stepId: added.id,
  };
}

export function removeEffect(steps: CharacterEventStep[], effectId: string): CharacterEventStep[] {
  const from = findEffect(steps, effectId);
  if (!from) return steps;
  return tidySteps(steps.map((step, index) => (
    index === from.stepIndex ? withList(step, from.section, getList(step, from.section).filter((effect) => effect.id !== effectId)) : step
  )));
}

/** Removes a step's condition: its effects then always run, and its "otherwise" effects go with it. */
export function removeCondition(steps: CharacterEventStep[], stepId: string): CharacterEventStep[] {
  return tidySteps(steps.map((step) => (step.id === stepId ? { id: step.id, effects: step.effects } : step)));
}

/** True for the two slots right before and after an effect, where moving it changes nothing. */
export function isSlotBeside(from: EffectLocation, slot: GraphSlot): boolean {
  return slot.kind === 'list'
    && slot.stepId === from.step.id
    && slot.section === from.section
    && (slot.index === from.index || slot.index === from.index + 1);
}

export function moveEffect(steps: CharacterEventStep[], effectId: string, slot: GraphSlot): CharacterEventStep[] {
  const from = findEffect(steps, effectId);
  if (!from || isSlotBeside(from, slot)) return steps;
  // Taking the effect out first keeps every other position where the slot expects it, bar the ones after it in its own list.
  const without = steps.map((step, index) => (
    index === from.stepIndex ? withList(step, from.section, getList(step, from.section).filter((effect) => effect.id !== effectId)) : step
  ));
  const sameList = slot.kind === 'list' && slot.stepId === from.step.id && slot.section === from.section;
  const target = sameList && slot.index > from.index ? { ...slot, index: slot.index - 1 } : slot;
  return tidySteps(insertEffect(without, target, from.effect));
}

/** Swaps an effect with its neighbour in the same list. */
export function shiftEffect(steps: CharacterEventStep[], effectId: string, offset: -1 | 1): CharacterEventStep[] {
  const from = findEffect(steps, effectId);
  if (!from) return steps;
  const list = [...getList(from.step, from.section)];
  const to = from.index + offset;
  if (to < 0 || to >= list.length) return steps;
  [list[from.index], list[to]] = [list[to], list[from.index]];
  return steps.map((step, index) => (index === from.stepIndex ? withList(step, from.section, list) : step));
}

// ----- Layout -----

export type GraphNodeKind = 'trigger' | 'condition' | 'effect' | 'add' | 'join' | 'stop' | 'end';

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  /** Top left corner. */
  x: number;
  y: number;
  width: number;
  height: number;
  stepId?: string;
  effectId?: string;
  /** Branch an effect sits in. */
  section?: BranchSection;
  /** Slot that a click on an "add" node fills. */
  slot?: GraphSlot;
}

/** How a link bends: straight down, out of a condition's side, back into the main line, or around a branch with nothing in it. */
export type GraphEdgeShape = 'straight' | 'out' | 'in' | 'around';

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: 'yes' | 'no';
  targetHandle?: 'top' | 'side';
  shape: GraphEdgeShape;
  label?: 'Yes' | 'No';
  /** The side that runs when a condition is false. */
  otherwise?: boolean;
  slot?: GraphSlot;
  /** Where the slot's "+" sits on the link. */
  plus?: { x: number; y: number };
  /** For an `around` link: how far right it goes before coming back. */
  viaX?: number;
}

export interface EventGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const TRIGGER_NODE_ID = 'trigger';
export const END_NODE_ID = 'end';
export const conditionNodeId = (stepId: string) => `cond:${stepId}`;
export const effectNodeId = (effectId: string) => `fx:${effectId}`;
export const addNodeId = (stepId: string) => `add:${stepId}`;

export const GRAPH_SIZES = {
  nodeWidth: 260,
  nodeHeight: 76,
  addHeight: 44,
  joinSize: 12,
  endWidth: 76,
  endHeight: 28,
  /** Room between two nodes of a line, enough for a "+". */
  gap: 48,
  /** From the main line to the middle of the "otherwise" column. */
  branchOffset: 316,
  /** From the main line to a link that goes around it. */
  aroundOffset: 176,
};

interface Tail {
  id: string;
  handle?: 'yes' | 'no';
  x: number;
  bottom: number;
}

/**
 * Places an event's steps as a top-to-bottom flow: the trigger, then each step in order. A condition sends
 * "yes" straight down and "no" to a column on its right; both meet again before the next step.
 */
export function layoutEventGraph(steps: CharacterEventStep[]): EventGraph {
  const { nodeWidth, nodeHeight, addHeight, joinSize, endWidth, endHeight, gap, branchOffset, aroundOffset } = GRAPH_SIZES;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const place = (node: Omit<GraphNode, 'x' | 'y'>, centerX: number, top: number): Tail => {
    nodes.push({ ...node, x: centerX - node.width / 2, y: top });
    return { id: node.id, x: centerX, bottom: top + node.height };
  };
  const link = (from: Tail, target: string, edge: Partial<GraphEdge> = {}) => {
    edges.push({
      id: `${from.id}${from.handle ? `.${from.handle}` : ''}>${target}`,
      source: from.id,
      target,
      ...(from.handle ? { sourceHandle: from.handle } : {}),
      shape: 'straight',
      ...(edge.slot && !edge.plus ? { plus: { x: from.x, y: from.bottom + gap / 2 } } : {}),
      ...edge,
    });
  };
  const listSlot = (step: CharacterEventStep, section: BranchSection, index: number): GraphSlot => (
    { kind: 'list', stepId: step.id, section, index, trunk: !hasCondition(step) }
  );
  /** The slot on the main line right before step `at`, or before the end when there is no such step. */
  const slotBefore = (at: number): GraphSlot => {
    const previous = steps[at - 1];
    return previous && !hasCondition(previous) ? listSlot(previous, 'effects', previous.effects.length) : { kind: 'gap', index: at };
  };
  const effectNode = (step: CharacterEventStep, section: BranchSection, effect: CharacterEventEffect): Omit<GraphNode, 'x' | 'y'> => (
    { id: effectNodeId(effect.id), kind: 'effect', width: nodeWidth, height: nodeHeight, stepId: step.id, effectId: effect.id, section }
  );
  const addNode = (step: CharacterEventStep): Omit<GraphNode, 'x' | 'y'> => (
    { id: addNodeId(step.id), kind: 'add', width: nodeWidth, height: addHeight, stepId: step.id, slot: listSlot(step, 'effects', 0) }
  );

  let tail = place({ id: TRIGGER_NODE_ID, kind: 'trigger', width: nodeWidth, height: nodeHeight }, 0, 0);

  steps.forEach((step, stepIndex) => {
    if (!hasCondition(step)) {
      step.effects.forEach((effect, index) => {
        link(tail, effectNodeId(effect.id), { slot: listSlot(step, 'effects', index) });
        tail = place(effectNode(step, 'effects', effect), 0, tail.bottom + gap);
      });
      // Only an event with nothing to do yet has a step like this.
      if (step.effects.length === 0) {
        link(tail, addNodeId(step.id));
        tail = place(addNode(step), 0, tail.bottom + gap);
      }
      return;
    }

    const conditionId = conditionNodeId(step.id);
    link(tail, conditionId, { slot: slotBefore(stepIndex) });
    const condition = place({ id: conditionId, kind: 'condition', width: nodeWidth, height: nodeHeight, stepId: step.id }, 0, tail.bottom + gap);
    const conditionMiddle = condition.bottom - nodeHeight / 2;

    let yes: Tail = { ...condition, handle: 'yes' };
    step.effects.forEach((effect, index) => {
      link(yes, effectNodeId(effect.id), { slot: listSlot(step, 'effects', index), ...(index === 0 ? { label: 'Yes' } : {}) });
      yes = place(effectNode(step, 'effects', effect), 0, yes.bottom + gap);
    });
    if (step.effects.length === 0) {
      link(yes, addNodeId(step.id), { label: 'Yes' });
      yes = place(addNode(step), 0, yes.bottom + gap);
    }

    const otherwise = step.otherwise ?? [];
    const stops = !!step.stopIfFalse && stepIndex < steps.length - 1;
    let no: Tail = { ...condition, handle: 'no', x: branchOffset };
    otherwise.forEach((effect, index) => {
      const top = no.bottom + gap;
      link(no, effectNodeId(effect.id), {
        slot: listSlot(step, 'otherwise', index),
        otherwise: true,
        ...(index === 0 ? { shape: 'out', label: 'No', plus: { x: branchOffset, y: top - gap / 2 } } : {}),
      });
      no = place(effectNode(step, 'otherwise', effect), branchOffset, top);
    });
    if (stops) {
      const stopId = `stop:${step.id}`;
      const top = no.bottom + gap;
      link(no, stopId, {
        slot: listSlot(step, 'otherwise', otherwise.length),
        otherwise: true,
        ...(otherwise.length === 0 ? { shape: 'out', label: 'No', plus: { x: branchOffset, y: top - gap / 2 } } : {}),
      });
      no = place({ id: stopId, kind: 'stop', width: endWidth, height: endHeight, stepId: step.id }, branchOffset, top);
    }

    const joinId = `join:${step.id}`;
    const joinTop = Math.max(yes.bottom, otherwise.length || stops ? no.bottom : 0) + gap;
    link(yes, joinId, { targetHandle: 'top', ...(step.effects.length ? { slot: listSlot(step, 'effects', step.effects.length) } : {}) });
    if (!stops && otherwise.length) {
      link(no, joinId, { targetHandle: 'side', shape: 'in', otherwise: true, slot: listSlot(step, 'otherwise', otherwise.length) });
    } else if (!stops) {
      link(no, joinId, {
        targetHandle: 'side',
        shape: 'around',
        label: 'No',
        otherwise: true,
        viaX: aroundOffset,
        slot: listSlot(step, 'otherwise', 0),
        plus: { x: aroundOffset, y: (conditionMiddle + joinTop + joinSize / 2) / 2 },
      });
    }
    tail = place({ id: joinId, kind: 'join', width: joinSize, height: joinSize, stepId: step.id }, 0, joinTop);
  });

  const last = steps[steps.length - 1];
  const isEmpty = !!last && !hasCondition(last) && last.effects.length === 0;
  link(tail, END_NODE_ID, isEmpty ? {} : { slot: slotBefore(steps.length) });
  place({ id: END_NODE_ID, kind: 'end', width: endWidth, height: endHeight }, 0, tail.bottom + gap);

  return { nodes, edges };
}
