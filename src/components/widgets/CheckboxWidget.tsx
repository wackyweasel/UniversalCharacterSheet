import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface CheckboxItem {
  name: string;
  checked: boolean;
}

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

export default function CheckboxWidget({ widget, width, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, checkboxItems = [] } = widget.data;

  // Responsive sizing
  const isCompact = width < 160;
  const isLarge = width >= 300;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const itemClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const checkboxClass = isCompact ? 'w-4 h-4' : isLarge ? 'w-6 h-6' : 'w-5 h-5';
  const checkClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const gapClass = isCompact ? 'gap-1' : 'gap-2';
  
  // Calculate items area height
  const labelHeight = isCompact ? 16 : isLarge ? 24 : 20;
  const gapSize = isCompact ? 4 : 8;
  const padding = isCompact ? 8 : 16;
  const itemsHeight = Math.max(30, height - labelHeight - gapSize - padding * 2);

  const toggleItem = (index: number) => {
    const updated = [...checkboxItems] as CheckboxItem[];
    updated[index] = { ...updated[index], checked: !updated[index].checked };
    updateWidgetData(widget.id, { checkboxItems: updated });
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
        {label || 'Checklist'}
      </div>
      
      {/* Checkbox Items */}
      <div 
        className={`flex flex-col ${isCompact ? 'gap-0.5' : 'gap-1'} overflow-y-auto flex-1`}
        style={{ maxHeight: `${itemsHeight}px` }}
        onWheel={(e) => e.stopPropagation()}
      >
        {(checkboxItems as CheckboxItem[]).map((item, idx) => (
          <div key={idx} className={`flex items-center ${gapClass}`}>
            <button
              onClick={() => toggleItem(idx)}
              onMouseDown={(e) => e.stopPropagation()}
              className={`${checkboxClass} border-[length:var(--border-width)] border-theme-border flex items-center justify-center transition-colors flex-shrink-0 rounded-theme ${
                item.checked ? 'bg-theme-accent text-theme-paper' : 'bg-theme-paper hover:opacity-80'
              }`}
            >
              {item.checked && <span className={checkClass}>✓</span>}
            </button>
            <span className={`flex-1 ${itemClass} font-body text-theme-ink ${item.checked ? 'line-through text-theme-muted' : ''}`}>
              {item.name}
            </span>
          </div>
        ))}
        {checkboxItems.length === 0 && (
          <div className={`${itemClass} text-theme-muted italic`}>No items yet</div>
        )}
      </div>
    </div>
  );
}
