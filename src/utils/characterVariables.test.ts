import { describe, expect, it } from 'vitest';
import type { Character, Widget } from '../types';
import { buildDependencyGraph, collectLabels, detectCircularReference, getAvailableLabels, resolveCharacterFormulas } from './formulaEngine';
import {
  buildReferenceIndex,
  collectLabelEntries,
  getLabelReferences,
  getMissingLabels,
  removeLabelFromCharacter,
  renameLabelInCharacter,
  sanitizeLabelInput,
  suggestVariableLabel,
  validateLabelName,
} from './characterVariables';

function character(widgets: Widget[], variables: Character['variables'] = []): Character {
  return {
    id: 'c1',
    name: 'Hero',
    activeSheetId: 's1',
    sheets: [{ id: 's1', name: 'Main', widgets }],
    variables,
  };
}

const stats: Widget = {
  id: 'w-stats',
  type: 'NUMBER_DISPLAY',
  x: 0,
  y: 0,
  data: {
    label: 'Stats',
    displayNumbers: [
      { label: 'Strength', value: 16, valueLabel: 'str' },
      { label: 'Bonus', value: 0, valueLabel: 'str_mod', valueFormula: 'floor((@str - 10) / 2) + @prof' },
    ],
  },
};

const notes: Widget = {
  id: 'w-notes',
  type: 'TEXT',
  x: 0,
  y: 0,
  data: { label: 'Notes', text: 'Attack {1d20 + @str_mod + @prof}. Mail me at hero@example.com' },
};

const table: Widget = {
  id: 'w-table',
  type: 'TABLE',
  x: 0,
  y: 0,
  data: {
    label: 'Gear',
    rows: [{ cells: ['2', '3'] }, { cells: ['4', '5'] }],
    tableColumnSettings: [{ label: 'qty' }, {}],
    tableRowSettings: [],
  },
};

describe('custom variables in the formula engine', () => {
  it('exposes variables as labels and in the label picker', () => {
    const hero = character([stats], [{ id: 'v1', label: 'prof', value: 2 }, { id: 'v2', label: 'title', value: 'Sir' }]);
    expect(collectLabels(hero)).toMatchObject({ prof: 2, title: 'Sir', str: 16 });
    expect(getAvailableLabels(hero)[0]).toEqual({ label: 'prof', value: 2, widgetLabel: 'Standalone labels', sheetName: 'Character' });
  });

  it('resolves variable formulas and lets widgets use the result', () => {
    const hero = character([stats], [
      { id: 'v1', label: 'level', value: 5 },
      { id: 'v2', label: 'prof', value: 0, formula: 'ceil(@level / 4) + 1' },
    ]);
    const resolved = resolveCharacterFormulas(hero)!;
    expect(resolved.variables?.[1].value).toBe(3);
    expect(resolved.sheets[0].widgets[0].data.displayNumbers?.[1].value).toBe(6);
    expect(resolveCharacterFormulas(resolved)).toBeNull();
  });

  it('detects cycles through variables', () => {
    const hero = character([stats], [{ id: 'v1', label: 'prof', value: 0, formula: '@level' }]);
    expect(buildDependencyGraph(hero).prof).toEqual(['level']);
    expect(detectCircularReference('prof', '@str_mod', hero)).toEqual(['prof', 'str_mod', 'prof']);
  });
});

describe('label entries', () => {
  it('lists custom variables first, then widget labels with context', () => {
    const hero = character([stats, table], [{ id: 'v1', label: 'prof', value: 2 }]);
    const entries = collectLabelEntries(hero);
    expect(entries.map((entry) => [entry.label, entry.kind, entry.context])).toEqual([
      ['prof', 'custom', 'Value'],
      ['str', 'field', 'Strength'],
      ['str_mod', 'field', 'Bonus'],
      ['qty', 'column', 'Column A'],
    ]);
    expect(entries[2].formula).toBe('floor((@str - 10) / 2) + @prof');
    expect(entries[3].generatedCount).toBe(2);
  });
});

describe('label references', () => {
  const hero = character([stats, notes, table], [{ id: 'v1', label: 'total', value: 0, formula: 'SUM(@qty) + @qty1 + @ghost' }]);
  const index = buildReferenceIndex(hero);

  it('finds references in formulas and inline text but ignores emails', () => {
    expect(getLabelReferences(index, 'str_mod', 'field').map((ref) => ref.sourceId)).toEqual(['w-notes']);
    expect(getLabelReferences(index, 'prof', 'field').map((ref) => ref.sourceId)).toEqual(['w-stats', 'w-notes']);
    expect(index.byRef.has('example')).toBe(false);
  });

  it('merges generated label references for column prefixes', () => {
    expect(getLabelReferences(index, 'qty', 'column')).toEqual([{ sourceId: 'variable:v1', title: '@total', count: 2 }]);
  });

  it('reports labels used in formulas that nothing defines', () => {
    const labels = collectLabels(hero);
    expect(getMissingLabels(index, collectLabelEntries(hero, labels), labels)).toEqual(['ghost', 'prof']);
  });

  it('leaves trigger data used only by events to the event checks', () => {
    const withEvent: Character = {
      ...character([stats], [
        { id: 'v1', label: 'prof', value: 2 },
        { id: 'v2', label: 'dmg', value: 0, formula: '@event_shared' },
      ]),
      events: [{
        id: 'e1',
        enabled: true,
        trigger: { kind: 'health.damaged', widgetId: 'w-hp' },
        condition: '@event_damage > @event_shared',
        effects: [{ id: 'f1', kind: 'label.add', target: 'prof', params: { amount: '@event_damage' } }],
      }],
    };
    const labels = collectLabels(withEvent);
    expect(getMissingLabels(buildReferenceIndex(withEvent), collectLabelEntries(withEvent, labels), labels)).toEqual(['event_shared']);
  });
});

describe('renaming and removing labels', () => {
  it('renames a widget label and its references', () => {
    const hero = character([stats, notes], [{ id: 'v1', label: 'dmg', value: 0, formula: '@str_mod * 2' }]);
    const renamed = renameLabelInCharacter(hero, 'str_mod', 'might', true);
    expect(renamed.sheets[0].widgets[0].data.displayNumbers?.[1].valueLabel).toBe('might');
    expect(renamed.sheets[0].widgets[1].data.text).toBe('Attack {1d20 + @might + @prof}. Mail me at hero@example.com');
    expect(renamed.variables?.[0].formula).toBe('@might * 2');
    expect(renamed.sheets[0].widgets[0].data.displayNumbers?.[0]).toBe(hero.sheets[0].widgets[0].data.displayNumbers?.[0]);
  });

  it('does not touch longer labels that share the prefix', () => {
    const hero = character([stats], [{ id: 'v1', label: 'x', value: 0, formula: '@str + @str_mod' }]);
    expect(renameLabelInCharacter(hero, 'str', 'strength', true).variables?.[0].formula).toBe('@strength + @str_mod');
  });

  it('can rename without updating references', () => {
    const hero = character([stats, notes]);
    const renamed = renameLabelInCharacter(hero, 'str_mod', 'might', false);
    expect(renamed.sheets[0].widgets[1]).toBe(hero.sheets[0].widgets[1]);
  });

  it('renames column prefixes together with generated references', () => {
    const hero = character([table], [{ id: 'v1', label: 'total', value: 0, formula: 'SUM(@qty) + @qty2' }]);
    const renamed = renameLabelInCharacter(hero, 'qty', 'count', true);
    expect(renamed.sheets[0].widgets[0].data.tableColumnSettings?.[0]?.label).toBe('count');
    expect(renamed.variables?.[0].formula).toBe('SUM(@count) + @count2');
  });

  it('renames custom variables', () => {
    const hero = character([stats], [{ id: 'v1', label: 'prof', value: 2 }]);
    const renamed = renameLabelInCharacter(hero, 'prof', 'proficiency', true);
    expect(renamed.variables?.[0].label).toBe('proficiency');
    expect(renamed.sheets[0].widgets[0].data.displayNumbers?.[1].valueFormula).toBe('floor((@str - 10) / 2) + @proficiency');
  });

  it('removes widget labels but keeps their formulas, and deletes custom variables', () => {
    const hero = character([stats], [{ id: 'v1', label: 'prof', value: 2 }]);
    const withoutMod = removeLabelFromCharacter(hero, 'str_mod');
    expect(withoutMod.sheets[0].widgets[0].data.displayNumbers?.[1]).toEqual({ label: 'Bonus', value: 0, valueFormula: 'floor((@str - 10) / 2) + @prof' });
    expect(removeLabelFromCharacter(hero, 'prof').variables).toEqual([]);
  });

  it('leaves the character untouched when the label does not exist', () => {
    const hero = character([stats]);
    expect(removeLabelFromCharacter(hero, 'nope')).toBe(hero);
  });
});

describe('label name helpers', () => {
  it('validates names', () => {
    expect(validateLabelName('', [])).toBe('empty');
    expect(validateLabelName('1abc', [])).toBe('invalid');
    expect(validateLabelName('str', ['str'])).toBe('taken');
    expect(validateLabelName('str', ['str'], 'str')).toBeNull();
    expect(validateLabelName('_ok2', ['str'])).toBeNull();
  });

  it('sanitizes and suggests names', () => {
    expect(sanitizeLabelInput('max hp!')).toBe('max_hp');
    expect(suggestVariableLabel(['var1', 'var2'])).toBe('var3');
  });
});
