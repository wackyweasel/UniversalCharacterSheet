import { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { InventoryItem, ItemEffect } from '../../types';
import { useStore } from '../../store/useStore';
import { collectNumericTargets, numericTargetKey } from '../../utils/numericTargets';
import { PlusIcon, TrashIcon } from '../icons';
import { isTutorialStep, useTutorialStore } from '../../store/useTutorialStore';

const inputClass = 'h-8 w-full rounded-button border border-theme-border bg-theme-paper px-2 text-xs text-theme-ink';

interface Props {
  item: Pick<InventoryItem, 'effects'>;
  onChange: (effects: ItemEffect[]) => void;
  onValidityChange: (valid: boolean) => void;
  hint?: string;
}

export function ItemEffectsEditor({ item, onChange, onValidityChange, hint = 'Bonuses and penalties while this item is active.' }: Props) {
  const character = useStore((state) => state.characters.find((entry) => entry.id === state.activeCharacterId));
  const targets = useMemo(() => character ? collectNumericTargets(character) : [], [character]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [sources, setSources] = useState<Record<string, string>>({});
  const effects = item.effects ?? [];
  const sourceKey = (effect: ItemEffect) => sources[effect.id] ?? (effect.target?.kind === 'variable' ? 'variables' : effect.target?.widgetId ?? '');
  const valid = effects.every((effect) => {
    const raw = amounts[effect.id] ?? String(effect.amount);
    return !!effect.target && raw.trim() !== '' && Number.isFinite(Number(raw));
  });
  useEffect(() => onValidityChange(valid), [valid, onValidityChange]);
  const update = (id: string, patch: Partial<ItemEffect>) => onChange(effects.map((effect) => effect.id === id ? { ...effect, ...patch } : effect));
  const groups = [...new Map(targets.map((target) => [
    target.ref.kind === 'variable' ? 'variables' : target.ref.widgetId, target.source,
  ])).entries()];

  return (
    <section className="space-y-2 border-t border-theme-border pt-3">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-xs font-bold">Effects</h3>
        <button data-tutorial="item-add-effect" type="button" onClick={() => {
          onChange([...effects, { id: uuidv4(), amount: 1 }]);
          const tutorial = useTutorialStore.getState();
          if (isTutorialStep(tutorial.tutorialStep, 'compendium-add-effect')) tutorial.advanceTutorial();
        }} className="widget-control flex h-8 items-center gap-1 px-2 text-xs">
          <PlusIcon className="h-3 w-3" /> Add effect
        </button>
      </div>
      <p className="text-[11px] text-theme-muted">{hint} Choose a value directly; no label is needed. For computed values, Effects adjust the formula result without changing the formula.</p>
      {effects.map((effect) => {
        const key = effect.target ? numericTargetKey(effect.target) : '';
        const target = targets.find((entry) => numericTargetKey(entry.ref) === key);
        const choices = targets.filter((entry) => (entry.ref.kind === 'variable' ? 'variables' : entry.ref.widgetId) === sourceKey(effect));
        const raw = amounts[effect.id] ?? String(effect.amount);
        return (
          <div key={effect.id} data-tutorial="item-effect-target" className="space-y-2 rounded-button border border-theme-border p-2">
            <div className="flex items-end gap-2">
              <label className="min-w-0 flex-1 text-xs">
                Widget
                <select aria-label="Effect widget" value={sourceKey(effect)} onChange={(event) => {
                  setSources((current) => ({ ...current, [effect.id]: event.target.value }));
                  update(effect.id, { target: undefined, targetName: undefined });
                }} className={inputClass}>
                  <option value="">Choose a widget</option>
                  {sourceKey(effect) && !groups.some(([id]) => id === sourceKey(effect)) && <option value={sourceKey(effect)}>Missing widget</option>}
                  {groups.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>
              <button type="button" aria-label="Remove effect" onClick={() => onChange(effects.filter((entry) => entry.id !== effect.id))} className="widget-control h-8 w-8 text-red-500">
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <label className="block text-xs">
              Value
              <select aria-label="Effect value" value={key} onChange={(event) => {
                const selected = targets.find((entry) => numericTargetKey(entry.ref) === event.target.value);
                if (selected) {
                  update(effect.id, { target: selected.ref, targetName: `${selected.source} - ${selected.title}` });
                  const tutorial = useTutorialStore.getState();
                  if (isTutorialStep(tutorial.tutorialStep, 'compendium-effect-target')) tutorial.advanceTutorial();
                }
              }} className={inputClass}>
                <option value="">Choose a value</option>
                {key && !target && <option value={key}>{effect.targetName || 'Missing value'} - select a replacement</option>}
                {choices.map((entry) => <option key={numericTargetKey(entry.ref)} value={numericTargetKey(entry.ref)} disabled={!!entry.problem}>
                  {entry.title}{entry.label ? ` (@${entry.label})` : ''} - {entry.problem || `${entry.value}${entry.formula ? ' (formula)' : ''}`}
                </option>)}
              </select>
            </label>
            {target?.formula && <p className="text-[11px] text-theme-muted">
              Effects apply after the formula, before value limits (unless allowed to exceed them).
            </p>}
            <div className="flex flex-wrap items-end gap-3">
              <label className="block w-28 text-xs">
                Bonus / penalty
                <input aria-label="Effect amount" type="text" inputMode="decimal" value={raw} onChange={(event) => {
                  const amount = event.target.value;
                  setAmounts((current) => ({ ...current, [effect.id]: amount }));
                  if (amount.trim() && Number.isFinite(Number(amount))) update(effect.id, { amount: Number(amount) });
                }} placeholder="+1 or -2" className={inputClass} />
              </label>
              <label className="flex h-8 items-center gap-2 text-xs">
                <input type="checkbox" checked={effect.allowExceedLimits === true} onChange={(event) => update(effect.id, { allowExceedLimits: event.target.checked })} className="accent-theme-accent" />
                Allow exceeding limits
              </label>
            </div>
            {effect.target && (!target || target.problem) && <p role="alert" className="text-xs text-red-500">{target?.problem || 'Target missing. Select a replacement to use this effect.'}</p>}
            {(!raw.trim() || !Number.isFinite(Number(raw))) && <p role="alert" className="text-xs text-red-500">Enter a valid number.</p>}
          </div>
        );
      })}
    </section>
  );
}
