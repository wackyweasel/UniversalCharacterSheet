import { useEffect, useState } from 'react';
import { formatDiceStep, normalizeDiceExpression } from '../../utils/diceExpression';
import type { MixedField, MixedFieldType } from '../../types';
import {
  clampMixedFieldValue,
  createMixedField,
  DEFAULT_MIXED_FIELD_DICE_CHAIN,
  MIXED_FIELD_TYPE_OPTIONS,
} from '../../utils/mixedFields';
import { ChevronDownIcon, ChevronUpIcon, MinusIcon, PlusIcon, TrashIcon } from '../icons';
import { Tooltip } from '../Tooltip';
import { TooltipEditButton } from './TooltipEditButton';
import { LabeledNumberField } from './LabeledNumberField';
import type { EditorProps } from './types';

const RESOURCE_STYLES = [
  ['dots', '●', 'Dots'],
  ['boxes', '■', 'Boxes'],
  ['stars', '★', 'Stars'],
  ['diamonds', '◆', 'Diamonds'],
  ['crosses', '✖', 'Crosses'],
  ['checkmarks', '✔', 'Checkmarks'],
  ['hearts', '❤️', 'Hearts'],
  ['flames', '🔥', 'Flames'],
  ['skulls', '💀', 'Skulls'],
  ['shields', '🛡️', 'Shields'],
  ['swords', '⚔️', 'Swords'],
  ['lightning', '⚡', 'Lightning'],
  ['moons', '🌙', 'Moons'],
  ['suns', '☀️', 'Suns'],
  ['coins', '🪙', 'Coins'],
  ['gems', '💎', 'Gems'],
] as const;

type BoundKey = 'minimum' | 'maximum';

interface RevealedBounds {
  minimum?: boolean;
  maximum?: boolean;
}

function StepDiceSettings({ field, onChange }: { field: Extract<MixedField, { type: 'step-dice' }>; onChange: (field: MixedField) => void }) {
  const chain = field.diceChain?.length ? field.diceChain : DEFAULT_MIXED_FIELD_DICE_CHAIN;
  const [chainDraft, setChainDraft] = useState(chain.map(formatDiceStep).join(', '));

  useEffect(() => {
    setChainDraft(chain.map(formatDiceStep).join(', '));
  }, [field.diceChain]);

  const commitChain = () => {
    const normalized = chainDraft
      .split(',')
      .map((step) => normalizeDiceExpression(step))
      .filter((step): step is string => step !== null);
    if (!normalized.length) {
      setChainDraft(chain.map(formatDiceStep).join(', '));
      return;
    }
    onChange({ ...field, diceChain: normalized, currentStep: Math.min(field.currentStep, normalized.length - 1) });
  };

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <label className="text-xs text-theme-muted">Starting die<select value={field.currentStep} onChange={(event) => onChange({ ...field, currentStep: Number(event.target.value) })} className="mt-1 h-8 w-full rounded-button border border-theme-border bg-theme-paper px-2 text-sm font-body text-theme-ink">{chain.map((step, index) => <option key={index} value={index}>{formatDiceStep(step)}</option>)}</select></label>
      <label className="text-xs text-theme-muted">Dice chain<input value={chainDraft} onChange={(event) => setChainDraft(event.target.value)} onBlur={commitChain} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commitChain(); } }} placeholder="1d4, 1d6, 1d8" className="mt-1 h-8 w-full rounded-button border border-theme-border bg-theme-paper px-2 text-sm font-body text-theme-ink" /></label>
    </div>
  );
}

export function MixedFieldsEditor({ widget, updateData }: EditorProps) {
  const { label, mixedFields = [], labelWidth = 33, itemSpacing = 4 } = widget.data;
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<MixedFieldType>('text');
  const [revealedBounds, setRevealedBounds] = useState<Record<number, RevealedBounds>>({});
  const [openStylePicker, setOpenStylePicker] = useState<number | null>(null);

  const updateField = (index: number, field: MixedField) => {
    const updated = [...mixedFields];
    updated[index] = field;
    updateData({ mixedFields: updated });
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= mixedFields.length) return;
    const updated = [...mixedFields];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    updateData({ mixedFields: updated });
  };

  const changeFieldType = (index: number, type: MixedFieldType) => {
    const current = mixedFields[index];
    updateField(index, { ...createMixedField(type, current.name), tooltip: current.tooltip });
  };

  const revealBound = (index: number, bound: BoundKey) => {
    setRevealedBounds((current) => ({
      ...current,
      [index]: { ...current[index], [bound]: true },
    }));
  };

  const toggleBounds = (index: number, visible: boolean) => {
    setRevealedBounds((current) => ({
      ...current,
      [index]: { minimum: visible, maximum: visible },
    }));
  };

  const isBoundVisible = (index: number, bound: BoundKey, value: number | undefined, fieldLabel?: string, formula?: string) => (
    revealedBounds[index]?.[bound] !== false && Boolean(revealedBounds[index]?.[bound] || value !== undefined || fieldLabel || formula)
  );

  const renderBoundsToggle = (index: number, boundsVisible: boolean) => {
    return (
      <button type="button" onClick={() => toggleBounds(index, !boundsVisible)} className="widget-control h-10 min-h-0 flex-shrink-0 gap-1 bg-theme-paper px-2 py-1 text-xs">
        {boundsVisible ? <MinusIcon className="h-3 w-3" /> : <PlusIcon className="h-3 w-3" />}
        {boundsVisible ? 'Hide min/max' : 'Show min/max'}
      </button>
    );
  };

  const renderSettings = (field: MixedField, index: number) => {
    switch (field.type) {
      case 'text':
        return <input aria-label={`${field.name || 'Text'} default value`} value={field.value} onChange={(event) => updateField(index, { ...field, value: event.target.value })} placeholder="Default value" className="h-8 w-full rounded-button border border-theme-border bg-theme-paper px-2 text-sm font-body text-theme-ink" />;
      case 'menu':
        return (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-xs text-theme-muted">Selected value<select value={field.value} onChange={(event) => updateField(index, { ...field, value: event.target.value })} className="mt-1 h-8 w-full rounded-button border border-theme-border bg-theme-paper px-2 text-sm font-body text-theme-ink"><option value="">None</option>{field.options.map((option, optionIndex) => <option key={`${option}-${optionIndex}`} value={option}>{option}</option>)}</select></label>
            <label className="text-xs text-theme-muted">Options (one per line)<textarea value={field.options.join('\n')} onChange={(event) => { const options = event.target.value.split('\n'); updateField(index, { ...field, options, value: options.includes(field.value) ? field.value : '' }); }} rows={3} className="mt-1 w-full resize-y rounded-button border border-theme-border bg-theme-paper px-2 py-1 text-sm font-body text-theme-ink" /></label>
          </div>
        );
      case 'switch':
        return (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-theme-muted">Formula label</label>
              <input
                value={field.valueLabel || ''}
                onChange={(event) => updateField(index, { ...field, valueLabel: event.target.value })}
                placeholder="e.g. torchLit"
                className="mt-1 h-8 w-full rounded-button border border-theme-border bg-theme-paper px-2 text-sm font-body text-theme-ink"
              />
              <p className="mt-1 text-[10px] text-theme-muted">Use in formulas: 1 when on, 0 when off.</p>
            </div>
            <div>
              <label className="block text-xs text-theme-muted">On color</label>
              <div className="mt-1 flex items-center gap-2">
                <input type="color" value={field.toggleColor || '#2563eb'} onChange={(event) => updateField(index, { ...field, toggleColor: event.target.value })} className="h-8 w-8 rounded-button border border-theme-border bg-theme-paper p-1" />
                <button type="button" onClick={() => updateField(index, { ...field, toggleColor: undefined })} disabled={!field.toggleColor} className="widget-control min-h-0 px-2 py-1 text-xs disabled:opacity-50">Use theme</button>
              </div>
            </div>
          </div>
        );
      case 'number': {
        const showMinimum = isBoundVisible(index, 'minimum', field.minValue, field.minValueLabel, field.minValueFormula);
        const showMaximum = isBoundVisible(index, 'maximum', field.maxValue, field.maxValueLabel, field.maxValueFormula);
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-16 flex-shrink-0 text-xs text-theme-muted">Value</span>
              <LabeledNumberField
                value={field.value}
                onChange={(value) => updateField(index, { ...field, value: clampMixedFieldValue(value, field.minValue ?? Number.NEGATIVE_INFINITY, field.maxValue ?? Number.POSITIVE_INFINITY) })}
                fieldLabel={field.valueLabel}
                onFieldLabelChange={(valueLabel) => updateField(index, { ...field, valueLabel })}
                formula={field.valueFormula}
                onFormulaChange={(valueFormula) => updateField(index, { ...field, valueFormula })}
                min={field.minValue}
                max={field.maxValue}
                compact
                controlHeight="input"
                allowEmpty
                hideStepperButtons
              />
              {renderBoundsToggle(index, showMinimum || showMaximum)}
            </div>
            <div className="space-y-2">
              {showMinimum && (
              <div className="flex items-center gap-2">
                <span className="w-16 flex-shrink-0 text-xs text-theme-muted">Minimum</span>
                <LabeledNumberField
                  value={field.minValue}
                  onChange={(minValue) => updateField(index, { ...field, minValue, value: Math.max(minValue, field.value) })}
                  onClear={() => {
                    revealBound(index, 'minimum');
                    updateField(index, { ...field, minValue: undefined, minValueLabel: undefined, minValueFormula: undefined });
                  }}
                  fieldLabel={field.minValueLabel}
                  onFieldLabelChange={(minValueLabel) => updateField(index, { ...field, minValueLabel })}
                  formula={field.minValueFormula}
                  onFormulaChange={(minValueFormula) => updateField(index, { ...field, minValueFormula })}
                  max={field.maxValue}
                  compact
                  controlHeight="input"
                  allowEmpty
                  hideStepperButtons
                />
              </div>
            )}
              {showMaximum && (
              <div className="flex items-center gap-2">
                <span className="w-16 flex-shrink-0 text-xs text-theme-muted">Maximum</span>
                <LabeledNumberField
                  value={field.maxValue}
                  onChange={(maxValue) => updateField(index, { ...field, maxValue, value: Math.min(maxValue, field.value) })}
                  onClear={() => {
                    revealBound(index, 'maximum');
                    updateField(index, { ...field, maxValue: undefined, maxValueLabel: undefined, maxValueFormula: undefined });
                  }}
                  fieldLabel={field.maxValueLabel}
                  onFieldLabelChange={(maxValueLabel) => updateField(index, { ...field, maxValueLabel })}
                  formula={field.maxValueFormula}
                  onFormulaChange={(maxValueFormula) => updateField(index, { ...field, maxValueFormula })}
                  min={field.minValue}
                  compact
                  controlHeight="input"
                  allowEmpty
                  hideStepperButtons
                />
              </div>
              )}
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-theme-ink">
              <input
                type="checkbox"
                checked={field.showIncrementButtons !== false}
                onChange={(event) => updateField(index, { ...field, showIncrementButtons: event.target.checked })}
                className="h-4 w-4 accent-theme-accent"
              />
              <span>Show +/− buttons</span>
            </label>
          </div>
        );
      }
      case 'progress': {
        const showMinimum = isBoundVisible(index, 'minimum', field.min, field.minLabel, field.minFormula);
        const showMaximum = isBoundVisible(index, 'maximum', field.max, field.maxLabel, field.maxFormula);
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-16 flex-shrink-0 text-xs text-theme-muted">Value</span>
              <LabeledNumberField
                value={field.current}
                onChange={(current) => updateField(index, { ...field, current: clampMixedFieldValue(current, field.min ?? 0, field.max) })}
                fieldLabel={field.currentLabel}
                onFieldLabelChange={(currentLabel) => updateField(index, { ...field, currentLabel })}
                formula={field.currentFormula}
                onFormulaChange={(currentFormula) => updateField(index, { ...field, currentFormula })}
                min={field.min ?? 0}
                max={field.max}
                compact
                controlHeight="input"
                allowEmpty
                hideStepperButtons
              />
              {renderBoundsToggle(index, showMinimum || showMaximum)}
            </div>
            <div className="space-y-2">
              {showMinimum && (
              <div className="flex items-center gap-2">
                <span className="w-16 flex-shrink-0 text-xs text-theme-muted">Minimum</span>
                <LabeledNumberField
                  value={field.min}
                  onChange={(min) => updateField(index, { ...field, min: Math.min(min, field.max), current: Math.max(Math.min(min, field.max), field.current) })}
                  onClear={() => {
                    revealBound(index, 'minimum');
                    updateField(index, { ...field, min: undefined, minLabel: undefined, minFormula: undefined });
                  }}
                  fieldLabel={field.minLabel}
                  onFieldLabelChange={(minLabel) => updateField(index, { ...field, minLabel })}
                  formula={field.minFormula}
                  onFormulaChange={(minFormula) => updateField(index, { ...field, minFormula })}
                  max={field.max}
                  compact
                  controlHeight="input"
                  allowEmpty
                  hideStepperButtons
                />
              </div>
            )}
              {showMaximum && (
              <div className="flex items-center gap-2">
                <span className="w-16 flex-shrink-0 text-xs text-theme-muted">Maximum</span>
                <LabeledNumberField
                  value={field.max}
                  onChange={(max) => {
                    const nextMax = Math.max(field.min ?? 0, max);
                    updateField(index, { ...field, max: nextMax, current: Math.min(field.current, nextMax) });
                  }}
                  fieldLabel={field.maxLabel}
                  onFieldLabelChange={(maxLabel) => updateField(index, { ...field, maxLabel })}
                  formula={field.maxFormula}
                  onFormulaChange={(maxFormula) => updateField(index, { ...field, maxFormula })}
                  min={field.min ?? 0}
                  compact
                  controlHeight="input"
                  allowEmpty
                  hideStepperButtons
                />
              </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-theme-ink">
              <div className="flex items-center gap-2">
                <label htmlFor={`mixed-fields-fill-color-${widget.id}-${index}`} className="text-theme-muted">Fill color</label>
                <input id={`mixed-fields-fill-color-${widget.id}-${index}`} type="color" value={field.fillColor || '#2563eb'} onChange={(event) => updateField(index, { ...field, fillColor: event.target.value })} className="h-10 w-10 flex-shrink-0 rounded-button border border-theme-border bg-theme-paper p-1" />
              </div>
              <label className="flex items-center gap-1"><input type="checkbox" checked={field.showValues !== false} onChange={(event) => updateField(index, { ...field, showValues: event.target.checked })} className="accent-theme-accent" /> Show values</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={field.showPercentage === true} onChange={(event) => updateField(index, { ...field, showPercentage: event.target.checked })} className="accent-theme-accent" /> Show percentage</label>
            </div>
          </div>
        );
      }
      case 'resource': {
        const selectedStyle = RESOURCE_STYLES.find(([value]) => value === field.style) ?? RESOURCE_STYLES[0];
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-16 flex-shrink-0 text-xs text-theme-muted">Current</span>
              <LabeledNumberField value={field.current} onChange={(current) => updateField(index, { ...field, current: clampMixedFieldValue(current, 0, field.max) })} fieldLabel={field.currentLabel} onFieldLabelChange={(currentLabel) => updateField(index, { ...field, currentLabel })} formula={field.currentFormula} onFormulaChange={(currentFormula) => updateField(index, { ...field, currentFormula })} min={0} max={field.max} compact controlHeight="input" allowEmpty hideStepperButtons />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-16 flex-shrink-0 text-xs text-theme-muted">Maximum</span>
              <LabeledNumberField value={field.max} onChange={(max) => updateField(index, { ...field, max: Math.max(1, max), current: Math.min(field.current, Math.max(1, max)) })} fieldLabel={field.maxLabel} onFieldLabelChange={(maxLabel) => updateField(index, { ...field, maxLabel })} formula={field.maxFormula} onFormulaChange={(maxFormula) => updateField(index, { ...field, maxFormula })} min={1} compact controlHeight="input" allowEmpty hideStepperButtons />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-theme-muted">Symbol</span>
                <div className="relative flex-shrink-0">
                  <Tooltip content={`Resource style: ${selectedStyle[2]}`}>
                    <button
                      type="button"
                      aria-expanded={openStylePicker === index}
                      aria-haspopup="menu"
                      aria-label={`Resource style: ${selectedStyle[2]}`}
                      onClick={() => setOpenStylePicker((current) => current === index ? null : index)}
                      className="widget-control flex h-8 w-8 items-center justify-center p-0 text-base leading-none"
                    >
                      {selectedStyle[1]}
                    </button>
                  </Tooltip>
                  {openStylePicker === index && (
                    <div className="absolute left-0 top-full z-30 mt-1 grid w-72 grid-cols-8 gap-1 rounded-theme border border-theme-border bg-theme-paper p-1 shadow-theme" role="menu" aria-label="Resource style options">
                      {RESOURCE_STYLES.map(([value, symbol, name]) => (
                        <button
                          key={value}
                          type="button"
                          role="menuitem"
                          title={name}
                          aria-label={name}
                          aria-pressed={field.style === value}
                          onClick={() => {
                            updateField(index, { ...field, style: value });
                            setOpenStylePicker(null);
                          }}
                          className={`widget-control flex aspect-square min-w-0 items-center justify-center p-0 text-base leading-none ${field.style === value ? 'border-theme-accent bg-theme-accent/10' : ''}`}
                        >
                          {symbol}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <label className="flex items-center gap-1 text-xs text-theme-ink"><input type="checkbox" checked={field.showCount === true} onChange={(event) => updateField(index, { ...field, showCount: event.target.checked })} className="accent-theme-accent" /> Show count</label>
            </div>
          </div>
        );
      }
      case 'step-dice':
        return <StepDiceSettings field={field} onChange={(updated) => updateField(index, updated)} />;
    }
  };

  return (
    <div className="widget-editor widget-editor--mixed-fields space-y-4">
      <div><label className="mb-1 block text-sm font-medium text-theme-ink">Widget Label</label><input value={label || ''} onChange={(event) => updateData({ label: event.target.value })} placeholder="Mixed fields" className="w-full rounded-button border border-theme-border bg-theme-paper px-3 py-2 font-body text-theme-ink focus:border-theme-accent focus:outline-none" /></div>
      <section className="widget-editor__section" aria-labelledby="mixed-fields-layout-title">
        <div className="widget-editor__section-heading">
          <h3 id="mixed-fields-layout-title" className="widget-editor__section-title">Field layout</h3>
        </div>
        <div className="space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="mixed-fields-label-width" className="text-xs font-bold uppercase text-theme-muted">Label width</label>
              <span className="widget-editor__section-count">{labelWidth}%</span>
            </div>
            <input id="mixed-fields-label-width" type="range" min="10" max="70" value={labelWidth} onChange={(event) => updateData({ labelWidth: Number(event.target.value) })} className="w-full accent-theme-accent" />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="mixed-fields-item-spacing" className="text-xs font-bold uppercase text-theme-muted">Vertical spacing</label>
              <span className="widget-editor__section-count">{itemSpacing}px</span>
            </div>
            <input id="mixed-fields-item-spacing" type="range" min="0" max="16" value={itemSpacing} onChange={(event) => updateData({ itemSpacing: Number(event.target.value) })} className="w-full accent-theme-accent" />
          </div>
        </div>
      </section>

      <section className="widget-editor__section" aria-labelledby="mixed-fields-title">
        <div className="widget-editor__section-heading">
          <h3 id="mixed-fields-title" className="widget-editor__section-title">Fields</h3>
          <span className="widget-editor__section-count">{mixedFields.length}</span>
        </div>
        <div className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
          {mixedFields.map((field, index) => (
            <div key={index} className="rounded-theme border border-theme-border p-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-shrink-0 gap-0.5">
                  <Tooltip content="Move up"><button type="button" onClick={() => moveField(index, -1)} disabled={index === 0} className="widget-control h-10 w-10 min-h-0 p-1"><ChevronUpIcon className="h-3.5 w-3.5" /></button></Tooltip>
                  <Tooltip content="Move down"><button type="button" onClick={() => moveField(index, 1)} disabled={index === mixedFields.length - 1} className="widget-control h-10 w-10 min-h-0 p-1"><ChevronDownIcon className="h-3.5 w-3.5" /></button></Tooltip>
                </div>
                <input value={field.name} onChange={(event) => updateField(index, { ...field, name: event.target.value })} placeholder="Field name" className="order-first mb-1 h-10 w-full min-w-0 rounded-button border border-theme-border bg-theme-paper px-2 text-sm font-body text-theme-ink sm:order-none sm:mb-0 sm:w-auto sm:flex-1" />
                <select value={field.type} onChange={(event) => changeFieldType(index, event.target.value as MixedFieldType)} className="h-10 min-w-0 flex-1 rounded-button border border-theme-border bg-theme-paper px-1 text-sm font-body text-theme-ink sm:w-28 sm:flex-none">{MIXED_FIELD_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                <TooltipEditButton tooltip={field.tooltip} itemName={field.name} buttonClassName="h-10 w-10" onSave={(tooltip) => updateField(index, { ...field, tooltip })} />
                <button type="button" aria-label={`Delete ${field.name || 'field'}`} onClick={() => updateData({ mixedFields: mixedFields.filter((_, fieldIndex) => fieldIndex !== index) })} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-button border border-theme-border text-red-500 transition-colors hover:border-red-500 hover:text-red-700" title="Delete field">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2">{renderSettings(field, index)}</div>
            </div>
          ))}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); const name = newFieldName.trim(); if (!name) return; updateData({ mixedFields: [...mixedFields, createMixedField(newFieldType, name)] }); setNewFieldName(''); }} className="widget-editor__add-row mt-2 flex gap-2">
          <input value={newFieldName} onChange={(event) => setNewFieldName(event.target.value)} placeholder="Add field..." className="h-9 min-w-0 flex-1 rounded-button border border-theme-border bg-theme-paper px-2 text-sm font-body text-theme-ink" />
          <select value={newFieldType} onChange={(event) => setNewFieldType(event.target.value as MixedFieldType)} className="h-9 w-28 rounded-button border border-theme-border bg-theme-paper px-1 text-sm font-body text-theme-ink">{MIXED_FIELD_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          <button type="submit" disabled={!newFieldName.trim()} className="rounded-button bg-theme-accent px-3 py-1 text-sm text-theme-paper disabled:opacity-50">Add</button>
        </form>
      </section>
    </div>
  );
}