import { describe, expect, it } from 'vitest';
import type { CharacterEventEffect, CharacterEventStep } from '../types';
import {
  conditionNodeId,
  cutAfterEnd,
  effectNodeId,
  END_NODE_ID,
  hasStepsAfter,
  insertCondition,
  layoutEventGraph,
  moveEffect,
  removeCondition,
  shiftEffect,
  tidySteps,
  TRIGGER_NODE_ID,
  type BranchSection,
  type GraphSlot,
} from './graph';
import { END_EVENT_KIND } from './constants';

const effect = (id: string): CharacterEventEffect => ({ id, kind: 'log.message' });
const effects = (...ids: string[]) => ids.map(effect);
const step = (id: string, effectIds: string[], condition?: string, otherwise?: string[]): CharacterEventStep => ({
  id,
  ...(condition !== undefined ? { condition } : {}),
  effects: effects(...effectIds),
  ...(otherwise ? { otherwise: effects(...otherwise) } : {}),
});
/** A step with steps nested on its "yes" side and, when given, on its "no" side. */
const nest = (outer: CharacterEventStep, yes: CharacterEventStep[], no?: CharacterEventStep[]): CharacterEventStep => (
  { ...outer, steps: yes, ...(no ? { otherwiseSteps: no } : {}) }
);

/** Steps as `condition? effects {nested steps} / otherwise {nested steps}`, to compare shapes without ids. */
const shape = (steps: CharacterEventStep[]): string[] => steps.map((item) => {
  const side = (list: CharacterEventEffect[], nested?: CharacterEventStep[]) => (
    [list.map((entry) => entry.id).join(','), nested ? `{${shape(nested).join('; ')}}` : ''].filter(Boolean).join(' ')
  );
  return [
    item.condition === undefined ? '' : `${item.condition}? `,
    side(item.effects, item.steps),
    item.otherwise || item.otherwiseSteps ? ` / ${side(item.otherwise ?? [], item.otherwiseSteps)}` : '',
  ].join('');
});

const listSlot = (stepId: string, section: BranchSection, index: number): GraphSlot => ({ kind: 'list', stepId, section, index });
const nestedGap = (stepId: string, section: BranchSection, index: number): GraphSlot => ({ kind: 'gap', index, branch: { stepId, section } });

describe('tidySteps', () => {
  it('joins neighbouring steps without a condition and drops empty ones', () => {
    const steps = [step('a', ['1']), step('b', []), step('c', ['2']), step('d', ['3'], '@x'), step('e', ['4'])];
    expect(shape(tidySteps(steps))).toEqual(['1,2', '@x? 3', '4']);
  });

  it('always leaves a step, and leaves tidy steps untouched', () => {
    expect(shape(tidySteps([step('a', [])]))).toEqual(['']);
    const tidy = [step('a', ['1']), nest(step('b', [], '@x'), [step('c', ['2'], '@y'), step('d', ['3'])])];
    expect(tidySteps(tidy)).toBe(tidy);
  });

  it('tidies nested steps too, and starts each side with its own effects', () => {
    const steps = [nest(
      step('a', ['1'], '@x'),
      [step('b', ['2']), step('c', ['3'], '@y'), step('d', []), step('e', ['4']), step('f', ['5'])],
      [step('g', [])],
    )];
    const tidy = tidySteps(steps);
    expect(shape(tidy)).toEqual(['@x? 1,2 {@y? 3; 4,5}']);
    expect(tidy[0]).not.toHaveProperty('otherwiseSteps');
  });
});

describe('insertCondition', () => {
  it('makes the effects that follow it what runs when it is true', () => {
    const added = insertCondition([step('a', ['1', '2', '3'])], listSlot('a', 'effects', 1));
    expect(shape(added!.steps)).toEqual(['1', '? 2,3']);
    expect(added!.steps[1].id).toBe(added!.stepId);
  });

  it('adds an empty condition between two steps', () => {
    const added = insertCondition([step('a', ['1'], '@x'), step('b', ['2'], '@y')], { kind: 'gap', index: 1 });
    expect(shape(added!.steps)).toEqual(['@x? 1', '? ', '@y? 2']);
  });

  it('nests a condition in a side, ahead of the steps already nested there', () => {
    const steps = [nest(step('a', ['1', '2'], '@x', ['4']), [step('b', ['3'], '@y')])];
    expect(shape(insertCondition(steps, listSlot('a', 'effects', 1))!.steps)).toEqual(['@x? 1 {? 2; @y? 3} / 4']);
    expect(shape(insertCondition(steps, listSlot('a', 'otherwise', 0))!.steps)).toEqual(['@x? 1,2 {@y? 3} / {? 4}']);
  });

  it('adds a condition where an empty event or an empty "yes" side shows its placeholder', () => {
    expect(shape(insertCondition([step('a', [])], listSlot('a', 'effects', 0))!.steps)).toEqual(['? ']);
    expect(shape(insertCondition([step('a', [], '@x')], listSlot('a', 'effects', 0))!.steps)).toEqual(['@x? {? }']);
  });

  it('adds a condition after a nested one, and inside a nested run of effects', () => {
    const steps = [nest(step('a', ['1'], '@x'), [step('b', ['2'], '@y'), step('c', ['3', '4'])])];
    expect(shape(insertCondition(steps, nestedGap('a', 'effects', 1))!.steps)).toEqual(['@x? 1 {@y? 2; ? ; 3,4}']);
    expect(shape(insertCondition(steps, listSlot('c', 'effects', 1))!.steps)).toEqual(['@x? 1 {@y? 2; 3; ? 4}']);
  });
});

describe('moveEffect', () => {
  it('moves an effect later in its own list', () => {
    expect(shape(moveEffect([step('a', ['1', '2', '3'])], '1', listSlot('a', 'effects', 3)))).toEqual(['2,3,1']);
  });

  it('moves an effect to the other branch of its condition', () => {
    expect(shape(moveEffect([step('a', ['1', '2'], '@x')], '2', listSlot('a', 'otherwise', 0)))).toEqual(['@x? 1 / 2']);
  });

  it('moves an effect between two conditions, and tidies the step it left', () => {
    const steps = [step('a', ['1']), step('b', ['2'], '@x'), step('c', ['3'], '@y')];
    expect(shape(moveEffect(steps, '1', { kind: 'gap', index: 2 }))).toEqual(['@x? 2', '1', '@y? 3']);
  });

  it('moves an effect into a nested side, and out of one to after its condition', () => {
    const steps = [step('a', ['1']), nest(step('b', ['2'], '@x'), [step('c', ['3'], '@y')])];
    expect(shape(moveEffect(steps, '1', listSlot('c', 'otherwise', 0)))).toEqual(['@x? 2 {@y? 3 / 1}']);
    expect(shape(moveEffect(steps, '3', nestedGap('b', 'effects', 1)))).toEqual(['1', '@x? 2 {@y? ; 3}']);
  });

  it('changes nothing for the slots next to the effect', () => {
    const steps = [step('a', ['1', '2'])];
    expect(moveEffect(steps, '1', listSlot('a', 'effects', 1))).toBe(steps);
  });
  it('refuses a move that would put effects after an End', () => {
    const end: CharacterEventEffect = { id: 'e', kind: END_EVENT_KIND };
    const steps = [{ id: 'a', effects: [effect('1'), end, effect('2')] }];
    expect(shiftEffect(steps, 'e', -1)).toBe(steps);
    const open = [{ id: 'a', effects: [effect('1'), effect('2'), end] }];
    expect(moveEffect(open, '1', listSlot('a', 'effects', 3))).toBe(open);
    expect(shiftEffect(open, '1', 1)).not.toBe(open);
  });
});

describe('removeCondition', () => {
  it('keeps the effects, drops the otherwise ones and joins the main line', () => {
    const steps = [step('a', ['1']), step('b', ['2'], '@x', ['3']), step('c', ['4'])];
    expect(shape(removeCondition(steps, 'b'))).toEqual(['1,2,4']);
  });

  it('leaves what was nested on its "yes" side on the line it was on', () => {
    const steps = [nest(step('a', ['1'], '@x'), [nest(step('b', ['2'], '@y', ['9']), [step('c', ['3'], '@z')]), step('d', ['4'])])];
    expect(shape(removeCondition(steps, 'b'))).toEqual(['@x? 1,2 {@z? 3; 4}']);
    expect(shape(removeCondition(steps, 'a'))).toEqual(['1', '@y? 2 {@z? 3} / 9', '4']);
  });
});

describe('hasStepsAfter', () => {
  it('counts what follows the conditions a step is nested in', () => {
    const nested = nest(step('a', ['1'], '@x'), [step('b', ['2'], '@y')]);
    expect(hasStepsAfter([nested], 'b')).toBe(false);
    expect(hasStepsAfter([nested, step('c', ['3'])], 'b')).toBe(true);
  });
});

describe('cutAfterEnd', () => {
  const end = { id: 'x', kind: 'event.end' };
  const withEnd = (id: string, before: string[], after: string[], condition?: string) => (
    { ...step(id, [], condition), effects: [...effects(...before), end, ...effects(...after)] }
  );

  it('drops the effects, nested steps and later steps that can never run', () => {
    const steps = [nest(withEnd('a', ['1'], ['2']), [step('n', ['3'])]), step('b', ['4'])];
    expect(shape(cutAfterEnd(steps))).toEqual(['1,x']);
  });

  it('keeps what runs when only one side of a condition ends, and cuts after both end', () => {
    const one = [withEnd('a', ['1'], ['2'], '@x'), step('b', ['3'])];
    expect(shape(cutAfterEnd(one))).toEqual(['@x? 1,x', '3']);
    const both = [{ ...withEnd('a', [], [], '@x'), otherwise: [effect('y'), end] }, step('b', ['3'])];
    expect(shape(cutAfterEnd(both))).toEqual(['@x? x / y,x']);
  });

  it('leaves the steps alone when nothing follows an End', () => {
    const steps = [step('a', ['1'], '@x'), withEnd('b', ['2'], [])];
    expect(cutAfterEnd(steps)).toBe(steps);
  });
});

describe('layoutEventGraph', () => {
  const slotOf = (steps: CharacterEventStep[], source: string, target: string) => (
    layoutEventGraph(steps).edges.find((edge) => edge.source === source && edge.target === target)?.slot
  );

  it('gives every link of a line a slot', () => {
    const steps = [step('a', ['1']), step('b', ['2'], '@x', ['3'])];
    expect(slotOf(steps, TRIGGER_NODE_ID, effectNodeId('1'))).toEqual(listSlot('a', 'effects', 0));
    // Before a condition, what is added joins the effects that precede it.
    expect(slotOf(steps, effectNodeId('1'), conditionNodeId('b'))).toEqual(listSlot('a', 'effects', 1));
    expect(slotOf(steps, conditionNodeId('b'), effectNodeId('2'))).toEqual(listSlot('b', 'effects', 0));
    expect(slotOf(steps, conditionNodeId('b'), effectNodeId('3'))).toEqual(listSlot('b', 'otherwise', 0));
    expect(slotOf(steps, 'join:b', END_NODE_ID)).toEqual({ kind: 'gap', index: 2 });
  });

  it('gives the links of a nested line slots in that line', () => {
    const steps = [nest(step('a', ['1'], '@x'), [step('b', ['2'], '@y'), step('c', ['3'], '@z'), step('d', ['4'])])];
    expect(slotOf(steps, effectNodeId('1'), conditionNodeId('b'))).toEqual(listSlot('a', 'effects', 1));
    expect(slotOf(steps, 'join:b', conditionNodeId('c'))).toEqual(nestedGap('a', 'effects', 1));
    expect(slotOf(steps, 'join:c', effectNodeId('4'))).toEqual(listSlot('d', 'effects', 0));
    expect(slotOf(steps, effectNodeId('4'), 'join:a')).toEqual(listSlot('d', 'effects', 1));
    // With no effects of its own, a side starts at the first condition nested in it.
    const bare = [nest(step('a', [], '@x'), [step('b', ['2'], '@y')])];
    expect(slotOf(bare, conditionNodeId('a'), conditionNodeId('b'))).toEqual(listSlot('a', 'effects', 0));
    expect(layoutEventGraph(bare).nodes.some((node) => node.kind === 'add')).toBe(false);
  });

  it('links an empty "no" side around the "yes" side, with a slot to fill it', () => {
    const around = layoutEventGraph([step('a', ['1'], '@x')]).edges.find((edge) => edge.shape === 'around');
    expect(around).toMatchObject({ source: conditionNodeId('a'), target: 'join:a', slot: listSlot('a', 'otherwise', 0) });
  });

  it('ends the "no" side at a stop only when something follows', () => {
    const stopping = { ...step('a', ['1'], '@x'), stopIfFalse: true };
    const hasStop = (steps: CharacterEventStep[]) => layoutEventGraph(steps).nodes.some((node) => node.kind === 'stop');
    expect(hasStop([stopping])).toBe(false);
    expect(hasStop([stopping, step('b', ['2'])])).toBe(true);
    expect(hasStop([nest(step('c', ['3'], '@y'), [stopping])])).toBe(false);
    expect(hasStop([nest(step('c', ['3'], '@y'), [stopping]), step('b', ['2'])])).toBe(true);
  });

  it('draws nothing after an End effect: no link, no "+", no end node', () => {
    const steps = [{ id: 'a', effects: [effect('1'), { id: 'x', kind: 'event.end' }] }];
    const { nodes, edges } = layoutEventGraph(steps);
    expect(nodes.map((node) => node.id)).toEqual([TRIGGER_NODE_ID, effectNodeId('1'), effectNodeId('x')]);
    expect(edges.map((edge) => edge.target)).toEqual([effectNodeId('1'), effectNodeId('x')]);
    expect(edges.every((edge) => edge.source !== effectNodeId('x'))).toBe(true);
  });

  it('joins the sides of a condition only while one of them goes on', () => {
    const end = { id: 'x', kind: 'event.end' };
    const oneEnds = [{ ...step('a', [], '@x'), effects: [end] }, step('b', ['2'])];
    const graph = layoutEventGraph(oneEnds);
    expect(graph.edges.some((edge) => edge.target === 'join:a' && edge.source === effectNodeId('x'))).toBe(false);
    expect(graph.edges.some((edge) => edge.target === 'join:a' && edge.shape === 'around')).toBe(true);
    const bothEnd = [{ ...step('a', [], '@x'), effects: [end], otherwise: [{ id: 'y', kind: 'event.end' }] }, step('b', ['2'])];
    const stopped = layoutEventGraph(bothEnd);
    expect(stopped.nodes.some((node) => node.id === 'join:a' || node.id === END_NODE_ID || node.id === effectNodeId('2'))).toBe(false);
  });

  it('runs to the right when asked, with the "no" side under the "yes" side', () => {
    const { nodes } = layoutEventGraph([step('a', ['1'], '@x', ['2'])], 'right');
    const at = (id: string) => nodes.find((node) => node.id === id)!;
    const line = [TRIGGER_NODE_ID, conditionNodeId('a'), effectNodeId('1'), 'join:a', END_NODE_ID].map(at);
    expect(line.map((node) => node.y + node.height / 2)).toEqual([0, 0, 0, 0, 0]);
    expect(line.every((node, index) => index === 0 || node.x > line[index - 1].x + line[index - 1].width)).toBe(true);
    expect(at(effectNodeId('2')).x).toBe(at(effectNodeId('1')).x);
    expect(at(effectNodeId('2')).y).toBeGreaterThan(at(effectNodeId('1')).y + at(effectNodeId('1')).height);
  });

  it.each(['down', 'right'] as const)('places nodes without overlap in a flow that runs %s, and keeps links that go around a side clear of it', (direction) => {
    const steps = [
      step('a', ['1', '2']),
      nest(
        { ...step('b', ['3'], '@x', ['4', '5', '6']), stopIfFalse: true },
        [nest(step('e', ['8'], '@z', ['9']), [step('f', ['10'], '@w')], [step('g', ['11'], '@v', ['12'])]), step('h', ['13'])],
        [step('i', ['14'], '@u'), step('j', ['15'])],
      ),
      step('c', [], '@y'),
      step('d', ['7']),
    ];
    const { nodes, edges } = layoutEventGraph(steps, direction);
    const overlaps = nodes.flatMap((first, index) => nodes.slice(index + 1).filter((second) => (
      first.x < second.x + second.width && second.x < first.x + first.width && first.y < second.y + second.height && second.y < first.y + first.height
    )));
    expect(overlaps).toEqual([]);

    // Where a node starts along the flow, and the room it takes across it.
    const span = (node: (typeof nodes)[number]) => (
      direction === 'down' ? { start: node.y, near: node.x, far: node.x + node.width } : { start: node.x, near: node.y, far: node.y + node.height }
    );
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const crossed = edges.filter((edge) => edge.shape === 'around').flatMap((edge) => {
      const from = span(byId.get(edge.source)!).start;
      const to = span(byId.get(edge.target)!).start;
      return nodes
        .filter((node) => span(node).start > from && span(node).start < to && span(node).near < edge.via! && span(node).far > edge.via!)
        .map((node) => `${edge.id} over ${node.id}`);
    });
    expect(crossed).toEqual([]);
  });
});
