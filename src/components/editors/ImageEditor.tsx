import { EditorProps } from './types';
import { Tooltip } from '../Tooltip';
import { ImageUploadButton } from '../ImageUploadButton';

export function ImageEditor({ widget, updateData }: EditorProps) {
  const { label, imageUrl = '' } = widget.data;

  const clearImage = () => {
    updateData({ imageUrl: '' });
  };

  return (
    <div className="space-y-4">
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
          <ImageUploadButton
            onImageReady={(dataUrl) => updateData({ imageUrl: dataUrl })}
            className="flex-1 px-3 py-2 bg-theme-accent text-theme-paper rounded-button text-sm hover:opacity-90 cursor-pointer text-center"
          >
            Upload Image or GIF
          </ImageUploadButton>
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

