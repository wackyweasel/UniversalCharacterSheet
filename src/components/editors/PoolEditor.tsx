import { EditorProps } from './types';

export function PoolEditor({ widget, updateData }: EditorProps) {
  const { 
    label, 
    maxPool = 5, 
    poolStyle = 'dots', 
    showPoolCount = true,
    poolResources = []
  } = widget.data;

  const hasMultipleResources = poolResources.length > 0;

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
            <button
              type="button"
              onClick={() => updateData({ label: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-ink transition-colors"
              title="Clear label"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {!hasMultipleResources ? (
        // Single resource mode
        <>
          <div>
            <label className="block text-sm font-medium text-theme-ink mb-1">Maximum Pool</label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
              value={maxPool}
              onChange={(e) => {
                updateData({ maxPool: e.target.value === '' ? '' : parseInt(e.target.value) || '' });
              }}
              onBlur={(e) => {
                const val = Math.max(1, Math.min(1000, parseInt(e.target.value) || 1));
                updateData({ maxPool: val });
              }}
              min={1}
              max={1000}
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
            {poolResources.map((resource: { name: string; max: number; current: number; style: string }, idx: number) => (
              <div key={idx} className="border border-theme-border rounded-button p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <input
                    className="flex-1 px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm focus:outline-none focus:border-theme-accent"
                    value={resource.name}
                    onChange={(e) => updateResource(idx, 'name', e.target.value)}
                    placeholder="Resource name"
                  />
                  <button
                    onClick={() => removeResource(idx)}
                    className="ml-2 text-red-500 hover:text-red-700 px-2"
                  >
                    ×
                  </button>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-theme-muted mb-1">Max</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      className="w-full px-2 py-1 border border-theme-border rounded-button bg-theme-paper text-theme-ink text-sm focus:outline-none focus:border-theme-accent"
                      value={resource.max}
                      onChange={(e) => updateResource(idx, 'max', parseInt(e.target.value) || 1)}
                      onBlur={(e) => updateResource(idx, 'max', Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                    />
                  </div>
                  <div className="flex-1">
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
    </div>
  );
}

