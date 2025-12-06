import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

export default function ImageWidget({ widget, mode, width, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, imageUrl = '' } = widget.data;

  // Responsive sizing
  const isCompact = width < 160 || height < 120;
  const isLarge = width >= 300 && height >= 250;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const buttonClass = isCompact ? 'text-[10px] px-1 py-0.5' : isLarge ? 'text-sm px-3 py-1.5' : 'text-xs px-2 py-1';
  const placeholderIconClass = isCompact ? 'text-2xl' : isLarge ? 'text-6xl' : 'text-4xl';
  const placeholderTextClass = isCompact ? 'text-[10px]' : isLarge ? 'text-base' : 'text-sm';
  const gapClass = isCompact ? 'gap-1' : 'gap-2';
  const minHeightClass = isCompact ? 'min-h-[40px]' : isLarge ? 'min-h-[100px]' : 'min-h-[60px]';

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateWidgetData(widget.id, { label: e.target.value });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        updateWidgetData(widget.id, { imageUrl: dataUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    updateWidgetData(widget.id, { imageUrl: '' });
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      <input
        className={`font-bold bg-transparent border-b border-transparent hover:border-theme-border/50 focus:border-theme-border focus:outline-none text-center ${labelClass} flex-shrink-0 text-theme-ink font-heading`}
        value={label}
        onChange={handleLabelChange}
        placeholder="Portrait"
        disabled={mode === 'play'}
        onMouseDown={(e) => e.stopPropagation()}
      />

      {/* Image Display */}
      <div className={`flex-1 border-[length:var(--border-width)] border-theme-border bg-theme-background flex items-center justify-center overflow-hidden ${minHeightClass} rounded-theme`}>
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={label || 'Character'} 
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className={`text-theme-muted text-center ${isCompact ? 'p-1' : 'p-2'}`}>
            <div className={`${placeholderIconClass} mb-1`}>👤</div>
            <span className={`${placeholderTextClass} font-body`}>No image</span>
          </div>
        )}
      </div>

      {/* Edit Controls */}
      {mode === 'edit' && (
        <div className="flex gap-1">
          <label className={`flex-1 ${buttonClass} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors text-center cursor-pointer text-theme-ink rounded-theme`}>
            Upload
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
              onMouseDown={(e) => e.stopPropagation()}
              className={`${buttonClass} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors text-theme-ink rounded-theme`}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
