import { OPTION_PROMPT_KINDS, parseOptions, type PromptKind } from '../prompt';
import type { EffectContext, EffectDef, EventOption } from '../types';

const KIND_OPTIONS: (EventOption & { value: PromptKind })[] = [
  { value: 'none', label: 'Nothing, just an OK button' },
  { value: 'yesno', label: 'Yes or no' },
  { value: 'buttons', label: 'Buttons (pick one)' },
  { value: 'radio', label: 'Radio buttons (pick one)' },
  { value: 'dropdown', label: 'Dropdown menu (pick one)' },
  { value: 'checkboxes', label: 'Checkboxes (pick several)' },
  { value: 'slider', label: 'Slider' },
  { value: 'number', label: 'Number' },
  { value: 'text', label: 'Text' },
];

const hasKind = (kinds: readonly string[]) => (params: Record<string, string>) => kinds.includes(params.type ?? 'none');

const asKind = (value: string | undefined): PromptKind => (KIND_OPTIONS.some((option) => option.value === value) ? (value as PromptKind) : 'none');

const toNumber = (text: string | undefined): number | null => {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
};

const clamp = (value: number, min: number | null, max: number | null) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, value));

function buildPrompt(ctx: EffectContext) {
  const kind = asKind(ctx.params.type);
  const amount = (key: string) => (ctx.params[key]?.trim() ? ctx.amount(key)?.value ?? null : null);
  const title = ctx.text('title').trim();
  const description = ctx.text('description').trim();
  const isRange = kind === 'slider' || kind === 'number';
  let min = isRange ? amount('min') : null;
  let max = isRange ? amount('max') : null;
  // A slider needs a real range even when its bounds are empty or wrong.
  if (kind === 'slider') {
    min = min ?? 0;
    if (max === null || max <= min) max = min + 10;
  }
  const step = Math.abs(amount('step') ?? 1) || 1;
  const options = kind === 'yesno'
    ? [
      { label: ctx.text('yes').trim() || 'Yes', value: 1 },
      { label: ctx.text('no').trim() || 'No', value: 0 },
    ]
    : OPTION_PROMPT_KINDS.includes(kind) ? parseOptions(ctx.text('options')) : [];
  const initialText = ctx.text('initial').trim();
  return {
    prompt: {
      kind,
      title,
      icon: ctx.text('icon').trim(),
      description,
      options,
      min,
      max,
      step,
      initial: clamp(toNumber(initialText) ?? min ?? 0, min, max),
      initialText,
      cancellable: kind !== 'none' && ctx.params.cancel !== 'forbid',
    },
    label: title || description.split('\n')[0] || 'Message',
  };
}

export const dialogShowEffect: EffectDef = {
  kind: 'dialog.show',
  label: 'Show a message or question',
  outputs: [
    { key: 'value', label: 'Answer as a number (yes 1 / no 0, an option\'s number, or how many were checked)', type: 'number' },
    { key: 'text', label: 'Answer as text', type: 'text' },
  ],
  params: [
    { key: 'title', label: 'Title', type: 'text', default: '', placeholder: 'Spend a potion?', help: 'Wrap formulas in {braces} to show their value.' },
    { key: 'icon', label: 'Icon (optional)', type: 'icon', default: '' },
    { key: 'description', label: 'Description (optional)', type: 'text', multiline: true, default: '', placeholder: 'You have {@potions} left.' },
    { key: 'type', label: 'Player answers with', type: 'select', options: KIND_OPTIONS, default: 'none' },
    { key: 'yes', label: 'Yes button', type: 'text', default: 'Yes', visible: hasKind(['yesno']) },
    { key: 'no', label: 'No button', type: 'text', default: 'No', visible: hasKind(['yesno']) },
    {
      key: 'options',
      label: 'Options',
      type: 'text',
      default: '',
      placeholder: 'Easy, Normal = 2, Hard = 3',
      help: 'Separate options with commas. Add "= number" to give one a number; otherwise it counts as its position (1, 2, 3…).',
      visible: hasKind(OPTION_PROMPT_KINDS),
    },
    { key: 'min', label: 'Lowest', type: 'formula', default: '0', placeholder: '0', help: 'A number or a formula. Leave empty for no lowest number.', visible: hasKind(['slider', 'number']) },
    { key: 'max', label: 'Highest', type: 'formula', default: '10', placeholder: '10 or @hp', help: 'A number or a formula. Leave empty for no highest number.', visible: hasKind(['slider', 'number']) },
    { key: 'step', label: 'Step', type: 'formula', default: '1', placeholder: '1', visible: hasKind(['slider', 'number']) },
    { key: 'initial', label: 'Starts at', type: 'text', default: '', placeholder: 'Optional', help: 'The starting number, text, or option name.', visible: hasKind(['radio', 'dropdown', 'slider', 'number', 'text']) },
    {
      key: 'cancel',
      label: 'If the player cancels',
      type: 'select',
      options: [
        { value: 'allow', label: 'Stop the event' },
        { value: 'forbid', label: "Can't cancel, an answer is required" },
      ],
      default: 'allow',
      visible: (params) => (params.type ?? 'none') !== 'none',
    },
  ],
  check: (params) => {
    const kind = asKind(params.type);
    if (!params.title?.trim() && !params.description?.trim()) return 'Add a title or a description';
    if (OPTION_PROMPT_KINDS.includes(kind) && parseOptions(params.options).length === 0) return 'Add at least one option, separated by commas';
    return null;
  },
  apply: (ctx) => {
    const { prompt, label } = buildPrompt(ctx);
    if (!prompt.title && !prompt.description) return { text: 'Message: nothing to show' };
    if (OPTION_PROMPT_KINDS.includes(prompt.kind) && prompt.options.length === 0) return { text: `${label}: it has no options` };
    const answer = ctx.ask(prompt);
    if (answer.cancelled) return { text: `${label}: cancelled`, stop: true, result: { value: 0, text: '' } };
    if (prompt.kind === 'none') return { text: `Showed "${label}"`, result: { value: 0, text: '' } };
    return { text: `${label} → ${answer.text || '(empty)'}`, result: { value: answer.value, text: answer.text } };
  },
  describe: (d) => {
    const kind = d.params.type || 'none';
    const title = d.params.title?.trim();
    if (kind === 'none') return title ? `Show the message "${title}"` : 'Show a message';
    const label = KIND_OPTIONS.find((option) => option.value === kind)?.label ?? 'a question';
    return `Ask the player${title ? ` "${title}"` : ''} (${label.toLowerCase()})`;
  },
};
