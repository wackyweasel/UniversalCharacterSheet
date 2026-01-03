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
import MapSketcherWidget from './widgets/MapSketcherWidget';
import RollTableWidget from './widgets/RollTableWidget';
import InitiativeTrackerWidget from './widgets/InitiativeTrackerWidget';

interface Props {
  widget: Widget;
  index: number;
  totalWidgets: number;
  isDragging: boolean;
  draggedIndex: number | null;
  dropTargetIndex: number | null;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
}

export default function VerticalWidget({
  widget,
  index,
  totalWidgets,
  isDragging,
  draggedIndex,
  dropTargetIndex,
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
    'CHECKBOX': 'Checklist',
    'TOGGLE_GROUP': 'Conditions',
    'DICE_ROLLER': 'Dice Roller',
    'DICE_TRAY': 'Dice Tray',
    'FORM': 'Form',
    'HEALTH_BAR': 'Health Bar',
    'IMAGE': 'Image',
    'INITIATIVE_TRACKER': 'Initiative Tracker',
    'LIST': 'List',
    'MAP_SKETCHER': 'Map Sketcher',
    'NUMBER_DISPLAY': 'Number Display',
    'NUMBER': 'Number Tracker',
    'POOL': 'Resource Pool',
    'PROGRESS_BAR': 'Progress Bar',
    'REST_BUTTON': 'Rest Button',
    'SPELL_SLOT': 'Spell Slots',
    'TABLE': 'Table',
    'TEXT': 'Text Area',
    'TIME_TRACKER': 'Temporary Effects',
    'ROLL_TABLE': 'Roll Table',
  };
  
  // Get widget label for collapsed header
  const getWidgetLabel = () => {
    return widget.data.label || WIDGET_NAMES[widget.type] || widget.type;
  };
  
  // Calculate if this widget should show a drop indicator
  // Show indicator above this widget if dropTargetIndex equals this index and we're dragging from below
  const showDropBefore = isDragging && 
    draggedIndex !== null && 
    dropTargetIndex === index && 
    draggedIndex > index;
  // Show indicator below this widget if dropTargetIndex equals this index and we're dragging from above
  const showDropAfter = isDragging && 
    draggedIndex !== null && 
    dropTargetIndex === index && 
    draggedIndex < index;

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
    // Only allow drag from the handle
    const target = e.target as HTMLElement;
    if (!target.closest('.vertical-drag-handle')) {
      e.preventDefault();
      return;
    }
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

  const renderContent = () => {
    // Use a fixed width for internal widget calculations
    // Pass a very large height to disable maxHeight constraints so content shows fully
    const props = { widget, mode: 'play' as const, width: 320, height: 10000 };
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
      case 'MAP_SKETCHER': return <MapSketcherWidget {...props} height={300} />;
      case 'ROLL_TABLE': return <RollTableWidget {...props} />;
      case 'INITIATIVE_TRACKER': return <InitiativeTrackerWidget {...props} />;
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
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Drop indicator before */}
      {showDropBefore && (
        <div className="absolute -top-2 left-0 right-0 h-1 bg-theme-accent rounded-full z-50" />
      )}
      
      {/* Widget Card */}
      <div 
        className="bg-theme-paper border-[length:var(--border-width)] border-theme-border rounded-theme overflow-visible relative"
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
          {/* Drag Handle - positioned at left, only this area is draggable */}
          <div 
            className="vertical-drag-handle cursor-grab active:cursor-grabbing flex items-center gap-2 touch-none select-none"
            draggable
            onDragStart={handleDragStart}
          >
            {/* Grip icon (6 dots in 2 columns) */}
            <svg 
              width="10" 
              height="16" 
              viewBox="0 0 10 16" 
              className="text-theme-muted flex-shrink-0"
              fill="currentColor"
            >
              <circle cx="2" cy="2" r="1.5" />
              <circle cx="8" cy="2" r="1.5" />
              <circle cx="2" cy="8" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="2" cy="14" r="1.5" />
              <circle cx="8" cy="14" r="1.5" />
            </svg>
          </div>
          
          {/* Label when collapsed */}
          {isCollapsed && (
            <span className="text-xs font-bold text-theme-ink font-heading truncate flex-1 ml-2">{getWidgetLabel()}</span>
          )}
          
          {/* Spacer when not collapsed */}
          {!isCollapsed && <div className="flex-1" />}
          
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
          <div className="relative px-3 pb-2">
            {renderContent()}
          </div>
        )}
      </div>
      
      {/* Drop indicator after */}
      {showDropAfter && (
        <div className="absolute -bottom-2 left-0 right-0 h-1 bg-theme-accent rounded-full z-50" />
      )}
      
      {/* Separator between widgets (except last) - always show to prevent layout shift */}
      {index < totalWidgets - 1 && (
        <div className="h-px bg-theme-border/30 my-1" />
      )}
    </div>
  );
}
