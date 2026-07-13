import { useMemo, useState } from 'react';
import { EditorProps } from './types';
import { LabeledNumberField } from './LabeledNumberField';
import { useStore } from '../../store/useStore';
import { PoolResource, PoolRestoreTarget } from '../../types';
import { collectLabels, evaluateFormula, getAvailableLabels } from '../../utils/formulaEngine';

interface PoolTargetInfo {
  widgetId: string;
  resourceIndex: number; // -1 for legacy single pool
  label: string;
  max: number;
}

export function RestButtonEditor({ widget, updateData }: EditorProps) {
  const characters = useStore(state => state.characters);
  const activeCharacterId = useStore(state => state.activeCharacterId);
  const [formulaOpenKey, setFormulaOpenKey] = useState<string | null>(null);

  const { 
    buttonText = 'Rest',
    healToFull = false,
    healRandomDice = [],
    healFlatAmount = 0,
    poolRestores = [],
    clearConditions = false,
    resetSpellSlots = false,
    passTime = false,
    passTimeAmount = 0,
    passTimeUnit = 'hours',
    fieldLabels = {},
    fieldFormulas = {}
  } = widget.data;

  // Scan the active character for every resource pool target
  const poolTargets = useMemo<PoolTargetInfo[]>(() => {
    const char = characters.find(c => c.id === activeCharacterId);
    if (!char) return [];
    const targets: PoolTargetInfo[] = [];
    for (const sheet of char.sheets) {
      for (const w of sheet.widgets) {
        if (w.type !== 'POOL') continue;
        const widgetLabel = w.data.label || 'Resource Pool';
        const resources = (w.data.poolResources || []) as PoolResource[];
        if (resources.length > 0) {
          resources.forEach((r, idx) => {
            targets.push({
              widgetId: w.id,
              resourceIndex: idx,
              label: r.name ? `${widgetLabel}: ${r.name}` : `${widgetLabel} #${idx + 1}`,
              max: r.max,
            });
          });
        } else {
          targets.push({
            widgetId: w.id,
            resourceIndex: -1,
            label: widgetLabel,
            max: w.data.maxPool ?? 5,
          });
        }
      }
    }
    return targets;
  }, [characters, activeCharacterId]);

  const matchesTarget = (restore: PoolRestoreTarget, target: PoolTargetInfo) =>
    restore.widgetId === target.widgetId
    && (restore.resourceIndex === target.resourceIndex || (target.resourceIndex === 0 && restore.resourceIndex === -1));

  const findRestore = (target: PoolTargetInfo): PoolRestoreTarget | undefined =>
    (poolRestores as PoolRestoreTarget[]).find(restore => matchesTarget(restore, target));

  // Labels available for formulas + a live evaluator for previews
  const activeChar = useMemo(
    () => characters.find(c => c.id === activeCharacterId),
    [characters, activeCharacterId]
  );
  const formulaLabels = useMemo(
    () => (activeChar ? collectLabels(activeChar) : {}),
    [activeChar]
  );
  const availableLabels = useMemo(
    () => (activeChar ? getAvailableLabels(activeChar) : []),
    [activeChar]
  );
  const targetKey = (t: PoolTargetInfo) => `${t.widgetId}:${t.resourceIndex}`;

  const updateRestores = (next: PoolRestoreTarget[]) => updateData({ poolRestores: next });

  const toggleTarget = (t: PoolTargetInfo, enabled: boolean) => {
    const without = (poolRestores as PoolRestoreTarget[]).filter(
      restore => !matchesTarget(restore, t)
    );
    if (enabled) {
      without.push({ widgetId: t.widgetId, resourceIndex: t.resourceIndex, mode: 'full' });
    }
    updateRestores(without);
  };

  const setTargetMode = (t: PoolTargetInfo, mode: 'full' | 'flat') => {
    const next = (poolRestores as PoolRestoreTarget[]).map(p =>
      matchesTarget(p, t)
        ? { ...p, mode, amount: mode === 'flat' ? (p.amount ?? 1) : p.amount }
        : p
    );
    updateRestores(next);
  };

  const setTargetAmount = (t: PoolTargetInfo, amount: number) => {
    const next = (poolRestores as PoolRestoreTarget[]).map(p =>
      matchesTarget(p, t)
        ? { ...p, amount }
        : p
    );
    updateRestores(next);
  };

  const setTargetFormula = (t: PoolTargetInfo, formula: string | undefined) => {
    const next = (poolRestores as PoolRestoreTarget[]).map(p =>
      matchesTarget(p, t)
        ? { ...p, amountFormula: formula || undefined }
        : p
    );
    updateRestores(next);
  };

  const selectAllPools = (mode: 'full' | 'flat') => {
    updateRestores(
      poolTargets.map(t => ({
        widgetId: t.widgetId,
        resourceIndex: t.resourceIndex,
        mode,
        amount: mode === 'flat' ? (findRestore(t)?.amount ?? 1) : undefined,
        amountFormula: mode === 'flat' ? findRestore(t)?.amountFormula : undefined,
      }))
    );
  };

  const clearAllPools = () => updateRestores([]);

  const setFieldLabel = (field: string, labelName: string | undefined) => {
    const updated = { ...fieldLabels };
    if (labelName) updated[field] = labelName;
    else delete updated[field];
    updateData({ fieldLabels: updated });
  };

  const setFieldFormula = (field: string, formula: string | undefined) => {
    const updated = { ...fieldFormulas };
    if (formula) updated[field] = formula;
    else delete updated[field];
    updateData({ fieldFormulas: updated });
  };

  const updateDiceGroup = (index: number, field: 'count' | 'faces', value: number | string) => {
    const newGroups = [...healRandomDice];
    newGroups[index] = { ...newGroups[index], [field]: value };
    updateData({ healRandomDice: newGroups });
  };

  const addDiceGroup = () => {
    updateData({ healRandomDice: [...healRandomDice, { count: 1, faces: 8 }] });
  };

  const removeDiceGroup = (index: number) => {
    const newGroups = healRandomDice.filter((_: any, i: number) => i !== index);
    updateData({ healRandomDice: newGroups });
  };

  // When healToFull is enabled, clear the random dice and flat amount
  const handleHealToFullChange = (checked: boolean) => {
    if (checked) {
      updateData({ healToFull: true, healRandomDice: [], healFlatAmount: 0 });
    } else {
      updateData({ healToFull: false });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Button Text</label>
        <input
          className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={buttonText}
          onChange={(e) => updateData({ buttonText: e.target.value })}
          placeholder="Rest"
        />
      </div>

      <div className="border border-theme-border rounded-button p-3">
        <h4 className="font-medium text-theme-ink mb-3">Healing Options</h4>
        
        <label className="flex items-center gap-2 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={healToFull}
            onChange={(e) => handleHealToFullChange(e.target.checked)}
            className="w-4 h-4 accent-theme-accent"
          />
          <span className="text-sm text-theme-ink">Heal to Full</span>
        </label>

        {!healToFull && (
          <>
            <div className="mb-3">
              <label className="block text-sm font-medium text-theme-ink mb-2">Random Heal Dice</label>
              <div className="space-y-2">
                {healRandomDice.map((group: { count: number; faces: number }, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={group.count}
                      onChange={(e) => updateDiceGroup(index, 'count', e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                      onBlur={(e) => updateDiceGroup(index, 'count', Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm text-center"
                    />
                    <span className="text-theme-ink">d</span>
                    <input
                      type="number"
                      min="1"
                      value={group.faces}
                      onChange={(e) => updateDiceGroup(index, 'faces', e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                      onBlur={(e) => updateDiceGroup(index, 'faces', Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm text-center"
                    />
                    <button
                      onClick={() => removeDiceGroup(index)}
                      className="text-red-500 hover:text-red-700 px-2"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addDiceGroup}
                className="mt-2 px-3 py-1 border border-theme-border rounded-button text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper"
              >
                + Add Dice
              </button>
            </div>

            <div>
              <LabeledNumberField
                displayLabel="Flat Heal Amount"
                value={healFlatAmount ?? 0}
                onChange={(v) => updateData({ healFlatAmount: v })}
                fieldLabel={fieldLabels['healFlatAmount']}
                onFieldLabelChange={(l) => setFieldLabel('healFlatAmount', l)}
                formula={fieldFormulas['healFlatAmount']}
                onFormulaChange={(f) => setFieldFormula('healFlatAmount', f)}
                min={0}
              />
            </div>
          </>
        )}
      </div>

      <div className="border border-theme-border rounded-button p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-theme-ink">Resource Pools</h4>
          {poolTargets.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => selectAllPools('full')}
                className="px-2 py-0.5 text-[11px] border border-theme-border rounded-button text-theme-ink hover:bg-theme-accent hover:text-theme-paper"
              >
                All full
              </button>
              <button
                onClick={clearAllPools}
                className="px-2 py-0.5 text-[11px] border border-theme-border rounded-button text-theme-ink hover:bg-theme-accent hover:text-theme-paper"
              >
                None
              </button>
            </div>
          )}
        </div>

        {poolTargets.length === 0 ? (
          <p className="text-xs text-theme-muted">No resource pools found on this character.</p>
        ) : (
          <div className="space-y-1">
            {poolTargets.map((t) => {
              const restore = findRestore(t);
              const enabled = !!restore;
              const key = targetKey(t);
              const hasFormula = !!restore?.amountFormula;
              const formulaPreview = restore?.amountFormula
                ? evaluateFormula(restore.amountFormula, formulaLabels)
                : null;
              const isFormulaOpen = formulaOpenKey === key;
              return (
                <div
                  key={key}
                  className="flex flex-col py-0.5"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => toggleTarget(t, e.target.checked)}
                      className="w-4 h-4 accent-theme-accent flex-shrink-0"
                    />
                    <span
                      className={`flex-1 min-w-0 truncate text-sm ${enabled ? 'text-theme-ink' : 'text-theme-muted'}`}
                      title={t.label}
                    >
                      {t.label}
                    </span>
                    {enabled && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <div className="flex rounded-button overflow-hidden border border-theme-border">
                          <button
                            onClick={() => setTargetMode(t, 'full')}
                            className={`px-2 py-0.5 text-[11px] ${restore!.mode === 'full' ? 'bg-theme-accent text-theme-paper' : 'bg-theme-paper text-theme-ink'}`}
                          >
                            Full
                          </button>
                          <button
                            onClick={() => setTargetMode(t, 'flat')}
                            className={`px-2 py-0.5 text-[11px] border-l border-theme-border ${restore!.mode === 'flat' ? 'bg-theme-accent text-theme-paper' : 'bg-theme-paper text-theme-ink'}`}
                          >
                            +Amt
                          </button>
                        </div>
                        {restore!.mode === 'flat' && (
                          <>
                            {hasFormula ? (
                              <span
                                className="w-14 px-1 py-0.5 border border-theme-accent rounded-button bg-theme-accent/10 text-theme-accent text-xs text-center truncate"
                                title={`${restore!.amountFormula} = ${formulaPreview ?? '?'}`}
                              >
                                = {formulaPreview ?? '?'}
                              </span>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                value={restore!.amount ?? 0}
                                onChange={(e) => setTargetAmount(t, e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-14 px-1.5 py-0.5 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm text-center"
                                title={`Max ${t.max}`}
                              />
                            )}
                            <button
                              onClick={() => setFormulaOpenKey(isFormulaOpen ? null : key)}
                              title={hasFormula ? `Formula: ${restore!.amountFormula}` : 'Use a formula'}
                              className={`w-7 h-6 flex items-center justify-center border rounded-button transition-colors ${
                                isFormulaOpen
                                  ? 'border-theme-accent bg-theme-accent/30 text-theme-accent ring-1 ring-theme-accent'
                                  : hasFormula
                                    ? 'border-theme-accent bg-theme-accent/20 text-theme-accent'
                                    : 'border-theme-border text-theme-muted hover:text-theme-ink hover:border-theme-accent'
                              }`}
                            >
                              <span className="italic" style={{ fontSize: '11px' }}>fx</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Inline formula editor */}
                  {enabled && restore!.mode === 'flat' && isFormulaOpen && (
                    <div className="mt-1.5 ml-6 p-2 border border-theme-accent/50 rounded-button bg-theme-paper">
                      <div className="flex items-center gap-1 mb-1.5">
                        <span className="italic text-theme-accent font-bold" style={{ fontSize: '11px' }}>fx</span>
                        <span className="text-xs font-medium text-theme-ink">Restore Amount Formula</span>
                      </div>
                      <input
                        type="text"
                        value={restore!.amountFormula ?? ''}
                        onChange={(e) => setTargetFormula(t, e.target.value)}
                        placeholder="e.g. @level * 2"
                        className="w-full px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm focus:outline-none focus:border-theme-accent"
                      />
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] text-theme-muted">
                          {restore!.amountFormula
                            ? formulaPreview !== null
                              ? <>Preview: <span className="text-theme-accent font-medium">{formulaPreview}</span></>
                              : <span className="text-red-500">Invalid formula</span>
                            : 'Overrides the flat amount when set'}
                        </span>
                        {restore!.amountFormula && (
                          <button
                            onClick={() => { setTargetFormula(t, undefined); setFormulaOpenKey(null); }}
                            className="text-[11px] text-red-500 hover:text-red-700"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      {availableLabels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {availableLabels.slice(0, 12).map((l) => (
                            <button
                              key={l.label}
                              onClick={() => setTargetFormula(t, `${restore!.amountFormula ?? ''}@${l.label}`)}
                              title={`${l.widgetLabel} = ${l.value}`}
                              className="px-1.5 py-0.5 text-[10px] rounded bg-theme-accent/10 text-theme-accent border border-theme-accent/30 hover:bg-theme-accent/20"
                            >
                              @{l.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border border-theme-border rounded-button p-3">
        <h4 className="font-medium text-theme-ink mb-3">Other Actions</h4>
                
        <label className="flex items-center gap-2 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={clearConditions}
            onChange={(e) => updateData({ clearConditions: e.target.checked })}
            className="w-4 h-4 accent-theme-accent"
          />
          <span className="text-sm text-theme-ink">Clear All Conditions</span>
        </label>
        <p className="text-xs text-theme-muted ml-6 mb-3">Turns off all active conditions in Condition widgets</p>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={resetSpellSlots}
            onChange={(e) => updateData({ resetSpellSlots: e.target.checked })}
            className="w-4 h-4 accent-theme-accent"
          />
          <span className="text-sm text-theme-ink">Reset Spell Slots</span>
        </label>
        <p className="text-xs text-theme-muted ml-6 mb-3">Restores all used spell slots in Spell Slot widgets</p>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={passTime}
            onChange={(e) => updateData({ passTime: e.target.checked, passTimeAmount: 0, passTimeUnit: 'hours' })}
            className="w-4 h-4 accent-theme-accent"
          />
          <span className="text-sm text-theme-ink">Pass Time</span>
        </label>
        <p className="text-xs text-theme-muted ml-6 mb-2">Advances time for all Temporary Effects widgets</p>
        
        {passTime && (
          <div className="ml-6 mt-2">
            <label className="block text-xs text-theme-muted mb-1">Flat Time Amount (leave 0 to prompt when clicked)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                className="w-20 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm text-center"
                value={passTimeAmount ?? 0}
                onChange={(e) => updateData({ passTimeAmount: parseInt(e.target.value) || 0 })}
              />
              <select
                className="flex-1 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm"
                value={passTimeUnit}
                onChange={(e) => updateData({ passTimeUnit: e.target.value })}
              >
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

