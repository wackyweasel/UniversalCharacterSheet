import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Character, Widget, WidgetType, Sheet, PoolResource, PoolRestoreTarget } from '../types';
import { CharacterPreset } from '../presets';
import { useUndoStore } from './useUndoStore';
import { useTelemetryStore } from './useTelemetryStore';
import { resolveCharacterFormulas, FormulaChange, collectLabels, evaluateFormula } from '../utils/formulaEngine';
import { useTimelineStore } from './useTimelineStore';

type Mode = 'play' | 'edit' | 'vertical' | 'print';
type PresetTelemetrySource = 'builtin_preset' | 'user_preset' | 'unknown';
type ImportTelemetrySource = 'json_file' | 'raw_json' | 'unknown';
type StoreTelemetryCategory = 'character' | 'sheet' | 'widget' | 'template' | 'theme' | 'view';

interface CharacterCreatorRequest {
  initialName: string;
  replaceCharacterId?: string;
}

interface StoreTelemetryEvent {
  eventName: string;
  category: StoreTelemetryCategory;
  characterId?: string | null;
  sheetId?: string | null;
  widgetType?: WidgetType | null;
  source?: string | null;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

// Helper to get the active sheet's widgets from a character
function getActiveSheetWidgets(character: Character): Widget[] {
  const sheet = character.sheets.find(s => s.id === character.activeSheetId);
  return sheet?.widgets || [];
}

// Helper to update the active sheet's widgets
function updateActiveSheetWidgets(character: Character, updateFn: (widgets: Widget[]) => Widget[]): Character {
  return {
    ...character,
    sheets: character.sheets.map(s => 
      s.id === character.activeSheetId 
        ? { ...s, widgets: updateFn(s.widgets) }
        : s
    )
  };
}

// Helper to remap all IDs in a character's sheets/widgets to avoid conflicts
function remapCharacterIds(source: { sheets: Sheet[]; activeSheetId: string }): {
  sheets: Sheet[];
  activeSheetId: string;
} {
  const sheetIdMap = new Map<string, string>();
  const widgetIdMap = new Map<string, string>();
  const groupIdMap = new Map<string, string>();

  // First pass: generate all new IDs
  source.sheets.forEach(sheet => {
    sheetIdMap.set(sheet.id, uuidv4());
    sheet.widgets.forEach(widget => {
      widgetIdMap.set(widget.id, uuidv4());
      if (widget.groupId && !groupIdMap.has(widget.groupId)) {
        groupIdMap.set(widget.groupId, uuidv4());
      }
    });
  });

  // Second pass: create new sheets with remapped IDs
  const newSheets = source.sheets.map(sheet => ({
    ...sheet,
    id: sheetIdMap.get(sheet.id)!,
    widgets: sheet.widgets.map(widget => ({
      ...widget,
      id: widgetIdMap.get(widget.id)!,
      groupId: widget.groupId ? groupIdMap.get(widget.groupId) : undefined,
      attachedTo: widget.attachedTo?.map(id => widgetIdMap.get(id) || id)
    }))
  }));

  return {
    sheets: newSheets,
    activeSheetId: sheetIdMap.get(source.activeSheetId) || newSheets[0]?.id
  };
}

// Migration helper: convert old character format to new sheets format
function migrateCharacter(char: any): Character {
  // If character already has sheets, return as-is
  if (char.sheets && char.sheets.length > 0) {
    return char as Character;
  }
  
  // Migrate: create a default sheet with the old widgets
  const defaultSheet: Sheet = {
    id: uuidv4(),
    name: 'Main',
    widgets: char.widgets || []
  };
  
  return {
    id: char.id,
    name: char.name,
    theme: char.theme,
    sheets: [defaultSheet],
    activeSheetId: defaultSheet.id
  };
}

function recordStoreEvent(
  state: Pick<StoreState, 'characters' | 'transientCharacterIds' | 'activeCharacterId' | 'mode'>,
  event: StoreTelemetryEvent
) {
  const characterId = event.characterId === undefined ? state.activeCharacterId : event.characterId;
  if (characterId && state.transientCharacterIds.includes(characterId)) return;

  const character = characterId ? state.characters.find(c => c.id === characterId) : undefined;

  useTelemetryStore.getState().recordEvent({
    eventName: event.eventName,
    category: event.category,
    characterId: characterId ?? null,
    sheetId: event.sheetId ?? character?.activeSheetId ?? null,
    mode: state.mode,
    widgetType: event.widgetType ?? null,
    source: event.source ?? null,
    metadata: event.metadata,
  });
}

function getPresetCreatedEventName(source: PresetTelemetrySource): string {
  if (source === 'builtin_preset') return 'character_created_from_builtin_preset';
  if (source === 'user_preset') return 'character_created_from_user_preset';
  return 'character_created_from_preset';
}

function getImportEventName(source: ImportTelemetrySource): string {
  if (source === 'json_file') return 'character_imported_json_file';
  if (source === 'raw_json') return 'character_imported_raw_json';
  return 'character_imported';
}

interface StoreState {
  characters: Character[];
  transientCharacterIds: string[];
  activeCharacterId: string | null;
  mode: Mode;
  editingWidgetId: string | null;
  selectedWidgetId: string | null; // For showing edit/delete/attach buttons on mobile
  characterCreatorRequest: CharacterCreatorRequest | null;
  
  // Actions
  createCharacter: (name: string) => void;
  createCharacterFromPreset: (preset: CharacterPreset, name?: string, telemetrySource?: PresetTelemetrySource) => void;
  replaceBlankCharacterFromPreset: (characterId: string, preset: CharacterPreset, name?: string, telemetrySource?: PresetTelemetrySource) => boolean;
  createTransientCharacter: (name: string) => void;
  createTransientCharacterFromPreset: (preset: CharacterPreset, name?: string) => void;
  cleanupTransientCharacters: () => void;
  importCharacter: (character: Character, telemetrySource?: ImportTelemetrySource) => void;
  duplicateCharacter: (id: string) => void;
  selectCharacter: (id: string | null) => void;
  deleteCharacter: (id: string) => void;
  updateCharacterName: (id: string, name: string) => void;
  updateCharacterTheme: (id: string, theme: string) => void;
  requestCharacterCreator: (request: CharacterCreatorRequest) => void;
  clearCharacterCreatorRequest: () => void;
  setMode: (mode: Mode) => void;
  setEditingWidgetId: (id: string | null) => void;
  setSelectedWidgetId: (id: string | null) => void;
  
  // Sheet Actions
  createSheet: (name: string) => void;
  selectSheet: (sheetId: string) => void;
  deleteSheet: (sheetId: string) => void;
  renameSheet: (sheetId: string, name: string) => void;
  
  // Widget Actions (for active character's active sheet)
  addWidget: (type: WidgetType, x: number, y: number, viewport?: { pan: { x: number; y: number }; scale: number; width: number; height: number }) => void;
  cloneWidget: (widgetId: string) => void;
  addWidgetFromTemplate: (template: { type: WidgetType; w?: number; h?: number; data: any }, viewport?: { pan: { x: number; y: number }; scale: number; width: number; height: number }) => void;
  addGroupFromTemplate: (template: { widgets: { type: WidgetType; relativeX: number; relativeY: number; w?: number; h?: number; data: any }[]; attachments: [number, number][] }, viewport?: { pan: { x: number; y: number }; scale: number; width: number; height: number }) => void;
  updateWidgetPosition: (id: string, x: number, y: number) => void;
  updateWidgetPositionNoSnapshot: (id: string, x: number, y: number) => void; // For batch operations
  updateWidgetSize: (id: string, w: number, h: number) => void;
  updateWidgetData: (id: string, data: any) => void;
  removeWidget: (id: string) => void;
  toggleWidgetLock: (id: string) => void;
  reorderWidget: (widgetId: string, newIndex: number) => void;
  moveWidgetToSheet: (widgetId: string, targetSheetId: string) => void;
  
  // Widget Group Actions (for snap+attach)
  attachWidgets: (widgetId1: string, widgetId2: string) => void;
  detachWidgets: (widgetId1: string, widgetId2: string) => void;
  getWidgetsInGroup: (groupId: string) => Widget[];
  moveWidgetGroup: (widgetId: string, deltaX: number, deltaY: number) => void;
  
  // Bulk Group Actions (for group-level operations)
  cloneGroup: (groupId: string) => void;
  removeGroup: (groupId: string) => void;
  toggleGroupLock: (groupId: string) => void;
  moveGroupToSheet: (groupId: string, targetSheetId: string) => void;
  detachAllInGroup: (groupId: string) => void;
  
  // Rest Action (for Rest Button widget)
  performRest: (options: {
    healAmount?: number | 'full';
    poolRestores?: PoolRestoreTarget[];
    clearConditions?: boolean;
    resetSpellSlots?: boolean;
    passTimeSeconds?: number;
  }) => void;
  
  // Undo/Redo Actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Helper to take snapshot before undoable action
  _takeSnapshot: (actionDescription: string) => void;
  
  // Replace character state (used by undo/redo)
  _replaceCharacter: (characterId: string, character: Character) => void;
}

export const useStore = create<StoreState>((set, get) => {
  // Try to load persisted state from localStorage
  const persisted = (() => {
    try {
      const raw = localStorage.getItem('ucs:store');
      if (!raw) return null;
      const data = JSON.parse(raw) as { characters: any[]; activeCharacterId: string | null; mode?: Mode };
      // Migrate all characters to new format
      return {
        characters: data.characters.map(migrateCharacter),
        activeCharacterId: data.activeCharacterId,
        mode: data.mode
      };
    } catch (e) {
      console.error('Failed to load persisted store', e);
      return null;
    }
  })();

  const initialCharacters = persisted?.characters ?? [];
  const initialActive = persisted?.activeCharacterId ?? null;
  const initialMode = persisted?.mode ?? 'play';

  const api: StoreState = {
    characters: initialCharacters,
    transientCharacterIds: [],
    activeCharacterId: initialActive,
    mode: initialMode,
    editingWidgetId: null,
    selectedWidgetId: null,
    characterCreatorRequest: null,

    createCharacter: (name) => set((state) => {
      const defaultSheet: Sheet = {
        id: uuidv4(),
        name: 'Main',
        widgets: []
      };
      const newChar: Character = {
        id: uuidv4(),
        name,
        sheets: [defaultSheet],
        activeSheetId: defaultSheet.id
      };
      recordStoreEvent(state, {
        eventName: 'character_created_blank',
        category: 'character',
        characterId: newChar.id,
        sheetId: defaultSheet.id,
        source: 'blank',
      });
      return { 
        characters: [...state.characters, newChar],
        activeCharacterId: newChar.id,
        mode: 'edit' as const
      };
    }),

    createCharacterFromPreset: (preset, name, telemetrySource = 'unknown') => set((state) => {
      const { sheets: newSheets, activeSheetId } = remapCharacterIds(preset);

      const newChar: Character = {
        id: uuidv4(),
        name: name || preset.name,
        theme: preset.theme,
        sheets: newSheets,
        activeSheetId
      };

      recordStoreEvent(state, {
        eventName: getPresetCreatedEventName(telemetrySource),
        category: 'character',
        characterId: newChar.id,
        sheetId: activeSheetId,
        source: telemetrySource,
        metadata: {
          presetName: preset.name,
          sheetCount: newSheets.length,
          widgetCount: newSheets.reduce((count, sheet) => count + sheet.widgets.length, 0),
        },
      });

      return {
        characters: [...state.characters, newChar],
        activeCharacterId: newChar.id,
        mode: state.mode === 'vertical' ? 'vertical' as const : 'play' as const
      };
    }),

    replaceBlankCharacterFromPreset: (characterId, preset, name, telemetrySource = 'unknown') => {
      const state = get();
      const existingCharacter = state.characters.find((character) => character.id === characterId);
      if (!existingCharacter || existingCharacter.sheets.some((sheet) => sheet.widgets.length > 0)) {
        return false;
      }

      const { sheets: newSheets, activeSheetId } = remapCharacterIds(preset);
      const replacement: Character = {
        id: existingCharacter.id,
        name: name || preset.name,
        theme: preset.theme,
        sheets: newSheets,
        activeSheetId,
      };

      recordStoreEvent(state, {
        eventName: getPresetCreatedEventName(telemetrySource),
        category: 'character',
        characterId: replacement.id,
        sheetId: activeSheetId,
        source: telemetrySource,
        metadata: {
          presetName: preset.name,
          replacedBlankCharacter: true,
          sheetCount: newSheets.length,
          widgetCount: newSheets.reduce((count, sheet) => count + sheet.widgets.length, 0),
        },
      });

      set({
        characters: state.characters.map((character) => character.id === characterId ? replacement : character),
        activeCharacterId: characterId,
        mode: 'play',
        editingWidgetId: null,
        selectedWidgetId: null,
      });
      return true;
    },

    createTransientCharacter: (name) => set((state) => {
      const transientIds = new Set(state.transientCharacterIds);
      state.transientCharacterIds.forEach((id) => {
        useTimelineStore.getState().clearEvents(id);
      });
      const defaultSheet: Sheet = {
        id: uuidv4(),
        name: 'Main',
        widgets: []
      };
      const newChar: Character = {
        id: uuidv4(),
        name,
        sheets: [defaultSheet],
        activeSheetId: defaultSheet.id
      };

      return {
        characters: [...state.characters.filter(c => !transientIds.has(c.id)), newChar],
        transientCharacterIds: [newChar.id],
        activeCharacterId: newChar.id,
        mode: state.mode === 'vertical' ? 'vertical' as const : 'play' as const
      };
    }),

    createTransientCharacterFromPreset: (preset, name) => set((state) => {
      const transientIds = new Set(state.transientCharacterIds);
      state.transientCharacterIds.forEach((id) => {
        useTimelineStore.getState().clearEvents(id);
      });
      const { sheets: newSheets, activeSheetId } = remapCharacterIds(preset);

      const newChar: Character = {
        id: uuidv4(),
        name: name || preset.name,
        theme: preset.theme,
        sheets: newSheets,
        activeSheetId
      };

      return {
        characters: [...state.characters.filter(c => !transientIds.has(c.id)), newChar],
        transientCharacterIds: [newChar.id],
        activeCharacterId: newChar.id,
        mode: state.mode === 'vertical' ? 'vertical' as const : 'play' as const
      };
    }),

    cleanupTransientCharacters: () => set((state) => {
      if (state.transientCharacterIds.length === 0) return state;

      const transientIds = new Set(state.transientCharacterIds);
      state.transientCharacterIds.forEach((id) => {
        useTimelineStore.getState().clearEvents(id);
      });

      return {
        characters: state.characters.filter(c => !transientIds.has(c.id)),
        transientCharacterIds: [],
        activeCharacterId: state.activeCharacterId && transientIds.has(state.activeCharacterId) ? null : state.activeCharacterId,
        editingWidgetId: null,
        selectedWidgetId: null,
      };
    }),

    importCharacter: (character, telemetrySource = 'unknown') => set((state) => {
      const { sheets: newSheets, activeSheetId } = remapCharacterIds(character);

      const newChar: Character = {
        ...character,
        id: uuidv4(),
        name: character.name,
        sheets: newSheets,
        activeSheetId
      };

      recordStoreEvent(state, {
        eventName: getImportEventName(telemetrySource),
        category: 'character',
        characterId: newChar.id,
        sheetId: activeSheetId,
        source: telemetrySource,
        metadata: {
          sheetCount: newSheets.length,
          widgetCount: newSheets.reduce((count, sheet) => count + sheet.widgets.length, 0),
        },
      });

      return {
        characters: [...state.characters, newChar]
      };
    }),

    duplicateCharacter: (id) => set((state) => {
      const character = state.characters.find(c => c.id === id);
      if (!character) return state;

      const { sheets: newSheets, activeSheetId } = remapCharacterIds(character);

      const newChar: Character = {
        ...character,
        id: uuidv4(),
        name: `${character.name} (copy)`,
        sheets: newSheets,
        activeSheetId
      };

      recordStoreEvent(state, {
        eventName: 'character_duplicated',
        category: 'character',
        characterId: newChar.id,
        sheetId: activeSheetId,
        source: 'character_menu',
        metadata: {
          sourceCharacterId: id,
          sheetCount: newSheets.length,
          widgetCount: newSheets.reduce((count, sheet) => count + sheet.widgets.length, 0),
        },
      });

      return {
        characters: [...state.characters, newChar]
      };
    }),

    selectCharacter: (id) => set((state) => {
      const transientIds = new Set(state.transientCharacterIds);
      const shouldCleanupTransients = id === null && transientIds.size > 0;
      if (shouldCleanupTransients) {
        state.transientCharacterIds.forEach((transientId) => {
          useTimelineStore.getState().clearEvents(transientId);
        });
      }

      if (id) {
        const character = state.characters.find(c => c.id === id);
        if (character) {
          recordStoreEvent(state, {
            eventName: 'character_opened',
            category: 'character',
            characterId: id,
            sheetId: character.activeSheetId,
            source: 'character_list',
          });
        }
      }

      const selectedCharacter = id ? state.characters.find(c => c.id === id) : undefined;
      const selectedCharacterIsBlank = selectedCharacter
        ? selectedCharacter.sheets.every((sheet) => sheet.widgets.length === 0)
        : false;

      return {
        characters: shouldCleanupTransients ? state.characters.filter(c => !transientIds.has(c.id)) : state.characters,
        transientCharacterIds: shouldCleanupTransients ? [] : state.transientCharacterIds,
        activeCharacterId: id,
        mode: selectedCharacterIsBlank
          ? 'edit' as const
          : state.mode === 'vertical'
            ? 'vertical' as const
            : 'play' as const,
        editingWidgetId: null,
        selectedWidgetId: null,
      };
    }),

    deleteCharacter: (id) => set((state) => {
      const character = state.characters.find(c => c.id === id);
      if (character) {
        recordStoreEvent(state, {
          eventName: 'character_deleted',
          category: 'character',
          characterId: id,
          sheetId: character.activeSheetId,
          source: 'character_menu',
          metadata: {
            sheetCount: character.sheets.length,
            widgetCount: character.sheets.reduce((count, sheet) => count + sheet.widgets.length, 0),
          },
        });
      }

      return {
        characters: state.characters.filter(c => c.id !== id),
        activeCharacterId: state.activeCharacterId === id ? null : state.activeCharacterId
      };
    }),

    updateCharacterName: (id, name) => set((state) => {
      const character = state.characters.find(c => c.id === id);
      if (character && character.name !== name) {
        recordStoreEvent(state, {
          eventName: 'character_renamed',
          category: 'character',
          characterId: id,
          sheetId: character.activeSheetId,
          source: 'character_name',
        });
      }

      return {
        characters: state.characters.map(c => c.id === id ? { ...c, name } : c)
      };
    }),

    updateCharacterTheme: (id, theme) => set((state) => {
      const character = state.characters.find(c => c.id === id);
      if (character && character.theme !== theme) {
        recordStoreEvent(state, {
          eventName: 'character_theme_changed',
          category: 'theme',
          characterId: id,
          sheetId: character.activeSheetId,
          source: 'theme_selection',
          metadata: { themeId: theme },
        });
      }

      return {
        characters: state.characters.map(c => c.id === id ? { ...c, theme } : c)
      };
    }),

    requestCharacterCreator: (request) => set({ characterCreatorRequest: request }),

    clearCharacterCreatorRequest: () => set({ characterCreatorRequest: null }),

    setMode: (mode) => set((state) => {
      if (state.mode !== mode) {
        recordStoreEvent(state, {
          eventName: 'mode_changed',
          category: 'view',
          source: 'sheet_toolbar',
          metadata: {
            previousMode: state.mode,
            nextMode: mode,
          },
        });
      }

      return { mode, selectedWidgetId: null };
    }),

    setEditingWidgetId: (id) => set({ editingWidgetId: id }),

    setSelectedWidgetId: (id) => set({ selectedWidgetId: id }),

    // Sheet Actions
    createSheet: (name) => set((state) => {
      if (!state.activeCharacterId) return state;
      
      const newSheet: Sheet = {
        id: uuidv4(),
        name,
        widgets: []
      };
      recordStoreEvent(state, {
        eventName: 'sheet_created',
        category: 'sheet',
        sheetId: newSheet.id,
        source: 'sheet_selector',
        metadata: { sheetCount: (state.characters.find(c => c.id === state.activeCharacterId)?.sheets.length ?? 0) + 1 },
      });
      
      return {
        characters: state.characters.map(c => {
          if (c.id === state.activeCharacterId) {
            return {
              ...c,
              sheets: [...c.sheets, newSheet],
              activeSheetId: newSheet.id
            };
          }
          return c;
        })
      };
    }),

    selectSheet: (sheetId) => set((state) => {
      if (!state.activeCharacterId) return state;
      const character = state.characters.find(c => c.id === state.activeCharacterId);
      if (!character || character.activeSheetId === sheetId) return state;

      recordStoreEvent(state, {
        eventName: 'sheet_selected',
        category: 'sheet',
        sheetId,
        source: 'sheet_selector',
        metadata: { previousSheetId: character.activeSheetId },
      });
      
      return {
        characters: state.characters.map(c => {
          if (c.id === state.activeCharacterId) {
            return { ...c, activeSheetId: sheetId };
          }
          return c;
        })
      };
    }),

    deleteSheet: (sheetId) => {
      // Take snapshot before deleting sheet
      get()._takeSnapshot('Delete sheet');
      
      set((state) => {
        if (!state.activeCharacterId) return state;
        const character = state.characters.find(c => c.id === state.activeCharacterId);
        const sheet = character?.sheets.find(s => s.id === sheetId);
        if (character && sheet && character.sheets.length > 1) {
          recordStoreEvent(state, {
            eventName: 'sheet_deleted',
            category: 'sheet',
            sheetId,
            source: 'sheet_selector',
            metadata: { widgetCount: sheet.widgets.length },
          });
        }
        
        return {
          characters: state.characters.map(c => {
            if (c.id !== state.activeCharacterId) return c;
            
            // Don't delete if it's the only sheet
            if (c.sheets.length <= 1) return c;
            
            const newSheets = c.sheets.filter(s => s.id !== sheetId);
            const newActiveSheetId = c.activeSheetId === sheetId 
              ? newSheets[0].id 
              : c.activeSheetId;
            
            return {
              ...c,
              sheets: newSheets,
              activeSheetId: newActiveSheetId
            };
          })
        };
      });
    },

    renameSheet: (sheetId, name) => set((state) => {
      if (!state.activeCharacterId) return state;
      const character = state.characters.find(c => c.id === state.activeCharacterId);
      const sheet = character?.sheets.find(s => s.id === sheetId);
      if (sheet && sheet.name !== name) {
        recordStoreEvent(state, {
          eventName: 'sheet_renamed',
          category: 'sheet',
          sheetId,
          source: 'sheet_selector',
        });
      }
      
      return {
        characters: state.characters.map(c => {
          if (c.id !== state.activeCharacterId) return c;
          
          return {
            ...c,
            sheets: c.sheets.map(s => 
              s.id === sheetId ? { ...s, name } : s
            )
          };
        })
      };
    }),

    addWidget: (type, x, y, viewport) => {
      // Take snapshot before the change
      get()._takeSnapshot('Add widget');
      
      set((state) => {
        if (!state.activeCharacterId) return state;
        
        // Find the active character and get current widgets
        const activeChar = state.characters.find(c => c.id === state.activeCharacterId);
        if (!activeChar) return state;
        
        const currentWidgets = getActiveSheetWidgets(activeChar);
        
        // Calculate smart position
        let finalX = x;
        let finalY = y;
        const GRID_SIZE = 10;
        const DEFAULT_WIDTH = 200;
        const DEFAULT_HEIGHT = 120;
        const GAP = 20;
        
        // Helper to check if a rectangle overlaps with any existing widget
        const overlapsWidget = (testX: number, testY: number, testW: number, testH: number): boolean => {
          return currentWidgets.some(w => {
            const wRight = w.x + (w.w || DEFAULT_WIDTH);
            const wBottom = w.y + (w.h || DEFAULT_HEIGHT);
            const testRight = testX + testW;
            const testBottom = testY + testH;
            return !(testX >= wRight || testRight <= w.x || testY >= wBottom || testBottom <= w.y);
          });
        };
        
        if (viewport) {
          // Calculate visible area in canvas coordinates
          const visibleLeft = -viewport.pan.x / viewport.scale;
          const visibleTop = -viewport.pan.y / viewport.scale;
          const visibleWidth = viewport.width / viewport.scale;
          const visibleHeight = viewport.height / viewport.scale;
          const visibleRight = visibleLeft + visibleWidth;
          const visibleBottom = visibleTop + visibleHeight;
          
          // Add some padding from edges
          const PADDING = 40;
          const searchLeft = Math.max(0, visibleLeft + PADDING);
          const searchTop = Math.max(0, visibleTop + PADDING);
          const searchRight = visibleRight - PADDING - DEFAULT_WIDTH;
          const searchBottom = visibleBottom - PADDING - DEFAULT_HEIGHT;
          
          // Search for first available position in visible area (left to right, top to bottom)
          let found = false;
          const SEARCH_STEP = GRID_SIZE * 2; // Search in steps of 20px for efficiency
          
          for (let testY = searchTop; testY <= searchBottom && !found; testY += SEARCH_STEP) {
            for (let testX = searchLeft; testX <= searchRight && !found; testX += SEARCH_STEP) {
              const snappedX = Math.round(testX / GRID_SIZE) * GRID_SIZE;
              const snappedY = Math.round(testY / GRID_SIZE) * GRID_SIZE;
              
              if (!overlapsWidget(snappedX, snappedY, DEFAULT_WIDTH, DEFAULT_HEIGHT)) {
                finalX = snappedX;
                finalY = snappedY;
                found = true;
              }
            }
          }
          
          // If no space found in visible area, place at center of visible area
          if (!found) {
            finalX = Math.round((visibleLeft + visibleWidth / 2 - DEFAULT_WIDTH / 2) / GRID_SIZE) * GRID_SIZE;
            finalY = Math.round((visibleTop + visibleHeight / 2 - DEFAULT_HEIGHT / 2) / GRID_SIZE) * GRID_SIZE;
          }
        } else if (currentWidgets.length === 0) {
          // No widgets and no viewport - place in center of viewport (roughly)
          finalX = Math.round(400 / GRID_SIZE) * GRID_SIZE;
          finalY = Math.round(300 / GRID_SIZE) * GRID_SIZE;
        } else {
          // Fallback: Find the bounding box of all existing widgets
          const minX = Math.min(...currentWidgets.map(w => w.x));
          const maxX = Math.max(...currentWidgets.map(w => w.x + (w.w || DEFAULT_WIDTH)));
          const minY = Math.min(...currentWidgets.map(w => w.y));
          const maxY = Math.max(...currentWidgets.map(w => w.y + (w.h || DEFAULT_HEIGHT)));
          
          // Place new widget to the right of existing widgets
          finalX = Math.round((maxX + GAP) / GRID_SIZE) * GRID_SIZE;
          finalY = Math.round(minY / GRID_SIZE) * GRID_SIZE;
          
          // If it would be too far right (> 1500px), start a new row below
          if (finalX > 1500) {
            finalX = Math.round(minX / GRID_SIZE) * GRID_SIZE;
            finalY = Math.round((maxY + GAP) / GRID_SIZE) * GRID_SIZE;
          }
        }
        
        const getDefaultLabel = (widgetType: WidgetType): string => {
          const defaultLabels: Record<WidgetType, string> = {
            'NUMBER': 'Trackers',
            'NUMBER_DISPLAY': 'Stats',
            'LIST': 'Inventory',
            'TEXT': 'Notes',
            'CHECKBOX': 'Checklist',
            'HEALTH_BAR': 'Health',
            'DICE_ROLLER': 'Roll',
            'DICE_TRAY': 'Dice Tray',
            'SPELL_SLOT': 'Spell Slots',
            'IMAGE': '',
            'POOL': 'Resources',
            'TOGGLE_GROUP': 'Conditions',
            'TABLE': 'Table',
            'TIME_TRACKER': 'Temporary Effects',
            'FORM': 'Character Info',
            'REST_BUTTON': 'Rest',
            'PROGRESS_BAR': 'Progress',
            'MAP_SKETCHER': 'Map',
            'ROLL_TABLE': 'Random Table',
            'INITIATIVE_TRACKER': 'Initiative Tracker',
            'DECK': 'Deck',
            'TIMER': 'Timer',
            'STEP_DICE': 'Step Dice',
          };
          return defaultLabels[widgetType] || '';
        };

        const newWidget: Widget = {
          id: uuidv4(),
          type,
          x: finalX,
          y: finalY,
          w: DEFAULT_WIDTH,
          h: DEFAULT_HEIGHT,
          data: {
            label: getDefaultLabel(type),
            value: 0,
            items: [],
            text: '',
            ...(type === 'PROGRESS_BAR' ? { showPercentage: false } : {}),
            ...(type === 'POOL' ? {
              poolResources: [{ name: 'Resource 1', max: 5, current: 5, style: 'dots' }],
              showPoolCount: false,
            } : {})
          }
        };

        recordStoreEvent(state, {
          eventName: 'widget_added',
          category: 'widget',
          widgetType: type,
          source: viewport ? 'toolbox_visible_area' : 'toolbox',
          metadata: { x: finalX, y: finalY },
        });

        return {
          characters: state.characters.map(c => {
            if (c.id === state.activeCharacterId) {
              return updateActiveSheetWidgets(c, widgets => [...widgets, newWidget]);
            }
            return c;
          })
        };
      });
    },

    cloneWidget: (widgetId) => {
      // Take snapshot before the change
      get()._takeSnapshot('Clone widget');
      
      set((state) => {
        if (!state.activeCharacterId) return state;
        
        const activeChar = state.characters.find(c => c.id === state.activeCharacterId);
        if (!activeChar) return state;
        
        const currentWidgets = getActiveSheetWidgets(activeChar);
        const sourceWidget = currentWidgets.find(w => w.id === widgetId);
        if (!sourceWidget) return state;
        
        const OFFSET = 30; // Offset the clone slightly from original
        
        const newWidget: Widget = {
          id: uuidv4(),
          type: sourceWidget.type,
          x: sourceWidget.x + OFFSET,
          y: sourceWidget.y + OFFSET,
          w: sourceWidget.w,
          h: sourceWidget.h,
          data: JSON.parse(JSON.stringify(sourceWidget.data)), // Deep clone the data
        };

        recordStoreEvent(state, {
          eventName: 'widget_cloned',
          category: 'widget',
          widgetType: sourceWidget.type,
          source: 'widget_menu',
          metadata: { sourceWidgetId: widgetId },
        });

        return {
          characters: state.characters.map(c => {
            if (c.id === state.activeCharacterId) {
              return updateActiveSheetWidgets(c, widgets => [...widgets, newWidget]);
            }
            return c;
          })
        };
      });
    },

    addWidgetFromTemplate: (template, viewport) => {
      // Take snapshot before the change
      get()._takeSnapshot('Add widget from template');
      
      set((state) => {
        if (!state.activeCharacterId) return state;
        
        const activeChar = state.characters.find(c => c.id === state.activeCharacterId);
        if (!activeChar) return state;
        
        const currentWidgets = getActiveSheetWidgets(activeChar);
        
        // Calculate smart position (same logic as addWidget)
        let finalX = 100;
        let finalY = 100;
        const GRID_SIZE = 10;
        const GAP = 20;
        const DEFAULT_WIDTH = template.w || 200;
        const DEFAULT_HEIGHT = template.h || 120;
        
        // Helper to check if a rectangle overlaps with any existing widget
        const overlapsWidget = (testX: number, testY: number, testW: number, testH: number): boolean => {
          return currentWidgets.some(w => {
            const wRight = w.x + (w.w || 200);
            const wBottom = w.y + (w.h || 120);
            const testRight = testX + testW;
            const testBottom = testY + testH;
            return !(testX >= wRight || testRight <= w.x || testY >= wBottom || testBottom <= w.y);
          });
        };
        
        if (viewport) {
          // Calculate visible area in canvas coordinates
          const visibleLeft = -viewport.pan.x / viewport.scale;
          const visibleTop = -viewport.pan.y / viewport.scale;
          const visibleWidth = viewport.width / viewport.scale;
          const visibleHeight = viewport.height / viewport.scale;
          const visibleRight = visibleLeft + visibleWidth;
          const visibleBottom = visibleTop + visibleHeight;
          
          // Add some padding from edges
          const PADDING = 40;
          const searchLeft = Math.max(0, visibleLeft + PADDING);
          const searchTop = Math.max(0, visibleTop + PADDING);
          const searchRight = visibleRight - PADDING - DEFAULT_WIDTH;
          const searchBottom = visibleBottom - PADDING - DEFAULT_HEIGHT;
          
          // Search for first available position in visible area (left to right, top to bottom)
          let found = false;
          const SEARCH_STEP = GRID_SIZE * 2;
          
          for (let testY = searchTop; testY <= searchBottom && !found; testY += SEARCH_STEP) {
            for (let testX = searchLeft; testX <= searchRight && !found; testX += SEARCH_STEP) {
              const snappedX = Math.round(testX / GRID_SIZE) * GRID_SIZE;
              const snappedY = Math.round(testY / GRID_SIZE) * GRID_SIZE;
              
              if (!overlapsWidget(snappedX, snappedY, DEFAULT_WIDTH, DEFAULT_HEIGHT)) {
                finalX = snappedX;
                finalY = snappedY;
                found = true;
              }
            }
          }
          
          // If no space found in visible area, place at center of visible area
          if (!found) {
            finalX = Math.round((visibleLeft + visibleWidth / 2 - DEFAULT_WIDTH / 2) / GRID_SIZE) * GRID_SIZE;
            finalY = Math.round((visibleTop + visibleHeight / 2 - DEFAULT_HEIGHT / 2) / GRID_SIZE) * GRID_SIZE;
          }
        } else if (currentWidgets.length === 0) {
          finalX = Math.round(400 / GRID_SIZE) * GRID_SIZE;
          finalY = Math.round(300 / GRID_SIZE) * GRID_SIZE;
        } else {
          const minX = Math.min(...currentWidgets.map(w => w.x));
          const maxX = Math.max(...currentWidgets.map(w => w.x + (w.w || 200)));
          const minY = Math.min(...currentWidgets.map(w => w.y));
          const maxY = Math.max(...currentWidgets.map(w => w.y + (w.h || 120)));
          
          finalX = Math.round((maxX + GAP) / GRID_SIZE) * GRID_SIZE;
          finalY = Math.round(minY / GRID_SIZE) * GRID_SIZE;
          
          if (finalX > 1500) {
            finalX = Math.round(minX / GRID_SIZE) * GRID_SIZE;
            finalY = Math.round((maxY + GAP) / GRID_SIZE) * GRID_SIZE;
          }
        }
        
        const newWidget: Widget = {
          id: uuidv4(),
          type: template.type,
          x: finalX,
          y: finalY,
          w: template.w || 200,
          h: template.h || 120,
          data: JSON.parse(JSON.stringify(template.data)), // Deep clone the data
        };

        recordStoreEvent(state, {
          eventName: 'widget_added_from_template',
          category: 'template',
          widgetType: template.type,
          source: 'template_panel',
          metadata: { x: finalX, y: finalY },
        });

        return {
          characters: state.characters.map(c => {
            if (c.id === state.activeCharacterId) {
              return updateActiveSheetWidgets(c, widgets => [...widgets, newWidget]);
            }
            return c;
          })
        };
      });
    },

    addGroupFromTemplate: (template, viewport) => {
      // Take snapshot before the change
      get()._takeSnapshot('Add group from template');
      
      set((state) => {
        if (!state.activeCharacterId) return state;
        
        const activeChar = state.characters.find(c => c.id === state.activeCharacterId);
        if (!activeChar) return state;
        
        const currentWidgets = getActiveSheetWidgets(activeChar);
        
        // Calculate the bounding box of the group template
        let groupWidth = 0;
        let groupHeight = 0;
        template.widgets.forEach(w => {
          const right = w.relativeX + (w.w || 200);
          const bottom = w.relativeY + (w.h || 120);
          groupWidth = Math.max(groupWidth, right);
          groupHeight = Math.max(groupHeight, bottom);
        });
        
        // Calculate smart position (same logic as addWidget)
        let finalX = 100;
        let finalY = 100;
        const GRID_SIZE = 10;
        const GAP = 20;
        
        // Helper to check if a rectangle overlaps with any existing widget
        const overlapsWidget = (testX: number, testY: number, testW: number, testH: number): boolean => {
          return currentWidgets.some(w => {
            const wRight = w.x + (w.w || 200);
            const wBottom = w.y + (w.h || 120);
            const testRight = testX + testW;
            const testBottom = testY + testH;
            return !(testX >= wRight || testRight <= w.x || testY >= wBottom || testBottom <= w.y);
          });
        };
        
        if (viewport) {
          // Calculate visible area in canvas coordinates
          const visibleLeft = -viewport.pan.x / viewport.scale;
          const visibleTop = -viewport.pan.y / viewport.scale;
          const visibleWidth = viewport.width / viewport.scale;
          const visibleHeight = viewport.height / viewport.scale;
          const visibleRight = visibleLeft + visibleWidth;
          const visibleBottom = visibleTop + visibleHeight;
          
          // Add some padding from edges
          const PADDING = 40;
          const searchLeft = Math.max(0, visibleLeft + PADDING);
          const searchTop = Math.max(0, visibleTop + PADDING);
          const searchRight = visibleRight - PADDING - groupWidth;
          const searchBottom = visibleBottom - PADDING - groupHeight;
          
          // Search for first available position in visible area
          let found = false;
          const SEARCH_STEP = GRID_SIZE * 2;
          
          for (let testY = searchTop; testY <= searchBottom && !found; testY += SEARCH_STEP) {
            for (let testX = searchLeft; testX <= searchRight && !found; testX += SEARCH_STEP) {
              const snappedX = Math.round(testX / GRID_SIZE) * GRID_SIZE;
              const snappedY = Math.round(testY / GRID_SIZE) * GRID_SIZE;
              
              if (!overlapsWidget(snappedX, snappedY, groupWidth, groupHeight)) {
                finalX = snappedX;
                finalY = snappedY;
                found = true;
              }
            }
          }
          
          // If no space found in visible area, place at center
          if (!found) {
            finalX = Math.round((visibleLeft + visibleWidth / 2 - groupWidth / 2) / GRID_SIZE) * GRID_SIZE;
            finalY = Math.round((visibleTop + visibleHeight / 2 - groupHeight / 2) / GRID_SIZE) * GRID_SIZE;
          }
        } else if (currentWidgets.length === 0) {
          finalX = Math.round(400 / GRID_SIZE) * GRID_SIZE;
          finalY = Math.round(300 / GRID_SIZE) * GRID_SIZE;
        } else {
          const minX = Math.min(...currentWidgets.map(w => w.x));
          const maxX = Math.max(...currentWidgets.map(w => w.x + (w.w || 200)));
          const minY = Math.min(...currentWidgets.map(w => w.y));
          const maxY = Math.max(...currentWidgets.map(w => w.y + (w.h || 120)));
          
          finalX = Math.round((maxX + GAP) / GRID_SIZE) * GRID_SIZE;
          finalY = Math.round(minY / GRID_SIZE) * GRID_SIZE;
          
          if (finalX > 1500) {
            finalX = Math.round(minX / GRID_SIZE) * GRID_SIZE;
            finalY = Math.round((maxY + GAP) / GRID_SIZE) * GRID_SIZE;
          }
        }
        
        // Generate new IDs for each widget
        const newGroupId = uuidv4();
        const widgetIds = template.widgets.map(() => uuidv4());
        
        // Create the new widgets
        const newWidgets: Widget[] = template.widgets.map((wt, idx) => ({
          id: widgetIds[idx],
          type: wt.type,
          x: finalX + wt.relativeX,
          y: finalY + wt.relativeY,
          w: wt.w || 200,
          h: wt.h || 120,
          groupId: newGroupId,
          data: JSON.parse(JSON.stringify(wt.data)),
        }));
        
        // Set up attachedTo based on the attachments array
        template.attachments.forEach(([idx1, idx2]) => {
          const w1 = newWidgets[idx1];
          const w2 = newWidgets[idx2];
          if (w1 && w2) {
            w1.attachedTo = w1.attachedTo || [];
            w2.attachedTo = w2.attachedTo || [];
            if (!w1.attachedTo.includes(w2.id)) {
              w1.attachedTo.push(w2.id);
            }
            if (!w2.attachedTo.includes(w1.id)) {
              w2.attachedTo.push(w1.id);
            }
          }
        });

        recordStoreEvent(state, {
          eventName: 'widget_group_added_from_template',
          category: 'template',
          source: 'template_panel',
          metadata: {
            widgetCount: newWidgets.length,
            attachmentCount: template.attachments.length,
          },
        });
        
        return {
          characters: state.characters.map(c => {
            if (c.id === state.activeCharacterId) {
              return updateActiveSheetWidgets(c, widgets => [...widgets, ...newWidgets]);
            }
            return c;
          })
        };
      });
    },

    updateWidgetPosition: (id, x, y) => {
      // Take snapshot before the change (for moving widgets)
      get()._takeSnapshot('Move widget');
      
      set((state) => ({
        characters: state.characters.map(c => {
          if (c.id === state.activeCharacterId) {
            return updateActiveSheetWidgets(c, widgets => 
              widgets.map(w => w.id === id ? { ...w, x, y } : w)
            );
          }
          return c;
        })
      }));
    },

    // Version without snapshot for batch operations (like auto-stack)
    updateWidgetPositionNoSnapshot: (id, x, y) => {
      set((state) => ({
        characters: state.characters.map(c => {
          if (c.id === state.activeCharacterId) {
            return updateActiveSheetWidgets(c, widgets => 
              widgets.map(w => w.id === id ? { ...w, x, y } : w)
            );
          }
          return c;
        })
      }));
    },

    updateWidgetSize: (id, w, h) => set((state) => ({
      characters: state.characters.map(c => {
        if (c.id === state.activeCharacterId) {
          return updateActiveSheetWidgets(c, widgets => 
            widgets.map(widget => widget.id === id ? { ...widget, w, h } : widget)
          );
        }
        return c;
      })
    })),

    updateWidgetData: (id, data) => {
      // Take snapshot for widget data changes (interactions and editing)
      get()._takeSnapshot('Update widget');
      
      set((state) => {
        // First, apply primary update to the target widget
        let updatedCharacters = state.characters.map(c => {
          if (c.id === state.activeCharacterId) {
            return updateActiveSheetWidgets(c, widgets => 
              widgets.map(w => w.id === id ? { ...w, data: { ...w.data, ...data } } : w)
            );
          }
          return c;
        });

        // Then, resolve formulas across the entire character
        updatedCharacters = updatedCharacters.map(c => {
          if (c.id === state.activeCharacterId) {
            const resolved = resolveCharacterFormulas(c);
            if (resolved) {
              // Log formula changes to timeline
              const changes = (resolved as any)._formulaChanges as FormulaChange[] | undefined;
              if (changes && changes.length > 0 && state.activeCharacterId) {
                const charId = state.activeCharacterId;
                // Defer timeline logging to avoid state conflicts
                setTimeout(() => {
                  for (const change of changes) {
                    useTimelineStore.getState().addEvent(charId, {
                      widgetLabel: change.widgetLabel,
                      widgetType: 'FORMULA',
                      description: `${change.fieldName}: ${change.oldValue} → ${change.newValue} (${change.formula})`,
                      icon: 'fx',
                    });
                  }
                }, 0);
              }
              // Clean up the temporary _formulaChanges property
              const { _formulaChanges, ...cleanResolved } = resolved as any;
              return cleanResolved;
            }
            return c;
          }
          return c;
        });

        return { characters: updatedCharacters };
      });
    },

    removeWidget: (id) => {
      // Take snapshot before deleting widget
      get()._takeSnapshot('Delete widget');
      
      set((state) => ({
        characters: state.characters.map(c => {
          if (c.id === state.activeCharacterId) {
            const widget = getActiveSheetWidgets(c).find(w => w.id === id);
            if (widget) {
              recordStoreEvent(state, {
                eventName: 'widget_deleted',
                category: 'widget',
                widgetType: widget.type,
                source: 'widget_menu',
                metadata: { widgetId: id },
              });
            }
            return updateActiveSheetWidgets(c, widgets => 
              widgets.filter(w => w.id !== id)
            );
          }
          return c;
        })
      }));
    },

    toggleWidgetLock: (id) => {
      set((state) => ({
        characters: state.characters.map(c => {
          if (c.id === state.activeCharacterId) {
            const widget = getActiveSheetWidgets(c).find(w => w.id === id);
            if (widget) {
              recordStoreEvent(state, {
                eventName: widget.locked ? 'widget_unlocked' : 'widget_locked',
                category: 'widget',
                widgetType: widget.type,
                source: 'widget_menu',
                metadata: { widgetId: id },
              });
            }
            return updateActiveSheetWidgets(c, widgets =>
              widgets.map(w => w.id === id ? { ...w, locked: !w.locked } : w)
            );
          }
          return c;
        })
      }));
    },

    moveWidgetToSheet: (widgetId, targetSheetId) => {
      // Take snapshot before moving widget
      get()._takeSnapshot('Move widget to sheet');
      
      set((state) => {
        if (!state.activeCharacterId) return state;
        
        const character = state.characters.find(c => c.id === state.activeCharacterId);
        if (!character) return state;
        
        // Find the widget in the active sheet
        const activeSheet = character.sheets.find(s => s.id === character.activeSheetId);
        if (!activeSheet) return state;
        
        const widget = activeSheet.widgets.find(w => w.id === widgetId);
        if (!widget) return state;
        
        // Can't move to the same sheet
        if (targetSheetId === character.activeSheetId) return state;
        
        // Check target sheet exists
        const targetSheet = character.sheets.find(s => s.id === targetSheetId);
        if (!targetSheet) return state;

        recordStoreEvent(state, {
          eventName: 'widget_moved_to_sheet',
          category: 'widget',
          widgetType: widget.type,
          sheetId: character.activeSheetId,
          source: 'widget_menu',
          metadata: {
            widgetId,
            targetSheetId,
          },
        });
        
        // Remove widget from attachments and groups when moving
        const widgetToMove = {
          ...widget,
          groupId: undefined,
          attachedTo: undefined,
        };
        
        return {
          characters: state.characters.map(c => {
            if (c.id !== state.activeCharacterId) return c;
            
            return {
              ...c,
              sheets: c.sheets.map(s => {
                if (s.id === character.activeSheetId) {
                  // Remove from source sheet, also clean up references from other widgets
                  return {
                    ...s,
                    widgets: s.widgets
                      .filter(w => w.id !== widgetId)
                      .map(w => ({
                        ...w,
                        attachedTo: w.attachedTo?.filter(id => id !== widgetId),
                      })),
                  };
                }
                if (s.id === targetSheetId) {
                  // Add to target sheet
                  return {
                    ...s,
                    widgets: [...s.widgets, widgetToMove],
                  };
                }
                return s;
              }),
            };
          }),
        };
      });
    },

    reorderWidget: (widgetId, newIndex) => {
      // Take snapshot before reordering (vertical view)
      get()._takeSnapshot('Reorder widget');
      
      set((state) => {
        if (!state.activeCharacterId) return state;
        
        return {
          characters: state.characters.map(c => {
            if (c.id !== state.activeCharacterId) return c;
            
            return updateActiveSheetWidgets(c, widgets => {
              const widgetIndex = widgets.findIndex(w => w.id === widgetId);
              if (widgetIndex === -1) return widgets;
              
              const newWidgets = [...widgets];
              const [removed] = newWidgets.splice(widgetIndex, 1);
              newWidgets.splice(newIndex, 0, removed);
              return newWidgets;
            });
          })
        };
      });
    },

    // Attach two widgets together (create or merge groups)
    attachWidgets: (widgetId1, widgetId2) => {
      // Take snapshot before attaching
      get()._takeSnapshot('Attach widgets');
      
      set((state) => {
        if (!state.activeCharacterId) return state;
        
        return {
          characters: state.characters.map(c => {
            if (c.id !== state.activeCharacterId) return c;
            
            const widgets = getActiveSheetWidgets(c);
            const widget1 = widgets.find(w => w.id === widgetId1);
            const widget2 = widgets.find(w => w.id === widgetId2);
            
            if (!widget1 || !widget2) return c;
            
            // Check if already attached
            if (widget1.attachedTo?.includes(widgetId2)) return c;

            recordStoreEvent(state, {
              eventName: 'widgets_attached',
              category: 'widget',
              widgetType: widget1.type,
              source: 'attachment_button',
              metadata: {
                widgetId1,
                widgetId2,
                widgetType2: widget2.type,
              },
            });
            
            // Determine the group ID to use
            let newGroupId: string;
            if (widget1.groupId && widget2.groupId && widget1.groupId !== widget2.groupId) {
              // Both have different groups - merge widget2's group into widget1's
              newGroupId = widget1.groupId;
              const oldGroupId = widget2.groupId;
              return updateActiveSheetWidgets(c, widgets => 
                widgets.map(w => {
                  if (w.groupId === oldGroupId) {
                    return { ...w, groupId: newGroupId };
                  }
                  if (w.id === widgetId1) {
                    return { ...w, attachedTo: [...(w.attachedTo || []), widgetId2] };
                  }
                  if (w.id === widgetId2) {
                    return { ...w, attachedTo: [...(w.attachedTo || []), widgetId1] };
                  }
                  return w;
                })
              );
            } else if (widget1.groupId) {
              newGroupId = widget1.groupId;
            } else if (widget2.groupId) {
              newGroupId = widget2.groupId;
            } else {
              newGroupId = uuidv4();
            }
            
            return updateActiveSheetWidgets(c, widgets => 
              widgets.map(w => {
                if (w.id === widgetId1) {
                  return { 
                    ...w, 
                    groupId: newGroupId,
                    attachedTo: [...(w.attachedTo || []), widgetId2]
                  };
                }
                if (w.id === widgetId2) {
                  return { 
                    ...w, 
                    groupId: newGroupId,
                    attachedTo: [...(w.attachedTo || []), widgetId1]
                  };
                }
                return w;
              })
            );
          })
        };
      });
    },

    // Detach a widget completely from its group
    detachWidgets: (widgetId1, _widgetId2) => {
      // Take snapshot before detaching
      get()._takeSnapshot('Detach widget');
      
      set((state) => {
        if (!state.activeCharacterId) return state;
        
        return {
          characters: state.characters.map(c => {
            if (c.id !== state.activeCharacterId) return c;
            
            const widgets = getActiveSheetWidgets(c);
            const widget1 = widgets.find(w => w.id === widgetId1);
            
            if (!widget1) return c;
            if (!widget1.groupId) return c;
            
            const groupId = widget1.groupId;
            const widget1Neighbors = widget1.attachedTo || [];

            recordStoreEvent(state, {
              eventName: 'widget_detached_from_group',
              category: 'widget',
              widgetType: widget1.type,
              source: 'widget_menu',
              metadata: {
                widgetId: widgetId1,
                groupId,
                neighborCount: widget1Neighbors.length,
              },
            });
            
            // Remove widget1 from the group entirely
            let updatedWidgets = widgets.map(w => {
              if (w.id === widgetId1) {
                return { 
                  ...w, 
                  groupId: undefined,
                  attachedTo: undefined
                };
              }
              if (widget1Neighbors.includes(w.id)) {
                return { 
                  ...w, 
                  attachedTo: (w.attachedTo || []).filter(id => id !== widgetId1)
                };
              }
              return w;
            });
            
            // Find connected components in the remaining group using BFS
            const remainingGroupWidgetIds = updatedWidgets
              .filter(w => w.groupId === groupId)
              .map(w => w.id);
            
            if (remainingGroupWidgetIds.length === 0) {
              return updateActiveSheetWidgets(c, () => updatedWidgets);
            }
            
            // Build adjacency map
            const adjacency = new Map<string, string[]>();
            for (const wid of remainingGroupWidgetIds) {
              const w = updatedWidgets.find(w => w.id === wid);
              adjacency.set(wid, w?.attachedTo?.filter(id => remainingGroupWidgetIds.includes(id)) || []);
            }
            
            // Find connected components using BFS
            const visited = new Set<string>();
            const components: string[][] = [];
            
            for (const startId of remainingGroupWidgetIds) {
              if (visited.has(startId)) continue;
              
              const component: string[] = [];
              const queue = [startId];
              
              while (queue.length > 0) {
                const currentId = queue.shift()!;
                if (visited.has(currentId)) continue;
                
                visited.add(currentId);
                component.push(currentId);
                
                const neighbors = adjacency.get(currentId) || [];
                for (const neighbor of neighbors) {
                  if (!visited.has(neighbor)) {
                    queue.push(neighbor);
                  }
                }
              }
              
              components.push(component);
            }
            
            // Assign new group IDs based on connected components
            const componentGroupIds = components.map((comp, idx) => {
              if (comp.length <= 1) return undefined;
              if (idx === 0 && components.filter(c => c.length > 1).length <= 1) {
                return groupId;
              }
              return uuidv4();
            });
            
            const widgetToGroupId = new Map<string, string | undefined>();
            components.forEach((comp, idx) => {
              for (const wid of comp) {
                widgetToGroupId.set(wid, componentGroupIds[idx]);
              }
            });
            
            updatedWidgets = updatedWidgets.map(w => {
              if (widgetToGroupId.has(w.id)) {
                const newGid = widgetToGroupId.get(w.id);
                if (!newGid) {
                  return { ...w, groupId: undefined, attachedTo: undefined };
                }
                return { ...w, groupId: newGid };
              }
              return w;
            });
            
            return updateActiveSheetWidgets(c, () => updatedWidgets);
          })
        };
      });
    },

    // Get all widgets in a group (from active sheet)
    getWidgetsInGroup: (groupId) => {
      const state = useStore.getState();
      const character = state.characters.find(c => c.id === state.activeCharacterId);
      if (!character) return [];
      const widgets = getActiveSheetWidgets(character);
      return widgets.filter(w => w.groupId === groupId);
    },

    // Move all widgets in the same group
    moveWidgetGroup: (widgetId, deltaX, deltaY) => {
      // Take snapshot before moving widget group
      get()._takeSnapshot('Move widget');
      
      set((state) => {
        if (!state.activeCharacterId) return state;
        
        const character = state.characters.find(c => c.id === state.activeCharacterId);
        if (!character) return state;
        
        const widgets = getActiveSheetWidgets(character);
        const widget = widgets.find(w => w.id === widgetId);
        
        if (!widget || !widget.groupId) {
          return {
            characters: state.characters.map(c => {
              if (c.id === state.activeCharacterId) {
                return updateActiveSheetWidgets(c, widgets => 
                  widgets.map(w => 
                    w.id === widgetId ? { ...w, x: w.x + deltaX, y: w.y + deltaY } : w
                  )
                );
              }
              return c;
            })
          };
        }
        
        const groupId = widget.groupId;
        return {
          characters: state.characters.map(c => {
            if (c.id === state.activeCharacterId) {
              return updateActiveSheetWidgets(c, widgets => 
                widgets.map(w => 
                  w.groupId === groupId ? { ...w, x: w.x + deltaX, y: w.y + deltaY } : w
                )
              );
            }
            return c;
          })
        };
      });
    },

    // Clone all widgets in a group
    cloneGroup: (groupId) => {
      get()._takeSnapshot('Clone group');
      
      set((state) => {
        if (!state.activeCharacterId) return state;
        
        const character = state.characters.find(c => c.id === state.activeCharacterId);
        if (!character) return state;
        
        const widgets = getActiveSheetWidgets(character);
        const groupWidgets = widgets.filter(w => w.groupId === groupId);
        
        if (groupWidgets.length === 0) return state;
        
        const OFFSET = 30;
        const newGroupId = uuidv4();
        
        // Create a mapping from old IDs to new IDs
        const idMapping = new Map<string, string>();
        groupWidgets.forEach(w => {
          idMapping.set(w.id, uuidv4());
        });
        
        // Clone all widgets with new IDs and updated attachedTo references
        const clonedWidgets: Widget[] = groupWidgets.map(w => ({
          id: idMapping.get(w.id)!,
          type: w.type,
          x: w.x + OFFSET,
          y: w.y + OFFSET,
          w: w.w,
          h: w.h,
          groupId: newGroupId,
          attachedTo: w.attachedTo?.map(id => idMapping.get(id)).filter((id): id is string => id !== undefined),
          locked: w.locked,
          data: JSON.parse(JSON.stringify(w.data)),
        }));

        recordStoreEvent(state, {
          eventName: 'widget_group_cloned',
          category: 'widget',
          source: 'group_menu',
          metadata: {
            groupId,
            widgetCount: groupWidgets.length,
          },
        });
        
        return {
          characters: state.characters.map(c => {
            if (c.id === state.activeCharacterId) {
              return updateActiveSheetWidgets(c, widgets => [...widgets, ...clonedWidgets]);
            }
            return c;
          })
        };
      });
    },

    // Remove all widgets in a group
    removeGroup: (groupId) => {
      get()._takeSnapshot('Delete group');
      
      set((state) => {
        if (!state.activeCharacterId) return state;
        const character = state.characters.find(c => c.id === state.activeCharacterId);
        const groupWidgets = character ? getActiveSheetWidgets(character).filter(w => w.groupId === groupId) : [];
        if (groupWidgets.length > 0) {
          recordStoreEvent(state, {
            eventName: 'widget_group_deleted',
            category: 'widget',
            source: 'group_menu',
            metadata: {
              groupId,
              widgetCount: groupWidgets.length,
            },
          });
        }
        
        return {
          characters: state.characters.map(c => {
            if (c.id === state.activeCharacterId) {
              return updateActiveSheetWidgets(c, widgets => 
                widgets.filter(w => w.groupId !== groupId)
              );
            }
            return c;
          })
        };
      });
    },

    // Toggle lock for all widgets in a group
    toggleGroupLock: (groupId) => {
      set((state) => {
        if (!state.activeCharacterId) return state;
        
        const character = state.characters.find(c => c.id === state.activeCharacterId);
        if (!character) return state;
        
        const widgets = getActiveSheetWidgets(character);
        const groupWidgets = widgets.filter(w => w.groupId === groupId);
        
        // Check if any widget in the group is unlocked - if so, lock all; otherwise unlock all
        const anyUnlocked = groupWidgets.some(w => !w.locked);
        const newLockState = anyUnlocked;

        if (groupWidgets.length > 0) {
          recordStoreEvent(state, {
            eventName: newLockState ? 'widget_group_locked' : 'widget_group_unlocked',
            category: 'widget',
            source: 'group_menu',
            metadata: {
              groupId,
              widgetCount: groupWidgets.length,
            },
          });
        }
        
        return {
          characters: state.characters.map(c => {
            if (c.id === state.activeCharacterId) {
              return updateActiveSheetWidgets(c, widgets =>
                widgets.map(w => w.groupId === groupId ? { ...w, locked: newLockState } : w)
              );
            }
            return c;
          })
        };
      });
    },

    // Move all widgets in a group to another sheet
    moveGroupToSheet: (groupId, targetSheetId) => {
      get()._takeSnapshot('Move group to sheet');
      
      set((state) => {
        if (!state.activeCharacterId) return state;
        
        const character = state.characters.find(c => c.id === state.activeCharacterId);
        if (!character) return state;
        
        const activeSheet = character.sheets.find(s => s.id === character.activeSheetId);
        if (!activeSheet) return state;
        
        // Can't move to the same sheet
        if (targetSheetId === character.activeSheetId) return state;
        
        // Check target sheet exists
        const targetSheet = character.sheets.find(s => s.id === targetSheetId);
        if (!targetSheet) return state;
        
        // Get all widgets in the group
        const widgetsToMove = activeSheet.widgets.filter(w => w.groupId === groupId);
        if (widgetsToMove.length === 0) return state;

        recordStoreEvent(state, {
          eventName: 'widget_group_moved_to_sheet',
          category: 'widget',
          sheetId: character.activeSheetId,
          source: 'group_menu',
          metadata: {
            groupId,
            targetSheetId,
            widgetCount: widgetsToMove.length,
          },
        });
        
        const widgetIdsToMove = new Set(widgetsToMove.map(w => w.id));
        
        return {
          characters: state.characters.map(c => {
            if (c.id !== state.activeCharacterId) return c;
            
            return {
              ...c,
              sheets: c.sheets.map(s => {
                if (s.id === character.activeSheetId) {
                  // Remove from source sheet, also clean up references from other widgets
                  return {
                    ...s,
                    widgets: s.widgets
                      .filter(w => !widgetIdsToMove.has(w.id))
                      .map(w => ({
                        ...w,
                        attachedTo: w.attachedTo?.filter(id => !widgetIdsToMove.has(id)),
                      })),
                  };
                }
                if (s.id === targetSheetId) {
                  // Add to target sheet (keeping group structure intact)
                  return {
                    ...s,
                    widgets: [...s.widgets, ...widgetsToMove],
                  };
                }
                return s;
              }),
            };
          }),
        };
      });
    },

    // Detach all widgets in a group (dissolve the group)
    detachAllInGroup: (groupId) => {
      get()._takeSnapshot('Detach all in group');
      
      set((state) => {
        if (!state.activeCharacterId) return state;
        const character = state.characters.find(c => c.id === state.activeCharacterId);
        const groupWidgets = character ? getActiveSheetWidgets(character).filter(w => w.groupId === groupId) : [];
        if (groupWidgets.length > 0) {
          recordStoreEvent(state, {
            eventName: 'widget_group_detached_all',
            category: 'widget',
            source: 'group_menu',
            metadata: {
              groupId,
              widgetCount: groupWidgets.length,
            },
          });
        }
        
        return {
          characters: state.characters.map(c => {
            if (c.id === state.activeCharacterId) {
              return updateActiveSheetWidgets(c, widgets =>
                widgets.map(w => {
                  if (w.groupId === groupId) {
                    return { ...w, groupId: undefined, attachedTo: undefined };
                  }
                  return w;
                })
              );
            }
            return c;
          })
        };
      });
    },
    
    // Perform rest action on all relevant widgets
    performRest: (options) => {
      // Take snapshot before performing rest (affects multiple widgets)
      get()._takeSnapshot('Rest');
      
      set((state) => {
        if (!state.activeCharacterId) return state;
        
        const { healAmount, clearConditions, resetSpellSlots, passTimeSeconds, poolRestores } = options;
        
        // Build a lookup of pool restore targets keyed by widget id
        const poolRestoreMap = new Map<string, PoolRestoreTarget[]>();
        (poolRestores || []).forEach(target => {
          const list = poolRestoreMap.get(target.widgetId) || [];
          list.push(target);
          poolRestoreMap.set(target.widgetId, list);
        });
        
        // Labels for evaluating per-pool restore formulas
        const activeChar = state.characters.find(c => c.id === state.activeCharacterId);
        const restoreLabels = activeChar ? collectLabels(activeChar) : {};
        
        // Resolve the flat restore amount for a target (formula overrides amount when set)
        const resolveRestoreAmount = (target: PoolRestoreTarget): number => {
          if (target.amountFormula) {
            const computed = evaluateFormula(target.amountFormula, restoreLabels);
            if (computed !== null) return Math.max(0, Math.round(computed));
          }
          return target.amount ?? 0;
        };
        
        // Apply pool restores to a POOL widget (works on any sheet, targeted by id)
        const applyPoolRestore = (w: Widget): Widget => {
          if (w.type !== 'POOL') return w;
          const targets = poolRestoreMap.get(w.id);
          if (!targets || targets.length === 0) return w;
          
          const poolResources = w.data.poolResources || [];
          if (poolResources.length > 0) {
            // Multi-resource mode — match each target by resource index
            const newResources = poolResources.map((r: PoolResource, idx: number) => {
              const target = targets.find(t => t.resourceIndex === idx || (idx === 0 && t.resourceIndex === -1));
              if (!target || r.currentFormula) return r; // skip unselected or formula-driven
              const newCurrent = target.mode === 'full'
                ? r.max
                : Math.min(r.max, (r.current ?? 0) + resolveRestoreAmount(target));
              return { ...r, current: newCurrent };
            });
            return { ...w, data: { ...w.data, poolResources: newResources } };
          } else {
            // Legacy single pool mode (resourceIndex === -1)
            const target = targets.find(t => t.resourceIndex === -1);
            if (!target) return w;
            const fieldFormulas = (w.data.fieldFormulas as Record<string, string> | undefined);
            if (fieldFormulas?.currentPool) return w; // skip formula-driven pool
            const maxPool = w.data.maxPool ?? 5;
            const currentPool = w.data.currentPool ?? 0;
            const newCurrent = target.mode === 'full'
              ? maxPool
              : Math.min(maxPool, currentPool + resolveRestoreAmount(target));
            return { ...w, data: { ...w.data, currentPool: newCurrent } };
          }
        };
        
        return {
          characters: state.characters.map(c => {
            if (c.id !== state.activeCharacterId) return c;
            return {
              ...c,
              sheets: c.sheets.map(sheet => {
                const isActiveSheet = sheet.id === c.activeSheetId;
                return {
                  ...sheet,
                  widgets: sheet.widgets.map(w => {
                    // Pool restores can target widgets on any sheet
                    const pooled = applyPoolRestore(w);
                    if (pooled !== w) return pooled;
                    
                    // The remaining effects only apply to the active sheet
                    if (!isActiveSheet) return w;
                    
                    // Handle Health Bar widgets
                    if (w.type === 'HEALTH_BAR' && healAmount !== undefined) {
                      const currentValue = w.data.currentValue ?? 0;
                      const maxValue = w.data.maxValue ?? 10;
                      
                      let newValue: number;
                      if (healAmount === 'full') {
                        newValue = maxValue;
                      } else {
                        newValue = Math.min(maxValue, currentValue + healAmount);
                      }
                      
                      return { ...w, data: { ...w.data, currentValue: newValue } };
                    }
                    
                    // Handle Condition widgets (TOGGLE_GROUP)
                    if (w.type === 'TOGGLE_GROUP' && clearConditions) {
                      const toggleItems = w.data.toggleItems || [];
                      const clearedItems = toggleItems.map((item: { name: string; active: boolean }) => ({ ...item, active: false }));
                      return { ...w, data: { ...w.data, toggleItems: clearedItems } };
                    }
                    
                    // Handle Spell Slot widgets
                    if (w.type === 'SPELL_SLOT' && resetSpellSlots) {
                      const spellLevels = w.data.spellLevels || [];
                      const resetLevels = spellLevels.map((level: { level: number; max: number; used: number }) => ({ ...level, used: 0 }));
                      return { ...w, data: { ...w.data, spellLevels: resetLevels } };
                    }
                    
                    // Handle Time Tracker widgets
                    if (w.type === 'TIME_TRACKER' && passTimeSeconds !== undefined && passTimeSeconds > 0) {
                      const timedEffects = w.data.timedEffects || [];
                      const roundMode = w.data.roundMode || false;
                      // In round mode, passTimeSeconds represents rounds (1 second = 1 round)
                      const amountToPass = roundMode ? passTimeSeconds : passTimeSeconds;
                      const updatedEffects = timedEffects.map((effect: { name: string; remainingSeconds: number }) => ({
                        ...effect,
                        remainingSeconds: Math.max(0, effect.remainingSeconds - amountToPass)
                      }));
                      return { ...w, data: { ...w.data, timedEffects: updatedEffects } };
                    }
                    
                    return w;
                  })
                };
              })
            };
          })
        };
      });
    },
    
    // Undo/Redo implementations
    _takeSnapshot: (actionDescription) => {
      const state = get();
      if (!state.activeCharacterId) return;
      
      const character = state.characters.find(c => c.id === state.activeCharacterId);
      if (!character) return;
      
      useUndoStore.getState().takeSnapshot(state.activeCharacterId, character, actionDescription);
    },
    
    _replaceCharacter: (characterId, character) => set((state) => ({
      characters: state.characters.map(c => c.id === characterId ? character : c)
    })),
    
    undo: () => {
      const state = get();
      if (!state.activeCharacterId) return;
      
      const currentCharacter = state.characters.find(c => c.id === state.activeCharacterId);
      if (!currentCharacter) return;
      
      const undoStore = useUndoStore.getState();
      undoStore.setIsUndoRedoing(true);
      
      const restoredCharacter = undoStore.undo(state.activeCharacterId, currentCharacter);
      if (restoredCharacter) {
        get()._replaceCharacter(state.activeCharacterId, restoredCharacter);
      }
      
      undoStore.setIsUndoRedoing(false);
    },
    
    redo: () => {
      const state = get();
      if (!state.activeCharacterId) return;
      
      const currentCharacter = state.characters.find(c => c.id === state.activeCharacterId);
      if (!currentCharacter) return;
      
      const undoStore = useUndoStore.getState();
      undoStore.setIsUndoRedoing(true);
      
      const restoredCharacter = undoStore.redo(state.activeCharacterId, currentCharacter);
      if (restoredCharacter) {
        get()._replaceCharacter(state.activeCharacterId, restoredCharacter);
      }
      
      undoStore.setIsUndoRedoing(false);
    },
    
    canUndo: () => {
      const state = get();
      if (!state.activeCharacterId) return false;
      return useUndoStore.getState().canUndo(state.activeCharacterId);
    },
    
    canRedo: () => {
      const state = get();
      if (!state.activeCharacterId) return false;
      return useUndoStore.getState().canRedo(state.activeCharacterId);
    },
  };

  return api;
});

// Subscribe to store changes and persist state to localStorage with debounce
{
  let saveTimeout: number | null = null;
  (useStore as any).subscribe(() => {
    if (saveTimeout) window.clearTimeout(saveTimeout);
    saveTimeout = window.setTimeout(() => {
      try {
        const state = (useStore as any).getState();
        const transientIds = new Set(state.transientCharacterIds ?? []);
        const persistedCharacters = state.characters.filter((character: Character) => !transientIds.has(character.id));
        const activeCharacterId = state.activeCharacterId && transientIds.has(state.activeCharacterId) ? null : state.activeCharacterId;
        const data = { characters: persistedCharacters, activeCharacterId, mode: activeCharacterId ? state.mode : 'play' };
        localStorage.setItem('ucs:store', JSON.stringify(data));
        
        // Refresh storage warning after successful save
        import('./useStorageWarningStore').then(m => m.useStorageWarningStore.getState().refresh()).catch(() => {});
        
        // Send telemetry for active character (rate-limited to once per 24h)
        if (activeCharacterId) {
          const activeCharacter = persistedCharacters.find((c: Character) => c.id === activeCharacterId);
          if (activeCharacter) {
            useTelemetryStore.getState().sendTelemetry(activeCharacter);
          }
        }
      } catch (e) {
        console.error('Failed to persist store', e);
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          import('./useStorageWarningStore').then(m => m.useStorageWarningStore.getState().reportSaveFailure());
        }
      }
    }, 150);
  });
}
