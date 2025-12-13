import { Widget } from '../../types';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

export default function ImageWidget({ widget, width, height }: Props) {
  const { label, imageUrl = '' } = widget.data;

  // Fixed small sizing
  const labelClass = 'text-xs';
  const placeholderIconClass = 'text-2xl';
  const placeholderTextClass = 'text-[10px]';
  const gapClass = 'gap-1';
  
  // Detect vertical mode (very large height passed from VerticalWidget)
  const isVerticalMode = height > 1000;
  
  // Calculate image area height
  const labelHeight = 16;
  const gapSize = 4;
  const padding = 0;
  
  // In vertical mode, limit to a reasonable max height (same as width for square-ish display)
  // In grid mode, calculate based on available height
  const imageHeight = isVerticalMode 
    ? Math.min(300, width)  // Cap at 300px or width, whichever is smaller
    : Math.max(40, height - labelHeight - gapSize - padding * 2);

  return (
    <div className={`flex flex-col ${gapClass} w-full ${isVerticalMode ? '' : 'h-full'}`}>
      {label && (
        <div className={`font-bold text-center ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {label}
        </div>
      )}

      {/* Image Display */}
      <div 
        className={`border-[length:var(--border-width)] border-theme-border bg-theme-background flex items-center justify-center overflow-hidden rounded-theme ${isVerticalMode ? '' : 'flex-1'}`}
        style={{ height: `${imageHeight}px` }}
      >
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={label || 'Character'} 
            className={`w-full h-full ${isVerticalMode ? 'object-contain' : 'object-cover'}`}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
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
