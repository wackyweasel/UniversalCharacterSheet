import { Widget } from '../../types';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

export default function ImageWidget({ widget, width }: Props) {
  const { label, imageUrl = '' } = widget.data;

  // Responsive sizing
  const isCompact = width < 160;
  const isLarge = width >= 300;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const placeholderIconClass = isCompact ? 'text-2xl' : isLarge ? 'text-6xl' : 'text-4xl';
  const placeholderTextClass = isCompact ? 'text-[10px]' : isLarge ? 'text-base' : 'text-sm';
  const gapClass = isCompact ? 'gap-1' : 'gap-2';
  const minHeightClass = isCompact ? 'min-h-[60px]' : isLarge ? 'min-h-[120px]' : 'min-h-[80px]';

  return (
    <div className={`flex flex-col ${gapClass} w-full`}>
      <div className={`font-bold text-center ${labelClass} text-theme-ink font-heading`}>
        {label || 'Portrait'}
      </div>

      {/* Image Display */}
      <div className={`border-[length:var(--border-width)] border-theme-border bg-theme-background flex items-center justify-center overflow-hidden ${minHeightClass} rounded-theme`}>
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
    </div>
  );
}
