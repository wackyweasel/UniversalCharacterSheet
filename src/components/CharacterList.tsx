import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { THEMES, getShadowStyleCSS, getTextureCSS, isImageTexture, IMAGE_TEXTURES } from '../store/useThemeStore';
import { getCustomTheme, useCustomThemeStore } from '../store/useCustomThemeStore';
import { useTemplateStore, WidgetTemplate } from '../store/useTemplateStore';
import { useTutorialStore, TUTORIAL_STEPS } from '../store/useTutorialStore';
import TutorialBubble, { useTutorialForPage } from './TutorialBubble';
import { Character } from '../types';
import { getPresetNames, getPreset } from '../presets';

const DARK_MODE_STORAGE_KEY = 'ucs:darkMode';

// Get initial dark mode preference from localStorage or OS
function getInitialDarkMode(): boolean {
  const stored = localStorage.getItem(DARK_MODE_STORAGE_KEY);
  if (stored !== null) {
    return stored === 'true';
  }
  // Fall back to OS preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Backup data structure
interface BackupData {
  version: 1;
  timestamp: string;
  characters: Character[];
  customThemes: Record<string, any>;
  templates?: WidgetTemplate[];
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
  // Subscribe to template changes for backup
  const templates = useTemplateStore((state) => state.templates);
  
  const characters = useStore((state) => state.characters);
  const createCharacter = useStore((state) => state.createCharacter);
  const createCharacterFromPreset = useStore((state) => state.createCharacterFromPreset);
  const updateCharacterTheme = useStore((state) => state.updateCharacterTheme);
  const updateCharacterName = useStore((state) => state.updateCharacterName);
  const importCharacter = useStore((state) => state.importCharacter);
  const duplicateCharacter = useStore((state) => state.duplicateCharacter);
  const selectCharacter = useStore((state) => state.selectCharacter);
  const deleteCharacter = useStore((state) => state.deleteCharacter);
  
  // Tutorial state from store
  const tutorialStep = useTutorialStore((state) => state.tutorialStep);
  const startTutorial = useTutorialStore((state) => state.startTutorial);
  const advanceTutorial = useTutorialStore((state) => state.advanceTutorial);
  const { isActive: tutorialActiveOnPage } = useTutorialForPage('character-list');
  
  const [darkMode, setDarkMode] = useState(getInitialDarkMode);
  const [characterToDelete, setCharacterToDelete] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [selectedTheme, setSelectedTheme] = useState<string>('default');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [renamingCharacterId, setRenamingCharacterId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  
  const presetNames = getPresetNames();

  // Toggle dark mode and persist to localStorage
  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const newValue = !prev;
      localStorage.setItem(DARK_MODE_STORAGE_KEY, String(newValue));
      return newValue;
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setShowHeaderMenu(false);
      }
    };
    
    if (openDropdown || showHeaderMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown, showHeaderMenu]);

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
      customThemes: customThemes,
      templates: templates
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
        const templateCount = backupData.templates?.length || 0;
        const confirmRestore = window.confirm(
          `This will replace all your current data with the backup from ${backupData.timestamp ? new Date(backupData.timestamp).toLocaleString() : 'unknown date'}.\n\n` +
          `Backup contains ${backupData.characters.length} character(s)` +
          (templateCount > 0 ? ` and ${templateCount} template(s)` : '') + `.\n\n` +
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
        
        // Restore templates if present
        if (backupData.templates && Array.isArray(backupData.templates)) {
          localStorage.setItem('ucs:templates', JSON.stringify({ templates: backupData.templates }));
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
    <div className={`h-full p-4 overflow-auto transition-colors ${darkMode ? 'bg-black' : 'bg-gray-100'}`}>
      <div className="max-w-4xl mx-auto pb-safe">
      <div className={`flex justify-between items-center mb-4 border-b-[length:var(--border-width)] pb-2 ${darkMode ? 'border-white/30' : 'border-theme-border'}`}>
        <h1 className={`text-2xl font-bold uppercase tracking-wider font-heading ${darkMode ? 'text-white' : 'text-theme-ink'}`}>
          Character Select
        </h1>
        <div className="flex items-center gap-2">
          {/* Desktop buttons - hidden on small screens */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`flex items-center justify-center w-10 px-2 py-2 rounded-button transition-colors ${
                darkMode 
                  ? 'bg-black text-white hover:bg-white/10 border border-white/30' 
                  : 'bg-white text-gray-600 hover:bg-gray-200 border border-gray-300'
              }`}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            {/* Tutorial Button */}
            <button
              onClick={startTutorial}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-body rounded-button transition-colors shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                darkMode 
                  ? 'text-white border border-white/30 bg-black hover:bg-white/10' 
                  : 'text-theme-ink border-[length:var(--border-width)] border-theme-border bg-theme-paper hover:bg-theme-accent hover:text-theme-paper'
              }`}
              title="Start Tutorial"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>Tutorial</span>
            </button>
            {/* Feedback Button */}
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLScDC-2AnN7OXojo3C-6TdoOfpco1qLAhW7wbB93C4POC4y8KA/viewform?usp=dialog"
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 px-3 py-2 text-sm font-body rounded-button transition-colors shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                darkMode 
                  ? 'text-white border border-white/30 bg-black hover:bg-white/10' 
                  : 'text-theme-ink border-[length:var(--border-width)] border-theme-border bg-theme-paper hover:bg-theme-accent hover:text-theme-paper'
              }`}
              title="Send Feedback"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span>Feedback</span>
            </a>
            <button
              onClick={() => setShowBackupModal(true)}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-body rounded-button transition-colors shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                darkMode 
                  ? 'text-white border border-white/30 bg-black hover:bg-white/10' 
                  : 'text-theme-ink border-[length:var(--border-width)] border-theme-border bg-theme-paper hover:bg-theme-accent hover:text-theme-paper'
              }`}
              title="Backup & Restore"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span>Backup</span>
            </button>
            <a
              href="https://buymeacoffee.com/wackyweasel"
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 px-3 py-2 text-sm font-body rounded-button transition-colors shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                darkMode 
                  ? 'text-white border border-white/30 bg-black hover:bg-white/10' 
                  : 'text-theme-ink border-[length:var(--border-width)] border-theme-border bg-theme-paper hover:bg-theme-accent hover:text-theme-paper'
              }`}
              title="Support the developer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>Donate</span>
            </a>
          </div>
          
          {/* Mobile menu button - visible on small screens */}
          <div className="sm:hidden relative" ref={headerMenuRef}>
            <button
              onClick={() => setShowHeaderMenu(!showHeaderMenu)}
              className={`flex items-center justify-center w-10 h-10 rounded-button transition-colors ${
                darkMode 
                  ? 'bg-black text-white hover:bg-white/10 border border-white/30' 
                  : 'bg-white text-gray-600 hover:bg-gray-200 border border-gray-300'
              }`}
              title="Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {/* Mobile dropdown menu */}
            {showHeaderMenu && (
              <div 
                className={`absolute right-0 top-full mt-2 min-w-[160px] rounded-button shadow-lg overflow-hidden z-50 ${
                  darkMode 
                    ? 'bg-black border border-white/30' 
                    : 'bg-white border border-gray-300'
                }`}
              >
                <button
                  onClick={() => {
                    toggleDarkMode();
                    setShowHeaderMenu(false);
                  }}
                  className={`w-full px-4 py-3 text-left text-sm font-body flex items-center gap-3 transition-colors ${
                    darkMode 
                      ? 'text-white hover:bg-white/10' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {darkMode ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                  <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
                <button
                  onClick={() => {
                    startTutorial();
                    setShowHeaderMenu(false);
                  }}
                  className={`w-full px-4 py-3 text-left text-sm font-body flex items-center gap-3 transition-colors ${
                    darkMode 
                      ? 'text-white hover:bg-white/10' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>Tutorial</span>
                </button>
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLScDC-2AnN7OXojo3C-6TdoOfpco1qLAhW7wbB93C4POC4y8KA/viewform?usp=dialog"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowHeaderMenu(false)}
                  className={`w-full px-4 py-3 text-left text-sm font-body flex items-center gap-3 transition-colors ${
                    darkMode 
                      ? 'text-white hover:bg-white/10' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <span>Feedback</span>
                </a>
                <button
                  onClick={() => {
                    setShowBackupModal(true);
                    setShowHeaderMenu(false);
                  }}
                  className={`w-full px-4 py-3 text-left text-sm font-body flex items-center gap-3 transition-colors ${
                    darkMode 
                      ? 'text-white hover:bg-white/10' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span>Backup</span>
                </button>
                <a
                  href="https://buymeacoffee.com/wackyweasel"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowHeaderMenu(false)}
                  className={`w-full px-4 py-3 text-left text-sm font-body flex items-center gap-3 transition-colors ${
                    darkMode 
                      ? 'text-white hover:bg-white/10' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span>Donate</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create and Import buttons */}
      <div className="mb-6 flex gap-2">
        <button 
          data-tutorial="create-character"
          onClick={() => {
            // Set default theme based on dark mode
            setSelectedTheme(darkMode ? 'classic-dark' : 'default');
            setShowCreateModal(true);
            // If tutorial is on step 0 (create character), advance to next step
            if (tutorialStep === 0 && TUTORIAL_STEPS[0]?.id === 'create-character') {
              advanceTutorial();
            }
          }}
          className={`flex-1 px-6 py-4 text-lg font-bold transition-colors shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-button font-heading ${
            darkMode 
              ? 'bg-white text-black hover:bg-white/80' 
              : 'bg-theme-accent text-theme-paper hover:bg-theme-accent-hover'
          } ${tutorialStep === 0 ? 'outline outline-4 outline-blue-500 outline-offset-2' : ''}`}
        >
          + CREATE NEW CHARACTER
        </button>
        <label className={`px-4 py-4 font-bold transition-colors shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-button font-heading cursor-pointer text-center flex items-center justify-center ${
          darkMode 
            ? 'bg-black text-white border border-white/30 hover:bg-white/10' 
            : 'bg-theme-paper text-theme-ink border-[length:var(--border-width)] border-theme-border hover:bg-theme-accent hover:text-theme-paper'
        }`}>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
        {characters.map((char) => {
          const cardStyles = getThemeStyles(char.theme);
          const customTheme = char.theme ? getCustomTheme(char.theme) : undefined;
          const textureKey = customTheme?.cardTexture || 'none';
          const hasImageTexture = isImageTexture(textureKey);
          return (
            <div 
              key={char.id}
              style={cardStyles}
              className="p-4 active:translate-x-[2px] active:translate-y-[2px] transition-transform cursor-pointer relative group"
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
                  className="text-xl font-bold mb-2 pr-12"
                  style={{ color: 'var(--card-ink)' }}
                >{char.name}</h2>
                <p 
                  className="text-sm mb-2"
                  style={{ color: 'var(--card-muted)' }}
                >{char.sheets.reduce((sum, s) => sum + s.widgets.length, 0)} Widgets • {char.sheets.length} Sheet{char.sheets.length !== 1 ? 's' : ''}</p>
                
                {/* Dropdown Menu */}
                <div className={`absolute top-0 right-0 ${openDropdown === char.id ? 'z-50' : 'z-10'}`} ref={openDropdown === char.id ? dropdownRef : undefined}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown(openDropdown === char.id ? null : char.id);
                    }}
                    className="p-1.5 rounded transition-colors"
                    style={{ 
                      color: 'var(--card-muted)',
                      backgroundColor: 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--card-accent)';
                      e.currentTarget.style.color = 'var(--card-background)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--card-muted)';
                    }}
                    title="Options"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </button>
                  
                  {openDropdown === char.id && (
                    <div 
                      className="absolute right-0 top-full mt-1 min-w-[120px] rounded shadow-lg overflow-hidden z-50"
                      style={{ 
                        backgroundColor: 'var(--card-background)',
                        border: '1px solid var(--card-border)'
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameValue(char.name);
                          setRenamingCharacterId(char.id);
                          setOpenDropdown(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm font-medium flex items-center gap-2 transition-colors"
                        style={{ 
                          color: 'var(--card-ink)',
                          backgroundColor: 'var(--card-background)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--card-accent)';
                          e.currentTarget.style.color = 'var(--card-background)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--card-background)';
                          e.currentTarget.style.color = 'var(--card-ink)';
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Rename
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExport(char);
                          setOpenDropdown(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm font-medium flex items-center gap-2 transition-colors"
                        style={{ 
                          color: 'var(--card-ink)',
                          backgroundColor: 'var(--card-background)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--card-accent)';
                          e.currentTarget.style.color = 'var(--card-background)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--card-background)';
                          e.currentTarget.style.color = 'var(--card-ink)';
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateCharacter(char.id);
                          setOpenDropdown(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm font-medium flex items-center gap-2 transition-colors"
                        style={{ 
                          color: 'var(--card-ink)',
                          backgroundColor: 'var(--card-background)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--card-accent)';
                          e.currentTarget.style.color = 'var(--card-background)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--card-background)';
                          e.currentTarget.style.color = 'var(--card-ink)';
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Duplicate
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCharacterToDelete(char.id);
                          setOpenDropdown(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm font-medium flex items-center gap-2 transition-colors"
                        style={{ 
                          color: 'var(--card-ink)',
                          backgroundColor: 'var(--card-background)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#ef4444';
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--card-background)';
                          e.currentTarget.style.color = 'var(--card-ink)';
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {characters.length === 0 && (
          <div className={`col-span-full text-center py-8 border-[length:var(--border-width)] border-dashed text-sm rounded-theme font-body ${
            darkMode 
              ? 'text-white/50 border-white/30' 
              : 'text-theme-muted border-theme-border/50'
          }`}>
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
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-theme rounded-theme p-4 z-50 min-w-[250px] ${
            darkMode 
              ? 'bg-black border border-white/30' 
              : 'bg-theme-paper border-[length:var(--border-width)] border-theme-border'
          }`}>
            <h3 className={`font-heading font-bold mb-2 ${darkMode ? 'text-white' : 'text-theme-ink'}`}>Delete Character?</h3>
            <p className={`text-sm font-body mb-4 ${darkMode ? 'text-white/60' : 'text-theme-muted'}`}>
              Are you sure you want to delete "{characters.find(c => c.id === characterToDelete)?.name}"? This will delete all sheets and widgets.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setCharacterToDelete(null)}
                className={`px-3 py-1.5 text-sm font-body rounded-button transition-colors ${
                  darkMode 
                    ? 'text-white hover:bg-white/10' 
                    : 'text-theme-ink hover:bg-theme-accent/20'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteCharacter(characterToDelete);
                  setCharacterToDelete(null);
                }}
                className="px-3 py-1.5 text-sm font-body bg-red-500 text-white hover:bg-red-600 rounded-button transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* Rename Character Modal */}
      {renamingCharacterId && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50" 
            onClick={() => setRenamingCharacterId(null)}
          />
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-theme rounded-theme p-4 z-50 min-w-[300px] ${
            darkMode 
              ? 'bg-black border border-white/30' 
              : 'bg-theme-paper border-[length:var(--border-width)] border-theme-border'
          }`}>
            <h3 className={`font-heading font-bold mb-2 ${darkMode ? 'text-white' : 'text-theme-ink'}`}>Rename Character</h3>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameValue.trim()) {
                  updateCharacterName(renamingCharacterId, renameValue.trim());
                  setRenamingCharacterId(null);
                } else if (e.key === 'Escape') {
                  setRenamingCharacterId(null);
                }
              }}
              autoFocus
              className={`w-full px-3 py-2 text-sm font-body rounded-button border mb-4 ${
                darkMode 
                  ? 'bg-white/10 border-white/30 text-white' 
                  : 'bg-theme-background border-theme-border text-theme-ink'
              }`}
              placeholder="Character name"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRenamingCharacterId(null)}
                className={`px-3 py-1.5 text-sm font-body rounded-button transition-colors ${
                  darkMode 
                    ? 'text-white hover:bg-white/10' 
                    : 'text-theme-ink hover:bg-theme-accent/20'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (renameValue.trim()) {
                    updateCharacterName(renamingCharacterId, renameValue.trim());
                    setRenamingCharacterId(null);
                  }
                }}
                className={`px-3 py-1.5 text-sm font-body rounded-button transition-colors ${
                  darkMode 
                    ? 'bg-white text-black hover:bg-white/90' 
                    : 'bg-theme-accent text-theme-paper hover:opacity-90'
                }`}
              >
                Rename
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
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-theme rounded-theme p-6 z-50 w-[90vw] max-w-[400px] ${
            darkMode 
              ? 'bg-black border border-white/30' 
              : 'bg-theme-paper border-[length:var(--border-width)] border-theme-border'
          }`}>
            <h3 className={`font-heading font-bold text-xl mb-4 ${darkMode ? 'text-white' : 'text-theme-ink'}`}>Create New Character</h3>
            
            {/* Character Name */}
            <div className="mb-4" data-tutorial="character-name-input">
              <label className={`block text-sm font-body mb-1 ${darkMode ? 'text-white/60' : 'text-theme-muted'}`}>Character Name</label>
              <input
                type="text"
                value={newCharName}
                onChange={(e) => {
                  setNewCharName(e.target.value);
                  // If tutorial is on step 1 (name character) and user typed something, advance
                  if (tutorialStep === 1 && TUTORIAL_STEPS[1]?.id === 'name-character' && e.target.value.trim().length > 0) {
                    advanceTutorial();
                  }
                }}
                placeholder="Enter character name..."
                className={`w-full p-3 text-base shadow-theme focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-none transition-all rounded-theme font-body ${
                  darkMode 
                    ? 'bg-black text-white border border-white/30 placeholder-white/40' 
                    : 'bg-theme-paper text-theme-ink border-[length:var(--border-width)] border-theme-border'
                } ${tutorialStep === 1 ? 'ring-4 ring-blue-500 ring-offset-2' : ''}`}
                autoFocus
              />
            </div>
            
            {/* Preset Selection */}
            <div className="mb-4">
              <label className={`block text-sm font-body mb-1 ${darkMode ? 'text-white/60' : 'text-theme-muted'}`}>Preset</label>
              <select
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value)}
                className={`w-full p-3 text-base shadow-theme focus:outline-none transition-all rounded-theme font-body cursor-pointer ${
                  darkMode 
                    ? 'bg-black text-white border border-white/30' 
                    : 'bg-theme-paper text-theme-ink border-[length:var(--border-width)] border-theme-border'
                }`}
              >
                <option value="">No Preset</option>
                {presetNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            
            {/* Theme Selection */}
            <div className="mb-6">
              <label className={`block text-sm font-body mb-1 ${darkMode ? 'text-white/60' : 'text-theme-muted'}`}>Theme</label>
              <select
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                className={`w-full p-3 text-base shadow-theme focus:outline-none transition-all rounded-theme font-body cursor-pointer ${
                  darkMode 
                    ? 'bg-black text-white border border-white/30' 
                    : 'bg-theme-paper text-theme-ink border-[length:var(--border-width)] border-theme-border'
                }`}
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
                className={`px-4 py-2 font-body rounded-button transition-colors ${
                  darkMode 
                    ? 'text-white border border-white/30 hover:bg-white/10' 
                    : 'text-theme-ink border-[length:var(--border-width)] border-theme-border hover:bg-theme-accent/20'
                }`}
              >
                Cancel
              </button>
              <button
                data-tutorial="create-button"
                onClick={() => {
                  handleCreateCharacter();
                  // If tutorial is on step 2 (click create), advance
                  if (tutorialStep === 2 && TUTORIAL_STEPS[2]?.id === 'click-create') {
                    advanceTutorial();
                  }
                }}
                className={`px-6 py-2 font-body rounded-button transition-colors font-bold ${
                  darkMode 
                    ? 'bg-white text-black hover:bg-white/80' 
                    : 'bg-theme-accent text-theme-paper hover:bg-theme-accent-hover'
                } ${tutorialStep === 2 ? 'ring-4 ring-blue-500 ring-offset-2' : ''}`}
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
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-theme rounded-theme p-6 z-50 w-[90vw] max-w-[450px] ${
            darkMode 
              ? 'bg-black border border-white/30' 
              : 'bg-theme-paper border-[length:var(--border-width)] border-theme-border'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`font-heading font-bold text-xl ${darkMode ? 'text-white' : 'text-theme-ink'}`}>Backup & Restore</h3>
              <button
                onClick={() => setShowBackupModal(false)}
                className={`transition-colors ${darkMode ? 'text-white/60 hover:text-white' : 'text-theme-muted hover:text-theme-ink'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Warning Message */}
            <div className={`rounded-theme p-4 mb-6 ${
              darkMode 
                ? 'bg-yellow-900/30 border border-yellow-500/30' 
                : 'bg-yellow-500/10 border border-yellow-500/30'
            }`}>
              <div className="flex gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 flex-shrink-0 mt-0.5 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className={`font-body text-sm font-semibold mb-1 ${darkMode ? 'text-white' : 'text-theme-ink'}`}>
                    Your data is stored locally
                  </p>
                  <p className={`font-body text-sm ${darkMode ? 'text-white/60' : 'text-theme-muted'}`}>
                    All your characters and settings are stored in your browser's local storage. This data may be lost if you clear your browser cache, use private/incognito mode, or switch browsers.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Backup Section */}
            <div className="mb-4">
              <h4 className={`font-body font-semibold mb-2 ${darkMode ? 'text-white' : 'text-theme-ink'}`}>Create Backup</h4>
              <p className={`font-body text-sm mb-3 ${darkMode ? 'text-white/60' : 'text-theme-muted'}`}>
                Download a backup file containing all your characters and custom themes.
              </p>
              <button
                onClick={handleBackup}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 font-body rounded-button transition-colors font-bold ${
                  darkMode 
                    ? 'bg-white text-black hover:bg-white/80' 
                    : 'bg-theme-accent text-theme-paper hover:bg-theme-accent-hover'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Backup
              </button>
            </div>
            
            <div className={`border-t my-4 ${darkMode ? 'border-white/30' : 'border-theme-border'}`}></div>
            
            {/* Restore Section */}
            <div>
              <h4 className={`font-body font-semibold mb-2 ${darkMode ? 'text-white' : 'text-theme-ink'}`}>Restore from Backup</h4>
              <p className={`font-body text-sm mb-3 ${darkMode ? 'text-white/60' : 'text-theme-muted'}`}>
                Upload a backup file to restore your characters and themes. <span className="text-red-500 font-semibold">This will replace all current data.</span>
              </p>
              <label className={`w-full flex items-center justify-center gap-2 px-4 py-3 font-body rounded-theme transition-colors font-bold cursor-pointer ${
                darkMode 
                  ? 'border border-white/30 text-white hover:bg-white/10' 
                  : 'border-[length:var(--border-width)] border-theme-border text-theme-ink hover:bg-theme-accent hover:text-theme-paper'
              }`}>
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

      {/* Tutorial Bubble */}
      {tutorialActiveOnPage && <TutorialBubble darkMode={darkMode} />}
      </div>
    </div>
  );
}



