import React, { useState } from 'react';
import { EditorProps } from './types';

const SIZE_LIMIT = 500 * 1024; // 1MB
const TARGET_SIZE = 500 * 1024; // 500KB

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
        setPendingFile(file);
        setShowSizeWarning(true);
      } else {
        processFile(file);
      }
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleCompress = async () => {
    if (!pendingFile) return;
    
    setIsCompressing(true);
    try {
      const compressedDataUrl = await compressImage(pendingFile, TARGET_SIZE);
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
            <p className="text-theme-muted text-xs mb-4">
              We recommend compressing it to approximately 500 KB for better performance.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleCompress}
                disabled={isCompressing}
                className="flex-1 px-3 py-2 bg-theme-accent text-theme-paper rounded-button text-sm hover:opacity-90 disabled:opacity-50"
              >
                {isCompressing ? 'Compressing...' : 'Compress'}
              </button>
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
            <button
              type="button"
              onClick={() => updateData({ label: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-ink transition-colors"
              title="Clear label"
            >
              ×
            </button>
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

