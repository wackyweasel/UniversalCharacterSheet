import { useEffect, useRef, useState } from 'react';
import { useUserPresetStore, type UserPreset } from '../store/useUserPresetStore';
import { useCustomThemeStore, type CustomTheme } from '../store/useCustomThemeStore';
import { useTemplateStore, type AnyTemplate } from '../store/useTemplateStore';
import { useGallery, submitToGallery, GalleryPreset, GalleryTheme, GalleryTemplate } from '../hooks/useGallery';
import { IMAGE_TEXTURES, isImageTexture, getShadowStyleCSS } from '../store/useThemeStore';
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
type UserDataType = 'preset' | 'theme' | 'template';
type ImportSource = 'json_file' | 'raw_json';

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
  const [shareExpanded, setShareExpanded] = useState(false);
  const [browseExpanded, setBrowseExpanded] = useState(true);
  const [openImportMenu, setOpenImportMenu] = useState<UserDataType | null>(null);
  const [openActionMenu, setOpenActionMenu] = useState<{ type: UserDataType; id: string } | null>(null);
  const [rawImportTarget, setRawImportTarget] = useState<UserDataType | null>(null);
  const [rawImportValue, setRawImportValue] = useState('');
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
  const addImportedTemplate = useTemplateStore((state) => state.addImportedTemplate);
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
    
  const cardClass = darkMode
    ? 'bg-black/50 border border-white/20'
    : 'bg-white border border-gray-200';

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
          className="fixed inset-0 bg-black/30 z-40 animate-fade-in"
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
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${baseButtonClass}`}
            aria-label="Close gallery"
          >
            <XIcon className="w-5 h-5" />
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
          <div ref={manageDataRef} className={`relative rounded-lg ${cardClass}`} data-tutorial="gallery-manage-data">
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
                  Import, export, delete, or share your custom-made presets, templates, and themes with the community.
                </p>

                {/* My Presets */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-gray-500">My Presets</h4>
                    {renderImportButton('preset')}
                  </div>
                  {userPresets.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No presets saved yet</p>
                  ) : (
                    <div className="space-y-1">
                      {userPresets.map((preset) => (
                        <div key={preset.id} className={`relative flex items-center justify-between p-2 rounded ${darkMode ? 'bg-white/5' : 'bg-gray-100'} ${openActionMenu?.type === 'preset' && openActionMenu.id === preset.id ? 'z-30' : ''}`}>
                          <span className="text-sm truncate flex-1">{preset.name}</span>
                          <div className="ml-2">
                            {renderActionMenu('preset', preset.id, preset.name)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* My Themes */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-gray-500">My Themes</h4>
                    {renderImportButton('theme')}
                  </div>
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
                            className={`${openActionMenu?.type === 'theme' && openActionMenu.id === theme.id ? 'relative z-30' : 'relative'}`}
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
                                overflow: 'hidden',
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
                              <div className="ml-2">
                                {renderActionMenu('theme', theme.id, theme.name)}
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
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-gray-500">My Templates</h4>
                    {renderImportButton('template')}
                  </div>
                  {templates.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No templates saved yet</p>
                  ) : (
                    <div className="space-y-1">
                      {templates.map((template) => (
                        <div key={template.id} className={`relative flex items-center justify-between p-2 rounded ${darkMode ? 'bg-white/5' : 'bg-gray-100'} ${openActionMenu?.type === 'template' && openActionMenu.id === template.id ? 'z-30' : ''}`}>
                          <span className="text-sm truncate flex-1">{template.name}</span>
                          <div className="ml-2">
                            {renderActionMenu('template', template.id, template.name)}
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
