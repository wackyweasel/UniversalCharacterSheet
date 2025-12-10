import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

export default function TextWidget({ widget, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, text = '' } = widget.data;

  // Fixed small sizing
  const labelClass = 'text-xs';
  const textClass = 'text-xs p-1';
  const gapClass = 'gap-1';
  
  // Calculate textarea height based on available space
  const labelHeight = 16;
  const gapSize = 4;
  const padding = 0; // p-1 from parent
  const textareaHeight = Math.max(32, height - labelHeight - gapSize - padding * 2);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateWidgetData(widget.id, { text: e.target.value });
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      {label && (
        <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {label}
        </div>
      )}
      <textarea
        className={`w-full flex-1 ${textClass} border border-theme-border/50 focus:border-theme-border focus:outline-none resize-none bg-transparent text-theme-ink font-body rounded-theme`}
        style={{ height: `${textareaHeight}px` }}
        value={text}
        onChange={handleTextChange}
        placeholder="Enter text here..."
        onMouseDown={(e) => e.stopPropagation()}
      />
    </div>
  );
}
