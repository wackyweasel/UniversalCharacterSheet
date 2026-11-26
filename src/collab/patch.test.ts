import { describe, expect, it } from 'vitest';
import type { Character } from '../types';
import { applyCharacterPatch, applyPatch, diffCharacters } from './patch';

function widget(id: string, data: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  return { id, type: 'NUMBER', x: 0, y: 0, data: { value: 0, ...data }, ...extra };
}

function character(widgets: ReturnType<typeof widget>[], extra: Partial<Character> = {}): Character {
  return {
    id: 'local',
    name: 'Hero',
    sheets: [{ id: 'sheet-1', name: 'Main', widgets }, { id: 'sheet-2', name: 'Notes', widgets: [] }],
    activeSheetId: 'sheet-1',
    ...extra,
  } as unknown as Character;
}

function widgetsOf(value: Character, sheetIndex = 0) {
  return value.sheets[sheetIndex].widgets as unknown as ReturnType<typeof widget>[];
}

describe('character patches', () => {
  it('sends only what changed and reproduces it on another copy', () => {
    const before = character([widget('a'), widget('b')]);
    const after = { ...before, sheets: [{ ...before.sheets[0], widgets: [widgetsOf(before)[0], { ...widgetsOf(before)[1], data: { value: 7 } }] }, before.sheets[1]] } as Character;

    const patch = diffCharacters(before, after);

    expect(JSON.stringify(patch)).not.toContain('"a"');
    expect(applyCharacterPatch(before, patch!)).toEqual(after);
  });

  it('returns null when nothing changed, even for rebuilt but equal values', () => {
    const before = character([widget('a', { list: [1, 2] })]);
    const same = JSON.parse(JSON.stringify(before)) as Character;
    expect(diffCharacters(before, same)).toBeNull();
  });

  it('merges edits to different widgets made at the same time', () => {
    const base = character([widget('a'), widget('b')]);
    const editA = { ...base, sheets: [{ ...base.sheets[0], widgets: [{ ...widgetsOf(base)[0], data: { value: 1 } }, widgetsOf(base)[1]] }, base.sheets[1]] } as Character;
    const editB = { ...base, sheets: [{ ...base.sheets[0], widgets: [widgetsOf(base)[0], { ...widgetsOf(base)[1], x: 50 }] }, base.sheets[1]] } as Character;

    const merged = applyCharacterPatch(editA, diffCharacters(base, editB)!);

    expect(widgetsOf(merged)[0].data.value).toBe(1);
    expect(widgetsOf(merged)[1].x).toBe(50);
  });

  it('handles added, removed and reordered keyed items', () => {
    const before = character([widget('a'), widget('b'), widget('c')]);
    const after = character([widget('c'), widget('a'), widget('d')]);

    const result = applyCharacterPatch(before, diffCharacters(before, after)!);

    expect(widgetsOf(result).map((entry) => entry.id)).toEqual(['c', 'a', 'd']);
  });

  it('keeps widgets another person added while this patch was in flight', () => {
    const base = character([widget('a'), widget('b')]);
    const theirs = character([widget('a'), widget('b'), widget('z')]);
    const mine = character([widget('b'), widget('a')]);

    const result = applyCharacterPatch(theirs, diffCharacters(base, mine)!);

    expect(widgetsOf(result).map((entry) => entry.id)).toEqual(['b', 'a', 'z']);
  });

  it('skips edits to a widget that was deleted meanwhile', () => {
    const base = character([widget('a'), widget('b')]);
    const edited = character([widget('a'), widget('b', { value: 9 })]);
    const deleted = character([widget('a')]);

    const result = applyCharacterPatch(deleted, diffCharacters(base, edited)!);

    expect(widgetsOf(result).map((entry) => entry.id)).toEqual(['a']);
  });

  it('keeps the local id and active sheet, and falls back when that sheet is removed', () => {
    const base = character([widget('a')]);
    const renamed = { ...base, id: 'other', activeSheetId: 'sheet-2', name: 'Renamed' } as Character;
    expect(diffCharacters(base, { ...base, id: 'other', activeSheetId: 'sheet-2' })).toBeNull();

    const result = applyCharacterPatch(base, diffCharacters(base, renamed)!);
    expect(result).toMatchObject({ id: 'local', activeSheetId: 'sheet-1', name: 'Renamed' });

    const withoutSheetOne = { ...base, sheets: [base.sheets[1]] } as Character;
    const onSheetOne = applyCharacterPatch(base, diffCharacters(base, withoutSheetOne)!);
    expect(onSheetOne.activeSheetId).toBe('sheet-2');
  });

  it('removes keys and ignores prototype-polluting ones', () => {
    const removed = applyPatch({ a: 1, b: 2 }, { t: 'obj', del: ['a'] });
    expect(removed).toEqual({ b: 2 });

    const hostile = JSON.parse('{"t":"obj","set":{"__proto__":{"t":"set","v":{"polluted":true}}}}');
    const result = applyPatch({}, hostile) as Record<string, unknown>;
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(result.polluted).toBeUndefined();
  });

  it('rejects a patch that would leave the character without sheets', () => {
    const base = character([widget('a')]);
    expect(applyCharacterPatch(base, { t: 'obj', set: { sheets: { t: 'set', v: [] } } })).toBe(base);
  });
});
