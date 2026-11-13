import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutomationsPanelStore } from './useAutomationsPanelStore';
import { useCompendiumPanelStore } from './useCompendiumPanelStore';
import { useEventsPanelStore } from './useEventsPanelStore';
import { useTimelineStore } from './useTimelineStore';

vi.mock('./useTimelineStore', async () => {
  const { create } = await import('zustand');
  return {
    useTimelineStore: create<{ isOpen: boolean; setOpen: (open: boolean) => void }>((set) => ({
      isOpen: false,
      setOpen: (isOpen) => set({ isOpen }),
    })),
  };
});

describe('Automations panel navigation', () => {
  beforeEach(() => {
    useTimelineStore.getState().setOpen(false);
    useAutomationsPanelStore.setState({ isOpen: false, tab: 'labels' });
    useCompendiumPanelStore.getState().setOpen(false);
    useEventsPanelStore.setState({ focusEventId: null, editor: null, editorKey: 0 });
  });

  it('reopens the last tab without creating separate panels', () => {
    const panel = useAutomationsPanelStore.getState();
    panel.openTab('formulas');
    panel.setOpen(false);
    panel.toggleOpen();
    expect(useAutomationsPanelStore.getState()).toMatchObject({ isOpen: true, tab: 'formulas' });
    panel.openTab('labels');
    expect(useAutomationsPanelStore.getState()).toMatchObject({ isOpen: true, tab: 'labels' });
  });

  it('shares screen space with the timeline and compendium in both directions', () => {
    useAutomationsPanelStore.getState().openTab('effects');
    useTimelineStore.getState().setOpen(true);
    expect(useAutomationsPanelStore.getState().isOpen).toBe(false);
    useAutomationsPanelStore.getState().openTab('events');
    expect(useTimelineStore.getState().isOpen).toBe(false);
    useCompendiumPanelStore.getState().setOpen(true);
    expect(useAutomationsPanelStore.getState().isOpen).toBe(false);
    useAutomationsPanelStore.getState().openTab('labels');
    expect(useCompendiumPanelStore.getState().isOpen).toBe(false);
  });

  it('opens event links on the Events tab and clears stale focus when leaving it', () => {
    useAutomationsPanelStore.getState().openTab('effects');
    useEventsPanelStore.getState().showEvent('linked-event');
    expect(useAutomationsPanelStore.getState()).toMatchObject({ isOpen: true, tab: 'events' });
    expect(useEventsPanelStore.getState().focusEventId).toBe('linked-event');
    useAutomationsPanelStore.getState().openTab('labels');
    expect(useEventsPanelStore.getState().focusEventId).toBeNull();
    useEventsPanelStore.getState().showEvent('another-event');
    useAutomationsPanelStore.getState().setOpen(false);
    expect(useEventsPanelStore.getState().focusEventId).toBeNull();
  });

  it('keeps widget event editing independent of panel navigation', () => {
    useEventsPanelStore.getState().openEditor({ eventId: 'widget-event' });
    expect(useAutomationsPanelStore.getState().isOpen).toBe(false);
    useAutomationsPanelStore.getState().openTab('effects');
    useAutomationsPanelStore.getState().setOpen(false);
    expect(useEventsPanelStore.getState().editor?.eventId).toBe('widget-event');
    useEventsPanelStore.getState().closeEditor();
  });
});
