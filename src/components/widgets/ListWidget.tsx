import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

export default function ListWidget({ widget, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, items = [], itemCount = 5 } = widget.data;

  // Fixed small sizing
  const labelClass = 'text-xs';
  const inputClass = 'text-xs py-0.5';
  const gapClass = 'gap-1';
  
  // Calculate list area height
  const labelHeight = 16;
  const gapSize = 4;
  const padding = 0;
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
      {label && (
        <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {label}
        </div>
      )}
      <div 
        className="space-y-1 overflow-y-auto flex-1"
        style={{ maxHeight: `${listHeight}px` }}
        onWheel={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight > el.clientHeight) {
            e.stopPropagation();
          }
        }}
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
