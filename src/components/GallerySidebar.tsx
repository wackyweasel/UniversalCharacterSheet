import { useState } from 'react';
import { useUserPresetStore } from '../store/useUserPresetStore';
import { useCustomThemeStore } from '../store/useCustomThemeStore';
import { useTemplateStore } from '../store/useTemplateStore';
import { useGallery, submitToGallery, GalleryPreset, GalleryTheme, GalleryTemplate } from '../hooks/useGallery';
import { IMAGE_TEXTURES, isImageTexture, getShadowStyleCSS } from '../store/useThemeStore';
import { v4 as uuidv4 } from 'uuid';

interface GallerySidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  darkMode: boolean;
}

type TabType = 'presets' | 'themes' | 'templates';

export default function GallerySidebar({ collapsed, onToggle, darkMode }: GallerySidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>('presets');
  const [shareExpanded, setShareExpanded] = useState(false);
  const [browseExpanded, setBrowseExpanded] = useState(true);
  
  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareType, setShareType] = useState<'preset' | 'theme' | 'template'>('preset');
  const [shareItemId, setShareItemId] = useState<string>('');
  const [shareName, setShareName] = useState('');
  const [shareAuthor, setShareAuthor] = useState('');
  const [shareDescription, setShareDescription] = useState('');
  const [shareSubmitting, setShareSubmitting] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  
  // Download feedback
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  
  // User data stores
  const userPresets = useUserPresetStore((state) => state.userPresets);
  const addUserPreset = useUserPresetStore((state) => state.addPreset);
  const customThemes = useCustomThemeStore((state) => state.customThemes);
  const addCustomTheme = useCustomThemeStore((state) => state.addCustomTheme);
  const templates = useTemplateStore((state) => state.templates);
  
  // Gallery data
  const { manifest, themeData, loading, error, refresh, downloadPreset, downloadTheme, downloadTemplate } = useGallery();
  
  const handleOpenShareModal = (type: 'preset' | 'theme' | 'template', id: string) => {
    setShareType(type);
    setShareItemId(id);
    
    // Get the current name of the item
    let currentName = '';
    if (type === 'preset') {
      const preset = userPresets.find(p => p.id === id);
      currentName = preset?.name || '';
    } else if (type === 'theme') {
      const theme = customThemes.find(t => t.id === id);
      currentName = theme?.name || '';
    } else {
      const template = templates.find(t => t.id === id);
      currentName = template?.name || '';
    }
    
    setShareName(currentName);
    setShareAuthor('');
    setShareDescription('');
    setShareSuccess(false);
    setShowShareModal(true);
  };
  
  const handleSubmitShare = async () => {
    if (!shareAuthor.trim() || !shareName.trim()) return;
    
    setShareSubmitting(true);
    
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
      const success = await submitToGallery(sheet, shareName.trim(), shareAuthor.trim(), shareDescription.trim(), data);
      if (success) {
        setShareSuccess(true);
      }
    }
    
    setShareSubmitting(false);
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
      {/* Share Modal */}
      {showShareModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-[60]" 
            onClick={() => setShowShareModal(false)}
          />
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] p-6 rounded-lg shadow-xl w-[90vw] max-w-[400px] ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
            {shareSuccess ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-2">✓</div>
                <p className="text-lg font-bold">Submitted!</p>
                <p className={`text-sm mt-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Thank you for sharing with the community.</p>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Your submission will appear in the gallery once it has been reviewed and approved.</p>
                <button
                  onClick={() => {
                    setShowShareModal(false);
                    setShareSuccess(false);
                  }}
                  className="mt-4 px-6 py-2 rounded font-medium bg-blue-600 text-white hover:bg-blue-700"
                >
                  Ok
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold mb-4">Share to Gallery</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={shareName}
                    onChange={(e) => setShareName(e.target.value)}
                    placeholder="Enter a name for your submission"
                    className={`w-full px-3 py-2 rounded border ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}
                    autoFocus
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Your Name / Handle</label>
                  <input
                    type="text"
                    value={shareAuthor}
                    onChange={(e) => setShareAuthor(e.target.value)}
                    placeholder="e.g. @username"
                    className={`w-full px-3 py-2 rounded border ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={shareDescription}
                    onChange={(e) => setShareDescription(e.target.value)}
                    placeholder="Briefly describe what this is and what it's for..."
                    rows={3}
                    className={`w-full px-3 py-2 rounded border resize-none ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowShareModal(false)}
                    className={`px-4 py-2 rounded ${baseButtonClass}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitShare}
                    disabled={!shareName.trim() || !shareAuthor.trim() || !shareDescription.trim() || shareSubmitting}
                    className={`px-4 py-2 rounded font-medium ${
                      shareName.trim() && shareAuthor.trim() && shareDescription.trim() && !shareSubmitting
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    }`}
                  >
                    {shareSubmitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </>
            )}
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
          {/* Share Section */}
          <div className={`rounded-lg overflow-hidden ${cardClass}`}>
            <button
              onClick={() => setShareExpanded(!shareExpanded)}
              className={`w-full flex items-center justify-between p-3 font-bold ${darkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
            >
              <span>📤 Share with Community</span>
              <span className="text-lg">{shareExpanded ? '−' : '+'}</span>
            </button>
            
            {shareExpanded && (
              <div className={`p-3 pt-0 space-y-3 border-t ${darkMode ? 'border-white/10' : 'border-gray-100'}`}>
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
                          <button
                            onClick={() => handleOpenShareModal('preset', preset.id)}
                            className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap ml-2"
                          >
                            Share
                          </button>
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
                              <button
                                onClick={() => handleOpenShareModal('theme', theme.id)}
                                className="text-xs px-2 py-1 whitespace-nowrap ml-2"
                                style={{
                                  backgroundColor: theme.colors.accent,
                                  color: theme.colors.paper,
                                  borderRadius: theme.buttonRadius || '4px',
                                }}
                              >
                                Share
                              </button>
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
                          <button
                            onClick={() => handleOpenShareModal('template', template.id)}
                            className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap ml-2"
                          >
                            Share
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Browse Section */}
          <div className={`rounded-lg overflow-hidden ${cardClass}`}>
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
