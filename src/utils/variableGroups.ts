import type { Character, CharacterVariable, CharacterVariableGroup } from '../types';

export const DEFAULT_VARIABLE_GROUP_ID = 'default';
export const DEFAULT_VARIABLE_GROUP_NAME = 'Standalone labels';

type VariableSource = Pick<Character, 'variables' | 'variableGroups'>;

/**
 * Sections of standalone variables, in display order. Variables without a valid section live in the
 * default section, which is listed first even when it has not been stored yet.
 */
export function getVariableGroups(character: VariableSource): CharacterVariableGroup[] {
  const groups = character.variableGroups ?? [];
  if (groups.some((group) => group.id === DEFAULT_VARIABLE_GROUP_ID)) return groups;
  const ids = new Set(groups.map((group) => group.id));
  const hasUngrouped = (character.variables ?? []).some((variable) => !variable.groupId || !ids.has(variable.groupId));
  return hasUngrouped ? [{ id: DEFAULT_VARIABLE_GROUP_ID, name: DEFAULT_VARIABLE_GROUP_NAME }, ...groups] : groups;
}

/** Returns a resolver from variable to the id of the section it is shown in. */
export function createVariableGroupResolver(groups: CharacterVariableGroup[]) {
  const ids = new Set(groups.map((group) => group.id));
  return (variable: Pick<CharacterVariable, 'groupId'>) =>
    variable.groupId && ids.has(variable.groupId) ? variable.groupId : DEFAULT_VARIABLE_GROUP_ID;
}

/** Name of the section each variable is shown in, keyed by variable id. */
export function getVariableGroupNames(character: VariableSource): Map<string, string> {
  const groups = getVariableGroups(character);
  const resolve = createVariableGroupResolver(groups);
  const names = new Map(groups.map((group) => [group.id, group.name]));
  return new Map((character.variables ?? []).map((variable) => [variable.id, names.get(resolve(variable)) ?? DEFAULT_VARIABLE_GROUP_NAME]));
}

/** Stores the implicit default section so it survives becoming empty or being renamed. */
function withStoredGroups<T extends VariableSource>(character: T): T {
  const groups = getVariableGroups(character);
  return groups === character.variableGroups ? character : { ...character, variableGroups: groups };
}

export function addVariableGroup<T extends VariableSource>(character: T, group: CharacterVariableGroup): T {
  const next = withStoredGroups(character);
  return { ...next, variableGroups: [...(next.variableGroups ?? []), group] };
}

export function renameVariableGroup<T extends VariableSource>(character: T, groupId: string, name: string): T {
  const trimmed = name.trim();
  const current = getVariableGroups(character).find((group) => group.id === groupId);
  if (!trimmed || !current || current.name === trimmed) return character;
  const next = withStoredGroups(character);
  return {
    ...next,
    variableGroups: (next.variableGroups ?? []).map((group) => (group.id === groupId ? { ...group, name: trimmed } : group)),
  };
}

/** Deletes a section together with every variable listed in it. */
export function deleteVariableGroup<T extends VariableSource>(character: T, groupId: string): T {
  const groups = getVariableGroups(character);
  if (!groups.some((group) => group.id === groupId)) return character;
  const resolve = createVariableGroupResolver(groups);
  const variables = (character.variables ?? []).filter((variable) => resolve(variable) !== groupId);
  return {
    ...character,
    variables,
    variableGroups: groups.filter((group) => group.id !== groupId),
  };
}

/**
 * Moves a variable into a section, before another variable or at the end of the section.
 * Returns the same character when nothing changes.
 */
export function moveVariableToGroup<T extends VariableSource>(
  character: T,
  variableId: string,
  groupId: string,
  beforeVariableId?: string | null,
): T {
  const groups = getVariableGroups(character);
  if (groupId !== DEFAULT_VARIABLE_GROUP_ID && !groups.some((group) => group.id === groupId)) return character;
  const variables = character.variables ?? [];
  const variable = variables.find((item) => item.id === variableId);
  if (!variable || beforeVariableId === variableId) return character;

  const resolve = createVariableGroupResolver(groups);
  const rest = variables.filter((item) => item.id !== variableId);
  let index = beforeVariableId ? rest.findIndex((item) => item.id === beforeVariableId) : -1;
  if (index < 0) {
    let last = -1;
    rest.forEach((item, position) => {
      if (resolve(item) === groupId) last = position;
    });
    index = last < 0 ? rest.length : last + 1;
  }

  const moved: CharacterVariable = { ...variable, groupId };
  rest.splice(index, 0, moved);
  if (resolve(variable) === groupId && rest.every((item, position) => item.id === variables[position].id)) return character;
  return { ...withStoredGroups(character), variables: rest };
}

/** Copies standalone variables and their sections, e.g. when creating a character from a preset. */
export function copyVariableData(source: VariableSource): Pick<Character, 'variables' | 'variableGroups'> {
  return {
    ...(source.variables ? { variables: source.variables.map((variable) => ({ ...variable })) } : {}),
    ...(source.variableGroups ? { variableGroups: source.variableGroups.map((group) => ({ ...group })) } : {}),
  };
}
