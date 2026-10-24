import type { SpellLevel, Widget } from '../../types';
import { applyHealthDamage, applyHealthHealing } from '../../utils/healthBar';
import { formatNumber, isAnyTarget, plural } from '../helpers';
import type { EffectDef, EventOption, EventParamSpec, SpecContext, TargetSpec, TriggerDef, TriggerOutput } from '../types';

const finite = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);

interface HealthState {
  current: number;
  temp: number;
  max: number;
  hasTemp: boolean;
  currentLocked: boolean;
  tempLocked: boolean;
}

function readHealth(widget: Widget | undefined): HealthState | null {
  if (!widget || widget.type !== 'HEALTH_BAR') return null;
  const data = widget.data;
  const hasTemp = data.enableTemporaryHp === true;
  return {
    current: Math.max(0, finite(data.currentValue, 10)),
    temp: hasTemp ? Math.max(0, finite(data.temporaryValue, 0)) : 0,
    max: Math.max(0, finite(data.maxValue, 10)),
    hasTemp,
    currentLocked: !!data.fieldFormulas?.currentValue?.trim(),
    tempLocked: !!data.fieldFormulas?.temporaryValue?.trim(),
  };
}

function formatHealth(state: { current: number; temp: number; max: number }, hasTemp: boolean): string {
  const base = `${formatNumber(state.current)}/${formatNumber(state.max)}`;
  return hasTemp && state.temp > 0 ? `${base} +${formatNumber(state.temp)}` : base;
}

const AMOUNT: EventParamSpec = {
  key: 'amount',
  label: 'Amount',
  type: 'amount',
  default: '1',
  placeholder: '5, @level or 1d8+@con',
  help: 'A number, a formula or dice to roll.',
};

const HEALTH_OUTPUTS = (amountKey: string, amountLabel: string): TriggerOutput[] => [
  { key: amountKey, label: amountLabel, type: 'number' },
  { key: 'hp', label: 'Current health', type: 'number' },
  { key: 'max_hp', label: 'Maximum health', type: 'number' },
];

export const healthDamagedTrigger: TriggerDef = {
  kind: 'health.damaged',
  label: 'Takes damage',
  mode: 'state',
  outputs: HEALTH_OUTPUTS('damage', 'Damage taken, temporary HP included'),
  detect: ({ prev, next }) => {
    const before = readHealth(prev);
    const after = readHealth(next);
    if (!before || !after) return null;
    const lost = (before.current + before.temp) - (after.current + after.temp);
    if (lost <= 0 || after.current > before.current) return null;
    return {
      data: { damage: lost, hp: after.current, max_hp: after.max },
      text: `Took ${formatNumber(lost)} damage (${formatHealth(before, before.hasTemp)} → ${formatHealth(after, after.hasTemp)})`,
    };
  },
  describe: (d) => `${d.widget} takes damage`,
};

export const healthHealedTrigger: TriggerDef = {
  kind: 'health.healed',
  label: 'Is healed',
  mode: 'state',
  outputs: HEALTH_OUTPUTS('healing', 'Health regained'),
  detect: ({ prev, next }) => {
    const before = readHealth(prev);
    const after = readHealth(next);
    if (!before || !after || after.current <= before.current || after.max !== before.max) return null;
    const gained = after.current - before.current;
    return {
      data: { healing: gained, hp: after.current, max_hp: after.max },
      text: `Healed ${formatNumber(gained)} (${formatHealth(before, before.hasTemp)} → ${formatHealth(after, after.hasTemp)})`,
    };
  },
  describe: (d) => `${d.widget} is healed`,
};

export const healthDamageEffect: EffectDef = {
  kind: 'health.damage',
  label: 'Deal damage',
  params: [AMOUNT],
  apply: (ctx) => {
    const state = readHealth(ctx.widget);
    if (!state) return null;
    if (state.currentLocked) return { text: 'Health is computed by a formula and can\'t take damage' };
    const amount = ctx.amount('amount');
    if (!amount) return { text: 'The damage amount isn\'t valid' };
    const useTemp = state.hasTemp && !state.tempLocked;
    const next = applyHealthDamage(state.current, useTemp ? state.temp : 0, Math.max(0, amount.value));
    const after = { current: next.currentValue, temp: useTemp ? next.temporaryValue : state.temp, max: state.max };
    return {
      data: useTemp ? next : { currentValue: next.currentValue },
      text: `Took ${amount.text} damage (${formatHealth(state, state.hasTemp)} → ${formatHealth(after, state.hasTemp)})`,
    };
  },
  describe: (d) => `Deal ${d.params.amount || '1'} damage to ${d.widget}`,
};

export const healthHealEffect: EffectDef = {
  kind: 'health.heal',
  label: 'Heal',
  params: [
    { ...AMOUNT, help: 'A number, a formula, dice to roll, or "full" to heal completely.' },
    {
      key: 'overflow',
      label: 'Extra healing',
      type: 'select',
      options: [
        { value: 'lost', label: 'Is lost' },
        { value: 'temp', label: 'Becomes temporary HP' },
      ],
      default: 'lost',
    },
  ],
  apply: (ctx) => {
    const state = readHealth(ctx.widget);
    if (!state) return null;
    if (state.currentLocked) return { text: 'Health is computed by a formula and can\'t be healed' };
    const full = /^\s*full\s*$/i.test(ctx.params.amount ?? '');
    const amount = full ? { value: Math.max(0, state.max - state.current), text: 'full' } : ctx.amount('amount');
    if (!amount) return { text: 'The healing amount isn\'t valid' };
    const overflow = ctx.params.overflow === 'temp' && state.hasTemp && !state.tempLocked;
    const next = applyHealthHealing(state.current, state.temp, state.max, Math.max(0, amount.value), overflow);
    const after = { current: next.currentValue, temp: next.temporaryValue, max: state.max };
    return {
      data: { currentValue: next.currentValue, ...(overflow && next.temporaryValue !== state.temp ? { temporaryValue: next.temporaryValue } : {}) },
      text: `Healed ${amount.text} (${formatHealth(state, state.hasTemp)} → ${formatHealth(after, state.hasTemp)})`,
    };
  },
  describe: (d) => (/^\s*full\s*$/i.test(d.params.amount ?? '') ? `Fully heal ${d.widget}` : `Heal ${d.widget} by ${d.params.amount || '1'}`),
};

export const healthTempEffect: EffectDef = {
  kind: 'health.temp',
  label: 'Gain temporary HP',
  params: [
    AMOUNT,
    {
      key: 'mode',
      label: 'With existing temporary HP',
      type: 'select',
      options: [
        { value: 'higher', label: 'Keep the higher value' },
        { value: 'add', label: 'Add to it' },
        { value: 'replace', label: 'Replace it' },
      ],
      default: 'higher',
    },
  ],
  apply: (ctx) => {
    const state = readHealth(ctx.widget);
    if (!state) return null;
    if (!state.hasTemp) return { text: 'Temporary HP is turned off for this health bar' };
    if (state.tempLocked) return { text: 'Temporary HP is computed by a formula' };
    const amount = ctx.amount('amount');
    if (!amount) return { text: 'The amount isn\'t valid' };
    const gained = Math.max(0, amount.value);
    const temp = ctx.params.mode === 'add' ? state.temp + gained : ctx.params.mode === 'replace' ? gained : Math.max(state.temp, gained);
    if (temp === state.temp) return { text: `Temporary HP stays at ${formatNumber(temp)} (${amount.text})` };
    return { data: { temporaryValue: temp }, text: `Temporary HP ${formatNumber(state.temp)} → ${formatNumber(temp)} (${amount.text})` };
  },
  describe: (d) => `${d.widget} gains ${d.params.amount || '1'} temporary HP`,
};

// ----- Spell slots -----

function spellLevels(widget: Widget | undefined): SpellLevel[] {
  return widget?.type === 'SPELL_SLOT' ? widget.data.spellLevels ?? [] : [];
}

function levelOptions({ widget }: SpecContext): EventOption[] {
  return spellLevels(widget).map((level) => ({ value: `level:${level.level}`, label: `Level ${level.level}` }));
}

function parseLevel(target: string | undefined): number | null {
  const match = target?.match(/^level:(-?\d+)$/);
  return match ? Number(match[1]) : null;
}

const SPELL_TARGET: TargetSpec = { label: 'Spell level', options: levelOptions, any: 'Any level' };

function spellTrigger(kind: string, label: string, verb: string, test: (before: SpellLevel, after: SpellLevel) => boolean): TriggerDef {
  return {
    kind,
    label,
    mode: 'state',
    target: SPELL_TARGET,
    outputs: [
      { key: 'level', label: 'Spell level', type: 'number' },
      { key: 'slots', label: `Slots ${verb === 'ran out' ? 'used' : verb}`, type: 'number' },
      { key: 'slots_left', label: 'Slots left at that level', type: 'number' },
    ],
    detect: ({ prev, next, trigger }) => {
      const wanted = isAnyTarget(trigger.target) ? null : parseLevel(trigger.target);
      const before = spellLevels(prev);
      for (const after of spellLevels(next)) {
        if (wanted !== null && after.level !== wanted) continue;
        const old = before.find((level) => level.level === after.level);
        if (!old || !test(old, after)) continue;
        const left = Math.max(0, after.max - after.used);
        return {
          data: { level: after.level, slots: Math.abs(after.used - old.used), slots_left: left },
          text: `Level ${after.level} slot ${verb} (${plural(left, 'slot')} left)`,
        };
      }
      return null;
    },
    describe: (d) => `${d.widget}: ${d.target || 'any level'} slot ${verb}`,
  };
}

export const spellUsedTrigger = spellTrigger('spell.used', 'A spell slot is used', 'used', (before, after) => after.used > before.used);
export const spellRestoredTrigger = spellTrigger('spell.restored', 'A spell slot is restored', 'restored', (before, after) => after.used < before.used);
export const spellDepletedTrigger = spellTrigger('spell.depleted', 'A spell level runs out', 'ran out', (before, after) => after.max > 0 && after.used >= after.max && before.used < before.max);

export const spellUseEffect: EffectDef = {
  kind: 'spell.use',
  label: 'Use a spell slot',
  target: { label: 'Spell level', options: levelOptions },
  params: [
    {
      key: 'upcast',
      label: 'If none are left',
      type: 'select',
      options: [
        { value: 'no', label: 'Do nothing' },
        { value: 'yes', label: 'Use a higher level slot' },
      ],
      default: 'no',
    },
    { key: 'count', label: 'Slots', type: 'amount', default: '1', placeholder: '1' },
  ],
  apply: (ctx) => {
    const levels = spellLevels(ctx.widget);
    const wanted = parseLevel(ctx.effect.target);
    if (wanted === null || levels.length === 0) return null;
    const count = Math.max(1, Math.round(ctx.amount('count')?.value ?? 1));
    const candidates = levels
      .map((level, index) => ({ level, index }))
      .filter(({ level }) => (ctx.params.upcast === 'yes' ? level.level >= wanted : level.level === wanted))
      .sort((a, b) => a.level.level - b.level.level);
    const pick = candidates.find(({ level }) => level.max - level.used >= count);
    if (!pick) return { text: `No level ${wanted} slot left${ctx.params.upcast === 'yes' ? ' (or higher)' : ''}` };
    const nextLevels = [...levels];
    nextLevels[pick.index] = { ...pick.level, used: pick.level.used + count };
    const left = pick.level.max - pick.level.used - count;
    return {
      data: { spellLevels: nextLevels },
      text: `Used ${plural(count, `level ${pick.level.level} slot`)} (${plural(left, 'slot')} left)`,
    };
  },
  describe: (d) => `Use a ${d.target || 'spell'} slot from ${d.widget}${d.params.upcast === 'yes' ? ' (or higher)' : ''}`,
};

export const spellRestoreEffect: EffectDef = {
  kind: 'spell.restore',
  label: 'Restore spell slots',
  target: { ...SPELL_TARGET, any: 'All levels' },
  params: [{ key: 'count', label: 'Slots (blank = all)', type: 'amount', default: '', placeholder: 'all' }],
  apply: (ctx) => {
    const levels = spellLevels(ctx.widget);
    if (levels.length === 0) return null;
    const wanted = isAnyTarget(ctx.effect.target) ? null : parseLevel(ctx.effect.target);
    const raw = ctx.params.count?.trim();
    const count = raw ? Math.max(0, Math.round(ctx.amount('count')?.value ?? 0)) : Infinity;
    let restored = 0;
    const nextLevels = levels.map((level) => {
      if (wanted !== null && level.level !== wanted) return level;
      const back = Math.min(level.used, count);
      restored += back;
      return back > 0 ? { ...level, used: level.used - back } : level;
    });
    if (restored === 0) return { text: 'No spell slots to restore' };
    return { data: { spellLevels: nextLevels }, text: `Restored ${plural(restored, 'spell slot')}${wanted !== null ? ` at level ${wanted}` : ''}` };
  },
  describe: (d) => `Restore ${d.params.count?.trim() || 'all'} spell slots (${d.target || 'all levels'}) in ${d.widget}`,
};

export const HEALTH_TRIGGERS = [healthDamagedTrigger, healthHealedTrigger];
export const HEALTH_EFFECTS = [healthDamageEffect, healthHealEffect, healthTempEffect];
export const SPELL_TRIGGERS = [spellUsedTrigger, spellRestoredTrigger, spellDepletedTrigger];
export const SPELL_EFFECTS = [spellUseEffect, spellRestoreEffect];
