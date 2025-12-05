import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

export default function PoolWidget({ widget, mode, width, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { 
    label, 
    maxPool = 5, 
    currentPool = 5, 
    poolStyle = 'dots' // 'dots' | 'boxes' | 'hearts'
  } = widget.data;

  // Responsive sizing
  const isCompact = width < 160 || height < 100;
  const isLarge = width >= 300 && height >= 200;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const selectClass = isCompact ? 'text-[10px] px-0.5' : isLarge ? 'text-sm px-2' : 'text-xs px-1';
  const symbolSize = isCompact ? 'w-5 h-5 text-sm' : isLarge ? 'w-8 h-8 text-xl' : 'w-6 h-6 text-base';
  const counterClass = isCompact ? 'text-[10px]' : isLarge ? 'text-sm' : 'text-xs';
  const inputClass = isCompact ? 'w-8 text-[10px]' : isLarge ? 'w-14 text-sm' : 'w-12 text-xs';
  const buttonClass = isCompact ? 'text-[10px] px-1 py-0.5' : isLarge ? 'text-sm px-3 py-1.5' : 'text-xs px-2 py-1';
  const gapClass = isCompact ? 'gap-1' : 'gap-2';

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateWidgetData(widget.id, { label: e.target.value });
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 1;
    const newMax = Math.max(1, Math.min(20, val));
    updateWidgetData(widget.id, { 
      maxPool: newMax,
      currentPool: Math.min(currentPool, newMax)
    });
  };

  const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateWidgetData(widget.id, { poolStyle: e.target.value });
  };

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
    return `${base} ${filled ? 'text-black' : 'text-gray-400'}`;
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      <div className={`flex items-center ${gapClass} flex-shrink-0`}>
        <input
          className={`font-bold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-black focus:outline-none flex-1 ${labelClass} min-w-0`}
          value={label}
          onChange={handleLabelChange}
          placeholder="Resource Pool"
          disabled={mode === 'play'}
          onMouseDown={(e) => e.stopPropagation()}
        />
        {mode === 'edit' && (
          <select
            value={poolStyle}
            onChange={handleStyleChange}
            className={`${selectClass} border border-gray-300 py-0.5 focus:border-black focus:outline-none bg-white`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <option value="dots">Dots</option>
            <option value="boxes">Boxes</option>
            <option value="hearts">Hearts</option>
          </select>
        )}
      </div>

      {/* Pool Display */}
      <div className={`flex flex-wrap ${isCompact ? 'gap-0.5' : 'gap-1'}`}>
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
      <div className={`${counterClass} text-center text-gray-600`}>
        {currentPool} / {maxPool}
      </div>

      {/* Edit Controls */}
      {mode === 'edit' && (
        <div className={`flex items-center ${gapClass} ${counterClass} border-t border-gray-200 pt-2`}>
          <span>Max:</span>
          <input
            type="number"
            value={maxPool}
            onChange={handleMaxChange}
            className={`${inputClass} border border-gray-300 px-1 py-0.5 focus:border-black focus:outline-none`}
            min={1}
            max={20}
            onMouseDown={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => updateWidgetData(widget.id, { currentPool: maxPool })}
            onMouseDown={(e) => e.stopPropagation()}
            className={`ml-auto ${buttonClass} border border-black hover:bg-black hover:text-white transition-colors`}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
