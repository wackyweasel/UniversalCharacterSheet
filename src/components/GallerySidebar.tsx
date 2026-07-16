import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useUserPresetStore, type UserPreset } from '../store/useUserPresetStore';
import { useCustomThemeStore, type CustomTheme } from '../store/useCustomThemeStore';
import { useTemplateStore, type AnyTemplate } from '../store/useTemplateStore';
import { useGallery, submitToGallery, GalleryPreset, GalleryTheme, GalleryTemplate } from '../hooks/useGallery';
import { IMAGE_TEXTURES, getShadowStyleCSS, getTextureCSS, isImageTexture } from '../store/useThemeStore';
import { v4 as uuidv4 } from 'uuid';
import GalleryShareModal from './GalleryShareModal';
import { TUTORIAL_STEPS, useTutorialStore } from '../store/useTutorialStore';
import { DotsVerticalIcon, XIcon } from './icons';
import { useTelemetryStore } from '../store/useTelemetryStore';
import type { Character } from '../types';
import type { CharacterPreset } from '../presets';

interface GallerySidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  darkMode: boolean;
}

type TabType = 'presets' | 'themes' | 'templates';
type GalleryView = 'browse' | 'library';
type UserDataType = 'preset' | 'theme' | 'template';
type ImportSource = 'json_file' | 'raw_json';

const categoryDetails: Record<TabType, { label: string; description: string }> = {
  presets: {
    label: 'Presets',
    description: 'Complete character sheets ready to use as a starting point.',
  },
  themes: {
    label: 'Themes',
    description: 'Visual styles that change colors, type, texture, and borders.',
  },
  templates: {
    label: 'Templates',
    description: 'Reusable widgets or widget groups you can add while building.',
  },
};

const fallbackNames: Record<UserDataType, string> = {
  preset: 'Imported Preset',
  theme: 'Imported Theme',
  template: 'Imported Template',
};

function getUserDataTypeLabel(type: UserDataType): string {
  return type === 'preset' ? 'preset' : type === 'theme' ? 'theme' : 'template';
}

function getUserDataTypePluralLabel(type: UserDataType): string {
  return type === 'preset' ? 'presets' : type === 'theme' ? 'themes' : 'templates';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getCleanName(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function isCharacterPresetData(value: unknown): value is CharacterPreset {
  return isRecord(value)
    && typeof value.name === 'string'
    && Array.isArray(value.sheets)
    && typeof value.activeSheetId === 'string';
}

function getImportedPreset(value: unknown): { name: string; preset: CharacterPreset; theme?: string } | null {
  if (isRecord(value) && isCharacterPresetData(value.preset)) {
    const theme = typeof value.theme === 'string'
      ? value.theme
      : typeof value.preset.theme === 'string'
        ? value.preset.theme
        : undefined;

    return {
      name: getCleanName(value.name, value.preset.name),
      preset: value.preset,
      theme,
    };
  }

  if (isCharacterPresetData(value)) {
    return {
      name: getCleanName(value.name, fallbackNames.preset),
      preset: value,
      theme: typeof value.theme === 'string' ? value.theme : undefined,
    };
  }

  return null;
}

function isCustomThemeData(value: unknown): value is CustomTheme {
  return isRecord(value)
    && typeof value.name === 'string'
    && isRecord(value.colors)
    && isRecord(value.fonts)
    && typeof value.borderRadius === 'string'
    && typeof value.buttonRadius === 'string'
    && typeof value.borderWidth === 'string';
}

function getImportedTheme(value: unknown): CustomTheme | null {
  const theme = isRecord(value) && isCustomThemeData(value.theme) ? value.theme : value;
  return isCustomThemeData(theme) ? theme : null;
}

function isTemplateData(value: unknown): value is AnyTemplate {
  if (!isRecord(value) || typeof value.name !== 'string') return false;

  if (value.isGroup === true) {
    return Array.isArray(value.widgets) && Array.isArray(value.attachments);
  }

  return typeof value.type === 'string' && 'data' in value;
}

function getImportedTemplate(value: unknown): AnyTemplate | null {
  const template = isRecord(value) && isTemplateData(value.template) ? value.template : value;
  return isTemplateData(template) ? template : null;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'export';
}

function downloadJsonFile(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function GallerySidebar({ collapsed, onToggle, darkMode }: GallerySidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>('presets');
  const [activeView, setActiveView] = useState<GalleryView>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [openImportMenu, setOpenImportMenu] = useState<UserDataType | null>(null);
  const [openActionMenu, setOpenActionMenu] = useState<{ type: UserDataType; id: string } | null>(null);
  const [rawImportTarget, setRawImportTarget] = useState<UserDataType | null>(null);
  const [rawImportValue, setRawImportValue] = useState('');
  const conceptsRef = useRef<HTMLDivElement>(null);
  const manageDataRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
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
  const addImportedTemplate = useTemplateStore((state) => state.addImportedTemplate);
  const removeTemplate = useTemplateStore((state) => state.removeTemplate);
  
  // Gallery data
  const { manifest, themeData, loading, error, refresh, downloadPreset, downloadTheme, downloadTemplate } = useGallery();

  useEffect(() => {
    if (isCurrentTutorialStep('various-gallery-manage')) {
      setActiveView('library');
    }
    if (isCurrentTutorialStep('various-gallery-concepts') || isCurrentTutorialStep('various-gallery-download')) {
      setActiveView('browse');
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
  }, [tutorialStep, collapsed, activeView]);

  useEffect(() => {
    if (collapsed) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (rawImportTarget || deleteTarget || showShareModal) return;

      if (event.key === 'Escape') {
        onToggle();
        return;
      }

      if (event.key === 'Tab' && panelRef.current) {
        const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        )).filter((element) => element.offsetParent !== null);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [collapsed, deleteTarget, onToggle, rawImportTarget, showShareModal]);

  useEffect(() => {
    if (collapsed) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const focusTimer = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(focusTimer);
      previousFocusRef.current?.focus();
    };
  }, [collapsed]);

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
      addImportedTemplate({ ...template, id: uuidv4(), createdAt: Date.now() });
      recordTelemetryEvent({
        eventName: 'gallery_downloaded_template',
        category: 'gallery',
        source: 'gallery_sidebar',
        metadata: { itemId: item.id },
      });
      setDownloadSuccess(item.id);
      setTimeout(() => setDownloadSuccess(null), 2000);
    }
    setDownloadingId(null);
  };

  const importUserData = (type: UserDataType, data: unknown, source: ImportSource): boolean => {
    if (type === 'preset') {
      const importedPreset = getImportedPreset(data);
      if (!importedPreset) return false;

      const theme = importedPreset.theme ?? importedPreset.preset.theme;
      const character: Character = {
        ...importedPreset.preset,
        id: uuidv4(),
        theme,
      };
      addUserPreset(character, importedPreset.name, Boolean(theme));
    } else if (type === 'theme') {
      const importedTheme = getImportedTheme(data);
      if (!importedTheme) return false;

      addCustomTheme({
        ...importedTheme,
        id: uuidv4(),
        name: getCleanName(importedTheme.name, fallbackNames.theme),
      });
    } else {
      const importedTemplate = getImportedTemplate(data);
      if (!importedTemplate) return false;

      addImportedTemplate({
        ...importedTemplate,
        id: uuidv4(),
        name: getCleanName(importedTemplate.name, fallbackNames.template),
        createdAt: Date.now(),
      } as AnyTemplate);
    }

    recordTelemetryEvent({
      eventName: `gallery_imported_${type}`,
      category: type === 'theme' ? 'theme' : 'gallery',
      source: 'gallery_sidebar',
      metadata: { importSource: source },
    });

    return true;
  };

  const handleImportFromFile = (event: React.ChangeEvent<HTMLInputElement>, type: UserDataType) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      try {
        const data = JSON.parse(readerEvent.target?.result as string);
        if (!importUserData(type, data, 'json_file')) {
          alert(`Invalid ${getUserDataTypeLabel(type)} file format`);
        }
      } catch (error) {
        alert(`Failed to parse ${getUserDataTypeLabel(type)} file`);
        console.error(error);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleRawImport = () => {
    if (!rawImportTarget) return;

    try {
      const data = JSON.parse(rawImportValue);
      if (!importUserData(rawImportTarget, data, 'raw_json')) {
        alert(`Invalid ${getUserDataTypeLabel(rawImportTarget)} data format`);
        return;
      }
      setRawImportTarget(null);
      setRawImportValue('');
    } catch {
      alert('Failed to parse JSON data');
    }
  };

  const closeRawImportModal = () => {
    setRawImportTarget(null);
    setRawImportValue('');
  };

  const handleExportUserData = (type: UserDataType, id: string) => {
    let data: UserPreset | CustomTheme | AnyTemplate | null = null;
    let name = fallbackNames[type];

    if (type === 'preset') {
      const preset = userPresets.find(item => item.id === id);
      if (preset) {
        data = preset;
        name = preset.name;
      }
    } else if (type === 'theme') {
      const theme = customThemes.find(item => item.id === id);
      if (theme) {
        data = theme;
        name = theme.name;
      }
    } else {
      const template = templates.find(item => item.id === id);
      if (template) {
        data = template;
        name = template.name;
      }
    }

    if (!data) return;

    downloadJsonFile(data, `ucs-${getUserDataTypeLabel(type)}-${sanitizeFilename(name)}.json`);
    recordTelemetryEvent({
      eventName: `gallery_exported_${type}`,
      category: type === 'theme' ? 'theme' : 'gallery',
      source: 'gallery_sidebar',
      metadata: { itemId: id },
    });
    setOpenActionMenu(null);
  };
  
  const baseButtonClass = darkMode
    ? 'bg-black text-white border border-white/30 hover:bg-white/10'
    : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100';
    
  const menuClass = darkMode
    ? 'bg-gray-950 border border-white/20 text-white'
    : 'bg-white border border-gray-200 text-gray-800';

  const menuItemClass = darkMode
    ? 'hover:bg-white/10'
    : 'hover:bg-gray-100';

  const renderImportButton = (type: UserDataType) => (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpenActionMenu(null);
          setOpenImportMenu(openImportMenu === type ? null : type);
        }}
        className={`text-xs px-2 py-1 rounded transition-colors whitespace-nowrap ${baseButtonClass}`}
        aria-haspopup="menu"
        aria-expanded={openImportMenu === type}
      >
        Import
      </button>
      {openImportMenu === type && (
        <div
          role="menu"
          className={`absolute right-0 top-full mt-1 min-w-[150px] rounded-lg shadow-lg overflow-hidden z-[70] animate-dropdown-in ${menuClass}`}
        >
          <label
            role="menuitem"
            className={`w-full px-3 py-2 text-left text-xs flex items-center transition-colors cursor-pointer ${menuItemClass}`}
          >
            From File
            <input
              type="file"
              accept=".json,application/json"
              onChange={(event) => {
                handleImportFromFile(event, type);
                setOpenImportMenu(null);
              }}
              className="hidden"
            />
          </label>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setRawImportTarget(type);
              setRawImportValue('');
              setOpenImportMenu(null);
            }}
            className={`w-full px-3 py-2 text-left text-xs transition-colors ${menuItemClass}`}
          >
            From Raw Data
          </button>
        </div>
      )}
    </div>
  );

  const renderActionMenu = (type: UserDataType, id: string, name: string) => {
    const isOpen = openActionMenu?.type === type && openActionMenu.id === id;

    return (
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => {
            setOpenImportMenu(null);
            setOpenActionMenu(isOpen ? null : { type, id });
          }}
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
            darkMode
              ? 'bg-black/70 text-white border border-white/20 hover:bg-black'
              : 'bg-white/90 text-gray-700 border border-gray-300 hover:bg-white'
          }`}
          aria-label={`Actions for ${name}`}
          aria-haspopup="menu"
          aria-expanded={isOpen}
        >
          <DotsVerticalIcon className="w-4 h-4" />
        </button>
        {isOpen && (
          <div
            role="menu"
            className={`absolute right-0 top-full mt-1 min-w-[120px] rounded-lg shadow-lg overflow-hidden z-[80] animate-dropdown-in ${menuClass}`}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpenActionMenu(null);
                handleOpenShareModal(type, id);
              }}
              className={`w-full px-3 py-2 text-left text-xs transition-colors ${menuItemClass}`}
            >
              Share
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleExportUserData(type, id)}
              className={`w-full px-3 py-2 text-left text-xs transition-colors ${menuItemClass}`}
            >
              Export
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpenActionMenu(null);
                handleDeleteUserData(type, id, name);
              }}
              className="w-full px-3 py-2 text-left text-xs text-red-500 transition-colors hover:bg-red-500/10"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    );
  };

  const activeDataType: UserDataType = activeTab === 'presets'
    ? 'preset'
    : activeTab === 'themes'
      ? 'theme'
      : 'template';
  const totalLocalAssets = userPresets.length + customThemes.length + templates.length;
  const communityItems: Array<GalleryPreset | GalleryTheme | GalleryTemplate> = manifest ? manifest[activeTab] : [];
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredCommunityItems = normalizedSearch
    ? communityItems.filter((item) => `${item.name} ${item.author} ${item.description}`.toLowerCase().includes(normalizedSearch))
    : communityItems;

  const getCommunityCount = (tab: TabType) => manifest?.[tab].length || 0;
  const getLocalCount = (tab: TabType) => tab === 'presets'
    ? userPresets.length
    : tab === 'themes'
      ? customThemes.length
      : templates.length;

  const selectView = (view: GalleryView) => {
    setActiveView(view);
    setOpenImportMenu(null);
    setOpenActionMenu(null);
  };

  const selectCategory = (tab: TabType) => {
    setActiveTab(tab);
    setSearchQuery('');
    setOpenImportMenu(null);
    setOpenActionMenu(null);
  };

  const handleAddCommunityItem = (item: GalleryPreset | GalleryTheme | GalleryTemplate) => {
    if (activeTab === 'presets') {
      void handleDownloadPreset(item as GalleryPreset);
    } else if (activeTab === 'themes') {
      void handleDownloadTheme(item as GalleryTheme);
    } else {
      void handleDownloadTemplate(item as GalleryTemplate);
    }
  };

  const isCommunityItemSaved = (item: GalleryPreset | GalleryTheme | GalleryTemplate) => {
    if (activeTab === 'presets') {
      return userPresets.some((preset) => preset.name === item.name || preset.name === `${item.name} (Gallery)`);
    }
    if (activeTab === 'themes') {
      const downloadedThemeName = themeData[item.id]?.name;
      return customThemes.some((theme) => theme.name === item.name || (downloadedThemeName && theme.name === downloadedThemeName));
    }
    return templates.some((template) => template.name === item.name);
  };

  const renderThemeCard = (
    key: string,
    theme: CustomTheme,
    name: string,
    subtitle: string,
    description: string | undefined,
    action: ReactNode,
    elevated = false,
  ) => {
    const textureKey = theme.cardTexture || 'none';
    const hasImageTexture = isImageTexture(textureKey);
    const textureCSS = hasImageTexture
      ? 'none'
      : getTextureCSS(textureKey, theme.textureColor, theme.textureOpacity);
    const shadowCSS = getShadowStyleCSS(theme.shadowStyle || 'hard', theme.colors.glow || 'transparent');
    const themeVariables = {
      '--color-shadow': theme.colors.shadow,
      '--color-border': theme.colors.border,
    } as CSSProperties;

    return (
      <article
        key={key}
        className={`relative min-h-[84px] ${elevated ? 'z-30' : ''}`}
        style={{ borderRadius: theme.borderRadius || '8px', ...themeVariables }}
      >
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            backgroundColor: theme.colors.paper,
            backgroundImage: textureCSS,
            border: `${theme.borderWidth || '2px'} ${theme.borderStyle || 'solid'} ${theme.colors.border}`,
            borderRadius: theme.borderRadius || '8px',
            boxShadow: shadowCSS,
          }}
        >
          {hasImageTexture && (
            <div className="absolute inset-0" style={{ backgroundColor: theme.colors.paper }}>
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${IMAGE_TEXTURES[textureKey]})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'grayscale(100%)',
                  opacity: theme.textureOpacity ?? 0.15,
                  mixBlendMode: 'overlay',
                }}
              />
            </div>
          )}
        </div>
        <div
          className="relative p-3"
          style={{ color: theme.colors.ink, fontFamily: theme.fonts?.body }}
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h4
                className="font-bold text-sm truncate"
                style={{ color: theme.colors.ink, fontFamily: theme.fonts?.heading }}
              >
                {name}
              </h4>
              <p className="text-[11px] mt-0.5" style={{ color: theme.colors.muted || theme.colors.ink }}>{subtitle}</p>
            </div>
            {action}
          </div>
          {description && (
            <p className="text-xs leading-relaxed mt-2 line-clamp-2" style={{ color: theme.colors.ink, opacity: 0.72 }}>
              {description}
            </p>
          )}
        </div>
      </article>
    );
  };

  const renderLocalAssetRow = (type: UserDataType, id: string, name: string) => (
    <div
      key={id}
      className={`relative flex items-center min-h-14 p-3 rounded-lg border transition-colors ${
        darkMode ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]' : 'bg-white border-gray-200 hover:border-gray-300'
      } ${openActionMenu?.type === type && openActionMenu.id === id ? 'z-30' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm truncate">{name}</p>
        <p className={`text-[11px] capitalize ${darkMode ? 'text-white/40' : 'text-gray-500'}`}>Saved {getUserDataTypeLabel(type)}</p>
      </div>
      {renderActionMenu(type, id, name)}
    </div>
  );

  const renderLocalAssets = () => {
    if (activeTab === 'presets') {
      return userPresets.map((preset) => renderLocalAssetRow('preset', preset.id, preset.name));
    }
    if (activeTab === 'themes') {
      return customThemes.map((theme) => renderThemeCard(
        theme.id,
        theme,
        theme.name,
        'Saved theme',
        undefined,
        renderActionMenu('theme', theme.id, theme.name),
        openActionMenu?.type === 'theme' && openActionMenu.id === theme.id,
      ));
    }
    return templates.map((template) => renderLocalAssetRow('template', template.id, template.name));
  };

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

      {/* Raw Data Import Modal */}
      {rawImportTarget && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[60] animate-fade-in"
            onClick={closeRawImportModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="raw-data-import-title"
            className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] p-6 rounded-lg shadow-xl w-[90vw] max-w-[600px] max-h-[80vh] flex flex-col animate-fade-in ${darkMode ? 'bg-gray-900 text-white border border-white/20' : 'bg-white text-gray-900 border border-gray-200'}`}
          >
            <h3 id="raw-data-import-title" className="text-lg font-bold mb-2">
              Import {getUserDataTypeLabel(rawImportTarget)} from Raw Data
            </h3>
            <p className={`text-sm mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              Paste {getUserDataTypeLabel(rawImportTarget)} JSON data below.
            </p>
            <textarea
              value={rawImportValue}
              onChange={(event) => setRawImportValue(event.target.value)}
              placeholder="Paste JSON here..."
              className={`flex-1 w-full min-h-[260px] p-3 text-xs font-mono rounded resize-none ${
                darkMode
                  ? 'bg-white/5 border border-white/30 text-white/80 placeholder-white/30'
                  : 'bg-gray-50 border border-gray-300 text-gray-900'
              }`}
              autoFocus
            />
            <div className="flex gap-2 justify-end mt-5">
              <button
                type="button"
                onClick={closeRawImportModal}
                className={`px-4 py-2 rounded transition-colors ${baseButtonClass}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRawImport}
                className="px-4 py-2 rounded font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Import
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-[60] animate-fade-in" 
            onClick={() => setDeleteTarget(null)}
          />
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-data-title"
            className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] p-6 rounded-lg shadow-xl w-[90vw] max-w-[400px] animate-fade-in ${darkMode ? 'bg-gray-900 text-white border border-white/20' : 'bg-white text-gray-900 border border-gray-200'}`}
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
                className={`px-4 py-2 rounded transition-colors ${baseButtonClass}`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteUserData}
                className="px-4 py-2 rounded font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
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
          className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-40 animate-fade-in"
          onClick={onToggle}
        />
      )}

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="discover-title"
        aria-hidden={collapsed}
        className={`fixed right-0 top-0 bottom-0 w-[94vw] max-w-[520px] z-50 flex flex-col overflow-hidden border-l shadow-2xl transition-transform duration-300 ease-in-out ${
          collapsed ? 'translate-x-full invisible pointer-events-none' : 'translate-x-0 visible'
        } ${darkMode ? 'bg-gray-950 text-white border-white/15' : 'bg-gray-50 text-gray-950 border-gray-200'}`}
      >
        {/* Header */}
        <div className={`flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b ${darkMode ? 'border-white/15' : 'border-gray-200'}`}>
          <div className="min-w-0">
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>UCS Community</p>
            <h2 id="discover-title" className="font-heading text-2xl font-bold mt-0.5">Discover</h2>
            <p className={`font-body text-xs mt-1 ${darkMode ? 'text-white/45' : 'text-gray-500'}`}>Find shared assets or manage the ones saved on this device.</p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onToggle}
            className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-lg border transition-colors ${
              darkMode ? 'border-white/20 text-white/70 hover:bg-white/10 hover:text-white' : 'border-gray-300 text-gray-600 hover:bg-white hover:text-gray-950'
            }`}
            aria-label="Close Discover"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Primary task switcher */}
        <div className={`grid grid-cols-2 gap-1 p-1 mx-4 mt-4 rounded-xl ${darkMode ? 'bg-white/[0.06]' : 'bg-gray-200/70'}`} role="tablist" aria-label="Discover sections">
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'browse'}
            onClick={() => selectView('browse')}
            className={`h-10 rounded-lg font-body text-sm font-semibold transition-colors ${
              activeView === 'browse'
                ? darkMode ? 'bg-white text-black shadow-sm' : 'bg-white text-blue-800 shadow-sm'
                : darkMode ? 'text-white/55 hover:text-white' : 'text-gray-600 hover:text-gray-950'
            }`}
          >
            Browse community
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'library'}
            onClick={() => selectView('library')}
            className={`h-10 rounded-lg font-body text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
              activeView === 'library'
                ? darkMode ? 'bg-white text-black shadow-sm' : 'bg-white text-blue-800 shadow-sm'
                : darkMode ? 'text-white/55 hover:text-white' : 'text-gray-600 hover:text-gray-950'
            }`}
          >
            My library
            <span className={`min-w-5 h-5 px-1 rounded-full text-[10px] flex items-center justify-center ${
              activeView === 'library'
                ? darkMode ? 'bg-black/10 text-black' : 'bg-blue-100 text-blue-800'
                : darkMode ? 'bg-white/10 text-white/60' : 'bg-gray-300/70 text-gray-600'
            }`}>{totalLocalAssets}</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {activeView === 'browse' ? (
            <div className="space-y-4">
              <div ref={conceptsRef} data-tutorial="gallery-concepts">
                <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Community asset type">
                  {(Object.keys(categoryDetails) as TabType[]).map((tab) => {
                    const detail = categoryDetails[tab];
                    const selected = activeTab === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => selectCategory(tab)}
                        className={`h-12 px-3 rounded-lg border flex items-center justify-between gap-2 transition-colors ${
                          selected
                            ? darkMode ? 'bg-blue-500/15 border-blue-400 text-white' : 'bg-blue-50 border-blue-500 text-blue-950'
                            : darkMode ? 'bg-white/[0.03] border-white/10 text-white/55 hover:bg-white/[0.06]' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        <span className="font-body text-xs font-semibold">{detail.label}</span>
                        <span className={`font-body text-[10px] ${selected ? darkMode ? 'text-blue-200' : 'text-blue-700' : darkMode ? 'text-white/35' : 'text-gray-400'}`}>{getCommunityCount(tab)}</span>
                      </button>
                    );
                  })}
                </div>
                <p className={`font-body text-xs mt-2 ${darkMode ? 'text-white/45' : 'text-gray-500'}`}>{categoryDetails[activeTab].description}</p>
              </div>

              <div className="flex gap-2">
                <label className="relative flex-1">
                  <span className="sr-only">Search community {activeTab}</span>
                  <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-white/35' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={`Search ${activeTab}…`}
                    className={`w-full h-11 pl-9 pr-3 rounded-lg border font-body text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode ? 'bg-white/[0.04] border-white/15 text-white placeholder-white/30' : 'bg-white border-gray-300 text-gray-950 placeholder-gray-400'
                    }`}
                  />
                </label>
                <button
                  type="button"
                  onClick={refresh}
                  aria-label="Refresh community gallery"
                  className={`w-11 h-11 shrink-0 rounded-lg border flex items-center justify-center text-lg transition-colors ${
                    darkMode ? 'border-white/15 text-white/55 hover:bg-white/10 hover:text-white' : 'bg-white border-gray-300 text-gray-500 hover:text-gray-950'
                  }`}
                >
                  ↻
                </button>
              </div>

              <div ref={downloadRef} data-tutorial="gallery-download">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h3 className="font-heading font-bold">Community {categoryDetails[activeTab].label}</h3>
                  {!loading && manifest && (
                    <span className={`font-body text-[11px] ${darkMode ? 'text-white/35' : 'text-gray-500'}`}>
                      {filteredCommunityItems.length}{normalizedSearch ? ` of ${communityItems.length}` : ''}
                    </span>
                  )}
                </div>

                {loading && (
                  <div className={`rounded-xl border text-center py-12 ${darkMode ? 'border-white/10 text-white/45' : 'border-gray-200 text-gray-500'}`}>
                    <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2" />
                    <p className="font-body text-sm">Loading community assets…</p>
                  </div>
                )}

                {error && !manifest && (
                  <div className={`rounded-xl border text-center p-6 ${darkMode ? 'border-red-400/25 bg-red-500/5' : 'border-red-200 bg-red-50'}`}>
                    <p className="font-body text-sm text-red-500">{error}</p>
                    <button type="button" onClick={refresh} className={`mt-3 px-3 py-2 rounded-lg font-body text-sm ${baseButtonClass}`}>Try again</button>
                  </div>
                )}

                {manifest && !loading && filteredCommunityItems.length === 0 && (
                  <div className={`rounded-xl border text-center p-8 ${darkMode ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-white'}`}>
                    <p className="font-heading font-bold">No {activeTab} found</p>
                    <p className={`font-body text-xs mt-1 ${darkMode ? 'text-white/40' : 'text-gray-500'}`}>Try a different search.</p>
                    {normalizedSearch && (
                      <button type="button" onClick={() => setSearchQuery('')} className={`font-body text-xs font-semibold mt-3 hover:underline ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Clear search</button>
                    )}
                  </div>
                )}

                {manifest && !loading && filteredCommunityItems.length > 0 && (
                  <div className="space-y-2">
                    {filteredCommunityItems.map((item) => {
                      const theme = activeTab === 'themes' ? themeData[item.id] : undefined;
                      const isSaved = isCommunityItemSaved(item);
                      const isAdding = downloadingId === item.id;
                      const actionLabel = isAdding ? 'Adding…' : isSaved || downloadSuccess === item.id ? 'Saved ✓' : 'Add';
                      const actionAriaLabel = isSaved ? `${item.name} is saved in My Library` : `Add ${item.name} to My Library`;

                      if (activeTab === 'themes' && theme) {
                        return renderThemeCard(
                          item.id,
                          theme,
                          item.name,
                          `by ${item.author}`,
                          item.description,
                          <button
                            type="button"
                            onClick={() => handleAddCommunityItem(item)}
                            disabled={isSaved || isAdding}
                            aria-label={actionAriaLabel}
                            className="min-w-[68px] h-9 px-3 font-body text-xs font-bold transition-opacity hover:opacity-85 disabled:cursor-default"
                            style={{
                              backgroundColor: theme.colors.accent,
                              color: theme.colors.paper,
                              border: `1px solid ${theme.colors.accent}`,
                              borderRadius: theme.buttonRadius || '4px',
                              opacity: isSaved ? 0.72 : 1,
                            }}
                          >
                            {actionLabel}
                          </button>,
                        );
                      }

                      return (
                        <article key={item.id} className={`p-3 rounded-xl border ${darkMode ? 'bg-white/[0.03] border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                          <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-heading font-bold text-sm truncate">{item.name}</h4>
                              <p className={`font-body text-[11px] mt-0.5 ${darkMode ? 'text-white/40' : 'text-gray-500'}`}>by {item.author}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddCommunityItem(item)}
                              disabled={isSaved || isAdding}
                              aria-label={actionAriaLabel}
                              className={`min-w-[68px] h-9 px-3 rounded-lg font-body text-xs font-bold transition-colors ${
                                isSaved || downloadSuccess === item.id
                                  ? darkMode ? 'bg-green-400/10 text-green-300 border border-green-400/25' : 'bg-green-50 text-green-700 border border-green-200'
                                  : darkMode ? 'bg-white text-black hover:bg-white/85' : 'bg-blue-700 text-white hover:bg-blue-800'
                              } disabled:cursor-default`}
                            >
                              {actionLabel}
                            </button>
                          </div>
                          {item.description && (
                            <p className={`font-body text-xs leading-relaxed mt-2 line-clamp-2 ${darkMode ? 'text-white/50' : 'text-gray-600'}`}>{item.description}</p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div ref={manageDataRef} data-tutorial="gallery-manage-data" className="space-y-5">
              <div>
                <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Local asset type">
                  {(Object.keys(categoryDetails) as TabType[]).map((tab) => {
                    const detail = categoryDetails[tab];
                    const selected = activeTab === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => selectCategory(tab)}
                        className={`h-14 px-3 rounded-lg border flex flex-col items-center justify-center transition-colors ${
                          selected
                            ? darkMode ? 'bg-blue-500/15 border-blue-400 text-white' : 'bg-blue-50 border-blue-500 text-blue-950'
                            : darkMode ? 'bg-white/[0.03] border-white/10 text-white/55 hover:bg-white/[0.06]' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        <span className="font-heading text-base font-bold leading-none">{getLocalCount(tab)}</span>
                        <span className="font-body text-[10px] mt-1">{detail.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-heading text-lg font-bold">My {categoryDetails[activeTab].label}</h3>
                    <p className={`font-body text-xs mt-0.5 ${darkMode ? 'text-white/40' : 'text-gray-500'}`}>Import, share, export, or remove saved {activeTab}.</p>
                  </div>
                  {renderImportButton(activeDataType)}
                </div>

                {getLocalCount(activeTab) === 0 ? (
                  <div className={`rounded-xl border text-center p-8 ${darkMode ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-white'}`}>
                    <p className="font-heading font-bold">No saved {activeTab}</p>
                    <p className={`font-body text-xs mt-1 ${darkMode ? 'text-white/40' : 'text-gray-500'}`}>Add one from the community or import your own.</p>
                    <button type="button" onClick={() => selectView('browse')} className={`font-body text-xs font-semibold mt-3 hover:underline ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Browse community {activeTab}</button>
                  </div>
                ) : (
                  <div className="space-y-2">{renderLocalAssets()}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
