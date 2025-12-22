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

interface TemplateStoreState {
  templates: WidgetTemplate[];
  
  // Actions
  addTemplate: (widget: Widget, name?: string) => void;
  removeTemplate: (id: string) => void;
  renameTemplate: (id: string, name: string) => void;
}

export const useTemplateStore = create<TemplateStoreState>((set) => {
  // Load persisted templates from localStorage
  const persisted = (() => {
    try {
      const raw = localStorage.getItem('ucs:templates');
      if (!raw) return null;
      return JSON.parse(raw) as { templates: WidgetTemplate[] };
    } catch (e) {
      console.error('Failed to load persisted templates', e);
      return null;
    }
  })();

  const initialTemplates = persisted?.templates ?? [];

  // Subscribe to persist changes
  const persistTemplates = (templates: WidgetTemplate[]) => {
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
