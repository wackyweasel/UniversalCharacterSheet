import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

interface NumberItem {
  name: string;
  value: number;
}

export default function NumberWidget({ widget, width, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, numberItems = [] } = widget.data;

  // Responsive sizing based on widget dimensions
  const isCompact = width < 180;
  const isLarge = width >= 300;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const itemClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const buttonSize = isCompact ? 'w-5 h-5 text-xs' : isLarge ? 'w-8 h-8 text-base' : 'w-6 h-6 text-sm';
  const valueClass = isCompact ? 'text-sm w-8' : isLarge ? 'text-xl w-14' : 'text-base w-10';
  const gapClass = isCompact ? 'gap-1' : 'gap-2';
  
  // Calculate items area height
  const labelHeight = isCompact ? 16 : isLarge ? 24 : 20;
  const gapSize = isCompact ? 4 : 8;
  const padding = isCompact ? 8 : 16;
  const itemsHeight = Math.max(30, height - labelHeight - gapSize - padding * 2);

  const adjustItemValue = (index: number, delta: number) => {
    const updated = [...numberItems] as NumberItem[];
    updated[index] = { ...updated[index], value: updated[index].value + delta };
    updateWidgetData(widget.id, { numberItems: updated });
  };

  // Fixed width for the value controls section to ensure alignment across all rows
  const controlsSectionWidth = isCompact ? 'w-[62px]' : isLarge ? 'w-[94px]' : 'w-[74px]';

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
        {label || 'Trackers'}
      </div>

      {/* Number Items */}
      <div 
        className={`flex flex-col ${isCompact ? 'gap-0.5' : 'gap-1'} overflow-y-auto overflow-x-hidden flex-1 pr-4`}
        style={{ maxHeight: `${itemsHeight}px` }}
        onWheel={(e) => e.stopPropagation()}
      >
        {(numberItems as NumberItem[]).map((item, idx) => (
          <div key={idx} className={`flex items-center ${gapClass}`}>
            {/* Item Name */}
            <span className={`flex-1 ${itemClass} text-theme-ink font-body truncate`}>
              {item.name}
            </span>

            {/* Value Controls - fixed width container for alignment */}
            <div className={`flex items-center justify-center gap-0.5 flex-shrink-0 ${controlsSectionWidth}`}>
              <button
                onClick={() => adjustItemValue(idx, -1)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`${buttonSize} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center justify-center text-theme-ink rounded-theme flex-shrink-0`}
              >
                -
              </button>
              <span className={`${valueClass} text-center font-bold text-theme-ink flex-shrink-0`}>
                {item.value}
              </span>
              <button
                onClick={() => adjustItemValue(idx, 1)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`${buttonSize} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center justify-center text-theme-ink rounded-theme flex-shrink-0`}
              >
                +
              </button>
            </div>
          </div>
        ))}
        {numberItems.length === 0 && (
          <div className={`${itemClass} text-theme-muted italic`}>No items yet</div>
        )}
      </div>
    </div>
  );
}
