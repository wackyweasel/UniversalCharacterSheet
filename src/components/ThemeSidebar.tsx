import { useState } from 'react';
import { THEMES, applyTheme, applyCustomTheme, isImageTexture, IMAGE_TEXTURES, getBuiltInTheme } from '../store/useThemeStore';
import { useStore } from '../store/useStore';
import { useCustomThemeStore, CustomTheme, getCustomTheme } from '../store/useCustomThemeStore';
import CustomThemeEditor from './CustomThemeEditor';

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

  const [showEditor, setShowEditor] = useState(false);
  const [editingTheme, setEditingTheme] = useState<CustomTheme | undefined>(undefined);

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
    }
  };

  const handleCreateCustom = () => {
    setEditingTheme(undefined);
    setShowEditor(true);
  };

  const handleEditCustom = (theme: CustomTheme, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTheme(theme);
    setShowEditor(true);
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
      // If this theme is currently active, re-apply it
      if (currentTheme === theme.id) {
        applyCustomTheme(theme);
      }
    } else {
      addCustomTheme(theme);
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
        <button
          onClick={onToggle}
          className="absolute top-3 right-3 w-10 h-10 bg-theme-accent text-theme-paper font-bold flex items-center justify-center rounded-button z-20 shadow-theme"
        >
          ✕
        </button>
        
        {/* Sidebar content */}
        <div className="relative z-10 flex flex-col h-full overflow-y-auto touch-pan-y pt-12">

        <div className="mb-4">
          <h2 className="text-xl font-bold uppercase tracking-wider border-b-[length:var(--border-width)] border-theme-border pb-2 text-theme-ink font-heading">
            🎨 Themes
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
                    <div 
                      className="w-3 h-3 rounded-full border border-black/20"
                      style={{ backgroundColor: theme.colors.paper }}
                      title="Paper"
                    />
                    <div 
                      className="w-3 h-3 rounded-full border border-black/20"
                      style={{ backgroundColor: theme.colors.ink }}
                      title="Ink"
                    />
                    <div 
                      className="w-3 h-3 rounded-full border border-black/20"
                      style={{ backgroundColor: theme.colors.accent }}
                      title="Accent"
                    />
                    <div 
                      className="w-3 h-3 rounded-full border border-black/20"
                      style={{ backgroundColor: theme.colors.background }}
                      title="Background"
                    />
                  </div>
                </button>
                {/* Edit button */}
                <button
                  onClick={(e) => handleEditPreset(theme, e)}
                  style={{
                    backgroundColor: isSelected ? `${theme.colors.paper}33` : `${theme.colors.accent}1a`,
                    color: isSelected ? theme.colors.paper : theme.colors.accent,
                  }}
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded text-xs hover:scale-110 transition-transform z-10"
                  title="Copy to custom theme"
                >
                  ✏️
                </button>
              </div>
            );
          })}
        </div>

        {/* Custom Themes Section */}
        <div className="mt-6 pt-4 border-t border-theme-border/50">
          <h3 className="text-sm font-bold text-theme-ink mb-3 uppercase tracking-wider font-heading">
            ✨ Custom Themes
          </h3>
          
          {/* Create New Custom Theme Button */}
          <button
            onClick={handleCreateCustom}
            className="w-full p-2 border-[length:var(--border-width)] border-dashed border-theme-border transition-all text-left font-bold bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper hover:border-solid mb-2"
            style={{ borderRadius: 'min(var(--button-radius), 16px)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">➕</span>
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
                    <div className="flex items-center gap-2 pr-8">
                      <span className="text-base">{theme.icon}</span>
                      <span className="text-xs" style={{ fontFamily: theme.fonts.heading }}>{theme.name}</span>
                    </div>
                    <p className="text-[10px] mt-1 opacity-70">
                      {theme.description}
                    </p>
                    {/* Color preview dots */}
                    <div className="flex gap-1 mt-2">
                      <div 
                        className="w-3 h-3 rounded-full border border-black/20"
                        style={{ backgroundColor: theme.colors.paper }}
                        title="Paper"
                      />
                      <div 
                        className="w-3 h-3 rounded-full border border-black/20"
                        style={{ backgroundColor: theme.colors.ink }}
                        title="Ink"
                      />
                      <div 
                        className="w-3 h-3 rounded-full border border-black/20"
                        style={{ backgroundColor: theme.colors.accent }}
                        title="Accent"
                      />
                      <div 
                        className="w-3 h-3 rounded-full border border-black/20"
                        style={{ backgroundColor: theme.colors.background }}
                        title="Background"
                      />
                    </div>
                  </button>
                  {/* Edit button */}
                  <button
                    onClick={(e) => handleEditCustom(theme, e)}
                    style={{
                      backgroundColor: isSelected ? `${theme.colors.paper}33` : `${theme.colors.accent}1a`,
                      color: isSelected ? theme.colors.paper : theme.colors.accent,
                    }}
                    className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded text-xs hover:scale-110 transition-transform z-10"
                  title="Edit theme"
                >
                  ✏️
                </button>
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

