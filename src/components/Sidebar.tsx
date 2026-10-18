import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { useTemplateStore, isGroupTemplate } from '../store/useTemplateStore';
import { useTutorialStore, TUTORIAL_STEPS } from '../store/useTutorialStore';
import { WidgetType } from '../types';
import { isImageTexture, IMAGE_TEXTURES, getBuiltInTheme } from '../store/useThemeStore';
import { getCustomTheme } from '../store/useCustomThemeStore';
import { submitToGallery } from '../hooks/useGallery';
import { Tooltip } from './Tooltip';
import GalleryShareModal from './GalleryShareModal';
import WidgetTooltipPreview, { TemplateTooltipPreview } from './WidgetTooltipPreview';
import { CheckIcon, ChevronDownIcon, TrashIcon, UploadIcon, XIcon } from './icons';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { WIDGET_CATEGORIES, WIDGET_OPTIONS } from '../utils/widgetMetadata';

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
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [legacyOpen, setLegacyOpen] = useState(false);
  const suppressWidgetClickUntilRef = useRef(0);

  // Tutorial state
  const tutorialStep = useTutorialStore((state) => state.tutorialStep);
  const advanceTutorial = useTutorialStore((state) => state.advanceTutorial);
  const isCurrentTutorialStep = (id: string) => tutorialStep !== null && TUTORIAL_STEPS[tutorialStep]?.id === id;

  useEffect(() => {
    if (isCurrentTutorialStep('templates-load-widget-template') || isCurrentTutorialStep('templates-share-template')) {
      setTemplatesOpen(true);
      const selector = isCurrentTutorialStep('templates-share-template')
        ? '[data-tutorial="template-share-button"]'
        : '[data-tutorial="template-load-item"]';

      document.querySelector(selector)?.scrollIntoView({
        block: 'center',
        behavior: 'smooth',
      });
    }
  }, [tutorialStep, templates.length, templatesOpen]);

  // Map tutorial steps to widget types
  const tutorialWidgetSteps: Record<string, WidgetType> = {
    'add-image-widget': 'IMAGE',
    'add-health-widget': 'HEALTH_BAR',
    'add-form-widget': 'FORM',
    'add-number-display-widget': 'NUMBER_DISPLAY',
  };
  const tutorialWidgetType = tutorialStep !== null ? tutorialWidgetSteps[TUTORIAL_STEPS[tutorialStep]?.id ?? ''] : undefined;

  const handleAdd = (type: WidgetType) => {
    // Add to visible area of screen using viewport info
    addWidget(type, 100, 100, viewport);
    
    // Check if this is the widget the tutorial is waiting for
    if (tutorialWidgetType === type) {
      advanceTutorial();
    }
  };

  const handleDragStart = (e: React.DragEvent, type: WidgetType) => {
    suppressWidgetClickUntilRef.current = Number.POSITIVE_INFINITY;
    e.dataTransfer.setData('widgetType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    suppressWidgetClickUntilRef.current = performance.now() + 500;
  };

  const handleWidgetClick = (type: WidgetType) => {
    if (performance.now() < suppressWidgetClickUntilRef.current) {
      suppressWidgetClickUntilRef.current = 0;
      return;
    }
    handleAdd(type);
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

      <div 
        data-touch-camera-panel="true"
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
              if (isCurrentTutorialStep('close-toolbox')) {
                advanceTutorial();
              }
            }}
            className={`absolute top-3 right-3 w-10 h-10 bg-theme-accent text-theme-paper font-bold flex items-center justify-center rounded-button z-20 shadow-theme hover:bg-theme-accent-hover transition-colors ${isCurrentTutorialStep('close-toolbox') ? 'outline outline-4 outline-blue-500 outline-offset-2' : ''}`}
            aria-label="Close toolbox"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </Tooltip>
        
        {/* Sidebar content */}
        <div className="relative z-10 flex flex-col h-full overflow-y-auto touch-pan-y pt-12 pb-8 pl-1 -mr-3 pr-4">

        <div className="mb-4">
          <h2 className="text-xl font-bold border-b-[length:var(--border-width)] border-theme-border pb-2 text-theme-ink font-heading">
            Add a Widget
          </h2>
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

        {templates.length > 0 && (
          <section data-tutorial="templates-section" className="mb-4">
            <button
              type="button"
              onClick={() => setTemplatesOpen((open) => !open)}
              aria-expanded={templatesOpen}
              className="w-full flex items-center justify-between gap-2 py-1 text-[11px] font-body font-bold uppercase tracking-wider text-theme-muted hover:text-theme-ink transition-colors"
            >
              <span>Templates ({templates.length})</span>
              <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${templatesOpen ? 'rotate-180' : ''}`} />
            </button>
            {templatesOpen && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {templates.map((template, index) => {
                  const isGroup = isGroupTemplate(template);
                  const isConfirmingDelete = confirmingDeleteId === template.id;
                  const shouldHighlightTemplateLoad = index === 0 && isCurrentTutorialStep('templates-load-widget-template');
                  const isShareHighlighted = index === 0 && isCurrentTutorialStep('templates-share-template');
                  const iconButtonClass = 'w-6 h-6 flex flex-shrink-0 items-center justify-center rounded-button opacity-60 hover:opacity-100 hover:bg-theme-paper/25 focus-visible:opacity-100 transition-opacity';

                  return (
                    <div
                      key={template.id}
                      data-tutorial="template-card"
                      className={`min-h-12 border-[length:var(--border-width)] border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-all font-bold active:translate-y-px flex items-center bg-theme-background text-theme-ink rounded-button relative ${shouldHighlightTemplateLoad || isShareHighlighted ? 'outline outline-4 outline-blue-500 outline-offset-2' : ''}`}
                    >
                      {isConfirmingDelete ? (
                        <>
                          <span className="flex-1 min-w-0 p-2 text-[11px] leading-tight font-body truncate">Delete "{template.name}"?</span>
                          <div className="flex items-center gap-0.5 pr-1">
                            <Tooltip content="Confirm delete">
                              <button
                                type="button"
                                className={`${iconButtonClass} opacity-100`}
                                onClick={() => {
                                  removeTemplate(template.id);
                                  setConfirmingDeleteId(null);
                                }}
                                aria-label="Confirm delete template"
                              >
                                <CheckIcon className="w-3.5 h-3.5" />
                              </button>
                            </Tooltip>
                            <Tooltip content="Cancel">
                              <button
                                type="button"
                                className={`${iconButtonClass} opacity-100`}
                                onClick={() => setConfirmingDeleteId(null)}
                                aria-label="Cancel delete"
                              >
                                <XIcon className="w-3.5 h-3.5" />
                              </button>
                            </Tooltip>
                          </div>
                        </>
                      ) : (
                        <>
                          <Tooltip content={<TemplateTooltipPreview template={template} />} placement="below">
                            <div
                              data-tutorial={index === 0 ? 'template-load-item' : undefined}
                              className="flex-1 min-w-0 self-stretch p-2 pr-1 flex items-center gap-1 cursor-pointer"
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
                              <span className="text-[11px] leading-tight font-body break-words min-w-0">
                                + {template.name}
                                {isGroup && <span className="ml-1 text-[10px] opacity-70">({template.widgets.length})</span>}
                              </span>
                            </div>
                          </Tooltip>
                          <div className="flex items-center gap-0.5 pr-1">
                            <Tooltip content="Submit this template for the community gallery">
                              <button
                                type="button"
                                data-tutorial="template-share-button"
                                className={iconButtonClass}
                                onClick={() => {
                                  setSharingTemplateId(template.id);

                                  if (isCurrentTutorialStep('templates-share-template')) {
                                    advanceTutorial();
                                  }
                                }}
                                aria-label="Share template"
                              >
                                <UploadIcon className="w-3.5 h-3.5" />
                              </button>
                            </Tooltip>
                            <Tooltip content="Delete template">
                              <button
                                type="button"
                                className={iconButtonClass}
                                onClick={() => setConfirmingDeleteId(template.id)}
                                aria-label="Delete template"
                              >
                                <TrashIcon className="w-3.5 h-3.5" />
                              </button>
                            </Tooltip>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <div className="flex flex-col gap-5 py-1">
          {WIDGET_CATEGORIES.map((category) => {
            const categoryWidgets = filteredWidgets.filter((option) => option.category === category);
            if (categoryWidgets.length === 0) return null;

            const isCollapsible = category === 'Legacy';
            const isOpen = !isCollapsible || legacyOpen || normalizedSearch !== '';

            return (
              <section key={category}>
                {isCollapsible ? (
                  <button
                    type="button"
                    onClick={() => setLegacyOpen((open) => !open)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-2 mb-2 text-[11px] font-body font-bold uppercase tracking-wider text-theme-muted hover:text-theme-ink transition-colors"
                  >
                    <span>{category}</span>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                ) : (
                  <h3 className="mb-2 text-[11px] font-body font-bold uppercase tracking-wider text-theme-muted">{category}</h3>
                )}
                {isOpen && <div className="grid grid-cols-2 gap-2">
                  {categoryWidgets.map(({ type, label }) => {
                    const isHighlighted = tutorialWidgetType === type;

                    return (
                      <Tooltip key={type} content={<WidgetTooltipPreview type={type} />} placement="below">
                        <div
                          data-tutorial={`widget-${type}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, type)}
                          onDragEnd={handleDragEnd}
                          onClick={() => handleWidgetClick(type)}
                          className={`min-h-12 p-2 border-[length:var(--border-width)] border-theme-border hover:bg-theme-accent hover:text-theme-paper transition-all text-left font-bold active:translate-y-px cursor-pointer flex items-center bg-theme-background text-theme-ink rounded-button relative ${isHighlighted ? 'outline outline-4 outline-blue-500 outline-offset-2' : ''}`}
                        >
                          <span className="text-[11px] leading-tight font-body">+ {label}</span>
                        </div>
                      </Tooltip>
                    );
                  })}
                </div>}
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

        </div>
      </div>
    </>
  );
}



