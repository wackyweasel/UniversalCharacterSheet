import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { EditorProps } from './types';
import { CollapsibleSection } from './CollapsibleSection';
import { readBackgroundImage } from '../../utils/gridMapTokens';
import { TrashIcon, UploadIcon } from '../icons';

interface SliderControlProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}

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

function SliderControl({ id, label, value, min, max, step = 1, format, onChange }: SliderControlProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-theme-ink">
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full"
      />
      <div className="text-center text-xs text-theme-muted">{format ? format(value) : value}</div>
    </div>
  );
}

const GRID_STYLES = ['solid', 'dashed', 'dotted'] as const;

export function GridMapEditor({ widget, updateData }: EditorProps) {
  const {
    gridMapGridType = 'square',
    gridMapGridSize = 32,
    gridMapGridColor = '#cbd5e1',
    gridMapWallColor = '#334155',
    gridMapWallWidth = 4,
    gridMapDefaultTokenColor = '#2563eb',
    gridMapCellDistance = 5,
    gridMapDistanceUnit = 'ft',
    gridMapShowGrid = true,
    gridMapGridOpacity = 1,
    gridMapGridLineWidth = 1,
    gridMapGridStyle = 'solid',
    gridMapMajorLineEvery = 5,
    gridMapBackgroundColor,
    gridMapBackgroundImage,
    gridMapBackgroundWidthCells = 30,
    gridMapBackgroundOffsetX = 0,
    gridMapBackgroundOffsetY = 0,
    gridMapBackgroundOpacity = 1,
  } = widget.data;
  const [cellDistanceDraft, setCellDistanceDraft] = useState(() => String(gridMapCellDistance));
  const [imageError, setImageError] = useState<string | null>(null);
  const editingCellDistanceRef = useRef(false);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editingCellDistanceRef.current) setCellDistanceDraft(String(gridMapCellDistance));
  }, [gridMapCellDistance]);

  const handleBackgroundPicked = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      updateData({ gridMapBackgroundImage: await readBackgroundImage(file) });
      setImageError(null);
    } catch {
      setImageError('That image could not be loaded.');
    }
  };
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
        <h3 id={`grid-map-lines-heading-${widget.id}`} className="widget-editor__section-title">Grid lines</h3>
        <div className="mt-3 space-y-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-theme-ink">
            <input
              type="checkbox"
              checked={gridMapShowGrid}
              onChange={(event) => updateData({ gridMapShowGrid: event.target.checked })}
              className="h-4 w-4 accent-theme-accent"
            />
            Show grid lines
          </label>

          {gridMapShowGrid && (
            <>
              <ColorControl
                id={`grid-map-grid-color-${widget.id}`}
                label="Grid color"
                value={gridMapGridColor}
                onChange={(value) => updateData({ gridMapGridColor: value })}
              />

              <div>
                <div className="mb-1 text-xs font-semibold uppercase text-theme-muted">Line style</div>
                <div className="widget-editor__segmented-group" role="group" aria-label="Grid line style">
                  {GRID_STYLES.map((style) => (
                    <button
                      key={style}
                      type="button"
                      aria-pressed={gridMapGridStyle === style}
                      onClick={() => updateData({ gridMapGridStyle: style })}
                      className={`widget-editor__segment capitalize ${gridMapGridStyle === style ? 'widget-editor__segment--selected' : ''}`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <SliderControl
                id={`grid-map-grid-opacity-${widget.id}`}
                label="Line opacity"
                value={gridMapGridOpacity}
                min={0.1}
                max={1}
                step={0.05}
                format={(value) => `${Math.round(value * 100)}%`}
                onChange={(value) => updateData({ gridMapGridOpacity: value })}
              />

              <SliderControl
                id={`grid-map-grid-line-width-${widget.id}`}
                label="Line thickness"
                value={gridMapGridLineWidth}
                min={0.5}
                max={4}
                step={0.5}
                format={(value) => `${value}px`}
                onChange={(value) => updateData({ gridMapGridLineWidth: value })}
              />

              {gridMapGridType === 'square' && (
                <SliderControl
                  id={`grid-map-major-lines-${widget.id}`}
                  label="Highlight every Nth line"
                  value={gridMapMajorLineEvery}
                  min={0}
                  max={10}
                  format={(value) => (value === 0 ? 'Off' : `Every ${value} cells`)}
                  onChange={(value) => updateData({ gridMapMajorLineEvery: value })}
                />
              )}
            </>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection>
        <h3 id={`grid-map-background-heading-${widget.id}`} className="widget-editor__section-title">Background</h3>
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor={`grid-map-background-color-${widget.id}`} className="block text-xs font-medium text-theme-ink">
              Background color
            </label>
            <div className="flex items-center gap-2">
              <input
                id={`grid-map-background-color-${widget.id}`}
                type="color"
                value={gridMapBackgroundColor || '#ffffff'}
                onChange={(event) => updateData({ gridMapBackgroundColor: event.target.value })}
                className="h-10 w-10 cursor-pointer rounded-button border border-theme-border"
              />
              <button
                type="button"
                disabled={!gridMapBackgroundColor}
                onClick={() => updateData({ gridMapBackgroundColor: undefined })}
                className="widget-control px-3 py-1.5 text-xs disabled:opacity-50"
              >
                Use theme color
              </button>
            </div>
          </div>

          <div>
            <span className="mb-1 block text-xs font-medium text-theme-ink">Background image <span className="font-normal text-theme-muted">(optional)</span></span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => backgroundInputRef.current?.click()} className="widget-control flex items-center gap-1.5 px-3 py-1.5 text-xs">
                <UploadIcon className="h-3.5 w-3.5" />
                {gridMapBackgroundImage ? 'Replace image' : 'Upload image'}
              </button>
              {gridMapBackgroundImage && (
                <button type="button" onClick={() => updateData({ gridMapBackgroundImage: undefined })} className="widget-control flex items-center gap-1.5 px-3 py-1.5 text-xs">
                  <TrashIcon className="h-3.5 w-3.5" />
                  Remove
                </button>
              )}
              <input ref={backgroundInputRef} type="file" accept="image/*" className="hidden" tabIndex={-1} onChange={(event) => void handleBackgroundPicked(event)} />
            </div>
            {imageError && <p role="alert" className="mt-1 text-xs text-red-500">{imageError}</p>}
            <p className="widget-editor__hint mt-2 text-[11px] leading-4 text-theme-muted">The image starts at the top-left corner of the map and is saved inside the sheet.</p>
          </div>

          {gridMapBackgroundImage && (
            <>
              <SliderControl
                id={`grid-map-background-width-${widget.id}`}
                label="Image width"
                value={gridMapBackgroundWidthCells}
                min={2}
                max={120}
                format={(value) => `${value} cells`}
                onChange={(value) => updateData({ gridMapBackgroundWidthCells: value })}
              />
              <SliderControl
                id={`grid-map-background-offset-x-${widget.id}`}
                label="Horizontal offset"
                value={gridMapBackgroundOffsetX}
                min={-60}
                max={60}
                step={0.5}
                format={(value) => `${value} cells`}
                onChange={(value) => updateData({ gridMapBackgroundOffsetX: value })}
              />
              <SliderControl
                id={`grid-map-background-offset-y-${widget.id}`}
                label="Vertical offset"
                value={gridMapBackgroundOffsetY}
                min={-60}
                max={60}
                step={0.5}
                format={(value) => `${value} cells`}
                onChange={(value) => updateData({ gridMapBackgroundOffsetY: value })}
              />
              <SliderControl
                id={`grid-map-background-opacity-${widget.id}`}
                label="Image opacity"
                value={gridMapBackgroundOpacity}
                min={0.1}
                max={1}
                step={0.05}
                format={(value) => `${Math.round(value * 100)}%`}
                onChange={(value) => updateData({ gridMapBackgroundOpacity: value })}
              />
            </>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection>
        <h3 id={`grid-map-appearance-heading-${widget.id}`} className="widget-editor__section-title">Walls and tokens</h3>
        <div className="mt-3 space-y-3">
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
