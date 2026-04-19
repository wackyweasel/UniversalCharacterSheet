import React, { useState } from 'react';
import gifsicle from 'gifsicle-wasm-browser';
import { EditorProps } from './types';
import { Tooltip } from '../Tooltip';

const SIZE_LIMIT = 500 * 1024; // Trigger warning above this size

function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function compressGif(file: File, targetSize: number): Promise<string> {
  // Progressive passes: increase lossy and apply downscale until under target.
  // gifsicle lossy range 1-200; 30-60 is balanced, higher = more noise.
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
    const cmdParts = ['-O2', `--lossy=${pass.lossy}`];
    if (pass.colors) cmdParts.push(`--colors=${pass.colors}`);
    if (pass.scale) cmdParts.push(`--scale=${pass.scale}`);
    cmdParts.push('input.gif', '-o', '/out/out.gif');

    const out: File[] = await gifsicle.run({
      input: [{ file, name: 'input.gif' }],
      command: [cmdParts.join(' ')],
    });
    const result = out?.[0];
    if (!result) continue;
    bestBlob = result;
    if (result.size <= targetSize) break;
  }

  if (!bestBlob) throw new Error('GIF compression failed');
  return fileToDataUrl(bestBlob);
}

async function compressImage(file: File, targetSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Calculate scale factor based on file size ratio
      // Start with a scale that should get us close to target
      let scale = Math.sqrt(targetSize / file.size);
      scale = Math.min(scale, 1); // Never upscale
      
      let width = Math.round(img.width * scale);
      let height = Math.round(img.height * scale);
      
      // Ensure minimum dimensions
      width = Math.max(width, 100);
      height = Math.max(height, 100);
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw with smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      
      // Try different quality levels to hit target size
      const tryCompress = (quality: number): string => {
        return canvas.toDataURL('image/jpeg', quality);
      };
      
      // Binary search for optimal quality
      let minQuality = 0.1;
      let maxQuality = 0.92;
      let result = tryCompress(maxQuality);
      
      // If still too large at max quality, we need smaller dimensions
      // Otherwise, find optimal quality
      for (let i = 0; i < 5; i++) {
        const midQuality = (minQuality + maxQuality) / 2;
        result = tryCompress(midQuality);
        const size = result.length * 0.75; // Approximate decoded size
        
        if (size > targetSize) {
          maxQuality = midQuality;
        } else {
          minQuality = midQuality;
        }
      }
      
      resolve(result);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

export function ImageEditor({ widget, updateData }: EditorProps) {
  const { label, imageUrl = '' } = widget.data;
  const [showSizeWarning, setShowSizeWarning] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  // Target size in KB chosen by the user via slider
  const [targetKB, setTargetKB] = useState(500);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      updateData({ imageUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > SIZE_LIMIT) {
        // Default the slider to ~500 KB or the original size (rounded down to 50 KB), whichever is smaller
        const originalKB = Math.floor(file.size / 1024);
        setTargetKB(Math.min(500, Math.max(50, Math.floor(originalKB / 50) * 50)));
        setPendingFile(file);
        setShowSizeWarning(true);
      } else {
        processFile(file);
      }
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const isGif = pendingFile?.type === 'image/gif';

  const handleKeepOriginal = () => {
    if (!pendingFile) return;
    processFile(pendingFile);
    setShowSizeWarning(false);
    setPendingFile(null);
  };

  const handleCompress = async () => {
    if (!pendingFile) return;
    
    setIsCompressing(true);
    try {
      const target = targetKB * 1024;
      const compressedDataUrl = pendingFile.type === 'image/gif'
        ? await compressGif(pendingFile, target)
        : await compressImage(pendingFile, target);
      updateData({ imageUrl: compressedDataUrl });
    } catch (error) {
      console.error('Failed to compress image:', error);
      alert('Failed to compress image. Please try a different image.');
    } finally {
      setIsCompressing(false);
      setShowSizeWarning(false);
      setPendingFile(null);
    }
  };

  const handleCancelUpload = () => {
    setShowSizeWarning(false);
    setPendingFile(null);
  };

  const clearImage = () => {
    updateData({ imageUrl: '' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Size Warning Modal */}
      {showSizeWarning && pendingFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-theme-paper border border-theme-border rounded-button p-4 max-w-sm mx-4 shadow-lg">
            <div className="text-theme-ink font-bold mb-2 flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              Large Image Detected
            </div>
            <p className="text-theme-ink text-sm mb-3">
              This image is <strong>{formatFileSize(pendingFile.size)}</strong>, which may cause performance issues or exceed browser storage limits.
            </p>
            <p className="text-theme-muted text-xs mb-3">
              {isGif
                ? 'Compressing will reduce quality but preserve the animation. You can also keep the original or cancel.'
                : 'Choose a target size for the compressed image.'}
            </p>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-theme-ink">Target size</label>
                <span className="text-xs text-theme-muted tabular-nums">{targetKB} KB</span>
              </div>
              <input
                type="range"
                min={50}
                max={Math.min(5000, Math.max(500, Math.floor(pendingFile.size / 1024)))}
                step={50}
                value={targetKB}
                onChange={(e) => setTargetKB(Number(e.target.value))}
                disabled={isCompressing}
                className="w-full accent-theme-accent"
              />
              <div className="flex justify-between text-[10px] text-theme-muted mt-1">
                <span>50 KB</span>
                <span>{Math.min(5000, Math.max(500, Math.floor(pendingFile.size / 1024)))} KB</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleCompress}
                disabled={isCompressing}
                className="flex-1 px-3 py-2 bg-theme-accent text-theme-paper rounded-button text-sm hover:opacity-90 disabled:opacity-50"
              >
                {isCompressing ? 'Compressing...' : 'Compress'}
              </button>
              {isGif && (
                <button
                  onClick={handleKeepOriginal}
                  disabled={isCompressing}
                  className="flex-1 px-3 py-2 border border-theme-border rounded-button text-sm text-theme-ink hover:bg-theme-accent/10 disabled:opacity-50"
                >
                  Keep Original
                </button>
              )}
              <button
                onClick={handleCancelUpload}
                disabled={isCompressing}
                className="flex-1 px-3 py-2 border border-theme-border rounded-button text-sm text-theme-ink hover:bg-theme-accent/10 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <div className="relative">
          <input
            className="w-full px-3 py-2 pr-8 border border-theme-border rounded-button bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
            value={label || ''}
            onChange={(e) => updateData({ label: e.target.value })}
            placeholder="Portrait"
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
      </div>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Image</label>
        <div className="flex gap-2">
          <label className="flex-1 px-3 py-2 bg-theme-accent text-theme-paper rounded-button text-sm hover:opacity-90 cursor-pointer text-center">
            Upload Image
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          {imageUrl && (
            <button
              onClick={clearImage}
              className="px-3 py-2 border border-theme-border rounded-button text-sm text-theme-ink hover:bg-red-500 hover:text-white hover:border-red-500"
            >
              Clear
            </button>
          )}
        </div>
        {imageUrl && (
          <div className="mt-2 border border-theme-border rounded-button overflow-hidden">
            <img src={imageUrl} alt="Preview" className="w-full h-32 object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}

