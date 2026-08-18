import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Widget, WidgetType } from '../types';
import { useStore } from '../store/useStore';
import { useTutorialStore, TUTORIAL_STEPS } from '../store/useTutorialStore';
import { PencilIcon, XIcon } from './icons';

// Import all editors
import {
  NumberEditor,
  NumberDisplayEditor,
  FormEditor,
  MixedFieldsEditor,
  ListEditor,
  TextEditor,
  LabelEditor,
  CheckboxEditor,
  ProgressBarEditor,
  HealthBarEditor,
  DiceRollerEditor,
  DiceTrayEditor,
  SpellSlotEditor,
  ImageEditor,
  PoolEditor,
  ToggleEditor,
  ConditionEditor,
  TimeTrackerEditor,
  TableEditor,
  RestButtonEditor,
  MapSketcherEditor,
  GridMapEditor,
  RollTableEditor,
  InitiativeTrackerEditor,
  InventoryEditor,
  DeckEditor,
  CardTableEditor,
  TimerEditor,
  StepDiceEditor,
} from './editors';

// Widget preview components (play mode view)
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
import MapSketcherWidget from './widgets/MapSketcherWidget';
import GridMapWidget from './widgets/GridMapWidget';
import RollTableWidget from './widgets/RollTableWidget';
import InitiativeTrackerWidget from './widgets/InitiativeTrackerWidget';
import InventoryWidget from './widgets/InventoryWidget';
import DeckWidget from './widgets/DeckWidget';
import CardTableWidget from './widgets/CardTableWidget';
import TimerWidget from './widgets/TimerWidget';
import StepDiceWidget from './widgets/StepDiceWidget';

interface Props {
  widget: Widget;
  onClose: () => void;
}

const WIDGET_TYPES_WITH_LABEL_SETTING = new Set<WidgetType>([
  'CHECKBOX',
  'DECK_OF_CARDS',
  'DECK',
  'DICE_ROLLER',
  'DICE_TRAY',
  'FORM',
  'MIXED_FIELDS',
  'GRID_MAP',
  'HEALTH_BAR',
  'IMAGE',
  'INITIATIVE_TRACKER',
  'INVENTORY',
  'LIST',
  'MAP_SKETCHER',
  'NUMBER',
  'NUMBER_DISPLAY',
  'POOL',
  'PROGRESS_BAR',
  'ROLL_TABLE',
  'SPELL_SLOT',
  'STEP_DICE',
  'TABLE',
  'TEXT',
  'TIME_TRACKER',
  'TIMER',
  'TOGGLE',
  'TOGGLE_GROUP',
]);

function getWidgetTitle(type: WidgetType): string {
  const titles: Record<WidgetType, string> = {
    'NUMBER': 'Number Tracker',
    'NUMBER_DISPLAY': 'Number Display',
    'LABEL': 'Label',
    'LIST': 'List',
    'TEXT': 'Text',
    'CHECKBOX': 'Checklist',
    'HEALTH_BAR': 'Health Bar',
    'DICE_ROLLER': 'Dice Roller',
    'DICE_TRAY': 'Dice Tray',
    'SPELL_SLOT': 'Spell Slots',
    'IMAGE': 'Image',
    'POOL': 'Resource Pool',
    'TOGGLE': 'Switch',
    'TOGGLE_GROUP': 'Conditions',
    'TABLE': 'Table',
    'TIME_TRACKER': 'Temporary Effects',
    'FORM': 'Form',
    'MIXED_FIELDS': 'Mixed Fields',
    'REST_BUTTON': 'Rest Button',
    'PROGRESS_BAR': 'Progress Bar',
    'MAP_SKETCHER': 'Map Sketcher',
    'GRID_MAP': 'Grid Map',
    'ROLL_TABLE': 'Roll Table',
    'INITIATIVE_TRACKER': 'Initiative Tracker',
    'INVENTORY': 'Inventory',
    'DECK': 'Legacy Deck of Cards',
    'DECK_OF_CARDS': 'Deck of Cards',
    'TIMER': 'Timer',
    'STEP_DICE': 'Step Dice',
  };
  return titles[type] || 'Widget';
}

export default function WidgetEditModal({ widget, onClose }: Props) {
  const updateWidgetData = useStore((state) => state.updateWidgetData);
  const updateWidgetSize = useStore((state) => state.updateWidgetSize);
  const tutorialStep = useTutorialStore((state) => state.tutorialStep);
  const advanceTutorial = useTutorialStore((state) => state.advanceTutorial);
  const [localData, setLocalData] = useState({ ...widget.data });
  const [localWidth, setLocalWidth] = useState(widget.w || 200);
  const isImageWidget = widget.type === 'IMAGE';
  const isWidgetHeaderHidden = widget.type !== 'LABEL' && widget.type !== 'IMAGE' && localData.hideWidgetHeader === true;
  const isImageEditButtonHidden = isImageWidget && localData.hideWidgetHeader === true;
  const isEditButtonHidden = isWidgetHeaderHidden || isImageEditButtonHidden;
  const hasEditableWidgetHeader = !isEditButtonHidden;
  const hasInlineWidgetHeader = (widget.type === 'PROGRESS_BAR' || widget.type === 'TOGGLE') && localData.inlineLabel === true;
  const isAutomationCloseStep =
    tutorialStep !== null &&
    (TUTORIAL_STEPS[tutorialStep]?.id === 'automation-close-number-display' ||
      TUTORIAL_STEPS[tutorialStep]?.id === 'automation-close-dice-roller');

  const handleUpdateData = (data: any) => {
    const newData = { ...localData, ...data };
    setLocalData(newData);
    updateWidgetData(widget.id, data);
  };

  const handleUpdateWidth = (width: number) => {
    setLocalWidth(width);
    updateWidgetSize(widget.id, width, widget.h || 0);
  };

  // Create a preview widget with the current data and width
  const previewWidget = { ...widget, data: localData, w: localWidth };
  const renderedPreviewWidget = {
    ...previewWidget,
    data: {
      ...previewWidget.data,
      label: isWidgetHeaderHidden ? undefined : previewWidget.data.label,
      showFieldControls: !isWidgetHeaderHidden,
      showTableEditButton: !isWidgetHeaderHidden,
    },
  };

  const renderEditor = () => {
    const editorProps = { widget: previewWidget, updateData: handleUpdateData, updateWidth: handleUpdateWidth };
    
    switch (widget.type) {
      case 'NUMBER': return <NumberEditor {...editorProps} />;
      case 'NUMBER_DISPLAY': return <NumberDisplayEditor {...editorProps} />;
      case 'LABEL': return <LabelEditor {...editorProps} />;
      case 'LIST': return <ListEditor {...editorProps} />;
      case 'TEXT': return <TextEditor {...editorProps} />;
      case 'CHECKBOX': return <CheckboxEditor {...editorProps} />;
      case 'HEALTH_BAR': return <HealthBarEditor {...editorProps} />;
      case 'DICE_ROLLER': return <DiceRollerEditor {...editorProps} />;
      case 'DICE_TRAY': return <DiceTrayEditor {...editorProps} />;
      case 'SPELL_SLOT': return <SpellSlotEditor {...editorProps} />;
      case 'IMAGE': return <ImageEditor {...editorProps} />;
      case 'POOL': return <PoolEditor {...editorProps} />;
      case 'TOGGLE': return <ToggleEditor {...editorProps} />;
      case 'TOGGLE_GROUP': return <ConditionEditor {...editorProps} />;
      case 'TABLE': return <TableEditor {...editorProps} />;
      case 'TIME_TRACKER': return <TimeTrackerEditor {...editorProps} />;
      case 'FORM': return <FormEditor {...editorProps} />;
      case 'MIXED_FIELDS': return <MixedFieldsEditor {...editorProps} />;
      case 'REST_BUTTON': return <RestButtonEditor {...editorProps} />;
      case 'PROGRESS_BAR': return <ProgressBarEditor {...editorProps} />;
      case 'MAP_SKETCHER': return <MapSketcherEditor {...editorProps} />;
      case 'GRID_MAP': return <GridMapEditor {...editorProps} />;
      case 'ROLL_TABLE': return <RollTableEditor {...editorProps} />;
      case 'INITIATIVE_TRACKER': return <InitiativeTrackerEditor {...editorProps} />;
      case 'INVENTORY': return <InventoryEditor {...editorProps} />;
      case 'DECK': return <DeckEditor {...editorProps} />;
      case 'DECK_OF_CARDS': return <CardTableEditor {...editorProps} />;
      case 'TIMER': return <TimerEditor {...editorProps} />;
      case 'STEP_DICE': return <StepDiceEditor {...editorProps} />;
      default: return null;
    }
  };

  const renderHeaderVisibilitySetting = () => (
    <label className={`flex cursor-pointer items-center gap-2 text-sm text-theme-ink ${isImageWidget ? 'image-editor__header-setting' : 'mb-4'}`}>
      <input
        type="checkbox"
        checked={isEditButtonHidden}
        onChange={(event) => handleUpdateData({ hideWidgetHeader: event.target.checked })}
        className="h-4 w-4 accent-theme-accent"
      />
      {isImageWidget ? 'Hide edit button (Canvas view)' : 'Hide header (Canvas view)'}
    </label>
  );

  // Get actual widget dimensions for preview
  const getPreviewDimensions = () => {
    const actualWidth = localWidth || widget.w || 200;
    const actualHeight = widget.h || 200;
    
    return {
      width: actualWidth,
      height: actualHeight
    };
  };

  const renderPreview = () => {
    const { width: previewWidth, height: previewHeight } = getPreviewDimensions();
    
    const props = { widget: renderedPreviewWidget, mode: 'play' as const, width: previewWidth, height: previewHeight };
    
    switch (widget.type) {
      case 'NUMBER': return <NumberWidget {...props} showFieldControls={false} />;
      case 'NUMBER_DISPLAY': return <NumberDisplayWidget {...props} showFieldControls={false} />;
      case 'LABEL': return <LabelWidget widget={renderedPreviewWidget} />;
      case 'LIST': return <ListWidget {...props} showFieldControls={false} />;
      case 'TEXT': return <TextWidget {...props} />;
      case 'CHECKBOX': return <CheckboxWidget {...props} />;
      case 'HEALTH_BAR': return <HealthBarWidget {...props} interactive={false} />;
      case 'DICE_ROLLER': return <DiceRollerWidget {...props} interactive={false} />;
      case 'DICE_TRAY': return <DiceTrayWidget {...props} interactive={false} />;
      case 'SPELL_SLOT': return <SpellSlotWidget {...props} />;
      case 'IMAGE': return <ImageWidget {...props} showUploadControl={false} />;
      case 'POOL': return <PoolWidget {...props} />;
      case 'TOGGLE': return <ToggleWidget {...props} interactive={false} />;
      case 'TOGGLE_GROUP': return <ConditionWidget {...props} />;
      case 'TABLE': return <TableWidget {...props} />;
      case 'TIME_TRACKER': return <TimeTrackerWidget {...props} />;
      case 'FORM': return <FormWidget {...props} showFieldControls={false} />;
      case 'MIXED_FIELDS': return <MixedFieldsWidget {...props} showFieldControls={false} interactive={false} />;
      case 'REST_BUTTON': return <RestButtonWidget {...props} />;
      case 'PROGRESS_BAR': return <ProgressBarWidget {...props} interactive={false} />;
      case 'MAP_SKETCHER': return <MapSketcherWidget {...props} />;
      case 'GRID_MAP': return <GridMapWidget {...props} interactive={false} />;
      case 'ROLL_TABLE': return <RollTableWidget {...props} />;
      case 'INITIATIVE_TRACKER': return <InitiativeTrackerWidget {...props} />;
      case 'INVENTORY': return <InventoryWidget {...props} />;
      case 'DECK': return <DeckWidget {...props} />;
      case 'DECK_OF_CARDS': return <CardTableWidget {...props} interactive={false} render3D={false} showControls previewOnly />;
      case 'TIMER': return <TimerWidget {...props} />;
      case 'STEP_DICE': return <StepDiceWidget {...props} />;
      default: return null;
    }
  };

  const previewDimensions = getPreviewDimensions();
  const imagePreviewContentStyle = isImageWidget
    ? {
        width: `${previewDimensions.width}px`,
        maxWidth: '100%',
        height: 'auto',
        aspectRatio: `${previewDimensions.width} / ${previewDimensions.height}`,
      }
    : undefined;

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className={`bg-theme-paper border-[length:var(--border-width)] border-theme-border rounded-theme shadow-theme w-full ${isImageWidget ? 'max-w-5xl' : 'max-w-lg'} max-h-[90vh] overflow-hidden flex flex-col animate-modal-in`}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b border-theme-border ${widget.type === 'INVENTORY' ? 'px-3 py-2' : 'px-4 py-3'}`}>
          <h2 className={`${widget.type === 'INVENTORY' ? 'text-base' : 'text-lg'} font-bold text-theme-ink font-heading`}>
            Edit {getWidgetTitle(widget.type)}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center text-theme-muted hover:text-theme-ink hover:bg-theme-background rounded-button transition-colors"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-auto ${widget.type === 'INVENTORY' ? 'p-3' : isImageWidget ? 'p-4 sm:p-5' : 'p-4'}`}>
          <div className={isImageWidget
            ? 'grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]'
            : `flex flex-col ${widget.type === 'INVENTORY' ? 'gap-3' : 'gap-6'}`}>
            {/* Editor Section */}
            <div className="flex-1 min-w-0">
              {widget.type !== 'LABEL' && renderHeaderVisibilitySetting()}
              <div className={isWidgetHeaderHidden && WIDGET_TYPES_WITH_LABEL_SETTING.has(widget.type) ? 'widget-editor--hide-label-setting' : undefined}>
                {renderEditor()}
              </div>
            </div>

            {/* Preview Section */}
            <div className={`flex-shrink-0 ${isImageWidget ? 'lg:sticky lg:top-0' : ''}`}>
              <h3 className="mb-3 text-sm font-medium text-theme-muted">{isImageWidget ? 'Canvas preview' : 'Preview'}</h3>
              <div 
                className={`bg-theme-paper border-[length:var(--border-width)] border-theme-border rounded-theme shadow-theme ${isImageWidget ? 'mx-auto w-fit max-w-full p-3' : 'p-2'}`}
                style={{ 
                  width: isImageWidget ? undefined : `${previewDimensions.width + 16}px`,
                  maxWidth: '100%',
                  ...(!isImageWidget ? { height: `${previewDimensions.height + 16}px` } : {})
                }}
              >
                <div
                  style={imagePreviewContentStyle}
                  className={`widget-content pointer-events-none ${
                    isWidgetHeaderHidden
                      ? 'widget-content--header-hidden'
                      : hasEditableWidgetHeader
                        ? `widget-content--editable-header ${hasInlineWidgetHeader ? 'widget-content--progress-inline-edit' : ''}`
                        : ''
                  }`}
                >
                  {hasEditableWidgetHeader && (
                    <span className="widget-header-edit-button widget-control widget-control--subtle" aria-hidden="true">
                      <PencilIcon className="h-3 w-3" />
                    </span>
                  )}
                  {renderPreview()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`border-t border-theme-border flex justify-end ${widget.type === 'INVENTORY' ? 'px-3 py-2' : 'px-4 py-3'}`}>
          <button
            data-tutorial="edit-done-button"
            disabled={tutorialStep !== null && tutorialStep >= 18 && tutorialStep < 21}
            onClick={() => {
              // Advance tutorial if on step 21 (form-click-done)
              if (tutorialStep === 21 && TUTORIAL_STEPS[21]?.id === 'form-click-done') {
                advanceTutorial();
              }
              if (
                tutorialStep !== null &&
                (TUTORIAL_STEPS[tutorialStep]?.id === 'automation-close-number-display' ||
                  TUTORIAL_STEPS[tutorialStep]?.id === 'automation-close-dice-roller')
              ) {
                advanceTutorial();
              }
              onClose();
            }}
            className={`px-4 py-2 bg-theme-accent text-theme-paper rounded-button font-medium transition-opacity ${
              tutorialStep !== null && tutorialStep >= 18 && tutorialStep < 21 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:opacity-90'
            } ${tutorialStep === 21 || isAutomationCloseStep ? 'outline outline-4 outline-blue-500 outline-offset-2' : ''}`}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
