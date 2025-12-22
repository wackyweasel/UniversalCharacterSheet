import { useState } from 'react';
import { useStore } from '../store/useStore';
import { useTemplateStore } from '../store/useTemplateStore';
import { WidgetType } from '../types';
import { isImageTexture, IMAGE_TEXTURES, getBuiltInTheme } from '../store/useThemeStore';
import { getCustomTheme } from '../store/useCustomThemeStore';

const WIDGET_OPTIONS: { type: WidgetType; label: string }[] = [
  { type: 'CHECKBOX', label: 'Checkbox' },
  { type: 'TOGGLE_GROUP', label: 'Conditions' },
  { type: 'DICE_ROLLER', label: 'Dice Roller' },
  { type: 'DICE_TRAY', label: 'Dice Tray' },
  { type: 'FORM', label: 'Form' },
  { type: 'HEALTH_BAR', label: 'Health Bar' },
  { type: 'IMAGE', label: 'Image' },
  { type: 'LIST', label: 'List' },
  { type: 'MAP_SKETCHER', label: 'Map Sketcher' },
  { type: 'NUMBER_DISPLAY', label: 'Number Display' },
  { type: 'NUMBER', label: 'Number Tracker' },
  { type: 'POOL', label: 'Resource Pool' },
  { type: 'PROGRESS_BAR', label: 'Progress Bar' },
  { type: 'REST_BUTTON', label: 'Rest Button' },
  { type: 'ROLL_TABLE', label: 'Roll Table' },
  { type: 'SPELL_SLOT', label: 'Spell Slots' },
  { type: 'TABLE', label: 'Table' },
  { type: 'TEXT', label: 'Text Area' },
  { type: 'TIME_TRACKER', label: 'Time Tracker' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const addWidget = useStore((state) => state.addWidget);
  const addWidgetFromTemplate = useStore((state) => state.addWidgetFromTemplate);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const characters = useStore((state) => state.characters);
  const activeCharacter = characters.find(c => c.id === activeCharacterId);
  const customTheme = activeCharacter?.theme ? getCustomTheme(activeCharacter.theme) : undefined;
  const builtInTheme = activeCharacter?.theme ? getBuiltInTheme(activeCharacter.theme) : undefined;
  const textureKey = customTheme?.cardTexture || builtInTheme?.cardTexture || 'none';
  const hasImageTexture = isImageTexture(textureKey);
  
  const templates = useTemplateStore((state) => state.templates);
  const removeTemplate = useTemplateStore((state) => state.removeTemplate);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

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
      {/* Overlay backdrop */}
      {!collapsed && (
        <div 
          className="fixed inset-0 bg-black/30 z-40"
          onClick={onToggle}
        />
      )}
      
      <div 
        className={`fixed left-0 top-0 bottom-0 w-[80vw] max-w-[280px] bg-theme-paper border-r-[length:var(--border-width)] border-theme-border z-50 flex flex-col p-3 shadow-theme overflow-hidden transition-transform duration-300 ease-in-out safe-area-bottom touch-pan-y ${
          collapsed ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        {/* Image texture overlay - grayscale texture tinted with card color */}
        {hasImageTexture && (
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{ backgroundColor: 'var(--color-paper)' }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${IMAGE_TEXTURES[textureKey]})`,
                backgroundSize: 'cover',
                filter: 'grayscale(100%)',
                opacity: 'var(--card-texture-opacity)',
                mixBlendMode: 'overlay',
              }}
            />
          </div>
        )}
        
        {/* Close button - top right corner */}
        <button
          onClick={onToggle}
          className="absolute top-3 right-3 w-10 h-10 bg-theme-accent text-theme-paper font-bold flex items-center justify-center rounded-theme z-20 shadow-theme"
        >
          ✕
        </button>
        
        {/* Sidebar content */}
        <div className="relative z-10 flex flex-col h-full overflow-y-auto touch-pan-y pt-12">

        <div className="mb-4">
          <h2 className="text-xl font-bold uppercase tracking-wider border-b-[length:var(--border-width)] border-theme-border pb-2 text-theme-ink font-heading">
            Toolbox
          </h2>
        </div>

        <div className="flex flex-col gap-2">
          {WIDGET_OPTIONS.map(({ type, label }) => (
            <div
              key={type}
              draggable
              onDragStart={(e) => handleDragStart(e, type)}
              onClick={() => handleAdd(type)}
              className="p-2 border-[length:var(--border-width)] border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-all text-left font-bold shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer flex items-center gap-2 bg-theme-paper text-theme-ink rounded-theme"
            >
              <span className="text-xs font-body">+ {label}</span>
            </div>
          ))}
        </div>

        {/* Templates Section */}
        {templates.length > 0 && (
          <>
            <div className="mt-6 mb-4">
              <h2 className="text-xl font-bold uppercase tracking-wider border-b-[length:var(--border-width)] border-theme-border pb-2 text-theme-ink font-heading">
                Templates
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="p-2 border-[length:var(--border-width)] border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-all text-left font-bold shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer flex items-center justify-between bg-theme-paper text-theme-ink rounded-theme group"
                >
                  <span 
                    className="text-xs font-body flex-1 truncate"
                    onClick={() => addWidgetFromTemplate(template)}
                  >
                    + {template.name}
                  </span>
                  {confirmingDeleteId === template.id ? (
                    <div className="flex gap-1 ml-2">
                      <button
                        className="px-2 py-0.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTemplate(template.id);
                          setConfirmingDeleteId(null);
                        }}
                      >
                        Yes
                      </button>
                      <button
                        className="px-2 py-0.5 text-xs bg-theme-border text-theme-ink rounded hover:bg-theme-muted transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmingDeleteId(null);
                        }}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      className="ml-2 w-5 h-5 flex items-center justify-center text-theme-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmingDeleteId(template.id);
                      }}
                      title="Delete template"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-auto pt-4 text-[10px] text-theme-muted border-t border-theme-border/50 font-body">
          <p>Tap to add widgets.</p>
          <p>Pan with finger/mouse.</p>
          <p>Pinch/scroll to zoom.</p>
          <p className="mt-2 text-theme-ink font-bold">Edit Mode Active</p>
        </div>
        </div>
      </div>
    </>
  );
}
