import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Character, Widget, WidgetType } from '../types';

type Mode = 'play' | 'edit';

interface StoreState {
  characters: Character[];
  activeCharacterId: string | null;
  mode: Mode;
  editingWidgetId: string | null;
  selectedWidgetId: string | null; // For showing edit/delete/attach buttons on mobile
  
  // Actions
  createCharacter: (name: string) => void;
  selectCharacter: (id: string | null) => void;
  deleteCharacter: (id: string) => void;
  updateCharacterName: (id: string, name: string) => void;
  updateCharacterTheme: (id: string, theme: string) => void;
  setMode: (mode: Mode) => void;
  setEditingWidgetId: (id: string | null) => void;
  setSelectedWidgetId: (id: string | null) => void;
  
  // Widget Actions (for active character)
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
      return JSON.parse(raw) as { characters: Character[]; activeCharacterId: string | null };
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
      const newChar: Character = {
        id: uuidv4(),
        name,
        widgets: []
      };
      return { 
        characters: [...state.characters, newChar],
        activeCharacterId: newChar.id 
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

    addWidget: (type, x, y) => set((state) => {
      if (!state.activeCharacterId) return state;
      
      const newWidget: Widget = {
        id: uuidv4(),
        type,
        x,
        y,
        w: 200, // Default width (grid-aligned: 200 = 10 * 20)
        h: 120, // Default height (grid-aligned: 120 = 6 * 20)
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
            return { ...c, widgets: [...c.widgets, newWidget] };
          }
          return c;
        })
      };
    }),

    updateWidgetPosition: (id, x, y) => set((state) => ({
      characters: state.characters.map(c => {
        if (c.id === state.activeCharacterId) {
          return {
            ...c,
            widgets: c.widgets.map(w => w.id === id ? { ...w, x, y } : w)
          };
        }
        return c;
      })
    })),

    updateWidgetSize: (id, w, h) => set((state) => ({
      characters: state.characters.map(c => {
        if (c.id === state.activeCharacterId) {
          return {
            ...c,
            widgets: c.widgets.map(widget => widget.id === id ? { ...widget, w, h } : widget)
          };
        }
        return c;
      })
    })),

    updateWidgetData: (id, data) => set((state) => ({
      characters: state.characters.map(c => {
        if (c.id === state.activeCharacterId) {
          return {
            ...c,
            widgets: c.widgets.map(w => w.id === id ? { ...w, data: { ...w.data, ...data } } : w)
          };
        }
        return c;
      })
    })),

    removeWidget: (id) => set((state) => ({
      characters: state.characters.map(c => {
        if (c.id === state.activeCharacterId) {
          return {
            ...c,
            widgets: c.widgets.filter(w => w.id !== id)
          };
        }
        return c;
      })
    })),

    // Attach two widgets together (create or merge groups)
    // This creates an edge in the connection graph
    attachWidgets: (widgetId1, widgetId2) => set((state) => {
      if (!state.activeCharacterId) return state;
      
      return {
        characters: state.characters.map(c => {
          if (c.id !== state.activeCharacterId) return c;
          
          const widget1 = c.widgets.find(w => w.id === widgetId1);
          const widget2 = c.widgets.find(w => w.id === widgetId2);
          
          if (!widget1 || !widget2) return c;
          
          // Check if already attached
          if (widget1.attachedTo?.includes(widgetId2)) return c;
          
          // Determine the group ID to use
          let newGroupId: string;
          if (widget1.groupId && widget2.groupId && widget1.groupId !== widget2.groupId) {
            // Both have different groups - merge widget2's group into widget1's
            newGroupId = widget1.groupId;
            const oldGroupId = widget2.groupId;
            return {
              ...c,
              widgets: c.widgets.map(w => {
                if (w.groupId === oldGroupId) {
                  return { ...w, groupId: newGroupId };
                }
                // Add edge between the two widgets
                if (w.id === widgetId1) {
                  return { ...w, attachedTo: [...(w.attachedTo || []), widgetId2] };
                }
                if (w.id === widgetId2) {
                  return { ...w, attachedTo: [...(w.attachedTo || []), widgetId1] };
                }
                return w;
              })
            };
          } else if (widget1.groupId) {
            newGroupId = widget1.groupId;
          } else if (widget2.groupId) {
            newGroupId = widget2.groupId;
          } else {
            newGroupId = uuidv4();
          }
          
          return {
            ...c,
            widgets: c.widgets.map(w => {
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
          };
        })
      };
    }),

    // Detach a widget completely from its group (break all its edges)
    // Then recalculate connected components to potentially split the group
    detachWidgets: (widgetId1, _widgetId2) => set((state) => {
      if (!state.activeCharacterId) return state;
      
      return {
        characters: state.characters.map(c => {
          if (c.id !== state.activeCharacterId) return c;
          
          const widget1 = c.widgets.find(w => w.id === widgetId1);
          
          if (!widget1) return c;
          if (!widget1.groupId) return c;
          
          const groupId = widget1.groupId;
          const widget1Neighbors = widget1.attachedTo || [];
          
          // Remove widget1 from the group entirely:
          // 1. Clear widget1's attachedTo and groupId
          // 2. Remove widget1 from all neighbors' attachedTo arrays
          let updatedWidgets = c.widgets.map(w => {
            if (w.id === widgetId1) {
              // Completely detach this widget
              return { 
                ...w, 
                groupId: undefined,
                attachedTo: undefined
              };
            }
            if (widget1Neighbors.includes(w.id)) {
              // Remove widget1 from this neighbor's attachedTo
              return { 
                ...w, 
                attachedTo: (w.attachedTo || []).filter(id => id !== widgetId1)
              };
            }
            return w;
          });
          
          // Now find connected components in the remaining group using BFS
          const remainingGroupWidgetIds = updatedWidgets
            .filter(w => w.groupId === groupId)
            .map(w => w.id);
          
          // If no widgets remain in the group, we're done
          if (remainingGroupWidgetIds.length === 0) {
            return { ...c, widgets: updatedWidgets };
          }
          
          // Build adjacency map from the updated widgets
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
          // Single-widget components get no groupId
          // Multi-widget components get a new groupId (or keep existing if only one component)
          const componentGroupIds = components.map((comp, idx) => {
            if (comp.length <= 1) return undefined; // Single widgets don't need a group
            if (idx === 0 && components.filter(c => c.length > 1).length <= 1) {
              return groupId; // Keep existing group ID if only one multi-widget component remains
            }
            return uuidv4(); // New group ID for additional components
          });
          
          // Create a map from widget ID to new group ID
          const widgetToGroupId = new Map<string, string | undefined>();
          components.forEach((comp, idx) => {
            for (const wid of comp) {
              widgetToGroupId.set(wid, componentGroupIds[idx]);
            }
          });
          
          // Update widgets with new group IDs
          updatedWidgets = updatedWidgets.map(w => {
            if (widgetToGroupId.has(w.id)) {
              const newGid = widgetToGroupId.get(w.id);
              // Also clean up attachedTo for single widgets
              if (!newGid) {
                return { ...w, groupId: undefined, attachedTo: undefined };
              }
              return { ...w, groupId: newGid };
            }
            return w;
          });
          
          return { ...c, widgets: updatedWidgets };
        })
      };
    }),

    // Get all widgets in a group
    getWidgetsInGroup: (groupId) => {
      const state = useStore.getState();
      const character = state.characters.find(c => c.id === state.activeCharacterId);
      if (!character) return [];
      return character.widgets.filter(w => w.groupId === groupId);
    },

    // Move all widgets in the same group as the given widget
    moveWidgetGroup: (widgetId, deltaX, deltaY) => set((state) => {
      if (!state.activeCharacterId) return state;
      
      const character = state.characters.find(c => c.id === state.activeCharacterId);
      if (!character) return state;
      
      const widget = character.widgets.find(w => w.id === widgetId);
      if (!widget || !widget.groupId) {
        // No group, just move the single widget
        return {
          characters: state.characters.map(c => {
            if (c.id === state.activeCharacterId) {
              return {
                ...c,
                widgets: c.widgets.map(w => 
                  w.id === widgetId ? { ...w, x: w.x + deltaX, y: w.y + deltaY } : w
                )
              };
            }
            return c;
          })
        };
      }
      
      // Move all widgets in the group
      const groupId = widget.groupId;
      return {
        characters: state.characters.map(c => {
          if (c.id === state.activeCharacterId) {
            return {
              ...c,
              widgets: c.widgets.map(w => 
                w.groupId === groupId ? { ...w, x: w.x + deltaX, y: w.y + deltaY } : w
              )
            };
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
