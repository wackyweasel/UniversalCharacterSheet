import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Widget, WidgetType } from '../types';
import { useStore } from '../store/useStore';
import { isImageTexture, IMAGE_TEXTURES, getBuiltInTheme } from '../store/useThemeStore';
import { getCustomTheme } from '../store/useCustomThemeStore';
import { ChevronDownIcon, GripVerticalIcon, PencilIcon, TrashIcon } from './icons';
import { Tooltip } from './Tooltip';
import WidgetEditModal from './WidgetEditModal';
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
import DeckWidget from './widgets/DeckWidget';
import TimerWidget from './widgets/TimerWidget';
import StepDiceWidget from './widgets/StepDiceWidget';

interface Props {
  widget: Widget;
  index: number;
  totalWidgets: number;
  registerElement: (widgetId: string, element: HTMLDivElement | null) => void;
  onDragStart: (widgetId: string, event: React.PointerEvent<HTMLButtonElement>) => void;
  onReorderKey: (widgetId: string, event: React.KeyboardEvent<HTMLButtonElement>) => void;
  isBuildMode: boolean;
}

const WIDGETS_WITH_HEADER_CONTROLS = new Set<WidgetType>([
  'FORM',
  'LIST',
  'CHECKBOX',
  'NUMBER',
  'NUMBER_DISPLAY',
  'POOL',
  'TOGGLE_GROUP',
  'HEALTH_BAR',
]);

const WIDGETS_WITH_WIDE_HEADER_CONTROLS = new Set<WidgetType>(['HEALTH_BAR']);

export default function VerticalWidget({
  widget,
  index,
  totalWidgets,
  registerElement,
  onDragStart,
  onReorderKey,
  isBuildMode,
}: Props) {
  // Get current character's theme for texture info
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const characters = useStore((state) => state.characters);
  const removeWidget = useStore((state) => state.removeWidget);
  const setEditingWidgetId = useStore((state) => state.setEditingWidgetId);
  const activeCharacter = characters.find(c => c.id === activeCharacterId);
  const customTheme = activeCharacter?.theme ? getCustomTheme(activeCharacter.theme) : undefined;
  const builtInTheme = activeCharacter?.theme ? getBuiltInTheme(activeCharacter.theme) : undefined;
  const textureKey = customTheme?.cardTexture || builtInTheme?.cardTexture || 'none';
  const hasImageTexture = isImageTexture(textureKey);
  const hasWideHeaderControls = WIDGETS_WITH_WIDE_HEADER_CONTROLS.has(widget.type);
  const hasHeaderControls = WIDGETS_WITH_HEADER_CONTROLS.has(widget.type) && (
    hasWideHeaderControls
      ? widget.data.showMaxControl !== false
      : widget.data.showFieldControls !== false
  );
  const hasInternalHeaderLabel = widget.data.label && !(widget.type === 'PROGRESS_BAR' && widget.data.inlineLabel);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
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

  useEffect(() => {
    if (!showDeleteConfirm) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowDeleteConfirm(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteConfirm]);
  
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
    'GRID_MAP': 'Grid Map',
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
    'DECK': 'Deck of Cards',
    'TIMER': 'Timer',
    'STEP_DICE': 'Step Dice',
  };
  
  // Get widget label for collapsed header
  const getWidgetLabel = () => {
    return widget.data.label || WIDGET_NAMES[widget.type] || widget.type;
  };

  const openEditModal = () => {
    setShowEditModal(true);
    setEditingWidgetId(widget.id);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingWidgetId(null);
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
      case 'DECK': return <DeckWidget {...props} />;
      case 'TIMER': return <TimerWidget {...props} />;
      case 'STEP_DICE': return <StepDiceWidget {...props} />;
      default: return null;
    }
  };

  return (
    <div
      ref={(element) => registerElement(widget.id, element)}
      data-vertical-index={index}
      data-widget-id={widget.id}
      className="vertical-widget vertical-widget-sort-item relative"
    >
      {/* Widget Card */}
      <div className="vertical-widget-card">
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
        <div className={`vertical-widget-header ${isCollapsed ? '' : 'vertical-widget-header--expanded'}`}>
          {/* Drag Handle - positioned at left, only this area is draggable (disabled when locked) */}
          <button
            type="button"
            className="vertical-drag-handle widget-control widget-control--subtle flex h-7 w-7 min-h-0 flex-shrink-0 items-center justify-center"
            aria-label={`Reorder ${getWidgetLabel()}`}
            title="Drag to reorder. Arrow keys also work."
            onPointerDown={(event) => {
              event.stopPropagation();
              onDragStart(widget.id, event);
            }}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => onReorderKey(widget.id, event)}
          >
            <GripVerticalIcon className="h-4 w-4 text-theme-muted" />
          </button>
          
          {/* Lock indicator */}
          {widget.locked && (
            <svg className="w-3.5 h-3.5 text-theme-ink ml-1" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          )}
          
          {/* Label when collapsed */}
          <span className="text-xs font-bold text-theme-ink font-heading truncate flex-1">{getWidgetLabel()}</span>

          {hasHeaderControls && !isCollapsed && (
            <div className={`h-6 flex-shrink-0 ${hasWideHeaderControls ? 'w-16' : 'w-[52px]'}`} aria-hidden="true" />
          )}

          {isBuildMode && (
            <div className="flex flex-shrink-0 items-center gap-1">
              <Tooltip content={`Edit ${getWidgetLabel()}`}>
                <button
                  type="button"
                  onClick={openEditModal}
                  aria-label={`Edit ${getWidgetLabel()}`}
                  className="widget-control widget-control--subtle h-7 w-7 min-h-0"
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
              <Tooltip content={`Delete ${getWidgetLabel()}`}>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  aria-label={`Delete ${getWidgetLabel()}`}
                  className="widget-control widget-control--subtle h-7 w-7 min-h-0 text-red-500 hover:border-red-500 hover:bg-red-500 hover:text-white"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            </div>
          )}
          
          {/* Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${getWidgetLabel()}`}
            aria-expanded={!isCollapsed}
            className="widget-control widget-control--subtle w-7 h-7 min-h-0"
          >
            <ChevronDownIcon className={`w-4 h-4 transform transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
          </button>
        </div>

        {/* Content - only show when not collapsed */}
        {!isCollapsed && (
          <div className={`vertical-widget-body ${hasHeaderControls ? `vertical-widget-body--header-controls ${isBuildMode ? 'vertical-widget-body--build-actions' : ''}` : hasInternalHeaderLabel && widget.type !== 'REST_BUTTON' ? 'vertical-widget-body--header-label' : ''} ${widget.locked ? 'pointer-events-none opacity-70' : ''}`}>
            {renderContent()}
          </div>
        )}
      </div>
      
      {index < totalWidgets - 1 && <div className="h-2" />}

      {showEditModal && (
        <WidgetEditModal
          widget={widget}
          onClose={closeEditModal}
        />
      )}

      {showDeleteConfirm && createPortal(
        <div
          data-touch-camera-ignore="true"
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`vertical-delete-title-${widget.id}`}
            className="w-full max-w-sm rounded-button border border-theme-border bg-theme-paper p-4 text-theme-ink shadow-theme"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id={`vertical-delete-title-${widget.id}`} className="font-heading text-base font-bold">
              Delete {getWidgetLabel()}?
            </h3>
            <p className="mt-2 text-sm text-theme-muted">Remove this widget from the sheet?</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setShowDeleteConfirm(false)}
                className="widget-control px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  removeWidget(widget.id);
                }}
                className="min-h-8 rounded-button border border-red-600 bg-red-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-600"
              >
                Delete widget
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
