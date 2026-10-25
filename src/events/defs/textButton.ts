import { normalizeInlineButtonName, tokenizeInlineDiceText } from '../../utils/inlineDice';
import type { TriggerDef } from '../types';

export const TEXT_BUTTON_KIND = 'text.button';

const MAX_DEPTH = 8;
const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (!code.startsWith('#')) return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
    const value = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return Number.isFinite(value) && value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : entity;
  });
}

// Rich text renders each text node on its own, so a button split by formatting isn't a button.
function textPieces(value: string): string[] {
  if (!value.trimStart().startsWith('<')) return [value];
  return value.split(/<[^>]*>/).map(decodeEntities);
}

function collectStrings(value: unknown, out: string[], depth: number): void {
  if (depth > MAX_DEPTH) return;
  if (typeof value === 'string') {
    if (value.includes('{') && value.includes('[')) out.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, out, depth + 1));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectStrings(item, out, depth + 1));
  }
}

export const sameButtonName = (a: string | undefined, b: string | undefined): boolean => (
  !!a && !!b && normalizeInlineButtonName(a).toLowerCase() === normalizeInlineButtonName(b).toLowerCase()
);

/** Names of the `{[Name]}` buttons written anywhere in a widget's text, once each. */
export function findInlineButtonNames(data: unknown): string[] {
  const strings: string[] = [];
  collectStrings(data, strings, 0);
  const names: string[] = [];
  for (const piece of strings.flatMap(textPieces)) {
    for (const segment of tokenizeInlineDiceText(piece)) {
      if (segment.type === 'button' && !names.some((name) => sameButtonName(name, segment.name))) names.push(segment.name);
    }
  }
  return names;
}

export const textButtonTrigger: TriggerDef = {
  kind: TEXT_BUTTON_KIND,
  label: 'A button in its text is pressed',
  mode: 'action',
  target: {
    label: 'Button',
    options: ({ widget }) => (widget ? findInlineButtonNames(widget.data) : []).map((name) => ({ value: name, label: name })),
    empty: 'Write {[Name]} in its text to add one',
  },
  needsTarget: true,
  match: ({ trigger, action }) => (
    action.kind === 'press' && sameButtonName(action.target, trigger.target) ? { text: `${action.target} pressed` } : null
  ),
  describe: (d) => `${d.target || 'A button'} in ${d.widget} is pressed`,
};

export const TEXT_BUTTON_TRIGGERS = [textButtonTrigger];
