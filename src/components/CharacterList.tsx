import { useState } from 'react';
import { useStore } from '../store/useStore';
import { THEMES, getShadowStyleCSS, getTextureCSS } from '../store/useThemeStore';
import { getCustomTheme, useCustomThemeStore } from '../store/useCustomThemeStore';

// Helper to get theme colors for a character
function getThemeStyles(themeId?: string) {
  // First check if it's a custom theme
  const customTheme = themeId ? getCustomTheme(themeId) : undefined;
  if (customTheme) {
    const shadowCSS = getShadowStyleCSS(customTheme.shadowStyle || 'hard', customTheme.colors.glow || 'transparent');
    const textureCSS = getTextureCSS(customTheme.cardTexture || 'none');
    return {
      '--card-background': customTheme.colors.paper,
      '--card-ink': customTheme.colors.ink,
      '--card-border': customTheme.colors.border,
      '--card-shadow': customTheme.colors.shadow,
      '--card-muted': customTheme.colors.muted,
      '--card-accent': customTheme.colors.accent,
      '--card-glow': customTheme.colors.glow || 'transparent',
      '--card-radius': customTheme.borderRadius,
      '--card-border-width': customTheme.borderWidth,
      '--card-border-style': customTheme.borderStyle || 'solid',
      '--card-shadow-style': shadowCSS,
      '--card-texture': textureCSS,
      fontFamily: customTheme.fonts.body,
    } as React.CSSProperties;
  }
  
  // Otherwise use built-in theme
  const theme = THEMES.find(t => t.id === (themeId || 'default')) || THEMES[0];
  return {
    '--card-background': theme.colors.paper,
    '--card-ink': theme.colors.ink,
    '--card-border': theme.colors.border,
    '--card-shadow': theme.colors.shadow,
    '--card-muted': theme.colors.muted,
    '--card-accent': theme.colors.accent,
    '--card-glow': theme.colors.glow,
    '--card-radius': theme.borderRadius,
    '--card-border-width': theme.borderWidth,
    '--card-border-style': theme.borderStyle,
    '--card-shadow-style': theme.shadowStyle,
    '--card-texture': theme.cardTexture,
    fontFamily: theme.fonts.body,
  } as React.CSSProperties;
}

export default function CharacterList() {
  // Subscribe to custom theme changes so cards update when themes are edited
  useCustomThemeStore((state) => state.customThemes);
  
  const characters = useStore((state) => state.characters);
  const createCharacter = useStore((state) => state.createCharacter);
  const selectCharacter = useStore((state) => state.selectCharacter);
  const deleteCharacter = useStore((state) => state.deleteCharacter);
  
  const [newName, setNewName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      createCharacter(newName);
      setNewName('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 h-full overflow-auto">
      <h1 className="text-2xl sm:text-4xl font-bold mb-4 sm:mb-8 border-b-[length:var(--border-width)] border-theme-border pb-2 sm:pb-4 uppercase tracking-wider text-theme-ink font-heading">
        Character Select
      </h1>

      <form onSubmit={handleCreate} className="mb-6 sm:mb-12 flex flex-col sm:flex-row gap-2 sm:gap-4">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New Character Name"
          className="flex-1 p-3 sm:p-4 text-base border-[length:var(--border-width)] border-theme-border shadow-theme focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none transition-all bg-theme-paper text-theme-ink rounded-theme font-body"
        />
        <button 
          type="submit"
          className="bg-theme-accent text-theme-paper px-6 sm:px-8 py-3 sm:py-4 font-bold hover:bg-theme-accent-hover transition-colors shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-theme font-heading"
        >
          CREATE
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pb-4">
        {characters.map((char) => {
          const cardStyles = getThemeStyles(char.theme);
          return (
            <div 
              key={char.id}
              style={cardStyles}
              className="p-4 sm:p-6 active:translate-x-[2px] active:translate-y-[2px] sm:hover:-translate-y-1 transition-transform cursor-pointer relative group"
              onClick={() => selectCharacter(char.id)}
            >
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundColor: 'var(--card-background)',
                  backgroundImage: 'var(--card-texture)',
                  borderRadius: 'var(--card-radius)',
                  border: 'var(--card-border-width) var(--card-border-style) var(--card-border)',
                  boxShadow: 'var(--card-shadow-style)',
                }}
              />
              <div className="relative">
                <h2 
                  className="text-xl sm:text-2xl font-bold mb-2 pr-12"
                  style={{ color: 'var(--card-ink)' }}
                >{char.name}</h2>
                <p 
                  className="text-sm sm:text-base mb-2 sm:mb-4"
                  style={{ color: 'var(--card-muted)' }}
                >{char.widgets.length} Widgets</p>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if(confirm('Delete character?')) deleteCharacter(char.id);
                  }}
                  className="absolute top-0 right-0 w-10 h-10 sm:w-auto sm:h-auto sm:opacity-0 sm:group-hover:opacity-100 text-red-500 font-bold hover:text-red-700 flex items-center justify-center"
                >
                  DEL
                </button>
              </div>
            </div>
          );
        })}
        
        {characters.length === 0 && (
          <div className="col-span-full text-center py-8 sm:py-12 text-theme-muted border-[length:var(--border-width)] border-dashed border-theme-border/50 text-sm sm:text-base rounded-theme font-body">
            No characters found. Create one to begin.
          </div>
        )}
      </div>
    </div>
  );
}
