import { PoolResource } from '../../types';
import { EditorProps } from './types';
import { LabeledNumberField } from './LabeledNumberField';
import { TooltipEditButton } from './TooltipEditButton';
import { Tooltip } from '../Tooltip';
import { ResourceStylePicker } from '../ResourceStylePicker';
import { ChevronDownIcon, ChevronUpIcon, TrashIcon } from '../icons';
import { CollapsibleSection } from './CollapsibleSection';

export function PoolEditor({ widget, updateData }: EditorProps) {
  const { 
    label, 
    maxPool = 5, 
    currentPool = 5,
    poolStyle = 'dots', 
    showPoolCount = false,
    poolResources = [],
    inlineLabels = false,
    poolTooltip,
    fieldLabels = {},
    fieldFormulas = {}
  } = widget.data;

  const resources: PoolResource[] = poolResources.length > 0 ? poolResources : [{
    name: 'Resource 1',
    max: maxPool,
    current: currentPool,
    style: poolStyle,
    maxLabel: fieldLabels.maxPool,
    maxFormula: fieldFormulas.maxPool,
    currentLabel: fieldLabels.currentPool,
    currentFormula: fieldFormulas.currentPool,
    tooltip: poolTooltip,
  }];

  const addResource = () => {
    const newResource = {
      name: `Resource ${resources.length + 1}`,
      max: 5,
      current: 5,
      style: 'dots'
    };
    updateData({ poolResources: [...resources, newResource] });
  };

  const removeResource = (index: number) => {
    if (resources.length <= 1) return;
    const updated = [...resources];
    updated.splice(index, 1);
    updateData({ poolResources: updated });
  };

  const moveResource = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= resources.length) return;
    const updated = [...resources];
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    updateData({ poolResources: updated });
  };

  const updateResource = (index: number, field: string, value: string | number) => {
    const updated = [...resources];
    updated[index] = { ...updated[index], [field]: value };
    // Ensure current doesn't exceed max
    if (field === 'max' && updated[index].current > (value as number)) {
      updated[index].current = value as number;
    }
    updateData({ poolResources: updated });
  };

  return (
    <div className="widget-editor widget-editor--pool space-y-4">
      <CollapsibleSection title="General">
        <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <div className="relative">
          <input
            className="w-full px-3 py-2 pr-8 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            value={label || ''}
            onChange={(e) => updateData({ label: e.target.value })}
            placeholder="Resource Pool"
          />
          {label && (
            <Tooltip content="Clear label">
              <button
                type="button"
                onClick={() => updateData({ label: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-ink transition-colors"
              >
                ×
              </button>
            </Tooltip>
          )}
        </div>
        </div>

      </CollapsibleSection>

      <CollapsibleSection>
        <div className="widget-editor__section-heading">
          <h3 id={`resources-title-${widget.id}`} className="widget-editor__section-title">Resources</h3>
          <span className="widget-editor__section-count">{resources.length}</span>
        </div>
        <div className="max-h-64 space-y-3 overflow-y-auto">
            {resources.map((resource: PoolResource, idx: number) => (
              <div key={idx} className="border border-theme-border rounded-theme p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex flex-shrink-0 gap-1">
                    <Tooltip content="Move up">
                      <button
                        type="button"
                        onClick={() => moveResource(idx, -1)}
                        disabled={idx === 0}
                        aria-label={`Move ${resource.name || `resource ${idx + 1}`} up`}
                        className="widget-control h-10 w-10 min-h-0 p-1 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ChevronUpIcon className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Move down">
                      <button
                        type="button"
                        onClick={() => moveResource(idx, 1)}
                        disabled={idx === resources.length - 1}
                        aria-label={`Move ${resource.name || `resource ${idx + 1}`} down`}
                        className="widget-control h-10 w-10 min-h-0 p-1 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ChevronDownIcon className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                  </div>
                  <input
                    className="h-10 min-w-0 flex-1 rounded-button border border-theme-border bg-theme-paper px-2 py-1 text-sm text-theme-ink focus:border-theme-accent focus:outline-none"
                    value={resource.name}
                    onChange={(e) => updateResource(idx, 'name', e.target.value)}
                    placeholder="Resource name"
                  />
                  <TooltipEditButton
                    tooltip={resource.tooltip}
                    itemName={resource.name}
                    buttonClassName="h-10 w-10"
                    onSave={(t) => {
                      const updated = [...resources];
                      updated[idx] = { ...updated[idx], tooltip: t };
                      updateData({ poolResources: updated });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeResource(idx)}
                    disabled={resources.length <= 1}
                    aria-label={`Remove ${resource.name || `resource ${idx + 1}`}`}
                    title="Delete resource"
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-button border border-theme-border text-red-500 transition-colors hover:border-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-xs text-theme-muted">Current</label>
                    <LabeledNumberField
                      value={resource.current}
                      onChange={(v) => updateResource(idx, 'current', Math.max(0, Math.min(resource.max, v)))}
                      fieldLabel={resource.currentLabel}
                      onFieldLabelChange={(l) => {
                        const updated = [...resources];
                        updated[idx] = { ...updated[idx], currentLabel: l };
                        updateData({ poolResources: updated });
                      }}
                      formula={resource.currentFormula}
                      onFormulaChange={(f) => {
                        const updated = [...resources];
                        updated[idx] = { ...updated[idx], currentFormula: f };
                        updateData({ poolResources: updated });
                      }}
                      min={0}
                      max={resource.max}
                      compact
                      controlHeight="input"
                      allowEmpty
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-theme-muted">Maximum</label>
                    <LabeledNumberField
                      value={resource.max}
                      onChange={(v) => updateResource(idx, 'max', Math.max(1, Math.min(100, v)))}
                      fieldLabel={resource.maxLabel}
                      onFieldLabelChange={(l) => {
                        const updated = [...resources];
                        updated[idx] = { ...updated[idx], maxLabel: l };
                        updateData({ poolResources: updated });
                      }}
                      formula={resource.maxFormula}
                      onFormulaChange={(f) => {
                        const updated = [...resources];
                        updated[idx] = { ...updated[idx], maxFormula: f };
                        updateData({ poolResources: updated });
                      }}
                      min={1}
                      max={100}
                      compact
                      controlHeight="input"
                      allowEmpty
                    />
                  </div>
                </div>
                <ResourceStylePicker value={resource.style} onChange={(style) => updateResource(idx, 'style', style)} />
              </div>
            ))}
        </div>

        <div className="widget-editor__add-row">
          <button
            onClick={addResource}
            className="w-full rounded-button border border-theme-border px-3 py-2 text-sm text-theme-ink transition-colors hover:bg-theme-accent hover:text-theme-paper"
          >
            + Add Resource
          </button>
        </div>
      </CollapsibleSection>

      <CollapsibleSection>
        <div className="widget-editor__section-heading">
          <h3 id={`pool-display-title-${widget.id}`} className="widget-editor__section-title">Display</h3>
        </div>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={showPoolCount}
            onChange={(e) => updateData({ showPoolCount: e.target.checked })}
            className="w-4 h-4 accent-theme-accent"
          />
          <span className="text-sm text-theme-ink">Show counter (e.g., 3 / 5)</span>
        </label>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={inlineLabels}
            onChange={(e) => updateData({ inlineLabels: e.target.checked })}
            className="w-4 h-4 accent-theme-accent"
          />
          <span className="text-sm text-theme-ink">Inline labels with icons</span>
        </label>
      </CollapsibleSection>
    </div>
  );
}

