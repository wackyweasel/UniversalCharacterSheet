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
  const itemCount = displayNumbers.length || 1;
  
  // Font sizes based on available space
  const minDimension = Math.min(width / (isHorizontal ? itemCount : 1), height / (isHorizontal ? 1 : itemCount));
  const numberFontSize = Math.max(10, Math.min(20, minDimension * 0.25));
  const labelFontSize = Math.max(7, Math.min(10, minDimension * 0.12));

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {label && (
        <div 
          className="font-bold text-theme-ink font-heading shrink-0 truncate px-1"
          style={{ fontSize: '11px', lineHeight: '16px' }}
        >
          {label}
        </div>
      )}

      {/* Number Items Container - uses flex to distribute space */}
      <div 
        className={`flex-1 flex ${isHorizontal ? 'flex-row' : 'flex-col'} items-stretch justify-center gap-1 p-1 min-h-0 min-w-0 overflow-hidden`}
      >
        {(displayNumbers as DisplayNumber[]).map((item, idx) => (
          <div 
            key={idx} 
            className={`flex flex-col items-center justify-center border-2 border-theme-border rounded-button bg-theme-paper/50 overflow-hidden ${isHorizontal ? 'flex-1 max-w-[70px]' : 'flex-1 max-h-[55px]'}`}
            style={{ 
              minWidth: isHorizontal ? '30px' : undefined,
              minHeight: !isHorizontal ? '30px' : undefined,
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
                className="font-bold text-theme-ink cursor-pointer hover:text-theme-accent transition-colors leading-none"
                style={{ fontSize: `${numberFontSize}px` }}
                onClick={() => handleValueClick(idx, item.value)}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {item.value}
              </span>
            )}
            
            {/* Label */}
            <span 
              className="text-theme-muted font-body truncate w-full text-center px-1 leading-tight"
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






