import { useState } from 'react';
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

export default function SkillWidget({ widget, mode, width, height }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const { label, skillItems = [] } = widget.data;
  const [newSkillName, setNewSkillName] = useState('');

  // Responsive sizing
  const isCompact = width < 180 || height < 120;
  const isLarge = width >= 350 && height >= 250;
  
  const labelClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const itemClass = isCompact ? 'text-xs' : isLarge ? 'text-base' : 'text-sm';
  const buttonSize = isCompact ? 'w-4 h-4 text-[10px]' : isLarge ? 'w-6 h-6 text-sm' : 'w-5 h-5 text-xs';
  const inputWidth = isCompact ? 'w-6 text-xs' : isLarge ? 'w-10 text-base' : 'w-8 text-sm';
  const modifierWidth = isCompact ? 'w-6' : isLarge ? 'w-10' : 'w-8';
  const gapClass = isCompact ? 'gap-1' : 'gap-2';

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateWidgetData(widget.id, { label: e.target.value });
  };

  const addSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkillName.trim()) {
      updateWidgetData(widget.id, {
        skillItems: [...skillItems, { name: newSkillName.trim(), value: 0 }]
      });
      setNewSkillName('');
    }
  };

  const removeSkill = (index: number) => {
    const updated = [...skillItems];
    updated.splice(index, 1);
    updateWidgetData(widget.id, { skillItems: updated });
  };

  const updateSkillName = (index: number, name: string) => {
    const updated = [...skillItems] as SkillItem[];
    updated[index] = { ...updated[index], name };
    updateWidgetData(widget.id, { skillItems: updated });
  };

  const updateSkillValue = (index: number, value: number) => {
    const updated = [...skillItems] as SkillItem[];
    updated[index] = { ...updated[index], value };
    updateWidgetData(widget.id, { skillItems: updated });
  };

  const adjustSkillValue = (index: number, delta: number) => {
    const updated = [...skillItems] as SkillItem[];
    updated[index] = { ...updated[index], value: updated[index].value + delta };
    updateWidgetData(widget.id, { skillItems: updated });
  };

  const formatModifier = (value: number) => value >= 0 ? `+${value}` : `${value}`;

  return (
    <div className={`flex flex-col ${gapClass} w-full h-full`}>
      <input
        className={`font-bold bg-transparent border-b border-transparent hover:border-theme-border/50 focus:border-theme-border focus:outline-none ${labelClass} flex-shrink-0 text-theme-ink font-heading`}
        value={label}
        onChange={handleLabelChange}
        placeholder="Skills"
        disabled={mode === 'play'}
        onMouseDown={(e) => e.stopPropagation()}
      />

      {/* Skill Items */}
      <div className={`flex flex-col ${isCompact ? 'gap-0.5' : 'gap-1'} flex-1 overflow-y-auto min-h-0`}>
        {(skillItems as SkillItem[]).map((skill, idx) => (
          <div key={idx} className={`flex items-center ${gapClass} group`}>
            {/* Skill Name */}
            <input
              className={`flex-1 ${itemClass} bg-transparent border-b border-transparent hover:border-theme-border/50 focus:border-theme-border focus:outline-none min-w-0 text-theme-ink font-body`}
              value={skill.name}
              onChange={(e) => updateSkillName(idx, e.target.value)}
              placeholder="Skill"
              disabled={mode === 'play'}
              onMouseDown={(e) => e.stopPropagation()}
            />

            {/* Modifier */}
            {mode === 'edit' ? (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={() => adjustSkillValue(idx, -1)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`${buttonSize} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors text-theme-ink rounded-theme`}
                >
                  -
                </button>
                <input
                  type="number"
                  value={skill.value}
                  onChange={(e) => updateSkillValue(idx, parseInt(e.target.value) || 0)}
                  className={`${inputWidth} text-center font-bold border border-theme-border/50 focus:border-theme-border focus:outline-none text-theme-ink bg-theme-paper rounded-theme`}
                  onMouseDown={(e) => e.stopPropagation()}
                />
                <button
                  onClick={() => adjustSkillValue(idx, 1)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`${buttonSize} border border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-colors text-theme-ink rounded-theme`}
                >
                  +
                </button>
              </div>
            ) : (
              <span className={`font-bold ${itemClass} ${modifierWidth} text-center flex-shrink-0 text-theme-ink`}>
                {formatModifier(skill.value)}
              </span>
            )}

            {/* Remove Button */}
            {mode === 'edit' && (
              <button
                onClick={() => removeSkill(idx)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 ${itemClass} flex-shrink-0`}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add New Skill (edit mode only) */}
      {mode === 'edit' && (
        <form onSubmit={addSkill} className="flex gap-1 mt-1">
          <input
            type="text"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            placeholder="Add skill..."
            className={`flex-1 ${itemClass} border-b border-theme-border/50 focus:border-theme-border focus:outline-none py-1 bg-transparent text-theme-ink font-body`}
            onMouseDown={(e) => e.stopPropagation()}
          />
          <button
            type="submit"
            className={`${isCompact ? 'text-base' : 'text-lg'} font-bold hover:text-theme-muted px-1 text-theme-ink`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            +
          </button>
        </form>
      )}
    </div>
  );
}
