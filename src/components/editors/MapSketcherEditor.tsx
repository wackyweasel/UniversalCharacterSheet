import { EditorProps } from './types';
import { Tooltip } from '../Tooltip';
import { CollapsibleSection } from './CollapsibleSection';

export function MapSketcherEditor({ widget, updateData }: EditorProps) {
  const { 
    label, 
    strokeColor = '#333333', 
    strokeWidth = 2,
    gridEnabled = true,
    gridSize = 20,
    corridorWidth = 10
  } = widget.data;

  return (
    <div className="widget-editor widget-editor--map-sketcher space-y-4">
      <CollapsibleSection title="General">
        <label className="block text-xs font-semibold text-theme-ink">
          Widget label
        <div className="relative">
          <input
            className="w-full px-3 py-2 pr-8 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            value={label || ''}
            onChange={(e) => updateData({ label: e.target.value })}
            placeholder="Dungeon Map"
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
        </label>
      </CollapsibleSection>

      <CollapsibleSection>
        <h3 id={`map-sketcher-style-heading-${widget.id}`} className="widget-editor__section-title">Drawing style</h3>
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-theme-ink">Stroke color</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => updateData({ strokeColor: e.target.value })}
                className="h-10 w-10 cursor-pointer rounded-button border border-theme-border"
              />
              <input
                className="min-w-0 flex-1 rounded-button border border-theme-border bg-theme-paper px-3 py-2 text-theme-ink focus:border-theme-accent focus:outline-none"
                value={strokeColor}
                onChange={(e) => updateData({ strokeColor: e.target.value })}
                placeholder="#333333"
                aria-label="Stroke color hex value"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-theme-ink">Stroke width</label>
            <input
              type="range"
              min="1"
              max="10"
              value={strokeWidth}
              onChange={(e) => updateData({ strokeWidth: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="text-center text-xs text-theme-muted">{strokeWidth}px</div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-theme-ink">Corridor width</label>
            <input
              type="range"
              min="5"
              max="50"
              value={corridorWidth}
              onChange={(e) => updateData({ corridorWidth: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="text-center text-xs text-theme-muted">{corridorWidth}px</div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection className="widget-editor__option-group">
        <h3 id={`map-sketcher-grid-heading-${widget.id}`} className="widget-editor__section-title">Grid display</h3>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            id="gridEnabled"
            checked={gridEnabled}
            onChange={(e) => updateData({ gridEnabled: e.target.checked })}
            className="mt-0.5 h-4 w-4 flex-none accent-theme-accent"
          />
          <span className="text-xs font-medium text-theme-ink">Show grid</span>
        </label>

        {gridEnabled && (
          <div className="pt-3">
            <label className="mb-1 block text-xs font-medium text-theme-ink">Grid size</label>
            <input
              type="range"
              min="10"
              max="50"
              value={gridSize}
              onChange={(e) => updateData({ gridSize: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="text-center text-xs text-theme-muted">{gridSize}px</div>
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}

