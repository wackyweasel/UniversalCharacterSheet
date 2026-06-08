import { useEffect, useRef, useState } from 'react';
import { useUserPresetStore } from '../store/useUserPresetStore';
import { useCustomThemeStore } from '../store/useCustomThemeStore';
import { useTemplateStore } from '../store/useTemplateStore';
import { useGallery, submitToGallery, GalleryPreset, GalleryTheme, GalleryTemplate } from '../hooks/useGallery';
import { IMAGE_TEXTURES, isImageTexture, getShadowStyleCSS } from '../store/useThemeStore';
import { v4 as uuidv4 } from 'uuid';
import GalleryShareModal from './GalleryShareModal';
import { TUTORIAL_STEPS, useTutorialStore } from '../store/useTutorialStore';
import { useTelemetryStore } from '../store/useTelemetryStore';

interface GallerySidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  darkMode: boolean;
}

type TabType = 'presets' | 'themes' | 'templates';
type UserDataType = 'preset' | 'theme' | 'template';

function getUserDataTypeLabel(type: UserDataType): string {
  return type === 'preset' ? 'preset' : type === 'theme' ? 'theme' : 'template';
}

function getUserDataTypePluralLabel(type: UserDataType): string {
  return type === 'preset' ? 'presets' : type === 'theme' ? 'themes' : 'templates';
}

export default function GallerySidebar({ collapsed, onToggle, darkMode }: GallerySidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>('presets');
  const [shareExpanded, setShareExpanded] = useState(false);
  const [browseExpanded, setBrowseExpanded] = useState(true);
  const conceptsRef = useRef<HTMLDivElement>(null);
  const manageDataRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLDivElement>(null);
  const tutorialStep = useTutorialStore((state) => state.tutorialStep);
  const isCurrentTutorialStep = (id: string) => tutorialStep !== null && TUTORIAL_STEPS[tutorialStep]?.id === id;
  const recordTelemetryEvent = useTelemetryStore((state) => state.recordEvent);
  
  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareType, setShareType] = useState<UserDataType>('preset');
  const [shareItemId, setShareItemId] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<{ type: UserDataType; id: string; name: string } | null>(null);
  
  // Download feedback
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  
  // User data stores
  const userPresets = useUserPresetStore((state) => state.userPresets);
  const addUserPreset = useUserPresetStore((state) => state.addPreset);
  const removeUserPreset = useUserPresetStore((state) => state.removePreset);
  const customThemes = useCustomThemeStore((state) => state.customThemes);
  const addCustomTheme = useCustomThemeStore((state) => state.addCustomTheme);
  const deleteCustomTheme = useCustomThemeStore((state) => state.deleteCustomTheme);
  const templates = useTemplateStore((state) => state.templates);
  const removeTemplate = useTemplateStore((state) => state.removeTemplate);
  
  // Gallery data
  const { manifest, themeData, loading, error, refresh, downloadPreset, downloadTheme, downloadTemplate } = useGallery();

  useEffect(() => {
    if (isCurrentTutorialStep('various-gallery-manage')) {
      setShareExpanded(true);
    }
    if (isCurrentTutorialStep('various-gallery-download')) {
      setBrowseExpanded(true);
    }
  }, [tutorialStep]);

  useEffect(() => {
    if (collapsed) return;

    const target = isCurrentTutorialStep('various-gallery-concepts')
      ? conceptsRef.current
      : isCurrentTutorialStep('various-gallery-manage')
        ? manageDataRef.current
        : isCurrentTutorialStep('various-gallery-download')
          ? downloadRef.current
          : null;

    if (!target) return;

    const scrollTimer = window.setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    return () => window.clearTimeout(scrollTimer);
  }, [tutorialStep, collapsed]);

  const currentShareItemName = shareType === 'preset'
    ? userPresets.find(p => p.id === shareItemId)?.name || ''
    : shareType === 'theme'
      ? customThemes.find(t => t.id === shareItemId)?.name || ''
      : templates.find(t => t.id === shareItemId)?.name || '';
  
  const handleOpenShareModal = (type: UserDataType, id: string) => {
    setShareType(type);
    setShareItemId(id);
    setShowShareModal(true);
  };

  const handleDeleteUserData = (type: UserDataType, id: string, name: string) => {
    setDeleteTarget({ type, id, name });
  };

  const handleConfirmDeleteUserData = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'preset') {
      removeUserPreset(deleteTarget.id);
    } else if (deleteTarget.type === 'theme') {
      deleteCustomTheme(deleteTarget.id);
    } else {
      removeTemplate(deleteTarget.id);
    }

    recordTelemetryEvent({
      eventName: `gallery_deleted_${deleteTarget.type}`,
      category: deleteTarget.type === 'theme' ? 'theme' : 'gallery',
      source: 'gallery_sidebar',
      metadata: { itemId: deleteTarget.id },
    });

    setDeleteTarget(null);
  };
  
  const handleSubmitShare = async (name: string, author: string, description: string) => {
    let data: any = null;
    let sheet: 'Presets' | 'Themes' | 'Templates' = 'Presets';
    
    if (shareType === 'preset') {
      const preset = userPresets.find(p => p.id === shareItemId);
      if (preset) {
        // Strip images from preset data
        const strippedPreset = {
          ...preset.preset,
          sheets: preset.preset.sheets.map(sheet => ({
            ...sheet,
            widgets: sheet.widgets.map(widget => {
              if (widget.type === 'IMAGE') {
                return { ...widget, data: { ...widget.data, imageUrl: undefined } };
              }
              if (widget.type === 'MAP_SKETCHER') {
                return { ...widget, data: { ...widget.data, mapShapes: [] } };
              }
              return widget;
            })
          }))
        };
        data = strippedPreset;
        sheet = 'Presets';
      }
    } else if (shareType === 'theme') {
      const theme = customThemes.find(t => t.id === shareItemId);
      if (theme) {
        data = theme;
        sheet = 'Themes';
      }
    } else {
      const template = templates.find(t => t.id === shareItemId);
      if (template) {
        data = template;
        sheet = 'Templates';
      }
    }
    
    if (data) {
      const success = await submitToGallery(sheet, name, author, description, data);
      if (success) {
        recordTelemetryEvent({
          eventName: `gallery_shared_${shareType}`,
          category: shareType === 'theme' ? 'theme' : 'gallery',
          source: 'gallery_sidebar',
          metadata: { itemId: shareItemId },
        });
      }
      return success;
    }

    return false;
  };
  
  const handleDownloadPreset = async (item: GalleryPreset) => {
    setDownloadingId(item.id);
    const preset = await downloadPreset(item);
    if (preset) {
      // Create a character from the preset to use addPreset
      const tempCharacter = {
        id: uuidv4(),
        ...preset,
      };
      addUserPreset(tempCharacter, `${item.name} (Gallery)`, false);
      recordTelemetryEvent({
        eventName: 'gallery_downloaded_preset',
        category: 'gallery',
        source: 'gallery_sidebar',
        metadata: { itemId: item.id },
      });
      setDownloadSuccess(item.id);
      setTimeout(() => setDownloadSuccess(null), 2000);
    }
    setDownloadingId(null);
  };
  
  const handleDownloadTheme = async (item: GalleryTheme) => {
    setDownloadingId(item.id);
    const theme = await downloadTheme(item);
    if (theme) {
      // Generate new ID to avoid conflicts
      addCustomTheme({ ...theme, id: uuidv4() });
      recordTelemetryEvent({
        eventName: 'gallery_downloaded_theme',
        category: 'theme',
        source: 'gallery_sidebar',
        metadata: { itemId: item.id },
      });
      setDownloadSuccess(item.id);
      setTimeout(() => setDownloadSuccess(null), 2000);
    }
    setDownloadingId(null);
  };
  
  const handleDownloadTemplate = async (item: GalleryTemplate) => {
    setDownloadingId(item.id);
    const template = await downloadTemplate(item);
    if (template) {
      // Add template with new ID
      const templateStore = useTemplateStore.getState();
      const newTemplates = [...templateStore.templates, { ...template, id: uuidv4(), createdAt: Date.now() }];
      localStorage.setItem('ucs:templates', JSON.stringify({ templates: newTemplates }));
      recordTelemetryEvent({
        eventName: 'gallery_downloaded_template',
        category: 'gallery',
        source: 'gallery_sidebar',
        metadata: { itemId: item.id },
      });
      // Force refresh by reloading - templates store doesn't have an addTemplateRaw
      window.location.reload();
    }
    setDownloadingId(null);
  };
  
  const baseButtonClass = darkMode
    ? 'bg-black text-white border border-white/30 hover:bg-white/10'
    : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100';
    
  const cardClass = darkMode
    ? 'bg-black/50 border border-white/20'
    : 'bg-white border border-gray-200';

  return (
    <>
      <GalleryShareModal
        open={showShareModal}
        initialName={currentShareItemName}
        onClose={() => setShowShareModal(false)}
        onSubmit={handleSubmitShare}
        variant="gallery"
        darkMode={darkMode}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-[60]" 
            onClick={() => setDeleteTarget(null)}
          />
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-data-title"
            className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] p-6 rounded-lg shadow-xl w-[90vw] max-w-[400px] ${darkMode ? 'bg-gray-900 text-white border border-white/20' : 'bg-white text-gray-900 border border-gray-200'}`}
          >
            <h3 id="delete-data-title" className="text-lg font-bold mb-2">
              Delete {getUserDataTypeLabel(deleteTarget.type)}?
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              This will permanently delete "{deleteTarget.name}" from your saved {getUserDataTypePluralLabel(deleteTarget.type)}. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end mt-5">
              <button
                onClick={() => setDeleteTarget(null)}
                className={`px-4 py-2 rounded ${baseButtonClass}`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteUserData}
                className="px-4 py-2 rounded font-medium bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Overlay backdrop */}
      {!collapsed && (
        <div 
          className="fixed inset-0 bg-black/30 z-40"
          onClick={onToggle}
        />
      )}
      
      <div 
        className={`fixed right-0 top-0 bottom-0 w-[90vw] max-w-[400px] z-50 flex flex-col overflow-hidden transition-transform duration-300 ease-in-out ${
          collapsed ? 'translate-x-full' : 'translate-x-0'
        } ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-white/20' : 'border-gray-200'}`}>
          <h2 className="text-xl font-bold">Community Gallery</h2>
          <button
            onClick={onToggle}
            className={`w-10 h-10 flex items-center justify-center rounded-lg ${baseButtonClass}`}
          >
            ✕
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div ref={conceptsRef} className={`p-3 rounded-lg ${cardClass}`} data-tutorial="gallery-concepts">
            <p className={`text-sm mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              Manage your gallery data here, including presets, templates, and themes.
            </p>
            <ul className={`text-sm space-y-2 list-disc pl-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <li>
                <span className="font-semibold">Presets</span> are pre-made character sheets that can be selected as starting points when creating a new character.
              </li>
              <li>
                <span className="font-semibold">Templates</span> are custom widgets that can be made from any widget and added to any character sheet from the Add Widget menu.
              </li>
              <li>
                <span className="font-semibold">Themes</span> are custom themes used to personalize a character sheet.
              </li>
            </ul>
          </div>

          {/* Share Section */}
          <div ref={manageDataRef} className={`rounded-lg overflow-hidden ${cardClass}`} data-tutorial="gallery-manage-data">
            <button
              onClick={() => setShareExpanded(!shareExpanded)}
              className={`w-full flex items-center justify-between p-3 font-bold ${darkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
            >
              <span>📤 Manage My Data</span>
              <span className="text-lg">{shareExpanded ? '−' : '+'}</span>
            </button>
            
            {shareExpanded && (
              <div className={`p-3 pt-0 space-y-3 border-t ${darkMode ? 'border-white/10' : 'border-gray-100'}`}>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  See, delete, or share your custom-made presets, templates, and themes with the community.
                </p>

                {/* My Presets */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-gray-500">My Presets</h4>
                  {userPresets.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No presets saved yet</p>
                  ) : (
                    <div className="space-y-1">
                      {userPresets.map((preset) => (
                        <div key={preset.id} className={`flex items-center justify-between p-2 rounded ${darkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                          <span className="text-sm truncate flex-1">{preset.name}</span>
                          <div className="flex items-center gap-2 ml-2">
                            <button
                              onClick={() => handleOpenShareModal('preset', preset.id)}
                              className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap"
                            >
                              Share
                            </button>
                            <button
                              onClick={() => handleDeleteUserData('preset', preset.id, preset.name)}
                              className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 whitespace-nowrap"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* My Themes */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-gray-500">My Themes</h4>
                  {customThemes.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No custom themes created yet</p>
                  ) : (
                    <div className="space-y-2">
                      {customThemes.map((theme) => {
                        const textureKey = theme.cardTexture || 'none';
                        const hasImageTexture = isImageTexture(textureKey);
                        const shadowCSS = getShadowStyleCSS(theme.shadowStyle || 'hard', theme.colors.glow || 'transparent');
                        return (
                          <div 
                            key={theme.id} 
                            className="relative overflow-hidden"
                            style={{
                              borderRadius: theme.borderRadius,
                            }}
                          >
                            {/* Background layer with texture */}
                            <div 
                              className="absolute inset-0"
                              style={{
                                backgroundColor: theme.colors.paper,
                                border: `${theme.borderWidth} ${theme.borderStyle || 'solid'} ${theme.colors.border}`,
                                borderRadius: theme.borderRadius,
                                boxShadow: shadowCSS,
                              }}
                            >
                              {hasImageTexture && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    inset: 0,
                                    backgroundColor: theme.colors.paper,
                                  }}
                                >
                                  <div
                                    style={{
                                      position: 'absolute',
                                      inset: 0,
                                      backgroundImage: `url(${IMAGE_TEXTURES[textureKey]})`,
                                      backgroundSize: 'cover',
                                      filter: 'grayscale(100%)',
                                      opacity: theme.textureOpacity ?? 0.15,
                                      mixBlendMode: 'overlay',
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                            {/* Content */}
                            <div className="relative flex items-center justify-between p-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span style={{ color: theme.colors.ink }}>{theme.icon}</span>
                                <span 
                                  className="text-sm truncate"
                                  style={{ color: theme.colors.ink }}
                                >
                                  {theme.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 ml-2">
                                <button
                                  onClick={() => handleOpenShareModal('theme', theme.id)}
                                  className="text-xs px-2 py-1 whitespace-nowrap"
                                  style={{
                                    backgroundColor: theme.colors.accent,
                                    color: theme.colors.paper,
                                    borderRadius: theme.buttonRadius || '4px',
                                  }}
                                >
                                  Share
                                </button>
                                <button
                                  onClick={() => handleDeleteUserData('theme', theme.id, theme.name)}
                                  className="text-xs px-2 py-1 whitespace-nowrap"
                                  style={{
                                    backgroundColor: '#dc2626',
                                    color: '#ffffff',
                                    borderRadius: theme.buttonRadius || '4px',
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                {/* My Templates */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-gray-500">My Templates</h4>
                  {templates.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No templates saved yet</p>
                  ) : (
                    <div className="space-y-1">
                      {templates.map((template) => (
                        <div key={template.id} className={`flex items-center justify-between p-2 rounded ${darkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                          <span className="text-sm truncate flex-1">{template.name}</span>
                          <div className="flex items-center gap-2 ml-2">
                            <button
                              onClick={() => handleOpenShareModal('template', template.id)}
                              className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap"
                            >
                              Share
                            </button>
                            <button
                              onClick={() => handleDeleteUserData('template', template.id, template.name)}
                              className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 whitespace-nowrap"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Browse Section */}
          <div ref={downloadRef} className={`rounded-lg overflow-hidden ${cardClass}`} data-tutorial="gallery-download">
            <button
              onClick={() => setBrowseExpanded(!browseExpanded)}
              className={`w-full flex items-center justify-between p-3 font-bold ${darkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
            >
              <span>📥 Community Gallery</span>
              <span className="text-lg">{browseExpanded ? '−' : '+'}</span>
            </button>
            
            {browseExpanded && (
              <div className={`border-t ${darkMode ? 'border-white/10' : 'border-gray-100'}`}>
                {/* Tabs */}
                <div className={`flex border-b ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
                  {(['presets', 'themes', 'templates'] as TabType[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2 text-sm font-medium capitalize ${
                        activeTab === tab
                          ? darkMode ? 'border-b-2 border-white text-white' : 'border-b-2 border-blue-600 text-blue-600'
                          : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                
                {/* Tab Content */}
                <div className="p-3">
                  {loading && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2" />
                      <p>Loading gallery...</p>
                    </div>
                  )}
                  
                  {error && !manifest && (
                    <div className="text-center py-8">
                      <p className="text-red-500 mb-2">{error}</p>
                      <button
                        onClick={refresh}
                        className={`px-3 py-1 rounded ${baseButtonClass}`}
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  
                  {manifest && !loading && (
                    <>
                      {/* Refresh button */}
                      <div className="flex justify-end mb-2">
                        <button
                          onClick={refresh}
                          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                        >
                          ↻ Refresh
                        </button>
                      </div>
                      
                      {/* Presets Tab */}
                      {activeTab === 'presets' && (
                        <div className="space-y-2">
                          {manifest.presets.length === 0 ? (
                            <p className="text-sm text-gray-400 italic text-center py-4">No presets available yet</p>
                          ) : (
                            manifest.presets.map((item) => (
                              <div key={item.id} className={`p-3 rounded ${darkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-medium truncate">{item.name}</h5>
                                    <p className="text-xs text-gray-500">by {item.author}</p>
                                    {item.description && (
                                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleDownloadPreset(item)}
                                    disabled={downloadingId === item.id}
                                    className={`ml-2 px-3 py-1 rounded text-sm whitespace-nowrap ${
                                      downloadSuccess === item.id
                                        ? 'bg-green-600 text-white'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                  >
                                    {downloadingId === item.id ? '...' : downloadSuccess === item.id ? '✓' : 'Download'}
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                      
                      {/* Themes Tab */}
                      {activeTab === 'themes' && (
                        <div className="space-y-2">
                          {manifest.themes.length === 0 ? (
                            <p className="text-sm text-gray-400 italic text-center py-4">No themes available yet</p>
                          ) : (
                            manifest.themes.map((item) => {
                              // Use fetched theme data for full preview
                              const theme = themeData[item.id];
                              const hasThemeData = !!theme;
                              const textureKey = theme?.cardTexture || 'none';
                              const hasTexture = hasThemeData && textureKey !== 'none' && isImageTexture(textureKey);
                              const shadowCSS = hasThemeData 
                                ? getShadowStyleCSS(theme.shadowStyle || 'hard', theme.colors?.glow || 'transparent')
                                : undefined;
                              
                              if (!hasThemeData) {
                                // Fallback while theme data is loading
                                return (
                                  <div 
                                    key={item.id} 
                                    className={`p-3 rounded ${darkMode ? 'bg-white/5 border border-white/10' : 'bg-gray-100 border border-gray-200'}`}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1 min-w-0">
                                        <h5 className="font-medium truncate">{item.name}</h5>
                                        <p className="text-xs text-gray-500">by {item.author}</p>
                                        {item.description && (
                                          <p className="text-sm text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => handleDownloadTheme(item)}
                                        disabled={downloadingId === item.id}
                                        className={`ml-2 px-3 py-1 rounded text-sm whitespace-nowrap ${
                                          downloadSuccess === item.id
                                            ? 'bg-green-600 text-white'
                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                      >
                                        {downloadingId === item.id ? '...' : downloadSuccess === item.id ? '✓' : 'Download'}
                                      </button>
                                    </div>
                                  </div>
                                );
                              }
                              
                              // Theme card with full theme styling
                              return (
                                <div 
                                  key={item.id} 
                                  className="relative overflow-hidden"
                                  style={{
                                    borderRadius: theme.borderRadius || '8px',
                                  }}
                                >
                                  {/* Background layer with texture */}
                                  <div 
                                    className="absolute inset-0"
                                    style={{
                                      backgroundColor: theme.colors.paper,
                                      border: `${theme.borderWidth || '2px'} ${theme.borderStyle || 'solid'} ${theme.colors.border}`,
                                      borderRadius: theme.borderRadius || '8px',
                                      boxShadow: shadowCSS,
                                    }}
                                  >
                                    {hasTexture && (
                                      <div
                                        style={{
                                          position: 'absolute',
                                          inset: 0,
                                          backgroundColor: theme.colors.paper,
                                        }}
                                      >
                                        <div
                                          style={{
                                            position: 'absolute',
                                            inset: 0,
                                            backgroundImage: `url(${IMAGE_TEXTURES[textureKey]})`,
                                            backgroundSize: 'cover',
                                            filter: 'grayscale(100%)',
                                            opacity: theme.textureOpacity ?? 0.15,
                                            mixBlendMode: 'overlay',
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                  {/* Content */}
                                  <div className="relative p-3">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1 min-w-0">
                                        <h5 
                                          className="font-medium truncate"
                                          style={{ color: theme.colors.ink, fontFamily: theme.fonts?.heading }}
                                        >
                                          {theme.icon} {item.name}
                                        </h5>
                                        <p 
                                          className="text-xs"
                                          style={{ color: theme.colors.muted || theme.colors.ink, fontFamily: theme.fonts?.body }}
                                        >
                                          by {item.author}
                                        </p>
                                        {item.description && (
                                          <p 
                                            className="text-sm mt-1 line-clamp-2"
                                            style={{ color: theme.colors.ink, opacity: 0.7, fontFamily: theme.fonts?.body }}
                                          >
                                            {item.description}
                                          </p>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => handleDownloadTheme(item)}
                                        disabled={downloadingId === item.id}
                                        className="ml-2 px-3 py-1 text-sm whitespace-nowrap"
                                        style={downloadSuccess === item.id ? {
                                          backgroundColor: '#16a34a',
                                          color: 'white',
                                          borderRadius: theme.buttonRadius || '4px',
                                        } : {
                                          backgroundColor: theme.colors.accent,
                                          color: theme.colors.paper,
                                          borderRadius: theme.buttonRadius || '4px',
                                        }}
                                      >
                                        {downloadingId === item.id ? '...' : downloadSuccess === item.id ? '✓' : 'Download'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                      
                      {/* Templates Tab */}
                      {activeTab === 'templates' && (
                        <div className="space-y-2">
                          {manifest.templates.length === 0 ? (
                            <p className="text-sm text-gray-400 italic text-center py-4">No templates available yet</p>
                          ) : (
                            manifest.templates.map((item) => (
                              <div key={item.id} className={`p-3 rounded ${darkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-medium truncate">{item.name}</h5>
                                    <p className="text-xs text-gray-500">by {item.author}</p>
                                    {item.description && (
                                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleDownloadTemplate(item)}
                                    disabled={downloadingId === item.id}
                                    className={`ml-2 px-3 py-1 rounded text-sm whitespace-nowrap ${
                                      downloadSuccess === item.id
                                        ? 'bg-green-600 text-white'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                  >
                                    {downloadingId === item.id ? '...' : downloadSuccess === item.id ? '✓' : 'Download'}
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
