import { EditorProps } from './types';

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
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <input
          className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={label || ''}
          onChange={(e) => updateData({ label: e.target.value })}
          placeholder="Dungeon Map"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Stroke Color</label>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => updateData({ strokeColor: e.target.value })}
            className="w-10 h-10 border border-theme-border rounded-button cursor-pointer"
          />
          <input
            className="flex-1 px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            value={strokeColor}
            onChange={(e) => updateData({ strokeColor: e.target.value })}
            placeholder="#333333"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Stroke Width</label>
        <input
          type="range"
          min="1"
          max="10"
          value={strokeWidth}
          onChange={(e) => updateData({ strokeWidth: parseInt(e.target.value) })}
          className="w-full"
        />
        <div className="text-xs text-theme-muted text-center">{strokeWidth}px</div>
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Corridor Width</label>
        <input
          type="range"
          min="5"
          max="50"
          value={corridorWidth}
          onChange={(e) => updateData({ corridorWidth: parseInt(e.target.value) })}
          className="w-full"
        />
        <div className="text-xs text-theme-muted text-center">{corridorWidth}px</div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="gridEnabled"
          checked={gridEnabled}
          onChange={(e) => updateData({ gridEnabled: e.target.checked })}
          className="w-4 h-4"
        />
        <label htmlFor="gridEnabled" className="text-sm font-medium text-theme-ink">Show Grid</label>
      </div>

      {gridEnabled && (
        <div>
          <label className="block text-sm font-medium text-theme-ink mb-1">Grid Size</label>
          <input
            type="range"
            min="10"
            max="50"
            value={gridSize}
            onChange={(e) => updateData({ gridSize: parseInt(e.target.value) })}
            className="w-full"
          />
          <div className="text-xs text-theme-muted text-center">{gridSize}px</div>
        </div>
      )}
    </div>
  );
}

