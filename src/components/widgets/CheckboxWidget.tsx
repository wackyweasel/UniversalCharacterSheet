import { useState } from 'react';
import { Widget, CheckboxItem } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { Tooltip } from '../Tooltip';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
}

export default function CheckboxWidget({ widget, height, mode }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, checkboxItems = [], checklistSettings } = widget.data;
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const strikethrough = checklistSettings?.strikethrough !== false; // Default to true

  // Fixed small sizing
  const labelClass = 'text-xs';
  const itemClass = 'text-xs';
  const checkboxClass = 'w-4 h-4';
  const checkClass = 'text-xs';
  const gapClass = 'gap-1';
  
  // Calculate items area height
  const labelHeight = 16;
  const gapSize = 4;
  const padding = 0;
  const itemsHeight = Math.max(30, height - labelHeight - gapSize - padding * 2);

  const toggleItem = (index: number) => {
    const updated = [...checkboxItems] as CheckboxItem[];
    const newChecked = !updated[index].checked;
    updated[index] = { ...updated[index], checked: newChecked };
    updateWidgetData(widget.id, { checkboxItems: updated });
    addTimelineEvent(label || 'Checklist', 'CHECKBOX', `${updated[index].name}: ${newChecked ? 'checked' : 'unchecked'}`, newChecked ? '☑️' : '⬜');
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {label && (
        <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {label}
        </div>
      )}
      
      {/* Checkbox Items */}
      <div 
        className={`flex flex-col gap-0.5 overflow-y-auto flex-1`}
        style={{ maxHeight: `${itemsHeight}px` }}
        onWheel={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight > el.clientHeight) {
            e.stopPropagation();
          }
        }}
      >
        {(checkboxItems as CheckboxItem[]).map((item, idx) => (
          <div 
            key={idx} 
            className={`flex items-center ${gapClass} cursor-pointer ${deleting ? 'hover:bg-red-100 dark:hover:bg-red-900/20 rounded' : ''}`}
            onClick={() => {
              if (deleting) {
                const updated = checkboxItems.filter((_: CheckboxItem, i: number) => i !== idx);
                updateWidgetData(widget.id, { checkboxItems: updated });
                if (updated.length === 0) setDeleting(false);
              } else {
                toggleItem(idx);
              }
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {deleting && (
              <span className="text-red-500 text-xs font-bold flex-shrink-0 leading-none">✕</span>
            )}
            <div
              className={`${checkboxClass} border border-theme-border flex items-center justify-center transition-colors flex-shrink-0 rounded-button ${
                item.checked ? 'bg-theme-accent text-theme-paper' : 'bg-theme-paper hover:opacity-80'
              }`}
            >
              {item.checked && <span className={checkClass}>✓</span>}
            </div>
            <span className={`flex-1 ${itemClass} font-body text-theme-ink ${item.checked && strikethrough ? 'line-through text-theme-muted' : ''}`}>
              {mode === 'play' && item.tooltip ? (
                <Tooltip content={item.tooltip}>
                  <span>{item.name}</span>
                </Tooltip>
              ) : item.name}
            </span>
          </div>
        ))}
        {checkboxItems.length === 0 && (
          <div className={`${itemClass} text-theme-muted italic`}>No items yet</div>
        )}
        {mode === 'play' && !adding && (
          <div className="flex items-center gap-1 mt-0.5">
            <button
              className="flex items-center justify-center w-5 h-5 rounded border border-theme-border text-theme-muted hover:text-theme-accent hover:border-theme-accent transition-colors flex-shrink-0"
              onClick={() => { setAdding(true); setDeleting(false); }}
              onMouseDown={(e) => e.stopPropagation()}
              title="Add item"
            >
              <span className="text-sm leading-none">+</span>
            </button>
            {checkboxItems.length > 0 && (
              <button
                className={`flex items-center justify-center w-5 h-5 rounded border transition-colors flex-shrink-0 ${
                  deleting
                    ? 'border-red-400 text-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-theme-border text-theme-muted hover:text-red-500 hover:border-red-400'
                }`}
                onClick={() => setDeleting(!deleting)}
                onMouseDown={(e) => e.stopPropagation()}
                title={deleting ? 'Cancel delete' : 'Remove item'}
              >
                <span className="text-sm leading-none">−</span>
              </button>
            )}
          </div>
        )}
        {mode === 'play' && adding && (
          <form
            className="flex items-center gap-1 mt-0.5"
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = newName.trim();
              if (trimmed) {
                const updated = [...checkboxItems, { name: trimmed, checked: false }];
                updateWidgetData(widget.id, { checkboxItems: updated });
              }
              setNewName('');
              setAdding(false);
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              className="flex-1 min-w-0 text-xs bg-theme-paper border border-theme-border rounded px-1 py-0.5 text-theme-ink outline-none focus:border-theme-accent"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => {
                const trimmed = newName.trim();
                if (trimmed) {
                  const updated = [...checkboxItems, { name: trimmed, checked: false }];
                  updateWidgetData(widget.id, { checkboxItems: updated });
                }
                setNewName('');
                setAdding(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setNewName('');
                  setAdding(false);
                }
              }}
              placeholder="New item…"
            />
          </form>
        )}
      </div>
    </div>
  );
}






