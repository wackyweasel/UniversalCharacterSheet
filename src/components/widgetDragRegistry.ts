export interface WidgetDragState {
  widgetId: string;
  groupId: string | null;
}

let dragState: WidgetDragState | null = null;
const subscribers = new Set<() => void>();

export const WIDGET_CONTROLS_DISMISS_EVENT = 'widget-controls-dismiss';

const emit = () => {
  subscribers.forEach((subscriber) => subscriber());
};

export const getWidgetDragState = () => dragState;

export const subscribeWidgetDragState = (subscriber: () => void) => {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
};

export function startWidgetDrag(widgetId: string, groupId: string | null) {
  dragState = { widgetId, groupId };
  emit();
}

export function finishWidgetDrag(widgetId: string) {
  if (dragState?.widgetId !== widgetId) return;
  dragState = null;
  emit();
}