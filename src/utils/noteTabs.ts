import { v4 as uuidv4 } from 'uuid';
import type { NoteTab, WidgetData } from '../types';

export const DEFAULT_FIRST_NOTE_TAB_NAME = 'Tab 1';

export interface NoteContent {
  text?: string;
  richText?: string;
}

export function getNoteTabs(data: WidgetData): NoteTab[] {
  return Array.isArray(data.noteTabs) ? data.noteTabs : [];
}

export function getActiveNoteTab(data: WidgetData): NoteTab | undefined {
  const tabs = getNoteTabs(data);
  return tabs.find((tab) => tab.id === data.activeNoteTabId) ?? tabs[0];
}

/** Content currently shown by a notes widget: the active tab, or the plain notes when there are no tabs. */
export function getActiveNoteContent(data: WidgetData): NoteContent {
  const tabs = getNoteTabs(data);
  if (tabs.length === 0) return { text: data.text, richText: data.richText };
  const tab = getActiveNoteTab(data);
  return { text: tab?.text, richText: tab?.richText };
}

export function getNoteContentUpdate(data: WidgetData, content: NoteContent): Partial<WidgetData> {
  const tabs = getNoteTabs(data);
  if (tabs.length === 0) return content;
  const activeId = getActiveNoteTab(data)?.id;
  return { noteTabs: tabs.map((tab) => (tab.id === activeId ? { ...tab, ...content } : tab)) };
}

function getDefaultNoteTabName(tabs: NoteTab[]): string {
  const names = new Set(tabs.map((tab) => tab.name));
  let number = tabs.length + 1;
  while (names.has(`Tab ${number}`)) number += 1;
  return `Tab ${number}`;
}

export function addNoteTab(data: WidgetData, name: string, id: string = uuidv4()): Partial<WidgetData> {
  const existing = getNoteTabs(data);
  // The existing plain notes become the first tab so no content is lost.
  const tabs = existing.length > 0
    ? existing
    : [{ id: uuidv4(), name: DEFAULT_FIRST_NOTE_TAB_NAME, text: data.text, richText: data.richText }];
  const tabName = name.trim() || getDefaultNoteTabName(tabs);
  return {
    noteTabs: [...tabs, { id, name: tabName, text: '', richText: '' }],
    activeNoteTabId: id,
    ...(existing.length > 0 ? {} : { text: undefined, richText: undefined }),
  };
}

/** Removing the last remaining tab turns the widget back into plain notes, keeping that tab's content. */
export function removeNoteTab(data: WidgetData, id: string): Partial<WidgetData> {
  const tabs = getNoteTabs(data);
  const index = tabs.findIndex((tab) => tab.id === id);
  if (index < 0) return {};
  if (tabs.length === 1) {
    return { noteTabs: undefined, activeNoteTabId: undefined, text: tabs[0].text, richText: tabs[0].richText };
  }
  const remaining = tabs.filter((tab) => tab.id !== id);
  const activeId = getActiveNoteTab(data)?.id;
  return {
    noteTabs: remaining,
    activeNoteTabId: activeId === id ? remaining[Math.min(index, remaining.length - 1)].id : activeId,
  };
}

/** Deletes the given tabs and their notes. Deleting every tab leaves the widget as empty plain notes. */
export function removeNoteTabs(data: WidgetData, ids: Iterable<string>): Partial<WidgetData> {
  const removing = new Set(ids);
  const tabs = getNoteTabs(data);
  const remaining = tabs.filter((tab) => !removing.has(tab.id));
  if (remaining.length === tabs.length) return {};
  if (remaining.length === 0) {
    return { noteTabs: undefined, activeNoteTabId: undefined, text: '', richText: '' };
  }
  const active = getActiveNoteTab(data);
  if (active && !removing.has(active.id)) return { noteTabs: remaining, activeNoteTabId: active.id };
  const activeIndex = tabs.findIndex((tab) => tab.id === active?.id);
  const nextTab = tabs.slice(activeIndex + 1).find((tab) => !removing.has(tab.id))
    ?? remaining[remaining.length - 1];
  return { noteTabs: remaining, activeNoteTabId: nextTab.id };
}

export function renameNoteTab(data: WidgetData, id: string, name: string): Partial<WidgetData> {
  const trimmed = name.trim();
  if (!trimmed) return {};
  return { noteTabs: getNoteTabs(data).map((tab) => (tab.id === id ? { ...tab, name: trimmed } : tab)) };
}

export function hasNoteContent(tab: NoteContent): boolean {
  if (tab.text?.trim()) return true;
  if (!tab.richText) return false;
  if (/<(img|hr|iframe|video|audio)\b/i.test(tab.richText)) return true;
  return Boolean(tab.richText.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;/g, ' ').trim());
}
