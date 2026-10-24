import type { Character, PoolResource, PoolRestoreTarget, Widget, WidgetData } from '../types';
import { formatDiceExpression, getHealDiceExpression, parseDiceExpression, rollDiceExpression } from './diceExpression';
import { collectLabels, evaluateFormula } from './formulaEngine';

export interface RestOptions {
  healAmount?: number | 'full';
  poolRestores?: PoolRestoreTarget[];
  clearConditions?: boolean;
  resetSpellSlots?: boolean;
  passTimeSeconds?: number;
}

export function parseTimeToSeconds(value: number, unit: string): number {
  switch (unit) {
    case 'seconds': return value;
    case 'minutes': return value * 60;
    case 'hours': return value * 60 * 60;
    case 'days': return value * 24 * 60 * 60;
    case 'months': return value * 30 * 24 * 60 * 60;
    case 'years': return value * 365 * 24 * 60 * 60;
    default: return value;
  }
}

/**
 * Applies a rest to a character. Pool restores reach widgets on any sheet;
 * healing, conditions, spell slots and time only affect the active sheet.
 */
export function applyRest(character: Character, options: RestOptions): Character {
  const { healAmount, clearConditions, resetSpellSlots, passTimeSeconds, poolRestores } = options;

  const poolRestoreMap = new Map<string, PoolRestoreTarget[]>();
  (poolRestores || []).forEach((target) => {
    const list = poolRestoreMap.get(target.widgetId) || [];
    list.push(target);
    poolRestoreMap.set(target.widgetId, list);
  });

  let restoreLabels: ReturnType<typeof collectLabels> | null = null;
  const resolveRestoreAmount = (target: PoolRestoreTarget): number => {
    if (target.amountFormula) {
      restoreLabels ??= collectLabels(character);
      const computed = evaluateFormula(target.amountFormula, restoreLabels);
      if (computed !== null) return Math.max(0, Math.round(computed));
    }
    return target.amount ?? 0;
  };

  const applyPoolRestore = (w: Widget): Widget => {
    if (w.type !== 'POOL') return w;
    const targets = poolRestoreMap.get(w.id);
    if (!targets || targets.length === 0) return w;

    const poolResources = w.data.poolResources || [];
    if (poolResources.length > 0) {
      const newResources = poolResources.map((r: PoolResource, idx: number) => {
        const target = targets.find((t) => t.resourceIndex === idx || (idx === 0 && t.resourceIndex === -1));
        if (!target || r.currentFormula) return r;
        const newCurrent = target.mode === 'full'
          ? r.max
          : Math.min(r.max, (r.current ?? 0) + resolveRestoreAmount(target));
        return { ...r, current: newCurrent };
      });
      return { ...w, data: { ...w.data, poolResources: newResources } };
    }

    const target = targets.find((t) => t.resourceIndex === -1);
    if (!target) return w;
    const fieldFormulas = w.data.fieldFormulas as Record<string, string> | undefined;
    if (fieldFormulas?.currentPool) return w;
    const maxPool = w.data.maxPool ?? 5;
    const currentPool = w.data.currentPool ?? 0;
    const newCurrent = target.mode === 'full'
      ? maxPool
      : Math.min(maxPool, currentPool + resolveRestoreAmount(target));
    return { ...w, data: { ...w.data, currentPool: newCurrent } };
  };

  return {
    ...character,
    sheets: character.sheets.map((sheet) => {
      const isActiveSheet = sheet.id === character.activeSheetId;
      return {
        ...sheet,
        widgets: sheet.widgets.map((w) => {
          const pooled = applyPoolRestore(w);
          if (pooled !== w) return pooled;

          if (!isActiveSheet) return w;

          if (w.type === 'HEALTH_BAR' && healAmount !== undefined) {
            const currentValue = w.data.currentValue ?? 0;
            const maxValue = w.data.maxValue ?? 10;
            const newValue = healAmount === 'full' ? maxValue : Math.min(maxValue, currentValue + healAmount);
            return { ...w, data: { ...w.data, currentValue: newValue } };
          }

          if (w.type === 'TOGGLE_GROUP' && clearConditions) {
            const toggleItems = w.data.toggleItems || [];
            return { ...w, data: { ...w.data, toggleItems: toggleItems.map((item) => ({ ...item, active: false })) } };
          }

          if (w.type === 'SPELL_SLOT' && resetSpellSlots) {
            const spellLevels = w.data.spellLevels || [];
            return { ...w, data: { ...w.data, spellLevels: spellLevels.map((level) => ({ ...level, used: 0 })) } };
          }

          // In round mode, passTimeSeconds counts rounds (1 second = 1 round).
          if (w.type === 'TIME_TRACKER' && passTimeSeconds !== undefined && passTimeSeconds > 0) {
            const timedEffects = w.data.timedEffects || [];
            return {
              ...w,
              data: {
                ...w.data,
                timedEffects: timedEffects.map((effect) => ({
                  ...effect,
                  remainingSeconds: Math.max(0, effect.remainingSeconds - passTimeSeconds),
                })),
              },
            };
          }

          return w;
        }),
      };
    }),
  };
}

/** Rest configured on a Rest Button, without prompting: every configured action is taken and dice are rolled. */
export function planRestFromButton(data: WidgetData): { options: RestOptions; summary: string[] } {
  const summary: string[] = [];
  const options: RestOptions = {};
  const healFlatAmount = data.healFlatAmount ?? 0;
  const healDiceTerms = parseDiceExpression(getHealDiceExpression(data));

  if (data.healToFull) {
    options.healAmount = 'full';
    summary.push('Healed to full!');
  } else if (healDiceTerms) {
    const healDiceText = formatDiceExpression(healDiceTerms);
    const rolled = Math.max(0, rollDiceExpression(healDiceText)?.total ?? 0);
    options.healAmount = rolled + healFlatAmount;
    summary.push(`Healed ${options.healAmount} HP (${healDiceText}${healFlatAmount ? ` + ${healFlatAmount}` : ''})`);
  } else if (healFlatAmount > 0) {
    options.healAmount = healFlatAmount;
    summary.push(`Healed ${healFlatAmount} HP`);
  }

  const poolRestores = data.poolRestores ?? [];
  if (poolRestores.length > 0) {
    options.poolRestores = [...poolRestores];
    summary.push(`${poolRestores.length} pool${poolRestores.length > 1 ? 's' : ''} restored`);
  }
  if (data.clearConditions) {
    options.clearConditions = true;
    summary.push('Conditions cleared');
  }
  if (data.resetSpellSlots) {
    options.resetSpellSlots = true;
    summary.push('Spell slots reset');
  }
  if (data.passTime && (data.passTimeAmount ?? 0) > 0) {
    options.passTimeSeconds = parseTimeToSeconds(data.passTimeAmount ?? 0, data.passTimeUnit ?? 'hours');
    summary.push('Time passed');
  }

  return { options, summary };
}
