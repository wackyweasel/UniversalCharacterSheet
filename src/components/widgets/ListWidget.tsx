import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

export default function ListWidget({ widget, width, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, items = [], itemCount = 5 } = widget.data;

  // Responsive sizing
  const isCompact = width < 160;
  const isLarge = width >= 300;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const inputClass = isCompact ? 'text-xs py-0.5' : isLarge ? 'text-base py-1' : 'text-sm py-0.5';
  const gapClass = isCompact ? 'gap-1' : 'gap-2';
  
  // Calculate list area height
  const labelHeight = isCompact ? 16 : isLarge ? 24 : 20;
  const gapSize = isCompact ? 4 : 8;
  const padding = isCompact ? 8 : 16;
  const listHeight = Math.max(40, height - labelHeight - gapSize - padding * 2);

  // Ensure items array matches itemCount
  const normalizedItems = Array.from({ length: itemCount }, (_, i) => items[i] || '');

  const updateItem = (index: number, value: string) => {
    const newItems = [...normalizedItems];
    newItems[index] = value;
    updateWidgetData(widget.id, { items: newItems });
  };

  const clearItem = (index: number) => {
    const newItems = [...normalizedItems];
    newItems[index] = '';
    updateWidgetData(widget.id, { items: newItems });
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
        {label || 'List'}
      </div>
      <div 
        className="space-y-1 overflow-y-auto flex-1"
        style={{ maxHeight: `${listHeight}px` }}
        onWheel={(e) => e.stopPropagation()}
      >
        {normalizedItems.map((item: string, idx: number) => (
          <div key={idx} className="flex items-center gap-1 group">
            <span className="text-theme-ink">•</span>
            <input
              className={`flex-1 border-b border-theme-border/50 focus:border-theme-border focus:outline-none ${inputClass} min-w-0 bg-transparent text-theme-ink font-body`}
              value={item}
              onChange={(e) => updateItem(idx, e.target.value)}
              placeholder="..."
              onMouseDown={(e) => e.stopPropagation()}
            />
            <button 
              onClick={() => clearItem(idx)}
              className="opacity-0 group-hover:opacity-100 text-theme-muted hover:text-theme-ink px-1 flex-shrink-0"
              onMouseDown={(e) => e.stopPropagation()}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
