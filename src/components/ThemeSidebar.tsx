import { useState } from 'react';
import { THEMES, applyTheme, applyCustomTheme } from '../store/useThemeStore';
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

  const handleSaveTheme = (theme: CustomTheme) => {
    if (editingTheme) {
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
          onDelete={editingTheme ? handleDeleteTheme : undefined}
        />
      )}

      {/* Mobile overlay backdrop */}
      {!collapsed && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={onToggle}
        />
      )}
      
      <div 
        className={`fixed right-0 top-0 bottom-0 w-[80vw] max-w-[280px] md:w-64 bg-theme-paper border-l-[length:var(--border-width)] border-theme-border z-50 flex flex-col p-3 sm:p-4 shadow-theme overflow-y-auto transition-transform duration-300 ease-in-out safe-area-bottom ${
          collapsed ? 'translate-x-full' : 'translate-x-0'
        }`}
      >
        {/* Toggle button - positioned on the edge of sidebar (hidden on mobile) */}
        <button
          onClick={onToggle}
          className="hidden md:flex absolute -left-10 top-20 w-10 h-10 bg-theme-paper border-[length:var(--border-width)] border-theme-border border-r-0 font-bold shadow-theme hover:bg-theme-accent hover:text-theme-paper transition-all items-center justify-center text-theme-ink"
          title={collapsed ? 'Show Themes' : 'Hide Themes'}
        >
          {collapsed ? '◀' : '▶'}
        </button>

        {/* Mobile close button */}
        <button
          onClick={onToggle}
          className="md:hidden absolute top-3 right-3 w-8 h-8 bg-theme-accent text-theme-paper font-bold flex items-center justify-center rounded-theme"
        >
          ✕
        </button>

        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wider border-b-[length:var(--border-width)] border-theme-border pb-2 text-theme-ink font-heading">
            🎨 Themes
          </h2>
        </div>

        {/* Built-in Themes */}
        <div className="flex flex-col gap-2 sm:gap-3">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleSelectTheme(theme.id)}
              style={{
                backgroundColor: currentTheme === theme.id ? theme.colors.accent : theme.colors.paper,
                color: currentTheme === theme.id ? theme.colors.paper : theme.colors.ink,
                borderColor: theme.colors.border,
                borderRadius: theme.borderRadius,
                borderWidth: theme.borderWidth,
                fontFamily: theme.fonts.body,
                boxShadow: `3px 3px 0 ${theme.colors.shadow}`,
              }}
              className="p-2 sm:p-3 border-solid transition-all text-left font-bold active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg">{theme.icon}</span>
                <span className="text-xs sm:text-sm" style={{ fontFamily: theme.fonts.heading }}>{theme.name}</span>
              </div>
              <p className="text-[10px] sm:text-xs mt-1 opacity-70">
                {theme.description}
              </p>
              {/* Color preview dots */}
              <div className="flex gap-1 mt-2">
                <div 
                  className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-black/20"
                  style={{ backgroundColor: theme.colors.paper }}
                  title="Paper"
                />
                <div 
                  className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-black/20"
                  style={{ backgroundColor: theme.colors.ink }}
                  title="Ink"
                />
                <div 
                  className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-black/20"
                  style={{ backgroundColor: theme.colors.accent }}
                  title="Accent"
                />
                <div 
                  className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-black/20"
                  style={{ backgroundColor: theme.colors.background }}
                  title="Background"
                />
              </div>
            </button>
          ))}
        </div>

        {/* Custom Themes Section */}
        <div className="mt-6 pt-4 border-t border-theme-border/50">
          <h3 className="text-sm font-bold text-theme-ink mb-3 uppercase tracking-wider font-heading">
            ✨ Custom Themes
          </h3>
          
          {/* Create New Custom Theme Button */}
          <button
            onClick={handleCreateCustom}
            className="w-full p-2 sm:p-3 border-[length:var(--border-width)] border-dashed border-theme-border transition-all text-left font-bold rounded-theme bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper hover:border-solid mb-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg">➕</span>
              <span className="text-xs sm:text-sm font-heading">Create Custom Theme</span>
            </div>
            <p className="text-[10px] sm:text-xs mt-1 opacity-70 font-body">
              Design your own unique theme
            </p>
          </button>

          {/* List of Custom Themes */}
          <div className="flex flex-col gap-2 sm:gap-3 mt-3">
            {customThemes.map((theme) => (
              <div
                key={theme.id}
                style={{
                  backgroundColor: currentTheme === theme.id ? theme.colors.accent : theme.colors.paper,
                  color: currentTheme === theme.id ? theme.colors.paper : theme.colors.ink,
                  borderColor: theme.colors.border,
                  borderRadius: theme.borderRadius,
                  borderWidth: theme.borderWidth,
                  fontFamily: theme.fonts.body,
                  boxShadow: `3px 3px 0 ${theme.colors.shadow}`,
                }}
                className="p-2 sm:p-3 border-solid transition-all text-left font-bold relative"
              >
                <button
                  onClick={() => handleSelectTheme(theme.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-2 pr-8">
                    <span className="text-base sm:text-lg">{theme.icon}</span>
                    <span className="text-xs sm:text-sm" style={{ fontFamily: theme.fonts.heading }}>{theme.name}</span>
                  </div>
                  <p className="text-[10px] sm:text-xs mt-1 opacity-70">
                    {theme.description}
                  </p>
                  {/* Color preview dots */}
                  <div className="flex gap-1 mt-2">
                    <div 
                      className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-black/20"
                      style={{ backgroundColor: theme.colors.paper }}
                      title="Paper"
                    />
                    <div 
                      className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-black/20"
                      style={{ backgroundColor: theme.colors.ink }}
                      title="Ink"
                    />
                    <div 
                      className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-black/20"
                      style={{ backgroundColor: theme.colors.accent }}
                      title="Accent"
                    />
                    <div 
                      className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-black/20"
                      style={{ backgroundColor: theme.colors.background }}
                      title="Background"
                    />
                  </div>
                </button>
                {/* Edit button */}
                <button
                  onClick={(e) => handleEditCustom(theme, e)}
                  style={{
                    backgroundColor: currentTheme === theme.id ? `${theme.colors.paper}33` : `${theme.colors.accent}1a`,
                    color: currentTheme === theme.id ? theme.colors.paper : theme.colors.accent,
                  }}
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded text-xs hover:scale-110 transition-transform"
                  title="Edit theme"
                >
                  ✏️
                </button>
              </div>
            ))}
          </div>

          {customThemes.length === 0 && (
            <p className="text-[10px] sm:text-xs text-theme-muted mt-2 font-body">
              No custom themes yet. Create one above!
            </p>
          )}
        </div>

        <div className="mt-auto pt-4 text-[10px] sm:text-xs text-theme-muted border-t border-theme-border/50 font-body">
          <p>Select a theme to change the appearance of your character sheet.</p>
          <p className="mt-2 text-theme-ink font-bold">Current: {getCurrentThemeName()}</p>
        </div>
      </div>
    </>
  );
}
