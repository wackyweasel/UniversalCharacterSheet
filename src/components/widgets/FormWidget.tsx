import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

interface FormItem {
  name: string;
  value: string;
}

export default function FormWidget({ widget, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, formItems = [] } = widget.data;

  // Fixed small sizing
  const labelClass = 'text-xs';
  const itemClass = 'text-xs';
  const gapClass = 'gap-1';
  
  // Calculate items area height
  const labelHeight = 16;
  const gapSize = 4;
  const padding = 0;
  const itemsHeight = Math.max(30, height - labelHeight - gapSize - padding * 2);

  const handleValueChange = (index: number, value: string) => {
    const updated = [...formItems] as FormItem[];
    updated[index] = { ...updated[index], value };
    updateWidgetData(widget.id, { formItems: updated });
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {label && (
        <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {label}
        </div>
      )}

      {/* Form Items */}
      <div 
        className={`flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden flex-1 pr-1`}
        style={{ maxHeight: `${itemsHeight}px` }}
        onWheel={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight > el.clientHeight) {
            e.stopPropagation();
          }
        }}
      >
        {(formItems as FormItem[]).map((item, idx) => (
          <div key={idx} className={`flex items-center ${gapClass}`}>
            {/* Item Name */}
            <span className={`w-1/3 ${itemClass} text-theme-ink font-body truncate flex-shrink-0`}>
              {item.name}
            </span>

            {/* Value Input */}
            <input
              type="text"
              value={item.value}
              onChange={(e) => handleValueChange(idx, e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              className={`flex-1 ${itemClass} px-1 py-0.5 border-b border-theme-border/50 focus:border-theme-border focus:outline-none bg-transparent text-theme-ink font-body min-w-0`}
              placeholder="..."
            />
          </div>
        ))}
        {formItems.length === 0 && (
          <div className={`${itemClass} text-theme-muted italic`}>No fields yet</div>
        )}
      </div>
    </div>
  );
}
