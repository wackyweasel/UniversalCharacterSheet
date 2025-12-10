import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

export default function PoolWidget({ widget }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { 
    label, 
    maxPool = 5, 
    currentPool = 5, 
    poolStyle = 'dots' // 'dots' | 'boxes' | 'hearts'
  } = widget.data;

  // Fixed small sizing
  const labelClass = 'text-xs';
  const symbolSize = 'w-5 h-5 text-sm';
  const counterClass = 'text-[10px]';
  const gapClass = 'gap-1';

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

  const getClassName = (filled: boolean) => {
    const base = `${symbolSize} flex items-center justify-center transition-all cursor-pointer hover:scale-125`;
    // Emoji styles don't need color classes
    const emojiStyles = ['hearts', 'flames', 'skulls', 'shields', 'swords', 'lightning', 'moons', 'suns', 'coins', 'gems'];
    if (emojiStyles.includes(poolStyle)) {
      return base;
    }
    return `${base} ${filled ? 'text-theme-ink' : 'text-theme-muted'}`;
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {label && (
        <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {label}
        </div>
      )}

      {/* Pool Display */}
      <div className={`flex flex-wrap gap-0.5 flex-1 content-start overflow-y-auto`} onWheel={(e) => {
        const el = e.currentTarget;
        if (el.scrollHeight > el.clientHeight) {
          e.stopPropagation();
        }
      }}>
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
