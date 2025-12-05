import { useStore } from '../store/useStore';
import { WidgetType } from '../types';

const WIDGET_OPTIONS: { type: WidgetType; label: string; icon: string }[] = [
  { type: 'NUMBER', label: 'Number Tracker', icon: '#' },
  { type: 'LIST', label: 'List', icon: '☰' },
  { type: 'TEXT', label: 'Text Area', icon: '¶' },
  { type: 'CHECKBOX', label: 'Checkbox', icon: '☑' },
  { type: 'HEALTH_BAR', label: 'Health Bar', icon: '♥' },
  { type: 'DICE_ROLLER', label: 'Dice Roller', icon: '🎲' },
  { type: 'SPELL_SLOT', label: 'Spell Slots', icon: '✦' },
  { type: 'SKILL', label: 'Skill', icon: '★' },
  { type: 'IMAGE', label: 'Image', icon: '🖼' },
  { type: 'POOL', label: 'Resource Pool', icon: '●' },
  { type: 'TOGGLE_GROUP', label: 'Conditions', icon: '⚡' },
  { type: 'TABLE', label: 'Table', icon: '▦' },
];

export default function Sidebar() {
  const addWidget = useStore((state) => state.addWidget);
  const selectCharacter = useStore((state) => state.selectCharacter);

  const handleAdd = (type: WidgetType) => {
    // Add to center of screen roughly (fixed for now, could be dynamic based on viewport)
    addWidget(type, 100, 100);
  };

  const handleDragStart = (e: React.DragEvent, type: WidgetType) => {
    e.dataTransfer.setData('widgetType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r-2 border-black z-50 flex flex-col p-4 shadow-hard overflow-y-auto">
      <div className="mb-8">
        <button 
          onClick={() => selectCharacter(null)}
          className="text-sm font-bold underline hover:text-gray-600 mb-4 block"
        >
          ← Back to Menu
        </button>
        <h2 className="text-2xl font-bold uppercase tracking-wider border-b-2 border-black pb-2">
          Toolbox
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        {WIDGET_OPTIONS.map(({ type, label, icon }) => (
          <div
            key={type}
            draggable
            onDragStart={(e) => handleDragStart(e, type)}
            onClick={() => handleAdd(type)}
            className="p-3 border-2 border-black hover:bg-black hover:text-white transition-all text-left font-bold shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-grab active:cursor-grabbing flex items-center gap-2"
          >
            <span className="text-lg">{icon}</span>
            <span className="text-sm">+ {label}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-4 text-xs text-gray-500 border-t border-gray-200">
        <p>Drag widgets to arrange.</p>
        <p>Left-click drag to pan.</p>
        <p>Scroll to zoom.</p>
        <p className="mt-2 text-gray-700 font-bold">Edit Mode Active</p>
      </div>
    </div>
  );
}
