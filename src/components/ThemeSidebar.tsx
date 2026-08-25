import { useEffect, useRef, useState } from 'react';
import { THEMES, applyTheme, applyCustomTheme, isImageTexture, IMAGE_TEXTURES, getBuiltInTheme } from '../store/useThemeStore';
import { useStore } from '../store/useStore';
import { useCustomThemeStore, CustomTheme, getCustomTheme, isCustomTheme } from '../store/useCustomThemeStore';
import CustomThemeEditor from './CustomThemeEditor';
import { Tooltip } from './Tooltip';
import { TUTORIAL_STEPS, useTutorialStore } from '../store/useTutorialStore';
import GalleryShareModal from './GalleryShareModal';
import { submitToGallery, useGallery } from '../hooks/useGallery';
import { v4 as uuidv4 } from 'uuid';
import { ChevronDownIcon, ChevronUpIcon, DownloadIcon, DotsVerticalIcon, LinkIcon, PaperIcon, TrashIcon, UploadIcon, XIcon, PencilIcon } from './icons';
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
  const { manifest, themeData } = useGallery();
  const availableCommunityThemes = (manifest?.themes ?? []).flatMap((item) => {
    const theme = themeData[item.id];
    return theme ? [{ item, theme }] : [];
  });
  const activeCommunityTheme = Object.values(themeData).find((theme) => theme.id === currentTheme);

  const [showEditor, setShowEditor] = useState(false);
  const [editingTheme, setEditingTheme] = useState<CustomTheme | undefined>(undefined);
  const [sharingTheme, setSharingTheme] = useState<CustomTheme | null>(null);
  const [rawDataTheme, setRawDataTheme] = useState<CustomTheme | null>(null);
  const [rawDataThemeCopied, setRawDataThemeCopied] = useState(false);
  const [customThemesExpanded, setCustomThemesExpanded] = useState(true);
  const [builtInThemesExpanded, setBuiltInThemesExpanded] = useState(true);
  const [communityThemesExpanded, setCommunityThemesExpanded] = useState(false);
  const [openCustomThemeMenuId, setOpenCustomThemeMenuId] = useState<string | null>(null);
  const [themeToDelete, setThemeToDelete] = useState<CustomTheme | null>(null);
  const [showThemeImportMenu, setShowThemeImportMenu] = useState(false);
  const [showRawThemeImport, setShowRawThemeImport] = useState(false);
  const [rawThemeImportValue, setRawThemeImportValue] = useState('');
  const [themeImportError, setThemeImportError] = useState<string | null>(null);
  const themeFileInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (activeCommunityTheme) {
      applyCustomTheme(activeCommunityTheme);
    }
  }, [activeCommunityTheme]);

  const handleSelectTheme = (themeId: string) => {
    setOpenCustomThemeMenuId(null);
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

  const handleSelectCommunityTheme = (theme: CustomTheme) => {
    if (!activeCharacterId) {
      return;
    }

    updateCharacterTheme(activeCharacterId, theme.id);
    applyCustomTheme(theme);

    if (isCurrentTutorialStep('themes-pick-theme')) {
      advanceTutorial();
    }
  };

  const handleCreateCustom = () => {
    setShowThemeImportMenu(false);
    setEditingTheme(undefined);
    setShowEditor(true);

    if (isCurrentTutorialStep('themes-create-custom')) {
      advanceTutorial();
    }
  };

  const handleEditCustom = (theme: CustomTheme, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenCustomThemeMenuId(null);
    setEditingTheme(theme);
    setShowEditor(true);
  };

  const handleShareCustom = (theme: CustomTheme, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenCustomThemeMenuId(null);
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

  const deleteTheme = (theme: CustomTheme) => {
    // If the deleted theme is currently active, switch to default
    if (currentTheme === theme.id && activeCharacterId) {
      updateCharacterTheme(activeCharacterId, 'default');
      applyTheme('default');
    }
    deleteCustomTheme(theme.id);
    recordTelemetryEvent({
      eventName: 'custom_theme_deleted',
      category: 'theme',
      characterId: activeCharacterId,
      sheetId: activeCharacter?.activeSheetId,
      mode: useStore.getState().mode,
      source: 'custom_theme_editor',
      metadata: { themeId: theme.id },
    });
  };

  const handleDeleteTheme = () => {
    if (editingTheme) {
      deleteTheme(editingTheme);
    }
    setShowEditor(false);
    setEditingTheme(undefined);
  };

  const handleDeleteCustomTheme = (theme: CustomTheme, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenCustomThemeMenuId(null);
    setThemeToDelete(theme);
  };

  const handleExportTheme = (theme: CustomTheme) => {
    const dataStr = JSON.stringify(theme, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = theme.name.replace(/[^a-z0-9]/gi, '_') || 'custom_theme';
    link.href = url;
    link.download = `${filename}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setOpenCustomThemeMenuId(null);
    recordTelemetryEvent({
      eventName: 'custom_theme_exported_json',
      category: 'theme',
      characterId: activeCharacterId,
      sheetId: activeCharacter?.activeSheetId,
      mode: useStore.getState().mode,
      source: 'theme_sidebar',
      metadata: { themeId: theme.id },
    });
  };

  const handleShowRawTheme = (theme: CustomTheme) => {
    setOpenCustomThemeMenuId(null);
    setRawDataTheme(theme);
    setRawDataThemeCopied(false);
  };

  const handleCopyRawTheme = async () => {
    if (!rawDataTheme) {
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(rawDataTheme, null, 2));
      recordTelemetryEvent({
        eventName: 'custom_theme_raw_data_copied',
        category: 'theme',
        characterId: activeCharacterId,
        sheetId: activeCharacter?.activeSheetId,
        mode: useStore.getState().mode,
        source: 'theme_raw_data_modal',
        metadata: { themeId: rawDataTheme.id },
      });
      setRawDataThemeCopied(true);
      setTimeout(() => setRawDataThemeCopied(false), 2000);
    } catch {
      // Clipboard access can be unavailable in some browser contexts.
    }
  };

  const saveImportedTheme = (value: unknown) => {
    if (!isCustomTheme(value)) {
      return false;
    }

    const importedTheme = { ...value, id: uuidv4() };
    addCustomTheme(importedTheme);
    recordTelemetryEvent({
      eventName: 'custom_theme_imported_json',
      category: 'theme',
      characterId: activeCharacterId,
      sheetId: activeCharacter?.activeSheetId,
      mode: useStore.getState().mode,
      source: 'theme_sidebar_import',
      metadata: { themeId: importedTheme.id },
    });
    setShowThemeImportMenu(false);
    return true;
  };

  const handleImportThemeFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result || ''));
        if (!saveImportedTheme(imported)) {
          window.alert('Invalid theme file format.');
        }
      } catch {
        window.alert('Unable to read the theme JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleImportRawTheme = () => {
    try {
      const imported = JSON.parse(rawThemeImportValue);
      if (!saveImportedTheme(imported)) {
        setThemeImportError('This JSON does not contain a valid custom theme.');
        return;
      }
      setRawThemeImportValue('');
      setThemeImportError(null);
      setShowRawThemeImport(false);
    } catch {
      setThemeImportError('Enter valid JSON before importing the theme.');
    }
  };

  return (
    <>
      <GalleryShareModal
        open={!!sharingTheme}
        initialName={sharingTheme?.name || ''}
        onClose={() => setSharingTheme(null)}
        onSubmit={handleSubmitShare}
      />

      {rawDataTheme && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[60] animate-fade-in"
            onClick={() => setRawDataTheme(null)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-theme rounded-theme p-6 z-[60] w-[90vw] max-w-[600px] max-h-[80vh] flex flex-col animate-fade-in bg-theme-paper border-[length:var(--border-width)] border-theme-border">
            <h3 className="font-heading font-bold text-xl mb-4 text-theme-ink">
              Raw Data — {rawDataTheme.name}
            </h3>
            <textarea
              readOnly
              aria-label={`Raw data for ${rawDataTheme.name}`}
              value={JSON.stringify(rawDataTheme, null, 2)}
              className="flex-1 w-full min-h-[300px] p-3 text-xs font-mono rounded-theme resize-none bg-theme-background border-[length:var(--border-width)] border-theme-border text-theme-ink"
            />
            <div className="flex items-center gap-3 mt-4">
              <div className="flex-1" />
              <button
                type="button"
                onClick={handleCopyRawTheme}
                className={`px-4 py-2 font-body rounded-button transition-colors font-bold flex items-center gap-2 ${
                  rawDataThemeCopied
                    ? 'bg-green-500 text-white'
                    : 'bg-theme-accent text-theme-paper hover:bg-theme-accent-hover'
                }`}
              >
                <PaperIcon className="h-4 w-4" />
                {rawDataThemeCopied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              <button
                type="button"
                onClick={() => setRawDataTheme(null)}
                className="px-4 py-2 font-body rounded-button transition-colors text-theme-ink border-[length:var(--border-width)] border-theme-border hover:bg-theme-background"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}

      {showRawThemeImport && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[60] animate-fade-in"
            onClick={() => setShowRawThemeImport(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-theme rounded-theme p-6 z-[60] w-[90vw] max-w-[600px] max-h-[80vh] flex flex-col animate-fade-in bg-theme-paper border-[length:var(--border-width)] border-theme-border">
            <h3 className="font-heading font-bold text-xl mb-4 text-theme-ink">
              Import Theme from Raw Data
            </h3>
            <textarea
              value={rawThemeImportValue}
              onChange={(event) => {
                setRawThemeImportValue(event.target.value);
                setThemeImportError(null);
              }}
              placeholder="Paste theme JSON here..."
              aria-label="Theme JSON to import"
              className="flex-1 w-full min-h-[300px] p-3 text-xs font-mono rounded-theme resize-none bg-theme-background border-[length:var(--border-width)] border-theme-border text-theme-ink"
            />
            {themeImportError && (
              <p className="mt-2 text-xs text-red-600">{themeImportError}</p>
            )}
            <div className="flex items-center gap-3 mt-4 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowRawThemeImport(false);
                  setRawThemeImportValue('');
                  setThemeImportError(null);
                }}
                className="px-4 py-2 font-body rounded-button transition-colors text-theme-ink border-[length:var(--border-width)] border-theme-border hover:bg-theme-background"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportRawTheme}
                className="px-4 py-2 font-body rounded-button transition-colors font-bold bg-theme-accent text-theme-paper hover:bg-theme-accent-hover"
              >
                Import Theme
              </button>
            </div>
          </div>
        </>
      )}

      {themeToDelete && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[60] animate-fade-in"
            onClick={() => setThemeToDelete(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-theme-title"
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-theme rounded-theme p-4 z-[60] min-w-[280px] max-w-[calc(100vw-2rem)] animate-fade-in bg-theme-paper border-[length:var(--border-width)] border-theme-border"
          >
            <h3 id="delete-theme-title" className="font-heading font-bold mb-2 text-theme-ink">
              Delete Custom Theme?
            </h3>
            <p className="text-sm font-body mb-4 text-theme-muted">
              Are you sure you want to delete "{themeToDelete.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setThemeToDelete(null)}
                className="px-3 py-1.5 text-sm font-body rounded-button transition-colors text-theme-ink hover:bg-theme-background"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteTheme(themeToDelete);
                  setThemeToDelete(null);
                }}
                className="px-3 py-1.5 text-sm font-body bg-red-500 text-white hover:bg-red-600 rounded-button transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

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
        data-touch-camera-panel="true"
        className={`fixed right-0 top-0 bottom-0 w-[88vw] max-w-[360px] bg-theme-paper border-l-[length:var(--border-width)] border-theme-border z-50 flex flex-col p-3 shadow-theme overflow-hidden transition-transform duration-300 ease-in-out safe-area-bottom touch-pan-y ${
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
        <button
          onClick={onToggle}
          className="absolute top-3 right-3 w-10 h-10 bg-theme-accent text-theme-paper font-bold flex items-center justify-center rounded-button z-20 shadow-theme hover:bg-theme-accent-hover transition-colors"
          aria-label="Close theme panel"
        >
          <XIcon className="w-5 h-5" />
        </button>
        
        {/* Sidebar content */}
        <div className="relative z-10 flex flex-col h-full overflow-y-auto touch-pan-y pt-12 pb-4 -mr-3 pr-3">

        <div className="mb-4">
          <h2 className="text-xl font-bold uppercase tracking-wider border-b-[length:var(--border-width)] border-theme-border pb-2 text-theme-ink font-heading">
            Themes
          </h2>
        </div>

        {/* Built-in Themes */}
        <div className="order-2">
          <button
            type="button"
            onClick={() => setBuiltInThemesExpanded((expanded) => !expanded)}
            aria-expanded={builtInThemesExpanded}
            aria-controls="built-in-theme-list"
            className="group mt-6 flex w-full items-center justify-between border-b-[length:var(--border-width)] border-theme-border pb-2 text-left text-sm font-bold uppercase tracking-wider text-theme-ink font-heading"
          >
            <span>Built-in Themes</span>
            {builtInThemesExpanded ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )}
          </button>

          {builtInThemesExpanded && (
            <div id="built-in-theme-list" className="mt-3 flex flex-col gap-2">
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
          )}
        </div>

        {/* Custom Themes Section */}
        <div data-tutorial="theme-custom-section" className="order-1">
          {/* Import Theme Button */}
          <div className="relative mb-2">
            <button
              type="button"
              onClick={() => setShowThemeImportMenu((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={showThemeImportMenu}
              className="w-full p-2 border-[length:var(--border-width)] border-theme-border transition-all text-left font-bold bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper"
              style={{ borderRadius: 'min(var(--button-radius), 16px)' }}
            >
              <div className="flex items-center gap-2">
                <UploadIcon className="w-4 h-4" />
                <span className="text-xs font-heading">Import Theme</span>
              </div>
              <p className="text-[10px] mt-1 opacity-70 font-body">
                Load a theme from JSON
              </p>
            </button>

            {showThemeImportMenu && (
              <div
                role="menu"
                className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-theme border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink shadow-theme animate-dropdown-in"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowThemeImportMenu(false);
                    themeFileInputRef.current?.click();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-theme-background"
                >
                  <UploadIcon className="h-3.5 w-3.5" />
                  From File
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowThemeImportMenu(false);
                    setRawThemeImportValue('');
                    setThemeImportError(null);
                    setShowRawThemeImport(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-theme-background"
                >
                  <PaperIcon className="h-3.5 w-3.5" />
                  From Raw Data
                </button>
              </div>
            )}
            <input
              ref={themeFileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportThemeFile}
              className="hidden"
            />
          </div>

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

          {customThemes.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setCustomThemesExpanded((expanded) => !expanded)}
                aria-expanded={customThemesExpanded}
                aria-controls="custom-theme-list"
                className="group mt-6 flex w-full items-center justify-between border-b-[length:var(--border-width)] border-theme-border pb-2 text-left text-sm font-bold uppercase tracking-wider text-theme-ink font-heading"
              >
                <span>Custom Themes</span>
                {customThemesExpanded ? (
                  <ChevronUpIcon className="h-4 w-4" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4" />
                )}
              </button>

              {/* List of Custom Themes */}
              {customThemesExpanded && (
                <div id="custom-theme-list" className="mt-3 flex flex-col gap-2">
                {customThemes.map((theme) => {
              const customTextureKey = isImageTexture(theme.cardTexture || '') ? theme.cardTexture : null;
              const isSelected = currentTheme === theme.id;
              const isActionMenuOpen = openCustomThemeMenuId === theme.id;
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
                    overflow: isActionMenuOpen ? 'visible' : 'hidden',
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
                    <div className="flex items-center gap-2 pr-10">
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
                  <Tooltip content="Theme actions">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenCustomThemeMenuId(isActionMenuOpen ? null : theme.id);
                      }}
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded text-xs hover:scale-110 transition-transform z-10"
                      style={{
                        backgroundColor: isSelected ? `${theme.colors.paper}33` : `${theme.colors.accent}1a`,
                        color: isSelected ? theme.colors.paper : theme.colors.accent,
                      }}
                      aria-label={`Actions for ${theme.name}`}
                      aria-haspopup="menu"
                      aria-expanded={isActionMenuOpen}
                      aria-controls={`custom-theme-actions-${theme.id}`}
                    >
                      <DotsVerticalIcon className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                  {isActionMenuOpen && (
                    <div
                      id={`custom-theme-actions-${theme.id}`}
                      role="menu"
                      aria-label={`Actions for ${theme.name}`}
                      className="absolute right-2 top-9 z-30 min-w-[130px] overflow-hidden rounded-theme border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink shadow-theme animate-dropdown-in"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={(e) => handleEditCustom(theme, e)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-theme-background"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleExportTheme(theme)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-theme-background"
                      >
                        <DownloadIcon className="h-3.5 w-3.5" />
                        Export JSON
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleShowRawTheme(theme)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-theme-background"
                      >
                        <PaperIcon className="h-3.5 w-3.5" />
                        Show Raw Data
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        data-tutorial="theme-share-custom"
                        onClick={(e) => handleShareCustom(theme, e)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-theme-background"
                      >
                        <LinkIcon className="h-3.5 w-3.5" />
                        Share
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={(e) => handleDeleteCustomTheme(theme, e)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-500 transition-colors hover:bg-red-500/10"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
              </div>
              );
                })}
                </div>
              )}
            </>
          )}

        </div>

        {availableCommunityThemes.length > 0 && (
          <div data-tutorial="theme-community-section" className="order-3">
            <button
              type="button"
              onClick={() => setCommunityThemesExpanded((expanded) => !expanded)}
              aria-expanded={communityThemesExpanded}
              aria-controls="community-theme-list"
              className="group mt-6 flex w-full items-center justify-between border-b-[length:var(--border-width)] border-theme-border pb-2 text-left text-sm font-bold uppercase tracking-wider text-theme-ink font-heading"
            >
              <span>Community Themes</span>
              {communityThemesExpanded ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
            </button>

            {communityThemesExpanded && (
              <div id="community-theme-list" className="mt-3 flex flex-col gap-2">
                {availableCommunityThemes.map(({ item, theme }) => {
                  const communityTextureKey = isImageTexture(theme.cardTexture || '') ? theme.cardTexture : null;
                  const isSelected = currentTheme === theme.id;
                  return (
                    <div
                      key={item.id}
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
                      {communityTextureKey && !isSelected && (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{ backgroundColor: theme.colors.paper, borderRadius: theme.borderRadius }}
                        >
                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundImage: `url(${IMAGE_TEXTURES[communityTextureKey]})`,
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
                        type="button"
                        onClick={() => handleSelectCommunityTheme(theme)}
                        className="relative w-full text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{theme.icon}</span>
                          <span className="text-xs" style={{ fontFamily: theme.fonts.heading }}>{item.name}</span>
                        </div>
                        <p className="text-[10px] mt-1 opacity-70">
                          by {item.author}
                        </p>
                        <p className="text-[10px] mt-1 opacity-70">
                          {item.description}
                        </p>
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        </div>
      </div>
    </>
  );
}

