import { v4 as uuidv4 } from 'uuid';
import type { Widget } from '../types';

const DEFAULT_Z_INDEX = 10;

// Attaches each pair of widgets, merging the groups they belong to. Positions are left alone.
export function attachWidgetPairs(widgets: Widget[], pairs: [string, string][], createId: () => string = uuidv4): Widget[] {
  const byId = new Map(widgets.map((widget) => [widget.id, widget]));
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(id, root);
    return root;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));

  for (const widget of widgets) parent.set(widget.id, widget.id);
  const firstOfGroup = new Map<string, string>();
  for (const widget of widgets) {
    if (!widget.groupId) continue;
    const first = firstOfGroup.get(widget.groupId);
    if (first) union(widget.id, first);
    else firstOfGroup.set(widget.groupId, widget.id);
  }

  const neighbours = new Map<string, Set<string>>();
  const link = (from: string, to: string) => {
    const set = neighbours.get(from) ?? new Set(byId.get(from)?.attachedTo ?? []);
    set.add(to);
    neighbours.set(from, set);
  };
  let attached = false;
  for (const [a, b] of pairs) {
    const first = byId.get(a);
    const second = byId.get(b);
    if (!first || !second || a === b) continue;
    if (first.groupId && first.groupId === second.groupId) continue;
    if (first.attachedTo?.includes(b) && second.attachedTo?.includes(a)) continue;
    link(a, b);
    link(b, a);
    union(a, b);
    attached = true;
  }
  if (!attached) return widgets;

  const clusters = new Map<string, Widget[]>();
  for (const widget of widgets) {
    const root = find(widget.id);
    clusters.set(root, [...(clusters.get(root) ?? []), widget]);
  }
  const groupIds = new Map<string, string>();
  const zIndexes = new Map<string, number>();
  let nextZ = Math.max(DEFAULT_Z_INDEX, 100, ...widgets.map((widget) => widget.zIndex ?? DEFAULT_Z_INDEX)) + 1;
  for (const [root, members] of clusters) {
    if (members.length < 2) continue;
    groupIds.set(root, members.find((member) => member.groupId)?.groupId ?? createId());
    zIndexes.set(root, nextZ);
    nextZ += 1;
  }

  return widgets.map((widget) => {
    const root = find(widget.id);
    const groupId = groupIds.get(root);
    if (!groupId) return widget;
    const attachedTo = neighbours.has(widget.id) ? Array.from(neighbours.get(widget.id)!) : widget.attachedTo;
    return { ...widget, groupId, attachedTo, zIndex: zIndexes.get(root) };
  });
}
