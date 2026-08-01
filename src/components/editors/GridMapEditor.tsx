import { EditorProps } from './types';

interface ColorControlProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorControl({ id, label, value, onChange }: ColorControlProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-theme-ink mb-1">
        {label}
      </label>
      <div className="flex gap-2 items-center">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-10 h-10 border border-theme-border rounded-button cursor-pointer"
        />
        <input
          aria-label={`${label} hex value`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="flex-1 px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
        />
      </div>
    </div>
  );
}

export function GridMapEditor({ widget, updateData }: EditorProps) {
  const {
    label,
    gridMapGridType = 'square',
    gridMapGridSize = 32,
    gridMapGridColor = '#cbd5e1',
    gridMapWallColor = '#334155',
    gridMapWallWidth = 4,
    gridMapDefaultTokenColor = '#2563eb',
    gridMapCellDistance = 5,
    gridMapDistanceUnit = 'ft',
  } = widget.data;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`grid-map-label-${widget.id}`} className="block text-sm font-medium text-theme-ink mb-1">
          Widget Label
        </label>
        <input
          id={`grid-map-label-${widget.id}`}
          value={label || ''}
          onChange={(event) => updateData({ label: event.target.value })}
          placeholder="Grid Map"
          className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
        />
      </div>

      <div>
        <div className="block text-sm font-medium text-theme-ink mb-1">Grid Type</div>
        <div className="grid grid-cols-2 overflow-hidden rounded-button border border-theme-border" role="group" aria-label="Grid type">
          {(['square', 'hex'] as const).map((gridType) => (
            <button
              key={gridType}
              type="button"
              aria-pressed={gridMapGridType === gridType}
              onClick={() => updateData({ gridMapGridType: gridType })}
              className={`px-3 py-2 text-sm font-medium capitalize transition-colors ${
                gridMapGridType === gridType
                  ? 'bg-theme-accent text-theme-paper'
                  : 'bg-theme-paper text-theme-ink hover:bg-theme-background'
              }`}
            >
              {gridType === 'hex' ? 'Hex' : 'Square'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor={`grid-map-size-${widget.id}`} className="block text-sm font-medium text-theme-ink mb-1">
          Grid Cell Size
        </label>
        <input
          id={`grid-map-size-${widget.id}`}
          type="range"
          min="20"
          max="56"
          step="2"
          value={gridMapGridSize}
          onChange={(event) => updateData({ gridMapGridSize: Number(event.target.value) })}
          className="w-full"
        />
        <div className="text-xs text-theme-muted text-center">{gridMapGridSize}px</div>
      </div>

      <div>
        <label htmlFor={`grid-map-cell-distance-${widget.id}`} className="block text-sm font-medium text-theme-ink mb-1">
          Distance per Cell
        </label>
        <div className="grid grid-cols-[1fr_5rem] gap-2">
          <input
            id={`grid-map-cell-distance-${widget.id}`}
            type="number"
            min="0.1"
            step="0.5"
            value={gridMapCellDistance}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (Number.isFinite(value) && value > 0) updateData({ gridMapCellDistance: value });
            }}
            className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          />
          <input
            aria-label="Distance unit"
            maxLength={8}
            value={gridMapDistanceUnit}
            onChange={(event) => updateData({ gridMapDistanceUnit: event.target.value })}
            placeholder="ft"
            className="w-full px-3 py-2 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          />
        </div>
        <div className="mt-1 text-xs text-theme-muted">Measurements use straight-line grid distance.</div>
      </div>

      <ColorControl
        id={`grid-map-grid-color-${widget.id}`}
        label="Grid Color"
        value={gridMapGridColor}
        onChange={(value) => updateData({ gridMapGridColor: value })}
      />

      <ColorControl
        id={`grid-map-wall-color-${widget.id}`}
        label="Wall Color"
        value={gridMapWallColor}
        onChange={(value) => updateData({ gridMapWallColor: value })}
      />

      <div>
        <label htmlFor={`grid-map-wall-width-${widget.id}`} className="block text-sm font-medium text-theme-ink mb-1">
          Wall Width
        </label>
        <input
          id={`grid-map-wall-width-${widget.id}`}
          type="range"
          min="2"
          max="10"
          value={gridMapWallWidth}
          onChange={(event) => updateData({ gridMapWallWidth: Number(event.target.value) })}
          className="w-full"
        />
        <div className="text-xs text-theme-muted text-center">{gridMapWallWidth}px</div>
      </div>

      <ColorControl
        id={`grid-map-token-color-${widget.id}`}
        label="New Token Color"
        value={gridMapDefaultTokenColor}
        onChange={(value) => updateData({ gridMapDefaultTokenColor: value })}
      />
    </div>
  );
}
