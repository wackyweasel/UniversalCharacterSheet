import type { CharacterEventEffect, CharacterEventStep } from '../types';
import { END_EVENT_KIND, resultLabel } from './constants';
import { createStep, END_JUMP, getAllSteps, getJumpTargetIds, isValidJump, mapSteps } from './steps';

export type BranchSection = 'effects' | 'otherwise';

/** A side of a condition: that side's effects, then the steps nested after them. */
export interface BranchRef {
  stepId: string;
  section: BranchSection;
}

/** A place on a link where something can be added or dropped. */
export type GraphSlot =
  /** Position `index` in a step's list of effects. */
  | { kind: 'list'; stepId: string; section: BranchSection; index: number }
  /** Between two steps: what is added becomes a new step before the one at `index`, among the steps nested in `branch` or, without one, the event's own. */
  | { kind: 'gap'; index: number; branch?: BranchRef };

export interface EffectLocation {
  step: CharacterEventStep;
  section: BranchSection;
  index: number;
  effect: CharacterEventEffect;
}

const SECTIONS = ['effects', 'otherwise'] as const;
const NONE: CharacterEventStep[] = [];

export const hasCondition = (step: CharacterEventStep) => step.condition !== undefined;

const getList = (step: CharacterEventStep, section: BranchSection) => (section === 'effects' ? step.effects : step.otherwise ?? []);
const getNested = (step: CharacterEventStep, section: BranchSection) => (section === 'effects' ? step.steps : step.otherwiseSteps) ?? NONE;
const isBranch = (branch: BranchRef | undefined, other: BranchRef | undefined) => branch?.stepId === other?.stepId && branch?.section === other?.section;

function withList(step: CharacterEventStep, section: BranchSection, list: CharacterEventEffect[]): CharacterEventStep {
  if (section === 'effects') return { ...step, effects: list };
  const { otherwise: _unused, ...rest } = step;
  return list.length ? { ...rest, otherwise: list } : rest;
}

function withNested(step: CharacterEventStep, section: BranchSection, nested: CharacterEventStep[]): CharacterEventStep {
  const { steps, otherwiseSteps, ...rest } = step;
  const yes = section === 'effects' ? nested : steps ?? NONE;
  const no = section === 'otherwise' ? nested : otherwiseSteps ?? NONE;
  return { ...rest, ...(yes.length ? { steps: yes } : {}), ...(no.length ? { otherwiseSteps: no } : {}) };
}

/** A step without a condition is nothing but a run of effects. */
const asRun = (step: CharacterEventStep): CharacterEventStep => (
  Object.keys(step).every((key) => key === 'id' || key === 'effects') ? step : { id: step.id, effects: step.effects }
);

const isEnd = (effect: CharacterEventEffect) => effect.kind === END_EVENT_KIND;

/** Cuts what follows an End effect on one side of a step: its later effects and the steps nested after them. */
function cutSection(step: CharacterEventStep, section: BranchSection): { step: CharacterEventStep; ends: boolean } {
  const list = getList(step, section);
  const at = list.findIndex(isEnd);
  const nested = getNested(step, section);
  if (at >= 0) {
    const trimmed = list.length > at + 1 ? withList(step, section, list.slice(0, at + 1)) : step;
    return { step: nested.length ? withNested(trimmed, section, []) : trimmed, ends: true };
  }
  const cut = cutFlow(nested);
  return { step: cut.flow === nested ? step : withNested(step, section, cut.flow), ends: cut.ends };
}

/** A run of steps ends where a step does: an End effect, or a condition whose two sides both end (a stop counts for the "no" side). Later steps can never run. */
function cutFlow(flow: CharacterEventStep[]): { flow: CharacterEventStep[]; ends: boolean } {
  const kept: CharacterEventStep[] = [];
  let ends = false;
  for (const step of flow) {
    const yes = cutSection(step, 'effects');
    const no = hasCondition(step) ? cutSection(yes.step, 'otherwise') : yes;
    kept.push(no.step);
    if (yes.ends && (no.ends || !hasCondition(step) || !!step.stopIfFalse)) {
      ends = true;
      break;
    }
  }
  return { flow: kept.length === flow.length && kept.every((step, index) => step === flow[index]) ? flow : kept, ends };
}

/** Removes everything that comes after an End effect, since it can never run, and the jumps that lead nowhere. */
export function cutAfterEnd(steps: CharacterEventStep[]): CharacterEventStep[] {
  return cleanJumps(cutFlow(steps).flow);
}

/** Drops the jumps of a side that no longer lead to the end or to a step, and those of a step without a condition. */
function cleanJumps(steps: CharacterEventStep[]): CharacterEventStep[] {
  return mapSteps(steps, (step) => {
    if (!step.jump && !step.otherwiseJump) return step;
    const next = { ...step };
    for (const key of ['jump', 'otherwiseJump'] as const) {
      if (next[key] && !(hasCondition(step) && isValidJump(steps, step.id, next[key]))) delete next[key];
    }
    return next.jump === step.jump && next.otherwiseJump === step.otherwiseJump ? step : next;
  });
}

/** Where a side of a condition carries on once it has run, when it isn't straight on. */
export function getJump(step: CharacterEventStep | undefined, section: BranchSection): string | undefined {
  return section === 'effects' ? step?.jump : step?.otherwiseJump;
}

/** Makes a side of a condition carry on at any step, or at the end, once it has run; without a target it goes back to carrying on with what follows. */
export function setJump(steps: CharacterEventStep[], stepId: string, section: BranchSection, target: string | null): CharacterEventStep[] {
  return cleanJumps(updateStep(steps, stepId, (step) => {
    const next = { ...step };
    if (section === 'effects') delete next.jump;
    else delete next.otherwiseJump;
    if (!target) return next;
    if (section === 'effects') return { ...next, jump: target };
    // A "no" side that jumps no longer stops the event.
    delete next.stopIfFalse;
    return { ...next, otherwiseJump: target };
  }));
}

function tidyFlow(steps: CharacterEventStep[], renamed?: Map<string, string>): CharacterEventStep[] {
  const tidy: CharacterEventStep[] = [];
  const add = (step: CharacterEventStep) => {
    if (hasCondition(step)) {
      tidy.push(tidySides(step, renamed));
      return;
    }
    const last = tidy[tidy.length - 1];
    if (step.effects.length > 0) {
      if (last && !hasCondition(last)) {
        tidy[tidy.length - 1] = { ...last, effects: [...last.effects, ...step.effects] };
        // Jumps that led to the step lead to the run it became part of.
        renamed?.set(step.id, last.id);
      } else tidy.push(asRun(step));
    }
    // Without a condition, the steps nested in it just follow its effects.
    step.steps?.forEach(add);
  };
  steps.forEach(add);
  return tidy.length === steps.length && tidy.every((step, index) => step === steps[index]) ? steps : tidy;
}

function tidySides(step: CharacterEventStep, renamed?: Map<string, string>): CharacterEventStep {
  let next = step;
  for (const section of SECTIONS) {
    const nested = section === 'effects' ? step.steps : step.otherwiseSteps;
    if (!nested) continue;
    const flow = tidyFlow(nested, renamed);
    // A side starts with its own list of effects, so a first step without a condition belongs in that list.
    const lead = flow[0] && !hasCondition(flow[0]) ? flow[0].effects : [];
    if (flow === nested && flow.length > 0 && lead.length === 0) continue;
    next = withNested(lead.length ? withList(next, section, [...getList(next, section), ...lead]) : next, section, lead.length ? flow.slice(1) : flow);
  }
  return next;
}

/**
 * Keeps steps in the shape the graph draws, at every depth: a step without a condition is a run of effects on a line,
 * so empty ones go (the event always keeps one step), neighbouring ones become one, and one that opens a side of a
 * condition joins that side's effects.
 */
export function tidySteps(steps: CharacterEventStep[]): CharacterEventStep[] {
  const renamed = new Map<string, string>();
  const tidy = tidyAll(steps, renamed);
  if (renamed.size === 0) return cutAfterEnd(tidy);
  const follow = (target: string | undefined) => (target ? renamed.get(target) ?? target : target);
  return cutAfterEnd(mapSteps(tidy, (step) => {
    const jump = follow(step.jump);
    const otherwiseJump = follow(step.otherwiseJump);
    return jump === step.jump && otherwiseJump === step.otherwiseJump ? step : { ...step, ...(jump ? { jump } : {}), ...(otherwiseJump ? { otherwiseJump } : {}) };
  }));
}

function tidyAll(steps: CharacterEventStep[], renamed?: Map<string, string>): CharacterEventStep[] {
  const tidy = tidyFlow(steps, renamed);
  if (tidy.length > 0) return tidy;
  const empty = steps.find((step) => !hasCondition(step));
  const only = empty ? asRun(empty) : createStep();
  return steps.length === 1 && steps[0] === only ? steps : [only];
}

// ----- Roll targets -----

/** Whether a target could change what the comparison means if written next to it as it is, as with `a || b`. */
const needsParens = (target: string) => /[|&?<>=]/.test(target);

const isBalanced = (text: string) => {
  let depth = 0;
  for (const char of text) {
    depth += char === '(' ? 1 : char === ')' ? -1 : 0;
    if (depth < 0) return false;
  }
  return depth === 0;
};

/** The condition a roll's target number stands for: the roll's total reaches the target. */
export const rollBranchFormula = (resultName: string, target: string) => {
  const trimmed = target.trim();
  return `@${resultLabel(resultName, 'total')} >= ${needsParens(trimmed) ? `(${trimmed})` : trimmed}`.trimEnd();
};

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The target number of a condition that compares the total of the roll named `resultName`, or null for any other condition. */
export function parseRollBranch(condition: string | undefined, resultName: string | undefined): string | null {
  const name = resultName?.trim();
  if (!name || condition === undefined) return null;
  const match = new RegExp(`^\\s*@${escapeRegExp(resultLabel(name, 'total'))}\\s*>=\\s*(.*?)\\s*$`).exec(condition);
  if (!match) return null;
  const written = match[1];
  const inner = written.startsWith('(') && written.endsWith(')') ? written.slice(1, -1) : null;
  if (inner !== null && needsParens(inner) && isBalanced(inner)) return inner;
  // Anything else that would need the parentheses is a condition of its own, such as `@total >= 5 && @x`.
  return needsParens(written) ? null : written;
}

/**
 * The conditions that come right after a roll and only compare its total with a target number, by the id of that roll.
 * The graph draws the two as one node that leaves by two links, "reached" and "not reached".
 */
export function getRollBranches(steps: CharacterEventStep[]): Map<string, CharacterEventStep> {
  const found = new Map<string, CharacterEventStep>();
  const walk = (flow: CharacterEventStep[], lead: CharacterEventEffect | undefined) => {
    flow.forEach((step, index) => {
      const previous = flow[index - 1];
      const before = index === 0 ? lead : previous && !hasCondition(previous) ? previous.effects[previous.effects.length - 1] : undefined;
      if (before && hasCondition(step) && parseRollBranch(step.condition, before.resultName) !== null) found.set(before.id, step);
      for (const section of SECTIONS) {
        const list = getList(step, section);
        walk(getNested(step, section), list[list.length - 1]);
      }
    });
  };
  walk(steps, undefined);
  return found;
}

/** Makes the roll split on a target number: what followed it in its list becomes what runs when the target is reached. */
export function addRollBranch(steps: CharacterEventStep[], effectId: string, target: string): CharacterEventStep[] {
  const from = findEffect(steps, effectId);
  const name = from?.effect.resultName?.trim();
  if (!from || !name || getRollBranches(steps).has(effectId)) return steps;
  const added = insertCondition(steps, { kind: 'list', stepId: from.step.id, section: from.section, index: from.index + 1 });
  return added ? updateStep(added.steps, added.stepId, (step) => ({ ...step, condition: rollBranchFormula(name, target) })) : steps;
}

/** Changes the target number of a roll that splits on one. */
export function setRollTarget(steps: CharacterEventStep[], effectId: string, target: string): CharacterEventStep[] {
  const branch = getRollBranches(steps).get(effectId);
  const name = findEffect(steps, effectId)?.effect.resultName?.trim();
  return branch && name ? updateStep(steps, branch.id, (step) => ({ ...step, condition: rollBranchFormula(name, target) })) : steps;
}

/** Keeps the target number of a roll that splits on one when its result name changes. */
export function renameRollBranch(steps: CharacterEventStep[], effectId: string, resultName: string): CharacterEventStep[] {
  const branch = getRollBranches(steps).get(effectId);
  const target = branch && parseRollBranch(branch.condition, findEffect(steps, effectId)?.effect.resultName);
  return branch && target !== null && target !== undefined ? updateStep(steps, branch.id, (step) => ({ ...step, condition: rollBranchFormula(resultName, target) })) : steps;
}

export function findStep(steps: CharacterEventStep[], stepId: string | undefined): CharacterEventStep | undefined {
  return stepId ? getAllSteps(steps).find((step) => step.id === stepId) : undefined;
}

export function findEffect(steps: CharacterEventStep[], effectId: string): EffectLocation | null {
  for (const step of getAllSteps(steps)) {
    for (const section of SECTIONS) {
      const index = getList(step, section).findIndex((effect) => effect.id === effectId);
      if (index >= 0) return { step, section, index, effect: getList(step, section)[index] };
    }
  }
  return null;
}

/** Changes one step, wherever it is nested. */
export function updateStep(steps: CharacterEventStep[], stepId: string, change: (step: CharacterEventStep) => CharacterEventStep): CharacterEventStep[] {
  return mapSteps(steps, (step) => (step.id === stepId ? change(step) : step));
}

/** Whether anything runs after a step: later steps of its own run, or of the runs it is nested in. */
export function hasStepsAfter(steps: CharacterEventStep[], stepId: string): boolean {
  const search = (flow: CharacterEventStep[], follows: boolean): boolean | null => {
    for (let index = 0; index < flow.length; index += 1) {
      const step = flow[index];
      const next = follows || index < flow.length - 1;
      if (step.id === stepId) return next;
      const found = search(getNested(step, 'effects'), next) ?? search(getNested(step, 'otherwise'), next);
      if (found !== null) return found;
    }
    return null;
  };
  return search(steps, false) ?? false;
}

/** Rebuilds every run of steps, nested ones first: the event's own has no `branch`. */
function mapFlows(
  steps: CharacterEventStep[],
  change: (flow: CharacterEventStep[], branch: BranchRef | undefined) => CharacterEventStep[],
  branch?: BranchRef,
): CharacterEventStep[] {
  const mapped = steps.map((step) => {
    let next = step;
    for (const section of SECTIONS) {
      const nested = getNested(step, section);
      const rebuilt = mapFlows(nested, change, { stepId: step.id, section });
      if (rebuilt !== nested) next = withNested(next, section, rebuilt);
    }
    return next;
  });
  return change(mapped.every((step, index) => step === steps[index]) ? steps : mapped, branch);
}

function insertStep(steps: CharacterEventStep[], slot: Extract<GraphSlot, { kind: 'gap' }>, added: CharacterEventStep): CharacterEventStep[] {
  return mapFlows(steps, (flow, branch) => (isBranch(branch, slot.branch) ? [...flow.slice(0, slot.index), added, ...flow.slice(slot.index)] : flow));
}

/** Puts other steps in the place of one, in the run it is part of. */
function replaceStep(steps: CharacterEventStep[], stepId: string, replace: (step: CharacterEventStep) => CharacterEventStep[]): CharacterEventStep[] {
  return mapFlows(steps, (flow) => {
    const at = flow.findIndex((step) => step.id === stepId);
    return at < 0 ? flow : [...flow.slice(0, at), ...replace(flow[at]), ...flow.slice(at + 1)];
  });
}

const withoutEffect = (steps: CharacterEventStep[], from: EffectLocation) => updateStep(steps, from.step.id, (step) => (
  withList(step, from.section, getList(step, from.section).filter((effect) => effect.id !== from.effect.id))
));

export function insertEffect(steps: CharacterEventStep[], slot: GraphSlot, effect: CharacterEventEffect): CharacterEventStep[] {
  if (slot.kind === 'gap') return tidySteps(insertStep(steps, slot, createStep([effect])));
  return updateStep(steps, slot.stepId, (step) => {
    const list = [...getList(step, slot.section)];
    list.splice(slot.index, 0, effect);
    return withList(step, slot.section, list);
  });
}

/**
 * Adds a blank condition at a slot. The effects that followed it in their list become what runs when it is true;
 * what comes after them, such as another condition, stays after the new one. Returns null when the slot's step is gone.
 */
export function insertCondition(steps: CharacterEventStep[], slot: GraphSlot): { steps: CharacterEventStep[]; stepId: string } | null {
  if (slot.kind === 'gap') {
    const added = createStep([], '');
    return { steps: insertStep(steps, slot, added), stepId: added.id };
  }
  const step = findStep(steps, slot.stepId);
  if (!step) return null;
  const list = getList(step, slot.section);
  const before = list.slice(0, slot.index);
  const added = createStep(list.slice(slot.index), '');
  if (!hasCondition(step)) {
    return { steps: replaceStep(steps, step.id, (current) => [...(before.length ? [{ ...current, effects: before }] : []), added]), stepId: added.id };
  }
  // On a side of a condition, the new one goes first among the steps nested in that side.
  const { section } = slot;
  return {
    steps: updateStep(steps, step.id, (current) => withNested(withList(current, section, before), section, [added, ...getNested(current, section)])),
    stepId: added.id,
  };
}

export function removeEffect(steps: CharacterEventStep[], effectId: string): CharacterEventStep[] {
  const from = findEffect(steps, effectId);
  return from ? tidySteps(withoutEffect(steps, from)) : steps;
}

/** Removes a step's condition: what was on its "yes" side then always runs, and its "otherwise" side goes with it. */
export function removeCondition(steps: CharacterEventStep[], stepId: string): CharacterEventStep[] {
  return tidySteps(replaceStep(steps, stepId, (step) => [{ id: step.id, effects: step.effects }, ...getNested(step, 'effects')]));
}

/** True for the two slots right before and after an effect, where moving it changes nothing. */
export function isSlotBeside(from: EffectLocation, slot: GraphSlot): boolean {
  return slot.kind === 'list'
    && slot.stepId === from.step.id
    && slot.section === from.section
    && (slot.index === from.index || slot.index === from.index + 1);
}

/** Reordering never deletes anything, so a move that would put effects after an End is refused. */
function keepIfNothingCut(before: CharacterEventStep[], after: CharacterEventStep[]): CharacterEventStep[] {
  return JSON.stringify(cutAfterEnd(after)) === JSON.stringify(after) ? after : before;
}

export function moveEffect(steps: CharacterEventStep[], effectId: string, slot: GraphSlot): CharacterEventStep[] {
  const from = findEffect(steps, effectId);
  if (!from || isSlotBeside(from, slot)) return steps;
  // Taking the effect out first keeps every other position where the slot expects it, bar the ones after it in its own list.
  const sameList = slot.kind === 'list' && slot.stepId === from.step.id && slot.section === from.section;
  const target = sameList && slot.index > from.index ? { ...slot, index: slot.index - 1 } : slot;
  const moved = insertEffect(withoutEffect(steps, from), target, from.effect);
  return keepIfNothingCut(steps, moved) === moved ? tidySteps(moved) : steps;
}

/** Swaps an effect with its neighbour in the same list. */
export function shiftEffect(steps: CharacterEventStep[], effectId: string, offset: -1 | 1): CharacterEventStep[] {
  const from = findEffect(steps, effectId);
  if (!from) return steps;
  const list = [...getList(from.step, from.section)];
  const to = from.index + offset;
  if (to < 0 || to >= list.length) return steps;
  [list[from.index], list[to]] = [list[to], list[from.index]];
  return keepIfNothingCut(steps, updateStep(steps, from.step.id, (step) => withList(step, from.section, list)));
}

// ----- Layout -----

export type GraphNodeKind = 'trigger' | 'condition' | 'effect' | 'add' | 'join' | 'stop' | 'end';
export type GraphSide = 'yes' | 'no';

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  /** Top left corner. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** The step of a condition, or the one whose list holds an effect. */
  stepId?: string;
  effectId?: string;
  /** For a roll that splits on a target number: the step whose condition is that split, so the roll has a "yes" and a "no" exit. */
  branchStepId?: string;
  /** Side of the nearest condition above that the node's line is on; missing on the main line. */
  side?: GraphSide;
  /** Slot that a click on an "add" node fills. */
  slot?: GraphSlot;
}

/** Which way the flow runs: from top to bottom, or from left to right. */
export type GraphDirection = 'down' | 'right';

/**
 * How a link bends: straight ahead, out of a condition's side, back into the line it left, around a side with nothing on it,
 * or, for a jump, a curve from the side to its target, wherever that is.
 */
export type GraphEdgeShape = 'straight' | 'out' | 'in' | 'around' | 'jump';

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: GraphSide;
  targetHandle?: 'top' | 'side';
  shape: GraphEdgeShape;
  label?: string;
  /** Part of a line that runs when a condition is false. */
  otherwise?: boolean;
  slot?: GraphSlot;
  /** Where the slot's "+" sits on the link. */
  plus?: { x: number; y: number };
  /** For an `around` link: how far to the side it goes before coming back; an x when the flow runs down, a y when it runs right. */
  via?: number;
}

/** A place a side of a condition can jump from: a node, or a handle of it, that is the last of that side. */
export interface GraphJumpSource {
  nodeId: string;
  handle?: GraphSide;
  stepId: string;
  section: BranchSection;
  /** The nodes the side can jump to: those of every step, and the End. */
  targets: string[];
}

export interface EventGraph {
  direction: GraphDirection;
  nodes: GraphNode[];
  edges: GraphEdge[];
  jumpSources: GraphJumpSource[];
  /** What a jump to each node stands for in a step's `jump`: the id of the step the node starts, or "end". */
  jumpTargets: Record<string, string>;
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
  /** Room between the "yes" side of a condition and its "no" side. */
  sideGap: 56,
  /** Room between a line and a link that goes around it. */
  aroundGap: 46,
  /** Room a "+" takes on each side of its link. */
  plusRadius: 14,
};

type Size = Pick<GraphNode, 'width' | 'height'>;

/** A rectangle worked out along the flow (`start`, `end`) and across it (`near`, `far`). */
interface Box {
  start: number;
  end: number;
  near: number;
  far: number;
}

/** Positions are worked out along the flow (`end`) and across it (`cross`, `reach`), whichever way it runs. */
interface Tail {
  id: string;
  handle?: GraphSide;
  /** Middle of the node, across the flow. */
  cross: number;
  /** Where the node ends, along the flow. */
  end: number;
}

/** A line of nodes being drawn one after the other. */
interface Line {
  /** Middle of the line, across the flow. */
  cross: number;
  side?: GraphSide;
  /** The last node drawn, which the next one links from. */
  tail: Tail;
  /** What the first link of the line says about the condition it leaves. */
  lead?: Partial<GraphEdge>;
  /** Far edge of everything drawn on the line so far, the sides of its conditions included. */
  reach: number;
  /** The line ends on an End effect, so nothing follows it, not even a link. */
  closed?: boolean;
}

/**
 * Places an event's steps as a flow that runs down or to the right: the trigger, then each step in order.
 * A condition sends "yes" straight ahead and "no" to a line beside it (on its right when the flow runs down, under it
 * when it runs right), clear of whatever the "yes" side holds; both meet again after. Each side is a line of its own,
 * so it can hold conditions too.
 */
export function layoutEventGraph(steps: CharacterEventStep[], direction: GraphDirection = 'down'): EventGraph {
  const { nodeWidth, nodeHeight, addHeight, joinSize, endWidth, endHeight, gap, sideGap, aroundGap, plusRadius } = GRAPH_SIZES;
  const down = direction === 'down';
  const along = (size: Size) => (down ? size.height : size.width);
  const across = (size: Size) => (down ? size.width : size.height);
  const toPoint = (main: number, cross: number) => (down ? { x: cross, y: main } : { x: main, y: cross });
  const card: Size = { width: nodeWidth, height: nodeHeight };
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const rollOf = new Map(Array.from(getRollBranches(steps), ([effectId, branch]) => [branch.id, effectId]));
  /** The node each step starts with, which a jump to the step leads to. */
  const entry = new Map<string, string>();
  /** The node of each effect, which a jump to the effect leads to. */
  const effectEntry = new Map<string, string>();
  const jumpSources: Array<Omit<GraphJumpSource, 'targets'>> = [];
  const jumps: Array<{ from: Tail; target: string; otherwise: boolean; label: string }> = [];
  /** The room taken so far by nodes and by the links that run beside them, so a line of its own can sit as close as it may. */
  const taken: Box[] = [];
  const boxOf = (node: Pick<GraphNode, 'x' | 'y' | 'width' | 'height'>): Box => (
    down ? { start: node.y, end: node.y + node.height, near: node.x, far: node.x + node.width } : { start: node.x, end: node.x + node.width, near: node.y, far: node.y + node.height }
  );
  const addNode = (node: GraphNode) => {
    nodes.push(node);
    taken.push(boxOf(node));
  };
  /** Moves what was drawn since the marks, across the flow. */
  const shiftSince = (marks: { nodes: number; edges: number; taken: number }, delta: number) => {
    if (!delta) return;
    for (const node of nodes.slice(marks.nodes)) node[down ? 'x' : 'y'] += delta;
    for (const edge of edges.slice(marks.edges)) {
      if (edge.via !== undefined) edge.via += delta;
      if (edge.plus) edge.plus = { x: edge.plus.x + (down ? delta : 0), y: edge.plus.y + (down ? 0 : delta) };
    }
    for (const box of taken.slice(marks.taken)) {
      box.near += delta;
      box.far += delta;
    }
  };
  const link = (from: Tail, target: string, edge: Partial<GraphEdge> = {}) => {
    // Where nested conditions end together their joins stack up; a "+" between two of them would only add at the same visible place.
    if (from.id.startsWith('join:') && target.startsWith('join:')) {
      const { slot: _slot, plus: _plus, ...rest } = edge;
      edge = rest;
    }
    edges.push({
      id: `${from.id}${from.handle ? `.${from.handle}` : ''}>${target}`,
      source: from.id,
      target,
      ...(from.handle ? { sourceHandle: from.handle } : {}),
      shape: 'straight',
      ...(edge.slot && !edge.plus ? { plus: toPoint(from.end + gap / 2, from.cross) } : {}),
      ...edge,
    });
  };
  const listSlot = (stepId: string, section: BranchSection, index: number): GraphSlot => ({ kind: 'list', stepId, section, index });

  /** Adds a node after the last one of a line, with the link between them. */
  const place = (line: Line, node: Omit<GraphNode, 'x' | 'y' | 'side'>, slot?: GraphSlot) => {
    const start = line.tail.end + gap;
    link(line.tail, node.id, { ...(slot ? { slot } : {}), ...(line.side === 'no' ? { otherwise: true } : {}), ...line.lead });
    addNode({ ...node, ...(line.side ? { side: line.side } : {}), ...toPoint(start, line.cross - across(node) / 2) });
    line.tail = { id: node.id, cross: line.cross, end: start + along(node) };
    line.lead = undefined;
    line.reach = Math.max(line.reach, line.cross + across(node) / 2);
  };

  const drawEffects = (line: Line, step: CharacterEventStep, section: BranchSection) => getList(step, section).forEach((effect, index) => {
    if (line.closed) return;
    effectEntry.set(effect.id, effectNodeId(effect.id));
    place(
      line,
      { id: effectNodeId(effect.id), kind: 'effect', ...card, stepId: step.id, effectId: effect.id },
      listSlot(step.id, section, index),
    );
    if (isEnd(effect)) line.closed = true;
  });
  const drawPlaceholder = (line: Line, step: CharacterEventStep) => place(
    line,
    { id: addNodeId(step.id), kind: 'add', width: nodeWidth, height: addHeight, stepId: step.id, slot: listSlot(step.id, 'effects', 0) },
  );

  /**
   * Draws a run of steps along a line and returns the slot at its end, or nothing when the line ends on a placeholder.
   * `follows` tells whether anything runs after the steps. `branch` is the side of a condition they are nested in,
   * and `lead` the number of effects that side has before them.
   */
  function drawFlow(line: Line, flow: CharacterEventStep[], follows: boolean, branch?: BranchRef, lead = 0): GraphSlot | undefined {
    /** The slot right before the step at `at`: what is added there joins the effects that precede it, when there are some. */
    const slotAt = (at: number): GraphSlot => {
      const previous = flow[at - 1];
      if (previous && !hasCondition(previous)) return listSlot(previous.id, 'effects', previous.effects.length);
      if (at === 0 && branch) return listSlot(branch.stepId, branch.section, lead);
      return { kind: 'gap', index: at, ...(branch ? { branch } : {}) };
    };
    let open = true;
    flow.forEach((step, at) => {
      if (line.closed) return;
      if (hasCondition(step)) {
        drawCondition(line, step, slotAt(at), follows || at < flow.length - 1);
        return;
      }
      drawEffects(line, step, 'effects');
      if (step.effects[0]) entry.set(step.id, effectNodeId(step.effects[0].id));
      // Only an event with nothing to do yet has a step like this.
      if (step.effects.length === 0) {
        drawPlaceholder(line, step);
        open = false;
      }
    });
    return open && !line.closed ? slotAt(flow.length) : undefined;
  }

  const drawSide = (line: Line, step: CharacterEventStep, section: BranchSection, follows: boolean) => {
    drawEffects(line, step, section);
    return drawFlow(line, getNested(step, section), follows, { stepId: step.id, section }, getList(step, section).length);
  };

  function drawCondition(line: Line, step: CharacterEventStep, slot: GraphSlot, follows: boolean) {
    // A condition that only checks the target number of the roll right before it is drawn as that roll's node, which then has the two exits.
    const rollId = rollOf.get(step.id);
    const rollNodeId = rollId ? effectNodeId(rollId) : undefined;
    const merged = !!rollNodeId && line.tail.id === rollNodeId;
    const conditionId = merged ? rollNodeId : conditionNodeId(step.id);
    let yesLabel = 'Yes';
    let noLabel = 'No';
    if (merged) {
      const name = findEffect(steps, rollId!)?.effect.resultName;
      const target = parseRollBranch(step.condition, name)?.trim() ?? '';
      const shown = target.length > 12 ? `${target.slice(0, 11)}…` : target;
      yesLabel = `≥ ${shown || '?'}`;
      noLabel = `< ${shown || '?'}`;
      const node = nodes.find((item) => item.id === conditionId);
      if (node) node.branchStepId = step.id;
    } else {
      place(line, { id: conditionId, kind: 'condition', ...card, stepId: step.id }, slot);
      entry.set(step.id, conditionId);
    }
    const condition = line.tail;
    const middle = condition.end - along(card) / 2;

    const yes: Line = { cross: line.cross, side: 'yes', tail: { ...condition, handle: 'yes' }, lead: { label: yesLabel }, reach: line.cross + across(card) / 2 };
    let yesEnd = drawSide(yes, step, 'effects', follows);
    if (yes.tail.id === conditionId) {
      drawPlaceholder(yes, step);
      yesEnd = undefined;
    }

    // The "no" line starts beside the condition, past everything the "yes" side spreads to.
    const noCross = yes.reach + sideGap + across(card) / 2;
    const no: Line = { cross: noCross, side: 'no', tail: { ...condition, handle: 'no', cross: noCross }, lead: { shape: 'out', label: noLabel }, reach: yes.reach };
    const marks = { nodes: nodes.length, edges: edges.length, taken: taken.length };
    const noEnd = drawSide(no, step, 'otherwise', follows);
    const stops = !!step.stopIfFalse && follows && !no.closed;
    if (stops) place(no, { id: `stop:${step.id}`, kind: 'stop', width: endWidth, height: endHeight, stepId: step.id }, noEnd);
    const hasNo = no.tail.id !== conditionId;

    // A side that ends on a node of its own can jump from it; a side with nothing on it, only from the condition's "no" exit.
    const jumpFrom = (tail: Tail, section: BranchSection, target: string | undefined) => {
      jumpSources.push({ nodeId: tail.id, ...(tail.handle ? { handle: tail.handle } : {}), stepId: step.id, section });
      if (target) jumps.push({ from: tail, target, otherwise: section === 'otherwise', label: tail.id === conditionId ? noLabel : '' });
    };
    const yesJumps = !yes.closed && !!yesEnd;
    const noJumps = !no.closed && !stops;
    // Conditions that end together share one join dot instead of stacking one per condition.
    const shared = yesJumps && !step.jump && yes.tail.id.startsWith('join:') && (!hasNo || no.tail.end + gap <= yes.tail.end - joinSize);
    if (yesJumps && !shared) jumpFrom(yes.tail, 'effects', step.jump);
    if (noJumps) jumpFrom(no.tail, 'otherwise', step.otherwiseJump);
    const yesLeaves = yesJumps && !!step.jump;
    const noLeaves = noJumps && !!step.otherwiseJump;

    // Both sides end (on an End effect, or the "no" side on a stop), so nothing joins them and nothing follows.
    const noOver = no.closed || stops;
    const joinId = shared ? yes.tail.id : `join:${step.id}`;
    const joinStart = shared ? yes.tail.end - joinSize : Math.max(yes.tail.end, hasNo ? no.tail.end : 0) + gap;

    if (hasNo) {
      // The "no" line sits as close to the "yes" side as it can: it only has to clear what is on its own rows. A line that goes
      // back to the join runs down to it, so it clears everything up to there; one that ends or jumps away has no such link.
      const rejoins = !noOver && !noLeaves;
      const half = across(card) / 2;
      const room = taken.slice(0, marks.taken);
      const own = taken.slice(marks.taken);
      const x = no.cross;
      const lanes: Box[] = [
        ...own,
        { start: middle, end: condition.end + gap, near: x - plusRadius, far: x + plusRadius },
        ...(rejoins ? [{ start: no.tail.end, end: joinStart + joinSize, near: x - plusRadius, far: x + plusRadius }] : []),
      ];
      let shift = line.cross + half + sideGap + half - x;
      for (let guard = 0; guard < 500; guard++) {
        let needed = shift;
        for (const lane of lanes) {
          for (const other of room) {
            if (other.start < lane.end && other.end > lane.start && lane.near + shift - sideGap < other.far && lane.far + shift + sideGap > other.near) {
              needed = Math.max(needed, other.far + sideGap - lane.near);
            }
          }
        }
        if (needed === shift) break;
        shift = needed;
      }
      shiftSince(marks, shift);
      for (const lane of lanes.slice(own.length)) taken.push({ ...lane, near: lane.near + shift, far: lane.far + shift });
      no.cross += shift;
      no.tail.cross += shift;
      no.reach = Math.max(yes.reach, ...taken.slice(marks.taken).map((box) => box.far));
    }

    if (yes.closed && noOver) {
      line.closed = true;
      line.tail = { id: line.tail.id, cross: line.cross, end: Math.max(yes.tail.end, no.tail.end) };
      line.reach = Math.max(line.reach, yes.reach, no.reach);
      return;
    }

    if (!yes.closed && !yesLeaves && !shared) link(yes.tail, joinId, { targetHandle: 'top', ...(yesEnd ? { slot: yesEnd } : {}) });
    let reach = no.reach;
    if (!hasNo) {
      if (!noLeaves) {
        const via = yes.reach + aroundGap;
        link(no.tail, joinId, {
          targetHandle: 'side',
          shape: 'around',
          label: noLabel,
          otherwise: true,
          via,
          slot: noEnd,
          plus: toPoint((middle + joinStart + joinSize / 2) / 2, via),
        });
        taken.push({ start: middle, end: joinStart + joinSize, near: via - plusRadius, far: via + plusRadius });
        reach = via + plusRadius;
      }
    } else if (!noOver && !noLeaves) {
      link(no.tail, joinId, { targetHandle: 'side', shape: 'in', otherwise: true, slot: noEnd });
    }

    if (!shared) addNode({ id: joinId, kind: 'join', width: joinSize, height: joinSize, stepId: step.id, ...(line.side ? { side: line.side } : {}), ...toPoint(joinStart, line.cross - joinSize / 2) });
    line.tail = { id: joinId, cross: line.cross, end: joinStart + joinSize };
    line.reach = Math.max(line.reach, reach);
  }

  addNode({ id: TRIGGER_NODE_ID, kind: 'trigger', ...card, ...toPoint(0, -across(card) / 2) });
  const main: Line = { cross: 0, tail: { id: TRIGGER_NODE_ID, cross: 0, end: along(card) }, reach: across(card) / 2 };
  const endSlot = drawFlow(main, steps, false);
  if (!main.closed) place(main, { id: END_NODE_ID, kind: 'end', width: endWidth, height: endHeight }, endSlot);

  // Jumps are drawn last; the canvas curves each one from its side to its target.
  const jumpTargets: Record<string, string> = {};
  for (const [effectId, nodeId] of effectEntry) jumpTargets[nodeId] = effectId;
  for (const [stepId, nodeId] of entry) jumpTargets[nodeId] = stepId;
  if (!main.closed) jumpTargets[END_NODE_ID] = END_JUMP;
  const targetIds = Object.keys(jumpTargets);
  const sources: GraphJumpSource[] = jumpSources.map((source) => {
    const allowed = new Set([...getJumpTargetIds(steps, source.stepId), END_JUMP]);
    return { ...source, targets: targetIds.filter((id) => allowed.has(jumpTargets[id])) };
  });
  const nodeIds = new Set(nodes.map((node) => node.id));
  for (const jump of jumps) {
    const targetId = jump.target === END_JUMP ? END_NODE_ID : entry.get(jump.target) ?? effectEntry.get(jump.target);
    if (!targetId || !nodeIds.has(targetId) || !jumpTargets[targetId]) continue;
    link(jump.from, targetId, {
      shape: 'jump',
      ...(jump.label ? { label: jump.label } : {}),
      ...(jump.otherwise ? { otherwise: true } : {}),
    });
  }

  return { direction, nodes, edges, jumpSources: sources, jumpTargets };
}
