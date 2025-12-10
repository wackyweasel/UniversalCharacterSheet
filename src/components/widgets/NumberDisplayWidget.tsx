import { useState } from 'react';
import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

interface DisplayNumber {
  label: string;
  value: number;
}

export default function NumberDisplayWidget({ widget, width, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, displayNumbers = [], displayLayout = 'horizontal' } = widget.data;
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

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
      const updated = [...displayNumbers] as DisplayNumber[];
      updated[index] = { ...updated[index], value: newValue };
      updateWidgetData(widget.id, { displayNumbers: updated });
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

  const isHorizontal = displayLayout === 'horizontal';
  
  // Calculate sizing based on available space and number of items
  const itemCount = displayNumbers.length || 1;
  const padding = 16; // p-2 = 8px * 2
  const labelHeight = label ? 20 : 0;
  const gap = 8;
  
  // Available space for numbers
  const availableHeight = height - padding - labelHeight - (label ? gap : 0);
  
  // Calculate item size based on layout
  let itemWidth: number;
  let itemHeight: number;
  
  if (isHorizontal) {
    // Items side by side with fixed width, scrollable if needed
    itemWidth = 60;
    itemHeight = Math.min(availableHeight, 70);
  } else {
    // Items stacked vertically
    const availableWidth = width - padding;
    const totalGaps = Math.max(0, itemCount - 1) * gap;
    itemWidth = Math.min(80, availableWidth);
    itemHeight = Math.min(60, (availableHeight - totalGaps) / itemCount);
  }
  
  // Font sizes based on item dimensions
  const numberFontSize = Math.max(14, Math.min(28, itemHeight * 0.45));
  const labelFontSize = Math.max(8, Math.min(12, itemHeight * 0.2));

  return (
    <div className="flex flex-col gap-1 w-full h-full">
      {label && (
        <div className="font-bold text-xs text-theme-ink font-heading flex-shrink-0 truncate">
          {label}
        </div>
      )}

      {/* Number Items */}
      <div 
        className={`flex ${isHorizontal ? 'flex-row flex-nowrap overflow-x-auto' : 'flex-col overflow-y-auto'} gap-2 items-center ${isHorizontal ? 'justify-start' : 'justify-center'} flex-1`}
        onWheel={(e) => {
          const el = e.currentTarget;
          if ((isHorizontal && el.scrollWidth > el.clientWidth) || (!isHorizontal && el.scrollHeight > el.clientHeight)) {
            e.stopPropagation();
          }
        }}
      >
        {(displayNumbers as DisplayNumber[]).map((item, idx) => (
          <div 
            key={idx} 
            className="flex flex-col items-center justify-center border-2 border-theme-border rounded-theme bg-theme-paper/50 flex-shrink-0"
            style={{ 
              width: `${itemWidth}px`, 
              height: `${itemHeight}px`,
              minWidth: '50px',
              minHeight: '40px'
            }}
          >
            {/* Value - editable on click */}
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
                className="text-center font-bold text-theme-ink bg-transparent border-none outline-none w-full"
                style={{ fontSize: `${numberFontSize}px` }}
              />
            ) : (
              <span 
                className="font-bold text-theme-ink cursor-pointer hover:text-theme-accent transition-colors"
                style={{ fontSize: `${numberFontSize}px` }}
                onClick={() => handleValueClick(idx, item.value)}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {item.value}
              </span>
            )}
            
            {/* Label */}
            <span 
              className="text-theme-muted font-body truncate w-full text-center px-1"
              style={{ fontSize: `${labelFontSize}px` }}
            >
              {item.label}
            </span>
          </div>
        ))}
        
        {displayNumbers.length === 0 && (
          <div className="text-xs text-theme-muted italic">No numbers configured</div>
        )}
      </div>
    </div>
  );
}
