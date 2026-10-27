import type { SkillTreeNode, WidgetData } from '../types';

export type SkillTreeOrientation = 'horizontal' | 'vertical' | 'bottom-up';
export type SkillNodeStatus = 'unlocked' | 'available' | 'unaffordable' | 'locked';

export const SKILL_NODE_WIDTH = 104;
export const SKILL_NODE_HEIGHT = 40;
export const SKILL_TREE_PADDING = 10;
const GAP_BETWEEN_TIERS = 36;
const GAP_WITHIN_TIER = 14;

export function normalizeSkillPoints(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

export const normalizeSkillCost = normalizeSkillPoints;

export function isSkillTreeUsingPoints(data: Pick<WidgetData, 'skillTreeUsePoints'>): boolean {
  return data.skillTreeUsePoints !== false;
}

/** Every skill this one points back to, whether it is required outright or as one of several alternatives. */
export function getAllRequiredIds(node: SkillTreeNode): string[] {
  return [...node.requires, ...(node.requiresAny ?? [])];
}

function getPrerequisites(nodes: SkillTreeNode[], node: SkillTreeNode): SkillTreeNode[] {
  const requiredIds = new Set(node.requires);
  return nodes.filter((candidate) => candidate.id !== node.id && requiredIds.has(candidate.id));
}

function getAlternatives(nodes: SkillTreeNode[], node: SkillTreeNode): SkillTreeNode[] {
  const alternativeIds = new Set(node.requiresAny ?? []);
  return nodes.filter((candidate) => candidate.id !== node.id && alternativeIds.has(candidate.id));
}

/** A skill sits one tier after its deepest prerequisite. Cyclic requirements are ignored. */
export function getSkillTiers(nodes: SkillTreeNode[]): Map<string, number> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const tiers = new Map<string, number>();
  const visiting = new Set<string>();

  const tierOf = (id: string): number => {
    const known = tiers.get(id);
    if (known !== undefined) return known;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    let tier = 0;
    const node = byId.get(id);
    for (const requiredId of node ? getAllRequiredIds(node) : []) {
      if (requiredId !== id && byId.has(requiredId)) tier = Math.max(tier, tierOf(requiredId) + 1);
    }
    visiting.delete(id);
    tiers.set(id, tier);
    return tier;
  };

  nodes.forEach((node) => tierOf(node.id));
  return tiers;
}

export interface SkillNodePosition {
  x: number;
  y: number;
  tier: number;
}

export interface SkillTreeLayout {
  positions: Map<string, SkillNodePosition>;
  width: number;
  height: number;
}

/** Places tiers from left to right, top to bottom or bottom to top, ordering each tier by where its prerequisites sit. */
export function layoutSkillTree(nodes: SkillTreeNode[], orientation: SkillTreeOrientation = 'horizontal'): SkillTreeLayout {
  const positions = new Map<string, SkillNodePosition>();
  if (nodes.length === 0) return { positions, width: 0, height: 0 };

  const tiers = getSkillTiers(nodes);
  const tierCount = Math.max(...tiers.values()) + 1;
  const groups: SkillTreeNode[][] = Array.from({ length: tierCount }, () => []);
  const order = new Map<string, number>();

  for (let tier = 0; tier < tierCount; tier++) {
    const group = nodes.filter((node) => tiers.get(node.id) === tier);
    if (tier > 0) {
      const barycenter = (node: SkillTreeNode) => {
        const placed = getAllRequiredIds(node).map((id) => order.get(id)).filter((value): value is number => value !== undefined);
        return placed.length > 0 ? placed.reduce((sum, value) => sum + value, 0) / placed.length : Number.POSITIVE_INFINITY;
      };
      group.sort((a, b) => {
        const difference = barycenter(a) - barycenter(b);
        return Number.isNaN(difference) || difference === 0 ? 0 : difference;
      });
    }
    group.forEach((node, index) => order.set(node.id, index));
    groups[tier] = group;
  }

  const widest = Math.max(...groups.map((group) => group.length));
  const isHorizontal = orientation === 'horizontal';
  const alongSize = isHorizontal ? SKILL_NODE_WIDTH : SKILL_NODE_HEIGHT;
  const acrossSize = isHorizontal ? SKILL_NODE_HEIGHT : SKILL_NODE_WIDTH;
  const alongStep = alongSize + GAP_BETWEEN_TIERS;
  const acrossStep = acrossSize + GAP_WITHIN_TIER;

  groups.forEach((group, tier) => {
    const centering = (widest - group.length) / 2;
    group.forEach((node, index) => {
      const along = SKILL_TREE_PADDING + tier * alongStep;
      const across = SKILL_TREE_PADDING + (index + centering) * acrossStep;
      positions.set(node.id, isHorizontal ? { x: along, y: across, tier } : { x: across, y: along, tier });
    });
  });

  const alongExtent = tierCount * alongSize + (tierCount - 1) * GAP_BETWEEN_TIERS;
  const acrossExtent = widest * acrossSize + (widest - 1) * GAP_WITHIN_TIER;
  const width = SKILL_TREE_PADDING * 2 + (isHorizontal ? alongExtent : acrossExtent);
  const height = SKILL_TREE_PADDING * 2 + (isHorizontal ? acrossExtent : alongExtent);
  if (orientation === 'bottom-up') {
    positions.forEach((position) => {
      position.y = height - position.y - SKILL_NODE_HEIGHT;
    });
  }
  return { positions, width, height };
}

export function getSkillConnectorPath(from: SkillNodePosition, to: SkillNodePosition, orientation: SkillTreeOrientation): string {
  if (orientation === 'horizontal') {
    const startX = from.x + SKILL_NODE_WIDTH;
    const startY = from.y + SKILL_NODE_HEIGHT / 2;
    const endY = to.y + SKILL_NODE_HEIGHT / 2;
    const middle = (startX + to.x) / 2;
    return `M ${startX} ${startY} C ${middle} ${startY}, ${middle} ${endY}, ${to.x} ${endY}`;
  }
  const isUpward = orientation === 'bottom-up';
  const startX = from.x + SKILL_NODE_WIDTH / 2;
  const startY = isUpward ? from.y : from.y + SKILL_NODE_HEIGHT;
  const endX = to.x + SKILL_NODE_WIDTH / 2;
  const endY = isUpward ? to.y + SKILL_NODE_HEIGHT : to.y;
  const middle = (startY + endY) / 2;
  return `M ${startX} ${startY} C ${startX} ${middle}, ${endX} ${middle}, ${endX} ${endY}`;
}

export function getSpentPoints(nodes: SkillTreeNode[]): number {
  return nodes.reduce((sum, node) => sum + (node.unlocked ? normalizeSkillCost(node.cost) : 0), 0);
}

export function getSkillPointsLeft(data: Pick<WidgetData, 'currentValue' | 'skillNodes'>): number {
  return normalizeSkillPoints(data.currentValue) - getSpentPoints(data.skillNodes ?? []);
}

export function getLockedPrerequisites(nodes: SkillTreeNode[], node: SkillTreeNode): SkillTreeNode[] {
  return getPrerequisites(nodes, node).filter((prerequisite) => !prerequisite.unlocked);
}

/** The alternatives to choose from while none of them is unlocked yet; empty once one is unlocked or when there are none. */
export function getLockedAlternatives(nodes: SkillTreeNode[], node: SkillTreeNode): SkillTreeNode[] {
  const alternatives = getAlternatives(nodes, node);
  return alternatives.some((alternative) => alternative.unlocked) ? [] : alternatives;
}

/** Describes what still has to be unlocked, e.g. "A and (B or C)". */
export function describeMissingRequirements(nodes: SkillTreeNode[], node: SkillTreeNode): string {
  const nameOf = (item: SkillTreeNode) => item.name || 'a skill';
  const parts = getLockedPrerequisites(nodes, node).map(nameOf);
  const alternatives = getLockedAlternatives(nodes, node).map(nameOf);
  if (alternatives.length > 0) {
    const text = alternatives.join(' or ');
    parts.push(parts.length > 0 && alternatives.length > 1 ? `(${text})` : text);
  }
  return parts.join(' and ');
}

/** Unlocked skills that need this one, which therefore block refunding it. */
export function getUnlockedDependents(nodes: SkillTreeNode[], id: string): SkillTreeNode[] {
  return nodes.filter((node) => {
    if (!node.unlocked || node.id === id) return false;
    if (node.requires.includes(id)) return true;
    if (!node.requiresAny?.includes(id)) return false;
    // Another unlocked alternative keeps the skill satisfied without this one.
    return !getAlternatives(nodes, node).some((alternative) => alternative.id !== id && alternative.unlocked);
  });
}

export function getSkillNodeStatus(nodes: SkillTreeNode[], node: SkillTreeNode, pointsLeft: number, usePoints: boolean): SkillNodeStatus {
  if (node.unlocked) return 'unlocked';
  if (getLockedPrerequisites(nodes, node).length > 0 || getLockedAlternatives(nodes, node).length > 0) return 'locked';
  if (usePoints && normalizeSkillCost(node.cost) > pointsLeft) return 'unaffordable';
  return 'available';
}

function requiresTransitively(nodes: SkillTreeNode[], startId: string, targetId: string): boolean {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const seen = new Set<string>();
  const stack = [startId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = byId.get(id);
    for (const requiredId of node ? getAllRequiredIds(node) : []) {
      if (requiredId === targetId) return true;
      stack.push(requiredId);
    }
  }
  return false;
}

/** Skills that can be required by `id` without creating a cycle. */
export function getSelectablePrerequisites(nodes: SkillTreeNode[], id: string): SkillTreeNode[] {
  return nodes.filter((node) => node.id !== id && !requiresTransitively(nodes, node.id, id));
}

export function removeSkillNode(nodes: SkillTreeNode[], id: string): SkillTreeNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => {
      if (!getAllRequiredIds(node).includes(id)) return node;
      const updated: SkillTreeNode = { ...node, requires: node.requires.filter((requiredId) => requiredId !== id) };
      if (node.requiresAny) updated.requiresAny = node.requiresAny.filter((requiredId) => requiredId !== id);
      return updated;
    });
}

/** Value of the formula-visible fields that are derived from the unlocked skills. */
export function getSkillDerivedValue(data: WidgetData, field: 'skillPointsLeft' | 'skillsUnlocked'): number | undefined {
  if (!data.skillNodes) return undefined;
  return field === 'skillsUnlocked'
    ? data.skillNodes.filter((node) => node.unlocked).length
    : getSkillPointsLeft(data);
}
