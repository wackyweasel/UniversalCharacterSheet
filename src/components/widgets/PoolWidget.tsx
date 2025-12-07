import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

export default function PoolWidget({ widget, width, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { 
    label, 
    maxPool = 5, 
    currentPool = 5, 
    poolStyle = 'dots' // 'dots' | 'boxes' | 'hearts'
  } = widget.data;

  // Responsive sizing
  const isCompact = width < 160;
  const isLarge = width >= 300;
  const isShort = height < 100;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const symbolSize = isCompact || isShort ? 'w-5 h-5 text-sm' : isLarge ? 'w-8 h-8 text-xl' : 'w-6 h-6 text-base';
  const counterClass = isCompact || isShort ? 'text-[10px]' : isLarge ? 'text-sm' : 'text-xs';
  const gapClass = isCompact || isShort ? 'gap-1' : 'gap-2';

  const togglePoint = (index: number) => {
    // If clicking on a filled point, empty from that point onwards
    // If clicking on an empty point, fill up to that point
    if (index < currentPool) {
      updateWidgetData(widget.id, { currentPool: index });
    } else {
      updateWidgetData(widget.id, { currentPool: index + 1 });
    }
  };

  const getSymbol = (filled: boolean) => {
    switch (poolStyle) {
      case 'hearts':
        return filled ? '❤️' : '🖤';
      case 'boxes':
        return filled ? '■' : '□';
      case 'dots':
      default:
        return filled ? '●' : '○';
    }
  };

  const getClassName = (filled: boolean) => {
    const base = `${symbolSize} flex items-center justify-center transition-all cursor-pointer hover:scale-125`;
    if (poolStyle === 'hearts') {
      return base;
    }
    return `${base} ${filled ? 'text-theme-ink' : 'text-theme-muted'}`;
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
        {label || 'Resource Pool'}
      </div>

      {/* Pool Display */}
      <div className={`flex flex-wrap ${isCompact || isShort ? 'gap-0.5' : 'gap-1'} flex-1 content-start overflow-y-auto`} onWheel={(e) => e.stopPropagation()}>
        {Array.from({ length: maxPool }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => togglePoint(idx)}
            onMouseDown={(e) => e.stopPropagation()}
            className={getClassName(idx < currentPool)}
            title={idx < currentPool ? 'Click to use' : 'Click to restore'}
          >
            {getSymbol(idx < currentPool)}
          </button>
        ))}
      </div>

      {/* Counter */}
      <div className={`${counterClass} text-center text-theme-muted font-body flex-shrink-0`}>
        {currentPool} / {maxPool}
      </div>
    </div>
  );
}
