import { describe, expect, it } from 'vitest';
import type { Character, Widget } from '../types';
import { collectCharacterFormulas, previewCharacterFormula, updateCharacterFormula } from './characterFormulas';

function hero(widgets: Widget[] = []): Character {
  return {
    id: 'hero', name: 'Hero', activeSheetId: 'main',
    variables: [{ id: 'str', label: 'strength', value: 16 }, { id: 'prof', label: 'proficiency', value: 2, formula: '2' }],
    sheets: [{ id: 'main', name: 'Main', widgets }],
  };
}
const stats: Widget = {
  id: 'stats', type: 'NUMBER_DISPLAY', x: 0, y: 0,
  data: { label: 'Stats', displayNumbers: [
    { id: 'bonus', label: 'Strength bonus', value: 3, valueLabel: 'bonus', valueFormula: 'floor((@strength - 10) / 2)' },
    { id: 'unlabeled', label: 'Unlabeled number', value: 5, maxValue: 10, maxValueFormula: '@strength + 1' },
  ] },
};

describe('character formula catalog', () => {
  it.each(['1', '-2', '+1', '0.5', ' 10 '])('does not list an event that only adds a fixed amount (%s) as a formula source', (amount) => {
    const character = hero();
    character.events = [{
      id: 'fixed-bonus', name: 'Add one strength', enabled: true, trigger: { kind: 'manual' },
      steps: [{ id: 'step', effects: [{ id: 'add', kind: 'label.add', target: 'strength', params: { amount } }] }],
    }];
    expect(collectCharacterFormulas(character).filter((entry) => entry.eventId)).toEqual([]);
  });

  it('excludes literal event settings while keeping calculations and unresolved formulas', () => {
    const character = hero();
    character.events = [{
      id: 'settings', enabled: true,
      trigger: { kind: 'value.crosses', params: { threshold: '50%' } },
      steps: [{ id: 'step', effects: [
        { id: 'name', kind: 'label.set', params: { value: 'Battle-ready hero' } },
        { id: 'heal', kind: 'health.heal', params: { amount: 'full' } },
        { id: 'quoted', kind: 'label.set', params: { value: '"Text mentioning @strength"' } },
        { id: 'arithmetic', kind: 'label.add', params: { amount: '1 + 2' } },
        { id: 'function', kind: 'label.add', params: { amount: 'floor(3 / 2)' } },
        { id: 'reference', kind: 'label.set', params: { value: '@missing' } },
        { id: 'invalid', kind: 'label.add', params: { amount: '1 +' } },
        { id: 'inline', kind: 'log.message', params: { message: 'Strength {@strength}' } },
      ] }],
    }];
    expect(collectCharacterFormulas(character).filter((entry) => entry.eventId).map((entry) => entry.formula))
      .toEqual(['1 + 2', 'floor(3 / 2)', '@missing', '1 +', '@strength']);
  });

  it('excludes healing dice and all roll expressions while retaining actual formulas', () => {
    const character = hero([
      { id: 'rest', type: 'REST_BUTTON', x: 0, y: 0, data: { healDiceExpression: '2d6' } },
      { id: 'dice', type: 'DICE_ROLLER', x: 0, y: 0, data: { diceExpression: '@strength + 1', fieldFormulas: { modifier: '@strength - 10' } } },
      { id: 'notes', type: 'TEXT', x: 0, y: 0, data: { text: 'Roll {1d20 + @strength} or {{@strength}d6}. Bonus {@strength / 2}.' } },
    ]);
    character.variables!.push({ id: 'message', label: 'message', value: 'Roll {1d6}', formula: '"Roll {1d6}"' });
    character.events = [{
      id: 'event', enabled: true, trigger: { kind: 'manual' }, steps: [{
        id: 'step', effects: [
          { id: 'roll', kind: 'dice.roll', params: { dice: '1d20 + @strength' } },
          { id: 'add-dice', kind: 'label.add', target: 'strength', params: { amount: '1d6 + @strength' } },
          { id: 'add-wrapped', kind: 'label.add', target: 'strength', params: { amount: '{1d6}' } },
          { id: 'set-dice', kind: 'label.set', target: 'strength', params: { value: '1d8' } },
          { id: 'set-dynamic-dice', kind: 'label.set', target: 'strength', params: { value: '{@strength}d6' } },
          { id: 'add-formula', kind: 'label.add', target: 'strength', params: { amount: '@strength / 4' } },
          { id: 'log', kind: 'log.message', params: { message: 'Roll {1d4}. Value {@strength + 2}.' } },
        ],
      }],
    }];
    const entries = collectCharacterFormulas(character);
    expect(entries.map((entry) => entry.formula)).toEqual([
      '2', '"Roll {1d6}"', '@strength - 10', '@strength / 2', '@strength / 4', '@strength + 2',
    ]);
    expect(entries.some((entry) => entry.widgetId === 'rest')).toBe(false);
  });

  it('includes unlabeled values, nested formulas, inactive notes tabs and every sheet', () => {
    const character = hero([
      stats,
      { id: 'dice', type: 'DICE_ROLLER', x: 0, y: 0, data: { label: 'Attack {@strength}', modifier: 0, fieldLabels: { modifier: 'attack' }, fieldFormulas: { modifier: '@strength - 10' }, diceExpression: '2d20kh + @strength' } },
      { id: 'notes', type: 'TEXT', x: 0, y: 0, data: { noteTabs: [
        { id: 'tab1', name: 'First', text: 'Bonus {@strength}' },
        { id: 'tab2', name: 'Second', text: 'Other {1 + 2}' },
      ], activeNoteTabId: 'tab1' } },
    ]);
    character.sheets.push({ id: 'other', name: 'Other sheet', widgets: [
      { id: 'clock', type: 'PROGRESS_CLOCK', x: 0, y: 0, data: { clockItems: [{ id: 'clock1', name: 'Ritual', segments: 6, value: 1, segmentsFormula: '@strength' }] } },
    ] });
    const entries = collectCharacterFormulas(character);
    expect(entries.map((entry) => entry.formula)).toEqual(expect.arrayContaining([
      '2', 'floor((@strength - 10) / 2)', '@strength + 1', '@strength - 10', '@strength', '1 + 2',
    ]));
    expect(entries.find((entry) => entry.formula === '@strength - 10')?.sourceLabels).toEqual(['attack']);
    expect(entries.find((entry) => entry.formula === '2d20kh + @strength')).toBeUndefined();
    expect(entries.find((entry) => entry.formula === '1 + 2')).toMatchObject({ noteTabId: 'tab2', category: 'inline' });
    expect(entries.find((entry) => entry.widgetId === 'clock')).toMatchObject({ context: 'Other sheet', sheetId: 'other' });
    expect(entries.find((entry) => entry.formula === '@strength + 1')?.sourceLabels).toEqual([]);
    expect(new Set(entries.map((entry) => entry.key)).size).toBe(entries.length);
  });

  it('uses inline token semantics, avoids rich-text mirrors and ignores markup attributes and escaped tokens', () => {
    const character = hero([{ id: 'notes', type: 'TEXT', x: 0, y: 0, data: {
      text: 'Mirrored {@strength}',
      richText: '<p title="{99}">Bonus {IF(@strength &gt; 10, 1, 0)}. {{@escaped}} {[Rage]} {@strength} {@strength}</p><p>{1d20 + @strength}</p>',
    } }]);
    const entries = collectCharacterFormulas(character).filter((entry) => entry.widgetId === 'notes');
    expect(entries.map((entry) => entry.formula)).toEqual(['IF(@strength > 10, 1, 0)', '@strength', '@strength']);
    expect(new Set(entries.map((entry) => entry.key)).size).toBe(3);
  });

  it('lists table cell and row/column templates without expanding one template into duplicate rows', () => {
    const character = hero([{ id: 'table', type: 'TABLE', x: 0, y: 0, data: {
      columns: ['Item', 'Bonus'],
      rows: [{ cells: [{ value: '3', formula: '@strength / 2' }, ''] }, { cells: ['', ''] }],
      tableColumnSettings: [{}, { formula: '@strength + 2' }],
      tableRowSettings: [{ formula: '3' }],
    } }]);
    const entries = collectCharacterFormulas(character).filter((entry) => entry.widgetId === 'table');
    expect(entries.map((entry) => entry.title)).toEqual(['Row 1 · Cell A · Value', 'Column B · Value', 'Row 1 · Value']);
    expect(entries.map((entry) => entry.editable)).toEqual([true, false, false]);
  });

  it('includes Compendium definitions and event formulas with the correct runtime labels', () => {
    const character = hero();
    character.compendium = [{ id: 'gear', name: 'Gear', items: [{ id: 'ring', name: 'Ring', fields: [{ id: 'field', name: 'Bonus', type: 'text', value: '3', valueFormula: '@strength / 2' }] }] }];
    character.events = [{
      id: 'event', name: 'Attack', enabled: true, trigger: { kind: 'manual' }, steps: [
        { id: 'step1', effects: [{ id: 'roll', kind: 'dice.roll', params: { dice: '1d20 + @strength' }, resultName: 'attack' }] },
        { id: 'step2', condition: '@event_attack_total > 10', effects: [
          { id: 'xp', kind: 'label.add', target: 'strength', params: { amount: '@event_attack_total / 2' } },
          { id: 'log', kind: 'log.message', params: { message: 'Total {@event_attack_total}' } },
        ], otherwise: [{ id: 'miss', kind: 'log.message', params: { message: 'Miss {@missing}' } }] },
      ],
    }];
    const entries = collectCharacterFormulas(character);
    expect(entries.find((entry) => entry.category === 'library')).toMatchObject({ groupTitle: 'Gear', formula: '@strength / 2' });
    expect(entries.filter((entry) => entry.eventId === 'event')).toHaveLength(4);
    const condition = entries.find((entry) => entry.formula === '@event_attack_total > 10')!;
    expect(previewCharacterFormula(character, condition)).toMatchObject({ kind: 'runtime' });
    expect(previewCharacterFormula(character, entries.find((entry) => entry.formula === '@missing')!)).toMatchObject({ kind: 'problem', message: 'Unavailable labels: @missing' });
  });

  it('reports unavailable labels, numeric/text mismatches and cycles', () => {
    const character = hero([stats]);
    const entry = collectCharacterFormulas(character).find((entry) => entry.formula === '@strength + 1')!;
    expect(previewCharacterFormula(character, entry)).toEqual({ kind: 'value', value: 17 });
    expect(previewCharacterFormula(character, { ...entry, formula: '@absent + 1' }).kind).toBe('problem');
    expect(previewCharacterFormula(character, { ...entry, formula: '"Text"' }).kind).toBe('problem');
    const bonus = collectCharacterFormulas(character).find((item) => item.sourceLabels.includes('bonus'))!;
    expect(previewCharacterFormula(character, { ...bonus, formula: '@bonus + 1' }).message).toContain('Circular reference');
  });

  it('edits a stable entry after reorder, preserves surrounding data, and clears only its formula', () => {
    const character = hero([stats]);
    const request = collectCharacterFormulas(character).find((entry) => entry.sourceLabels.includes('bonus'))!;
    const reordered = hero([{ ...stats, data: { ...stats.data, displayNumbers: [...stats.data.displayNumbers!].reverse() } }]);
    const updated = updateCharacterFormula(reordered, request, '@strength / 2');
    expect(updated.sheets[0].widgets[0].data.displayNumbers![1]).toMatchObject({ id: 'bonus', valueFormula: '@strength / 2', value: 3, valueLabel: 'bonus' });
    expect(updated.variables).toBe(reordered.variables);
    expect(updated.sheets[0].widgets[0].data.displayNumbers![0]).toBe(reordered.sheets[0].widgets[0].data.displayNumbers![0]);
    const newRequest = collectCharacterFormulas(updated).find((entry) => entry.sourceLabels.includes('bonus'))!;
    expect(updateCharacterFormula(updated, newRequest, undefined).sheets[0].widgets[0].data.displayNumbers![1].valueFormula).toBeUndefined();
    expect(character.sheets[0].widgets[0].data.displayNumbers![0].valueFormula).toBe(request.formula);
  });

  it('rejects stale, deleted, foreign-character and invalid formula edits', () => {
    const character = hero([stats]);
    const request = collectCharacterFormulas(character).find((entry) => entry.sourceLabels.includes('bonus'))!;
    expect(() => updateCharacterFormula(character, request, '@missing')).toThrow('Unavailable labels');
    expect(() => updateCharacterFormula({ ...character, id: 'other' }, request, '4')).toThrow('Reopen its editor');
    const changed = updateCharacterFormula(character, request, '4');
    expect(() => updateCharacterFormula(changed, request, '5')).toThrow('Reopen its editor');
    expect(() => updateCharacterFormula(hero(), request, '5')).toThrow('Reopen its editor');
    const legacy = hero([{ ...stats, data: { displayNumbers: [{ label: 'Legacy', value: 0, valueFormula: '3' }] } }]);
    const legacyRequest = collectCharacterFormulas(legacy).find((entry) => entry.widgetId === 'stats')!;
    const neighbor = hero([{ ...stats, data: { displayNumbers: [{ label: 'Neighbor', value: 0, valueFormula: '3' }] } }]);
    expect(() => updateCharacterFormula(neighbor, legacyRequest, '4')).toThrow('Reopen its editor');
  });
});
