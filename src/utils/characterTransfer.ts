import type { Character } from '../types';
import { getCustomTheme, isCustomTheme, type CustomTheme } from '../store/useCustomThemeStore';

function cloneCustomTheme(theme: CustomTheme): CustomTheme {
  return {
    ...theme,
    colors: { ...theme.colors },
    fonts: { ...theme.fonts },
  };
}

export function getCharacterTransferData(character: Character): Character {
  const { customTheme: _embeddedTheme, ...characterData } = character;
  const libraryTheme = character.theme ? getCustomTheme(character.theme) : undefined;
  const embeddedTheme = isCustomTheme(character.customTheme) && character.customTheme.id === character.theme
    ? character.customTheme
    : undefined;
  const customTheme = libraryTheme || embeddedTheme;

  return customTheme
    ? { ...characterData, customTheme: cloneCustomTheme(customTheme) }
    : characterData;
}

export function getCharacterPresetData(character: Character, includeTheme: boolean): Omit<Character, 'id'> {
  const source = includeTheme ? getCharacterTransferData(character) : character;
  const { id: _id, theme, customTheme: _customTheme, ...presetData } = source;

  if (!includeTheme) return presetData;

  return {
    ...presetData,
    ...(theme ? { theme } : {}),
    ...(source.customTheme ? { customTheme: cloneCustomTheme(source.customTheme) } : {}),
  };
}

export function getEmbeddedCustomTheme(character: Character): CustomTheme | undefined {
  return isCustomTheme(character.customTheme) ? character.customTheme : undefined;
}

export function removeEmbeddedCustomTheme(character: Character): Character {
  const { customTheme: _customTheme, ...characterData } = character;
  return characterData;
}