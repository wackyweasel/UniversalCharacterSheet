import { useState } from 'react';
import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

export default function ListWidget({ widget, width }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, items = [] } = widget.data;
  const [newItem, setNewItem] = useState('');

  // Responsive sizing
  const isCompact = width < 160;
  const isLarge = width >= 300;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const itemClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const inputClass = isCompact ? 'text-xs py-0.5' : isLarge ? 'text-base py-2' : 'text-sm py-1';
  const buttonClass = isCompact ? 'text-base' : isLarge ? 'text-2xl' : 'text-lg';
  const gapClass = isCompact ? 'gap-1' : 'gap-2';

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.trim()) {
      updateWidgetData(widget.id, { items: [...items, newItem] });
      setNewItem('');
    }
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    updateWidgetData(widget.id, { items: newItems });
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full`}>
      <div className={`font-bold ${labelClass} text-theme-ink font-heading`}>
        {label || 'List'}
      </div>
      <ul className="space-y-1">
        {items.map((item: string, idx: number) => (
          <li key={idx} className={`flex justify-between items-center group ${itemClass} text-theme-ink font-body`}>
            <span>• {item}</span>
            <button 
              onClick={() => removeItem(idx)}
              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 px-1 flex-shrink-0"
              onMouseDown={(e) => e.stopPropagation()}
            >
              ×
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <li className={`${itemClass} text-theme-muted italic`}>No items yet</li>
        )}
      </ul>
      <form onSubmit={addItem} className="flex gap-1 flex-shrink-0">
        <input
          className={`flex-1 border-b border-theme-border/50 focus:border-theme-border focus:outline-none ${inputClass} min-w-0 bg-transparent text-theme-ink font-body`}
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add item..."
          onMouseDown={(e) => e.stopPropagation()}
        />
        <button 
          type="submit"
          className={`${buttonClass} font-bold hover:text-theme-muted px-1 flex-shrink-0 text-theme-ink`}
          onMouseDown={(e) => e.stopPropagation()}
        >
          +
        </button>
      </form>
    </div>
  );
}
