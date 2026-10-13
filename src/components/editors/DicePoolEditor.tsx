import { v4 as uuidv4 } from 'uuid';
import type { DicePoolComponent, DicePoolTier } from '../../types';
import { PlusIcon, ResetIcon, TrashIcon } from '../icons';
import { Tooltip } from '../Tooltip';
import { CollapsibleSection } from './CollapsibleSection';
import { IntegerInput } from './IntegerInput';
import { LabeledNumberField } from './LabeledNumberField';
import {
  MAX_POOL_FACES,
  MIN_POOL_FACES,
  createDefaultPoolTiers,
  getPoolSize,
  normalizeDiceCount,
  normalizePoolFaces,
  normalizePoolTarget,
} from '../../utils/dicePool';
import type { EditorProps } from './types';

const inputClass = 'h-10 w-full min-w-0 px-2 text-sm border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent';

export function DicePoolEditor({ widget, updateData }: EditorProps) {
  const {
    dicePoolComponents = [],
    dicePoolRule = 'successes',
    dicePoolOnesCancel = false,
    dicePoolTiers = [],
    dicePoolCritical = false,
    dicePoolEmptyRoll = false,
    dicePoolShowBonus = true,
    dicePoolClearAfterRoll = false,
    dicePoolButtonText = '',
    fieldLabels = {},
    fieldFormulas = {},
  } = widget.data;
  const faces = normalizePoolFaces(widget.data.dicePoolFaces);

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

  const updateComponent = (id: string, changes: Partial<DicePoolComponent>) => {
    updateData({ dicePoolComponents: dicePoolComponents.map((component) => (component.id === id ? { ...component, ...changes } : component)) });
  };

  const updateTier = (id: string, changes: Partial<DicePoolTier>) => {
    updateData({ dicePoolTiers: dicePoolTiers.map((tier) => (tier.id === id ? { ...tier, ...changes } : tier)) });
  };

  const setRule = (rule: 'successes' | 'highest') => {
    updateData({
      dicePoolRule: rule,
      ...(rule === 'highest' && dicePoolTiers.length === 0 ? { dicePoolTiers: createDefaultPoolTiers() } : {}),
    });
  };

  const addComponent = () => {
    updateData({ dicePoolComponents: [...dicePoolComponents, { id: uuidv4(), name: `Trait ${dicePoolComponents.length + 1}`, dice: 1, active: false }] });
  };

  const addTier = () => {
    const lowest = dicePoolTiers.reduce((current, tier) => Math.min(current, tier.min), faces + 1);
    updateData({ dicePoolTiers: [...dicePoolTiers, { id: uuidv4(), min: Math.max(1, lowest - 1), label: 'Outcome' }] });
  };

  return (
    <div className="widget-editor widget-editor--dice-pool space-y-4">
      <CollapsibleSection title="Rolling rule">
        <label htmlFor={`dice-pool-faces-${widget.id}`} className="mb-1 block text-sm font-medium text-theme-ink">Die size</label>
        <div className="w-24">
          <IntegerInput
            id={`dice-pool-faces-${widget.id}`}
            value={faces}
            min={MIN_POOL_FACES}
            max={MAX_POOL_FACES}
            ariaLabel="Die size"
            onCommit={(value) => updateData({ dicePoolFaces: value })}
          />
        </div>

        <div className="mt-3">
          <span className="mb-1 block text-sm font-medium text-theme-ink">Result</span>
          <div role="group" aria-label="Rolling rule" className="grid grid-cols-2 gap-1">
            {([{ id: 'successes', name: 'Count successes' }, { id: 'highest', name: 'Highest die' }] as const).map((option) => (
              <button key={option.id} type="button" aria-pressed={dicePoolRule === option.id} className={`widget-control min-w-0 px-3 py-2 text-sm ${dicePoolRule === option.id ? 'widget-control--primary' : ''}`} onClick={() => setRule(option.id)}>
                {option.name}
              </button>
            ))}
          </div>
        </div>

        {dicePoolRule === 'successes' ? (
          <div className="mt-3 space-y-2">
            <LabeledNumberField
              displayLabel="A die succeeds on this or higher"
              value={normalizePoolTarget(widget.data.dicePoolTarget)}
              onChange={(v) => updateData({ dicePoolTarget: normalizePoolTarget(v) })}
              fieldLabel={fieldLabels['dicePoolTarget']}
              onFieldLabelChange={(l) => setFieldLabel('dicePoolTarget', l)}
              formula={fieldFormulas['dicePoolTarget']}
              onFormulaChange={(f) => setFieldFormula('dicePoolTarget', f)}
              min={1}
              step={1}
              controlHeight="input"
              hideStepperButtons
              allowEmpty
            />
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={dicePoolOnesCancel} onChange={(event) => updateData({ dicePoolOnesCancel: event.target.checked })} className="h-4 w-4 accent-theme-accent" />
              <span className="text-sm text-theme-ink">Each 1 removes a success; a 1 with no successes is a botch</span>
            </label>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div>
              <span className="mb-1 block text-sm font-medium text-theme-ink">Outcomes by the best die</span>
              <div className="space-y-2">
                {dicePoolTiers.map((tier, index) => (
                  <div key={tier.id} className="flex items-center gap-2">
                    <div className="w-16 flex-shrink-0">
                      <IntegerInput value={tier.min} min={1} ariaLabel={`Outcome ${index + 1} minimum die`} onCommit={(min) => updateTier(tier.id, { min })} />
                    </div>
                    <span className="flex-shrink-0 text-sm text-theme-muted">+</span>
                    <input aria-label={`Outcome ${index + 1} name`} className={inputClass} value={tier.label} placeholder="Outcome" onChange={(event) => updateTier(tier.id, { label: event.target.value })} />
                    <Tooltip content="Delete outcome">
                      <button type="button" aria-label={`Delete outcome ${tier.label || index + 1}`} className="widget-control h-10 w-10 flex-shrink-0 text-red-500" onClick={() => updateData({ dicePoolTiers: dicePoolTiers.filter((item) => item.id !== tier.id) })}>
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </Tooltip>
                  </div>
                ))}
              </div>
              <button type="button" className="widget-control mt-2 gap-2 px-3 py-2 text-sm" onClick={addTier}>
                <PlusIcon className="h-4 w-4" /> Add outcome
              </button>
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={dicePoolCritical} onChange={(event) => updateData({ dicePoolCritical: event.target.checked })} className="h-4 w-4 accent-theme-accent" />
              <span className="text-sm text-theme-ink">Two or more dice in the top outcome is a critical</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={dicePoolEmptyRoll} onChange={(event) => updateData({ dicePoolEmptyRoll: event.target.checked })} className="h-4 w-4 accent-theme-accent" />
              <span className="text-sm text-theme-ink">With no dice, roll two and keep the lowest</span>
            </label>
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Traits" count={dicePoolComponents.length}>
        <div className="space-y-3">
          {dicePoolComponents.map((component, index) => {
            const name = component.name || `Trait ${index + 1}`;
            return (
              <div key={component.id} className="space-y-2 border-b border-theme-border pb-3">
                <div className="flex items-center gap-2">
                  <input aria-label={`Trait ${index + 1} name`} className={inputClass} value={component.name} placeholder="Trait name" onChange={(event) => updateComponent(component.id, { name: event.target.value })} />
                  <Tooltip content="Delete trait">
                    <button type="button" aria-label={`Delete ${name}`} className="widget-control h-10 w-10 flex-shrink-0 text-red-500" onClick={() => updateData({ dicePoolComponents: dicePoolComponents.filter((item) => item.id !== component.id) })}>
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </Tooltip>
                </div>
                <div role="group" aria-label={`${name} dice`}>
                  <LabeledNumberField
                    displayLabel="Dice"
                    value={normalizeDiceCount(component.dice)}
                    onChange={(dice) => updateComponent(component.id, { dice: normalizeDiceCount(dice) })}
                    fieldLabel={component.diceLabel}
                    onFieldLabelChange={(diceLabel) => updateComponent(component.id, { diceLabel })}
                    formula={component.diceFormula}
                    onFormulaChange={(diceFormula) => updateComponent(component.id, { diceFormula })}
                    min={0}
                    step={1}
                    controlHeight="input"
                    hideStepperButtons
                    allowEmpty
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex-shrink-0 text-sm text-theme-muted">Die size</span>
                  <div className="w-20 flex-shrink-0">
                    <IntegerInput value={normalizePoolFaces(component.faces, faces)} min={MIN_POOL_FACES} max={MAX_POOL_FACES} ariaLabel={`${name} die size`} onCommit={(value) => updateComponent(component.id, { faces: value })} />
                  </div>
                  {component.faces !== undefined && (
                    <Tooltip content="Use the pool's die size">
                      <button type="button" aria-label={`Use the pool die size for ${name}`} className="widget-control h-10 w-10 flex-shrink-0" onClick={() => updateComponent(component.id, { faces: undefined })}>
                        <ResetIcon className="h-4 w-4" />
                      </button>
                    </Tooltip>
                  )}
                </div>
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={component.active} onChange={(event) => updateComponent(component.id, { active: event.target.checked })} className="h-4 w-4 accent-theme-accent" />
                  <span className="text-sm text-theme-ink">In the pool</span>
                </label>
              </div>
            );
          })}
        </div>
        <button type="button" className="widget-control widget-control--primary mt-3 gap-2 px-3 py-2 text-sm" onClick={addComponent}>
          <PlusIcon className="h-4 w-4" /> Add trait
        </button>
      </CollapsibleSection>

      <CollapsibleSection title="Display">
        <label className="mb-2 flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={dicePoolShowBonus} onChange={(event) => updateData({ dicePoolShowBonus: event.target.checked })} className="h-4 w-4 accent-theme-accent" />
          <span className="text-sm text-theme-ink">Show extra dice buttons</span>
        </label>
        <label className="mb-3 flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={dicePoolClearAfterRoll} onChange={(event) => updateData({ dicePoolClearAfterRoll: event.target.checked })} className="h-4 w-4 accent-theme-accent" />
          <span className="text-sm text-theme-ink">Clear the pool after each roll</span>
        </label>
        <label htmlFor={`dice-pool-button-${widget.id}`} className="mb-1 block text-sm font-medium text-theme-ink">Roll button text</label>
        <input id={`dice-pool-button-${widget.id}`} className={inputClass} value={dicePoolButtonText} placeholder="Roll" onChange={(event) => updateData({ dicePoolButtonText: event.target.value })} />
        <div className="mt-4">
          <LabeledNumberField
            displayLabel="Dice in the pool"
            value={getPoolSize(widget.data)}
            onChange={() => undefined}
            fieldLabel={fieldLabels['dicePoolSize']}
            onFieldLabelChange={(l) => setFieldLabel('dicePoolSize', l)}
            formula={undefined}
            onFormulaChange={() => undefined}
            hideFormulaButton
            hideStepperButtons
            readOnlyValue
            controlHeight="input"
          />
        </div>
      </CollapsibleSection>
    </div>
  );
}
