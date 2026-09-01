import { describe, expect, it } from 'vitest';
import type { CustomTheme } from '../store/useCustomThemeStore';
import type { Character } from '../types';
import { getCharacterTransferData, getCustomThemeToImport, includeCharacterCustomTheme } from './characterTransfer';

const customTheme: CustomTheme = {
  id: 'theme-1',
  name: 'Campaign',
  icon: 'C',
  description: 'Campaign theme',
  colors: {
    background: '#111111',
    paper: '#222222',
    ink: '#eeeeee',
    accent: '#336699',
    accentHover: '#4477aa',
    border: '#888888',
    shadow: '#000000',
    muted: '#aaaaaa',
    glow: '#ffffff',
  },
  fonts: { heading: 'serif', body: 'sans-serif' },
  borderRadius: '4px',
  buttonRadius: '2px',
  borderWidth: '1px',
  shadowStyle: 'none',
  cardTexture: 'none',
  textureColor: '#000000',
  textureOpacity: 0,
  borderStyle: 'solid',
};

const character: Character = {
  id: 'character-1',
  name: 'Ada',
  theme: customTheme.id,
  sheets: [{ id: 'sheet-1', name: 'Main', widgets: [] }],
  activeSheetId: 'sheet-1',
};

describe('character custom-theme workspace transfer', () => {
  it('includes embedded theme data even when the character theme ID is stale', () => {
    const transferred = getCharacterTransferData({
      ...character,
      theme: 'missing-theme-id',
      customTheme,
    });

    expect(transferred.customTheme).toEqual(customTheme);
    expect(transferred.customTheme).not.toBe(customTheme);
    expect(transferred.customTheme?.colors).not.toBe(customTheme.colors);
  });

  it('returns a cloned embedded theme when the target library does not contain it', () => {
    const themeToImport = getCustomThemeToImport({ ...character, customTheme }, []);

    expect(themeToImport).toEqual(customTheme);
    expect(themeToImport).not.toBe(customTheme);
  });

  it('does not re-import an embedded theme already in the target library', () => {
    expect(getCustomThemeToImport({ ...character, customTheme }, [customTheme])).toBeUndefined();
  });

  it('adds a referenced custom theme when the target workspace does not have it', () => {
    const targetThemes = includeCharacterCustomTheme(character, [customTheme], []);

    expect(targetThemes).toEqual([customTheme]);
    expect(targetThemes[0]).not.toBe(customTheme);
    expect(targetThemes[0].colors).not.toBe(customTheme.colors);
  });

  it('does not duplicate a custom theme already in the target workspace', () => {
    const targetTheme = { ...customTheme, name: 'Target version' };
    const targetThemes = [targetTheme];

    expect(includeCharacterCustomTheme(character, [customTheme], targetThemes)).toBe(targetThemes);
  });
});