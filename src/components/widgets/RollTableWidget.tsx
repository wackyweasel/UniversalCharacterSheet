import { useState } from 'react';
import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
}

export default function RollTableWidget({ widget, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, rollTableItems = [{ text: '', weight: 1 }], showRollTableItems = true } = widget.data;
  const [rolledResult, setRolledResult] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  // Fixed small sizing
  const labelClass = 'text-xs';
  const inputClass = 'text-xs py-0.5';
  const buttonClass = 'py-1 px-2 text-xs';
  const gapClass = 'gap-1';
  
  // Calculate list area height
  const labelHeight = 16;
  const buttonHeight = 32;
  const resultHeight = rolledResult ? 28 : 0;
  const gapSize = 8;
  const padding = 0;
  const listHeight = Math.max(40, height - labelHeight - buttonHeight - resultHeight - gapSize * 3 - padding * 2);

  // Ensure items array has at least one item
  const normalizedItems = rollTableItems.length > 0 
    ? rollTableItems 
    : [{ text: '', weight: 1 }];

  const updateItem = (index: number, field: 'text' | 'weight', value: string | number) => {
    const newItems = [...normalizedItems];
    if (field === 'text') {
      newItems[index] = { ...newItems[index], text: value as string };
    } else {
      // Ensure weight is non-negative
      const numValue = Math.max(0, Number(value) || 0);
      newItems[index] = { ...newItems[index], weight: numValue };
    }
    updateWidgetData(widget.id, { rollTableItems: newItems });
  };

  const rollTable = () => {
    // Filter items with non-empty text and positive weight
    const validItems = normalizedItems.filter(item => item.text.trim() && item.weight > 0);
    
    if (validItems.length === 0) {
      setRolledResult('No valid items to roll!');
      return;
    }

    setIsRolling(true);
    
    setTimeout(() => {
      // Calculate total weight
      const totalWeight = validItems.reduce((sum, item) => sum + item.weight, 0);
      
      // Generate random number between 0 and total weight
      const roll = Math.random() * totalWeight;
      
      // Find which item was selected
      let cumulative = 0;
      let selectedItem = validItems[0];
      
      for (const item of validItems) {
        cumulative += item.weight;
        if (roll < cumulative) {
          selectedItem = item;
          break;
        }
      }
      
      setRolledResult(selectedItem.text);
      setIsRolling(false);
    }, 300);
  };

  // Calculate normalized probability for display
  const getTotalWeight = () => {
    return normalizedItems.reduce((sum, item) => sum + (item.weight || 0), 0);
  };

  const getPercentage = (weight: number) => {
    const total = getTotalWeight();
    if (total === 0) return 0;
    return Math.round((weight / total) * 100);
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {label && (
        <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {label}
        </div>
      )}
      
      {/* Roll Button */}
      <button
        onClick={rollTable}
        onMouseDown={(e) => e.stopPropagation()}
        className={`${buttonClass} border-[length:var(--border-width)] border-theme-border font-bold transition-all rounded-button flex-shrink-0 font-body ${
          isRolling 
            ? 'bg-theme-muted animate-pulse text-theme-paper' 
            : 'bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
        }`}
        disabled={isRolling}
      >
        Roll Table
      </button>

      {/* Result Display */}
      {rolledResult && (
        <div className="text-center bg-theme-accent/10 border border-theme-accent/30 rounded-button py-1 px-2 flex-shrink-0">
          <span className="font-bold text-sm text-theme-ink font-heading">{rolledResult}</span>
        </div>
      )}

      {/* Items List */}
      {showRollTableItems && (
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
          {normalizedItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1 group">
              <input
                className={`flex-1 border-b border-theme-border/50 focus:border-theme-border focus:outline-none ${inputClass} min-w-0 bg-transparent text-theme-ink font-body`}
                value={item.text}
                onChange={(e) => updateItem(idx, 'text', e.target.value)}
                placeholder="Item text..."
                onMouseDown={(e) => e.stopPropagation()}
              />
              <span className="text-[10px] text-theme-muted w-8 text-right" title="Probability">
                {getPercentage(item.weight)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}






