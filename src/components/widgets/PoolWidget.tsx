import { Widget, PoolResource } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
}

// Helper to get symbol for a style
const getSymbolForStyle = (filled: boolean, style: string) => {
  switch (style) {
    case 'hearts':
      return filled ? '❤️' : '🖤';
    case 'boxes':
      return filled ? '■' : '□';
    case 'stars':
      return filled ? '★' : '☆';
    case 'diamonds':
      return filled ? '◆' : '◇';
    case 'crosses':
      return filled ? '✖' : '✕';
    case 'checkmarks':
      return filled ? '✔' : '○';
    case 'flames':
      return filled ? '🔥' : '·';
    case 'skulls':
      return filled ? '💀' : '·';
    case 'shields':
      return filled ? '🛡️' : '·';
    case 'swords':
      return filled ? '⚔️' : '·';
    case 'lightning':
      return filled ? '⚡' : '·';
    case 'moons':
      return filled ? '🌙' : '·';
    case 'suns':
      return filled ? '☀️' : '·';
    case 'coins':
      return filled ? '🪙' : '·';
    case 'gems':
      return filled ? '💎' : '·';
    case 'dots':
    default:
      return filled ? '●' : '○';
  }
};

// Helper to get className for a style
const getClassNameForStyle = (filled: boolean, style: string, symbolSize: string) => {
  const base = `${symbolSize} flex items-center justify-center transition-all cursor-pointer hover:scale-125`;
  const emojiStyles = ['hearts', 'flames', 'skulls', 'shields', 'swords', 'lightning', 'moons', 'suns', 'coins', 'gems'];
  if (emojiStyles.includes(style)) {
    return base;
  }
  return `${base} ${filled ? 'text-theme-ink' : 'text-theme-muted'}`;
};

export default function PoolWidget({ widget, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { 
    label, 
    maxPool = 5, 
    currentPool = 5, 
    poolStyle = 'dots',
    showPoolCount = true,
    poolResources = [],
    inlineLabels = false
  } = widget.data;

  // Fixed small sizing
  const labelClass = 'text-xs';
  const symbolSize = 'w-5 h-5 text-sm';
  const counterClass = 'text-[10px]';
  const gapClass = 'gap-1';

  // If poolResources has items, use multi-resource mode
  const hasMultipleResources = poolResources.length > 0;

  // Toggle point for legacy single pool
  const togglePoint = (index: number) => {
    if (index < currentPool) {
      updateWidgetData(widget.id, { currentPool: index });
    } else {
      updateWidgetData(widget.id, { currentPool: index + 1 });
    }
  };

  // Toggle point for a specific resource
  const toggleResourcePoint = (resourceIndex: number, pointIndex: number) => {
    const resource = poolResources[resourceIndex];
    const newResources = [...poolResources];
    if (pointIndex < resource.current) {
      newResources[resourceIndex] = { ...resource, current: pointIndex };
    } else {
      newResources[resourceIndex] = { ...resource, current: pointIndex + 1 };
    }
    updateWidgetData(widget.id, { poolResources: newResources });
  };

  // Calculate available height for scrollable area
  const headerHeight = label ? 20 : 0;
  const availableHeight = height - headerHeight - 8;

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {label && (
        <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {label}
        </div>
      )}

      {hasMultipleResources ? (
        // Multiple resources mode
        <div 
          className={`flex flex-col gap-2 flex-1 overflow-y-auto pr-1`}
          style={{ maxHeight: `${availableHeight}px` }}
          onWheel={(e) => {
            const el = e.currentTarget;
            if (el.scrollHeight > el.clientHeight) {
              e.stopPropagation();
            }
          }}
        >
          {poolResources.map((resource: PoolResource, idx: number) => (
            <div key={idx} className={`flex flex-col ${gapClass}`}>
              {resource.name && !inlineLabels && (
                <div className={`font-medium ${counterClass} text-theme-ink font-body`}>
                  {resource.name}
                </div>
              )}
              <div className={`flex ${inlineLabels ? 'justify-between items-center' : 'flex-wrap gap-0.5 content-start items-center'}`}>
                {resource.name && inlineLabels && (
                  <span className={`font-medium ${counterClass} text-theme-ink font-body`}>
                    {resource.name}
                  </span>
                )}
                <div className={`flex ${inlineLabels ? 'gap-0.5' : 'flex-wrap gap-0.5'}`}>
                {Array.from({ length: resource.max }).map((_, pointIdx) => (
                  <button
                    key={pointIdx}
                    onClick={() => toggleResourcePoint(idx, pointIdx)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={getClassNameForStyle(pointIdx < resource.current, resource.style, symbolSize)}
                    title={pointIdx < resource.current ? 'Click to use' : 'Click to restore'}
                  >
                    {getSymbolForStyle(pointIdx < resource.current, resource.style)}
                  </button>
                ))}
                </div>
              </div>
              {showPoolCount && (
                <div className={`${counterClass} text-theme-muted font-body`}>
                  {resource.current} / {resource.max}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        // Legacy single pool mode
        <>
          <div 
            className={`flex flex-wrap gap-0.5 flex-1 content-start overflow-y-auto`} 
            onWheel={(e) => {
              const el = e.currentTarget;
              if (el.scrollHeight > el.clientHeight) {
                e.stopPropagation();
              }
            }}
          >
            {Array.from({ length: maxPool }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => togglePoint(idx)}
                onMouseDown={(e) => e.stopPropagation()}
                className={getClassNameForStyle(idx < currentPool, poolStyle, symbolSize)}
                title={idx < currentPool ? 'Click to use' : 'Click to restore'}
              >
                {getSymbolForStyle(idx < currentPool, poolStyle)}
              </button>
            ))}
          </div>

          {showPoolCount && (
            <div className={`${counterClass} text-center text-theme-muted font-body flex-shrink-0`}>
              {currentPool} / {maxPool}
            </div>
          )}
        </>
      )}
    </div>
  );
}






