import { useState } from 'react';
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

export default function CheckboxWidget({ widget, mode, width, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, checkboxItems = [] } = widget.data;
  const [newItemName, setNewItemName] = useState('');

  // Responsive sizing
  const isCompact = width < 160 || height < 100;
  const isLarge = width >= 300 && height >= 200;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const itemClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const checkboxClass = isCompact ? 'w-4 h-4' : isLarge ? 'w-6 h-6' : 'w-5 h-5';
  const checkClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const gapClass = isCompact ? 'gap-1' : 'gap-2';

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateWidgetData(widget.id, { label: e.target.value });
  };

  const toggleItem = (index: number) => {
    const updated = [...checkboxItems] as CheckboxItem[];
    updated[index] = { ...updated[index], checked: !updated[index].checked };
    updateWidgetData(widget.id, { checkboxItems: updated });
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      const updated = [...checkboxItems, { name: newItemName.trim(), checked: false }];
      updateWidgetData(widget.id, { checkboxItems: updated });
      setNewItemName('');
    }
  };

  const removeItem = (index: number) => {
    const updated = [...checkboxItems];
    updated.splice(index, 1);
    updateWidgetData(widget.id, { checkboxItems: updated });
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      <input
        className={`font-bold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-black focus:outline-none flex-shrink-0 ${labelClass}`}
        value={label}
        onChange={handleLabelChange}
        placeholder="Checklist Title"
        disabled={mode === 'play'}
        onMouseDown={(e) => e.stopPropagation()}
      />
      
      {/* Checkbox Items */}
      <div className={`flex flex-col ${isCompact ? 'gap-0.5' : 'gap-1'} flex-1 overflow-y-auto min-h-0`}>
        {(checkboxItems as CheckboxItem[]).map((item, idx) => (
          <div key={idx} className={`flex items-center ${gapClass} group`}>
            <button
              onClick={() => toggleItem(idx)}
              onMouseDown={(e) => e.stopPropagation()}
              className={`${checkboxClass} border-2 border-black flex items-center justify-center transition-colors flex-shrink-0 ${
                item.checked ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'
              }`}
            >
              {item.checked && <span className={checkClass}>✓</span>}
            </button>
            <span className={`flex-1 ${itemClass} ${item.checked ? 'line-through text-gray-400' : ''}`}>
              {item.name}
            </span>
            {mode === 'edit' && (
              <button
                onClick={() => removeItem(idx)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 ${itemClass}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add New Item (edit mode only) */}
      {mode === 'edit' && (
        <form onSubmit={addItem} className="flex gap-1 mt-1">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Add item..."
            className={`flex-1 ${itemClass} border-b border-gray-300 focus:border-black focus:outline-none py-1`}
            onMouseDown={(e) => e.stopPropagation()}
          />
          <button
            type="submit"
            className={`${isCompact ? 'text-base' : 'text-lg'} font-bold hover:text-gray-600 px-1`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            +
          </button>
        </form>
      )}
    </div>
  );
}
