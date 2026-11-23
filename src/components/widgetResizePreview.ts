export interface WidgetResizePreview {
  x: number;
  y: number;
  w?: number;
  h?: number;
}

// Live sizes of widgets that follow a resized neighbour, kept out of the store until the drag ends.
let previews: ReadonlyMap<string, WidgetResizePreview> = new Map();
const subscribers = new Set<() => void>();

export const getWidgetResizePreview = (widgetId: string) => previews.get(widgetId);

export const subscribeWidgetResizePreview = (subscriber: () => void) => {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
};

export function setWidgetResizePreviews(next: ReadonlyMap<string, WidgetResizePreview>) {
  previews = next;
  subscribers.forEach((subscriber) => subscriber());
}

export function clearWidgetResizePreviews() {
  if (previews.size === 0) return;
  setWidgetResizePreviews(new Map());
}
