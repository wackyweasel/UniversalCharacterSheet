import { useEffect, useState } from 'react';
import { formatDiceStep, normalizeDiceExpression } from '../../utils/diceExpression';
import type { MixedField, MixedFieldType } from '../../types';
import {
  clampMixedFieldValue,
  createMixedField,
  DEFAULT_MIXED_FIELD_DICE_CHAIN,
  MIXED_FIELD_TYPE_OPTIONS,
} from '../../utils/mixedFields';
import { ChevronDownIcon, ChevronUpIcon } from '../icons';
import { Tooltip } from '../Tooltip';
import { TooltipEditButton } from './TooltipEditButton';
import { LabeledNumberField } from './LabeledNumberField';
import type { EditorProps } from './types';

const RESOURCE_STYLES = [
  ['dots', 'Dots'],
  ['boxes', 'Boxes'],
  ['stars', 'Stars'],
  ['diamonds', 'Diamonds'],
  ['hearts', 'Hearts'],
] as const;

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
      <label className="text-xs text-theme-muted">Starting die<select value={field.currentStep} onChange={(event) => onChange({ ...field, currentStep: Number(event.target.value) })} className="mt-1 h-8 w-full rounded-button border border-theme-border bg-theme-paper px-2 text-sm text-theme-ink">{chain.map((step, index) => <option key={index} value={index}>{formatDiceStep(step)}</option>)}</select></label>
      <label className="text-xs text-theme-muted">Dice chain<input value={chainDraft} onChange={(event) => setChainDraft(event.target.value)} onBlur={commitChain} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commitChain(); } }} placeholder="1d4, 1d6, 1d8" className="mt-1 h-8 w-full rounded-button border border-theme-border bg-theme-paper px-2 text-sm text-theme-ink" /></label>
    </div>
  );
}

export function MixedFieldsEditor({ widget, updateData }: EditorProps) {
  const { label, mixedFields = [], labelWidth = 33 } = widget.data;
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<MixedFieldType>('text');

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

  const renderSettings = (field: MixedField, index: number) => {
    switch (field.type) {
      case 'text':
        return <label className="block text-xs text-theme-muted">Default value<input value={field.value} onChange={(event) => updateField(index, { ...field, value: event.target.value })} className="mt-1 h-8 w-full rounded-button border border-theme-border bg-theme-paper px-2 text-sm text-theme-ink" /></label>;
      case 'menu':
        return (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-xs text-theme-muted">Selected value<select value={field.value} onChange={(event) => updateField(index, { ...field, value: event.target.value })} className="mt-1 h-8 w-full rounded-button border border-theme-border bg-theme-paper px-2 text-sm text-theme-ink"><option value="">None</option>{field.options.map((option, optionIndex) => <option key={`${option}-${optionIndex}`} value={option}>{option}</option>)}</select></label>
            <label className="text-xs text-theme-muted">Options (one per line)<textarea value={field.options.join('\n')} onChange={(event) => { const options = event.target.value.split('\n'); updateField(index, { ...field, options, value: options.includes(field.value) ? field.value : '' }); }} rows={3} className="mt-1 w-full resize-y rounded-button border border-theme-border bg-theme-paper px-2 py-1 text-sm text-theme-ink" /></label>
          </div>
        );
      case 'number':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2"><span className="w-16 flex-shrink-0 text-xs text-theme-muted">Current</span><LabeledNumberField value={field.value} onChange={(value) => updateField(index, { ...field, value: clampMixedFieldValue(value, field.minValue ?? Number.NEGATIVE_INFINITY, field.maxValue ?? Number.POSITIVE_INFINITY) })} fieldLabel={field.valueLabel} onFieldLabelChange={(valueLabel) => updateField(index, { ...field, valueLabel })} formula={field.valueFormula} onFormulaChange={(valueFormula) => updateField(index, { ...field, valueFormula })} min={field.minValue} max={field.maxValue} compact hideStepperButtons /></div>
            <div className="flex items-center gap-2"><span className="w-16 flex-shrink-0 text-xs text-theme-muted">Minimum</span><LabeledNumberField value={field.minValue} onChange={(minValue) => updateField(index, { ...field, minValue, value: Math.max(minValue, field.value) })} onClear={() => updateField(index, { ...field, minValue: undefined, minValueLabel: undefined, minValueFormula: undefined })} fieldLabel={field.minValueLabel} onFieldLabelChange={(minValueLabel) => updateField(index, { ...field, minValueLabel })} formula={field.minValueFormula} onFormulaChange={(minValueFormula) => updateField(index, { ...field, minValueFormula })} max={field.maxValue} compact hideStepperButtons /></div>
            <div className="flex items-center gap-2"><span className="w-16 flex-shrink-0 text-xs text-theme-muted">Maximum</span><LabeledNumberField value={field.maxValue} onChange={(maxValue) => updateField(index, { ...field, maxValue, value: Math.min(maxValue, field.value) })} onClear={() => updateField(index, { ...field, maxValue: undefined, maxValueLabel: undefined, maxValueFormula: undefined })} fieldLabel={field.maxValueLabel} onFieldLabelChange={(maxValueLabel) => updateField(index, { ...field, maxValueLabel })} formula={field.maxValueFormula} onFormulaChange={(maxValueFormula) => updateField(index, { ...field, maxValueFormula })} min={field.minValue} compact hideStepperButtons /></div>
          </div>
        );
      case 'progress':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2"><span className="w-16 flex-shrink-0 text-xs text-theme-muted">Current</span><LabeledNumberField value={field.current} onChange={(current) => updateField(index, { ...field, current: clampMixedFieldValue(current, 0, field.max) })} fieldLabel={field.currentLabel} onFieldLabelChange={(currentLabel) => updateField(index, { ...field, currentLabel })} formula={field.currentFormula} onFormulaChange={(currentFormula) => updateField(index, { ...field, currentFormula })} min={0} max={field.max} compact hideStepperButtons /></div>
            <div className="flex items-center gap-2"><span className="w-16 flex-shrink-0 text-xs text-theme-muted">Maximum</span><LabeledNumberField value={field.max} onChange={(max) => updateField(index, { ...field, max: Math.max(1, max), current: Math.min(field.current, Math.max(1, max)) })} fieldLabel={field.maxLabel} onFieldLabelChange={(maxLabel) => updateField(index, { ...field, maxLabel })} formula={field.maxFormula} onFormulaChange={(maxFormula) => updateField(index, { ...field, maxFormula })} min={1} compact hideStepperButtons /></div>
            <label className="block text-xs text-theme-muted">Fill color<input type="color" value={field.fillColor || '#2563eb'} onChange={(event) => updateField(index, { ...field, fillColor: event.target.value })} className="mt-1 h-8 w-full rounded-button border border-theme-border bg-theme-paper p-1" /></label>
            <div className="flex gap-4 text-xs text-theme-ink"><label className="flex items-center gap-1"><input type="checkbox" checked={field.showValues !== false} onChange={(event) => updateField(index, { ...field, showValues: event.target.checked })} className="accent-theme-accent" /> Show values</label><label className="flex items-center gap-1"><input type="checkbox" checked={field.showPercentage === true} onChange={(event) => updateField(index, { ...field, showPercentage: event.target.checked })} className="accent-theme-accent" /> Show percentage</label></div>
          </div>
        );
      case 'resource':
        return (
          <div className="space-y-2"><div className="flex items-center gap-2"><span className="w-16 flex-shrink-0 text-xs text-theme-muted">Current</span><LabeledNumberField value={field.current} onChange={(current) => updateField(index, { ...field, current: clampMixedFieldValue(current, 0, field.max) })} fieldLabel={field.currentLabel} onFieldLabelChange={(currentLabel) => updateField(index, { ...field, currentLabel })} formula={field.currentFormula} onFormulaChange={(currentFormula) => updateField(index, { ...field, currentFormula })} min={0} max={field.max} compact hideStepperButtons /></div><div className="flex items-center gap-2"><span className="w-16 flex-shrink-0 text-xs text-theme-muted">Maximum</span><LabeledNumberField value={field.max} onChange={(max) => updateField(index, { ...field, max: Math.max(1, max), current: Math.min(field.current, Math.max(1, max)) })} fieldLabel={field.maxLabel} onFieldLabelChange={(maxLabel) => updateField(index, { ...field, maxLabel })} formula={field.maxFormula} onFormulaChange={(maxFormula) => updateField(index, { ...field, maxFormula })} min={1} compact hideStepperButtons /></div><div className="grid grid-cols-2 gap-2"><label className="text-xs text-theme-muted">Style<select value={field.style} onChange={(event) => updateField(index, { ...field, style: event.target.value })} className="mt-1 h-8 w-full rounded-button border border-theme-border bg-theme-paper px-1 text-sm">{RESOURCE_STYLES.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label><label className="flex items-end gap-1 pb-2 text-xs text-theme-ink"><input type="checkbox" checked={field.showCount === true} onChange={(event) => updateField(index, { ...field, showCount: event.target.checked })} className="accent-theme-accent" /> Count</label></div></div>
        );
      case 'step-dice':
        return <StepDiceSettings field={field} onChange={(updated) => updateField(index, updated)} />;
    }
  };

  return (
    <div className="space-y-4">
      <div><label className="mb-1 block text-sm font-medium text-theme-ink">Widget Label</label><input value={label || ''} onChange={(event) => updateData({ label: event.target.value })} placeholder="Mixed fields" className="w-full rounded-button border border-theme-border bg-theme-paper px-3 py-2 text-theme-ink focus:border-theme-accent focus:outline-none" /></div>
      <div><label className="mb-1 block text-sm font-medium text-theme-ink">Label Width: {labelWidth}%</label><input type="range" min="10" max="70" value={labelWidth} onChange={(event) => updateData({ labelWidth: Number(event.target.value) })} className="w-full accent-theme-accent" /></div>

      <div>
        <label className="mb-2 block text-sm font-medium text-theme-ink">Fields</label>
        <div className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
          {mixedFields.map((field, index) => (
            <div key={index} className="rounded-button border border-theme-border p-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-shrink-0 gap-0.5">
                  <Tooltip content="Move up"><button type="button" onClick={() => moveField(index, -1)} disabled={index === 0} className="widget-control h-7 w-7 min-h-0 p-1"><ChevronUpIcon className="h-3.5 w-3.5" /></button></Tooltip>
                  <Tooltip content="Move down"><button type="button" onClick={() => moveField(index, 1)} disabled={index === mixedFields.length - 1} className="widget-control h-7 w-7 min-h-0 p-1"><ChevronDownIcon className="h-3.5 w-3.5" /></button></Tooltip>
                </div>
                <input value={field.name} onChange={(event) => updateField(index, { ...field, name: event.target.value })} placeholder="Field name" className="order-first mb-1 h-8 w-full min-w-0 rounded-button border border-theme-border bg-theme-paper px-2 text-sm text-theme-ink sm:order-none sm:mb-0 sm:w-auto sm:flex-1" />
                <select value={field.type} onChange={(event) => changeFieldType(index, event.target.value as MixedFieldType)} className="h-8 min-w-0 flex-1 rounded-button border border-theme-border bg-theme-paper px-1 text-sm text-theme-ink sm:w-28 sm:flex-none">{MIXED_FIELD_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                <TooltipEditButton tooltip={field.tooltip} itemName={field.name} onSave={(tooltip) => updateField(index, { ...field, tooltip })} />
                <button type="button" aria-label={`Remove ${field.name}`} onClick={() => updateData({ mixedFields: mixedFields.filter((_, fieldIndex) => fieldIndex !== index) })} className="h-7 w-7 text-lg text-red-500 hover:text-red-700">×</button>
              </div>
              <div className="mt-2">{renderSettings(field, index)}</div>
            </div>
          ))}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); const name = newFieldName.trim(); if (!name) return; updateData({ mixedFields: [...mixedFields, createMixedField(newFieldType, name)] }); setNewFieldName(''); }} className="mt-2 flex gap-2">
          <input value={newFieldName} onChange={(event) => setNewFieldName(event.target.value)} placeholder="Add field..." className="h-9 min-w-0 flex-1 rounded-button border border-theme-border bg-theme-paper px-2 text-sm text-theme-ink" />
          <select value={newFieldType} onChange={(event) => setNewFieldType(event.target.value as MixedFieldType)} className="h-9 w-28 rounded-button border border-theme-border bg-theme-paper px-1 text-sm text-theme-ink">{MIXED_FIELD_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          <button type="submit" disabled={!newFieldName.trim()} className="rounded-button bg-theme-accent px-3 py-1 text-sm text-theme-paper disabled:opacity-50">Add</button>
        </form>
      </div>
    </div>
  );
}