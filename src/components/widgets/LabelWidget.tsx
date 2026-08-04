import { Widget } from '../../types';

interface Props {
  widget: Widget;
}

export default function LabelWidget({ widget }: Props) {
  const { label } = widget.data;

  if (!label) return null;

  return (
    <div className="widget-header h-full w-full">
      <div className="widget-header-title min-w-0 flex-1 truncate">{label}</div>
    </div>
  );
}