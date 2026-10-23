import { describe, expect, it } from 'vitest';
import type { Character } from '../types';
import { collectLabelEntries } from './characterVariables';
import { getAvailableLabels } from './formulaEngine';
import {
  DEFAULT_VARIABLE_GROUP_ID,
  DEFAULT_VARIABLE_GROUP_NAME,
  addVariableGroup,
  deleteVariableGroup,
  getVariableGroups,
  moveVariableToGroup,
  renameVariableGroup,
} from './variableGroups';

const makeCharacter = (overrides: Partial<Character> = {}): Character => ({
  id: 'c1',
  name: 'Hero',
  sheets: [{ id: 's1', name: 'Main', widgets: [] }],
  activeSheetId: 's1',
  variables: [
    { id: 'a', label: 'prof', value: 2 },
    { id: 'b', label: 'bonus', value: 1 },
  ],
  ...overrides,
});

const order = (character: Character) => character.variables?.map((variable) => `${variable.label}:${variable.groupId ?? '-'}`);

describe('variable groups', () => {
  it('lists an implicit default section only when it has variables', () => {
    expect(getVariableGroups(makeCharacter())).toEqual([{ id: DEFAULT_VARIABLE_GROUP_ID, name: DEFAULT_VARIABLE_GROUP_NAME }]);
    expect(getVariableGroups(makeCharacter({ variables: [] }))).toEqual([]);
  });

  it('puts variables with unknown sections in the default section', () => {
    const hero = makeCharacter({
      variables: [{ id: 'a', label: 'prof', value: 2, groupId: 'gone' }],
      variableGroups: [{ id: 'g1', name: 'Combat' }],
    });
    expect(getVariableGroups(hero).map((group) => group.id)).toEqual([DEFAULT_VARIABLE_GROUP_ID, 'g1']);
    expect(collectLabelEntries(hero)[0].variableGroupId).toBe(DEFAULT_VARIABLE_GROUP_ID);
  });

  it('adds sections after the default one and keeps the default section', () => {
    const hero = addVariableGroup(makeCharacter(), { id: 'g1', name: 'Combat' });
    expect(hero.variableGroups?.map((group) => group.name)).toEqual([DEFAULT_VARIABLE_GROUP_NAME, 'Combat']);
  });

  it('renames sections, including the default one', () => {
    const hero = renameVariableGroup(makeCharacter(), DEFAULT_VARIABLE_GROUP_ID, '  Bonuses ');
    expect(getVariableGroups(hero)).toEqual([{ id: DEFAULT_VARIABLE_GROUP_ID, name: 'Bonuses' }]);
    expect(renameVariableGroup(hero, DEFAULT_VARIABLE_GROUP_ID, 'Bonuses')).toBe(hero);
    expect(renameVariableGroup(hero, DEFAULT_VARIABLE_GROUP_ID, '   ')).toBe(hero);
  });

  it('uses section names in formula autocomplete', () => {
    const hero = renameVariableGroup(makeCharacter(), DEFAULT_VARIABLE_GROUP_ID, 'Bonuses');
    expect(getAvailableLabels(hero)[0].widgetLabel).toBe('Bonuses');
  });

  it('deletes a section with its variables', () => {
    const hero = moveVariableToGroup(addVariableGroup(makeCharacter(), { id: 'g1', name: 'Combat' }), 'b', 'g1');
    const deleted = deleteVariableGroup(hero, 'g1');
    expect(deleted.variables?.map((variable) => variable.label)).toEqual(['prof']);
    expect(deleted.variableGroups?.map((group) => group.id)).toEqual([DEFAULT_VARIABLE_GROUP_ID]);
    expect(deleteVariableGroup(hero, 'missing')).toBe(hero);
  });

  it('moves variables between sections and reorders them', () => {
    let hero = addVariableGroup(makeCharacter(), { id: 'g1', name: 'Combat' });
    hero = moveVariableToGroup(hero, 'a', 'g1');
    expect(order(hero)).toEqual(['bonus:-', 'prof:g1']);
    hero = moveVariableToGroup(hero, 'b', 'g1', 'a');
    expect(order(hero)).toEqual(['bonus:g1', 'prof:g1']);
    // The emptied default section stays until it is deleted.
    expect(getVariableGroups(hero).map((group) => group.id)).toEqual([DEFAULT_VARIABLE_GROUP_ID, 'g1']);
  });

  it('ignores moves that change nothing or target unknown sections', () => {
    const hero = makeCharacter();
    expect(moveVariableToGroup(hero, 'a', DEFAULT_VARIABLE_GROUP_ID, 'b')).toBe(hero);
    expect(moveVariableToGroup(hero, 'b', DEFAULT_VARIABLE_GROUP_ID)).toBe(hero);
    expect(moveVariableToGroup(hero, 'a', 'a')).toBe(hero);
    expect(moveVariableToGroup(hero, 'a', 'nope')).toBe(hero);
  });
});
