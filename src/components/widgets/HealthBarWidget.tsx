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

  // Responsive sizing
  const isCompact = width < 180;
  const isLarge = width >= 350;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
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
      
      {/* Health Value */}
      <div className={`flex items-center justify-center font-bold ${barTextClass} text-theme-ink`}>
        {currentValue} / {maxValue}
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
