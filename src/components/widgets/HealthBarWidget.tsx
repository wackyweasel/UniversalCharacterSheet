import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

export default function HealthBarWidget({ widget, width }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, currentValue = 10, maxValue = 10 } = widget.data;

  const percentage = Math.min(100, Math.max(0, (currentValue / maxValue) * 100));

  // Responsive sizing
  const isCompact = width < 180;
  const isLarge = width >= 350;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const barHeight = isCompact ? 'h-4' : isLarge ? 'h-10' : 'h-6';
  const barTextClass = isCompact ? 'text-xs' : isLarge ? 'text-lg' : 'text-sm';
  const buttonClass = isCompact ? 'px-1 py-0.5 text-[10px]' : isLarge ? 'px-3 py-2 text-sm' : 'px-2 py-1 text-xs';
  const gapClass = isCompact ? 'gap-1' : 'gap-2';

  const adjustCurrent = (delta: number) => {
    const newVal = Math.max(0, Math.min(maxValue, currentValue + delta));
    updateWidgetData(widget.id, { currentValue: newVal });
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full`}>
      <div className={`font-bold ${labelClass} text-theme-ink font-heading`}>
        {label || 'Health'}
      </div>
      
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
    </div>
  );
}
