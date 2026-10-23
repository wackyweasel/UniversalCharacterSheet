import { describe, expect, it } from 'vitest';
import type { Widget } from '../types';
import { attachWidgetPairs } from './widgetAttach';

const widget = (id: string, extra: Partial<Widget> = {}) => ({ id, type: 'TEXT', x: 0, y: 0, w: 100, h: 100, zIndex: 10, ...extra }) as Widget;
const ids = () => {
  let next = 0;
  return () => `group-${++next}`;
};

describe('attachWidgetPairs', () => {
  it('returns the same array when nothing is attached', () => {
    const widgets = [widget('a'), widget('b')];
    expect(attachWidgetPairs(widgets, [], ids())).toBe(widgets);
  });

  it('attaches both ways and shares one group', () => {
    const result = attachWidgetPairs([widget('a'), widget('b'), widget('c')], [['a', 'b']], ids());
    const [a, b, c] = result;
    expect(a.attachedTo).toEqual(['b']);
    expect(b.attachedTo).toEqual(['a']);
    expect(a.groupId).toBe('group-1');
    expect(b.groupId).toBe('group-1');
    expect(c.groupId).toBeUndefined();
    expect(a.zIndex).toBe(b.zIndex);
  });

  it('merges chains into a single group', () => {
    const result = attachWidgetPairs([widget('a'), widget('b'), widget('c')], [['a', 'b'], ['b', 'c']], ids());
    expect(new Set(result.map((item) => item.groupId)).size).toBe(1);
    expect(result[1].attachedTo?.sort()).toEqual(['a', 'c']);
  });

  it('keeps an existing group id when joining it', () => {
    const result = attachWidgetPairs(
      [widget('a', { groupId: 'old', attachedTo: ['b'] }), widget('b', { groupId: 'old', attachedTo: ['a'] }), widget('c')],
      [['b', 'c']],
      ids(),
    );
    expect(result.map((item) => item.groupId)).toEqual(['old', 'old', 'old']);
  });

  it('skips pairs that are already in the same group', () => {
    const widgets = [widget('a', { groupId: 'g', attachedTo: ['b'] }), widget('b', { groupId: 'g', attachedTo: ['a'] })];
    expect(attachWidgetPairs(widgets, [['a', 'b']], ids())).toBe(widgets);
  });

  it('does not mutate its input', () => {
    const widgets = [widget('a'), widget('b')];
    attachWidgetPairs(widgets, [['a', 'b']], ids());
    expect(widgets[0].groupId).toBeUndefined();
    expect(widgets[0].attachedTo).toBeUndefined();
  });
});
