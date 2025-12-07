import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

export default function TextWidget({ widget, width, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, text = '' } = widget.data;

  // Responsive sizing
  const isCompact = width < 160;
  const isLarge = width >= 300;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const textClass = isCompact ? 'text-xs p-1' : isLarge ? 'text-base p-3' : 'text-sm p-2';
  const gapClass = isCompact ? 'gap-1' : 'gap-2';
  
  // Calculate textarea height based on available space
  const labelHeight = isCompact ? 16 : isLarge ? 24 : 20;
  const gapSize = isCompact ? 4 : 8;
  const padding = isCompact ? 8 : 16; // p-2 or p-4 from parent
  const textareaHeight = Math.max(32, height - labelHeight - gapSize - padding * 2);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateWidgetData(widget.id, { text: e.target.value });
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
        {label || 'Notes'}
      </div>
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
