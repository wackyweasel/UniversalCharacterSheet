import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { TrackThreshold } from '../../types';
import { PlusIcon, ResetIcon, TrashIcon } from '../icons';
import { Tooltip } from '../Tooltip';
import { CollapsibleSection } from './CollapsibleSection';
import { LabeledNumberField } from './LabeledNumberField';
import {
  clampTrackValue,
  getTrackBounds,
  getTrackModifier,
  getTrackValue,
  getTrackZone,
} from '../../utils/thresholdTrack';
import type { EditorProps } from './types';

const inputClass = 'h-10 w-full min-w-0 px-2 text-sm border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent';

// Keeps partial input such as "-" local and only commits whole numbers; an empty field clears the value.
function OptionalIntegerInput({
  value,
  onCommit,
  ariaLabel,
  placeholder,
}: {
  value: number | undefined;
  onCommit: (value: number | undefined) => void;
  ariaLabel: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value === undefined ? '' : String(value));
  useEffect(() => setDraft(value === undefined ? '' : String(value)), [value]);

  return (
    <input
      type="number"
      inputMode="numeric"
      step="1"
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value);
        if (event.target.value.trim() === '') {
          onCommit(undefined);
          return;
        }
        const next = Number(event.target.value);
        if (Number.isInteger(next)) onCommit(next);
      }}
      onBlur={() => setDraft(value === undefined ? '' : String(value))}
      className={`${inputClass} text-center`}
    />
  );
}

export function ThresholdTrackEditor({ widget, updateData }: EditorProps) {
  const {
    trackThresholds = [],
    trackStyle = 'steps',
    trackThresholdMode = 'rising',
    trackShowZoneNames = true,
    showValues = true,
    showIncrementButtons = true,
    fillColor,
    fieldLabels = {},
    fieldFormulas = {},
  } = widget.data;
  const { min, max } = getTrackBounds(widget.data);
  const value = getTrackValue(widget.data);
  const zone = getTrackZone(trackThresholds, value, trackThresholdMode);
  const isFalling = trackThresholdMode === 'falling';

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

  const updateThreshold = (id: string, changes: Partial<TrackThreshold>) => {
    updateData({ trackThresholds: trackThresholds.map((threshold) => (threshold.id === id ? { ...threshold, ...changes } : threshold)) });
  };

  const addThreshold = () => {
    const highest = trackThresholds.reduce((current, threshold) => Math.max(current, threshold.value), min);
    const next = Math.min(max, highest + Math.max(1, Math.round((max - min) / 4)));
    updateData({
      trackThresholds: [...trackThresholds, { id: uuidv4(), name: `Zone ${trackThresholds.length + 1}`, value: next }],
    });
  };

  return (
    <div className="widget-editor widget-editor--threshold-track space-y-4">
      <CollapsibleSection title="Track values">
        <div className="space-y-2">
          <LabeledNumberField
            displayLabel="Current value"
            value={value}
            onChange={(v) => updateData({ currentValue: clampTrackValue(v, min, max) })}
            fieldLabel={fieldLabels['currentValue']}
            onFieldLabelChange={(l) => setFieldLabel('currentValue', l)}
            formula={fieldFormulas['currentValue']}
            onFormulaChange={(f) => setFieldFormula('currentValue', f)}
            min={min}
            max={max}
            step={1}
            controlHeight="input"
            allowEmpty
          />
          <LabeledNumberField
            displayLabel="Minimum value"
            value={min}
            onChange={(v) => {
              const nextMin = Math.min(max - 1, Math.round(v));
              updateData({ minValue: nextMin, currentValue: clampTrackValue(value, nextMin, max) });
            }}
            fieldLabel={fieldLabels['minValue']}
            onFieldLabelChange={(l) => setFieldLabel('minValue', l)}
            formula={fieldFormulas['minValue']}
            onFormulaChange={(f) => setFieldFormula('minValue', f)}
            step={1}
            controlHeight="input"
            allowEmpty
          />
          <LabeledNumberField
            displayLabel="Maximum value"
            value={max}
            onChange={(v) => {
              const nextMax = Math.max(min + 1, Math.round(v));
              updateData({ maxValue: nextMax, currentValue: clampTrackValue(value, min, nextMax) });
            }}
            fieldLabel={fieldLabels['maxValue']}
            onFieldLabelChange={(l) => setFieldLabel('maxValue', l)}
            formula={fieldFormulas['maxValue']}
            onFormulaChange={(f) => setFieldFormula('maxValue', f)}
            step={1}
            controlHeight="input"
            allowEmpty
          />
        </div>
        <div className="mt-4 space-y-2">
          <LabeledNumberField
            displayLabel="Active zone number (0 before the first zone)"
            value={zone.level}
            onChange={() => undefined}
            fieldLabel={fieldLabels['trackZone']}
            onFieldLabelChange={(l) => setFieldLabel('trackZone', l)}
            formula={undefined}
            onFormulaChange={() => undefined}
            hideFormulaButton
            hideStepperButtons
            readOnlyValue
            controlHeight="input"
          />
          <LabeledNumberField
            displayLabel="Active zone modifier"
            value={getTrackModifier(zone)}
            onChange={() => undefined}
            fieldLabel={fieldLabels['trackModifier']}
            onFieldLabelChange={(l) => setFieldLabel('trackModifier', l)}
            formula={undefined}
            onFormulaChange={() => undefined}
            hideFormulaButton
            hideStepperButtons
            readOnlyValue
            controlHeight="input"
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Zones" count={trackThresholds.length}>
        <div className="space-y-3">
          {trackThresholds.map((threshold, index) => {
            const name = threshold.name || `Zone ${index + 1}`;
            return (
              <div key={threshold.id} className="space-y-2 border-b border-theme-border pb-3">
                <div className="flex items-center gap-2">
                  <label className="relative block h-10 w-10 flex-shrink-0 overflow-hidden rounded-button border border-theme-border bg-theme-accent" style={threshold.color ? { backgroundColor: threshold.color } : undefined}>
                    <input aria-label={`${name} color`} type="color" value={threshold.color || '#2563eb'} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={(event) => updateThreshold(threshold.id, { color: event.target.value })} />
                  </label>
                  {threshold.color && (
                    <Tooltip content="Use theme color">
                      <button type="button" aria-label={`Use theme color for ${name}`} className="widget-control h-10 w-10 flex-shrink-0" onClick={() => updateThreshold(threshold.id, { color: undefined })}>
                        <ResetIcon className="h-4 w-4" />
                      </button>
                    </Tooltip>
                  )}
                  <input aria-label={`Zone ${index + 1} name`} className={inputClass} value={threshold.name} placeholder="Zone name" onChange={(event) => updateThreshold(threshold.id, { name: event.target.value })} />
                  <Tooltip content="Delete zone">
                    <button type="button" aria-label={`Delete ${name}`} className="widget-control h-10 w-10 flex-shrink-0 text-red-500" onClick={() => updateData({ trackThresholds: trackThresholds.filter((item) => item.id !== threshold.id) })}>
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </Tooltip>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] items-end gap-3">
                  <div role="group" aria-label={`${name} threshold`} className="min-w-0">
                    <span className="mb-1 block text-xs text-theme-muted">{isFalling ? 'At or below' : 'At or above'}</span>
                    <LabeledNumberField
                      value={threshold.value}
                      onChange={(v) => updateThreshold(threshold.id, { value: Math.round(v) })}
                      fieldLabel={threshold.valueLabel}
                      onFieldLabelChange={(valueLabel) => updateThreshold(threshold.id, { valueLabel })}
                      formula={threshold.valueFormula}
                      onFormulaChange={(valueFormula) => updateThreshold(threshold.id, { valueFormula })}
                      step={1}
                      hideStepperButtons
                      controlHeight="input"
                      allowEmpty
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="mb-1 block text-xs text-theme-muted">Modifier</span>
                    <OptionalIntegerInput
                      value={threshold.modifier}
                      ariaLabel={`${name} modifier`}
                      placeholder="None"
                      onCommit={(modifier) => updateThreshold(threshold.id, { modifier })}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <button type="button" className="widget-control widget-control--primary mt-3 gap-2 px-3 py-2 text-sm" onClick={addThreshold}>
          <PlusIcon className="h-4 w-4" /> Add zone
        </button>
      </CollapsibleSection>

      <CollapsibleSection title="Appearance">
        <div>
          <span className="mb-1 block text-sm font-medium text-theme-ink">Track style</span>
          <div role="group" aria-label="Track style" className="grid grid-cols-2 gap-1">
            {([{ id: 'steps', name: 'Cells' }, { id: 'bar', name: 'Continuous bar' }] as const).map((option) => (
              <button key={option.id} type="button" aria-pressed={trackStyle === option.id} className={`widget-control min-w-0 px-3 py-2 text-sm ${trackStyle === option.id ? 'widget-control--primary' : ''}`} onClick={() => updateData({ trackStyle: option.id })}>
                {option.name}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <span className="mb-1 block text-sm font-medium text-theme-ink">Zones start when the value is</span>
          <div role="group" aria-label="Zone direction" className="grid grid-cols-2 gap-1">
            {([{ id: 'rising', name: 'At or above' }, { id: 'falling', name: 'At or below' }] as const).map((option) => (
              <button key={option.id} type="button" aria-pressed={trackThresholdMode === option.id} className={`widget-control min-w-0 px-3 py-2 text-sm ${trackThresholdMode === option.id ? 'widget-control--primary' : ''}`} onClick={() => updateData({ trackThresholdMode: option.id })}>
                {option.name}
              </button>
            ))}
          </div>
        </div>
        <label htmlFor={`track-fill-color-${widget.id}`} className="mb-1 mt-3 block text-sm font-medium text-theme-ink">Default fill color</label>
        <div className="flex items-center gap-2">
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-button border border-theme-border bg-theme-accent" style={fillColor ? { backgroundColor: fillColor } : undefined}>
            <input id={`track-fill-color-${widget.id}`} type="color" value={fillColor || '#2563eb'} onChange={(event) => updateData({ fillColor: event.target.value })} className="absolute -inset-1 h-12 w-12 cursor-pointer opacity-0" />
          </div>
          {fillColor ? (
            <>
              <span className="flex-1 text-sm text-theme-ink">{fillColor.toUpperCase()}</span>
              <button type="button" onClick={() => updateData({ fillColor: undefined })} className="widget-control px-3 py-2 text-sm">Use theme color</button>
            </>
          ) : (
            <span className="text-sm text-theme-muted">Theme color. Zones with their own color override it.</span>
          )}
        </div>
        <CollapsibleSection title="Display options" className="widget-editor__option-group mt-5">
          <label className="mb-2 flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={trackShowZoneNames} onChange={(event) => updateData({ trackShowZoneNames: event.target.checked })} className="h-4 w-4 accent-theme-accent" />
            <span className="text-sm text-theme-ink">Show zone names under the track</span>
          </label>
          <label className="mb-2 flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={showValues} onChange={(event) => updateData({ showValues: event.target.checked })} className="h-4 w-4 accent-theme-accent" />
            <span className="text-sm text-theme-ink">Show value (e.g., 4 / 10)</span>
          </label>
          <label className="mb-2 flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={showIncrementButtons} onChange={(event) => updateData({ showIncrementButtons: event.target.checked })} className="h-4 w-4 accent-theme-accent" />
            <span className="text-sm text-theme-ink">Show +/− buttons</span>
          </label>
          {showIncrementButtons && (
            <LabeledNumberField
              displayLabel="Button increment"
              value={typeof widget.data.increment === 'number' ? widget.data.increment : 1}
              onChange={(v) => updateData({ increment: Math.max(1, Math.round(v)) })}
              fieldLabel={fieldLabels['increment']}
              onFieldLabelChange={(l) => setFieldLabel('increment', l)}
              formula={fieldFormulas['increment']}
              onFormulaChange={(f) => setFieldFormula('increment', f)}
              min={1}
              step={1}
              controlHeight="input"
            />
          )}
        </CollapsibleSection>
      </CollapsibleSection>
    </div>
  );
}
