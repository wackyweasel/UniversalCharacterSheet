import { useEffect, useRef, useState } from 'react';
import { EditorProps } from './types';
import { CollapsibleSection } from './CollapsibleSection';

interface ColorControlProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorControl({ id, label, value, onChange }: ColorControlProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-theme-ink">
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
  const [cellDistanceDraft, setCellDistanceDraft] = useState(() => String(gridMapCellDistance));
  const editingCellDistanceRef = useRef(false);

  useEffect(() => {
    if (!editingCellDistanceRef.current) setCellDistanceDraft(String(gridMapCellDistance));
  }, [gridMapCellDistance]);

  const handleCellDistanceChange = (rawValue: string) => {
    setCellDistanceDraft(rawValue);
    const value = Number(rawValue);
    if (Number.isFinite(value) && value > 0) updateData({ gridMapCellDistance: value });
  };

  const handleCellDistanceBlur = () => {
    editingCellDistanceRef.current = false;
    const value = Number(cellDistanceDraft);
    if (Number.isFinite(value) && value > 0) {
      setCellDistanceDraft(String(value));
      updateData({ gridMapCellDistance: value });
    } else {
      setCellDistanceDraft(String(gridMapCellDistance));
    }
  };

  return (
    <div className="widget-editor widget-editor--grid-map space-y-4">
      <CollapsibleSection title="General">
        <label htmlFor={`grid-map-label-${widget.id}`} className="block text-xs font-semibold text-theme-ink">
          Widget label
        </label>
        <input
          id={`grid-map-label-${widget.id}`}
          value={label || ''}
          onChange={(event) => updateData({ label: event.target.value })}
          placeholder="Grid Map"
          className="mt-1 w-full rounded-button border border-theme-border bg-theme-paper px-3 py-2 text-theme-ink focus:border-theme-accent focus:outline-none"
        />
      </CollapsibleSection>

      <CollapsibleSection>
        <h3 id={`grid-map-layout-heading-${widget.id}`} className="widget-editor__section-title">Grid layout</h3>
        <div className="mt-3 space-y-3">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-theme-muted">Grid type</div>
            <div className="widget-editor__segmented-group" role="group" aria-label="Grid type">
              {(['square', 'hex'] as const).map((gridType) => (
                <button
                  key={gridType}
                  type="button"
                  aria-pressed={gridMapGridType === gridType}
                  onClick={() => updateData({ gridMapGridType: gridType })}
                  className={`widget-editor__segment capitalize ${gridMapGridType === gridType ? 'widget-editor__segment--selected' : ''}`}
                >
                  {gridType === 'hex' ? 'Hex' : 'Square'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor={`grid-map-size-${widget.id}`} className="mb-1 block text-xs font-medium text-theme-ink">
              Grid cell size
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
            <div className="text-center text-xs text-theme-muted">{gridMapGridSize}px</div>
          </div>

          <div>
            <label htmlFor={`grid-map-cell-distance-${widget.id}`} className="mb-1 block text-xs font-medium text-theme-ink">
              Distance per cell
            </label>
            <div className="grid grid-cols-[1fr_5rem] gap-2">
              <input
                id={`grid-map-cell-distance-${widget.id}`}
                type="number"
                min="0.1"
                step="0.5"
                value={cellDistanceDraft}
                onFocus={() => {
                  editingCellDistanceRef.current = true;
                  setCellDistanceDraft(String(gridMapCellDistance));
                }}
                onChange={(event) => handleCellDistanceChange(event.target.value)}
                onBlur={handleCellDistanceBlur}
                className="w-full rounded-button border border-theme-border bg-theme-paper px-3 py-2 text-theme-ink [appearance:textfield] focus:border-theme-accent focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <input
                aria-label="Distance unit"
                maxLength={8}
                value={gridMapDistanceUnit}
                onChange={(event) => updateData({ gridMapDistanceUnit: event.target.value })}
                placeholder="ft"
                className="w-full rounded-button border border-theme-border bg-theme-paper px-3 py-2 text-theme-ink focus:border-theme-accent focus:outline-none"
              />
            </div>
            <p className="widget-editor__hint mt-2 text-[11px] leading-4 text-theme-muted">Measurements use straight-line grid distance.</p>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection>
        <h3 id={`grid-map-appearance-heading-${widget.id}`} className="widget-editor__section-title">Appearance</h3>
        <div className="mt-3 space-y-3">
          <ColorControl
            id={`grid-map-grid-color-${widget.id}`}
            label="Grid color"
            value={gridMapGridColor}
            onChange={(value) => updateData({ gridMapGridColor: value })}
          />

          <ColorControl
            id={`grid-map-wall-color-${widget.id}`}
            label="Wall color"
            value={gridMapWallColor}
            onChange={(value) => updateData({ gridMapWallColor: value })}
          />

          <div>
            <label htmlFor={`grid-map-wall-width-${widget.id}`} className="mb-1 block text-xs font-medium text-theme-ink">
              Wall width
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
            <div className="text-center text-xs text-theme-muted">{gridMapWallWidth}px</div>
          </div>

          <ColorControl
            id={`grid-map-token-color-${widget.id}`}
            label="New token color"
            value={gridMapDefaultTokenColor}
            onChange={(value) => updateData({ gridMapDefaultTokenColor: value })}
          />
        </div>
      </CollapsibleSection>
    </div>
  );
}
