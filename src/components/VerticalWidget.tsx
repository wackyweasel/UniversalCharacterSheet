import { useRef, useState, useEffect } from 'react';
import { Widget, WidgetType } from '../types';
import { useStore } from '../store/useStore';
import { isImageTexture, IMAGE_TEXTURES, getBuiltInTheme } from '../store/useThemeStore';
import { getCustomTheme } from '../store/useCustomThemeStore';
import NumberWidget from './widgets/NumberWidget';
import NumberDisplayWidget from './widgets/NumberDisplayWidget';
import ListWidget from './widgets/ListWidget';
import TextWidget from './widgets/TextWidget';
import CheckboxWidget from './widgets/CheckboxWidget';
import HealthBarWidget from './widgets/HealthBarWidget';
import DiceRollerWidget from './widgets/DiceRollerWidget';
import DiceTrayWidget from './widgets/DiceTrayWidget';
import SpellSlotWidget from './widgets/SpellSlotWidget';
import ImageWidget from './widgets/ImageWidget';
import PoolWidget from './widgets/PoolWidget';
import ConditionWidget from './widgets/ConditionWidget';
import TableWidget from './widgets/TableWidget';
import TimeTrackerWidget from './widgets/TimeTrackerWidget';
import FormWidget from './widgets/FormWidget';
import RestButtonWidget from './widgets/RestButtonWidget';
import ProgressBarWidget from './widgets/ProgressBarWidget';

interface Props {
  widget: Widget;
  index: number;
  totalWidgets: number;
  isDragging: boolean;
  draggedIndex: number | null;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
}

// Minimum heights per widget type for vertical mode
const MIN_HEIGHTS: Record<WidgetType, number> = {
  'NUMBER': 60,
  'NUMBER_DISPLAY': 80,
  'LIST': 80,
  'TEXT': 60,
  'CHECKBOX': 60,
  'HEALTH_BAR': 80,
  'DICE_ROLLER': 120,
  'DICE_TRAY': 180,
  'SPELL_SLOT': 80,
  'IMAGE': 100,
  'POOL': 80,
  'TOGGLE_GROUP': 60,
  'TABLE': 80,
  'TIME_TRACKER': 140,
  'FORM': 60,
  'REST_BUTTON': 80,
  'PROGRESS_BAR': 80,
};

export default function VerticalWidget({
  widget,
  index,
  totalWidgets,
  isDragging,
  draggedIndex,
  onDragStart,
  onDragOver,
  onDragEnd,
}: Props) {
  const nodeRef = useRef<HTMLDivElement>(null);
  
  // Get current character's theme for texture info
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const characters = useStore((state) => state.characters);
  const activeCharacter = characters.find(c => c.id === activeCharacterId);
  const customTheme = activeCharacter?.theme ? getCustomTheme(activeCharacter.theme) : undefined;
  const builtInTheme = activeCharacter?.theme ? getBuiltInTheme(activeCharacter.theme) : undefined;
  const textureKey = customTheme?.cardTexture || builtInTheme?.cardTexture || 'none';
  const hasImageTexture = isImageTexture(textureKey);

  // Touch drag state
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [isDragHandle, setIsDragHandle] = useState(false);
  
  // Collapsed state - load from localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(`ucs:vertical-collapsed:${widget.id}`);
      return stored === 'true';
    } catch {
      return false;
    }
  });
  
  // Persist collapsed state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`ucs:vertical-collapsed:${widget.id}`, String(isCollapsed));
    } catch {
      // Ignore storage errors
    }
  }, [isCollapsed, widget.id]);

  // Listen for expand/collapse all events
  useEffect(() => {
    const handleCollapseAll = (e: CustomEvent<boolean>) => {
      setIsCollapsed(e.detail);
    };
    window.addEventListener('vertical-collapse-all', handleCollapseAll as EventListener);
    return () => {
      window.removeEventListener('vertical-collapse-all', handleCollapseAll as EventListener);
    };
  }, []);
  
  // Widget type to display name mapping (same as toolbox)
  const WIDGET_NAMES: Record<WidgetType, string> = {
    'CHECKBOX': 'Checkbox',
    'TOGGLE_GROUP': 'Conditions',
    'DICE_ROLLER': 'Dice Roller',
    'DICE_TRAY': 'Dice Tray',
    'FORM': 'Form',
    'HEALTH_BAR': 'Health Bar',
    'IMAGE': 'Image',
    'LIST': 'List',
    'NUMBER_DISPLAY': 'Number Display',
    'NUMBER': 'Number Tracker',
    'POOL': 'Resource Pool',
    'PROGRESS_BAR': 'Progress Bar',
    'REST_BUTTON': 'Rest Button',
    'SPELL_SLOT': 'Spell Slots',
    'TABLE': 'Table',
    'TEXT': 'Text Area',
    'TIME_TRACKER': 'Time Tracker',
  };
  
  // Get widget label for collapsed header
  const getWidgetLabel = () => {
    return widget.data.label || WIDGET_NAMES[widget.type] || widget.type;
  };
  
  // Calculate if this widget should show a drop indicator
  const showDropBefore = isDragging && draggedIndex !== null && 
    draggedIndex !== index && 
    draggedIndex !== index - 1 &&
    index === 0;
  const showDropAfter = isDragging && draggedIndex !== null && 
    draggedIndex !== index && 
    draggedIndex !== index + 1;

  const handleTouchStart = (e: React.TouchEvent) => {
    // Check if the touch is on the drag handle
    const target = e.target as HTMLElement;
    if (target.closest('.vertical-drag-handle')) {
      setIsDragHandle(true);
      setTouchStartY(e.touches[0].clientY);
      onDragStart(index);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragHandle || touchStartY === null) return;
    
    const touch = e.touches[0];
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    
    for (const el of elements) {
      const widgetEl = el.closest('[data-vertical-index]');
      if (widgetEl) {
        const overIndex = parseInt(widgetEl.getAttribute('data-vertical-index') || '0', 10);
        if (overIndex !== index) {
          onDragOver(overIndex);
        }
        break;
      }
    }
  };

  const handleTouchEnd = () => {
    if (isDragHandle) {
      setIsDragHandle(false);
      setTouchStartY(null);
      onDragEnd();
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    onDragStart(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOver(index);
  };

  const handleDragEnd = () => {
    onDragEnd();
  };

  // Width is full container width minus padding
  const minHeight = MIN_HEIGHTS[widget.type] || 80;

  const renderContent = () => {
    // Use a fixed width for internal widget calculations
    const props = { widget, mode: 'play' as const, width: 320, height: widget.h || minHeight };
    switch (widget.type) {
      case 'NUMBER': return <NumberWidget {...props} />;
      case 'NUMBER_DISPLAY': return <NumberDisplayWidget {...props} />;
      case 'LIST': return <ListWidget {...props} />;
      case 'TEXT': return <TextWidget {...props} />;
      case 'CHECKBOX': return <CheckboxWidget {...props} />;
      case 'HEALTH_BAR': return <HealthBarWidget {...props} />;
      case 'DICE_ROLLER': return <DiceRollerWidget {...props} />;
      case 'DICE_TRAY': return <DiceTrayWidget {...props} />;
      case 'SPELL_SLOT': return <SpellSlotWidget {...props} />;
      case 'IMAGE': return <ImageWidget {...props} />;
      case 'POOL': return <PoolWidget {...props} />;
      case 'TOGGLE_GROUP': return <ConditionWidget {...props} />;
      case 'TABLE': return <TableWidget {...props} />;
      case 'TIME_TRACKER': return <TimeTrackerWidget {...props} />;
      case 'FORM': return <FormWidget {...props} />;
      case 'REST_BUTTON': return <RestButtonWidget {...props} />;
      case 'PROGRESS_BAR': return <ProgressBarWidget {...props} />;
      default: return null;
    }
  };

  return (
    <div
      ref={nodeRef}
      data-vertical-index={index}
      className={`vertical-widget relative transition-all duration-200 ${
        isDragging && draggedIndex === index ? 'opacity-50 scale-95' : ''
      }`}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Drop indicator before */}
      {showDropBefore && (
        <div className="absolute -top-1 left-0 right-0 h-1 bg-theme-accent rounded-full" />
      )}
      
      {/* Widget Card */}
      <div 
        className="bg-theme-paper border-[length:var(--border-width)] border-theme-border rounded-theme overflow-hidden relative"
        style={{ 
          minHeight: isCollapsed ? 'auto' : `${minHeight}px`,
        }}
      >
        {/* Image texture overlay */}
        {hasImageTexture && (
          <div
            className="absolute inset-0 pointer-events-none rounded-theme z-0 overflow-hidden"
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

        {/* Header with drag handle and collapse toggle */}
        <div className="flex items-center justify-between px-3 py-1.5 relative z-20">
          {/* Drag Handle */}
          <div className="vertical-drag-handle cursor-move flex items-center gap-2 flex-1 touch-none">
            <div className="flex flex-col gap-0.5">
              <div className="w-4 h-0.5 bg-theme-muted/50 rounded-full" />
              <div className="w-4 h-0.5 bg-theme-muted/50 rounded-full" />
            </div>
            {isCollapsed && (
              <span className="text-xs font-bold text-theme-ink font-heading truncate">{getWidgetLabel()}</span>
            )}
          </div>
          
          {/* Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-6 h-6 flex items-center justify-center text-theme-muted hover:text-theme-ink transition-colors"
          >
            <span className={`transform transition-transform ${isCollapsed ? '' : 'rotate-180'}`}>
              ▼
            </span>
          </button>
        </div>

        {/* Content - only show when not collapsed */}
        {!isCollapsed && (
          <div className="relative z-10 px-3 pb-2">
            {renderContent()}
          </div>
        )}
      </div>
      
      {/* Drop indicator after */}
      {showDropAfter && (
        <div className="absolute -bottom-1 left-0 right-0 h-1 bg-theme-accent rounded-full" />
      )}
      
      {/* Separator between widgets (except last) */}
      {index < totalWidgets - 1 && !isDragging && (
        <div className="h-px bg-theme-border/30 my-1" />
      )}
    </div>
  );
}
