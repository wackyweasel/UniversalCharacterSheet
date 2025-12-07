import { Widget } from '../../types';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

export default function ImageWidget({ widget, width, height }: Props) {
  const { label, imageUrl = '' } = widget.data;

  // Responsive sizing
  const isCompact = width < 160;
  const isLarge = width >= 300;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const placeholderIconClass = isCompact ? 'text-2xl' : isLarge ? 'text-6xl' : 'text-4xl';
  const placeholderTextClass = isCompact ? 'text-[10px]' : isLarge ? 'text-base' : 'text-sm';
  const gapClass = isCompact ? 'gap-1' : 'gap-2';
  
  // Calculate image area height
  const labelHeight = isCompact ? 16 : isLarge ? 24 : 20;
  const gapSize = isCompact ? 4 : 8;
  const padding = isCompact ? 8 : 16;
  const imageHeight = Math.max(40, height - labelHeight - gapSize - padding * 2);

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      <div className={`font-bold text-center ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
        {label || 'Portrait'}
      </div>

      {/* Image Display */}
      <div 
        className={`border-[length:var(--border-width)] border-theme-border bg-theme-background flex items-center justify-center overflow-hidden rounded-theme flex-1`}
        style={{ height: `${imageHeight}px` }}
      >
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
