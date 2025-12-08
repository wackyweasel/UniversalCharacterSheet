import { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { THEMES, getShadowStyleCSS, getTextureCSS, isImageTexture, IMAGE_TEXTURES } from '../store/useThemeStore';
import { getCustomTheme, useCustomThemeStore } from '../store/useCustomThemeStore';
import { Character } from '../types';

// Helper to get theme colors for a character
function getThemeStyles(themeId?: string) {
  // First check if it's a custom theme
  const customTheme = themeId ? getCustomTheme(themeId) : undefined;
  if (customTheme) {
    const shadowCSS = getShadowStyleCSS(customTheme.shadowStyle || 'hard', customTheme.colors.glow || 'transparent');
    const textureKey = customTheme.cardTexture || 'none';
    const textureCSS = isImageTexture(textureKey) ? 'none' : getTextureCSS(textureKey, customTheme.textureColor, customTheme.textureOpacity);
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
      '--card-texture-key': textureKey,
      '--card-texture-color': customTheme.textureColor || '#ffffff',
      '--card-texture-opacity': String(customTheme.textureOpacity ?? 0.15),
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
    '--card-texture-key': 'none',
    '--card-texture-color': '#ffffff',
    '--card-texture-opacity': '0.15',
    fontFamily: theme.fonts.body,
  } as React.CSSProperties;
}

export default function CharacterList() {
  // Subscribe to custom theme changes so cards update when themes are edited
  useCustomThemeStore((state) => state.customThemes);
  
  const characters = useStore((state) => state.characters);
  const createCharacter = useStore((state) => state.createCharacter);
  const importCharacter = useStore((state) => state.importCharacter);
  const selectCharacter = useStore((state) => state.selectCharacter);
  const deleteCharacter = useStore((state) => state.deleteCharacter);
  
  const [newName, setNewName] = useState('');
  const [characterToDelete, setCharacterToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      createCharacter(newName);
      setNewName('');
    }
  };

  const handleExport = (char: Character) => {
    const dataStr = JSON.stringify(char, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${char.name.replace(/[^a-z0-9]/gi, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const character = JSON.parse(event.target?.result as string) as Character;
        // Basic validation
        if (!character.name || !character.sheets || !Array.isArray(character.sheets)) {
          alert('Invalid character file format');
          return;
        }
        importCharacter(character);
      } catch (err) {
        alert('Failed to parse character file');
        console.error(err);
      }
    };
    reader.readAsText(file);
    
    // Reset file input so the same file can be imported again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
        <label className="bg-theme-paper text-theme-ink px-6 sm:px-8 py-3 sm:py-4 font-bold hover:bg-theme-accent hover:text-theme-paper transition-colors shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-theme font-heading cursor-pointer border-[length:var(--border-width)] border-theme-border text-center">
          IMPORT
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </label>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pb-4">
        {characters.map((char) => {
          const cardStyles = getThemeStyles(char.theme);
          const customTheme = char.theme ? getCustomTheme(char.theme) : undefined;
          const textureKey = customTheme?.cardTexture || 'none';
          const hasImageTexture = isImageTexture(textureKey);
          return (
            <div 
              key={char.id}
              style={cardStyles}
              className="p-4 sm:p-6 active:translate-x-[2px] active:translate-y-[2px] sm:hover:-translate-y-1 transition-transform cursor-pointer relative group"
              onClick={() => selectCharacter(char.id)}
            >
              <div 
                className="absolute inset-0 pointer-events-none overflow-hidden"
                style={{
                  backgroundColor: 'var(--card-background)',
                  backgroundImage: hasImageTexture ? 'none' : 'var(--card-texture)',
                  borderRadius: 'var(--card-radius)',
                  border: 'var(--card-border-width) var(--card-border-style) var(--card-border)',
                  boxShadow: 'var(--card-shadow-style)',
                }}
              >
                {/* Image texture overlay - grayscale texture tinted with card color */}
                {hasImageTexture && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'var(--card-background)',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${IMAGE_TEXTURES[textureKey]})`,
                        backgroundSize: 'cover',
                        filter: 'grayscale(100%)',
                        opacity: 'var(--card-texture-opacity)',
                        mixBlendMode: 'overlay',
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="relative">
                <h2 
                  className="text-xl sm:text-2xl font-bold mb-2 pr-12"
                  style={{ color: 'var(--card-ink)' }}
                >{char.name}</h2>
                <p 
                  className="text-sm sm:text-base mb-2 sm:mb-4"
                  style={{ color: 'var(--card-muted)' }}
                >{char.sheets.reduce((sum, s) => sum + s.widgets.length, 0)} Widgets • {char.sheets.length} Sheet{char.sheets.length !== 1 ? 's' : ''}</p>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExport(char);
                  }}
                  className="absolute top-0 right-0 px-2 py-1 sm:opacity-0 sm:group-hover:opacity-100 font-bold flex items-center justify-center z-10 text-sm rounded transition-colors"
                  style={{ 
                    color: 'var(--card-accent)',
                    border: '1px solid var(--card-border)',
                    backgroundColor: 'var(--card-background)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--card-accent)';
                    e.currentTarget.style.color = 'var(--card-background)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--card-background)';
                    e.currentTarget.style.color = 'var(--card-accent)';
                  }}
                  title="Export character"
                >
                  Export
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCharacterToDelete(char.id);
                  }}
                  className="absolute bottom-0 right-0 px-2 py-1 sm:opacity-0 sm:group-hover:opacity-100 font-bold flex items-center justify-center z-10 text-sm rounded transition-colors"
                  style={{ 
                    color: 'var(--card-accent)',
                    border: '1px solid var(--card-border)',
                    backgroundColor: 'var(--card-background)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--card-accent)';
                    e.currentTarget.style.color = 'var(--card-background)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--card-background)';
                    e.currentTarget.style.color = 'var(--card-accent)';
                  }}
                  title="Delete character"
                >
                  Delete
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
      
      {/* Delete Confirmation Modal */}
      {characterToDelete && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50" 
            onClick={() => setCharacterToDelete(null)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme p-4 z-50 min-w-[250px]">
            <h3 className="font-heading text-theme-ink font-bold mb-2">Delete Character?</h3>
            <p className="text-sm text-theme-muted font-body mb-4">
              Are you sure you want to delete "{characters.find(c => c.id === characterToDelete)?.name}"? This will delete all sheets and widgets.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setCharacterToDelete(null)}
                className="px-3 py-1.5 text-sm font-body text-theme-ink hover:bg-theme-accent/20 rounded-theme transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteCharacter(characterToDelete);
                  setCharacterToDelete(null);
                }}
                className="px-3 py-1.5 text-sm font-body bg-red-500 text-white hover:bg-red-600 rounded-theme transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
