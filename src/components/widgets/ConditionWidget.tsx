import { Widget, ToggleItem } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

export default function ConditionWidget({ widget, width, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, toggleItems = [] } = widget.data;

  // Responsive sizing
  const isCompact = width < 180;
  const isLarge = width >= 350;
  const isShort = height < 100;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const toggleClass = isCompact || isShort ? 'px-1.5 py-0.5 text-[10px]' : isLarge ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs';
  const gapClass = isCompact || isShort ? 'gap-1' : 'gap-2';

  const toggleItem = (index: number) => {
    const updated = [...toggleItems];
    updated[index] = { ...updated[index], active: !updated[index].active };
    updateWidgetData(widget.id, { toggleItems: updated });
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {/* Header */}
      <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
        {label || 'Conditions'}
      </div>

      {/* Toggle Items */}
      <div className={`flex flex-wrap ${gapClass} overflow-y-auto flex-1 content-start`} onWheel={(e) => e.stopPropagation()}>
        {toggleItems.map((item: ToggleItem, idx: number) => (
          <button
            key={idx}
            onClick={() => toggleItem(idx)}
            onMouseDown={(e) => e.stopPropagation()}
            className={`${toggleClass} border border-theme-border transition-all rounded-theme font-body ${
              item.active 
                ? 'bg-theme-accent text-theme-paper' 
                : 'bg-theme-paper text-theme-ink hover:opacity-80'
            }`}
          >
            {item.name}
          </button>
        ))}
        {toggleItems.length === 0 && (
          <div className={`${toggleClass} text-theme-muted italic`}>No conditions configured</div>
        )}
      </div>
    </div>
  );
}
