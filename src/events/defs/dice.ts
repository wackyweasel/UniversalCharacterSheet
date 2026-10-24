import type { CardTableCard, DiceGroup, Widget, WidgetData } from '../../types';
import { getCardTableBackDesign, getCardTableCards, getCardTableDiscardedCards, normalizeCardTableOrigins } from '../../utils/cardTable';
import { formatDiceExpression, formatDiceRollDetail, formatDiceStep, rollDiceExpression, type DiceExpressionRollResult } from '../../utils/diceExpression';
import { describePoolGroups, evaluatePoolRoll, formatPoolDice, getRollPlan } from '../../utils/dicePool';
import type { DiceResultDie, DiceResultView } from '../../utils/diceResult';
import { resolveDiceExpressionField } from '../../utils/inlineDice';
import { compareValues, findItemIndex, flattenRollDice, formatNumber, isAnyTarget, itemKey, itemOptions, itemTitle, plural, resolveThreshold } from '../helpers';
import { DEFAULT_STEP_DICE_CHAIN } from './numeric';
import type { EffectDef, EffectOutcome, EventOption, EventParamSpec, TargetSpec, TriggerData, TriggerDef, TriggerOutput } from '../types';

const MAX_EXPLOSIONS = 100;

const TOTAL_COMPARE_OPTIONS: EventOption[] = [
  { value: 'atOrAbove', label: 'at least' },
  { value: 'atOrBelow', label: 'at most' },
  { value: 'above', label: 'more than' },
  { value: 'below', label: 'less than' },
  { value: 'equals', label: 'exactly' },
];

const totalCompareText = (value: string | undefined) => TOTAL_COMPARE_OPTIONS.find((option) => option.value === value)?.label ?? 'at least';

const ROLL_PARAMS: EventParamSpec[] = [
  {
    key: 'result',
    label: 'When the roll',
    type: 'select',
    options: [
      { value: 'any', label: 'has any result' },
      { value: 'total', label: 'totals' },
      { value: 'die', label: 'has a die showing' },
    ],
    default: 'any',
  },
  { key: 'compare', label: 'Total is', type: 'select', options: TOTAL_COMPARE_OPTIONS, default: 'atOrAbove', visible: (params) => params.result === 'total' },
  { key: 'threshold', label: 'Total', type: 'formula', default: '10', placeholder: '10 or @dc', visible: (params) => params.result === 'total' },
  { key: 'face', label: 'Die face', type: 'formula', default: '20', placeholder: '20', help: 'Matches when any single die shows this number.', visible: (params) => params.result === 'die' },
];

function describeRollCondition(params: Record<string, string | undefined>): string {
  if (params.result === 'total') return ` totaling ${totalCompareText(params.compare)} ${params.threshold || '?'}`;
  if (params.result === 'die') return ` with a ${params.face || '?'} on a die`;
  return '';
}

const ROLL_OUTPUTS: TriggerOutput[] = [
  { key: 'total', label: 'Total of the roll', type: 'number' },
  { key: 'highest', label: 'Highest die', type: 'number' },
  { key: 'lowest', label: 'Lowest die', type: 'number' },
];

function diceRolledTrigger(kind: string, target?: TargetSpec): TriggerDef {
  return {
    kind,
    label: 'Dice are rolled',
    mode: 'action',
    target,
    params: ROLL_PARAMS,
    outputs: target ? [...ROLL_OUTPUTS, { key: 'trait', label: 'Trait rolled', type: 'text' }] : ROLL_OUTPUTS,
    match: ({ action, params, trigger, labels, widget }) => {
      if (action.kind !== 'roll') return null;
      if (target && !isAnyTarget(trigger.target) && action.target !== trigger.target) return null;
      if (params.result === 'total') {
        if (action.total === undefined) return null;
        const threshold = resolveThreshold(params.threshold, labels());
        if (threshold === null || !compareValues(params.compare, action.total, threshold)) return null;
      } else if (params.result === 'die') {
        const face = resolveThreshold(params.face, labels());
        if (face === null || !(action.dice ?? []).includes(face)) return null;
      }
      const dice = action.dice ?? [];
      const data: TriggerData = dice.length ? { highest: Math.max(...dice), lowest: Math.min(...dice) } : {};
      if (action.total !== undefined) data.total = action.total;
      if (target) {
        const items = widget?.data.stepDiceItems ?? [];
        const index = findItemIndex(items, action.target, (item) => item.name);
        if (index >= 0) data.trait = itemTitle(items[index].name, index, 'Trait');
      }
      const notation = action.text ? `${action.text}` : 'dice';
      return {
        data,
        text: `Rolled ${notation}${action.total !== undefined ? ` = ${formatNumber(action.total)}` : ''}${dice.length ? ` [${dice.join(', ')}]` : ''}`,
      };
    },
    describe: (d) => `${d.target ? `${d.widget} · ${d.target}` : d.widget} is rolled${describeRollCondition(d.params)}`,
  };
}

function expressionOutcome(widgetId: string, title: string, roll: DiceExpressionRollResult, target?: string, source?: string): EffectOutcome {
  return {
    text: `${source ? `${source}: ` : ''}${formatDiceRollDetail(roll)}`,
    rolls: [{ title, subtitle: roll.expression, result: roll }],
    actions: [{ widgetId, kind: 'roll', total: roll.total, dice: flattenRollDice(roll), text: roll.expression, target }],
  };
}

// ----- Dice roller -----

function groupNotation(groups: DiceGroup[], modifier: number): string {
  const parts = groups.map((group) => {
    const notation = group.customFaces?.length
      ? `${group.count > 1 ? `${group.count}× ` : ''}${group.customDiceName || 'custom'}`
      : `${group.count}d${group.faces}`;
    return group.explodes ? `${notation}!` : notation;
  });
  let notation = parts.join(' + ');
  if (modifier !== 0) notation += modifier > 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`;
  return notation;
}

const isNumericFace = (value: string | number) => typeof value === 'number' || (value.trim() !== '' && Number.isFinite(Number(value)));

function rollGroups(widget: Widget, groups: DiceGroup[], modifier: number): EffectOutcome {
  const title = widget.data.label || 'Dice Roller';
  const notation = groupNotation(groups, modifier);
  const chips: DiceResultDie[] = [];
  const numbers: number[] = [];
  const symbols = new Map<string, number>();

  groups.forEach((group, groupIndex) => {
    const customFaces = group.customFaces?.length ? group.customFaces.map(String) : null;
    const size = customFaces ? customFaces.length : Math.max(1, Math.floor(Number(group.faces) || 1));
    const rollOne = (): string | number => (customFaces ? customFaces[Math.floor(Math.random() * size)] : Math.floor(Math.random() * size) + 1);
    const faceList = customFaces ?? Array.from({ length: size }, (_, index) => String(index + 1));
    const numericFaces = faceList.every(isNumericFace) ? faceList.map(Number) : [];
    const explodeOn = group.explodes
      ? (Array.isArray(group.explodeOn) ? group.explodeOn.map(String) : numericFaces.length ? [String(Math.max(...numericFaces))] : [])
      : [];
    const count = Math.max(0, Math.floor(Number(group.count) || 0));
    for (let index = 0; index < count; index++) {
      const sequence = [rollOne()];
      for (let guard = 0; guard < MAX_EXPLOSIONS && explodeOn.includes(String(sequence[sequence.length - 1])); guard++) {
        sequence.push(rollOne());
        if (group.explodeAgain === false) break;
      }
      for (const value of sequence) {
        if (isNumericFace(value)) numbers.push(Number(value));
        else symbols.set(String(value), (symbols.get(String(value)) ?? 0) + 1);
      }
      chips.push({
        value: sequence.map(String).join(' → '),
        faces: size,
        title: customFaces ? group.customDiceName || 'custom' : `d${size}`,
        state: 'plain',
        groupStart: index === 0 && chips.length > 0 && groupIndex > 0,
      });
    }
  });

  const total = numbers.length > 0 || symbols.size === 0 ? numbers.reduce((sum, value) => sum + value, 0) + modifier : undefined;
  const summaryParts = [
    ...(total !== undefined ? [String(total)] : []),
    ...[...symbols.entries()].map(([symbol, count]) => `${count}${symbol}`),
  ];
  const summary = summaryParts.join(' | ') || '—';
  const view: DiceResultView = {
    title,
    subtitle: notation,
    dice: chips,
    modifiers: modifier !== 0 ? [`${modifier < 0 ? '−' : '+'}${Math.abs(modifier)}`] : undefined,
    summary,
    kind: 'neutral',
  };
  return {
    text: `Rolled ${notation} = ${summary}`,
    rolls: [{ title, view }],
    actions: [{ widgetId: widget.id, kind: 'roll', total, dice: numbers, text: notation }],
  };
}

export const rollerRollEffect: EffectDef = {
  kind: 'roller.roll',
  label: 'Roll the dice',
  apply: (ctx) => {
    const widget = ctx.widget;
    if (!widget || widget.type !== 'DICE_ROLLER') return null;
    const modifier = Number(widget.data.modifier) || 0;
    if (widget.data.diceUseExpression === true) {
      const resolved = resolveDiceExpressionField(widget.data.diceExpression ?? '', ctx.labels);
      if (!resolved.terms) return { text: `Couldn't roll: ${resolved.reason}` };
      let expression = formatDiceExpression(resolved.terms);
      if (modifier !== 0) expression += modifier > 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`;
      const roll = rollDiceExpression(expression);
      if (!roll) return { text: `Couldn't roll ${expression}` };
      return expressionOutcome(widget.id, widget.data.label || 'Dice Roller', roll);
    }
    const groups = widget.data.diceGroups ?? [{ count: 1, faces: 20 }];
    if (groups.every((group) => !(Number(group.count) > 0))) return { text: 'No dice to roll' };
    return rollGroups(widget, groups, modifier);
  },
  describe: (d) => `Roll ${d.widget}`,
};

// ----- Step dice -----

const STEP_TARGET: TargetSpec = {
  label: 'Trait',
  options: ({ widget }) => itemOptions(widget?.data.stepDiceItems, (item) => item.name, 'Trait'),
  any: 'Any trait',
};

export const stepDiceRollEffect: EffectDef = {
  kind: 'stepdice.roll',
  label: 'Roll a trait',
  target: { ...STEP_TARGET, any: undefined },
  apply: (ctx) => {
    const widget = ctx.widget;
    if (!widget || widget.type !== 'STEP_DICE') return null;
    const items = widget.data.stepDiceItems ?? [];
    const index = findItemIndex(items, ctx.effect.target, (item) => item.name);
    if (index < 0) return null;
    const item = items[index];
    const chain = widget.data.stepDiceChain?.length ? widget.data.stepDiceChain : DEFAULT_STEP_DICE_CHAIN;
    const step = chain[Math.min(chain.length - 1, Math.max(0, Math.round(item.currentStep) || 0))];
    const roll = rollDiceExpression(formatDiceStep(step));
    if (!roll) return { text: `Couldn't roll ${item.name}` };
    return expressionOutcome(widget.id, item.name || widget.data.label || 'Step Dice', roll, itemKey(item.name, index), item.name);
  },
  describe: (d) => `Roll ${d.widget} · ${d.target || '?'}`,
};

// ----- Dice pool -----

const POOL_OUTCOME_OPTIONS: EventOption[] = [
  { value: 'any', label: 'any outcome' },
  { value: 'success', label: 'a success (or critical)' },
  { value: 'critical', label: 'a critical' },
  { value: 'partial', label: 'a partial success' },
  { value: 'failure', label: 'a failure (or botch)' },
  { value: 'botch', label: 'a botch' },
];

function outcomeMatches(wanted: string | undefined, kind: string | undefined): boolean {
  if (!wanted || wanted === 'any') return true;
  if (wanted === 'success') return kind === 'success' || kind === 'critical';
  if (wanted === 'failure') return kind === 'failure' || kind === 'botch';
  return kind === wanted;
}

export const dicePoolRolledTrigger: TriggerDef = {
  kind: 'dicepool.rolled',
  label: 'The pool is rolled',
  mode: 'action',
  params: [
    { key: 'outcome', label: 'With', type: 'select', options: POOL_OUTCOME_OPTIONS, default: 'any' },
    {
      key: 'successes',
      label: 'At least this many successes',
      type: 'formula',
      default: '',
      placeholder: 'Any number',
      help: 'Only for pools that count successes.',
      visible: (params) => params.outcome === 'any' || params.outcome === 'success' || !params.outcome,
    },
  ],
  outputs: [
    { key: 'successes', label: 'Successes', type: 'number' },
    { key: 'outcome', label: 'Outcome: success, critical, partial, failure or botch', type: 'text' },
    { key: 'highest', label: 'Highest die', type: 'number' },
  ],
  match: ({ action, params, labels }) => {
    if (action.kind !== 'roll' || !outcomeMatches(params.outcome, action.outcome)) return null;
    if (params.successes?.trim()) {
      const needed = resolveThreshold(params.successes, labels());
      if (needed === null || action.successes === undefined || action.successes < needed) return null;
    }
    const dice = action.dice ?? [];
    return {
      data: {
        successes: action.successes ?? 0,
        outcome: action.outcome ?? '',
        ...(dice.length ? { highest: Math.max(...dice) } : {}),
      },
      text: `Rolled ${dice.length ? `[${dice.join(', ')}] → ` : ''}${action.text ?? action.outcome ?? 'a result'}`,
    };
  },
  describe: (d) => {
    const outcome = POOL_OUTCOME_OPTIONS.find((option) => option.value === d.params.outcome);
    const successes = d.params.successes?.trim() ? ` with at least ${d.params.successes} successes` : '';
    return `${d.widget} rolls ${outcome && outcome.value !== 'any' ? outcome.label : 'any outcome'}${successes}`;
  },
};

export const dicePoolRollEffect: EffectDef = {
  kind: 'dicepool.roll',
  label: 'Roll the pool',
  apply: (ctx) => {
    const widget = ctx.widget;
    if (!widget || widget.type !== 'DICE_POOL') return null;
    const data = widget.data;
    const plan = getRollPlan(data);
    if (plan.groups.length === 0) return { text: 'The pool is empty' };
    const rolls = plan.groups.map((group) => Array.from({ length: group.count }, () => Math.floor(Math.random() * group.faces) + 1));
    const outcome = evaluatePoolRoll(data, plan.groups, rolls, plan.keepLowest);
    const title = data.label || 'Dice pool';
    const view: DiceResultView = {
      title,
      subtitle: describePoolGroups(plan.groups),
      dice: outcome.dice.map((die, index) => ({
        value: String(die.value),
        title: `${die.group} (d${die.faces})`,
        faces: die.faces,
        state: die.state === 'miss' ? 'plain' : die.state,
        groupStart: index > 0 && outcome.dice[index - 1].group !== die.group,
      })),
      summary: outcome.summary,
      kind: outcome.kind,
    };
    const components = data.dicePoolComponents ?? [];
    const hasSelection = components.some((component) => component.active) || (Number(data.dicePoolBonus) || 0) !== 0;
    const patch: Partial<WidgetData> | undefined = data.dicePoolClearAfterRoll && hasSelection
      ? { dicePoolComponents: components.map((component) => (component.active ? { ...component, active: false } : component)), dicePoolBonus: 0 }
      : undefined;
    return {
      data: patch,
      text: `${describePoolGroups(plan.groups)}: ${formatPoolDice(outcome)} → ${outcome.summary}`,
      rolls: [{ title, view }],
      actions: [{
        widgetId: widget.id,
        kind: 'roll',
        dice: outcome.dice.map((die) => die.value),
        outcome: outcome.kind,
        successes: outcome.successes,
        text: outcome.summary,
      }],
    };
  },
  describe: (d) => `Roll ${d.widget}`,
};

// ----- Roll table -----

export const rollTableRolledTrigger: TriggerDef = {
  kind: 'rolltable.rolled',
  label: 'The table is rolled',
  mode: 'action',
  params: [{ key: 'text', label: 'Result', type: 'text', default: '', placeholder: 'Any result', help: 'Leave blank to match any result.' }],
  outputs: [
    { key: 'result', label: 'Result rolled', type: 'text' },
    { key: 'results', label: 'All results, when it rolls several', type: 'text' },
  ],
  match: ({ action, params }) => {
    if (action.kind !== 'roll') return null;
    const results = action.results ?? [];
    const wanted = params.text?.trim().toLowerCase();
    const hit = wanted ? results.find((result) => result.trim().toLowerCase() === wanted) : results[0];
    if (hit === undefined) return null;
    return { data: { result: hit, results: results.join(', ') }, text: `Rolled ${results.map((result) => `"${result}"`).join(', ')}` };
  },
  describe: (d) => `${d.widget} rolls ${d.params.text?.trim() ? `"${d.params.text.trim()}"` : 'any result'}`,
};

export const rollTableRollEffect: EffectDef = {
  kind: 'rolltable.roll',
  label: 'Roll the table',
  params: [{ key: 'count', label: 'Results (blank = widget setting)', type: 'amount', default: '', placeholder: 'Widget setting' }],
  apply: (ctx) => {
    const widget = ctx.widget;
    if (!widget || widget.type !== 'ROLL_TABLE') return null;
    const valid = (widget.data.rollTableItems ?? []).filter((item) => item.text.trim() && item.weight > 0);
    if (valid.length === 0) return { text: 'No valid items to roll' };
    const requested = ctx.params.count?.trim() ? ctx.amount('count')?.value : widget.data.rollTableResultCount;
    const count = Math.min(100, Math.max(1, Math.floor(Number(requested) || 1)));
    const allowRepeats = widget.data.rollTableAllowRepeats !== false;
    const available = [...valid];
    const picks: string[] = [];
    const total = Math.min(count, allowRepeats ? count : available.length);
    for (let index = 0; index < total; index++) {
      const pool = allowRepeats ? valid : available;
      const weight = pool.reduce((sum, item) => sum + item.weight, 0);
      let roll = Math.random() * weight;
      let chosen = pool[pool.length - 1];
      for (const item of pool) {
        roll -= item.weight;
        if (roll < 0) {
          chosen = item;
          break;
        }
      }
      picks.push(chosen.text);
      if (!allowRepeats) available.splice(available.indexOf(chosen), 1);
    }
    const title = widget.data.label || 'Roll Table';
    return {
      text: `Rolled: ${picks.map((pick) => `"${pick}"`).join(', ')}`,
      rolls: [{ title, view: { title, subtitle: plural(picks.length, 'result'), dice: [], summary: picks.join(' • '), kind: 'neutral' } }],
      actions: [{ widgetId: widget.id, kind: 'roll', results: picks, text: picks.join(', ') }],
    };
  },
  describe: (d) => `Roll ${d.widget}${d.params.count?.trim() ? ` (${d.params.count} results)` : ''}`,
};

// ----- Deck (legacy) -----

function deckState(data: WidgetData) {
  if (data.deckState) return data.deckState;
  const remaining: string[] = [];
  for (const card of data.deckCards ?? []) {
    if (!card.name.trim()) continue;
    for (let index = 0; index < card.amount; index++) remaining.push(card.name);
  }
  return { remaining, discarded: [] as string[] };
}

const CARD_NAME_FILTER: EventParamSpec = { key: 'name', label: 'Card', type: 'text', default: '', placeholder: 'Any card', help: 'Leave blank to match any card.' };
const nameMatches = (name: string, filter: string | undefined) => !filter?.trim() || name.trim().toLowerCase() === filter.trim().toLowerCase();

export const deckDrawnTrigger: TriggerDef = {
  kind: 'deck.drawn',
  label: 'A card is drawn',
  mode: 'state',
  params: [CARD_NAME_FILTER],
  outputs: [
    { key: 'card', label: 'Card drawn', type: 'text' },
    { key: 'remaining', label: 'Cards left in the deck', type: 'number' },
  ],
  detect: ({ prev, next, params }) => {
    if (!prev || !next || next.type !== 'DECK' || !next.data.deckState) return null;
    const before = deckState(prev.data);
    const after = next.data.deckState;
    if (after.discarded.length !== before.discarded.length + 1 || after.remaining.length !== before.remaining.length - 1) return null;
    const card = after.discarded[after.discarded.length - 1];
    if (!nameMatches(card, params.name)) return null;
    return { data: { card, remaining: after.remaining.length }, text: `Drew "${card}" (${after.remaining.length} remaining)` };
  },
  describe: (d) => `${d.params.name?.trim() ? `"${d.params.name.trim()}"` : 'A card'} is drawn from ${d.widget}`,
};

export const deckShuffledTrigger: TriggerDef = {
  kind: 'deck.shuffled',
  label: 'The deck is reshuffled',
  mode: 'state',
  detect: ({ prev, next }) => (prev?.data.deckState && next && !next.data.deckState ? { text: 'Deck reshuffled' } : null),
  describe: (d) => `${d.widget} is reshuffled`,
};

export const deckDrawEffect: EffectDef = {
  kind: 'deck.draw',
  label: 'Draw a card',
  apply: (ctx) => {
    const widget = ctx.widget;
    if (!widget || widget.type !== 'DECK') return null;
    const state = deckState(widget.data);
    if (state.remaining.length === 0) return { text: 'The deck is empty' };
    const index = Math.floor(Math.random() * state.remaining.length);
    const card = state.remaining[index];
    const remaining = state.remaining.filter((_, cardIndex) => cardIndex !== index);
    return {
      data: { deckState: { remaining, discarded: [...state.discarded, card] } },
      text: `Drew "${card}" (${remaining.length} remaining)`,
    };
  },
  describe: (d) => `Draw a card from ${d.widget}`,
};

export const deckShuffleEffect: EffectDef = {
  kind: 'deck.shuffle',
  label: 'Reshuffle the deck',
  apply: (ctx) => {
    if (!ctx.widget || ctx.widget.type !== 'DECK') return null;
    if (!ctx.widget.data.deckState) return { text: 'The deck is already shuffled' };
    return { data: { deckState: null }, text: 'Deck reshuffled' };
  },
  describe: (d) => `Reshuffle ${d.widget}`,
};

// ----- Deck of cards -----

const cardsOf = (widget: Widget | undefined): CardTableCard[] => (widget?.type === 'DECK_OF_CARDS' ? getCardTableCards(widget.data) : []);
const cardTitle = (card: CardTableCard) => card.title?.trim() || 'Untitled card';

export const cardRevealedTrigger: TriggerDef = {
  kind: 'cards.revealed',
  label: 'A card is revealed',
  mode: 'state',
  params: [CARD_NAME_FILTER],
  outputs: [{ key: 'card', label: 'Card revealed', type: 'text' }],
  detect: ({ prev, next, params }) => {
    const before = new Map(cardsOf(prev).map((card) => [card.id, card]));
    const card = cardsOf(next).find((item) => item.faceUp && before.get(item.id)?.faceUp === false && nameMatches(item.title ?? '', params.name));
    return card ? { data: { card: cardTitle(card) }, text: `Revealed "${cardTitle(card)}"` } : null;
  },
  describe: (d) => `${d.params.name?.trim() ? `"${d.params.name.trim()}"` : 'A card'} is revealed in ${d.widget}`,
};

export const cardArrivedTrigger: TriggerDef = {
  kind: 'cards.arrived',
  label: 'A card is added to the deck',
  mode: 'state',
  params: [CARD_NAME_FILTER],
  outputs: [{ key: 'card', label: 'Card added', type: 'text' }],
  detect: ({ prev, next, params }) => {
    if (!prev) return null;
    const before = new Set(cardsOf(prev).map((card) => card.id));
    const card = cardsOf(next).find((item) => !before.has(item.id) && nameMatches(item.title ?? '', params.name));
    return card ? { data: { card: cardTitle(card) }, text: `"${cardTitle(card)}" was added` } : null;
  },
  describe: (d) => `${d.params.name?.trim() ? `"${d.params.name.trim()}"` : 'A card'} is added to ${d.widget}`,
};

export const cardsShuffledTrigger: TriggerDef = {
  kind: 'cards.shuffled',
  label: 'The deck is shuffled',
  mode: 'action',
  match: ({ action }) => (action.kind === 'shuffle' ? { text: action.text ?? 'Shuffled the deck' } : null),
  describe: (d) => `${d.widget} is shuffled`,
};

export const cardsShuffleEffect: EffectDef = {
  kind: 'cards.shuffle',
  label: 'Shuffle the deck',
  apply: (ctx) => {
    const widget = ctx.widget;
    if (!widget || widget.type !== 'DECK_OF_CARDS') return null;
    const cards = getCardTableCards(widget.data);
    if (cards.length < 2) return { text: 'Not enough cards to shuffle' };
    const shuffled = cards.map((card) => ({ ...card }));
    for (let index = shuffled.length - 1; index > 0; index--) {
      const swap = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
    }
    if (shuffled.every((card, index) => card.id === cards[index].id)) shuffled.push(shuffled.shift()!);
    const text = `Shuffled ${cards.length} cards`;
    return { data: { cardTableCards: shuffled }, text, actions: [{ widgetId: widget.id, kind: 'shuffle', text }] };
  },
  describe: (d) => `Shuffle ${d.widget}`,
};

export const cardsFlipEffect: EffectDef = {
  kind: 'cards.flipAll',
  label: 'Reveal or hide all cards',
  params: [{
    key: 'face',
    label: 'Turn every card',
    type: 'select',
    options: [{ value: 'up', label: 'face up' }, { value: 'down', label: 'face down' }],
    default: 'up',
  }],
  apply: (ctx) => {
    const widget = ctx.widget;
    if (!widget || widget.type !== 'DECK_OF_CARDS') return null;
    const faceUp = ctx.params.face !== 'down';
    const cards = getCardTableCards(widget.data);
    if (!cards.some((card) => card.faceUp !== faceUp)) return { text: `All cards are already face ${faceUp ? 'up' : 'down'}` };
    return {
      data: { cardTableCards: cards.map((card) => (card.faceUp === faceUp ? card : { ...card, faceUp })) },
      text: faceUp ? 'Revealed all cards' : 'Hid all cards',
    };
  },
  describe: (d) => `Turn ${d.widget} face ${d.params.face === 'down' ? 'down' : 'up'}`,
};

const discardedOf = (widget: Widget | undefined): CardTableCard[] => (widget?.type === 'DECK_OF_CARDS' ? getCardTableDiscardedCards(widget.data) : []);
const describeCardFilter = (name: string | undefined) => (name?.trim() ? `"${name.trim()}"` : 'A card');

export const cardDiscardedTrigger: TriggerDef = {
  kind: 'cards.discarded',
  label: 'A card is discarded',
  mode: 'state',
  params: [CARD_NAME_FILTER],
  outputs: [
    { key: 'card', label: 'Card discarded', type: 'text' },
    { key: 'count', label: 'Cards discarded at once', type: 'number' },
    { key: 'discarded', label: 'Cards in the discard pile', type: 'number' },
  ],
  detect: ({ prev, next, params }) => {
    if (!prev) return null;
    const before = new Set(discardedOf(prev).map((card) => card.id));
    const pile = discardedOf(next);
    const added = pile.filter((card) => !before.has(card.id) && nameMatches(card.title ?? '', params.name));
    if (added.length === 0) return null;
    return {
      data: { card: cardTitle(added[0]), count: added.length, discarded: pile.length },
      text: added.length === 1 ? `Discarded "${cardTitle(added[0])}"` : `Discarded ${added.length} cards`,
    };
  },
  describe: (d) => `${describeCardFilter(d.params.name)} is discarded in ${d.widget}`,
};

export const cardReturnedTrigger: TriggerDef = {
  kind: 'cards.returned',
  label: 'Discarded cards come back',
  mode: 'state',
  params: [CARD_NAME_FILTER],
  outputs: [
    { key: 'card', label: 'Card brought back', type: 'text' },
    { key: 'count', label: 'Cards brought back', type: 'number' },
  ],
  detect: ({ prev, next, params }) => {
    if (!prev) return null;
    const pile = new Set(discardedOf(next).map((card) => card.id));
    const inDeck = new Set(cardsOf(next).map((card) => card.id));
    const back = discardedOf(prev).filter((card) => !pile.has(card.id) && inDeck.has(card.id) && nameMatches(card.title ?? '', params.name));
    if (back.length === 0) return null;
    return {
      data: { card: cardTitle(back[0]), count: back.length },
      text: back.length === 1 ? `"${cardTitle(back[0])}" came back from the discard pile` : `${back.length} cards came back from the discard pile`,
    };
  },
  describe: (d) => `${d.params.name?.trim() ? `"${d.params.name.trim()}" comes` : 'Discarded cards come'} back to ${d.widget}`,
};

// Cards in the form the card table stores them before they move between piles.
function cardPiles(widget: Widget) {
  const back = getCardTableBackDesign(widget.data);
  return {
    cards: normalizeCardTableOrigins(getCardTableCards(widget.data), widget.id, back, `${widget.id}-card`),
    discarded: normalizeCardTableOrigins(getCardTableDiscardedCards(widget.data), widget.id, back, `${widget.id}-discarded-card`),
  };
}

export const cardsRevealTopEffect: EffectDef = {
  kind: 'cards.revealTop',
  label: 'Reveal the top card',
  apply: (ctx) => {
    const widget = ctx.widget;
    if (!widget || widget.type !== 'DECK_OF_CARDS') return null;
    const cards = getCardTableCards(widget.data);
    const top = cards[0];
    if (!top) return { text: 'There are no cards' };
    if (top.faceUp) return { text: `"${cardTitle(top)}" is already face up` };
    return {
      data: { cardTableCards: [{ ...top, faceUp: true }, ...cards.slice(1)], cardTableSpots: undefined },
      text: `Revealed "${cardTitle(top)}"`,
    };
  },
  describe: (d) => `Reveal the top card of ${d.widget}`,
};

export const cardsDiscardTopEffect: EffectDef = {
  kind: 'cards.discardTop',
  label: 'Discard the top card',
  apply: (ctx) => {
    const widget = ctx.widget;
    if (!widget || widget.type !== 'DECK_OF_CARDS') return null;
    const { cards, discarded } = cardPiles(widget);
    const top = cards[0];
    if (!top) return { text: 'There are no cards to discard' };
    return {
      data: { cardTableCards: cards.slice(1), cardTableDiscardedCards: [{ ...top }, ...discarded], cardTableSpots: undefined },
      text: `Discarded "${cardTitle(top)}"`,
    };
  },
  describe: (d) => `Discard the top card of ${d.widget}`,
};

export const cardsDiscardAllEffect: EffectDef = {
  kind: 'cards.discardAll',
  label: 'Discard all cards',
  apply: (ctx) => {
    const widget = ctx.widget;
    if (!widget || widget.type !== 'DECK_OF_CARDS') return null;
    const { cards, discarded } = cardPiles(widget);
    if (cards.length === 0) return { text: 'There are no cards to discard' };
    return {
      data: { cardTableCards: [], cardTableDiscardedCards: [...cards, ...discarded], cardTableSpots: undefined },
      text: `Discarded ${plural(cards.length, 'card')}`,
    };
  },
  describe: (d) => `Discard all cards of ${d.widget}`,
};

const RESTORE_POSITIONS: EventOption[] = [
  { value: 'top', label: 'on top of the deck' },
  { value: 'bottom', label: 'at the bottom of the deck' },
  { value: 'random', label: 'shuffled into the deck' },
];

export const cardsRestoreEffect: EffectDef = {
  kind: 'cards.restore',
  label: 'Bring back discarded cards',
  params: [
    {
      key: 'which',
      label: 'Bring back',
      type: 'select',
      options: [{ value: 'all', label: 'every discarded card' }, { value: 'last', label: 'the last discarded card' }],
      default: 'all',
    },
    { key: 'position', label: 'Put them', type: 'select', options: RESTORE_POSITIONS, default: 'top' },
  ],
  apply: (ctx) => {
    const widget = ctx.widget;
    if (!widget || widget.type !== 'DECK_OF_CARDS') return null;
    const { cards, discarded } = cardPiles(widget);
    if (discarded.length === 0) return { text: 'The discard pile is empty' };
    const back = ctx.params.which === 'last' ? discarded.slice(0, 1) : discarded;
    const rest = discarded.slice(back.length);
    let next: CardTableCard[];
    if (ctx.params.position === 'bottom') next = [...cards, ...back];
    else if (ctx.params.position === 'random') {
      next = [...cards];
      for (const card of back) next.splice(Math.floor(Math.random() * (next.length + 1)), 0, card);
    } else next = [...back, ...cards];
    const where = RESTORE_POSITIONS.find((option) => option.value === ctx.params.position)?.label ?? RESTORE_POSITIONS[0].label;
    return {
      data: { cardTableCards: next, cardTableDiscardedCards: rest, cardTableSpots: undefined },
      text: `${back.length === 1 ? `Put "${cardTitle(back[0])}"` : `Put ${back.length} discarded cards`} back ${where}`,
    };
  },
  describe: (d) => {
    const where = RESTORE_POSITIONS.find((option) => option.value === d.params.position)?.label ?? RESTORE_POSITIONS[0].label;
    return `Put ${d.params.which === 'last' ? 'the last discarded card' : 'the discarded cards'} of ${d.widget} back ${where}`;
  },
};

// ----- Dice tray -----

export const trayRollEffect: EffectDef = {
  kind: 'tray.roll',
  label: 'Roll dice',
  params: [
    { key: 'dice', label: 'Dice', type: 'dice', default: '1d20', placeholder: '2d6 or 1d20 + @str', help: 'Any dice expression; labels are allowed.' },
    {
      key: 'modifier',
      label: "The tray's modifier",
      type: 'select',
      options: [{ value: 'yes', label: 'Add it' }, { value: 'no', label: 'Leave it out' }],
      default: 'yes',
    },
  ],
  apply: (ctx) => {
    const widget = ctx.widget;
    if (!widget || widget.type !== 'DICE_TRAY') return null;
    const resolved = resolveDiceExpressionField(ctx.params.dice ?? '', ctx.labels);
    if (!resolved.terms) return { text: `Couldn't roll: ${resolved.reason}` };
    let expression = formatDiceExpression(resolved.terms);
    const modifier = ctx.params.modifier === 'no' ? 0 : Number(widget.data.modifier) || 0;
    if (modifier !== 0) expression += modifier > 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`;
    const roll = rollDiceExpression(expression);
    if (!roll) return { text: `Couldn't roll ${expression}` };
    return expressionOutcome(widget.id, widget.data.label || 'Dice Tray', roll);
  },
  describe: (d) => `Roll ${d.params.dice || '?'} in ${d.widget}`,
};

export const DICE_ROLLED_TRIGGER = diceRolledTrigger('dice.rolled');
export const STEP_DICE_ROLLED_TRIGGER = diceRolledTrigger('stepdice.rolled', STEP_TARGET);
export const ROLLER_EFFECTS = [rollerRollEffect];
export const STEP_DICE_EFFECTS = [stepDiceRollEffect];
export const DICE_POOL_TRIGGERS = [dicePoolRolledTrigger];
export const DICE_POOL_EFFECTS = [dicePoolRollEffect];
export const ROLL_TABLE_TRIGGERS = [rollTableRolledTrigger];
export const ROLL_TABLE_EFFECTS = [rollTableRollEffect];
export const DECK_TRIGGERS = [deckDrawnTrigger, deckShuffledTrigger];
export const DECK_EFFECTS = [deckDrawEffect, deckShuffleEffect];
export const CARD_TRIGGERS = [cardRevealedTrigger, cardArrivedTrigger, cardDiscardedTrigger, cardReturnedTrigger, cardsShuffledTrigger];
export const CARD_EFFECTS = [cardsRevealTopEffect, cardsDiscardTopEffect, cardsDiscardAllEffect, cardsRestoreEffect, cardsShuffleEffect, cardsFlipEffect];
export const TRAY_EFFECTS = [trayRollEffect];
