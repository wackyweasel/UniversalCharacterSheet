import { useState } from 'react';
import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

export default function ListWidget({ widget, mode, width, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, items = [] } = widget.data;
  const [newItem, setNewItem] = useState('');

  // Responsive sizing
  const isCompact = width < 160 || height < 100;
  const isLarge = width >= 300 && height >= 200;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const itemClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const inputClass = isCompact ? 'text-xs py-0.5' : isLarge ? 'text-base py-2' : 'text-sm py-1';
  const buttonClass = isCompact ? 'text-base' : isLarge ? 'text-2xl' : 'text-lg';
  const gapClass = isCompact ? 'gap-1' : 'gap-2';

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateWidgetData(widget.id, { label: e.target.value });
  };

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
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      <input
        className={`font-bold bg-transparent border-b border-transparent hover:border-theme-border/50 focus:border-theme-border focus:outline-none w-full flex-shrink-0 ${labelClass} text-theme-ink font-heading`}
        value={label}
        onChange={handleLabelChange}
        placeholder="List Title"
        disabled={mode === 'play'}
      />
      <ul className="space-y-1 flex-1 overflow-y-auto min-h-0">
        {items.map((item, idx) => (
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
