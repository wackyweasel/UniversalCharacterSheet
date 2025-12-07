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

export default function SkillWidget({ widget, width, height }: Props) {
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
  
  // Calculate items area height
  const labelHeight = isCompact ? 16 : isLarge ? 24 : 20;
  const gapSize = isCompact ? 4 : 8;
  const padding = isCompact ? 8 : 16;
  const itemsHeight = Math.max(30, height - labelHeight - gapSize - padding * 2);

  const adjustSkillValue = (index: number, delta: number) => {
    const updated = [...skillItems] as SkillItem[];
    updated[index] = { ...updated[index], value: updated[index].value + delta };
    updateWidgetData(widget.id, { skillItems: updated });
  };

  const formatModifier = (value: number) => value >= 0 ? `+${value}` : `${value}`;

  // Fixed width for the modifier section to ensure alignment across all rows
  const modifierSectionWidth = isCompact ? 'w-[52px]' : isLarge ? 'w-[76px]' : 'w-[64px]';

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      <div className={`font-bold ${labelClass} text-theme-ink font-heading flex-shrink-0`}>
        {label || 'Skills'}
      </div>

      {/* Skill Items */}
      <div 
        className={`flex flex-col ${isCompact ? 'gap-0.5' : 'gap-1'} overflow-y-auto flex-1`}
        style={{ maxHeight: `${itemsHeight}px` }}
        onWheel={(e) => e.stopPropagation()}
      >
        {(skillItems as SkillItem[]).map((skill, idx) => (
          <div key={idx} className={`flex items-center ${gapClass}`}>
            {/* Skill Name */}
            <span className={`flex-1 ${itemClass} text-theme-ink font-body truncate`}>
              {skill.name}
            </span>

            {/* Modifier with +/- buttons - fixed width container for alignment */}
            <div className={`flex items-center justify-center gap-0.5 flex-shrink-0 ${modifierSectionWidth}`}>
              <button
                onClick={() => adjustSkillValue(idx, -1)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`${buttonSize} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors text-theme-ink rounded-theme flex-shrink-0`}
              >
                -
              </button>
              <span className={`font-bold ${itemClass} ${modifierWidth} text-center flex-shrink-0 text-theme-ink`}>
                {formatModifier(skill.value)}
              </span>
              <button
                onClick={() => adjustSkillValue(idx, 1)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`${buttonSize} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors text-theme-ink rounded-theme flex-shrink-0`}
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
