import { Widget, ToggleItem } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';
import { Tooltip } from '../Tooltip';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
}

export default function ConditionWidget({ widget, mode }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, toggleItems = [] } = widget.data;

  // Fixed small sizing
  const labelClass = 'text-xs';
  const toggleClass = 'px-1.5 py-0.5 text-[10px]';
  const gapClass = 'gap-1';

  const toggleItem = (index: number) => {
    const updated = [...toggleItems];
    const newActive = !updated[index].active;
    updated[index] = { ...updated[index], active: newActive };
    updateWidgetData(widget.id, { toggleItems: updated });
    addTimelineEvent(label || 'Conditions', 'TOGGLE_GROUP', `${updated[index].name}: ${newActive ? 'activated' : 'removed'}`, newActive ? '⚠️' : '✅');
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {/* Header */}
      {label && (
        <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {label}
        </div>
      )}

      {/* Toggle Items */}
      <div className={`flex flex-wrap ${gapClass} overflow-y-auto flex-1 content-start`} onWheel={(e) => {
        const el = e.currentTarget;
        if (el.scrollHeight > el.clientHeight) {
          e.stopPropagation();
        }
      }}>
        {toggleItems.map((item: ToggleItem, idx: number) => {
          const btn = (
            <button
              key={idx}
              onClick={() => toggleItem(idx)}
              onMouseDown={(e) => e.stopPropagation()}
              className={`${toggleClass} border border-theme-border transition-all rounded-button font-body ${
                item.active 
                  ? 'bg-theme-accent text-theme-paper' 
                  : 'bg-theme-paper text-theme-ink hover:opacity-80'
              }`}
            >
              {item.name}
            </button>
          );
          return mode === 'play' && item.tooltip ? (
            <Tooltip key={idx} content={item.tooltip}>{btn}</Tooltip>
          ) : btn;
        })}
        {toggleItems.length === 0 && (
          <div className={`${toggleClass} text-theme-muted italic`}>No conditions configured</div>
        )}
      </div>
    </div>
  );
}






