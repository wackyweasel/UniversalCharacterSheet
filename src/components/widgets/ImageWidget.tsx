import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { parseGIF, decompressFrames, ParsedFrame } from 'gifuct-js';
import { Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { getCroppedMediaStyle, getImageCrop } from '../../utils/imageCrop';
import { ImageUploadButton } from '../ImageUploadButton';
import { WidgetEmptyState } from './WidgetPrimitives';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
  showUploadControl?: boolean;
}

export type ImageFrameStyle = 'none' | 'line' | 'double-line' | 'inset' | 'halo';

export const IMAGE_FRAME_THICKNESS_MIN = 1;
export const IMAGE_FRAME_THICKNESS_MAX = 8;
export const IMAGE_FRAME_THICKNESS_DEFAULT = 2;

const IMAGE_FRAME_CLASSES: Record<Exclude<ImageFrameStyle, 'none'>, string> = {
  line: 'image-widget__css-frame image-widget__css-frame--line',
  'double-line': 'image-widget__css-frame image-widget__css-frame--double-line',
  inset: 'image-widget__css-frame image-widget__css-frame--inset',
  halo: 'image-widget__css-frame image-widget__css-frame--halo',
};

export function normalizeImageFrameStyle(frameStyle: string): ImageFrameStyle {
  switch (frameStyle) {
    case 'none':
      return 'none';
    case 'line':
    case 'double-line':
    case 'inset':
    case 'halo':
      return frameStyle;
    default:
      return 'line';
  }
}

export function normalizeImageFrameThickness(value: unknown): number {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) return IMAGE_FRAME_THICKNESS_DEFAULT;
  return Math.min(IMAGE_FRAME_THICKNESS_MAX, Math.max(IMAGE_FRAME_THICKNESS_MIN, Math.round(parsedValue)));
}

export function ImageCssFrame({ frameStyle, color, thickness }: { frameStyle: string; color?: string; thickness?: number }) {
  const normalizedStyle = normalizeImageFrameStyle(frameStyle);
  if (normalizedStyle === 'none') return null;
  const normalizedThickness = normalizeImageFrameThickness(thickness);
  const cssFrameStyle = {
    color: color || undefined,
    '--image-frame-thickness': `${normalizedThickness}px`,
  } as CSSProperties;

  return (
    <span
      className={IMAGE_FRAME_CLASSES[normalizedStyle]}
      aria-hidden="true"
      style={cssFrameStyle}
    />
  );
}

export default function ImageWidget({ widget, mode, width, height, showUploadControl = true }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const {
    label,
    imageUrl = '',
    imageShape = 'rectangle',
    imageBorderStyle = 'line',
    imageFrameThickness,
    imageFrameColor,
    imageEffect = 'none',
    imageTitleAlignment = 'left',
    imageTitlePosition = 'above',
  } = widget.data;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [gifReady, setGifReady] = useState(false);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [mediaSize, setMediaSize] = useState({ width: 0, height: 0 });

  // Refs that the animation loop reads on each tick (avoids stale closures)
  const pausedRef = useRef(false);
  const framesRef = useRef<ParsedFrame[]>([]);
  const frameIdxRef = useRef(0);
  const tickerRef = useRef<number | undefined>(undefined);

  // Fixed small sizing
  const gapClass = 'gap-1';

  const isVerticalMode = height > 1000;
  const labelHeight = 16;
  const gapSize = 4;
  const padding = 0;

  const titleSpace = label ? labelHeight + gapSize : 0;
  const imageHeight = isVerticalMode
    ? Math.min(300, width)
    : Math.max(40, height - titleSpace - padding * 2);

  const isGif = !!imageUrl && (
    imageUrl.startsWith('data:image/gif') ||
    /\.gif(\?|#|$)/i.test(imageUrl)
  );
  const showPauseControl = mode === 'play' && isGif && gifReady;
  const crop = getImageCrop(widget.data);
  const hasCustomCrop = crop.top > 0 || crop.right > 0 || crop.bottom > 0 || crop.left > 0;
  const mediaStyle = hasCustomCrop
    ? getCroppedMediaStyle(crop, mediaSize, frameSize)
    : {
        height: '100%',
        objectFit: isVerticalMode && imageShape === 'rectangle' ? 'contain' : 'cover',
        width: '100%',
      } as const;
  const frameStyle = imageShape === 'circle'
    ? { width: `min(100%, ${imageHeight}px)`, aspectRatio: '1', alignSelf: 'center' }
    : { width: '100%', height: `${imageHeight}px` };

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const updateFrameSize = () => {
      setFrameSize({ width: frame.clientWidth, height: frame.clientHeight });
    };
    updateFrameSize();
    const observer = new ResizeObserver(updateFrameSize);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [imageShape, imageHeight]);

  // Decode GIF and start the animation loop
  useEffect(() => {
    if (!isGif || !imageUrl) {
      setGifReady(false);
      return;
    }

    let cancelled = false;
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    const renderFrame = () => {
      const canvas = canvasRef.current;
      const frames = framesRef.current;
      if (!canvas || !tempCtx || frames.length === 0) return;
      const idx = frameIdxRef.current;
      const frame = frames[idx];
      const { width: fw, height: fh, top, left } = frame.dims;

      const prevIdx = (idx - 1 + frames.length) % frames.length;
      const prev = frames[prevIdx];
      if (idx === 0 || prev?.disposalType === 2) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }

      tempCanvas.width = fw;
      tempCanvas.height = fh;
      const imageData = tempCtx.createImageData(fw, fh);
      imageData.data.set(frame.patch);
      tempCtx.putImageData(imageData, 0, 0);

      const ctx = canvas.getContext('2d');
      ctx?.drawImage(tempCanvas, left, top);
    };

    const tick = () => {
      if (cancelled) return;
      const frames = framesRef.current;
      if (frames.length === 0) return;
      if (!pausedRef.current) {
        renderFrame();
        frameIdxRef.current = (frameIdxRef.current + 1) % frames.length;
      }
      const delay = Math.max(20, frames[frameIdxRef.current]?.delay || 100);
      tickerRef.current = window.setTimeout(tick, delay);
    };

    (async () => {
      try {
        const res = await fetch(imageUrl);
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        const gif = parseGIF(buf);
        const frames = decompressFrames(gif, true);
        if (cancelled || frames.length === 0) return;
        framesRef.current = frames;
        frameIdxRef.current = 0;
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = gif.lsd.width;
          canvas.height = gif.lsd.height;
        }
        setMediaSize({ width: gif.lsd.width, height: gif.lsd.height });
        setGifReady(true);
        tick();
      } catch (err) {
        console.error('Failed to decode GIF:', err);
      }
    })();

    return () => {
      cancelled = true;
      if (tickerRef.current !== undefined) {
        clearTimeout(tickerRef.current);
        tickerRef.current = undefined;
      }
      framesRef.current = [];
      frameIdxRef.current = 0;
    };
  }, [imageUrl, isGif]);

  // Keep pausedRef in sync with state
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const togglePause = () => setPaused((p) => !p);

  const title = label ? (
    <div
      className="widget-header image-widget__title flex-shrink-0"
      data-alignment={imageTitleAlignment}
    >
      <div className="widget-header-title min-w-0 flex-1 truncate">{label}</div>
    </div>
  ) : null;

  return (
    <div className={`flex flex-col ${gapClass} w-full ${isVerticalMode ? '' : 'h-full'} ${imageShape === 'circle' ? 'justify-center' : ''}`}>
      {imageTitlePosition === 'above' && title}

      <div
        ref={frameRef}
        className={`image-widget__frame relative bg-theme-background ${!imageUrl ? 'image-widget__frame--empty' : ''} ${isVerticalMode || imageShape === 'circle' ? '' : 'flex-1'}`}
        data-shape={imageShape}
        style={frameStyle}
      >
        <ImageCssFrame
          frameStyle={imageBorderStyle}
          thickness={imageFrameThickness}
          color={imageFrameColor}
        />
        <div className="image-widget__media-clip">
          {imageUrl ? (
            isGif ? (
              <>
                <canvas
                  ref={canvasRef}
                  className="image-widget__media w-full h-full"
                  data-effect={imageEffect}
                  style={mediaStyle}
                />
                {showPauseControl && (
                  <button
                    type="button"
                    onClick={togglePause}
                    title={paused ? 'Play' : 'Pause'}
                    aria-label={paused ? 'Play GIF' : 'Pause GIF'}
                    className="absolute bottom-1 right-1 w-6 h-6 flex items-center justify-center rounded-full"
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.55)',
                      color: '#ffffff',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                    }}
                  >
                    {paused ? (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ display: 'block' }}
                      >
                        <polygon points="3,2 10,6 3,10" fill="#ffffff" />
                      </svg>
                    ) : (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ display: 'block' }}
                      >
                        <rect x="3" y="2" width="2.5" height="8" fill="#ffffff" />
                        <rect x="6.5" y="2" width="2.5" height="8" fill="#ffffff" />
                      </svg>
                    )}
                  </button>
                )}
              </>
            ) : (
              <img
                src={imageUrl}
                alt={label || 'Character'}
                className="image-widget__media w-full h-full"
                data-effect={imageEffect}
                style={mediaStyle}
                onLoad={(event) => setMediaSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )
          ) : mode === 'print' ? null : showUploadControl ? (
            <ImageUploadButton
              ariaLabel="Add image or GIF"
              onImageReady={(dataUrl) => updateWidgetData(widget.id, { imageUrl: dataUrl })}
              className="image-widget__empty-upload widget-empty-state h-full w-full border-0"
            >
              <span className="widget-empty-state__title">Add image</span>
              <span className="widget-empty-state__hint">Choose an image or GIF</span>
            </ImageUploadButton>
          ) : (
            <WidgetEmptyState
              title="No image selected"
              className="border-0"
            />
          )}
        </div>
      </div>
      {imageTitlePosition === 'below' && title}
    </div>
  );
}






