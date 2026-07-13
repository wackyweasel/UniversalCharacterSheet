import { ChangeEvent, ReactNode, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gifsicle from 'gifsicle-wasm-browser';

const SIZE_LIMIT = 500 * 1024;

interface Props {
  children: ReactNode;
  className?: string;
  onImageReady: (dataUrl: string) => void;
  ariaLabel?: string;
  disabled?: boolean;
}

function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function compressGif(file: File, targetSize: number): Promise<string> {
  const passes: { lossy: number; scale?: number; colors?: number }[] = [
    { lossy: 30 },
    { lossy: 60 },
    { lossy: 80, colors: 128 },
    { lossy: 100, colors: 128, scale: 0.75 },
    { lossy: 140, colors: 64, scale: 0.6 },
    { lossy: 200, colors: 32, scale: 0.5 },
  ];

  let bestBlob: File | null = null;
  for (const pass of passes) {
    const command = ['-O2', `--lossy=${pass.lossy}`];
    if (pass.colors) command.push(`--colors=${pass.colors}`);
    if (pass.scale) command.push(`--scale=${pass.scale}`);
    command.push('input.gif', '-o', '/out/out.gif');

    const output: File[] = await gifsicle.run({
      input: [{ file, name: 'input.gif' }],
      command: [command.join(' ')],
    });
    const result = output?.[0];
    if (!result) continue;
    bestBlob = result;
    if (result.size <= targetSize) break;
  }

  if (!bestBlob) throw new Error('GIF compression failed');
  return fileToDataUrl(bestBlob);
}

async function compressImage(file: File, targetSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      const scale = Math.min(Math.sqrt(targetSize / file.size), 1);
      canvas.width = Math.max(Math.round(image.width * scale), 100);
      canvas.height = Math.max(Math.round(image.height * scale), 100);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      let minQuality = 0.1;
      let maxQuality = 0.92;
      let result = canvas.toDataURL('image/jpeg', maxQuality);
      for (let index = 0; index < 5; index++) {
        const quality = (minQuality + maxQuality) / 2;
        result = canvas.toDataURL('image/jpeg', quality);
        if (result.length * 0.75 > targetSize) maxQuality = quality;
        else minQuality = quality;
      }
      resolve(result);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    image.src = url;
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageUploadButton({ children, className = '', onImageReady, ariaLabel, disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [targetKB, setTargetKB] = useState(500);

  const processFile = async (file: File | Blob) => {
    onImageReady(await fileToDataUrl(file));
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > SIZE_LIMIT) {
        const originalKB = Math.floor(file.size / 1024);
        setTargetKB(Math.min(500, Math.max(50, Math.floor(originalKB / 50) * 50)));
        setPendingFile(file);
      } else {
        void processFile(file);
      }
    }
    event.target.value = '';
  };

  const closeWarning = () => {
    setPendingFile(null);
  };

  const keepOriginal = () => {
    if (!pendingFile) return;
    void processFile(pendingFile);
    closeWarning();
  };

  const compress = async () => {
    if (!pendingFile) return;
    setIsCompressing(true);
    try {
      const target = targetKB * 1024;
      const dataUrl = pendingFile.type === 'image/gif'
        ? await compressGif(pendingFile, target)
        : await compressImage(pendingFile, target);
      onImageReady(dataUrl);
      closeWarning();
    } catch (error) {
      console.error('Failed to compress image:', error);
      alert('Failed to compress image. Please try a different image.');
    } finally {
      setIsCompressing(false);
    }
  };

  const isGif = pendingFile?.type === 'image/gif';
  const maxTargetKB = pendingFile
    ? Math.min(5000, Math.max(500, Math.floor(pendingFile.size / 1024)))
    : 500;

  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
        tabIndex={-1}
      />

      {pendingFile && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4"
          data-touch-camera-ignore="true"
        >
          <div className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme">
            <h3 className="font-heading text-base font-bold">Large image detected</h3>
            <p className="mt-2 text-sm">
              This image is <strong>{formatFileSize(pendingFile.size)}</strong>, which may affect performance or browser storage.
            </p>
            <p className="mt-2 text-xs text-theme-muted">
              {isGif ? 'Compression reduces quality but preserves animation.' : 'Choose a target size for the compressed image.'}
            </p>
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs">
                <label htmlFor="image-upload-target-size">Target size</label>
                <span className="text-theme-muted tabular-nums">{targetKB} KB</span>
              </div>
              <input
                id="image-upload-target-size"
                type="range"
                min={50}
                max={maxTargetKB}
                step={50}
                value={targetKB}
                onChange={(event) => setTargetKB(Number(event.target.value))}
                disabled={isCompressing}
                className="w-full accent-theme-accent"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void compress()}
                disabled={isCompressing}
                className="widget-control widget-control--primary flex-1 px-3 py-2 text-sm"
              >
                {isCompressing ? 'Compressing...' : 'Compress'}
              </button>
              {isGif && (
                <button type="button" onClick={keepOriginal} disabled={isCompressing} className="widget-control flex-1 px-3 py-2 text-sm">
                  Keep original
                </button>
              )}
              <button type="button" onClick={closeWarning} disabled={isCompressing} className="widget-control flex-1 px-3 py-2 text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}