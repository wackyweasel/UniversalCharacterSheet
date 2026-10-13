import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ExperienceLevel } from '../../types';
import { PlusIcon, TrashIcon } from '../icons';
import { Tooltip } from '../Tooltip';
import { CollapsibleSection } from './CollapsibleSection';
import { IntegerInput } from './IntegerInput';
import { LabeledNumberField } from './LabeledNumberField';
import {
  EXPERIENCE_PRESETS,
  createExperienceLevels,
  createLinearExperienceLevels,
  getExperienceProgress,
  normalizeFirstLevel,
  normalizeXp,
} from '../../utils/experienceLevel';
import type { EditorProps } from './types';

const inputClass = 'h-10 w-full min-w-0 px-2 text-sm border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent';

export function ExperienceLevelEditor({ widget, updateData }: EditorProps) {
  const {
    xpLevels = [],
    xpFirstLevel,
    xpShowLevelName = true,
    fillColor,
    fieldLabels = {},
    fieldFormulas = {},
  } = widget.data;
  const firstLevel = normalizeFirstLevel(xpFirstLevel);
  const xp = normalizeXp(widget.data.currentValue);
  const progress = getExperienceProgress(xpLevels, xp, firstLevel);
  const [linearXp, setLinearXp] = useState(1000);
  const [linearLevels, setLinearLevels] = useState(20);

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

  const updateLevel = (id: string, changes: Partial<ExperienceLevel>) => {
    updateData({ xpLevels: xpLevels.map((level) => (level.id === id ? { ...level, ...changes } : level)) });
  };

  const addLevel = () => {
    const last = xpLevels[xpLevels.length - 1]?.xp ?? 0;
    const previous = xpLevels[xpLevels.length - 2]?.xp ?? 0;
    const gap = xpLevels.length > 1 ? Math.max(1, last - previous) : 1000;
    updateData({ xpLevels: [...xpLevels, { id: uuidv4(), xp: normalizeXp(last) + gap }] });
  };

  return (
    <div className="widget-editor widget-editor--xp-level space-y-4">
      <CollapsibleSection title="Experience points">
        <div className="space-y-2">
          <LabeledNumberField
            displayLabel="Total XP"
            value={xp}
            onChange={(v) => updateData({ currentValue: normalizeXp(v) })}
            fieldLabel={fieldLabels['currentValue']}
            onFieldLabelChange={(l) => setFieldLabel('currentValue', l)}
            formula={fieldFormulas['currentValue']}
            onFormulaChange={(f) => setFieldFormula('currentValue', f)}
            min={0}
            step={1}
            controlHeight="input"
            hideStepperButtons
            allowEmpty
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-theme-ink" htmlFor={`xp-first-level-${widget.id}`}>Number of the first level</label>
            <div className="w-24">
              <IntegerInput id={`xp-first-level-${widget.id}`} value={firstLevel} ariaLabel="Number of the first level" onCommit={(value) => updateData({ xpFirstLevel: value })} />
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <LabeledNumberField
            displayLabel="Current level"
            value={progress?.level ?? firstLevel}
            onChange={() => undefined}
            fieldLabel={fieldLabels['xpLevel']}
            onFieldLabelChange={(l) => setFieldLabel('xpLevel', l)}
            formula={undefined}
            onFormulaChange={() => undefined}
            hideFormulaButton
            hideStepperButtons
            readOnlyValue
            controlHeight="input"
          />
          <LabeledNumberField
            displayLabel="XP to next level"
            value={progress?.xpToNext ?? 0}
            onChange={() => undefined}
            fieldLabel={fieldLabels['xpToNext']}
            onFieldLabelChange={(l) => setFieldLabel('xpToNext', l)}
            formula={undefined}
            onFormulaChange={() => undefined}
            hideFormulaButton
            hideStepperButtons
            readOnlyValue
            controlHeight="input"
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Levels" count={xpLevels.length}>
        <div className="space-y-3">
          <div>
            <label htmlFor={`xp-preset-${widget.id}`} className="mb-1 block text-sm font-medium text-theme-ink">Load a preset</label>
            <select
              id={`xp-preset-${widget.id}`}
              value=""
              className={inputClass}
              onChange={(event) => {
                const preset = EXPERIENCE_PRESETS.find((item) => item.id === event.target.value);
                if (preset) updateData({ xpLevels: createExperienceLevels(preset.thresholds), xpFirstLevel: preset.firstLevel ?? 1 });
              }}
            >
              <option value="">Replace the levels with…</option>
              {EXPERIENCE_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={`xp-linear-xp-${widget.id}`} className="mb-1 block text-sm font-medium text-theme-ink">Even steps</label>
            <div className="flex flex-wrap items-center gap-2 text-sm text-theme-ink">
              <div className="w-20"><IntegerInput id={`xp-linear-xp-${widget.id}`} value={linearXp} min={1} ariaLabel="XP per level" onCommit={setLinearXp} /></div>
              <span>XP per level,</span>
              <div className="w-16"><IntegerInput value={linearLevels} min={1} max={100} ariaLabel="Number of levels" onCommit={setLinearLevels} /></div>
              <span>levels</span>
              <button type="button" className="widget-control h-10 px-3 text-sm" onClick={() => updateData({ xpLevels: createLinearExperienceLevels(linearLevels, linearXp) })}>
                Generate
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {xpLevels.map((level, index) => {
            const levelNumber = firstLevel + index;
            const title = `Level ${levelNumber}`;
            return (
              <div key={level.id}>
                <LabeledNumberField
                  value={level.xp}
                  onChange={(v) => updateLevel(level.id, { xp: normalizeXp(v) })}
                  fieldLabel={level.xpLabel}
                  onFieldLabelChange={(xpLabel) => updateLevel(level.id, { xpLabel })}
                  formula={level.xpFormula}
                  onFormulaChange={(xpFormula) => updateLevel(level.id, { xpFormula })}
                  min={0}
                  step={1}
                  hideStepperButtons
                  controlHeight="row"
                  allowEmpty
                  renderRow={({ controls }) => (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-10 flex-shrink-0 text-sm font-semibold tabular-nums text-theme-ink">Lv {levelNumber}</span>
                      <input
                        aria-label={`${title} title`}
                        className="h-9 min-w-[7rem] flex-1 rounded-button border border-theme-border bg-theme-paper px-2 text-sm text-theme-ink focus:border-theme-accent focus:outline-none"
                        value={level.name ?? ''}
                        placeholder="Title (optional)"
                        onChange={(event) => updateLevel(level.id, { name: event.target.value || undefined })}
                      />
                      {index === 0 ? (
                        <span className="w-44 flex-shrink-0 text-center text-sm text-theme-muted">Starts at 0 XP</span>
                      ) : (
                        <div role="group" aria-label={`${title} XP required`} className="w-44 flex-shrink-0">{controls}</div>
                      )}
                      <Tooltip content="Delete level">
                        <button
                          type="button"
                          aria-label={`Delete ${title}`}
                          disabled={xpLevels.length <= 1}
                          className="widget-control h-9 w-9 flex-shrink-0 text-red-500"
                          onClick={() => updateData({ xpLevels: xpLevels.filter((item) => item.id !== level.id) })}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </Tooltip>
                    </div>
                  )}
                />
              </div>
            );
          })}
        </div>
        <button type="button" className="widget-control widget-control--primary mt-3 gap-2 px-3 py-2 text-sm" onClick={addLevel}>
          <PlusIcon className="h-4 w-4" /> Add level
        </button>
      </CollapsibleSection>

      <CollapsibleSection title="Appearance">
        <label className="mb-3 flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={xpShowLevelName} onChange={(event) => updateData({ xpShowLevelName: event.target.checked })} className="h-4 w-4 accent-theme-accent" />
          <span className="text-sm text-theme-ink">Show the level title</span>
        </label>
        <label htmlFor={`xp-fill-color-${widget.id}`} className="mb-1 block text-sm font-medium text-theme-ink">Progress bar color</label>
        <div className="flex items-center gap-2">
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-button border border-theme-border bg-theme-accent" style={fillColor ? { backgroundColor: fillColor } : undefined}>
            <input id={`xp-fill-color-${widget.id}`} type="color" value={fillColor || '#2563eb'} onChange={(event) => updateData({ fillColor: event.target.value })} className="absolute -inset-1 h-12 w-12 cursor-pointer opacity-0" />
          </div>
          {fillColor ? (
            <>
              <span className="flex-1 text-sm text-theme-ink">{fillColor.toUpperCase()}</span>
              <button type="button" onClick={() => updateData({ fillColor: undefined })} className="widget-control px-3 py-2 text-sm">Use theme color</button>
            </>
          ) : (
            <span className="text-sm text-theme-muted">Theme color</span>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}
