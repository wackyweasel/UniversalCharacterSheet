import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Widget, WidgetType } from '../types';
import { useStore } from '../store/useStore';
import { useTutorialStore, TUTORIAL_STEPS } from '../store/useTutorialStore';

// Import all editors
import {
  NumberEditor,
  NumberDisplayEditor,
  FormEditor,
  ListEditor,
  TextEditor,
  CheckboxEditor,
  ProgressBarEditor,
  HealthBarEditor,
  DiceRollerEditor,
  DiceTrayEditor,
  SpellSlotEditor,
  ImageEditor,
  PoolEditor,
  ConditionEditor,
  TimeTrackerEditor,
  TableEditor,
  RestButtonEditor,
  MapSketcherEditor,
  RollTableEditor,
  InitiativeTrackerEditor,
} from './editors';

// Widget preview components (play mode view)
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
  onClose: () => void;
}

function getWidgetTitle(type: WidgetType): string {
  const titles: Record<WidgetType, string> = {
    'NUMBER': 'Number Tracker',
    'NUMBER_DISPLAY': 'Number Display',
    'LIST': 'List',
    'TEXT': 'Text',
    'CHECKBOX': 'Checklist',
    'HEALTH_BAR': 'Health Bar',
    'DICE_ROLLER': 'Dice Roller',
    'DICE_TRAY': 'Dice Tray',
    'SPELL_SLOT': 'Spell Slots',
    'IMAGE': 'Image',
    'POOL': 'Resource Pool',
    'TOGGLE_GROUP': 'Conditions',
    'TABLE': 'Table',
    'TIME_TRACKER': 'Temporary Effects',
    'FORM': 'Form',
    'REST_BUTTON': 'Rest Button',
    'PROGRESS_BAR': 'Progress Bar',
    'MAP_SKETCHER': 'Map Sketcher',
    'ROLL_TABLE': 'Roll Table',
    'INITIATIVE_TRACKER': 'Initiative Tracker',
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

  const renderEditor = () => {
    const editorProps = { widget: previewWidget, updateData: handleUpdateData, updateWidth: handleUpdateWidth };
    
    switch (widget.type) {
      case 'NUMBER': return <NumberEditor {...editorProps} />;
      case 'NUMBER_DISPLAY': return <NumberDisplayEditor {...editorProps} />;
      case 'LIST': return <ListEditor {...editorProps} />;
      case 'TEXT': return <TextEditor {...editorProps} />;
      case 'CHECKBOX': return <CheckboxEditor {...editorProps} />;
      case 'HEALTH_BAR': return <HealthBarEditor {...editorProps} />;
      case 'DICE_ROLLER': return <DiceRollerEditor {...editorProps} />;
      case 'DICE_TRAY': return <DiceTrayEditor {...editorProps} />;
      case 'SPELL_SLOT': return <SpellSlotEditor {...editorProps} />;
      case 'IMAGE': return <ImageEditor {...editorProps} />;
      case 'POOL': return <PoolEditor {...editorProps} />;
      case 'TOGGLE_GROUP': return <ConditionEditor {...editorProps} />;
      case 'TABLE': return <TableEditor {...editorProps} />;
      case 'TIME_TRACKER': return <TimeTrackerEditor {...editorProps} />;
      case 'FORM': return <FormEditor {...editorProps} />;
      case 'REST_BUTTON': return <RestButtonEditor {...editorProps} />;
      case 'PROGRESS_BAR': return <ProgressBarEditor {...editorProps} />;
      case 'MAP_SKETCHER': return <MapSketcherEditor {...editorProps} />;
      case 'ROLL_TABLE': return <RollTableEditor {...editorProps} />;
      case 'INITIATIVE_TRACKER': return <InitiativeTrackerEditor {...editorProps} />;
      default: return null;
    }
  };

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
    
    const props = { widget: previewWidget, mode: 'play' as const, width: previewWidth, height: previewHeight };
    
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
      case 'MAP_SKETCHER': return <MapSketcherWidget {...props} />;
      case 'ROLL_TABLE': return <RollTableWidget {...props} />;
      case 'INITIATIVE_TRACKER': return <InitiativeTrackerWidget {...props} />;
      default: return null;
    }
  };

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
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
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
      <div className="bg-theme-paper border-[length:var(--border-width)] border-theme-border rounded-theme shadow-theme w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-theme-border">
          <h2 className="text-lg font-bold text-theme-ink font-heading">
            Edit {getWidgetTitle(widget.type)}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-theme-muted hover:text-theme-ink hover:bg-theme-background rounded-button transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="flex flex-col gap-6">
            {/* Editor Section */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-theme-muted mb-3">Settings</h3>
              {renderEditor()}
            </div>

            {/* Preview Section */}
            <div className="flex-shrink-0">
              <h3 className="text-sm font-medium text-theme-muted mb-3">Preview</h3>
              <div 
                className="bg-theme-paper border-[length:var(--border-width)] border-theme-border rounded-theme p-2 shadow-theme"
                style={{ 
                  width: `${getPreviewDimensions().width + 16}px`,
                  height: `${getPreviewDimensions().height + 16}px`
                }}
              >
                {renderPreview()}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-theme-border flex justify-end">
          <button
            data-tutorial="edit-done-button"
            disabled={tutorialStep !== null && tutorialStep >= 18 && tutorialStep < 21}
            onClick={() => {
              // Advance tutorial if on step 21 (form-click-done)
              if (tutorialStep === 21 && TUTORIAL_STEPS[21]?.id === 'form-click-done') {
                advanceTutorial();
              }
              onClose();
            }}
            className={`px-4 py-2 bg-theme-accent text-theme-paper rounded-button font-medium ${
              tutorialStep !== null && tutorialStep >= 18 && tutorialStep < 21 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:opacity-90'
            } ${tutorialStep === 21 ? 'outline outline-4 outline-blue-500 outline-offset-2' : ''}`}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
