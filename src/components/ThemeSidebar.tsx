import { useEffect, useState } from 'react';
import { THEMES, applyTheme, applyCustomTheme, isImageTexture, IMAGE_TEXTURES, getBuiltInTheme } from '../store/useThemeStore';
import { useStore } from '../store/useStore';
import { useCustomThemeStore, CustomTheme, getCustomTheme } from '../store/useCustomThemeStore';
import CustomThemeEditor from './CustomThemeEditor';
import { Tooltip } from './Tooltip';
import { TUTORIAL_STEPS, useTutorialStore } from '../store/useTutorialStore';
import GalleryShareModal from './GalleryShareModal';
import { submitToGallery } from '../hooks/useGallery';
import { XIcon, PencilIcon } from './icons';
import { useTelemetryStore } from '../store/useTelemetryStore';

interface ThemeSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function ThemeSidebar({ collapsed, onToggle }: ThemeSidebarProps) {
  const activeCharacterId = useStore((state) => state.activeCharacterId);
  const characters = useStore((state) => state.characters);
  const updateCharacterTheme = useStore((state) => state.updateCharacterTheme);
  const activeCharacter = characters.find(c => c.id === activeCharacterId);
  const currentTheme = activeCharacter?.theme || 'default';
  
  // Get texture info for the current theme
const customTheme = activeCharacter?.theme ? getCustomTheme(activeCharacter.theme) : undefined;
  const builtInTheme = activeCharacter?.theme ? getBuiltInTheme(activeCharacter.theme) : undefined;
  const textureKey = customTheme?.cardTexture || builtInTheme?.cardTexture || 'none';
  const hasImageTexture = isImageTexture(textureKey);

  const customThemes = useCustomThemeStore((state) => state.customThemes);
  const addCustomTheme = useCustomThemeStore((state) => state.addCustomTheme);
  const updateCustomTheme = useCustomThemeStore((state) => state.updateCustomTheme);
  const deleteCustomTheme = useCustomThemeStore((state) => state.deleteCustomTheme);
  const recordTelemetryEvent = useTelemetryStore((state) => state.recordEvent);
  const tutorialStep = useTutorialStore((state) => state.tutorialStep);
  const advanceTutorial = useTutorialStore((state) => state.advanceTutorial);

  const [showEditor, setShowEditor] = useState(false);
  const [editingTheme, setEditingTheme] = useState<CustomTheme | undefined>(undefined);
  const [sharingTheme, setSharingTheme] = useState<CustomTheme | null>(null);
  const isCurrentTutorialStep = (id: string) => tutorialStep !== null && TUTORIAL_STEPS[tutorialStep]?.id === id;

  useEffect(() => {
    if (isCurrentTutorialStep('themes-create-custom') || isCurrentTutorialStep('themes-share-custom')) {
      const selector = isCurrentTutorialStep('themes-share-custom')
        ? '[data-tutorial="theme-share-custom"]'
        : '[data-tutorial="theme-create-custom"]';

      document.querySelector(selector)?.scrollIntoView({
        block: 'center',
        behavior: 'smooth',
      });
    }
  }, [tutorialStep]);

  const handleSelectTheme = (themeId: string) => {
    if (activeCharacterId) {
      updateCharacterTheme(activeCharacterId, themeId);
      // Check if it's a custom theme
      const customTheme = getCustomTheme(themeId);
      if (customTheme) {
        applyCustomTheme(customTheme);
      } else {
        applyTheme(themeId);
      }

      if (isCurrentTutorialStep('themes-pick-theme')) {
        advanceTutorial();
      }
    }
  };

  const handleCreateCustom = () => {
    setEditingTheme(undefined);
    setShowEditor(true);

    if (isCurrentTutorialStep('themes-create-custom')) {
      advanceTutorial();
    }
  };

  const handleEditCustom = (theme: CustomTheme, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTheme(theme);
    setShowEditor(true);
  };

  const handleShareCustom = (theme: CustomTheme, e: React.MouseEvent) => {
    e.stopPropagation();
    setSharingTheme(theme);

    if (isCurrentTutorialStep('themes-share-custom')) {
      advanceTutorial();
    }
  };

  const handleSubmitShare = async (name: string, author: string, description: string) => {
    if (!sharingTheme) {
      return false;
    }

    const success = await submitToGallery('Themes', name, author, description, sharingTheme);
    if (success) {
      recordTelemetryEvent({
        eventName: 'custom_theme_shared',
        category: 'theme',
        characterId: activeCharacterId,
        sheetId: activeCharacter?.activeSheetId,
        mode: useStore.getState().mode,
        source: 'theme_sidebar',
        metadata: { themeId: sharingTheme.id },
      });
    }
    return success;
  };

  const handleEditPreset = (theme: typeof THEMES[number], e: React.MouseEvent) => {
    e.stopPropagation();
    // Create a new custom theme based on the preset
    const customThemeFromPreset: CustomTheme = {
      id: '', // Will be generated when saving
      name: `${theme.name} (Copy)`,
      icon: theme.icon,
      description: theme.description,
      colors: { ...theme.colors },
      fonts: { ...theme.fonts },
      borderRadius: theme.borderRadius,
      buttonRadius: theme.buttonRadius || theme.borderRadius,
      borderWidth: theme.borderWidth,
      shadowStyle: theme.shadowStyle,
      cardTexture: theme.cardTexture,
      textureColor: theme.colors.paper,
      textureOpacity: theme.textureOpacity ?? 0.15,
      borderStyle: theme.borderStyle,
    };
    setEditingTheme(customThemeFromPreset);
    setShowEditor(true);
  };

  const handleSaveTheme = (theme: CustomTheme) => {
    // If editingTheme has an id, we're updating an existing custom theme
    // If editingTheme has no id (empty string) or doesn't exist, we're creating a new one
    if (editingTheme && editingTheme.id) {
      updateCustomTheme(theme.id, theme);
      recordTelemetryEvent({
        eventName: 'custom_theme_updated',
        category: 'theme',
        characterId: activeCharacterId,
        sheetId: activeCharacter?.activeSheetId,
        mode: useStore.getState().mode,
        source: 'custom_theme_editor',
        metadata: { themeId: theme.id },
      });
      // If this theme is currently active, re-apply it
      if (currentTheme === theme.id) {
        applyCustomTheme(theme);
      }
    } else {
      addCustomTheme(theme);
      if (activeCharacterId) {
        updateCharacterTheme(activeCharacterId, theme.id);
        applyCustomTheme(theme);
      }
      recordTelemetryEvent({
        eventName: 'custom_theme_created',
        category: 'theme',
        characterId: activeCharacterId,
        sheetId: activeCharacter?.activeSheetId,
        mode: useStore.getState().mode,
        source: 'custom_theme_editor',
        metadata: { themeId: theme.id },
      });
    }
    setShowEditor(false);
    setEditingTheme(undefined);
  };

  const handleDeleteTheme = () => {
    if (editingTheme) {
      // If the deleted theme is currently active, switch to default
      if (currentTheme === editingTheme.id && activeCharacterId) {
        updateCharacterTheme(activeCharacterId, 'default');
        applyTheme('default');
      }
      deleteCustomTheme(editingTheme.id);
      recordTelemetryEvent({
        eventName: 'custom_theme_deleted',
        category: 'theme',
        characterId: activeCharacterId,
        sheetId: activeCharacter?.activeSheetId,
        mode: useStore.getState().mode,
        source: 'custom_theme_editor',
        metadata: { themeId: editingTheme.id },
      });
    }
    setShowEditor(false);
    setEditingTheme(undefined);
  };

  // Get current theme name for display
  const getCurrentThemeName = () => {
    const builtIn = THEMES.find(t => t.id === currentTheme);
    if (builtIn) return builtIn.name;
    const custom = customThemes.find(t => t.id === currentTheme);
    if (custom) return custom.name;
    return 'Unknown';
  };

  return (
    <>
      <GalleryShareModal
        open={!!sharingTheme}
        initialName={sharingTheme?.name || ''}
        onClose={() => setSharingTheme(null)}
        onSubmit={handleSubmitShare}
      />

      {/* Custom Theme Editor Modal */}
      {showEditor && (
        <CustomThemeEditor
          theme={editingTheme}
          onSave={handleSaveTheme}
          onCancel={() => {
            setShowEditor(false);
            setEditingTheme(undefined);
          }}
          onDelete={editingTheme?.id ? handleDeleteTheme : undefined}
        />
      )}

      {/* Overlay backdrop */}
      {!collapsed && (
        <div 
          className="fixed inset-0 bg-black/30 z-40"
          onClick={onToggle}
        />
      )}
      
      <div 
        data-tutorial="theme-panel"
        className={`fixed right-0 top-0 bottom-0 w-[80vw] max-w-[280px] bg-theme-paper border-l-[length:var(--border-width)] border-theme-border z-50 flex flex-col p-3 shadow-theme overflow-hidden transition-transform duration-300 ease-in-out safe-area-bottom touch-pan-y ${
          collapsed ? 'translate-x-full' : 'translate-x-0'
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
        <Tooltip content="Close theme panel">
          <button
            onClick={onToggle}
            className="absolute top-3 right-3 w-10 h-10 bg-theme-accent text-theme-paper font-bold flex items-center justify-center rounded-button z-20 shadow-theme hover:bg-theme-accent-hover transition-colors"
            aria-label="Close theme panel"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </Tooltip>
        
        {/* Sidebar content */}
        <div className="relative z-10 flex flex-col h-full overflow-y-auto touch-pan-y pt-12 -mr-3 pr-3">

        <div className="mb-4">
          <h2 className="text-xl font-bold uppercase tracking-wider border-b-[length:var(--border-width)] border-theme-border pb-2 text-theme-ink font-heading">
            Themes
          </h2>
        </div>

        {/* Built-in Themes */}
        <div className="flex flex-col gap-2">
          {THEMES.map((theme) => {
            const themeTextureKey = isImageTexture(theme.cardTexture) ? theme.cardTexture : null;
            const isSelected = currentTheme === theme.id;
            return (
              <div
                key={theme.id}
                data-tutorial={`theme-option-${theme.id}`}
                style={{
                  backgroundColor: isSelected ? theme.colors.accent : theme.colors.paper,
                  color: isSelected ? theme.colors.paper : theme.colors.ink,
                  borderColor: theme.colors.border,
                  borderRadius: theme.borderRadius,
                  borderWidth: theme.borderWidth,
                  fontFamily: theme.fonts.body,
                  boxShadow: `3px 3px 0 ${theme.colors.shadow}`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
                className="p-2 border-solid transition-all text-left font-bold"
              >
                {/* Texture overlay for theme preview */}
                {themeTextureKey && !isSelected && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ backgroundColor: theme.colors.paper, borderRadius: theme.borderRadius }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url(${IMAGE_TEXTURES[themeTextureKey]})`,
                        backgroundSize: 'cover',
                        filter: 'grayscale(100%)',
                        opacity: theme.textureOpacity ?? 0.15,
                        mixBlendMode: 'overlay',
                        borderRadius: theme.borderRadius,
                      }}
                    />
                  </div>
                )}
                <button
                  onClick={() => handleSelectTheme(theme.id)}
                  className="relative w-full text-left"
                >
                  <div className="flex items-center gap-2 pr-8">
                    <span className="text-base">{theme.icon}</span>
                    <span className="text-xs" style={{ fontFamily: theme.fonts.heading }}>{theme.name}</span>
                  </div>
                  <p className="text-[10px] mt-1 opacity-70">
                    {theme.description}
                  </p>
                  {/* Color preview dots */}
                  <div className="flex gap-1 mt-2">
                    <Tooltip content="Paper">
                      <div 
                        className="w-3 h-3 rounded-full border border-black/20"
                        style={{ backgroundColor: theme.colors.paper }}
                      />
                    </Tooltip>
                    <Tooltip content="Ink">
                      <div 
                        className="w-3 h-3 rounded-full border border-black/20"
                        style={{ backgroundColor: theme.colors.ink }}
                      />
                    </Tooltip>
                    <Tooltip content="Accent">
                      <div 
                        className="w-3 h-3 rounded-full border border-black/20"
                        style={{ backgroundColor: theme.colors.accent }}
                      />
                    </Tooltip>
                    <Tooltip content="Background">
                      <div 
                        className="w-3 h-3 rounded-full border border-black/20"
                        style={{ backgroundColor: theme.colors.background }}
                      />
                    </Tooltip>
                  </div>
                </button>
                {/* Edit button */}
                <Tooltip content="Copy to custom theme">
                  <button
                    onClick={(e) => handleEditPreset(theme, e)}
                    style={{
                      backgroundColor: isSelected ? `${theme.colors.paper}33` : `${theme.colors.accent}1a`,
                      color: isSelected ? theme.colors.paper : theme.colors.accent,
                    }}
                    className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded text-xs hover:scale-110 transition-transform z-10"
                    aria-label="Copy to custom theme"
                  >
                    <PencilIcon className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              </div>
            );
          })}
        </div>

        {/* Custom Themes Section */}
        <div data-tutorial="theme-custom-section" className="mt-6 pt-4 border-t border-theme-border/50">
          <h3 className="text-sm font-bold text-theme-ink mb-3 uppercase tracking-wider font-heading">
            Custom Themes
          </h3>
          
          {/* Create New Custom Theme Button */}
          <button
            data-tutorial="theme-create-custom"
            onClick={handleCreateCustom}
            className="w-full p-2 border-[length:var(--border-width)] border-dashed border-theme-border transition-all text-left font-bold bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper hover:border-solid mb-2"
            style={{ borderRadius: 'min(var(--button-radius), 16px)' }}
          >
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="text-xs font-heading">Create Custom Theme</span>
            </div>
            <p className="text-[10px] mt-1 opacity-70 font-body">
              Design your own unique theme
            </p>
          </button>

          {/* List of Custom Themes */}
          <div className="flex flex-col gap-2 mt-3">
            {customThemes.map((theme) => {
              const customTextureKey = isImageTexture(theme.cardTexture || '') ? theme.cardTexture : null;
              const isSelected = currentTheme === theme.id;
              return (
                <div
                  key={theme.id}
                  style={{
                    backgroundColor: isSelected ? theme.colors.accent : theme.colors.paper,
                    color: isSelected ? theme.colors.paper : theme.colors.ink,
                    borderColor: theme.colors.border,
                    borderRadius: theme.borderRadius,
                    borderWidth: theme.borderWidth,
                    fontFamily: theme.fonts.body,
                    boxShadow: `3px 3px 0 ${theme.colors.shadow}`,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  className="p-2 border-solid transition-all text-left font-bold"
                >
                  {/* Texture overlay for custom theme preview */}
                  {customTextureKey && !isSelected && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ backgroundColor: theme.colors.paper, borderRadius: theme.borderRadius }}
                    >
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage: `url(${IMAGE_TEXTURES[customTextureKey]})`,
                          backgroundSize: 'cover',
                          filter: 'grayscale(100%)',
                          opacity: theme.textureOpacity ?? 0.15,
                          mixBlendMode: 'overlay',
                          borderRadius: theme.borderRadius,
                        }}
                      />
                    </div>
                  )}
                  <button
                    onClick={() => handleSelectTheme(theme.id)}
                    className="relative w-full text-left"
                  >
                    <div className="flex items-center gap-2 pr-20">
                      <span className="text-base">{theme.icon}</span>
                      <span className="text-xs" style={{ fontFamily: theme.fonts.heading }}>{theme.name}</span>
                    </div>
                    <p className="text-[10px] mt-1 opacity-70">
                      {theme.description}
                    </p>
                    {/* Color preview dots */}
                    <div className="flex gap-1 mt-2">
                      <Tooltip content="Paper">
                        <div 
                          className="w-3 h-3 rounded-full border border-black/20"
                          style={{ backgroundColor: theme.colors.paper }}
                        />
                      </Tooltip>
                      <Tooltip content="Ink">
                        <div 
                          className="w-3 h-3 rounded-full border border-black/20"
                          style={{ backgroundColor: theme.colors.ink }}
                        />
                      </Tooltip>
                      <Tooltip content="Accent">
                        <div 
                          className="w-3 h-3 rounded-full border border-black/20"
                          style={{ backgroundColor: theme.colors.accent }}
                        />
                      </Tooltip>
                      <Tooltip content="Background">
                        <div 
                          className="w-3 h-3 rounded-full border border-black/20"
                          style={{ backgroundColor: theme.colors.background }}
                        />
                      </Tooltip>
                    </div>
                  </button>
                  {/* Share and edit buttons */}
                  <Tooltip content="Share theme to gallery">
                    <button
                      data-tutorial="theme-share-custom"
                      onClick={(e) => handleShareCustom(theme, e)}
                      style={{
                        backgroundColor: isSelected ? `${theme.colors.paper}33` : `${theme.colors.accent}1a`,
                        color: isSelected ? theme.colors.paper : theme.colors.accent,
                      }}
                      className="absolute top-2 right-10 h-6 px-2 flex items-center justify-center rounded text-[10px] font-bold hover:scale-105 transition-transform z-10"
                    >
                      Share
                    </button>
                  </Tooltip>
                  <Tooltip content="Edit theme">
                    <button
                      onClick={(e) => handleEditCustom(theme, e)}
                      style={{
                        backgroundColor: isSelected ? `${theme.colors.paper}33` : `${theme.colors.accent}1a`,
                        color: isSelected ? theme.colors.paper : theme.colors.accent,
                      }}
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded text-xs hover:scale-110 transition-transform z-10"
                      aria-label="Edit theme"
                    >
                    <PencilIcon className="w-3.5 h-3.5" />
                  </button>
                  </Tooltip>
              </div>
              );
            })}
          </div>

          {customThemes.length === 0 && (
            <p className="text-[10px] text-theme-muted mt-2 font-body">
              No custom themes yet. Create one above!
            </p>
          )}
        </div>

        <div className="mt-auto pt-4 text-[10px] text-theme-muted border-t border-theme-border/50 font-body">
          <p>Select a theme to change the appearance of your character sheet.</p>
          <p className="mt-2 text-theme-ink font-bold">Current: {getCurrentThemeName()}</p>
        </div>
        </div>
      </div>
    </>
  );
}

