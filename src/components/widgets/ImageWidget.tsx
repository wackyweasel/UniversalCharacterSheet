import { useEffect, useRef, useState } from 'react';
import { parseGIF, decompressFrames, ParsedFrame } from 'gifuct-js';
import { Widget } from '../../types';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
}

export default function ImageWidget({ widget, mode, width, height }: Props) {
  const { label, imageUrl = '' } = widget.data;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paused, setPaused] = useState(false);
  const [gifReady, setGifReady] = useState(false);

  // Refs that the animation loop reads on each tick (avoids stale closures)
  const pausedRef = useRef(false);
  const framesRef = useRef<ParsedFrame[]>([]);
  const frameIdxRef = useRef(0);
  const tickerRef = useRef<number | undefined>(undefined);

  // Fixed small sizing
  const labelClass = 'text-xs';
  const placeholderIconClass = 'text-2xl';
  const placeholderTextClass = 'text-[10px]';
  const gapClass = 'gap-1';

  const isVerticalMode = height > 1000;
  const labelHeight = 16;
  const gapSize = 4;
  const padding = 0;

  const imageHeight = isVerticalMode
    ? Math.min(300, width)
    : Math.max(40, height - labelHeight - gapSize - padding * 2);

  const isGif = !!imageUrl && (
    imageUrl.startsWith('data:image/gif') ||
    /\.gif(\?|#|$)/i.test(imageUrl)
  );
  const showPauseControl = mode === 'play' && isGif && gifReady;
  const objectFitClass = isVerticalMode ? 'object-contain' : 'object-cover';

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

  return (
    <div className={`flex flex-col ${gapClass} w-full ${isVerticalMode ? '' : 'h-full'}`}>
      {label && (
        <div className={`font-bold text-center ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {label}
        </div>
      )}

      <div
        className={`relative border-[length:var(--border-width)] border-theme-border bg-theme-background flex items-center justify-center overflow-hidden ${isVerticalMode ? '' : 'flex-1'}`}
        style={{ height: `${imageHeight}px`, borderRadius: 'min(var(--button-radius), 16px)' }}
      >
        {imageUrl ? (
          isGif ? (
            <>
              <canvas
                ref={canvasRef}
                className={`w-full h-full ${objectFitClass}`}
              />
              {showPauseControl && (
                <button
                  type="button"
                  onClick={togglePause}
                  title={paused ? 'Play' : 'Pause'}
                  aria-label={paused ? 'Play GIF' : 'Pause GIF'}
                  className="absolute bottom-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  {paused ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 1l7 4-7 4z"/></svg>
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="2" y="1" width="2" height="8"/><rect x="6" y="1" width="2" height="8"/></svg>
                  )}
                </button>
              )}
            </>
          ) : (
            <img
              src={imageUrl}
              alt={label || 'Character'}
              className={`w-full h-full ${objectFitClass}`}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )
        ) : (
          <div className={`text-theme-muted text-center p-1`}>
            <div className={`${placeholderIconClass} mb-1`}>👤</div>
            <span className={`${placeholderTextClass} font-body`}>No image</span>
          </div>
        )}
      </div>
    </div>
  );
}






