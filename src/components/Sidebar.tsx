import { useStore } from '../store/useStore';
import { WidgetType } from '../types';

const WIDGET_OPTIONS: { type: WidgetType; label: string }[] = [
  { type: 'NUMBER', label: 'Number Tracker' },
  { type: 'LIST', label: 'List' },
  { type: 'TEXT', label: 'Text Area' },
  { type: 'CHECKBOX', label: 'Checkbox' },
  { type: 'HEALTH_BAR', label: 'Health Bar' },
  { type: 'DICE_ROLLER', label: 'Dice Roller' },
  { type: 'SPELL_SLOT', label: 'Spell Slots' },
  { type: 'IMAGE', label: 'Image' },
  { type: 'POOL', label: 'Resource Pool' },
  { type: 'TOGGLE_GROUP', label: 'Conditions' },
  { type: 'TABLE', label: 'Table' },
  { type: 'TIME_TRACKER', label: 'Time Tracker' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const addWidget = useStore((state) => state.addWidget);

  const handleAdd = (type: WidgetType) => {
    // Add to center of screen roughly (fixed for now, could be dynamic based on viewport)
    addWidget(type, 100, 100);
  };

  const handleDragStart = (e: React.DragEvent, type: WidgetType) => {
    e.dataTransfer.setData('widgetType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {!collapsed && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={onToggle}
        />
      )}
      
      <div 
        className={`fixed left-0 top-0 bottom-0 w-[80vw] max-w-[280px] md:w-64 bg-theme-paper border-r-[length:var(--border-width)] border-theme-border z-50 flex flex-col p-3 sm:p-4 shadow-theme overflow-y-auto transition-transform duration-300 ease-in-out safe-area-bottom ${
          collapsed ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        {/* Toggle button - positioned on the edge of sidebar (hidden on mobile, use floating button instead) */}
        <button
          onClick={onToggle}
          className="hidden md:flex absolute -right-10 top-20 w-10 h-10 bg-theme-paper border-[length:var(--border-width)] border-theme-border border-l-0 font-bold shadow-theme hover:bg-theme-accent hover:text-theme-paper transition-all items-center justify-center text-theme-ink"
          title={collapsed ? 'Show Toolbox' : 'Hide Toolbox'}
        >
          {collapsed ? '▶' : '◀'}
        </button>

        {/* Mobile close button */}
        <button
          onClick={onToggle}
          className="md:hidden absolute top-3 right-3 w-8 h-8 bg-theme-accent text-theme-paper font-bold flex items-center justify-center rounded-theme"
        >
          ✕
        </button>

        <div className="mb-4 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wider border-b-[length:var(--border-width)] border-theme-border pb-2 text-theme-ink font-heading">
            Toolbox
          </h2>
        </div>

        <div className="flex flex-col gap-2 sm:gap-3">
          {WIDGET_OPTIONS.map(({ type, label }) => (
            <div
              key={type}
              draggable
              onDragStart={(e) => handleDragStart(e, type)}
              onClick={() => handleAdd(type)}
              className="p-2 sm:p-3 border-[length:var(--border-width)] border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-all text-left font-bold shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer flex items-center gap-2 bg-theme-paper text-theme-ink rounded-theme"
            >
              <span className="text-xs sm:text-sm font-body">+ {label}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-4 text-[10px] sm:text-xs text-theme-muted border-t border-theme-border/50 font-body">
          <p className="hidden sm:block">Drag widgets to arrange.</p>
          <p className="sm:hidden">Tap to add widgets.</p>
          <p>Pan with finger/mouse.</p>
          <p>Pinch/scroll to zoom.</p>
          <p className="mt-2 text-theme-ink font-bold">Edit Mode Active</p>
        </div>
      </div>
    </>
  );
}
