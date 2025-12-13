import React from 'react';
import { EditorProps } from './types';

export function ImageEditor({ widget, updateData }: EditorProps) {
  const { label, imageUrl = '' } = widget.data;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        updateData({ imageUrl: dataUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    updateData({ imageUrl: '' });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-1">Widget Label</label>
        <input
          className="w-full px-3 py-2 border border-theme-border rounded-theme bg-theme-paper text-theme-ink focus:outline-none focus:border-theme-accent"
          value={label || ''}
          onChange={(e) => updateData({ label: e.target.value })}
          placeholder="Portrait"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-theme-ink mb-2">Image</label>
        <div className="flex gap-2">
          <label className="flex-1 px-3 py-2 bg-theme-accent text-theme-paper rounded-theme text-sm hover:opacity-90 cursor-pointer text-center">
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
              className="px-3 py-2 border border-theme-border rounded-theme text-sm text-theme-ink hover:bg-red-500 hover:text-white hover:border-red-500"
            >
              Clear
            </button>
          )}
        </div>
        {imageUrl && (
          <div className="mt-2 border border-theme-border rounded-theme overflow-hidden">
            <img src={imageUrl} alt="Preview" className="w-full h-32 object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}
