import { Widget } from '../../types';
import { useStore } from '../../store/useStore';
import { addTimelineEvent } from '../../store/useTimelineStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit' | 'print';
  interactive?: boolean;
}

export default function ToggleWidget({ widget, mode, interactive = true }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, toggleState = false, toggleColor, inlineLabel = false } = widget.data;
  const isInteractive = interactive && mode !== 'print';

  const toggle = () => {
    if (!isInteractive) return;
    const nextState = !toggleState;
    updateWidgetData(widget.id, { toggleState: nextState });
    addTimelineEvent(label || 'Switch', 'TOGGLE', nextState ? 'On' : 'Off', nextState ? 'ON' : 'OFF');
  };

  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={toggleState}
      aria-label={label || 'Switch'}
      disabled={!isInteractive}
      onClick={toggle}
      onMouseDown={(event) => event.stopPropagation()}
      className={`relative h-6 w-11 flex-shrink-0 rounded-full border border-theme-border transition-colors ${
        toggleState ? 'bg-theme-accent' : 'bg-theme-background'
      } ${isInteractive ? 'cursor-pointer' : 'cursor-default opacity-70'}`}
      style={toggleState && toggleColor ? { backgroundColor: toggleColor, borderColor: toggleColor } : undefined}
    >
      <span
        className={`absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-black/25 bg-theme-paper shadow-sm transition-transform ${
          toggleState ? 'translate-x-[22px]' : 'translate-x-1'
        }`}
      />
    </button>
  );

  return (
    <div className="flex h-full w-full flex-col gap-1.5">
      {label && !inlineLabel && (
        <div className="widget-header flex-shrink-0">
          <div className="widget-header-title min-w-0 flex-1 truncate">{label}</div>
        </div>
      )}
      <div className="flex min-h-0 flex-1 items-center gap-2">
        {label && inlineLabel && (
          <div className="min-w-0 max-w-[60%] flex-1 truncate font-heading text-xs font-bold leading-4 text-theme-ink">
            {label}
          </div>
        )}
        <div className="flex flex-shrink-0 items-center">{control}</div>
      </div>
    </div>
  );
}