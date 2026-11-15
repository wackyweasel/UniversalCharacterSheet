import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Character, InventoryItem, NumericTargetReference, WidgetData, WidgetType } from '../types';
import { useStore } from './useStore';
import { useUndoStore } from './useUndoStore';
import { collectNumericTargets, findNumericTarget } from '../utils/numericTargets';
import { convertWidgetData } from '../utils/widgetConversion';
import { cloneCharacterForWorkspace } from '../utils/characterClone';
import { getWidgetEffectSources } from '../utils/widgetEffects';
import { collectCharacterFormulas } from '../utils/characterFormulas';

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

  const strength: NumericTargetReference = { kind: 'widget', widgetId: 'stats', collection: 'displayNumbers', entryId: 'strength', field: 'value' };
  const effectRing: InventoryItem = { id: 'ring', name: 'Ring of strength', fields: [], effects: [{ id: 'bonus', target: strength, amount: 1 }] };
  const effectHero: Character = {
    id: 'effects', name: 'Effects', activeSheetId: 'main',
    sheets: [{ id: 'main', name: 'Main', widgets: [
      { id: 'stats', type: 'NUMBER_DISPLAY', x: 0, y: 0, data: { displayNumbers: [{ id: 'strength', label: 'Strength', value: 10, maxValue: 10, secondaryValue: 3 }] } },
      { id: 'bag', type: 'INVENTORY', x: 0, y: 0, data: { inventoryItems: [] } },
      { id: 'equipment', type: 'INVENTORY_SLOTS', x: 0, y: 0, data: { inventoryItems: [], inventorySlots: [{ id: 'slot', name: 'Ring', x: 0, y: 0, w: 50, h: 50 }] } },
    ] }],
  };
  const currentHero = () => useStore.getState().characters.find((entry) => entry.id === 'effects')!;
  const strengthValue = () => findNumericTarget(currentHero(), strength)!.value;

  describe('item Effects and conversion lifecycle', () => {
    beforeEach(() => {
      let now = Date.now();
      vi.spyOn(Date, 'now').mockImplementation(() => now += 500);
      useUndoStore.getState().clearAllHistory();
      useStore.getState()._replaceWorkspaceState({ characters: [effectHero], activeCharacterId: 'effects', mode: 'play' });
    });
    afterEach(() => vi.mocked(Date.now).mockRestore());

    it('applies/removes effects once and restores activation with undo/redo', () => {
      const ring = { ...effectRing, effects: [{ ...effectRing.effects![0], allowExceedLimits: true }] };
      useStore.getState().saveInventoryItem({ sourceWidgetId: 'bag', targetWidgetId: 'bag', item: ring });
      expect(strengthValue()).toBe(10);
      useStore.getState().setInventoryItemActive('bag', 'ring', true);
      expect(strengthValue()).toBe(11);
      useStore.getState().setInventoryItemActive('bag', 'ring', false);
      expect(strengthValue()).toBe(10);
      useStore.getState().undo();
      expect(strengthValue()).toBe(11);
      useStore.getState().redo();
      expect(strengthValue()).toBe(10);
      useStore.getState().setInventoryItemActive('bag', 'ring', true);
      useStore.getState().updateWidgetData('bag', { inventoryItems: [] });
      expect(strengthValue()).toBe(10);
    });

    it('allocates legacy target IDs with the item save, but no labels', () => {
      useStore.getState().updateWidgetData('stats', { displayNumbers: [{ label: 'Strength', value: 10 }] });
      const target = collectNumericTargets(currentHero()).find((entry) => entry.ref.kind === 'widget' && entry.ref.field === 'value')!.ref;
      useStore.getState().saveInventoryItem({ sourceWidgetId: 'bag', targetWidgetId: 'bag', item: { ...effectRing, effects: [{ id: 'bonus', target, amount: 1 }] } });
      const number = currentHero().sheets[0].widgets[0].data.displayNumbers![0];
      expect(number.id).toBeTruthy();
      expect(number.valueLabel).toBeUndefined();
      useStore.getState().undo();
      expect(currentHero().sheets[0].widgets[0].data.displayNumbers![0].id).toBeUndefined();
      expect(currentHero().sheets[0].widgets[1].data.inventoryItems).toEqual([]);
    });

    it('uses arrivals policy on moves, even at zero quantity, but not setting changes', () => {
      const ring = { ...effectRing, quantity: 0, effects: [{ ...effectRing.effects![0], allowExceedLimits: true }] };
      useStore.getState().saveInventoryItem({ sourceWidgetId: 'bag', targetWidgetId: 'bag', item: ring });
      useStore.getState().updateWidgetData('bag', { autoActivateItems: true });
      expect(strengthValue()).toBe(10);
      useStore.getState().moveInventoryItem({ sourceWidgetId: 'bag', targetWidgetId: 'equipment', itemId: 'ring', targetSlotId: 'slot', targetIndex: 0 });
      expect(strengthValue()).toBe(11);
      useStore.getState().moveInventoryItem({ sourceWidgetId: 'equipment', targetWidgetId: 'bag', itemId: 'ring', targetIndex: 0 });
      expect(strengthValue()).toBe(11);
      useStore.getState().updateWidgetData('bag', { autoActivateItems: false });
      expect(strengthValue()).toBe(11);
      useStore.getState().moveInventoryItem({ sourceWidgetId: 'bag', targetWidgetId: 'equipment', itemId: 'ring', targetSlotId: 'slot', targetIndex: 0 });
      useStore.getState().moveInventoryItem({ sourceWidgetId: 'equipment', targetWidgetId: 'bag', itemId: 'ring', targetIndex: 0 });
      expect(strengthValue()).toBe(10);
    });

    it('reports/remaps compatible conversions without baking an active capped bonus into the base', () => {
      useStore.getState().saveInventoryItem({ sourceWidgetId: 'equipment', targetWidgetId: 'equipment', item: { ...effectRing, slotId: 'slot' } });
      expect(strengthValue()).toBe(10);
      const before = currentHero();
      const report = convertWidgetData(before.sheets[0].widgets[0], 'NUMBER', { character: before })!;
      expect(report.carried.join(' ')).toContain('Ring of strength');
      expect(report.warnings.join(' ')).not.toContain('Ring of strength');
      expect(currentHero()).toBe(before);
      useStore.getState().convertWidget('stats', 'NUMBER');
      const convertedRing = currentHero().sheets[0].widgets[2].data.inventoryItems![0];
      expect(convertedRing.effects![0].target).toMatchObject({ collection: 'numberItems', entryId: 'strength' });
      expect(currentHero().sheets[0].widgets[0].data.numberItems![0].value).toBe(10);
      useStore.getState().setInventoryItemActive('equipment', 'ring', false);
      expect(currentHero().sheets[0].widgets[0].data.numberItems![0].value).toBe(10);
      useStore.getState().undo();
      useStore.getState().undo();
      expect(currentHero().sheets[0].widgets[0].type).toBe('NUMBER_DISPLAY');
      expect(strengthValue()).toBe(10);
    });

    it('reports dropped targets in red and retains their definitions without their bonuses', () => {
      const target = { ...strength, field: 'secondaryValue' };
      useStore.getState().saveInventoryItem({ sourceWidgetId: 'equipment', targetWidgetId: 'equipment', item: { ...effectRing, slotId: 'slot', effects: [{ id: 'secondary', target, amount: 2 }] } });
      const before = currentHero();
      expect(findNumericTarget(before, target)!.value).toBe(5);
      const report = convertWidgetData(before.sheets[0].widgets[0], 'NUMBER', { character: before })!;
      expect(report.warnings.join(' ')).toContain('Ring of strength');
      expect(report.carried.join(' ')).not.toContain('Ring of strength');
      useStore.getState().convertWidget('stats', 'NUMBER');
      expect(findNumericTarget(currentHero(), target)).toBeUndefined();
      expect(currentHero().sheets[0].widgets[2].data.inventoryItems![0].effects).toHaveLength(1);
    });

    it('preserves Active on container conversion and accounting on whole-character copies', () => {
      useStore.getState().saveInventoryItem({ sourceWidgetId: 'equipment', targetWidgetId: 'equipment', item: { ...effectRing, slotId: 'slot', effects: [{ ...effectRing.effects![0], allowExceedLimits: true }] } });
      useStore.getState().convertWidget('equipment', 'INVENTORY');
      expect(currentHero().sheets[0].widgets[2].data.inventoryItems![0].active).toBe(true);
      expect(strengthValue()).toBe(11);
      const copy = cloneCharacterForWorkspace(currentHero());
      const copyRing = copy.sheets[0].widgets[2].data.inventoryItems![0];
      expect(findNumericTarget(copy, copyRing.effects![0].target!)?.value).toBe(11);
      useStore.getState()._replaceWorkspaceState({ characters: [copy], activeCharacterId: copy.id, mode: 'play' });
      useStore.getState().setInventoryItemActive(copy.sheets[0].widgets[2].id, copyRing.id, false);
      expect(findNumericTarget(useStore.getState().characters[0], copyRing.effects![0].target!)?.value).toBe(10);
    });

    it('updates formula-driven limits before dependent formulas without changing the base', () => {
      useStore.getState().saveInventoryItem({ sourceWidgetId: 'equipment', targetWidgetId: 'equipment', item: effectRing });
      useStore.getState().updateWidgetData('stats', { displayNumbers: [
        { ...currentHero().sheets[0].widgets[0].data.displayNumbers![0], maxValueFormula: '8', valueLabel: 'str' },
        { id: 'derived', label: 'Double', value: 0, valueFormula: '@str * 2' },
      ] });
      expect(strengthValue()).toBe(8);
      expect(currentHero().sheets[0].widgets[0].data.displayNumbers![1].value).toBe(16);
      useStore.getState().updateWidgetData('stats', { displayNumbers: [
        { ...currentHero().sheets[0].widgets[0].data.displayNumbers![0], maxValueFormula: '20' },
        currentHero().sheets[0].widgets[0].data.displayNumbers![1],
      ] });
      expect(strengthValue()).toBe(11);
      expect(currentHero().sheets[0].widgets[0].data.displayNumbers![1].value).toBe(22);
      useStore.getState().setInventoryItemActive('equipment', 'ring', false);
      expect(strengthValue()).toBe(10);
    });

    it('keeps adjustments on formula-driven targets and never retargets a replacement entry', () => {
      useStore.getState().saveInventoryItem({ sourceWidgetId: 'equipment', targetWidgetId: 'equipment', item: effectRing });
      useStore.getState().updateWidgetData('stats', { displayNumbers: [{ ...currentHero().sheets[0].widgets[0].data.displayNumbers![0], valueFormula: '5' }] });
      expect(strengthValue()).toBe(6);
      expect(Object.keys(currentHero().itemEffectValues ?? {})).toHaveLength(1);
      useStore.getState().updateWidgetData('stats', { displayNumbers: [{ id: 'replacement', label: 'Strength', value: 4 }] });
      expect(currentHero().sheets[0].widgets[0].data.displayNumbers![0].value).toBe(4);
      expect(findNumericTarget(currentHero(), strength)).toBeUndefined();
    });

    it('preserves the latest computed base across activation, undo, reload and formula removal', () => {
      useStore.getState().updateWidgetData('stats', { displayNumbers: [{ id: 'strength', label: 'Strength', value: 10, valueFormula: '5' }] });
      useStore.getState().saveInventoryItem({ sourceWidgetId: 'equipment', targetWidgetId: 'equipment', item: effectRing });
      const active = structuredClone(currentHero());
      expect(strengthValue()).toBe(6);
      useStore.getState().setInventoryItemActive('equipment', 'ring', false);
      expect(strengthValue()).toBe(5);
      useStore.getState().undo();
      expect(currentHero()).toEqual(active);
      useStore.getState().redo();
      expect(strengthValue()).toBe(5);
      useStore.getState().setInventoryItemActive('equipment', 'ring', true);
      useStore.getState().updateWidgetData('stats', { displayNumbers: [{ ...currentHero().sheets[0].widgets[0].data.displayNumbers![0], valueFormula: '6' }] });
      expect(strengthValue()).toBe(7);
      const imported = JSON.parse(JSON.stringify(currentHero()));
      useStore.getState()._replaceWorkspaceState({ characters: [imported], activeCharacterId: 'effects', mode: 'play' });
      expect(strengthValue()).toBe(7);
      expect(currentHero().sheets[0].widgets[0].data.displayNumbers![0].valueFormula).toBe('6');
      useStore.getState().deleteAllAutomations('formulas');
      expect(strengthValue()).toBe(7);
      useStore.getState().setInventoryItemActive('equipment', 'ring', false);
      expect(strengthValue()).toBe(6);
    });

    it('carries the computed base and Effect through widget conversion', () => {
      useStore.getState().updateWidgetData('stats', { displayNumbers: [{ id: 'strength', label: 'Strength', value: 10, valueFormula: '5' }] });
      useStore.getState().saveInventoryItem({ sourceWidgetId: 'equipment', targetWidgetId: 'equipment', item: effectRing });
      useStore.getState().convertWidget('stats', 'NUMBER');
      expect(currentHero().sheets[0].widgets[0].data.numberItems![0]).toMatchObject({ value: 6, valueFormula: '5' });
      useStore.getState().setInventoryItemActive('equipment', 'ring', false);
      expect(currentHero().sheets[0].widgets[0].data.numberItems![0].value).toBe(5);
    });

    it('clones widget/group bases and remaps cross-widget targets to group copies', () => {
      useStore.getState().updateWidgetData('bag', { autoActivateItems: true });
      useStore.getState().saveInventoryItem({ sourceWidgetId: 'bag', targetWidgetId: 'bag', item: { ...effectRing, effects: [{ ...effectRing.effects![0], allowExceedLimits: true }] } });
      useStore.getState().cloneWidget('stats');
      const copiedStats = currentHero().sheets[0].widgets.find((widget) => widget.id !== 'stats' && widget.type === 'NUMBER_DISPLAY')!;
      expect(copiedStats.data.displayNumbers![0].value).toBe(10);
      const source = currentHero();
      useStore.getState()._replaceWorkspaceState({ characters: [{ ...source, sheets: [{ ...source.sheets[0], widgets: source.sheets[0].widgets.map((widget) => widget.id === 'stats' || widget.id === 'bag' ? { ...widget, groupId: 'group' } : widget) }] }], activeCharacterId: 'effects', mode: 'play' });
      useStore.getState().cloneGroup('group');
      const copyBag = currentHero().sheets[0].widgets.find((widget) => widget.type === 'INVENTORY' && widget.id !== 'bag')!;
      const copyRing = copyBag.data.inventoryItems![0];
      const ref = copyRing.effects![0].target!;
      expect(ref).not.toEqual(strength);
      expect(findNumericTarget(currentHero(), ref)!.value).toBe(11);
      useStore.getState().setInventoryItemActive(copyBag.id, copyRing.id, false);
      expect(findNumericTarget(currentHero(), ref)!.value).toBe(10);
      expect(strengthValue()).toBe(11);
    });

    it('keeps overridden clock values and formula labels above the segment limit', () => {
      const clock: NumericTargetReference = { kind: 'widget', widgetId: 'clock', collection: 'clockItems', entryId: 'filled', field: 'value' };
      const source = currentHero();
      useStore.getState()._replaceWorkspaceState({ characters: [{ ...source, sheets: [{ ...source.sheets[0], widgets: [
        ...source.sheets[0].widgets,
        { id: 'clock', type: 'PROGRESS_CLOCK', x: 0, y: 0, data: { clockItems: [{ id: 'filled', name: 'Filled', value: 6, segments: 6, valueLabel: 'filled' }] } },
      ] }] }], activeCharacterId: 'effects', mode: 'play' });
      useStore.getState().saveInventoryItem({ sourceWidgetId: 'equipment', targetWidgetId: 'equipment', item: { ...effectRing, effects: [{ id: 'clock-effect', target: clock, amount: 2, allowExceedLimits: true }] } });
      useStore.getState().updateWidgetData('stats', { displayNumbers: [{ id: 'strength', label: 'Clock count', value: 0, valueFormula: '@filled' }] });
      expect(findNumericTarget(currentHero(), clock)!.value).toBe(8);
      expect(strengthValue()).toBe(8);
      useStore.getState().setInventoryItemActive('equipment', 'ring', false);
      expect(findNumericTarget(currentHero(), clock)!.value).toBe(6);
      expect(strengthValue()).toBe(6);
    });

    const bonus = [{ id: 'state-bonus', target: strength, amount: 1, allowExceedLimits: true }];
    const addSource = (type: WidgetType, data: WidgetData) => {
      const current = currentHero();
      useStore.getState()._replaceWorkspaceState({ characters: [{
        ...current, sheets: [{ ...current.sheets[0], widgets: [
          ...current.sheets[0].widgets, { id: 'source', type, x: 0, y: 0, data },
        ] }],
      }], activeCharacterId: 'effects', mode: 'play' });
    };

    it.each<{ type: WidgetType; data: WidgetData }>([
      ...(['INVENTORY', 'INVENTORY_SLOTS', 'COMPENDIUM'] as const).map((type) => ({
        type, data: { inventoryItems: [{ ...effectRing, active: false, effects: bonus }] },
      })),
      { type: 'TOGGLE', data: { toggleState: false, effects: bonus } },
      { type: 'TOGGLE_GROUP', data: { toggleItems: [{ id: 'condition', name: 'Blessed', active: false, effects: bonus }] } },
      { type: 'CHECKBOX', data: { checkboxItems: [{ id: 'check', name: 'Prepared', checked: false, effects: bonus }] } },
      { type: 'MIXED_FIELDS', data: { mixedFields: [{ id: 'switch', name: 'Stance', type: 'switch', value: false, effects: bonus }] } },
      { type: 'SKILL_TREE', data: { currentValue: 1, skillNodes: [{ id: 'skill', name: 'Might', cost: 1, requires: [], unlocked: false, effects: bonus }] } },
      { type: 'TIME_TRACKER', data: { timedEffects: [{ id: 'timer', name: 'Blessed', remainingSeconds: 0, initialSeconds: 60, effects: bonus }] } },
    ])('activates $type from Effects with synchronized source state and undo/redo', ({ type, data }) => {
      addSource(type, data);
      const source = () => currentHero().sheets[0].widgets.find((entry) => entry.id === 'source')!;
      const key = getWidgetEffectSources(source())[0].key;
      const setActive = useStore.getState().setWidgetEffectSourceActive;
      setActive('source', key, true);
      expect(getWidgetEffectSources(source())[0].active).toBe(true);
      expect(strengthValue()).toBe(11);
      const current = currentHero();
      setActive('source', key, true);
      expect(currentHero()).toBe(current);
      setActive('source', key, false);
      expect(getWidgetEffectSources(source())[0].active).toBe(false);
      expect(strengthValue()).toBe(10);
      useStore.getState().undo();
      expect(strengthValue()).toBe(11);
      useStore.getState().redo();
      expect(strengthValue()).toBe(10);
      setActive('source', key, true);
      useStore.getState()._replaceWorkspaceState({ characters: [JSON.parse(JSON.stringify(currentHero()))], activeCharacterId: 'effects', mode: 'play' });
      expect(strengthValue()).toBe(11);
      expect(getWidgetEffectSources(source())[0].active).toBe(true);
    });

    it.each<{ type: WidgetType; data: WidgetData; error: string }>([
      { type: 'TOGGLE', data: { fieldFormulas: { state: '0' }, effects: bonus }, error: 'controlled by a formula' },
      { type: 'MIXED_FIELDS', data: { mixedFields: [{ id: 'switch', name: 'Stance', type: 'switch', value: false, valueFormula: '0', effects: bonus }] }, error: 'controlled by a formula' },
      { type: 'THRESHOLD_TRACK', data: { currentValue: 0, trackThresholds: [{ id: 'zone', name: 'Danger', value: 3, effects: bonus }] }, error: 'change the track value' },
      { type: 'SKILL_TREE', data: { currentValue: 0, skillNodes: [{ id: 'skill', name: 'Might', cost: 1, requires: [], unlocked: false, effects: bonus }] }, error: 'Not enough skill points' },
      { type: 'TIME_TRACKER', data: { timedEffects: [{ id: 'timer', name: 'Expired', remainingSeconds: 0, effects: bonus }] }, error: 'positive duration' },
    ])('does not bypass $type activation constraints', ({ type, data, error }) => {
      addSource(type, data);
      const widget = currentHero().sheets[0].widgets.find((entry) => entry.id === 'source')!;
      expect(() => useStore.getState().setWidgetEffectSourceActive('source', getWidgetEffectSources(widget)[0].key, true)).toThrow(error);
      expect(strengthValue()).toBe(10);
    });

    it('respects skill prerequisites and dependent skills from the Effects panel', () => {
      addSource('SKILL_TREE', { skillTreeUsePoints: false, skillNodes: [
        { id: 'root', name: 'Root', cost: 0, requires: [], unlocked: false, effects: bonus },
        { id: 'child', name: 'Child', cost: 0, requires: ['root'], unlocked: false, effects: bonus },
      ] });
      const keys = getWidgetEffectSources(currentHero().sheets[0].widgets.find((entry) => entry.id === 'source')!).map((source) => source.key);
      const setActive = useStore.getState().setWidgetEffectSourceActive;
      expect(() => setActive('source', keys[1], true)).toThrow('Requires Root');
      setActive('source', keys[0], true);
      setActive('source', keys[1], true);
      expect(strengthValue()).toBe(12);
      expect(() => setActive('source', keys[0], false)).toThrow('dependent skills');
      setActive('source', keys[1], false);
      setActive('source', keys[0], false);
      expect(strengthValue()).toBe(10);
    });

    it('rejects missing targets, stale sources and locked or editing widgets without changing activation', () => {
      addSource('TOGGLE', { effects: [{ id: 'missing', amount: 1, target: { kind: 'variable', variableId: 'missing' } }] });
      const setActive = useStore.getState().setWidgetEffectSourceActive;
      expect(() => setActive('source', 'switch', true)).toThrow('select a target');
      expect(() => setActive('source', 'stale', false)).toThrow('no longer available');
      useStore.getState().updateWidgetData('source', { effects: bonus });
      useStore.getState().toggleWidgetLock('source');
      expect(() => setActive('source', 'switch', true)).toThrow('locked');
      useStore.getState().toggleWidgetLock('source');
      useStore.getState().setEditingWidgetId('source');
      expect(() => setActive('source', 'switch', true)).toThrow('Finish editing');
      useStore.getState().setEditingWidgetId(null);
      useStore.getState().setMode('print');
      expect(() => setActive('source', 'switch', true)).toThrow();
      expect(strengthValue()).toBe(10);
    });

    it('saves and clears formulas from Automations with reconciliation and undo/redo', () => {
      addSource('TOGGLE', { toggleState: false, fieldFormulas: { state: '0' }, effects: bonus });
      const request = collectCharacterFormulas(currentHero()).find((entry) => entry.widgetId === 'source')!;
      useStore.getState().saveCharacterFormula(request, '1');
      expect(strengthValue()).toBe(11);
      useStore.getState().undo();
      expect(strengthValue()).toBe(10);
      useStore.getState().redo();
      expect(strengthValue()).toBe(11);
      expect(() => useStore.getState().saveCharacterFormula(request, '2')).toThrow('Reopen its editor');
      const fresh = collectCharacterFormulas(currentHero()).find((entry) => entry.widgetId === 'source')!;
      useStore.getState().saveCharacterFormula(fresh, undefined);
      expect(strengthValue()).toBe(11);
      expect(collectCharacterFormulas(currentHero()).some((entry) => entry.widgetId === 'source')).toBe(false);
      useStore.getState().setMode('print');
      expect(() => useStore.getState().saveCharacterFormula(fresh, '0')).toThrow('no longer editable');
    });

    it.each<{ type: WidgetType; off: WidgetData; on: WidgetData }>([
      { type: 'TOGGLE', off: { toggleState: false, effects: bonus }, on: { toggleState: true, effects: bonus } },
      { type: 'TOGGLE_GROUP', off: { toggleItems: [{ id: 'condition', name: 'Blessed', active: false, effects: bonus }] }, on: { toggleItems: [{ id: 'condition', name: 'Blessed', active: true, effects: bonus }] } },
      { type: 'CHECKBOX', off: { checkboxItems: [{ id: 'check', name: 'Prepared', checked: false, effects: bonus }] }, on: { checkboxItems: [{ id: 'check', name: 'Prepared', checked: true, effects: bonus }] } },
      { type: 'MIXED_FIELDS', off: { mixedFields: [{ id: 'switch', name: 'Stance', type: 'switch', value: false, effects: bonus }] }, on: { mixedFields: [{ id: 'switch', name: 'Stance', type: 'switch', value: true, effects: bonus }] } },
      { type: 'SKILL_TREE', off: { skillNodes: [{ id: 'skill', name: 'Might', cost: 1, requires: [], unlocked: false, effects: bonus }] }, on: { skillNodes: [{ id: 'skill', name: 'Might', cost: 1, requires: [], unlocked: true, effects: bonus }] } },
    ])('reverses $type bonuses while preserving edits, deletion, undo and persistence', ({ type, off, on }) => {
      addSource(type, off);
      expect(strengthValue()).toBe(10);
      useStore.getState().updateWidgetData('source', on);
      expect(strengthValue()).toBe(11);
      useStore.getState().updateWidgetData('stats', { displayNumbers: [{ id: 'strength', label: 'Strength', value: 15, maxValue: 20 }] });
      useStore.getState().updateWidgetData('source', off);
      expect(strengthValue()).toBe(14);
      useStore.getState().updateWidgetData('source', on);
      expect(strengthValue()).toBe(15);
      useStore.getState().removeWidget('source');
      expect(strengthValue()).toBe(14);
      useStore.getState().undo();
      expect(strengthValue()).toBe(15);
      useStore.getState()._replaceWorkspaceState({ characters: [JSON.parse(JSON.stringify(currentHero()))], activeCharacterId: 'effects', mode: 'play' });
      expect(strengthValue()).toBe(15);
      useStore.getState().updateWidgetData('source', off);
      expect(strengthValue()).toBe(14);
    });

    it('binds a new timed entry atomically, expires on rest and reapplies on reset', () => {
      addSource('TIME_TRACKER', { roundMode: true });
      useStore.getState().updateWidgetData('stats', { displayNumbers: [{ label: 'Strength', value: 10 }] });
      const target = collectNumericTargets(currentHero()).find((entry) => entry.ref.kind === 'widget' && entry.ref.widgetId === 'stats' && entry.ref.field === 'value')!.ref;
      useStore.getState().addTimedEffect('source', { name: 'Bless', remainingSeconds: 2, initialSeconds: 2, effects: [{ id: 'bless', target, amount: 1 }] });
      const afterAdd = currentHero();
      const timed = afterAdd.sheets[0].widgets.find((entry) => entry.id === 'source')!.data.timedEffects![0];
      expect(timed.id).toBeTruthy();
      expect(afterAdd.sheets[0].widgets[0].data.displayNumbers![0]).toMatchObject({ value: 11 });
      expect(afterAdd.sheets[0].widgets[0].data.displayNumbers![0].valueLabel).toBeUndefined();
      useStore.getState().undo();
      expect(currentHero().sheets[0].widgets[0].data.displayNumbers![0].id).toBeUndefined();
      useStore.getState().redo();
      useStore.getState().performRest({ passTimeSeconds: 1 });
      expect(findNumericTarget(currentHero(), timed.effects![0].target!)!.value).toBe(11);
      useStore.getState().performRest({ passTimeSeconds: 1 });
      expect(findNumericTarget(currentHero(), timed.effects![0].target!)!.value).toBe(10);
      useStore.getState().updateWidgetData('source', { timedEffects: [{ ...timed, remainingSeconds: 2 }] });
      expect(findNumericTarget(currentHero(), timed.effects![0].target!)!.value).toBe(11);
      useStore.getState().updateWidgetData('source', { timedEffects: [] });
      expect(findNumericTarget(currentHero(), timed.effects![0].target!)!.value).toBe(10);
    });

    it.each(['rising', 'falling'] as const)('applies only the current %s zone and reacts to effect-controlled track values', (direction) => {
      const mild = direction === 'rising' ? 3 : 7;
      const severe = direction === 'rising' ? 7 : 3;
      addSource('THRESHOLD_TRACK', {
        currentValue: direction === 'rising' ? 0 : 10, minValue: 0, maxValue: 10, trackThresholdMode: direction,
        trackThresholds: [
          { id: 'mild', name: 'Mild', value: mild, effects: [{ ...bonus[0], amount: -1 }] },
          { id: 'severe', name: 'Severe', value: severe, effects: [{ ...bonus[0], amount: -3 }] },
        ],
      });
      expect(strengthValue()).toBe(10);
      useStore.getState().updateWidgetData('source', { currentValue: mild });
      expect(strengthValue()).toBe(9);
      useStore.getState().updateWidgetData('source', { currentValue: severe });
      expect(strengthValue()).toBe(7);
      useStore.getState().updateWidgetData('source', { currentValue: direction === 'rising' ? 2 : 8 });
      expect(strengthValue()).toBe(10);
      useStore.getState().updateWidgetData('bag', { autoActivateItems: true });
      useStore.getState().saveInventoryItem({ sourceWidgetId: 'bag', targetWidgetId: 'bag', item: {
        ...effectRing, effects: [{ id: 'track', amount: direction === 'rising' ? 2 : -2, target: { kind: 'widget', widgetId: 'source', field: 'currentValue' } }],
      } });
      expect(strengthValue()).toBe(9);
      useStore.getState().setInventoryItemActive('bag', 'ring', false);
      expect(strengthValue()).toBe(10);
    });

    it('allocates stable condition identities on save and rejects a stale legacy source', () => {
      addSource('TOGGLE_GROUP', { toggleItems: [{ name: 'Blessed', active: false }, { name: 'Cursed', active: false }] });
      const sourceWidget = () => currentHero().sheets[0].widgets.find((entry) => entry.id === 'source')!;
      const stale = getWidgetEffectSources(sourceWidget())[1].key;
      useStore.getState().saveWidgetEffects('source', getWidgetEffectSources(sourceWidget())[0].key, bonus);
      const entries = sourceWidget().data.toggleItems!;
      expect(entries[0].id).toBeTruthy();
      useStore.getState().updateWidgetData('source', { toggleItems: [{ ...entries[0], name: 'Renamed', active: true }, entries[1]].reverse() });
      expect(strengthValue()).toBe(11);
      expect(() => useStore.getState().saveWidgetEffects('source', stale, bonus)).toThrow('source changed');
      useStore.getState().performRest({ clearConditions: true });
      expect(strengthValue()).toBe(10);
    });

    it('reconciles formula-driven standalone and mixed switches before dependent formulas', () => {
      addSource('TOGGLE', { toggleState: false, effects: bonus, fieldFormulas: { state: '@enabled' } });
      const variable = useStore.getState().addVariable({ label: 'enabled', value: 0 })!;
      useStore.getState().updateWidgetData('stats', { displayNumbers: [
        { id: 'strength', label: 'Strength', value: 10, valueLabel: 'str' },
        { id: 'derived', label: 'Double', value: 20, valueFormula: '@str * 2' },
      ] });
      useStore.getState().updateVariable(variable, { value: 1 });
      expect(strengthValue()).toBe(11);
      expect(currentHero().sheets[0].widgets[0].data.displayNumbers![1].value).toBe(22);
      useStore.getState().convertWidget('source', 'MIXED_FIELDS');
      expect(strengthValue()).toBe(11);
      useStore.getState().updateVariable(variable, { value: 0 });
      expect(strengthValue()).toBe(10);
      expect(currentHero().sheets[0].widgets[0].data.displayNumbers![1].value).toBe(20);
    });

    it('remaps state-source references for group and whole-character copies without doubling bonuses', () => {
      addSource('SKILL_TREE', { skillNodes: [
        { id: 'root-skill', name: 'Root', cost: 0, requires: [], unlocked: true },
        { id: 'child-skill', name: 'Might', cost: 0, requires: ['root-skill'], unlocked: true, effects: bonus },
      ] });
      const before = currentHero();
      useStore.getState()._replaceWorkspaceState({ characters: [{ ...before, sheets: [{ ...before.sheets[0], widgets: before.sheets[0].widgets.map((entry) => entry.id === 'stats' || entry.id === 'source' ? { ...entry, groupId: 'state-group' } : entry) }] }], activeCharacterId: 'effects', mode: 'play' });
      useStore.getState().cloneGroup('state-group');
      const copied = currentHero().sheets[0].widgets.find((entry) => entry.type === 'SKILL_TREE' && entry.id !== 'source')!;
      const copiedNodes = copied.data.skillNodes!;
      expect(copiedNodes[1].requires).toEqual([copiedNodes[0].id]);
      expect(copiedNodes[1].effects![0].id).not.toBe(bonus[0].id);
      const copiedTarget = copiedNodes[1].effects![0].target!;
      expect(copiedTarget).not.toEqual(strength);
      expect(findNumericTarget(currentHero(), copiedTarget)!.value).toBe(11);
      useStore.getState().updateWidgetData(copied.id, { skillNodes: copiedNodes.map((node) => ({ ...node, unlocked: false })) });
      expect(findNumericTarget(currentHero(), copiedTarget)!.value).toBe(10);
      expect(strengthValue()).toBe(11);
      const whole = cloneCharacterForWorkspace(currentHero());
      useStore.getState()._replaceWorkspaceState({ characters: [whole], activeCharacterId: whole.id, mode: 'play' });
      const originalCopy = whole.sheets[0].widgets.find((entry) => entry.type === 'SKILL_TREE' && entry.data.skillNodes!.some((node) => node.unlocked))!;
      const nodes = originalCopy.data.skillNodes!;
      expect(findNumericTarget(whole, nodes[1].effects![0].target!)!.value).toBe(11);
      useStore.getState().updateWidgetData(originalCopy.id, { skillNodes: nodes.map((node) => ({ ...node, unlocked: false })) });
      expect(findNumericTarget(useStore.getState().characters[0], nodes[1].effects![0].target!)!.value).toBe(10);
    });
  });

const hero: Character = {
  id: 'c1',
  name: 'Hero',
  activeSheetId: 's1',
  sheets: [{
    id: 's1',
    name: 'Main',
    widgets: [
      { id: 'table', type: 'TABLE', x: 40, y: 60, w: 200, h: 100, groupId: 'g1', data: { label: 'Gear', columns: ['Name', 'Qty'], rows: [{ cells: ['Rope', '2'] }, { cells: ['Torch', '5'] }] } },
    ],
  }],
};

const widget = () => useStore.getState().characters[0].sheets[0].widgets[0];

describe('convertWidget', () => {
  beforeEach(() => {
    useUndoStore.getState().clearAllHistory();
    useStore.getState()._replaceWorkspaceState({ characters: [hero], activeCharacterId: hero.id, mode: 'play' });
  });

  it('changes the type in place, honouring the picked item and a taller height', () => {
    useStore.getState().convertWidget('table', 'LIST', { choice: 1, height: 233 });

    expect(widget()).toMatchObject({ id: 'table', type: 'LIST', x: 40, y: 60, w: 200, groupId: 'g1' });
    expect(widget().data).toMatchObject({ label: 'Gear', items: ['2', '5'] });
    expect(widget().data.rows).toBeUndefined();
    expect(widget().h).toBe(230);
  });

  it('keeps the size when no height is given, and is undone in one step', () => {
    useStore.getState().convertWidget('table', 'CHECKBOX');
    expect(widget().type).toBe('CHECKBOX');
    expect(widget().h).toBe(100);

    useStore.getState().undo();
    expect(widget().type).toBe('TABLE');
    expect(widget().data.rows).toHaveLength(2);
  });

  it('ignores a target the widget cannot convert to', () => {
    useStore.getState().convertWidget('table', 'CALENDAR');
    expect(widget().type).toBe('TABLE');
  });
});
