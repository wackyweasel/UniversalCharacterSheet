import { useState } from 'react';
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

export default function NumberWidget({ widget, mode, width, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, numberItems = [] } = widget.data;
  const [newItemName, setNewItemName] = useState('');

  // Responsive sizing based on widget dimensions
  const isCompact = width < 180 || height < 120;
  const isLarge = width >= 300 && height >= 200;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const itemClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const buttonSize = isCompact ? 'w-5 h-5 text-xs' : isLarge ? 'w-8 h-8 text-base' : 'w-6 h-6 text-sm';
  const valueClass = isCompact ? 'text-sm w-8' : isLarge ? 'text-xl w-14' : 'text-base w-10';
  const gapClass = isCompact ? 'gap-1' : 'gap-2';

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateWidgetData(widget.id, { label: e.target.value });
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      updateWidgetData(widget.id, {
        numberItems: [...numberItems, { name: newItemName.trim(), value: 0 }]
      });
      setNewItemName('');
    }
  };

  const removeItem = (index: number) => {
    const updated = [...numberItems];
    updated.splice(index, 1);
    updateWidgetData(widget.id, { numberItems: updated });
  };

  const updateItemName = (index: number, name: string) => {
    const updated = [...numberItems] as NumberItem[];
    updated[index] = { ...updated[index], name };
    updateWidgetData(widget.id, { numberItems: updated });
  };

  const updateItemValue = (index: number, value: number) => {
    const updated = [...numberItems] as NumberItem[];
    updated[index] = { ...updated[index], value };
    updateWidgetData(widget.id, { numberItems: updated });
  };

  const adjustItemValue = (index: number, delta: number) => {
    const updated = [...numberItems] as NumberItem[];
    updated[index] = { ...updated[index], value: updated[index].value + delta };
    updateWidgetData(widget.id, { numberItems: updated });
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      <input
        className={`font-bold bg-transparent border-b border-transparent hover:border-theme-border/50 focus:border-theme-border focus:outline-none ${labelClass} flex-shrink-0 text-theme-ink font-heading`}
        value={label}
        onChange={handleLabelChange}
        placeholder="Trackers"
        disabled={mode === 'play'}
        onMouseDown={(e) => e.stopPropagation()}
      />

      {/* Number Items */}
      <div className={`flex flex-col ${isCompact ? 'gap-0.5' : 'gap-1'} flex-1 overflow-y-auto min-h-0`}>
        {(numberItems as NumberItem[]).map((item, idx) => (
          <div key={idx} className={`flex items-center ${gapClass} group`}>
            {/* Item Name */}
            <input
              className={`flex-1 ${itemClass} bg-transparent border-b border-transparent hover:border-theme-border/50 focus:border-theme-border focus:outline-none min-w-0 text-theme-ink font-body`}
              value={item.name}
              onChange={(e) => updateItemName(idx, e.target.value)}
              placeholder="Name"
              disabled={mode === 'play'}
              onMouseDown={(e) => e.stopPropagation()}
            />

            {/* Value Controls */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={() => adjustItemValue(idx, -1)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`${buttonSize} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center justify-center text-theme-ink rounded-theme`}
              >
                -
              </button>
              {mode === 'edit' ? (
                <input
                  type="number"
                  value={item.value}
                  onChange={(e) => updateItemValue(idx, parseInt(e.target.value) || 0)}
                  className={`${valueClass} text-center font-bold border border-theme-border/50 focus:border-theme-border focus:outline-none text-theme-ink bg-theme-paper rounded-theme`}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              ) : (
                <span className={`${valueClass} text-center font-bold text-theme-ink`}>
                  {item.value}
                </span>
              )}
              <button
                onClick={() => adjustItemValue(idx, 1)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`${buttonSize} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center justify-center text-theme-ink rounded-theme`}
              >
                +
              </button>
            </div>

            {/* Remove Button */}
            {mode === 'edit' && (
              <button
                onClick={() => removeItem(idx)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 ${itemClass} flex-shrink-0`}
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
            placeholder="Add tracker..."
            className={`flex-1 ${itemClass} border-b border-theme-border/50 focus:border-theme-border focus:outline-none py-1 text-theme-ink bg-transparent font-body`}
            onMouseDown={(e) => e.stopPropagation()}
          />
          <button
            type="submit"
            className={`${isCompact ? 'text-base' : 'text-lg'} font-bold hover:text-theme-muted px-1 text-theme-ink`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            +
          </button>
        </form>
      )}
    </div>
  );
}
