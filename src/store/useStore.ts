import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Character, Widget, WidgetType, Sheet } from '../types';

type Mode = 'play' | 'edit';

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

interface StoreState {
  characters: Character[];
  activeCharacterId: string | null;
  mode: Mode;
  editingWidgetId: string | null;
  selectedWidgetId: string | null; // For showing edit/delete/attach buttons on mobile
  
  // Actions
  createCharacter: (name: string) => void;
  importCharacter: (character: Character) => void;
  selectCharacter: (id: string | null) => void;
  deleteCharacter: (id: string) => void;
  updateCharacterName: (id: string, name: string) => void;
  updateCharacterTheme: (id: string, theme: string) => void;
  setMode: (mode: Mode) => void;
  setEditingWidgetId: (id: string | null) => void;
  setSelectedWidgetId: (id: string | null) => void;
  
  // Sheet Actions
  createSheet: (name: string) => void;
  selectSheet: (sheetId: string) => void;
  deleteSheet: (sheetId: string) => void;
  renameSheet: (sheetId: string, name: string) => void;
  
  // Widget Actions (for active character's active sheet)
  addWidget: (type: WidgetType, x: number, y: number) => void;
  updateWidgetPosition: (id: string, x: number, y: number) => void;
  updateWidgetSize: (id: string, w: number, h: number) => void;
  updateWidgetData: (id: string, data: any) => void;
  removeWidget: (id: string) => void;
  
  // Widget Group Actions (for snap+attach)
  attachWidgets: (widgetId1: string, widgetId2: string) => void;
  detachWidgets: (widgetId1: string, widgetId2: string) => void;
  getWidgetsInGroup: (groupId: string) => Widget[];
  moveWidgetGroup: (widgetId: string, deltaX: number, deltaY: number) => void;
}

export const useStore = create<StoreState>((set) => {
  // Try to load persisted state from localStorage
  const persisted = (() => {
    try {
      const raw = localStorage.getItem('ucs:store');
      if (!raw) return null;
      const data = JSON.parse(raw) as { characters: any[]; activeCharacterId: string | null };
      // Migrate all characters to new format
      return {
        characters: data.characters.map(migrateCharacter),
        activeCharacterId: data.activeCharacterId
      };
    } catch (e) {
      console.error('Failed to load persisted store', e);
      return null;
    }
  })();

  const initialCharacters = persisted?.characters ?? [];
  const initialActive = persisted?.activeCharacterId ?? null;

  const api: StoreState = {
    characters: initialCharacters,
    activeCharacterId: initialActive,
    mode: 'play',
    editingWidgetId: null,
    selectedWidgetId: null,

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
      return { 
        characters: [...state.characters, newChar],
        activeCharacterId: newChar.id 
      };
    }),

    importCharacter: (character) => set((state) => {
      // Generate new IDs to avoid conflicts
      const newCharId = uuidv4();
      const sheetIdMap = new Map<string, string>();
      const widgetIdMap = new Map<string, string>();
      const groupIdMap = new Map<string, string>();

      // Create new sheets with new IDs
      const newSheets = character.sheets.map(sheet => {
        const newSheetId = uuidv4();
        sheetIdMap.set(sheet.id, newSheetId);
        
        // Create new widgets with new IDs
        const newWidgets = sheet.widgets.map(widget => {
          const newWidgetId = uuidv4();
          widgetIdMap.set(widget.id, newWidgetId);
          
          // Handle group IDs
          let newGroupId = widget.groupId;
          if (widget.groupId) {
            if (!groupIdMap.has(widget.groupId)) {
              groupIdMap.set(widget.groupId, uuidv4());
            }
            newGroupId = groupIdMap.get(widget.groupId);
          }
          
          return {
            ...widget,
            id: newWidgetId,
            groupId: newGroupId,
            attachedTo: widget.attachedTo?.map(id => widgetIdMap.get(id) || id)
          };
        });
        
        // Second pass to update attachedTo references
        newWidgets.forEach(widget => {
          if (widget.attachedTo) {
            widget.attachedTo = widget.attachedTo.map(id => widgetIdMap.get(id) || id);
          }
        });
        
        return {
          ...sheet,
          id: newSheetId,
          widgets: newWidgets
        };
      });

      const newChar: Character = {
        ...character,
        id: newCharId,
        name: character.name,
        sheets: newSheets,
        activeSheetId: sheetIdMap.get(character.activeSheetId) || newSheets[0]?.id
      };

      return {
        characters: [...state.characters, newChar]
      };
    }),

    selectCharacter: (id) => set({ activeCharacterId: id }),

    deleteCharacter: (id) => set((state) => ({
      characters: state.characters.filter(c => c.id !== id),
      activeCharacterId: state.activeCharacterId === id ? null : state.activeCharacterId
    })),

    updateCharacterName: (id, name) => set((state) => ({
      characters: state.characters.map(c => c.id === id ? { ...c, name } : c)
    })),

    updateCharacterTheme: (id, theme) => set((state) => ({
      characters: state.characters.map(c => c.id === id ? { ...c, theme } : c)
    })),

    setMode: (mode) => set({ mode, selectedWidgetId: null }),

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
      
      return {
        characters: state.characters.map(c => {
          if (c.id === state.activeCharacterId) {
            return { ...c, activeSheetId: sheetId };
          }
          return c;
        })
      };
    }),

    deleteSheet: (sheetId) => set((state) => {
      if (!state.activeCharacterId) return state;
      
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
    }),

    renameSheet: (sheetId, name) => set((state) => {
      if (!state.activeCharacterId) return state;
      
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

    addWidget: (type, x, y) => set((state) => {
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
      
      if (currentWidgets.length === 0) {
        // No widgets - place in center of viewport (roughly)
        // Use a reasonable center position
        finalX = Math.round(400 / GRID_SIZE) * GRID_SIZE;
        finalY = Math.round(300 / GRID_SIZE) * GRID_SIZE;
      } else {
        // Find the bounding box of all existing widgets
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
      
      const newWidget: Widget = {
        id: uuidv4(),
        type,
        x: finalX,
        y: finalY,
        w: DEFAULT_WIDTH,
        h: DEFAULT_HEIGHT,
        data: {
          label: 'New Widget',
          value: 0,
          items: [],
          text: ''
        }
      };

      return {
        characters: state.characters.map(c => {
          if (c.id === state.activeCharacterId) {
            return updateActiveSheetWidgets(c, widgets => [...widgets, newWidget]);
          }
          return c;
        })
      };
    }),

    updateWidgetPosition: (id, x, y) => set((state) => ({
      characters: state.characters.map(c => {
        if (c.id === state.activeCharacterId) {
          return updateActiveSheetWidgets(c, widgets => 
            widgets.map(w => w.id === id ? { ...w, x, y } : w)
          );
        }
        return c;
      })
    })),

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

    updateWidgetData: (id, data) => set((state) => ({
      characters: state.characters.map(c => {
        if (c.id === state.activeCharacterId) {
          return updateActiveSheetWidgets(c, widgets => 
            widgets.map(w => w.id === id ? { ...w, data: { ...w.data, ...data } } : w)
          );
        }
        return c;
      })
    })),

    removeWidget: (id) => set((state) => ({
      characters: state.characters.map(c => {
        if (c.id === state.activeCharacterId) {
          return updateActiveSheetWidgets(c, widgets => 
            widgets.filter(w => w.id !== id)
          );
        }
        return c;
      })
    })),

    // Attach two widgets together (create or merge groups)
    attachWidgets: (widgetId1, widgetId2) => set((state) => {
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
    }),

    // Detach a widget completely from its group
    detachWidgets: (widgetId1, _widgetId2) => set((state) => {
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
    }),

    // Get all widgets in a group (from active sheet)
    getWidgetsInGroup: (groupId) => {
      const state = useStore.getState();
      const character = state.characters.find(c => c.id === state.activeCharacterId);
      if (!character) return [];
      const widgets = getActiveSheetWidgets(character);
      return widgets.filter(w => w.groupId === groupId);
    },

    // Move all widgets in the same group
    moveWidgetGroup: (widgetId, deltaX, deltaY) => set((state) => {
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
    }),
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
        const data = { characters: state.characters, activeCharacterId: state.activeCharacterId };
        localStorage.setItem('ucs:store', JSON.stringify(data));
      } catch (e) {
        console.error('Failed to persist store', e);
      }
    }, 150);
  });
}
