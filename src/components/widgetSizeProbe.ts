export interface WidgetProbeSize {
  w: number;
  h: number;
}

// Temporary render sizes used to measure widget content without touching the store.
let probeSizes: ReadonlyMap<string, WidgetProbeSize> = new Map();
const subscribers = new Set<() => void>();

export const getWidgetProbeSize = (widgetId: string) => probeSizes.get(widgetId);

export const subscribeWidgetSizeProbe = (subscriber: () => void) => {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
};

export function setWidgetProbeSizes(sizes: ReadonlyMap<string, WidgetProbeSize>) {
  probeSizes = sizes;
  subscribers.forEach((subscriber) => subscriber());
}

export function clearWidgetProbeSizes() {
  if (probeSizes.size === 0) return;
  setWidgetProbeSizes(new Map());
}
