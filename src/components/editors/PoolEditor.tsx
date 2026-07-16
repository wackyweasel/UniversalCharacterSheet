import { PoolResource } from '../../types';
import { EditorProps } from './types';
import { LabeledNumberField } from './LabeledNumberField';
import { TooltipEditButton } from './TooltipEditButton';
import { Tooltip } from '../Tooltip';

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

  const updateResource = (index: number, field: string, value: string | number) => {
    const updated = [...resources];
    updated[index] = { ...updated[index], [field]: value };
    // Ensure current doesn't exceed max
    if (field === 'max' && updated[index].current > (value as number)) {
      updated[index].current = value as number;
    }
    updateData({ poolResources: updated });
  };

  const styleOptions = (
    <>
      <optgroup label="Basic">
        <option value="dots">● Dots</option>
        <option value="boxes">■ Boxes</option>
        <option value="stars">★ Stars</option>
        <option value="diamonds">◆ Diamonds</option>
        <option value="crosses">✖ Crosses</option>
        <option value="checkmarks">✔ Checkmarks</option>
      </optgroup>
      <optgroup label="Themed">
        <option value="hearts">❤️ Hearts</option>
        <option value="flames">🔥 Flames</option>
        <option value="skulls">💀 Skulls</option>
        <option value="shields">🛡️ Shields</option>
        <option value="swords">⚔️ Swords</option>
        <option value="lightning">⚡ Lightning</option>
        <option value="moons">🌙 Moons</option>
        <option value="suns">☀️ Suns</option>
        <option value="coins">🪙 Coins</option>
        <option value="gems">💎 Gems</option>
      </optgroup>
    </>
  );

  return (
    <div className="space-y-4">
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

      <div className="space-y-3 max-h-64 overflow-y-auto">
            {resources.map((resource: PoolResource, idx: number) => (
              <div key={idx} className="border border-theme-border rounded-button p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <input
                    className="flex-1 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm focus:outline-none focus:border-theme-accent"
                    value={resource.name}
                    onChange={(e) => updateResource(idx, 'name', e.target.value)}
                    placeholder="Resource name"
                  />
                  <TooltipEditButton
                    tooltip={resource.tooltip}
                    itemName={resource.name}
                    onSave={(t) => {
                      const updated = [...resources];
                      updated[idx] = { ...updated[idx], tooltip: t };
                      updateData({ poolResources: updated });
                    }}
                  />
                  <button
                    onClick={() => removeResource(idx)}
                    disabled={resources.length <= 1}
                    aria-label={`Remove ${resource.name || `resource ${idx + 1}`}`}
                    className="ml-2 px-2 text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-theme-muted mb-1">Max</label>
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
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-theme-muted mb-1">Current</label>
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
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-theme-muted mb-1">Style</label>
                  <select
                    value={resource.style}
                    onChange={(e) => updateResource(idx, 'style', e.target.value)}
                    className="w-full px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm focus:outline-none focus:border-theme-accent"
                  >
                    {styleOptions}
                  </select>
                </div>
              </div>
            ))}
      </div>

      <button
        onClick={addResource}
        className="w-full px-3 py-2 border border-theme-border rounded-button text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors"
      >
        + Add Resource
      </button>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={showPoolCount}
          onChange={(e) => updateData({ showPoolCount: e.target.checked })}
          className="w-4 h-4 accent-theme-accent"
        />
        <span className="text-sm text-theme-ink">Show Counter (e.g., 3 / 5)</span>
      </label>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={inlineLabels}
          onChange={(e) => updateData({ inlineLabels: e.target.checked })}
          className="w-4 h-4 accent-theme-accent"
        />
        <span className="text-sm text-theme-ink">Inline labels with icons</span>
      </label>
    </div>
  );
}

