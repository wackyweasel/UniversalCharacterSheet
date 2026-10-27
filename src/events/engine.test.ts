import { describe, expect, it } from 'vitest';
import type { CardTableCard, Character, CharacterEvent as StepEvent, CharacterEventEffect, Widget } from '../types';
import { MAX_CHAIN_DEPTH, interpolateText, runEvents } from './engine';
import { createEventDraft, createTextButtonDraft, getEventSourceWidgets } from './drafts';
import { findInlineButtonNames, TEXT_BUTTON_KIND } from './defs/textButton';
import { patchWidgetData } from './helpers';
import { writeLabelValue } from './labelWriter';
import {
  describeEffect,
  describeTrigger,
  getAllEffectDefs,
  getAllTriggerDefs,
  getEventProblems,
  getEventLabelsAt,
  getWidgetEventDefs,
} from './registry';
import { normalizeEvent, type StoredCharacterEvent } from './steps';

// Most fixtures use the one-step shorthand (a condition and effects), which `normalizeEvent` turns into a step.
type CharacterEvent = Omit<StoredCharacterEvent, 'steps' | 'effects'> & { effects: CharacterEventEffect[] };

const health: Widget = {
  id: 'w-hp',
  type: 'HEALTH_BAR',
  x: 0,
  y: 0,
  data: { label: 'Health', currentValue: 20, maxValue: 20 },
};

const bloodied: Widget = {
  id: 'w-bloodied',
  type: 'TOGGLE',
  x: 0,
  y: 0,
  data: { label: 'Bloodied', toggleState: false },
};

const stats: Widget = {
  id: 'w-stats',
  type: 'NUMBER_DISPLAY',
  x: 0,
  y: 0,
  data: {
    label: 'Stats',
    displayNumbers: [
      { label: 'Strength', value: 14, valueLabel: 'str' },
      { label: 'Bonus', value: 2, valueLabel: 'str_mod', valueFormula: 'floor((@str - 10) / 2)' },
    ],
  },
};

const bag: Widget = {
  id: 'w-bag',
  type: 'INVENTORY',
  x: 0,
  y: 0,
  data: { label: 'Bag', inventoryItems: [] },
};

const purse: Widget = {
  id: 'w-purse',
  type: 'WALLET',
  x: 0,
  y: 0,
  data: { label: 'Purse', walletCurrencies: [{ name: 'gp', amount: 5, rate: 1 }] },
};

const roller: Widget = {
  id: 'w-roller',
  type: 'DICE_ROLLER',
  x: 0,
  y: 0,
  data: { label: 'Attack', diceGroups: [{ count: 1, faces: 20 }] },
};

function character(widgets: Widget[], events: (CharacterEvent | StepEvent)[], variables: Character['variables'] = []): Character {
  return {
    id: 'c1',
    name: 'Hero',
    activeSheetId: 's1',
    sheets: [{ id: 's1', name: 'Main', widgets }],
    variables,
    events: events.map(normalizeEvent),
  };
}

function widgetData(hero: Character, id: string) {
  return hero.sheets.flatMap((sheet) => sheet.widgets).find((widget) => widget.id === id)!.data;
}

const bloodiedEvent: CharacterEvent = {
  id: 'e-bloodied',
  enabled: true,
  trigger: { kind: 'value.crosses', widgetId: 'w-hp', target: 'current', params: { compare: 'below', threshold: '50%' } },
  effects: [{ id: 'f1', kind: 'switch.set', widgetId: 'w-bloodied', params: { state: 'on' } }],
};

describe('event engine', () => {
  it('fires when health drops below half and turns on a switch', () => {
    const before = character([health, bloodied], [bloodiedEvent]);
    const after = patchWidgetData(before, 'w-hp', { currentValue: 8 });
    const result = runEvents({ before, after });

    expect(widgetData(result.character, 'w-bloodied').toggleState).toBe(true);
    expect(result.firings).toHaveLength(1);
    expect(result.firings[0].trigger).toContain('Current HP');
    expect(result.firings[0].effects[0].text).toBe('Bloodied turns on');
  });

  it('does not fire when the threshold was already crossed or the event is disabled', () => {
    const hurt = patchWidgetData(character([health, bloodied], [bloodiedEvent]), 'w-hp', { currentValue: 8 });
    expect(runEvents({ before: hurt, after: patchWidgetData(hurt, 'w-hp', { currentValue: 6 }) }).firings).toHaveLength(0);

    const disabled = character([health, bloodied], [{ ...bloodiedEvent, enabled: false }]);
    expect(runEvents({ before: disabled, after: patchWidgetData(disabled, 'w-hp', { currentValue: 8 }) }).firings).toHaveLength(0);
  });

  it('skips the effects when the condition is false and exposes the new value', () => {
    const event: CharacterEvent = { ...bloodiedEvent, condition: '@event_value < 5' };
    const before = character([health, bloodied], [event]);
    const result = runEvents({ before, after: patchWidgetData(before, 'w-hp', { currentValue: 8 }) });
    expect(result.firings[0].conditionFailed).toBe(true);
    expect(widgetData(result.character, 'w-bloodied').toggleState).toBe(false);

    const deeper = runEvents({ before, after: patchWidgetData(before, 'w-hp', { currentValue: 3 }) });
    expect(deeper.firings[0].conditionFailed).toBeUndefined();
    expect(widgetData(deeper.character, 'w-bloodied').toggleState).toBe(true);
  });

  it('reacts to label changes, writes labels and re-resolves formulas', () => {
    const event: CharacterEvent = {
      id: 'e-str',
      enabled: true,
      trigger: { kind: 'label.changed', target: 'str', params: { direction: 'up' } },
      effects: [{ id: 'f1', kind: 'label.add', target: 'xp', params: { amount: '@event_change * 10' } }],
    };
    const before = character([stats], [event], [{ id: 'v1', label: 'xp', value: 0 }]);
    const after = writeLabelValue(before, 'str', 16)!;
    const result = runEvents({ before, after });

    expect(result.character.variables?.[0].value).toBe(20);
    expect(result.firings[0].effects[0].text).toBe('@xp 0 → 20 (+20)');
  });

  it('chains events and fires each event once to stop loops', () => {
    const ping: CharacterEvent = {
      id: 'e-ping',
      enabled: true,
      trigger: { kind: 'label.changed', target: 'a', params: { direction: 'any' } },
      effects: [{ id: 'f1', kind: 'label.add', target: 'b', params: { amount: '1' } }],
    };
    const pong: CharacterEvent = {
      id: 'e-pong',
      enabled: true,
      trigger: { kind: 'label.changed', target: 'b', params: { direction: 'any' } },
      effects: [{ id: 'f1', kind: 'label.add', target: 'a', params: { amount: '1' } }],
    };
    const before = character([], [ping, pong], [{ id: 'v1', label: 'a', value: 0 }, { id: 'v2', label: 'b', value: 0 }]);
    const after = writeLabelValue(before, 'a', 1)!;
    const result = runEvents({ before, after });

    expect(result.firings.map((firing) => [firing.eventId, firing.depth])).toEqual([['e-ping', 0], ['e-pong', 1]]);
    expect(result.character.variables?.map((variable) => variable.value)).toEqual([2, 1]);
    expect(result.truncated).toBe(false);
  });

  it('cuts very long chains', () => {
    const count = MAX_CHAIN_DEPTH + 3;
    const variables = Array.from({ length: count + 1 }, (_, index) => ({ id: `v${index}`, label: `n${index}`, value: 0 }));
    const events: CharacterEvent[] = Array.from({ length: count }, (_, index) => ({
      id: `e${index}`,
      enabled: true,
      trigger: { kind: 'label.changed', target: `n${index}` },
      effects: [{ id: 'f', kind: 'label.add', target: `n${index + 1}`, params: { amount: '1' } }],
    }));
    const before = character([], events, variables);
    const result = runEvents({ before, after: writeLabelValue(before, 'n0', 1)! });
    expect(result.firings).toHaveLength(MAX_CHAIN_DEPTH);
    expect(result.truncated).toBe(true);
  });

  it('adds money when an item is added to the inventory', () => {
    const event: CharacterEvent = {
      id: 'e-loot',
      enabled: true,
      trigger: { kind: 'inventory.added', widgetId: 'w-bag', params: { name: 'gem' } },
      effects: [{ id: 'f1', kind: 'wallet.add', widgetId: 'w-purse', target: 'gp', params: { amount: '50' } }],
    };
    const before = character([bag, purse], [event]);
    const other = patchWidgetData(before, 'w-bag', { inventoryItems: [{ id: 'i1', name: 'Rope', fields: [] }] });
    expect(runEvents({ before, after: other }).firings).toHaveLength(0);

    const gem = patchWidgetData(before, 'w-bag', { inventoryItems: [{ id: 'i2', name: 'Gem', fields: [] }] });
    const result = runEvents({ before, after: gem });
    expect(widgetData(result.character, 'w-purse').walletCurrencies?.[0].amount).toBe(55);
  });

  it('matches dice roll actions and writes interpolated messages', () => {
    const event: CharacterEvent = {
      id: 'e-crit',
      enabled: true,
      trigger: { kind: 'dice.rolled', widgetId: 'w-roller', params: { result: 'die', face: '20' } },
      effects: [{ id: 'f1', kind: 'log.message', params: { message: 'Critical! Rolled {@event_total} with STR {@str}' } }],
    };
    const before = character([roller, stats], [event]);
    const miss = runEvents({ before, after: before, actions: [{ widgetId: 'w-roller', kind: 'roll', total: 12, dice: [12] }] });
    expect(miss.firings).toHaveLength(0);

    const hit = runEvents({ before, after: before, actions: [{ widgetId: 'w-roller', kind: 'roll', total: 20, dice: [20], text: '1d20' }] });
    expect(hit.firings).toHaveLength(1);
    expect(hit.firings[0].effects[0]).toMatchObject({ text: 'Critical! Rolled 20 with STR 14', skipped: false });
  });

  it('passes the roll total and its highest and lowest dice to the event', () => {
    const event: CharacterEvent = {
      id: 'e-roll',
      enabled: true,
      trigger: { kind: 'dice.rolled', widgetId: 'w-roller' },
      effects: [
        { id: 'f1', kind: 'label.add', target: 'xp', params: { amount: '@event_total' } },
        { id: 'f2', kind: 'log.message', params: { message: 'High {@event_highest}, low {@event_lowest}' } },
      ],
    };
    const before = character([roller], [event], [{ id: 'v1', label: 'xp', value: 0 }]);
    const result = runEvents({ before, after: before, actions: [{ widgetId: 'w-roller', kind: 'roll', total: 10, dice: [3, 5] }] });
    expect(result.character.variables?.[0].value).toBe(10);
    expect(result.firings[0].effects[1].text).toBe('High 5, low 3');
  });

  it('passes the damage taken and the health left to the condition and effects', () => {
    const event: CharacterEvent = {
      id: 'e-hit',
      enabled: true,
      trigger: { kind: 'health.damaged', widgetId: 'w-hp' },
      condition: '@event_damage >= 5',
      effects: [{ id: 'f1', kind: 'log.message', params: { message: 'Took {@event_damage}, {@event_hp}/{@event_max_hp} left' } }],
    };
    const before = character([health], [event]);
    const big = runEvents({ before, after: patchWidgetData(before, 'w-hp', { currentValue: 12 }) });
    expect(big.firings[0].effects[0].text).toBe('Took 8, 12/20 left');

    const small = runEvents({ before, after: patchWidgetData(before, 'w-hp', { currentValue: 18 }) });
    expect(small.firings[0].conditionFailed).toBe(true);
  });

  it('gives trigger data its empty value when an event is run by hand', () => {
    const event: CharacterEvent = {
      id: 'e-hit',
      enabled: true,
      trigger: { kind: 'health.damaged', widgetId: 'w-hp' },
      effects: [{ id: 'f1', kind: 'log.message', params: { message: 'Took {@event_damage}' } }],
    };
    const before = character([health], [event]);
    const result = runEvents({ before, after: before, manualEventId: 'e-hit' });
    expect(result.firings[0].effects[0].text).toBe('Took 0');
  });

  it('passes how much time passed and how many days began when the calendar moves', () => {
    const at = (day: number, hour: number) => Date.UTC(2024, 0, day, hour) / 1000;
    const calendar: Widget = { id: 'w-cal', type: 'CALENDAR', x: 0, y: 0, data: { label: 'Calendar', calendarMode: 'gregorian', calendarTime: at(1, 8) } };
    const events: CharacterEvent[] = [
      {
        id: 'e-time',
        enabled: true,
        trigger: { kind: 'calendar.advanced', widgetId: 'w-cal' },
        effects: [{ id: 'f1', kind: 'log.message', params: { message: '{@event_hours}h {@event_minutes}m {floor(@event_days)}d' } }],
      },
      {
        id: 'e-day',
        enabled: true,
        trigger: { kind: 'calendar.newPeriod', widgetId: 'w-cal', params: { unit: 'day' } },
        effects: [{ id: 'f1', kind: 'log.message', params: { message: '{@event_count} new days' } }],
      },
    ];
    const before = character([calendar], events);
    const result = runEvents({ before, after: patchWidgetData(before, 'w-cal', { calendarTime: at(4, 9) }) });
    expect(result.firings.map((firing) => firing.effects[0].text)).toEqual(['73h 4380m 3d', '3 new days']);
  });

  it('watches the level of an experience widget and passes the levels gained', () => {
    const xp: Widget = {
      id: 'w-xp',
      type: 'XP_LEVEL',
      x: 0,
      y: 0,
      data: { label: 'Experience', currentValue: 250, xpLevels: [{ id: 'l1', xp: 0 }, { id: 'l2', xp: 300 }, { id: 'l3', xp: 900 }, { id: 'l4', xp: 2700 }] },
    };
    const event: CharacterEvent = {
      id: 'e-level',
      enabled: true,
      trigger: { kind: 'value.changed', widgetId: 'w-xp', target: 'level', params: { direction: 'up' } },
      effects: [{ id: 'f1', kind: 'log.message', params: { message: 'Level {@event_before} → {@event_value} (+{@event_change})' } }],
    };
    const before = character([xp], [event]);
    expect(getEventProblems(before, normalizeEvent(event))).toEqual([]);

    expect(runEvents({ before, after: patchWidgetData(before, 'w-xp', { currentValue: 280 }) }).firings).toHaveLength(0);
    const result = runEvents({ before, after: patchWidgetData(before, 'w-xp', { currentValue: 1000 }) });
    expect(result.firings[0].trigger).toContain('Level 1 → 3');
    expect(result.firings[0].effects[0].text).toBe('Level 1 → 3 (+2)');

    const effectTargets = getWidgetEventDefs('XP_LEVEL').effects.flatMap((def) => def.target?.options({ character: before, widget: xp }) ?? []);
    expect(effectTargets.some((option) => option.value === 'level')).toBe(false);
  });

  it('runs the events of an event button when that button is pressed', () => {
    const button: Widget = { id: 'w-wind', type: 'EVENT_BUTTON', x: 0, y: 0, data: { label: 'Second Wind', buttonText: 'Second Wind' } };
    const other: Widget = { id: 'w-other', type: 'EVENT_BUTTON', x: 0, y: 0, data: { label: 'Rage' } };
    const event: CharacterEvent = {
      id: 'e-wind',
      enabled: true,
      trigger: { kind: 'button.pressed', widgetId: 'w-wind' },
      effects: [{ id: 'f1', kind: 'value.add', widgetId: 'w-hp', target: 'current', params: { amount: '5' } }],
    };
    const before = character([button, other, { ...health, data: { ...health.data, currentValue: 10 } }], [event]);

    expect(describeTrigger(before, event.trigger)).toBe('Second Wind is pressed');
    expect(createEventDraft(before, button).trigger).toEqual({ kind: 'button.pressed', widgetId: 'w-wind' });

    const elsewhere = runEvents({ before, after: before, actions: [{ widgetId: 'w-other', kind: 'press' }] });
    expect(elsewhere.firings).toHaveLength(0);

    const pressed = runEvents({ before, after: before, actions: [{ widgetId: 'w-wind', kind: 'press' }] });
    expect(widgetData(pressed.character, 'w-hp').currentValue).toBe(15);
    expect(pressed.firings[0]).toMatchObject({ trigger: 'Button pressed', depth: 0 });
  });

  it('runs the events of a {[Name]} button written in a widget text', () => {
    const notes: Widget = {
      id: 'w-notes',
      type: 'TEXT',
      x: 0,
      y: 0,
      data: { label: 'Notes', richText: '<p>Use {[Second Wind]} or {[Rage]} &amp; {{[Escaped]}}</p><p>{[second  wind]}</p>' },
    };
    const plain: Widget = { id: 'w-plain', type: 'TEXT', x: 0, y: 0, data: { label: 'Plain', text: 'No buttons here' } };
    const table: Widget = { id: 'w-table', type: 'TABLE', x: 0, y: 0, data: { label: 'Table', rows: [{ cells: ['{[Dodge]}'] }] } };
    const event: CharacterEvent = {
      id: 'e-wind',
      enabled: true,
      trigger: { kind: TEXT_BUTTON_KIND, widgetId: 'w-notes', target: 'Second Wind' },
      effects: [{ id: 'f1', kind: 'value.add', widgetId: 'w-hp', target: 'current', params: { amount: '5' } }],
    };
    const before = character([notes, plain, table, { ...health, data: { ...health.data, currentValue: 10 } }], [event]);

    expect(findInlineButtonNames(notes.data)).toEqual(['Second Wind', 'Rage']);
    expect(findInlineButtonNames(table.data)).toEqual(['Dodge']);
    expect(describeTrigger(before, event.trigger)).toBe('Second Wind in Notes is pressed');
    expect(createTextButtonDraft(notes, 'Rage')).toMatchObject({
      name: 'Rage',
      trigger: { kind: TEXT_BUTTON_KIND, widgetId: 'w-notes', target: 'Rage' },
    });
    expect(createEventDraft(before, plain).trigger.kind).not.toBe(TEXT_BUTTON_KIND);
    const triggerSources = getEventSourceWidgets(before, 'trigger').flatMap((group) => group.widgets.map((widget) => widget.id));
    expect(triggerSources).toEqual(expect.arrayContaining(['w-notes', 'w-table']));
    expect(triggerSources).not.toContain('w-plain');
    expect(getEventSourceWidgets(before, 'trigger', 'w-plain').flatMap((group) => group.widgets.map((widget) => widget.id))).toContain('w-plain');

    const otherButton = runEvents({ before, after: before, actions: [{ widgetId: 'w-notes', kind: 'press', target: 'Rage' }] });
    expect(otherButton.firings).toHaveLength(0);

    const pressed = runEvents({ before, after: before, actions: [{ widgetId: 'w-notes', kind: 'press', target: 'second  WIND' }] });
    expect(widgetData(pressed.character, 'w-hp').currentValue).toBe(15);
    expect(pressed.firings[0]).toMatchObject({ trigger: 'second  WIND pressed', depth: 0 });
  });

  it('runs an event by hand, ignoring its trigger and enabled switch', () => {
    const event: CharacterEvent = {
      id: 'e-manual',
      enabled: false,
      trigger: { kind: 'manual' },
      effects: [
        { id: 'f1', kind: 'value.subtract', widgetId: 'w-hp', target: 'current', params: { amount: '25' } },
        { id: 'f2', kind: 'dice.roll', params: { dice: '2d6', title: 'Fear' } },
      ],
    };
    const before = character([health], [event, bloodiedEvent]);
    const result = runEvents({ before, after: before, manualEventId: 'e-manual' });
    expect(widgetData(result.character, 'w-hp').currentValue).toBe(0);
    expect(result.firings[0]).toMatchObject({ manual: true, depth: 0 });
    expect(result.rolls).toHaveLength(1);
    expect(result.rolls[0].title).toBe('Fear');
  });

  it('runs other events right away, once each, and explains when it cannot', () => {
    const helper: CharacterEvent = {
      id: 'e-helper',
      name: 'Gain XP',
      enabled: true,
      trigger: { kind: 'manual' },
      effects: [{ id: 'f1', kind: 'label.add', target: 'xp', params: { amount: '5' } }],
    };
    const off: CharacterEvent = { ...helper, id: 'e-off', name: 'Sleeping', enabled: false };
    const main: CharacterEvent = {
      id: 'e-main',
      name: 'Level up',
      enabled: true,
      trigger: { kind: 'manual' },
      effects: [
        { id: 'f1', kind: 'event.run', target: 'e-helper' },
        { id: 'f2', kind: 'log.message', params: { message: 'XP is {@xp}' } },
        { id: 'f3', kind: 'event.run', target: 'e-helper' },
        { id: 'f4', kind: 'event.run', target: 'e-off' },
        { id: 'f5', kind: 'event.run', target: 'e-gone' },
      ],
    };
    const before = character([], [main, helper, off], [{ id: 'v1', label: 'xp', value: 0 }]);
    const result = runEvents({ before, after: before, manualEventId: 'e-main' });

    expect(result.character.variables?.[0].value).toBe(5);
    expect(result.firings.map((firing) => [firing.eventId, firing.depth, firing.trigger])).toEqual([
      ['e-main', 0, 'Run by hand'],
      ['e-helper', 1, 'Run by "Level up"'],
    ]);
    expect(result.firings[0].effects.map((effect) => [effect.text, effect.skipped])).toEqual([
      ['Run "Gain XP"', false],
      ['XP is 5', false],
      ['Can\'t run: "Gain XP" already ran', true],
      ['Can\'t run: "Sleeping" is turned off', true],
      ['Can\'t run: the event was deleted', true],
    ]);
    expect(describeEffect(before, main.effects[0])).toBe('Run "Gain XP"');
    expect(describeEffect(before, main.effects[4])).toBe('Run a deleted event');
    expect(getEventProblems(before, normalizeEvent(main))).toEqual(['Effect 5: Event no longer exists']);
  });

  it('discards cards and brings them back, with a trigger for each', () => {
    const card = (id: string, title: string): CardTableCard => ({ id, title, symbol: '', body: '', faceUp: false });
    const table: Widget = { id: 'w-cards', type: 'DECK_OF_CARDS', x: 0, y: 0, data: { label: 'Fate', cardTableCards: [card('c1', 'Tower'), card('c2', 'Sun')] } };
    const discard: CharacterEvent = {
      id: 'e-discard',
      enabled: true,
      trigger: { kind: 'manual' },
      effects: [{ id: 'f1', kind: 'cards.revealTop', widgetId: 'w-cards' }, { id: 'f2', kind: 'cards.discardTop', widgetId: 'w-cards' }],
    };
    const discarded: CharacterEvent = {
      id: 'e-discarded',
      enabled: true,
      trigger: { kind: 'cards.discarded', widgetId: 'w-cards' },
      effects: [{ id: 'f1', kind: 'log.message', params: { message: '{@event_card}, {@event_discarded} in the pile' } }],
    };
    const before = character([table], [discard, discarded]);
    const result = runEvents({ before, after: before, manualEventId: 'e-discard' });
    const data = widgetData(result.character, 'w-cards');
    expect(data.cardTableCards?.map((item) => item.id)).toEqual(['c2']);
    expect(data.cardTableDiscardedCards?.map((item) => [item.id, item.faceUp])).toEqual([['c1', true]]);
    expect(result.firings[0].effects.map((effect) => effect.text)).toEqual(['Fate: Revealed "Tower"', 'Fate: Discarded "Tower"']);
    expect(result.firings[1].effects[0].text).toBe('Tower, 1 in the pile');

    const restore: CharacterEvent = {
      id: 'e-restore',
      enabled: true,
      trigger: { kind: 'manual' },
      effects: [{ id: 'f1', kind: 'cards.restore', widgetId: 'w-cards', params: { which: 'all', position: 'bottom' } }],
    };
    const returned: CharacterEvent = {
      id: 'e-returned',
      enabled: true,
      trigger: { kind: 'cards.returned', widgetId: 'w-cards' },
      effects: [{ id: 'f1', kind: 'log.message', params: { message: '{@event_card} x{@event_count}' } }],
    };
    const later = { ...result.character, events: [restore, returned].map(normalizeEvent) };
    const back = runEvents({ before: later, after: later, manualEventId: 'e-restore' });
    expect(widgetData(back.character, 'w-cards').cardTableCards?.map((item) => item.id)).toEqual(['c2', 'c1']);
    expect(widgetData(back.character, 'w-cards').cardTableDiscardedCards).toEqual([]);
    expect(back.firings[0].effects[0].text).toBe('Fate: Put "Tower" back at the bottom of the deck');
    expect(back.firings[1].effects[0].text).toBe('Tower x1');
  });

  it('cycles menus, reacts to a chosen option and writes text fields', () => {
    const status: Widget = {
      id: 'w-mixed',
      type: 'MIXED_FIELDS',
      x: 0,
      y: 0,
      data: {
        label: 'Status',
        mixedFields: [
          { name: 'Stance', type: 'menu', value: 'Calm', options: ['Calm', 'Angry', 'Frenzied'] },
          { name: 'Note', type: 'text', value: '' },
          { name: 'Title', type: 'text', value: 'Hero', valueFormula: '"Hero"' },
        ],
      },
    };
    const cycle: CharacterEvent = {
      id: 'e-cycle',
      enabled: true,
      trigger: { kind: 'manual' },
      effects: [{ id: 'f1', kind: 'mixedMenu.set', widgetId: 'w-mixed', target: 'Stance', params: { option: '__next' } }],
    };
    const angry: CharacterEvent = {
      id: 'e-angry',
      enabled: true,
      trigger: { kind: 'mixedMenu.changed', widgetId: 'w-mixed', target: 'Stance', params: { to: 'angry' } },
      effects: [
        { id: 'f1', kind: 'mixedText.set', widgetId: 'w-mixed', target: 'Note', params: { text: 'Now {@event_value}, was {@event_before}' } },
        { id: 'f2', kind: 'mixedText.set', widgetId: 'w-mixed', target: 'Title', params: { text: 'Brute' } },
      ],
    };
    const before = character([status], [cycle, angry]);
    const result = runEvents({ before, after: before, manualEventId: 'e-cycle' });
    const fields = widgetData(result.character, 'w-mixed').mixedFields!;
    expect(fields.map((field) => ('value' in field ? field.value : null))).toEqual(['Angry', 'Now Angry, was Calm', 'Hero']);
    expect(result.firings[1].trigger).toBe('Stance: Calm → Angry');
    expect(result.firings[1].effects[1]).toMatchObject({ text: "Status: Title is computed by a formula and can't be changed", skipped: true });

    const again = runEvents({ before: result.character, after: result.character, manualEventId: 'e-cycle' });
    expect(again.firings).toHaveLength(1);
    const wrapped = runEvents({ before: again.character, after: again.character, manualEventId: 'e-cycle' });
    expect(wrapped.firings[0].effects[0].text).toBe('Status: Stance: Frenzied → Calm');

    const options = getWidgetEventDefs('MIXED_FIELDS').triggers.find((def) => def.kind === 'mixedMenu.changed')!.params![0].options;
    const choices = typeof options === 'function' ? options({ character: before, widget: status, target: 'Stance' }) : options;
    expect(choices?.map((option) => option.value)).toEqual(['', 'Calm', 'Angry', 'Frenzied']);
  });

  it('changes item fields, reacts to them and watches the carried weight', () => {
    const pack: Widget = {
      id: 'w-pack',
      type: 'INVENTORY',
      x: 0,
      y: 0,
      data: {
        label: 'Pack',
        inventoryEncumbrance: { enabled: true, unit: 'lb', localCapacity: 10, includeInGlobalLoad: false, showGlobalCounter: false },
        inventoryItems: [
          { id: 'i1', name: 'Torch', fields: [{ id: 'f-lit', name: 'Lit', type: 'checkbox', value: false }, { id: 'f-w', name: 'Weight', type: 'number', value: 1, reserved: 'weight' }] },
          { id: 'i2', name: 'Lantern', fields: [{ id: 'f-lit2', name: 'Lit', type: 'checkbox', value: false }, { id: 'f-w2', name: 'Weight', type: 'number', value: 2, reserved: 'weight' }] },
        ],
      },
    };
    const lightAll: CharacterEvent = {
      id: 'e-light',
      enabled: true,
      trigger: { kind: 'manual' },
      effects: [
        { id: 'f1', kind: 'inventory.setField', widgetId: 'w-pack', target: 'lit', params: { name: '', value: '1' } },
        { id: 'f2', kind: 'inventory.setField', widgetId: 'w-pack', target: 'Weight', params: { name: 'Lantern', value: '@hp * 5' } },
        { id: 'f3', kind: 'inventory.setField', widgetId: 'w-pack', target: 'Weight', params: { name: 'Torch', value: 'heavy' } },
      ],
    };
    const lit: CharacterEvent = {
      id: 'e-lit',
      enabled: true,
      trigger: { kind: 'inventory.fieldChanged', widgetId: 'w-pack', target: 'Lit', params: { name: 'Torch' } },
      effects: [{ id: 'f1', kind: 'log.message', params: { message: '{@event_item} {@event_field}: {@event_before} → {@event_value}' } }],
    };
    const heavy: CharacterEvent = {
      id: 'e-heavy',
      enabled: true,
      trigger: { kind: 'value.crosses', widgetId: 'w-pack', target: 'load', params: { compare: 'above', threshold: '100%' } },
      effects: [{ id: 'f1', kind: 'log.message', params: { message: 'Carrying {@event_value}' } }],
    };
    const before = character([pack], [lightAll, lit, heavy], [{ id: 'v1', label: 'hp', value: 2 }]);
    expect(getEventProblems(before, normalizeEvent(heavy))).toEqual([]);
    const result = runEvents({ before, after: before, manualEventId: 'e-light' });
    const items = widgetData(result.character, 'w-pack').inventoryItems!;

    expect(items.map((item) => item.fields.map((field) => field.value))).toEqual([[true, 1], [true, 10]]);
    expect(result.firings[0].effects.map((effect) => effect.text)).toEqual([
      'Pack: Lit changed on 2 items',
      'Pack: Lantern · Weight: 2 → 10',
      'Pack: Weight: "heavy" isn\'t a number',
    ]);
    expect(result.firings.slice(1).map((firing) => firing.effects[0].text)).toEqual(['Torch Lit: 0 → 1', 'Carrying 11']);
  });

  it('enters threshold track zones in the chosen direction', () => {
    const wounds: Widget = {
      id: 'w-track',
      type: 'THRESHOLD_TRACK',
      x: 0,
      y: 0,
      data: {
        label: 'Wounds',
        currentValue: 0,
        minValue: 0,
        maxValue: 10,
        trackThresholds: [{ id: 't2', name: 'Dying', value: 8, modifier: -3 }, { id: 't1', name: 'Hurt', value: 3, modifier: -1 }],
      },
    };
    const deeper: CharacterEvent = {
      id: 'e-zone',
      enabled: true,
      trigger: { kind: 'track.zone', widgetId: 'w-track', params: { way: 'deeper' } },
      effects: [{ id: 'f1', kind: 'log.message', params: { message: '{@event_zone} {@event_modifier} #{@event_level} at {@event_value}' } }],
    };
    const dying: CharacterEvent = { ...deeper, id: 'e-dying', trigger: { kind: 'track.zone', widgetId: 'w-track', target: 't2', params: { way: 'any' } } };
    const before = character([wounds], [deeper, dying]);
    const message = (from: Character, value: number) => runEvents({ before: from, after: patchWidgetData(from, 'w-track', { currentValue: value }) })
      .firings.map((firing) => `${firing.eventId}: ${firing.effects[0].text}`);

    expect(message(before, 2)).toEqual([]);
    expect(message(before, 4)).toEqual(['e-zone: Hurt -1 #1 at 4']);
    const hurt = patchWidgetData(before, 'w-track', { currentValue: 4 });
    expect(message(hurt, 9)).toEqual(['e-zone: Dying -3 #2 at 9', 'e-dying: Dying -3 #2 at 9']);
    const down = patchWidgetData(before, 'w-track', { currentValue: 9 });
    expect(message(down, 5)).toEqual([]);
    expect(describeTrigger(before, dying.trigger)).toBe('Wounds enters "Dying"');
  });

  it('passes the name of the new level when the level changes', () => {
    const xp: Widget = {
      id: 'w-xp',
      type: 'XP_LEVEL',
      x: 0,
      y: 0,
      data: { label: 'Experience', currentValue: 0, xpLevels: [{ id: 'l1', xp: 0, name: 'Novice' }, { id: 'l2', xp: 100, name: 'Adept' }, { id: 'l3', xp: 300 }] },
    };
    const event: CharacterEvent = {
      id: 'e-level',
      enabled: true,
      trigger: { kind: 'xp.levelChanged', widgetId: 'w-xp', params: { direction: 'up' } },
      effects: [{ id: 'f1', kind: 'log.message', params: { message: '{@event_name} {@event_before}→{@event_level} (+{@event_change})' } }],
    };
    const before = character([xp], [event]);
    const result = runEvents({ before, after: patchWidgetData(before, 'w-xp', { currentValue: 150 }) });
    expect(result.firings[0].trigger).toBe('Level 1 → 2 (Adept)');
    expect(result.firings[0].effects[0].text).toBe('Adept 1→2 (+1)');
    expect(runEvents({ before, after: patchWidgetData(before, 'w-xp', { currentValue: 50 }) }).firings).toHaveLength(0);
  });

  it('adds bonus dice to a pool and watches the pool size', () => {
    const pool: Widget = {
      id: 'w-pool',
      type: 'DICE_POOL',
      x: 0,
      y: 0,
      data: { label: 'Pool', dicePoolComponents: [{ id: 'p1', name: 'Might', dice: 3, active: true }] },
    };
    const boost: CharacterEvent = {
      id: 'e-boost',
      enabled: true,
      trigger: { kind: 'manual' },
      effects: [{ id: 'f1', kind: 'value.subtract', widgetId: 'w-pool', target: 'bonus', params: { amount: '30' } }],
    };
    const size: CharacterEvent = {
      id: 'e-size',
      enabled: true,
      trigger: { kind: 'value.changed', widgetId: 'w-pool', target: 'size' },
      effects: [{ id: 'f1', kind: 'log.message', params: { message: '{@event_value} dice' } }],
    };
    const before = character([pool], [boost, size]);
    const result = runEvents({ before, after: before, manualEventId: 'e-boost' });
    expect(widgetData(result.character, 'w-pool').dicePoolBonus).toBe(-20);
    expect(result.firings[1].effects[0].text).toBe('0 dice');
  });

  it('rolls dice in a dice tray, which counts as the tray rolling', () => {
    const tray: Widget = { id: 'w-tray', type: 'DICE_TRAY', x: 0, y: 0, data: { label: 'Tray', modifier: 100 } };
    const roll: CharacterEvent = {
      id: 'e-roll',
      enabled: true,
      trigger: { kind: 'manual' },
      effects: [{ id: 'f1', kind: 'tray.roll', widgetId: 'w-tray', params: { dice: '2d6' } }],
    };
    const rolled: CharacterEvent = {
      id: 'e-rolled',
      enabled: true,
      trigger: { kind: 'dice.rolled', widgetId: 'w-tray' },
      effects: [{ id: 'f1', kind: 'log.message', params: { message: '{@event_total}' } }],
    };
    const before = character([tray], [roll, rolled]);
    const result = runEvents({ before, after: before, manualEventId: 'e-roll' });
    expect(result.rolls).toHaveLength(1);
    expect(result.firings).toHaveLength(2);
    const total = Number(result.firings[1].effects[0].text);
    expect(total).toBeGreaterThanOrEqual(102);
    expect(total).toBeLessThanOrEqual(112);

    const plain = { ...before, events: [{ ...roll, effects: [{ ...roll.effects[0], params: { dice: '1d4', modifier: 'no' } }] }].map(normalizeEvent) };
    const plainTotal = runEvents({ before: plain, after: plain, manualEventId: 'e-roll' }).rolls[0].result?.total ?? 0;
    expect(plainTotal).toBeLessThanOrEqual(4);
  });

  it('notices when every switch, condition or skill is on', () => {
    const labels = getAllTriggerDefs().filter((def) => def.kind.endsWith('.all')).map((def) => def.label);
    expect(labels).toEqual(expect.arrayContaining(['Every condition is active', 'Every item is checked', 'Every switch is on', 'Every trait is in the pool', 'Every skill is unlocked']));

    const lights: Widget = {
      id: 'w-lights',
      type: 'MIXED_FIELDS',
      x: 0,
      y: 0,
      data: { label: 'Lights', mixedFields: [{ name: 'A', type: 'switch', value: true }, { name: 'B', type: 'switch', value: false }] },
    };
    const event: CharacterEvent = {
      id: 'e-all',
      enabled: true,
      trigger: { kind: 'mixedSwitch.all', widgetId: 'w-lights' },
      effects: [{ id: 'f1', kind: 'log.message', params: { message: '{@event_count} lit' } }],
    };
    const before = character([lights], [event]);
    const after = patchWidgetData(before, 'w-lights', { mixedFields: [{ name: 'A', type: 'switch', value: true }, { name: 'B', type: 'switch', value: true }] });
    const result = runEvents({ before, after });
    expect(result.firings[0].trigger).toBe('All 2 switches are on');
    expect(result.firings[0].effects[0].text).toBe('2 lit');
    expect(describeTrigger(before, event.trigger)).toBe('Every switch in Lights is on');
  });

  it('reports effects whose widget was deleted', () => {
    const before = character([health], [bloodiedEvent]);
    const result = runEvents({ before, after: patchWidgetData(before, 'w-hp', { currentValue: 2 }) });
    expect(result.firings[0].effects[0]).toMatchObject({ skipped: true });
    expect(getEventProblems(before, normalizeEvent(bloodiedEvent))).toEqual(['Effect 1: Its widget was deleted']);
  });

  it('reports trigger data the trigger does not provide', () => {
    const event: CharacterEvent = {
      id: 'e-bad',
      enabled: true,
      trigger: { kind: 'health.damaged', widgetId: 'w-hp' },
      condition: '@event_damage > @event_bonus',
      effects: [{ id: 'f1', kind: 'label.add', target: 'xp', params: { amount: '@event_total' } }],
    };
    const hero = character([health], [event], [{ id: 'v1', label: 'xp', value: 0 }]);
    expect(getEventProblems(hero, normalizeEvent(event))).toEqual(["Uses @event_bonus, @event_total, which isn't available where it's used"]);

    const withLabel = character([health], [event], [{ id: 'v1', label: 'xp', value: 0 }, { id: 'v2', label: 'event_bonus', value: 1 }]);
    expect(getEventProblems(withLabel, normalizeEvent(event))).toEqual(["Uses @event_total, which isn't available where it's used"]);

    const inTrigger: CharacterEvent = { ...bloodiedEvent, trigger: { ...bloodiedEvent.trigger, params: { compare: 'below', threshold: '@event_value' } } };
    expect(getEventProblems(character([health, bloodied], [inTrigger]), normalizeEvent(inTrigger))).toEqual(["Uses @event_value, which isn't available where it's used"]);
  });
});

describe('multi-step events', () => {
  // `1d1 + n` always totals n + 1, so the roll is predictable.
  const attackChain = (bonus: number): StepEvent => ({
    id: 'e-chain',
    enabled: true,
    trigger: { kind: 'manual' },
    steps: [
      { id: 's1', effects: [{ id: 'f1', kind: 'dice.roll', resultName: 'attack', params: { dice: `1d1 + ${bonus - 1}`, title: 'Attack' } }] },
      {
        id: 's2',
        condition: '@event_attack_total >= 12',
        effects: [{ id: 'f2', kind: 'log.message', params: { message: 'Hit with {@event_attack_total}' } }],
        otherwise: [{ id: 'f3', kind: 'log.message', params: { message: 'Miss with {@event_attack_total}' } }],
      },
    ],
  });
  const hero = (event: StepEvent) => character([health], [event], [{ id: 'v1', label: 'xp', value: 0 }]);

  it('checks a roll made earlier in the same event and runs the matching effects', () => {
    const before = hero(attackChain(15));
    const result = runEvents({ before, after: before, manualEventId: 'e-chain' });
    const [firing] = result.firings;
    expect(result.rolls).toHaveLength(1);
    expect(firing.conditionFailed).toBeUndefined();
    expect(firing.effects.map((effect) => [effect.step, effect.otherwise])).toEqual([[0, undefined], [1, undefined]]);
    expect(firing.effects[1].text).toBe('Hit with 15');
  });

  it('runs the otherwise effects when a condition is false and carries on with the next step', () => {
    const event = attackChain(5);
    event.steps.push({ id: 's3', effects: [{ id: 'f4', kind: 'log.message', params: { message: 'Done' } }] });
    const before = hero(event);
    const [firing] = runEvents({ before, after: before, manualEventId: 'e-chain' }).firings;
    expect(firing.conditionFailed).toBe(true);
    expect(firing.failedSteps).toEqual([1]);
    expect(firing.effects.map((effect) => effect.text)).toEqual([expect.stringContaining('Attack'), 'Miss with 5', 'Done']);
    expect(firing.effects[1]).toMatchObject({ step: 1, otherwise: true });
    expect(firing.effects[2]).toMatchObject({ step: 2 });
  });

  it('still checks the conditions of later steps after a false one', () => {
    const event = attackChain(5);
    event.steps.push({ id: 's3', condition: '@event_attack_total < 10', effects: [{ id: 'f4', kind: 'log.message', params: { message: 'Low roll' } }] });
    const before = hero(event);
    const [firing] = runEvents({ before, after: before, manualEventId: 'e-chain' }).firings;
    expect(firing.failedSteps).toEqual([1]);
    expect(firing.effects.map((effect) => effect.text)).toContain('Low roll');
  });

  it('ends the event at a false condition when the step says to stop', () => {
    const event = attackChain(5);
    event.steps[1].stopIfFalse = true;
    event.steps.push({ id: 's3', effects: [{ id: 'f4', kind: 'log.message', params: { message: 'Never' } }] });
    const before = hero(event);
    const [firing] = runEvents({ before, after: before, manualEventId: 'e-chain' }).firings;
    expect(firing.effects.map((effect) => effect.text)).toEqual([expect.stringContaining('Attack'), 'Miss with 5']);
  });

  it('skips a false step quietly when it has no otherwise effects', () => {
    const event = attackChain(5);
    delete event.steps[1].otherwise;
    const before = hero(event);
    const result = runEvents({ before, after: before, manualEventId: 'e-chain' });
    expect(result.firings[0].effects).toHaveLength(1);
    expect(result.firings[0].conditionFailed).toBe(true);
  });

  it('reads the result of an otherwise effect as 0 when that branch did not run', () => {
    const event = attackChain(15);
    event.steps[1].otherwise = [{ id: 'f3', kind: 'dice.roll', resultName: 'retry', params: { dice: '1d1 + 4' } }];
    event.steps.push({ id: 's3', condition: '@event_retry_total == 0', effects: [{ id: 'f4', kind: 'log.message', params: { message: 'No retry' } }] });
    const before = hero(event);
    expect(getEventProblems(before, event)).toEqual([]);
    const [firing] = runEvents({ before, after: before, manualEventId: 'e-chain' }).firings;
    expect(firing.effects.map((effect) => effect.text)).toContain('No retry');
  });

  it('lets later conditions see sheet changes made by earlier steps', () => {
    const event: StepEvent = {
      id: 'e-sheet',
      enabled: true,
      trigger: { kind: 'manual' },
      steps: [
        { id: 's1', effects: [{ id: 'f1', kind: 'label.add', target: 'xp', params: { amount: '5' } }] },
        { id: 's2', condition: '@xp >= 5', effects: [{ id: 'f2', kind: 'label.add', target: 'xp', params: { amount: '10' } }] },
      ],
    };
    const before = hero(event);
    const result = runEvents({ before, after: before, manualEventId: 'e-sheet' });
    expect(result.character.variables?.find((variable) => variable.label === 'xp')?.value).toBe(15);
  });

  it('passes the other roll kinds along under the result name', () => {
    const event: StepEvent = {
      id: 'e-roller',
      enabled: true,
      trigger: { kind: 'manual' },
      steps: [
        { id: 's1', effects: [{ id: 'f1', kind: 'roller.roll', widgetId: 'w-roller', resultName: 'swing' }] },
        { id: 's2', condition: '@event_swing_highest >= 1', effects: [{ id: 'f2', kind: 'log.message', params: { message: 'Rolled {@event_swing_total}' } }] },
      ],
    };
    const before = character([roller], [event]);
    const [firing] = runEvents({ before, after: before, manualEventId: 'e-roller' }).firings;
    expect(firing.conditionFailed).toBeUndefined();
    expect(firing.effects[1].text).toMatch(/^Rolled \d+$/);
  });

  it('only offers a result to what runs after it', () => {
    const event = attackChain(15);
    expect(getEventProblems(hero(event), event)).toEqual([]);
    expect(getEventLabelsAt(event, 0, 'effects', 0)).toEqual({});
    expect(Object.keys(getEventLabelsAt(event, 1, 'condition'))).toEqual(['event_attack_total', 'event_attack_highest', 'event_attack_lowest']);
    expect(getEventLabelsAt(event, 1, 'otherwise', 0)).toHaveProperty('event_attack_total');

    const early: StepEvent = { ...event, steps: [{ ...event.steps[1], id: 's0' }, event.steps[0]] };
    expect(getEventProblems(hero(early), early)).toEqual(['Uses @event_attack_total, which isn\'t available where it\'s used']);

    const sameStep: StepEvent = {
      ...event,
      steps: [{ id: 's1', effects: [event.steps[0].effects[0], { id: 'f9', kind: 'log.message', params: { message: '{@event_attack_total}' } }] }],
    };
    expect(getEventProblems(hero(sameStep), sameStep)).toEqual([]);
    const before: StepEvent = { ...sameStep, steps: [{ id: 's1', effects: [sameStep.steps[0].effects[1], sameStep.steps[0].effects[0]] }] };
    expect(getEventProblems(hero(before), before)).toHaveLength(1);
  });

  it('flags result names that are reused or cannot be read', () => {
    const event = attackChain(15);
    const second = { ...event.steps[0].effects[0], id: 'f5' };
    const twice: StepEvent = { ...event, steps: [{ id: 's1', effects: [event.steps[0].effects[0], second] }] };
    expect(getEventProblems(hero(twice), twice)).toEqual([
      'Effect 1: Another effect already uses the result name "attack"',
      'Effect 2: Another effect already uses the result name "attack"',
    ]);
  });

  it('flags otherwise effects that have no condition', () => {
    const event = attackChain(15);
    delete event.steps[1].condition;
    expect(getEventProblems(hero(event), event)).toEqual(['Step 2, otherwise effects never run without a condition']);
  });

  it('reads events saved with a single condition and effect list', () => {
    const legacy = { id: 'e-old', enabled: true, trigger: { kind: 'manual' }, condition: '@xp == 0', effects: [{ id: 'f1', kind: 'label.add', target: 'xp', params: { amount: '3' } }] };
    const before = { ...hero(attackChain(5)), events: [legacy as unknown as StepEvent] };
    const result = runEvents({ before, after: before, manualEventId: 'e-old' });
    expect(result.character.variables?.find((variable) => variable.label === 'xp')?.value).toBe(3);
  });
});

describe('event registry', () => {
  it('declares effect data with unique keys that work as labels', () => {
    for (const def of getAllEffectDefs()) {
      const keys = (def.outputs ?? []).map((output) => output.key);
      expect(new Set(keys).size, def.kind).toBe(keys.length);
      for (const key of keys) expect(key, def.kind).toMatch(/^[a-z][a-z0-9]*$/);
    }
  });
  it('declares trigger data with unique keys that work as labels', () => {
    for (const def of getAllTriggerDefs()) {
      const keys = (def.outputs ?? []).map((output) => output.key);
      expect(new Set(keys).size, def.kind).toBe(keys.length);
      for (const key of keys) expect(key, def.kind).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });
  it('has unique kinds for triggers and effects', () => {
    const triggerKinds = getAllTriggerDefs().map((def) => def.kind);
    const effectKinds = getAllEffectDefs().map((def) => def.kind);
    expect(new Set(triggerKinds).size).toBe(triggerKinds.length);
    expect(new Set(effectKinds).size).toBe(effectKinds.length);
    const widgetTriggers = (['HEALTH_BAR', 'DICE_ROLLER', 'DICE_TRAY', 'STEP_DICE', 'WALLET'] as const)
      .flatMap((type) => getWidgetEventDefs(type).triggers);
    for (const def of widgetTriggers) expect(getAllTriggerDefs()).toContain(def);
  });

  it('describes triggers and effects as sentences', () => {
    const hero = character([health, bloodied], [bloodiedEvent], [{ id: 'v1', label: 'xp', value: 0 }]);
    expect(describeTrigger(hero, bloodiedEvent.trigger)).toBe('Health · Current HP drops below 50%');
    expect(describeEffect(hero, bloodiedEvent.effects[0])).toBe('Turn on Bloodied');
    expect(describeEffect(hero, { id: 'x', kind: 'label.add', target: 'xp', params: { amount: '-2' } })).toBe('Subtract 2 from @xp');
    expect(describeEffect(hero, { id: 'y', kind: 'label.set', target: 'gone' })).toBe('Set @gone (missing) to 0');
  });
});

describe('interpolateText', () => {
  it('replaces formulas in braces and leaves text that is not a formula', () => {
    expect(interpolateText('HP {@hp * 2}, {not a formula!}', { hp: 4 })).toBe('HP 8, {not a formula!}');
  });
});
