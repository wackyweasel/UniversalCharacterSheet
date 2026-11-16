import { describe, expect, it } from 'vitest';
import type { CharacterEventEffect, CharacterEventStep } from '../types';
import {
  conditionNodeId,
  effectNodeId,
  END_NODE_ID,
  insertCondition,
  layoutEventGraph,
  moveEffect,
  removeCondition,
  tidySteps,
  TRIGGER_NODE_ID,
  type GraphSlot,
} from './graph';

const effect = (id: string): CharacterEventEffect => ({ id, kind: 'log.message' });
const effects = (...ids: string[]) => ids.map(effect);
const step = (id: string, effectIds: string[], condition?: string, otherwise?: string[]): CharacterEventStep => ({
  id,
  ...(condition !== undefined ? { condition } : {}),
  effects: effects(...effectIds),
  ...(otherwise ? { otherwise: effects(...otherwise) } : {}),
});

/** Steps as `condition? [effects] / [otherwise]`, to compare shapes without ids. */
const shape = (steps: CharacterEventStep[]) => steps.map((item) => [
  item.condition === undefined ? '' : `${item.condition}? `,
  item.effects.map((entry) => entry.id).join(','),
  item.otherwise ? ` / ${item.otherwise.map((entry) => entry.id).join(',')}` : '',
].join(''));

const listSlot = (stepId: string, section: 'effects' | 'otherwise', index: number, trunk = false): GraphSlot => ({ kind: 'list', stepId, section, index, trunk });

describe('tidySteps', () => {
  it('joins neighbouring steps without a condition and drops empty ones', () => {
    const steps = [step('a', ['1']), step('b', []), step('c', ['2']), step('d', ['3'], '@x'), step('e', ['4'])];
    expect(shape(tidySteps(steps))).toEqual(['1,2', '@x? 3', '4']);
  });

  it('always leaves a step, and leaves tidy steps untouched', () => {
    expect(shape(tidySteps([step('a', [])]))).toEqual(['']);
    const tidy = [step('a', ['1']), step('b', [], '@x')];
    expect(tidySteps(tidy)).toBe(tidy);
  });
});

describe('insertCondition', () => {
  it('makes the effects that follow it what runs when it is true', () => {
    const added = insertCondition([step('a', ['1', '2', '3'])], listSlot('a', 'effects', 1, true));
    expect(shape(added!.steps)).toEqual(['1', '? 2,3']);
    expect(added!.steps[1].id).toBe(added!.stepId);
  });

  it('adds an empty condition between two steps', () => {
    const added = insertCondition([step('a', ['1'], '@x'), step('b', ['2'], '@y')], { kind: 'gap', index: 1 });
    expect(shape(added!.steps)).toEqual(['@x? 1', '? ', '@y? 2']);
  });

  it('refuses a slot inside a branch', () => {
    expect(insertCondition([step('a', ['1'], '@x')], listSlot('a', 'effects', 1))).toBeNull();
  });
});

describe('moveEffect', () => {
  it('moves an effect later in its own list', () => {
    expect(shape(moveEffect([step('a', ['1', '2', '3'])], '1', listSlot('a', 'effects', 3, true)))).toEqual(['2,3,1']);
  });

  it('moves an effect to the other branch of its condition', () => {
    expect(shape(moveEffect([step('a', ['1', '2'], '@x')], '2', listSlot('a', 'otherwise', 0)))).toEqual(['@x? 1 / 2']);
  });

  it('moves an effect between two conditions, and tidies the step it left', () => {
    const steps = [step('a', ['1']), step('b', ['2'], '@x'), step('c', ['3'], '@y')];
    expect(shape(moveEffect(steps, '1', { kind: 'gap', index: 2 }))).toEqual(['@x? 2', '1', '@y? 3']);
  });

  it('changes nothing for the slots next to the effect', () => {
    const steps = [step('a', ['1', '2'])];
    expect(moveEffect(steps, '1', listSlot('a', 'effects', 1, true))).toBe(steps);
  });
});

describe('removeCondition', () => {
  it('keeps the effects, drops the otherwise ones and joins the main line', () => {
    const steps = [step('a', ['1']), step('b', ['2'], '@x', ['3']), step('c', ['4'])];
    expect(shape(removeCondition(steps, 'b'))).toEqual(['1,2,4']);
  });
});

describe('layoutEventGraph', () => {
  const slotOf = (steps: CharacterEventStep[], source: string, target: string) => (
    layoutEventGraph(steps).edges.find((edge) => edge.source === source && edge.target === target)?.slot
  );

  it('offers conditions on the main line only', () => {
    const steps = [step('a', ['1']), step('b', ['2'], '@x', ['3'])];
    expect(slotOf(steps, TRIGGER_NODE_ID, effectNodeId('1'))).toEqual(listSlot('a', 'effects', 0, true));
    // Before a condition, what is added joins the effects that precede it.
    expect(slotOf(steps, effectNodeId('1'), conditionNodeId('b'))).toEqual(listSlot('a', 'effects', 1, true));
    expect(slotOf(steps, conditionNodeId('b'), effectNodeId('2'))).toEqual(listSlot('b', 'effects', 0));
    expect(slotOf(steps, conditionNodeId('b'), effectNodeId('3'))).toEqual(listSlot('b', 'otherwise', 0));
    expect(slotOf(steps, 'join:b', END_NODE_ID)).toEqual({ kind: 'gap', index: 2 });
  });

  it('links an empty "no" side around the effects, with a slot to fill it', () => {
    const around = layoutEventGraph([step('a', ['1'], '@x')]).edges.find((edge) => edge.shape === 'around');
    expect(around).toMatchObject({ source: conditionNodeId('a'), target: 'join:a', slot: listSlot('a', 'otherwise', 0) });
  });

  it('ends the "no" side at a stop only when something follows', () => {
    const stopping = { ...step('a', ['1'], '@x'), stopIfFalse: true };
    expect(layoutEventGraph([stopping]).nodes.some((node) => node.kind === 'stop')).toBe(false);
    expect(layoutEventGraph([stopping, step('b', ['2'])]).nodes.some((node) => node.kind === 'stop')).toBe(true);
  });

  it('places nodes without overlap', () => {
    const steps = [step('a', ['1', '2']), { ...step('b', ['3'], '@x', ['4', '5', '6']), stopIfFalse: true }, step('c', [], '@y'), step('d', ['7'])];
    const { nodes } = layoutEventGraph(steps);
    const overlaps = nodes.flatMap((first, index) => nodes.slice(index + 1).filter((second) => (
      first.x < second.x + second.width && second.x < first.x + first.width && first.y < second.y + second.height && second.y < first.y + first.height
    )));
    expect(overlaps).toEqual([]);
  });
});
