import { useState } from 'react';
import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
}

interface NumberItem {
  name: string;
  value: number;
}

export default function NumberWidget({ widget, mode, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const isPrintMode = mode === 'print';
  const { label, numberItems = [], printSettings } = widget.data;
  const hideValues = isPrintMode && (printSettings?.hideValues ?? false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  // Fixed small sizing
  const labelClass = 'text-xs';
  const itemClass = 'text-xs';
  const buttonSize = 'w-5 h-5 text-xs';
  const valueClass = 'text-sm w-8';
  const gapClass = 'gap-1';
  
  // Calculate items area height
  const labelHeight = 16;
  const gapSize = 4;
  const padding = 0;
  const itemsHeight = Math.max(30, height - labelHeight - gapSize - padding * 2);

  const adjustItemValue = (index: number, delta: number) => {
    const updated = [...numberItems] as NumberItem[];
    updated[index] = { ...updated[index], value: updated[index].value + delta };
    updateWidgetData(widget.id, { numberItems: updated });
  };

  const handleValueClick = (index: number, currentValue: number) => {
    setEditingIndex(index);
    setEditValue(String(currentValue));
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  const handleValueBlur = (index: number) => {
    const newValue = parseInt(editValue, 10);
    if (!isNaN(newValue)) {
      const updated = [...numberItems] as NumberItem[];
      updated[index] = { ...updated[index], value: newValue };
      updateWidgetData(widget.id, { numberItems: updated });
    }
    setEditingIndex(null);
    setEditValue('');
  };

  const handleValueKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      handleValueBlur(index);
    } else if (e.key === 'Escape') {
      setEditingIndex(null);
      setEditValue('');
    }
  };

  // Fixed width for the value controls section to ensure alignment across all rows
  const controlsSectionWidth = 'w-[62px]';

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {label && (
        <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {label}
        </div>
      )}

      {/* Number Items */}
      <div 
        className={`flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden flex-1 pr-4`}
        style={{ maxHeight: `${itemsHeight}px` }}
        onWheel={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight > el.clientHeight) {
            e.stopPropagation();
          }
        }}
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
                className={`${buttonSize} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center justify-center text-theme-ink rounded-button flex-shrink-0 font-body ${isPrintMode ? 'opacity-0' : ''}`}
              >
                -
              </button>
              {editingIndex === idx ? (
                <input
                  type="text"
                  inputMode="numeric"
                  value={editValue}
                  onChange={handleValueChange}
                  onBlur={() => handleValueBlur(idx)}
                  onKeyDown={(e) => handleValueKeyDown(e, idx)}
                  onMouseDown={(e) => e.stopPropagation()}
                  autoFocus
                  className={`${valueClass} text-center font-bold text-theme-ink bg-theme-paper border border-theme-border rounded-button flex-shrink-0 outline-none focus:border-theme-accent`}
                />
              ) : (
                <span 
                  className={`${valueClass} text-center font-bold text-theme-ink flex-shrink-0 cursor-pointer hover:bg-theme-accent/20 rounded-button font-body`}
                  style={hideValues ? { visibility: 'hidden' } : undefined}
                  data-print-hide={hideValues ? 'true' : undefined}
                  onClick={() => handleValueClick(idx, item.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {item.value}
                </span>
              )}
              <button
                onClick={() => adjustItemValue(idx, 1)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`${buttonSize} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors flex items-center justify-center text-theme-ink rounded-button flex-shrink-0 font-body ${isPrintMode ? 'opacity-0' : ''}`}
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






