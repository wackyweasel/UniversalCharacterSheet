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

type WidgetCategory = 'Essentials' | 'Track & manage' | 'Roll & resolve' | 'Reference & utilities';

const WIDGET_OPTIONS: { type: WidgetType; label: string; category: WidgetCategory; keywords?: string }[] = [
  { type: 'FORM', label: 'Fields & stats', category: 'Essentials', keywords: 'form attributes scores details' },
  { type: 'TEXT', label: 'Notes', category: 'Essentials', keywords: 'text biography description' },
  { type: 'NUMBER', label: 'Number tracker', category: 'Essentials', keywords: 'counter value resource' },
  { type: 'LIST', label: 'List', category: 'Essentials', keywords: 'inventory abilities equipment' },
  { type: 'IMAGE', label: 'Image', category: 'Essentials', keywords: 'portrait picture artwork' },
  { type: 'HEALTH_BAR', label: 'Health bar', category: 'Track & manage', keywords: 'hp wounds damage' },
  { type: 'POOL', label: 'Resource pool', category: 'Track & manage', keywords: 'tokens points mana' },
  { type: 'PROGRESS_BAR', label: 'Progress bar', category: 'Track & manage', keywords: 'clock advancement track' },
  { type: 'CHECKBOX', label: 'Checklist', category: 'Track & manage', keywords: 'check marks tasks' },
  { type: 'TOGGLE_GROUP', label: 'Conditions', category: 'Track & manage', keywords: 'status toggle effects' },
  { type: 'SPELL_SLOT', label: 'Spell slots', category: 'Track & manage', keywords: 'magic casting' },
  { type: 'TIME_TRACKER', label: 'Temporary effects', category: 'Track & manage', keywords: 'duration rounds conditions' },
  { type: 'TIMER', label: 'Timer', category: 'Track & manage', keywords: 'countdown time' },
  { type: 'REST_BUTTON', label: 'Rest button', category: 'Track & manage', keywords: 'reset recover refresh' },
  { type: 'DICE_ROLLER', label: 'Dice roller', category: 'Roll & resolve', keywords: 'roll formula check' },
  { type: 'DICE_TRAY', label: 'Dice tray', category: 'Roll & resolve', keywords: 'roll dice' },
  { type: 'STEP_DICE', label: 'Step dice', category: 'Roll & resolve', keywords: 'die rating savage' },
  { type: 'ROLL_TABLE', label: 'Roll table', category: 'Roll & resolve', keywords: 'random result generator' },
  { type: 'DECK', label: 'Deck of cards', category: 'Roll & resolve', keywords: 'draw shuffle cards' },
  { type: 'INITIATIVE_TRACKER', label: 'Initiative tracker', category: 'Roll & resolve', keywords: 'combat turn order' },
  { type: 'NUMBER_DISPLAY', label: 'Number display', category: 'Reference & utilities', keywords: 'formula calculated total' },
  { type: 'TABLE', label: 'Table', category: 'Reference & utilities', keywords: 'grid reference data' },
  { type: 'MAP_SKETCHER', label: 'Map sketcher', category: 'Reference & utilities', keywords: 'draw map diagram' },
];

const WIDGET_CATEGORIES: WidgetCategory[] = ['Essentials', 'Track & manage', 'Roll & resolve', 'Reference & utilities'];

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
  const [widgetSearch, setWidgetSearch] = useState('');

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
  const normalizedSearch = widgetSearch.trim().toLowerCase();
  const filteredWidgets = WIDGET_OPTIONS.filter(({ label, category, keywords }) => (
    !normalizedSearch || `${label} ${category} ${keywords || ''}`.toLowerCase().includes(normalizedSearch)
  ));

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
        className={`fixed left-0 top-0 bottom-0 w-[88vw] max-w-[360px] bg-theme-paper border-r-[length:var(--border-width)] border-theme-border z-50 flex flex-col p-3 shadow-theme overflow-hidden transition-transform duration-300 ease-in-out safe-area-bottom touch-pan-y ${
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
          <p className="text-[10px] font-body font-bold uppercase tracking-[0.18em] text-theme-accent">Build</p>
          <h2 className="text-xl font-bold border-b-[length:var(--border-width)] border-theme-border pb-2 text-theme-ink font-heading">
            Add to this sheet
          </h2>
          <p className="font-body text-xs text-theme-muted mt-2">Choose what the character needs to track or use.</p>
        </div>

        <label className="relative block mb-4">
          <span className="sr-only">Search things to add</span>
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={widgetSearch}
            onChange={(event) => setWidgetSearch(event.target.value)}
            placeholder="Search stats, dice, notes…"
            className="w-full pl-9 pr-3 py-2 bg-theme-background border-[length:var(--border-width)] border-theme-border rounded-button text-xs text-theme-ink placeholder:text-theme-muted font-body focus:outline-none focus:ring-2 focus:ring-theme-accent"
          />
        </label>

        <div className="flex flex-col gap-5 py-1">
          {WIDGET_CATEGORIES.map((category) => {
            const categoryWidgets = filteredWidgets.filter((option) => option.category === category);
            if (categoryWidgets.length === 0) return null;

            return (
              <section key={category}>
                <h3 className="mb-2 text-[11px] font-body font-bold uppercase tracking-wider text-theme-muted">{category}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {categoryWidgets.map(({ type, label }) => {
                    const isHighlighted = tutorialStep !== null && tutorialWidgetSteps[tutorialStep] === type;

                    return (
                      <Tooltip key={type} content={<WidgetTooltipPreview type={type} />} placement="below">
                        <div
                          data-tutorial={`widget-${type}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, type)}
                          onClick={() => handleAdd(type)}
                          className={`min-h-12 p-2 border-[length:var(--border-width)] border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-all text-left font-bold active:translate-y-px cursor-pointer flex items-center bg-theme-background text-theme-ink rounded-button relative ${isHighlighted ? 'outline outline-4 outline-blue-500 outline-offset-2' : ''}`}
                        >
                          <span className="text-[11px] leading-tight font-body">+ {label}</span>
                        </div>
                      </Tooltip>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {filteredWidgets.length === 0 && (
            <div className="py-6 text-center border border-dashed border-theme-border rounded-theme">
              <p className="font-body text-sm text-theme-ink">No matching tools</p>
              <button type="button" onClick={() => setWidgetSearch('')} className="font-body text-xs text-theme-accent underline mt-1">Clear search</button>
            </div>
          )}
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
          <p className="mt-2 text-theme-ink font-bold">Build workspace active</p>
        </div>
        </div>
      </div>
    </>
  );
}



