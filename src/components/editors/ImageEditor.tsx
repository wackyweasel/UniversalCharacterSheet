import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpToLine,
  ImagePlus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { EditorProps } from './types';
import { getImageCrop, ImageCropInsets } from '../../utils/imageCrop';
import { Tooltip } from '../Tooltip';
import { ImageUploadButton } from '../ImageUploadButton';
import {
  IMAGE_FRAME_THICKNESS_DEFAULT,
  IMAGE_FRAME_THICKNESS_MAX,
  IMAGE_FRAME_THICKNESS_MIN,
  ImageCssFrame,
  normalizeImageFrameStyle,
  normalizeImageFrameThickness,
} from '../widgets/ImageWidget';

const SHAPE_OPTIONS = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'oval', label: 'Oval' },
  { value: 'circle', label: 'Circle' },
] as const;

const BORDER_OPTIONS = [
  { value: 'none', label: 'No frame' },
  { value: 'line', label: 'Line' },
  { value: 'double-line', label: 'Double line' },
  { value: 'inset', label: 'Inset' },
  { value: 'halo', label: 'Halo' },
] as const;

const ALIGNMENT_OPTIONS = [
  { value: 'left', label: 'Align left', Icon: AlignLeft },
  { value: 'center', label: 'Align center', Icon: AlignCenter },
  { value: 'right', label: 'Align right', Icon: AlignRight },
] as const;

type CropEdge = keyof ImageCropInsets;

const MIN_VISIBLE_PERCENT = 15;
const EDGE_DATA_KEYS: Record<CropEdge, string> = {
  top: 'imageCropTop',
  right: 'imageCropRight',
  bottom: 'imageCropBottom',
  left: 'imageCropLeft',
};

const CROP_HANDLE_CLASSES: Record<CropEdge, string> = {
  top: 'image-crop-editor__handle image-crop-editor__handle--top',
  right: 'image-crop-editor__handle image-crop-editor__handle--right',
  bottom: 'image-crop-editor__handle image-crop-editor__handle--bottom',
  left: 'image-crop-editor__handle image-crop-editor__handle--left',
};

export function ImageEditor({ widget, updateData }: EditorProps) {
  const {
    label,
    imageUrl = '',
    imageShape = 'rectangle',
    imageBorderStyle = 'line',
    imageFrameThickness,
    imageFrameColor,
    imageEffect = 'none',
    hideImageTitle = false,
    imageTitleAlignment = 'left',
    imageTitlePosition = 'above',
  } = widget.data;
  const normalizedFrameStyle = normalizeImageFrameStyle(imageBorderStyle);
  const frameThickness = normalizeImageFrameThickness(imageFrameThickness ?? IMAGE_FRAME_THICKNESS_DEFAULT);
  const crop = getImageCrop(widget.data);
  const cropPreviewRef = useRef<HTMLDivElement>(null);
  const cropDragRef = useRef<{
    edge: CropEdge;
    startClientX: number;
    startClientY: number;
    startCrop: ImageCropInsets;
  } | null>(null);
  const [imageSize, setImageSize] = useState({ source: '', width: 4, height: 3 });

  const clearImage = () => {
    updateData({ imageUrl: '' });
  };

  const resetCrop = () => {
    updateData({ imageCropTop: 0, imageCropRight: 0, imageCropBottom: 0, imageCropLeft: 0 });
  };

  const hasCustomCrop = crop.top > 0 || crop.right > 0 || crop.bottom > 0 || crop.left > 0;
  const hasCurrentImageSize = imageSize.source === imageUrl;
  const imageAspectRatio = hasCurrentImageSize ? imageSize.width / imageSize.height : 4 / 3;
  const cropPreviewStyle = {
    aspectRatio: `${imageSize.width} / ${imageSize.height}`,
    width: `min(100%, ${14 * imageAspectRatio}rem)`,
  };

  const updateCropEdge = (edge: CropEdge, value: number) => {
    const opposite = edge === 'left' ? crop.right
      : edge === 'right' ? crop.left
        : edge === 'top' ? crop.bottom
          : crop.top;
    const boundedValue = Math.min(100 - MIN_VISIBLE_PERCENT - opposite, Math.max(0, value));
    updateData({ [EDGE_DATA_KEYS[edge]]: Math.round(boundedValue * 10) / 10 });
  };

  const startCropDrag = (edge: CropEdge, event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    cropDragRef.current = {
      edge,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startCrop: crop,
    };
  };

  const moveCropDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = cropDragRef.current;
    const preview = cropPreviewRef.current;
    if (!drag || !preview) return;
    event.preventDefault();
    event.stopPropagation();
    const bounds = preview.getBoundingClientRect();
    const deltaX = bounds.width > 0 ? (event.clientX - drag.startClientX) / bounds.width * 100 : 0;
    const deltaY = bounds.height > 0 ? (event.clientY - drag.startClientY) / bounds.height * 100 : 0;
    const delta = drag.edge === 'left' ? deltaX
      : drag.edge === 'right' ? -deltaX
        : drag.edge === 'top' ? deltaY
          : -deltaY;
    updateCropEdge(drag.edge, drag.startCrop[drag.edge] + delta);
  };

  const finishCropDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    cropDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const nudgeCropEdge = (edge: CropEdge, event: React.KeyboardEvent<HTMLButtonElement>) => {
    const keyDelta = edge === 'left'
      ? (event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0)
      : edge === 'right'
        ? (event.key === 'ArrowLeft' ? 1 : event.key === 'ArrowRight' ? -1 : 0)
        : edge === 'top'
          ? (event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0)
          : (event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : 0);
    if (keyDelta === 0) return;
    event.preventDefault();
    updateCropEdge(edge, crop[edge] + keyDelta);
  };

  return (
    <div className="widget-editor widget-editor--image image-editor space-y-5">
      <section className="widget-editor__section">
        <div className="widget-editor__section-heading">
          <h3 className="widget-editor__section-title">Artwork</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImageUploadButton
            onImageReady={(dataUrl) => updateData({
              imageUrl: dataUrl,
              imageCropTop: 0,
              imageCropRight: 0,
              imageCropBottom: 0,
              imageCropLeft: 0,
            })}
            className="inline-flex min-h-10 min-w-[12rem] flex-1 items-center justify-center gap-2 rounded-button bg-theme-accent px-3 py-2 text-sm text-theme-paper hover:opacity-90"
          >
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            {imageUrl ? 'Replace image' : 'Upload image or GIF'}
          </ImageUploadButton>
          {imageUrl && (
            <button
              type="button"
              onClick={clearImage}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-button border border-theme-border px-3 py-2 text-sm text-theme-ink hover:border-red-500 hover:bg-red-500 hover:text-white"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Remove
            </button>
          )}
        </div>
        {imageUrl && (
          <div className="image-editor__crop mt-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="image-editor__control-label">Crop</span>
              <Tooltip content="Reset crop">
                <button
                  type="button"
                  aria-label="Reset crop"
                  disabled={!hasCustomCrop}
                  onClick={resetCrop}
                  className="widget-control h-8 w-8 p-0"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                </button>
              </Tooltip>
            </div>
            <div
              ref={cropPreviewRef}
              className="image-crop-editor mx-auto overflow-hidden bg-theme-background"
              style={cropPreviewStyle}
            >
              <img
                src={imageUrl}
                alt="Crop preview"
                className="image-widget__media block h-full w-full"
                style={{ objectFit: 'contain' }}
                data-effect={imageEffect}
                draggable={false}
                onLoad={(event) => {
                  setImageSize({
                    source: imageUrl,
                    width: event.currentTarget.naturalWidth,
                    height: event.currentTarget.naturalHeight,
                  });
                }}
              />
              <div
                className="image-crop-editor__selection"
                style={{ top: `${crop.top}%`, right: `${crop.right}%`, bottom: `${crop.bottom}%`, left: `${crop.left}%` }}
              >
                {(['top', 'right', 'bottom', 'left'] as CropEdge[]).map((edge) => (
                  <button
                    key={edge}
                    type="button"
                    aria-label={`Crop ${edge} edge`}
                    className={CROP_HANDLE_CLASSES[edge]}
                    onPointerDown={(event) => startCropDrag(edge, event)}
                    onPointerMove={moveCropDrag}
                    onPointerUp={finishCropDrag}
                    onPointerCancel={finishCropDrag}
                    onKeyDown={(event) => nudgeCropEdge(edge, event)}
                  >
                    <span />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {!imageUrl && <div className="image-editor__empty-state">No image selected</div>}
      </section>

      <section className="widget-editor__section">
        <div className="widget-editor__section-heading">
          <h3 className="widget-editor__section-title">Name</h3>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hideImageTitle}
            onChange={(event) => updateData({ hideImageTitle: event.target.checked })}
            className="h-4 w-4 accent-theme-accent"
          />
          <span className="text-sm text-theme-ink">Hide name</span>
        </label>
        {!hideImageTitle && <div className="relative mt-3">
            <input
              aria-label="Name"
              className="h-10 w-full rounded-button border border-theme-border bg-theme-paper px-3 py-2 pr-8 text-theme-ink focus:border-theme-accent focus:outline-none"
              value={label || ''}
              onChange={(e) => updateData({ label: e.target.value })}
            />
            {label && (
              <Tooltip content="Clear label">
                <button
                  type="button"
                  onClick={() => updateData({ label: '' })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted transition-colors hover:text-theme-ink"
                >
                  ×
                </button>
              </Tooltip>
            )}
          </div>}
        {!hideImageTitle && <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="image-editor__control-group">
            <span className="image-editor__control-label">Alignment</span>
            <div className="flex overflow-hidden rounded-button border border-theme-border">
            {ALIGNMENT_OPTIONS.map(({ value, label: optionLabel, Icon }) => (
              <Tooltip key={value} content={optionLabel}>
                <button
                  type="button"
                  aria-label={optionLabel}
                  aria-pressed={imageTitleAlignment === value}
                  onClick={() => updateData({ imageTitleAlignment: value })}
                  className={`flex h-9 flex-1 items-center justify-center transition-colors ${
                    imageTitleAlignment === value
                      ? 'bg-theme-accent text-theme-paper'
                      : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </button>
              </Tooltip>
            ))}
            </div>
          </div>
          <div className="image-editor__control-group">
            <span className="image-editor__control-label">Position</span>
            <div className="flex overflow-hidden rounded-button border border-theme-border">
              <Tooltip content="Name above image">
                <button
                  type="button"
                  aria-label="Name above image"
                  aria-pressed={imageTitlePosition === 'above'}
                  onClick={() => updateData({ imageTitlePosition: 'above' })}
                  className={`flex h-9 flex-1 items-center justify-center transition-colors ${
                    imageTitlePosition === 'above'
                      ? 'bg-theme-accent text-theme-paper'
                      : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
                  }`}
                >
                  <ArrowUpToLine className="h-4 w-4" aria-hidden="true" />
                </button>
              </Tooltip>
              <Tooltip content="Name below image">
                <button
                  type="button"
                  aria-label="Name below image"
                  aria-pressed={imageTitlePosition === 'below'}
                  onClick={() => updateData({ imageTitlePosition: 'below' })}
                  className={`flex h-9 flex-1 items-center justify-center transition-colors ${
                    imageTitlePosition === 'below'
                      ? 'bg-theme-accent text-theme-paper'
                      : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
                  }`}
                >
                  <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>}
      </section>

      <section className="widget-editor__section">
        <div className="widget-editor__section-heading">
          <h3 className="widget-editor__section-title">Style</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-2 block text-xs font-bold uppercase text-theme-muted">Shape</span>
            <div className="grid grid-cols-3 overflow-hidden rounded-button border border-theme-border">
              {SHAPE_OPTIONS.map(({ value, label: optionLabel }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={imageShape === value}
                  onClick={() => updateData({ imageShape: value })}
                  className={`flex min-h-12 flex-col items-center justify-center gap-1 border-r border-theme-border px-1 text-xs last:border-r-0 ${
                    imageShape === value
                      ? 'bg-theme-accent text-theme-paper'
                      : 'text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
                  }`}
                >
                  <span
                    className="h-5 w-7 border border-current"
                    style={{ borderRadius: value === 'rectangle' ? '2px' : '50%', width: value === 'circle' ? '1.25rem' : undefined }}
                    aria-hidden="true"
                  />
                  {optionLabel}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor={`image-effect-${widget.id}`} className="mb-2 block text-xs font-bold uppercase text-theme-muted">Effect</label>
            <select
              id={`image-effect-${widget.id}`}
              value={imageEffect}
              onChange={(event) => updateData({ imageEffect: event.target.value })}
              className="h-12 w-full rounded-button border border-theme-border bg-theme-paper px-3 py-2 text-sm text-theme-ink focus:border-theme-accent focus:outline-none"
            >
              <option value="none">None</option>
              <option value="grayscale">Black & white</option>
              <option value="sepia">Aged sepia</option>
              <option value="vivid">Vivid</option>
              <option value="moody">Moody</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <span className="mb-2 block text-xs font-bold uppercase text-theme-muted">Frame</span>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {BORDER_OPTIONS.map(({ value, label: optionLabel }) => (
            <button
              key={value}
              type="button"
              aria-pressed={normalizedFrameStyle === value}
              onClick={() => updateData({ imageBorderStyle: value })}
              className={`flex min-h-[4.5rem] min-w-0 flex-col items-center justify-center gap-1 rounded-button border px-1 py-2 text-xs transition-colors ${
                normalizedFrameStyle === value
                  ? 'border-theme-accent bg-theme-accent text-theme-paper'
                  : 'border-theme-border text-theme-ink hover:border-theme-accent'
              }`}
            >
              <span
                className="image-widget__frame h-9 w-12 bg-theme-background"
                aria-hidden="true"
              >
                <ImageCssFrame frameStyle={value} />
              </span>
              <span className="truncate">{optionLabel}</span>
            </button>
          ))}
          </div>
          <div className={`mt-4 ${normalizedFrameStyle === 'none' ? 'opacity-50' : ''}`}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor={`image-frame-thickness-${widget.id}`} className="text-xs font-bold uppercase text-theme-muted">
                Line thickness
              </label>
              <output htmlFor={`image-frame-thickness-${widget.id}`} className="text-sm tabular-nums text-theme-ink">
                {frameThickness} px
              </output>
            </div>
            <input
              id={`image-frame-thickness-${widget.id}`}
              type="range"
              min={IMAGE_FRAME_THICKNESS_MIN}
              max={IMAGE_FRAME_THICKNESS_MAX}
              step="1"
              value={frameThickness}
              onChange={(event) => updateData({ imageFrameThickness: Number(event.target.value) })}
              disabled={normalizedFrameStyle === 'none'}
              aria-label="Line thickness"
              className="w-full accent-theme-accent"
            />
          </div>
        {normalizedFrameStyle !== 'none' && (
          <div className="mt-3">
              <label htmlFor={`image-frame-color-${widget.id}`} className="mb-2 block text-xs font-bold uppercase text-theme-muted">
                Frame color
              </label>
              <div className="flex items-center gap-2">
                <div
                  className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-button border border-theme-border bg-theme-accent"
                  style={imageFrameColor ? { backgroundColor: imageFrameColor } : undefined}
                >
                  <input
                    id={`image-frame-color-${widget.id}`}
                    type="color"
                    value={imageFrameColor || '#2563eb'}
                    onChange={(event) => updateData({ imageFrameColor: event.target.value })}
                    className="absolute -inset-1 h-12 w-12 cursor-pointer opacity-0"
                  />
                </div>
                {imageFrameColor ? (
                  <>
                    <span className="flex-1 text-sm text-theme-ink">{imageFrameColor.toUpperCase()}</span>
                    <button
                      type="button"
                      onClick={() => updateData({ imageFrameColor: undefined })}
                      className="widget-control px-3 py-2 text-sm"
                    >
                      Use theme color
                    </button>
                  </>
                ) : (
                  <span className="text-sm text-theme-muted">Theme color</span>
                )}
              </div>
          </div>
        )}
        </div>
      </section>
    </div>
  );
}

