import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

export default function TextWidget({ widget, mode, width, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, text = '' } = widget.data;

  // Responsive sizing
  const isCompact = width < 160 || height < 100;
  const isLarge = width >= 300 && height >= 200;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const textClass = isCompact ? 'text-xs p-1 min-h-[2rem]' : isLarge ? 'text-base p-3 min-h-[6rem]' : 'text-sm p-2 min-h-[4rem]';
  const gapClass = isCompact ? 'gap-1' : 'gap-2';

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateWidgetData(widget.id, { label: e.target.value });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateWidgetData(widget.id, { text: e.target.value });
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      <input
        className={`font-bold bg-transparent border-b border-transparent hover:border-theme-border/50 focus:border-theme-border focus:outline-none w-full flex-shrink-0 ${labelClass} text-theme-ink font-heading`}
        value={label}
        onChange={handleLabelChange}
        placeholder="Title"
        disabled={mode === 'play'}
      />
      <textarea
        className={`w-full flex-1 ${textClass} border border-theme-border/50 focus:border-theme-border focus:outline-none resize-none bg-transparent text-theme-ink font-body rounded-theme`}
        value={text}
        onChange={handleTextChange}
        placeholder="Enter text here..."
        onMouseDown={(e) => e.stopPropagation()}
      />
    </div>
  );
}
