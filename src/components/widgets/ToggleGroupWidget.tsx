import { useState } from 'react';
import { Widget, ToggleItem } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

// Common condition suggestions
const SUGGESTIONS = [
  'Blinded', 'Charmed', 'Frightened', 'Poisoned', 'Stunned', 
  'Prone', 'Invisible', 'Paralyzed', 'Unconscious', 'Exhausted',
  'Afraid', 'Angry', 'Confused', 'Wounded', 'Dazed'
];

export default function ToggleGroupWidget({ widget, mode, width, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, toggleItems = [] } = widget.data;
  const [newItemName, setNewItemName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Responsive sizing
  const isCompact = width < 180 || height < 140;
  const isLarge = width >= 350 && height >= 250;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const toggleClass = isCompact ? 'px-1.5 py-0.5 text-[10px]' : isLarge ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs';
  const summaryClass = isCompact ? 'text-[10px]' : isLarge ? 'text-sm' : 'text-xs';
  const inputClass = isCompact ? 'text-[10px] px-1 py-0.5' : isLarge ? 'text-sm px-3 py-1.5' : 'text-xs px-2 py-1';
  const buttonClass = isCompact ? 'text-[10px] px-1 py-0.5' : isLarge ? 'text-sm px-3 py-1.5' : 'text-xs px-2 py-1';
  const gapClass = isCompact ? 'gap-1' : 'gap-2';

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateWidgetData(widget.id, { label: e.target.value });
  };

  const toggleItem = (index: number) => {
    const updated = [...toggleItems];
    updated[index] = { ...updated[index], active: !updated[index].active };
    updateWidgetData(widget.id, { toggleItems: updated });
  };

  const addItem = (name: string) => {
    if (name.trim() && !toggleItems.some((item: ToggleItem) => item.name.toLowerCase() === name.trim().toLowerCase())) {
      updateWidgetData(widget.id, { 
        toggleItems: [...toggleItems, { name: name.trim(), active: false }]
      });
    }
    setNewItemName('');
    setShowSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addItem(newItemName);
  };

  const removeItem = (index: number) => {
    const updated = [...toggleItems];
    updated.splice(index, 1);
    updateWidgetData(widget.id, { toggleItems: updated });
  };

  const clearAll = () => {
    const updated = toggleItems.map((item: ToggleItem) => ({ ...item, active: false }));
    updateWidgetData(widget.id, { toggleItems: updated });
  };

  // Filter suggestions based on input and already added items
  const existingNames = toggleItems.map((item: ToggleItem) => item.name.toLowerCase());
  const filteredSuggestions = SUGGESTIONS.filter(
    s => !existingNames.includes(s.toLowerCase()) && 
         s.toLowerCase().includes(newItemName.toLowerCase())
  );

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      <input
        className={`font-bold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-black focus:outline-none w-full flex-shrink-0 ${labelClass}`}
        value={label}
        onChange={handleLabelChange}
        placeholder="Conditions"
        disabled={mode === 'play'}
        onMouseDown={(e) => e.stopPropagation()}
      />

      {/* Toggle Items */}
      <div className={`flex flex-wrap ${gapClass} flex-1 overflow-y-auto min-h-0 content-start`}>
        {toggleItems.map((item: ToggleItem, idx: number) => (
          <div key={idx} className="flex items-center group">
            <button
              onClick={() => toggleItem(idx)}
              onMouseDown={(e) => e.stopPropagation()}
              className={`${toggleClass} border border-black transition-all ${
                item.active 
                  ? 'bg-black text-white' 
                  : 'bg-white hover:bg-gray-100'
              }`}
            >
              {item.name}
            </button>
            {mode === 'edit' && (
              <button
                onClick={() => removeItem(idx)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`ml-0.5 ${isCompact ? 'w-3 h-3 text-[10px]' : 'w-4 h-4 text-xs'} text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100`}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Active Conditions Summary */}
      {toggleItems.filter((item: ToggleItem) => item.active).length > 0 && (
        <div className={`${summaryClass} text-gray-600 border-t border-gray-200 pt-1`}>
          Active: {toggleItems.filter((item: ToggleItem) => item.active).map((item: ToggleItem) => item.name).join(', ')}
        </div>
      )}

      {/* Add New Condition */}
      <div className={`border-t border-gray-200 pt-2 ${isCompact ? 'space-y-0.5' : 'space-y-1'}`}>
        <form onSubmit={handleSubmit} className="flex gap-1 relative">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => {
              setNewItemName(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Add condition..."
            className={`flex-1 ${inputClass} border border-gray-300 focus:border-black focus:outline-none`}
            onMouseDown={(e) => e.stopPropagation()}
          />
          <button
            type="submit"
            className={`${buttonClass} border border-black hover:bg-black hover:text-white`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            +
          </button>
        </form>

        {/* Suggestions Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className={`border border-gray-300 bg-white ${isCompact ? 'max-h-16' : 'max-h-24'} overflow-y-auto`}>
            {filteredSuggestions.slice(0, 5).map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => addItem(suggestion)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`w-full text-left ${inputClass} hover:bg-gray-100`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Clear All */}
        {toggleItems.length > 0 && (
          <button
            onClick={clearAll}
            onMouseDown={(e) => e.stopPropagation()}
            className={`w-full ${buttonClass} border border-black hover:bg-black hover:text-white transition-colors`}
          >
            Clear All Active
          </button>
        )}
      </div>
    </div>
  );
}
