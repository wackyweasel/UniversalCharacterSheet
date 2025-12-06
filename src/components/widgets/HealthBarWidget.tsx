import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

export default function HealthBarWidget({ widget, mode, width, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, currentValue = 10, maxValue = 10 } = widget.data;

  const percentage = Math.min(100, Math.max(0, (currentValue / maxValue) * 100));

  // Responsive sizing
  const isCompact = width < 180 || height < 120;
  const isLarge = width >= 350 && height >= 200;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const barHeight = isCompact ? 'h-4' : isLarge ? 'h-10' : 'h-6';
  const barTextClass = isCompact ? 'text-xs' : isLarge ? 'text-lg' : 'text-sm';
  const buttonClass = isCompact ? 'px-1 py-0.5 text-[10px]' : isLarge ? 'px-3 py-2 text-sm' : 'px-2 py-1 text-xs';
  const gapClass = isCompact ? 'gap-1' : 'gap-2';

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateWidgetData(widget.id, { label: e.target.value });
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 1;
    updateWidgetData(widget.id, { maxValue: val, currentValue: Math.min(currentValue, val) });
  };

  const adjustCurrent = (delta: number) => {
    const newVal = Math.max(0, Math.min(maxValue, currentValue + delta));
    updateWidgetData(widget.id, { currentValue: newVal });
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      <input
        className={`font-bold bg-transparent border-b border-transparent hover:border-theme-border/50 focus:border-theme-border focus:outline-none w-full flex-shrink-0 ${labelClass} text-theme-ink font-heading`}
        value={label}
        onChange={handleLabelChange}
        placeholder="Health"
        disabled={mode === 'play'}
        onMouseDown={(e) => e.stopPropagation()}
      />
      
      {/* Health Bar */}
      <div className={`relative ${barHeight} border-[length:var(--border-width)] border-theme-border bg-theme-paper overflow-hidden flex-shrink-0 rounded-theme`}>
        <div 
          className="absolute top-0 left-0 h-full transition-all duration-300 bg-theme-accent"
          style={{ width: `${percentage}%` }}
        />
        <div className={`absolute inset-0 flex items-center justify-center font-bold ${barTextClass} text-theme-ink mix-blend-difference`}>
          {currentValue} / {maxValue}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-1">
        <button
          onClick={() => adjustCurrent(-5)}
          onMouseDown={(e) => e.stopPropagation()}
          className={`${buttonClass} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors text-theme-ink rounded-theme`}
        >
          -5
        </button>
        <button
          onClick={() => adjustCurrent(-1)}
          onMouseDown={(e) => e.stopPropagation()}
          className={`${buttonClass} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors text-theme-ink rounded-theme`}
        >
          -1
        </button>
        <button
          onClick={() => adjustCurrent(1)}
          onMouseDown={(e) => e.stopPropagation()}
          className={`${buttonClass} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors text-theme-ink rounded-theme`}
        >
          +1
        </button>
        <button
          onClick={() => adjustCurrent(5)}
          onMouseDown={(e) => e.stopPropagation()}
          className={`${buttonClass} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors text-theme-ink rounded-theme`}
        >
          +5
        </button>
      </div>

      {/* Max Value Editor (edit mode only) */}
      {mode === 'edit' && (
        <div className={`flex items-center gap-2 ${isCompact ? 'text-[10px]' : 'text-xs'} text-theme-ink`}>
          <span>Max:</span>
          <input
            type="number"
            value={maxValue}
            onChange={handleMaxChange}
            className={`w-16 border border-theme-border/50 px-1 py-0.5 focus:border-theme-border focus:outline-none ${isCompact ? 'text-[10px]' : 'text-xs'} bg-theme-paper text-theme-ink rounded-theme`}
            min={1}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
