import { useState, useEffect, useRef } from 'react';
import { Widget, WidgetType } from '../types';
import { useStore } from '../store/useStore';
import { isImageTexture, IMAGE_TEXTURES, getBuiltInTheme } from '../store/useThemeStore';
import { getCustomTheme } from '../store/useCustomThemeStore';
import { ChevronDownIcon, DotsVerticalIcon, GripVerticalIcon, PencilIcon } from './icons';
import { Tooltip } from './Tooltip';
import { getWidgetTypeLabel } from '../utils/widgetMetadata';
import WidgetEditModal from './WidgetEditModal';
import WidgetOptionsMenu from './WidgetOptionsMenu';
import NumberWidget from './widgets/NumberWidget';
import NumberDisplayWidget from './widgets/NumberDisplayWidget';
import LabelWidget from './widgets/LabelWidget';
import ToggleWidget from './widgets/ToggleWidget';
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
import MixedFieldsWidget from './widgets/MixedFieldsWidget';
import RestButtonWidget from './widgets/RestButtonWidget';
import ProgressBarWidget from './widgets/ProgressBarWidget';
import ProgressClockWidget from './widgets/ProgressClockWidget';
import MapSketcherWidget from './widgets/MapSketcherWidget';
import RollTableWidget from './widgets/RollTableWidget';
import InitiativeTrackerWidget from './widgets/InitiativeTrackerWidget';
import InventoryWidget from './widgets/InventoryWidget';
import DeckWidget from './widgets/DeckWidget';
import CardTableWidget from './widgets/CardTableWidget';
import TimerWidget from './widgets/TimerWidget';
import StepDiceWidget from './widgets/StepDiceWidget';
import WalletWidget from './widgets/WalletWidget';

interface Props {
  widget: Widget;
  index: number;
  totalWidgets: number;
  registerElement: (widgetId: string, element: HTMLDivElement | null) => void;
  onDragStart: (widgetId: string, event: React.PointerEvent<HTMLButtonElement>) => void;
  onReorderKey: (widgetId: string, event: React.KeyboardEvent<HTMLButtonElement>) => void;
  searchRevealKey?: number;
}

const WIDGETS_WITH_HEADER_CONTROLS = new Set<WidgetType>([
  'FORM',
  'MIXED_FIELDS',
  'LIST',
  'CHECKBOX',
  'NUMBER',
  'NUMBER_DISPLAY',
  'POOL',
  'PROGRESS_CLOCK',
  'TOGGLE_GROUP',
  'STEP_DICE',
  'SPELL_SLOT',
  'INITIATIVE_TRACKER',
  'INVENTORY',
]);

export default function VerticalWidget({
  widget,
  index,
  totalWidgets,
  registerElement,
  onDragStart,
  onReorderKey,
  searchRevealKey,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  // Get current character's theme for texture info
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const characters = useStore((state) => state.characters);
  const setEditingWidgetId = useStore((state) => state.setEditingWidgetId);
  const activeCharacter = characters.find(c => c.id === activeCharacterId);
  const customTheme = activeCharacter?.theme ? getCustomTheme(activeCharacter.theme) : undefined;
  const builtInTheme = activeCharacter?.theme ? getBuiltInTheme(activeCharacter.theme) : undefined;
  const textureKey = customTheme?.cardTexture || builtInTheme?.cardTexture || 'none';
  const hasImageTexture = isImageTexture(textureKey);
  const isWidgetHeaderHidden = widget.type !== 'LABEL' && widget.type !== 'IMAGE' && widget.data.hideWidgetHeader === true;
  const renderedWidget = {
    ...widget,
    data: {
      ...widget.data,
      label: isWidgetHeaderHidden ? undefined : widget.data.label,
      showFieldControls: isWidgetHeaderHidden ? false : widget.data.showFieldControls,
      showTableEditButton: isWidgetHeaderHidden ? false : widget.data.showTableEditButton,
    },
  };
  const hasHeaderControls = WIDGETS_WITH_HEADER_CONTROLS.has(widget.type)
    && !isWidgetHeaderHidden
    && widget.data.showFieldControls !== false;
  const hasInternalHeaderLabel = !isWidgetHeaderHidden && widget.data.label && !((widget.type === 'PROGRESS_BAR' || widget.type === 'TOGGLE') && widget.data.inlineLabel);

  const [showEditModal, setShowEditModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
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
    if (searchRevealKey === undefined) return;
    setIsCollapsed(false);
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        rootRef.current?.scrollIntoView({
          block: 'center',
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        });
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [searchRevealKey]);
  
  // Get widget label for collapsed header
  const getWidgetLabel = () => {
    return widget.data.label || getWidgetTypeLabel(widget.type);
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
    const props = { widget: renderedWidget, mode: 'play' as const, width: 320, height: 10000 };
    switch (widget.type) {
      case 'NUMBER': return <NumberWidget {...props} />;
      case 'NUMBER_DISPLAY': return <NumberDisplayWidget {...props} />;
      case 'LABEL': return <LabelWidget widget={renderedWidget} />;
      case 'LIST': return <ListWidget {...props} />;
      case 'TEXT': return <TextWidget {...props} />;
      case 'CHECKBOX': return <CheckboxWidget {...props} />;
      case 'HEALTH_BAR': return <HealthBarWidget {...props} />;
      case 'DICE_ROLLER': return <DiceRollerWidget {...props} />;
      case 'DICE_TRAY': return <DiceTrayWidget {...props} />;
      case 'SPELL_SLOT': return <SpellSlotWidget {...props} />;
      case 'IMAGE': return <ImageWidget {...props} />;
      case 'POOL': return <PoolWidget {...props} />;
      case 'TOGGLE': return <ToggleWidget {...props} />;
      case 'TOGGLE_GROUP': return <ConditionWidget {...props} />;
      case 'TABLE': return <TableWidget {...props} />;
      case 'TIME_TRACKER': return <TimeTrackerWidget {...props} />;
      case 'FORM': return <FormWidget {...props} />;
      case 'MIXED_FIELDS': return <MixedFieldsWidget {...props} />;
      case 'REST_BUTTON': return <RestButtonWidget {...props} />;
      case 'PROGRESS_BAR': return <ProgressBarWidget {...props} />;
      case 'PROGRESS_CLOCK': return <ProgressClockWidget {...props} interactive />;
      case 'MAP_SKETCHER': return <MapSketcherWidget {...props} height={300} />;
      case 'ROLL_TABLE': return <RollTableWidget {...props} />;
      case 'INITIATIVE_TRACKER': return <InitiativeTrackerWidget {...props} />;
      case 'INVENTORY': return <InventoryWidget {...props} />;
      case 'DECK': return <DeckWidget {...props} />;
      case 'DECK_OF_CARDS': return <CardTableWidget {...props} interactive showControls />;
      case 'TIMER': return <TimerWidget {...props} />;
      case 'STEP_DICE': return <StepDiceWidget {...props} />;
      case 'WALLET': return <WalletWidget {...props} />;
      default: return null;
    }
  };

  return (
    <div
      ref={(element) => {
        rootRef.current = element;
        registerElement(widget.id, element);
      }}
      data-vertical-index={index}
      data-widget-id={widget.id}
      className={`vertical-widget vertical-widget-sort-item relative ${widget.type === 'DECK_OF_CARDS' ? 'vertical-widget--card-table' : ''} ${searchRevealKey !== undefined ? 'widget-search-target' : ''}`}
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
            <div className="h-7 w-[60px] flex-shrink-0" aria-hidden="true" />
          )}

          <div className="flex flex-shrink-0 items-center gap-1">
            {!widget.data.hideWidgetEditButton && (
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
            )}
            <Tooltip content="Widget options">
              <button
                ref={menuTriggerRef}
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label={`Options for ${getWidgetLabel()}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="widget-control widget-control--subtle h-7 w-7 min-h-0"
              >
                <DotsVerticalIcon className="h-3.5 w-3.5" />
              </button>
            </Tooltip>

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
        </div>

        {/* Content - only show when not collapsed */}
        {!isCollapsed && (
          <div className={`vertical-widget-body ${isWidgetHeaderHidden ? 'widget-content--header-hidden' : ''} ${hasHeaderControls ? 'vertical-widget-body--header-controls' : hasInternalHeaderLabel && widget.type !== 'REST_BUTTON' ? 'vertical-widget-body--header-label' : ''} ${widget.locked ? 'pointer-events-none opacity-70' : ''}`}>
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

      {menuOpen && (
        <WidgetOptionsMenu
          widget={widget}
          anchorRef={menuTriggerRef}
          point={null}
          onClose={() => setMenuOpen(false)}
          onEdit={() => {
            setMenuOpen(false);
            openEditModal();
          }}
        />
      )}
    </div>
  );
}
