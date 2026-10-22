import { describe, expect, it } from 'vitest';
import type { WidgetData } from '../types';
import {
  addNoteTab,
  getActiveNoteContent,
  getNoteContentUpdate,
  hasNoteContent,
  removeNoteTab,
  removeNoteTabs,
  renameNoteTab,
} from './noteTabs';

const apply = (data: WidgetData, update: Partial<WidgetData>): WidgetData => ({ ...data, ...update });

describe('note tabs', () => {
  it('removes several tabs and keeps a sensible active tab', () => {
    const data: WidgetData = {
      noteTabs: [
        { id: 'a', name: 'A', richText: '<p>a</p>' },
        { id: 'b', name: 'B', richText: '<p>b</p>' },
        { id: 'c', name: 'C', richText: '<p>c</p>' },
        { id: 'd', name: 'D', richText: '<p>d</p>' },
      ],
      activeNoteTabId: 'b',
    };
    expect(removeNoteTabs(data, [])).toEqual({});
    expect(removeNoteTabs(data, ['c'])).toEqual({ noteTabs: [data.noteTabs![0], data.noteTabs![1], data.noteTabs![3]], activeNoteTabId: 'b' });
    expect(removeNoteTabs(data, ['b', 'c']).activeNoteTabId).toBe('d');
    expect(removeNoteTabs(data, ['b', 'c', 'd']).activeNoteTabId).toBe('a');
    expect(removeNoteTabs(data, ['a', 'b', 'c', 'd'])).toEqual({ noteTabs: undefined, activeNoteTabId: undefined, text: '', richText: '' });
  });

  it('detects whether a tab has notes worth confirming before delete', () => {
    expect(hasNoteContent({})).toBe(false);
    expect(hasNoteContent({ richText: '<p></p>' })).toBe(false);
    expect(hasNoteContent({ richText: '<p>&nbsp;</p><p><br></p>' })).toBe(false);
    expect(hasNoteContent({ text: '  ' })).toBe(false);
    expect(hasNoteContent({ text: 'Hello' })).toBe(true);
    expect(hasNoteContent({ richText: '<p>Hello</p>' })).toBe(true);
    expect(hasNoteContent({ richText: '<p><img src="a.png"></p>' })).toBe(true);
    expect(hasNoteContent({ richText: '<hr>' })).toBe(true);
  });

  it('turns existing notes into the first tab when adding a tab', () => {
    const data: WidgetData = { label: 'Journal', text: 'Hello', richText: '<p>Hello</p>' };
    const next = apply(data, addNoteTab(data, ' Session 2 ', 'tab-2'));

    expect(next.noteTabs).toHaveLength(2);
    expect(next.noteTabs?.[0]).toMatchObject({ name: 'Tab 1', text: 'Hello', richText: '<p>Hello</p>' });
    expect(next.noteTabs?.[1]).toEqual({ id: 'tab-2', name: 'Session 2', text: '', richText: '' });
    expect(next.activeNoteTabId).toBe('tab-2');
    expect(next.text).toBeUndefined();
    expect(next.richText).toBeUndefined();
  });

  it('names unnamed tabs by position', () => {
    const data = apply({}, addNoteTab({}, '', 'b'));
    expect(data.noteTabs?.map((tab) => tab.name)).toEqual(['Tab 1', 'Tab 2']);
    expect(apply(data, addNoteTab(data, '  ', 'c')).noteTabs?.[2].name).toBe('Tab 3');
  });

  it('skips default names that are already taken', () => {
    const data: WidgetData = { noteTabs: [{ id: 'a', name: 'Tab 1' }, { id: 'c', name: 'Tab 3' }] };
    expect(apply(data, addNoteTab(data, '', 'd')).noteTabs?.[2].name).toBe('Tab 4');
  });

  it('reads and writes the active tab content', () => {
    const data: WidgetData = {
      noteTabs: [{ id: 'a', name: 'A', text: 'first' }, { id: 'b', name: 'B', text: 'second' }],
      activeNoteTabId: 'b',
    };
    expect(getActiveNoteContent(data).text).toBe('second');

    const next = apply(data, getNoteContentUpdate(data, { text: 'edited', richText: '<p>edited</p>' }));
    expect(next.noteTabs?.[0].text).toBe('first');
    expect(next.noteTabs?.[1]).toMatchObject({ text: 'edited', richText: '<p>edited</p>' });
  });

  it('falls back to the first tab when the active id is missing', () => {
    const data: WidgetData = { noteTabs: [{ id: 'a', name: 'A', text: 'first' }], activeNoteTabId: 'gone' };
    expect(getActiveNoteContent(data).text).toBe('first');
  });

  it('writes plain notes when there are no tabs', () => {
    expect(getNoteContentUpdate({ text: 'old' }, { text: 'new' })).toEqual({ text: 'new' });
  });

  it('selects a neighbour when the active tab is removed', () => {
    const data: WidgetData = {
      noteTabs: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }],
      activeNoteTabId: 'c',
    };
    const next = apply(data, removeNoteTab(data, 'c'));
    expect(next.noteTabs?.map((tab) => tab.id)).toEqual(['a', 'b']);
    expect(next.activeNoteTabId).toBe('b');
    expect(apply(data, removeNoteTab(data, 'a')).activeNoteTabId).toBe('c');
  });

  it('turns the last tab back into plain notes', () => {
    const data: WidgetData = { noteTabs: [{ id: 'a', name: 'A', text: 'keep', richText: '<p>keep</p>' }], activeNoteTabId: 'a' };
    const next = apply(data, removeNoteTab(data, 'a'));
    expect(next.noteTabs).toBeUndefined();
    expect(next.activeNoteTabId).toBeUndefined();
    expect(next).toMatchObject({ text: 'keep', richText: '<p>keep</p>' });
  });

  it('renames tabs and ignores blank names', () => {
    const data: WidgetData = { noteTabs: [{ id: 'a', name: 'A' }] };
    expect(renameNoteTab(data, 'a', ' Loot ').noteTabs?.[0].name).toBe('Loot');
    expect(renameNoteTab(data, 'a', '   ')).toEqual({});
  });
});
