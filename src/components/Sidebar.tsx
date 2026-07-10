import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { useTemplateStore, isGroupTemplate } from '../store/useTemplateStore';
import { useTutorialStore, TUTORIAL_STEPS } from '../store/useTutorialStore';
import { WidgetType } from '../types';
import { isImageTexture, IMAGE_TEXTURES, getBuiltInTheme } from '../store/useThemeStore';
import { getCustomTheme } from '../store/useCustomThemeStore';
import { submitToGallery } from '../hooks/useGallery';
import { Tooltip } from './Tooltip';
import GalleryShareModal from './GalleryShareModal';
import WidgetTooltipPreview from './WidgetTooltipPreview';
import { XIcon } from './icons';
import { useTelemetryStore } from '../store/useTelemetryStore';

const WIDGET_OPTIONS: { type: WidgetType; label: string }[] = [
  { type: 'CHECKBOX', label: 'Checklist' },
  { type: 'TOGGLE_GROUP', label: 'Conditions' },
  { type: 'DECK', label: 'Deck of Cards' },
  { type: 'DICE_ROLLER', label: 'Dice Roller' },
  { type: 'DICE_TRAY', label: 'Dice Tray' },
  { type: 'FORM', label: 'Form' },
  { type: 'HEALTH_BAR', label: 'Health Bar' },
  { type: 'IMAGE', label: 'Image' },
  { type: 'INITIATIVE_TRACKER', label: 'Initiative Tracker' },
  { type: 'LIST', label: 'List' },
  { type: 'MAP_SKETCHER', label: 'Map Sketcher' },
  { type: 'NUMBER_DISPLAY', label: 'Number Display' },
  { type: 'NUMBER', label: 'Number Tracker' },
  { type: 'POOL', label: 'Resource Pool' },
  { type: 'PROGRESS_BAR', label: 'Progress Bar' },
  { type: 'REST_BUTTON', label: 'Rest Button' },
  { type: 'ROLL_TABLE', label: 'Roll Table' },
  { type: 'SPELL_SLOT', label: 'Spell Slots' },
  { type: 'STEP_DICE', label: 'Step Dice' },
  { type: 'TABLE', label: 'Table' },
  { type: 'TEXT', label: 'Text Area' },
  { type: 'TIME_TRACKER', label: 'Temporary Effects' },
  { type: 'TIMER', label: 'Timer' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  viewport?: { pan: { x: number; y: number }; scale: number; width: number; height: number };
}

export default function Sidebar({ collapsed, onToggle, viewport }: SidebarProps) {
  const addWidget = useStore((state) => state.addWidget);
  const addWidgetFromTemplate = useStore((state) => state.addWidgetFromTemplate);
  const addGroupFromTemplate = useStore((state) => state.addGroupFromTemplate);
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const characters = useStore((state) => state.characters);
  const mode = useStore((state) => state.mode);
  const transientCharacterIds = useStore((state) => state.transientCharacterIds);
  const recordTelemetryEvent = useTelemetryStore((state) => state.recordEvent);
  const activeCharacter = characters.find(c => c.id === activeCharacterId);
  const customTheme = activeCharacter?.theme ? getCustomTheme(activeCharacter.theme) : undefined;
  const builtInTheme = activeCharacter?.theme ? getBuiltInTheme(activeCharacter.theme) : undefined;
  const textureKey = customTheme?.cardTexture || builtInTheme?.cardTexture || 'none';
  const hasImageTexture = isImageTexture(textureKey);
  
  const templates = useTemplateStore((state) => state.templates);
  const removeTemplate = useTemplateStore((state) => state.removeTemplate);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [sharingTemplateId, setSharingTemplateId] = useState<string | null>(null);

  // Tutorial state
  const tutorialStep = useTutorialStore((state) => state.tutorialStep);
  const advanceTutorial = useTutorialStore((state) => state.advanceTutorial);
  const isCurrentTutorialStep = (id: string) => tutorialStep !== null && TUTORIAL_STEPS[tutorialStep]?.id === id;

  useEffect(() => {
    if (isCurrentTutorialStep('templates-load-widget-template') || isCurrentTutorialStep('templates-share-template')) {
      const selector = isCurrentTutorialStep('templates-share-template')
        ? '[data-tutorial="template-share-button"]'
        : '[data-tutorial="template-load-item"]';

      document.querySelector(selector)?.scrollIntoView({
        block: 'center',
        behavior: 'smooth',
      });
    }
  }, [tutorialStep, templates.length]);

  // Map tutorial steps to widget types
  const tutorialWidgetSteps: Record<number, WidgetType> = {
    5: 'IMAGE',
    6: 'HEALTH_BAR',
    7: 'FORM',
    8: 'NUMBER_DISPLAY',
  };

  const handleAdd = (type: WidgetType) => {
    // Add to visible area of screen using viewport info
    addWidget(type, 100, 100, viewport);
    
    // Check if this is the widget the tutorial is waiting for
    if (tutorialStep !== null && tutorialWidgetSteps[tutorialStep] === type) {
      advanceTutorial();
    }
  };

  const handleDragStart = (e: React.DragEvent, type: WidgetType) => {
    e.dataTransfer.setData('widgetType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const sharingTemplate = templates.find((template) => template.id === sharingTemplateId) || null;

  const handleSubmitTemplateShare = async (name: string, author: string, description: string) => {
    if (!sharingTemplate) {
      return false;
    }

    const success = await submitToGallery('Templates', name, author, description, sharingTemplate);
    if (success && (!activeCharacterId || !transientCharacterIds.includes(activeCharacterId))) {
      recordTelemetryEvent({
        eventName: 'widget_template_shared',
        category: 'template',
        characterId: activeCharacterId,
        sheetId: activeCharacter?.activeSheetId,
        mode,
        source: 'toolbox',
        widgetType: isGroupTemplate(sharingTemplate) ? null : sharingTemplate.type,
        metadata: {
          templateId: sharingTemplate.id,
          isGroup: isGroupTemplate(sharingTemplate),
        },
      });
    }
    return success;
  };

  return (
    <>
      <GalleryShareModal
        open={sharingTemplateId !== null}
        initialName={sharingTemplate?.name || ''}
        onClose={() => setSharingTemplateId(null)}
        onSubmit={handleSubmitTemplateShare}
      />

      {/* Overlay backdrop */}
      {!collapsed && (
        <div 
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => {
            onToggle();
            // If tutorial is on step 9 (close-toolbox), advance
            if (tutorialStep === 9 && TUTORIAL_STEPS[9]?.id === 'close-toolbox') {
              advanceTutorial();
            }
          }}
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
        <Tooltip content="Close toolbox">
          <button
            data-tutorial="close-toolbox"
            onClick={() => {
              onToggle();
              // If tutorial is on step 9 (close-toolbox), advance
              if (tutorialStep === 9 && TUTORIAL_STEPS[9]?.id === 'close-toolbox') {
                advanceTutorial();
              }
            }}
            className={`absolute top-3 right-3 w-10 h-10 bg-theme-accent text-theme-paper font-bold flex items-center justify-center rounded-button z-20 shadow-theme hover:bg-theme-accent-hover transition-colors ${tutorialStep === 9 ? 'outline outline-4 outline-blue-500 outline-offset-2' : ''}`}
            aria-label="Close toolbox"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </Tooltip>
        
        {/* Sidebar content */}
        <div className="relative z-10 flex flex-col h-full overflow-y-auto touch-pan-y pt-12 pl-1 -mr-3 pr-4">

        <div className="mb-4">
          <h2 className="text-xl font-bold uppercase tracking-wider border-b-[length:var(--border-width)] border-theme-border pb-2 text-theme-ink font-heading">
            Toolbox
          </h2>
        </div>

        <div className="flex flex-col gap-3 py-1">
          {WIDGET_OPTIONS.map(({ type, label }) => {
            // Check if this widget should be highlighted for the tutorial
            const isHighlighted = tutorialStep !== null && tutorialWidgetSteps[tutorialStep] === type;
            
            return (
              <Tooltip key={type} content={<WidgetTooltipPreview type={type} />} placement="below">
                <div
                  data-tutorial={`widget-${type}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, type)}
                  onClick={() => handleAdd(type)}
                  className={`p-2 border-[length:var(--border-width)] border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-all text-left font-bold shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer flex items-center gap-2 bg-theme-paper text-theme-ink rounded-button relative ${isHighlighted ? 'outline outline-4 outline-blue-500 outline-offset-2' : ''}`}
                >
                  <span className="text-xs font-body">+ {label}</span>
                </div>
              </Tooltip>
            );
          })}
        </div>

        {/* Templates Section */}
        {templates.length > 0 && (
          <>
            <div data-tutorial="templates-section" className="mt-6 mb-4">
              <h2 className="text-xl font-bold uppercase tracking-wider border-b-[length:var(--border-width)] border-theme-border pb-2 text-theme-ink font-heading">
                Templates
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              {templates.map((template, index) => {
                const isGroup = isGroupTemplate(template);
                const shouldHighlightTemplateLoad = index === 0 && isCurrentTutorialStep('templates-load-widget-template');
                return (
                  <div
                    key={template.id}
                    data-tutorial="template-card"
                    className={`p-2 border-[length:var(--border-width)] border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-all text-left font-bold shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer flex items-center justify-between bg-theme-paper text-theme-ink rounded-theme group ${shouldHighlightTemplateLoad ? 'ring-4 ring-blue-500 ring-offset-2' : ''}`}
                  >
                    <span 
                      data-tutorial={index === 0 ? 'template-load-item' : undefined}
                      className="text-xs font-body flex-1 truncate flex items-center gap-1.5"
                      onClick={() => {
                        if (isGroup) {
                          addGroupFromTemplate(template, viewport);
                        } else {
                          addWidgetFromTemplate(template, viewport);
                        }

                        if (isCurrentTutorialStep('templates-load-widget-template')) {
                          advanceTutorial();
                          onToggle();
                        }
                      }}
                    >
                      {isGroup && (
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <rect x="3" y="3" width="7" height="7" rx="1" />
                          <rect x="14" y="3" width="7" height="7" rx="1" />
                          <rect x="3" y="14" width="7" height="7" rx="1" />
                          <rect x="14" y="14" width="7" height="7" rx="1" />
                        </svg>
                      )}
                      + {template.name}
                      {isGroup && (
                        <span className="text-[10px] opacity-70">({template.widgets.length})</span>
                      )}
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
                      <div className={`flex items-center gap-1 ml-2 transition-opacity ${isCurrentTutorialStep('templates-share-template') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <Tooltip content="Submit this template for the community gallery">
                          <button
                            data-tutorial="template-share-button"
                            className={`px-1.5 py-0.5 text-[10px] font-bold rounded-button text-theme-muted hover:text-white hover:bg-blue-600 transition-colors ${isCurrentTutorialStep('templates-share-template') ? 'opacity-100 bg-blue-600 text-white ring-2 ring-blue-500 ring-offset-1' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSharingTemplateId(template.id);

                              if (isCurrentTutorialStep('templates-share-template')) {
                                advanceTutorial();
                              }
                            }}
                          >
                            Share
                          </button>
                        </Tooltip>
                        <Tooltip content="Delete template">
                          <button
                            className="w-5 h-5 flex items-center justify-center text-theme-muted hover:text-red-500 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmingDeleteId(template.id);
                            }}
                            aria-label="Delete template"
                          >
                            <XIcon className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                );
              })}
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



