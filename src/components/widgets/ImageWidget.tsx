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
const LIST_IMAGE_MAX_HEIGHT = 300;

const IMAGE_FRAME_CLASSES: Record<Exclude<ImageFrameStyle, 'none'>, string> = {
  line: 'image-widget__css-frame image-widget__css-frame--line',
  'double-line': 'image-widget__css-frame image-widget__css-frame--double-line',
  inset: 'image-widget__css-frame image-widget__css-frame--inset',
  halo: 'image-widget__css-frame image-widget__css-frame--halo',
};

function isAnimatedWebPData(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 12) return false;
  if (String.fromCharCode(...bytes.slice(0, 4)) !== 'RIFF' || String.fromCharCode(...bytes.slice(8, 12)) !== 'WEBP') {
    return false;
  }

  const view = new DataView(buffer);
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunkType = String.fromCharCode(...bytes.slice(offset, offset + 4));
    const chunkSize = view.getUint32(offset + 4, true);
    if (chunkType === 'ANIM' || chunkType === 'ANMF') return true;
    offset += 8 + chunkSize + (chunkSize % 2);
  }

  return false;
}

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
    hideImageTitle = false,
    imageTitleAlignment = 'left',
    imageTitlePosition = 'above',
  } = widget.data;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const webpImageRef = useRef<HTMLImageElement>(null);
  const [paused, setPaused] = useState(false);
  const [gifReady, setGifReady] = useState(false);
  const [isAnimatedWebP, setIsAnimatedWebP] = useState(false);
  const [webpReady, setWebpReady] = useState(false);
  const [webpPaused, setWebpPaused] = useState(false);
  const [webpSnapshot, setWebpSnapshot] = useState<string | null>(null);
  const [webpPlaybackKey, setWebpPlaybackKey] = useState(0);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [mediaSize, setMediaSize] = useState({ width: 0, height: 0 });
  const [containerWidth, setContainerWidth] = useState(0);

  // Refs that the animation loop reads on each tick (avoids stale closures)
  const pausedRef = useRef(false);
  const framesRef = useRef<ParsedFrame[]>([]);
  const frameIdxRef = useRef(0);
  const tickerRef = useRef<number | undefined>(undefined);

  const gapClass = 'gap-1';

  const isVerticalMode = height > 1000;
  const labelHeight = 16;
  const gapSize = 4;
  const padding = 0;

  const hasVisibleTitle = !!label && !hideImageTitle;
  const titleSpace = hasVisibleTitle ? labelHeight + gapSize : 0;
  const canvasWidgetWidth = widget.w && widget.w > 0 ? widget.w : 200;
  const canvasWidgetHeight = widget.h && widget.h > 0 ? widget.h : 120;
  const canvasSurfaceBorder = 2;
  const canvasContentPaddingX = 16;
  const canvasContentPaddingTop = 6;
  const canvasContentPaddingBottom = 8;
  const canvasFrameWidth = Math.max(20, canvasWidgetWidth - canvasSurfaceBorder - canvasContentPaddingX);
  const canvasFrameHeight = Math.max(
    40,
    canvasWidgetHeight
      - canvasSurfaceBorder
      - canvasContentPaddingTop
      - canvasContentPaddingBottom
      - titleSpace,
  );
  const canvasFrameAspectRatio = canvasFrameHeight / canvasFrameWidth;
  const listFrameWidth = containerWidth || width;
  const uncappedListImageHeight = Math.max(40, listFrameWidth * canvasFrameAspectRatio);
  const imageHeight = isVerticalMode
    ? Math.min(LIST_IMAGE_MAX_HEIGHT, uncappedListImageHeight)
    : Math.max(40, height - titleSpace - padding * 2);
  const listImageIsHeightCapped = isVerticalMode && uncappedListImageHeight > LIST_IMAGE_MAX_HEIGHT;

  const normalizedImageUrl = imageUrl.toLowerCase();
  const isGif = !!imageUrl && (
    normalizedImageUrl.startsWith('data:image/gif') ||
    /\.gif(\?|#|$)/i.test(imageUrl)
  );
  const isWebP = !!imageUrl && (
    normalizedImageUrl.startsWith('data:image/webp') ||
    /\.webp(\?|#|$)/i.test(imageUrl)
  );
  const showPauseControl = mode === 'play' && ((isGif && gifReady) || (isAnimatedWebP && webpReady));
  const mediaIsPaused = isGif ? paused : webpPaused;
  const animationLabel = isGif ? 'GIF' : 'animation';
  const isPausedWebPSnapshot = isAnimatedWebP && webpPaused && !!webpSnapshot;
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
    : {
        width: listImageIsHeightCapped ? `${imageHeight / canvasFrameAspectRatio}px` : '100%',
        height: `${imageHeight}px`,
        ...(listImageIsHeightCapped ? { alignSelf: 'center' } : {}),
      };

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const container = frame.parentElement;
    const updateFrameSize = () => {
      setFrameSize({ width: frame.clientWidth, height: frame.clientHeight });
      setContainerWidth(container?.clientWidth || frame.clientWidth);
    };
    updateFrameSize();
    const observer = new ResizeObserver(updateFrameSize);
    observer.observe(frame);
    if (container) observer.observe(container);
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

  useEffect(() => {
    if (!isWebP || !imageUrl) {
      setIsAnimatedWebP(false);
      setWebpReady(false);
      setWebpPaused(false);
      setWebpSnapshot(null);
      return;
    }

    let cancelled = false;
    setIsAnimatedWebP(false);
    setWebpReady(false);
    setWebpPaused(false);
    setWebpSnapshot(null);

    (async () => {
      try {
        const response = await fetch(imageUrl);
        const buffer = await response.arrayBuffer();
        if (cancelled) return;
        const animated = isAnimatedWebPData(buffer);
        setIsAnimatedWebP(animated);
        if (animated && webpImageRef.current?.complete && webpImageRef.current.naturalWidth > 0) {
          setWebpReady(true);
        }
      } catch (error) {
        if (!cancelled) setIsAnimatedWebP(false);
        console.error('Failed to inspect WebP animation:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [imageUrl, isWebP]);

  // Keep pausedRef in sync with state
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const togglePause = () => {
    if (isGif) {
      setPaused((currentPaused) => !currentPaused);
      return;
    }
    if (!isAnimatedWebP) return;
    if (webpPaused) {
      setWebpPaused(false);
      setWebpSnapshot(null);
      setWebpPlaybackKey((key) => key + 1);
      return;
    }

    const image = webpImageRef.current;
    if (!image || image.naturalWidth === 0 || image.naturalHeight === 0) return;
    const snapshotCanvas = document.createElement('canvas');
    snapshotCanvas.width = image.naturalWidth;
    snapshotCanvas.height = image.naturalHeight;
    const context = snapshotCanvas.getContext('2d');
    if (!context) return;
    context.drawImage(image, 0, 0);
    setWebpSnapshot(snapshotCanvas.toDataURL('image/png'));
    setWebpPaused(true);
  };

  const title = hasVisibleTitle ? (
    <div
      className="widget-header image-widget__title flex-shrink-0"
      data-alignment={imageTitleAlignment}
    >
      <div className="widget-header-title min-w-0 flex-1 truncate">{label}</div>
    </div>
  ) : null;

  return (
    <div className={`image-widget flex flex-col ${gapClass} w-full ${isVerticalMode ? '' : 'h-full'} ${imageShape === 'circle' ? 'justify-center' : ''}`}>
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
              </>
            ) : (
              <img
                key={isPausedWebPSnapshot ? 'webp-paused' : `webp-playing-${webpPlaybackKey}`}
                ref={isPausedWebPSnapshot ? undefined : webpImageRef}
                src={isPausedWebPSnapshot ? webpSnapshot || imageUrl : imageUrl}
                alt={label || 'Character'}
                className="image-widget__media w-full h-full"
                data-effect={imageEffect}
                style={mediaStyle}
                onLoad={(event) => setMediaSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })}
                onLoadCapture={() => {
                  if (isWebP && isAnimatedWebP && !isPausedWebPSnapshot) setWebpReady(true);
                }}
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
        {showPauseControl && (
          <button
            type="button"
            onClick={togglePause}
            title={mediaIsPaused ? `Play ${animationLabel}` : `Pause ${animationLabel}`}
            aria-label={mediaIsPaused ? `Play ${animationLabel}` : `Pause ${animationLabel}`}
            className="absolute bottom-1 right-1 z-[4] flex h-6 w-6 items-center justify-center rounded-full"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              color: '#ffffff',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            {mediaIsPaused ? (
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
      </div>
      {imageTitlePosition === 'below' && title}
    </div>
  );
}






