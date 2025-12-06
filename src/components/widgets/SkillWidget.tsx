import { Widget } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  widget: Widget;
  mode: 'play' | 'edit';
  width: number;
  height: number;
}

interface SkillItem {
  name: string;
  value: number;
}

export default function SkillWidget({ widget, width }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, skillItems = [] } = widget.data;

  // Responsive sizing
  const isCompact = width < 180;
  const isLarge = width >= 350;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const itemClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const buttonSize = isCompact ? 'w-4 h-4 text-[10px]' : isLarge ? 'w-6 h-6 text-sm' : 'w-5 h-5 text-xs';
  const modifierWidth = isCompact ? 'w-6' : isLarge ? 'w-10' : 'w-8';
  const gapClass = isCompact ? 'gap-1' : 'gap-2';

  const adjustSkillValue = (index: number, delta: number) => {
    const updated = [...skillItems] as SkillItem[];
    updated[index] = { ...updated[index], value: updated[index].value + delta };
    updateWidgetData(widget.id, { skillItems: updated });
  };

  const formatModifier = (value: number) => value >= 0 ? `+${value}` : `${value}`;

  return (
    <div className={`flex flex-col ${gapClass} w-full`}>
      <div className={`font-bold ${labelClass} text-theme-ink font-heading`}>
        {label || 'Skills'}
      </div>

      {/* Skill Items */}
      <div className={`flex flex-col ${isCompact ? 'gap-0.5' : 'gap-1'}`}>
        {(skillItems as SkillItem[]).map((skill, idx) => (
          <div key={idx} className={`flex items-center ${gapClass}`}>
            {/* Skill Name */}
            <span className={`flex-1 ${itemClass} text-theme-ink font-body`}>
              {skill.name}
            </span>

            {/* Modifier with +/- buttons */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={() => adjustSkillValue(idx, -1)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`${buttonSize} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors text-theme-ink rounded-theme`}
              >
                -
              </button>
              <span className={`font-bold ${itemClass} ${modifierWidth} text-center flex-shrink-0 text-theme-ink`}>
                {formatModifier(skill.value)}
              </span>
              <button
                onClick={() => adjustSkillValue(idx, 1)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`${buttonSize} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors text-theme-ink rounded-theme`}
              >
                +
              </button>
            </div>
          </div>
        ))}
        {skillItems.length === 0 && (
          <div className={`${itemClass} text-theme-muted italic`}>No skills configured</div>
        )}
      </div>
    </div>
  );
}
