import { describe, expect, it } from 'vitest';
import type { Character, SkillTreeNode, Widget } from '../types';
import { buildDependencyGraph, collectLabels, getAvailableLabels, resolveCharacterFormulas } from './formulaEngine';
import {
  getSelectablePrerequisites,
  getSkillConnectorPath,
  getSkillDerivedValue,
  getSkillNodeStatus,
  getSkillPointsLeft,
  getSkillTiers,
  getSpentPoints,
  getUnlockedDependents,
  layoutSkillTree,
  removeSkillNode,
  SKILL_NODE_HEIGHT,
  SKILL_NODE_WIDTH,
  SKILL_TREE_PADDING,
} from './skillTree';

const node = (id: string, requires: string[] = [], overrides: Partial<SkillTreeNode> = {}): SkillTreeNode => ({
  id, name: id, cost: 1, requires, unlocked: false, ...overrides,
});

const tree = [
  node('a'),
  node('b', ['a']),
  node('c', ['a'], { cost: 2 }),
  node('d', ['b', 'c'], { cost: 3 }),
];

describe('skill tree layout', () => {
  it('puts each skill one tier after its deepest prerequisite', () => {
    expect([...getSkillTiers(tree)]).toEqual([['a', 0], ['b', 1], ['c', 1], ['d', 2]]);
  });

  it('ignores missing and cyclic requirements', () => {
    const tiers = getSkillTiers([node('a', ['b']), node('b', ['a']), node('c', ['missing', 'c'])]);
    expect(tiers.get('c')).toBe(0);
    expect(tiers.size).toBe(3);
  });

  it('lays tiers out left to right and centers the narrower ones', () => {
    const { positions, width, height } = layoutSkillTree(tree, 'horizontal');
    expect(positions.get('a')).toMatchObject({ x: SKILL_TREE_PADDING, tier: 0 });
    expect(positions.get('b')!.x).toBeGreaterThan(positions.get('a')!.x + SKILL_NODE_WIDTH);
    expect(positions.get('b')!.x).toBe(positions.get('c')!.x);
    expect(positions.get('b')!.y).toBeLessThan(positions.get('c')!.y);
    const middle = (positions.get('b')!.y + positions.get('c')!.y) / 2;
    expect(positions.get('a')!.y).toBe(middle);
    expect(width).toBeGreaterThan(positions.get('d')!.x + SKILL_NODE_WIDTH);
    expect(height).toBeGreaterThan(positions.get('c')!.y + SKILL_NODE_HEIGHT);
  });

  it('swaps the axes for a vertical tree', () => {
    const horizontal = layoutSkillTree(tree, 'horizontal').positions;
    const vertical = layoutSkillTree(tree, 'vertical').positions;
    expect(vertical.get('b')!.y).toBeGreaterThan(vertical.get('a')!.y);
    expect(vertical.get('b')!.y).toBe(vertical.get('c')!.y);
    expect(vertical.get('b')!.x).toBeLessThan(vertical.get('c')!.x);
    expect(horizontal.get('a')).not.toEqual(vertical.get('a'));
  });

  it('mirrors the vertical tree for a bottom-to-top tree', () => {
    const down = layoutSkillTree(tree, 'vertical');
    const up = layoutSkillTree(tree, 'bottom-up');
    expect(up.height).toBe(down.height);
    expect(up.positions.get('a')!.y).toBeGreaterThan(up.positions.get('b')!.y);
    expect(up.positions.get('b')!.y).toBeGreaterThan(up.positions.get('d')!.y);
    expect(up.positions.get('a')!.y).toBe(up.height - SKILL_TREE_PADDING - SKILL_NODE_HEIGHT);
    expect(up.positions.get('b')!.x).toBe(down.positions.get('b')!.x);
    const path = getSkillConnectorPath(up.positions.get('a')!, up.positions.get('b')!, 'bottom-up');
    expect(path.startsWith(`M ${up.positions.get('a')!.x + SKILL_NODE_WIDTH / 2} ${up.positions.get('a')!.y} `)).toBe(true);
    expect(path.endsWith(`${up.positions.get('b')!.y + SKILL_NODE_HEIGHT}`)).toBe(true);
  });

  it('orders a tier by where its prerequisites sit', () => {
    const { positions } = layoutSkillTree([node('r1'), node('r2'), node('x', ['r2']), node('y', ['r1'])], 'horizontal');
    expect(positions.get('y')!.y).toBeLessThan(positions.get('x')!.y);
  });

  it('handles an empty tree', () => {
    expect(layoutSkillTree([])).toEqual({ positions: new Map(), width: 0, height: 0 });
  });

  it('connects the right edge of a prerequisite to the left edge of a skill', () => {
    const { positions } = layoutSkillTree(tree, 'horizontal');
    const path = getSkillConnectorPath(positions.get('a')!, positions.get('b')!, 'horizontal');
    expect(path.startsWith(`M ${positions.get('a')!.x + SKILL_NODE_WIDTH} `)).toBe(true);
    expect(path.endsWith(`${positions.get('b')!.x} ${positions.get('b')!.y + SKILL_NODE_HEIGHT / 2}`)).toBe(true);
  });
});

describe('skill tree rules', () => {
  const unlockedA = tree.map((item) => (item.id === 'a' ? { ...item, unlocked: true } : item));

  it('reports locked, unaffordable, available and unlocked skills', () => {
    expect(getSkillNodeStatus(tree, tree[0], 1, true)).toBe('available');
    expect(getSkillNodeStatus(tree, tree[1], 5, true)).toBe('locked');
    expect(getSkillNodeStatus(unlockedA, unlockedA[2], 1, true)).toBe('unaffordable');
    expect(getSkillNodeStatus(unlockedA, unlockedA[2], 1, false)).toBe('available');
    expect(getSkillNodeStatus(unlockedA, unlockedA[0], 0, true)).toBe('unlocked');
  });

  it('requires every prerequisite', () => {
    const onlyB = unlockedA.map((item) => (item.id === 'b' ? { ...item, unlocked: true } : item));
    expect(getSkillNodeStatus(onlyB, onlyB[3], 9, true)).toBe('locked');
    const both = onlyB.map((item) => (item.id === 'c' ? { ...item, unlocked: true } : item));
    expect(getSkillNodeStatus(both, both[3], 9, true)).toBe('available');
  });

  it('counts spent points and points left', () => {
    const spent = unlockedA.map((item) => (item.id === 'c' ? { ...item, unlocked: true } : item));
    expect(getSpentPoints(spent)).toBe(3);
    expect(getSkillPointsLeft({ currentValue: 5, skillNodes: spent })).toBe(2);
    expect(getSkillPointsLeft({ currentValue: 1, skillNodes: spent })).toBe(-2);
  });

  it('blocks refunding a skill that unlocked skills still need', () => {
    const chain = unlockedA.map((item) => (item.id === 'b' ? { ...item, unlocked: true } : item));
    expect(getUnlockedDependents(chain, 'a').map((item) => item.id)).toEqual(['b']);
    expect(getUnlockedDependents(chain, 'b')).toEqual([]);
  });

  it('only offers prerequisites that cannot create a cycle', () => {
    expect(getSelectablePrerequisites(tree, 'a')).toEqual([]);
    expect(getSelectablePrerequisites(tree, 'b').map((item) => item.id)).toEqual(['a', 'c']);
    expect(getSelectablePrerequisites(tree, 'd').map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('removes a skill from the requirements of the others', () => {
    const removed = removeSkillNode(tree, 'b');
    expect(removed.map((item) => item.id)).toEqual(['a', 'c', 'd']);
    expect(removed.find((item) => item.id === 'd')!.requires).toEqual(['c']);
  });
});

function characterWith(...widgets: Widget[]): Character {
  return { id: 'character', name: 'Test', activeSheetId: 'sheet', sheets: [{ id: 'sheet', name: 'Main', widgets }] };
}

function skillWidget(data: Widget['data']): Widget {
  return {
    id: 'skills', type: 'SKILL_TREE', x: 0, y: 0,
    data: { label: 'Talents', currentValue: 4, skillNodes: [node('a', [], { unlocked: true, unlockedLabel: 'has_a' }), node('b', ['a'], { cost: 2 })], ...data },
  };
}

describe('skill tree formulas', () => {
  it('exposes unlocked states, points left and the unlocked count', () => {
    const character = characterWith(skillWidget({ fieldLabels: { currentValue: 'points', skillPointsLeft: 'points_left', skillsUnlocked: 'unlocked' } }));
    expect(collectLabels(character)).toMatchObject({ has_a: 1, points: 4, points_left: 3, unlocked: 1 });
    expect(getAvailableLabels(character)).toEqual(expect.arrayContaining([
      { label: 'has_a', value: 1, widgetLabel: 'Talents', sheetName: 'Main' },
      { label: 'points_left', value: 3, widgetLabel: 'Talents', sheetName: 'Main' },
    ]));
    expect(getSkillDerivedValue({ skillNodes: [] }, 'skillsUnlocked')).toBe(0);
    expect(getSkillDerivedValue({}, 'skillsUnlocked')).toBeUndefined();
  });

  it('lets a formula set the total points and keeps it whole and non-negative', () => {
    const source: Widget = { id: 'level', type: 'NUMBER', x: 0, y: 0, data: { numberItems: [{ name: 'Level', value: 3, valueLabel: 'level' }] } };
    const character = characterWith(source, skillWidget({ fieldFormulas: { currentValue: '@level * 2 - 7.4' } }));
    const resolved = resolveCharacterFormulas(character)!;
    expect(resolved.sheets[0].widgets[1].data.currentValue).toBe(0);
    expect(resolveCharacterFormulas(resolved)).toBeNull();
    const richer = characterWith({ ...source, data: { numberItems: [{ name: 'Level', value: 5, valueLabel: 'level' }] } }, skillWidget({ fieldFormulas: { currentValue: '@level + 1' } }));
    expect(resolveCharacterFormulas(richer)!.sheets[0].widgets[1].data.currentValue).toBe(6);
  });

  it('registers derived labels in the dependency graph', () => {
    const character = characterWith(skillWidget({
      fieldLabels: { currentValue: 'points', skillPointsLeft: 'points_left' },
      fieldFormulas: { currentValue: '2' },
    }));
    expect(buildDependencyGraph(character)).toMatchObject({ points_left: expect.arrayContaining(['points', 'has_a']) });
  });
});
