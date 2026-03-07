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
    showPoolCount = true,
    poolResources = [],
    inlineLabels = false,
    poolTooltip,
    fieldLabels = {},
    fieldFormulas = {}
  } = widget.data;

  const hasMultipleResources = poolResources.length > 0;

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

  const addResource = () => {
    const newResource = {
      name: `Resource ${poolResources.length + 1}`,
      max: 5,
      current: 5,
      style: 'dots'
    };
    updateData({ poolResources: [...poolResources, newResource] });
  };

  const removeResource = (index: number) => {
    const updated = [...poolResources];
    updated.splice(index, 1);
    updateData({ poolResources: updated });
  };

  const updateResource = (index: number, field: string, value: string | number) => {
    const updated = [...poolResources];
    updated[index] = { ...updated[index], [field]: value };
    // Ensure current doesn't exceed max
    if (field === 'max' && updated[index].current > (value as number)) {
      updated[index].current = value as number;
    }
    updateData({ poolResources: updated });
  };

  // Convert from single to multi-resource mode
  const convertToMultiple = () => {
    const firstResource = {
      name: label || 'Resource 1',
      max: maxPool,
      current: maxPool,
      style: poolStyle
    };
    updateData({ poolResources: [firstResource] });
  };

  // Convert back to single resource mode
  const convertToSingle = () => {
    if (poolResources.length > 0) {
      const first = poolResources[0];
      updateData({ 
        poolResources: [],
        maxPool: first.max,
        currentPool: first.current,
        poolStyle: first.style
      });
    } else {
      updateData({ poolResources: [] });
    }
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

      {!hasMultipleResources ? (
        // Single resource mode
        <>
          <div>
            <LabeledNumberField
              displayLabel="Maximum Pool"
              value={maxPool}
              onChange={(v) => updateData({ maxPool: Math.max(1, Math.min(1000, v)) })}
              fieldLabel={fieldLabels['maxPool']}
              onFieldLabelChange={(l) => setFieldLabel('maxPool', l)}
              formula={fieldFormulas['maxPool']}
              onFormulaChange={(f) => setFieldFormula('maxPool', f)}
              min={1}
              max={1000}
            />
          </div>

          <div>
            <LabeledNumberField
              displayLabel="Current Pool"
              value={typeof currentPool === 'number' ? currentPool : maxPool}
              onChange={(v) => updateData({ currentPool: Math.max(0, Math.min(maxPool, v)) })}
              fieldLabel={fieldLabels['currentPool']}
              onFieldLabelChange={(l) => setFieldLabel('currentPool', l)}
              formula={fieldFormulas['currentPool']}
              onFormulaChange={(f) => setFieldFormula('currentPool', f)}
              min={0}
              max={maxPool}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-theme-ink mb-1">Style</label>
            <select
              value={poolStyle}
              onChange={(e) => updateData({ poolStyle: e.target.value })}
              className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            >
              {styleOptions}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <TooltipEditButton
              tooltip={poolTooltip}
              itemName={label || 'pool'}
              onSave={(t) => updateData({ poolTooltip: t })}
            />
            <span className="text-sm text-theme-ink">Tooltip (shown on hover in play mode)</span>
          </div>

          <button
            onClick={convertToMultiple}
            className="w-full px-3 py-2 border border-theme-border rounded-button text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors"
          >
            + Add Multiple Resources
          </button>
        </>
      ) : (
        // Multiple resources mode
        <>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {poolResources.map((resource: PoolResource, idx: number) => (
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
                      const updated = [...poolResources];
                      updated[idx] = { ...updated[idx], tooltip: t };
                      updateData({ poolResources: updated });
                    }}
                  />
                  <button
                    onClick={() => removeResource(idx)}
                    className="ml-2 text-red-500 hover:text-red-700 px-2"
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
                        const updated = [...poolResources];
                        updated[idx] = { ...updated[idx], maxLabel: l };
                        updateData({ poolResources: updated });
                      }}
                      formula={resource.maxFormula}
                      onFormulaChange={(f) => {
                        const updated = [...poolResources];
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
                        const updated = [...poolResources];
                        updated[idx] = { ...updated[idx], currentLabel: l };
                        updateData({ poolResources: updated });
                      }}
                      formula={resource.currentFormula}
                      onFormulaChange={(f) => {
                        const updated = [...poolResources];
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

          <div className="flex gap-2">
            <button
              onClick={addResource}
              className="flex-1 px-3 py-2 border border-theme-border rounded-button text-sm text-theme-ink hover:bg-theme-accent hover:text-theme-paper transition-colors"
            >
              + Add Resource
            </button>
            <button
              onClick={convertToSingle}
              className="px-3 py-2 border border-theme-border rounded-button text-sm text-theme-muted hover:bg-theme-border hover:text-theme-ink transition-colors"
            >
              Single Mode
            </button>
          </div>
        </>
      )}

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={showPoolCount}
          onChange={(e) => updateData({ showPoolCount: e.target.checked })}
          className="w-4 h-4 accent-theme-accent"
        />
        <span className="text-sm text-theme-ink">Show Counter (e.g., 3 / 5)</span>
      </label>

      {hasMultipleResources && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={inlineLabels}
            onChange={(e) => updateData({ inlineLabels: e.target.checked })}
            className="w-4 h-4 accent-theme-accent"
          />
          <span className="text-sm text-theme-ink">Inline labels with icons</span>
        </label>
      )}
    </div>
  );
}

