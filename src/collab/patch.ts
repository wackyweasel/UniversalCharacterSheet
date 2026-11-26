import type { Character } from '../types';

/**
 * A JSON patch for a character that merges per object key and per `id` of keyed array items,
 * so two people editing different widgets (or different fields of one widget) never overwrite each other.
 * Patches are absolute ("set this value"), which makes applying one twice harmless.
 */
export type Patch =
  | { t: 'set'; v: unknown }
  | { t: 'obj'; set?: Record<string, Patch>; del?: string[] }
  | { t: 'arr'; order?: string[]; upd?: Record<string, Patch>; add?: Record<string, unknown>; del?: string[] };

/** View state that stays local to each participant. */
const LOCAL_CHARACTER_KEYS: readonly string[] = ['id', 'activeSheetId'];
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

type PlainObject = Record<string, unknown>;
type KeyedItem = PlainObject & { id: string };

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isKeyedItem(value: unknown): value is KeyedItem {
  return isPlainObject(value) && typeof value.id === 'string';
}

function isKeyedArray(value: unknown): value is KeyedItem[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  const ids = new Set<string>();
  for (const item of value) {
    if (!isKeyedItem(item) || ids.has(item.id)) return false;
    ids.add(item.id);
  }
  return true;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a)) {
    return Array.isArray(b) && a.length === b.length && a.every((item, index) => deepEqual(item, b[index]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a).filter((key) => a[key] !== undefined);
    const bKeys = Object.keys(b).filter((key) => b[key] !== undefined);
    return aKeys.length === bKeys.length && aKeys.every((key) => deepEqual(a[key], b[key]));
  }
  return false;
}

/** Returns what changed between two values, or null when they are equal. */
export function diff(prev: unknown, next: unknown): Patch | null {
  if (prev === next) return null;

  if (isPlainObject(prev) && isPlainObject(next)) {
    const set: Record<string, Patch> = {};
    const del: string[] = [];
    for (const key of Object.keys(next)) {
      if (next[key] === undefined) {
        if (prev[key] !== undefined) del.push(key);
      } else if (prev[key] === undefined) {
        set[key] = { t: 'set', v: next[key] };
      } else {
        const child = diff(prev[key], next[key]);
        if (child) set[key] = child;
      }
    }
    for (const key of Object.keys(prev)) {
      if (prev[key] !== undefined && !(key in next)) del.push(key);
    }
    if (del.length === 0 && Object.keys(set).length === 0) return null;
    return { t: 'obj', ...(Object.keys(set).length > 0 ? { set } : {}), ...(del.length > 0 ? { del } : {}) };
  }

  if (isKeyedArray(prev) && isKeyedArray(next)) {
    const prevById = new Map(prev.map((item) => [item.id, item]));
    const nextIds = next.map((item) => item.id);
    const nextIdSet = new Set(nextIds);
    const upd: Record<string, Patch> = {};
    const add: Record<string, unknown> = {};
    const del = prev.filter((item) => !nextIdSet.has(item.id)).map((item) => item.id);
    for (const item of next) {
      const before = prevById.get(item.id);
      if (!before) {
        add[item.id] = item;
        continue;
      }
      const child = diff(before, item);
      if (child) upd[item.id] = child;
    }
    const orderChanged = del.length > 0
      || Object.keys(add).length > 0
      || prev.length !== next.length
      || prev.some((item, index) => item.id !== nextIds[index]);
    if (!orderChanged && Object.keys(upd).length === 0) return null;
    return {
      t: 'arr',
      ...(orderChanged ? { order: nextIds } : {}),
      ...(Object.keys(upd).length > 0 ? { upd } : {}),
      ...(Object.keys(add).length > 0 ? { add } : {}),
      ...(del.length > 0 ? { del } : {}),
    };
  }

  return deepEqual(prev, next) ? null : { t: 'set', v: next };
}

/** Applies a patch to a value; parts that no longer exist locally (e.g. a widget deleted meanwhile) are skipped. */
export function applyPatch(base: unknown, patch: Patch): unknown {
  switch (patch.t) {
    case 'set':
      return patch.v;
    case 'obj': {
      if (!isPlainObject(base)) return base;
      const result: PlainObject = { ...base };
      for (const key of patch.del ?? []) {
        if (!UNSAFE_KEYS.has(key)) delete result[key];
      }
      for (const [key, child] of Object.entries(patch.set ?? {})) {
        if (UNSAFE_KEYS.has(key)) continue;
        if (result[key] !== undefined) result[key] = applyPatch(result[key], child);
        else if (child.t === 'set') result[key] = child.v;
      }
      return result;
    }
    case 'arr': {
      if (!Array.isArray(base)) return base;
      const items = new Map<string, unknown>();
      const baseIds: string[] = [];
      for (const item of base) {
        if (!isKeyedItem(item)) continue;
        items.set(item.id, item);
        baseIds.push(item.id);
      }
      for (const id of patch.del ?? []) items.delete(id);
      for (const [id, child] of Object.entries(patch.upd ?? {})) {
        if (items.has(id)) items.set(id, applyPatch(items.get(id), child));
      }
      for (const [id, value] of Object.entries(patch.add ?? {})) {
        if (isKeyedItem(value) && value.id === id) items.set(id, value);
      }
      // Items this patch does not know about (added by someone else meanwhile) keep their place after the ordered ones.
      const ordered = patch.order ?? baseIds;
      const orderedSet = new Set(ordered);
      const ids = [...ordered, ...baseIds.filter((id) => !orderedSet.has(id))];
      const seen = new Set<string>();
      const result: unknown[] = [];
      for (const id of ids) {
        if (seen.has(id) || !items.has(id)) continue;
        seen.add(id);
        result.push(items.get(id));
      }
      return result;
    }
    default:
      return base;
  }
}

function toSharedView(character: Character): PlainObject {
  const shared: PlainObject = { ...(character as unknown as PlainObject) };
  for (const key of LOCAL_CHARACTER_KEYS) delete shared[key];
  return shared;
}

/** What changed in the shared part of a character (everything but the id and the active sheet). */
export function diffCharacters(prev: Character, next: Character): Patch | null {
  return diff(toSharedView(prev), toSharedView(next));
}

/** Applies a patch to a character, keeping its local id and active sheet. Returns the character unchanged if the result is not a valid sheet. */
export function applyCharacterPatch(character: Character, patch: Patch): Character {
  const applied = applyPatch(toSharedView(character), patch);
  if (!isPlainObject(applied) || typeof applied.name !== 'string' || !Array.isArray(applied.sheets) || applied.sheets.length === 0) {
    return character;
  }
  const sheets = applied.sheets as Character['sheets'];
  const activeSheetId = sheets.some((sheet) => sheet.id === character.activeSheetId) ? character.activeSheetId : sheets[0].id;
  return { ...(applied as unknown as Character), id: character.id, activeSheetId };
}

export function isPatch(value: unknown): value is Patch {
  return isPlainObject(value) && (value.t === 'set' || value.t === 'obj' || value.t === 'arr');
}
