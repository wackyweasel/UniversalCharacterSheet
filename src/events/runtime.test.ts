import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Character, CharacterEvent } from '../types';
import { useStore } from '../store/useStore';
import { useUndoStore } from '../store/useUndoStore';
import { useTimelineStore } from '../store/useTimelineStore';
import { useDiceResultStore } from '../store/useDiceResultStore';
import { EVENT_TIMELINE_TYPE, emitWidgetAction, initEventRuntime, runEventNow } from './runtime';
import { getEventProblems } from './registry';
import { findInlineButtonNames } from './defs/textButton';
import { ADVANCED_TUTORIAL_PRESET, AUTOMATION_TUTORIAL_PRESET, COMPENDIUM_TUTORIAL_PRESET, EVENTS_TUTORIAL_PRESET } from '../presets';
import { collectLabels, evaluateFormula } from '../utils/formulaEngine';
import { rollPhysicalDice } from '../components/DicePhysicsOverlay';
import { useDiceSettingsStore } from '../store/useDiceSettingsStore';
import { instantiateCompendiumItem } from '../utils/compendium';
import { collectNumericTargets } from '../utils/numericTargets';

vi.mock('../components/DicePhysicsOverlay', () => ({
  isPhysicalDieSupported: (faces: number) => [2, 4, 6, 8, 10, 12, 20].includes(faces),
  rollPhysicalDice: vi.fn(),
}));

vi.hoisted(() => {
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem: () => undefined,
  });
  vi.stubGlobal('window', {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({}));
});

const bloodiedEvent: CharacterEvent = {
  id: 'e-bloodied',
  enabled: true,
  trigger: { kind: 'value.crosses', widgetId: 'w-hp', target: 'current', params: { compare: 'below', threshold: '50%' } },
  steps: [{ id: 's1', effects: [{ id: 'f1', kind: 'switch.set', widgetId: 'w-bloodied', params: { state: 'on' } }] }],
};

const critEvent: CharacterEvent = {
  id: 'e-crit',
  name: 'Critical hit',
  enabled: true,
  trigger: { kind: 'dice.rolled', widgetId: 'w-roller', params: { result: 'die', compare: 'equals', threshold: '20' } },
  steps: [{ id: 's2', effects: [{ id: 'f2', kind: 'log.message', params: { message: 'Natural 20!' } }] }],
};

const bonusEvent: CharacterEvent = {
  id: 'e-bonus',
  name: 'Bonus damage',
  enabled: false,
  trigger: { kind: 'manual' },
  steps: [{ id: 's3', effects: [{ id: 'f3', kind: 'dice.roll', params: { dice: '2d6' } }] }],
};

const hero: Character = {
  id: 'c1',
  name: 'Hero',
  activeSheetId: 's1',
  sheets: [{
    id: 's1',
    name: 'Main',
    widgets: [
      { id: 'w-hp', type: 'HEALTH_BAR', x: 0, y: 0, data: { label: 'Health', currentValue: 20, maxValue: 20 } },
      { id: 'w-bloodied', type: 'TOGGLE', x: 0, y: 0, data: { label: 'Bloodied', toggleState: false } },
      { id: 'w-roller', type: 'DICE_ROLLER', x: 0, y: 0, data: { label: 'Attack', diceGroups: [{ count: 1, faces: 20 }] } },
    ],
  }],
  events: [bloodiedEvent, critEvent, bonusEvent],
};

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const widgetData = (id: string) => useStore.getState().characters[0].sheets[0].widgets.find((widget) => widget.id === id)!.data;
const eventEntries = () => (useTimelineStore.getState().eventsByCharacter[hero.id]?.events ?? [])
  .filter((entry) => entry.widgetType === EVENT_TIMELINE_TYPE);

describe('event runtime', () => {
  let stop: () => void;
  beforeAll(() => {
    stop = initEventRuntime();
  });
  afterAll(() => stop());

  beforeEach(() => {
    vi.mocked(rollPhysicalDice).mockReset().mockResolvedValue(null);
    useDiceSettingsStore.setState({ threeDDiceEnabled: true });
    useUndoStore.getState().clearAllHistory();
    useTimelineStore.getState().replaceWorkspaceEvents({});
    useDiceResultStore.getState().close();
    useStore.getState()._replaceWorkspaceState({ characters: [hero], activeCharacterId: hero.id, mode: 'play' });
  });

  it('applies effects after a change, logs them and undoes them with the change', async () => {
    useStore.getState().updateWidgetData('w-hp', { currentValue: 8 });
    await settle();

    expect(widgetData('w-bloodied').toggleState).toBe(true);
    expect(eventEntries().map((entry) => entry.description)).toEqual([expect.stringContaining('Bloodied turns on')]);

    useStore.getState().undo();
    await settle();
    expect(widgetData('w-hp').currentValue).toBe(20);
    expect(widgetData('w-bloodied').toggleState).toBe(false);
    expect(eventEntries()).toHaveLength(0);

    useStore.getState().redo();
    await settle();
    expect(widgetData('w-bloodied').toggleState).toBe(true);
    expect(eventEntries()).toHaveLength(1);
  });

  it('undoes bulk effect removal and its triggered events together', async () => {
    const boosted: Character = {
      ...hero, sheets: [{
        ...hero.sheets[0], widgets: [
          { ...hero.sheets[0].widgets[0], data: { ...hero.sheets[0].widgets[0].data, currentValue: 9 } },
          ...hero.sheets[0].widgets.slice(1),
          { id: 'boost', type: 'TOGGLE', x: 0, y: 0, data: {
            toggleState: true,
            effects: [{ id: 'bonus', amount: 2, target: { kind: 'widget', widgetId: 'w-hp', field: 'currentValue' } }],
          } },
        ],
      }],
    };
    useStore.getState()._replaceWorkspaceState({ characters: [boosted], activeCharacterId: hero.id, mode: 'play' });
    await settle();
    expect(widgetData('w-hp').currentValue).toBe(11);
    useStore.getState().deleteAllAutomations('effects');
    await settle();
    expect(widgetData('w-hp').currentValue).toBe(9);
    expect(widgetData('w-bloodied').toggleState).toBe(true);
    expect(useUndoStore.getState().past).toHaveLength(1);
    useStore.getState().undo();
    await settle();
    expect(widgetData('w-hp').currentValue).toBe(11);
    expect(widgetData('w-bloodied').toggleState).toBe(false);
    expect(widgetData('boost').effects).toHaveLength(1);
    expect(eventEntries()).toHaveLength(0);
  });

  it('ignores changes made while a widget is being edited and loads', async () => {
    useStore.getState().setEditingWidgetId('w-hp');
    useStore.getState().updateWidgetData('w-hp', { currentValue: 8 });
    useStore.getState().setEditingWidgetId(null);
    await settle();
    expect(widgetData('w-bloodied').toggleState).toBe(false);

    const hurt = { ...hero, sheets: [{ ...hero.sheets[0], widgets: hero.sheets[0].widgets.map((widget) => (
      widget.id === 'w-hp' ? { ...widget, data: { ...widget.data, currentValue: 5 } } : widget
    )) }] };
    useStore.getState()._replaceWorkspaceState({ characters: [hurt], activeCharacterId: hero.id, mode: 'play' });
    await settle();
    expect(widgetData('w-bloodied').toggleState).toBe(false);
    expect(eventEntries()).toHaveLength(0);
  });

  it('fires action triggers from widget actions', async () => {
    emitWidgetAction({ widgetId: 'w-roller', kind: 'roll', total: 20, dice: [20], text: '1d20' });
    await settle();
    expect(eventEntries().map((entry) => [entry.widgetLabel, entry.description])).toEqual([
      ['Critical hit', expect.stringContaining('Natural 20!')],
    ]);
    expect(eventEntries()[0].characterEventId).toBe('e-crit');
    emitWidgetAction({ widgetId: 'w-roller', kind: 'roll', total: 7, dice: [7], text: '1d20' });
    await settle();
    expect(eventEntries()).toHaveLength(1);
  });

  it('runs an event by hand, even when it is turned off, and shows its roll', () => {
    runEventNow('e-bonus');
    expect(eventEntries().map((entry) => entry.widgetLabel)).toEqual(['Bonus damage']);
    const entry = useDiceResultStore.getState().entry;
    expect(entry?.centered).toBe(true);
    expect(entry?.view.title).toBeTruthy();
  });

  it('rolls a full batch before starting dice in separate event steps', async () => {
    let finishFirst!: (values: number[] | null) => void;
    vi.mocked(rollPhysicalDice)
      .mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }))
      .mockResolvedValue([8, 1]);
    useStore.getState()._replaceWorkspaceState({
      characters: [{ ...hero, events: [{
        ...critEvent,
        steps: [
          { id: 'damage-step', effects: [{ id: 'damage', kind: 'dice.roll', params: { dice: '8d6' } }] },
          { id: 'healing-step', effects: [{ id: 'heal', kind: 'dice.roll', params: { dice: '2d8' } }] },
        ],
      }] }],
      activeCharacterId: hero.id, mode: 'play',
    });

    emitWidgetAction({ widgetId: 'w-roller', kind: 'roll', total: 20, dice: [20], text: '1d20' });
    await settle();
    const waitingCalls = [...vi.mocked(rollPhysicalDice).mock.calls];
    finishFirst([6, 1, 5, 2, 4, 3, 6, 1]);
    await settle();

    expect(waitingCalls).toEqual([[Array.from({ length: 8 }, () => ({ faces: 6 }))]]);
    expect(vi.mocked(rollPhysicalDice).mock.calls).toEqual([
      [Array.from({ length: 8 }, () => ({ faces: 6 }))],
      [[{ faces: 8 }, { faces: 8 }]],
    ]);
    expect(eventEntries()).toHaveLength(1);
  });

  it('manages events through store actions', () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockClear();
    const store = useStore.getState();
    const copyId = store.duplicateCharacterEvent('e-crit')!;
    let events = useStore.getState().characters[0].events!;
    expect(events.map((event) => event.id)).toEqual(['e-bloodied', 'e-crit', copyId, 'e-bonus']);
    expect(events[2].name).toBe('Critical hit (copy)');
    expect(events[2].steps[0].effects[0].id).not.toBe('f2');
    expect(events[2].steps[0].id).not.toBe('s2');

    store.moveCharacterEvent(copyId, 0);
    store.setCharacterEventEnabled(copyId, false);
    store.removeCharacterEvent('e-bonus');
    events = useStore.getState().characters[0].events!;
    expect(events.map((event) => [event.id, event.enabled])).toEqual([[copyId, false], ['e-bloodied', true], ['e-crit', true]]);

    const newId = store.addCharacterEvent({ enabled: true, trigger: { kind: 'manual' }, steps: [{ id: 's9', effects: [{ id: '', kind: 'log.message', params: { message: 'Hi' } }] }] })!;
    const added = useStore.getState().characters[0].events!.find((event) => event.id === newId)!;
    expect(added.steps[0].effects[0].id).toBeTruthy();

    const sent = fetchMock.mock.calls
      .map(([, init]) => JSON.parse(String(init?.body)))
      .filter((payload) => payload.category === 'event');
    expect(sent.map((payload) => [payload.eventName, payload.source])).toEqual([
      ['event_duplicated', 'events_panel'],
      ['event_toggled', 'events_panel'],
      ['event_deleted', 'events_panel'],
      ['event_created', 'events_panel'],
    ]);
    expect(sent[0]).toMatchObject({
      characterId: hero.id,
      widgetType: 'DICE_ROLLER',
      metadata: { triggerKind: 'dice.rolled', effectKinds: 'log.message', effectCount: 1, hasCondition: false, stepCount: 1, eventCount: 4 },
    });
    expect(sent[1].metadata.enabled).toBe(false);
    expect(sent[3]).toMatchObject({ widgetType: null, metadata: { triggerKind: 'manual', eventCount: 4 } });
    const raw = JSON.stringify(sent);
    expect(raw).not.toContain('Critical hit');
    expect(raw).not.toContain('Natural 20');
  });

  it('gives the overview a reversible Effect, final-value formula and valid sample event after cloning', async () => {
    useStore.getState().createTransientCharacterFromPreset(AUTOMATION_TUTORIAL_PRESET, 'Tutorial Character');
    const current = () => useStore.getState().characters.find((item) => item.id === useStore.getState().activeCharacterId)!;
    const bag = current().sheets[0].widgets.find((widget) => widget.type === 'INVENTORY')!;
    const ring = bag.data.inventoryItems![0];
    expect(collectLabels(current())).toMatchObject({ str: 10, defense: 11, proficiency: 2 });
    expect(getEventProblems(current(), current().events![0])).toEqual([]);
    useStore.getState().setInventoryItemActive(bag.id, ring.id, true);
    expect(collectLabels(current())).toMatchObject({ str: 12, defense: 13 });
    useStore.getState().setInventoryItemActive(bag.id, ring.id, false);
    expect(collectLabels(current())).toMatchObject({ str: 10, defense: 11 });
    await settle();
  });

  it('lets the compendium tutorial create an independent equipped copy with a reversible bonus and clean up', async () => {
    const baseline = useStore.getState().characters;
    useStore.getState().createTransientCharacterFromPreset(COMPENDIUM_TUTORIAL_PRESET, 'Tutorial Character');
    const current = () => useStore.getState().characters.find((item) => item.id === useStore.getState().activeCharacterId)!;
    const stats = current().sheets[0].widgets.find((widget) => widget.type === 'NUMBER_DISPLAY')!;
    const equipment = current().sheets[0].widgets.find((widget) => widget.type === 'INVENTORY_SLOTS')!;
    const strength = () => current().sheets[0].widgets.find((widget) => widget.id === stats.id)!.data.displayNumbers![0].value;
    const target = collectNumericTargets(current()).find((entry) => entry.ref.kind === 'widget' && entry.ref.widgetId === stats.id)!;
    const sectionId = useStore.getState().addCompendiumSection('Magic Gear')!;
    const entry = useStore.getState().saveCompendiumItem(sectionId, {
      id: 'catalog-ring', name: 'Ring of Strength',
      fields: [{ id: 'catalog-weight', name: 'Weight', type: 'number', value: 0.1 }],
      effects: [{ id: 'catalog-effect', amount: 2, target: target.ref }],
    })!;
    expect(strength()).toBe(10);
    const copy = instantiateCompendiumItem(entry, equipment.data.inventoryDefaultFields ?? []);
    expect(copy.id).not.toBe(entry.id);
    expect(copy.effects![0].id).not.toBe(entry.effects![0].id);
    expect(copy.fields[0].id).not.toBe(entry.fields[0].id);
    useStore.getState().saveInventoryItem({
      sourceWidgetId: equipment.id, targetWidgetId: equipment.id,
      item: { ...copy, slotId: equipment.data.inventorySlots![0].id },
    });
    expect(strength()).toBe(10);
    useStore.getState().setInventoryItemActive(equipment.id, copy.id, true);
    expect(strength()).toBe(12);
    useStore.getState().saveCompendiumItem(sectionId, { ...entry, effects: [{ ...entry.effects![0], amount: 5 }] });
    useStore.getState().deleteCompendiumItem(sectionId, entry.id);
    expect(strength()).toBe(12);
    useStore.getState().setInventoryItemActive(equipment.id, copy.id, false);
    expect(strength()).toBe(10);
    useStore.getState().cleanupTransientCharacters();
    expect(useStore.getState().characters).toEqual(baseline);
    await settle();
  });

  it('gives the formulas tutorial a live weighted table, generated labels and matching inline examples', async () => {
    useStore.getState().createTransientCharacterFromPreset(ADVANCED_TUTORIAL_PRESET, 'Tutorial Character');
    const current = () => useStore.getState().characters.find((item) => item.id === useStore.getState().activeCharacterId)!;
    const cargo = current().sheets[0].widgets.find((widget) => widget.type === 'TABLE')!;
    expect(collectLabels(current())).toMatchObject({ qty1: 2, weight2: 4, load1: 6, total_load: 11.5, str: 10, level: 3 });
    expect(evaluateFormula('SUM(@qty * @weight)', collectLabels(current()))).toBe(11.5);
    useStore.getState().updateWidgetData(cargo.id, { rows: cargo.data.rows!.map((row, index) => index === 0
      ? { ...row, cells: row.cells.map((cell, column) => column === 0 ? '3' : cell) } : row) });
    expect(collectLabels(current())).toMatchObject({ load1: 9, total_load: 14.5 });
    expect(evaluateFormula('SUM(@qty * @weight)', collectLabels(current()))).toBe(14.5);
    expect(current().sheets[0].widgets.find((widget) => widget.type === 'TEXT')!.data.text).toContain('{SUM(@qty * @weight)}');
    await settle();
  });

  it('gives the events tutorial character working events that chain', async () => {
    expect(ADVANCED_TUTORIAL_PRESET.events ?? []).toEqual([]);
    useStore.getState().createTransientCharacterFromPreset(EVENTS_TUTORIAL_PRESET, 'Tutorial Character');
    const character = useStore.getState().characters.find((item) => item.id === useStore.getState().activeCharacterId)!;
    const events = character.events ?? [];
    expect(events.map((event) => event.name)).toEqual(['Bloodied', 'Steady again', 'Second Wind', 'Rage']);
    for (const event of events) expect(getEventProblems(character, event)).toEqual([]);

    const widgets = character.sheets.flatMap((sheet) => sheet.widgets);
    const health = widgets.find((widget) => widget.type === 'HEALTH_BAR')!;
    const conditions = widgets.find((widget) => widget.type === 'TOGGLE_GROUP')!;
    const current = () => useStore.getState().characters.find((item) => item.id === character.id)!
      .sheets.flatMap((sheet) => sheet.widgets);
    const frightened = () => current().find((widget) => widget.id === conditions.id)!.data.toggleItems!
      .find((item) => item.name === 'Frightened')?.active;
    const timeline = () => (useTimelineStore.getState().eventsByCharacter[character.id]?.events ?? [])
      .filter((entry) => entry.widgetType === EVENT_TIMELINE_TYPE);

    useStore.getState().updateWidgetData(health.id, { currentValue: 4 });
    await settle();
    expect(frightened()).toBe(true);
    expect(timeline().map((entry) => entry.widgetLabel)).toContain('Bloodied');
    expect(timeline().map((entry) => entry.description).join('\n')).toContain('Only 4 HP left');

    runEventNow(events[2].id);
    await settle();
    expect(current().find((widget) => widget.id === health.id)!.data.currentValue).toBeGreaterThanOrEqual(5);
    expect(frightened()).toBe(false);
    expect(timeline().map((entry) => entry.widgetLabel)).toEqual(expect.arrayContaining(['Second Wind', 'Steady again']));

    const eventButton = widgets.find((widget) => widget.type === 'EVENT_BUTTON')!;
    const pool = widgets.find((widget) => widget.type === 'POOL')!;
    const rage = () => current().find((widget) => widget.id === pool.id)!.data.poolResources!
      .find((resource) => resource.name === 'Rage')?.current;
    expect(rage()).toBe(3);
    emitWidgetAction({ widgetId: eventButton.id, kind: 'press' });
    await settle();
    expect(rage()).toBe(2);
    expect(timeline().map((entry) => entry.widgetLabel)).toContain('Rage');

    const spells = widgets.find((widget) => widget.type === 'TABLE' && widget.data.label === 'Spells')!;
    expect(findInlineButtonNames(spells.data)).toContain('Fireball');
    useStore.getState().cleanupTransientCharacters();
  });
});
