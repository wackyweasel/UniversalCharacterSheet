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

export default function ConditionWidget({ widget, mode, width, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, toggleItems = [] } = widget.data;
  const [newItemName, setNewItemName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Responsive sizing
  const isCompact = width < 180 || height < 140;
  const isLarge = width >= 350 && height >= 250;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const toggleClass = isCompact ? 'px-1.5 py-0.5 text-[10px]' : isLarge ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs';
  const inputClass = isCompact ? 'text-[10px] px-1 py-0.5' : isLarge ? 'text-sm px-2 py-1' : 'text-xs px-2 py-1';
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

  const hasActiveItems = toggleItems.some((item: ToggleItem) => item.active);

  return (
    <div className="flex flex-col w-full h-full">
      {/* Header */}
      <input
        className={`font-bold bg-transparent border-b border-transparent hover:border-theme-border/50 focus:border-theme-border focus:outline-none w-full flex-shrink-0 mb-1 ${labelClass} text-theme-ink font-heading`}
        value={label}
        onChange={handleLabelChange}
        placeholder="Conditions"
        disabled={mode === 'play'}
        onMouseDown={(e) => e.stopPropagation()}
      />

      {/* Toggle Items - scrollable area */}
      <div className={`flex flex-wrap ${gapClass} flex-1 overflow-y-auto min-h-0 content-start py-1`}>
        {toggleItems.map((item: ToggleItem, idx: number) => (
          <div key={idx} className="flex items-center group">
            <button
              onClick={() => toggleItem(idx)}
              onMouseDown={(e) => e.stopPropagation()}
              className={`${toggleClass} border border-theme-border transition-all rounded-theme font-body ${
                item.active 
                  ? 'bg-theme-accent text-theme-paper' 
                  : 'bg-theme-paper text-theme-ink hover:opacity-80'
              }`}
            >
              {item.name}
            </button>
            {mode === 'edit' && (
              <button
                onClick={() => removeItem(idx)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`ml-0.5 ${isCompact ? 'w-3 h-3 text-[10px]' : 'w-4 h-4 text-xs'} text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity`}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add New Condition - fixed at bottom */}
      <div className="border-t border-theme-border/50 pt-1 mt-auto flex-shrink-0 relative">
        <form onSubmit={handleSubmit} className="flex gap-1 items-center">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => {
              setNewItemName(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Add..."
            className={`flex-1 min-w-0 ${inputClass} border border-theme-border/50 focus:border-theme-border focus:outline-none bg-theme-paper text-theme-ink font-body rounded-theme`}
            onMouseDown={(e) => e.stopPropagation()}
          />
          <button
            type="submit"
            className={`${inputClass} border border-theme-border hover:bg-theme-accent hover:text-theme-paper flex-shrink-0 text-theme-ink rounded-theme`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            +
          </button>
          {hasActiveItems && (
            <button
              type="button"
              onClick={clearAll}
              onMouseDown={(e) => e.stopPropagation()}
              className={`${inputClass} border border-theme-border/50 text-theme-muted hover:opacity-80 flex-shrink-0 rounded-theme`}
              title="Clear all active"
            >
              ✕
            </button>
          )}
        </form>

        {/* Suggestions Dropdown - positioned above the input */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div 
            className={`absolute bottom-full left-0 right-0 mb-1 border border-theme-border bg-theme-paper ${isCompact ? 'max-h-20' : 'max-h-28'} overflow-y-auto shadow-theme z-10 rounded-theme`}
            onWheel={(e) => e.stopPropagation()}
          >
            {filteredSuggestions.slice(0, 5).map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => addItem(suggestion)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`w-full text-left ${inputClass} hover:bg-theme-accent hover:text-theme-paper border-b border-theme-border/30 last:border-b-0 text-theme-ink font-body`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
