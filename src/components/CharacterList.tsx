import { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { THEMES, getShadowStyleCSS, getTextureCSS, isImageTexture, IMAGE_TEXTURES } from '../store/useThemeStore';
import { getCustomTheme, useCustomThemeStore } from '../store/useCustomThemeStore';
import { Character } from '../types';
import { getPresetNames, getPreset } from '../presets';

// Backup data structure
interface BackupData {
  version: 1;
  timestamp: string;
  characters: Character[];
  customThemes: Record<string, any>;
}

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
  const customThemes = useCustomThemeStore((state) => state.customThemes);
  
  const characters = useStore((state) => state.characters);
  const createCharacter = useStore((state) => state.createCharacter);
  const createCharacterFromPreset = useStore((state) => state.createCharacterFromPreset);
  const updateCharacterTheme = useStore((state) => state.updateCharacterTheme);
  const importCharacter = useStore((state) => state.importCharacter);
  const selectCharacter = useStore((state) => state.selectCharacter);
  const deleteCharacter = useStore((state) => state.deleteCharacter);
  
  const [characterToDelete, setCharacterToDelete] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [selectedTheme, setSelectedTheme] = useState<string>('default');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  
  const presetNames = getPresetNames();

  const handleCreateCharacter = () => {
    const name = newCharName.trim() || 'New Character';
    
    if (selectedPreset && selectedPreset !== '') {
      // Create from preset
      const preset = getPreset(selectedPreset);
      if (preset) {
        createCharacterFromPreset(preset, name);
        // Get the newly created character and update its theme
        // Since the preset might have its own theme, we override it with the selected one
        const state = useStore.getState();
        const newChar = state.characters[state.characters.length - 1];
        if (newChar && selectedTheme !== 'default') {
          updateCharacterTheme(newChar.id, selectedTheme);
        }
      }
    } else {
      // Create blank character
      createCharacter(name);
      // Update theme if not default
      const state = useStore.getState();
      const newChar = state.characters[state.characters.length - 1];
      if (newChar && selectedTheme !== 'default') {
        updateCharacterTheme(newChar.id, selectedTheme);
      }
    }
    
    // Reset form
    setNewCharName('');
    setSelectedPreset('');
    setSelectedTheme('default');
    setShowCreateModal(false);
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

  const handleBackup = () => {
    const backupData: BackupData = {
      version: 1,
      timestamp: new Date().toISOString(),
      characters: characters,
      customThemes: customThemes
    };
    
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ucs_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backupData = JSON.parse(event.target?.result as string) as BackupData;
        
        // Validate backup structure
        if (!backupData.characters || !Array.isArray(backupData.characters)) {
          alert('Invalid backup file format');
          return;
        }
        
        // Confirm restore
        const confirmRestore = window.confirm(
          `This will replace all your current data with the backup from ${backupData.timestamp ? new Date(backupData.timestamp).toLocaleString() : 'unknown date'}.\n\n` +
          `Backup contains ${backupData.characters.length} character(s).\n\n` +
          `Are you sure you want to continue?`
        );
        
        if (!confirmRestore) return;
        
        // Restore characters
        localStorage.setItem('ucs:store', JSON.stringify({
          characters: backupData.characters,
          activeCharacterId: null
        }));
        
        // Restore custom themes if present
        if (backupData.customThemes) {
          localStorage.setItem('ucs:customThemes', JSON.stringify(backupData.customThemes));
        }
        
        // Reload the page to apply changes
        window.location.reload();
      } catch (err) {
        alert('Failed to parse backup file');
        console.error(err);
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (backupFileInputRef.current) {
      backupFileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 h-full overflow-auto">
      <div className="flex justify-between items-center mb-4 sm:mb-8 border-b-[length:var(--border-width)] border-theme-border pb-2 sm:pb-4">
        <h1 className="text-2xl sm:text-4xl font-bold uppercase tracking-wider text-theme-ink font-heading">
          Character Select
        </h1>
        <button
          onClick={() => setShowBackupModal(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-body text-theme-ink border-[length:var(--border-width)] border-theme-border bg-theme-paper hover:bg-theme-accent hover:text-theme-paper rounded-theme transition-colors shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          title="Backup & Restore"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <span className="hidden sm:inline">Backup</span>
        </button>
      </div>

      {/* Create and Import buttons */}
      <div className="mb-6 sm:mb-12 flex gap-2 sm:gap-4">
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex-1 bg-theme-accent text-theme-paper px-6 sm:px-8 py-4 sm:py-5 text-lg sm:text-xl font-bold hover:bg-theme-accent-hover transition-colors shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-theme font-heading"
        >
          + CREATE NEW CHARACTER
        </button>
        <label className="bg-theme-paper text-theme-ink px-4 sm:px-6 py-4 sm:py-5 font-bold hover:bg-theme-accent hover:text-theme-paper transition-colors shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-theme font-heading cursor-pointer border-[length:var(--border-width)] border-theme-border text-center flex items-center justify-center">
          IMPORT
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </label>
      </div>

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
      
      {/* Create Character Modal */}
      {showCreateModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50" 
            onClick={() => setShowCreateModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme p-6 z-50 w-[90vw] max-w-[400px]">
            <h3 className="font-heading text-theme-ink font-bold text-xl mb-4">Create New Character</h3>
            
            {/* Character Name */}
            <div className="mb-4">
              <label className="block text-sm font-body text-theme-muted mb-1">Character Name</label>
              <input
                type="text"
                value={newCharName}
                onChange={(e) => setNewCharName(e.target.value)}
                placeholder="Enter character name..."
                className="w-full p-3 text-base border-[length:var(--border-width)] border-theme-border shadow-theme focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-none transition-all bg-theme-paper text-theme-ink rounded-theme font-body"
                autoFocus
              />
            </div>
            
            {/* Preset Selection */}
            <div className="mb-4">
              <label className="block text-sm font-body text-theme-muted mb-1">Preset</label>
              <select
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value)}
                className="w-full p-3 text-base border-[length:var(--border-width)] border-theme-border shadow-theme focus:outline-none transition-all bg-theme-paper text-theme-ink rounded-theme font-body cursor-pointer"
              >
                <option value="">No Preset</option>
                {presetNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            
            {/* Theme Selection */}
            <div className="mb-6">
              <label className="block text-sm font-body text-theme-muted mb-1">Theme</label>
              <select
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                className="w-full p-3 text-base border-[length:var(--border-width)] border-theme-border shadow-theme focus:outline-none transition-all bg-theme-paper text-theme-ink rounded-theme font-body cursor-pointer"
              >
                {THEMES.map((theme) => (
                  <option key={theme.id} value={theme.id}>{theme.icon} {theme.name}</option>
                ))}
              </select>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewCharName('');
                  setSelectedPreset('');
                  setSelectedTheme('default');
                }}
                className="px-4 py-2 font-body text-theme-ink hover:bg-theme-accent/20 rounded-theme transition-colors border-[length:var(--border-width)] border-theme-border"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCharacter}
                className="px-6 py-2 font-body bg-theme-accent text-theme-paper hover:bg-theme-accent-hover rounded-theme transition-colors font-bold"
              >
                Create
              </button>
            </div>
          </div>
        </>
      )}

      {/* Backup & Restore Modal */}
      {showBackupModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50" 
            onClick={() => setShowBackupModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme p-6 z-50 w-[90vw] max-w-[450px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-heading text-theme-ink font-bold text-xl">Backup & Restore</h3>
              <button
                onClick={() => setShowBackupModal(false)}
                className="text-theme-muted hover:text-theme-ink transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Warning Message */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-theme p-4 mb-6">
              <div className="flex gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-body text-theme-ink text-sm font-semibold mb-1">
                    Your data is stored locally
                  </p>
                  <p className="font-body text-theme-muted text-sm">
                    All your characters and settings are stored in your browser's local storage. This data may be lost if you clear your browser cache, use private/incognito mode, or switch browsers.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Backup Section */}
            <div className="mb-4">
              <h4 className="font-body text-theme-ink font-semibold mb-2">Create Backup</h4>
              <p className="font-body text-theme-muted text-sm mb-3">
                Download a backup file containing all your characters and custom themes.
              </p>
              <button
                onClick={handleBackup}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 font-body bg-theme-accent text-theme-paper hover:bg-theme-accent-hover rounded-theme transition-colors font-bold"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Backup
              </button>
            </div>
            
            <div className="border-t border-theme-border my-4"></div>
            
            {/* Restore Section */}
            <div>
              <h4 className="font-body text-theme-ink font-semibold mb-2">Restore from Backup</h4>
              <p className="font-body text-theme-muted text-sm mb-3">
                Upload a backup file to restore your characters and themes. <span className="text-red-500 font-semibold">This will replace all current data.</span>
              </p>
              <label className="w-full flex items-center justify-center gap-2 px-4 py-3 font-body border-[length:var(--border-width)] border-theme-border text-theme-ink hover:bg-theme-accent hover:text-theme-paper rounded-theme transition-colors font-bold cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Backup File
                <input
                  ref={backupFileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleRestore}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
