import { Widget, CheckboxItem } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
}

export default function CheckboxWidget({ widget, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, checkboxItems = [], checklistSettings } = widget.data;
  const strikethrough = checklistSettings?.strikethrough !== false; // Default to true

  // Fixed small sizing
  const labelClass = 'text-xs';
  const itemClass = 'text-xs';
  const checkboxClass = 'w-4 h-4';
  const checkClass = 'text-xs';
  const gapClass = 'gap-1';
  
  // Calculate items area height
  const labelHeight = 16;
  const gapSize = 4;
  const padding = 0;
  const itemsHeight = Math.max(30, height - labelHeight - gapSize - padding * 2);

  const toggleItem = (index: number) => {
    const updated = [...checkboxItems] as CheckboxItem[];
    updated[index] = { ...updated[index], checked: !updated[index].checked };
    updateWidgetData(widget.id, { checkboxItems: updated });
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {label && (
        <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {label}
        </div>
      )}
      
      {/* Checkbox Items */}
      <div 
        className={`flex flex-col gap-0.5 overflow-y-auto flex-1`}
        style={{ maxHeight: `${itemsHeight}px` }}
        onWheel={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight > el.clientHeight) {
            e.stopPropagation();
          }
        }}
      >
        {(checkboxItems as CheckboxItem[]).map((item, idx) => (
          <div 
            key={idx} 
            className={`flex items-center ${gapClass} cursor-pointer`}
            onClick={() => toggleItem(idx)}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className={`${checkboxClass} border border-theme-border flex items-center justify-center transition-colors flex-shrink-0 rounded-button ${
                item.checked ? 'bg-theme-accent text-theme-paper' : 'bg-theme-paper hover:opacity-80'
              }`}
            >
              {item.checked && <span className={checkClass}>✓</span>}
            </div>
            <span className={`flex-1 ${itemClass} font-body text-theme-ink ${item.checked && strikethrough ? 'line-through text-theme-muted' : ''}`}>
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






