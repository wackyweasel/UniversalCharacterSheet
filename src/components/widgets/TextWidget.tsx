import { Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { useRef, useEffect, useCallback } from 'react';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  width: number;
  height: number;
}

export default function TextWidget({ widget, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const mode = useStore((state) => state.mode);
  const isPrintMode = mode === 'print';
  const { label, text = '' } = widget.data;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Prevent wheel events from bubbling up when textarea is scrollable
  const handleWheel = useCallback((e: React.WheelEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const isScrollable = textarea.scrollHeight > textarea.clientHeight;
    
    // Always stop propagation if the textarea is scrollable to prevent camera zoom
    if (isScrollable) {
      e.stopPropagation();
    }
  }, []);

  // Fixed small sizing
  const labelClass = 'text-xs';
  const textClass = 'text-xs p-1';
  const gapClass = 'gap-1';
  
  // Check if we're in "auto-height" mode (vertical view passes large height)
  const isAutoHeight = height >= 10000;
  
  // Calculate textarea height based on available space
  const labelHeight = 16;
  const gapSize = 4;
  const padding = 0; // p-1 from parent
  const textareaHeight = Math.max(32, height - labelHeight - gapSize - padding * 2);

  // Auto-resize textarea when in auto-height mode
  useEffect(() => {
    if (isAutoHeight && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(60, textareaRef.current.scrollHeight)}px`;
    }
  }, [text, isAutoHeight]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateWidgetData(widget.id, { text: e.target.value });
    // Auto-resize on input when in auto-height mode
    if (isAutoHeight && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(60, textareaRef.current.scrollHeight)}px`;
    }
  };

  return (
    <div className={`flex flex-col ${gapClass} w-full ${isAutoHeight ? '' : 'h-full'}`}>
      {label && (
        <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
          {label}
        </div>
      )}
      <textarea
        ref={textareaRef}
        className={`w-full ${isAutoHeight ? '' : 'flex-1'} ${textClass} border border-theme-border/50 focus:border-theme-border focus:outline-none resize-none bg-transparent text-theme-ink font-body rounded-button`}
        style={isAutoHeight ? { minHeight: '60px', overflow: 'hidden', height: 'auto' } : { height: `${textareaHeight}px` }}
        value={text}
        onChange={handleTextChange}
        placeholder={isPrintMode ? '' : 'Enter text here...'}
        onMouseDown={(e) => e.stopPropagation()}
        onWheel={handleWheel}
      />
    </div>
  );
}






