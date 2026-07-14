import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { THEMES, getShadowStyleCSS, getTextureCSS, isImageTexture, IMAGE_TEXTURES } from '../store/useThemeStore';
import { getCustomTheme, useCustomThemeStore } from '../store/useCustomThemeStore';
import { useTemplateStore, AnyTemplate } from '../store/useTemplateStore';
import { useUserPresetStore, UserPreset } from '../store/useUserPresetStore';
import { useTutorialStore, TUTORIAL_STEPS } from '../store/useTutorialStore';
import { TelemetryEventInput, useTelemetryStore } from '../store/useTelemetryStore';
import TutorialBubble, { useTutorialForPage } from './TutorialBubble';
import GallerySidebar from './GallerySidebar';
import CharacterCreator from './CharacterCreator';
import { Character } from '../types';
import { Tooltip } from './Tooltip';
import { getPreset, TUTORIAL_PRESET, type PresetDefinition } from '../presets';
import { getStorageStatus, formatBytes } from '../utils/storageMonitor';
import { stripImages } from '../utils/stripImages';

const DARK_MODE_STORAGE_KEY = 'ucs:darkMode';

const TUTORIAL_DESCRIPTIONS = {
  basic: 'Create a character, add widgets, edit a widget, and learn camera controls.',
  themes: 'Try built-in themes, create a custom theme, and share it with the community.',
  templates: 'Save widgets and groups as templates, load them later, and share them.',
  automation: 'Link values with tags and formulas, learn how to roll a d20 using Strength as the modifier.',
  various: 'Tour Discover, sharing, backup, feedback, Print Preview, the Play List layout, timeline, and sheets.',
};

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
  templates?: AnyTemplate[];
  userPresets?: UserPreset[];
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
  // Subscribe to user presets for backup and preset selection
  const userPresets = useUserPresetStore((state) => state.userPresets);
  const addUserPreset = useUserPresetStore((state) => state.addPreset);
  const removeUserPreset = useUserPresetStore((state) => state.removePreset);
  
  const characters = useStore((state) => state.characters);
  const createCharacter = useStore((state) => state.createCharacter);
  const createCharacterFromPreset = useStore((state) => state.createCharacterFromPreset);
  const replaceBlankCharacterFromPreset = useStore((state) => state.replaceBlankCharacterFromPreset);
  const createTransientCharacter = useStore((state) => state.createTransientCharacter);
  const createTransientCharacterFromPreset = useStore((state) => state.createTransientCharacterFromPreset);
  const cleanupTransientCharacters = useStore((state) => state.cleanupTransientCharacters);
  const updateCharacterTheme = useStore((state) => state.updateCharacterTheme);
  const updateCharacterName = useStore((state) => state.updateCharacterName);
  const importCharacter = useStore((state) => state.importCharacter);
  const duplicateCharacter = useStore((state) => state.duplicateCharacter);
  const selectCharacter = useStore((state) => state.selectCharacter);
  const deleteCharacter = useStore((state) => state.deleteCharacter);
  const setMode = useStore((state) => state.setMode);
  const transientCharacterIds = useStore((state) => state.transientCharacterIds);
  const characterCreatorRequest = useStore((state) => state.characterCreatorRequest);
  const clearCharacterCreatorRequest = useStore((state) => state.clearCharacterCreatorRequest);
  const recordTelemetryEvent = useTelemetryStore((state) => state.recordEvent);
  
  // Tutorial state from store
  const tutorialStep = useTutorialStore((state) => state.tutorialStep);
  const startTutorial = useTutorialStore((state) => state.startTutorial);
  const startThemesTutorial = useTutorialStore((state) => state.startThemesTutorial);
  const startTemplatesTutorial = useTutorialStore((state) => state.startTemplatesTutorial);
  const startAutomationTutorial = useTutorialStore((state) => state.startAutomationTutorial);
  const startVariousTutorial = useTutorialStore((state) => state.startVariousTutorial);
  const advanceTutorial = useTutorialStore((state) => state.advanceTutorial);
  const { isActive: tutorialActiveOnPage } = useTutorialForPage('character-list');
  const isCurrentTutorialStep = (id: string) => tutorialStep !== null && TUTORIAL_STEPS[tutorialStep]?.id === id;

  const recordCharacterListEvent = (event: TelemetryEventInput) => {
    if (tutorialActiveOnPage) return;
    if (event.characterId && transientCharacterIds.includes(event.characterId)) return;
    recordTelemetryEvent(event);
  };
  
  const [darkMode, setDarkMode] = useState(getInitialDarkMode);
  const [characterToDelete, setCharacterToDelete] = useState<string | null>(null);
  const [showCharacterCreator, setShowCharacterCreator] = useState(false);
  const [presetsOnly, setPresetsOnly] = useState(false);
  const [replaceCharacterId, setReplaceCharacterId] = useState<string | null>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [selectedTheme, setSelectedTheme] = useState<string>(darkMode ? 'classic-dark' : 'default');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [renamingCharacterId, setRenamingCharacterId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showCreatePresetModal, setShowCreatePresetModal] = useState(false);
  const [createPresetCharacter, setCreatePresetCharacter] = useState<Character | null>(null);
  const [presetName, setPresetName] = useState('');
  const [includeThemeInPreset, setIncludeThemeInPreset] = useState(true);
  const [presetToDelete, setPresetToDelete] = useState<UserPreset | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [rawDataCharacter, setRawDataCharacter] = useState<Character | null>(null);
  const [rawDataCopied, setRawDataCopied] = useState(false);
  const [excludeImages, setExcludeImages] = useState(false);
  const [showImportDropdown, setShowImportDropdown] = useState(false);
  const [showTutorialDropdown, setShowTutorialDropdown] = useState(false);
  const [showMobileTutorialOptions, setShowMobileTutorialOptions] = useState(false);
  const [showRawImportModal, setShowRawImportModal] = useState(false);
  const [rawImportValue, setRawImportValue] = useState('');
  const importDropdownRef = useRef<HTMLDivElement>(null);
  const tutorialDropdownRef = useRef<HTMLDivElement>(null);
  const automationLoadHandledRef = useRef(false);
  const variousLoadHandledRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  const tutorialOptionClass = (mobile = false) => `w-full px-4 py-3 ${mobile ? 'pl-12 ' : ''}text-left text-sm font-body flex items-center gap-3 transition-colors ${
    mobile ? 'sm:hidden ' : ''
  }${
    darkMode 
      ? 'text-white hover:bg-white/10' 
      : 'text-gray-700 hover:bg-gray-100'
  }`;

  // Toggle dark mode and persist to localStorage
  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const newValue = !prev;
      localStorage.setItem(DARK_MODE_STORAGE_KEY, String(newValue));
      recordCharacterListEvent({
        eventName: 'app_dark_mode_changed',
        category: 'app',
        source: 'header_menu',
        metadata: { enabled: newValue },
      });
      return newValue;
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('[data-tutorial-bubble="true"]')) {
        return;
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setShowHeaderMenu(false);
        setShowMobileTutorialOptions(false);
      }
      if (importDropdownRef.current && !importDropdownRef.current.contains(event.target as Node)) {
        setShowImportDropdown(false);
      }
      if (tutorialDropdownRef.current && !tutorialDropdownRef.current.contains(event.target as Node)) {
        setShowTutorialDropdown(false);
      }
    };
    
    if (openDropdown || showHeaderMenu || showImportDropdown || showTutorialDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown, showHeaderMenu, showImportDropdown, showTutorialDropdown]);

  const handleStartBasicTutorial = () => {
    cleanupTransientCharacters();
    startTutorial();
    if (characters.length === 0) {
      setNewCharName('');
      setSelectedPreset('');
      setSelectedTheme(darkMode ? 'classic-dark' : 'default');
      setShowCharacterCreator(true);
      advanceTutorial();
    }
    setShowTutorialDropdown(false);
    setShowMobileTutorialOptions(false);
    setShowHeaderMenu(false);
  };

  const handleStartThemesTutorial = () => {
    createTransientCharacterFromPreset(TUTORIAL_PRESET, 'Tutorial Character');
    const newCharacterId = useStore.getState().activeCharacterId;

    if (newCharacterId && darkMode) {
      updateCharacterTheme(newCharacterId, 'classic-dark');
    }

    setMode('edit');
    startThemesTutorial();
    setShowTutorialDropdown(false);
    setShowMobileTutorialOptions(false);
    setShowHeaderMenu(false);
  };

  const handleStartTemplatesTutorial = () => {
    createTransientCharacterFromPreset(TUTORIAL_PRESET, 'Tutorial Character');
    const newCharacterId = useStore.getState().activeCharacterId;

    if (newCharacterId && darkMode) {
      updateCharacterTheme(newCharacterId, 'classic-dark');
    }

    setMode('edit');
    startTemplatesTutorial();
    setShowTutorialDropdown(false);
    setShowMobileTutorialOptions(false);
    setShowHeaderMenu(false);
  };

  const handleStartAutomationTutorial = () => {
    cleanupTransientCharacters();
    automationLoadHandledRef.current = false;
    startAutomationTutorial();
    setShowTutorialDropdown(false);
    setShowMobileTutorialOptions(false);
    setShowHeaderMenu(false);
  };

  const handleStartVariousTutorial = () => {
    cleanupTransientCharacters();
    variousLoadHandledRef.current = false;
    startVariousTutorial();
    setShowTutorialDropdown(false);
    setShowMobileTutorialOptions(false);
    setShowHeaderMenu(false);
  };

  const resetCharacterCreator = () => {
    setNewCharName('');
    setSelectedPreset('');
    setSelectedTheme(darkMode ? 'classic-dark' : 'default');
  };

  const handleChooseBlank = () => {
    setSelectedPreset('');
    setSelectedTheme(darkMode ? 'classic-dark' : 'default');
  };

  const handleChooseBuiltInPreset = (definition: PresetDefinition) => {
    setSelectedPreset(definition.name);
    setSelectedTheme(definition.preset.theme || (darkMode ? 'classic-dark' : 'default'));
  };

  const handleChooseUserPreset = (preset: UserPreset) => {
    setSelectedPreset(`user:${preset.id}`);
    setSelectedTheme(preset.theme || preset.preset.theme || (darkMode ? 'classic-dark' : 'default'));
  };

  const handleOpenCreation = () => {
    resetCharacterCreator();
    setPresetsOnly(false);
    setReplaceCharacterId(null);
    setShowCharacterCreator(true);

    if (isCurrentTutorialStep('create-character')) {
      advanceTutorial();
    }
  };

  const handleStartBasicTutorialFromChooser = () => {
    cleanupTransientCharacters();
    startTutorial();
    advanceTutorial();
    resetCharacterCreator();
    setPresetsOnly(false);
    setReplaceCharacterId(null);
    setShowCharacterCreator(true);
    setShowTutorialDropdown(false);
    setShowMobileTutorialOptions(false);
    setShowHeaderMenu(false);
  };

  useEffect(() => {
    if (!characterCreatorRequest) return;

    setNewCharName(characterCreatorRequest.initialName);
    setSelectedPreset('');
    setSelectedTheme(darkMode ? 'classic-dark' : 'default');
    setPresetsOnly(true);
    setReplaceCharacterId(characterCreatorRequest.replaceCharacterId || null);
    setShowCharacterCreator(true);
    clearCharacterCreatorRequest();
  }, [characterCreatorRequest, clearCharacterCreatorRequest, darkMode]);

  useEffect(() => {
    if (tutorialStep === null || TUTORIAL_STEPS[tutorialStep]?.id !== 'automation-load-character') return;
    if (automationLoadHandledRef.current) return;

    automationLoadHandledRef.current = true;

    createTransientCharacterFromPreset(TUTORIAL_PRESET, 'Tutorial Character');
    const newCharacterId = useStore.getState().activeCharacterId;

    if (newCharacterId && darkMode) {
      updateCharacterTheme(newCharacterId, 'classic-dark');
    }

    setMode('edit');
    advanceTutorial();
  }, [tutorialStep, createTransientCharacterFromPreset, updateCharacterTheme, darkMode, setMode, advanceTutorial]);

  useEffect(() => {
    if (isCurrentTutorialStep('various-open-gallery')) {
      setShowGallery(false);
      setShowBackupModal(false);
      setShowHeaderMenu(window.innerWidth < 640);
      setShowMobileTutorialOptions(false);
    }

    if (isCurrentTutorialStep('various-gallery-concepts') || isCurrentTutorialStep('various-gallery-manage') || isCurrentTutorialStep('various-gallery-download')) {
      setShowGallery(true);
      setShowBackupModal(false);
      setShowHeaderMenu(false);
    }

    if (isCurrentTutorialStep('various-open-backup')) {
      setShowGallery(false);
      setShowBackupModal(false);
      setShowHeaderMenu(window.innerWidth < 640);
      setShowMobileTutorialOptions(false);
    }

    if (isCurrentTutorialStep('various-feedback')) {
      setShowGallery(false);
      setShowBackupModal(false);
      setShowHeaderMenu(true);
    }
  }, [tutorialStep]);

  useEffect(() => {
    if (!isCurrentTutorialStep('various-print-mode')) return;
    if (variousLoadHandledRef.current) return;

    variousLoadHandledRef.current = true;
    createTransientCharacterFromPreset(TUTORIAL_PRESET, 'Tutorial Character');
    const newCharacterId = useStore.getState().activeCharacterId;

    if (newCharacterId && darkMode) {
      updateCharacterTheme(newCharacterId, 'classic-dark');
    }

    setMode('play');
    setShowHeaderMenu(false);
  }, [tutorialStep, createTransientCharacterFromPreset, updateCharacterTheme, darkMode, setMode]);

  const handleCreateCharacter = () => {
    const name = newCharName.trim() || 'New Character';
    const isBasicTutorialCreateStep = tutorialStep === 2 && TUTORIAL_STEPS[2]?.id === 'click-create';
    let createdCharacterId: string | null = null;
    let creationSucceeded = false;
    
    if (selectedPreset && selectedPreset !== '') {
      // Check if it's a user preset
      if (selectedPreset.startsWith('user:')) {
        const userPresetId = selectedPreset.replace('user:', '');
        const userPreset = userPresets.find(p => p.id === userPresetId);
        if (userPreset) {
          if (replaceCharacterId) {
            creationSucceeded = replaceBlankCharacterFromPreset(replaceCharacterId, userPreset.preset, name, 'user_preset');
            if (creationSucceeded) createdCharacterId = replaceCharacterId;
          } else if (isBasicTutorialCreateStep) {
            createTransientCharacterFromPreset(userPreset.preset, name);
            creationSucceeded = true;
          } else {
            createCharacterFromPreset(userPreset.preset, name, 'user_preset');
            creationSucceeded = true;
          }
          const state = useStore.getState();
          const newChar = creationSucceeded
            ? createdCharacterId
              ? state.characters.find((character) => character.id === createdCharacterId)
              : state.characters[state.characters.length - 1]
            : undefined;
          // Use the preset's stored theme if available, otherwise use the selected theme
          const themeToApply = userPreset.theme || selectedTheme;
          if (newChar && themeToApply !== 'default') {
            updateCharacterTheme(newChar.id, themeToApply);
          }
        }
      } else {
        // Create from built-in preset
        const preset = getPreset(selectedPreset);
        if (preset) {
          if (replaceCharacterId) {
            creationSucceeded = replaceBlankCharacterFromPreset(replaceCharacterId, preset, name, 'builtin_preset');
            if (creationSucceeded) createdCharacterId = replaceCharacterId;
          } else if (isBasicTutorialCreateStep) {
            createTransientCharacterFromPreset(preset, name);
            creationSucceeded = true;
          } else {
            createCharacterFromPreset(preset, name, 'builtin_preset');
            creationSucceeded = true;
          }
          // Get the newly created character and update its theme
          // Since the preset might have its own theme, we override it with the selected one
          const state = useStore.getState();
          const newChar = creationSucceeded
            ? createdCharacterId
              ? state.characters.find((character) => character.id === createdCharacterId)
              : state.characters[state.characters.length - 1]
            : undefined;
          if (newChar && selectedTheme !== 'default') {
            updateCharacterTheme(newChar.id, selectedTheme);
          }
        }
      }
    } else {
      if (presetsOnly) return;
      // Create blank character
      if (isBasicTutorialCreateStep) {
        createTransientCharacter(name);
      } else {
        createCharacter(name);
      }
      creationSucceeded = true;
      // Update theme if not default
      const state = useStore.getState();
      const newChar = state.characters[state.characters.length - 1];
      if (newChar && selectedTheme !== 'default') {
        updateCharacterTheme(newChar.id, selectedTheme);
      }
    }

    if (!creationSucceeded) return;
    
    // Reset form
    resetCharacterCreator();
    setPresetsOnly(false);
    setReplaceCharacterId(null);
    setShowCharacterCreator(false);
  };

  const handleNewCharacterNameChange = (name: string) => {
    setNewCharName(name);
    if (tutorialStep === 1 && TUTORIAL_STEPS[1]?.id === 'name-character' && name.trim().length > 0) {
      advanceTutorial();
    }
  };

  const handleSubmitCharacter = () => {
    const shouldAdvanceTutorial = tutorialStep === 2 && TUTORIAL_STEPS[2]?.id === 'click-create';
    handleCreateCharacter();
    if (shouldAdvanceTutorial) {
      advanceTutorial();
    }
  };

  const handleCloseCharacterCreator = () => {
    resetCharacterCreator();
    setPresetsOnly(false);
    setReplaceCharacterId(null);
    setShowCharacterCreator(false);
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
    recordCharacterListEvent({
      eventName: 'character_exported_json',
      category: 'character',
      characterId: char.id,
      sheetId: char.activeSheetId,
      source: 'character_menu',
      metadata: {
        sheetCount: char.sheets.length,
        widgetCount: char.sheets.reduce((count, sheet) => count + sheet.widgets.length, 0),
      },
    });
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
        importCharacter(character, 'json_file');
      } catch (err) {
        alert('Failed to parse character file');
        console.error(err);
      }
    };
    reader.readAsText(file);
    
    // Reset file input so the same file can be imported again
    e.target.value = '';
  };

  const handleBackup = () => {
    const backupData: BackupData = {
      version: 1,
      timestamp: new Date().toISOString(),
      characters: characters,
      customThemes: customThemes,
      templates: templates,
      userPresets: userPresets
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
    recordCharacterListEvent({
      eventName: 'backup_exported',
      category: 'app',
      source: 'backup_modal',
      metadata: {
        characterCount: characters.length,
        templateCount: templates.length,
        userPresetCount: userPresets.length,
      },
    });
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
        const userPresetCount = backupData.userPresets?.length || 0;
        const confirmRestore = window.confirm(
          `This will replace all your current data with the backup from ${backupData.timestamp ? new Date(backupData.timestamp).toLocaleString() : 'unknown date'}.\n\n` +
          `Backup contains ${backupData.characters.length} character(s)` +
          (templateCount > 0 ? `, ${templateCount} template(s)` : '') +
          (userPresetCount > 0 ? `, ${userPresetCount} user preset(s)` : '') + `.\n\n` +
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
        
        // Restore user presets if present
        if (backupData.userPresets && Array.isArray(backupData.userPresets)) {
          localStorage.setItem('ucs:userPresets', JSON.stringify({ userPresets: backupData.userPresets }));
        }

        recordCharacterListEvent({
          eventName: 'backup_restored',
          category: 'app',
          source: 'backup_modal',
          metadata: {
            characterCount: backupData.characters.length,
            templateCount,
            userPresetCount,
          },
        });
        
        // Reload the page to apply changes
        window.setTimeout(() => window.location.reload(), 250);
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
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />
      <div className="max-w-4xl mx-auto pb-safe">
      <div className={`flex justify-between items-center mb-4 border-b-[length:var(--border-width)] pb-2 ${darkMode ? 'border-white/30' : 'border-theme-border'}`}>
        <h1 className={`text-2xl font-bold uppercase tracking-wider font-heading ${darkMode ? 'text-white' : 'text-theme-ink'}`}>
          Character Select
        </h1>
        <div className="flex items-center gap-2">
          {/* Desktop buttons - visible on larger screens */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Gallery Button */}
            <Tooltip content="Discover community content">
              <button
                onClick={() => {
                  setShowGallery(true);
                  if (isCurrentTutorialStep('various-open-gallery')) {
                    advanceTutorial();
                  }
                }}
                data-tutorial="gallery-button"
                className={`flex items-center gap-2 px-3 py-2 text-sm font-body rounded-button transition-colors shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                  darkMode 
                    ? 'text-white border border-white/30 bg-black hover:bg-white/10' 
                    : 'text-theme-ink border-[length:var(--border-width)] border-theme-border bg-theme-paper hover:bg-theme-accent hover:text-theme-paper'
                } ${isCurrentTutorialStep('various-open-gallery') ? 'outline outline-4 outline-blue-500 outline-offset-2' : ''}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span>Discover</span>
              </button>
            </Tooltip>
            {/* Tutorial Button */}
            <div className="relative" ref={tutorialDropdownRef}>
              <Tooltip content="Tutorials">
                <button
                  onClick={() => {
                    setShowTutorialDropdown((current) => !current);
                    setShowHeaderMenu(false);
                    setShowMobileTutorialOptions(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-body rounded-button transition-colors shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                    darkMode 
                      ? 'text-white border border-white/30 bg-black hover:bg-white/10' 
                      : 'text-theme-ink border-[length:var(--border-width)] border-theme-border bg-theme-paper hover:bg-theme-accent hover:text-theme-paper'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>Tutorials</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showTutorialDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </Tooltip>
              {showTutorialDropdown && (
                <div 
                  className={`absolute right-0 top-full mt-2 min-w-[180px] rounded-button shadow-lg overflow-hidden z-50 animate-dropdown-in ${
                    darkMode 
                      ? 'bg-black border border-white/30' 
                      : 'bg-white border border-gray-300'
                  }`}
                >
                  <Tooltip content={TUTORIAL_DESCRIPTIONS.basic} placement="left">
                    <button onClick={handleStartBasicTutorial} className={tutorialOptionClass()}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18s-3.332.477-4.5 1.253" />
                      </svg>
                      <span>Basic</span>
                    </button>
                  </Tooltip>
                  <Tooltip content={TUTORIAL_DESCRIPTIONS.themes} placement="left">
                    <button onClick={handleStartThemesTutorial} className={tutorialOptionClass()}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.486M7 17h.01" />
                      </svg>
                      <span>Themes</span>
                    </button>
                  </Tooltip>
                  <Tooltip content={TUTORIAL_DESCRIPTIONS.templates} placement="left">
                    <button onClick={handleStartTemplatesTutorial} className={tutorialOptionClass()}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2m14 0V9a2 2 0 00-2-2m-4 4V5a2 2 0 00-2-2H9a2 2 0 00-2 2v6m6 0H7" />
                      </svg>
                      <span>Templates</span>
                    </button>
                  </Tooltip>
                  <Tooltip content={TUTORIAL_DESCRIPTIONS.automation} placement="left">
                    <button onClick={handleStartAutomationTutorial} className={tutorialOptionClass()}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Automation</span>
                    </button>
                  </Tooltip>
                  <Tooltip content={TUTORIAL_DESCRIPTIONS.various} placement="left">
                    <button onClick={handleStartVariousTutorial} className={tutorialOptionClass()}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      <span>Various</span>
                    </button>
                  </Tooltip>
                </div>
              )}
            </div>
            {/* Backup Button */}
            <Tooltip content="Backup &amp; Restore">
              <button
                onClick={() => {
                  setShowBackupModal(true);
                  if (isCurrentTutorialStep('various-open-backup')) {
                    advanceTutorial();
                  }
                }}
                data-tutorial="backup-button"
                className={`flex items-center gap-2 px-3 py-2 text-sm font-body rounded-button transition-colors shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                  darkMode 
                    ? 'text-white border border-white/30 bg-black hover:bg-white/10' 
                    : 'text-theme-ink border-[length:var(--border-width)] border-theme-border bg-theme-paper hover:bg-theme-accent hover:text-theme-paper'
                } ${isCurrentTutorialStep('various-open-backup') ? 'outline outline-4 outline-blue-500 outline-offset-2' : ''}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span>Backup</span>
              </button>
            </Tooltip>
          </div>
          
          {/* Menu button - always visible */}
          <div className="relative" ref={headerMenuRef}>
            <Tooltip content="Menu">
              <button
                onClick={() => {
                  setShowHeaderMenu((current) => !current);
                  setShowTutorialDropdown(false);
                  setShowMobileTutorialOptions(false);
                }}
                className={`flex items-center justify-center px-2 py-2 rounded-button transition-colors shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                  darkMode 
                    ? 'bg-black text-white hover:bg-white/10 border border-white/30' 
                    : 'bg-theme-paper text-theme-ink hover:bg-theme-accent hover:text-theme-paper border-[length:var(--border-width)] border-theme-border'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </Tooltip>
            
            {/* Dropdown menu */}
            {showHeaderMenu && (
              <div 
                className={`absolute right-0 top-full mt-2 min-w-[160px] rounded-button shadow-lg overflow-hidden z-50 animate-dropdown-in ${
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
                {/* Gallery - only in mobile menu */}
                <button
                  onClick={() => {
                    setShowGallery(true);
                    if (isCurrentTutorialStep('various-open-gallery')) {
                      advanceTutorial();
                    }
                    setShowHeaderMenu(false);
                  }}
                  data-tutorial="gallery-button-mobile"
                  className={`sm:hidden w-full px-4 py-3 text-left text-sm font-body flex items-center gap-3 transition-colors ${
                    isCurrentTutorialStep('various-open-gallery')
                      ? 'bg-blue-500 text-white font-bold'
                      : darkMode 
                        ? 'text-white hover:bg-white/10' 
                        : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span>Discover</span>
                </button>
                {/* Tutorial - only in mobile menu */}
                <button
                  onClick={() => {
                    setShowMobileTutorialOptions((current) => !current);
                  }}
                  className={`sm:hidden w-full px-4 py-3 text-left text-sm font-body flex items-center gap-3 transition-colors ${
                    darkMode 
                      ? 'text-white hover:bg-white/10' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>Tutorials</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`ml-auto h-4 w-4 transition-transform ${showMobileTutorialOptions ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showMobileTutorialOptions && (
                  <>
                    <Tooltip content={TUTORIAL_DESCRIPTIONS.basic} placement="left">
                      <button onClick={handleStartBasicTutorial} className={tutorialOptionClass(true)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18s-3.332.477-4.5 1.253" />
                        </svg>
                        <span>Basic</span>
                      </button>
                    </Tooltip>
                    <Tooltip content={TUTORIAL_DESCRIPTIONS.themes} placement="left">
                      <button onClick={handleStartThemesTutorial} className={tutorialOptionClass(true)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.486M7 17h.01" />
                        </svg>
                        <span>Themes</span>
                      </button>
                    </Tooltip>
                    <Tooltip content={TUTORIAL_DESCRIPTIONS.templates} placement="left">
                      <button onClick={handleStartTemplatesTutorial} className={tutorialOptionClass(true)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2m14 0V9a2 2 0 00-2-2m-4 4V5a2 2 0 00-2-2H9a2 2 0 00-2 2v6m6 0H7" />
                        </svg>
                        <span>Templates</span>
                      </button>
                    </Tooltip>
                    <Tooltip content={TUTORIAL_DESCRIPTIONS.automation} placement="left">
                      <button onClick={handleStartAutomationTutorial} className={tutorialOptionClass(true)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Automation</span>
                      </button>
                    </Tooltip>
                    <Tooltip content={TUTORIAL_DESCRIPTIONS.various} placement="left">
                      <button onClick={handleStartVariousTutorial} className={tutorialOptionClass(true)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        <span>Various</span>
                      </button>
                    </Tooltip>
                  </>
                )}
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLScDC-2AnN7OXojo3C-6TdoOfpco1qLAhW7wbB93C4POC4y8KA/viewform?usp=dialog"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    recordCharacterListEvent({
                      eventName: 'external_feedback_opened',
                      category: 'app',
                      source: 'header_menu',
                    });
                    setShowHeaderMenu(false);
                  }}
                  data-tutorial="feedback-button"
                  className={`w-full px-4 py-3 text-left text-sm font-body flex items-center gap-3 transition-colors ${
                    isCurrentTutorialStep('various-feedback')
                      ? 'bg-blue-500 text-white font-bold'
                      : darkMode 
                        ? 'text-white hover:bg-white/10' 
                        : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <span>Feedback</span>
                </a>
                <a
                  href="https://www.reddit.com/r/UniversalCharSheet/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    recordCharacterListEvent({
                      eventName: 'external_reddit_opened',
                      category: 'app',
                      source: 'header_menu',
                    });
                    setShowHeaderMenu(false);
                  }}
                  className={`w-full px-4 py-3 text-left text-sm font-body flex items-center gap-3 transition-colors ${
                    darkMode 
                      ? 'text-white hover:bg-white/10' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M18 10.1c0-1-.8-1.8-1.8-1.7-.4 0-.9.2-1.2.5-1.4-.9-3-1.5-4.7-1.5l.8-3.8 2.6.6c0 .7.6 1.2 1.3 1.2.7 0 1.2-.6 1.2-1.3 0-.7-.6-1.2-1.3-1.2-.5 0-.9.3-1.1.7L11 2.9h-.2c-.1 0-.1.1-.1.2l-1 4.3C8 7.4 6.4 7.9 5 8.9c-.7-.7-1.8-.7-2.5 0s-.7 1.8 0 2.5c.1.1.3.3.5.3v.5c0 2.7 3.1 4.9 7 4.9s7-2.2 7-4.9v-.5c.6-.3 1-.9 1-1.6zM6 11.4c0-.7.6-1.2 1.2-1.2.7 0 1.2.6 1.2 1.2s-.6 1.2-1.2 1.2c-.7 0-1.2-.5-1.2-1.2zm7 3.3c-.9.6-1.9 1-3 .9-1.1 0-2.1-.3-3-.9-.1-.1-.1-.3 0-.5.1-.1.3-.1.4 0 .7.5 1.6.8 2.5.7.9.1 1.8-.2 2.5-.7.1-.1.3-.1.5 0s.2.3.1.5zm-.3-2.1c-.7 0-1.2-.6-1.2-1.2s.6-1.2 1.2-1.2c.7 0 1.2.6 1.2 1.2.1.7-.5 1.2-1.2 1.2z" />
                  </svg>
                  <span>Reddit</span>
                </a>
                <button
                  onClick={() => {
                    setShowBackupModal(true);
                    if (isCurrentTutorialStep('various-open-backup')) {
                      advanceTutorial();
                    }
                    setShowHeaderMenu(false);
                  }}
                  data-tutorial="backup-button-mobile"
                  className={`sm:hidden w-full px-4 py-3 text-left text-sm font-body flex items-center gap-3 transition-colors ${
                    isCurrentTutorialStep('various-open-backup')
                      ? 'bg-blue-500 text-white font-bold'
                      : darkMode 
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
                  onClick={() => {
                    recordCharacterListEvent({
                      eventName: 'external_donate_opened',
                      category: 'app',
                      source: 'header_menu',
                    });
                    setShowHeaderMenu(false);
                  }}
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
      {characters.length > 0 && <div className="mb-6 flex gap-2">
        <button 
          data-tutorial="create-character"
          onClick={handleOpenCreation}
          className={`flex-1 px-6 py-4 text-lg font-bold transition-colors shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-button font-heading ${
            darkMode 
              ? 'bg-white text-black hover:bg-white/80' 
              : 'bg-theme-accent text-theme-paper hover:bg-theme-accent-hover'
          } ${tutorialStep === 0 ? 'outline outline-4 outline-blue-500 outline-offset-2' : ''}`}
        >
          + CREATE NEW CHARACTER
        </button>
        <div className="relative self-stretch" ref={importDropdownRef}>
          <button
            onClick={() => setShowImportDropdown(!showImportDropdown)}
            className={`h-full px-4 font-bold transition-colors shadow-theme active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-button font-heading cursor-pointer text-center flex items-center justify-center ${
              darkMode 
                ? 'bg-black text-white border border-white/30 hover:bg-white/10' 
                : 'bg-theme-paper text-theme-ink border-[length:var(--border-width)] border-theme-border hover:bg-theme-accent hover:text-theme-paper'
            }`}
          >
            IMPORT
          </button>
          {showImportDropdown && (
            <div className={`absolute right-0 top-full mt-2 min-w-[160px] rounded-button shadow-lg overflow-hidden z-50 animate-dropdown-in ${
              darkMode 
                ? 'bg-black border border-white/30' 
                : 'bg-white border border-gray-300'
            }`}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full px-4 py-3 text-left text-sm font-body flex items-center gap-3 transition-colors cursor-pointer ${
                  darkMode 
                    ? 'text-white hover:bg-white/10' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                </svg>
                <span>From File</span>
              </button>
              <button
                onClick={() => {
                  setRawImportValue('');
                  setShowRawImportModal(true);
                  setShowImportDropdown(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm font-body flex items-center gap-3 transition-colors ${
                  darkMode 
                    ? 'text-white hover:bg-white/10' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <span>From Raw Data</span>
              </button>
            </div>
          )}
        </div>
      </div>}

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
              className={`p-4 active:translate-x-[2px] active:translate-y-[2px] transition-transform cursor-pointer relative group ${openDropdown === char.id ? 'z-40' : ''}`}
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
                  <Tooltip content="Options">
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
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                  </Tooltip>
                  
                  {openDropdown === char.id && (
                    <div 
                      className="absolute right-0 top-full mt-1 min-w-[120px] rounded shadow-lg overflow-hidden z-50 animate-dropdown-in"
                      style={{ 
                        backgroundColor: 'var(--card-background)',
                        border: '1px solid var(--card-border)'
                      }}
                    >
                      <Tooltip content="Rename this character" placement="left">
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
                      </Tooltip>
                      <Tooltip content="Export this character as a JSON file" placement="left">
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
                      </Tooltip>
                      <Tooltip content="Create a copy of this character" placement="left">
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
                      </Tooltip>
                      <Tooltip content="Save this character as a reusable preset (Presets are selectable at character creation)" placement="left">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCreatePresetCharacter(char);
                            setPresetName(`${char.name} Preset`);
                            setIncludeThemeInPreset(true);
                            setShowCreatePresetModal(true);
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
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Create Preset
                        </button>
                      </Tooltip>
                      <Tooltip content="View this character's raw JSON data (useful to copy and import from raw)" placement="left">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRawDataCharacter(char);
                            setRawDataCopied(false);
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
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                          Show Raw Data
                        </button>
                      </Tooltip>
                      <Tooltip content="Delete this character" placement="left">
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
                      </Tooltip>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {characters.length === 0 && (
          <div className="col-span-full">
            <CharacterCreator
              darkMode={darkMode}
              firstCharacter
              presetsOnly={presetsOnly}
              replacingBlankCharacter={replaceCharacterId !== null}
              name={newCharName}
              selectedPreset={selectedPreset}
              selectedTheme={selectedTheme}
              customThemes={customThemes}
              userPresets={userPresets}
              startingPointLocked={isCurrentTutorialStep('name-character') || isCurrentTutorialStep('click-create')}
              nameHighlighted={isCurrentTutorialStep('name-character')}
              createHighlighted={isCurrentTutorialStep('click-create')}
              onNameChange={handleNewCharacterNameChange}
              onChooseBlank={handleChooseBlank}
              onChooseBuiltIn={handleChooseBuiltInPreset}
              onChooseUser={handleChooseUserPreset}
              onThemeChange={setSelectedTheme}
              onCreate={handleSubmitCharacter}
              onImport={() => fileInputRef.current?.click()}
              onDiscover={() => setShowGallery(true)}
              onTour={handleStartBasicTutorialFromChooser}
            />
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {characterToDelete && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50 animate-fade-in" 
            onClick={() => setCharacterToDelete(null)}
          />
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-theme rounded-theme p-4 z-50 min-w-[250px] animate-fade-in ${
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
            className="fixed inset-0 bg-black/50 z-50 animate-fade-in" 
            onClick={() => setRenamingCharacterId(null)}
          />
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-theme rounded-theme p-4 z-50 min-w-[300px] animate-fade-in ${
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
      
      {/* Create Preset Modal */}
      {showCreatePresetModal && createPresetCharacter && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50 animate-fade-in" 
            onClick={() => {
              setShowCreatePresetModal(false);
              setCreatePresetCharacter(null);
            }}
          />
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-theme rounded-theme p-6 z-50 w-[90vw] max-w-[400px] animate-fade-in ${
            darkMode 
              ? 'bg-black border border-white/30' 
              : 'bg-theme-paper border-[length:var(--border-width)] border-theme-border'
          }`}>
            <h3 className={`font-heading font-bold text-xl mb-4 ${darkMode ? 'text-white' : 'text-theme-ink'}`}>Create Preset</h3>
            
            {/* Preset Name */}
            <div className="mb-4">
              <label className={`block text-sm font-body mb-1 ${darkMode ? 'text-white/60' : 'text-theme-muted'}`}>Preset Name</label>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Enter preset name..."
                className={`w-full p-3 text-base shadow-theme focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-none transition-all rounded-theme font-body ${
                  darkMode 
                    ? 'bg-black text-white border border-white/30 placeholder-white/40' 
                    : 'bg-theme-paper text-theme-ink border-[length:var(--border-width)] border-theme-border'
                }`}
                autoFocus
              />
            </div>
            
            {/* Include Theme Checkbox */}
            <div className="mb-6">
              <label className={`flex items-center gap-3 cursor-pointer ${darkMode ? 'text-white' : 'text-theme-ink'}`}>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={includeThemeInPreset}
                    onChange={(e) => setIncludeThemeInPreset(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded transition-colors flex items-center justify-center ${
                    darkMode 
                      ? `border border-white/30 ${includeThemeInPreset ? 'bg-white' : 'bg-black'}`
                      : `border-[length:var(--border-width)] border-theme-border ${includeThemeInPreset ? 'bg-theme-accent' : 'bg-theme-paper'}`
                  }`}>
                    {includeThemeInPreset && (
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${darkMode ? 'text-black' : 'text-theme-paper'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm font-body">Include theme in preset</span>
              </label>
              <p className={`text-xs font-body mt-1 ml-8 ${darkMode ? 'text-white/50' : 'text-theme-muted'}`}>
                When enabled, the character's theme will be automatically applied when creating a new character from this preset.
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCreatePresetModal(false);
                  setCreatePresetCharacter(null);
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
                onClick={() => {
                  const name = presetName || `${createPresetCharacter.name} Preset`;
                  addUserPreset(createPresetCharacter, name, includeThemeInPreset);
                  recordCharacterListEvent({
                    eventName: 'user_preset_created',
                    category: 'template',
                    characterId: createPresetCharacter.id,
                    sheetId: createPresetCharacter.activeSheetId,
                    source: 'character_menu',
                    metadata: {
                      includeTheme: includeThemeInPreset,
                      sheetCount: createPresetCharacter.sheets.length,
                      widgetCount: createPresetCharacter.sheets.reduce((count, sheet) => count + sheet.widgets.length, 0),
                    },
                  });
                  setShowCreatePresetModal(false);
                  setCreatePresetCharacter(null);
                }}
                className={`px-6 py-2 font-body rounded-button transition-colors font-bold ${
                  darkMode 
                    ? 'bg-white text-black hover:bg-white/80' 
                    : 'bg-theme-accent text-theme-paper hover:bg-theme-accent-hover'
                }`}
              >
                Create
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Preset Confirmation Modal */}
      {presetToDelete && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-[70] animate-fade-in"
            onClick={() => setPresetToDelete(null)}
          />
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-theme rounded-theme p-4 z-[70] min-w-[280px] animate-fade-in ${
            darkMode 
              ? 'bg-black border border-white/30' 
              : 'bg-theme-paper border-[length:var(--border-width)] border-theme-border'
          }`}>
            <h3 className={`font-heading font-bold mb-2 ${darkMode ? 'text-white' : 'text-theme-ink'}`}>Delete Preset?</h3>
            <p className={`text-sm font-body mb-4 ${darkMode ? 'text-white/60' : 'text-theme-muted'}`}>
              Are you sure you want to delete "{presetToDelete.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPresetToDelete(null)}
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
                  recordCharacterListEvent({
                    eventName: 'user_preset_deleted',
                    category: 'template',
                    source: 'character_list',
                    metadata: { presetId: presetToDelete.id },
                  });
                  removeUserPreset(presetToDelete.id);
                  // If the deleted preset was selected, clear the selection
                  if (selectedPreset === `user:${presetToDelete.id}`) {
                    setSelectedPreset('');
                  }
                  setPresetToDelete(null);
                }}
                className="px-3 py-1.5 text-sm font-body bg-red-500 text-white hover:bg-red-600 rounded-button transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Single-surface creator for returning users */}
      {showCharacterCreator && characters.length > 0 && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-50 animate-fade-in"
            onClick={handleCloseCharacterCreator}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="character-creator-title"
            className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-1.5rem)] sm:w-[calc(100%-4rem)] max-w-lg max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-theme shadow-xl animate-fade-in ${
              darkMode ? 'bg-black border border-white/30' : 'bg-white border border-gray-300'
            }`}
          >
            <CharacterCreator
              darkMode={darkMode}
              presetsOnly={presetsOnly}
              replacingBlankCharacter={replaceCharacterId !== null}
              name={newCharName}
              selectedPreset={selectedPreset}
              selectedTheme={selectedTheme}
              customThemes={customThemes}
              userPresets={userPresets}
              startingPointLocked={isCurrentTutorialStep('name-character') || isCurrentTutorialStep('click-create')}
              nameHighlighted={isCurrentTutorialStep('name-character')}
              createHighlighted={isCurrentTutorialStep('click-create')}
              onNameChange={handleNewCharacterNameChange}
              onChooseBlank={handleChooseBlank}
              onChooseBuiltIn={handleChooseBuiltInPreset}
              onChooseUser={handleChooseUserPreset}
              onThemeChange={setSelectedTheme}
              onCreate={handleSubmitCharacter}
              onCancel={handleCloseCharacterCreator}
              onImport={() => fileInputRef.current?.click()}
              onDiscover={() => {
                setShowCharacterCreator(false);
                setShowGallery(true);
              }}
              onTour={handleStartBasicTutorialFromChooser}
            />
          </div>
        </>
      )}

      {/* Backup & Restore Modal */}
      {showBackupModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50 animate-fade-in" 
            onClick={() => setShowBackupModal(false)}
          />
          <div data-tutorial="backup-modal" className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-theme rounded-theme p-6 z-50 w-[90vw] max-w-[450px] animate-fade-in ${
            darkMode 
              ? 'bg-black border border-white/30' 
              : 'bg-theme-paper border-[length:var(--border-width)] border-theme-border'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`font-heading font-bold text-xl ${darkMode ? 'text-white' : 'text-theme-ink'}`}>Backup & Restore</h3>
              <button
                onClick={() => setShowBackupModal(false)}
                aria-label="Close"
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
                  {(() => {
                    const s = getStorageStatus();
                    return (
                      <p className={`font-body text-xs mt-2 ${darkMode ? 'text-white/40' : 'text-theme-muted/70'}`}>
                        Storage used: {formatBytes(s.usedBytes)} / ~{formatBytes(s.quotaBytes)} ({s.percentUsed}%)
                      </p>
                    );
                  })()}
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

      {/* Raw Data View Modal */}
      {rawDataCharacter && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50 animate-fade-in" 
            onClick={() => setRawDataCharacter(null)}
          />
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-theme rounded-theme p-6 z-50 w-[90vw] max-w-[600px] max-h-[80vh] flex flex-col animate-fade-in ${
            darkMode 
              ? 'bg-black border border-white/30' 
              : 'bg-theme-paper border-[length:var(--border-width)] border-theme-border'
          }`}>
            <h3 className={`font-heading font-bold text-xl mb-4 ${darkMode ? 'text-white' : 'text-theme-ink'}`}>
              Raw Data — {rawDataCharacter.name}
            </h3>
            <textarea
              readOnly
              value={JSON.stringify(excludeImages ? stripImages(rawDataCharacter) : rawDataCharacter, null, 2)}
              className={`flex-1 w-full min-h-[300px] p-3 text-xs font-mono rounded-theme resize-none ${
                darkMode 
                  ? 'bg-white/5 border border-white/30 text-white/80' 
                  : 'bg-gray-50 border-[length:var(--border-width)] border-theme-border text-theme-ink'
              }`}
            />
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => setExcludeImages(!excludeImages)}
                className={`px-3 py-2 text-sm font-body rounded-button transition-colors flex items-center gap-2 ${
                  excludeImages
                    ? darkMode
                      ? 'bg-white text-black'
                      : 'bg-theme-accent text-theme-paper'
                    : darkMode
                      ? 'text-white border border-white/30 hover:bg-white/10'
                      : 'text-theme-ink border-[length:var(--border-width)] border-theme-border hover:bg-theme-accent/20'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {excludeImages ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  )}
                  {!excludeImages && (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  )}
                </svg>
                Exclude Images
              </button>
              <div className="flex-1" />
              <button
                onClick={async () => {
                  const data = excludeImages ? stripImages(rawDataCharacter) : rawDataCharacter;
                  await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                  recordCharacterListEvent({
                    eventName: 'character_raw_data_copied',
                    category: 'character',
                    characterId: rawDataCharacter.id,
                    sheetId: rawDataCharacter.activeSheetId,
                    source: 'raw_data_modal',
                    metadata: { excludeImages },
                  });
                  setRawDataCopied(true);
                  setTimeout(() => setRawDataCopied(false), 2000);
                }}
                className={`px-4 py-2 font-body rounded-button transition-colors font-bold flex items-center gap-2 ${
                  rawDataCopied
                    ? 'bg-green-500 text-white'
                    : darkMode 
                      ? 'bg-white text-black hover:bg-white/80' 
                      : 'bg-theme-accent text-theme-paper hover:bg-theme-accent-hover'
                }`}
              >
                {rawDataCopied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy to Clipboard
                  </>
                )}
              </button>
              <button
                onClick={() => setRawDataCharacter(null)}
                className={`px-4 py-2 font-body rounded-button transition-colors ${
                  darkMode 
                    ? 'text-white border border-white/30 hover:bg-white/10' 
                    : 'text-theme-ink border-[length:var(--border-width)] border-theme-border hover:bg-theme-accent/20'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}

      {/* Raw Data Import Modal */}
      {showRawImportModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50 animate-fade-in" 
            onClick={() => setShowRawImportModal(false)}
          />
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-theme rounded-theme p-6 z-50 w-[90vw] max-w-[600px] max-h-[80vh] flex flex-col animate-fade-in ${
            darkMode 
              ? 'bg-black border border-white/30' 
              : 'bg-theme-paper border-[length:var(--border-width)] border-theme-border'
          }`}>
            <h3 className={`font-heading font-bold text-xl mb-4 ${darkMode ? 'text-white' : 'text-theme-ink'}`}>
              Import from Raw Data
            </h3>
            <p className={`text-sm font-body mb-3 ${darkMode ? 'text-white/60' : 'text-theme-muted'}`}>
              Paste character JSON data below.
            </p>
            <textarea
              value={rawImportValue}
              onChange={(e) => setRawImportValue(e.target.value)}
              placeholder='Paste JSON here...'
              className={`flex-1 w-full min-h-[300px] p-3 text-xs font-mono rounded-theme resize-none ${
                darkMode 
                  ? 'bg-white/5 border border-white/30 text-white/80 placeholder-white/30' 
                  : 'bg-gray-50 border-[length:var(--border-width)] border-theme-border text-theme-ink'
              }`}
              autoFocus
            />
            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={() => setShowRawImportModal(false)}
                className={`px-4 py-2 font-body rounded-button transition-colors ${
                  darkMode 
                    ? 'text-white border border-white/30 hover:bg-white/10' 
                    : 'text-theme-ink border-[length:var(--border-width)] border-theme-border hover:bg-theme-accent/20'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  try {
                    const character = JSON.parse(rawImportValue) as Character;
                    if (!character.name || !character.sheets || !Array.isArray(character.sheets)) {
                      alert('Invalid character data format');
                      return;
                    }
                    importCharacter(character, 'raw_json');
                    setShowRawImportModal(false);
                    setRawImportValue('');
                  } catch {
                    alert('Failed to parse JSON data');
                  }
                }}
                className={`px-6 py-2 font-body rounded-button transition-colors font-bold ${
                  darkMode 
                    ? 'bg-white text-black hover:bg-white/80' 
                    : 'bg-theme-accent text-theme-paper hover:bg-theme-accent-hover'
                }`}
              >
                Import
              </button>
            </div>
          </div>
        </>
      )}

      {/* Tutorial Bubble */}
      {tutorialActiveOnPage && <TutorialBubble darkMode={darkMode} />}
      </div>
      
      {/* Privacy Notice Footer - Fixed at bottom */}
      <div className={`fixed bottom-0 left-0 right-0 py-2 text-center ${darkMode ? 'bg-black/80 border-t border-white/10' : 'bg-gray-100/80 border-t border-gray-200'} backdrop-blur-sm`}>
        <p className={`text-xs ${darkMode ? 'text-white/40' : 'text-gray-400'}`}>
          Character designs are shared anonymously to help improve UCS. No images or personal data are stored.
        </p>
      </div>
      
      {/* Gallery Sidebar */}
      <GallerySidebar 
        collapsed={!showGallery} 
        onToggle={() => setShowGallery(false)} 
        darkMode={darkMode}
      />
    </div>
  );
}



