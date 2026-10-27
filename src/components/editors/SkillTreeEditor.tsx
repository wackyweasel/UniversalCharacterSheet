import { v4 as uuidv4 } from 'uuid';
import type { SkillTreeNode } from '../../types';
import { VariableLabelControl } from '../VariableLabelControl';
import { PlusIcon, TrashIcon } from '../icons';
import { Tooltip } from '../Tooltip';
import { CollapsibleSection } from './CollapsibleSection';
import { IntegerInput } from './IntegerInput';
import { LabeledNumberField } from './LabeledNumberField';
import {
  getSelectablePrerequisites,
  getSkillPointsLeft,
  isSkillTreeUsingPoints,
  normalizeSkillCost,
  normalizeSkillPoints,
  removeSkillNode,
} from '../../utils/skillTree';
import type { EditorProps } from './types';

const inputClass = 'h-10 w-full min-w-0 px-2 text-sm border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent';

export function SkillTreeEditor({ widget, updateData }: EditorProps) {
  const {
    skillNodes = [],
    skillTreeOrientation = 'horizontal',
    fillColor,
    fieldLabels = {},
    fieldFormulas = {},
  } = widget.data;
  const usePoints = isSkillTreeUsingPoints(widget.data);

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

  const updateNode = (id: string, changes: Partial<SkillTreeNode>) => {
    updateData({ skillNodes: skillNodes.map((node) => (node.id === id ? { ...node, ...changes } : node)) });
  };

  const toggleRequirement = (node: SkillTreeNode, requiredId: string, kind: 'all' | 'any') => {
    const all = node.requires.filter((id) => id !== requiredId);
    const any = (node.requiresAny ?? []).filter((id) => id !== requiredId);
    const wasSelected = (kind === 'all' ? node.requires : node.requiresAny ?? []).includes(requiredId);
    if (!wasSelected) (kind === 'all' ? all : any).push(requiredId);
    updateNode(node.id, { requires: all, requiresAny: any.length > 0 ? any : undefined });
  };

  const addNode = () => {
    updateData({ skillNodes: [...skillNodes, { id: uuidv4(), name: `Skill ${skillNodes.length + 1}`, cost: 1, requires: [], unlocked: false }] });
  };

  return (
    <div className="widget-editor widget-editor--skill-tree space-y-4">
      <CollapsibleSection title="Points">
        <label className="mb-3 flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={usePoints} onChange={(event) => updateData({ skillTreeUsePoints: event.target.checked })} className="h-4 w-4 accent-theme-accent" />
          <span className="text-sm text-theme-ink">Skills cost points to unlock</span>
        </label>
        {usePoints && (
          <LabeledNumberField
            displayLabel="Total points"
            value={normalizeSkillPoints(widget.data.currentValue)}
            onChange={(v) => updateData({ currentValue: normalizeSkillPoints(v) })}
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
        )}
        <div className="mt-4 space-y-2">
          {usePoints && (
            <LabeledNumberField
              displayLabel="Points left"
              value={getSkillPointsLeft(widget.data)}
              onChange={() => undefined}
              fieldLabel={fieldLabels['skillPointsLeft']}
              onFieldLabelChange={(l) => setFieldLabel('skillPointsLeft', l)}
              formula={undefined}
              onFormulaChange={() => undefined}
              hideFormulaButton
              hideStepperButtons
              readOnlyValue
              controlHeight="input"
            />
          )}
          <LabeledNumberField
            displayLabel="Skills unlocked"
            value={skillNodes.filter((node) => node.unlocked).length}
            onChange={() => undefined}
            fieldLabel={fieldLabels['skillsUnlocked']}
            onFieldLabelChange={(l) => setFieldLabel('skillsUnlocked', l)}
            formula={undefined}
            onFormulaChange={() => undefined}
            hideFormulaButton
            hideStepperButtons
            readOnlyValue
            controlHeight="input"
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Skills" count={skillNodes.length}>
        <div className="space-y-3">
          {skillNodes.map((node, index) => {
            const name = node.name || `Skill ${index + 1}`;
            const selectable = getSelectablePrerequisites(skillNodes, node.id);
            return (
              <div key={node.id} className="space-y-2 border-b border-theme-border pb-3">
                <div className="flex items-center gap-2">
                  <input aria-label={`Skill ${index + 1} name`} className={inputClass} value={node.name} placeholder="Skill name" onChange={(event) => updateNode(node.id, { name: event.target.value })} />
                  {usePoints && (
                    <div className="w-16 flex-shrink-0">
                      <IntegerInput value={normalizeSkillCost(node.cost)} min={0} ariaLabel={`${name} cost`} onCommit={(cost) => updateNode(node.id, { cost })} />
                    </div>
                  )}
                  <VariableLabelControl valueLabel={node.unlockedLabel} onValueLabelChange={(unlockedLabel) => updateNode(node.id, { unlockedLabel })} sizeClassName="h-10 w-10" />
                  <Tooltip content="Delete skill">
                    <button type="button" aria-label={`Delete ${name}`} className="widget-control h-10 w-10 flex-shrink-0 text-red-500" onClick={() => updateData({ skillNodes: removeSkillNode(skillNodes, node.id) })}>
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </Tooltip>
                </div>
                <input aria-label={`${name} description`} className={inputClass} value={node.description ?? ''} placeholder="Description (optional)" onChange={(event) => updateNode(node.id, { description: event.target.value || undefined })} />
                {selectable.length > 0 && (
                  <div className="space-y-2">
                    {([
                      { kind: 'all', title: 'Requires', ids: node.requires },
                      { kind: 'any', title: 'Requires at least one of (OR)', ids: node.requiresAny ?? [] },
                    ] as const).map((row) => (
                      <div key={row.kind} role="group" aria-label={`${name} ${row.kind === 'all' ? 'requirements' : 'alternative requirements'}`}>
                        <span className="mb-1 block text-xs text-theme-muted">{row.title}</span>
                        <div className="flex flex-wrap gap-1">
                          {selectable.map((option) => {
                            const selected = row.ids.includes(option.id);
                            return (
                              <button
                                key={option.id}
                                type="button"
                                aria-pressed={selected}
                                className={`widget-control max-w-full px-2 py-1 text-xs ${selected ? 'widget-control--primary' : ''}`}
                                onClick={() => toggleRequirement(node, option.id, row.kind)}
                              >
                                <span className="truncate">{option.name || 'Skill'}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={node.unlocked} onChange={(event) => updateNode(node.id, { unlocked: event.target.checked })} className="h-4 w-4 accent-theme-accent" />
                  <span className="text-sm text-theme-ink">Unlocked</span>
                </label>
              </div>
            );
          })}
        </div>
        <button type="button" className="widget-control widget-control--primary mt-3 gap-2 px-3 py-2 text-sm" onClick={addNode}>
          <PlusIcon className="h-4 w-4" /> Add skill
        </button>
      </CollapsibleSection>

      <CollapsibleSection title="Appearance">
        <div>
          <span className="mb-1 block text-sm font-medium text-theme-ink">Direction</span>
          <div role="group" aria-label="Tree direction" className="grid grid-cols-3 gap-1">
            {([{ id: 'horizontal', name: 'Left to right' }, { id: 'vertical', name: 'Top to bottom' }, { id: 'bottom-up', name: 'Bottom to top' }] as const).map((option) => (
              <button key={option.id} type="button" aria-pressed={skillTreeOrientation === option.id} className={`widget-control min-w-0 px-3 py-2 text-sm ${skillTreeOrientation === option.id ? 'widget-control--primary' : ''}`} onClick={() => updateData({ skillTreeOrientation: option.id })}>
                {option.name}
              </button>
            ))}
          </div>
        </div>
        <label htmlFor={`skill-tree-color-${widget.id}`} className="mb-1 mt-3 block text-sm font-medium text-theme-ink">Unlocked skill color</label>
        <div className="flex items-center gap-2">
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-button border border-theme-border bg-theme-accent" style={fillColor ? { backgroundColor: fillColor } : undefined}>
            <input id={`skill-tree-color-${widget.id}`} type="color" value={fillColor || '#2563eb'} onChange={(event) => updateData({ fillColor: event.target.value })} className="absolute -inset-1 h-12 w-12 cursor-pointer opacity-0" />
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
