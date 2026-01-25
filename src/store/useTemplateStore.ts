import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Widget, WidgetType } from '../types';

export interface WidgetTemplate {
  id: string;
  name: string;
  type: WidgetType;
  w?: number;
  h?: number;
  data: any;
  createdAt: number;
}

// A group template represents a collection of widgets that were attached together
export interface GroupWidgetTemplate {
  // Widget data without position - will be placed relatively when added
  type: WidgetType;
  relativeX: number; // Position relative to the group origin (top-left of bounding box)
  relativeY: number;
  w?: number;
  h?: number;
  data: any;
}

export interface GroupTemplate {
  id: string;
  name: string;
  isGroup: true;
  widgets: GroupWidgetTemplate[];
  // Attachment graph to recreate the group structure
  // Each entry is [index1, index2] representing widgets that should be attached
  attachments: [number, number][];
  createdAt: number;
}

// Union type for all templates
export type AnyTemplate = WidgetTemplate | GroupTemplate;

// Type guard to check if a template is a group template
export function isGroupTemplate(template: AnyTemplate): template is GroupTemplate {
  return 'isGroup' in template && template.isGroup === true;
}

interface TemplateStoreState {
  templates: AnyTemplate[];
  
  // Actions
  addTemplate: (widget: Widget, name?: string) => void;
  addGroupTemplate: (widgets: Widget[], name: string) => void;
  removeTemplate: (id: string) => void;
  renameTemplate: (id: string, name: string) => void;
}

export const useTemplateStore = create<TemplateStoreState>((set) => {
  // Load persisted templates from localStorage
  const persisted = (() => {
    try {
      const raw = localStorage.getItem('ucs:templates');
      if (!raw) return null;
      return JSON.parse(raw) as { templates: AnyTemplate[] };
    } catch (e) {
      console.error('Failed to load persisted templates', e);
      return null;
    }
  })();

  const initialTemplates = persisted?.templates ?? [];

  // Subscribe to persist changes
  const persistTemplates = (templates: AnyTemplate[]) => {
    try {
      localStorage.setItem('ucs:templates', JSON.stringify({ templates }));
    } catch (e) {
      console.error('Failed to persist templates', e);
    }
  };

  return {
    templates: initialTemplates,

    addTemplate: (widget, name) => {
      const template: WidgetTemplate = {
        id: uuidv4(),
        name: name || widget.data.label || `${widget.type} Template`,
        type: widget.type,
        w: widget.w,
        h: widget.h,
        data: { ...widget.data },
        createdAt: Date.now(),
      };

      set((state) => {
        const newTemplates = [...state.templates, template];
        persistTemplates(newTemplates);
        return { templates: newTemplates };
      });
    },

    addGroupTemplate: (widgets, name) => {
      if (widgets.length === 0) return;
      
      // Calculate the bounding box origin (top-left corner)
      const minX = Math.min(...widgets.map(w => w.x));
      const minY = Math.min(...widgets.map(w => w.y));
      
      // Create a mapping of widget IDs to indices
      const idToIndex = new Map<string, number>();
      widgets.forEach((w, idx) => {
        idToIndex.set(w.id, idx);
      });
      
      // Build attachment pairs from the widgets' attachedTo relationships
      const attachmentSet = new Set<string>();
      const attachments: [number, number][] = [];
      
      widgets.forEach((w, idx) => {
        if (w.attachedTo) {
          w.attachedTo.forEach(attachedId => {
            const attachedIdx = idToIndex.get(attachedId);
            if (attachedIdx !== undefined) {
              // Create a canonical key to avoid duplicates (smaller index first)
              const key = idx < attachedIdx ? `${idx}-${attachedIdx}` : `${attachedIdx}-${idx}`;
              if (!attachmentSet.has(key)) {
                attachmentSet.add(key);
                attachments.push(idx < attachedIdx ? [idx, attachedIdx] : [attachedIdx, idx]);
              }
            }
          });
        }
      });
      
      // Create widget templates with relative positions
      const widgetTemplates: GroupWidgetTemplate[] = widgets.map(w => ({
        type: w.type,
        relativeX: w.x - minX,
        relativeY: w.y - minY,
        w: w.w,
        h: w.h,
        data: JSON.parse(JSON.stringify(w.data)), // Deep clone
      }));
      
      const template: GroupTemplate = {
        id: uuidv4(),
        name,
        isGroup: true,
        widgets: widgetTemplates,
        attachments,
        createdAt: Date.now(),
      };

      set((state) => {
        const newTemplates = [...state.templates, template];
        persistTemplates(newTemplates);
        return { templates: newTemplates };
      });
    },

    removeTemplate: (id) => {
      set((state) => {
        const newTemplates = state.templates.filter(t => t.id !== id);
        persistTemplates(newTemplates);
        return { templates: newTemplates };
      });
    },

    renameTemplate: (id, name) => {
      set((state) => {
        const newTemplates = state.templates.map(t => 
          t.id === id ? { ...t, name } : t
        );
        persistTemplates(newTemplates);
        return { templates: newTemplates };
      });
    },
  };
});
